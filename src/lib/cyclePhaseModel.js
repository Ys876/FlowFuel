// Population prior for regular cycles: mean 28 days, std dev 3 days (variance 9).
const PRIOR_MEAN = 28;
const PRIOR_VARIANCE = 9;

// Assumed measurement noise variance on each self-reported interval (day-of-logging
// imprecision), used as the "observation variance" in the Bayesian update.
const OBSERVATION_VARIANCE = 4;

const PHASES = [
  { name: "menstrual", startFraction: 0, endFraction: 5 / 28 },
  { name: "follicular", startFraction: 5 / 28, endFraction: 13 / 28 },
  { name: "ovulation", startFraction: 13 / 28, endFraction: 16 / 28 },
  { name: "luteal", startFraction: 16 / 28, endFraction: 1 },
];

// Confidence from the prior alone (no logged intervals yet) works out to exactly
// 0.5 — the threshold sits just above that so an unstarted model never qualifies.
const CONFIDENCE_THRESHOLD = 0.55;

/**
 * Sequential Bayesian update of cycle length (Gaussian prior/likelihood, known
 * variance): posterior mean is the precision-weighted average of the prior and
 * each observed inter-period interval, and posterior variance shrinks with
 * every observation. This intentionally never grows more confident than the
 * data supports for a small n.
 */
export function updateCycleLengthModel(periodStartDates) {
  const sorted = [...periodStartDates].map((d) => new Date(d)).sort((a, b) => a - b);

  let mean = PRIOR_MEAN;
  let variance = PRIOR_VARIANCE;

  for (let i = 1; i < sorted.length; i++) {
    const intervalDays = (sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24);
    if (intervalDays <= 0) continue;

    const posteriorVariance = 1 / (1 / variance + 1 / OBSERVATION_VARIANCE);
    const posteriorMean =
      posteriorVariance * (mean / variance + intervalDays / OBSERVATION_VARIANCE);

    mean = posteriorMean;
    variance = posteriorVariance;
  }

  return {
    meanCycleLength: mean,
    variance,
    lastObservedStart: sorted.length > 0 ? sorted[sorted.length - 1].toISOString() : null,
  };
}

function confidenceFromVariance(variance) {
  // Maps variance down to (0,1]: PRIOR_VARIANCE (no real data yet) scores low,
  // variance approaching 0 (many consistent observations) approaches 1.
  return PRIOR_VARIANCE / (PRIOR_VARIANCE + variance);
}

/**
 * A prediction is stale once the predicted next period start has passed by
 * more than half the model's own uncertainty (variance, as a day count)
 * without a new period being logged.
 */
export function isPredictionStale(phaseModel, today = new Date()) {
  if (!phaseModel || !phaseModel.lastObservedStart) return true;
  const predictedNextStart = new Date(phaseModel.lastObservedStart);
  predictedNextStart.setDate(
    predictedNextStart.getDate() + Math.round(phaseModel.meanCycleLength)
  );
  const staleAfter = new Date(predictedNextStart);
  staleAfter.setDate(staleAfter.getDate() + Math.round(Math.sqrt(phaseModel.variance) / 2));
  return today > staleAfter;
}

/**
 * Returns null when confidence is below threshold or the prediction is stale
 * with nothing newly logged — callers should drop the phase card entirely in
 * that case rather than show a guess.
 */
export function getCurrentPhase(phaseModel, today = new Date()) {
  if (!phaseModel || !phaseModel.lastObservedStart) return null;

  const confidence = confidenceFromVariance(phaseModel.variance);
  if (confidence < CONFIDENCE_THRESHOLD) return null;
  if (isPredictionStale(phaseModel, today)) return null;

  const lastStart = new Date(phaseModel.lastObservedStart);
  const daysSinceStart =
    ((today - lastStart) / (1000 * 60 * 60 * 24)) % phaseModel.meanCycleLength;
  const fraction = daysSinceStart / phaseModel.meanCycleLength;

  const phase = PHASES.find((p) => fraction >= p.startFraction && fraction < p.endFraction);

  return {
    phaseName: phase ? phase.name : PHASES[PHASES.length - 1].name,
    confidence,
  };
}
