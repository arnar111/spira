import Dexie, { type Table } from 'dexie';

export type PlantCategory =
  | 'pepper'
  | 'tomato'
  | 'strawberry'
  | 'potato'
  | 'herb'
  | 'leafy'
  | 'fruit'
  | 'houseplant'
  | 'other';

/** Where a grow lives — drives indoor (LED) vs outdoor (season/frost) advice. */
export type GrowEnvironment = 'indoor' | 'outdoor';

export type GrowPhase =
  | 'planning'
  | 'germinating'
  | 'seedling'
  | 'vegetative'
  | 'flowering'
  | 'fruiting'
  | 'ripening'
  | 'harvest'
  | 'overwintering'
  | 'dormant'
  | 'finished';

export type LogType =
  | 'water'
  | 'feed'
  | 'photo'
  | 'note'
  | 'phase_change'
  | 'pollinate'
  | 'prune'
  | 'top'
  | 'transplant'
  | 'environment'
  | 'harvest'
  | 'pest'
  | 'disease'
  | 'maintenance';

export type StartedFrom = 'seed' | 'seedling' | 'clone' | 'purchased';

export interface Grow {
  id: string;
  name: string;
  category: PlantCategory;
  location: string;
  /** Structured location category — Window / Tent / Shower / DIY / Garden */
  locationKey?: string;
  /** Indoor (LED-driven) vs outdoor (season/frost-driven). Defaults to indoor. */
  environment?: GrowEnvironment;
  startDate: number;
  endDate?: number;
  fixture?: string;
  spaceWidthCm?: number;
  spaceDepthCm?: number;
  spaceHeightCm?: number;
  targetTempC?: number;
  lightOnHours?: number;
  notes?: string;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Plant {
  id: string;
  growId: string;
  varietyId?: string;
  variety: string;
  nickname?: string;
  category: PlantCategory;
  startedFrom: StartedFrom;
  sowDate?: number;
  germinatedDate?: number;
  transplantDate?: number;
  currentPhase: GrowPhase;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface LogEntry {
  id: string;
  growId: string;
  plantId?: string;
  timestamp: number;
  type: LogType;
  note?: string;
  data?: Record<string, unknown>;
  photoId?: string;
}

export interface PhotoBlob {
  id: string;
  plantId?: string;
  growId: string;
  blob: Blob;
  width?: number;
  height?: number;
  takenAt: number;
}

export interface EnvironmentSample {
  id: string;
  growId: string;
  timestamp: number;
  tempC?: number;
  humidityPct?: number;
  lightHours?: number;
}

export interface HarvestEntry {
  id: string;
  growId: string;
  plantId: string;
  timestamp: number;
  weightG: number;
  podCount?: number;
  note?: string;
}

export interface VarietyPreset {
  id: string;
  commonName: string;
  scientificName?: string;
  category: PlantCategory;
  shu?: number;
  flavor?: string;
  origin?: string;
  daysToGerminate?: [number, number];
  daysToHarvest?: [number, number];
  notes?: string;
  isBuiltIn: boolean;
  motherSpecies?: string;
  color?: string;
  suitableLocations?: string[];
  matureHeightCm?: number;
}

export interface AppMeta {
  key: string;
  value: unknown;
}

export interface RosMessage {
  id: string;
  growId: string;
  role: 'user' | 'ros';
  content: string;
  timestamp: number;
  photoIds?: string[]; // local photo ids attached to a chat turn (vision)
  pending?: boolean; // optimistic UI flag
}

/**
 * Rós's photo health assessment for a single plant ("Heilsa" tab).
 *
 * As of db v5 these ACCUMULATE: keyed by a unique `id` (newId), with `plantId`
 * indexed, so every run is kept and the UI can show a score trend over time.
 * (Pre-v5 the table was keyed by plantId and a re-run overwrote the prior one.)
 * Device-local like photos/rosMessages: NOT part of the sync snapshot
 * (image-derived, never leaves the device beyond the one vision call).
 */
export interface RosAssessment {
  /** Primary key (newId) — every assessment is kept (history). */
  id: string;
  /** Indexed — which plant this assessment is for. */
  plantId: string;
  growId: string;
  /** The photo that was analyzed. */
  photoId: string;
  /** takenAt of that photo — lets the UI flag when a newer photo has arrived. */
  photoTakenAt: number;
  /** Parsed 0–10 health score, or null when none could be read from the reply. */
  score: number | null;
  /** Full Markdown assessment text from Rós. */
  text: string;
  /** When the analysis was run. */
  createdAt: number;
}

/**
 * Talning aldina/blóma/klasa á plöntu — niðurstaða úr myndtalningu Rósar eða
 * handvirkri talningu. Notuð sem `manualCount` í uppskerumati (`ros/yield.ts`).
 * Staðbundin eins og photos/rosAssessments: EKKI hluti af sync-snapshot
 * (myndafleidd/handvirk talning sem aldrei þarf að ferðast af tækinu).
 */
export interface RosYieldCheck {
  /** Aðallykill (newId). */
  id: string;
  /** Indexuð — hvaða plöntu talningin á við. */
  plantId: string;
  /** Indexuð — ræktunin (fyrir per-grow live-queries). */
  growId: string;
  /** Myndin sem var talin (ef talning kom af mynd). */
  photoId?: string;
  /** Fjöldi talinna eininga. */
  count: number;
  /** Hvað var talið. */
  kind: 'aldin' | 'blóm' | 'klasar';
  /** Hvaðan talningin kom. */
  source: 'mynd' | 'handvirkt';
  /** Hvenær talningin var gerð. */
  createdAt: number;
}

/**
 * Vikuskýrsla Rósar — AI-samantekt yfir allar ræktanir á tilteknu tímabili.
 * Staðbundin eins og photos/rosMessages/rosAssessments: EKKI hluti af
 * sync-snapshot (LLM-afurð sem má alltaf búa til aftur).
 */
export interface RosReport {
  id: string;
  /** Hvenær skýrslan var gerð. */
  createdAt: number;
  /** Tímabil skýrslunnar í dögum (t.d. 7 fyrir vikuskýrslu). */
  periodDays: number;
  /** Markdown texti skýrslunnar frá Rós. */
  text: string;
  /** Hvaða líkan svaraði (ef vitað). */
  model?: string;
}

class SpiraDB extends Dexie {
  grows!: Table<Grow, string>;
  plants!: Table<Plant, string>;
  logs!: Table<LogEntry, string>;
  photos!: Table<PhotoBlob, string>;
  environment!: Table<EnvironmentSample, string>;
  harvests!: Table<HarvestEntry, string>;
  varieties!: Table<VarietyPreset, string>;
  meta!: Table<AppMeta, string>;
  rosMessages!: Table<RosMessage, string>;
  rosAssessments!: Table<RosAssessment, string>;
  rosReports!: Table<RosReport, string>;
  rosYieldChecks!: Table<RosYieldCheck, string>;

  constructor() {
    super('spira');
    this.version(1).stores({
      grows: 'id, name, category, startDate, archived',
      plants: 'id, growId, variety, currentPhase, archived',
      logs: 'id, growId, plantId, timestamp, type',
      photos: 'id, plantId, growId, takenAt',
      environment: 'id, growId, timestamp',
      harvests: 'id, growId, plantId, timestamp',
      varieties: 'id, commonName, category, isBuiltIn',
      meta: 'key',
    });
    this.version(2).stores({
      rosMessages: 'id, growId, timestamp',
    });
    // Local-only health assessments (not synced). Keyed by plantId so a re-run
    // overwrites the prior result; growId is indexed for per-grow live queries.
    this.version(3).stores({
      rosAssessments: 'plantId, growId',
    });
    // Vikuskýrslur Rósar (staðbundnar, ekki syncaðar) — raðað eftir createdAt.
    this.version(4).stores({
      rosReports: 'id, createdAt',
    });
    // v5 (3.4): heilsumöt eiga að SAFNAST upp — endurlyklað úr `plantId` í `id`.
    // Dexie styður EKKI að breyta aðallykli í stað ("Not yet support for changing
    // primary key"); rétta leiðin er að EYÐA töflunni í einni útgáfu og endurgera
    // hana með nýja lyklinum í þeirri næstu. rosAssessments er staðbundið og
    // myndafleitt (endurgeranlegt), svo töpuð eldri möt á þessari leið eru í lagi.
    // (Athugið: notendur sem þegar voru komnir á v5 með `id`-lyklinum halda sínum
    // gögnum — Dexie keyrir aðeins útgáfur > núverandi, svo þessi eyðing keyrir
    // bara fyrir DB sem var á v3/v4.)
    this.version(5).stores({
      rosAssessments: null,
    });
    // v6: rosAssessments endurgerð með `id` sem aðallykli (+ plantId/growId index)
    // svo hvert mat geymist (saga/þróun) í stað þess að yfirskrifast.
    this.version(6).stores({
      rosAssessments: 'id, plantId, growId',
    });
    // v7 (4.1): talningar aldina/blóma/klasa fyrir uppskerumat Rósar. Staðbundnar
    // eins og rosAssessments — EKKI í sync-snapshot (myndafleidd/handvirk talning).
    this.version(7).stores({
      rosYieldChecks: 'id, plantId, growId',
    });
  }
}

export const db = new SpiraDB();

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getOnboardingComplete(): Promise<boolean> {
  const row = await db.meta.get('onboardingComplete');
  return row?.value === true;
}

export async function setOnboardingComplete(value: boolean): Promise<void> {
  await db.meta.put({ key: 'onboardingComplete', value });
}
