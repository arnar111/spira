import { Sparkles } from 'lucide-react';
import { KIND_ICON } from '@/components/ros/rosWindowState';
import { dayWord } from '@/lib/dates';
import type { CalendarItem } from './useRosOverviewData';
import { SectionTitle, MutedCard } from './parts';

/** Litur eftir alvarleika (sama hugmynd og dagskráin). */
const SEVERITY_COLOR: Record<CalendarItem['severity'], string> = {
  due: 'var(--cap-500)',
  soon: 'var(--cream-400)',
  info: 'var(--moss-400)',
};

/** Íslenskur dagamerkimiði: „Í dag", „Á morgun", annars „eftir N daga". */
function whenLabel(inDays: number): string {
  if (inDays <= 0) return 'Í dag';
  if (inDays === 1) return 'Á morgun';
  return `Eftir ${inDays} ${dayWord(inDays)}`;
}

/**
 * Dagatal næstu 14 daga — verkefni framundan úr reglu-vélinni (vökvun/gjöf/
 * topping/tínsla) ásamt uppskerugluggum sem opnast, raðað eftir nálægð.
 */
export function CalendarSection({
  calendar,
  onOpen,
}: {
  calendar: CalendarItem[];
  onOpen: (growId: string) => void;
}) {
  return (
    <section className="mb-8">
      <SectionTitle>Næstu 14 dagar</SectionTitle>
      {calendar.length === 0 ? (
        <MutedCard>
          Ekkert tímabært á næstu tveimur vikum. Rós raðar hér verkefnum úr
          ræktununum þínum þegar þau nálgast — skráðu vökvanir og gjafir svo hún
          viti hvar þú stendur.
        </MutedCard>
      ) : (
        <div className="flex flex-col gap-1.5">
          {calendar.map((item) => (
            <CalendarRow key={item.id} item={item} onOpen={() => onOpen(item.growId)} />
          ))}
        </div>
      )}
    </section>
  );
}

function CalendarRow({ item, onOpen }: { item: CalendarItem; onOpen: () => void }) {
  const color = SEVERITY_COLOR[item.severity];
  const Icon = KIND_ICON[item.kind] ?? Sparkles;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-xl p-2.5 flex items-center gap-3 transition-colors active:scale-[.995]"
      style={{ background: 'rgba(36,56,39,.5)', border: '1px solid rgba(64,104,67,.35)' }}
    >
      <span
        className="shrink-0 sp-mono text-[10px] uppercase tracking-wider rounded-full px-2 py-1 text-center"
        style={{ minWidth: 76, background: 'rgba(18,31,20,.55)', color }}
      >
        {whenLabel(item.inDays)}
      </span>
      <Icon size={15} style={{ color, flexShrink: 0 }} />
      <span className="min-w-0 flex-1 text-[13px] text-cream-100 truncate">{item.title}</span>
      <span className="shrink-0 text-[10px] text-cream-300/55 sp-mono truncate max-w-[35%]">
        {item.growName}
      </span>
    </button>
  );
}
