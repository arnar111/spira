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

export { computeInsights, plantLabel, phaseLabel } from './engine/index';
// Beint frá digest (ekki gegnum index) — digest flytur inn computeInsights úr
// index, svo endur-útflutningur þar myndaði hring sem Rollup varar við þegar
// vélin er í ákafa knippinu (Heim) en digest í letihlaðna Rós-knippinu.
export { buildContextDigest } from './engine/digest';
