import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Calendar, Flame, MapPin, Plus, Ruler, Sprout, Thermometer } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { db, type Grow, type Plant } from '@/lib/db';

export function Home() {
  const grows = useLiveQuery(() => db.grows.toArray());
  const plants = useLiveQuery(() => db.plants.toArray());

  if (grows === undefined) {
    return null;
  }

  const activeGrows = grows.filter((g) => !g.archived);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="px-5 sm:px-8 lg:px-12 py-6 lg:py-10 max-w-6xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-moss-300 mb-2">Heim</p>
          <h1 className="heading text-4xl sm:text-5xl font-semibold text-cream-50">
            Ræktanir
          </h1>
        </div>
        <Button variant="outline" size="md" disabled>
          <Plus size={18} />
          Ný ræktun
        </Button>
      </div>

      {activeGrows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {activeGrows.map((grow) => (
            <GrowCard
              key={grow.id}
              grow={grow}
              plants={(plants ?? []).filter((p) => p.growId === grow.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <PhaseTeaser
          eyebrow="Fasi 2"
          title="Grow journal"
          desc="Daglegt log, vökva/næra, mynda-tímalína, fasa-tracker."
        />
        <PhaseTeaser
          eyebrow="Fasi 3"
          title="Umhverfi + innsýn"
          desc="Hita- og rakaskráning, áminningar, greiningarhjálp."
        />
        <PhaseTeaser
          eyebrow="Fasi 4"
          title="Uppskera"
          desc="Þyngd per pod, ár-til-árs samanburður, sósu-ledger."
        />
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <Card className="text-center py-12">
      <Sprout className="mx-auto text-moss-300 mb-4" size={48} />
      <h2 className="heading text-2xl font-semibold text-cream-50 mb-2">
        Engar ræktanir ennþá
      </h2>
      <p className="text-cream-300/70 mb-6">
        Ný ræktun bætist við þegar þú klárar setup wizard.
      </p>
    </Card>
  );
}

function GrowCard({ grow, plants }: { grow: Grow; plants: Plant[] }) {
  const dim =
    grow.spaceWidthCm && grow.spaceDepthCm
      ? `${grow.spaceWidthCm}×${grow.spaceDepthCm}${grow.spaceHeightCm ? `×${grow.spaceHeightCm}` : ''} cm`
      : null;

  const startDate = new Date(grow.startDate);
  const daysIn = Math.floor((Date.now() - grow.startDate) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="space-y-4 cursor-pointer hover:border-moss-500/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="text-capsicum-400" size={16} />
              <span className="text-xs uppercase tracking-wider text-capsicum-400">
                {labelForCategory(grow.category)}
              </span>
            </div>
            <h3 className="heading text-2xl font-semibold text-cream-50">{grow.name}</h3>
          </div>
          <div className="text-right">
            <div className="text-xs text-cream-400/60">Dagur</div>
            <div className="heading text-2xl font-semibold text-moss-200">{daysIn}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat icon={MapPin} label="Staður" value={grow.location} />
          {dim && <Stat icon={Ruler} label="Stærð" value={dim} />}
          {grow.targetTempC && (
            <Stat icon={Thermometer} label="Hiti" value={`${grow.targetTempC}°C`} />
          )}
          <Stat
            icon={Calendar}
            label="Hóf"
            value={startDate.toLocaleDateString('is-IS', { day: 'numeric', month: 'short' })}
          />
        </div>

        {grow.fixture && (
          <div className="text-xs text-cream-400/70 border-t border-moss-800/40 pt-3">
            <span className="text-cream-300">Ljós:</span> {grow.fixture}
          </div>
        )}

        <div>
          <div className="text-xs uppercase tracking-wider text-cream-400/60 mb-2">
            Plöntur ({plants.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {plants.map((p) => (
              <span
                key={p.id}
                className="text-xs bg-moss-800/60 text-cream-200 px-2.5 py-1 rounded-full"
              >
                {p.variety}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-moss-300 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-cream-400/60">{label}</div>
        <div className="text-cream-100 truncate">{value}</div>
      </div>
    </div>
  );
}

function PhaseTeaser({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-moss-700/50 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-terracotta-400/80 mb-1.5">
        {eyebrow}
      </p>
      <h3 className="heading text-lg font-semibold text-cream-100 mb-1">{title}</h3>
      <p className="text-sm text-cream-300/60">{desc}</p>
    </div>
  );
}

function labelForCategory(c: Grow['category']): string {
  switch (c) {
    case 'pepper':
      return 'Pipur';
    case 'tomato':
      return 'Tómatar';
    case 'herb':
      return 'Krydd';
    case 'leafy':
      return 'Salat';
    case 'fruit':
      return 'Ávextir';
    case 'houseplant':
      return 'Pottaplanta';
    default:
      return 'Annað';
  }
}
