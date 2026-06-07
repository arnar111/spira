import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ActionTileProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

/**
 * Flýtihnappur í reit (áður innfellt í flýtiaðgerða-rist LogComposer.tsx).
 * Tákn fyrir ofan merki, virk staða lýsist upp. Útlit fært óbreytt.
 */
export function ActionTile({ icon, label, active = false, onClick }: ActionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-2xl border py-3 transition-colors',
        active
          ? 'bg-moss-500 border-moss-400 text-cream-50'
          : 'bg-moss-900/40 border-moss-800/40 text-cream-200 hover:border-moss-600',
      )}
    >
      {icon}
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}
