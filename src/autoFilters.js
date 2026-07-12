// Entscheidet automatisch, wie streng die Profil-Filter (Alter, Gewicht,
// Sportart, Umkreis, Pro/Amateur) angewendet werden sollen - je nachdem,
// wie viele Kandidaten bei der jeweiligen Strenge uebrig bleiben. Keine
// manuellen Regler: die App waehlt selbst die lockerste Stufe, die noch
// genug Auswahl bietet.
//
// Rangfolge: STRICT (am genauesten passend) -> RELAXED (breiter) ->
// MINIMAL (nur noch Basis-Anforderungen wie ein vorhandenes Foto).

export const MIN_POOL_SIZE = 8;

export function selectFilterTier(candidateFlags, minPoolSize = MIN_POOL_SIZE) {
  const withPhoto = candidateFlags.filter((c) => c.hasPhoto);
  const strict = withPhoto.filter((c) => c.passesStrict);
  if (strict.length >= minPoolSize) return 'strict';
  const relaxed = withPhoto.filter((c) => c.passesRelaxed);
  if (relaxed.length >= minPoolSize) return 'relaxed';
  return 'minimal';
}

export function applyFilterTier(candidateFlags, tier) {
  const withPhoto = candidateFlags.filter((c) => c.hasPhoto);
  if (tier === 'strict') return withPhoto.filter((c) => c.passesStrict);
  if (tier === 'relaxed') return withPhoto.filter((c) => c.passesRelaxed);
  return withPhoto;
}

// Bequeme Kombination beider Schritte fuer den Regelfall.
export function autoFilterCandidates(candidateFlags, minPoolSize = MIN_POOL_SIZE) {
  const tier = selectFilterTier(candidateFlags, minPoolSize);
  return { tier, results: applyFilterTier(candidateFlags, tier) };
}
