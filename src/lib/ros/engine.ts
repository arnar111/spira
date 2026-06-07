/**
 * Rós reglu-vél — opinbert API (4.4 klofningur).
 *
 * Vélin sjálf býr nú í `./engine/` möppunni (index/indoor/outdoor/veritable/
 * digest/helpers). Þessi þunna skrá heldur slóðinni `@/lib/ros/engine` stöðugri
 * svo enginn innflutningur breytist annars staðar í kóðanum.
 *
 * Hönnunarreglur óbreyttar: computeInsights og buildContextDigest eru HREIN —
 * `now`/`month` berast inn sem rök, engin klukka/IO inni.
 */

export {
  computeInsights,
  buildContextDigest,
  plantLabel,
  phaseLabel,
} from './engine/index';
