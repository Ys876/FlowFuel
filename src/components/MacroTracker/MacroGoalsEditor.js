import React, { useState } from "react";
import { useProfile } from "../../context/ProfileContext";

const FIELDS = [
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein (g)" },
  { key: "fat", label: "Fat (g)" },
  { key: "carb", label: "Carbs (g)" },
];

export default function MacroGoalsEditor() {
  const { profile, setMacroGoals } = useProfile();
  const [draft, setDraft] = useState(profile.macroGoals || {});

  const save = (next) => {
    setDraft(next);
    // Empty object (all fields cleared) is stored as null so downstream
    // "has goals" checks stay a simple truthiness check.
    const hasAnyValue = Object.values(next).some((v) => v != null && v !== "");
    setMacroGoals(hasAnyValue ? next : null);
  };

  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Macro goals (optional)</div>
      <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>
        Rough targets to aim near, not hard limits. Leave any blank to skip it.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {FIELDS.map(({ key, label }) => (
          <label key={key}>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{label}</div>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={draft[key] ?? ""}
              onChange={(e) => {
                const value = e.target.value === "" ? "" : Number(e.target.value);
                save({ ...draft, [key]: value });
              }}
              style={{ fontSize: 16, padding: 8, width: "100%" }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
