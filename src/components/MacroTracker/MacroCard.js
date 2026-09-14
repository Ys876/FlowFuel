import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { getPhaseNutrientFocus } from "../../lib/phaseNutrition";
import { roundNum } from "../../lib/format";

const CARD_SPRING = { type: "spring", stiffness: 247, damping: 25 };

export default function MacroCard({ visible, todayTotals, goals, phaseName }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const transition = prefersReducedMotion ? { duration: 0.1 } : CARD_SPRING;
  const focus = getPhaseNutrientFocus(phaseName);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="macro-card"
          layout
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.9 }}
          transition={transition}
          className="card"
        >
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Today so far</div>

          <MacroRow label="Calories" value={todayTotals?.calories} goal={goals?.calories} />
          <MacroRow label="Protein" value={todayTotals?.protein} goal={goals?.protein} unit="g" />
          <MacroRow label="Fat" value={todayTotals?.fat} goal={goals?.fat} unit="g" />
          <MacroRow label="Carbs" value={todayTotals?.carb} goal={goals?.carb} unit="g" />

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
            <MicronutrientRow
              label="Iron"
              pct={todayTotals?.iron}
              emphasized={focus.nutrient === "iron"}
            />
            <MicronutrientRow
              label="Calcium"
              pct={todayTotals?.calcium}
              emphasized={focus.nutrient === "calcium"}
            />
            {focus.note && (
              <div style={{ fontSize: 12, color: "var(--color-accent)", marginTop: 6 }}>
                {focus.note}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Soft progress: fills toward a goal if one is set, caps visually at 100% (no
// red/over-limit styling past that — going over an approximate target isn't
// treated as a failure state here, intentionally, to avoid restrictive or
// binge-triggering framing).
function MacroRow({ label, value, goal, unit = "" }) {
  const rounded = roundNum(value) ?? 0;
  const hasGoal = typeof goal === "number" && goal > 0;
  const fraction = hasGoal ? Math.min(rounded / goal, 1) : 0;

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          marginBottom: 4,
        }}
      >
        <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
        <span>
          {rounded}
          {unit}
          {hasGoal && (
            <span style={{ color: "var(--color-text-muted)" }}>
              {" "}
              / ~{goal}
              {unit}
            </span>
          )}
        </span>
      </div>
      {hasGoal && (
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: "var(--color-border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${fraction * 100}%`,
              background: "var(--color-accent)",
              borderRadius: 3,
            }}
          />
        </div>
      )}
    </div>
  );
}

function MicronutrientRow({ label, pct, emphasized }) {
  const rounded = roundNum(pct) ?? 0;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        fontWeight: emphasized ? 600 : 400,
        color: emphasized ? "var(--color-text)" : "var(--color-text-muted)",
      }}
    >
      <span>{label}{emphasized ? " •" : ""}</span>
      <span>{rounded}% DV</span>
    </div>
  );
}
