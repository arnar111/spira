/**
 * Rós reglu-vél — útiræktunar-innsýnir (4.4 klofningur).
 *
 * Eitt safn fyrir árstíð/frost/hreyking/myglu/vetrarmold. Beinn, vélrænn
 * útdráttur úr gamla `computeInsights` — engin hegðunarbreyting.
 */

import type { GrowPhase } from '@/lib/db';
import { seasonForMonth, frostRisk } from '@/lib/season';
import type { RosInsight } from '../types';
import {
  type EngineContext,
  dayWord,
  daysSince,
  lastLogForPlant,
  plantLabel,
} from './helpers';

/** — ÁRSTÍÐ & FROST (aðeins útiræktun) — */
export function outdoorInsights(ctx: EngineContext): RosInsight[] {
  const { grow, logs, now, month, activePlants, outdoor } = ctx;
  const out: RosInsight[] = [];
  if (outdoor && !grow.archived && activePlants.length > 0) {
    const season = seasonForMonth(month);
    const risk = frostRisk(month);
    const hasPotato = activePlants.some((p) => p.category === 'potato');
    const hasStrawberry = activePlants.some((p) => p.category === 'strawberry');

    // Sáning/forspírun: kartöflur sem bíða niðursetningar fá árstíðabundið ráð,
    // svo splunkuný ræktun standi ekki ráðlaus.
    const plantingPotatoes = activePlants.some(
      (p) =>
        p.category === 'potato' &&
        (p.currentPhase === 'planning' || p.currentPhase === 'germinating'),
    );
    if (plantingPotatoes) {
      if (month >= 2 && month <= 4) {
        out.push({
          id: `plant-${grow.id}`,
          kind: 'season',
          severity: 'soon',
          title: 'Forspíraðu kartöfluútsæðið',
          detail:
            'Mars er rétti tíminn til að forspíra útsæði inni (ljóst, 10–15°C) þar til spírur eru 1–2 cm — það flýtir uppskeru um 2–4 vikur.',
        });
      } else if (month === 5 || month === 6) {
        out.push({
          id: `plant-${grow.id}`,
          kind: 'season',
          severity: 'soon',
          title: 'Kominn tími til að setja niður',
          detail:
            'Seint í maí–júní: settu kartöflur niður 10–15 cm djúpt þegar jarðvegur er 7–10°C og frosthætta er liðin.',
        });
      }
    }

    // Frost ræðst af árstíð: á haustin -> taktu upp fyrir frost; á vorin ->
    // verðu ungar plöntur fyrir næturfrosti (ekki uppskera!).
    const growingPhases: GrowPhase[] = ['vegetative', 'flowering', 'fruiting', 'ripening', 'harvest'];
    const someGrowing = activePlants.some((p) => growingPhases.includes(p.currentPhase));
    if (someGrowing && risk !== 'none') {
      if (month >= 9) {
        out.push({
          id: `frost-${grow.id}`,
          kind: 'frost',
          severity: risk === 'hard' ? 'due' : 'soon',
          title: risk === 'hard' ? 'Frosthætta — taktu upp núna' : 'Frost á næsta leiti',
          detail: `${season.name}: ${risk === 'hard' ? 'hörð frosthætta' : 'frosthætta á jaðri tímabils'} í Reykjavík. Taktu upp uppskeru fyrir fyrsta frost (hörð frost undir −2°C skemma hnýði og aldin).`,
        });
      } else {
        out.push({
          id: `frost-${grow.id}`,
          kind: 'frost',
          severity: 'soon',
          title: 'Næturfrost mögulegt',
          detail: `${season.name}: enn getur gert næturfrost í Reykjavík. Verðu ungar plöntur með reyfi á köldum nóttum og bíddu með viðkvæm afbrigði þar til frosthætta er liðin.`,
        });
      }
    }

    // Hreyking kartaflna í vexti.
    if (hasPotato) {
      for (const p of activePlants) {
        if (p.category !== 'potato') continue;
        if (p.currentPhase !== 'vegetative') continue;
        const lastHill = lastLogForPlant(logs, 'prune', p.id);
        const since = lastHill !== undefined ? daysSince(now, lastHill) : undefined;
        if (since === undefined || since >= 21) {
          out.push({
            id: `hill-${p.id}`,
            kind: 'hill',
            severity: 'soon',
            title: `Hreyktu að ${plantLabel(p)}`,
            detail:
              since === undefined
                ? 'Mokaðu mold að stönglunum þegar grös eru 15–20 cm, og aftur við 30–40 cm. Hreyking ver hnýðin gegn ljósi (grænku) og eykur uppskeru.'
                : `Síðast hreykt fyrir ${since} ${dayWord(since)}. Mokaðu mold að stönglunum aftur ef grös hafa hækkað um 15–20 cm.`,
            plantId: p.id,
          });
        }
      }
      // Mygluvakt í ágúst.
      if (month === 8) {
        out.push({
          id: `blight-${grow.id}`,
          kind: 'info',
          severity: 'info',
          title: 'Mygluvakt',
          detail:
            'Ágúst í röku veðri er háannatími kartöflumyglu. Tryggðu loftflæði, forðastu yfirvökvun og fjarlægðu sýkt grös strax.',
        });
      }
    }

    // Vetrarmold fyrir fjölær jarðarber.
    if (hasStrawberry) {
      if (month === 10 || month === 11) {
        out.push({
          id: `mulch-${grow.id}`,
          kind: 'mulch',
          severity: 'soon',
          title: 'Leggðu vetrarmold yfir jarðarberin',
          detail:
            'Eftir fyrstu hörðu frostin: leggðu 10–15 cm af hálmi (eða meira ef snjór er óáreiðanlegur) yfir krónurnar til að verja þær yfir veturinn.',
        });
      } else if (month === 5) {
        out.push({
          id: `mulch-${grow.id}`,
          kind: 'mulch',
          severity: 'info',
          title: 'Fjarlægðu vetrarmoldina',
          detail:
            'Þegar jarðvegur nær ~5°C og nývöxtur byrjar (oftast seint í maí): fjarlægðu vetrarmoldina smám saman á 1–2 vikum.',
        });
      }
    }

    // Almennt mánaðarráð fyrir útiræktun.
    out.push({
      id: `season-${grow.id}`,
      kind: 'season',
      severity: 'info',
      title: `${season.name}: útiræktun`,
      detail: season.outdoorNote,
    });
  }
  return out;
}
