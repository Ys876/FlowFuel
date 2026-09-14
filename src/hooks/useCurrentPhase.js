import { useEffect, useState } from "react";
import { getCycles } from "../db/indexedDb";
import { getCurrentPhase } from "../lib/cyclePhaseModel";

// Shared by any component that needs the current phase (or null, when
// confidence is too low / the prediction is stale) so they don't each open
// their own IndexedDB read.
export function useCurrentPhase() {
  const [phase, setPhase] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCycles().then((cycles) => {
      if (!cancelled) setPhase(getCurrentPhase(cycles.phaseModel));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return phase;
}
