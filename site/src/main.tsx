import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './styles.css';
import App from './app/App';

// BASE_URL is "/" locally and "/<repository>/" on GitHub Pages.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Without transitions the URL state is committed synchronously, which typing into the search box relies on. */}
    <BrowserRouter basename={basename} useTransitions={false}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
