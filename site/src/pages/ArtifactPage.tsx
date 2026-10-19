import { Link, useParams } from 'react-router';
import { useCatalogData } from '../context/catalog';
import { useDetail } from '../hooks/useDetail';
import { useDocumentTitle } from '../app/useDocumentTitle';
import { t } from '../i18n';
import { installCommand } from '../lib/install';
import { entryId, paths } from '../lib/routes';
import { CommandRow, KindBadge } from '../shared/ui/common';
import { NotFound } from './NotFoundPage';
import { EntryActions, EntryDocument } from './entry-parts';

/** Skill, agent, command, hook or MCP server: /<skills|agents|…>/<plugin>/<name>. */
export default function ArtifactPage() {
  const { kind = '', plugin = '', name = '' } = useParams();
  const { catalog, byId } = useCatalogData();
  const id = entryId(kind, plugin, name);
  const entry = id ? byId.get(id) : undefined;
  const { markdown, failed } = useDetail(entry);
  useDocumentTitle(entry?.displayName ?? t('views.notFound'));

  if (!entry) return <NotFound entry />;
  const parent = byId.get(`plugin:${entry.plugin}`);

  return (
    <div className="page page-artifact">
      <nav className="crumbs" aria-label={t('detail.breadcrumb')}>
        <Link to={paths.search()}>{t('detail.crumbCatalog')}</Link>
        <span> / </span>
        {parent ? <Link to={paths.entry(parent)}>{parent.displayName}</Link> : entry.plugin}
        <span className="muted"> / {entry.name}</span>
      </nav>
      <div className="row-gap wrap">
        <KindBadge kind={entry.kind} />
        <h1 className="h-artifact">{entry.displayName}</h1>
        {entry.invocation && <span className="invocation">{entry.invocation}</span>}
      </div>
      <p className="lead-sm">{entry.description}</p>

      {entry.tools.length > 0 && (
        <div className="tools">
          <div className="eyebrow-sm">{t('detail.tools')}</div>
          <div className="row-wrap">
            {entry.tools.map((tool) => (
              <span key={tool} className="tool">
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      <CommandRow text={installCommand(entry.plugin, catalog.marketplace.name)} id={`a:${entry.id}`} />
      <EntryActions entry={entry} />

      <section className="block">
        <h2 className="h-section">{t('detail.documentation')}</h2>
        <EntryDocument entry={entry} markdown={markdown} failed={failed} />
      </section>
    </div>
  );
}
