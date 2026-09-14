import React, { useEffect, useState } from "react";
import DiningBalanceWidget from "../DiningBalance/DiningBalanceWidget";
import MacroCard from "../MacroTracker/MacroCard";
import PhaseCard from "../Cycle/PhaseCard";
import { useProfile } from "../../context/ProfileContext";
import { useCurrentPhase } from "../../hooks/useCurrentPhase";
import { getDiningBalance, setDiningBalance, listMealLogs } from "../../db/indexedDb";
import { markMilestoneAction } from "../../lib/installPrompt";

function sumTodayMacros(mealLogs) {
  // The viewer's own local calendar day — this is about when THEY ate, not
  // the Purdue dining-menu day, so it intentionally does not use
  // getPurdueDateString here.
  const today = new Date().toISOString().slice(0, 10);
  const todaysLogs = mealLogs.filter((log) => log.timestamp?.slice(0, 10) === today);
  return todaysLogs.reduce(
    (totals, log) => {
      for (const item of log.items || []) {
        totals.calories += item.calories || 0;
        totals.protein += item.protein || 0;
        totals.fat += item.fat || 0;
        totals.carb += item.carb || 0;
        totals.iron += item.iron || 0;
        totals.calcium += item.calcium || 0;
      }
      return totals;
    },
    { calories: 0, protein: 0, fat: 0, carb: 0, iron: 0, calcium: 0 }
  );
}

export default function Dashboard() {
  const { profile } = useProfile();
  const phase = useCurrentPhase();
  const [balance, setBalance] = useState(null);
  const [todayTotals, setTodayTotals] = useState(null);

  useEffect(() => {
    getDiningBalance().then(setBalance);
    listMealLogs().then((logs) => setTodayTotals(sumTodayMacros(logs)));
  }, []);

  const handleSaveBalance = async (draft) => {
    const saved = await setDiningBalance(draft);
    setBalance(saved);
    markMilestoneAction();
  };

  return (
    <div>
      <DiningBalanceWidget balance={balance} onSave={handleSaveBalance} />
      <PhaseCard />
      <MacroCard
        visible={profile.macroTrackerOn}
        todayTotals={todayTotals}
        goals={profile.macroGoals}
        phaseName={phase?.phaseName}
      />
    </div>
  );
}
