import { getSwipeWeekDaysRemaining } from "./purdueSwipeWeek";

describe("getSwipeWeekDaysRemaining", () => {
  it("counts down toward this week's Sunday 9pm ET from a Monday morning", () => {
    // Monday 7am ET (just after the 6am reset) — nearly the full week ahead,
    // ending Sunday 9pm ET six days later.
    const mondayMorning = new Date("2026-09-14T07:00:00-04:00");
    const days = getSwipeWeekDaysRemaining(mondayMorning);
    expect(days).toBeGreaterThan(6);
    expect(days).toBeLessThan(6.6);
  });

  it("counts down toward the same Sunday from mid-week", () => {
    const wednesdayNoon = new Date("2026-09-16T12:00:00-04:00");
    const days = getSwipeWeekDaysRemaining(wednesdayNoon);
    expect(days).toBeGreaterThan(3.5);
    expect(days).toBeLessThan(4.5);
  });

  it("goes negative just after the Sunday 9pm ET cutoff", () => {
    const justAfterCutoff = new Date("2026-09-13T21:01:00-04:00");
    expect(getSwipeWeekDaysRemaining(justAfterCutoff)).toBeLessThan(0);
  });

  it("is still positive just before the Sunday 9pm ET cutoff", () => {
    const justBeforeCutoff = new Date("2026-09-13T20:59:00-04:00");
    const days = getSwipeWeekDaysRemaining(justBeforeCutoff);
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThan(0.01);
  });
});
