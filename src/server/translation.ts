'use server';

import { get } from 'lodash-es';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_LANG } from '@/const/locale';
import type { NS } from '@/locales/resources';

export const translation = async (ns: NS = 'common') => {
  let i18ns = {};
  try {
    const filepath = join(process.cwd(), `locales/${DEFAULT_LANG}/${ns}.json`);
    const file = readFileSync(filepath, 'utf8');
    i18ns = JSON.parse(file);
  } catch (e) {
    console.error('Error while reading translation file', e);
  }

  return {
    t: (key: string, options: { [key: string]: string } = {}) => {
      if (!i18ns) return key;
      let content = get(i18ns, key);
      if (!content) return key;
      if (options) {
        Object.entries(options).forEach(([key, value]) => {
          content = content.replace(`{{${key}}}`, value);
        });
      }
      return content;
    },
  };
};
