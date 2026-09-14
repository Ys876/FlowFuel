// Warm, normalizing one-liners per phase — general cycle education, not
// medical advice. Deliberately avoids numbers/targets and restrictive framing
// (see docs/motion-specs.md build conversation for why: this app steers hard
// away from diet-culture language everywhere, including here).
const PHASE_COPY = {
  menstrual: {
    emoji: "🩸",
    headline: "Iron's taking a hit — that's normal.",
    body:
      "Cramps, fatigue, and low energy are all common right now. Stay hydrated, " +
      "rest when you need to, and iron-rich foods can help — no pressure to be " +
      "at 100%.",
  },
  follicular: {
    emoji: "🌱",
    headline: "Energy's building back up.",
    body:
      "Estrogen is climbing, so a lot of people feel sharper and more energetic " +
      "through this stretch. Good window to try something new if you're feeling it.",
  },
  ovulation: {
    emoji: "✨",
    headline: "You're near your peak.",
    body:
      "Estrogen peaks right around now. Some people notice a burst of energy, " +
      "and a little twinge or ache around ovulation is normal too.",
  },
  luteal: {
    emoji: "🌙",
    headline: "PMS territory — be gentle with yourself.",
    body:
      "Progesterone is rising, which can bring on bloating, mood swings, and " +
      "cravings — all normal. Calcium and magnesium-rich foods and staying " +
      "hydrated may take the edge off a little.",
  },
};

export function getPhaseCopy(phaseName) {
  return PHASE_COPY[phaseName] || null;
}
