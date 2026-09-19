import { useNavigate } from "react-router-dom";

function DeploymentAnalysis() {
    const navigate = useNavigate();

    return (
        <div className="analysis-page">

            <header className="page-header">
                <h1>Cloud Deployment Decision Support Platform</h1>
                <p>Deployment analysis</p>
            </header>

            <div className="repository-display">
                <span>Repository</span>
                <p>https://github.com/example/cloud-native-app</p>
            </div>

            <div className="analysis-list">

                <div className="analysis-item">
                    <div>
                        <h3>Validation</h3>
                        <p>Dockerfile detected • Repository structure valid</p>
                    </div>
                    <strong>PASS</strong>
                </div>

                <div className="analysis-item">
                    <div>
                        <h3>CPU Usage</h3>
                        <p>Estimated peak CPU: 62%</p>
                    </div>
                    <strong>62%</strong>
                </div>

                <div className="analysis-item">
                    <div>
                        <h3>Memory Usage</h3>
                        <p>Estimated peak memory: 1.8 GB</p>
                    </div>
                    <strong>1.8 GB</strong>
                </div>

                <div className="analysis-item">
                    <div>
                        <h3>Scaling</h3>
                        <p>Recommended: horizontal scaling</p>
                    </div>
                    <strong>HPA</strong>
                </div>

                <div className="analysis-item">
                    <div>
                        <h3>Cost Calculation</h3>
                        <p>Estimated monthly compute cost</p>
                    </div>
                    <strong>$84</strong>
                </div>

            </div>

            <div className="bottom-navigation">

                <button onClick={() => navigate("/")}>
                    ← Home
                </button>

                <div>
                    <button onClick={() => navigate("/monitoring")}>
                        Dashboard
                    </button>

                    <button onClick={() => navigate("/assessment")}>
                        Deployment Assessment
                    </button>

                    <button onClick={() => navigate("/report")}>
                        Report
                    </button>
                </div>

            </div>

        </div>
    );
}

export default DeploymentAnalysis;