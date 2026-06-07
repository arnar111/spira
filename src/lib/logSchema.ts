import type { LogType } from '@/lib/db';

export type LogFieldKind = 'number' | 'text' | 'select';

export interface LogField {
  key: string;
  label: string;
  unit?: string;
  kind: LogFieldKind;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

/**
 * Structured fields per log type, stored into LogEntry.data.
 * Types without structured fields are omitted (freeform note only).
 */
export const LOG_FIELDS: Partial<Record<LogType, LogField[]>> = {
  water: [
    { key: 'amountMl', label: 'Magn', unit: 'ml', kind: 'number', min: 0, step: 50, placeholder: 't.d. 200' },
    { key: 'ph', label: 'pH', kind: 'number', min: 3, max: 9, step: 0.1, placeholder: 't.d. 6.2' },
    { key: 'ec', label: 'EC', unit: 'mS/cm', kind: 'number', min: 0, step: 0.1, placeholder: 't.d. 1.4' },
    { key: 'runoffMl', label: 'Frárennsli', unit: 'ml', kind: 'number', min: 0, step: 50 },
  ],
  feed: [
    { key: 'nutrient', label: 'Áburður', kind: 'text', placeholder: 't.d. CalMag + Bloom A/B' },
    { key: 'doseMlPerL', label: 'Skammtur', unit: 'ml/L', kind: 'number', min: 0, step: 0.5, placeholder: 't.d. 2' },
    { key: 'ec', label: 'EC', unit: 'mS/cm', kind: 'number', min: 0, step: 0.1, placeholder: 't.d. 1.6' },
    { key: 'ph', label: 'pH', kind: 'number', min: 3, max: 9, step: 0.1, placeholder: 't.d. 6.0' },
  ],
  environment: [
    { key: 'tempC', label: 'Hiti', unit: '°C', kind: 'number', step: 0.5, placeholder: 't.d. 24' },
    { key: 'humidityPct', label: 'Raki', unit: '%', kind: 'number', min: 0, max: 100, step: 1, placeholder: 't.d. 60' },
    { key: 'lightHours', label: 'Ljóstími', unit: 'klst', kind: 'number', min: 0, max: 24, step: 0.5, placeholder: 't.d. 18' },
  ],
  harvest: [
    { key: 'weightG', label: 'Þyngd', unit: 'g', kind: 'number', min: 0, step: 1, placeholder: 't.d. 120' },
    { key: 'podCount', label: 'Fjöldi', unit: 'stk', kind: 'number', min: 0, step: 1, placeholder: 't.d. 8' },
  ],
  pollinate: [
    {
      key: 'method',
      label: 'Aðferð',
      kind: 'select',
      options: [
        { value: 'pensill', label: 'Pensill' },
        { value: 'rafmagnstannbursti', label: 'Rafmagnstannbursti' },
        { value: 'hristing', label: 'Hristing' },
      ],
    },
  ],
  prune: [
    { key: 'detail', label: 'Hvað var gert', kind: 'text', placeholder: 't.d. neðri blöð fjarlægð' },
  ],
  top: [
    { key: 'detail', label: 'Hvað var gert', kind: 'text', placeholder: 't.d. toppað fyrir ofan 5. hnút' },
  ],
  transplant: [
    { key: 'detail', label: 'Smáatriði', kind: 'text', placeholder: 't.d. í 7L pott' },
  ],
  maintenance: [
    {
      key: 'task',
      label: 'Verk',
      kind: 'select',
      options: [
        { value: 'clean_tank', label: 'Hreinsa vatnstank' },
        { value: 'inspect_wicks', label: 'Skoða kveiki' },
        { value: 'replace_wicks', label: 'Skipta um kveiki' },
        { value: 'clean_led', label: 'Hreinsa LED' },
        { value: 'thin_seedlings', label: 'Grisja kímplöntur' },
        { value: 'replace_lingot', label: 'Skipta um Lingot' },
      ],
    },
  ],
  pest: [
    {
      key: 'kind',
      label: 'Tegund',
      kind: 'select',
      options: [
        { value: 'lus', label: 'Lús' },
        { value: 'spunamitill', label: 'Spunamítill' },
        { value: 'hvitfluga', label: 'Hvítfluga' },
        { value: 'annad', label: 'Annað' },
      ],
    },
    {
      key: 'severity',
      label: 'Umfang',
      kind: 'select',
      options: [
        { value: 'litil', label: 'Lítið' },
        { value: 'midlungs', label: 'Miðlungs' },
        { value: 'mikil', label: 'Mikið' },
      ],
    },
    { key: 'detail', label: 'Nánar', kind: 'text', placeholder: 't.d. á bakhlið neðri blaða' },
  ],
  disease: [
    {
      key: 'kind',
      label: 'Tegund',
      kind: 'select',
      options: [
        { value: 'gramygla', label: 'Grámygla' },
        { value: 'dunmygla', label: 'Dúnmygla' },
        { value: 'rotarfui', label: 'Rótarfúi' },
        { value: 'blettir', label: 'Blaðblettir' },
        { value: 'annad', label: 'Annað' },
      ],
    },
    {
      key: 'severity',
      label: 'Umfang',
      kind: 'select',
      options: [
        { value: 'litil', label: 'Lítið' },
        { value: 'midlungs', label: 'Miðlungs' },
        { value: 'mikil', label: 'Mikið' },
      ],
    },
    { key: 'detail', label: 'Nánar', kind: 'text', placeholder: 't.d. brúnir blettir með gulum jaðri' },
  ],
  note: [],
  photo: [],
  phase_change: [],
};

/** Lucide icon names referenced by string so this module stays React-free. */
export const LOG_TYPE_META: {
  id: LogType;
  label: string;
  icon: string;
  quick?: boolean;
}[] = [
  { id: 'water', label: 'Vökva', icon: 'Droplet', quick: true },
  { id: 'feed', label: 'Næring', icon: 'Leaf', quick: true },
  { id: 'photo', label: 'Mynd', icon: 'Camera', quick: true },
  { id: 'note', label: 'Nóta', icon: 'StickyNote', quick: true },
  { id: 'environment', label: 'Umhverfi', icon: 'Thermometer' },
  { id: 'pollinate', label: 'Frjóvgun', icon: 'Flame' },
  { id: 'prune', label: 'Klippt', icon: 'Scissors' },
  { id: 'top', label: 'Toppað', icon: 'Sparkles' },
  { id: 'harvest', label: 'Uppskera', icon: 'Sprout' },
  { id: 'transplant', label: 'Umpotta', icon: 'Move' },
  { id: 'maintenance', label: 'Viðhald', icon: 'Wrench' },
  { id: 'pest', label: 'Meindýr', icon: 'Bug' },
  { id: 'disease', label: 'Sjúkdómur', icon: 'ShieldAlert' },
];

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const t = value.trim();
    return t === '' ? undefined : t;
  }
  return undefined;
}

// — Týpuð skráningargögn (4.3) —
// `LogEntry.data` er áfram laust `Record<string, unknown>` í geymslu (snapshot-
// samhæfni), en allir LESTRAR fara gegnum `logData()` sem þvingar gildin
// (tala-eða-tölustrengur → number, strengir snyrtir) í týpað form per gerð.

export interface WaterLogData {
  amountMl?: number;
  ph?: number;
  ec?: number;
  runoffMl?: number;
}

export interface FeedLogData {
  nutrient?: string;
  doseMlPerL?: number;
  ec?: number;
  ph?: number;
}

export interface EnvironmentLogData {
  tempC?: number;
  humidityPct?: number;
  lightHours?: number;
}

export interface HarvestLogData {
  weightG?: number;
  podCount?: number;
}

export interface PollinateLogData {
  method?: string;
}

/** prune / top / transplant — eitt frjálst lýsingarsvið. */
export interface DetailLogData {
  detail?: string;
}

export interface MaintenanceLogData {
  task?: string;
}

/** pest / disease — tegund + umfang + nánar (3.4). */
export interface PestDiseaseLogData {
  kind?: string;
  severity?: string;
  detail?: string;
}

/** note / photo / phase_change bera engin skipulögð svið. */
export type EmptyLogData = Record<string, never>;

export interface LogDataByType {
  water: WaterLogData;
  feed: FeedLogData;
  environment: EnvironmentLogData;
  harvest: HarvestLogData;
  pollinate: PollinateLogData;
  prune: DetailLogData;
  top: DetailLogData;
  transplant: DetailLogData;
  maintenance: MaintenanceLogData;
  pest: PestDiseaseLogData;
  disease: PestDiseaseLogData;
  note: EmptyLogData;
  photo: EmptyLogData;
  phase_change: EmptyLogData;
}

/**
 * Þrengir hrá `LogEntry.data` í týpað form fyrir gerðina — eina leiðin sem
 * lestrar eiga að nota (formatLogData, Rós-vélin, series.ts).
 */
export function logData<T extends LogType>(
  type: T,
  data: Record<string, unknown> | undefined,
): LogDataByType[T] {
  const d = data ?? {};
  switch (type as LogType) {
    case 'water':
      return {
        amountMl: asNumber(d.amountMl),
        ph: asNumber(d.ph),
        ec: asNumber(d.ec),
        runoffMl: asNumber(d.runoffMl),
      } as LogDataByType[T];
    case 'feed':
      return {
        nutrient: asText(d.nutrient),
        doseMlPerL: asNumber(d.doseMlPerL),
        ec: asNumber(d.ec),
        ph: asNumber(d.ph),
      } as LogDataByType[T];
    case 'environment':
      return {
        tempC: asNumber(d.tempC),
        humidityPct: asNumber(d.humidityPct),
        lightHours: asNumber(d.lightHours),
      } as LogDataByType[T];
    case 'harvest':
      return {
        weightG: asNumber(d.weightG),
        podCount: asNumber(d.podCount),
      } as LogDataByType[T];
    case 'pollinate':
      return { method: asText(d.method) } as LogDataByType[T];
    case 'prune':
    case 'top':
    case 'transplant':
      return { detail: asText(d.detail) } as LogDataByType[T];
    case 'maintenance':
      return { task: asText(d.task) } as LogDataByType[T];
    case 'pest':
    case 'disease':
      return {
        kind: asText(d.kind),
        severity: asText(d.severity),
        detail: asText(d.detail),
      } as LogDataByType[T];
    default:
      return {} as LogDataByType[T];
  }
}

/** Trim trailing zeros from a fixed-precision number for compact display. */
function num(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** Íslenskt heiti select-valkosts úr LOG_FIELDS, eða hráa gildið. */
function optionLabel(type: LogType, key: string, value: string): string {
  const opt = LOG_FIELDS[type]
    ?.find((f) => f.key === key)
    ?.options?.find((o) => o.value === value);
  return opt?.label ?? value;
}

/**
 * Compact display chips for a log entry's structured data.
 * Skips empty/undefined values. Les gegnum týpaða `logData()`-lagið (4.3).
 */
export function formatLogData(
  type: LogType,
  data: Record<string, unknown> | undefined,
): string[] {
  if (!data) return [];
  const chips: string[] = [];

  switch (type) {
    case 'water': {
      const d = logData(type, data);
      if (d.amountMl !== undefined) chips.push(`${num(d.amountMl)} ml`);
      if (d.ph !== undefined) chips.push(`pH ${num(d.ph)}`);
      if (d.ec !== undefined) chips.push(`EC ${num(d.ec)}`);
      if (d.runoffMl !== undefined) chips.push(`${num(d.runoffMl)} ml frárennsli`);
      break;
    }
    case 'feed': {
      const d = logData(type, data);
      if (d.nutrient !== undefined) chips.push(d.nutrient);
      if (d.doseMlPerL !== undefined) chips.push(`${num(d.doseMlPerL)} ml/L`);
      if (d.ec !== undefined) chips.push(`EC ${num(d.ec)}`);
      if (d.ph !== undefined) chips.push(`pH ${num(d.ph)}`);
      break;
    }
    case 'environment': {
      const d = logData(type, data);
      if (d.tempC !== undefined) chips.push(`${num(d.tempC)}°C`);
      if (d.humidityPct !== undefined) chips.push(`${num(d.humidityPct)}%`);
      if (d.lightHours !== undefined) chips.push(`${num(d.lightHours)} klst`);
      break;
    }
    case 'harvest': {
      const d = logData(type, data);
      if (d.weightG !== undefined) chips.push(`${num(d.weightG)} g`);
      if (d.podCount !== undefined) chips.push(`${num(d.podCount)} stk`);
      break;
    }
    case 'pollinate': {
      const d = logData(type, data);
      if (d.method !== undefined) chips.push(optionLabel(type, 'method', d.method));
      break;
    }
    case 'prune':
    case 'top':
    case 'transplant': {
      const d = logData(type, data);
      if (d.detail !== undefined) chips.push(d.detail);
      break;
    }
    case 'maintenance': {
      const d = logData(type, data);
      if (d.task !== undefined) chips.push(optionLabel(type, 'task', d.task));
      break;
    }
    case 'pest':
    case 'disease': {
      const d = logData(type, data);
      if (d.kind !== undefined) chips.push(optionLabel(type, 'kind', d.kind));
      if (d.severity !== undefined) chips.push(optionLabel(type, 'severity', d.severity));
      if (d.detail !== undefined) chips.push(d.detail);
      break;
    }
    default:
      break;
  }

  return chips;
}
