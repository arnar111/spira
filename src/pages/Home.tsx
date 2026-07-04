import { useDelayedFlag } from '@/lib/useDelayedFlag';
import { HomeSkeleton } from '@/components/PageSkeletons';
import { useHomeData } from './home/useHomeData';
import { HomeMobile } from './home/HomeMobile';
import { HomeDesktop } from './home/HomeDesktop';

export function Home() {
  const { loading, active, plants, archivedCount, agenda } = useHomeData();

  const showSkeleton = useDelayedFlag(loading);
  if (loading) return showSkeleton ? <HomeSkeleton /> : null;

  return (
    <>
      <HomeMobile active={active} plants={plants} archivedCount={archivedCount} agenda={agenda} />
      <HomeDesktop active={active} plants={plants} archivedCount={archivedCount} agenda={agenda} />
    </>
  );
}
