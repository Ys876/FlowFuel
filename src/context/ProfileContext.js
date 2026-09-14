import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getProfile, setProfile as persistProfile } from "../db/indexedDb";

const ProfileContext = createContext(null);

const DEFAULT_PROFILE = { macroTrackerOn: false, macroGoals: null };

export function ProfileProvider({ children }) {
  const [profile, setProfileState] = useState(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      setProfileState({ ...DEFAULT_PROFILE, ...p });
      setLoaded(true);
    });
  }, []);

  const setMacroTrackerOn = useCallback((on) => {
    setProfileState((prev) => {
      const next = { ...prev, macroTrackerOn: on };
      persistProfile(next);
      return next;
    });
  }, []);

  // macroGoals is intentionally optional and soft — a rough "aim near this,
  // not a hard limit" reference point, never enforced or required. Passing
  // null clears goals entirely (macro tracking still works without them,
  // just shows totals with no target).
  const setMacroGoals = useCallback((goals) => {
    setProfileState((prev) => {
      const next = { ...prev, macroGoals: goals };
      persistProfile(next);
      return next;
    });
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, loaded, setMacroTrackerOn, setMacroGoals }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used within ProfileProvider");
  return context;
}
