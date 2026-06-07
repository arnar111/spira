import { useMemo, useState } from 'react';
import { usePhotoUrl } from '@/lib/photos';
import { relativeTime } from '@/lib/dates';
import { PhotoLightbox, type LightboxPhoto } from '@/components/gallery/PhotoLightbox';
import type { RecentPhoto } from './useRosOverviewData';
import { SectionTitle, MutedCard } from './parts';

/**
 * Mynda-vika — myndir síðustu 7 daga þvert á ræktanir sem lárétt smámyndaborð.
 * Smella á mynd ⇒ ljóskassi (örvar/strok/Escape).
 */
export function PhotoWeekSection({ photos }: { photos: RecentPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null);

  const items = useMemo<LightboxPhoto[]>(
    () => photos.map((p) => ({ photo: p.photo, plantLabel: p.growName })),
    [photos],
  );

  return (
    <section className="mb-8">
      <SectionTitle>Mynda-vika</SectionTitle>
      {photos.length === 0 ? (
        <MutedCard>
          Engar myndir síðustu sjö daga. Skráðu mynd í dagbók ræktunar (📷) — þær
          nýjustu raðast hér upp svo þú sjáir vikuna í myndum.
        </MutedCard>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
          {photos.map((p, i) => (
            <Thumb key={p.photo.id} photo={p} onOpen={() => setIndex(i)} />
          ))}
        </div>
      )}

      <PhotoLightbox
        items={items}
        index={index ?? 0}
        open={index !== null}
        onClose={() => setIndex(null)}
        onIndexChange={setIndex}
      />
    </section>
  );
}

function Thumb({ photo, onOpen }: { photo: RecentPhoto; onOpen: () => void }) {
  const url = usePhotoUrl(photo.photo.id);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="shrink-0 rounded-xl overflow-hidden relative transition-transform active:scale-[.98]"
      style={{ width: 104, height: 104, border: '1px solid rgba(64,104,67,.4)' }}
      aria-label={`Mynd frá ${photo.growName}, ${relativeTime(photo.photo.takenAt)}`}
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full" style={{ background: 'rgba(18,31,20,.6)' }} />
      )}
      <span
        className="absolute bottom-0 inset-x-0 px-1.5 py-1 text-[9px] sp-mono truncate text-cream-100"
        style={{ background: 'linear-gradient(to top, rgba(18,31,20,.85), transparent)' }}
      >
        {relativeTime(photo.photo.takenAt)}
      </span>
    </button>
  );
}
