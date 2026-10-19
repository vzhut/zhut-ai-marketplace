import { useEffect, useState } from 'react';
import { fetchJson } from '../lib/data';
import type { Catalog, Synonyms } from '../types';

export type CatalogState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; catalog: Catalog; synonyms: Synonyms };

export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchJson<Catalog>('index.json'), fetchJson<Synonyms>('synonyms.json').catch(() => ({}))])
      .then(([catalog, synonyms]) => !cancelled && setState({ status: 'ready', catalog, synonyms }))
      .catch((e: Error) => !cancelled && setState({ status: 'error', error: e.message }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
