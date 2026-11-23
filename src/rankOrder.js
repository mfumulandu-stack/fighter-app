// Reihenfolge der Rangliste.
//
// Regel: Wer echte Kaempfe eingetragen hat, steht immer vor Fightern ohne
// Kaempfe. Ein Rekord von 0-0-0 laesst sich ueber "Ich habe noch keine
// Kaempfe" sofort als verifiziert markieren und mit dem Gym-Code auf Stufe 2
// heben. Frueher stand so jeder Neuling mit 0 Punkten vor jedem echten
// Kaempfer, dessen Nachweis zwar geprueft ist, der aber (noch) keinen
// Gym-Code eingegeben hat.
//
// Stufen (ver):  2 = Kampfrekord UND Gym-Code verifiziert
//                1 = nur Kampfrekord verifiziert
//                0 = nicht verifiziert
//
// Reihenfolge:
//   1. Mit Kaempfen:   erst nach Stufe (2, 1, 0), dann nach Punkten
//   2. Ohne Kaempfe:   immer danach; untereinander nach Stufe, dann Punkten

export function rankTier(fights, ver) {
  return fights > 0 ? ver : -1;
}

// a, b: { fights, ver, score }  ->  Vergleichsfunktion fuer Array.sort
export function rankCompare(a, b) {
  const ta = rankTier(a.fights, a.ver);
  const tb = rankTier(b.fights, b.ver);
  if (ta !== tb) return tb - ta;
  if (ta === -1 && a.ver !== b.ver) return b.ver - a.ver;
  return b.score - a.score;
}
