// Purdue meal-plan swipes run on a fixed weekly window, in West Lafayette
// (Eastern) time: they reset Monday at 6:00 AM and are valid through Sunday
// at 9:00 PM. This is a fixed policy, not something the user configures —
// distinct from dining dollars, which deplete over the whole semester
// against the balance the user enters as `resetDate`.

function getEasternParts(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: parts.hour === "24" ? 0 : Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAYS[parts.weekday],
  };
}

// Converts Eastern-time wall-clock components to the real UTC instant they
// represent, without hardcoding a DST offset: guesses EDT (-4), checks how
// that instant actually renders back in America/New_York, and corrects for
// the EST/EDT difference if the guess landed in the wrong season.
function easternWallTimeToUTC(year, month, day, hour, minute) {
  const guess = Date.UTC(year, month - 1, day, hour + 4, minute);
  const rendered = getEasternParts(new Date(guess));
  const hourDiff = hour - rendered.hour;
  if (hourDiff === 0 && rendered.day === day) return new Date(guess);
  return new Date(guess + hourDiff * 60 * 60 * 1000);
}

/**
 * Days (fractional) remaining until the current swipe week's Sunday 9pm ET
 * cutoff. If it's already past that cutoff (the ~9 hour gap before Monday
 * 6am reset), this returns a value at/below zero — callers should clamp it
 * the same way they clamp the dollars side's daysRemaining.
 */
export function getSwipeWeekDaysRemaining(today = new Date()) {
  const parts = getEasternParts(today);
  const daysUntilSunday = (7 - parts.weekday) % 7;

  // Pure calendar-day arithmetic (month/year rollover handled by JS's own
  // Date normalization) — NOT reformatted back through America/New_York,
  // which would land on the wrong ET calendar day since this UTC-midnight
  // instant doesn't correspond to ET midnight.
  const targetDateUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysUntilSunday));
  const cutoff = easternWallTimeToUTC(
    targetDateUtc.getUTCFullYear(),
    targetDateUtc.getUTCMonth() + 1,
    targetDateUtc.getUTCDate(),
    21,
    0
  );

  return (cutoff - today) / (1000 * 60 * 60 * 24);
}
