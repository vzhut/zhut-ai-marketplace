import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'none'";

// Routes are real paths (/skills/plugin/name), so assets must be absolute. On GitHub Pages the site
// lives under /<repository>/; SITE_BASE overrides this (e.g. "/" for a custom domain).
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.SITE_BASE ?? (process.env.GITHUB_ACTIONS && repo ? `/${repo}/` : '/');

// Changes on every build. It is appended to data URLs so that a new deploy never reads cached old JSON.
const buildId =
  [process.env.GITHUB_SHA?.slice(0, 8), process.env.GITHUB_RUN_ID].filter(Boolean).join('-') ||
  String(Date.now());

export default defineConfig(({ command }) => ({
  base,
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [
    react(),
    {
      name: 'csp',
      // The dev server needs inline scripts for HMR, so the policy is only applied to builds.
      transformIndexHtml: (html) =>
        command === 'build'
          ? html.replace('</title>', `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
          : html,
    },
  ],
  server: { port: 5173, open: false },
  build: { sourcemap: false, chunkSizeWarningLimit: 200 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['node_modules', 'dist'],
  },
}));
