/**
 * Modal.tsx — focus trap, Escape, ARIA dialog role.
 * run: npm run test:components
 */
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { Modal } from '@/components/ui/Modal';

// useScrollLock touches document.body styles — fine in jsdom, but guard it
vi.mock('@/lib/useScrollLock', () => ({ useScrollLock: vi.fn() }));

function SimpleModal({
  open,
  onClose,
  title = 'Prófunarglugg',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <button type="button">Fyrsti hnappur</button>
      <button type="button">Síðasti hnappur</button>
    </Modal>
  );
}

describe('Modal', () => {
  it('sýnir innihald þegar open=true', () => {
    renderWithProviders(<SimpleModal open onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Prófunarglugg')).toBeInTheDocument();
  });

  it('felur innihald þegar open=false', () => {
    renderWithProviders(<SimpleModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hefur aria-modal og aria-labelledby', () => {
    renderWithProviders(<SimpleModal open onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('kallar onClose þegar Escape er ýtt', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SimpleModal open onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('kallar onClose þegar smellt er á bakgrunn', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SimpleModal open onClose={onClose} />);
    // The outer overlay has the click handler; click outside the panel
    const overlay = document.querySelector('.fixed.inset-0');
    if (overlay) {
      await user.click(overlay);
    }
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('hlutvar smellur á gluggann sjálfan frá að loka', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SimpleModal open onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    await user.click(dialog);
    // onClose should NOT be called because panel.stopPropagation()
    expect(onClose).not.toHaveBeenCalled();
  });

  it('sýnir eyebrow þegar gefið', () => {
    renderWithProviders(
      <Modal open onClose={vi.fn()} eyebrow="Brauðmylsna" title="Titill">
        Innihald
      </Modal>,
    );
    expect(screen.getByText('Brauðmylsna')).toBeInTheDocument();
  });
});
