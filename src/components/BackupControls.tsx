import { useRef, useState } from 'react';
import { Download, LogOut, Upload } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { downloadBackup, importBackupFile } from '@/lib/backup';
import { clearCurrentAccount } from '@/lib/account';
import { clearLocalData, syncManager } from '@/lib/sync';

const PHOTO_NOTE = 'Myndir fylgja ekki með — þær eru aðeins í þessu tæki.';

/** Lítill texti-hnappur sem passar inn í reikningsfótinn (5.2). */
function footRowButton(extra?: string) {
  return [
    'w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5',
    'text-[11px] font-medium transition-colors',
    extra ?? '',
  ].join(' ');
}

const ROW_STYLE = {
  color: 'rgba(231,217,168,.7)',
  border: '1px solid rgba(64,104,67,.5)',
  background: 'transparent',
} as const;

/**
 * Afrits-stýringar (5.2): „Sækja afrit“ / „Hlaða inn afriti“ + útskráning sem
 * býður afrit áður en local gögn eru hreinsuð. Sjálfstæð eining svo viðbætur í
 * Layout haldist litlar.
 */
export function BackupControls({ onSignOut }: { onSignOut: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);

  async function handleExport() {
    try {
      await downloadBackup();
    } catch (err) {
      console.warn('[spira] afritsniðurhal mistókst', err);
    }
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = ''; // leyfa að velja sömu skrá aftur
    if (file) {
      setImportError(null);
      setPendingFile(file);
    }
  }

  async function confirmImport() {
    if (!pendingFile) return;
    try {
      await importBackupFile(pendingFile);
      // Dexie-hookarnir ræsa sync-push sjálfkrafa við clear/bulkAdd.
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Innflutningur mistókst.');
      console.warn('[spira] innflutningur afrits mistókst', err);
    } finally {
      setPendingFile(null);
    }
  }

  async function confirmSignOut() {
    await syncManager.flush();
    await clearLocalData();
    clearCurrentAccount();
    onSignOut();
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => void handleExport()}
        className={footRowButton()}
        style={ROW_STYLE}
      >
        <Download size={12} />
        Sækja afrit
      </button>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className={footRowButton()}
        style={ROW_STYLE}
      >
        <Upload size={12} />
        Hlaða inn afriti
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFilePicked}
      />
      <button
        type="button"
        onClick={() => setSignOutOpen(true)}
        className={footRowButton()}
        style={ROW_STYLE}
      >
        <LogOut size={12} />
        Skrá út
      </button>

      {importError && (
        <p className="text-[11px] pt-0.5" style={{ color: 'rgb(212,128,107)' }}>
          {importError}
        </p>
      )}

      <ConfirmDialog
        open={pendingFile !== null}
        onClose={() => setPendingFile(null)}
        onConfirm={() => void confirmImport()}
        title="Hlaða inn afriti?"
        body={
          <>
            Þetta yfirskrifar núverandi gögn á þessu tæki með innihaldi afritsins. {PHOTO_NOTE}
          </>
        }
        confirmLabel="Hlaða inn"
        destructive
      />

      <ConfirmDialog
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={() => void confirmSignOut()}
        title="Skrá út?"
        body={
          <div className="space-y-3">
            <p>
              Local gögn verða hreinsuð af þessu tæki. Þú getur skráð þig inn aftur með kóðanum
              þínum og sótt þau úr skýinu. Sæktu afrit fyrst ef þú vilt vera örugg/ur.
            </p>
            <button
              type="button"
              onClick={() => void handleExport()}
              className={footRowButton()}
              style={ROW_STYLE}
            >
              <Download size={12} />
              Sækja afrit núna
            </button>
            <p className="text-[11px]" style={{ color: 'rgba(231,217,168,.5)' }}>
              {PHOTO_NOTE}
            </p>
          </div>
        }
        confirmLabel="Skrá út"
        destructive
      />
    </div>
  );
}
