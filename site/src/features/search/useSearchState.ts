import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { paths } from '../../lib/routes';
import { buildSearch, parseSearch } from '../../lib/search-params';
import type { SearchState } from '../../types';

/** Search and filters, stored in the query string of /search. */
export function useSearchState() {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseSearch(params), [params]);
  const update = useCallback(
    (fn: (cur: SearchState) => SearchState, replace = true) =>
      setParams((prev) => buildSearch(fn(parseSearch(prev))), { replace }),
    [setParams],
  );
  return { state, update };
}

/** Header and hero search boxes: edit the query on /search, or open /search from any other page. */
export function useSetQuery() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { update } = useSearchState();
  const onSearch = pathname === paths.search().split('?')[0];
  const setQuery = useCallback(
    (q: string) =>
      onSearch
        ? update((cur) => ({ ...cur, q }))
        : navigate(paths.search({ q }), { state: { keepFocus: true } }),
    [onSearch, update, navigate],
  );
  return { setQuery, onSearch };
}
