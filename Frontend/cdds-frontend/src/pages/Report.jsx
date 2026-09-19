import { useNavigate } from "react-router-dom";

function Report() {
    const navigate = useNavigate();

    return (
        <div className="report-page">

            <header className="page-header">
                <h1>Cloud Deployment Decision Support Platform</h1>
                <p>Report Analysis</p>
            </header>

            <div className="report-title">
                <h2>Priority recommendations</h2>
                <p>Address the highest-risk signals first to improve readiness.</p>
                <span>3 priorities</span>
            </div>

            <section className="recommendation-grid">

                <div className="recommendation-card">
                    <span>RESPONSE TIME</span>
                    <h2>1800 ms</h2>

                    <h3>Reduce application latency</h3>

                    <p>
                        Add response caching and profile the slowest service paths
                        before the next release.
                    </p>

                    <hr />

                    <small>ESTIMATED IMPACT</small>
                    <p>35–45% faster responses</p>
                </div>

                <div className="recommendation-card">
                    <span>ERROR RATE</span>
                    <h2>61%</h2>

                    <h3>Stabilize failed requests</h3>

                    <p>
                        Prioritize recurring 5xx errors, add bounded retries,
                        and tighten release health checks.
                    </p>

                    <hr />

                    <small>ESTIMATED IMPACT</small>
                    <p>Up to 50% fewer failures</p>
                </div>

                <div className="recommendation-card">
                    <span>CPU UTILIZATION</span>
                    <h2>72%</h2>

                    <h3>Create compute headroom</h3>

                    <p>
                        Enable horizontal autoscaling at 65% CPU and validate
                        capacity under peak traffic.
                    </p>

                    <hr />

                    <small>ESTIMATED IMPACT</small>
                    <p>20–30% more headroom</p>
                </div>

            </section>

            <section className="deployment-summary">

                <div>
                    <h3>Deployment summary</h3>
                    <p>cloud-native-app • Analysis complete</p>

                    <div className="summary-metrics">
                        <div>
                            <span>Response time</span>
                            <strong>1800 ms</strong>
                        </div>

                        <div>
                            <span>Error rate</span>
                            <strong>61%</strong>
                        </div>

                        <div>
                            <span>CPU utilization</span>
                            <strong>72%</strong>
                        </div>
                    </div>
                </div>

                <button onClick={() => alert("Report generation coming soon")}>
                    Generate Report
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