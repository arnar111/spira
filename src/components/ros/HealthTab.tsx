import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, Camera, RefreshCw } from 'lucide-react';
import { Sparkline } from '@/components/ui/Sparkline';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { MarkdownText } from '@/components/ros/RosMarkdown';
import {
  db,
  newId,
  type Grow,
  type Plant,
  type LogEntry,
  type HarvestEntry,
  type RosAssessment,
  type PhotoBlob,
} from '@/lib/db';
import { getPhotoBlob, usePhotoUrl } from '@/lib/photos';
import { relativeTime, shortDate } from '@/lib/dates';
import { buildContextDigest, plantLabel, phaseLabel } from '@/lib/ros/engine';
import {
  buildAssessmentPrompt,
  parseHealthScore,
  MAX_HEALTH_SCORE,
} from '@/lib/ros/assessment';
import { askRos, blobToInlineImage } from '@/lib/ros/chat';
import { scoreColor, type LatestPhoto } from '@/components/ros/rosWindowState';

/* — HEILSA — */

export function HealthTab({
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
