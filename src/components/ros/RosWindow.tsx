import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Droplet,
  Flower,
  ImagePlus,
  Leaf,
  Lightbulb,
  Scissors,
  Send,
  Sparkles,
  Thermometer,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { RosAvatar } from '@/components/ros/RosAvatar';
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
import type {
  RosInsight,
  RosInsightKind,
  RosSeverity,
} from '@/lib/ros/types';
import {
  askRos,
  blobToInlineImage,
  type RosTurn,
  type RosInlineImage,
} from '@/lib/ros/chat';

interface RosWindowProps {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
  open: boolean;
  onClose: () => void;
}

const KIND_ICON: Record<RosInsightKind, LucideIcon> = {
  water: Droplet,
  feed: Leaf,
  prune: Scissors,
  top: Sparkles,
  pollinate: Flower,
  harvest: Leaf,
  light: Lightbulb,
  env: Thermometer,
  info: Sparkles,
};

/** Litaslá vinstri brúnar/táknu eftir forgangi. */
const SEVERITY_STYLE: Record<
  RosSeverity,
  { edge: string; iconBg: string; iconColor: string }
> = {
  due: {
    edge: 'var(--cap-500)',
    iconBg: 'rgba(226,62,29,.16)',
    iconColor: 'var(--cap-400)',
  },
  soon: {
    edge: 'var(--cream-400)',
    iconBg: 'rgba(224,194,121,.16)',
    iconColor: 'var(--cream-300)',
  },
  info: {
    edge: 'var(--moss-400)',
    iconBg: 'rgba(115,159,115,.16)',
    iconColor: 'var(--moss-300)',
  },
};

/** Íslensk fleirtölu-/eintölumeðferð fyrir „dag(a)". */
function dayWord(n: number): string {
  return Math.abs(n) === 1 ? 'dag' : 'daga';
}

/** Texti fyrir dueInDays: „eftir N daga" / „núna" / „komið yfir tíma". */
function dueLabel(dueInDays?: number | null): string | null {
  if (dueInDays === undefined || dueInDays === null) return null;
  if (dueInDays > 0) return `eftir ${dueInDays} ${dayWord(dueInDays)}`;
  if (dueInDays === 0) return 'núna';
  return 'komið yfir tíma';
}

export function RosWindow({
  grow,
  plants,
  logs,
  harvests,
  open,
  onClose,
}: RosWindowProps): JSX.Element {
  const [tab, setTab] = useState(0);

  return (
    <Modal open={open} onClose={onClose} fullHeight size="lg">
      <div className="flex flex-col min-h-0 h-full">
        <header className="shrink-0 flex items-center gap-3 mb-3">
          <RosAvatar size={40} />
          <div className="min-w-0">
            <Eyebrow color="var(--terra-300)">Rós · vinkona ræktandans</Eyebrow>
            <h3
              className="sp-display truncate"
              style={{
                fontSize: 20,
                color: 'var(--cream-50)',
                fontWeight: 500,
                lineHeight: 1.1,
              }}
            >
              {grow.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Loka"
            className="ml-auto shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-cream-300 hover:text-cream-50 transition-colors"
            style={{ background: 'rgba(18,31,20,.5)', border: '1px solid rgba(64,104,67,.4)' }}
          >
            <X size={16} />
          </button>
        </header>

        <div className="shrink-0 mb-3">
          <Tabs tabs={['Ráð', 'Spjall']} active={tab} onChange={setTab} />
        </div>

        <div className="min-h-0 flex-1 flex flex-col">
          {tab === 0 ? (
            <InsightsTab
              grow={grow}
              plants={plants}
              logs={logs}
              harvests={harvests}
            />
          ) : (
            <ChatTab
              grow={grow}
              plants={plants}
              logs={logs}
              harvests={harvests}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

/* — RÁÐ — */

function InsightsTab({
  grow,
  plants,
  logs,
  harvests,
}: {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
}) {
  const now = Date.now();
  const month = new Date(now).getMonth() + 1;
  const insights = computeInsights({ grow, plants, logs, harvests, now, month });

  if (insights.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div
          className="text-sm text-cream-300/70 rounded-2xl p-6 text-center"
          style={{
            background: 'rgba(18,31,20,.4)',
            border: '1px dashed rgba(64,104,67,.45)',
          }}
        >
          <div className="flex justify-center mb-2">
            <RosAvatar size={34} />
          </div>
          Allt lítur vel út hjá þér núna. Engin aðkallandi ráð — haltu áfram
          góðu verki og kíktu aftur síðar.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5">
      {insights.map((ins) => (
        <InsightCard key={ins.id} insight={ins} />
      ))}
    </div>
  );
}

function InsightCard({ insight }: { insight: RosInsight }) {
  const sev = SEVERITY_STYLE[insight.severity];
  const Icon = KIND_ICON[insight.kind] ?? Sparkles;
  const due = dueLabel(insight.dueInDays);

  return (
    <div
      className="rounded-2xl p-3 flex gap-3"
      style={{
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.4)',
        borderLeft: `3px solid ${sev.edge}`,
      }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: sev.iconBg, color: sev.iconColor }}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-cream-50 text-sm font-medium">{insight.title}</span>
          {due && (
            <span
              className="text-[10px] uppercase tracking-wider sp-mono ml-auto"
              style={{ color: sev.iconColor }}
            >
              {due}
            </span>
          )}
        </div>
        <p className="text-[12px] text-cream-300/80 mt-1 leading-relaxed">
          {insight.detail}
        </p>
      </div>
    </div>
  );
}

/* — SPJALL — */

function ChatTab({
  grow,
  plants,
  logs,
  harvests,
}: {
  grow: Grow;
  plants: Plant[];
  logs: LogEntry[];
  harvests: HarvestEntry[];
}) {
  const messages = useLiveQuery(
    () => db.rosMessages.where('growId').equals(grow.id).sortBy('timestamp'),
    [grow.id],
  );

  const [text, setText] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const list = messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [list.length, sending]);

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

  async function send() {
    const trimmed = text.trim();
    if ((!trimmed && pendingPhotos.length === 0) || sending) return;

    const photoIds = [...pendingPhotos];
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

    setText('');
    setPendingPhotos([]);
    setSending(true);

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

      const reply = await askRos({
        messages: turns,
        context,
        images: images.length > 0 ? images : undefined,
      });

      await db.rosMessages.update(pendingId, {
        content:
          reply.trim() ||
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
          <ChatBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

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

function ChatBubble({ message }: { message: RosMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isUser && (
        <div className="shrink-0 self-end mb-0.5">
          <RosAvatar size={26} />
        </div>
      )}
      <div
        className="max-w-[78%] rounded-2xl px-3 py-2"
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
          <Spinner />
        ) : (
          message.content && (
            <p className="text-[13px] text-cream-100 whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          )
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
