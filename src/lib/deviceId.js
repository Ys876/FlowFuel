const STORAGE_KEY = "flowfuel_device_id";

export function getDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage blocked: fall back to a per-session id.
    return "no-storage";
  }
}
