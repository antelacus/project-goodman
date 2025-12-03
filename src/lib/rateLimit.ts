// utils for API rate limiting by localStorage

// Helper to check if localStorage is available and functional
function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' &&
           typeof window.localStorage !== 'undefined' &&
           typeof window.localStorage.getItem === 'function';
  } catch {
    return false;
  }
}

export function checkAndIncreaseApiLimit(limit = 10): boolean {
  // Guard against SSR - localStorage may not be available or functional
  if (!isLocalStorageAvailable()) {
    return true;
  }
  // Skip rate limiting on localhost
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return true;
  }
  const today = new Date().toISOString().slice(0, 10);
  const key = `ai_api_count_${today}`;
  let count = Number(window.localStorage.getItem(key) || "0");
  if (count >= limit) {
    return false;
  }
  window.localStorage.setItem(key, String(count + 1));
  return true;
} 