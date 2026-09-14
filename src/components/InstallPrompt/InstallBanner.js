import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  onInstallAvailabilityChange,
  isInstallAvailable,
  promptInstall,
  hasCompletedMilestoneAction,
  onMilestoneReached,
} from "../../lib/installPrompt";

export default function InstallBanner() {
  const [available, setAvailable] = useState(isInstallAvailable());
  const [dismissed, setDismissed] = useState(false);
  const [milestoneVersion, setMilestoneVersion] = useState(0);

  useEffect(() => onInstallAvailabilityChange(setAvailable), []);
  useEffect(() => onMilestoneReached(() => setMilestoneVersion((v) => v + 1)), []);

  const shouldShow =
    available && !dismissed && hasCompletedMilestoneAction();

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          key={`install-banner-${milestoneVersion}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="card"
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: `calc(72px + env(safe-area-inset-bottom))`,
            zIndex: 25,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14 }}>Install FlowFuel for offline access</span>
          <div>
            <button
              className="tap-target"
              onClick={() => setDismissed(true)}
              style={{ marginRight: 8 }}
            >
              Not now
            </button>
            <button
              className="tap-target"
              onClick={async () => {
                await promptInstall();
                setDismissed(true);
              }}
            >
              Install
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
