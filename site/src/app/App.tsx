import { lazy, useMemo } from 'react';
import { Route, Routes } from 'react-router';
import { BasketProvider } from '../context/basket';
import { CatalogProvider } from '../context/catalog';
import { CopyProvider } from '../context/copy';
import { useCatalog } from '../hooks/useCatalog';
import { t } from '../i18n';
import { buildCatalogData } from '../lib/catalog';
import HomePage from '../pages/HomePage';
import { Layout } from './Layout';

// The landing page is bundled with the app; everything else is loaded when first visited.
const SearchPage = lazy(() => import('../pages/SearchPage'));
const PluginPage = lazy(() => import('../pages/PluginPage'));
const ArtifactPage = lazy(() => import('../pages/ArtifactPage'));
const WhatsNewPage = lazy(() => import('../pages/WhatsNewPage'));
const GettingStartedPage = lazy(() => import('../pages/GettingStartedPage'));
const HealthPage = lazy(() => import('../pages/HealthPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

export default function App() {
  const state = useCatalog();
  const data = useMemo(
    () => (state.status === 'ready' ? buildCatalogData(state.catalog, state.synonyms) : null),
    [state],
  );

  if (state.status === 'error')
    return (
      <div className="app app-message">
        <h1>{t('app.errorTitle')}</h1>
        <p className="muted">{state.error}</p>
        <p className="muted">
          {t('app.errorHintPrefix')}
          <code>{t('app.devCommand')}</code>
          {t('app.errorHintSuffix')}
        </p>
      </div>
    );
  if (!data) return <div className="app app-message muted">{t('app.loading')}</div>;

  return (
    <CatalogProvider value={data}>
      <CopyProvider>
        <BasketProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="plugins/:plugin" element={<PluginPage />} />
              <Route path=":kind/:plugin/:name" element={<ArtifactPage />} />
              <Route path="whats-new" element={<WhatsNewPage />} />
              <Route path="get-started" element={<GettingStartedPage />} />
              <Route path="health" element={<HealthPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BasketProvider>
      </CopyProvider>
    </CatalogProvider>
  );
}
