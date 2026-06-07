import { useLiveQuery } from 'dexie-react-hooks';
import { PhotoGallery } from '@/components/gallery/PhotoGallery';
import { db, type LogEntry, type Plant } from '@/lib/db';

/** Myndasafn afmarkað við eina plöntu (3.2) — með eigin tóma-stöðu fyrir Modal. */
export function PerPlantGallery({
  growId,
  plant,
  plants,
  logs,
}: {
  growId: string;
  plant: Plant;
  plants: Plant[];
  logs: LogEntry[];
}) {
  const photoCount = useLiveQuery(
    () => db.photos.where('growId').equals(growId).filter((p) => p.plantId === plant.id).count(),
    [growId, plant.id],
  );
  if (photoCount === 0) {
    return (
      <div className="text-sm text-cream-300/65 border border-dashed border-moss-800/40 rounded-2xl p-6 text-center">
        Engar myndir af þessari plöntu enn. Skráðu mynd (📷) í dagbókina til að safna þeim hér.
      </div>
    );
  }
  return <PhotoGallery growId={growId} plantId={plant.id} plants={plants} logs={logs} />;
}
