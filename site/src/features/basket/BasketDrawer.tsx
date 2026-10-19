import { Link } from 'react-router';
import { useBasket } from '../../context/basket';
import { useCatalogData } from '../../context/catalog';
import { useCopy } from '../../context/copy';
import { t } from '../../i18n';
import { installCommand, marketplaceAddCommand, settingsSnippet } from '../../lib/install';
import { paths } from '../../lib/routes';
import { Dialog } from '../../shared/ui/Dialog';

export function BasketDrawer({ onClose }: { onClose: () => void }) {
  const { catalog, byId } = useCatalogData();
  const basket = useBasket();
  const { copy, copied } = useCopy();
  const mk = catalog.marketplace.name;
  const known = basket.items.map((p) => byId.get(`plugin:${p}`)).filter((e) => e !== undefined);
  const names = known.map((e) => e.name);
  const commands = [marketplaceAddCommand(catalog.repo, mk), ...names.map((p) => installCommand(p, mk))].join(
    '\n',
  );
  const snippet = settingsSnippet(catalog, names);

  return (
    <Dialog
      label={t('basket.label')}
      onClose={onClose}
      className="drawer"
      overlayClassName="overlay overlay-right"
    >
      <div className="row-between">
        <h2 className="h-section">{t('basket.title')}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={t('basket.close')}>
          ✕
        </button>
      </div>
      {known.length === 0 ? (
        <p className="muted">{t('basket.empty')}</p>
      ) : (
        <>
          <ul className="basket-list">
            {known.map((e) => (
              <li key={e.name}>
                <Link to={paths.entry(e)} onClick={onClose}>
                  {e.name}
                </Link>
                <button className="link-btn" onClick={() => basket.toggle(e.name)}>
                  {t('basket.remove')}
                </button>
              </li>
            ))}
          </ul>
          <div className="drawer-block">
            <div className="row-between">
              <div className="eyebrow-sm">{t('basket.installCommands')}</div>
              <button className="link-btn" onClick={() => copy(commands, 'basket:cmd')}>
                {copied === 'basket:cmd' ? t('common.copiedInstall') : t('common.copy')}
              </button>
            </div>
            <pre className="code">{commands}</pre>
          </div>
          <div className="drawer-block">
            <div className="row-between">
              <div className="eyebrow-sm">{t('basket.settingsFile')}</div>
              <button className="link-btn" onClick={() => copy(snippet, 'basket:json')}>
                {copied === 'basket:json' ? t('common.copiedInstall') : t('common.copy')}
              </button>
            </div>
            <pre className="code">{snippet}</pre>
          </div>
          <button className="btn" onClick={basket.clear}>
            {t('basket.clear')}
          </button>
        </>
      )}
    </Dialog>
  );
}
