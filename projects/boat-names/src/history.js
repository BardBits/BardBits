const KEY = "boat-names:history:";

export const HISTORY_LIMIT = 20;

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
    return [];
  }
}

export function saveHistory(themeId, history) {
  try {
    sessionStorage.setItem(KEY + themeId, JSON.stringify(history.map((h) => h.name)));
  } catch {
    // Storage unavailable or over quota.
  }
}
