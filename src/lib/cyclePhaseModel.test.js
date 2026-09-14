import { updateCycleLengthModel, isPredictionStale, getCurrentPhase } from "./cyclePhaseModel";

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};

describe("updateCycleLengthModel", () => {
  it("starts at the population prior with a single logged start", () => {
    const model = updateCycleLengthModel([daysAgo(0)]);
    expect(model.meanCycleLength).toBe(28);
    expect(model.variance).toBe(9);
  });

  it("shrinks variance and pulls the mean toward consistent observed intervals", () => {
    const dates = [daysAgo(90), daysAgo(60), daysAgo(30), daysAgo(0)]; // ~30-day cycles
    const model = updateCycleLengthModel(dates);
    expect(model.variance).toBeLessThan(9);
    expect(model.meanCycleLength).toBeGreaterThan(28);
    expect(model.meanCycleLength).toBeLessThan(30);
  });

  it("becomes more confident (lower variance) with more consistent observations", () => {
    const twoIntervals = updateCycleLengthModel([daysAgo(60), daysAgo(30), daysAgo(0)]);
    const fourIntervals = updateCycleLengthModel([
      daysAgo(120),
      daysAgo(90),
      daysAgo(60),
      daysAgo(30),
      daysAgo(0),
    ]);
    expect(fourIntervals.variance).toBeLessThan(twoIntervals.variance);
  });
});

describe("isPredictionStale", () => {
  it("treats a model with no observed start as stale", () => {
    expect(isPredictionStale({ meanCycleLength: 28, variance: 9, lastObservedStart: null })).toBe(
      true
    );
  });

  it("is not stale when today is before the predicted next start", () => {
    const model = { meanCycleLength: 28, variance: 1, lastObservedStart: daysAgo(5) };
    expect(isPredictionStale(model)).toBe(false);
  });

  it("is stale once well past the predicted next start with nothing new logged", () => {
    const model = { meanCycleLength: 28, variance: 1, lastObservedStart: daysAgo(40) };
    expect(isPredictionStale(model)).toBe(true);
  });
});

describe("getCurrentPhase", () => {
  it("returns null when there is no phase model yet", () => {
    expect(getCurrentPhase(null)).toBeNull();
  });

  it("returns null (drops the card) when confidence is below threshold", () => {
    const lowConfidenceModel = { meanCycleLength: 28, variance: 9, lastObservedStart: daysAgo(0) };
    expect(getCurrentPhase(lowConfidenceModel)).toBeNull();
  });

  it("returns null when the prediction is stale even if confidence would otherwise be high", () => {
    const staleModel = { meanCycleLength: 28, variance: 1, lastObservedStart: daysAgo(40) };
    expect(getCurrentPhase(staleModel)).toBeNull();
  });

  it("returns a phase name and confidence when confident and not stale", () => {
    const confidentModel = { meanCycleLength: 28, variance: 1, lastObservedStart: daysAgo(1) };
    const result = getCurrentPhase(confidentModel);
    expect(result).not.toBeNull();
    expect(result.phaseName).toBe("menstrual");
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});
