const { exec } = require("child_process");
const express = require("express");
const simpleGit = require("simple-git");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { performance } = require("perf_hooks");
const PROMETHEUS_URL = "http://localhost:9090";
const KUBERNETES_PROXY_URL = process.env.KUBERNETES_PROXY_URL || "http://127.0.0.1:50527";
const RESPONSE_TIME_TARGET_MS = 500;
const MAX_PROBE_HISTORY = 60;
const probeHistory = new Map();

const app = express();

// --------------------------------------------------
// Optional CORS — only active when ALLOWED_ORIGIN is
// set (e.g. for production separate-origin deployments).
// Local dev uses the Vite proxy so no CORS is needed.
// --------------------------------------------------
if (process.env.ALLOWED_ORIGIN) {
    app.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
            return res.sendStatus(204);
        }
        next();
    });
}

app.use(express.json());

const PORT = 4000;

async function queryPrometheus(query) {
    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Prometheus request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "success") {
        throw new Error(data.error || "Prometheus query failed");
    }

    return data.data;
}

// Probe each deployed service through the local Kubernetes API proxy. This
// gives the dashboard live application latency and a rolling probe error rate
// even when the deployed application does not expose Prometheus HTTP metrics.
async function probeDeployedService(jobId) {
    const serviceName = encodeURIComponent(`${jobId}-service`);
    const url = `${KUBERNETES_PROXY_URL}/api/v1/namespaces/default/services/${serviceName}:3000/proxy/`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const startedAt = performance.now();
    let succeeded = false;

    try {
        const response = await fetch(url, { signal: controller.signal });
        succeeded = response.ok;
    } catch (error) {
        succeeded = false;
    } finally {
        clearTimeout(timeout);
    }

    const responseTimeMs = Math.round(performance.now() - startedAt);
    const samples = probeHistory.get(jobId) || [];
    samples.push(succeeded);
    if (samples.length > MAX_PROBE_HISTORY) samples.shift();
    probeHistory.set(jobId, samples);

    const failures = samples.filter((sample) => !sample).length;
    const errorRate = Number(((failures / samples.length) * 100).toFixed(2));

    return {
        responseTimeMs,
        responseTimePercentage: Math.min(100, (responseTimeMs / RESPONSE_TIME_TARGET_MS) * 100),
        errorRate,
        errorRatePercentage: errorRate
    };
}

// --------------------------------------------------
// Run a terminal command from Node.js
// --------------------------------------------------

function runCommand(command, cwd) {
    return new Promise((resolve, reject) => {
        exec(command, { cwd }, (error, stdout, stderr) => {

            if (error) {
                reject({
                    error: error.message,
                    stdout,
                    stderr
                });

                return;
            }

            resolve({
                stdout,
                stderr
            });
        });
    });
}


// --------------------------------------------------
// Generate Kubernetes files automatically
// --------------------------------------------------

function generateKubernetesFiles(repoPath, imageName, jobId) {

    const kubernetesPath = path.join(
        repoPath,
        "kubernetes"
    );

    // Create kubernetes folder
    if (!fs.existsSync(kubernetesPath)) {
        fs.mkdirSync(kubernetesPath);
    }


    // Kubernetes Deployment
    const deploymentYaml = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${jobId}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cdds-app
      cdds-job: ${jobId}
  template:
    metadata:
      labels:
        app: cdds-app
        cdds-job: ${jobId}
    spec:
      containers:
        - name: cdds-app
          image: ${imageName}
          imagePullPolicy: Never
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
`;


    // Kubernetes Service
    const serviceYaml = `
apiVersion: v1
kind: Service
metadata:
  name: ${jobId}-service
spec:
  selector:
    app: cdds-app
    cdds-job: ${jobId}
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
  type: NodePort
`;


    fs.writeFileSync(
        path.join(
            kubernetesPath,
            "deployment.yaml"
        ),
        deploymentYaml.trim()
    );


    fs.writeFileSync(
        path.join(
            kubernetesPath,
            "service.yaml"
        ),
        serviceYaml.trim()
    );


    return {
        deployment: "deployment.yaml",
        service: "service.yaml"
    };
}


// --------------------------------------------------
// Deploy application to Kubernetes
// --------------------------------------------------

async function deployToKubernetes(imageName, repoPath, jobId) {

    console.log(
        `Deploying ${imageName} to Kubernetes...`
    );


    const deploymentPath = path.join(
        repoPath,
        "kubernetes",
        "deployment.yaml"
    );


    const servicePath = path.join(
        repoPath,
        "kubernetes",
        "service.yaml"
    );


    if (!fs.existsSync(deploymentPath)) {
        throw new Error(
            "Kubernetes deployment.yaml not found"
        );
    }


    if (!fs.existsSync(servicePath)) {
        throw new Error(
            "Kubernetes service.yaml not found"
        );
    }


    // Make image available to Minikube
    await runCommand(
        `minikube image load ${imageName}`
    );


    // Deploy application
    await runCommand(
        `kubectl apply -f "${deploymentPath}"`
    );


    // Deploy service
    await runCommand(
        `kubectl apply -f "${servicePath}"`
    );


    // Wait for deployment
    await runCommand(
    `kubectl rollout status deployment/${jobId} --timeout=120s`
);


    console.log(
        "Kubernetes deployment successful"
    );


    return {
    success: true,
    deployment: jobId,
    service: `${jobId}-service`,
    image: imageName
    };
}


// --------------------------------------------------
// MAIN CDDS ANALYZE API
// --------------------------------------------------

app.post("/api/analyze", async (req, res) => {

    const { repoUrl } = req.body;


    // Check URL
    if (!repoUrl) {

        return res.status(400).json({
            success: false,
            message: "GitHub repository URL is required"
        });

    }


    // Basic GitHub validation
    if (!repoUrl.startsWith("https://github.com/")) {

        return res.status(400).json({
            success: false,
            message: "Only GitHub repositories are supported"
        });

    }


    // Unique job ID
    const jobId = `cdds-${Date.now()}`;

    const repoPath = path.join(
        os.tmpdir(),
        jobId
    );


    try {

        // --------------------------------------------------
        // 1. Clone repository
        // --------------------------------------------------

        console.log(
            `Cloning repository: ${repoUrl}`
        );

        await simpleGit().clone(
            repoUrl,
            repoPath
        );

        console.log(
            "Repository cloned successfully"
        );


        // --------------------------------------------------
        // 2. Validate Dockerfile
        // --------------------------------------------------

        const dockerfilePath = path.join(
            repoPath,
            "Dockerfile"
        );

        const hasDockerfile =
            fs.existsSync(dockerfilePath);


        // --------------------------------------------------
        // 3. Build Docker image
        // --------------------------------------------------

        let dockerBuild = {
            attempted: false,
            success: false,
            image: null
        };


        if (hasDockerfile) {

            const imageName =
                `cdds-app:${jobId}`;


            dockerBuild.attempted = true;
            dockerBuild.image = imageName;


            try {

                console.log(
                    `Building Docker image: ${imageName}`
                );


                await runCommand(
                    `docker build -t ${imageName} .`,
                    repoPath
                );


                dockerBuild.success = true;


                console.log(
                    `Docker image built successfully: ${imageName}`
                );


            } catch (error) {

                console.error(
                    "Docker build failed:",
                    error
                );


                dockerBuild.success = false;

                dockerBuild.error =
                    error.stderr ||
                    error.error;

            }

        }


        // --------------------------------------------------
        // 4. Generate Kubernetes files
        // --------------------------------------------------

        let kubernetesGeneration = {
            attempted: false,
            success: false,
            files: []
        };


        if (dockerBuild.success) {

            try {

                const generatedFiles =
                    generateKubernetesFiles(
                        repoPath,
                        dockerBuild.image,
                        jobId
                    );


                kubernetesGeneration = {
                    attempted: true,
                    success: true,
                    files: [
                        generatedFiles.deployment,
                        generatedFiles.service
                    ]
                };


                console.log(
                    "Kubernetes files generated successfully"
                );


            } catch (error) {

                kubernetesGeneration = {
                    attempted: true,
                    success: false,
                    error: error.message
                };

            }

        }


        // --------------------------------------------------
        // 5. Deploy to Kubernetes
        // --------------------------------------------------

        let kubernetesDeployment = {
            attempted: false,
            success: false
        };


        if (
            dockerBuild.success &&
            kubernetesGeneration.success
        ) {

            kubernetesDeployment.attempted = true;


            try {

                kubernetesDeployment =
                    await deployToKubernetes(
                        dockerBuild.image,
                        repoPath,
                        jobId
                    );


                kubernetesDeployment.attempted =
                    true;


            } catch (error) {

                console.error(
                    "Kubernetes deployment failed:",
                    error
                );


                kubernetesDeployment = {
                    attempted: true,
                    success: false,
                    error:
                        error.stderr ||
                        error.error ||
                        error.message
                };

            }

        }


        // --------------------------------------------------
        // 6. Final response
        // --------------------------------------------------

        res.json({

            success: true,

            jobId: jobId,

            repository: repoUrl,

            validation: {
                dockerfile: hasDockerfile
            },

            dockerBuild: dockerBuild,

            kubernetesGeneration:
                kubernetesGeneration,

            kubernetesDeployment:
                kubernetesDeployment

        });


    } catch (error) {

        console.error(error);


        res.status(500).json({

            success: false,

            message:
                "Repository analysis failed",

            error: error.message

        });

    }

});


// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/health", (req, res) => {

    res.json({
        status: "Backend running"
    });

});

// --------------------------------------------------
// Metrics Api
// --------------------------------------------------

app.get("/api/metrics", async (req, res) => {

    const { jobId } = req.query;

    if (!jobId) {
        return res.status(400).json({
            success: false,
            message: "jobId is required"
        });
    }

    try {

        const podPattern = `${jobId}-.*`;

        const cpuQuery = `
            rate(
                container_cpu_usage_seconds_total{
                    namespace="default",
                    pod=~"${podPattern}",
                    container!="POD",
                    container!=""
                }[2m]
            )
        `;

        const memoryQuery = `
            container_memory_working_set_bytes{
                namespace="default",
                pod=~"${podPattern}",
                container!="POD",
                container!=""
            }
        `;

        const cpuLimitQuery = `
            container_spec_cpu_quota{
                namespace="default",
                pod=~"${podPattern}",
                container!="POD",
                container!=""
            }
            /
            container_spec_cpu_period{
                namespace="default",
                pod=~"${podPattern}",
                container!="POD",
                container!=""
            }
        `;

        const memoryLimitQuery = `
            container_spec_memory_limit_bytes{
                namespace="default",
                pod=~"${podPattern}",
                container!="POD",
                container!=""
            }
        `;

        const [cpuData, memoryData, cpuLimitData, memoryLimitData, serviceProbe] = await Promise.all([
            queryPrometheus(cpuQuery),
            queryPrometheus(memoryQuery),
            queryPrometheus(cpuLimitQuery),
            queryPrometheus(memoryLimitQuery),
            probeDeployedService(jobId)
        ]);

        const cpuResult = cpuData.result[0];
        const memoryResult = memoryData.result[0];
        const cpuLimitResult = cpuLimitData.result[0];
        const memoryLimitResult = memoryLimitData.result[0];

        const cpu = cpuResult
            ? Number(cpuResult.value[1])
            : null;

        const memoryBytes = memoryResult
            ? Number(memoryResult.value[1])
            : null;

        const cpuLimitCores = cpuLimitResult
            ? Number(cpuLimitResult.value[1])
            : null;

        const memoryLimitBytes = memoryLimitResult
            ? Number(memoryLimitResult.value[1])
            : null;

        const toPercentage = (usage, limit) => (
            Number.isFinite(usage) && Number.isFinite(limit) && limit > 0
                ? Math.min(100, Math.max(0, (usage / limit) * 100))
                : null
        );

        res.json({
            success: true,
            jobId: jobId,
            pod: cpuResult?.metric?.pod ||
                 memoryResult?.metric?.pod ||
                 null,
            cpu,
            cpuPercentage: toPercentage(cpu, cpuLimitCores),
            memoryBytes,
            memoryPercentage: toPercentage(memoryBytes, memoryLimitBytes),
            memoryMiB: memoryBytes
                ? Number(
                    (memoryBytes / 1024 / 1024).toFixed(2)
                  )
                : null,
            ...serviceProbe
        });

    } catch (error) {

        console.error(
            "Prometheus error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(PORT, () => {

    console.log(
        `CDDS backend running on port ${PORT}`
    );

});
