import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  Container,
  Droplet,
  FileText,
  Flower,
  Flower2,
  Leaf,
  Lightbulb,
  Mountain,
  Package,
  Scissors,
  Snowflake,
  Sparkles,
  SprayCan,
  Sprout,
  Thermometer,
  Trash2,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { db, newId, type Plant, type RosReport } from '@/lib/db';
import {
  computeInsights,
  buildContextDigest,
  plantLabel,
} from '@/lib/ros/engine';
import type { RosInsight, RosInsightKind, RosSeverity } from '@/lib/ros/types';
import { askRos } from '@/lib/ros/chat';
import { predictForPlants } from '@/lib/ros/predict';
import { varietyById, varietyByName } from '@/lib/varieties';

const DAY_MS = 1000 * 60 * 60 * 24;

const KIND_ICON: Record<RosInsightKind, LucideIcon> = {
  water: Droplet,
  feed: Leaf,
  prune: Scissors,
  top: Sparkles,
  pollinate: Flower,
  deblossom: Flower2,
  runner: Sprout,
  hill: Mountain,
  harvest: Leaf,
  light: Lightbulb,
  frost: Snowflake,
  season: CalendarDays,
  mulch: Leaf,
  env: Thermometer,
  // — Véritable SMART (vatnsrækt) —
  tank: Container,
  clean: SprayCan,
  wick: Waves,
  thin: Scissors,
  lingot: Package,
  info: Sparkles,
};

/** Litaslá vinstri brúnar/táknu eftir forgangi (sama hugmynd og í RosWindow). */
const SEVERITY_STYLE: Record<
  RosSeverity,
  { edge: string; iconBg: string; iconColor: string }
> = {
  due: {
    edge: 'var(--cap-500)',
    iconBg: 'rgba(226,62,29,.16)',
    iconColor: 'var(--cap-400)',
  },
  soon: {
    edge: 'var(--cream-400)',
    iconBg: 'rgba(224,194,121,.16)',
    iconColor: 'var(--cream-300)',
  },
  info: {
    edge: 'var(--moss-400)',
    iconBg: 'rgba(115,159,115,.16)',
    iconColor: 'var(--moss-300)',
  },
};

/** Innsýn merkt sinni ræktun svo hægt sé að birta nafn og fletta á réttan stað. */
interface TaggedInsight {
  insight: RosInsight;
  growId: string;
  growName: string;
}

/** Íslensk fleirtölu-/eintölumeðferð fyrir „dag(a)". */
function dayWord(n: number): string {
  return Math.abs(n) === 1 ? 'dag' : 'daga';
}

/** Stutt íslensk dagsetning (fellur aftur á ISO ef locale vantar). */
function reportDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString('is-IS', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

export function RosOverview() {
  const navigate = useNavigate();

  const grows = useLiveQuery(() => db.grows.toArray());
  const plants = useLiveQuery(() => db.plants.toArray());
  const logs = useLiveQuery(() => db.logs.toArray());
  const harvests = useLiveQuery(() => db.harvests.toArray());
  const reports = useLiveQuery(() =>
    db.rosReports.orderBy('createdAt').reverse().toArray(),
  );

  const now = Date.now();
  const month = new Date(now).getMonth() + 1;

  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  // Virkar ræktanir (ekki vistaðar í safn).
  const activeGrows = useMemo(
    () => (grows ?? []).filter((g) => !g.archived),
    [grows],
  );

  // Hóparnir reiknaðir client-side eftir growId.
  const plantsByGrow = useMemo(() => groupByGrow(plants ?? []), [plants]);
  const logsByGrow = useMemo(() => groupByGrow(logs ?? []), [logs]);
  const harvestsByGrow = useMemo(() => groupByGrow(harvests ?? []), [harvests]);

  // Öll virk ráð allra ræktana, merkt sinni ræktun.
  const tagged = useMemo<TaggedInsight[]>(() => {
    const out: TaggedInsight[] = [];
    for (const grow of activeGrows) {
      const itsPlants = plantsByGrow.get(grow.id) ?? [];
      const itsLogs = logsByGrow.get(grow.id) ?? [];
      const itsHarvests = harvestsByGrow.get(grow.id) ?? [];
      const insights = computeInsights({
        grow,
        plants: itsPlants,
        logs: itsLogs,
        harvests: itsHarvests,
        now,
        month,
      });
      for (const insight of insights) {
        out.push({ insight, growId: grow.id, growName: grow.name });
      }
    }
    return out;
  }, [activeGrows, plantsByGrow, logsByGrow, harvestsByGrow, now, month]);

  const dueAndSoon = useMemo(
    () =>
      tagged.filter(
        (t) => t.insight.severity === 'due' || t.insight.severity === 'soon',
      ),
    [tagged],
  );
  const infoCount = tagged.length - dueAndSoon.length;

  // Uppskeruspá yfir allar virkar plöntur.
  const allPlants = useMemo(
    () => activeGrows.flatMap((g) => plantsByGrow.get(g.id) ?? []),
    [activeGrows, plantsByGrow],
  );
  const predictions = useMemo(() => {
    const getVariety = (p: Plant) =>
      varietyById(p.varietyId) ?? varietyByName(p.variety);
    return predictForPlants(allPlants, getVariety, now).slice(0, 8);
  }, [allPlants, now]);

  async function buildReport() {
    if (building) return;
    setBuilding(true);
    setBuildError(null);
    try {
      const context = activeGrows
        .map((grow) =>
          [
            `## ${grow.name}`,
            buildContextDigest({
              grow,
              plants: plantsByGrow.get(grow.id) ?? [],
              logs: logsByGrow.get(grow.id) ?? [],
              harvests: harvestsByGrow.get(grow.id) ?? [],
              now,
              month,
            }),
          ].join('\n'),
        )
        .join('\n\n');

      // Heildaruppskera síðustu 7 daga (g).
      const weekAgo = now - 7 * DAY_MS;
      const weekHarvestG = (harvests ?? [])
        .filter((h) => h.timestamp >= weekAgo)
        .reduce((sum, h) => sum + (h.weightG || 0), 0);

      const prompt = [
        'Þú ert Rós, hlý og hnitmiðuð vinkona ræktandans. Búðu til vikuskýrslu á íslensku',
        'út frá samhengi allra ræktana hér að neðan. Skilaðu Markdown með nákvæmlega þessum',
        'köflum og fyrirsögnum (feitletruðum):',
        '',
        '**Yfirlit vikunnar**',
        '**Það sem gengur vel**',
        '**Áhyggjuefni**',
        '**Næsta vika — forgangslisti** (númeraður listi)',
        '',
        `Heildaruppskera síðustu 7 daga: ${weekHarvestG} g.`,
        '',
        'Samhengi ræktana:',
        context,
      ].join('\n');

      const text = (
        await askRos({ messages: [{ role: 'user', text: prompt }] })
      ).trim();
      if (!text) throw new Error('Rós skilaði engri skýrslu. Reyndu aftur.');

      const report: RosReport = {
        id: newId(),
        createdAt: Date.now(),
        periodDays: 7,
        text,
      };
      await db.rosReports.add(report);
    } catch (err) {
      setBuildError(
        err instanceof Error && err.message
          ? err.message
          : 'Rós náði ekki að búa til skýrslu. Reyndu aftur síðar.',
      );
    } finally {
      setBuilding(false);
    }
  }

  async function deleteReport(id: string) {
    if (!confirm('Eyða þessari vikuskýrslu?')) return;
    await db.rosReports.delete(id);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ color: 'var(--cream-100)' }}
    >
      <div className="mx-auto w-full max-w-3xl" style={{ padding: '20px 22px 28px' }}>
        {/* Haus */}
        <header className="flex items-center gap-3 mb-6">
          <RosAvatar size={40} />
          <div className="min-w-0">
            <Eyebrow color="var(--terra-300)">Rós · vinkona ræktandans</Eyebrow>
            <h1 className="sp-h1">Dagskrá Rósar</h1>
          </div>
        </header>

        {/* — DAGSKRÁ DAGSINS — */}
        <section className="mb-8">
          <SectionTitle>Dagskrá dagsins</SectionTitle>
          {dueAndSoon.length === 0 ? (
            <AllGoodCard infoCount={infoCount} />
          ) : (
            <div className="flex flex-col gap-2">
              {dueAndSoon.map((t) => (
                <AgendaRow
                  key={`${t.growId}:${t.insight.id}`}
                  tagged={t}
                  onOpen={() => navigate(`/grow/${t.growId}`)}
                />
              ))}
              {infoCount > 0 && (
                <p className="text-[11px] text-cream-300/55 mt-1 px-0.5">
                  {infoCount} {infoCount === 1 ? 'ráð til viðbótar' : 'ráð til viðbótar'} í
                  einstökum ræktunum.
                </p>
              )}
            </div>
          )}
        </section>

        {/* — UPPSKERUSPÁ — */}
        <section className="mb-8">
          <SectionTitle>Uppskeruspá</SectionTitle>
          {predictions.length === 0 ? (
            <MutedCard>
              Engin uppskeruspá enn — Rós áætlar glugga um leið og plöntur komast á
              blóma- eða aldinfasa.
            </MutedCard>
          ) : (
            <div className="flex flex-col gap-2">
              {predictions.map(({ prediction, plant }) => (
                <PredictionRow
                  key={plant.id}
                  plant={plant}
                  daysUntilStart={prediction.daysUntilStart}
                  progress={prediction.progress}
                />
              ))}
            </div>
          )}
        </section>

        {/* — VIKUSKÝRSLA — */}
        <section>
          <SectionTitle>Vikuskýrsla</SectionTitle>
          <p className="text-[12px] text-cream-300/70 leading-relaxed mb-3 px-0.5">
            Rós tekur saman vikuna á öllum ræktunum þínum — hvað gengur vel, hvað
            þarf að passa og forgangslista fyrir næstu viku.
          </p>

          <button
            type="button"
            onClick={() => void buildReport()}
            disabled={building}
            className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-medium text-cream-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.99]"
            style={{ background: 'var(--moss-500)' }}
          >
            {building ? (
              <>
                <span
                  className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
                  style={{
                    border: '2px solid rgba(253,251,246,.35)',
                    borderTopColor: '#fdfbf6',
                  }}
                />
                Rós tekur saman vikuna…
              </>
            ) : (
              <>
                <FileText size={15} />
                Búa til vikuskýrslu
              </>
            )}
          </button>

          {buildError && (
            <p
              className="text-[12px] mt-2 leading-relaxed"
              style={{ color: 'var(--cap-400)' }}
            >
              {buildError}
            </p>
          )}

          {/* Eldri skýrslur */}
          <div className="flex flex-col gap-3 mt-4">
            {(reports ?? []).length === 0 && !building && (
              <MutedCard>
                Engin vikuskýrsla enn. Smelltu á hnappinn til að fá fyrstu samantekt
                Rósar.
              </MutedCard>
            )}
            {(reports ?? []).map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onDelete={() => void deleteReport(report.id)}
              />
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

/* — Hlutar — */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="sp-h3 mb-3">{children}</h2>
  );
}

function AgendaRow({
  tagged,
  onOpen,
}: {
  tagged: TaggedInsight;
  onOpen: () => void;
}) {
  const { insight, growName } = tagged;
  const sev = SEVERITY_STYLE[insight.severity];
  const Icon = KIND_ICON[insight.kind] ?? Sparkles;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl p-3 flex gap-3 transition-colors active:scale-[.995]"
      style={{
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.4)',
        borderLeft: `3px solid ${sev.edge}`,
      }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: sev.iconBg, color: sev.iconColor }}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-cream-50 text-sm font-medium">{insight.title}</span>
          <span
            className="text-[10px] sp-mono px-1.5 py-0.5 rounded-full ml-auto shrink-0"
            style={{
              background: 'rgba(18,31,20,.55)',
              color: 'rgba(231,217,168,.7)',
              border: '1px solid rgba(64,104,67,.4)',
            }}
          >
            {growName}
          </span>
        </div>
        <p className="text-[12px] text-cream-300/80 mt-1 leading-relaxed">
          {insight.detail}
        </p>
      </div>
    </button>
  );
}

function PredictionRow({
  plant,
  daysUntilStart,
  progress,
}: {
  plant: Plant;
  daysUntilStart: number;
  progress: number;
}) {
  const pct = Math.max(0, Math.min(1, progress));
  const windowLabel =
    daysUntilStart <= 0
      ? 'opinn núna'
      : `gluggi opnast eftir ${daysUntilStart} ${dayWord(daysUntilStart)}`;

  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.4)',
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(115,159,115,.16)', color: 'var(--moss-300)' }}
        >
          <Activity size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-cream-50 text-sm font-medium truncate">
            {plantLabel(plant)}
          </div>
          <div className="text-[11px] text-cream-300/70 truncate">
            {plant.variety}
          </div>
        </div>
        <span
          className="shrink-0 text-[11px] sp-mono"
          style={{
            color:
              daysUntilStart <= 0 ? 'var(--moss-300)' : 'rgba(231,217,168,.75)',
          }}
        >
          {windowLabel}
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 6, background: 'rgba(18,31,20,.6)' }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            background: 'var(--moss-400)',
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function ReportCard({
  report,
  onDelete,
}: {
  report: RosReport;
  onDelete: () => void;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.4)',
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <RosAvatar size={28} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] sp-mono uppercase tracking-wider text-cream-400">
            Vikuskýrsla
          </div>
          <div className="text-[12px] text-cream-300/80">
            {reportDate(report.createdAt)}
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Eyða skýrslu"
          title="Eyða skýrslu"
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-cream-300 hover:text-cream-50 transition-colors"
          style={{
            background: 'rgba(18,31,20,.5)',
            border: '1px solid rgba(64,104,67,.4)',
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <MarkdownText content={report.text} />
    </div>
  );
}

function AllGoodCard({ infoCount }: { infoCount: number }) {
  return (
    <div
      className="text-sm text-cream-300/75 rounded-2xl p-6 text-center"
      style={{
        background: 'rgba(18,31,20,.4)',
        border: '1px dashed rgba(64,104,67,.45)',
      }}
    >
      <div className="flex justify-center mb-2">
        <RosAvatar size={34} />
      </div>
      Allt í góðu hjá þér núna — ekkert aðkallandi á dagskrá. Haltu áfram góðu
      verki og kíktu aftur síðar.
      {infoCount > 0 && (
        <div className="text-[11px] text-cream-300/55 mt-2">
          {infoCount} {infoCount === 1 ? 'almennt ráð' : 'almenn ráð'} bíða í
          einstökum ræktunum.
        </div>
      )}
    </div>
  );
}

function MutedCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[13px] text-cream-300/70 rounded-2xl p-5 leading-relaxed"
      style={{
        background: 'rgba(18,31,20,.4)',
        border: '1px dashed rgba(64,104,67,.45)',
      }}
    >
      {children}
    </div>
  );
}

/** Birtir markdown-svar Rósar (afrit af mappingu í RosWindow — staðbundið viljandi). */
function MarkdownText({ content }: { content: string }) {
  return (
    <div className="text-[13px] text-cream-100 leading-relaxed space-y-2 [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-cream-50">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="line-through opacity-80">{children}</del>,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          hr: () => <hr className="my-1.5 border-0 h-px bg-moss-700/40" />,
          h1: ({ children }) => <p className="font-semibold text-cream-50">{children}</p>,
          h2: ({ children }) => <p className="font-semibold text-cream-50">{children}</p>,
          h3: ({ children }) => <p className="font-semibold text-cream-50">{children}</p>,
          code: ({ children }) => (
            <code className="sp-mono text-[12px] px-1 py-0.5 rounded bg-moss-950/60">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline text-moss-300"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Hópar raðir eftir growId fyrir client-side samantekt. */
function groupByGrow<T extends { growId: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const arr = map.get(row.growId);
    if (arr) arr.push(row);
    else map.set(row.growId, [row]);
  }
  return map;
}
