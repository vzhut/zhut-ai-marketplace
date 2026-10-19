import { Link } from 'react-router';
import { useCatalogData } from '../context/catalog';
import { useDocumentTitle } from '../app/useDocumentTitle';
import { t } from '../i18n';
import { collectReleases } from '../lib/install';
import { paths } from '../lib/routes';
import { formatDate } from '../shared/ui/common';

export default function WhatsNewPage() {
  useDocumentTitle(t('views.whatsNew'));
  const { catalog } = useCatalogData();
  const releases = collectReleases(catalog.entries);
  return (
    <div className="page page-narrow">
      <Link className="back" to={paths.home}>
        {t('common.home')}
      </Link>
      <div className="row-between mb">
        <h1 className="h-detail">{t('whatsNew.title')}</h1>
        {catalog.repo.url && (
          <a
            className="btn btn-sm"
            href={`${catalog.repo.url}/commits/${catalog.repo.branch}.atom`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('whatsNew.subscribe')}
          </a>
        )}
      </div>
      {releases.length === 0 && <div className="panel muted">{t('whatsNew.none')}</div>}
      <div className="stack-sm">
        {releases.map((r) => (
          <Link key={`${r.plugin.id}@${r.version}`} className="release release-lg" to={paths.entry(r.plugin)}>
            <span className="release-side">
              <span className="mono kind-plugin-text strong">
                {t('common.version', { version: r.version })}
              </span>
              <span className="mono muted small">{formatDate(r.date)}</span>
            </span>
            <span className="release-main">
              <span className="release-name">{r.plugin.displayName}</span>
              <span className="release-summary wrap-text">{r.summary}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
