import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Beinagrindur fyrir köld hleðsluskeið (áður `return null`). Geometrían speglar
 * raunlayoutið svo ekkert hopp verði þegar gögnin koma. Allt skreyti, ekkert
 * gagnvirkt.
 */

/** Haus með litlu merki + stórum titli (sama og .sp-h1 hausar síðnanna). */
function HeaderSkeleton() {
  return (
    <div className="mb-5">
      <Skeleton width={90} height={10} radius={4} />
      <Skeleton width={180} height={30} radius={8} style={{ marginTop: 8 }} />
    </div>
  );
}

/** Listalína í stíl við GrowRow/glerspjald. */
function RowCardSkeleton({ height = 116 }: { height?: number }) {
  return <Skeleton height={height} radius={18} />;
}

export function GrowsSkeleton() {
  return (
    <div className="px-5 sm:px-7 py-6">
      <HeaderSkeleton />
      <div className="flex flex-col gap-3">
        <RowCardSkeleton />
        <RowCardSkeleton />
        <RowCardSkeleton />
      </div>
    </div>
  );
}

export function PlantsSkeleton() {
  return (
    <div className="px-5 sm:px-7 py-6">
      <HeaderSkeleton />
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton width={70} height={28} radius={999} />
        <Skeleton width={64} height={28} radius={999} />
        <Skeleton width={80} height={28} radius={999} />
      </div>
      <div className="flex flex-col gap-2">
        <RowCardSkeleton height={72} />
        <RowCardSkeleton height={72} />
        <RowCardSkeleton height={72} />
        <RowCardSkeleton height={72} />
      </div>
    </div>
  );
}

export function HarvestSkeleton() {
  return (
    <div className="px-5 sm:px-7 py-6">
      <HeaderSkeleton />
      <div className="grid grid-cols-3 gap-2 mb-5">
        <Skeleton height={62} radius={14} />
        <Skeleton height={62} radius={14} />
        <Skeleton height={62} radius={14} />
      </div>
      <div className="flex flex-col gap-2">
        <RowCardSkeleton height={70} />
        <RowCardSkeleton height={70} />
        <RowCardSkeleton height={70} />
      </div>
    </div>
  );
}

export function GrowDetailSkeleton() {
  return (
    <div className="px-5 sm:px-7 py-6">
      <Skeleton width={70} height={14} radius={6} style={{ marginBottom: 16 }} />
      {/* hero */}
      <Skeleton height={150} radius={22} />
      {/* þrjú stöplar */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <Skeleton height={62} radius={14} />
        <Skeleton height={62} radius={14} />
        <Skeleton height={62} radius={14} />
      </div>
      {/* plöntur */}
      <div className="mt-6 flex flex-col gap-2">
        <Skeleton width={120} height={20} radius={6} style={{ marginBottom: 4 }} />
        <RowCardSkeleton height={64} />
        <RowCardSkeleton height={64} />
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <>
      {/* Farsími */}
      <div className="md:hidden" style={{ padding: '20px 22px 14px' }}>
        <Skeleton width={90} height={10} radius={4} />
        <Skeleton width={220} height={56} radius={10} style={{ marginTop: 8 }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <Skeleton height={64} radius={14} style={{ flex: 1 }} />
          <Skeleton height={64} radius={14} style={{ flex: 1 }} />
          <Skeleton height={64} radius={14} style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
          <RowCardSkeleton height={132} />
          <RowCardSkeleton height={132} />
        </div>
      </div>
      {/* Skjáborð */}
      <div className="hidden md:block px-7 py-6">
        <Skeleton width={90} height={10} radius={4} />
        <Skeleton width={320} height={40} radius={10} style={{ marginTop: 8, marginBottom: 18 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <Skeleton height={78} radius={14} />
          <Skeleton height={78} radius={14} />
          <Skeleton height={78} radius={14} />
          <Skeleton height={78} radius={14} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.55fr 1fr',
            gap: 18,
            marginTop: 18,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <RowCardSkeleton height={96} />
            <RowCardSkeleton height={96} />
            <RowCardSkeleton height={96} />
          </div>
          <Skeleton height={300} radius={18} />
        </div>
      </div>
    </>
  );
}
