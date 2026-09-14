import { computeOptimizerState } from "./optimizer";
import { getCurrentPhase } from "./cyclePhaseModel";
import { getPhaseNutrientFocus } from "./phaseNutrition";
import { getTodaysMenuItems } from "./menuData";
import { getDiningBalance, getCycles, getProfile } from "../db/indexedDb";
import { getRecommendations } from "./geminiClient";

const CANDIDATES_PER_HALL = 10;

function toCandidate(item) {
  return {
    name: item.name,
    swipe_eligible: item.swipe_eligible,
    dollar_cost: item.dollar_cost,
    calories: item.calories,
    protein_g: item.protein_g,
    fat_g: item.fat_g,
    carb_g: item.carb_g,
    iron_pct: item.iron_pct,
    calcium_pct: item.calcium_pct,
  };
}

// Builds a per-hall candidate pool rather than one global ranked list — the
// model needs enough of each hall's own menu to assemble a coherent combo
// (protein + carb + something else) from a single dining hall, not a mix of
// items scattered across different halls a student can't actually combine
// into one visit.
function buildCandidatesByHall(menuItems, priority, focusNutrient) {
  const byHall = new Map();
  for (const item of menuItems) {
    if (priority === "preserve swipes" && !item.swipe_eligible) continue;
    if (!byHall.has(item.dining_hall)) byHall.set(item.dining_hall, []);
    byHall.get(item.dining_hall).push(item);
  }

  const focusKey = focusNutrient === "iron" ? "iron_pct" : focusNutrient === "calcium" ? "calcium_pct" : null;

  const result = {};
  for (const [hall, items] of byHall) {
    const withNutrition = items.filter((i) => i.calories != null);
    const pool = withNutrition.length >= 5 ? withNutrition : items;

    let picked = pool;
    if (focusKey) {
      // Bias the candidate pool toward some phase-relevant options, without
      // excluding everything else — the model still needs variety to build
      // a balanced combo, not just a pile of iron- or calcium-heavy items.
      const highFocus = [...pool]
        .filter((i) => i[focusKey] != null)
        .sort((a, b) => (b[focusKey] ?? 0) - (a[focusKey] ?? 0))
        .slice(0, 5);
      const rest = pool.filter((i) => !highFocus.includes(i));
      picked = [...highFocus, ...rest];
    }

    result[hall] = picked.slice(0, CANDIDATES_PER_HALL).map(toCandidate);
  }
  return result;
}

export async function buildRecommendationRequest({ date, signal }) {
  const [balance, cycles, profile] = await Promise.all([getDiningBalance(), getCycles(), getProfile()]);

  if (!balance) {
    throw new Error("Set your dining balance before getting recommendations.");
  }

  const { items: menuItems } = await getTodaysMenuItems();

  const optimizerState = computeOptimizerState({
    dollarsRemaining: balance.dollarsRemaining,
    swipesRemaining: balance.swipesRemaining,
    resetDate: balance.resetDate,
    menuItems,
  });

  const phase = getCurrentPhase(cycles.phaseModel);
  const focus = getPhaseNutrientFocus(phase?.phaseName);
  const candidatesByHall = buildCandidatesByHall(menuItems, optimizerState.priority, focus.nutrient);

  const macroGoals = profile.macroTrackerOn ? profile.macroGoals || null : null;

  const result = await getRecommendations(
    {
      candidatesByHall,
      priority: optimizerState.priority,
      date,
      phase: phase?.phaseName || null,
      focusNutrient: focus.nutrient,
      focusNote: focus.note,
      macroGoals,
    },
    signal
  );

  return { optimizerState, phase, result };
}
