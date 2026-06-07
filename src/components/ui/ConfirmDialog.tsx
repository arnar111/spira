import type { ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Skýringartexti — strengur eða eigið innihald (t.d. auka-aðgerð eins og afritshnappur). */
  body?: ReactNode;
  /** Hnappstexti sem NEFNIR aðgerðina ("Loka ræktun"), ekki "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  /** Eyðileggjandi aðgerð → terracotta-tónn á staðfestingarhnappnum. */
  destructive?: boolean;
}

/**
 * Lítil staðfestingargluggi ofan á ui/Modal (1.1) — kemur í stað native
 * confirm(). Modal sér um scroll-læsingu, Escape og bakgrunnssmell.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Hætta við',
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {body !== undefined && (
        <div className="text-sm" style={{ color: 'var(--cream-300)', marginBottom: 18 }}>
          {body}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="md" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? 'secondary' : 'primary'}
          size="md"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
