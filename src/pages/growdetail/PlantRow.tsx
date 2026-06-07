import { BookOpen, Images } from 'lucide-react';
import { PlantGlyph } from '@/components/PlantGlyph';
import { db, newId, type GrowPhase, type Plant } from '@/lib/db';
import {
  COLOR_HEX,
  COLOR_LABEL,
  formatShu,
  isPepper,
  isPotato,
  isStrawberry,
  isTomato,
  resolveCare,
  varietyByName,
} from '@/lib/varieties';
import { PHASE_OPTIONS } from './shared';

/** Ein plöntu-röð í „Plöntur" hluta GrowDetail: tákn, merki, fasaval og aðgerðir. */
export function PlantRow({
  plant,
  day,
  onOpenPhotos,
  onOpenCare,
}: {
  plant: Plant;
  day: number;
  onOpenPhotos: (plant: Plant) => void;
  onOpenCare: (plant: Plant) => void;
}) {
  const variety = varietyByName(plant.variety);
  const phase = PHASE_OPTIONS.find((p) => p.id === plant.currentPhase);
  const hasCareGuide = resolveCare(variety) !== undefined;

  async function setPhase(p: GrowPhase) {
    await db.plants.update(plant.id, { currentPhase: p, updatedAt: Date.now() });
    await db.logs.add({
      id: newId(),
      growId: plant.growId,
      plantId: plant.id,
      timestamp: Date.now(),
      type: 'phase_change',
      note: `Færðist í ${PHASE_OPTIONS.find((x) => x.id === p)?.label ?? p}`,
    });
  }

  const swatch = isPepper(variety)
    ? variety.color
    : isTomato(variety) || isStrawberry(variety)
      ? variety.fruitColor
      : isPotato(variety)
        ? variety.skinColor
        : undefined;
  return (
    <div className="flex items-center gap-3 rounded-2xl p-3 border bg-moss-900/40 border-moss-800/40">
      <PlantGlyph variety={variety} name={plant.variety} size={44} tilt={-4} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-cream-50 font-medium text-sm">
            {plant.nickname || plant.variety}
          </span>
          {swatch && (
            <span
              className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(18,31,20,.55)',
                border: '1px solid rgba(64,104,67,.5)',
                color: 'var(--cream-100)',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: COLOR_HEX[swatch],
                }}
              />
              {COLOR_LABEL[swatch]}
            </span>
          )}
          {isPepper(variety) && variety.shu > 0 && (
            <span className="text-[9px] uppercase tracking-wider text-capsicum-400">
              {formatShu(variety.shu)} SHU
            </span>
          )}
          {isTomato(variety) && (
            <span className="text-[9px] uppercase tracking-wider text-terra-300">
              {variety.fruitWeightG}g · {variety.fruitShape.toLowerCase()}
            </span>
          )}
          {isStrawberry(variety) && (
            <span className="text-[9px] uppercase tracking-wider text-capsicum-400">
              {variety.fruitWeightG}g ber
            </span>
          )}
          {isPotato(variety) && (
            <span className="text-[9px] uppercase tracking-wider text-moss-300">
              {variety.use}
            </span>
          )}
        </div>
        <div className="text-[10px] text-cream-400/60 mt-0.5">
          {plant.variety} · D{day}
        </div>
        <select
          value={plant.currentPhase}
          onChange={(e) => setPhase(e.target.value as GrowPhase)}
          aria-label={`Fasi fyrir ${plant.nickname || plant.variety}`}
          className="mt-1 min-h-[40px] bg-moss-950/60 border border-moss-800 rounded-lg px-2.5 py-2 text-sm text-cream-100 outline-none focus:border-moss-400"
        >
          {PHASE_OPTIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[10px] text-cream-300/60 uppercase tracking-wider">
          {phase?.label ?? plant.currentPhase}
        </span>
        <div className="flex gap-1">
          {hasCareGuide && (
            <button
              type="button"
              onClick={() => onOpenCare(plant)}
              aria-label={`Umhirða fyrir ${plant.nickname || plant.variety}`}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-cream-300/70 hover:text-cream-100 transition-colors"
              style={{ background: 'rgba(231,217,168,.08)' }}
            >
              <BookOpen size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenPhotos(plant)}
            aria-label={`Myndir af ${plant.nickname || plant.variety}`}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-cream-300/70 hover:text-cream-100 transition-colors"
            style={{ background: 'rgba(231,217,168,.08)' }}
          >
            <Images size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
