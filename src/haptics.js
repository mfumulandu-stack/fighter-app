// Haptik (kurzes Vibrieren) - nur in der installierten App, im Web ohne Wirkung.
// Fehler werden bewusst verschluckt: Haptik darf nie etwas kaputt machen.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

function native() {
  try { return !!Capacitor.isNativePlatform(); } catch (e) { return false; }
}
function run(fn) {
  if (!native()) return;
  try { const r = fn(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
}

export const tapLight = () => run(() => Haptics.impact({ style: ImpactStyle.Light }));
export const tapMedium = () => run(() => Haptics.impact({ style: ImpactStyle.Medium }));
export const success = () => run(() => Haptics.notification({ type: NotificationType.Success }));
