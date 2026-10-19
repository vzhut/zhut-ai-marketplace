import { useBasket } from '../context/basket';
import { useCatalogData } from '../context/catalog';
import { t } from '../i18n';
import { issueUrl } from '../lib/install';
import { markdownBaseDir } from '../lib/links';
import type { Entry } from '../types';
import { Markdown } from '../shared/ui/Markdown';

/** Basket, GitHub and issue buttons shared by plugin and artifact pages. */
export function EntryActions({ entry }: { entry: Entry }) {
  const { catalog } = useCatalogData();
  const basket = useBasket();
  const inBasket = basket.items.includes(entry.plugin);
  return (
    <div className="row-gap wrap actions">
      <button
        className={inBasket ? 'btn btn-lg btn-active' : 'btn btn-lg'}
        aria-pressed={inBasket}
        onClick={() => basket.toggle(entry.plugin)}
      >
        {t(inBasket ? 'detail.basketIn' : 'detail.basketAdd', { plugin: entry.plugin })}
      </button>
      {entry.url && (
        <a className="btn btn-lg" href={entry.url} target="_blank" rel="noopener noreferrer">
          {t('detail.viewOnGithub')}
        </a>
      )}
      <a
        className="btn btn-lg"
        href={issueUrl(catalog.repo, 'artifact-issue.yml', t('detail.issueTitle', { id: entry.id }), {
          artifact: entry.id,
          path: entry.path,
        })}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('detail.reportIssue')}
      </a>
    </div>
  );
}

/** The full markdown text, or the one-line description while it loads or if it cannot be loaded. */
export function EntryDocument({
  entry,
  markdown,
  failed,
}: {
  entry: Entry;
  markdown: string | null;
  failed: boolean;
}) {
  return (
    <div className="panel">
      {markdown ? (
        <Markdown baseDir={markdownBaseDir(entry)}>{markdown}</Markdown>
      ) : (
        <>
          <p className="muted">{entry.description}</p>
          {failed && <p className="muted small">{t('detail.loadError')}</p>}
        </>
      )}
    </div>
  );
}
