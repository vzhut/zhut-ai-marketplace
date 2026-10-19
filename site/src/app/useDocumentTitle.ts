import { useEffect } from 'react';
import { useCatalogData } from '../context/catalog';
import { t } from '../i18n';

/** Sets the browser tab title for the current page; without a part it shows the catalog home title. */
export function useDocumentTitle(part?: string) {
  const marketplace = useCatalogData().catalog.marketplace.name;
  useEffect(() => {
    document.title = part ? t('app.pageTitle', { part, marketplace }) : t('app.homeTitle', { marketplace });
  }, [part, marketplace]);
}
