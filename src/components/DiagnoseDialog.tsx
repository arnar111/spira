import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  Leaf,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pill } from '@/components/ui/Pill';
import { db, newId, type Grow, type Plant } from '@/lib/db';
import { daysSince } from '@/lib/phases';
import { varietyByName } from '@/lib/varieties';
import {
  AiError,
  diagnosePlant,
  resizeImage,
  type Diagnosis,
  type ResizedImage,
  type Severity,
} from '@/lib/ai';

const PHASE_LABEL: Record<string, string> = {
  planning: 'Áætlun',
  germinating: 'Spírun',
  seedling: 'Plöntu',
  vegetative: 'Veg',
  flowering: 'Blómgun',
  fruiting: 'Aldin',
  ripening: 'Þroskast',
  harvest: 'Uppskera',
  overwintering: 'Yfirvetrun',
  dormant: 'Dvali',
  finished: 'Lokið',
};

const SEVERITY: Record<Severity, { label: string; tone: 'moss' | 'cream' | 'cap'; color: string }> = {
  ok: { label: 'Heilbrigð', tone: 'moss', color: 'var(--moss-300)' },
  watch: { label: 'Fylgjast með', tone: 'cream', color: 'var(--cream-400)' },
  act_now: { label: 'Bregðast strax við', tone: 'cap', color: 'var(--cap-400)' },
};

const CONFIDENCE_LABEL = { low: 'lítil vissa', medium: 'nokkur vissa', high: 'mikil vissa' };

export function DiagnoseDialog({
  grow,
  plants,
  onClose,
}: {
  grow: Grow;
  plants: Plant[];
  onClose: () => void;
}) {
  const [plantId, setPlantId] = useState(plants[0]?.id ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [resized, setResized] = useState<ResizedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function pick(f: File | undefined) {
    if (!f) return;
    setError(null);
    setResult(null);
    setResized(null);
    setSaved(false);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const img = await resizeImage(file);
      setResized(img);
      const context = await buildContext(grow, plantId);
      const { diagnosis } = await diagnosePlant(context, img);
      setResult(diagnosis);
    } catch (err) {
      setError(err instanceof AiError ? err.message : 'Eitthvað fór úrskeiðis.');
    } finally {
      setBusy(false);
    }
  }

  async function saveAsLog() {
    if (!result || !resized) return;
    const now = Date.now();
    const pid = plantId || undefined;
    let photoId: string | undefined;
    try {
      photoId = newId();
      await db.photos.add({ id: photoId, plantId: pid, growId: grow.id, blob: resized.blob, takenAt: now });
    } catch {
      photoId = undefined;
    }
    await db.logs.add({
      id: newId(),
      growId: grow.id,
      plantId: pid,
      timestamp: now,
      type: result.suggestedLog.type,
      note: `🔎 Greinir: ${result.suggestedLog.note}`,
      photoId,
    });
    setSaved(true);
  }

  const sev = result ? SEVERITY[result.severity] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 max-h-[88vh] overflow-y-auto scrollbar-none"
        style={{ background: 'rgba(36,56,39,.97)', border: '1px solid rgba(64,104,67,.55)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Eyebrow color="var(--terra-300)">
          <Sparkles size={11} className="inline-block mr-1" />
          Greinir
        </Eyebrow>
        <h3
          className="sp-display"
          style={{ fontSize: 22, color: 'var(--cream-50)', fontWeight: 500, marginTop: 4, marginBottom: 14 }}
        >
          Greina mynd af plöntu
        </h3>

        {plants.length > 1 && (
          <>
            <label className="text-xs text-cream-300/80 mb-1.5 block">Planta</label>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className="w-full mb-3 rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400"
            >
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname || p.variety}
                </option>
              ))}
            </select>
          </>
        )}

        {/* Photo picker / preview */}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {previewUrl ? (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="block w-full rounded-xl overflow-hidden border border-moss-800 mb-3"
          >
            <img src={previewUrl} alt="Planta" className="w-full max-h-56 object-cover" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="w-full mb-3 rounded-xl border border-dashed border-moss-700 bg-moss-950/40 py-8 flex flex-col items-center gap-2 text-cream-300/70 hover:border-moss-500 transition-colors"
          >
            <Camera size={26} className="text-moss-300" />
            <span className="text-sm">Taktu eða veldu mynd</span>
          </button>
        )}

        {!result && (
          <Button size="lg" disabled={!file || busy} onClick={run} className="w-full justify-center">
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Greini…
              </>
            ) : (
              <>
                <Eye size={16} /> Greina mynd
              </>
            )}
          </Button>
        )}

        {error && (
          <div className="mt-3 text-[12px] text-cap-400 flex items-start gap-1.5">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Result */}
        {result && sev && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Pill tone={sev.tone} size="md">{sev.label}</Pill>
            </div>
            <p className="text-[13px] text-cream-100 leading-relaxed">{result.summary}</p>

            {result.likelyIssues.length > 0 && (
              <Block icon={<AlertTriangle size={13} />} title="Líkleg vandamál">
                {result.likelyIssues.map((it, i) => (
                  <div key={i} className="text-[12px] mb-1.5">
                    <span className="text-cream-50 font-medium">{it.name}</span>
                    <span className="text-cream-400/70"> · {CONFIDENCE_LABEL[it.confidence]}</span>
                    <div className="text-cream-300/70 leading-snug">{it.evidence}</div>
                  </div>
                ))}
              </Block>
            )}

            {result.recommendedActions.length > 0 && (
              <Block icon={<Leaf size={13} />} title="Aðgerðir">
                <Bullets items={result.recommendedActions} />
              </Block>
            )}
            {result.whatToCheck.length > 0 && (
              <Block icon={<Eye size={13} />} title="Athugaðu">
                <Bullets items={result.whatToCheck} />
              </Block>
            )}
            {result.positives && result.positives.length > 0 && (
              <Block icon={<CheckCircle2 size={13} color="var(--moss-300)" />} title="Jákvætt">
                <Bullets items={result.positives} tone="moss" />
              </Block>
            )}

            <div className="text-[10px] text-cream-400/50 italic">
              Leiðbeinandi mat út frá mynd — ekki staðgengill fagráðgjafar.
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Loka
              </Button>
              <Button size="sm" disabled={saved} onClick={saveAsLog}>
                {saved ? (
                  <>
                    <Check size={14} /> Vistað
                  </>
                ) : (
                  'Skrá sem nótu'
                )}
              </Button>
            </div>
          </div>
        )}

        {!result && (
          <button
            onClick={onClose}
            className="mt-3 w-full text-center text-[12px] text-cream-300/60 hover:text-cream-100 transition-colors"
          >
            Hætta við
          </button>
        )}
      </div>
    </div>
  );
}

function Block({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-moss-800/50 bg-moss-950/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-moss-300 mb-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Bullets({ items, tone = 'cream' }: { items: string[]; tone?: 'cream' | 'moss' }) {
  const dot = tone === 'moss' ? 'var(--moss-400)' : 'var(--terra-400)';
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-[12px] leading-snug text-cream-300/85">
          <span className="shrink-0 mt-[6px]" style={{ width: 5, height: 5, borderRadius: 999, background: dot }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

async function buildContext(grow: Grow, plantId: string) {
  const plant = plantId ? await db.plants.get(plantId) : undefined;
  const variety = plant ? varietyByName(plant.variety) : undefined;
  const logs = await db.logs.where('growId').equals(grow.id).reverse().sortBy('timestamp');
  const env = await db.environment.where('growId').equals(grow.id).reverse().sortBy('timestamp');
  const last = env[0];
  return {
    variety: plant?.variety,
    category: variety?.category ?? plant?.category,
    phase: plant ? PHASE_LABEL[plant.currentPhase] ?? plant.currentPhase : undefined,
    day: daysSince(grow.startDate),
    location: grow.location,
    targetTempC: grow.targetTempC,
    lastTempC: last?.tempC,
    lastHumidityPct: last?.humidityPct,
    lightOnHours: grow.lightOnHours,
    recentLogs: logs.slice(0, 5).map((l) => (l.note ? `${l.type}: ${l.note}` : l.type)),
  };
}
