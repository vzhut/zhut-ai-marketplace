import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface CopyValue {
  /** Id of the item that was copied in the last two seconds, for "Copied ✓" labels. */
  copied: string | null;
  copy: (text: string, id: string) => void;
}

const CopyContext = createContext<CopyValue | null>(null);

function fallbackCopy(text: string) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } catch {
    /* ignore */
  }
  document.body.removeChild(ta);
}

export function CopyProvider({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number>(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback((text: string, id: string) => {
    const done = () => {
      setCopied(id);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(null), 2000);
    };
    const fallback = () => {
      fallbackCopy(text);
      done();
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }, []);

  const value = useMemo(() => ({ copied, copy }), [copied, copy]);
  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
}

export function useCopy(): CopyValue {
  const value = useContext(CopyContext);
  if (!value) throw new Error('useCopy must be used inside <CopyProvider>');
  return value;
}
