import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Home() {
    const [repository, setRepository] = useState("");
    const navigate = useNavigate();

    const handleAnalyze = () => {
        if (!repository.trim()) {
            return;
        }

        navigate("/analysis");
    };

    return (
        <div className="home-page">

            <header className="home-header">
                <h1>Cloud Deployment Decision Support Platform</h1>
                <p>Analyze your cloud-native application</p>
            </header>

            <div className="feature-row">

                <div className="feature">
                    <div className="feature-icon">♢</div>
                    <p>Validation</p>
                </div>

                <div className="feature">
                    <div className="feature-icon">▣</div>
                    <p>CPU Usage</p>
                </div>

                <div className="feature">
                    <div className="feature-icon">▤</div>
                    <p>Memory Usage</p>
                </div>

                <div className="feature">
                    <div className="feature-icon">↗</div>
                    <p>Scaling</p>
                </div>

                <div className="feature">
                    <div className="feature-icon">$</div>
                    <p>Cost Calculation</p>
                </div>

            </div>

            <div className="repository-section">

                <form className="repository-input" onSubmit={(e) => {
                    e.preventDefault();
                    handleAnalyze();
            }}>
                <input
                    type="text"
                    placeholder="Type the GitHub repository link..."
                    value={repository}
                    onChange={(e) => setRepository(e.target.value)}
                />
                <button type="submit">Analyze</button>
</form>

                <p className="docker-warning">
                    ⚠ The repository must have Dockerfile
                </p>

            </div>

        </div>
    );
}

export default Home;