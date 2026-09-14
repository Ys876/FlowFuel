import React from "react";
import { useCurrentPhase } from "../../hooks/useCurrentPhase";
import { getPhaseCopy } from "../../lib/phaseCopy";

export default function PhaseCard() {
  const phase = useCurrentPhase();

  // Below the confidence threshold, or once the predicted next period has
  // passed with nothing logged, drop the card entirely rather than guess.
  if (!phase) return null;

  const copy = getPhaseCopy(phase.phaseName);

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        {copy && <span style={{ fontSize: 22 }}>{copy.emoji}</span>}
        <div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "capitalize" }}>
            {phase.phaseName} phase
          </div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{copy?.headline}</div>
        </div>
      </div>
      {copy && (
        <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          {copy.body}
        </div>
      )}
    </div>
  );
}
