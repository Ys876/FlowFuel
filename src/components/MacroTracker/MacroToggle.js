import React from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

const THUMB_SPRING = { type: "spring", stiffness: 987, damping: 50 };
const TRACK_WIDTH = 44;
const THUMB_SIZE = 24;

export default function MacroToggle({ on, onChange }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const transition = prefersReducedMotion ? { duration: 0.08 } : THUMB_SPRING;

  return (
    <button
      role="switch"
      aria-checked={on}
      onPointerDown={() => onChange(!on)}
      className="tap-target"
      style={{
        width: TRACK_WIDTH + 16,
        height: 44,
        display: "flex",
        alignItems: "center",
        border: "none",
        background: "transparent",
        padding: 8,
      }}
    >
      <span
        style={{
          width: TRACK_WIDTH,
          height: 26,
          borderRadius: 13,
          background: on ? "var(--color-accent)" : "var(--color-border)",
          position: "relative",
          display: "block",
          transition: "background 0.15s linear",
        }}
      >
        <motion.span
          animate={{ x: on ? TRACK_WIDTH - THUMB_SIZE - 2 : 2 }}
          transition={transition}
          style={{
            position: "absolute",
            top: 1,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </span>
    </button>
  );
}
