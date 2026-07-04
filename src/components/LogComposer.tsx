import { Camera } from 'lucide-react';
import { formatLogData } from '@/lib/logSchema';
import { usePhotoUrl } from '@/lib/photos';
import type { LogType } from '@/lib/db';

/**
 * Þunn skel (5.x skipting) — skráningarglugginn sjálfur býr í
 * components/logcomposer/ (tveggja skrefa flæði, þrepareitir, flögur).
 * Innflutningsslóðin `@/components/LogComposer` helst óbreytt, og
 * birtingaratómin LogDataChips/LogThumbnail (notuð af LogRow) búa hér áfram.
 */
export { LogComposer } from './logcomposer/LogComposerModal';

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
      aria-label="Skoða skráða mynd"
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
