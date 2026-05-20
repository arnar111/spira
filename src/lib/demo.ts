import { db, newId } from './db';
import { BUILT_IN_VARIETIES } from './varieties';
import { clearLocalData } from './sync';

export const DEMO_CODE = '123';
export const DEMO_NAME = 'Demo Garðyrkjari';

const DAY_MS = 24 * 60 * 60 * 1000;

interface DemoPlant {
  varietyId: string;
  nickname?: string;
  daysAgoSown: number;
  phase: 'planning' | 'germinating' | 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'ripening' | 'harvest';
}

interface DemoGrow {
  name: string;
  location: string;
  locationKey: 'window' | 'tent' | 'shower' | 'diy';
  startedDaysAgo: number;
  spaceWidthCm: number;
  spaceDepthCm: number;
  spaceHeightCm: number;
  targetTempC: number;
  fixture: string;
  notes?: string;
  plants: DemoPlant[];
}

const GROWS: DemoGrow[] = [
  {
    name: 'Tjald-piparar 2026',
    location: 'Ræktunartjald — bílskúr',
    locationKey: 'tent',
    startedDaysAgo: 102,
    spaceWidthCm: 120,
    spaceDepthCm: 120,
    spaceHeightCm: 200,
    targetTempC: 26,
    fixture: 'Mars Hydro TSW2000 300W',
    notes: 'Aðal-tjaldið — superhots og keppnis-afbrigði.',
    plants: [
      { varietyId: 'pepper-carolina-reaper', nickname: 'Sláttur', daysAgoSown: 102, phase: 'fruiting' },
      { varietyId: 'pepper-7-pot-primo', nickname: 'Prímó-1', daysAgoSown: 100, phase: 'fruiting' },
      { varietyId: 'pepper-scorpion-moruga', nickname: 'Moruga', daysAgoSown: 98, phase: 'flowering' },
      { varietyId: 'pepper-bhut-jolokia-chocolate', nickname: 'Súkku', daysAgoSown: 95, phase: 'flowering' },
      { varietyId: 'pepper-7-pot-douglah', daysAgoSown: 95, phase: 'flowering' },
      { varietyId: 'pepper-reaper-yellow', daysAgoSown: 93, phase: 'vegetative' },
    ],
  },
  {
    name: 'Sturtu-piparar',
    location: 'Sturtuklefi efri hæð',
    locationKey: 'shower',
    startedDaysAgo: 64,
    spaceWidthCm: 80,
    spaceDepthCm: 80,
    spaceHeightCm: 190,
    targetTempC: 24,
    fixture: 'Lumii SwitchBlade 150W',
    notes: 'Habanero litaprufa — sex afbrigði í einum stað.',
    plants: [
      { varietyId: 'pepper-habanero-helios', nickname: 'Helios', daysAgoSown: 64, phase: 'flowering' },
      { varietyId: 'pepper-habanero-orange', daysAgoSown: 64, phase: 'flowering' },
      { varietyId: 'pepper-habanero-chocolate', daysAgoSown: 60, phase: 'vegetative' },
      { varietyId: 'pepper-habanero-peach', daysAgoSown: 58, phase: 'vegetative' },
      { varietyId: 'pepper-habanero-mustard', daysAgoSown: 58, phase: 'vegetative' },
    ],
  },
  {
    name: 'Glugga-piparar',
    location: 'Suðurgluggi í eldhúsi',
    locationKey: 'window',
    startedDaysAgo: 28,
    spaceWidthCm: 40,
    spaceDepthCm: 25,
    spaceHeightCm: 80,
    targetTempC: 21,
    fixture: 'Dagsbirta + plöntuljós',
    notes: 'Smáar afkastamiklar plöntur við glugga.',
    plants: [
      { varietyId: 'pepper-aji-charapita', nickname: 'Charapita', daysAgoSown: 28, phase: 'seedling' },
      { varietyId: 'pepper-shishito', daysAgoSown: 28, phase: 'seedling' },
      { varietyId: 'pepper-thai', daysAgoSown: 24, phase: 'seedling' },
      { varietyId: 'pepper-padron', daysAgoSown: 24, phase: 'seedling' },
    ],
  },
  {
    name: 'DIY skápur',
    location: 'Heimatilbúinn skápur í bílskúr',
    locationKey: 'diy',
    startedDaysAgo: 8,
    spaceWidthCm: 60,
    spaceDepthCm: 60,
    spaceHeightCm: 150,
    targetTempC: 22,
    fixture: 'Lumatek Attis Pro 200W',
    notes: 'Tilrauna-skápur — nýjar tegundir til prufu.',
    plants: [
      { varietyId: 'pepper-aji-amarillo', daysAgoSown: 8, phase: 'germinating' },
      { varietyId: 'pepper-scotch-bonnet-chocolate', daysAgoSown: 8, phase: 'germinating' },
      { varietyId: 'pepper-bhut-peach', daysAgoSown: 6, phase: 'germinating' },
    ],
  },
];

const LOG_NOTES = [
  'Vökva — 200ml á plöntu, pH 6.2',
  'Næring: CalMag + Bloom A/B (EC 1.6)',
  'Toppaði aðalstöngul fyrir betri runnavöxt',
  'Engin merki um pestir — heilbrigð blöð',
  'Fyrstu blómin koma fram',
  'Frjóvgun með hendi — pensill í gegnum blómin',
  'Vatns-stress prófun — léttara magn í dag',
  'Lét þorna á milli vökva — rótarþróun góð',
  'Aukin loftrás — nýr ventíll uppi',
  'Hraðvöxtur — 4cm hækkun á viku',
];

function pickNote(seed: number): string {
  return LOG_NOTES[seed % LOG_NOTES.length];
}

/**
 * Wipe local data and replace it with a curated ghost dataset
 * showcasing all major Spíra features.
 */
export async function seedDemoData(): Promise<void> {
  await clearLocalData();
  const now = Date.now();

  for (const g of GROWS) {
    const growId = newId();
    const startDate = now - g.startedDaysAgo * DAY_MS;
    await db.grows.add({
      id: growId,
      name: g.name,
      category: 'pepper',
      location: g.location,
      locationKey: g.locationKey,
      startDate,
      fixture: g.fixture,
      spaceWidthCm: g.spaceWidthCm,
      spaceDepthCm: g.spaceDepthCm,
      spaceHeightCm: g.spaceHeightCm,
      targetTempC: g.targetTempC,
      lightOnHours: 18,
      notes: g.notes,
      archived: false,
      createdAt: startDate,
      updatedAt: now,
    });

    for (let i = 0; i < g.plants.length; i++) {
      const p = g.plants[i];
      const variety = BUILT_IN_VARIETIES.find((x) => x.id === p.varietyId);
      if (!variety) continue;
      const plantId = newId();
      const sowDate = now - p.daysAgoSown * DAY_MS;
      const germinatedDate =
        p.phase !== 'planning' && p.phase !== 'germinating'
          ? sowDate + 10 * DAY_MS
          : undefined;
      const transplantDate =
        p.phase === 'vegetative' ||
        p.phase === 'flowering' ||
        p.phase === 'fruiting' ||
        p.phase === 'ripening' ||
        p.phase === 'harvest'
          ? sowDate + 30 * DAY_MS
          : undefined;

      await db.plants.add({
        id: plantId,
        growId,
        varietyId: variety.id,
        variety: variety.commonName,
        nickname: p.nickname,
        category: 'pepper',
        startedFrom: 'seed',
        sowDate,
        germinatedDate,
        transplantDate,
        currentPhase: p.phase,
        archived: false,
        createdAt: sowDate,
        updatedAt: now,
      });

      // Add a few logs per plant
      const logCount = Math.min(8, Math.max(2, Math.floor(p.daysAgoSown / 12)));
      for (let j = 0; j < logCount; j++) {
        const ts = sowDate + ((j + 1) * (p.daysAgoSown * DAY_MS)) / (logCount + 1);
        const type = j === 0 ? 'phase_change' : (j % 3 === 0 ? 'feed' : 'water');
        await db.logs.add({
          id: newId(),
          growId,
          plantId,
          timestamp: ts,
          type,
          note: pickNote(i * 7 + j * 3),
        });
      }
    }

    // Environment samples for the grow — 14 days of readings
    const samples = 14;
    for (let i = 0; i < samples; i++) {
      const ts = now - i * DAY_MS - Math.random() * DAY_MS;
      const baseTemp = g.targetTempC;
      await db.environment.add({
        id: newId(),
        growId,
        timestamp: ts,
        tempC: +(baseTemp + (Math.random() * 3 - 1.5)).toFixed(1),
        humidityPct: +(55 + Math.random() * 15).toFixed(0),
        lightHours: 18,
      });
    }

    // Harvest entries — only for tent grow which is far along
    if (g.locationKey === 'tent' && g.startedDaysAgo > 90) {
      const podPlants = await db.plants.where('growId').equals(growId).toArray();
      const fruiters = podPlants.filter((p) =>
        ['fruiting', 'ripening', 'harvest'].includes(p.currentPhase),
      );
      for (const p of fruiters) {
        for (let k = 0; k < 2; k++) {
          await db.harvests.add({
            id: newId(),
            growId,
            plantId: p.id,
            timestamp: now - (k + 1) * 5 * DAY_MS,
            weightG: +(8 + Math.random() * 18).toFixed(1),
            podCount: 3 + Math.floor(Math.random() * 6),
            note: k === 0 ? 'Fyrsta tínsla' : 'Önnur tínsla',
          });
        }
      }
    }
  }

  await db.meta.put({ key: 'onboardingComplete', value: true });
}
