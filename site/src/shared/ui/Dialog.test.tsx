import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Dialog } from './Dialog';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>open</button>
      {open && (
        <Dialog label="Demo" onClose={() => setOpen(false)} className="box">
          <button>first</button>
          <button>last</button>
        </Dialog>
      )}
    </>
  );
}

describe('<Dialog />', () => {
  it('moves focus inside, keeps Tab in the dialog, and restores focus on Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'open' });
    await user.click(opener);

    expect(screen.getByRole('dialog', { name: 'Demo' }).getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }));

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'last' }));
    await user.tab(); // wraps to the first control instead of leaving the dialog
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }));
    await user.tab({ shift: true }); // and backwards
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'last' }));

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('closes on a click on the backdrop but not inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(screen.getByRole('button', { name: 'first' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.pointer({
      keys: '[MouseLeft]',
      target: screen.getByRole('dialog').parentElement as HTMLElement,
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
