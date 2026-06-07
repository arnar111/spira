import { useLiveQuery } from 'dexie-react-hooks';
import { Droplet, Lightbulb, Sparkles, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pill } from '@/components/ui/Pill';
import { TaskRow } from '@/components/ui/TaskRow';
import { db, type LogEntry, type Plant } from '@/lib/db';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Véritable SMART viðhaldsalmanak — vatnsræktunar-hliðstæðan við <SeasonCard>.
 * Reiknar næstu viðhaldsverk út frá skráningum ræktunarinnar (vökva-/viðhaldslogg)
 * og sýnir fastar staðreyndir um tank og LED-prógramm. Tölur úr Véritable-leiðbeiningum
 * (kafli 3, 5, 8): tankur 2 L, áfylling 7–14 daga eftir plöntuálagi, hreinsun á 14 daga
 * fresti, kveikjaskoðun á 30 daga fresti, kveikjaskipti á 180 daga fresti, fast 16/8 LED.
 */

type Tone = 'due' | 'soon' | 'ok';

const TONE_PILL: Record<Tone, 'cap' | 'cream' | 'moss'> = {
  due: 'cap',
  soon: 'cream',
  ok: 'moss',
};
const TONE_LABEL: Record<Tone, string> = {
  due: 'Tímabært',
  soon: 'Brátt',
  ok: 'Í lagi',
};

interface MaintItem {
  key: string;
  label: string;
  icon: typeof Droplet;
  /** Days since the relevant last event, or null if it has never happened. */
  sinceDays: number | null;
  /** Interval after which the task is due. */
  intervalDays: number;
  /** Human note for the row. */
  note: string;
}

function toneFor(item: MaintItem): Tone {
  if (item.sinceDays === null) return 'due';
  const remaining = item.intervalDays - item.sinceDays;
  if (remaining <= 0) return 'due';
  if (remaining <= Math.max(2, Math.round(item.intervalDays * 0.2))) return 'soon';
  return 'ok';
}

function dueText(item: MaintItem): string {
  if (item.sinceDays === null) return 'Engin skráning enn';
  const remaining = Math.round(item.intervalDays - item.sinceDays);
  if (remaining <= 0) return `${Math.abs(remaining)} d yfir`;
  return `eftir ${remaining} d`;
}

/**
 * Refill rhythm scales with plant load (kafli 3.1). Speglar Rós-vélina
 * (engine.ts, Véritable §b): aldin 7 d, blandað 10 d, kryddjurtir/lauf 14 d.
 */
function refillIntervalDays(hasFruiting: boolean, hasHerbLeafy: boolean): number {
  if (hasFruiting) return hasHerbLeafy ? 10 : 7;
  return 14;
}

function lastEventDays(
  logs: LogEntry[],
  predicate: (l: LogEntry) => boolean,
  now: number,
): number | null {
  let latest = 0;
  for (const l of logs) {
    if (predicate(l) && l.timestamp > latest) latest = l.timestamp;
  }
  if (latest === 0) return null;
  return Math.floor((now - latest) / DAY_MS);
}

export function VeritableCard({
  growId,
  startDate,
  plants,
}: {
  growId: string;
  startDate: number;
  plants: Plant[];
}) {
  const logs = useLiveQuery(
    () => db.logs.where('growId').equals(growId).toArray(),
    [growId],
  );

  if (!logs) return null;
  const now = Date.now();
  const setupDays = Math.floor((now - startDate) / DAY_MS);

  // Sama álagsskipting og Rós-vélin notar fyrir áfyllingarbil.
  const active = plants.filter((p) => !p.archived);
  const hasFruiting = active.some((p) =>
    ['fruit', 'tomato', 'strawberry', 'pepper'].includes(p.category),
  );
  const hasHerbLeafy = active.some(
    (p) => p.category === 'herb' || p.category === 'leafy',
  );

  const maintTask = (task: string) => (l: LogEntry) =>
    l.type === 'maintenance' &&
    (l.data as { task?: string } | undefined)?.task === task;

  const refillSince = lastEventDays(logs, (l) => l.type === 'water', now);
  const cleanSince = lastEventDays(logs, maintTask('clean_tank'), now);
  const inspectSince = lastEventDays(logs, maintTask('inspect_wicks'), now);
  // Kveikjaskipti telja frá uppsetningu ef aldrei hefur verið skipt.
  const replaceSince = lastEventDays(logs, maintTask('replace_wicks'), now);

  const refillInterval = refillIntervalDays(hasFruiting, hasHerbLeafy);

  const items: MaintItem[] = [
    {
      key: 'refill',
      label: 'Næsta áfylling',
      icon: Droplet,
      sinceDays: refillSince,
      intervalDays: refillInterval,
      note: hasFruiting
        ? hasHerbLeafy
          ? 'Blönduð ræktun — fylltu á 7–10 daga fresti'
          : 'Aldinplöntur þyrstar — fylltu á 5–7 daga fresti'
        : 'Kryddjurtir/salat — fylltu á 10–14 daga fresti',
    },
    {
      key: 'clean',
      label: 'Hreinsa tank',
      icon: Sparkles,
      sinceDays: cleanSince,
      intervalDays: 14,
      note: 'Skiptu um vatn á 14 daga fresti — kemur í veg fyrir þörunga og útfellingar',
    },
    {
      key: 'inspect',
      label: 'Skoða kveiki',
      icon: Wrench,
      sinceDays: inspectSince,
      intervalDays: 30,
      note: 'Athugaðu hárpípukveikina mánaðarlega — stíflu, mislitun eða þörunga',
    },
    {
      key: 'replace',
      label: 'Skipta um kveiki',
      icon: Wrench,
      sinceDays: replaceSince ?? setupDays,
      intervalDays: 180,
      note: 'Skiptu um kveiki á u.þ.b. 6 mánaða fresti fyrir bestu vatnsupptöku',
    },
  ];

  // Mest aðkallandi verk efst.
  const ordered = [...items].sort((a, b) => {
    const ra = a.intervalDays - (a.sinceDays ?? a.intervalDays + 1);
    const rb = b.intervalDays - (b.sinceDays ?? b.intervalDays + 1);
    return ra - rb;
  });

  return (
    <Card tone="strong" radius={18} padding={16}>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <Eyebrow>Véritable SMART · viðhald</Eyebrow>
          <div
            className="sp-display"
            style={{ fontSize: 18, color: 'var(--cream-50)', fontWeight: 500 }}
          >
            Vatnsræktun á sjálfstýringu
          </div>
        </div>
        <Pill tone="moss" size="sm">
          <Lightbulb size={10} />
          16/8 LED
        </Pill>
      </div>

      {/* Fastar staðreyndir */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Fact label="Tankur" value="2 L" hint="Hárpípukveikir" />
        <Fact label="LED" value="16 klst" hint="Fast 16/8 prógramm" />
      </div>

      {/* Viðhaldsverk */}
      <div className="flex flex-col gap-2">
        {ordered.map((item) => {
          const tone = toneFor(item);
          const Icon = item.icon;
          return (
            <TaskRow
              key={item.key}
              icon={<Icon size={14} />}
              label={item.label}
              meta={dueText(item)}
              badge={
                <Pill tone={TONE_PILL[tone]} size="sm" className="ml-auto">
                  {TONE_LABEL[tone]}
                </Pill>
              }
              note={item.note}
            />
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-cream-400/60 leading-snug">
        Innbyggt AdaptLight LED keyrir 16 klst sjálfvirkt — engin aukaljós þarf, jafnvel um hávetur.
        Lingot-hylkin gefa næringu í ~12 vikur.
      </p>
    </Card>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl p-2.5 border bg-moss-900/30 border-moss-800/30">
      <Eyebrow>{label}</Eyebrow>
      <div className="sp-display text-cream-50" style={{ fontSize: 20, fontWeight: 500 }}>
        {value}
      </div>
      <div className="text-[10px] text-cream-400/60 mt-0.5">{hint}</div>
    </div>
  );
}
