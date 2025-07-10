// utils for API rate limiting by localStorage
export function checkAndIncreaseApiLimit(limit = 10): boolean {
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return true;
  }
  const today = new Date().toISOString().slice(0, 10);
  const key = `ai_api_count_${today}`;
  let count = Number(localStorage.getItem(key) || "0");
  if (count >= limit) {
    return false;
  }
  localStorage.setItem(key, String(count + 1));
  return true;
} 