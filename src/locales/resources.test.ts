import { describe, expect, it } from 'vitest';

import { localeOptions, locales, normalizeLocale, supportLocales } from './resources';

describe('locales', () => {
  it('should only ship the English locale', () => {
    expect(locales).toEqual(['en-US']);
  });

  it('should only offer the English locale option', () => {
    expect(localeOptions).toEqual([{ label: 'English', value: 'en-US' }]);
  });

  it('should support the shipped locale', () => {
    expect(supportLocales).toContain('en-US');
    expect(supportLocales).toContain('en');
  });
});

describe('normalizeLocale', () => {
  it('should return "en-US" when locale is undefined', () => {
    expect(normalizeLocale()).toBe('en-US');
  });

  it('should return "en-US" when locale is "en"', () => {
    expect(normalizeLocale('en')).toBe('en-US');
    expect(normalizeLocale('en-US')).toBe('en-US');
  });

  it('should fall back to "en-US" for locales that are no longer shipped', () => {
    expect(normalizeLocale('zh-CN')).toBe('en-US');
    expect(normalizeLocale('zh')).toBe('en-US');
    expect(normalizeLocale('ar-EG')).toBe('en-US');
    expect(normalizeLocale('fr-FR')).toBe('en-US');
    expect(normalizeLocale('unknown')).toBe('en-US');
  });
});
