import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

function stepStatus(attempted, success) {
    if (!attempted) return "SKIPPED";
    return success ? "PASS" : "FAIL";
}

function Report() {
    const navigate = useNavigate();
    const { analysis, metrics } = useApp();

    if (!analysis) {
        return (
            <div className="report-page">
                <header className="page-header">
                    <h1>Cloud Deployment Decision Support Platform</h1>
                    <p>Report Analysis</p>
                </header>
                <div className="empty-state">
                    <p>No analysis available.</p>
                    <button className="back-button" onClick={() => navigate("/")}>
                        ← Submit a repository
                    </button>
                </div>
            </div>
        );
    }

    const { jobId, repository, validation, dockerBuild, kubernetesGeneration, kubernetesDeployment } = analysis;

    // Derive the repo name from the URL for display
    const repoName = repository.replace("https://github.com/", "");

    // Build priority cards only for real issues — nothing invented
    const priorityIssues = [];

    if (!validation.dockerfile) {
        priorityIssues.push({
            category: "DOCKERFILE",
            headline: "Missing",
            title: "Add a Dockerfile",
            body: "The repository has no Dockerfile in its root. The entire pipeline (Docker build, Kubernetes deployment) was blocked.",
            impact: "Pipeline will remain blocked until a Dockerfile is added.",
        });
    }

    if (dockerBuild.attempted && !dockerBuild.success) {
        priorityIssues.push({
            category: "DOCKER BUILD",
            headline: "Failed",
            title: "Fix Docker build errors",
            body: dockerBuild.error
                ? `Build output: ${dockerBuild.error.slice(0, 200)}${dockerBuild.error.length > 200 ? "…" : ""}`
                : "The Docker image build failed. Review the Dockerfile and build context.",
            impact: "Kubernetes deployment was blocked.",
        });
    }

    if (kubernetesGeneration.attempted && !kubernetesGeneration.success) {
        priorityIssues.push({
            category: "K8S GENERATION",
            headline: "Failed",
            title: "Fix Kubernetes file generation",
            body: kubernetesGeneration.error || "Kubernetes YAML generation failed.",
            impact: "Deployment was blocked.",
        });
    }

    if (kubernetesDeployment.attempted && !kubernetesDeployment.success) {
        priorityIssues.push({
            category: "K8S DEPLOYMENT",
            headline: "Failed",
            title: "Fix Kubernetes deployment",
            body: kubernetesDeployment.error
                ? `kubectl error: ${kubernetesDeployment.error.slice(0, 200)}${kubernetesDeployment.error.length > 200 ? "…" : ""}`
                : "The Kubernetes deployment failed. Verify Minikube is running.",
            impact: "Application is not running in the cluster.",
        });
    }

    if (priorityIssues.length === 0) {
        priorityIssues.push({
            category: "PIPELINE",
            headline: "All steps passed",
            title: "Monitor live metrics",
            body: "The full pipeline completed successfully. Visit the Dashboard to monitor real-time CPU and memory usage.",
            impact: "Application is deployed and running.",
        });
    }

    const handleGenerateReport = () => {
        window.print();
    };

    return (
        <div className="report-page">

            <header className="page-header">
                <h1>Cloud Deployment Decision Support Platform</h1>
                <p>Report Analysis</p>
            </header>

            <div className="report-title">
                <h2>Priority recommendations</h2>
                <p>Address the highest-risk signals first to improve readiness.</p>
                <span>{priorityIssues.length} {priorityIssues.length === 1 ? "priority" : "priorities"}</span>
            </div>

            <section className="recommendation-grid">
                {priorityIssues.map((issue, i) => (
                    <div className="recommendation-card" key={i}>
                        <span>{issue.category}</span>
                        <h2>{issue.headline}</h2>
                        <h3>{issue.title}</h3>
                        <p>{issue.body}</p>
                        <hr />
                        <small>ESTIMATED IMPACT</small>
                        <p>{issue.impact}</p>
                    </div>
                ))}
            </section>

            <section className="deployment-summary">

                <div>
                    <h3>Deployment summary</h3>
                    <p>{repoName} · Job ID: {jobId}</p>

                    <div className="summary-metrics">

                        <div>
                            <span>Dockerfile</span>
                            <strong>{validation.dockerfile ? "Found" : "Missing"}</strong>
                        </div>

                        <div>
                            <span>Docker Build</span>
                            <strong>{stepStatus(dockerBuild.attempted, dockerBuild.success)}</strong>
                        </div>

                        <div>
                            <span>K8s Deploy</span>
                            <strong>{stepStatus(kubernetesDeployment.attempted, kubernetesDeployment.success)}</strong>
                        </div>

                        {metrics?.cpu != null && (
                            <div>
                                <span>CPU</span>
                                <strong>{(metrics.cpu * 1000).toFixed(2)} m</strong>
                            </div>
                        )}

                        {metrics?.memoryMiB != null && (
                            <div>
                                <span>Memory</span>
                                <strong>{metrics.memoryMiB} MiB</strong>
                            </div>
                        )}

                    </div>
                </div>

                <button onClick={handleGenerateReport}>
                    Print / Save Report
                </button>

            </section>

            <button
                className="back-button"
                onClick={() => navigate("/analysis")}
            >
                ← Back
            </button>

        </div>
    );
}

export default Report;
