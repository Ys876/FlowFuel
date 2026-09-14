// Which micronutrient (if any) gets emphasized per cycle phase, and why.
// Scoped to what Purdue's dining API actually reports per item: iron and
// calcium (both are real `nutritionFacts` fields — see
// backend/scrapers/purdue_dining_scraper.js). Magnesium and vitamin B6 are
// the other commonly-cited nutrients for PMS/luteal-phase symptom support,
// but Purdue's menu API does not expose either, so they are intentionally
// NOT tracked here rather than shown with fabricated numbers.
//
// Rationale (general nutrition guidance, not medical advice):
// - Menstrual phase: iron losses from menstrual blood are the most
//   well-established phase-linked nutrient need — emphasize iron.
// - Follicular / ovulation: no single micronutrient has strong phase-specific
//   backing beyond general balanced intake — no emphasis.
// - Luteal phase: calcium (around 1000-1200mg/day) has the best-supported
//   evidence among trackable-here nutrients for easing PMS symptoms —
//   emphasize calcium. (Magnesium and B6 are also commonly cited for this
//   phase but aren't in the available data.)
const PHASE_FOCUS = {
  menstrual: {
    nutrient: "iron",
    label: "Iron",
    note: "Iron matters more right now — menstrual blood loss depletes it.",
  },
  follicular: { nutrient: null, label: null, note: null },
  ovulation: { nutrient: null, label: null, note: null },
  luteal: {
    nutrient: "calcium",
    label: "Calcium",
    note: "Calcium is worth a bit more attention this week — it's linked to easier PMS symptoms.",
  },
};

export function getPhaseNutrientFocus(phaseName) {
  return PHASE_FOCUS[phaseName] || { nutrient: null, label: null, note: null };
}
