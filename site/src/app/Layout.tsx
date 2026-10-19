import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useCopy } from '../context/copy';
import { UiContext } from '../context/ui';
import { BasketDrawer } from '../features/basket/BasketDrawer';
import { Palette } from '../features/palette/Palette';
import { useTheme } from '../hooks/useTheme';
import { t } from '../i18n';
import { ErrorBoundary } from './ErrorBoundary';
import { Header } from './Header';
import { useRouteFocus } from './useRouteFocus';

/** App shell: header, the routed page, and the overlays (palette, basket, toast). */
export function Layout() {
  const { theme, toggle } = useTheme();
  const { copied } = useCopy();
  const { pathname } = useLocation();
  const [palette, setPalette] = useState(false);
  const [basketOpen, setBasketOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  useRouteFocus(mainRef);

  const ui = useMemo(
    () => ({
      openPalette: () => setPalette(true),
      openBasket: () => setBasketOpen(true),
      focusSearch: () =>
        setTimeout(() => {
          const el = searchRef.current;
          if (!el) return;
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }, 0),
    }),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <UiContext.Provider value={ui}>
      <div className="app">
        <a
          className="skip-link"
          href="#main"
          onClick={(e) => {
            e.preventDefault();
            mainRef.current?.focus();
          }}
        >
          {t('a11y.skipLink')}
        </a>
        <Header theme={theme} onToggleTheme={toggle} searchRef={searchRef} />
        <main id="main" ref={mainRef} tabIndex={-1} className="main">
          <ErrorBoundary resetKey={pathname}>
            <Suspense fallback={<div className="page page-narrow muted">{t('app.loadingPage')}</div>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        {palette && <Palette onClose={() => setPalette(false)} />}
        {basketOpen && <BasketDrawer onClose={() => setBasketOpen(false)} />}
        {copied && (
          <div className="toast" role="status">
            <span className="ok">✓</span> {t('app.copiedToast')}
          </div>
        )}
      </div>
    </UiContext.Provider>
  );
}
