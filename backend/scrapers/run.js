const { createClient } = require("@supabase/supabase-js");
const PurdueDiningScraper = require("./purdue_dining_scraper");

const DINING_HALLS = ["Hillenbrand", "Earhart", "Windsor", "Wiley", "Ford"];
const MEAL_PERIODS = ["Breakfast", "Brunch", "Lunch", "Late Lunch", "Dinner"];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Purdue's dining schedule is a West Lafayette (Eastern Time) calendar day.
// Deriving "today" from the runner's own local/UTC clock would pick the
// wrong day near midnight Eastern (e.g. a GitHub Actions runner is UTC, and
// 9pm Eastern is already tomorrow in UTC) — this stays correct regardless of
// where the job actually runs.
function easternDateString(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function scrapeAll() {
  const scraper = new PurdueDiningScraper();
  const today = easternDateString(new Date());
  const todayAtNoon = new Date(`${today}T12:00:00Z`);
  const rows = [];

  for (const diningHall of DINING_HALLS) {
    for (const mealPeriod of MEAL_PERIODS) {
      if (!scraper.isMealAvailable(diningHall, mealPeriod, todayAtNoon)) continue;

      const menu = await scraper.getMenu(diningHall, mealPeriod, today);
      if (menu.error) {
        console.warn(`[scraper] ${diningHall} ${mealPeriod}: ${menu.error}`);
        continue;
      }

      for (const item of menu.items) {
        rows.push({
          dining_hall: diningHall,
          date: today,
          meal_period: mealPeriod,
          name: item.name,
          calories: item.calories,
          protein_g: item.protein_g,
          fat_g: item.fat_g,
          carb_g: item.carb_g,
          iron_pct: item.iron_pct,
          calcium_pct: item.calcium_pct,
          // Dining-court items are all-you-care-to-eat swipe access with no
          // itemized dollar cost — confirmed via schema introspection that no
          // type in Purdue's menu API carries a price field at all.
          swipe_eligible: true,
          dollar_cost: null,
        });
      }
    }
  }

  return { today, rows };
}

async function writeToSupabase({ today, rows }) {
  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  // Replace the day's rows rather than appending, so re-running the job
  // (or a delayed retry) doesn't duplicate items.
  const { error: deleteError } = await supabase.from("menu_items").delete().eq("date", today);
  if (deleteError) throw deleteError;

  if (rows.length === 0) {
    console.warn("[scraper] No rows scraped for", today);
    return;
  }

  const { error: insertError } = await supabase.from("menu_items").insert(rows);
  if (insertError) throw insertError;

  console.log(`[scraper] Wrote ${rows.length} rows for ${today}`);
}

async function main() {
  const { today, rows } = await scrapeAll();
  await writeToSupabase({ today, rows });
}

main().catch((error) => {
  console.error("[scraper] Failed:", error.message);
  process.exit(1);
});
