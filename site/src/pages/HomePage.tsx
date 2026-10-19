import { Link } from 'react-router';
import { useCatalogData } from '../context/catalog';
import { useUi } from '../context/ui';
import { useSetQuery } from '../features/search/useSearchState';
import { useDocumentTitle } from '../app/useDocumentTitle';
import { t } from '../i18n';
import { collectReleases } from '../lib/install';
import { paths } from '../lib/routes';
import { KINDS } from '../lib/search-params';
import { Dot, formatDate, kindLabel } from '../shared/ui/common';

export default function HomePage() {
  useDocumentTitle();
  const { catalog, counts, chips } = useCatalogData();
  const { focusSearch } = useUi();
  const { setQuery } = useSetQuery();
  const entries = catalog.entries;
  const releases = collectReleases(entries);

  return (
    <div className="page page-home">
      <section className="hero">
        <div className="eyebrow">{t('home.eyebrow')}</div>
        <h1>
          {t('home.titleLine1')}
          <br />
          {t('home.titleLine2')}
        </h1>
        <p className="lead">{t('home.lead')}</p>
        <div className="hero-search">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            aria-label={t('home.searchLabel')}
            value=""
            placeholder={t('home.searchPlaceholder')}
            onChange={(e) => {
              setQuery(e.target.value);
              focusSearch(); // this input unmounts once the search page replaces the home page
            }}
          />
        </div>
        {chips.values.length > 0 && (
          <div className="chips">
            {chips.values.map((c) => (
              <Link
                key={c}
                className="chip"
                to={paths.search(chips.kind === 'keywords' ? { keywords: [c] } : { categories: [c] })}
              >
                #{c}
              </Link>
            ))}
          </div>
        )}
      </section>

      {entries.length === 0 ? (
        <section className="empty-box">
          <div className="empty-emoji">📦</div>
          <h2>{t('home.emptyTitle')}</h2>
          <p>{t('home.emptyText')}</p>
          <div className="row-center">
            <Link className="btn btn-primary btn-lg" to={paths.start}>
              {t('home.getStarted')}
            </Link>
            {catalog.repo.url && (
              <a
                className="btn btn-lg"
                href={`${catalog.repo.url}/blob/${catalog.repo.branch}/CONTRIBUTING.md`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('home.contributing')}
              </a>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="stats">
            {KINDS.map((k) => (
              <Link key={k} className="stat" to={paths.search({ types: [k] })}>
                <div className="stat-count">{counts[k]}</div>
                <div className="stat-label">{kindLabel(k)}</div>
              </Link>
            ))}
          </section>

          {releases.length > 0 && (
            <section className="block">
              <div className="block-head">
                <h2>{t('home.whatsNew')}</h2>
                <Link to={paths.whatsNew}>{t('home.fullFeed')}</Link>
              </div>
              <div className="stack-sm">
                {releases.slice(0, 4).map((r) => (
                  <Link key={`${r.plugin.id}@${r.version}`} className="release" to={paths.entry(r.plugin)}>
                    <span className="badge" data-kind="plugin">
                      {t('common.version', { version: r.version })}
                    </span>
                    <span className="release-main">
                      <span className="release-name">{r.plugin.displayName}</span>
                      <span className="release-summary">{r.summary}</span>
                    </span>
                    <span className="muted mono small">{formatDate(r.date)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="block">
            <h2>{t('home.browseByType')}</h2>
            <div className="row-wrap">
              {KINDS.map((k) => (
                <Link key={k} className="type-btn" to={paths.search({ types: [k] })}>
                  <Dot kind={k} />
                  <span className="cap">{kindLabel(k)}</span>
                  <span className="mono muted small">{counts[k]}</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
