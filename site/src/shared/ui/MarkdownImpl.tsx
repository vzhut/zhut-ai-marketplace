import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCatalogData } from '../../context/catalog';
import { resolveRepoLink } from '../../lib/links';

/** `baseDir` is the repository directory of the markdown file, used to resolve relative links. */
export default function MarkdownImpl({ children, baseDir }: { children: string; baseDir: string }) {
  const { repo } = useCatalogData().catalog;
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: label }) => {
            const target = resolveRepoLink(href ?? '', repo.url, repo.branch, baseDir);
            return target ? (
              <a href={target} target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            ) : (
              <span>{label}</span>
            );
          },
          // The site's CSP only allows its own images, so repository images are shown as their alt text.
          img: ({ alt }) => <span>{alt}</span>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
