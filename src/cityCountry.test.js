import { cityToCountry, filterCitiesByCountry } from './cityCountry';

describe('cityToCountry', () => {
  test('erkennt oesterreichische Staedte', () => {
    expect(cityToCountry('Wien')).toBe('AT');
    expect(cityToCountry('Graz')).toBe('AT');
    expect(cityToCountry('Salzburg')).toBe('AT');
  });

  test('erkennt Schweizer Staedte', () => {
    expect(cityToCountry('Zürich')).toBe('CH');
    expect(cityToCountry('Zuerich')).toBe('CH');
    expect(cityToCountry('Basel')).toBe('CH');
    expect(cityToCountry('Genf')).toBe('CH');
  });

  test('deutsche und unbekannte Staedte gelten als DE', () => {
    expect(cityToCountry('Berlin')).toBe('DE');
    expect(cityToCountry('München')).toBe('DE');
    expect(cityToCountry('Irgendeine Stadt')).toBe('DE');
    expect(cityToCountry('')).toBe('DE');
    expect(cityToCountry(undefined)).toBe('DE');
  });

  test('ist unempfindlich gegenueber Gross-/Kleinschreibung', () => {
    expect(cityToCountry('WIEN')).toBe('AT');
    expect(cityToCountry('wien')).toBe('AT');
  });
});

describe('filterCitiesByCountry', () => {
  const cities = ['Berlin', 'Wien', 'Zürich', 'München', 'Graz', 'Basel'];

  test('filtert nur Staedte des gewaehlten Landes', () => {
    expect(filterCitiesByCountry(cities, 'AT')).toEqual(['Wien', 'Graz']);
    expect(filterCitiesByCountry(cities, 'CH')).toEqual(['Zürich', 'Basel']);
    expect(filterCitiesByCountry(cities, 'DE')).toEqual(['Berlin', 'München']);
  });

  test('gibt alle Staedte zurueck, wenn kein Land oder ALL gewaehlt ist', () => {
    expect(filterCitiesByCountry(cities, 'ALL')).toEqual(cities);
    expect(filterCitiesByCountry(cities, null)).toEqual(cities);
    expect(filterCitiesByCountry(cities, undefined)).toEqual(cities);
  });

  test('funktioniert mit leerer Liste', () => {
    expect(filterCitiesByCountry([], 'DE')).toEqual([]);
  });
});
