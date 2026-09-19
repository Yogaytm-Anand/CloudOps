import { useNavigate } from "react-router-dom";

function Assessment() {
    const navigate = useNavigate();

    return (
        <div className="assessment-page">

            <header className="page-header">
                <h1>Cloud Deployment Decision Support Platform</h1>
                <p>Deployment Assessment</p>
            </header>

            <section className="assessment-grid">

                <div className="assessment-card">
                    <h3>Performance</h3>
                    <span>RESPONSE & THROUGHPUT</span>
                    <small>STATUS</small>
                    <strong>Good</strong>
                </div>

                <div className="assessment-card">
                    <h3>Resource Utilization</h3>
                    <span>CPU & MEMORY</span>
                    <small>STATUS</small>
                    <strong>Needs Attention</strong>
                </div>

                <div className="assessment-card">
                    <h3>Reliability</h3>
                    <span>ERROR RATE & UPTIME</span>
                    <small>STATUS</small>
                    <strong>Good</strong>
                </div>

                <div className="assessment-card">
                    <h3>Scalability</h3>
                    <span>LOAD & GROWTH</span>
                    <small>STATUS</small>
                    <strong>Needs Attention</strong>
                </div>

            </section>

            <section className="wide-card">
                <h3>Key Findings</h3>

                <ul>
                    <li>Response time remains stable under current traffic.</li>
                    <li>Memory utilization is trending upward and should be monitored.</li>
                    <li>Error rate is within acceptable bounds for the current release.</li>
                    <li>Scalability will require review before the next major traffic spike.</li>
                </ul>
            </section>

            <section className="summary-card">
                <h3>Summary</h3>
                <span>OVERALL READINESS</span>
                <small>STATUS</small>
                <strong>Good</strong>
            </section>

            <section className="wide-card">
                <h3>Recommendations</h3>

                <ul>
                    <li>Response time is high at 1800 ms, indicating degraded application performance.</li>
                    <li>Error rate is high at 61%, indicating a significant number of failed requests.</li>
                    <li>CPU utilization is moderate at 72%.</li>
                    <li>Memory utilization is relatively low at 45%.</li>
                </ul>
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

export default Assessment;