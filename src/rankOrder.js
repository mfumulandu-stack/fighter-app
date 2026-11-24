// RANG-V2 - Reihenfolge der Rangliste.
//
// Stufen (ver):  2 = Kampfrekord UND Gym-Code verifiziert
//                1 = nur Kampfrekord verifiziert
//                0 = nicht verifiziert
//
// Reihenfolge:
//   1. Mit Kaempfen UND verifiziertem Rekord: nach Punkten. Bei gleichen
//      Punkten steht der mit Gym-Code zuerst. Ein Neuling mit 1-2 Kaempfen
//      steht dadurch nie vor einem echten Kaempfer mit vielen Siegen.
//   2. Mit Kaempfen, Rekord nicht verifiziert: danach, nach Punkten.
//   3. Ohne Kaempfe: ganz am Ende; untereinander nach Stufe, dann Punkten.

export function rankTier(fights, ver) {
  if (!(fights > 0)) return -1;
  return ver >= 1 ? 1 : 0;
}

// a, b: { fights, ver, score }  ->  Vergleichsfunktion fuer Array.sort
export function rankCompare(a, b) {
  const ta = rankTier(a.fights, a.ver);
  const tb = rankTier(b.fights, b.ver);
  if (ta !== tb) return tb - ta;
  if (ta === -1) {
    if (a.ver !== b.ver) return b.ver - a.ver;
    return b.score - a.score;
  }
  if (a.score !== b.score) return b.score - a.score;
  return b.ver - a.ver;
}
