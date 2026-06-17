/**
 * LogComposer.tsx — structured log form:
 *   - renders type selector tiles and chips
 *   - switching type shows correct structured fields
 *   - edit mode (existing prop) pre-fills the form
 *   - submitting a new log writes to db.logs
 * run: npm run test:components
 */

// fake-indexeddb MUST be the first import before any db.ts import.
import 'fake-indexeddb/auto';

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, resetDb } from '@/test/utils';
import { db, type LogEntry } from '@/lib/db';
import { LogComposer } from '@/components/LogComposer';

// Mock scroll-lock (touches DOM outside jsdom comfort zone)
vi.mock('@/lib/useScrollLock', () => ({ useScrollLock: vi.fn() }));

// Mock photos module — no blob handling in unit tests
vi.mock('@/lib/photos', () => ({
  addPhotoFromFile: vi.fn().mockResolvedValue('photo-id-1'),
  deletePhoto: vi.fn().mockResolvedValue(undefined),
  usePhotoUrl: vi.fn().mockReturnValue(null),
  getPhotoBlob: vi.fn().mockResolvedValue(null),
}));

// Mock announce — avoid any aria-live side effects
vi.mock('@/lib/announce', () => ({ announce: vi.fn() }));

const GROW_ID = 'grow-abc';
const PLANTS = [
  {
    id: 'plant-1',
    growId: GROW_ID,
    variety: 'Cayenne',
    nickname: 'Rauða',
    category: 'pepper' as const,
    startedFrom: 'seed' as const,
    currentPhase: 'vegetative' as const,
    archived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

function renderComposer(props: Partial<Parameters<typeof LogComposer>[0]> = {}) {
  return renderWithProviders(
    <LogComposer
      growId={GROW_ID}
      plants={PLANTS}
      open={true}
      onClose={vi.fn()}
      {...props}
    />,
  );
}

describe('LogComposer — tegundaval (quick tiles)', () => {
  beforeEach(resetDb);

  it('sýnir quick-tile-hnappa: Vökva, Næring, Mynd, Nóta', () => {
    renderComposer();
    expect(screen.getByRole('button', { name: /Vökva/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Næring/i })).toBeInTheDocument();
    // Use exact tile label — "Bæta við mynd" also contains "mynd" so getAllBy
    const myndButtons = screen.getAllByRole('button', { name: /Mynd/i });
    expect(myndButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Nóta/i })).toBeInTheDocument();
  });

  it('sýnir viðbótarchip-hnappa: Umhverfi, Frjóvgun, Klippt', () => {
    renderComposer();
    expect(screen.getByRole('button', { name: /Umhverfi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Frjóvgun/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Klippt/i })).toBeInTheDocument();
  });

  it('sýnir plöntuvalsreitinn með „Öll ræktunin" og plöntunni', () => {
    renderComposer();
    expect(screen.getByRole('option', { name: 'Öll ræktunin' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Rauða' })).toBeInTheDocument();
  });
});

describe('LogComposer — skipulögð svið eftir tegund', () => {
  beforeEach(resetDb);

  it('sýnir Magn og pH reitina þegar water er valin', () => {
    renderComposer({ defaultType: 'water' });
    expect(screen.getByPlaceholderText(/t.d. 200/i)).toBeInTheDocument(); // amountMl
    expect(screen.getByPlaceholderText(/t.d. 6.2/i)).toBeInTheDocument(); // ph
  });

  it('sýnir Hiti, Raki og Ljóstíma þegar environment er valin', async () => {
    const user = userEvent.setup();
    renderComposer({ defaultType: 'water' });
    await user.click(screen.getByRole('button', { name: /Umhverfi/i }));
    expect(screen.getByPlaceholderText(/t.d. 24/i)).toBeInTheDocument(); // tempC
    expect(screen.getByPlaceholderText(/t.d. 60/i)).toBeInTheDocument(); // humidity
    expect(screen.getByPlaceholderText(/t.d. 18/i)).toBeInTheDocument(); // lightHours
  });

  it('sýnir Þyngd og Fjöldi reitina þegar harvest er valin', async () => {
    const user = userEvent.setup();
    renderComposer({ defaultType: 'water' });
    await user.click(screen.getByRole('button', { name: /Uppskera/i }));
    expect(screen.getByPlaceholderText(/t.d. 120/i)).toBeInTheDocument(); // weightG
    expect(screen.getByPlaceholderText(/t.d. 8/i)).toBeInTheDocument(); // podCount
  });

  it('sýnir Aðferð select þegar pollinate er valin', async () => {
    const user = userEvent.setup();
    renderComposer({ defaultType: 'water' });
    await user.click(screen.getByRole('button', { name: /Frjóvgun/i }));
    expect(screen.getByRole('option', { name: 'Pensill' })).toBeInTheDocument();
  });

  it('hreinsar skipulögð svið þegar skipt er um tegund', async () => {
    const user = userEvent.setup();
    renderComposer({ defaultType: 'water' });
    // water has amountMl
    expect(screen.getByPlaceholderText(/t.d. 200/i)).toBeInTheDocument();
    // switch to note — no structured fields
    await user.click(screen.getByRole('button', { name: /Nóta/i }));
    expect(screen.queryByPlaceholderText(/t.d. 200/i)).not.toBeInTheDocument();
  });
});

describe('LogComposer — Vista (submit) — ný skráning', () => {
  beforeEach(resetDb);

  it('Vista-hnappur er til staðar og virkur', () => {
    renderComposer();
    expect(screen.getByRole('button', { name: /Vista/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vista/i })).not.toBeDisabled();
  });

  it('skrifar water-skráningu í db.logs', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderComposer({ defaultType: 'water', onClose });

    const amountInput = screen.getByPlaceholderText(/t.d. 200/i);
    await user.clear(amountInput);
    await user.type(amountInput, '300');

    await user.click(screen.getByRole('button', { name: /Vista/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const logs = await db.logs.toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe('water');
    expect(logs[0].growId).toBe(GROW_ID);
    expect(logs[0].data?.amountMl).toBe(300);
  });

  it('skrifar note-skráningu með athugasemd', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderComposer({ defaultType: 'note', onClose });

    const noteArea = screen.getByPlaceholderText(/t.d. blöð heilbrigð/i);
    await user.type(noteArea, 'Lítið eitt gulnar á blöðunum');

    await user.click(screen.getByRole('button', { name: /Vista/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const logs = await db.logs.toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].type).toBe('note');
    expect(logs[0].note).toBe('Lítið eitt gulnar á blöðunum');
  });

  it('tengir plantId þegar planta er valin', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderComposer({ defaultType: 'note', onClose });

    // Select the plant instead of "Öll ræktunin"
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'plant-1');

    await user.click(screen.getByRole('button', { name: /Vista/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const logs = await db.logs.toArray();
    expect(logs[0].plantId).toBe('plant-1');
  });

  it('hætta við lokar án þess að skrifa', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onClose });

    await user.click(screen.getByRole('button', { name: /Hætta við/i }));
    expect(onClose).toHaveBeenCalledOnce();
    const logs = await db.logs.toArray();
    expect(logs).toHaveLength(0);
  });
});

describe('LogComposer — breytingarham (existing prop)', () => {
  beforeEach(resetDb);

  const EXISTING_ENTRY: LogEntry = {
    id: 'log-edit-1',
    growId: GROW_ID,
    plantId: 'plant-1',
    timestamp: Date.now(),
    type: 'water',
    note: 'Upprunalegar athugasemdir',
    data: { amountMl: 150, ph: 6.1 },
  };

  it('sýnir „Breyta viðburði" sem titil', async () => {
    await db.logs.add(EXISTING_ENTRY);
    renderComposer({ existing: EXISTING_ENTRY });
    expect(screen.getByText('Breyta viðburði')).toBeInTheDocument();
  });

  it('forfyllir athugasemdina', async () => {
    await db.logs.add(EXISTING_ENTRY);
    renderComposer({ existing: EXISTING_ENTRY });
    const noteArea = screen.getByPlaceholderText(/t.d. blöð heilbrigð/i);
    expect((noteArea as HTMLTextAreaElement).value).toBe('Upprunalegar athugasemdir');
  });

  it('forfyllir water-reitinn amountMl', async () => {
    await db.logs.add(EXISTING_ENTRY);
    renderComposer({ existing: EXISTING_ENTRY });
    const amountInput = screen.getByPlaceholderText(/t.d. 200/i) as HTMLInputElement;
    expect(amountInput.value).toBe('150');
  });

  it('skrifar uppfærslu með put() þegar vistað', async () => {
    await db.logs.add(EXISTING_ENTRY);
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderComposer({ existing: EXISTING_ENTRY, onClose });

    const noteArea = screen.getByPlaceholderText(/t.d. blöð heilbrigð/i);
    // Use fireEvent directly to set value, bypassing userEvent key-by-key issues
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(noteArea, { target: { value: 'Nytt' } });

    await user.click(screen.getByRole('button', { name: /Vista/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());

    const logs = await db.logs.toArray();
    // still only 1 entry (put/update, not add)
    expect(logs).toHaveLength(1);
    expect(logs[0].note).toBe('Nytt');
  });
});

describe('LogComposer — LogDataChips', () => {
  it('sýnir chips úr water-gögnum', async () => {
    const { LogDataChips } = await import('@/components/LogComposer');
    renderWithProviders(
      <LogDataChips type="water" data={{ amountMl: 250, ph: 6.2 }} />,
    );
    expect(screen.getByText('250 ml')).toBeInTheDocument();
    expect(screen.getByText('pH 6.2')).toBeInTheDocument();
  });

  it('skilar null þegar engin gögn', async () => {
    const { LogDataChips } = await import('@/components/LogComposer');
    const { container } = renderWithProviders(
      <LogDataChips type="note" data={undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
