/**
 * ConfirmDialog.tsx — title, body, confirm/cancel callbacks, destructive tone.
 * run: npm run test:components
 */
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

vi.mock('@/lib/useScrollLock', () => ({ useScrollLock: vi.fn() }));

describe('ConfirmDialog', () => {
  it('sýnir titil og body þegar open=true', () => {
    renderWithProviders(
      <ConfirmDialog
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Eyða skráningu?"
        body="Þetta er óafturkræft."
        confirmLabel="Eyða"
      />,
    );
    expect(screen.getByText('Eyða skráningu?')).toBeInTheDocument();
    expect(screen.getByText('Þetta er óafturkræft.')).toBeInTheDocument();
  });

  it('felur innihald þegar open=false', () => {
    renderWithProviders(
      <ConfirmDialog
        open={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Eyða?"
        confirmLabel="Eyða"
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('kallar onConfirm og onClose þegar staðfest er', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Eyða?"
        confirmLabel="Eyða"
      />,
    );
    await user.click(screen.getByRole('button', { name: /Eyða/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('kallar aðeins onClose þegar hætt við', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Eyða?"
        confirmLabel="Eyða"
      />,
    );
    await user.click(screen.getByRole('button', { name: /Hætta við/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('notar sérstakan cancelLabel þegar gefinn', () => {
    renderWithProviders(
      <ConfirmDialog
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Ganga af stað?"
        confirmLabel="Já"
        cancelLabel="Nei"
      />,
    );
    expect(screen.getByRole('button', { name: /Nei/i })).toBeInTheDocument();
  });

  it('lokar með Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Eyða?"
        confirmLabel="Eyða"
      />,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
