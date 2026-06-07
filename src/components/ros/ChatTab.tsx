import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bookmark, ImagePlus, Send, X } from 'lucide-react';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { MarkdownText } from '@/components/ros/RosMarkdown';
import {
  db,
  newId,
  type Grow,
  type Plant,
  type LogEntry,
  type HarvestEntry,
  type RosMessage,
} from '@/lib/db';
import { addPhotoFromFile, getPhotoBlob, usePhotoUrl } from '@/lib/photos';
import { computeInsights, buildContextDigest } from '@/lib/ros/engine';
import {
  askRosStream,
  blobToInlineImage,
  type RosTurn,
  type RosInlineImage,
} from '@/lib/ros/chat';
import { SUGGESTION_BY_KIND, FALLBACK_SUGGESTION } from '@/components/ros/rosWindowState';

/* — SPJALL — */

export function ChatTab({
  grow,
  plants,
  logs,
  harvests,
  initialDraft,
}: {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
  /** Forskrifaður texti í inntakslínuna (t.d. „Spurning vikunnar" af /ros). */
  initialDraft?: string;
}) {
  const messages = useLiveQuery(
    () => db.rosMessages.where('growId').equals(grow.id).sortBy('timestamp'),
    [grow.id],
  );

  // Forskrifaður texti er settur EINU sinni við opnun; notandi getur breytt/sent.
  const [text, setText] = useState(() => initialDraft ?? '');
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  // Lifandi streymdur texti svars Rósar (null þegar ekkert er að streyma).
  const [streamText, setStreamText] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const list = messages ?? [];

  // Tillöguspurningar út frá efstu ráðum (deduppað eftir gerð, fyllt með varatillögu).
  const suggestions = useMemo(() => {
    const now = Date.now();
    const month = new Date(now).getMonth() + 1;
    const insights = computeInsights({ grow, plants, logs, harvests, now, month });
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ins of insights) {
      if (seen.has(ins.kind)) continue;
      const q = SUGGESTION_BY_KIND[ins.kind];
      if (!q) continue;
      seen.add(ins.kind);
      out.push(q);
      if (out.length >= 3) break;
    }
    // Vara-tillagan bætist við í mesta lagi EINU sinni — aldrei tvær eins flögur.
    if (out.length < 2) out.push(FALLBACK_SUGGESTION);
    return out.slice(0, 3);
  }, [grow, plants, logs, harvests]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [list.length, sending, streamText]);

  const onPickPhotos = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const ids: string[] = [];
      for (const file of Array.from(files)) {
        const id = await addPhotoFromFile(file, { growId: grow.id });
        ids.push(id);
      }
      setPendingPhotos((prev) => [...prev, ...ids]);
      if (fileRef.current) fileRef.current.value = '';
    },
    [grow.id],
  );

  function removePending(id: string) {
    setPendingPhotos((prev) => prev.filter((p) => p !== id));
  }

  async function send(override?: string) {
    const trimmed = (override ?? text).trim();
    // Tillögusmellur (override) sendir alltaf texta; myndir fylgja aðeins venjulegri ritun.
    const usePhotos = override === undefined;
    const photoIds = usePhotos ? [...pendingPhotos] : [];
    if ((!trimmed && photoIds.length === 0) || sending) return;

    const now = Date.now();
    const month = new Date(now).getMonth() + 1;

    // Vista skilaboð notanda strax.
    const userMsg: RosMessage = {
      id: newId(),
      growId: grow.id,
      role: 'user',
      content: trimmed,
      timestamp: now,
      photoIds: photoIds.length > 0 ? photoIds : undefined,
    };
    await db.rosMessages.add(userMsg);

    if (usePhotos) {
      setText('');
      setPendingPhotos([]);
    }
    setSending(true);
    setStreamText(null);

    // Optimistic „pending" kúla fyrir svar Rósar.
    const pendingId = newId();
    await db.rosMessages.add({
      id: pendingId,
      growId: grow.id,
      role: 'ros',
      content: '',
      timestamp: now + 1,
      pending: true,
    });

    try {
      // Fyrri umferðir -> RosTurn (utan pending svarsins).
      const history: RosTurn[] = list
        .filter((m) => !m.pending)
        .map((m) => ({
          role: m.role === 'ros' ? 'model' : 'user',
          text: m.content,
        }));
      const turns: RosTurn[] = [...history, { role: 'user', text: trimmed }];

      // Sjón: lestu blobbana og umbreyttu í inline myndir.
      const images: RosInlineImage[] = [];
      for (const pid of photoIds) {
        const blob = await getPhotoBlob(pid);
        if (blob) images.push(await blobToInlineImage(blob));
      }

      const context = buildContextDigest({
        grow,
        plants,
        logs,
        harvests,
        now,
        month,
      });

      const result = await askRosStream(
        {
          messages: turns,
          context,
          images: images.length > 0 ? images : undefined,
        },
        (textSoFar) => setStreamText(textSoFar),
      );

      await db.rosMessages.update(pendingId, {
        content:
          result.text.trim() ||
          'Rós svaraði engu í þetta sinn. Reyndu aftur eftir smá stund.',
        pending: false,
        timestamp: Date.now(),
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Rós er ekki tengd enn. Reyndu aftur síðar.';
      await db.rosMessages.update(pendingId, {
        content: msg,
        pending: false,
        timestamp: Date.now(),
      });
    } finally {
      setSending(false);
      setStreamText(null);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5">
        {list.length === 0 && (
          <div
            className="text-sm text-cream-300/70 rounded-2xl p-5 text-center mt-1"
            style={{
              background: 'rgba(18,31,20,.4)',
              border: '1px dashed rgba(64,104,67,.45)',
            }}
          >
            Spjallaðu við Rós um ræktunina. Spyrðu um vökvun, áburð, meindýr eða
            sýndu henni mynd af plöntunum þínum.
          </div>
        )}
        {list.map((m) => (
          <ChatBubble
            key={m.id}
            message={m}
            growId={grow.id}
            streamText={m.pending ? streamText : null}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Tillöguspurningar (þegar ekki er verið að senda) */}
      {!sending && suggestions.length > 0 && (
        <div className="shrink-0 flex gap-2 overflow-x-auto pt-2 -mx-0.5 px-0.5">
          {suggestions.map((q, i) => (
            <button
              key={`${q}-${i}`}
              type="button"
              onClick={() => void send(q)}
              className="shrink-0 rounded-full px-3 py-1.5 text-[12px] text-cream-100 whitespace-nowrap transition-colors hover:brightness-110 active:scale-[.98]"
              style={{
                background: 'rgba(18,31,20,.6)',
                border: '1px solid rgba(64,104,67,.5)',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Myndir í bið */}
      {pendingPhotos.length > 0 && (
        <div className="shrink-0 flex gap-2 flex-wrap pt-2">
          {pendingPhotos.map((id) => (
            <PendingThumb key={id} photoId={id} onRemove={() => removePending(id)} />
          ))}
        </div>
      )}

      {/* Inntakslína */}
      <div className="shrink-0 flex items-end gap-2 pt-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickPhotos}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="tengja mynd"
          title="tengja mynd"
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-cream-300 hover:text-cream-50 transition-colors"
          style={{
            background: 'rgba(18,31,20,.6)',
            border: '1px solid rgba(64,104,67,.5)',
          }}
        >
          <ImagePlus size={18} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Skrifaðu til Rósar…"
          className="flex-1 resize-none rounded-xl bg-moss-950/60 border border-moss-800 px-3 py-2.5 text-sm text-cream-100 outline-none focus:border-moss-400 max-h-28"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || (!text.trim() && pendingPhotos.length === 0)}
          aria-label="Senda"
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-cream-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          style={{ background: 'var(--cap-500)' }}
        >
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  growId,
  streamText,
}: {
  message: RosMessage;
  growId: string;
  streamText?: string | null;
}) {
  const isUser = message.role === 'user';
  const [saved, setSaved] = useState(false);

  // Vista svar Rósar sem minnispunkt í dagbók (syncast sjálfkrafa um Dexie-hooka).
  const saveToJournal = useCallback(async () => {
    if (saved) return;
    await db.logs.add({
      id: newId(),
      growId,
      timestamp: Date.now(),
      type: 'note',
      note: 'Rós: ' + message.content.slice(0, 500),
    });
    setSaved(true);
  }, [saved, growId, message.content]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isUser && (
        <div className="shrink-0 self-end mb-0.5">
          <RosAvatar size={26} />
        </div>
      )}
      <div className="max-w-[78%] flex flex-col items-start">
        <div
          className="rounded-2xl px-3 py-2"
          style={
            isUser
              ? {
                  background: 'rgba(194,106,77,.22)',
                  border: '1px solid rgba(194,106,77,.4)',
                  borderBottomRightRadius: 6,
                }
              : {
                  background: 'rgba(36,56,39,.7)',
                  border: '1px solid rgba(64,104,67,.45)',
                  borderBottomLeftRadius: 6,
                }
          }
        >
          {message.photoIds && message.photoIds.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-1.5">
              {message.photoIds.map((pid) => (
                <ChatThumb key={pid} photoId={pid} />
              ))}
            </div>
          )}
          {message.pending ? (
            streamText ? (
              <MarkdownText content={streamText + ' ▍'} />
            ) : (
              <Spinner />
            )
          ) : (
            message.content &&
            (isUser ? (
              <p className="text-[13px] text-cream-100 whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            ) : (
              <MarkdownText content={message.content} />
            ))
          )}
        </div>

        {/* Vista svar Rósar í dagbók (aðeins fullkláruð svör). */}
        {!isUser && !message.pending && message.content && (
          <button
            type="button"
            onClick={() => void saveToJournal()}
            disabled={saved}
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-cream-300/70 hover:text-cream-100 transition-colors disabled:cursor-default disabled:hover:text-cream-300/70"
          >
            <Bookmark size={11} />
            {saved ? 'Vistað ✓' : 'Vista í dagbók'}
          </button>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-cream-300/80 py-0.5">
      <span
        className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
        style={{
          border: '2px solid rgba(231,217,168,.25)',
          borderTopColor: 'var(--cream-300)',
        }}
      />
      Rós hugsar…
    </span>
  );
}

function ChatThumb({ photoId }: { photoId: string }) {
  const url = usePhotoUrl(photoId);
  return (
    <div
      className="w-16 h-16 rounded-lg overflow-hidden"
      style={{ background: 'rgba(18,31,20,.6)', border: '1px solid rgba(64,104,67,.4)' }}
    >
      {url && <img src={url} alt="" className="w-full h-full object-cover" />}
    </div>
  );
}

function PendingThumb({
  photoId,
  onRemove,
}: {
  photoId: string;
  onRemove: () => void;
}) {
  const url = usePhotoUrl(photoId);
  return (
    <div
      className="relative w-16 h-16 rounded-lg overflow-hidden"
      style={{ background: 'rgba(18,31,20,.6)', border: '1px solid rgba(64,104,67,.4)' }}
    >
      {url && <img src={url} alt="" className="w-full h-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Fjarlægja mynd"
        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-cream-50"
        style={{ background: 'rgba(18,31,20,.85)' }}
      >
        <X size={12} />
      </button>
    </div>
  );
}
