import { Component, type ReactNode } from 'react';
import { t } from '../i18n';

interface Props {
  /** When this value changes (e.g. the route), a shown error is cleared. */
  resetKey: string;
  children: ReactNode;
}

/** Catches render errors and failed lazy-chunk loads so one broken page does not blank the whole site. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page page-narrow">
        <div className="empty-box" role="alert">
          <h1 className="h-error">{t('errors.title')}</h1>
          <p>{t('errors.text')}</p>
          <button className="btn btn-lg" onClick={() => window.location.reload()}>
            {t('errors.reload')}
          </button>
        </div>
      </div>
    );
  }
}
