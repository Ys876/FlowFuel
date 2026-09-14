import React, { useState } from "react";
import { ProfileProvider, useProfile } from "./context/ProfileContext";
import Dashboard from "./components/Dashboard/Dashboard";
import MenuBrowse from "./components/Menu/MenuBrowse";
import Settings from "./components/Settings/Settings";
import CameraCaptureButton from "./components/Camera/CameraCaptureButton";
import InstallBanner from "./components/InstallPrompt/InstallBanner";

const TABS = [
  { id: "dashboard", label: "Today", icon: "🏠" },
  { id: "menu", label: "Menu", icon: "🍽️" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

function AppShell() {
  const { loaded } = useProfile();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!loaded) return null;

  return (
    <div className="app-shell">
      <main className="app-content">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "menu" && <MenuBrowse />}
        {activeTab === "settings" && <Settings />}
      </main>

      <CameraCaptureButton />
      <InstallBanner />

      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className="tab-button"
            data-active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            <span aria-hidden>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <AppShell />
    </ProfileProvider>
  );
}
