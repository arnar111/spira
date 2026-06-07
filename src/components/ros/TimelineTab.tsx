import { useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sparkline } from '@/components/ui/Sparkline';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { scoreColor } from '@/components/ros/rosWindowState';
import type { RosPanelContext } from '@/components/ros/RosPanel';
import { db, type Plant, type RosAssessment } from '@/lib/db';
import { usePhotoUrl } from '@/lib/photos';
import { relativeTime } from '@/lib/dates';
import { plantLabel, phaseLabel } from '@/lib/ros/engine';
import { plantPace, paceLabel } from '@/lib/ros/growthTrack';
import { varietyById, varietyByName } from '@/lib/varieties';
import { MAX_HEALTH_SCORE } from '@/lib/ros/assessment';

/* — FERILL — */

const DAY_MS = 86_400_000;

/**
 * Ferill = hvernig ræktunin þróast yfir tíma, í fljótu bragði og alveg offline:
 * heilsuskor-trend per plöntu, mynda-samanburður (nýjasta vs ~viku eldri) og
 * fasa-hraði miðað við afbrigðagluggann. Tóm-states segja HVERNIG á að gera
 * hvern hluta gagnlegan — ekki bara „engin gögn".
 */
export function TimelineTab({ grow, plants }: RosPanelContext): JSX.Element {
  const now = Date.now();
  const activePlants = useMemo(() => plants.filter((p) => !p.archived), [plants]);

  // Heilsumöt ræktunarinnar (lifandi, db v5 söfnun) — hópuð per plöntu, elst fyrst.
  const assessmentRows = useLiveQuery(
    () => db.rosAssessments.where('growId').equals(grow.id).toArray(),
    [grow.id],
  );
  const trendByPlant = useMemo(() => {
    const map = new Map<string, RosAssessment[]>();
    for (const a of assessmentRows ?? []) {
      const list = map.get(a.plantId);
      if (list) list.push(a);
      else map.set(a.plantId, [a]);
    }
    for (const list of map.values()) list.sort((x, y) => x.createdAt - y.createdAt);
    return map;
  }, [assessmentRows]);

  // Tvær myndir til samanburðar (per ræktun): nýjasta og sú sem næst er ~7 dögum
  // eldri — falli aftur á elstu mynd ef spönnin er styttri en vika.
  const comparePhotos = useLiveQuery(async () => {
    const rows = await db.photos.where('growId').equals(grow.id).toArray();
    if (rows.length < 2) return null;
    rows.sort((a, b) => b.takenAt - a.takenAt);
    const newest = rows[0];
    const target = newest.takenAt - 7 * DAY_MS;
    let older = rows[rows.length - 1];
    let best = Infinity;
    for (const ph of rows.slice(1)) {
      const dist = Math.abs(ph.takenAt - target);
      if (dist < best) {
        best = dist;
        older = ph;
      }
    }
    return {
      newest: newest.id,
      newestAt: newest.takenAt,
      older: older.id,
      olderAt: older.takenAt,
    };
  }, [grow.id]);

  const hasTrend = activePlants.some((p) => (trendByPlant.get(p.id)?.length ?? 0) > 0);
  const pacePlants = activePlants.filter((p) => paceWindow(p));

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-0.5">
      <section>
        <Eyebrow className="mb-2">Heilsuþróun</Eyebrow>
        {hasTrend ? (
          <div className="flex flex-col gap-2">
            {activePlants.map((p) => {
              const trend = trendByPlant.get(p.id) ?? [];
              if (trend.length === 0) return null;
              return <HealthTrendRow key={p.id} plant={p} history={trend} />;
            })}
          </div>
        ) : (
          <Hint>
            Opnaðu Spyrja Rós → Heilsa til að meta plöntu af mynd. Eftir nokkur
            möt birtist þróun heilsuskorsins hér.
          </Hint>
        )}
      </section>

      <section>
        <Eyebrow className="mb-2">Mynda-samanburður</Eyebrow>
        {comparePhotos ? (
          <div className="grid grid-cols-2 gap-2">
            <PhotoCompare
              photoId={comparePhotos.older}
              caption={relativeTime(comparePhotos.olderAt, now)}
            />
            <PhotoCompare
              photoId={comparePhotos.newest}
              caption={relativeTime(comparePhotos.newestAt, now)}
            />
          </div>
        ) : (
          <Hint>
            Skráðu myndir reglulega í dagbókina (📷). Þegar tvær myndir eru til
            stillir Rós nýjustu myndinni upp við hlið einnar ~viku eldri.
          </Hint>
        )}
      </section>

      <section>
        <Eyebrow className="mb-2">Fasa-hraði</Eyebrow>
        {pacePlants.length > 0 ? (
          <div className="flex flex-col gap-2">
            {pacePlants.map((p) => (
              <PaceRow key={p.id} plant={p} now={now} />
            ))}
          </div>
        ) : (
          <Hint>
            Veldu afbrigði með þekktan uppskeruglugga á plöntunum þínum — þá ber
            Rós aldur þeirra saman við dæmigerðan tíma að uppskeru.
          </Hint>
        )}
      </section>
    </div>
  );
}

/** Afbrigðagluggi plöntu (varietyId fyrst, svo nafn) — eða undefined. */
function paceWindow(plant: Plant): [number, number] | undefined {
  const v = varietyById(plant.varietyId) ?? varietyByName(plant.variety);
  return v?.daysToHarvest;
}

function HealthTrendRow({ plant, history }: { plant: Plant; history: RosAssessment[] }) {
  const scores = history.map((a) => a.score).filter((s): s is number => s !== null);
  const latest = scores[scores.length - 1] ?? null;
  const edge = scoreColor(latest);
  return (
    <div
      className="rounded-2xl p-3 flex items-center gap-3"
      style={{
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.4)',
        borderLeft: `3px solid ${edge}`,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-cream-50 text-sm font-medium truncate">{plantLabel(plant)}</div>
        <div className="text-[11px] text-cream-300/70 truncate">
          {phaseLabel(plant.currentPhase)}
        </div>
      </div>
      {scores.length > 1 ? (
        <Sparkline points={scores} width={96} height={26} color={edge} />
      ) : (
        <span className="text-[10px] text-cream-400/55 sp-mono">eitt mat</span>
      )}
      {latest !== null && (
        <span
          className="shrink-0 text-[11px] sp-mono px-2 py-1 rounded-full font-medium"
          style={{ background: 'rgba(18,31,20,.55)', color: edge, border: `1px solid ${edge}` }}
        >
          {latest}/{MAX_HEALTH_SCORE}
        </span>
      )}
    </div>
  );
}

function PhotoCompare({ photoId, caption }: { photoId: string; caption: string }) {
  const url = usePhotoUrl(photoId);
  return (
    <div>
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'rgba(18,31,20,.6)', border: '1px solid rgba(64,104,67,.4)' }}
      >
        {url ? (
          <img src={url} alt={`Mynd ${caption}`} className="w-full h-32 object-cover" />
        ) : (
          <div className="w-full h-32 animate-pulse" style={{ background: 'rgba(64,104,67,.18)' }} />
        )}
      </div>
      <div className="text-[10px] text-cream-300/60 mt-1 sp-mono text-center">{caption}</div>
    </div>
  );
}

function PaceRow({ plant, now }: { plant: Plant; now: number }) {
  const pace = plantPace(plant, paceWindow(plant), now);
  if (!pace) return null;
  const label = paceLabel(pace);
  const tone =
    pace.status === 'ahead'
      ? 'var(--moss-300)'
      : pace.status === 'behind'
        ? 'var(--cap-400)'
        : 'var(--cream-300)';
  return (
    <div
      className="rounded-2xl p-3"
      style={{ background: 'rgba(36,56,39,.55)', border: '1px solid rgba(64,104,67,.4)' }}
    >
      <div className="text-cream-50 text-sm font-medium truncate">{plantLabel(plant)}</div>
      <div className="text-[12px] text-cream-300/80 mt-0.5">
        D{pace.ageDays} · dæmigerður gluggi {pace.window[0]}–{pace.window[1]} daga
      </div>
      {label && (
        <div className="text-[11px] mt-1 sp-mono" style={{ color: tone }}>
          {label}
        </div>
      )}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-[12px] text-cream-300/70 rounded-2xl p-4 flex items-start gap-2.5"
      style={{ background: 'rgba(18,31,20,.4)', border: '1px dashed rgba(64,104,67,.45)' }}
    >
      <div className="shrink-0">
        <RosAvatar size={26} />
      </div>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
