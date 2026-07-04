import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, ChevronDown, ChevronLeft, ChevronRight, History, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { db, newId, type LogEntry, type LogType, type Plant } from '@/lib/db';
import { LOG_FIELDS, LOG_TYPE_META, formatLogData } from '@/lib/logSchema';
import { addPhotoFromFile, deletePhoto, usePhotoUrl } from '@/lib/photos';
import { announce } from '@/lib/announce';
import { celebrate } from '@/lib/celebrate';
import { relativeTime } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { EASE_OUT } from '@/lib/motion';
import { FieldInput } from './fields';
import { TypePicker } from './TypePicker';
import { inputClass, logIcon } from './shared';

/** Breytir vistuðum log-gögnum í strengjaformið sem formið notar (1.4). */
function stringifyLogData(data?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data) return out;
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    out[key] = String(value);
  }
  return out;
}

type Step = 'pick' | 'form';

/**
 * Skráningarglugginn (5.x yfirhalning): tveggja skrefa flæði í stað eins
 * yfirfulls skjás — (1) hreint tegundaval í hópum, (2) einbeitt form fyrir
 * valda tegund með þrepahnöppum, flögu-vali, „sama og síðast"-flýtileið og
 * ítarlegri reitum á bak við „Meira"-fellingu. `defaultType` (t.d. frá ráði
 * Rósar eða dagskrá) stekkur beint í formið; breytingarhamur sömuleiðis.
 */
export function LogComposer({
  growId,
  plants,
  open,
  onClose,
  defaultType,
  defaultPlantId,
  defaultData,
  existing,
}: {
  growId: string;
  plants: Plant[];
  open: boolean;
  onClose: () => void;
  defaultType?: LogType;
  /** Forvalin planta (t.d. þegar ráð Rósar á við tiltekna plöntu). */
  defaultPlantId?: string;
  /** Forútfyllt skipulögð gögn (t.d. rétt Véritable-verk af flýtiskráningu ráðs). */
  defaultData?: Record<string, string>;
  /** Þegar sett: gluggi opnast forfylltur og vistar með put() (1.4 — breyta skráningu). */
  existing?: LogEntry;
}): JSX.Element {
  // Byrjunarskref reiknað samstundis (ekki í effekti) svo defaultType/existing
  // opni formið beint án þess að tegundavalið blikki fyrst.
  const [step, setStep] = useState<Step>(() =>
    existing || defaultType ? 'form' : 'pick',
  );
  const [type, setType] = useState<LogType>(existing?.type ?? defaultType ?? 'water');
  const [note, setNote] = useState(existing?.note ?? '');
  const [sel, setSel] = useState<string>(existing?.plantId ?? defaultPlantId ?? 'all');
  const [data, setData] = useState<Record<string, string>>(() =>
    existing ? stringifyLogData(existing.data) : { ...(defaultData ?? {}) },
  );
  const [photoId, setPhotoId] = useState<string | undefined>(existing?.photoId);
  const [busy, setBusy] = useState(false);
  const [moreOpen, setMoreOpen] = useState(() => {
    if (!existing) return false;
    const adv = (LOG_FIELDS[existing.type] ?? []).filter((f) => f.advanced);
    return adv.some((f) => existing.data?.[f.key] !== undefined);
  });
  const fileRef = useRef<HTMLInputElement>(null);
  // Sjálfvirkur fókus á fyrsta merkingarbæra reitinn (1.1) — aðeins í formskrefi.
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const isEdit = !!existing;

  // Reset transient state whenever the dialog (re)opens. Í breytingarham
  // forfyllum við úr fyrirliggjandi skráningu og opnum „Meira" ef ítarlegri
  // reitir bera gildi. defaultType stekkur beint í formið.
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setType(existing.type);
      setNote(existing.note ?? '');
      setSel(existing.plantId ?? 'all');
      setData(stringifyLogData(existing.data));
      setPhotoId(existing.photoId);
      setStep('form');
      const adv = (LOG_FIELDS[existing.type] ?? []).filter((f) => f.advanced);
      setMoreOpen(adv.some((f) => existing.data?.[f.key] !== undefined));
    } else {
      setType(defaultType ?? 'water');
      setNote('');
      setSel(defaultPlantId ?? 'all');
      setData({ ...(defaultData ?? {}) });
      setPhotoId(undefined);
      setStep(defaultType ? 'form' : 'pick');
      setMoreOpen(false);
    }
    setBusy(false);
  }, [open, defaultType, defaultPlantId, defaultData, existing]);

  // Í formskrefi: fókus á fyrsta reitinn (eða athugasemd ef engir reitir).
  // Sleppum mynd — hún opnar skráarvalið beint. Lítill biðtími svo
  // Modal-/skref-hreyfingin nái að teikna.
  useEffect(() => {
    if (!open || step !== 'form' || type === 'photo') return;
    const id = window.setTimeout(() => {
      const target = firstFieldRef.current ?? noteRef.current;
      target?.focus();
    }, 120);
    return () => window.clearTimeout(id);
  }, [open, step, type]);


  // Síðasta skráning sömu tegundar í þessari ræktun — „sama og síðast".
  const lastOfType = useLiveQuery(async () => {
    if (!open || isEdit) return undefined;
    const rows = await db.logs
      .where('growId')
      .equals(growId)
      .and((l) => l.type === type)
      .reverse()
      .sortBy('timestamp');
    return rows[0];
  }, [open, growId, type, isEdit]);

  function pickType(next: LogType) {
    setType(next);
    setData({});
    setMoreOpen(false);
    setStep('form');
    if (next === 'photo') {
      fileRef.current?.click();
    }
  }

  function backToPicker() {
    setStep('pick');
    setData({});
    setMoreOpen(false);
  }

  function setField(key: string, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (photoId) {
      await deletePhoto(photoId).catch((err) =>
        console.warn('[spira] gat ekki eytt eldri mynd', err),
      );
    }
    const id = await addPhotoFromFile(file, {
      growId,
      plantId: sel === 'all' ? undefined : sel,
    });
    setPhotoId(id);
  }

  async function removePhoto() {
    if (photoId) {
      await deletePhoto(photoId).catch((err) =>
        console.warn('[spira] gat ekki eytt mynd', err),
      );
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
      await db.photos
        .update(photoId, { plantId })
        .catch((err) => console.warn('[spira] gat ekki tengt mynd við plöntu', err));
    }
    if (existing) {
      await db.logs.put({
        ...existing,
        growId,
        plantId,
        type,
        note: note.trim() || undefined,
        data: builtData,
        photoId,
      });
    } else {
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
    }
    setBusy(false);
    announce(existing ? 'Skráning uppfærð' : 'Skráning vistuð');
    if (!existing) celebrate(type);
    onClose();
  }

  const meta = LOG_TYPE_META.find((m) => m.id === type);
  const TypeIcon = logIcon(meta?.icon ?? 'StickyNote');
  const fields = LOG_FIELDS[type] ?? [];
  const primaryFields = fields.filter((f) => !f.advanced);
  const advancedFields = fields.filter((f) => f.advanced);
  const lastChips = lastOfType ? formatLogData(type, lastOfType.data) : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={isEdit ? 'Breyta skráningu' : 'Ný skráning'}
      title={isEdit ? 'Breyta viðburði' : 'Skrá viðburð'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {step === 'pick' ? (
          <motion.div
            key="pick"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            <TypePicker onPick={pickType} />
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            {/* Haus: valin tegund + til baka í tegundaval (ekki í breytingarham) */}
            <div className="flex items-center gap-2 mb-4">
              {!isEdit && (
                <button
                  type="button"
                  onClick={backToPicker}
                  aria-label="Velja aðra tegund"
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-cream-300 hover:text-cream-50 border border-moss-800/50 bg-moss-900/40 transition-all duration-150 active:scale-95"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{
                  background: 'rgba(84,130,85,.18)',
                  border: '1px solid rgba(84,130,85,.4)',
                }}
              >
                <TypeIcon size={15} />
                <span className="text-sm font-medium text-cream-50">{meta?.label ?? type}</span>
              </div>
            </div>

            {/* Planta — flögur í stað falllista */}
            <div className="mb-3">
              <div className="text-xs text-cream-300/80 mb-1.5">Planta</div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Planta">
                <PlantChip
                  label="Öll ræktunin"
                  active={sel === 'all'}
                  onClick={() => setSel('all')}
                />
                {plants.map((p) => (
                  <PlantChip
                    key={p.id}
                    label={p.nickname || p.variety}
                    active={sel === p.id}
                    onClick={() => setSel(p.id)}
                  />
                ))}
              </div>
            </div>

            {/* „Sama og síðast" — flýtileið fyrir daglega taktinn */}
            {!isEdit && lastOfType && lastChips.length > 0 && (
              <div
                className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px]"
                style={{
                  background: 'rgba(18,31,20,.4)',
                  border: '1px dashed rgba(64,104,67,.45)',
                }}
              >
                <History size={13} className="shrink-0 text-cream-400/70" />
                <span className="min-w-0 flex-1 truncate text-cream-300/80">
                  Síðast {relativeTime(lastOfType.timestamp)}: {lastChips.join(' · ')}
                </span>
                <button
                  type="button"
                  onClick={() => setData(stringifyLogData(lastOfType.data))}
                  className="shrink-0 rounded-full border border-moss-700 bg-moss-800/60 px-2.5 py-1 text-[11px] font-medium text-cream-100 transition-all duration-150 hover:border-moss-500 active:scale-95"
                >
                  Nota
                </button>
              </div>
            )}

            {/* Aðal-reitir tegundarinnar */}
            {primaryFields.length > 0 && (
              <div className="flex flex-col gap-2.5 mb-3">
                {primaryFields.map((field, i) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={data[field.key] ?? ''}
                    onChange={(v) => setField(field.key, v)}
                    inputRef={i === 0 && field.kind !== 'select' ? firstFieldRef : undefined}
                  />
                ))}
              </div>
            )}

            {/* Ítarlegri reitir á bak við fellingu */}
            {advancedFields.length > 0 && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  className="flex w-full items-center gap-1.5 text-[12px] text-cream-300/80 hover:text-cream-100 transition-colors py-1"
                >
                  <ChevronDown
                    size={14}
                    className={cn('transition-transform duration-200', moreOpen && 'rotate-180')}
                  />
                  Meira ({advancedFields.map((f) => f.label).join(', ')})
                </button>
                <AnimatePresence initial={false}>
                  {moreOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: EASE_OUT }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-2.5 pt-2">
                        {advancedFields.map((field) => (
                          <FieldInput
                            key={field.key}
                            field={field}
                            value={data[field.key] ?? ''}
                            onChange={(v) => setField(field.key, v)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Photo attach */}
            <div className="mb-3">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Falinn skráar-reitur — alltaf tengdur svo myndaval virki úr báðum
          skrefum, en AFTAST svo hann taki ekki upphafsfókus gluggans.
          Ekkert `capture` — svo farsímar bjóði bæði myndavél OG myndasafn. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickFile}
      />
    </Modal>
  );
}

function PlantChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs transition-all duration-150 active:scale-95',
        active
          ? 'bg-moss-600 border-moss-400 text-cream-50'
          : 'bg-moss-900/40 border-moss-800/40 text-cream-300 hover:border-moss-600',
      )}
    >
      {label}
    </button>
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
