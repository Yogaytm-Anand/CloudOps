const { exec } = require("child_process");
const express = require("express");
const simpleGit = require("simple-git");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();

app.use(express.json());

const PORT = 4000;


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

function generateKubernetesFiles(repoPath, imageName) {

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
  name: cdds-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cdds-app
  template:
    metadata:
      labels:
        app: cdds-app
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
  name: cdds-app-service
spec:
  selector:
    app: cdds-app
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

async function deployToKubernetes(imageName, repoPath) {

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
        `kubectl rollout status deployment/cdds-app --timeout=120s`
    );


    console.log(
        "Kubernetes deployment successful"
    );


    return {
        success: true,
        deployment: "cdds-app",
        service: "cdds-app-service",
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
                        dockerBuild.image
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
                        repoPath
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
// Start server
// --------------------------------------------------

app.listen(PORT, () => {

    console.log(
        `CDDS backend running on port ${PORT}`
    );

});