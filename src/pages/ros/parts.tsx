import type { ReactNode } from 'react';

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="sp-h3 mb-3">{children}</h2>;
}

export function MutedCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-[13px] text-cream-300/70 rounded-2xl p-5 leading-relaxed"
      style={{
        background: 'rgba(18,31,20,.4)',
        border: '1px dashed rgba(64,104,67,.45)',
      }}
    >
      {children}
    </div>
  );
}
