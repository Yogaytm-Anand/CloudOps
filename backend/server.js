const { exec } = require("child_process");
const express = require("express");
const simpleGit = require("simple-git");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();

app.use(express.json());

const PORT = 4000;

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

app.post("/api/analyze", async (req, res) => {
    const { repoUrl } = req.body;

    if (!repoUrl) {
        return res.status(400).json({
            success: false,
            message: "GitHub repository URL is required"
        });
    }

    // Basic GitHub URL validation
    if (!repoUrl.startsWith("https://github.com/")) {
        return res.status(400).json({
            success: false,
            message: "Only GitHub repositories are supported"
        });
    }

    const repoName = `cdds-${Date.now()}`;
    const repoPath = path.join(os.tmpdir(), repoName);

    try {
        console.log(`Cloning repository: ${repoUrl}`);

        // Clone repository
        await simpleGit().clone(repoUrl, repoPath);

        console.log("Repository cloned successfully");

        // Validate repository
        const dockerfilePath = path.join(repoPath, "Dockerfile");
        const kubernetesPath = path.join(repoPath, "kubernetes");

        const hasDockerfile = fs.existsSync(dockerfilePath);
                let dockerBuild = {
            attempted: false,
            success: false,
            image: null
        };

        if (hasDockerfile) {

            const imageName = `cdds-app:${Date.now()}`;

            dockerBuild.attempted = true;
            dockerBuild.image = imageName;

            try {

                console.log(`Building Docker image: ${imageName}`);

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
                dockerBuild.error = error.stderr || error.error;
            }
        }
        const hasKubernetesFolder = fs.existsSync(kubernetesPath);

        const kubernetesFiles = hasKubernetesFolder
            ? fs.readdirSync(kubernetesPath)
                .filter(file =>
                    file.endsWith(".yaml") ||
                    file.endsWith(".yml")
                )
            : [];

        res.json({
            success: true,

            repository: repoUrl,

            validation: {
                dockerfile: hasDockerfile,
                kubernetesFolder: hasKubernetesFolder,
                kubernetesFiles: kubernetesFiles
            },
            dockerBuild:dockerBuild
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Repository analysis failed",
            error: error.message
        });
    }
});

app.get("/health", (req, res) => {
    res.json({
        status: "Backend running"
    });
});

app.listen(PORT, () => {
    console.log(`CDDS backend running on port ${PORT}`);
});