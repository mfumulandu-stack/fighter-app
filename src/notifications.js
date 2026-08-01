// Browser-Benachrichtigungen ("Notification"-Fenster des Systems).
//
// Bewusst als eigene Datei ausgelagert, damit andere Module (z.B.
// ChatOverlay) eine Benachrichtigung ausloesen koennen, ohne die grosse
// App.js importieren zu muessen.
//
// WICHTIG FUER KUENFTIGE AENDERUNGEN: Die Pruefung auf 'Notification' in
// window MUSS bleiben. Safari auf dem iPhone und die iOS-App (WKWebView)
// kennen diese Schnittstelle GAR NICHT - ein ungeschuetzter Zugriff wirft
// dort einen ReferenceError und kann die ganze App zum Absturz bringen.

// Browser-Benachrichtigung — sicher für iPhone: Safari auf iOS und die
// iOS-App (WKWebView) haben die Notification-API GAR NICHT; ein ungeschützter
// Zugriff darauf wirft einen ReferenceError und kann die ganze App crashen.
export function safeLocalNotification(title, body) {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-72.png' });
    }
  } catch (e) {}
}
