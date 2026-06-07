import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { RosAvatar } from '@/components/ros/RosAvatar';
import type { RosPanelContext } from '@/components/ros/RosPanel';
import { db } from '@/lib/db';
import {
  buildWeekDigest,
  type CountDelta,
  type EnvStat,
  type PhotoMeta,
} from '@/lib/ros/weekDigest';

/* — VIKA — síðustu 7 dagar, alfarið offline úr buildWeekDigest. */

/** Snyrtir tölu á íslensku sniði (komma sem aukastafamerki). */
function numIs(value: number, maxFractionDigits = 1): string {
  try {
    return value.toLocaleString('is-IS', { maximumFractionDigits: maxFractionDigits });
  } catch {
    return String(Number(value.toFixed(maxFractionDigits)));
  }
}

export function WeekTab({ grow, plants, logs, harvests }: RosPanelContext): JSX.Element {
  const navigate = useNavigate();

  // Umhverfissýni og léttvæg myndlýsigögn (bara takenAt — engir blob í minni).
  // useLiveQuery skilar undefined fyrstu umferð; meðhöndlað inni í useMemo svo
  // engin ný `[]` fallback-vísun raski hook-deps á hverri umferð.
  const envSamples = useLiveQuery(
    () => db.environment.where('growId').equals(grow.id).toArray(),
    [grow.id],
  );
  const photoMeta = useLiveQuery(
    () =>
      db.photos
        .where('growId')
        .equals(grow.id)
        .toArray()
        .then((ps) => ps.map((p): PhotoMeta => ({ takenAt: p.takenAt }))),
    [grow.id],
  );

  // Ljúkum aldrei við að kalla Date.now() inni í vélinni — sendum 'now' inn hér.
  const digest = useMemo(
    () =>
      buildWeekDigest({
        logs,
        harvests,
        envSamples: envSamples ?? [],
        photos: photoMeta ?? [],
        now: Date.now(),
      }),
    [logs, harvests, envSamples, photoMeta],
  );

  if (digest.isEmpty) {
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
          Hér birtist vikuyfirlitið þitt — það helsta sem gerðist síðustu sjö
          daga. Skráðu vökvun, gjafir og myndir{plants.length === 0 ? ' (og bættu við plöntu)' : ''} svo
          Rós hafi eitthvað að segja frá.
        </div>
      </div>
    );
  }

  const { activities, harvest, photos, environment, highlights } = digest;
  const hasEnv = environment.tempC.avg !== null || environment.humidityPct.avg !== null;

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-0.5">
      {/* 1) Hápunktar */}
      {highlights.length > 0 && (
        <div
          className="rounded-2xl p-3 flex gap-3"
          style={{
            background: 'rgba(36,56,39,.55)',
            border: '1px solid rgba(64,104,67,.4)',
            borderLeft: '3px solid var(--moss-400)',
          }}
        >
          <div
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(115,159,115,.16)' }}
          >
            <RosAvatar size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-cream-50 text-sm font-medium">Hápunktar vikunnar</div>
            <ul className="mt-1.5 flex flex-col gap-1">
              {highlights.map((h) => (
                <li
                  key={h}
                  className="text-[12px] text-cream-300/85 leading-relaxed flex gap-1.5"
                >
                  <span style={{ color: 'var(--moss-300)' }}>•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 2) Talning vikunnar */}
      <Section title="Talning vikunnar">
        <div className="grid grid-cols-3 gap-2">
          {/* Uppskera er útkoman — fær fremsta sætið og terracotta-áherslu. */}
          <CountCell label="Tínsla" count={harvest.grams} unit="g" goodUp accent />
          <CountCell label="Vökvanir" count={activities.waterings} />
          <CountCell label="Gjafir" count={activities.feedings} />
          <CountCell label="Klipp/topp" count={activities.prunesAndTops} />
          <CountCell label="Frjóvgun" count={activities.pollinations} />
          <CountCell label="Myndir" count={photos} />
        </div>
      </Section>

      {/* 3) Umhverfi */}
      {hasEnv && (
        <Section title="Umhverfi vikunnar">
          <div className="grid grid-cols-2 gap-2">
            <EnvCell label="Hiti" stat={environment.tempC} unit="°C" />
            <EnvCell label="Raki" stat={environment.humidityPct} unit="%" />
          </div>
        </Section>
      )}

      {/* 6) Tengill á fullar vikuskýrslur Rósar (LLM) */}
      <button
        type="button"
        onClick={() => navigate('/ros')}
        className="mt-auto self-start inline-flex items-center gap-1.5 text-[12px] text-moss-300 hover:text-moss-200 transition-colors"
      >
        Vikuskýrslur — Dagskrá Rósar
        <ArrowRight size={13} />
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="sp-mono mb-2"
        style={{ fontSize: 9, color: 'rgba(231,217,168,.55)', letterSpacing: '0.16em' }}
      >
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

/**
 * Ein talningarfruma með breytingu frá fyrri viku. Delta er hlutlaust krem-litað
 * sjálfgefið (fleiri vökvanir er ekki endilega gott); `goodUp` (uppskera) gerir
 * jákvæða breytingu mosa-græna.
 */
function CountCell({
  label,
  count,
  unit,
  goodUp = false,
  accent = false,
}: {
  label: string;
  count: CountDelta;
  unit?: string;
  goodUp?: boolean;
  /** Áherslufruma (uppskera) — terracotta-rammi og -tölulitur. */
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-2.5"
      style={
        accent
          ? { background: 'rgba(194,106,77,.12)', border: '1px solid rgba(194,106,77,.45)' }
          : { background: 'rgba(36,56,39,.55)', border: '1px solid rgba(64,104,67,.35)' }
      }
    >
      <div
        className="sp-mono"
        style={{ fontSize: 9, color: 'rgba(231,217,168,.55)', letterSpacing: '0.14em' }}
      >
        {label.toUpperCase()}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className="sp-stat"
          style={{ fontSize: 22, color: accent ? 'var(--terra-300)' : 'var(--cream-50)' }}
        >
          {numIs(count.current, 0)}
        </span>
        {unit && (
          <span className="sp-mono" style={{ fontSize: 10, color: 'var(--cream-200)' }}>
            {unit}
          </span>
        )}
      </div>
      <DeltaTag delta={count.delta} unit={unit} goodUp={goodUp} />
    </div>
  );
}

/** Lítið ▲/▼ merki fyrir breytingu milli vikna. */
function DeltaTag({ delta, unit, goodUp }: { delta: number; unit?: string; goodUp: boolean }) {
  if (delta === 0) {
    return (
      <div className="sp-mono mt-1" style={{ fontSize: 10, color: 'rgba(231,217,168,.4)' }}>
        = fyrri viku
      </div>
    );
  }
  const up = delta > 0;
  // Hlutlaust krem sjálfgefið; uppskera (goodUp) verður græn upp / terracotta niður.
  const color = goodUp
    ? up
      ? 'var(--moss-300)'
      : 'var(--terra-300)'
    : 'rgba(231,217,168,.6)';
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <div
      className="sp-mono mt-1 flex items-center gap-1"
      style={{ fontSize: 10, color }}
    >
      <Icon size={11} />
      {up ? '+' : ''}
      {numIs(delta, 0)}
      {unit ? ` ${unit}` : ''}
    </div>
  );
}

/** Umhverfisfruma: meðaltal stórt, min–max undir, og breyting meðaltals. */
function EnvCell({ label, stat, unit }: { label: string; stat: EnvStat; unit: string }) {
  return (
    <div
      className="rounded-xl p-2.5"
      style={{ background: 'rgba(36,56,39,.55)', border: '1px solid rgba(64,104,67,.35)' }}
    >
      <div
        className="sp-mono"
        style={{ fontSize: 9, color: 'rgba(231,217,168,.55)', letterSpacing: '0.14em' }}
      >
        {label.toUpperCase()}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="sp-stat" style={{ fontSize: 22, color: 'var(--cream-50)' }}>
          {stat.avg !== null ? numIs(stat.avg) : '–'}
        </span>
        <span className="sp-mono" style={{ fontSize: 10, color: 'var(--cream-200)' }}>
          {unit}
        </span>
      </div>
      {stat.min !== null && stat.max !== null && (
        <div className="sp-mono mt-1" style={{ fontSize: 10, color: 'rgba(231,217,168,.5)' }}>
          {numIs(stat.min)}–{numIs(stat.max)} {unit}
        </div>
      )}
      {stat.avgDelta !== null && stat.avgDelta !== 0 && (
        <div
          className="sp-mono mt-0.5 flex items-center gap-1"
          style={{ fontSize: 10, color: 'rgba(231,217,168,.6)' }}
        >
          {stat.avgDelta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {stat.avgDelta > 0 ? '+' : ''}
          {numIs(stat.avgDelta)} {unit} frá fyrri viku
        </div>
      )}
    </div>
  );
}
