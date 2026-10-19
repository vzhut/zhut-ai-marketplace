import { Link } from 'react-router';
import { useBasket } from '../../context/basket';
import { useCatalogData } from '../../context/catalog';
import { useCopy } from '../../context/copy';
import { t, type MessageKey } from '../../i18n';
import { installCommand } from '../../lib/install';
import { paths } from '../../lib/routes';
import type { Hit } from '../../lib/search';
import { Highlight, KindBadge } from '../../shared/ui/common';

export function ArtifactCard({ hit }: { hit: Hit }) {
  const { catalog } = useCatalogData();
  const { copied, copy } = useCopy();
  const basket = useBasket();
  const e = hit.entry;
  const id = `c:${e.id}`;
  const inBasket = basket.items.includes(e.plugin);
  const to = paths.entry(e);
  return (
    <article className="card">
      <div className="card-body">
        <div className="card-top">
          <KindBadge kind={e.kind} />
          {e.version && (
            <span className="mono muted small">{t('common.version', { version: e.version })}</span>
          )}
        </div>
        <h3 className="card-title">
          <Link to={to}>
            <Highlight text={e.displayName} terms={hit.highlight} />
          </Link>
        </h3>
        <p className="card-desc">
          <Highlight text={e.description} terms={hit.highlight} />
        </p>
        {e.keywords.length > 0 && (
          <div className="card-kw">
            {e.keywords.slice(0, 3).map((k) => (
              <span key={k}>#{k}</span>
            ))}
          </div>
        )}
        {hit.matched.length > 0 && (
          <div className="card-match">
            {t('card.matchedIn', {
              fields: hit.matched.map((f) => t(`card.field.${f}` as MessageKey)).join(', '),
            })}
          </div>
        )}
      </div>
      <div className="card-foot">
        <span className="card-meta">
          {e.kind === 'plugin' ? e.author : t('card.byline', { plugin: e.plugin, author: e.author })}
        </span>
        <div className="row-gap">
          <button
            className={inBasket ? 'btn btn-sm btn-active' : 'btn btn-sm'}
            aria-pressed={inBasket}
            title={t(inBasket ? 'card.basketRemoveTitle' : 'card.basketAddTitle', { plugin: e.plugin })}
            onClick={() => basket.toggle(e.plugin)}
          >
            {inBasket ? t('card.basketIn') : t('card.basketAdd')}
          </button>
          <button
            className={copied === id ? 'btn btn-sm done' : 'btn btn-sm'}
            onClick={() => copy(installCommand(e.plugin, catalog.marketplace.name), id)}
          >
            {copied === id ? t('common.copiedInstall') : t('common.copyInstall')}
          </button>
          <Link className="btn btn-sm btn-primary" to={to}>
            {t('card.open')}
          </Link>
        </div>
      </div>
    </article>
  );
}
