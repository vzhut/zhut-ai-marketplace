import { useNavigate } from 'react-router';
import { t } from '../../i18n';
import { paths } from '../../lib/routes';
import { KINDS } from '../../lib/search-params';
import type { Hit } from '../../lib/search';
import type { SearchState } from '../../types';
import { Dot, kindLabel } from '../../shared/ui/common';
import { useSearchState } from './useSearchState';

type ListKey = 'types' | 'plugins' | 'categories' | 'keywords' | 'authors';

function tally(values: string[]) {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

export function Facets({ base, open }: { base: Hit[]; open: boolean }) {
  const { state, update } = useSearchState();
  const navigate = useNavigate();
  const toggle = (key: ListKey, value: string) =>
    update(
      (cur) =>
        ({
          ...cur,
          [key]: (cur[key] as string[]).includes(value)
            ? (cur[key] as string[]).filter((x) => x !== value)
            : [...(cur[key] as string[]), value],
        }) as SearchState,
    );

  const entries = base.map((h) => h.entry);
  const section = (title: string, key: ListKey, counts: Map<string, number>, tags = false) => {
    if (counts.size < 2 && !(counts.size === 1 && state[key].length)) return null;
    const names = [...counts.keys()].sort();
    return (
      <div className="facet" key={key}>
        <div className="facet-title">{title}</div>
        <div className={tags ? 'facet-tags' : 'facet-list'}>
          {names.map((n) => {
            const on = (state[key] as string[]).includes(n);
            return tags ? (
              <button
                key={n}
                className={on ? 'tag on' : 'tag'}
                aria-pressed={on}
                onClick={() => toggle(key, n)}
              >
                {n}
              </button>
            ) : (
              <button
                key={n}
                className={on ? 'facet-row on' : 'facet-row'}
                aria-pressed={on}
                onClick={() => toggle(key, n)}
              >
                <span className="facet-name">{n}</span>
                <span className="mono muted small">{counts.get(n)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className={open ? 'facets open' : 'facets'} aria-label={t('facets.label')}>
      <div className="facets-head">
        <span className="eyebrow-sm">{t('facets.title')}</span>
        <button className="link-btn" onClick={() => navigate(paths.search())}>
          {t('facets.reset')}
        </button>
      </div>
      <div className="facet">
        <div className="facet-title">{t('facets.type')}</div>
        <div className="facet-list">
          {KINDS.map((k) => {
            const on = state.types.includes(k);
            return (
              <button
                key={k}
                className={on ? 'facet-row on' : 'facet-row'}
                aria-pressed={on}
                onClick={() => toggle('types', k)}
              >
                <Dot kind={k} />
                <span className="facet-name cap">{kindLabel(k)}</span>
                <span className="mono muted small">{entries.filter((e) => e.kind === k).length}</span>
              </button>
            );
          })}
        </div>
      </div>
      {section(t('facets.plugin'), 'plugins', tally(entries.map((e) => e.plugin)))}
      {section(t('facets.category'), 'categories', tally(entries.map((e) => e.category)))}
      {section(t('facets.keywords'), 'keywords', tally(entries.flatMap((e) => e.keywords)), true)}
      {section(t('facets.author'), 'authors', tally(entries.map((e) => e.author)))}
    </aside>
  );
}
