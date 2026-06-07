import { useMemo } from 'react';
import { Droplet } from 'lucide-react';
import {
  meanWateringInterval,
  wateringEvents,
  type WateringEvent,
} from '@/lib/series';
import type { LogEntry } from '@/lib/db';

const DAY_MS = 86_400_000;

function shortDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString('is-IS', { day: 'numeric', month: 'short' });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

/** Hæð tikks ∝ magni (ml) þegar það er skráð, annars meðalhæð. */
function tickHeight(events: WateringEvent[], ev: WateringEvent): number {
  const MIN = 8;
  const MAX = 28;
  const amounts = events.map((e) => e.amountMl).filter((a): a is number => a !== undefined);
  if (ev.amountMl === undefined || amounts.length === 0) return 16;
  const max = Math.max(...amounts);
  if (max <= 0) return 16;
  return MIN + (ev.amountMl / max) * (MAX - MIN);
}

/**
 * Þétt lárétt vökvunar-tímalína: eitt tikk á hverja vökvun (hæð ∝ ml ef skráð)
 * raðað eftir tíma, með afleiddu „Meðalbil milli vökvana: X dagar". Hrein
 * framsetning úr loggum — engar skemavarianir.
 */
export function WateringTimeline({ logs }: { logs: LogEntry[] }) {
  const events = useMemo(() => wateringEvents(logs), [logs]);
  const mean = useMemo(() => meanWateringInterval(logs), [logs]);

  if (events.length === 0) return null;

  const first = events[0].t;
  const last = events[events.length - 1].t;
  const span = last - first || DAY_MS;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-cream-400/60">
          <Droplet size={11} color="var(--terra-400)" />
          Vökvun
        </div>
        {mean !== null && (
          <span className="text-[11px] text-cream-300/75">
            Meðalbil milli vökvana:{' '}
            <span className="sp-mono text-cream-100">{mean.toFixed(1)} dagar</span>
          </span>
        )}
      </div>
      <div
        className="relative rounded-lg px-2"
        style={{
          height: 34,
          background: 'rgba(18,31,20,.4)',
          border: '1px solid rgba(64,104,67,.3)',
        }}
      >
        {events.map((ev, i) => {
          const x = ((ev.t - first) / span) * 100;
          const h = tickHeight(events, ev);
          return (
            <span
              key={`${ev.t}-${i}`}
              title={`${shortDate(ev.t)}${ev.amountMl !== undefined ? ` · ${ev.amountMl} ml` : ''}`}
              className="absolute rounded-full"
              style={{
                left: `calc(${x}% )`,
                bottom: 4,
                width: 3,
                height: h,
                background: 'var(--terra-400)',
                opacity: 0.85,
                transform: 'translateX(-50%)',
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between sp-mono text-[9px] text-cream-400/45 mt-0.5">
        <span>{shortDate(first)}</span>
        <span>{events.length} vökvanir</span>
        <span>{shortDate(last)}</span>
      </div>
    </div>
  );
}
