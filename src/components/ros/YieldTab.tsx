import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Scale, Sprout } from 'lucide-react';
import { RosAvatar } from '@/components/ros/RosAvatar';
import type { RosPanelContext } from '@/components/ros/RosPanel';
import {
  db,
  newId,
  type Plant,
  type LogEntry,
  type HarvestEntry,
  type PhotoBlob,
  type RosYieldCheck,
} from '@/lib/db';
import { getPhotoBlob } from '@/lib/photos';
import { varietyById, varietyByName, type Variety } from '@/lib/varieties';
import { relativeTime } from '@/lib/dates';
import { buildContextDigest, plantLabel, phaseLabel } from '@/lib/ros/engine';
import { predictHarvestWindow } from '@/lib/ros/predict';
import { askRos, blobToInlineImage } from '@/lib/ros/chat';
import { buildCountPrompt, parseCount } from '@/lib/ros/yieldCount';
import {
  estimatePlantYield,
  type PlantYieldEstimate,
  type YieldConfidence,
} from '@/lib/ros/yield';
import { announce } from '@/lib/announce';
import { dayWord, type LatestPhoto } from '@/components/ros/rosWindowState';

/* — UPPSKERA — */

/** Afbrigði plöntu: fyrst eftir id, annars eftir heiti (sama og annars staðar). */
function plantVariety(p: Plant): Variety | undefined {
  return varietyById(p.varietyId) ?? varietyByName(p.variety);
}

/** Snyrtileg grömm/kíló-birting („~380 g" / „~1,2 kg"). */
function fmtG(g: number): string {
  if (g >= 1000) return `${Number((g / 1000).toFixed(1)).toString().replace('.', ',')} kg`;
  return `${Math.round(g)} g`;
}

/** Bil sem texti — „380–520 g" (sama eining á báðum endum þegar hægt er). */
function fmtRange(lo: number, hi: number): string {
  if (hi >= 1000 || lo >= 1000) {
    const l = Number((lo / 1000).toFixed(1)).toString().replace('.', ',');
    const h = Number((hi / 1000).toFixed(1)).toString().replace('.', ',');
    return `${l}–${h} kg`;
  }
  return `${Math.round(lo)}–${Math.round(hi)} g`;
}

const CONFIDENCE_STYLE: Record<YieldConfidence, { color: string; bg: string }> = {
  lág: { color: 'var(--cream-300)', bg: 'rgba(224,194,121,.16)' },
  miðlungs: { color: 'var(--moss-300)', bg: 'rgba(115,159,115,.16)' },
  há: { color: 'var(--moss-300)', bg: 'rgba(115,159,115,.22)' },
};

export function YieldTab(ctx: RosPanelContext): JSX.Element {
  const { grow, plants, logs, harvests } = ctx;
  const now = Date.now();

  const activePlants = useMemo(() => plants.filter((p) => !p.archived), [plants]);

  // Umhverfissýni ræktunarinnar (fyrir hita-leiðréttingu tómataklasa).
  const envRows = useLiveQuery(
    () => db.environment.where('growId').equals(grow.id).toArray(),
    [grow.id],
  );
  const envSamples = useMemo(() => envRows ?? [], [envRows]);

  // Nýjasta mynd hverrar plöntu (sama tvíátta-tenging og HealthTab).
  const latestByPlant = useLiveQuery(async () => {
    const rows = await db.photos.where('growId').equals(grow.id).toArray();
    const photoById = new Map(rows.map((ph) => [ph.id, ph] as const));
    const map = new Map<string, LatestPhoto>();
    const consider = (plantId: string | undefined, photo?: PhotoBlob) => {
      if (!plantId || !photo) return;
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

  // Nýjasta talning hverrar plöntu (lifandi) — varðveitt milli opnana.
  const checkRows = useLiveQuery(
    () => db.rosYieldChecks.where('growId').equals(grow.id).toArray(),
    [grow.id],
  );
  const latestCountByPlant = useMemo(() => {
    const map = new Map<string, RosYieldCheck>();
    for (const c of checkRows ?? []) {
      const cur = map.get(c.plantId);
      if (!cur || c.createdAt > cur.createdAt) map.set(c.plantId, c);
    }
    return map;
  }, [checkRows]);

  const harvestsByPlant = useCallback(
    (p: Plant): HarvestEntry[] => harvests.filter((h) => h.plantId === p.id),
    [harvests],
  );
  const logsByPlant = useCallback(
    (p: Plant): LogEntry[] => logs.filter((l) => l.plantId === p.id),
    [logs],
  );

  // Mat per plöntu (með varðveittri talningu sem manualCount þegar hún er til).
  const estimates = useMemo(() => {
    const out: { plant: Plant; est: PlantYieldEstimate }[] = [];
    for (const p of activePlants) {
      const est = estimatePlantYield({
        plant: p,
        variety: plantVariety(p),
        harvests: harvestsByPlant(p),
        logs: logsByPlant(p),
        envSamples,
        manualCount: latestCountByPlant.get(p.id)?.count,
        now,
      });
      if (est) out.push({ plant: p, est });
    }
    return out;
  }, [activePlants, harvestsByPlant, logsByPlant, envSamples, latestCountByPlant, now]);

  const total = useMemo(() => {
    let remainingLowG = 0;
    let remainingHighG = 0;
    for (const { est } of estimates) {
      remainingLowG += est.remainingLowG;
      remainingHighG += est.remainingHighG;
    }
    return { remainingLowG, remainingHighG };
  }, [estimates]);

  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const runCount = useCallback(
    async (plant: Plant, photo: LatestPhoto) => {
      setBusy((b) => ({ ...b, [plant.id]: true }));
      setErrors((e) => {
        const next = { ...e };
        delete next[plant.id];
        return next;
      });
      try {
        // Talning af mynd er eina netleiðin í þessum flipa — láttu vita strax
        // ef ekki er nettenging frekar en að kasta almennri „Rós brást" villu.
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          throw new Error(
            'Þú ert ónettengd — talning af mynd þarf nettengingu. Reyndu aftur þegar þú kemst á netið.',
          );
        }
        const blob = await getPhotoBlob(photo.id);
        if (!blob) throw new Error('Næ ekki í myndina. Reyndu aftur.');
        const image = await blobToInlineImage(blob);

        const ts = Date.now();
        const context = buildContextDigest({
          grow,
          plants,
          logs,
          harvests,
          now: ts,
          month: new Date(ts).getMonth() + 1,
        });

        const reply = await askRos({
          messages: [{ role: 'user', text: buildCountPrompt(plant, 'aldin') }],
          context,
          images: [image],
        });

        const count = parseCount(reply.trim());
        if (count === null) throw new Error('Rós náði ekki að telja aldin á myndinni.');

        const check: RosYieldCheck = {
          id: newId(),
          plantId: plant.id,
          growId: grow.id,
          photoId: photo.id,
          count,
          kind: 'aldin',
          source: 'mynd',
          createdAt: Date.now(),
        };
        await db.rosYieldChecks.add(check);
        announce(`Rós taldi ${count} aldin á ${plantLabel(plant)}.`);
      } catch (err) {
        const msg =
          err instanceof Error && err.message
            ? err.message
            : 'Rós náði ekki að telja af myndinni. Reyndu aftur síðar.';
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

  if (estimates.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div
          className="text-sm text-cream-300/70 rounded-2xl p-6 text-center"
          style={{ background: 'rgba(18,31,20,.4)', border: '1px dashed rgba(64,104,67,.45)' }}
        >
          <div className="flex justify-center mb-2">
            <RosAvatar size={34} />
          </div>
          Uppskerumat birtist um leið og plöntur komast á blóma- eða aldinfasa.
          Skráðu framvinduna og kíktu þá aftur — Rós áætlar þá hve mikið er á
          leiðinni.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-0.5">
      {/* Heildarspá — alltaf BIL, aldrei ein tala. */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'rgba(36,56,39,.55)',
          border: '1px solid rgba(64,104,67,.4)',
          borderLeft: '3px solid var(--moss-400)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(115,159,115,.16)', color: 'var(--moss-300)' }}
          >
            <Scale size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.16em] text-cream-400/60">
              Heildarspá — eftir á plöntunum
            </div>
            <div className="text-cream-50 text-lg font-medium">
              Samtals ~{fmtRange(total.remainingLowG, total.remainingHighG)}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-cream-300/70 mt-2 leading-relaxed">
          Áætlun fyrir uppskeru — gefin sem bil, hallað niður fyrir
          inniaðstæður. Skráðu tínslur (g + fjöldi) svo matið þrengist.
        </p>
      </div>

      {estimates.map(({ plant, est }) => (
        <PlantYieldRow
          key={plant.id}
          plant={plant}
          est={est}
          photo={latestByPlant?.get(plant.id)}
          counted={latestCountByPlant.get(plant.id)?.count}
          countedAt={latestCountByPlant.get(plant.id)?.createdAt}
          busy={!!busy[plant.id]}
          error={errors[plant.id]}
          now={now}
          onCount={runCount}
        />
      ))}
    </div>
  );
}

function PlantYieldRow({
  plant,
  est,
  photo,
  counted,
  countedAt,
  busy,
  error,
  now,
  onCount,
}: {
  plant: Plant;
  est: PlantYieldEstimate;
  photo?: LatestPhoto;
  counted?: number;
  countedAt?: number;
  busy: boolean;
  error?: string;
  now: number;
  onCount: (plant: Plant, photo: LatestPhoto) => void | Promise<void>;
}) {
  const conf = CONFIDENCE_STYLE[est.confidence];
  const window = predictHarvestWindow(plant, plantVariety(plant), now);
  const windowLabel =
    window === null
      ? null
      : window.daysUntilStart <= 0
        ? 'uppskeruglugginn opinn'
        : `gluggi opnast eftir ${window.daysUntilStart} ${dayWord(window.daysUntilStart)}`;

  return (
    <div
      className="rounded-2xl p-3"
      style={{
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.4)',
        borderLeft: `3px solid ${conf.color}`,
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(115,159,115,.16)', color: 'var(--moss-300)' }}
        >
          <Sprout size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-cream-50 text-sm font-medium truncate">{plantLabel(plant)}</div>
          <div className="text-[11px] text-cream-300/70 truncate">
            {plant.variety} · {phaseLabel(plant.currentPhase)}
          </div>
        </div>
        <span
          className="shrink-0 text-[10px] uppercase tracking-wider sp-mono px-2 py-1 rounded-full font-medium"
          style={{ background: conf.bg, color: conf.color }}
        >
          {est.confidence}
        </span>
      </div>

      {/* Eftirstöðvar (bil) + þegar tínt */}
      <div className="flex items-baseline gap-2 flex-wrap mb-1">
        <span className="text-cream-50 text-base font-medium">
          ~{fmtRange(est.remainingLowG, est.remainingHighG)}
        </span>
        <span className="text-[11px] text-cream-300/65">eftir</span>
        {est.harvestedG > 0 && (
          <span className="text-[11px] text-cream-300/65 ml-auto sp-mono">
            þegar tínt: {fmtG(est.harvestedG)}
          </span>
        )}
      </div>

      {windowLabel && (
        <div className="text-[11px] text-cream-300/70 mb-1.5">{windowLabel}</div>
      )}

      {/* Traustlag: basis-strengir orðrétt, alltaf sýnilegt. */}
      <div
        className="mt-1.5 pt-1.5 flex flex-col gap-0.5"
        style={{ borderTop: '1px solid rgba(64,104,67,.3)' }}
      >
        {est.basis.map((b, i) => (
          <div key={i} className="text-[10px] text-cream-300/55 leading-snug">
            {b}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-[12px] mt-2 leading-relaxed" style={{ color: 'var(--cap-400)' }}>
          {error}
        </p>
      )}

      {/* Telja af mynd */}
      <button
        type="button"
        onClick={() => photo && onCount(plant, photo)}
        disabled={!photo || busy}
        className="w-full h-9 mt-2.5 rounded-xl flex items-center justify-center gap-2 text-[12px] font-medium text-cream-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[.99]"
        style={{ background: 'var(--moss-600)' }}
      >
        {busy ? (
          <>
            <span
              className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
              style={{ border: '2px solid rgba(253,251,246,.35)', borderTopColor: '#fdfbf6' }}
            />
            Rós telur aldin…
          </>
        ) : (
          <>
            <Camera size={14} />
            {counted !== undefined
              ? `Telja aftur (síðast ${counted}${countedAt ? `, ${relativeTime(countedAt)}` : ''})`
              : 'Telja af mynd'}
          </>
        )}
      </button>
      {!photo && (
        <p className="text-[10px] text-cream-300/55 mt-1.5 text-center">
          Skráðu mynd af plöntunni til að telja aldin sjálfvirkt.
        </p>
      )}
    </div>
  );
}
