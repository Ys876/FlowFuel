import React from "react";
import MacroToggle from "../MacroTracker/MacroToggle";
import MacroGoalsEditor from "../MacroTracker/MacroGoalsEditor";
import CycleLogger from "../Cycle/CycleLogger";
import { useProfile } from "../../context/ProfileContext";

export default function Settings() {
  const { profile, setMacroTrackerOn } = useProfile();

  return (
    <div>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600 }}>Macro tracker</div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            Track calories and macros from logged meals
          </div>
        </div>
        <MacroToggle on={profile.macroTrackerOn} onChange={setMacroTrackerOn} />
      </div>
      {profile.macroTrackerOn && <MacroGoalsEditor />}
      <CycleLogger />
    </div>
  );
}
