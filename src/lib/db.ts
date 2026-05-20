import Dexie, { type Table } from 'dexie';

export type PlantCategory =
  | 'pepper'
  | 'tomato'
  | 'herb'
  | 'leafy'
  | 'fruit'
  | 'houseplant'
  | 'other';

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
  | 'disease';

export type StartedFrom = 'seed' | 'seedling' | 'clone' | 'purchased';

export interface Grow {
  id: string;
  name: string;
  category: PlantCategory;
  location: string;
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
}

export interface AppMeta {
  key: string;
  value: unknown;
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
