/**
 * Rós — innsýn (insights) gerðar af reglu-vélinni.
 * Allt keyrir offline og deterministískt; engin köllun á klukku/random hér.
 */

/** Flokkur innsýnar — stýrir tákni og þemum í viðmóti. */
export type RosInsightKind =
  | 'water'
  | 'feed'
  | 'prune'
  | 'top'
  | 'pollinate'
  | 'deblossom'
  | 'runner'
  | 'harvest'
  | 'light'
  | 'env'
  | 'info';

/** Forgangur: 'due' = tímabært núna, 'soon' = innan dags, 'info' = til upplýsingar. */
export type RosSeverity = 'due' | 'soon' | 'info';

/** Ein innsýn sem Rós getur sýnt notanda eða gefið LLM sem samhengi. */
export interface RosInsight {
  /** Stöðugt auðkenni, t.d. 'water-<growId>' — má nota sem React key. */
  id: string;
  kind: RosInsightKind;
  severity: RosSeverity;
  /** Stutt fyrirsögn á íslensku. */
  title: string;
  /** Nánari skýring á íslensku. */
  detail: string;
  /** Dagar þar til verkefni er tímabært (neikvætt = liðið). null/undefined = á ekki við. */
  dueInDays?: number | null;
  /** Tengd planta ef innsýnin á við eina plöntu. */
  plantId?: string;
}
