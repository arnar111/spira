import { useEffect, useRef, useState, type ComponentType } from 'react';
import {
  Camera,
  ChevronRight,
  Droplet,
  Flame,
  Leaf,
  Move,
  Scissors,
  Sparkles,
  Sprout,
  StickyNote,
  Thermometer,
  Wrench,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  db,
  newId,
  type LogType,
  type Plant,
} from '@/lib/db';
import {
  LOG_FIELDS,
  LOG_TYPE_META,
  formatLogData,
  type LogField,
} from '@/lib/logSchema';
import { addPhotoFromFile, deletePhoto, usePhotoUrl } from '@/lib/photos';
import { cn } from '@/lib/cn';

type IconComponent = ComponentType<{ size?: number | string }>;

/** Maps the icon strings in LOG_TYPE_META to lucide components. */
const ICONS: Record<string, IconComponent> = {
  Droplet,
  Leaf,
  Camera,
  StickyNote,
  Thermometer,
  Flame,
  Scissors,
  Sparkles,
  Sprout,
  Move,
  Wrench,
};

function iconFor(name: string): IconComponent {
  return ICONS[name] ?? StickyNote;
}

const inputClass =
  'w-full rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2 text-sm text-cream-100 outline-none focus:border-moss-400 placeholder:text-cream-400/40';

export function LogComposer({
  growId,
  plants,
  open,
  onClose,
  defaultType,
}: {
  growId: string;
  plants: Plant[];
  open: boolean;
  onClose: () => void;
  defaultType?: LogType;
}): JSX.Element {
  const [type, setType] = useState<LogType>(defaultType ?? 'water');
  const [note, setNote] = useState('');
  const [sel, setSel] = useState<string>('all');
  const [data, setData] = useState<Record<string, string>>({});
  const [photoId, setPhotoId] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Sjálfvirkur fókus á fyrsta merkingarbæra reitinn (1.1) — sett þegar
  // gerð er valin svo við opnum ekki lyklaborð á tegundavalskjánum að óþörfu.
  const firstFieldRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Reset transient state whenever the dialog (re)opens.
  useEffect(() => {
    if (open) {
      setType(defaultType ?? 'water');
      setNote('');
      setSel('all');
      setData({});
      setPhotoId(undefined);
      setBusy(false);
    }
  }, [open, defaultType]);

  // Þegar gluggi opnast eða gerð er valin: settu fókus á fyrsta reitinn
  // (eða athugasemd ef gerðin hefur enga reiti). Sleppum mynd — hún opnar
  // skráarvalið beint. Lítill biðtími svo Modal-hreyfingin nái að teikna.
  useEffect(() => {
    if (!open || type === 'photo') return;
    const id = window.setTimeout(() => {
      const target = firstFieldRef.current ?? noteRef.current;
      target?.focus();
    }, 80);
    return () => window.clearTimeout(id);
  }, [open, type]);

  // Clear structured field values when switching log type.
  function selectType(next: LogType) {
    setType(next);
    setData({});
    if (next === 'photo') {
      fileRef.current?.click();
    }
  }

  function setField(key: string, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (photoId) {
      await deletePhoto(photoId).catch(() => undefined);
    }
    const id = await addPhotoFromFile(file, {
      growId,
      plantId: sel === 'all' ? undefined : sel,
    });
    setPhotoId(id);
  }

  async function removePhoto() {
    if (photoId) {
      await deletePhoto(photoId).catch(() => undefined);
    }
    setPhotoId(undefined);
  }

  function buildData(): Record<string, unknown> | undefined {
    const fields = LOG_FIELDS[type] ?? [];
    const out: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = data[field.key];
      if (raw === undefined) continue;
      const trimmed = raw.trim();
      if (trimmed === '') continue;
      if (field.kind === 'number') {
        const n = Number(trimmed);
        if (Number.isFinite(n)) out[field.key] = n;
      } else {
        out[field.key] = trimmed;
      }
    }
    return Object.keys(out).length ? out : undefined;
  }

  async function submit() {
    setBusy(true);
    const builtData = buildData();
    const plantId = sel === 'all' ? undefined : sel;
    // Myndin er búin til um leið og hún er valin (þá getur plantan enn verið
    // óvalin), svo við samstillum plantId hennar við lokavalið hér — annars
    // situr myndin eftir með rangt/ótengt plantId og Heilsa finnur hana ekki.
    if (photoId) {
      await db.photos.update(photoId, { plantId }).catch(() => undefined);
    }
    await db.logs.add({
      id: newId(),
      growId,
      plantId,
      timestamp: Date.now(),
      type,
      note: note.trim() || undefined,
      data: builtData,
      photoId,
    });
    setBusy(false);
    onClose();
  }

  const quick = LOG_TYPE_META.filter((m) => m.quick);
  const rest = LOG_TYPE_META.filter((m) => !m.quick);
  const fields = LOG_FIELDS[type] ?? [];

  return (
    <Modal open={open} onClose={onClose} eyebrow="Ný skráning" title="Skrá viðburð">
      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {quick.map((m) => {
          const Icon = iconFor(m.icon);
          const active = type === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => selectType(m.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-2xl border py-3 transition-colors',
                active
                  ? 'bg-moss-500 border-moss-400 text-cream-50'
                  : 'bg-moss-900/40 border-moss-800/40 text-cream-200 hover:border-moss-600',
              )}
            >
              <Icon size={18} />
              <span className="text-[11px] font-medium">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Full type chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {rest.map((m) => {
          const Icon = iconFor(m.icon);
          const active = type === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => selectType(m.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors',
                active
                  ? 'bg-moss-500 border-moss-400 text-cream-50'
                  : 'bg-moss-900/40 border-moss-800/40 text-cream-300 hover:border-moss-600',
              )}
            >
              <Icon size={12} />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Plant selector */}
      <label className="text-xs text-cream-300/80 mb-1.5 block">Planta</label>
      <select
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        className="w-full mb-3 rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400"
      >
        <option value="all">Öll ræktunin</option>
        {plants.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nickname || p.variety}
          </option>
        ))}
      </select>

      {/* Structured fields */}
      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {fields.map((field, i) => (
            <Field
              key={field.key}
              field={field}
              value={data[field.key] ?? ''}
              onChange={(v) => setField(field.key, v)}
              inputRef={i === 0 ? firstFieldRef : undefined}
            />
          ))}
        </div>
      )}

      {/* Photo attach */}
      <div className="mb-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPickFile}
        />
        {photoId ? (
          <div className="flex items-center gap-3">
            <PhotoPreview photoId={photoId} />
            <button
              type="button"
              onClick={removePhoto}
              className="inline-flex items-center gap-1.5 rounded-full border border-moss-800/50 bg-moss-900/40 px-3 py-1.5 text-xs text-cream-300 hover:border-terra-400/60 hover:text-cream-100 transition-colors"
            >
              <X size={12} />
              Fjarlægja mynd
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-moss-700/60 bg-moss-900/30 px-3 py-2.5 text-sm text-cream-200 hover:border-moss-500 hover:text-cream-50 transition-colors w-full justify-center"
          >
            <Camera size={16} />
            Bæta við mynd
          </button>
        )}
      </div>

      {/* Freeform note */}
      <label className="text-xs text-cream-300/80 mb-1.5 block">Athugasemd</label>
      <textarea
        ref={noteRef}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="t.d. blöð heilbrigð, byrjar að blómgast"
        className={inputClass}
      />

      <div className="mt-5 flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Hætta við
        </Button>
        <Button size="sm" disabled={busy} onClick={submit}>
          Vista
          <ChevronRight size={14} />
        </Button>
      </div>
    </Modal>
  );
}

function Field({
  field,
  value,
  onChange,
  inputRef,
}: {
  field: LogField;
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement | HTMLSelectElement>;
}): JSX.Element {
  const isFullWidth = field.kind === 'text' || field.kind === 'select';
  return (
    <div className={isFullWidth ? 'col-span-2' : undefined}>
      <label className="text-[11px] text-cream-300/70 mb-1 block">
        {field.label}
        {field.unit ? <span className="text-cream-400/50"> ({field.unit})</span> : null}
      </label>
      {field.kind === 'select' ? (
        <select
          ref={inputRef as React.Ref<HTMLSelectElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="relative">
          <input
            ref={inputRef as React.Ref<HTMLInputElement>}
            type={field.kind === 'number' ? 'number' : 'text'}
            inputMode={field.kind === 'number' ? 'decimal' : undefined}
            value={value}
            min={field.min}
            max={field.max}
            step={field.step}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={cn(inputClass, field.unit ? 'pr-12' : undefined)}
          />
          {field.unit && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-cream-400/50">
              {field.unit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function PhotoPreview({ photoId }: { photoId: string }): JSX.Element {
  const url = usePhotoUrl(photoId);
  return (
    <div
      className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-moss-800/50 bg-moss-950/60"
      aria-hidden={!url}
    >
      {url && <img src={url} alt="" className="w-full h-full object-cover" />}
    </div>
  );
}

/** Compact palette pills for a log entry's structured data. */
export function LogDataChips({
  type,
  data,
}: {
  type: LogType;
  data?: Record<string, unknown>;
}): JSX.Element | null {
  const chips = formatLogData(type, data);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {chips.map((chip, i) => (
        <span
          key={`${chip}-${i}`}
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            background: 'rgba(84,130,85,.18)',
            color: '#9fbf9d',
            border: '1px solid rgba(84,130,85,.4)',
          }}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

/** Small rounded thumbnail for a log entry's attached photo. */
export function LogThumbnail({
  photoId,
  onOpen,
}: {
  photoId?: string;
  onOpen?: () => void;
}): JSX.Element | null {
  const url = usePhotoUrl(photoId);
  if (!photoId) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className="mt-1.5 block w-16 h-16 rounded-xl overflow-hidden border border-moss-800/50 bg-moss-950/60 disabled:cursor-default"
    >
      {url ? (
        <img src={url} alt="Skráð mynd" className="w-full h-full object-cover" />
      ) : (
        <span className="flex w-full h-full items-center justify-center text-cream-400/40">
          <Camera size={16} />
        </span>
      )}
    </button>
  );
}
