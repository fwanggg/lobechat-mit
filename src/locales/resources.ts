import resources from './default';

export const locales = ['en-US'] as const;

export type DefaultResources = typeof resources;
export type NS = keyof DefaultResources;
export type Locales = (typeof locales)[number];

export const normalizeLocale = (locale?: string): Locales => {
  if (!locale) return 'en-US';

  return locales.find((l) => l.startsWith(locale)) ?? 'en-US';
};

type LocaleOptions = {
  label: string;
  value: Locales;
}[];

export const localeOptions: LocaleOptions = [
  {
    label: 'English',
    value: 'en-US',
  },
] as LocaleOptions;

export const supportLocales: string[] = [...locales, 'en'];
