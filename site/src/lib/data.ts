// BASE_URL already ends with "/". __BUILD_ID__ changes on every deploy, so a new deploy never reads
// old cached JSON (the data files themselves have no content hash in their names).
export const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}?v=${__BUILD_ID__}`;

const cache = new Map<string, Promise<unknown>>();

/** Fetches a data file once per page load; failed requests are not cached, so they can be retried. */
export function fetchJson<T>(file: string): Promise<T> {
  const cached = cache.get(file);
  if (cached) return cached as Promise<T>;
  const request = fetch(dataUrl(file)).then((res) => {
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    return res.json() as Promise<T>;
  });
  cache.set(file, request);
  request.catch(() => cache.delete(file));
  return request;
}

/** Forgets cached responses (tests only). */
export const resetDataCache = () => cache.clear();
