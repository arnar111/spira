# juneimpro.md — June Improvement Day Master Plan

> **Purpose:** This is the working plan for a focused improvement day (2026-06-07). No big new features —
> only improving what exists. Implementation happens in separate Claude Code sessions; each session picks up
> a category/phase from this file.
>
> **Companion file:** `juneimpro-research.md` — the full research dossier with file:line evidence for every
> claim below. **Read it before starting any phase.** Line numbers were verified at commit `6b571aa`
> (branch `claude/veritable-smart-integration`) and will drift — re-locate before editing.
>
> **How to use this file:** Create an agent team for each 5 categories to work together in paralell → read its section + the matching research section → implement →
> check the boxes → update the status table. Keep phases small and shippable; each phase should leave the
> app working and `npm run lint` clean.

---

## Status board

| Category | Ph 1 | Ph 2 | Ph 3 | Ph 4 |
|---|---|---|---|---|
| 1. UX | 🔶 | 🔶 | 🔶 | 🔶 |
| 2. UI | 🔶 | 🔶 | 🔶 | 🔶 |
| 3. Features | 🔶 | 🔶 | 🔶 | 🔶 |
| 4. Codebase | ✅ | ✅ | ⬜ | ⬜ |
| 5. Other | ✅ | 🔶 | 🔶 | ⬜ |

⬜ not started · 🔶 in progress · ✅ done


---

## Global constraints (every session, every phase)

1. **Icelandic UI strings only.** Match existing tone — casual and warm ("Synci klikkaði", "Slakaðu á smá").
2. **Gate:** `npm run lint` (= `tsc --noEmit`) must pass. After Cat 4 Ph 1 lands, also `npm run test` and
   `npx eslint .` must pass.
3. **IndexedDB is the source of truth** (`src/lib/db.ts`, Dexie `SpiraDB`). Schema changes = add a new
   `this.version(n).stores({...})` block. Never edit an existing version. Use `newId()` for IDs.
4. **Sync rules:** if a table should sync, update stores(), `SnapshotV1`, `exportSnapshot`/`importSnapshot`/
   `isSnapshot`, `clearLocalData`, and `installAutoSyncHooks` (all in `src/lib/sync.ts`). Photos,
   rosMessages, rosAssessments, rosReports stay **device-local** — never add them to the snapshot.
5. **All overlays use `src/components/ui/Modal.tsx`** (scroll-lock rule). No bare `fixed inset-0` divs.
6. **Design tokens only:** moss / terracotta / cream / capsicum, fonts Fraunces (`sp-display`) / Inter /
   JetBrains Mono (`sp-mono`). Reuse `src/components/ui/` primitives. No new colors. Dark-only — do NOT
   add a light mode.
7. Import alias `@/` → `src/`.
8. Demo code `123` never syncs (`syncManager.isDemo()`); don't route demo data through `/api/account`.
9. Keep `computeInsights` in `src/lib/ros/engine.ts` **pure** — `now`/`month` come in as params, no
   `Date.now()` inside.
10. Out of scope for the whole day: light mode, real sensor integration (the "Fasi 3" placeholder),
    non-Iceland localization, sync conflict resolution (whole-snapshot LWW stays).
11. Each phase = one focused branch/commit series. Don't mix phases in one commit.

---

# Category 1 — UX

## 1.1 Friction quick-wins

**Goal:** Remove the most-felt daily friction. Small, independent fixes.

- [ ] **Replace native `confirm()` with `<Modal>` confirmations.** Build a small reusable
      `ConfirmDialog` on top of `ui/Modal.tsx` (title, body, confirm/cancel labels, destructive tone using
      terracotta). Replace:
      - Archive grow — `src/pages/GrowDetail.tsx` (~line 122, `confirm('...')`)
      - Reopen grow — `src/pages/History.tsx` (~line 22)
      - Delete Rós report — `src/pages/RosOverview.tsx` (delete handler)
      - Sign-out confirmation in `src/components/Layout.tsx` (~262-272) if it uses `confirm()` — verify.
      Keep existing Icelandic copy; confirm button should state the action ("Loka ræktun", not "OK").
- [ ] **Sync error transparency.** The "Synci klikkaði" badge (`Layout.tsx` ~316) becomes tappable →
      small Modal/popover with: last error reason (store the error message in syncManager state — extend
      `src/lib/sync.ts` status to carry `lastError?: string`), time of last successful sync, and a
      "Reyna aftur" button calling a manual `syncNow()`/flush on the manager.
- [ ] **Auto-focus LogComposer.** When the composer opens, focus the first meaningful input of the chosen
      log type (`src/components/LogComposer.tsx`). Respect mobile (don't force keyboard open on type-picker
      screen — only once a type is chosen).
- [ ] **Phase-select touch target.** The plant phase `<select>` in `GrowDetail.tsx` (~386-396) is 11px
      text. Restyle to ≥14px text / ≥40px hit area, keep inline placement.
- [ ] **Harvest form validation.** `src/pages/Harvest.tsx` entry form: require weight > 0 OR pod count > 0
      before enabling submit; inline Icelandic hint otherwise ("Skráðu þyngd eða fjölda").

**Acceptance:** No `confirm(` left in `src/` (grep). Sync failure shows reason + retry works. tsc clean.

## 1.2 Accessibility

**Goal:** Keyboard/screen-reader baseline without redesigning anything.

- [ ] **Focus trap in Modal** (`src/components/ui/Modal.tsx`). On open: save `document.activeElement`,
      move focus into the dialog (first focusable or the panel itself with `tabIndex={-1}`); Tab/Shift+Tab
      cycle within; on close restore focus. Add `role="dialog"` `aria-modal="true"`, wire `aria-labelledby`
      to the title when present. No new deps — ~30 lines of ref logic (or `focus-trap-react` if it gets
      hairy, but prefer no dep).
- [ ] **aria-label sweep.** Grep for icon-only buttons (lucide icon as sole child) across `src/components/`
      and `src/pages/`; add Icelandic `aria-label`s. Known good examples to imitate: `Layout.tsx` account
      badge, `RosWindow.tsx` close/photo buttons.
- [ ] **Landmarks + labels.** `role="main"`/`<main>` on the Layout content area; convert
      placeholder-as-label inputs to real `<label>` (visually styled like current eyebrow/mono labels —
      reuse `Eyebrow`).
- [ ] **Action announcements.** Add a tiny `aria-live="polite"` region (one, in Layout) + helper
      `announce(msg: string)` (e.g. `src/lib/announce.ts`); call it after log save ("Skráning vistuð"),
      harvest save, archive, sync success-after-error.

**Acceptance:** Modal keeps focus inside; Escape still closes; every icon-only button has a name.

## 1.3 Search & filter

**Goal:** Make lists navigable as data grows. UI pattern: a compact search input + filter chips, matching
the existing chip style in Plants.

- [ ] **Log filtering in GrowDetail** (`src/pages/GrowDetail.tsx`): filter chips by log type (reuse
      `LOG_TYPE_META` icons/labels from `src/lib/logSchema.ts`), a plant selector, and a simple
      "last 7/30/all days" toggle. Filter the already-loaded `useLiveQuery` result in memory — no schema
      changes. Persist nothing.
- [ ] **Plant name search** in `src/pages/Plants.tsx`: text input matching nickname + variety name
      (case/locale-insensitive — normalize with `.toLocaleLowerCase('is')`), composing with existing
      category/mother/color/phase filters.
- [ ] **Grow search** in `src/pages/Grows.tsx` and **History search** in `src/pages/History.tsx`: name +
      location text match. Same input component — build one `SearchInput` in `src/components/ui/`.
- [ ] Keep all existing empty states; add a "no results" variant ("Ekkert fannst") distinct from
      "no data yet".

**Acceptance:** All four lists searchable; filters compose; zero-result states present.

## 1.4 Flow polish

**Goal:** Round off the remaining flow gaps.

- [ ] **Log edit & delete.** Logs are currently immutable. Add per-log actions (edit opens LogComposer
      prefilled — extend it to accept an `existing?: LogEntry`; delete via ConfirmDialog from 1.1).
      On edit, `db.logs.put()`; on delete, also delete the linked photo row if the log is the photo's only
      reference. Dexie hooks auto-schedule sync — verify `updating`/`deleting` hooks fire (they're
      installed in `installAutoSyncHooks`).
- [ ] **Mobile nav completeness.** `Layout.tsx` mobile nav (~33-40) omits Umhverfi + Safn. Solution:
      replace the 6th slot with a "Meira" item opening a Modal sheet listing the remaining destinations
      (Umhverfi, Safn, + anything future). Keep 5 primary tabs max for thumb reach.
- [ ] **SetupWizard step-3 clarity** (`src/pages/SetupWizard.tsx` ~277-284): add one explanatory line
      under the step heading stating why this step appears ("Af því að þú valdir útirækt sýnum við
      árstíðaráð" / equivalent for Veritable/indoor).
- [ ] **Welcome CTA timing** (`src/pages/Welcome.tsx`): "Byrja" button visible/enabled within ~0.8s
      (animate in earlier or in parallel); keep the plant animation running behind.
- [ ] **Decide the Home placeholders** (`src/pages/Home.tsx` ~505-543 "Umhverfi · BÍÐ" hardcoded card,
      ~554-582 "Næstu skref" roadmap): replace the fake "—" sensor card with the real latest environment
      reading for the primary grow (data exists in the `environment` table); trim "Næstu skref" to only
      genuinely-planned items or remove. Ask the user if unsure which.

**Acceptance:** A mis-entered log can be fixed without devtools; every page reachable on mobile.

---

# Category 2 — UI

## 2.1 Typography system & icon consistency

**Goal:** One scale instead of per-page px values. **Visual output should be near-identical** — this is
normalization, not redesign.

- [ ] Define a type scale as CSS utility classes in `src/index.css` `@layer components` (matches existing
      `.sp-*` convention): e.g. `.sp-h1` (30px/1.05/-0.015em, Fraunces 500), `.sp-h2` (24px), `.sp-h3`
      (18–20px), `.sp-stat` (24–30px, -0.02em), `.sp-label` (10px mono uppercase 0.16em). Derive exact
      values from the current usage table in `juneimpro-research.md` §2 — pick the dominant value where
      pages disagree.
- [ ] Sweep pages (`Home`, `Grows`, `GrowDetail`, `Plants`, `Harvest`, `Environment`, `History`,
      `RosOverview`, `Login`, `Welcome`) replacing inline font-size/weight/letter-spacing styles with the
      classes. Leave `SetupWizard` for 4.4 (it's being split) unless trivial.
- [ ] **Icon color convention:** standardize on CSS vars (`var(--moss-300)` etc.) for all lucide `color`
      props; replace inline rgba strings (e.g. `Layout.tsx` ~79).

**Acceptance:** No inline `fontSize` on headings in swept pages; screenshots before/after look the same.

## 2.2 Component extraction

**Goal:** Kill the ~40% duplicated card/row styling. Extract, then re-use — do NOT restyle while extracting.

- [ ] `ui/StatCard` (or extend existing `ui/Stat.tsx`) ← QuickStat pattern in `Home.tsx` ~92-130.
- [ ] `ui/HeroCard` or a `Card` variant ← hero pattern in `GrowDetail.tsx` ~143-156.
- [ ] `components/GrowRow.tsx` ← grow row card in `Grows.tsx` ~84-99 (also usable by History).
- [ ] `ui/ActionTile` ← quick-action grid buttons in `LogComposer.tsx` ~174-194.
- [ ] `ui/TaskRow` ← maintenance task items in `VeritableCard.tsx` ~196-216.
- [ ] Login's `TabButton` → use/extend `ui/Tabs.tsx`; keep `CodeInput` as-is (it's good) but move it to
      `src/components/CodeInput.tsx` if reuse appears.
- [ ] Each extraction: move markup + styles verbatim, parameterize only what differs, swap call sites,
      visually verify.

**Acceptance:** The listed inline blocks are gone; components live in `ui/`; no visual diff.

## 2.3 Loading & empty visuals

**Goal:** Replace null-renders with skeletons.

- [ ] `ui/Skeleton.tsx`: a shimmer block (CSS animation in `index.css`, token-based —
      `rgba(231,217,168,.06)` base with a subtle moving highlight; respect `prefers-reduced-motion`).
- [ ] Compose per-page skeleton layouts for Home, Grows, GrowDetail, Plants, Harvest (match the real
      layout's card geometry so there's no jump). Render them where pages currently do
      `if (x === undefined) return null` (e.g. `Home.tsx` ~52).
- [ ] Keep it subtle: only show skeleton if loading exceeds ~150ms (avoid flash) — tiny `useDelayedFlag`
      hook.

**Acceptance:** Cold load shows structure, not blank; no layout shift when data arrives.

## 2.4 Chart & detail polish

**Goal:** Make `ui/Sparkline.tsx` good enough to carry Category 3's new charts.

- [ ] Upgrade Sparkline: optional min/max/avg reference line, optional smoothing (monotone cubic or simple
      Catmull-Rom — keep SVG, no chart lib), gradient fill using token colors, last-value dot + label,
      empty-data state ("Engin gögn").
- [ ] Add an optional simple x-axis (first/last date labels only, `sp-mono` 9px).
- [ ] Add a `ui/RangeToggle` (7/14/30/all) component for chart windows — Environment page adopts it
      (currently hardcoded 14 days).
- [ ] Photo lightbox visuals: full-screen Modal variant (near-black backdrop, pinch/scroll-safe,
      caption = date + plant name). The gallery that uses it ships in 3.2 — build the viewer here so 3.2
      only wires data.

**Acceptance:** Environment charts render with the new Sparkline + range toggle; lightbox component exists.

---

# Category 3 — In-app features (deepening existing)

## 3.1 Surface hidden data

**Goal:** pH, EC, runoff, light hours and watering cadence are already captured in `LogEntry.data` /
`environment` — show them. Depends on 2.4 Sparkline upgrades (use old Sparkline if 2.4 not done yet).

- [ ] **pH & EC charts** on the Environment page (and/or a per-grow section in GrowDetail): extract series
      from water/feed logs (`data.ph`, `data.ec` — see `src/lib/logSchema.ts` field names; coerce with the
      same `asNumber` approach as `formatLogData`). One chart each, range-toggleable.
- [ ] **Light-hours chart**: series from `environment` samples (`lightHours`), same treatment.
- [ ] **Watering timeline** in GrowDetail: compact horizontal strip (one tick per water log, height/color
      ∝ amountMl when present) + derived stat "Meðalbil milli vökvana: X dagar". Pure presentational —
      compute from logs in memory.
- [ ] Put the series-extraction helpers in a new pure module `src/lib/series.ts`
      (`phSeries(logs)`, `ecSeries(logs)`, `wateringIntervals(logs)` …) so Cat 4 can test them.

**Acceptance:** A grow with pH/EC logged shows trends; no schema changes needed.

## 3.2 Photo management

**Goal:** Photos become browsable. All device-local — no sync changes.

- [ ] **Gallery view**: per-grow tab/section in GrowDetail and per-plant view — chronological grid of
      thumbnails from `db.photos` (`usePhotoUrl` for object URLs; make sure URLs are revoked on unmount —
      check `src/lib/photos.ts` hook behavior). Group headers by month (Icelandic month names — use the
      central date util once 4.3 lands).
- [ ] **Lightbox**: wire the 2.4 viewer — swipe/arrow between photos, shows date + plant + linked log note.
- [ ] **Delete from gallery** (ConfirmDialog), including cleaning the `photoId` reference on the linked
      log entry.
- [ ] **Storage usage**: `navigator.storage.estimate()` → show "Myndir nota ~X MB" in the gallery header;
      warn (terracotta) above ~80% quota.

**Acceptance:** All photos of a grow/plant visible in ≤2 taps; deletion works; usage visible.

## 3.3 Harvest & environment analytics

**Goal:** Turn raw totals into insight. All computed in memory from existing tables.

- [ ] **Harvest timeline**: chart of harvest entries over time per grow (weight per event), on the Harvest
      page per-grow section.
- [ ] **Yield efficiency**: per plant/grow — g per day since first harvestable phase, avg g per pod
      (exists), harvests per week. Show as StatCards.
- [ ] **Variety comparison**: aggregate harvests by varietyId across all grows (incl. archived) → simple
      ranked list "Uppskera eftir afbrigði" with weight + count. Lives on the Harvest page.
- [ ] **Prediction vs actual**: where a plant has both a `HarvestPrediction` (`src/lib/ros/predict.ts`)
      and actual harvest logs, show "spáð vs raun" line in GrowDetail.
- [ ] **Environment target ranges**: add per-phase indoor target bands (temp/humidity) as a pure data table
      in a new `src/lib/envTargets.ts` (derive sensible values from `research/` care data; e.g. germination
      24–28°C, veg 20–26, flowering 18–24 — verify against `research/growing_guide.html`). Environment page
      + GrowDetail show current reading vs band ("innan marka" / terracotta warning outside). **Also feed
      this into Rós in 3.4.**

**Acceptance:** Harvest page answers "what yields best?"; out-of-range environment is visibly flagged.

## 3.4 Rós deepening

**Goal:** Close the engine's blind spots. Keep `computeInsights` pure; extend types in
`src/lib/ros/types.ts`.

- [ ] **pest/disease forms in LogComposer**: add field schemas in `src/lib/logSchema.ts` (pest: tegund
      select [lús/spunamítill/hvítfluga/annað] + severity [lítil/miðlungs/mikil] + note; disease: similar)
      so they're loggable outside the DiagnosisWizard. Extend `formatLogData` for both.
- [ ] **Engine uses environment data**: new insights in `engine.ts` — temp/humidity outside the 3.3
      `envTargets` band for the plant's phase (severity `soon`, only if a reading exists in last 48h);
      dry-air pest risk refinement using actual humidity instead of just month.
- [ ] **Engine uses pH/EC**: if last water/feed log has pH outside 5.5–6.8 (hydro/soil-appropriate — check
      research docs) → `info` insight with the value.
- [ ] **Assessment history**: stop overwriting. In `db.ts` bump schema (new version block) so
      `rosAssessments` keys by `id` (newId) instead of plantId, with `plantId` indexed; UI (Heilsa tab in
      `RosWindow.tsx`) shows latest + collapsible history with score trend (tiny sparkline). Stays
      device-local — do NOT add to snapshot.
- [ ] **Pepper CropCare guides**: peppers have zero structured care. Add ~4 `CropCare` blocks in
      `varieties.ts` at the *mother-species tier* (annuum mild / annuum hot / chinense superhot / baccatum
      — content from `research/growing_guide.html`), and resolve a pepper variety's care to its tier guide
      (small helper, keep `hasCare` guard semantics). Render via existing `CareGuide.tsx`.
- [ ] **Care guide from plant context**: in GrowDetail's plant row / plant view, a "Umhirða" affordance
      opens the variety's CareGuide in a Modal.

**Acceptance:** Pest loggable in 2 taps; engine reacts to a too-cold reading; pepper varieties show care;
assessments accumulate.

---

# Category 4 — Codebase

## 4.1 Tooling

**Goal:** Establish the safety net everything else relies on. **Do this phase first.**

- [x] **Vitest**: `npm i -D vitest`. Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts.
      Config inside `vite.config.ts` (`/// <reference types="vitest/config" />` + `test: { environment:
      'node' }` — pure-lib tests don't need jsdom; add jsdom only if/when component tests appear).
      Ensure the `@` alias resolves in tests (it will, via vite config).
- [x] **ESLint flat config**: `npm i -D eslint typescript-eslint eslint-plugin-react-hooks
      eslint-plugin-react-refresh`. `eslint.config.js` with recommended TS rules + react-hooks. Keep rules
      pragmatic — the goal is catching bugs (hooks deps, unused, floating promises), not style wars.
      Script: `"lint:eslint": "eslint ."`. Keep `"lint"` as tsc (CLAUDE.md calls it the gate) and add
      `"check": "npm run lint && npm run lint:eslint && npm run test"`.
- [x] Fix whatever ESLint surfaces (expect react-hooks/exhaustive-deps findings; fix or disable per-line
      with justification). *(One finding: useless `useMemo` on a fresh `Date` in `Home.tsx` — replaced with
      plain computation.)*
- [x] **ErrorBoundary**: class component `src/components/ErrorBoundary.tsx` (Icelandic fallback: "Eitthvað
      fór úrskeiðis" + "Endurhlaða" button + error detail in `sp-mono`). Wrap the routed content inside
      `Layout` in `App.tsx` (so nav survives a page crash) and one around the whole app. *(Wrapped the
      `<Outlet/>` in `Layout.tsx` with `resetKey={pathname}` so navigating clears the error; second
      boundary around the app in `main.tsx`.)*
- [x] **Decide on Prettier**: optional; if added, run once over the repo in its own commit.
      **Decision: skipped** — codebase is already style-consistent and a repo-wide reformat would create
      blame noise + merge conflicts across today's parallel sessions. Revisit after improvement day if wanted.

**Acceptance:** `npm run check` exists and passes; a thrown render error shows the fallback, not a white
screen.

## 4.2 Test the pure core

**Goal:** Lock in current behavior before refactors (4.3/4.4) touch it. Tests in `src/lib/__tests__/` or
co-located `*.test.ts` — pick one convention and note it here. **Convention picked in 4.1: co-located
`*.test.ts` next to the module** (see `src/lib/cn.test.ts`).

- [x] `phases.ts` — `daysSince`, `cycleProgress`, `getPhaseForDay`, boundaries (day 0, day 140, negatives).
- [x] `season.ts` — `frostRisk`/`seasonForMonth`/`seasonStatus` for all 12 months; `growIsOutdoor` cases
      (environment set, garden locationKey, neither).
- [x] `daylight.ts` — `needsGrowLight`/`daylightStatus` for all 12 months.
- [x] `logSchema.ts` — `formatLogData` per log type incl. missing/malformed data fields.
- [x] `ros/engine.ts` — `computeInsights` scenario tests (it's pure: feed fixed `now`/`month` + fixture
      grow/plants/logs): overdue water, feed cadence, topping window, strawberry deblossom vs pollinate,
      outdoor skips indoor insights, Véritable tank/lingot set, potato-is-outdoor. Also `engine.ts` vs
      `season.ts` `growIsOutdoor` divergence — characterize current behavior of BOTH (4.3 unifies them).
- [x] `ros/predict.ts` — window math, null cases (archived, no variety, no daysToHarvest, finished phase).
- [x] `sync.ts` — `exportSnapshot`→`importSnapshot` round-trip equality (use `fake-indexeddb` dev-dep for
      Dexie in node), `isSnapshot` rejects garbage, photos/lastSyncedAt excluded. *(`isSnapshot` is now
      exported from `sync.ts` — 5.2's import UI needs it anyway.)*
- [x] `account.ts` — `normalizeCode`/`isValidCode` edge cases (lowercase, >3 chars, icelandic letters Þ/Ð
      rejected).
- [x] varieties guards — `isTomato`/`isStrawberry`/`isPotato`/`hasCare` over the real catalog (also acts
      as a data-integrity test: every variety has germinate/harvest ranges).

**Acceptance:** `npm run test` green; engine + sync + calendars covered; CI-able via `npm run check`.

## 4.3 De-dupe & type-tightening

**Goal:** One source of truth for shared logic. Behavior-preserving (tests from 4.2 prove it).

- [ ] **Unify `growIsOutdoor`**: single implementation in `season.ts` —
      `growIsOutdoor(grow, plants?)` where the optional plants param adds the potato-category check that
      currently only exists in `engine.ts:144-148`. Engine imports it; delete its local copy. Run engine
      tests.
- [ ] **Central date formatting**: new `src/lib/dates.ts` with `shortDate(ts)` (d. mán), `longDate(ts)`,
      `relativeDays(ts, now)` — replace the copies in `engine.ts` (~1028), `RosOverview.tsx` (~103),
      `RosWindow.tsx` (~346), and inline `Home.tsx` instances. All `Intl.DateTimeFormat('is', …)` based.
- [ ] **Typed log data**: in `logSchema.ts` (or `db.ts`), define per-type data interfaces
      (`WaterLogData { amountMl?: number; ph?: number; ec?: number; runoffMl?: number }`, `FeedLogData`,
      `PollinateLogData`, `MaintenanceLogData`, + 3.4's pest/disease) and a narrowing helper
      `logData<T extends LogType>(entry): …`. Keep `LogEntry.data` as the loose stored shape (snapshot
      compat) but route all reads through the typed helpers (`formatLogData`, engine, the 3.1 `series.ts`).
- [ ] **Kill non-null assertions**: `SetupWizard.tsx:87` (fallback to first LOCATIONS entry),
      `engine.ts:1152` (filter before map).
- [ ] **Error visibility**: replace bare `.catch(() => undefined)` swallows (`LogComposer.tsx` ~109/120/151,
      `photos.ts:113`) with `console.warn('[spira] …', err)` at minimum. Keep the photo-downscale fallback
      (`photos.ts:57-59`) — it's intentional — but add the warn.
- [ ] **Shared Dexie query helpers**: `src/lib/queries.ts` — `logsForGrow(growId)`, `plantsForGrow(growId)`,
      `photosForGrow(growId)` etc., adopted where the `.where('growId').equals(id)` pattern repeats
      (RosWindow ~151-158, pages). Low priority — do if time permits.

**Acceptance:** One `growIsOutdoor`, one date module; `formatLogData` and engine read typed data;
tests still green.

## 4.4 Split the monoliths

**Goal:** The four biggest files become navigable modules. **Pure mechanical extraction — no behavior
changes. Do this LAST, with 4.2 tests green before and after.**

- [ ] **`RosWindow.tsx` (1,158 l)** → `components/ros/` modules: `ChatTab.tsx`, `HealthTab.tsx` (assessment),
      `InsightsTab.tsx`, shared `rosWindowState.ts` (or a context) for the cross-tab state. DiagnosisWizard
      already separate.
- [ ] **`SetupWizard.tsx` (969 l)** → `pages/setup/` folder: one file per step (`LocationStep`, `SpaceStep`,
      `LightSeasonStep`, `VarietiesStep`) + `useSetupState.ts`; variety-filter logic → pure
      `lib/varietyFilter.ts` (then test it).
- [ ] **`Home.tsx` (815 l)** → extract `HomeMobile.tsx` / `HomeDesktop.tsx` (or per-section components) +
      shared `useHomeData.ts` for the derive logic.
- [ ] **`engine.ts` (1,166 l)** → `ros/engine/` folder: `index.ts` (computeInsights orchestration),
      `indoor.ts`, `outdoor.ts`, `veritable.ts`, `digest.ts` (buildContextDigest), `helpers.ts`. Keep the
      public API (`computeInsights`, `buildContextDigest`) re-exported from `ros/engine.ts` so imports
      don't churn... or update all imports — pick one, be consistent.
- [ ] After each split: `npm run check`, plus a manual smoke of the affected screen.

**Acceptance:** No file in `src/` (excluding `varieties.ts` data) over ~500 lines; tests green; app
behaves identically.

---

# Category 5 — Other (security / data safety / PWA / performance)

## 5.1 Server hardening

**Goal:** Close the obvious abuse surfaces on the two Netlify functions. Independent of all other phases.

- [x] **Rate limiting on `/api/account`** (`netlify/functions/account.mts`): the 3-char code space is only
      238k — enumeration is feasible. Stateless functions → use the existing Postgres: a `rate_limits`
      table (`key TEXT PRIMARY KEY, window_start TIMESTAMPTZ, count INT`) keyed by
      `ip:action` (IP from `context.ip` or `x-nf-client-connection-ip` header). Limit e.g. 10 signin
      attempts / 5 min / IP → 429 with Icelandic message ("Of margar tilraunir — reyndu aftur eftir smá
      stund"). Add migration file in `netlify/database/migrations/` following the existing pattern.
      *(Limits: signin/signup 10/5 min, sync 120/5 min. Single-upsert fixed window; **fail-open** if the
      table is missing so a broken counter can't lock everyone out.)*
- [x] **Input caps in `account.mts`**: `name` max 64 chars; reject request bodies > ~5 MB (check
      `content-length` and/or measure the parsed snapshot JSON string); validate snapshot shape minimally
      (`isSnapshot`-equivalent server-side or at least `version === 1` + expected keys) before writing JSONB.
      *(sync validates the full v1 shape; signup validates `version === 1` only — Login sends `{version:1}`.)*
- [x] **Input caps in `ros.mts`**: max 40 messages per request (truncate oldest client-side too, in
      `src/lib/ros/chat.ts`), max ~2 MB per inline image / 4 images, max context length (~24k chars —
      truncate with a note). Return 413 with Icelandic message on violation.
- [x] **Align `normalizeCode`**: client (`src/lib/account.ts:17-22`) slices, server
      (`account.mts:83-88`) requires exact — make both: uppercase → strip non-`[A-Z0-9]` → must be exactly
      3 chars, else invalid. Add the client function to 4.2's tests. *(Client no longer slices; the
      CodeInput paste handler does its own `.slice(0, 3)` for UX. Tests updated.)*

**Acceptance:** Hammering signin gets 429s; oversized payloads rejected cleanly; both normalizers
byte-identical in behavior.

## 5.2 Backup & data safety

**Goal:** Users can get their data out without knowing what IndexedDB is.

- [ ] **Export UI**: in the account/settings area (Layout footer / account modal): "Sækja afrit" →
      `exportSnapshot()` → `JSON.stringify` → Blob download `spira-afrit-YYYY-MM-DD.json`. Note photos are
      excluded ("Myndir fylgja ekki með — þær eru aðeins í þessu tæki").
- [ ] **Import UI**: "Hlaða inn afriti" → file input → parse → validate with `isSnapshot()` → ConfirmDialog
      warning it replaces local data ("Þetta yfirskrifar núverandi gögn") → `importSnapshot()`. Triggers a
      sync push automatically via hooks — verify.
- [ ] **Export-before-wipe**: the sign-out flow (which calls `clearLocalData()`) offers the export button
      in its confirmation dialog.
- [ ] **Snapshot forward-compat groundwork**: in `sync.ts`, route imports through a
      `migrateSnapshot(raw): SnapshotV1` that today just validates v1 — single seam for future v2.

**Acceptance:** Round-trip export→wipe→import restores everything except photos.

## 5.3 PWA revival

**Goal:** Installability + offline shell, WITHOUT resurrecting the ghost-SW bug
(`src/main.tsx` currently unregisters all SWs on boot — read its comment first).

- [ ] Add `vite-plugin-pwa`: `registerType: 'autoUpdate'`, `workbox: { skipWaiting: true, clientsClaim:
      true, navigateFallback: '/index.html', navigateFallbackDenylist: [/^\/api\//] }`, **never cache
      `/api/*`** (NetworkOnly). Manifest already exists in `public/` — point the plugin at it or migrate
      its content into plugin config (don't end up with two manifests).
- [ ] **Replace** the unconditional unregister in `main.tsx` with: unregister only SWs whose script URL
      isn't the new one (one-time cleanup of the legacy ghost), then register the new SW. Keep a
      `localStorage` kill-switch (`spira:disable-sw`) checked before registration, documented in the code
      comment, as the escape hatch.
- [ ] **Update flow**: when a new SW takes over (`controllerchange` or the plugin's `onNeedRefresh`),
      show a small toast "Ný útgáfa í boði — Endurhlaða" rather than silently swapping mid-use.
- [ ] **Offline indicator**: `navigator.onLine` + online/offline events → subtle pill in Layout header
      ("Ónettengd — gögn vistast á tækinu"); syncManager already queues, just verify a flush happens on
      `online` event (add listener if missing).
- [ ] Test the upgrade path explicitly: build, serve, load, rebuild with a change, reload → new version
      appears; toggle kill-switch → SW gone next load.

**Acceptance:** App installable; full app shell loads offline (airplane-mode test); `/api/*` never served
from cache; update toast works.

## 5.4 Performance & docs

**Goal:** Measure, split, document. Do after most other phases so docs capture the final state.

- [ ] **Measure first**: `npm i -D rollup-plugin-visualizer`, add to vite build (behind an env flag),
      record the top chunks in this file under "Findings".
- [ ] **Route-level code splitting**: `React.lazy` + `Suspense` (fallback = 2.3 Skeleton or minimal
      "Hleður…") for heavy, rarely-first routes: SetupWizard, RosOverview, Varieties, History. Keep Home/
      Grows/GrowDetail eager. Check `react-markdown` (used by Rós) lands in a lazy chunk.
- [ ] **lucide-react import check**: confirm per-icon imports tree-shake in the build (inspect visualizer);
      if the full icon set ships, switch to `lucide-react/icons/...` deep imports.
- [ ] **Update CLAUDE.md**: new scripts (`test`, `check`, `lint:eslint`), testing conventions, ErrorBoundary,
      the unified `growIsOutdoor`, `dates.ts`/`series.ts`/`envTargets.ts` modules, SW status (no longer
      disabled — document the kill-switch), export/import feature, rate limiting, any db schema version
      bumps (assessments v3?), split file layout from 4.4.
- [ ] **Update this file**: mark all statuses, note anything deferred + why.

**Acceptance:** Initial JS chunk measurably smaller (record numbers); CLAUDE.md accurate for a fresh
session.

---

## Findings / session log

> Implementation sessions: append dated notes here — surprises, deviations from plan, deferred items.

- **2026-06-07 — 4.1 Tooling done** (branch `claude/juneimpro-4.1-tooling`). Vitest 4 + ESLint 10
  (flat config) + ErrorBoundary; `npm run check` green; `npm run build` verified.
  - **Deviation:** `eslint-plugin-react-hooks` v7's `recommended` preset enables the React-Compiler
    analyses (`purity`, `set-state-in-effect`, `preserve-manual-memoization`) which flagged ~14
    established patterns (`Date.now()` in event handlers reported as "during render", reset-state-on-open
    effects) — mostly false positives, zero real bugs. Config uses classic `rules-of-hooks` (error) +
    `exhaustive-deps` (error) instead; revisit if the React Compiler is ever adopted.
  - **Test convention chosen: co-located `*.test.ts`** (seed test `src/lib/cn.test.ts` proves Vitest +
    `@` alias). 4.2 should follow this.
  - Prettier skipped (see 4.1 checkbox).
  - Pre-existing: vite build warns about the 845 kB main chunk — that's 5.4's code-splitting job, untouched.
- **2026-06-07 — 4.2 Tests done** (same branch). 176 tests across 10 files (`*.test.ts` co-located),
  all 9 planned modules covered; `fake-indexeddb` dev-dep added for the Dexie sync round-trip.
  - `isSnapshot` is now **exported** from `sync.ts` (was private) — needed by the tests and by 5.2's
    import-validation UI. No other source changes.
  - **Characterized for 4.3/4.4:** (a) engine vs season `growIsOutdoor` divergence (potato-in-window is
    outdoor to the engine, indoor to season.ts) — see `engine.test.ts` "kartöflur teljast útiræktun";
    (b) latent quirk: the feed/topping/pollinate blocks do NOT gate on `grow.archived`/`growActive`, so an
    archived grow still yields a `feed` due insight — locked in as-is, decide in 4.3 whether to fix.
  - `importSnapshot` merges `meta` via bulkPut (doesn't clear) and leaves photos untouched — now pinned.
- **2026-06-07 — 5.1 Server hardening done** (same branch). Rate limiting (Postgres fixed-window,
  migration `20260607120000_create-rate-limits`), input caps on both functions, normalizeCode aligned.
  - **Gotcha found:** `tsconfig.json` includes only `src/` — the Netlify `.mts` functions are NOT covered
    by `npm run lint`/`check` (esbuild bundles them untyped). Verified this phase ad-hoc with
    `npx tsc --noEmit --strict … netlify/functions/*.mts`. Consider wiring a `tsconfig.netlify.json` into
    the `check` script in a later phase (note for 5.4 docs).
  - The rate-limit migration must be applied to the Netlify DB before deploy benefits; the function
    fails open (console.warn) until then, so nothing breaks if deploy order slips.
- **2026-06-07 — Agent team running** (team "juneimpro", lead owns the main checkout on
  `claude/juneimpro-4.1-tooling`). Teammates in isolated worktrees under `.claude/worktrees/`:
  cat1-ux → `claude/juneimpro-cat1-ux`, cat2-ui → `claude/juneimpro-cat2-ui-wt` (note `-wt`; the
  un-suffixed cat2 branch is dead), cat3-features → `claude/juneimpro-cat3-features`,
  cat5-other → `claude/juneimpro-cat5-other`. `ui/ConfirmDialog.tsx` was pre-built on base 2556edb.
  - **Incident:** teammate "worktree isolation" failed at spawn — all four started in the shared main
    checkout and interleaved uncommitted edits. Resolved by real `git worktree add` per teammate; the
    mixed state is preserved on branch `wip/juneimpro-mixed` (6a22faf — delete after all categories merge).
    Main-checkout gate now excludes `.claude/` in vitest + eslint (commit 3695511).
  - Merge plan (lead): cat2 → cat1 → cat3 → cat5, `npm run check` after each, then 4.3 → 4.4 → 5.4.
  - Reconcile at merge: cat3 used old Sparkline API + a local RangeToggle (swap to 2.4's ui/RangeToggle);
    Environment-page pH/EC charts deferred to post-merge (cat3 avoided cat2's file); cat3's own lightbox
    vs cat2's ui/Lightbox — pick one.
