import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { formatCal, formatGrams, formatPct } from "../../lib/format";

const DRAWER_SPRING = { type: "spring", stiffness: 438, damping: 34 };
const DISMISS_VELOCITY_THRESHOLD = 500; // px/s downward, treated as "carried real momentum"
const DISMISS_DISTANCE_THRESHOLD = 120; // px

export default function PhotoResultSheet({ open, status, result, error, onDismiss }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleDragEnd = (_event, info) => {
    if (info.offset.y > DISMISS_DISTANCE_THRESHOLD || info.velocity.y > DISMISS_VELOCITY_THRESHOLD) {
      onDismiss();
    }
  };

  const sheetMotionProps = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: DRAWER_SPRING,
        drag: "y",
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: { top: 0.15, bottom: 0.5 },
        onDragEnd: handleDragEnd,
      };

  return (
    <AnimatePresence>
      {open && (
        <React.Fragment key="photo-sheet">
          <motion.div
            className="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : DRAWER_SPRING}
            onClick={onDismiss}
          />
          <motion.div className="sheet" style={{ zIndex: 20 }} {...sheetMotionProps}>
            <div
              aria-hidden
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: "var(--color-border)",
                margin: "0 auto 16px",
              }}
            />
            {status === "loading" && <div>Analyzing your photo…</div>}
            {status === "error" && (
              <div style={{ color: "var(--color-accent)" }}>
                {error || "Couldn't analyze this photo."}
              </div>
            )}
            {status === "done" && result && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  {(result.identifiedFoods || []).join(", ") || "No foods identified"}
                </div>
                {result.estimatedMacros && (
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div>{formatCal(result.estimatedMacros.calories)} cal</div>
                    <div>{formatGrams(result.estimatedMacros.protein)} protein</div>
                    <div>{formatGrams(result.estimatedMacros.fat)} fat</div>
                    <div>{formatGrams(result.estimatedMacros.carb)} carb</div>
                    <div>{formatPct(result.estimatedMacros.iron)} iron</div>
                    <div>{formatPct(result.estimatedMacros.calcium)} calcium</div>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
                  Confidence: {result.confidence || "unknown"}
                </div>
              </div>
            )}
            <button className="tap-target" onClick={onDismiss} style={{ marginTop: 16 }}>
              Close
            </button>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
