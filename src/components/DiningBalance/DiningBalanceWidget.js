import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

const MOVE_SPRING = { type: "spring", stiffness: 247, damping: 31 };

export default function DiningBalanceWidget({ balance, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef(null);
  // Mirrors `draft` so commit() (called from a document-level listener set up
  // once per edit session) always reads the latest value without needing
  // `draft` in that effect's deps — and without calling onSave (a side
  // effect) from inside a setState updater, which StrictMode double-invokes.
  const draftRef = useRef(null);

  const startEditing = () => {
    const initial = {
      dollarsRemaining: balance?.dollarsRemaining ?? 0,
      swipesRemaining: balance?.swipesRemaining ?? 0,
      resetDate: balance?.resetDate ?? new Date().toISOString().slice(0, 10),
    };
    draftRef.current = initial;
    setDraft(initial);
    setEditing(true);
  };

  const updateDraft = (updater) => {
    setDraft((current) => {
      const next = updater(current);
      draftRef.current = next;
      return next;
    });
  };

  const commit = () => {
    if (draftRef.current) onSave(draftRef.current);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  // Commit on tap-outside only — NOT on blur of an individual field. Blur
  // fires when tabbing/clicking between the dollars and swipes inputs too,
  // which used to commit-and-exit before the second field could ever be
  // interacted with (the widget would snap back to display mode mid-edit).
  useEffect(() => {
    if (!editing) return;
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        commit();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const transition = prefersReducedMotion ? { duration: 0 } : MOVE_SPRING;

  return (
    <motion.div
      layout
      transition={transition}
      className="card"
      aria-label="Dining balance"
      ref={containerRef}
    >
      {!editing ? (
        <motion.button
          layout
          transition={transition}
          whileTap={{ scale: 0.98 }}
          onClick={startEditing}
          className="tap-target"
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            background: "none",
            border: "none",
            padding: 0,
            textAlign: "left",
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Dollars left</div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>
              ${(balance?.dollarsRemaining ?? 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Swipes left</div>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{balance?.swipesRemaining ?? 0}</div>
          </div>
        </motion.button>
      ) : (
        <motion.div layout transition={transition}>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Dollars left</div>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                min="0"
                value={draft.dollarsRemaining}
                onChange={(e) =>
                  updateDraft((d) => ({ ...d, dollarsRemaining: Number(e.target.value) }))
                }
                style={{ fontSize: 24, width: "100%", padding: 8 }}
              />
            </label>
            <label style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Swipes left</div>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={draft.swipesRemaining}
                onChange={(e) =>
                  updateDraft((d) => ({ ...d, swipesRemaining: Number(e.target.value) }))
                }
                style={{ fontSize: 24, width: "100%", padding: 8 }}
              />
            </label>
          </div>
          <label>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Dollars reset on</div>
            <input
              type="date"
              value={draft.resetDate}
              onChange={(e) => updateDraft((d) => ({ ...d, resetDate: e.target.value }))}
              style={{ fontSize: 16, padding: 8, width: "100%" }}
            />
          </label>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            Swipes always reset Monday 6am and expire Sunday 9pm — that's built in, not something you set.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button className="tap-target" onClick={cancel} style={{ marginRight: 8 }}>
              Cancel
            </button>
            <button className="tap-target" onClick={commit}>
              Done
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
