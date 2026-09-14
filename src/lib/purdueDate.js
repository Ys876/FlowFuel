// Purdue dining is keyed to a West Lafayette (Eastern Time) calendar day —
// the scraper writes menu_items for that Eastern-time date, so the client
// must ask for the same day, not the viewer's own local/UTC date. Otherwise
// anyone whose UTC date has already rolled over (which happens daily, since
// Eastern trails UTC by 4-5 hours) asks for tomorrow's not-yet-scraped menu.
export function getPurdueDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
