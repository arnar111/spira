import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RosAvatar } from '@/components/ros/RosAvatar';
import { useRosOverviewData } from './ros/useRosOverviewData';
import { AgendaSection } from './ros/AgendaSection';
import { YieldOverviewSection } from './ros/YieldOverviewSection';
import { CalendarSection } from './ros/CalendarSection';
import { HealthSection } from './ros/HealthSection';
import { PredictionSection } from './ros/PredictionSection';
import { VarietyBoardSection } from './ros/VarietyBoardSection';
import { PhotoWeekSection } from './ros/PhotoWeekSection';
import { WeeklyQuestionSection } from './ros/WeeklyQuestionSection';
import { ReportSection } from './ros/ReportSection';

export function RosOverview() {
  const navigate = useNavigate();
  const {
    dueAndSoon,
    infoCount,
    predictions,
    yieldOverview,
    health,
    calendar,
    varietyBoard,
    recentPhotos,
    weeklyQuestion,
    reports,
    building,
    buildError,
    buildReport,
    deleteReport,
  } = useRosOverviewData();

  const openGrow = (growId: string) => navigate(`/grow/${growId}`);
  // „Spurning vikunnar" → opna ræktunina með Rós á Spjall + spurningu forskrifaða.
  const askInGrow = (growId: string, question: string) =>
    navigate(`/grow/${growId}?spyrja=1&q=${encodeURIComponent(question)}`);
  // Flýtiskráning af dagskrárlið (5.x) — opnar skráningargluggann forvalinn
  // í ræktuninni gegnum ?skra-djúptenginguna (sama mynstur og ?spyrja).
  const quickLogInGrow = (growId: string, type: string, plantId?: string) =>
    navigate(
      `/grow/${growId}?skra=${encodeURIComponent(type)}${
        plantId ? `&planta=${encodeURIComponent(plantId)}` : ''
      }`,
    );

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
          onOpen={openGrow}
          onQuickLog={quickLogInGrow}
        />

        <YieldOverviewSection data={yieldOverview} />

        <CalendarSection calendar={calendar} onOpen={openGrow} />

        <HealthSection health={health} onOpen={openGrow} />

        <PredictionSection predictions={predictions} />

        <VarietyBoardSection board={varietyBoard} />

        <PhotoWeekSection photos={recentPhotos} />

        <WeeklyQuestionSection question={weeklyQuestion} onAsk={askInGrow} />

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
