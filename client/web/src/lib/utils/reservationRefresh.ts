export function watchReservationChanges(refresh: () => void) {
  const whenVisible = () => { if (!document.hidden) refresh(); };
  window.addEventListener("focus", whenVisible);
  document.addEventListener("visibilitychange", whenVisible);
  window.addEventListener("reservations:changed", whenVisible);
  const timer = window.setInterval(whenVisible, 30000);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", whenVisible);
    document.removeEventListener("visibilitychange", whenVisible);
    window.removeEventListener("reservations:changed", whenVisible);
  };
}
