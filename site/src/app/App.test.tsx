import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDataCache } from '../lib/data';
import { catalog } from '../test-fixtures';
import App from './App';

const DETAIL = '# Hello\n\nSee [the changelog](CHANGELOG.md) and [docs](https://example.com/docs).';

function Probe() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]} useTransitions={false}>
      <App />
      <Probe />
    </MemoryRouter>,
  );
}
const location = () => screen.getByTestId('location').textContent;

beforeEach(() => {
  resetDataCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const file = String(url).split('/data/')[1].split('?')[0];
      if (file === 'index.json') return Response.json(catalog);
      if (file === 'synonyms.json') return Response.json({});
      return Response.json({ markdown: DETAIL });
    }),
  );
  window.localStorage.clear();
  document.title = '';
});

describe('routing', () => {
  it('searches from the home hero input and keeps typing in the header box', async () => {
    const user = userEvent.setup({ delay: 15 }); // closer to human typing than the default 0 ms
    renderAt('/');
    await screen.findByRole('heading', { name: /find the artifact/i });
    await user.type(screen.getByLabelText('Describe what you need'), 'architecture');
    expect(await screen.findByRole('heading', { name: /Results: “architecture”/ })).toBeTruthy();
    expect(location()).toBe('/search?q=architecture');
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
  });

  it('opens an artifact through a real link and updates the tab title', async () => {
    const user = userEvent.setup();
    renderAt('/search?q=research');
    const link = await screen.findByRole('link', { name: 'Web Research' });
    expect(link.getAttribute('href')).toBe('/skills/research-tools/web-research');
    await user.click(link);
    expect(await screen.findByRole('heading', { name: 'Web Research', level: 1 })).toBeTruthy();
    expect(location()).toBe('/skills/research-tools/web-research');
    await waitFor(() => expect(document.title).toBe('Web Research · test-mp'));
  });

  it('moves focus to the page heading after navigating to another page', async () => {
    const user = userEvent.setup();
    renderAt('/search?q=research');
    await user.click(await screen.findByRole('link', { name: 'Web Research' }));
    const heading = await screen.findByRole('heading', { name: 'Web Research', level: 1 });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('renders deep links to plugins and artifacts, and a 404 for unknown ones', async () => {
    const view = renderAt('/plugins/alpha');
    expect(await screen.findByRole('heading', { name: 'Alpha', level: 1 })).toBeTruthy();
    view.unmount();

    const second = renderAt('/agents/alpha/doc-writer');
    expect(await screen.findByRole('heading', { name: 'Doc Writer', level: 1 })).toBeTruthy();
    second.unmount();

    const third = renderAt('/skills/alpha/missing');
    expect(await screen.findByText('Artifact not found')).toBeTruthy();
    third.unmount();

    renderAt('/no/such');
    expect(await screen.findByText('Page not found')).toBeTruthy();
  });

  it('resolves relative links in markdown against the repository', async () => {
    renderAt('/plugins/alpha');
    const link = await screen.findByRole('link', { name: 'the changelog' });
    expect(link.getAttribute('href')).toBe('https://github.com/o/r/blob/main/plugins/alpha/CHANGELOG.md');
    expect(screen.getByRole('link', { name: 'docs' }).getAttribute('href')).toBe('https://example.com/docs');
  });
});

describe('search page', () => {
  it('filters by a type facet in the URL and shows the empty state', async () => {
    const user = userEvent.setup();
    renderAt('/search');
    await screen.findByText('Catalog overview');
    await user.click(screen.getByRole('button', { name: /^agents/ }));
    expect(location()).toBe('/search?type=agent');
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1));
    await user.type(screen.getByLabelText('Search the catalog'), 'zzzzqqqq');
    expect(await screen.findByText('Nothing found')).toBeTruthy();
  });

  it('copies the install command from a card', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderAt('/search?q=research');
    const card = (await screen.findAllByRole('article'))[0];
    await user.click(within(card).getByRole('button', { name: 'Copy install' }));
    expect(writeText).toHaveBeenCalledWith('claude plugin install research-tools@test-mp');
    expect(await screen.findByRole('status')).toBeTruthy();
  });
});

describe('overlays', () => {
  it('builds a settings snippet in the basket and returns focus when it closes', async () => {
    const user = userEvent.setup();
    renderAt('/plugins/alpha');
    await screen.findByRole('heading', { name: 'Alpha', level: 1 });
    await user.click(screen.getByRole('button', { name: /Add alpha to basket/ }));
    const opener = screen.getByRole('button', { name: /Open basket/ });
    await user.click(opener);
    const dialog = await screen.findByRole('dialog', { name: 'Plugin basket' });
    expect(within(dialog).getByText(/"alpha@test-mp": true/)).toBeTruthy();
    expect(window.localStorage.getItem('basket')).toBe('["alpha"]');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('jumps to an artifact from the command palette with the keyboard', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await screen.findByRole('heading', { name: /find the artifact/i });
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('textbox', { name: 'Jump to an artifact' }), 'doc writer{Enter}');
    expect(await screen.findByRole('heading', { name: 'Doc Writer', level: 1 })).toBeTruthy();
    expect(location()).toBe('/agents/alpha/doc-writer');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('failures', () => {
  it('shows a readable error when the catalog cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    );
    renderAt('/');
    expect(await screen.findByText('Could not load the catalog')).toBeTruthy();
  });
});
