import { normalizeName } from '@/lib/services/course';

describe('normalizeName', () => {
  test('removes accents', () => {
    expect(normalizeName('Caf\u00e9 Golf')).toBe('cafe golf');
  });
  test('removes punctuation', () => {
    expect(normalizeName("Pine's Valley G.C.")).toBe('pines valley gc');
  });
  test('lowercases', () => {
    expect(normalizeName('MISSION HILLS')).toBe('mission hills');
  });
  test('trims whitespace', () => {
    expect(normalizeName('  Spring City  ')).toBe('spring city');
  });
});
