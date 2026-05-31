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
  note: [],
  photo: [],
  phase_change: [],
  pest: [],
  disease: [],
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

/** Trim trailing zeros from a fixed-precision number for compact display. */
function num(value: number): string {
  return String(Number(value.toFixed(2)));
}

/**
 * Compact display chips for a log entry's structured data.
 * Skips empty/undefined values.
 */
export function formatLogData(
  type: LogType,
  data: Record<string, unknown> | undefined,
): string[] {
  if (!data) return [];
  const chips: string[] = [];

  switch (type) {
    case 'water': {
      const amount = asNumber(data.amountMl);
      if (amount !== undefined) chips.push(`${num(amount)} ml`);
      const ph = asNumber(data.ph);
      if (ph !== undefined) chips.push(`pH ${num(ph)}`);
      const ec = asNumber(data.ec);
      if (ec !== undefined) chips.push(`EC ${num(ec)}`);
      const runoff = asNumber(data.runoffMl);
      if (runoff !== undefined) chips.push(`${num(runoff)} ml frárennsli`);
      break;
    }
    case 'feed': {
      const nutrient = asText(data.nutrient);
      if (nutrient !== undefined) chips.push(nutrient);
      const dose = asNumber(data.doseMlPerL);
      if (dose !== undefined) chips.push(`${num(dose)} ml/L`);
      const ec = asNumber(data.ec);
      if (ec !== undefined) chips.push(`EC ${num(ec)}`);
      const ph = asNumber(data.ph);
      if (ph !== undefined) chips.push(`pH ${num(ph)}`);
      break;
    }
    case 'environment': {
      const temp = asNumber(data.tempC);
      if (temp !== undefined) chips.push(`${num(temp)}°C`);
      const humidity = asNumber(data.humidityPct);
      if (humidity !== undefined) chips.push(`${num(humidity)}%`);
      const light = asNumber(data.lightHours);
      if (light !== undefined) chips.push(`${num(light)} klst`);
      break;
    }
    case 'harvest': {
      const weight = asNumber(data.weightG);
      if (weight !== undefined) chips.push(`${num(weight)} g`);
      const pods = asNumber(data.podCount);
      if (pods !== undefined) chips.push(`${num(pods)} stk`);
      break;
    }
    case 'pollinate': {
      const method = asText(data.method);
      if (method !== undefined) {
        const opt = LOG_FIELDS.pollinate?.[0]?.options?.find((o) => o.value === method);
        chips.push(opt?.label ?? method);
      }
      break;
    }
    case 'prune':
    case 'top':
    case 'transplant': {
      const detail = asText(data.detail);
      if (detail !== undefined) chips.push(detail);
      break;
    }
    default:
      break;
  }

  return chips;
}
