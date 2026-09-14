import { fetchTodaysMenuItems } from "./supabaseClient";
import { getMenuCache, setMenuCache } from "../db/indexedDb";
import { getPurdueDateString } from "./purdueDate";

/**
 * Stale-while-revalidate for today's menu: the scraper only writes once a
 * day, so if the cache already matches today's Purdue-calendar date there is
 * nothing new to wait for — return it immediately and refresh in the
 * background, rather than re-paying a network round trip on every tab visit.
 */
export async function getTodaysMenuItems() {
  const date = getPurdueDateString();
  const cache = await getMenuCache();
  const cacheIsFromToday = cache.cachedAt && getPurdueDateString(new Date(cache.cachedAt)) === date;

  if (cacheIsFromToday && cache.items.length > 0) {
    fetchTodaysMenuItems(date)
      .then((fresh) => setMenuCache(fresh))
      .catch(() => {
        // Background refresh failed silently — the cache we already
        // returned is still today's real data, nothing to surface here.
      });
    return { items: cache.items, offline: false, fromCache: true };
  }

  try {
    const fresh = await fetchTodaysMenuItems(date);
    await setMenuCache(fresh);
    return { items: fresh, offline: false, fromCache: false };
  } catch {
    return { items: cache.items, offline: true, fromCache: true };
  }
}
