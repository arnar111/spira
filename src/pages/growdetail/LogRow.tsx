import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Lightbox } from '@/components/ui/Lightbox';
import { LogDataChips, LogThumbnail } from '@/components/LogComposer';
import { usePhotoUrl } from '@/lib/photos';
import { shortDate } from '@/lib/dates';
import type { LogEntry, Plant } from '@/lib/db';
import { logTypeMeta } from './shared';

/** Ein skráninga-röð með breyta/eyða aðgerðum og mynd-skoðara (1.4). */
export function LogRow({
  log,
  plants,
  onEdit,
  onDelete,
}: {
  log: LogEntry;
  plants: Plant[];
  onEdit: (log: LogEntry) => void;
  onDelete: (log: LogEntry) => void;
}) {
  const meta = logTypeMeta(log.type);
  const Icon = meta.icon;
  const plant = plants.find((p) => p.id === log.plantId);
  const date = new Date(log.timestamp);
  const [viewerOpen, setViewerOpen] = useState(false);
  // Myndin er aðeins sótt þegar skoðarinn er opinn (sama og áður).
  const photoUrl = usePhotoUrl(viewerOpen ? log.photoId : undefined);
  // Sjálfvirkar fasaskráningar eru ekki ritstýranlegar (búnar til af kerfinu).
  const editable = log.type !== 'phase_change';
  return (
    <div className="group flex items-start gap-3 rounded-xl p-2.5 border bg-moss-900/30 border-moss-800/30">
      <div
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(231,217,168,.08)', color: 'var(--cream-300)' }}
      >
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-cream-100 text-sm font-medium">{meta.label}</span>
          {plant && (
            <span className="text-[10px] text-cream-400/70">
              {plant.nickname || plant.variety}
            </span>
          )}
          <span className="text-[10px] text-cream-400/60 ml-auto sp-mono">
            {shortDate(date.getTime())}
          </span>
          <div className="flex items-center gap-0.5">
            {editable && (
              <button
                type="button"
                onClick={() => onEdit(log)}
                aria-label="Breyta skráningu"
                className="text-cream-400/50 hover:text-cream-100 transition-colors p-1 rounded-md"
              >
                <Pencil size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(log)}
              aria-label="Eyða skráningu"
              className="text-cream-400/50 hover:text-terra-300 transition-colors p-1 rounded-md"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        <LogDataChips
          type={log.type}
          data={log.data as Record<string, unknown> | undefined}
        />
        {log.note && <div className="text-[12px] text-cream-300/75 mt-0.5">{log.note}</div>}
        {log.photoId && (
          <>
            <LogThumbnail photoId={log.photoId} onOpen={() => setViewerOpen(true)} />
            {/* Sami skoðari og galleríið (ui/Lightbox) — áður sér-Modal hér,
                svo tvö ólík myndaviðmót bjuggu á sömu síðu. */}
            <Lightbox
              open={viewerOpen}
              onClose={() => setViewerOpen(false)}
              src={photoUrl ?? undefined}
              date={shortDate(date.getTime())}
              plantName={plant ? plant.nickname || plant.variety : undefined}
              note={log.note}
            />
          </>
        )}
      </div>
    </div>
  );
}
