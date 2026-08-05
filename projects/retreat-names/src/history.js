// Generated names are kept per theme in sessionStorage so the list survives
// moving between the cottage/cabin/beach pages, which are separate documents.
//
// Session-scoped on purpose: this is a scratch list of things you just rolled,
// not a saved collection, so it shouldn't outlive the tab. Kept per theme so
// visiting Cabin doesn't bury the cottage names you were working through.

const KEY = "retreat-names:history:";

/** Most recent names retained per theme. */
export const HISTORY_LIMIT = 20;

/**
 * Read a theme's stored history.
 *
 * Must only be called after hydration. The prerendered markup is built without
 * any history, so reading storage during render would make the client disagree
 * with the server.
 */
export function loadHistory(themeId) {
  try {
    const raw = sessionStorage.getItem(KEY + themeId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((name) => typeof name === "string" && name.length > 0)
      .slice(0, HISTORY_LIMIT)
      .map((name) => ({ name }));
  } catch {
    // Malformed JSON, or storage blocked entirely (private browsing, cookies
    // disabled). Start empty rather than breaking the page.
    return [];
  }
}

export function saveHistory(themeId, history) {
  try {
    sessionStorage.setItem(KEY + themeId, JSON.stringify(history.map((h) => h.name)));
  } catch {
    // Storage unavailable or over quota. The list is a convenience; losing it
    // is better than throwing during a render commit.
  }
}
