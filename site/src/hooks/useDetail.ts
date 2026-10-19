import { useEffect, useState } from 'react';
import { fetchJson } from '../lib/data';
import type { Entry } from '../types';

interface DetailState {
  id: string;
  markdown: string | null;
  failed: boolean;
}

/** Lazily loads the full markdown of an artifact. `markdown` is null while loading or after a failure. */
export function useDetail(entry: Entry | undefined): { markdown: string | null; failed: boolean } {
  const [loaded, setLoaded] = useState<DetailState | null>(null);
  const id = entry?.id;
  const file = entry?.detail;
  useEffect(() => {
    if (!id || !file) return;
    let cancelled = false;
    fetchJson<{ markdown: string }>(file).then(
      (d) => !cancelled && setLoaded({ id, markdown: d.markdown, failed: false }),
      () => !cancelled && setLoaded({ id, markdown: null, failed: true }),
    );
    return () => {
      cancelled = true;
    };
  }, [id, file]);
  return loaded && loaded.id === id ? loaded : { markdown: null, failed: false };
}
