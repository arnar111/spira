/**
 * LogComposer — tveggja skrefa skráningarflæði (5.x):
 *   - skref 1: tegundaval í hópum (allar 13 tegundir sem reitir)
 *   - skref 2: einbeitt form — plöntuflögur, þreparetir, „Meira"-felling
 *   - defaultType/existing stökkva beint í formið
 *   - submit skrifar í db.logs (add) / uppfærir með put() í breytingarham
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

describe('LogComposer — skref 1: tegundaval', () => {
  beforeEach(resetDb);

  it('sýnir daglegu tegundirnar: Vökva, Næring, Mynd, Nóta', () => {
    renderComposer();
    expect(screen.getByRole('button', { name: /Vökva/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Næring/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mynd/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nóta/i })).toBeInTheDocument();
  });

  it('sýnir líka hinar tegundirnar sem reiti: Umhverfi, Frjóvgun, Klippt', () => {
    renderComposer();
    expect(screen.getByRole('button', { name: /Umhverfi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Frjóvgun/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Klippt/i })).toBeInTheDocument();
  });

  it('sýnir hópamerkin', () => {
    renderComposer();
    expect(screen.getByText('Daglegt')).toBeInTheDocument();
    expect(screen.getByText('Umhirða')).toBeInTheDocument();
    expect(screen.getByText('Mælingar')).toBeInTheDocument();
    expect(screen.getByText('Vandamál')).toBeInTheDocument();
  });

  it('formreitir (Vista, planta) birtast EKKI fyrr en tegund er valin', () => {
    renderComposer();
    expect(screen.queryByRole('button', { name: /Vista/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rauða' })).not.toBeInTheDocument();
  });

  it('val á tegund opnar formið með reitum hennar', async () => {
    const user = userEvent.setup();
    renderComposer();
    await user.click(screen.getByRole('button', { name: /Vökva/i }));
    expect(await screen.findByPlaceholderText(/t.d. 200/i)).toBeInTheDocument(); // amountMl
    expect(screen.getByRole('button', { name: /Vista/i })).toBeInTheDocument();
  });
});

describe('LogComposer — skref 2: form eftir tegund', () => {
  beforeEach(resetDb);

  it('defaultType stekkur beint í formið (water: Magn sjáanlegt)', () => {
    renderComposer({ defaultType: 'water' });
    expect(screen.getByPlaceholderText(/t.d. 200/i)).toBeInTheDocument();
  });

  it('sýnir plöntuflögur: „Öll ræktunin" og plöntuna', () => {
    renderComposer({ defaultType: 'water' });
    expect(screen.getByRole('button', { name: 'Öll ræktunin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rauða' })).toBeInTheDocument();
  });

  it('water: pH er ítarlegri reitur — falinn þar til „Meira" er opnað', async () => {
    const user = userEvent.setup();
    renderComposer({ defaultType: 'water' });
    expect(screen.queryByPlaceholderText(/t.d. 6.2/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Meira/i }));
    expect(await screen.findByPlaceholderText(/t.d. 6.2/i)).toBeInTheDocument();
  });

  it('þrepahnappur eykur Magn um skrefið (50 ml)', async () => {
    const user = userEvent.setup();
    renderComposer({ defaultType: 'water' });
    await user.click(screen.getByRole('button', { name: 'Magn — auka' }));
    const amountInput = screen.getByPlaceholderText(/t.d. 200/i) as HTMLInputElement;
    expect(amountInput.value).toBe('50');
    await user.click(screen.getByRole('button', { name: 'Magn — auka' }));
    expect(amountInput.value).toBe('100');
  });

  it('til baka-hnappur fer aftur í tegundaval og skipti hreinsar reiti', async () => {
    const user = userEvent.setup();
    renderComposer({ defaultType: 'water' });
    expect(screen.getByPlaceholderText(/t.d. 200/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Velja aðra tegund' }));
    await user.click(await screen.findByRole('button', { name: /Nóta/i }));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/t.d. 200/i)).not.toBeInTheDocument(),
    );
  });

  it('environment: Hiti, Raki og Ljóstími', async () => {
    const user = userEvent.setup();
    renderComposer({ defaultType: 'water' });
    await user.click(screen.getByRole('button', { name: 'Velja aðra tegund' }));
    await user.click(await screen.findByRole('button', { name: /Umhverfi/i }));
    expect(await screen.findByPlaceholderText(/t.d. 24/i)).toBeInTheDocument(); // tempC
    expect(screen.getByPlaceholderText(/t.d. 60/i)).toBeInTheDocument(); // humidity
    expect(screen.getByPlaceholderText(/t.d. 18/i)).toBeInTheDocument(); // lightHours
  });

  it('pollinate: Aðferð sem flögur (Pensill o.fl.)', async () => {
    renderComposer({ defaultType: 'pollinate' });
    expect(await screen.findByRole('button', { name: 'Pensill' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hristing' })).toBeInTheDocument();
  });
});

describe('LogComposer — Vista (submit) — ný skráning', () => {
  beforeEach(resetDb);

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

  it('tengir plantId þegar plöntuflaga er valin', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderComposer({ defaultType: 'note', onClose });

    await user.click(screen.getByRole('button', { name: 'Rauða' }));

    await user.click(screen.getByRole('button', { name: /Vista/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const logs = await db.logs.toArray();
    expect(logs[0].plantId).toBe('plant-1');
  });

  it('defaultPlantId forvelur plöntuna', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderComposer({ defaultType: 'water', defaultPlantId: 'plant-1', onClose });

    await user.click(screen.getByRole('button', { name: /Vista/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const logs = await db.logs.toArray();
    expect(logs[0].plantId).toBe('plant-1');
  });

  it('hætta við lokar án þess að skrifa', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderComposer({ defaultType: 'water', onClose });

    await user.click(screen.getByRole('button', { name: /Hætta við/i }));
    expect(onClose).toHaveBeenCalledOnce();
    const logs = await db.logs.toArray();
    expect(logs).toHaveLength(0);
  });
});

describe('LogComposer — „sama og síðast"', () => {
  beforeEach(resetDb);

  it('sýnir síðustu gildi og „Nota" forfyllir formið', async () => {
    await db.logs.add({
      id: 'log-prev',
      growId: GROW_ID,
      timestamp: Date.now() - 24 * 60 * 60 * 1000,
      type: 'water',
      data: { amountMl: 250, ph: 6.4 },
    });
    const user = userEvent.setup();
    renderComposer({ defaultType: 'water' });

    expect(await screen.findByText(/Síðast/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nota' }));

    const amountInput = screen.getByPlaceholderText(/t.d. 200/i) as HTMLInputElement;
    expect(amountInput.value).toBe('250');
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

  it('forfyllir water-reitinn amountMl og opnar „Meira" fyrir pH-gildið', async () => {
    await db.logs.add(EXISTING_ENTRY);
    renderComposer({ existing: EXISTING_ENTRY });
    const amountInput = screen.getByPlaceholderText(/t.d. 200/i) as HTMLInputElement;
    expect(amountInput.value).toBe('150');
    // pH er ítarlegri reitur en ber gildi — fellingin á að vera opin.
    const phInput = screen.getByPlaceholderText(/t.d. 6.2/i) as HTMLInputElement;
    expect(phInput.value).toBe('6.1');
  });

  it('sýnir ekki til baka-hnappinn í breytingarham', async () => {
    await db.logs.add(EXISTING_ENTRY);
    renderComposer({ existing: EXISTING_ENTRY });
    expect(
      screen.queryByRole('button', { name: 'Velja aðra tegund' }),
    ).not.toBeInTheDocument();
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
