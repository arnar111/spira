import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/** Tómt-ástand fyrir ræktanalista — notað bæði í farsíma og á skjáborði. */
export function EmptyGrowsCard({ onCreate }: { onCreate: () => void }) {
  return (
    <Card tone="outline" radius={18} padding={20}>
      <div style={{ textAlign: 'center' }}>
        <div
          className="sp-display"
          style={{ fontSize: 18, color: 'var(--cream-100)', marginBottom: 6 }}
        >
          Engar virkar ræktanir
        </div>
        <div style={{ fontSize: 12, color: 'rgba(231,217,168,.6)', marginBottom: 14 }}>
          Settu upp fyrstu ræktun til að byrja.
        </div>
        <Button size="sm" variant="primary" onClick={onCreate}>
          <Plus size={14} /> Ný ræktun
        </Button>
      </div>
    </Card>
  );
}
