import { en, type MessageKey, type Messages } from './en';

export type { MessageKey, Messages };

const catalogs: Record<string, Messages> = { en };
const locale = 'en';

const pluralRules = new Intl.PluralRules(locale);

type Vars = Record<string, string | number>;

function lookup(path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], catalogs[locale]);
}

/** Looks up a message by key, picks the plural form from `vars.count` and fills in {placeholders}. */
export function t(key: MessageKey, vars: Vars = {}): string {
  const found = lookup(key);
  let message: string | undefined;
  if (typeof found === 'string') message = found;
  else if (found && typeof found === 'object') {
    const forms = found as { one: string; other: string };
    message = pluralRules.select(Number(vars.count ?? 0)) === 'one' ? forms.one : forms.other;
  }
  if (message === undefined) return key;
  return message.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}
