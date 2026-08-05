export const MIN_POOL_SIZE = 5;

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

export function autoFilterCandidates(candidateFlags, minPoolSize = MIN_POOL_SIZE) {
  if (!candidateFlags || !Array.isArray(candidateFlags)) {
    return { tier: 'minimal', results: [] };
  }
  const tier = selectFilterTier(candidateFlags, minPoolSize);
  return { tier, results: applyFilterTier(candidateFlags, tier) };
}
