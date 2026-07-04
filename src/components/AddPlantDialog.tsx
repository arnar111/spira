import { useEffect, useMemo, useState } from 'react';
import { Check, Flame, Search, Sprout } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PlantGlyph } from '@/components/PlantGlyph';
import {
  db,
  newId,
  type Grow,
  type GrowPhase,
  type StartedFrom,
} from '@/lib/db';
import {
  BUILT_IN_VARIETIES,
  COLOR_HEX,
  COLOR_LABEL,
  formatShu,
  isPepper,
  isTomato,
  suggestForLocation,
  type Variety,
} from '@/lib/varieties';
import type { LocationKey } from '@/lib/locations';
import { cn } from '@/lib/cn';

const PHASE_OPTIONS: { id: GrowPhase; label: string }[] = [
  { id: 'planning', label: 'Áætlun' },
  { id: 'germinating', label: 'Spírun' },
  { id: 'seedling', label: 'Plöntu' },
  { id: 'vegetative', label: 'Veg' },
  { id: 'flowering', label: 'Blómgun' },
  { id: 'fruiting', label: 'Aldin' },
  { id: 'ripening', label: 'Þroskast' },
  { id: 'harvest', label: 'Uppskera' },
];

const STARTED_FROM: { id: StartedFrom; label: string }[] = [
  { id: 'seed', label: 'Fræ' },
  { id: 'seedling', label: 'Forræktuð' },
  { id: 'clone', label: 'Græðlingur' },
  { id: 'purchased', label: 'Keypt' },
];

type CatFilter = 'all' | 'pepper' | 'tomato' | 'strawberry' | 'potato' | 'herb' | 'leafy';

export function AddPlantDialog({
  grow,
  open,
  onClose,
}: {
  grow: Grow;
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  const [varietyId, setVarietyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<CatFilter>('all');
  const [nickname, setNickname] = useState('');
  const [startedFrom, setStartedFrom] = useState<StartedFrom>('seed');
  const [phase, setPhase] = useState<GrowPhase>('planning');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setVarietyId(null);
      setSearch('');
      setCat('all');
      setNickname('');
      setStartedFrom('seed');
      setPhase('planning');
      setBusy(false);
    }
  }, [open]);

  // Afbrigði sem mælt er með fyrir staðsetningu ræktunarinnar raðast efst.
  const suggestedIds = useMemo(() => {
    if (!grow.locationKey) return new Set<string>();
    return new Set(suggestForLocation(grow.locationKey as LocationKey).map((v) => v.id));
  }, [grow.locationKey]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return BUILT_IN_VARIETIES.filter((v) => (cat === 'all' ? true : v.category === cat))
      .filter((v) => (q ? v.commonName.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        const sa = suggestedIds.has(a.id) ? 0 : 1;
        const sb = suggestedIds.has(b.id) ? 0 : 1;
        if (sa !== sb) return sa - sb;
        return a.commonName.localeCompare(b.commonName, 'is');
      });
  }, [search, cat, suggestedIds]);

  async function submit() {
    if (!varietyId) return;
    const variety = BUILT_IN_VARIETIES.find((v) => v.id === varietyId);
    if (!variety) return;
    setBusy(true);
    const now = Date.now();
    await db.plants.add({
      id: newId(),
      growId: grow.id,
      varietyId: variety.id,
      variety: variety.commonName,
      nickname: nickname.trim() || undefined,
      category: variety.category,
      startedFrom,
      sowDate: now,
      currentPhase: phase,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
    // Snertu ræktunina svo samstilling og „uppfært" tími fylgi með.
    await db.grows.update(grow.id, { updatedAt: now });
    setBusy(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} eyebrow="Ný planta" title="Bæta við plöntu">
      {/* Tegundasía */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {([
          { id: 'all', label: 'Allt' },
          { id: 'pepper', label: 'Pipar' },
          { id: 'tomato', label: 'Tómatar' },
          { id: 'strawberry', label: 'Jarðarber' },
          { id: 'potato', label: 'Kartöflur' },
          { id: 'herb', label: 'Kryddjurtir' },
          { id: 'leafy', label: 'Salat' },
        ] as { id: CatFilter; label: string }[]).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs transition-colors',
              cat === c.id
                ? 'bg-moss-600 border-moss-400 text-cream-50'
                : 'bg-moss-900/40 border-moss-800/40 text-cream-300 hover:border-moss-600',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Leit */}
      <div className="relative mb-3">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cream-400/50"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Leita að afbrigði…"
          className="w-full rounded-xl bg-moss-950/60 border border-moss-800 pl-9 pr-3 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400 placeholder:text-cream-400/40"
        />
      </div>

      {/* Afbrigðalisti */}
      <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
        {list.length === 0 && (
          <div className="text-sm text-cream-300/60 text-center py-6 border border-dashed border-moss-800/40 rounded-2xl">
            Ekkert afbrigði fannst.
          </div>
        )}
        {list.map((v) => (
          <VarietyOption
            key={v.id}
            v={v}
            selected={varietyId === v.id}
            suggested={suggestedIds.has(v.id)}
            onClick={() => setVarietyId(v.id)}
          />
        ))}
      </div>

      {/* Smáatriði */}
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs text-cream-300/80 mb-1.5 flex items-center gap-1.5">
            <Sprout size={13} className="text-moss-300" />
            Gælunafn (valkvætt)
          </label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="t.d. Helios"
            className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2 text-sm text-cream-100 outline-none focus:border-moss-400 placeholder:text-cream-400/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-cream-300/80 mb-1.5 block">Upphaf</label>
            <select
              value={startedFrom}
              onChange={(e) => setStartedFrom(e.target.value as StartedFrom)}
              className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400"
            >
              {STARTED_FROM.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-cream-300/80 mb-1.5 block">Fasi</label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value as GrowPhase)}
              className="w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400"
            >
              {PHASE_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Hætta við
        </Button>
        <Button size="sm" disabled={!varietyId || busy} onClick={submit}>
          Bæta við
          <Check size={14} />
        </Button>
      </div>
    </Modal>
  );
}

function VarietyOption({
  v,
  selected,
  suggested,
  onClick,
}: {
  v: Variety;
  selected: boolean;
  suggested: boolean;
  onClick: () => void;
}): JSX.Element {
  const swatch = isPepper(v) ? v.color : isTomato(v) ? v.fruitColor : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 rounded-2xl p-2.5 border transition-all',
        selected
          ? 'bg-moss-800/60 border-moss-400'
          : 'bg-moss-900/40 border-moss-800/40 hover:border-moss-600',
      )}
    >
      <div
        className={cn(
          'shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
          selected ? 'bg-moss-400 border-moss-400' : 'border-moss-600',
        )}
      >
        {selected && <Check size={13} className="text-moss-950" />}
      </div>
      <PlantGlyph variety={v} name={v.commonName} size={36} tilt={-4} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-cream-50 text-sm font-medium">{v.commonName}</span>
          {suggested && (
            <span className="text-[9px] uppercase tracking-wider text-moss-300 bg-moss-800/60 px-1.5 py-0.5 rounded-full">
              Mælt með
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {swatch && (
            <span
              className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider"
              style={{ color: 'var(--cream-300)' }}
            >
              <span
                style={{ width: 7, height: 7, borderRadius: 999, background: COLOR_HEX[swatch] }}
              />
              {COLOR_LABEL[swatch]}
            </span>
          )}
          {isPepper(v) && v.shu > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider text-capsicum-400">
              <Flame size={9} />
              {formatShu(v.shu)} SHU
            </span>
          )}
          {isTomato(v) && (
            <span className="text-[9px] uppercase tracking-wider text-terra-300">Tómatur</span>
          )}
        </div>
      </div>
    </button>
  );
}
