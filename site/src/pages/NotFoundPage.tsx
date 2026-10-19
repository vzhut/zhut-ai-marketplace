import { Link } from 'react-router';
import { useDocumentTitle } from '../app/useDocumentTitle';
import { t } from '../i18n';
import { paths } from '../lib/routes';

/** Unknown address, or (with `entry`) a plugin/artifact URL that is not in the catalog. */
export function NotFound({ entry = false }: { entry?: boolean }) {
  useDocumentTitle(t('views.notFound'));
  return (
    <div className="page page-narrow">
      <div className="empty-box">
        <h1 className="h-error">{t(entry ? 'detail.notFoundTitle' : 'notFound.title')}</h1>
        <p>{t(entry ? 'detail.notFoundText' : 'notFound.text')}</p>
        <Link className="btn btn-lg" to={paths.home}>
          {t(entry ? 'detail.backToCatalog' : 'notFound.home')}
        </Link>
      </div>
    </div>
  );
}

export default function NotFoundPage() {
  return <NotFound />;
}
