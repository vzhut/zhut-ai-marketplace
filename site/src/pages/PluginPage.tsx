import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { useCatalogData } from '../context/catalog';
import { useDetail } from '../hooks/useDetail';
import { useDocumentTitle } from '../app/useDocumentTitle';
import { t } from '../i18n';
import { childrenOf } from '../lib/catalog';
import { installCommand } from '../lib/install';
import { paths } from '../lib/routes';
import { BackButton } from '../shared/ui/BackButton';
import { CommandRow, Dot, formatDate, kindLabel } from '../shared/ui/common';
import type { Kind } from '../types';
import { NotFound } from './NotFoundPage';
import { EntryActions, EntryDocument } from './entry-parts';

const CONTENT_ORDER: Kind[] = ['skill', 'agent', 'command', 'hook', 'mcp'];

export default function PluginPage() {
  const { plugin = '' } = useParams();
  const { catalog, byId } = useCatalogData();
  const entry = byId.get(`plugin:${plugin}`);
  const { markdown, failed } = useDetail(entry);
  useDocumentTitle(entry?.displayName ?? t('views.notFound'));
  const children = useMemo(() => (entry ? childrenOf(catalog.entries, entry.name) : []), [catalog, entry]);

  if (!entry) return <NotFound entry />;
  const deps = entry.deps ?? [];
  const changelog = entry.changelog ?? [];

  return (
    <div className="page page-detail">
      <BackButton />
      <div className="detail-head">
        <div className="detail-icon">◆</div>
        <div>
          <div className="row-gap wrap">
            <h1 className="h-detail">{entry.displayName}</h1>
            {entry.version && (
              <span className="badge" data-kind="plugin">
                {t('common.version', { version: entry.version })}
              </span>
            )}
            {entry.compatibility && (
              <span className="badge" data-kind="skill">
                {t('detail.compatibility', { value: entry.compatibility })}
              </span>
            )}
          </div>
          <p className="lead-sm">{entry.description}</p>
          <div className="muted mono small">
            {t('detail.byline', { author: entry.author, date: formatDate(entry.updated) })}
          </div>
        </div>
      </div>

      <CommandRow text={installCommand(entry.name, catalog.marketplace.name)} id={`p:${entry.id}`} />
      <EntryActions entry={entry} />

      <section className="block">
        <h2 className="h-section">{t('detail.pluginContents')}</h2>
        {children.length === 0 ? (
          <p className="muted">{t('detail.noContents')}</p>
        ) : (
          <div className="stack-lg">
            {CONTENT_ORDER.map((k) => {
              const items = children.filter((c) => c.kind === k);
              if (!items.length) return null;
              return (
                <div key={k}>
                  <div className="group-head">
                    <Dot kind={k} />
                    <span className="group-label">{kindLabel(k)}</span>
                    <span className="mono muted small">{items.length}</span>
                  </div>
                  <div className="grid-sm">
                    {items.map((it) => (
                      <Link key={it.id} className="mini-card" to={paths.entry(it)}>
                        <div className="mini-name">{it.displayName}</div>
                        {it.invocation && <div className="mini-inv">{it.invocation}</div>}
                        <div className="mini-desc">{it.description}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {deps.length > 0 && (
        <section className="block">
          <h2 className="h-section">{t('detail.dependencies')}</h2>
          <div className="row-wrap">
            {deps.map((d) => {
              const target = byId.get(`plugin:${d.name}`);
              const label = t('detail.dependency', {
                name: d.name,
                version: d.version ? ` ${d.version}` : '',
              });
              return target ? (
                <Link key={d.name} className="dep" to={paths.entry(target)}>
                  {label}
                </Link>
              ) : (
                <span key={d.name} className="dep dep-missing">
                  {label}
                </span>
              );
            })}
          </div>
        </section>
      )}

      <section className="block">
        <h2 className="h-section">{t('detail.readme')}</h2>
        <EntryDocument entry={entry} markdown={markdown} failed={failed} />
      </section>

      {changelog.length > 0 && (
        <section className="block">
          <h2 className="h-section">{t('detail.changelog')}</h2>
          <div className="stack-xs">
            {changelog.map((c) => (
              <div key={c.version} className="log-item">
                <div className="row-gap">
                  <span className="mono small kind-plugin-text">
                    {t('common.version', { version: c.version })}
                  </span>
                  <span className="muted small">{c.date}</span>
                </div>
                <div className="log-summary">{c.summary}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
