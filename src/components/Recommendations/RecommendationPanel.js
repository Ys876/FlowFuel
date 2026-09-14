import React, { useRef, useState } from "react";
import { buildRecommendationRequest } from "../../lib/recommendationPipeline";
import { getPurdueDateString } from "../../lib/purdueDate";

export default function RecommendationPanel({ date = getPurdueDateString() }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [locations, setLocations] = useState([]);
  const [priority, setPriority] = useState(null);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const handleGetRecommendations = async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setError(null);

    try {
      const { optimizerState, result } = await buildRecommendationRequest({
        date,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setPriority(optimizerState.priority);
      setLocations(result.locations || []);
      setStatus("done");
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setError(err.message || "Couldn't get recommendations.");
    }
  };

  return (
    <div className="card">
      <button className="tap-target" onClick={handleGetRecommendations} disabled={status === "loading"}>
        {status === "loading" ? "Finding your best options…" : "Get recommendations"}
      </button>

      {status === "error" && (
        <div style={{ color: "var(--color-accent)", marginTop: 8 }}>{error}</div>
      )}

      {status === "done" && (
        <div style={{ marginTop: 12 }}>
          {priority && (
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>
              Picked to help you {priority}
            </div>
          )}
          {locations.length === 0 && <div>No combos came back — try again in a bit.</div>}
          {locations.map((location, i) => (
            <div
              key={`${location.diningHall}-${i}`}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: 14,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 16 }}>{location.diningHall}</div>
                {i === 0 && (
                  <span style={{ fontSize: 11, color: "var(--color-accent)", fontWeight: 600 }}>
                    TOP PICK
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, marginBottom: 6 }}>
                {(location.items || []).join(" + ")}
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                {location.rationale}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
