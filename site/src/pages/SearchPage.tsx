import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCatalogData } from '../context/catalog';
import { ArtifactCard } from '../features/search/ArtifactCard';
import { Facets } from '../features/search/Facets';
import { useSearchState } from '../features/search/useSearchState';
import { useDocumentTitle } from '../app/useDocumentTitle';
import { t } from '../i18n';
import { issueUrl } from '../lib/install';
import { runQuery } from '../lib/query';
import { paths } from '../lib/routes';
import type { SortKey } from '../types';

export default function SearchPage() {
  useDocumentTitle(t('views.search'));
  const { catalog, searcher, synonyms } = useCatalogData();
  const { state, update } = useSearchState();
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const deferred = useDeferredValue(state);
  const { base, hits, widenedFrom } = useMemo(
    () => runQuery(searcher, catalog.entries, deferred, synonyms),
    [searcher, catalog.entries, deferred, synonyms],
  );

  return (
    <div className="page page-search">
      <button
        className="btn filters-toggle"
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen((o) => !o)}
      >
        {filtersOpen ? t('search.hideFilters') : t('search.showFilters')}
      </button>
      <Facets base={base} open={filtersOpen} />
      <section>
        <div className="results-head">
          <div>
            <h1 className="h-results" aria-live="polite">
              {state.q ? t('search.resultsFor', { q: state.q }) : t('search.overview')}
            </h1>
            <div className="muted">{t('search.count', { count: hits.length })}</div>
          </div>
          <label className="sort">
            {t('search.sortBy')}
            <select
              value={state.sort}
              onChange={(e) => update((cur) => ({ ...cur, sort: e.target.value as SortKey }))}
            >
              <option value="relevance">{t('search.sortRelevance')}</option>
              <option value="name">{t('search.sortName')}</option>
              <option value="updated">{t('search.sortUpdated')}</option>
            </select>
          </label>
        </div>

        {widenedFrom.length > 0 && hits.length > 0 && (
          <p className="note note-inline">
            {t('search.widened', { types: widenedFrom.map((k) => t(`kinds.plural.${k}`)).join(' / ') })}
          </p>
        )}
        {hits.length > 0 ? (
          <div className="grid">
            {hits.map((h) => (
              <ArtifactCard key={h.entry.id} hit={h} />
            ))}
          </div>
        ) : (
          <div className="empty-box">
            <div className="empty-emoji">🔍</div>
            <h2>{t('search.nothingFound')}</h2>
            <p>{t('search.nothingFoundHint')}</p>
            <div className="row-center">
              <button className="btn btn-lg" onClick={() => navigate(paths.search())}>
                {t('search.resetFilters')}
              </button>
              <a
                className="btn btn-lg"
                href={issueUrl(
                  catalog.repo,
                  'artifact-request.yml',
                  t('search.requestTitle', { query: state.q || t('search.requestFallback') }),
                  { request: state.q },
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('search.requestThis')}
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
