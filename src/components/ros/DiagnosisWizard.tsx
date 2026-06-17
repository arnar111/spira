import { useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, RefreshCw, Search, X } from 'lucide-react';
import { RosAvatar } from '@/components/ros/RosAvatar';
import {
  db,
  newId,
  type Grow,
  type Plant,
  type LogEntry,
  type HarvestEntry,
} from '@/lib/db';
import { addPhotoFromFile, getPhotoBlob, usePhotoUrl } from '@/lib/photos';
import { buildContextDigest, plantLabel } from '@/lib/ros/engine';
import {
  SYMPTOMS,
  buildDiagnosisPrompt,
  parseDiagnosisTitle,
  suggestLogType,
} from '@/lib/ros/diagnosis';
import { askRos, blobToInlineImage } from '@/lib/ros/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * „Greining" — leiðsögn Rósar við meindýr/sjúkdóma. Notandinn velur plöntu (eða
 * alla ræktunina), merkir við einkenni, getur bætt mynd og athugasemd, og fær
 * markvissa greiningu sem hægt er að skrá beint í dagbókina.
 */
export function DiagnosisTab({
  grow,
  plants,
  logs,
  harvests,
}: {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
}): JSX.Element {
  const activePlants = useMemo(() => plants.filter((p) => !p.archived), [plants]);

  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const selectedPlant = selectedPlantId
    ? activePlants.find((p) => p.id === selectedPlantId)
    : undefined;

  const toggleSymptom = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }, []);

  const onPickPhoto = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (fileRef.current) fileRef.current.value = '';
      if (!file) return;
      try {
        const id = await addPhotoFromFile(file, {
          growId: grow.id,
          plantId: selectedPlant?.id,
        });
        setPhotoId(id);
      } catch {
        setError('Náði ekki að lesa myndina. Reyndu aðra mynd.');
      }
    },
    [grow.id, selectedPlant?.id],
  );

  const canRun = (selectedIds.length > 0 || !!photoId) && !busy;

  const runDiagnosis = useCallback(async () => {
    if (!canRun) return;
    setBusy(true);
    setError(null);
    setReply(null);
    setLogged(false);
    try {
      const symptoms = SYMPTOMS.filter((s) => selectedIds.includes(s.id));

      let images: Awaited<ReturnType<typeof blobToInlineImage>>[] | undefined;
      if (photoId) {
        const blob = await getPhotoBlob(photoId);
        if (!blob) throw new Error('Næ ekki í myndina. Reyndu aftur.');
        images = [await blobToInlineImage(blob)];
      }

      const now = Date.now();
      const context = buildContextDigest({
        grow,
        plants,
        logs,
        harvests,
        now,
        month: new Date(now).getMonth() + 1,
      });

      const result = await askRos({
        messages: [
          {
            role: 'user',
            text: buildDiagnosisPrompt(selectedPlant, symptoms, note, !!photoId),
          },
        ],
        context,
        images,
      });

      const text = result.trim();
      if (!text) throw new Error('Rós skilaði engri greiningu. Reyndu aftur.');
      setReply(text);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Rós náði ekki að greina þetta. Reyndu aftur síðar.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [canRun, selectedIds, photoId, grow, plants, logs, harvests, selectedPlant, note]);

  const saveToLog = useCallback(async () => {
    if (!reply || logged) return;
    try {
      await db.logs.add({
        id: newId(),
        growId: grow.id,
        plantId: selectedPlant?.id,
        timestamp: Date.now(),
        type: suggestLogType(selectedIds),
        note: parseDiagnosisTitle(reply) ?? 'Greining frá Rós',
        data: { symptoms: selectedIds, diagnosis: reply },
        photoId: photoId || undefined,
      });
      setLogged(true);
    } catch {
      setError('Náði ekki að skrá greininguna í dagbókina. Reyndu aftur.');
    }
  }, [reply, logged, grow.id, selectedPlant?.id, selectedIds, photoId]);

  const reset = useCallback(() => {
    setSelectedPlantId(null);
    setSelectedIds([]);
    setPhotoId(null);
    setNote('');
    setBusy(false);
    setError(null);
    setReply(null);
    setLogged(false);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-0.5">
      <p className="text-[12px] text-cream-300/70 leading-relaxed px-0.5">
        Rós hjálpar þér að greina meindýr eða sjúkdóma. Veldu plöntu, merktu við
        einkennin sem þú sérð og bættu helst við mynd — svo greinir hún.
      </p>

      {/* Plöntuval */}
      <div>
        <div className="text-[11px] uppercase tracking-wider sp-mono text-cream-300/60 mb-1.5 px-0.5">
          Planta
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <PlantPill
            label="Öll ræktunin"
            active={selectedPlantId === null}
            onClick={() => setSelectedPlantId(null)}
          />
          {activePlants.map((p) => (
            <PlantPill
              key={p.id}
              label={plantLabel(p)}
              active={selectedPlantId === p.id}
              onClick={() => setSelectedPlantId(p.id)}
            />
          ))}
        </div>
      </div>

      {/* Einkenni */}
      <div>
        <div className="text-[11px] uppercase tracking-wider sp-mono text-cream-300/60 mb-1.5 px-0.5">
          Einkenni
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {SYMPTOMS.map((s) => {
            const active = selectedIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSymptom(s.id)}
                className="text-[12px] px-3 py-1.5 rounded-full transition-colors text-cream-100"
                style={{
                  background: active
                    ? 'rgba(115,159,115,.16)'
                    : 'rgba(18,31,20,.5)',
                  border: `1px solid ${active ? 'var(--moss-400)' : 'rgba(64,104,67,.4)'}`,
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mynd */}
      <div>
        <div className="text-[11px] uppercase tracking-wider sp-mono text-cream-300/60 mb-1.5 px-0.5">
          Mynd (valfrjálst)
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickPhoto}
        />
        {photoId ? (
          <PhotoThumb photoId={photoId} onRemove={() => setPhotoId(null)} />
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-10 px-3.5 rounded-xl flex items-center gap-2 text-[13px] text-cream-200 transition-colors"
            style={{
              background: 'rgba(18,31,20,.6)',
              border: '1px solid rgba(64,104,67,.5)',
            }}
          >
            <ImagePlus size={16} />
            Bæta við mynd
          </button>
        )}
      </div>

      {/* Athugasemd */}
      <div>
        <div className="text-[11px] uppercase tracking-wider sp-mono text-cream-300/60 mb-1.5 px-0.5">
          Athugasemd (valfrjálst)
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Annað sem þú hefur tekið eftir…"
          className="w-full resize-none rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400"
        />
      </div>

      {/* Greina */}
      <button
        type="button"
        onClick={() => void runDiagnosis()}
        disabled={!canRun}
        className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-medium text-cream-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[.99]"
        style={{ background: 'var(--moss-600)' }}
      >
        {busy ? (
          <>
            <span
              className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
              style={{
                border: '2px solid rgba(253,251,246,.35)',
                borderTopColor: '#fdfbf6',
              }}
            />
            Rós greinir…
          </>
        ) : (
          <>
            <Search size={15} />
            Greina
          </>
        )}
      </button>

      {error && (
        <p className="text-[12px] leading-relaxed px-0.5" style={{ color: 'var(--cap-400)' }}>
          {error}
        </p>
      )}

      {/* Niðurstaða */}
      {reply && (
        <div
          className="rounded-2xl p-3.5"
          style={{
            background: 'rgba(36,56,39,.55)',
            border: '1px solid rgba(64,104,67,.4)',
            borderLeft: '3px solid var(--moss-400)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <RosAvatar size={26} />
            <span className="text-[11px] uppercase tracking-wider sp-mono text-cream-300/70">
              Greining Rósar
            </span>
          </div>
          <MarkdownText content={reply} />

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => void saveToLog()}
              disabled={logged}
              className="h-9 px-4 rounded-xl flex items-center justify-center gap-2 text-[13px] font-medium text-cream-50 transition-all disabled:opacity-70 disabled:cursor-default active:scale-[.99]"
              style={{ background: logged ? 'var(--moss-700)' : 'var(--cap-600)' }}
            >
              {logged ? 'Skráð ✓' : 'Skrá í dagbók'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="h-9 px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-[13px] text-cream-300 hover:text-cream-50 transition-colors"
            >
              <RefreshCw size={14} />
              Byrja aftur
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlantPill({
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
      onClick={onClick}
      className="text-[12px] px-3 py-1.5 rounded-full transition-colors text-cream-100 truncate max-w-[12rem]"
      style={{
        background: active ? 'rgba(115,159,115,.16)' : 'rgba(18,31,20,.5)',
        border: `1px solid ${active ? 'var(--moss-400)' : 'rgba(64,104,67,.4)'}`,
      }}
    >
      {label}
    </button>
  );
}

function PhotoThumb({
  photoId,
  onRemove,
}: {
  photoId: string;
  onRemove: () => void;
}) {
  const url = usePhotoUrl(photoId);
  return (
    <div
      className="relative w-24 h-24 rounded-xl overflow-hidden"
      style={{ background: 'rgba(18,31,20,.6)', border: '1px solid rgba(64,104,67,.4)' }}
    >
      {url && <img src={url} alt="Valin mynd" className="w-full h-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Fjarlægja mynd"
        className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-cream-50"
        style={{ background: 'rgba(18,31,20,.85)' }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

/** Birtir markdown-svar Rósar (feitletrun, skáletur, yfirstrikun, listar). */
function MarkdownText({ content }: { content: string }) {
  return (
    <div className="text-[13px] text-cream-100 leading-relaxed space-y-2 [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-cream-50">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="line-through opacity-80">{children}</del>,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          hr: () => <hr className="my-1.5 border-0 h-px bg-moss-700/40" />,
          h1: ({ children }) => <p className="font-semibold text-cream-50">{children}</p>,
          h2: ({ children }) => <p className="font-semibold text-cream-50">{children}</p>,
          h3: ({ children }) => <p className="font-semibold text-cream-50">{children}</p>,
          code: ({ children }) => (
            <code className="sp-mono text-[12px] px-1 py-0.5 rounded bg-moss-950/60">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline text-moss-300"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
