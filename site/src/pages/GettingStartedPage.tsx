import { Link } from 'react-router';
import { useCatalogData } from '../context/catalog';
import { useDocumentTitle } from '../app/useDocumentTitle';
import { t } from '../i18n';
import { installCommand, marketplaceAddCommand, marketplaceUpdateCommand } from '../lib/install';
import { paths } from '../lib/routes';
import { CommandRow } from '../shared/ui/common';

export default function GettingStartedPage() {
  useDocumentTitle(t('views.start'));
  const { catalog, plugins } = useCatalogData();
  const mk = catalog.marketplace.name;
  const steps = [
    {
      title: t('start.step1Title'),
      desc: t('start.step1Text'),
      cmd: marketplaceAddCommand(catalog.repo, mk),
    },
    {
      title: t('start.step2Title'),
      desc: t('start.step2Text'),
      cmd: installCommand(plugins[0]?.name ?? t('start.pluginPlaceholder'), mk),
    },
    { title: t('start.step3Title'), desc: t('start.step3Text'), cmd: marketplaceUpdateCommand(mk) },
  ];
  return (
    <div className="page page-start">
      <Link className="back" to={paths.home}>
        {t('common.home')}
      </Link>
      <h1 className="h-start">{t('start.title')}</h1>
      <p className="lead-sm mb-lg">{t('start.lead')}</p>
      <div className="stack-lg">
        {steps.map((s, i) => (
          <div className="step" key={s.title}>
            <div className="step-n">{i + 1}</div>
            <div className="step-body">
              <h2 className="h-step">{s.title}</h2>
              <p>{s.desc}</p>
              <CommandRow text={s.cmd} id={`s:${i}`} compact />
            </div>
          </div>
        ))}
      </div>
      <div className="note">
        <strong>{t('start.noteStrong')}</strong>
        {t('start.noteText')}
      </div>
    </div>
  );
}
