import { Suspense, lazy } from 'react';

const MarkdownImpl = lazy(() => import('./MarkdownImpl'));

/** react-markdown is large, so it is loaded only when a detail page needs it. */
export function Markdown({ children, baseDir }: { children: string; baseDir: string }) {
  return (
    <Suspense fallback={null}>
      <MarkdownImpl baseDir={baseDir}>{children}</MarkdownImpl>
    </Suspense>
  );
}
