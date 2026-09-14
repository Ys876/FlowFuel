import React, { useState } from "react";
import { addPeriodStart, getCycles, setCycles } from "../../db/indexedDb";
import { updateCycleLengthModel } from "../../lib/cyclePhaseModel";

const todayStr = () => new Date().toISOString().slice(0, 10);

async function saveDatesAndUpdateModel(dates) {
  const cycles = await getCycles();
  const merged = Array.from(new Set([...cycles.periodStartDates, ...dates])).sort();
  const phaseModel = updateCycleLengthModel(merged);
  await setCycles({ ...cycles, periodStartDates: merged, phaseModel });
  return merged;
}

export default function CycleLogger() {
  const [periodStartDates, setPeriodStartDates] = useState(null); // null = loading
  const [bulkDates, setBulkDates] = useState(["", "", ""]);
  const [newDate, setNewDate] = useState(todayStr());
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    getCycles().then((c) => setPeriodStartDates(c.periodStartDates));
  }, []);

  if (periodStartDates === null) return null;

  const isFirstTime = periodStartDates.length < 2;
  const lastPeriod = [...periodStartDates].sort().slice(-1)[0];

  const handleBulkSave = async () => {
    const validDates = bulkDates.filter(Boolean);
    if (validDates.length === 0) return;
    const merged = await saveDatesAndUpdateModel(validDates);
    setPeriodStartDates(merged);
    setSaved(true);
  };

  const handleLogNew = async () => {
    const merged = await saveDatesAndUpdateModel([newDate]);
    setPeriodStartDates(merged);
    setSaved(true);
  };

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>🌸</span>
        <div style={{ fontWeight: 600 }}>Your cycle</div>
      </div>

      {isFirstTime ? (
        <>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>
            Add your last few period start dates and we'll start predicting your phase
            right away, instead of waiting months to learn your pattern.
          </div>
          {bulkDates.map((value, i) => (
            <label key={i} style={{ display: "block", marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                {i === 0 ? "Most recent period" : `Period before that (${i + 1})`}
              </div>
              <input
                type="date"
                value={value}
                onChange={(e) => {
                  const next = [...bulkDates];
                  next[i] = e.target.value;
                  setBulkDates(next);
                  setSaved(false);
                }}
                style={{ fontSize: 16, padding: 8, width: "100%" }}
              />
            </label>
          ))}
          <button className="tap-target" onClick={handleBulkSave}>
            Save
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Last period started</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>{lastPeriod}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="date"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                setSaved(false);
              }}
              style={{ fontSize: 16, padding: 8 }}
            />
            <button className="tap-target" onClick={handleLogNew}>
              Log new period
            </button>
          </div>
        </>
      )}

      {saved && (
        <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 8 }}>
          Saved 🌸 Phase predictions get sharper the more you log.
        </div>
      )}
    </div>
  );
}
