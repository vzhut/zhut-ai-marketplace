import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCatalogData } from '../../context/catalog';
import { t } from '../../i18n';
import { runQuery } from '../../lib/query';
import { paths } from '../../lib/routes';
import { emptySearch } from '../../lib/search-params';
import { Dialog } from '../../shared/ui/Dialog';
import { Dot } from '../../shared/ui/common';

export function Palette({ onClose }: { onClose: () => void }) {
  const { catalog, searcher, synonyms } = useCatalogData();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(
    () => runQuery(searcher, catalog.entries, { ...emptySearch, q }, synonyms).hits.slice(0, 8),
    [searcher, catalog.entries, q, synonyms],
  );

  return (
    <Dialog label={t('palette.label')} onClose={onClose} className="palette">
      <div className="palette-head">
        <span className="muted" aria-hidden="true">
          ⌕
        </span>
        <input
          aria-label={t('palette.label')}
          value={q}
          placeholder={t('palette.placeholder')}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && results[active]) {
              onClose();
              navigate(paths.entry(results[active].entry));
            }
          }}
        />
        <span className="kbd">{t('palette.esc')}</span>
      </div>
      <div className="palette-list">
        {results.map(({ entry: e }, i) => (
          <Link
            key={e.id}
            to={paths.entry(e)}
            className={i === active ? 'palette-row active' : 'palette-row'}
            onMouseEnter={() => setActive(i)}
            onClick={onClose}
          >
            <Dot kind={e.kind} />
            <span className="palette-main">
              <span className="strong">{e.displayName}</span>{' '}
              <span className="muted small">
                · {e.kind === 'plugin' ? t('kinds.singular.plugin') : e.plugin}
              </span>
            </span>
            <span className="mono muted small cap">{t(`kinds.singular.${e.kind}`)}</span>
          </Link>
        ))}
        {results.length === 0 && <div className="palette-empty">{t('palette.empty')}</div>}
      </div>
    </Dialog>
  );
}
