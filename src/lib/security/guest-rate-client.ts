export function notifyGuestRateUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('guest-rate-update'));
  }
}
