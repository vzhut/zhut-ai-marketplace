import { useCopy } from '../../context/copy';
import { t } from '../../i18n';
import type { Kind } from '../../types';

export const kindLabel = (kind: Kind) => t(`kinds.plural.${kind}`);

export const KindBadge = ({ kind }: { kind: Kind }) => (
  <span className="badge cap" data-kind={kind}>
    {t(`kinds.singular.${kind}`)}
  </span>
);

export const Dot = ({ kind }: { kind: Kind }) => <span className="dot" data-kind={kind} />;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const usable = terms.filter((term) => term.length > 1);
  if (!text || usable.length === 0) return <>{text}</>;
  const re = new RegExp(`(${usable.map(escapeRe).join('|')})`, 'gi');
  return <>{text.split(re).map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}</>;
}

/** Terminal-style command line with a copy button. */
export function CommandRow({ text, id, compact = false }: { text: string; id: string; compact?: boolean }) {
  const { copied, copy } = useCopy();
  const done = copied === id;
  return (
    <div className={compact ? 'cmd cmd-compact' : 'cmd'}>
      <span className="cmd-prompt">$</span>
      <span className="cmd-text">{text}</span>
      {compact ? (
        <button className={done ? 'link-btn done' : 'link-btn'} onClick={() => copy(text, id)}>
          {done ? t('common.copiedShort') : t('common.copy')}
        </button>
      ) : (
        <button className="btn btn-primary btn-lg cmd-copy" onClick={() => copy(text, id)}>
          {done ? t('common.copiedInstall') : t('common.copyInstall')}
        </button>
      )}
    </div>
  );
}

export const formatDate = (d: string) => d || t('common.emptyDate');
