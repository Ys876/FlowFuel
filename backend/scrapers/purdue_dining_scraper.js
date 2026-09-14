const axios = require('axios');

// api.hfs.purdue.edu/menus/v3/GraphQL is Purdue's public dining menu API — the
// same one https://dining.purdue.edu itself calls. Verified live: it needs no
// session cookies or auth of any kind, and the previous /graphql path (with
// hardcoded, now-removed session cookies) 404s — that endpoint no longer
// exists. Confirmed via schema introspection that per-item nutritionFacts are
// returned directly in this query (no separate per-item call needed), and that
// no type anywhere in the schema (Item, ItemAppearance, RetailLocation,
// CbordItem) carries a price field — dining-court items genuinely have no
// itemized dollar cost, only the dining dollars/retail side would, and that
// side isn't exposed by this API at all.
const GRAPHQL_URL = 'https://api.hfs.purdue.edu/menus/v3/GraphQL';

const MENU_QUERY = `query getLocationMenu($name: String!, $date: Date!) {
  diningCourtByName(name: $name) {
    dailyMenu(date: $date) {
      meals {
        name
        status
        stations {
          name
          items {
            item {
              name
              isNutritionReady
              nutritionFacts { name value label dailyValueLabel }
              traits { name }
            }
          }
        }
      }
    }
  }
}`;

// Maps a NutritionFact's `name` (as returned by the API) to the numeric
// `value` field. Values are already in the units the menu_items schema
// expects (grams for macros) except iron and calcium, which the API gives
// `value` as a raw mg amount but only exposes % daily value via
// `dailyValueLabel` (e.g. "6%") — handled separately below, matching the
// schema's `iron_pct`/`calcium_pct` (percent daily value) columns.
const NUTRITION_FIELD_MAP = {
  Calories: 'calories',
  'Total fat': 'fat_g',
  'Total Carbohydrate': 'carb_g',
  Protein: 'protein_g',
};

const PERCENT_DAILY_VALUE_FIELDS = {
  Iron: 'iron_pct',
  Calcium: 'calcium_pct',
};

function extractNutrition(nutritionFacts) {
  const result = {
    calories: null,
    protein_g: null,
    fat_g: null,
    carb_g: null,
    iron_pct: null,
    calcium_pct: null,
  };
  for (const fact of nutritionFacts || []) {
    const key = NUTRITION_FIELD_MAP[fact.name];
    if (key && typeof fact.value === 'number') {
      result[key] = fact.value;
    }
    const pctKey = PERCENT_DAILY_VALUE_FIELDS[fact.name];
    if (pctKey && fact.dailyValueLabel) {
      const parsed = parseFloat(fact.dailyValueLabel);
      if (!Number.isNaN(parsed)) result[pctKey] = parsed;
    }
  }
  return result;
}

class PurdueDiningScraper {
    constructor() {
        this.headers = {
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'Origin': 'https://dining.purdue.edu',
            'Referer': 'https://dining.purdue.edu/'
        };

        this.diningSchedules = {
            'Hillenbrand': {
                'Monday': ['Lunch', 'Dinner'],
                'Tuesday': ['Lunch', 'Dinner'],
                'Wednesday': ['Lunch', 'Dinner'],
                'Thursday': ['Lunch', 'Dinner'],
                'Friday': [],  // Closed
                'Saturday': [], // Closed
                'Sunday': ['Brunch']
            },
            'Earhart': {
                'Monday': ['Breakfast', 'Lunch', 'Dinner'],
                'Tuesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Wednesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Thursday': ['Breakfast', 'Lunch', 'Dinner'],
                'Friday': ['Breakfast', 'Lunch', 'Dinner'],
                'Saturday': ['Lunch', 'Dinner'],
                'Sunday': ['Lunch', 'Dinner']
            },
            'Windsor': {
                'Monday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Tuesday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Wednesday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Thursday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Friday': ['Lunch', 'Late Lunch'],
                'Saturday': ['Late Lunch', 'Dinner'],
                'Sunday': ['Lunch', 'Dinner']
            },
            'Wiley': {
                'Monday': ['Breakfast', 'Lunch', 'Dinner'],
                'Tuesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Wednesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Thursday': ['Breakfast', 'Lunch', 'Dinner'],
                'Friday': ['Breakfast', 'Lunch', 'Dinner'],
                'Saturday': ['Lunch', 'Dinner'],
                'Sunday': ['Dinner']
            },
            'Ford': {
                'Monday': ['Breakfast', 'Lunch', 'Dinner'],
                'Tuesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Wednesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Thursday': ['Breakfast', 'Lunch', 'Dinner'],
                'Friday': ['Breakfast', 'Lunch', 'Dinner'],
                'Saturday': ['Breakfast', 'Lunch'],
                'Sunday': ['Breakfast', 'Lunch', 'Dinner']
            }
        };
    }

    isMealAvailable(diningCourt, mealType, date = new Date()) {
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

        if (!this.diningSchedules[diningCourt]) {
            return false;
        }

        const availableMeals = this.diningSchedules[diningCourt][dayOfWeek];
        return availableMeals.includes(mealType);
    }

    async getMenu(diningCourt, mealType, date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        }

        // `new Date("YYYY-MM-DD")` parses as UTC midnight; formatting that
        // back to a weekday in a timezone west of UTC (most of the US) rolls
        // it back a calendar day. Parsing at UTC noon keeps the same
        // calendar day in every real-world timezone.
        const dateForWeekday = new Date(`${date}T12:00:00Z`);

        if (!this.isMealAvailable(diningCourt, mealType, dateForWeekday)) {
            return {
                error: `${mealType} is not available at ${diningCourt} on this day`,
                items: []
            };
        }

        const jsonData = {
            operationName: 'getLocationMenu',
            variables: { name: diningCourt, date },
            query: MENU_QUERY
        };

        try {
            const response = await axios.post(GRAPHQL_URL, jsonData, { headers: this.headers });

            if (!response.data) {
                throw new Error('Empty response from API');
            }

            return this.parseMenuData(response.data, mealType);
        } catch (error) {
            console.error('Error fetching menu:', error.response?.data || error.message);
            return {
                error: 'Failed to fetch menu data',
                details: error.response?.data?.errors?.[0]?.message || error.message,
                items: []
            };
        }
    }

    parseMenuData(data, mealType) {
        const foodItems = [];

        if (!data?.data?.diningCourtByName?.dailyMenu?.meals) {
            return {
                error: 'Invalid menu data structure',
                items: []
            };
        }

        for (const meal of data.data.diningCourtByName.dailyMenu.meals) {
            if (meal.name !== mealType) {
                continue;
            }

            const stations = meal.stations || [];
            for (const station of stations) {
                const items = station.items || [];
                for (const itemAppearance of items) {
                    const item = itemAppearance.item || {};
                    const traits = item.traits || [];

                    foodItems.push({
                        name: item.name || 'Unknown Item',
                        traits: traits.map(trait => trait.name || 'Unknown Trait'),
                        isNutritionReady: item.isNutritionReady || false,
                        ...extractNutrition(item.nutritionFacts)
                    });
                }
            }
        }

        return {
            error: foodItems.length ? null : `No items found for ${mealType}`,
            items: foodItems
        };
    }
}

module.exports = PurdueDiningScraper;
