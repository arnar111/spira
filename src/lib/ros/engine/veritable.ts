/**
 * Rós reglu-vél — Véritable SMART (vatnsrækt) innsýnir (4.4 klofningur).
 *
 * Eitt safn fyrir tank-/hreinsunar-/dúka-/grisjunar-/næringar-/Lingot-ráð.
 * Beinn, vélrænn útdráttur úr gamla `computeInsights` — engin hegðunarbreyting.
 */

import { isHerb, isLeafy } from '@/lib/varieties';
import type { RosInsight } from '../types';
import {
  type EngineContext,
  dayWord,
  daysSince,
  isFruiting,
  lastLogTs,
  lastMaintenanceTs,
  lingotLifespanByCategory,
  plantLabel,
  plantStartTs,
  plantVariety,
} from './helpers';

/** — VÉRITABLE SMART (vatnsrækt) — */
export function veritableInsights(ctx: EngineContext): RosInsight[] {
  const { grow, logs, now, activePlants, growActive, veritable } = ctx;
  const out: RosInsight[] = [];
  if (!(veritable && growActive)) return out;

  // Viðmiðunardagsetning þegar engin viðeigandi skráning er til: upphaf ræktunar.
  const growStart = grow.startDate;

  // (a) ATHUGA VATNSSTÖÐU — á ~3 daga fresti frá síðustu 'water' skráningu (eða upphafi).
  {
    const WATER_CHECK = 3;
    const lastWater = lastLogTs(logs, 'water') ?? growStart;
    const since = daysSince(now, lastWater);
    const dueInDays = WATER_CHECK - since;
    if (since >= WATER_CHECK) {
      out.push({
        id: `veritable-watercheck-${grow.id}`,
        kind: 'tank',
        severity: 'due',
        title: 'Athugaðu vatnsstöðuna',
        detail: `Skoðaðu flotmælinn á Véritable-tankinum og fylltu á ef hann er lágur. Mælt með skoðun á ~${WATER_CHECK} daga fresti — láttu tankinn aldrei tæmast alveg, þá missa hárpípu-dúkarnir sogkraft.`,
        dueInDays,
      });
    } else if (dueInDays <= 1) {
      out.push({
        id: `veritable-watercheck-${grow.id}`,
        kind: 'tank',
        severity: 'soon',
        title: 'Vatnsskoðun á næsta leiti',
        detail: 'Kíktu á flotmælinn á Véritable-tankinum á morgun og fylltu á ef hann er lágur.',
        dueInDays,
      });
    }
  }

  // (b) FYLLA Á TANK — bil ræðst af álagi: aldinplöntur 7 d, blandað 10 d, einungis kryddjurtir/lauf 14 d.
  {
    const anyFruiting = activePlants.some(isFruiting);
    const anyHerbLeafy = activePlants.some(
      (p) => p.category === 'herb' || p.category === 'leafy',
    );
    const refillDays = anyFruiting ? (anyHerbLeafy ? 10 : 7) : 14;
    const loadNote = anyFruiting
      ? anyHerbLeafy
        ? 'blönduð hleðsla (aldin + kryddjurtir/lauf)'
        : 'aldinplöntur — mikil vatnsþörf'
      : 'kryddjurtir/lauf — hófleg vatnsþörf';
    const lastWater = lastLogTs(logs, 'water') ?? growStart;
    const since = daysSince(now, lastWater);
    const dueInDays = refillDays - since;
    const refillDetail = `Tæmdu gamla vatnið og fylltu á með stofuheitu vatni (18–22°C) upp að hámarkslínu — ekki yfir hana (rótarfúi). Bil hér: ~${refillDays} dagar (${loadNote}).`;
    if (since >= refillDays) {
      out.push({
        id: `veritable-refill-${grow.id}`,
        kind: 'tank',
        severity: 'due',
        title: 'Fylltu á Véritable-tankinn',
        detail: `Síðasta áfylling fyrir ${since} ${dayWord(since)}. ${refillDetail}`,
        dueInDays,
      });
    } else if (dueInDays <= 1) {
      out.push({
        id: `veritable-refill-${grow.id}`,
        kind: 'tank',
        severity: 'soon',
        title: 'Áfylling á næsta leiti',
        detail: `Síðasta áfylling fyrir ${since} ${dayWord(since)}. Næsta áfylling líklega á morgun. ${refillDetail}`,
        dueInDays,
      });
    }
  }

  // (c) HREINSA TANK — á ~14 daga fresti frá síðustu 'clean_tank' viðhaldsskráningu (eða upphafi).
  {
    const CLEAN_DAYS = 14;
    const lastClean = lastMaintenanceTs(logs, ['clean_tank']) ?? growStart;
    const since = daysSince(now, lastClean);
    const dueInDays = CLEAN_DAYS - since;
    if (since >= CLEAN_DAYS) {
      out.push({
        id: `veritable-clean-${grow.id}`,
        kind: 'clean',
        severity: 'soon',
        title: 'Hreinsaðu vatnstankinn',
        detail: `Síðast hreinsað fyrir ${since} ${dayWord(since)}. Tæmdu og skolaðu tankinn til að verjast þörungum og kalki. Fyrir þrálát útfellingar má nota þynnt edik (1 hluti edik á móti 4 hlutum vatns) og skola vel á eftir — aldrei sápu.`,
        dueInDays,
      });
    }
  }

  // (d) SKOÐA HÁRPÍPU-DÚKA — á ~30 daga fresti frá síðustu inspect/replace skráningu (eða upphafi).
  {
    const WICK_DAYS = 30;
    const lastWick =
      lastMaintenanceTs(logs, ['inspect_wicks', 'replace_wicks']) ?? growStart;
    const since = daysSince(now, lastWick);
    const dueInDays = WICK_DAYS - since;
    if (since >= WICK_DAYS) {
      out.push({
        id: `veritable-wick-${grow.id}`,
        kind: 'wick',
        severity: 'info',
        title: 'Skoðaðu hárpípu-dúkana',
        detail: `Síðast skoðað fyrir ${since} ${dayWord(since)}. Athugaðu hvort dúkarnir séu stíflaðir, mislitir eða slímugir — skiptu um þá ef svo er (annars dregst vatnið illa upp). Dúkar endast yfirleitt 6–12 mánuði.`,
        dueInDays,
      });
    }
  }

  // (e) GRISJA UNGPLÖNTUR — 7–14 dögum eftir sáningu meðan planta er í spírun/plöntufasa.
  // Bæld um leið og 'thin_seedlings' skráning er til fyrir plöntuna, eða planta > ~21 daga.
  {
    const THIN_MAX_AGE = 21;
    for (const p of activePlants) {
      if (p.currentPhase !== 'germinating' && p.currentPhase !== 'seedling') continue;
      const ageDays = daysSince(now, plantStartTs(p));
      if (ageDays > THIN_MAX_AGE) continue;
      const alreadyThinned =
        lastMaintenanceTs(logs, ['thin_seedlings'], p.id) !== undefined;
      if (alreadyThinned) continue;
      if (ageDays >= 7) {
        out.push({
          id: `veritable-thin-${p.id}`,
          kind: 'thin',
          severity: 'soon',
          title: `Grisjaðu ungplönturnar í ${plantLabel(p)}`,
          detail: `Dagur ${ageDays} frá sáningu. Lingot spírar með mörgum fræjum — haltu eftir 1–3 sterkustu plöntunum og klíptu hinar af við rótarhálsinn (ekki rífa upp, það raskar rótum hinna).`,
          dueInDays: 0,
          plantId: p.id,
        });
      }
    }
  }

  // (f) VIÐBÓTARNÆRING — aldinplöntur ≥ 8 vikna: bæta fljótandi áburði í tankinn á 14–21 daga fresti.
  // Innbyggð Lingot-næring fer að klárast eftir ~8 vikur hjá aldinplöntum (skýrsla §4.1).
  {
    const NUTRIENT_AGE_DAYS = 56; // ~8 vikur
    const NUTRIENT_CADENCE = 21; // efra mark 14–21 daga bils
    const lastFeed = lastLogTs(logs, 'feed');
    const matureFruiting = activePlants.filter(
      (p) => isFruiting(p) && daysSince(now, plantStartTs(p)) >= NUTRIENT_AGE_DAYS,
    );
    if (matureFruiting.length > 0) {
      const since = lastFeed !== undefined ? daysSince(now, lastFeed) : undefined;
      if (since === undefined) {
        out.push({
          id: `veritable-nutrient-${grow.id}`,
          kind: 'feed',
          severity: 'soon',
          title: 'Bætið fljótandi áburði í tankinn',
          detail:
            'Aldinplönturnar eru orðnar ≥ 8 vikna og innbyggða Lingot-næringin fer að þverra. Þynntu fljótandi áburð (t.d. 2–4 ml/l) út í ferskt tankvatn á 2–3 vikna fresti — gott með hverri áfyllingu.',
          dueInDays: 0,
        });
      } else {
        const dueInDays = NUTRIENT_CADENCE - since;
        if (since >= NUTRIENT_CADENCE) {
          out.push({
            id: `veritable-nutrient-${grow.id}`,
            kind: 'feed',
            severity: 'soon',
            title: 'Bætið fljótandi áburði í tankinn',
            detail: `Síðast gefið fyrir ${since} ${dayWord(since)}. Þynntu fljótandi áburð út í ferskt tankvatn (á 2–3 vikna fresti) fyrir aldinplönturnar.`,
            dueInDays,
          });
        }
      }
    }
  }

  // (g) LÍFTÍMI LINGOTS — þegar aldur plöntu nálgast/fer fram úr líftíma Lingots.
  // lifespanDays úr afbrigði ef til; annars skynsamlegt mat eftir flokki.
  {
    const LINGOT_WARN_DAYS = 14; // byrja að minna ~2 vikum áður en líftími rennur út
    for (const p of activePlants) {
      const variety = plantVariety(p);
      let lifespan: number | undefined;
      if (variety && (isHerb(variety) || isLeafy(variety))) {
        lifespan = variety.lifespanDays;
      }
      if (lifespan === undefined) {
        // Mat eftir flokki: kryddjurtir ~165 d, lauf ~105 d, aldin ~120 d.
        lifespan = lingotLifespanByCategory(p.category);
      }
      if (lifespan === undefined) continue;
      const ageDays = daysSince(now, plantStartTs(p));
      const dueInDays = lifespan - ageDays;
      if (dueInDays <= LINGOT_WARN_DAYS) {
        out.push({
          id: `veritable-lingot-${p.id}`,
          kind: 'lingot',
          severity: 'info',
          title: `Lingot ${plantLabel(p)} að renna sitt skeið`,
          detail:
            dueInDays <= 0
              ? `Lingot er komið fram úr áætluðum líftíma (~${lifespan} dagar). Skipuleggðu skipti — fjarlægðu gamla Lingotið (má jarðgera) og settu nýtt í körfuna.`
              : `Áætlaður líftími Lingots (~${lifespan} dagar) rennur út eftir ~${dueInDays} ${dayWord(dueInDays)}. Skipuleggðu skipti tímanlega.`,
          dueInDays,
          plantId: p.id,
        });
      }
    }
  }

  return out;
}
