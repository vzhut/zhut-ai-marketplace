import { useLocation, useNavigate } from 'react-router';
import { t } from '../../i18n';
import { paths } from '../../lib/routes';

/** Goes back in history when there is something to go back to, otherwise to the catalog home. */
export function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <button
      className="back"
      onClick={() => (location.key !== 'default' ? navigate(-1) : navigate(paths.home))}
    >
      {t('common.back')}
    </button>
  );
}
