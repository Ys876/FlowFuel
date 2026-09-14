let deferredPrompt = null;
const listeners = new Set();

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  listeners.forEach((listener) => listener(true));
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  listeners.forEach((listener) => listener(false));
});

export function onInstallAvailabilityChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isInstallAvailable() {
  return deferredPrompt !== null;
}

export async function promptInstall() {
  if (!deferredPrompt) return null;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice;
}

const MILESTONE_KEY = "flowfuel_completed_action";

export function markMilestoneAction() {
  try {
    localStorage.setItem(MILESTONE_KEY, "1");
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new Event("flowfuel:milestone"));
}

export function onMilestoneReached(listener) {
  window.addEventListener("flowfuel:milestone", listener);
  return () => window.removeEventListener("flowfuel:milestone", listener);
}

export function hasCompletedMilestoneAction() {
  try {
    return localStorage.getItem(MILESTONE_KEY) === "1";
  } catch {
    return false;
  }
}
