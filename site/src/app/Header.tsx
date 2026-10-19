import type { RefObject } from 'react';
import { Link } from 'react-router';
import { useBasket } from '../context/basket';
import { useCatalogData } from '../context/catalog';
import { useUi } from '../context/ui';
import { useSearchState, useSetQuery } from '../features/search/useSearchState';
import { t } from '../i18n';
import { paths } from '../lib/routes';

export function Header({
  theme,
  onToggleTheme,
  searchRef,
}: {
  theme: string;
  onToggleTheme: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  const { catalog } = useCatalogData();
  const { openPalette, openBasket } = useUi();
  const basket = useBasket();
  const { state } = useSearchState();
  const { setQuery, onSearch } = useSetQuery();
  return (
    <header className="header">
      <Link className="brand" to={paths.home}>
        <span className="brand-mark">◆</span>
        <span className="brand-name">{t('header.brand')}</span>
        <span className="brand-tag">
          {catalog.marketplace.name.replace(/-ai-marketplace$|-marketplace$/, '')}
        </span>
      </Link>
      <div className="header-search">
        <span className="search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          ref={searchRef}
          type="search"
          aria-label={t('header.searchLabel')}
          value={onSearch ? state.q : ''}
          placeholder={t('header.searchPlaceholder')}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <button
        className="icon-btn mono"
        onClick={openPalette}
        aria-label={t('header.paletteLabel')}
        title={t('header.paletteTitle')}
      >
        {t('header.paletteShortcut')}
      </button>
      <button
        className="icon-btn"
        onClick={openBasket}
        aria-label={t('header.basketLabel', { count: basket.items.length })}
        title={t('header.basketTitle')}
      >
        🧺{basket.items.length > 0 && <span className="count-pill">{basket.items.length}</span>}
      </button>
      <button
        className="icon-btn"
        onClick={onToggleTheme}
        aria-label={t('header.themeToggle')}
        title={t('header.themeToggle')}
      >
        {theme === 'dark' ? '☾' : '☀'}
      </button>
      {catalog.repo.url && (
        <a className="header-link" href={catalog.repo.url} target="_blank" rel="noopener noreferrer">
          {t('header.github')}
        </a>
      )}
    </header>
  );
}
