import { getSwipeWeekDaysRemaining } from "./purdueSwipeWeek";

const EXPECTED_MEALS_PER_DAY = 2.5;
const FALLBACK_TYPICAL_DOLLAR_COST = 12;
const MIN_DAYS_REMAINING = 1;

export function averageDollarCost(menuItems) {
  const priced = menuItems.filter(
    (item) => typeof item.dollar_cost === "number" && !Number.isNaN(item.dollar_cost)
  );
  if (priced.length === 0) return FALLBACK_TYPICAL_DOLLAR_COST;
  const sum = priced.reduce((total, item) => total + item.dollar_cost, 0);
  return sum / priced.length;
}

/**
 * Dollars and swipes run on genuinely different clocks: dollars deplete over
 * the whole semester against the user's own `resetDate`, while swipes reset
 * every Monday 6am ET and expire every Sunday 9pm ET regardless of what the
 * user enters as resetDate — so each gets its own daysRemaining, both
 * clamped to a minimum of 1 so per-day rates stay finite.
 */
export function computeOptimizerState({
  dollarsRemaining,
  swipesRemaining,
  resetDate,
  today = new Date(),
  menuItems = [],
}) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const rawDollarsDaysRemaining = (new Date(resetDate) - new Date(today)) / msPerDay;
  const dollarsDaysRemaining = Math.max(rawDollarsDaysRemaining, MIN_DAYS_REMAINING);
  const swipesDaysRemaining = Math.max(getSwipeWeekDaysRemaining(today), MIN_DAYS_REMAINING);

  const dollarsPerDay = dollarsRemaining / dollarsDaysRemaining;
  const swipesPerDay = swipesRemaining / swipesDaysRemaining;

  const typicalMealDollarCost = averageDollarCost(menuItems);

  const swipeScarcity = swipesPerDay / EXPECTED_MEALS_PER_DAY;
  const dollarScarcity = dollarsPerDay / (EXPECTED_MEALS_PER_DAY * typicalMealDollarCost);

  const priority = swipeScarcity < dollarScarcity ? "preserve swipes" : "preserve dollars";

  return {
    daysRemaining: dollarsDaysRemaining,
    dollarsDaysRemaining,
    swipesDaysRemaining,
    dollarsPerDay,
    swipesPerDay,
    typicalMealDollarCost,
    swipeScarcity,
    dollarScarcity,
    priority,
  };
}
