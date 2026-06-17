import { FileText, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RosAvatar } from '@/components/ros/RosAvatar';
import type { RosReport } from '@/lib/db';
import { longDate } from '@/lib/dates';
import { SectionTitle, MutedCard } from './parts';

export function ReportSection({
  reports,
  building,
  buildError,
  onBuild,
  onDelete,
}: {
  reports: RosReport[] | undefined;
  building: boolean;
  buildError: string | null;
  onBuild: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section>
      <SectionTitle>Vikuskýrsla</SectionTitle>
      <p className="text-[12px] text-cream-300/70 leading-relaxed mb-3 px-0.5">
        Rós tekur saman vikuna á öllum ræktunum þínum — hvað gengur vel, hvað
        þarf að passa og forgangslista fyrir næstu viku.
      </p>

      <button
        type="button"
        onClick={onBuild}
        disabled={building}
        className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-medium text-cream-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.99]"
        style={{ background: 'var(--moss-600)' }}
      >
        {building ? (
          <>
            <span
              className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
              style={{
                border: '2px solid rgba(253,251,246,.35)',
                borderTopColor: '#fdfbf6',
              }}
            />
            Rós tekur saman vikuna…
          </>
        ) : (
          <>
            <FileText size={15} />
            Búa til vikuskýrslu
          </>
        )}
      </button>

      {buildError && (
        <p
          className="text-[12px] mt-2 leading-relaxed"
          style={{ color: 'var(--cap-400)' }}
        >
          {buildError}
        </p>
      )}

      {/* Eldri skýrslur */}
      <div className="flex flex-col gap-3 mt-4">
        {(reports ?? []).length === 0 && !building && (
          <MutedCard>
            Engin vikuskýrsla enn. Smelltu á hnappinn til að fá fyrstu samantekt
            Rósar.
          </MutedCard>
        )}
        {(reports ?? []).map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onDelete={() => onDelete(report.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ReportCard({
  report,
  onDelete,
}: {
  report: RosReport;
  onDelete: () => void;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(36,56,39,.55)',
        border: '1px solid rgba(64,104,67,.4)',
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <RosAvatar size={28} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] sp-mono uppercase tracking-wider text-cream-400">
            Vikuskýrsla
          </div>
          <div className="text-[12px] text-cream-300/80">
            {longDate(report.createdAt)}
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Eyða skýrslu"
          title="Eyða skýrslu"
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-cream-300 hover:text-cream-50 transition-colors"
          style={{
            background: 'rgba(18,31,20,.5)',
            border: '1px solid rgba(64,104,67,.4)',
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <MarkdownText content={report.text} />
    </div>
  );
}

/** Birtir markdown-svar Rósar (afrit af mappingu í RosWindow — staðbundið viljandi). */
function MarkdownText({ content }: { content: string }) {
  return (
    <div className="text-[13px] text-cream-100 leading-relaxed space-y-2 [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-cream-50">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="line-through opacity-80">{children}</del>,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          hr: () => <hr className="my-1.5 border-0 h-px bg-moss-700/40" />,
          h1: ({ children }) => <p className="font-semibold text-cream-50">{children}</p>,
          h2: ({ children }) => <p className="font-semibold text-cream-50">{children}</p>,
          h3: ({ children }) => <p className="font-semibold text-cream-50">{children}</p>,
          code: ({ children }) => (
            <code className="sp-mono text-[12px] px-1 py-0.5 rounded bg-moss-950/60">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline text-moss-300"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
