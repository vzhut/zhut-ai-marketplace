import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useDocumentTitle } from '../app/useDocumentTitle';
import { useCatalogData } from '../context/catalog';
import { t } from '../i18n';
import { fetchJson } from '../lib/data';
import { paths } from '../lib/routes';
import type { HealthReport } from '../types';

export default function HealthPage() {
  useDocumentTitle(t('views.health'));
  const { byId } = useCatalogData();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetchJson<HealthReport>('health.json').then(setReport, (e: Error) => setError(e.message));
  }, []);

  const groups = new Map<string, HealthReport['findings']>();
  for (const f of report?.findings ?? []) groups.set(f.code, [...(groups.get(f.code) ?? []), f]);

  return (
    <div className="page page-narrow">
      <Link className="back" to={paths.home}>
        {t('common.home')}
      </Link>
      <h1 className="h-detail">{t('health.title')}</h1>
      {error && <p className="muted">{t('health.loadError', { error })}</p>}
      {report && (
        <>
          <p className="muted">
            {t('health.summary', {
              entries: report.summary.entries,
              warnings: t('health.warnings', { count: report.summary.warnings }),
              date: report.generated.slice(0, 10),
            })}
          </p>
          {groups.size === 0 && <div className="panel">{t('health.none')}</div>}
          <div className="stack-lg">
            {[...groups.entries()].map(([code, list]) => (
              <section key={code}>
                <h2 className="h-section mono">
                  {code} <span className="muted small">{list.length}</span>
                </h2>
                <div className="stack-xs">
                  {list.map((f, i) => {
                    const target = f.id ? byId.get(f.id) : undefined;
                    return (
                      <div className="log-item" key={`${code}-${i}`}>
                        {f.message}
                        {target && (
                          <>
                            {' '}
                            <Link to={paths.entry(target)}>{t('health.open')}</Link>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
