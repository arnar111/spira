import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Search } from 'lucide-react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pill } from '@/components/ui/Pill';
import { Chili } from '@/components/Chili';
import {
  BUILT_IN_VARIETIES,
  COLOR_HEX,
  COLOR_LABEL,
  MOTHER_SPECIES,
  formatShu,
  type MotherSpecies,
  type PepperColor,
  type VarietyWithChili,
} from '@/lib/varieties';
import { cn } from '@/lib/cn';

export function Varieties() {
  const [q, setQ] = useState('');
  const [mother, setMother] = useState<MotherSpecies | 'all'>('all');
  const [color, setColor] = useState<PepperColor | 'all'>('all');

  const list = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return BUILT_IN_VARIETIES.filter((v) => {
      if (mother !== 'all' && v.motherSpecies !== mother) return false;
      if (color !== 'all' && v.color !== color) return false;
      if (
        needle &&
        !v.commonName.toLowerCase().includes(needle) &&
        !v.motherSpecies.toLowerCase().includes(needle) &&
        !(v.flavor ?? '').toLowerCase().includes(needle)
      )
        return false;
      return true;
    }).sort((a, b) => (a.shu ?? 0) - (b.shu ?? 0));
  }, [q, mother, color]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-5 sm:px-7 py-6"
    >
      <header className="mb-5">
        <Eyebrow color="var(--terra-300)">Pipra-bókasafn</Eyebrow>
        <h1
          className="sp-display"
          style={{
            fontSize: 30,
            fontWeight: 500,
            color: 'var(--cream-50)',
            lineHeight: 1.05,
            marginTop: 6,
          }}
        >
          {list.length} afbrigði
        </h1>
      </header>

      <div className="relative mb-4">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-400/60"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Leita…"
          className="w-full rounded-xl bg-moss-950/60 border border-moss-800 pl-9 pr-3 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400 placeholder:text-cream-400/40"
        />
      </div>

      <FilterRow label="Móðurtegund">
        <Chip active={mother === 'all'} onClick={() => setMother('all')}>
          Allar
        </Chip>
        {MOTHER_SPECIES.map((m) => (
          <Chip key={m} active={mother === m} onClick={() => setMother(m)}>
            {m}
          </Chip>
        ))}
      </FilterRow>
      <FilterRow label="Litur">
        <Chip active={color === 'all'} onClick={() => setColor('all')}>
          Allir
        </Chip>
        {(Object.keys(COLOR_LABEL) as PepperColor[]).map((c) => (
          <Chip
            key={c}
            swatch={COLOR_HEX[c]}
            active={color === c}
            onClick={() => setColor(c)}
          >
            {COLOR_LABEL[c]}
          </Chip>
        ))}
      </FilterRow>

      <div className="flex flex-col gap-2 mt-4">
        {list.map((v) => (
          <VarietyCard key={v.id} v={v} />
        ))}
        {list.length === 0 && (
          <div className="text-sm text-cream-300/60 text-center py-8 border border-dashed border-moss-800/40 rounded-2xl">
            Engin afbrigði passa.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function VarietyCard({ v }: { v: VarietyWithChili }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="text-left rounded-2xl p-3.5 border bg-moss-900/40 border-moss-800/40 hover:bg-moss-900/60 hover:border-moss-600 transition-all"
    >
      <div className="flex items-center gap-3">
        <Chili variety={v.chili} size={48} tilt={-4} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="heading text-base font-semibold text-cream-50">
              {v.commonName}
            </span>
            <Pill tone="cream" size="sm">{v.motherSpecies}</Pill>
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(18,31,20,.55)',
                border: '1px solid rgba(64,104,67,.5)',
                color: 'var(--cream-100)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: COLOR_HEX[v.color],
                }}
              />
              {COLOR_LABEL[v.color]}
            </span>
            {v.shu! > 0 && (
              <Pill tone="cap" size="sm">
                <Flame size={9} /> {formatShu(v.shu!)} SHU
              </Pill>
            )}
          </div>
          <div className="text-[11px] text-cream-300/60 mt-1">
            {v.flavor} · {v.matureHeightCm}cm fullorðin
          </div>
        </div>
      </div>
      {open && (
        <div className="mt-3 pl-[60px] text-[12px] text-cream-300/80 leading-relaxed">
          <div className="mb-1.5">
            <span className="text-cream-400/70">Uppruni:</span> {v.origin}
          </div>
          <div className="mb-1.5">
            <span className="text-cream-400/70">Spírar á:</span>{' '}
            {v.daysToGerminate?.[0]}–{v.daysToGerminate?.[1]}d ·{' '}
            <span className="text-cream-400/70">tilbúin á:</span>{' '}
            {v.daysToHarvest?.[0]}–{v.daysToHarvest?.[1]}d
          </div>
          <div>{v.notes}</div>
        </div>
      )}
    </button>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-cream-400/70 mb-1.5">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors',
        active
          ? 'bg-moss-500 border-moss-400 text-cream-50'
          : 'bg-moss-900/40 border-moss-800/40 text-cream-300 hover:border-moss-600',
      )}
    >
      {swatch && (
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            background: swatch,
            border: '1px solid rgba(255,255,255,.18)',
          }}
        />
      )}
      {children}
    </button>
  );
}
