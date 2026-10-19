import { createContext, useContext } from 'react';
import type { CatalogData } from '../lib/catalog';

const CatalogContext = createContext<CatalogData | null>(null);

export const CatalogProvider = CatalogContext.Provider;

/** The loaded catalog and everything derived from it. Static for the lifetime of the page. */
export function useCatalogData(): CatalogData {
  const data = useContext(CatalogContext);
  if (!data) throw new Error('useCatalogData must be used inside <CatalogProvider>');
  return data;
}
