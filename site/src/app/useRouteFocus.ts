import { useEffect, useRef, type RefObject } from 'react';
import { useLocation } from 'react-router';

/**
 * After navigating to another page: scroll to the top and move focus to the page heading, so keyboard and
 * screen-reader users land at the start of the new content. Typing in a search box navigates too; those
 * navigations set `state.keepFocus` and are left alone. Changes to the query string never move focus.
 */
export function useRouteFocus(main: RefObject<HTMLElement | null>) {
  const { pathname, state } = useLocation() as { pathname: string; state: { keepFocus?: boolean } | null };
  const first = useRef(true);
  // Kept in a ref so that changing history state (typing replaces it) never counts as a page change.
  const keepFocus = useRef(false);
  useEffect(() => {
    keepFocus.current = !!state?.keepFocus;
  });

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (keepFocus.current) return;
    window.scrollTo(0, 0);
    const root = main.current;
    if (!root) return;
    const focusHeading = () => {
      const heading = root.querySelector<HTMLElement>('h1');
      if (!heading) return false;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      return true;
    };
    if (focusHeading()) return;
    // Lazy pages render a moment later: wait for their heading.
    const observer = new MutationObserver(() => focusHeading() && observer.disconnect());
    observer.observe(root, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      root.focus({ preventScroll: true });
    }, 1500);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [pathname, main]);
}
