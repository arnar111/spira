import { Scale } from 'lucide-react';
import type { YieldOverview } from './useRosOverviewData';
import { SectionTitle, MutedCard } from './parts';

/**
 * Snyrtir grömm: kg með einum aukastaf þegar ≥ 1000 g, annars heil grömm.
 * Notar íslenskt kommu-tugabrot (1,2 kg) eins og aðrir Rós-fletir.
 */
function fmtWeight(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(1).replace('.', ',')} kg`;
  return `${Math.round(g)} g`;
}

/** Bil tveggja þyngda sem strengur (eitt gildi ef jöfn). */
function fmtRange(lowG: number, highG: number): string {
  if (Math.round(lowG) === Math.round(highG)) return fmtWeight(lowG);
  return `${fmtWeight(lowG)}–${fmtWeight(highG)}`;
}

/**
 * Væntanleg uppskera — kjarnabón notandans. Heildarmat (eftirstöðvar á
 * plöntunum) yfir allar virkar ræktanir sem BIL, með sundurliðun per ræktun.
 * Aldrei ein tala án skýringar.
 */
export function YieldOverviewSection({ data }: { data: YieldOverview }) {
  const { total, grows } = data;
  return (
    <section className="mb-8">
      <SectionTitle>Væntanleg uppskera</SectionTitle>
      {grows.length === 0 ? (
        <MutedCard>
          Engin uppskera í kortunum enn. Þegar plöntur komast á blóma- eða
          aldinfasa áætlar Rós hvað er eftir að tína — alltaf sem bil.
        </MutedCard>
      ) : (
        <div className="flex flex-col gap-2">
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: 'rgba(194,106,77,.14)',
              border: '1px solid rgba(194,106,77,.32)',
            }}
          >
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(194,106,77,.22)', color: 'var(--terra-300)' }}
            >
              <Scale size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.16em] text-cream-300/65 sp-mono">
                Eftir að tína · samtals
              </div>
              <div className="sp-stat text-cream-50" style={{ fontSize: 24 }}>
                {fmtRange(total.remainingLowG, total.remainingHighG)}
              </div>
            </div>
          </div>

          {grows.map(({ growId, growName, estimate }) => (
            <div
              key={growId}
              className="rounded-2xl p-3 flex items-center justify-between gap-3"
              style={{
                background: 'rgba(36,56,39,.55)',
                border: '1px solid rgba(64,104,67,.4)',
              }}
            >
              <div className="min-w-0">
                <div className="text-cream-50 text-sm font-medium truncate">{growName}</div>
                <div className="text-[11px] text-cream-300/65">
                  {estimate.plants.length}{' '}
                  {estimate.plants.length === 1 ? 'planta metin' : 'plöntur metnar'}
                </div>
              </div>
              <span className="shrink-0 sp-mono text-sm" style={{ color: 'var(--moss-300)' }}>
                {fmtRange(estimate.remainingLowG, estimate.remainingHighG)}
              </span>
            </div>
          ))}

          <p className="text-[11px] text-cream-300/55 px-0.5 leading-relaxed">
            Byggt á fjölda, einingarþyngd og þroskafasa hverrar plöntu — opnaðu
            ræktun og Uppskeru-flipa Rósar fyrir nánari forsendur.
          </p>
        </div>
      )}
    </section>
  );
}
