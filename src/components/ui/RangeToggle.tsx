import { Tabs } from '@/components/ui/Tabs';
import type { RangeDays } from '@/lib/range';

const OPTIONS: { value: RangeDays; label: string }[] = [
  { value: 7, label: '7 d' },
  { value: 14, label: '14 d' },
  { value: 30, label: '30 d' },
  { value: null, label: 'Allt' },
];

interface RangeToggleProps {
  value: RangeDays;
  onChange: (value: RangeDays) => void;
  className?: string;
}

/**
 * Lítil kúlustöng til að velja tímaglugga línurita (7/14/30/allt).
 * Byggð á <Tabs> svo útlitið passi við aðra flipa appsins.
 * Síunarhjálparinn `withinRange` býr í `@/lib/range`.
 */
export function RangeToggle({ value, onChange, className }: RangeToggleProps) {
  const active = OPTIONS.findIndex((o) => o.value === value);
  return (
    <Tabs
      tabs={OPTIONS.map((o) => o.label)}
      active={active === -1 ? 0 : active}
      onChange={(i) => onChange(OPTIONS[i].value)}
      className={className}
    />
  );
}
