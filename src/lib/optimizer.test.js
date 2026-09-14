import { computeOptimizerState, averageDollarCost } from "./optimizer";

// A fixed anchor (a Wednesday, safely mid-week and mid-day) rather than the
// real wall clock — computeOptimizerState's swipe-window math is genuinely
// time-of-week-sensitive (swipes reset Monday, expire Sunday 9pm), so a test
// anchored to "whenever this happens to run" can land in that edge-case
// window and produce a flaky result exactly at the boundary.
const ANCHOR = new Date("2026-09-16T12:00:00");

const daysFromAnchor = (n) => {
  const d = new Date(ANCHOR);
  d.setDate(d.getDate() + n);
  return d;
};

describe("averageDollarCost", () => {
  it("averages only priced items", () => {
    const items = [
      { dollar_cost: 10 },
      { dollar_cost: 14 },
      { dollar_cost: null },
      { name: "swipe-only item" },
    ];
    expect(averageDollarCost(items)).toBe(12);
  });

  it("falls back to 12 when no priced items exist", () => {
    expect(averageDollarCost([])).toBe(12);
    expect(averageDollarCost([{ dollar_cost: null }])).toBe(12);
  });
});

describe("computeOptimizerState", () => {
  it("prioritizes preserving swipes when swipes are scarcer relative to time", () => {
    const result = computeOptimizerState({
      dollarsRemaining: 200,
      swipesRemaining: 2,
      resetDate: daysFromAnchor(10),
      today: ANCHOR,
      menuItems: [{ dollar_cost: 10 }],
    });
    expect(result.priority).toBe("preserve swipes");
  });

  it("prioritizes preserving dollars when dollars are scarcer relative to time", () => {
    const result = computeOptimizerState({
      dollarsRemaining: 5,
      swipesRemaining: 30,
      resetDate: daysFromAnchor(10),
      today: ANCHOR,
      menuItems: [{ dollar_cost: 10 }],
    });
    expect(result.priority).toBe("preserve dollars");
  });

  it("clamps dollars daysRemaining to a minimum of 1 at/after the reset date", () => {
    const past = daysFromAnchor(-3);

    const atReset = computeOptimizerState({
      dollarsRemaining: 50,
      swipesRemaining: 10,
      resetDate: ANCHOR,
      today: ANCHOR,
      menuItems: [],
    });
    expect(atReset.dollarsDaysRemaining).toBe(1);
    expect(Number.isFinite(atReset.dollarsPerDay)).toBe(true);
    expect(Number.isFinite(atReset.swipesPerDay)).toBe(true);

    const pastReset = computeOptimizerState({
      dollarsRemaining: 50,
      swipesRemaining: 10,
      resetDate: past,
      today: ANCHOR,
      menuItems: [],
    });
    expect(pastReset.dollarsDaysRemaining).toBe(1);
  });

  it("uses the real average dollar cost from menu items when available", () => {
    const result = computeOptimizerState({
      dollarsRemaining: 100,
      swipesRemaining: 20,
      resetDate: daysFromAnchor(5),
      today: ANCHOR,
      menuItems: [{ dollar_cost: 8 }, { dollar_cost: 16 }],
    });
    expect(result.typicalMealDollarCost).toBe(12);
  });

  it("computes swipesDaysRemaining from the weekly Mon 6am - Sun 9pm ET window, not resetDate", () => {
    // Wednesday noon: several full days left in the current swipe week,
    // regardless of how far off resetDate (a whole semester away) is.
    const result = computeOptimizerState({
      dollarsRemaining: 100,
      swipesRemaining: 10,
      resetDate: daysFromAnchor(60),
      today: ANCHOR,
      menuItems: [],
    });
    expect(result.swipesDaysRemaining).toBeGreaterThan(3);
    expect(result.swipesDaysRemaining).toBeLessThan(5);
  });

  it("clamps swipesDaysRemaining to a minimum of 1 in the dead zone after Sunday 9pm ET", () => {
    const lateSunday = new Date("2026-09-13T22:00:00-04:00"); // Sun 10pm ET, past the 9pm cutoff
    const result = computeOptimizerState({
      dollarsRemaining: 100,
      swipesRemaining: 10,
      resetDate: daysFromAnchor(60),
      today: lateSunday,
      menuItems: [],
    });
    expect(result.swipesDaysRemaining).toBe(1);
  });
});
