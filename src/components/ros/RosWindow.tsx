import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Activity,
  Bookmark,
  CalendarDays,
  Bug,
  Camera,
  Container,
  Droplet,
  FlaskConical,
  Flower,
  Flower2,
  ImagePlus,
  Leaf,
  Lightbulb,
  Mountain,
  Package,
  RefreshCw,
  Scissors,
  Send,
  Snowflake,
  Sparkles,
  SprayCan,
  Sprout,
  Thermometer,
  Waves,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Sparkline } from '@/components/ui/Sparkline';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { DiagnosisTab } from '@/components/ros/DiagnosisWizard';
import {
  db,
  newId,
  type Grow,
  type Plant,
  type LogEntry,
  type HarvestEntry,
  type RosMessage,
  type RosAssessment,
  type PhotoBlob,
} from '@/lib/db';
import { addPhotoFromFile, getPhotoBlob, usePhotoUrl } from '@/lib/photos';
import { relativeTime, shortDate } from '@/lib/dates';
import {
  computeInsights,
  buildContextDigest,
  plantLabel,
  phaseLabel,
} from '@/lib/ros/engine';
import {
  buildAssessmentPrompt,
  parseHealthScore,
  MAX_HEALTH_SCORE,
} from '@/lib/ros/assessment';
import type {
  RosInsight,
  RosInsightKind,
  RosSeverity,
} from '@/lib/ros/types';
import {
  askRos,
  askRosStream,
  blobToInlineImage,
  type RosTurn,
  type RosInlineImage,
} from '@/lib/ros/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface RosWindowProps {
  grow: Grow;
  open: boolean;
  onClose: () => void;
}

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
  envBand: Thermometer,
  ph: FlaskConical,
  pest: Bug,
  // — Véritable SMART (vatnsrækt) —
  tank: Container,
  clean: SprayCan,
  wick: Waves,
  thin: Scissors,
  lingot: Package,
  info: Sparkles,
};

/** Litaslá vinstri brúnar/táknu eftir forgangi. */
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

/** Íslensk fleirtölu-/eintölumeðferð fyrir „dag(a)". */
function dayWord(n: number): string {
  return Math.abs(n) === 1 ? 'dag' : 'daga';
}

/** Texti fyrir dueInDays: „eftir N daga" / „núna" / „komið yfir tíma". */
function dueLabel(dueInDays?: number | null): string | null {
  if (dueInDays === undefined || dueInDays === null) return null;
  if (dueInDays > 0) return `eftir ${dueInDays} ${dayWord(dueInDays)}`;
  if (dueInDays === 0) return 'núna';
  return 'komið yfir tíma';
}

export function RosWindow({ grow, open, onClose }: RosWindowProps): JSX.Element {
  const [tab, setTab] = useState(0);

  // Lifandi gögn beint úr gagnagrunni — „Ráð" (og samhengi spjallsins) uppfærast
  // um leið og log er skráð. RosWindow helst tengdur þótt glugginn sé lokaður,
  // svo Dexie-áskriftin er alltaf virk og engin endurhleðsla þarf.
  const plants =
    useLiveQuery(() => db.plants.where('growId').equals(grow.id).toArray(), [grow.id]) ?? [];
  const logs =
    useLiveQuery(
      () => db.logs.where('growId').equals(grow.id).reverse().sortBy('timestamp'),
      [grow.id],
    ) ?? [];
  const harvests =
    useLiveQuery(() => db.harvests.where('growId').equals(grow.id).toArray(), [grow.id]) ?? [];

  return (
    <Modal open={open} onClose={onClose} fullHeight size="lg">
      <div className="flex flex-col min-h-0 h-full">
        <header className="shrink-0 flex items-center gap-3 mb-3">
          <RosAvatar size={40} />
          <div className="min-w-0">
            <Eyebrow color="var(--terra-300)">Rós · vinkona ræktandans</Eyebrow>
            <h3
              className="sp-display truncate"
              style={{
                fontSize: 20,
                color: 'var(--cream-50)',
                fontWeight: 500,
                lineHeight: 1.1,
              }}
            >
              {grow.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Loka"
            className="ml-auto shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-cream-300 hover:text-cream-50 transition-colors"
            style={{ background: 'rgba(18,31,20,.5)', border: '1px solid rgba(64,104,67,.4)' }}
          >
            <X size={16} />
          </button>
        </header>

        <div className="shrink-0 mb-3">
          <Tabs
            tabs={['Ráð', 'Heilsa', 'Greining', 'Spjall']}
            active={tab}
            onChange={setTab}
          />
        </div>

        <div className="min-h-0 flex-1 flex flex-col">
          {tab === 0 && (
            <InsightsTab
              grow={grow}
              plants={plants}
              logs={logs}
              harvests={harvests}
            />
          )}
          {tab === 1 && (
            <HeilsaTab
              grow={grow}
              plants={plants}
              logs={logs}
              harvests={harvests}
            />
          )}
          {tab === 2 && (
            <DiagnosisTab
              grow={grow}
              plants={plants}
              logs={logs}
              harvests={harvests}
            />
          )}
          {tab === 3 && (
            <ChatTab
              grow={grow}
              plants={plants}
              logs={logs}
              harvests={harvests}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

/* — RÁÐ — */

function InsightsTab({
  grow,
  plants,
  logs,
  harvests,
}: {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
}) {
  const now = Date.now();
  const month = new Date(now).getMonth() + 1;
  const insights = computeInsights({ grow, plants, logs, harvests, now, month });

  if (insights.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div
          className="text-sm text-cream-300/70 rounded-2xl p-6 text-center"
          style={{
            background: 'rgba(18,31,20,.4)',
            border: '1px dashed rgba(64,104,67,.45)',
          }}
        >
          <div className="flex justify-center mb-2">
            <RosAvatar size={34} />
          </div>
          Allt lítur vel út hjá þér núna. Engin aðkallandi ráð — haltu áfram
          góðu verki og kíktu aftur síðar.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5">
      {insights.map((ins) => (
        <InsightCard key={ins.id} insight={ins} />
      ))}
    </div>
  );
}

function InsightCard({ insight }: { insight: RosInsight }) {
  const sev = SEVERITY_STYLE[insight.severity];
  const Icon = KIND_ICON[insight.kind] ?? Sparkles;
  const due = dueLabel(insight.dueInDays);

  return (
    <div
      className="rounded-2xl p-3 flex gap-3"
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
          {due && (
            <span
              className="text-[10px] uppercase tracking-wider sp-mono ml-auto"
              style={{ color: sev.iconColor }}
            >
              {due}
            </span>
          )}
        </div>
        <p className="text-[12px] text-cream-300/80 mt-1 leading-relaxed">
          {insight.detail}
        </p>
      </div>
    </div>
  );
}

/* — HEILSA — */

/** Litur heilsueinkunnar: grænt (hraust) → gult → rautt (þarf aðstoð). */
function scoreColor(score: number | null): string {
  if (score === null) return 'var(--moss-400)';
  if (score >= 8) return 'var(--moss-400)';
  if (score >= 5) return 'var(--cream-400)';
  return 'var(--cap-500)';
}


/**
 * Léttvæg lýsigögn nýjustu myndar plöntu — án blob (sparar minni; blobbinn er
 * sóttur sér þegar greint er eða thumbnail birt).
 */
interface LatestPhoto {
  id: string;
  takenAt: number;
}

function HeilsaTab({
  grow,
  plants,
  logs,
  harvests,
}: {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
}) {
  const activePlants = useMemo(
    () => plants.filter((p) => !p.archived),
    [plants],
  );

  // Nýjasta mynd hverrar plöntu (eingöngu lýsigögn — blob er ekki haldið í minni).
  // Tengjum mynd við plöntu úr TVEIMUR áttum: (a) plantId á myndinni sjálfri og
  // (b) skráningu (log) sem ber plantId + photoId. (b) er sú tenging sem birtist í
  // skráningalistanum og er rétt jafnvel þótt myndin hafi verið valin áður en
  // plantan var valin (þá situr eftir gamalt/ótengt plantId á myndinni sjálfri).
  const latestByPlant = useLiveQuery(async () => {
    const rows = await db.photos.where('growId').equals(grow.id).toArray();
    const photoById = new Map(rows.map((ph) => [ph.id, ph] as const));
    const map = new Map<string, LatestPhoto>();
    const consider = (plantId: string | undefined, photo?: PhotoBlob) => {
      if (!plantId || !photo) return; // spjallmyndir (án plöntu) telja ekki með.
      const cur = map.get(plantId);
      if (!cur || photo.takenAt > cur.takenAt) {
        map.set(plantId, { id: photo.id, takenAt: photo.takenAt });
      }
    };
    for (const ph of rows) consider(ph.plantId, ph);
    for (const lg of logs) {
      if (lg.photoId) consider(lg.plantId, photoById.get(lg.photoId));
    }
    return map;
  }, [grow.id, logs]);

  // Vistuð heilsumöt (lifandi) — kort uppfærist um leið og nýtt mat er skrifað.
  // Frá db v5 SAFNAST þau upp; við hópum eftir plöntu og röðum nýjast fyrst.
  const assessmentRows = useLiveQuery(
    () => db.rosAssessments.where('growId').equals(grow.id).toArray(),
    [grow.id],
  );
  const historyByPlant = useMemo(() => {
    const map = new Map<string, RosAssessment[]>();
    for (const a of assessmentRows ?? []) {
      const list = map.get(a.plantId);
      if (list) list.push(a);
      else map.set(a.plantId, [a]);
    }
    for (const list of map.values()) list.sort((x, y) => y.createdAt - x.createdAt);
    return map;
  }, [assessmentRows]);

  // Hvaða plöntur eru í greiningu og hvaða villur komu upp (per plöntu).
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const runAssessment = useCallback(
    async (plant: Plant, photo: LatestPhoto) => {
      setBusy((b) => ({ ...b, [plant.id]: true }));
      setErrors((e) => {
        const next = { ...e };
        delete next[plant.id];
        return next;
      });
      try {
        const blob = await getPhotoBlob(photo.id);
        if (!blob) throw new Error('Næ ekki í myndina. Reyndu aftur.');
        const image = await blobToInlineImage(blob);

        // Samhengi ræktunarinnar reiknað hér (hreint) með núverandi tíma.
        const ts = Date.now();
        const month = new Date(ts).getMonth() + 1;
        const context = buildContextDigest({
          grow,
          plants,
          logs,
          harvests,
          now: ts,
          month,
        });

        const reply = await askRos({
          messages: [{ role: 'user', text: buildAssessmentPrompt(plant) }],
          context,
          images: [image],
        });

        const text = reply.trim();
        if (!text) throw new Error('Rós skilaði engu mati. Reyndu aftur.');

        const assessment: RosAssessment = {
          id: newId(),
          plantId: plant.id,
          growId: grow.id,
          photoId: photo.id,
          photoTakenAt: photo.takenAt,
          score: parseHealthScore(text),
          text,
          createdAt: Date.now(),
        };
        // v5: bætum við (söfnun) í stað þess að yfirskrifa.
        await db.rosAssessments.add(assessment);
      } catch (err) {
        const msg =
          err instanceof Error && err.message
            ? err.message
            : 'Rós náði ekki að greina myndina. Reyndu aftur síðar.';
        setErrors((e) => ({ ...e, [plant.id]: msg }));
      } finally {
        setBusy((b) => {
          const next = { ...b };
          delete next[plant.id];
          return next;
        });
      }
    },
    [grow, plants, logs, harvests],
  );

  if (activePlants.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div
          className="text-sm text-cream-300/70 rounded-2xl p-6 text-center"
          style={{
            background: 'rgba(18,31,20,.4)',
            border: '1px dashed rgba(64,104,67,.45)',
          }}
        >
          <div className="flex justify-center mb-2">
            <RosAvatar size={34} />
          </div>
          Engin virk planta í þessari ræktun. Bættu við plöntu og skráðu mynd
          af henni til að fá heilsumat frá Rós.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-0.5">
      <p className="text-[12px] text-cream-300/70 leading-relaxed px-0.5">
        Rós skoðar nýjustu mynd hverrar plöntu og gefur heilsumat. Þú getur
        alltaf greint aftur — hún notar þá nýjustu myndina sem til er.
      </p>
      {activePlants.map((plant) => (
        <PlantHealthCard
          key={plant.id}
          plant={plant}
          photo={latestByPlant?.get(plant.id)}
          history={historyByPlant.get(plant.id) ?? []}
          busy={!!busy[plant.id]}
          error={errors[plant.id]}
          onRun={runAssessment}
        />
      ))}
    </div>
  );
}

function PlantHealthCard({
  plant,
  photo,
  history,
  busy,
  error,
  onRun,
}: {
  plant: Plant;
  photo?: LatestPhoto;
  /** Öll heilsumöt plöntunnar, nýjast fyrst (db v5 söfnun). */
  history: RosAssessment[];
  busy: boolean;
  error?: string;
  onRun: (plant: Plant, photo: LatestPhoto) => void | Promise<void>;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const assessment = history[0];
  const thumbUrl = usePhotoUrl(photo?.id);
  const score = assessment?.score ?? null;
  const edge = scoreColor(score);
  // Eldri möt (fyrir utan það nýjasta) fyrir samfellda sögu.
  const older = history.slice(1);
  // Einkunnaröð fyrir litla þróunar-sparkline (elst → nýjast).
  const scoreTrend = [...history]
    .reverse()
    .map((a) => a.score)
    .filter((s): s is number => s !== null);

  // Ný mynd komin eftir síðasta mat? (annar id eða nýrri tímastimpill)
  const hasNewerPhoto =
    !!assessment &&
    !!photo &&
    (photo.id !== assessment.photoId || photo.takenAt > assessment.photoTakenAt);

  const canRun = !!photo && !busy;
  const buttonLabel = assessment ? 'Greina aftur' : 'Greina mynd';

  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.4)',
        borderLeft: `3px solid ${edge}`,
      }}
    >
      {/* Haus: tákn, nafn, afbrigði/fasi */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(115,159,115,.16)', color: edge }}
        >
          <Activity size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-cream-50 text-sm font-medium truncate">
            {plantLabel(plant)}
          </div>
          <div className="text-[11px] text-cream-300/70 truncate">
            {plant.variety} · {phaseLabel(plant.currentPhase)}
          </div>
        </div>
        {score !== null && (
          <span
            className="shrink-0 text-[11px] sp-mono px-2 py-1 rounded-full font-medium"
            style={{ background: 'rgba(18,31,20,.55)', color: edge, border: `1px solid ${edge}` }}
          >
            {score}/{MAX_HEALTH_SCORE}
          </span>
        )}
      </div>

      {/* Mynd eða „engin mynd" reitur */}
      {photo ? (
        <div
          className="rounded-xl overflow-hidden mb-2.5"
          style={{ background: 'rgba(18,31,20,.6)', border: '1px solid rgba(64,104,67,.4)' }}
        >
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={`Nýjasta mynd af ${plantLabel(plant)}`}
              className="w-full max-h-52 object-cover"
            />
          ) : (
            <div className="w-full h-28" />
          )}
        </div>
      ) : (
        <div
          className="rounded-xl mb-2.5 px-3 py-4 flex items-center gap-2.5 text-[12px] text-cream-300/75"
          style={{
            background: 'rgba(18,31,20,.4)',
            border: '1px dashed rgba(64,104,67,.45)',
          }}
        >
          <Camera size={16} className="shrink-0 text-cream-300/60" />
          <span>
            Engin mynd af þessari plöntu enn. Skráðu mynd í dagbókina (📷) til
            að fá heilsumat.
          </span>
        </div>
      )}

      {/* Niðurstaða eða leiðbeining */}
      {assessment ? (
        <div className="mb-2">
          <MarkdownText content={assessment.text} />
          <div className="text-[10px] text-cream-300/55 mt-1.5 sp-mono">
            Greint {relativeTime(assessment.createdAt)} · mynd frá{' '}
            {shortDate(assessment.photoTakenAt)}
          </div>
          {hasNewerPhoto && (
            <div className="text-[11px] mt-1" style={{ color: 'var(--cream-300)' }}>
              Ný mynd er til — greindu aftur fyrir uppfært mat.
            </div>
          )}
        </div>
      ) : (
        photo &&
        !busy && (
          <p className="text-[12px] text-cream-300/70 mb-2 leading-relaxed">
            Smelltu á „Greina mynd" til að fá heilsumat Rósar á nýjustu myndinni.
          </p>
        )
      )}

      {/* Saga heilsumata (db v5 söfnun): þróunarlína + samfelld eldri möt. */}
      {history.length > 1 && (
        <div className="mb-2">
          {scoreTrend.length > 1 && (
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase tracking-[0.16em] text-cream-400/55">
                Þróun
              </span>
              <Sparkline points={scoreTrend} width={120} height={24} color={edge} />
              <span className="sp-mono text-[10px] text-cream-400/60">
                {scoreTrend[0]} → {scoreTrend[scoreTrend.length - 1]}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-[11px] text-cream-300/70 hover:text-cream-100 transition-colors inline-flex items-center gap-1"
          >
            {showHistory ? 'Fela sögu' : `Sýna sögu (${older.length})`}
          </button>
          {showHistory && (
            <div className="mt-2 flex flex-col gap-2">
              {older.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg p-2 text-[11px]"
                  style={{ background: 'rgba(18,31,20,.45)', border: '1px solid rgba(64,104,67,.3)' }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="sp-mono text-cream-400/65">
                      {shortDate(a.createdAt)}
                    </span>
                    {a.score !== null && (
                      <span className="sp-mono" style={{ color: scoreColor(a.score) }}>
                        {a.score}/{MAX_HEALTH_SCORE}
                      </span>
                    )}
                  </div>
                  <div className="text-cream-300/75 line-clamp-3">{a.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-[12px] mb-2 leading-relaxed" style={{ color: 'var(--cap-400)' }}>
          {error}
        </p>
      )}

      {/* Aðgerð */}
      <button
        type="button"
        onClick={() => photo && onRun(plant, photo)}
        disabled={!canRun}
        className="w-full h-10 rounded-xl flex items-center justify-center gap-2 text-[13px] font-medium text-cream-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[.99]"
        style={{ background: 'var(--moss-500)' }}
      >
        {busy ? (
          <>
            <span
              className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
              style={{
                border: '2px solid rgba(253,251,246,.35)',
                borderTopColor: '#fdfbf6',
              }}
            />
            Rós skoðar myndina…
          </>
        ) : (
          <>
            <RefreshCw size={15} />
            {buttonLabel}
          </>
        )}
      </button>
    </div>
  );
}

/* — SPJALL — */

/** Íslenskar tillöguspurningar fyrir hverja innsýnar-gerð (efstu ráð → spjall). */
const SUGGESTION_BY_KIND: Partial<Record<RosInsightKind, string>> = {
  water: 'Hvernig veit ég hvort ég eigi að vökva núna?',
  feed: 'Hvaða áburð ætti ég að nota núna?',
  pollinate: 'Hvernig frjóvga ég blómin rétt?',
  harvest: 'Hvenær verður uppskeran tilbúin?',
  light: 'Þarf ég gróðurljós þennan mánuð?',
  top: 'Hvernig toppa ég plöntuna rétt?',
  frost: 'Hvernig ver ég plönturnar gegn frosti?',
  hill: 'Hvernig hreyki ég rétt að kartöflunum?',
  tank: 'Hvenær á ég að fylla á Véritable-tankinn?',
  clean: 'Hvernig hreinsa ég Véritable-tankinn?',
  wick: 'Hvernig veit ég hvort skipta þurfi um hárpípu-dúkana?',
  thin: 'Hvernig grisja ég ungplönturnar í Lingot?',
  lingot: 'Hvenær á ég að skipta um Lingot?',
};

/** Almenn vara-tillaga ef of fáar innsýnir gefa spurningu. */
const FALLBACK_SUGGESTION = 'Hvað ætti ég að gera næst?';

function ChatTab({
  grow,
  plants,
  logs,
  harvests,
}: {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
}) {
  const messages = useLiveQuery(
    () => db.rosMessages.where('growId').equals(grow.id).sortBy('timestamp'),
    [grow.id],
  );

  const [text, setText] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  // Lifandi streymdur texti svars Rósar (null þegar ekkert er að streyma).
  const [streamText, setStreamText] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const list = messages ?? [];

  // Tillöguspurningar út frá efstu ráðum (deduppað eftir gerð, fyllt með varatillögu).
  const suggestions = useMemo(() => {
    const now = Date.now();
    const month = new Date(now).getMonth() + 1;
    const insights = computeInsights({ grow, plants, logs, harvests, now, month });
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ins of insights) {
      if (seen.has(ins.kind)) continue;
      const q = SUGGESTION_BY_KIND[ins.kind];
      if (!q) continue;
      seen.add(ins.kind);
      out.push(q);
      if (out.length >= 3) break;
    }
    // Vara-tillagan bætist við í mesta lagi EINU sinni — aldrei tvær eins flögur.
    if (out.length < 2) out.push(FALLBACK_SUGGESTION);
    return out.slice(0, 3);
  }, [grow, plants, logs, harvests]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [list.length, sending, streamText]);

  const onPickPhotos = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const ids: string[] = [];
      for (const file of Array.from(files)) {
        const id = await addPhotoFromFile(file, { growId: grow.id });
        ids.push(id);
      }
      setPendingPhotos((prev) => [...prev, ...ids]);
      if (fileRef.current) fileRef.current.value = '';
    },
    [grow.id],
  );

  function removePending(id: string) {
    setPendingPhotos((prev) => prev.filter((p) => p !== id));
  }

  async function send(override?: string) {
    const trimmed = (override ?? text).trim();
    // Tillögusmellur (override) sendir alltaf texta; myndir fylgja aðeins venjulegri ritun.
    const usePhotos = override === undefined;
    const photoIds = usePhotos ? [...pendingPhotos] : [];
    if ((!trimmed && photoIds.length === 0) || sending) return;

    const now = Date.now();
    const month = new Date(now).getMonth() + 1;

    // Vista skilaboð notanda strax.
    const userMsg: RosMessage = {
      id: newId(),
      growId: grow.id,
      role: 'user',
      content: trimmed,
      timestamp: now,
      photoIds: photoIds.length > 0 ? photoIds : undefined,
    };
    await db.rosMessages.add(userMsg);

    if (usePhotos) {
      setText('');
      setPendingPhotos([]);
    }
    setSending(true);
    setStreamText(null);

    // Optimistic „pending" kúla fyrir svar Rósar.
    const pendingId = newId();
    await db.rosMessages.add({
      id: pendingId,
      growId: grow.id,
      role: 'ros',
      content: '',
      timestamp: now + 1,
      pending: true,
    });

    try {
      // Fyrri umferðir -> RosTurn (utan pending svarsins).
      const history: RosTurn[] = list
        .filter((m) => !m.pending)
        .map((m) => ({
          role: m.role === 'ros' ? 'model' : 'user',
          text: m.content,
        }));
      const turns: RosTurn[] = [...history, { role: 'user', text: trimmed }];

      // Sjón: lestu blobbana og umbreyttu í inline myndir.
      const images: RosInlineImage[] = [];
      for (const pid of photoIds) {
        const blob = await getPhotoBlob(pid);
        if (blob) images.push(await blobToInlineImage(blob));
      }

      const context = buildContextDigest({
        grow,
        plants,
        logs,
        harvests,
        now,
        month,
      });

      const result = await askRosStream(
        {
          messages: turns,
          context,
          images: images.length > 0 ? images : undefined,
        },
        (textSoFar) => setStreamText(textSoFar),
      );

      await db.rosMessages.update(pendingId, {
        content:
          result.text.trim() ||
          'Rós svaraði engu í þetta sinn. Reyndu aftur eftir smá stund.',
        pending: false,
        timestamp: Date.now(),
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Rós er ekki tengd enn. Reyndu aftur síðar.';
      await db.rosMessages.update(pendingId, {
        content: msg,
        pending: false,
        timestamp: Date.now(),
      });
    } finally {
      setSending(false);
      setStreamText(null);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5">
        {list.length === 0 && (
          <div
            className="text-sm text-cream-300/70 rounded-2xl p-5 text-center mt-1"
            style={{
              background: 'rgba(18,31,20,.4)',
              border: '1px dashed rgba(64,104,67,.45)',
            }}
          >
            Spjallaðu við Rós um ræktunina. Spyrðu um vökvun, áburð, meindýr eða
            sýndu henni mynd af plöntunum þínum.
          </div>
        )}
        {list.map((m) => (
          <ChatBubble
            key={m.id}
            message={m}
            growId={grow.id}
            streamText={m.pending ? streamText : null}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Tillöguspurningar (þegar ekki er verið að senda) */}
      {!sending && suggestions.length > 0 && (
        <div className="shrink-0 flex gap-2 overflow-x-auto pt-2 -mx-0.5 px-0.5">
          {suggestions.map((q, i) => (
            <button
              key={`${q}-${i}`}
              type="button"
              onClick={() => void send(q)}
              className="shrink-0 rounded-full px-3 py-1.5 text-[12px] text-cream-100 whitespace-nowrap transition-colors hover:brightness-110 active:scale-[.98]"
              style={{
                background: 'rgba(18,31,20,.6)',
                border: '1px solid rgba(64,104,67,.5)',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Myndir í bið */}
      {pendingPhotos.length > 0 && (
        <div className="shrink-0 flex gap-2 flex-wrap pt-2">
          {pendingPhotos.map((id) => (
            <PendingThumb key={id} photoId={id} onRemove={() => removePending(id)} />
          ))}
        </div>
      )}

      {/* Inntakslína */}
      <div className="shrink-0 flex items-end gap-2 pt-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickPhotos}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="tengja mynd"
          title="tengja mynd"
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-cream-300 hover:text-cream-50 transition-colors"
          style={{
            background: 'rgba(18,31,20,.6)',
            border: '1px solid rgba(64,104,67,.5)',
          }}
        >
          <ImagePlus size={18} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Skrifaðu til Rósar…"
          className="flex-1 resize-none rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400 max-h-28"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || (!text.trim() && pendingPhotos.length === 0)}
          aria-label="Senda"
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-cream-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          style={{ background: 'var(--cap-500)' }}
        >
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  growId,
  streamText,
}: {
  message: RosMessage;
  growId: string;
  streamText?: string | null;
}) {
  const isUser = message.role === 'user';
  const [saved, setSaved] = useState(false);

  // Vista svar Rósar sem minnispunkt í dagbók (syncast sjálfkrafa um Dexie-hooka).
  const saveToJournal = useCallback(async () => {
    if (saved) return;
    await db.logs.add({
      id: newId(),
      growId,
      timestamp: Date.now(),
      type: 'note',
      note: 'Rós: ' + message.content.slice(0, 500),
    });
    setSaved(true);
  }, [saved, growId, message.content]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isUser && (
        <div className="shrink-0 self-end mb-0.5">
          <RosAvatar size={26} />
        </div>
      )}
      <div className="max-w-[78%] flex flex-col items-start">
        <div
          className="rounded-2xl px-3 py-2"
          style={
            isUser
              ? {
                  background: 'rgba(194,106,77,.22)',
                  border: '1px solid rgba(194,106,77,.4)',
                  borderBottomRightRadius: 6,
                }
              : {
                  background: 'rgba(36,56,39,.7)',
                  border: '1px solid rgba(64,104,67,.45)',
                  borderBottomLeftRadius: 6,
                }
          }
        >
          {message.photoIds && message.photoIds.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-1.5">
              {message.photoIds.map((pid) => (
                <ChatThumb key={pid} photoId={pid} />
              ))}
            </div>
          )}
          {message.pending ? (
            streamText ? (
              <MarkdownText content={streamText + ' ▍'} />
            ) : (
              <Spinner />
            )
          ) : (
            message.content &&
            (isUser ? (
              <p className="text-[13px] text-cream-100 whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            ) : (
              <MarkdownText content={message.content} />
            ))
          )}
        </div>

        {/* Vista svar Rósar í dagbók (aðeins fullkláruð svör). */}
        {!isUser && !message.pending && message.content && (
          <button
            type="button"
            onClick={() => void saveToJournal()}
            disabled={saved}
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-cream-300/70 hover:text-cream-100 transition-colors disabled:cursor-default disabled:hover:text-cream-300/70"
          >
            <Bookmark size={11} />
            {saved ? 'Vistað ✓' : 'Vista í dagbók'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Birtir markdown-svar Rósar (feitletrun, skáletur, yfirstrikun, listar). */
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

function Spinner() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-cream-300/80 py-0.5">
      <span
        className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
        style={{
          border: '2px solid rgba(231,217,168,.25)',
          borderTopColor: 'var(--cream-300)',
        }}
      />
      Rós hugsar…
    </span>
  );
}

function ChatThumb({ photoId }: { photoId: string }) {
  const url = usePhotoUrl(photoId);
  return (
    <div
      className="w-16 h-16 rounded-lg overflow-hidden"
      style={{ background: 'rgba(18,31,20,.6)', border: '1px solid rgba(64,104,67,.4)' }}
    >
      {url && <img src={url} alt="" className="w-full h-full object-cover" />}
    </div>
  );
}

function PendingThumb({
  photoId,
  onRemove,
}: {
  photoId: string;
  onRemove: () => void;
}) {
  const url = usePhotoUrl(photoId);
  return (
    <div
      className="relative w-16 h-16 rounded-lg overflow-hidden"
      style={{ background: 'rgba(18,31,20,.6)', border: '1px solid rgba(64,104,67,.4)' }}
    >
      {url && <img src={url} alt="" className="w-full h-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Fjarlægja mynd"
        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-cream-50"
        style={{ background: 'rgba(18,31,20,.85)' }}
      >
        <X size={12} />
      </button>
    </div>
  );
}
