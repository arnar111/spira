/**
 * BackupControls.tsx — download backup, import flow with ConfirmDialog, sign-out.
 * run: npm run test:components
 */
import 'fake-indexeddb/auto';

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, resetDb } from '@/test/utils';
import { BackupControls } from '@/components/BackupControls';

// Scroll lock
vi.mock('@/lib/useScrollLock', () => ({ useScrollLock: vi.fn() }));

// Mock backup module — prevents real download and file read
vi.mock('@/lib/backup', () => ({
  downloadBackup: vi.fn().mockResolvedValue(undefined),
  importBackupFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock sync module — flush + clearLocalData
vi.mock('@/lib/sync', () => ({
  syncManager: {
    flush: vi.fn().mockResolvedValue(undefined),
    isDemo: vi.fn().mockReturnValue(false),
  },
  clearLocalData: vi.fn().mockResolvedValue(undefined),
  exportSnapshot: vi.fn().mockResolvedValue({ version: 1, grows: [], plants: [], logs: [], environment: [], harvests: [], meta: [] }),
  importSnapshot: vi.fn().mockResolvedValue(undefined),
  isSnapshot: vi.fn().mockReturnValue(true),
  migrateSnapshot: vi.fn().mockImplementation((v: unknown) => v),
  installAutoSyncHooks: vi.fn(),
}));

// Mock account module
vi.mock('@/lib/account', () => ({
  clearCurrentAccount: vi.fn(),
  getCurrentAccount: vi.fn().mockReturnValue(null),
  normalizeCode: vi.fn((c: string) => c),
  syncData: vi.fn(),
}));

describe('BackupControls', () => {
  beforeEach(resetDb);

  it('sýnir „Sækja afrit" hnapp', () => {
    renderWithProviders(<BackupControls onSignOut={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Sækja afrit/i })).toBeInTheDocument();
  });

  it('sýnir „Hlaða inn afriti" hnapp', () => {
    renderWithProviders(<BackupControls onSignOut={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Hlaða inn afriti/i })).toBeInTheDocument();
  });

  it('sýnir „Skrá út" hnapp', () => {
    renderWithProviders(<BackupControls onSignOut={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Skrá út/i })).toBeInTheDocument();
  });

  it('kallar downloadBackup þegar „Sækja afrit" er smellt', async () => {
    const { downloadBackup } = await import('@/lib/backup');
    const user = userEvent.setup();
    renderWithProviders(<BackupControls onSignOut={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Sækja afrit/i }));
    await waitFor(() => expect(downloadBackup).toHaveBeenCalledOnce());
  });

  it('opnar staðfestingaglugga þegar skrá er valin', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BackupControls onSignOut={vi.fn()} />);

    // Simulate picking a file by triggering the hidden input directly
    const fileInput = document.querySelector<HTMLInputElement>(
      'input[type="file"][accept*="json"]',
    );
    expect(fileInput).not.toBeNull();

    const file = new File(['{"version":1}'], 'afrit.json', {
      type: 'application/json',
    });
    await user.upload(fileInput!, file);

    // The ConfirmDialog should appear — check for dialog title which ends with "?"
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    // The dialog title is "Hlaða inn afriti?" (with "?")
    expect(screen.getByText('Hlaða inn afriti?')).toBeInTheDocument();
  });

  it('lokar staðfestingaglugga þegar hætt við innflutning', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BackupControls onSignOut={vi.fn()} />);

    const fileInput = document.querySelector<HTMLInputElement>(
      'input[type="file"][accept*="json"]',
    );
    const file = new File(['{}'], 'afrit.json', { type: 'application/json' });
    await user.upload(fileInput!, file);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    // Click cancel
    await user.click(screen.getByRole('button', { name: /Hætta við/i }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('opnar útskráningarglugga þegar „Skrá út" er smellt', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BackupControls onSignOut={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Skrá út/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText(/Skrá út\?/i)).toBeInTheDocument();
  });

  it('kallar onSignOut eftir staðfesta útskráningu', async () => {
    const { clearLocalData } = await import('@/lib/sync');
    const { clearCurrentAccount } = await import('@/lib/account');
    const onSignOut = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<BackupControls onSignOut={onSignOut} />);

    await user.click(screen.getByRole('button', { name: /Skrá út/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    // Find and click the destructive "Skrá út" confirm button inside the dialog
    const confirmButtons = screen.getAllByRole('button', { name: /Skrá út/i });
    // The one inside the dialog is the confirm action
    const confirmBtn = confirmButtons[confirmButtons.length - 1];
    await user.click(confirmBtn);

    await waitFor(() => expect(onSignOut).toHaveBeenCalledOnce());
    expect(clearLocalData).toHaveBeenCalled();
    expect(clearCurrentAccount).toHaveBeenCalled();
  });
});
