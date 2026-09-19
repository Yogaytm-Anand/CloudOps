import { useNavigate } from "react-router-dom";

function Gauge({ percentage }) {
    const circumference = 282.74;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="gauge">
            <svg viewBox="0 0 220 120">
                <path
                    className="gauge-background"
                    d="M 20 100 A 90 90 0 0 1 200 100"
                />
                <path
                    className="gauge-progress"
                    d="M 20 100 A 90 90 0 0 1 200 100"
                    style={{ strokeDashoffset: offset }}
                />
            </svg>
        </div>
    );
}

function Monitoring() {
    const navigate = useNavigate();

    return (
        <div className="monitoring-page">
            <header className="page-header">
                <h1>Cloud Deployment Decision Support Platform</h1>
                <p>Deployment analysis</p>
            </header>

            <div className="metrics-grid">

                <div className="metric-card">
                    <h2>CPU Usage</h2>
                    <span>CORE PERFORMANCE</span>
                    <Gauge percentage={72} />
                    <strong>72%</strong>
                </div>

                <div className="metric-card">
                    <h2>Memory</h2>
                    <span>RAM UTILIZATION</span>
                    <Gauge percentage={45} />
                    <strong>45%</strong>
                </div>

                <div className="metric-card">
                    <h2>Response Time</h2>
                    <span>APPLICATION LATENCY</span>
                    <Gauge percentage={60} />
                    <strong>1800 ms</strong>
                </div>

                <div className="metric-card">
                    <h2>Request Rate</h2>
                    <span>THROUGHPUT RATE</span>
                    <Gauge percentage={33} />
                    <strong>33%</strong>
                </div>

                <div className="metric-card">
                    <h2>Error Rate</h2>
                    <span>SYSTEM RELIABILITY</span>
                    <Gauge percentage={61} />
                    <strong>61%</strong>
                </div>

            </div>

            <button
                className="back-button"
                onClick={() => navigate("/analysis")}
            >
                ← Back
            </button>
        </div>
    );
}

export default Monitoring;