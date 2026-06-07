# rosimpro — Rós fær aðalhlutverkið (desktop splitview + uppskerumat + ný Rós-tab)

Markmið: Rós er stjarna appsins. Á desktop fær hún fastan sess á GrowDetail-síðunni
(splitview: framvinda + mælikvarðar vinstra megin, Rós-gluggi hægra megin), spáir
um stærð uppskerunnar ÁÐUR en hún er tínd, og fær ný tab sem gera hana að
raunverulegu mælaborði — ekki bara popup.

Vinnulag: research → plan (þetta skjal) → agent-team → implementa → UX-agent rýnir
→ pólering → `npm run check` grænt → commit.

---

## Phase 0 — Research & undirbúningur

- [x] Lesa kóðann: GrowDetail, RosWindow/rosWindowState, InsightsTab, HealthTab,
      ChatTab, predict.ts, harvestStats.ts, useRosOverviewData, varieties (yield-hooks:
      tomat/jarðarber hafa `fruitWeightG`, kartöflur `maturity`, pipar SHU/species)
- [x] Web-research agent: uppskerumats-aðferðir (pre-harvest) + bestu assistant-tab
      hugmyndir úr sambærilegum öppum — niðurstaða: count × unit-weight × stage-confidence,
      alltaf BIL; benchmark-tölur per crop komnar með heimildum (tómatar 0,146 klasa/dag
      @20°C, pipar 5-150 belgir eftir tegund, jarðarber 400-800 g/plöntu, kartöflur
      0,9-2,7 kg/plöntu eftir maturity)
- [x] Búa til UX-agent: `.claude/agents/ros-ux.md` — rýnir alla Rós-fleti
- [x] Notandi velur scope: **allar 5 tillögur** á /ros-síðuna + tab-in **Uppskera/Ferill/Vika**

## Phase 1 — Uppskerumats-vélin (`src/lib/ros/yield.ts`) — PURE + tests

Spáir HVAÐ uppskeran verður stór (g) fyrir hverja plöntu og ræktun í heild,
áður en tínt er. Sömu hönnunarreglur og predict.ts: hrein föll, `now` inn sem rök,
deterministic, þolið gagnvart vantandi gögnum.

- [ ] `estimateYield(plant, variety, harvests, logs, now)` → `{ lowG, highG, basis[] }`
      eftir flokki:
      - **Pipar**: áætlaðir belgir eftir tegund/stærðarklassa × g/belg — notar
        RAUN g/belg úr harvestStats afbrigðisins ef til, annars benchmark
      - **Tómatar**: growthHabit (det/indet) → klasar × aldin/klasa × `fruitWeightG`
      - **Jarðarber**: ber/krónu eftir `berryType` × `fruitWeightG`
      - **Kartöflur**: kg/plöntu eftir `maturity` × dagar-í-mold stuðull
      - Fasastuðull: fræplanta/veg gefur breiðara bil (minna öryggi), aldin/þroski þrengra
      - Dregur frá það sem þegar er tínt → "eftir á plöntunni"
- [ ] `estimateGrowYield(plants, …)` → samtala + öryggisbil fyrir ræktun
- [ ] `basis[]`-strengir á íslensku ("byggt á 3 tínslum", "afbrigðagögn") — UI sýnir AF HVERJU
- [ ] Valfrjáls fínpússun með mynd: "Telja af mynd" — Gemini vision telur blóm/aldin
      á nýjustu mynd og uppfærir matið (sama mynstur og HealthTab assessment)
- [ ] Geymsla myndamats: db **v6** tafla `rosYieldChecks` (id, plantId, growId, photoId,
      count, kind, createdAt) — staðbundin, ALDREI í sync-snapshot
- [ ] LogComposer: valfrjáls `fruitCount`-reitur ("Fjöldi aldina") á pollinate-log →
      handvirkt inntak styrkir matið
- [ ] `yield.test.ts` — öll crop, tóm gögn, harvests-leiðrétting, fasa-bil

## Phase 2 — RosPanel refactor + GrowDetail splitview (desktop)

- [x] Draga tab-skelina úr `RosWindow.tsx` í `RosPanel.tsx` (engin Modal, tekur
      `tabs`-config) — RosWindow verður þunn Modal-skel utan um RosPanel
- [x] **Popout** („Spyrja Rós") fær: **Spjall, Heilsa, Greining** (spjall fyrst —
      hnappurinn segir „spyrja"); á mobile heldur hann líka **Ráð** (engin embedded rúða þar)
- [x] **GrowDetail desktop** (`lg:`): tveggja dálka grid —
      vinstri: HeroCard/PhaseBar, stats, Season/Veritable/EnvBand, plöntur, metrics,
      harvest, myndir, skráningar; hægri: **föst (sticky) Rós-rúða** í fullri hæð
      með RosPanel: **Ráð + 3 ný tab** (lítil scrollrönd í lagi)
- [ ] Mobile (`<lg`) óbreytt eins dálks; uppskeruspáin fær samt kort í
      GrowHarvestSection-svæðinu svo mobile missi ekki fítusinn
- [ ] RosWindow lazy-load helst; embedded rúðan lazy-loadast líka (markdown-vélin)

## Phase 3 — Þrjú ný tab í embedded Rós-rúðunni

- [x] **Uppskera** — uppskerumat: heildarspá (bil) + per-plöntu + „Telja af mynd" (vision)
- [x] **Ferill** — heilsuskor-trend + mynda-samanburður + fasa-hraði (growthTrack.ts +11 test)
- [x] **Vika** — vikuyfirlit ofan á weekDigest.ts (+21 test)
- [ ] Tóm-states allra tabba segja hvernig á að GERA þau gagnleg (ekki bara „engin gögn")

## Phase 4 — Rós-síðan (/ros) flest út — TILLÖGUR (notandi velur)

1. [x] **Væntanleg uppskera** — samtals-spá (bil, kg ef ≥1000g) + per-ræktun, „byggt á …"
2. [x] **Heilsuyfirlit** — nýjasta skor per plöntu + trend-ör, smellanlegt → /grow/:id
3. [x] **Dagatal næstu 14 daga** — innsýn [0,14] + uppskerugluggar, „Í dag/Á morgun/Eftir N"
4. [x] **Afbrigða-stigatafla** — yieldByVariety, Trophy á #1, merkt raun-uppskera
5. [x] **Mynda-vika** — sl. 7 daga myndir, þumlar → PhotoLightbox
6. [x] **Spurning vikunnar** — SUGGESTION_BY_KIND úr versta insight → djúptenging
       `/grow/:id?spyrja=1&q=…`: opnar Rós-popout á Spjall með spurningu forskrifaða
       (RosPanel `initialTab` eftir merki, ChatTab `initialDraft`; GrowDetail les+hreinsar param)

## Phase 5 — UX-rýni + pólering

- [x] `ros-ux` agent rýndi: GrowDetail splitview, RosPanel tab, /ros síðuna
- [x] Lagað öll P1/P2 + ódýr P3:
      - P1: desktop-hnappur „Spjall við Rós" (media-query); YieldTab offline-vörn á
        „Telja af mynd"; íslenskt kommu-tugabrot í /ros þyngdum (3 staðir)
      - P2: fullWidth flipar í RosPanel; Tínsla fremst + terracotta í Vika; „Vikuskýrslur
        — Dagskrá Rósar"; uppskerugluggar fjarlægðir úr 14-daga dagatali (tvíverknaður);
        Uppskeruspá-raðir smellanlegar
      - P3: aria-label „Rós — yfirlit ræktunar"; relativeTime á „Telja aftur";
        animate-pulse á mynda-placeholder; dauður ternary í AgendaSection
- [x] A11y: aria-label betri; announce() þegar á async (Heilsa/Uppskera)

## Phase 6 — Gate & frágangur

- [x] `npm run check` grænt (tsc + eslint + 315 test)
- [x] CLAUDE.md uppfært (yield.ts, RosPanel, db v6, ný tab, splitview)
- [ ] Commit

---

## Tækni-ákvarðanir

- Yield-vélin er **offline-first**: virkar án API-lykils; Gemini-talning er valfrjáls
  fínpússun, aldrei forsenda
- Spá birtist ALLTAF sem bil + basis — aldrei ein tala án skýringar (traust)
- Engin ný tafla í sync-snapshot; `rosYieldChecks` er device-local eins og photos/ros*
- Benchmarks í sér gagnaskrá (`src/lib/ros/yieldBenchmarks.ts`) með heimildum í
  athugasemdum — uppfærist með research-niðurstöðum
- Splitview notar sama mynstur og Home: mobile-tré + desktop-tré (`hidden lg:grid`)
