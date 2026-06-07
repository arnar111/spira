import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { useRosOverviewData } from './ros/useRosOverviewData';
import { AgendaSection } from './ros/AgendaSection';
import { PredictionSection } from './ros/PredictionSection';
import { ReportSection } from './ros/ReportSection';

export function RosOverview() {
  const navigate = useNavigate();
  const {
    dueAndSoon,
    infoCount,
    predictions,
    reports,
    building,
    buildError,
    buildReport,
    deleteReport,
  } = useRosOverviewData();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ color: 'var(--cream-100)' }}
    >
      <div className="mx-auto w-full max-w-3xl" style={{ padding: '20px 22px 28px' }}>
        {/* Haus */}
        <header className="flex items-center gap-3 mb-6">
          <RosAvatar size={40} />
          <div className="min-w-0">
            <Eyebrow color="var(--terra-300)">Rós · vinkona ræktandans</Eyebrow>
            <h1 className="sp-h1">Dagskrá Rósar</h1>
          </div>
        </header>

        <AgendaSection
          dueAndSoon={dueAndSoon}
          infoCount={infoCount}
          onOpen={(growId) => navigate(`/grow/${growId}`)}
        />

        <PredictionSection predictions={predictions} />

        <ReportSection
          reports={reports}
          building={building}
          buildError={buildError}
          onBuild={() => void buildReport()}
          onDelete={(id) => setDeleteTarget(id)}
        />
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void deleteReport(deleteTarget);
        }}
        title="Eyða vikuskýrslu"
        body="Viltu eyða þessari vikuskýrslu? Þetta er ekki hægt að afturkalla."
        confirmLabel="Eyða skýrslu"
        destructive
      />
    </motion.div>
  );
}
