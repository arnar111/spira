import { CareGuide } from '@/components/CareGuide';
import type { Plant } from '@/lib/db';
import { resolveCare, varietyByName } from '@/lib/varieties';

/** Umhirðuleiðsögn fyrir afbrigði plöntu (3.4) — birt í Modal úr plöntu-röð. */
export function PlantCareGuide({ plant }: { plant: Plant }) {
  const care = resolveCare(varietyByName(plant.variety));
  if (!care) {
    return (
      <div className="text-sm text-cream-300/65 border border-dashed border-moss-800/40 rounded-2xl p-6 text-center">
        Engin skipulögð umhirðuleiðsögn fyrir þetta afbrigði enn.
      </div>
    );
  }
  return <CareGuide care={care} />;
}
