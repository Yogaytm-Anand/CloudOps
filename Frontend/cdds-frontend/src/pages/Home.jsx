import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { analyzeRepo } from "../services/api";

function Home() {
    const [repository, setRepository] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { saveAnalysis, clearAnalysis } = useApp();

    const handleAnalyze = async (e) => {
        e.preventDefault();

        const url = repository.trim();

        if (!url) return;

        if (!url.startsWith("https://github.com/")) {
            setError("Only GitHub repositories are supported (must start with https://github.com/)");
            return;
        }

        setError(null);
        setLoading(true);
        clearAnalysis();

        try {
            const result = await analyzeRepo(url);
            saveAnalysis(result);
            navigate("/analysis");
        } catch (err) {
            setError(err.message || "Analysis failed. Is the backend running on port 4000?");
        } finally {
            setLoading(false);
        }
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
                    <p>Docker Build</p>
                </div>

                <div className="feature">
                    <div className="feature-icon">▤</div>
                    <p>K8s Deploy</p>
                </div>

                <div className="feature">
                    <div className="feature-icon">◉</div>
                    <p>CPU Monitor</p>
                </div>

                <div className="feature">
                    <div className="feature-icon">▦</div>
                    <p>Memory Monitor</p>
                </div>

            </div>

            <div className="repository-section">

                <form className="repository-input" onSubmit={handleAnalyze}>
                    <input
                        type="text"
                        placeholder="Type the GitHub repository link..."
                        value={repository}
                        onChange={(e) => {
                            setRepository(e.target.value);
                            if (error) setError(null);
                        }}
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? "Analyzing…" : "Analyze"}
                    </button>
                </form>

                {error && (
                    <p className="docker-warning error-text">⚠ {error}</p>
                )}

                {loading && (
                    <p className="loading-hint">
                        Cloning repository and running pipeline — this may take a minute…
                    </p>
                )}

                {!error && !loading && (
                    <p className="docker-warning">
                        ⚠ The repository must have a Dockerfile
                    </p>
                )}

            </div>

        </div>
    );
}

export default Home;
