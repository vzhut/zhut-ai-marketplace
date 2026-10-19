import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { readStorage, writeStorage } from '../lib/storage';

const KEY = 'basket';

interface BasketValue {
  items: string[];
  toggle: (plugin: string) => void;
  clear: () => void;
}

const BasketContext = createContext<BasketValue | null>(null);

function load(): string[] {
  try {
    const v: unknown = JSON.parse(readStorage(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function BasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<string[]>(load);
  const update = useCallback((fn: (cur: string[]) => string[]) => {
    setItems((cur) => {
      const next = fn(cur);
      writeStorage(KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const toggle = useCallback(
    (plugin: string) => update((c) => (c.includes(plugin) ? c.filter((p) => p !== plugin) : [...c, plugin])),
    [update],
  );
  const clear = useCallback(() => update(() => []), [update]);
  const value = useMemo(() => ({ items, toggle, clear }), [items, toggle, clear]);
  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket(): BasketValue {
  const value = useContext(BasketContext);
  if (!value) throw new Error('useBasket must be used inside <BasketProvider>');
  return value;
}
