/**
 * HealthTab.tsx — presentational behaviour:
 *   - empty state when no active plants
 *   - renders a card per active plant
 *   - "Greina mynd" button disabled when no photo exists
 *   - shows score badge when assessments are seeded into db
 * run: npm run test:components
 */
import 'fake-indexeddb/auto';

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, resetDb } from '@/test/utils';
import { db } from '@/lib/db';
import type { Grow, Plant, LogEntry, HarvestEntry } from '@/lib/db';
import { HealthTab } from '@/components/ros/HealthTab';

vi.mock('@/lib/useScrollLock', () => ({ useScrollLock: vi.fn() }));
vi.mock('@/lib/photos', () => ({
  getPhotoBlob: vi.fn().mockResolvedValue(null),
  usePhotoUrl: vi.fn().mockReturnValue(null),
  addPhotoFromFile: vi.fn(),
  deletePhoto: vi.fn(),
}));
vi.mock('@/lib/ros/chat', () => ({
  askRos: vi.fn().mockResolvedValue(''),
  blobToInlineImage: vi.fn(),
}));

const NOW = Date.now();

const GROW: Grow = {
  id: 'grow-1',
  name: 'Testræktun',
  category: 'pepper',
  location: 'Glugginn',
  startDate: NOW - 30 * 86400_000,
  archived: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const ACTIVE_PLANT: Plant = {
  id: 'plant-a',
  growId: 'grow-1',
  variety: 'Jalapeño',
  nickname: 'Græna',
  category: 'pepper',
  startedFrom: 'seed',
  currentPhase: 'vegetative',
  archived: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const ARCHIVED_PLANT: Plant = {
  id: 'plant-b',
  growId: 'grow-1',
  variety: 'Habanero',
  category: 'pepper',
  startedFrom: 'seed',
  currentPhase: 'vegetative',
  archived: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const EMPTY_LOGS: LogEntry[] = [];
const EMPTY_HARVESTS: HarvestEntry[] = [];

describe('HealthTab — tóm staða', () => {
  beforeEach(resetDb);

  it('sýnir leiðbeiningu þegar engar virkar plöntur', () => {
    renderWithProviders(
      <HealthTab
        grow={GROW}
        plants={[ARCHIVED_PLANT]}
        logs={EMPTY_LOGS}
        harvests={EMPTY_HARVESTS}
      />,
    );
    expect(
      screen.getByText(/Engin virk planta í þessari ræktun/i),
    ).toBeInTheDocument();
  });

  it('sýnir leiðbeiningu þegar plantalisti er tómur', () => {
    renderWithProviders(
      <HealthTab
        grow={GROW}
        plants={[]}
        logs={EMPTY_LOGS}
        harvests={EMPTY_HARVESTS}
      />,
    );
    expect(
      screen.getByText(/Engin virk planta í þessari ræktun/i),
    ).toBeInTheDocument();
  });
});

describe('HealthTab — virkar plöntur', () => {
  beforeEach(resetDb);

  it('sýnir kort fyrir virka plöntu', async () => {
    renderWithProviders(
      <HealthTab
        grow={GROW}
        plants={[ACTIVE_PLANT]}
        logs={EMPTY_LOGS}
        harvests={EMPTY_HARVESTS}
      />,
    );
    // plantLabel returns nickname if set
    await waitFor(() =>
      expect(screen.getByText('Græna')).toBeInTheDocument(),
    );
  });

  it('sýnir afbrigðisheiti og fasa á kortið', async () => {
    renderWithProviders(
      <HealthTab
        grow={GROW}
        plants={[ACTIVE_PLANT]}
        logs={EMPTY_LOGS}
        harvests={EMPTY_HARVESTS}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText(/Jalapeño/i)).toBeInTheDocument(),
    );
  });

  it('„Greina mynd" hnappur er óvirkur þegar engin mynd', async () => {
    renderWithProviders(
      <HealthTab
        grow={GROW}
        plants={[ACTIVE_PLANT]}
        logs={EMPTY_LOGS}
        harvests={EMPTY_HARVESTS}
      />,
    );
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Greina mynd/i });
      expect(btn).toBeDisabled();
    });
  });

  it('sýnir einkunnamerkið þegar heilsumat er í db', async () => {
    // Seed an assessment for ACTIVE_PLANT
    await db.rosAssessments.add({
      id: 'assessment-1',
      plantId: ACTIVE_PLANT.id,
      growId: GROW.id,
      photoId: 'photo-1',
      photoTakenAt: NOW - 3600_000,
      score: 8,
      text: 'Heilsa: 8/10 — Góð\nPlanta lítur vel út.\n→ Haltu áfram.',
      createdAt: NOW - 3600_000,
    });

    renderWithProviders(
      <HealthTab
        grow={GROW}
        plants={[ACTIVE_PLANT]}
        logs={EMPTY_LOGS}
        harvests={EMPTY_HARVESTS}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText('8/10')).toBeInTheDocument(),
    );
  });

  it('sýnir bara virkar plöntur (ekki geymslusettar)', async () => {
    renderWithProviders(
      <HealthTab
        grow={GROW}
        plants={[ACTIVE_PLANT, ARCHIVED_PLANT]}
        logs={EMPTY_LOGS}
        harvests={EMPTY_HARVESTS}
      />,
    );
    await waitFor(() =>
      expect(screen.getByText('Græna')).toBeInTheDocument(),
    );
    // Archived plant should not appear
    expect(screen.queryByText('Habanero')).not.toBeInTheDocument();
  });
});
