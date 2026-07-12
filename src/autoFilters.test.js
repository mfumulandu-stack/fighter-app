import { selectFilterTier, applyFilterTier, autoFilterCandidates, MIN_POOL_SIZE } from './autoFilters';

function makeCandidate(overrides = {}) {
  return { hasPhoto: true, passesStrict: true, passesRelaxed: true, ...overrides };
}

describe('selectFilterTier', () => {
  test('waehlt "strict", wenn genug Kandidaten die strenge Pruefung bestehen', () => {
    const candidates = Array.from({ length: 10 }, () => makeCandidate());
    expect(selectFilterTier(candidates)).toBe('strict');
  });

  test('faellt auf "relaxed" zurueck, wenn zu wenige "strict" bestehen', () => {
    const candidates = [
      ...Array.from({ length: 3 }, () => makeCandidate({ passesStrict: true })),
      ...Array.from({ length: 10 }, () => makeCandidate({ passesStrict: false, passesRelaxed: true })),
    ];
    expect(selectFilterTier(candidates)).toBe('relaxed');
  });

  test('faellt auf "minimal" zurueck, wenn selbst "relaxed" zu wenige liefert', () => {
    const candidates = Array.from({ length: 3 }, () =>
      makeCandidate({ passesStrict: false, passesRelaxed: false })
    );
    expect(selectFilterTier(candidates)).toBe('minimal');
  });

  test('Kandidaten ohne Foto zaehlen in keiner Stufe mit', () => {
    const candidates = Array.from({ length: 10 }, () => makeCandidate({ hasPhoto: false }));
    expect(selectFilterTier(candidates)).toBe('minimal');
  });
});

describe('applyFilterTier', () => {
  const candidates = [
    makeCandidate({ passesStrict: true, passesRelaxed: true }),
    makeCandidate({ passesStrict: false, passesRelaxed: true }),
    makeCandidate({ passesStrict: false, passesRelaxed: false }),
    makeCandidate({ hasPhoto: false, passesStrict: true, passesRelaxed: true }),
  ];

  test('"strict" gibt nur Kandidaten zurueck, die die strenge Pruefung bestehen (und ein Foto haben)', () => {
    expect(applyFilterTier(candidates, 'strict')).toHaveLength(1);
  });

  test('"relaxed" gibt alle zurueck, die die lockere Pruefung bestehen', () => {
    expect(applyFilterTier(candidates, 'relaxed')).toHaveLength(2);
  });

  test('"minimal" gibt alle mit Foto zurueck, unabhaengig von den anderen Kriterien', () => {
    expect(applyFilterTier(candidates, 'minimal')).toHaveLength(3);
  });
});

describe('autoFilterCandidates', () => {
  test('gibt Stufe und Ergebnis gemeinsam zurueck', () => {
    const candidates = Array.from({ length: 10 }, () => makeCandidate());
    const { tier, results } = autoFilterCandidates(candidates);
    expect(tier).toBe('strict');
    expect(results).toHaveLength(10);
  });

  test('MIN_POOL_SIZE ist auf 8 gesetzt (Dokumentations-Test)', () => {
    expect(MIN_POOL_SIZE).toBe(8);
  });
});
