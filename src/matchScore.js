// Reine, testbare Berechnung fuer die Kampfsport-Rangliste.
// Bewusst als eigene Datei ausgelagert, weil hier bereits einmal ein
// kritischer Fehler passiert ist (falsche Sortierrichtung zeigte die
// SCHLECHTESTEN statt besten Fighter an - siehe App.js Zeile ~5055,
// die diese Funktion nutzt). Ein Test hier haette diesen Fehler sofort
// erkannt.

export function calculateFightScore(wins, losses, draws) {
  return (wins || 0) * 3 - (losses || 0) * 2 + (draws || 0);
}

// Sortiert absteigend nach Punktzahl - bester Fighter zuerst (Index 0).
export function sortFightersByRank(fighters) {
  return [...fighters]
    .map((f) => ({ ...f, score: calculateFightScore(f.wins, f.losses, f.draws) }))
    .sort((a, b) => b.score - a.score);
}
