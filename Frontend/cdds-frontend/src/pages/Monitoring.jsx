import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { fetchMetrics } from "../services/api";

const POLL_INTERVAL_MS = 5000;

// --------------------------------------------------
// SVG gauge. A missing percentage leaves the progress arc hidden.
// --------------------------------------------------
function Gauge({ percentage }) {
    const circumference = 282.74;
    const offset = percentage != null
        ? circumference - (percentage / 100) * circumference
        : circumference; // fully hidden

    return (
        <div className="gauge">
            <svg viewBox="0 0 220 120">
                <path
                    className="gauge-background"
                    d="M 20 100 A 90 90 0 0 1 200 100"
                />
                {percentage != null && (
                    <path
                        className="gauge-progress"
                        d="M 20 100 A 90 90 0 0 1 200 100"
                        style={{ strokeDashoffset: offset }}
                    />
                )}
            </svg>
        </div>
    );
}

// --------------------------------------------------
// A single metric card. When value is null the card
// shows an explicit "Not available" message instead
// of a fake number.
// --------------------------------------------------
function MetricCard({ title, subtitle, value, unit, percentage, note, showGauge = true, className = "" }) {
    return (
        <div className={`metric-card ${className}`}>
            <h2>{title}</h2>
            <span>{subtitle}</span>
            {showGauge && <Gauge percentage={percentage} />}
            <strong>
                {value != null
                    ? `${value}${unit ? " " + unit : ""}`
                    : "—"}
            </strong>
            {note && <p className="metric-note">{note}</p>}
        </div>
    );
}

function Monitoring() {
    const navigate = useNavigate();
    const { analysis, metrics, setMetrics } = useApp();
    const jobId = analysis?.jobId ?? null;

    const [metricsError, setMetricsError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    useEffect(() => {
        if (!jobId) return;

        let isSubscribed = true;

        const loadMetrics = async () => {
            try {
                const data = await fetchMetrics(jobId);
                if (isSubscribed) {
                    setMetrics(data);
                    setMetricsError(null);
                    setLastUpdated(new Date());
                }
            } catch (err) {
                if (isSubscribed) {
                    setMetricsError(err.message);
                }
            }
        };

        loadMetrics();
        const interval = setInterval(loadMetrics, POLL_INTERVAL_MS);

        return () => {
            isSubscribed = false;
            clearInterval(interval);
        };
    }, [jobId, setMetrics]);

    // Format cpu: raw value is CPU cores rate (e.g. 0.0032) -> display as millicores
    const cpuMillicores = metrics?.cpu != null
        ? (metrics.cpu * 1000).toFixed(2)
        : null;

    // Memory: backend already provides memoryMiB
    const memoryMiB = metrics?.memoryMiB ?? null;

    return (
        <div className="monitoring-page">
            <header className="page-header">
                <h1>Cloud Deployment Decision Support Platform</h1>
                <p>Live metrics — {jobId ?? "no active deployment"}</p>
            </header>

            {/* No deployment selected */}
            {!jobId && (
                <div className="empty-state">
                    <p>No deployment to monitor.</p>
                    <button className="back-button" onClick={() => navigate("/")}>
                        ← Submit a repository first
                    </button>
                </div>
            )}

            {/* Prometheus error banner */}
            {jobId && metricsError && (
                <div className="error-banner">
                    ⚠ Prometheus unavailable: {metricsError}
                </div>
            )}

            {jobId && (
                <>
                    <div className="metrics-grid">

                        {/* CPU — raw millicores, no invented limit */}
                        <MetricCard
                            title="CPU Usage"
                            subtitle="CORE PERFORMANCE"
                            value={cpuMillicores}
                            unit="m"
                            percentage={metrics?.cpuPercentage ?? null}
                            note={cpuMillicores == null ? "Waiting for Prometheus data" : null}
                        />

                        {/* Memory — raw MiB, no invented limit */}
                        <MetricCard
                            title="Memory"
                            subtitle="RAM UTILIZATION"
                            value={memoryMiB}
                            unit="MiB"
                            percentage={metrics?.memoryPercentage ?? null}
                            note={memoryMiB == null ? "Waiting for Prometheus data" : null}
                        />

                        {/* Pod name from Prometheus result */}
                        <MetricCard
                            title="Pod"
                            subtitle="ACTIVE POD"
                            value={metrics?.pod ?? null}
                            unit=""
                            showGauge={false}
                            className="pod-card"
                            note={!metrics?.pod ? "Waiting for Prometheus data" : null}
                        />

                        <MetricCard
                            title="Response Time"
                            subtitle="APPLICATION LATENCY"
                            value={metrics?.responseTimeMs ?? null}
                            unit="ms"
                            percentage={metrics?.responseTimePercentage ?? null}
                            note={metrics?.responseTimeMs == null ? "Waiting for service probe" : null}
                        />

                        <MetricCard
                            title="Error Rate"
                            subtitle="SYSTEM RELIABILITY"
                            value={metrics?.errorRate ?? null}
                            unit="%"
                            percentage={metrics?.errorRatePercentage ?? null}
                            note={metrics?.errorRate == null ? "Waiting for service probe" : null}
                        />

                    </div>

                    {lastUpdated && (
                        <p className="last-updated">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                            {" · "}Refreshing every {POLL_INTERVAL_MS / 1000}s
                        </p>
                    )}
                </>
            )}

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
