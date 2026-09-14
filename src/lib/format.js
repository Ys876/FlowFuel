// All macro/calorie numbers get rounded only at display time — raw precision
// is kept in storage/state so repeated rounding never compounds error into
// sums (e.g. today's macro totals).
export function roundNum(value) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value);
}

export function formatCal(value) {
  const rounded = roundNum(value);
  return rounded == null ? "?" : `${rounded}`;
}

export function formatGrams(value) {
  const rounded = roundNum(value);
  return rounded == null ? "?" : `${rounded}g`;
}

export function formatPct(value) {
  const rounded = roundNum(value);
  return rounded == null ? "?" : `${rounded}%`;
}
