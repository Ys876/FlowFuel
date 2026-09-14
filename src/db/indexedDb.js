import { openDB } from "idb";

const DB_NAME = "flowfuel";
const DB_VERSION = 1;

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("profile");
        db.createObjectStore("diningBalance");
        db.createObjectStore("cycles");
        db.createObjectStore("mealLogs", { keyPath: "id" }).createIndex(
          "byTimestamp",
          "timestamp"
        );
        db.createObjectStore("mealPhotos", { keyPath: "id" }).createIndex(
          "byMealLogId",
          "mealLogId"
        );
        db.createObjectStore("menuCache");
      },
    });
  }
  return dbPromise;
}

const SINGLETON_KEY = "value";

export async function getSingleton(storeName, fallback = null) {
  const db = await getDb();
  const value = await db.get(storeName, SINGLETON_KEY);
  return value ?? fallback;
}

export async function setSingleton(storeName, value) {
  const db = await getDb();
  await db.put(storeName, value, SINGLETON_KEY);
  return value;
}

export async function getProfile() {
  return getSingleton("profile", { macroTrackerOn: false, macroGoals: null });
}

export async function setProfile(profile) {
  return setSingleton("profile", profile);
}

export async function getDiningBalance() {
  return getSingleton("diningBalance", null);
}

export async function setDiningBalance(balance) {
  return setSingleton("diningBalance", { ...balance, lastUpdated: new Date().toISOString() });
}

export async function getCycles() {
  return getSingleton("cycles", { periodStartDates: [], phaseModel: null });
}

export async function setCycles(cycles) {
  return setSingleton("cycles", cycles);
}

export async function addPeriodStart(dateString) {
  const cycles = await getCycles();
  const periodStartDates = Array.from(new Set([...cycles.periodStartDates, dateString])).sort();
  const next = { ...cycles, periodStartDates };
  await setCycles(next);
  return next;
}

export async function addMealLog(mealLog) {
  const db = await getDb();
  const withId = { id: mealLog.id || crypto.randomUUID(), ...mealLog };
  await db.put("mealLogs", withId);
  return withId;
}

export async function listMealLogs() {
  const db = await getDb();
  return db.getAllFromIndex("mealLogs", "byTimestamp");
}

export async function addMealPhoto(mealPhoto) {
  const db = await getDb();
  const withId = { id: mealPhoto.id || crypto.randomUUID(), ...mealPhoto };
  await db.put("mealPhotos", withId);
  return withId;
}

export async function getMenuCache() {
  return getSingleton("menuCache", { items: [], cachedAt: null });
}

export async function setMenuCache(items) {
  return setSingleton("menuCache", { items, cachedAt: new Date().toISOString() });
}
