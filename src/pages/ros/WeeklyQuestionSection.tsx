import { MessageCircleQuestion } from 'lucide-react';
import { RosAvatar } from '@/components/ros/RosAvatar';
import type { WeeklyQuestion } from './useRosOverviewData';
import { SectionTitle } from './parts';

/**
 * Spurning vikunnar — Rós stingur upp á einni markvissri spurningu út frá
 * alvarlegustu stöðunni í ræktununum (offline). Smella ⇒ opna réttu ræktunina
 * með Rós á Spjall-flipa og spurninguna forskrifaða í inntakið.
 */
export function WeeklyQuestionSection({
  question,
  onAsk,
}: {
  question: WeeklyQuestion | null;
  onAsk: (growId: string, question: string) => void;
}) {
  if (!question) return null;
  const canOpen = question.growId !== null;
  return (
    <section className="mb-8">
      <SectionTitle>Spurning vikunnar</SectionTitle>
      <button
        type="button"
        onClick={() => question.growId && onAsk(question.growId, question.text)}
        disabled={!canOpen}
        className="w-full text-left rounded-2xl p-4 flex items-start gap-3 transition-colors active:scale-[.995] disabled:active:scale-100"
        style={{
          background: 'rgba(194,106,77,.14)',
          border: '1px solid rgba(194,106,77,.32)',
        }}
      >
        <div className="shrink-0">
          <RosAvatar size={34} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-cream-50 text-sm font-medium leading-snug">{question.text}</div>
          {question.growName && (
            <div className="text-[11px] text-cream-300/65 mt-1 flex items-center gap-1.5">
              <MessageCircleQuestion size={12} />
              Spyrja Rós í „{question.growName}"
            </div>
          )}
        </div>
      </button>
    </section>
  );
}
