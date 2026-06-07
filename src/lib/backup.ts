import { exportSnapshot, importSnapshot, migrateSnapshot } from './sync';

/** Skráarnafn afrits: spira-afrit-YYYY-MM-DD.json (staðartími). */
function backupFileName(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `spira-afrit-${y}-${m}-${d}.json`;
}

/**
 * Býr til SnapshotV1 (án mynda), pakkar í JSON Blob og hleður niður.
 * Myndir fylgja ekki með — þær eru aðeins á þessu tæki.
 */
export async function downloadBackup(): Promise<void> {
  const snapshot = await exportSnapshot();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Gefum vafranum augnablik til að hefja niðurhalið áður en URL-ið er losað.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Les afritsskrá, staðfestir gerðina og skrifar yfir staðbundin gögn.
 * Dexie-hookarnir (installAutoSyncHooks) ræsa sync-push sjálfkrafa við
 * bulkAdd/clear, svo innflutt afrit fer upp í skýið eftir á.
 * Kastar með íslenskum skilaboðum ef skráin er ógild.
 */
export async function importBackupFile(file: File): Promise<void> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error('Gat ekki lesið skrána — hún er ekki gilt JSON.');
  }
  const snapshot = migrateSnapshot(raw); // staðfestir v1, kastar annars
  await importSnapshot(snapshot);
}
