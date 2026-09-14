import React, { useEffect, useMemo, useState } from "react";
import { getTodaysMenuItems } from "../../lib/menuData";
import { getDiningBalance, addMealLog } from "../../db/indexedDb";
import { computeOptimizerState } from "../../lib/optimizer";
import { useProfile } from "../../context/ProfileContext";
import { formatCal } from "../../lib/format";
import RecommendationPanel from "../Recommendations/RecommendationPanel";

function groupByHall(items, priority) {
  const byHall = new Map();
  for (const item of items) {
    if (!byHall.has(item.dining_hall)) byHall.set(item.dining_hall, []);
    byHall.get(item.dining_hall).push(item);
  }
  for (const list of byHall.values()) {
    list.sort((a, b) => {
      if (priority === "preserve swipes") {
        return (b.swipe_eligible ? 1 : 0) - (a.swipe_eligible ? 1 : 0);
      }
      return (a.dollar_cost ?? Infinity) - (b.dollar_cost ?? Infinity);
    });
  }
  return [...byHall.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export default function MenuBrowse() {
  const { profile } = useProfile();
  const [items, setItems] = useState([]);
  const [priority, setPriority] = useState(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openHalls, setOpenHalls] = useState(() => new Set());
  const [loggedKeys, setLoggedKeys] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const balance = await getDiningBalance();
      const { items: menuItems, offline: usedCache } = await getTodaysMenuItems();

      if (cancelled) return;

      let sortPriority = "preserve dollars";
      if (balance) {
        sortPriority = computeOptimizerState({
          dollarsRemaining: balance.dollarsRemaining,
          swipesRemaining: balance.swipesRemaining,
          resetDate: balance.resetDate,
          menuItems,
        }).priority;
      }

      setItems(menuItems);
      setPriority(sortPriority);
      setOffline(usedCache);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => groupByHall(items, priority), [items, priority]);

  const toggleHall = (hall) => {
    setOpenHalls((prev) => {
      const next = new Set(prev);
      if (next.has(hall)) next.delete(hall);
      else next.add(hall);
      return next;
    });
  };

  const logItem = async (item) => {
    const key = `${item.dining_hall}-${item.name}`;
    await addMealLog({
      timestamp: new Date().toISOString(),
      source: "menu-pick",
      items: [
        {
          name: item.name,
          calories: item.calories,
          protein: item.protein_g,
          fat: item.fat_g,
          carb: item.carb_g,
          iron: item.iron_pct,
          calcium: item.calcium_pct,
        },
      ],
      costType: item.swipe_eligible ? "swipe" : item.dollar_cost != null ? "dollar" : null,
    });
    setLoggedKeys((prev) => new Set(prev).add(key));
  };

  if (loading) return <div className="card">Loading menu…</div>;

  return (
    <div>
      <RecommendationPanel />
      {offline && (
        <div className="card" style={{ color: "var(--color-text-muted)" }}>
          Offline — showing the last synced menu.
        </div>
      )}
      {priority && (
        <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>
          Sections sorted to help you {priority}
        </div>
      )}
      {grouped.length === 0 && <div className="card">No menu items available.</div>}
      {grouped.map(([hall, hallItems]) => {
        const isOpen = openHalls.has(hall);
        return (
          <div key={hall} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <button
              className="tap-target"
              onClick={() => toggleHall(hall)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "none",
                border: "none",
                padding: 16,
                textAlign: "left",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 16 }}>{hall}</span>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                {hallItems.length} items {isOpen ? "▲" : "▼"}
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 16px 12px" }}>
                {hallItems.map((item) => {
                  const key = `${item.dining_hall}-${item.name}`;
                  return (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderTop: "1px solid var(--color-border)",
                      }}
                    >
                      <div>
                        <div>{item.name}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                          {item.meal_period}
                          {item.swipe_eligible ? " · Swipe eligible" : ""}
                          {item.dollar_cost != null ? ` · $${item.dollar_cost.toFixed(2)}` : ""}
                          {profile.macroTrackerOn && item.calories != null
                            ? ` · ${formatCal(item.calories)} cal`
                            : ""}
                        </div>
                      </div>
                      {profile.macroTrackerOn && (
                        <button
                          className="tap-target"
                          onClick={() => logItem(item)}
                          disabled={loggedKeys.has(key)}
                          aria-label={`Log ${item.name}`}
                          style={{ fontSize: 13 }}
                        >
                          {loggedKeys.has(key) ? "Logged" : "+ Log"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
