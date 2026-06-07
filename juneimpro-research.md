# June Improvement Day — Research Info Dump

> Deep-research findings from 2026-06-07 brainstorming session. This is the **reference dossier** for the
> implementation sessions described in `juneimpro.md`. All file:line references verified against branch
> `claude/veritable-smart-integration` (HEAD `6b571aa`). Re-verify line numbers before editing — they drift.

---

## 0. Repo vitals

- ~15,990 lines across 62 files (src/ + netlify/).
- TypeScript strict mode ON (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`).
- Zero `any` / `@ts-ignore` / `as unknown` — keep it that way.
- Only check: `npm run lint` = `tsc --noEmit`. **No ESLint, no Prettier, no tests, no test runner.**
- Largest files: `src/lib/varieties.ts` (2,100 — data, fine), `src/lib/ros/engine.ts` (1,166),
  `src/components/ros/RosWindow.tsx` (1,158), `src/pages/SetupWizard.tsx` (969), `src/pages/Home.tsx` (815),
  `src/pages/RosOverview.tsx` (657).
- Service worker is **deliberately disabled** — `src/main.tsx` unregisters all SWs and purges caches because a
  legacy "ghost" SW caused stale-version bugs. Any PWA work must not reintroduce that failure mode.
- All UI strings are Icelandic. Never ship English-facing copy.

---

## 1. UX findings

### Navigation
- Desktop sidebar: 8 items (`src/components/Layout.tsx:22-31`). Mobile bottom nav: only 6
  (`Layout.tsx:33-40`) — **Umhverfi (/environment) and Safn (/history) are unreachable from mobile nav**.
- Routes: `/home`, `/ros`, `/grows`, `/grow/:id`, `/plants`, `/varieties`, `/environment`, `/harvest`, `/history`,
  plus `/login`, `/setup`.

### Friction
- Destructive confirmations use **native browser `confirm()`** instead of the app `<Modal>`:
  - Archive grow: `src/pages/GrowDetail.tsx:122`
  - Reopen grow: `src/pages/History.tsx:22`
  - Delete Rós report: `src/pages/RosOverview.tsx` (delete handler)
- Sync error shows only "Synci klikkaði" badge (`Layout.tsx:316`) — no detail, no retry button, no explanation.
- LogComposer doesn't auto-focus its first field.
- Phase change via dropdown (`GrowDetail.tsx:315-325`, select at `:386-396`, 11px text) auto-creates a log —
  good audit trail, but no undo and tiny touch target.
- Harvest entry form has no validation feedback (submits with nulls).
- Photo-then-plant-select linkage handled by re-pointing photoId at submit (`LogComposer.tsx:145-150`) — works
  but opaque.
- No pull-to-refresh on mobile; no skeleton loaders anywhere (pages `return null` while Dexie queries load,
  e.g. `Home.tsx:52`).

### Empty states: GOOD everywhere
Home `:354-372`, Grows `:64-67`, Plants `:170-173`, GrowDetail `:239-243`/`:260-264`, Environment `:54-57`,
Harvest `:94-97`, History `:51-54`. All have Icelandic copy + action button. Don't regress these.

### Accessibility
- **Modal has no focus trap** (`src/components/ui/Modal.tsx:36-43`); Escape + backdrop-close exist.
- Many icon-only buttons lack `aria-label` (good examples exist: `Layout.tsx:253`, `RosWindow.tsx:182`, `:939`).
- No screen-reader announcements after actions (e.g. log saved); no skip-link; no `role="main"`;
  many inputs use placeholder-as-label.
- CodeInput in Login (`Login.tsx:237-314`) is excellent (paste support, arrow keys, focus management) — model
  for other inputs.

### Onboarding
- Welcome page CTA appears only after ~2s of staggered animation (`src/pages/Welcome.tsx`).
- SetupWizard step 3 branches silently by location (outdoor → season, Veritable → device facts, indoor → light
  fixture) at `SetupWizard.tsx:277-284` — branching never explained to user.
- Wizard variety list can be 20+ items; filter UX is fine, 0-result state is good.

### Visible placeholder/roadmap content
- `Home.tsx:505-543`: desktop "Umhverfi · BÍÐ" card hardcodes "—" values, "tengja skynjara (Fasi 3)".
- `Home.tsx:554-582`: "Næstu skref" lists Fasi 2–4 as "BRÁTT".
- Decide: implement, hide, or keep as roadmap teaser.

---

## 2. UI findings

### Tokens: excellent baseline
- Palette in `tailwind.config.js:7-50` (moss/terracotta/cream/capsicum), mirrored as CSS vars in
  `src/index.css:5-42`. No rogue hex in pages — inline styles all use `var(--…)` / token-derived rgba.
- Utility layer: `.sp-bg`, `.glass*`, `.sp-display/.sp-mono`, `.sp-divider`, `.sp-dots`, `.sp-pulse`
  (`index.css:101-166`), safe-area utils (`index.css:169-196`).
- Dark-only by design: `index.html` `class="dark"`, `color-scheme: dark`, body `#121f14`. No light mode, no
  `prefers-color-scheme`. (Treat light mode as out of scope unless explicitly requested.)

### Component duplication (~40% of card/row styling re-invented inline)
Existing primitives in `src/components/ui/`: Button, Card, Pill, Eyebrow, Tabs, Modal, PhaseBar, Stat, Sparkline.
Inline reinventions to extract:
- QuickStat cards — `src/pages/Home.tsx:92-130`
- Hero card — `src/pages/GrowDetail.tsx:143-156`
- Grow row card — `src/pages/Grows.tsx:84-99`
- TabButton + CodeInput — `src/pages/Login.tsx:127-152, 294-312`
- Quick-action grid buttons — `src/components/LogComposer.tsx:174-194`
- Maintenance task rows — `src/components/VeritableCard.tsx:196-216`

### Typography: no system
- All sizes are explicit px in inline styles (30/24/18px display sizes, 9–10px mono labels); letter-spacing
  varies (-0.01em / -0.015em / -0.02em) with no scale. No reusable heading component/classes.

### Icons
- All lucide-react, sizes 11–20px. Inconsistent color plumbing: some `var(--moss-300)`, some inline rgba
  (e.g. `Layout.tsx:79`). Pick one convention.

### Animation: healthy
- Framer-motion page fades (0.3–0.4s), Modal slide-up 0.22s, Logo sway, GrowingPlant staged entrance.
  Tailwind `sway`/`grow` keyframes (`tailwind.config.js:58-65`). Nothing janky. Don't add more for its own sake.

### Loading visuals
- No skeletons anywhere. Pages null-render during Dexie load. Sparkline (`ui/Sparkline.tsx`, 49 lines) is
  minimal: linear interpolation, no axes/zoom/range.

### PWA visual assets: complete
- `public/manifest.webmanifest` (theme `#243827`, standalone, 192/512/maskable icons), apple-touch-icon,
  meta tags in `index.html:1-24`. Assets are fine — the gap is the disabled service worker (see §5).

### Glyphs
- Chili/Tomato/Strawberry/Herb/Potato SVG components + `PlantGlyph.tsx` dispatcher — high quality, hex colors
  inside presets are intentional. Leave alone.

---

## 3. Feature-depth findings (improve existing, not add new)

### Captured-but-never-surfaced data (highest-leverage improvements)
| Data | Captured at | Surfaced? |
|---|---|---|
| pH | water/feed `LogEntry.data` | ❌ never charted |
| EC | water/feed `LogEntry.data` | ❌ never charted |
| Runoff ml | water logs | ❌ never analyzed |
| Light hours | environment samples + `Grow.lightOnHours` | ⚠️ static stat only, no chart |
| Watering amount/frequency | water logs | ❌ no timeline |
| Maintenance history | maintenance logs | ⚠️ engine scheduling only |
| Diagnosis symptoms | log.data via DiagnosisWizard | ⚠️ stored, never re-surfaced |
| Pollination method | pollinate logs | shown in log, no stats |

### Logs
- 13 log types in `src/lib/logSchema.ts`. **`pest` and `disease` have no LogComposer form** — only reachable
  through DiagnosisWizard. Logs are immutable (no edit/delete UI). No log filtering by type/date/plant in
  GrowDetail. Environment + harvest live in separate tables (intentional dual pattern — keep).

### Photos (`src/lib/photos.ts`)
- Downscale to 1600px JPEG q0.82 → IndexedDB blob, device-local, never synced. Delete exists.
- **No gallery/timeline view, no lightbox, no per-plant photo view, no storage-usage display, no bulk ops.**

### Harvest (`src/pages/Harvest.tsx`)
- Totals + per-plant aggregates + mean weight/pod only. No harvest timeline, no g/day efficiency, no
  variety-level comparison, no link between predictions and actuals.

### Environment (`src/pages/Environment.tsx`)
- Last reading + 14-day avg + temp/humidity sparklines. No min/max, no out-of-range alerts, no per-phase
  target ranges, light hours never charted, fixed 14-day window.

### Varieties / care guides (`src/lib/varieties.ts`)
- ~70 pepper varieties have **no structured CropCare guide** (tomatoes/strawberries/potatoes complete; herbs
  only basil; leafy only arugula). `CareGuide.tsx` renders the structure; guards `isTomato`/`isStrawberry`/
  `isPotato`/`hasCare` exist. Care guides not reachable from a plant's detail context — only via Varieties page.

### Rós rule engine (`src/lib/ros/engine.ts`)
- ~22 insight types incl. Véritable set (tank/clean/wick/thin/lingot). Severities: due/soon/info.
- **Ignores temp/humidity/pH/EC entirely** even though captured. No user-configurable cadences. No feedback
  from harvest actuals. Pepper coverage thin (topping + generic water/feed only).

### Rós chat/vision/prediction
- Assessment (Heilsa) keyed by plantId — **re-running overwrites; no history, no before/after**.
- Chat history (rosMessages, db v2) device-local, not searchable.
- Context digest has no token-budget truncation.
- `predict.ts`: linear window from `daysToHarvest`; no feedback from actual harvest logs.
- Weekly report (RosOverview): manual trigger, non-streaming, no export.

### Sync/accounts
- Whole-snapshot LWW (`src/lib/sync.ts`, 206 lines). In-flight serialization + pendingAfterFlight flag are
  sound. **No user-facing export/download button** — snapshot only used internally. No snapshot version
  migration path beyond v1.

### Search/filter/sort matrix
- Varieties: text search ✅. Plants: category/mother/color/phase filters ✅ but **no name search**.
- Grows/Logs/Harvest/History: **no search or filtering at all**.

---

## 4. Codebase health findings

### Duplication (fix first — it's load-bearing)
- `growIsOutdoor` exists twice: `src/lib/season.ts:53-59` (env ?? locationKey) and
  `src/lib/ros/engine.ts:144-148` (same + potato-category special case). **Engine version is the superset.**
  Unify into one plant-aware helper in season.ts; keep a grow-only overload if needed.
- Icelandic short-date formatting re-implemented 3+×: `engine.ts:1028-1032` (`shortDate`),
  `RosOverview.tsx:103-107`, `RosWindow.tsx:346-350`, plus inline in `Home.tsx` (81, 378-379, 705).
  → central `src/lib/dates.ts` (or `format.ts`).
- Repeated Dexie query pattern `.where('growId').equals(id).toArray()` across pages/RosWindow — candidate
  for shared query helpers or custom hooks.

### Type-safety gaps
- `LogEntry.data?: Record<string, unknown>` (`db.ts:95`) consumed by duck-typing in
  `logSchema.ts:134` (`formatLogData`). Consider per-LogType data interfaces + narrowing helpers.
- Two non-null assertions: `SetupWizard.tsx:87` (`LOCATIONS.find(...)!`), `engine.ts:1152` (`n.note!`).

### Error handling
- Silently swallowed: `photos.ts:57-59` (downscale fallback OK), `photos.ts:113`,
  `LogComposer.tsx:109,120,151` (`.catch(() => undefined)`), `account.ts:34-36` (localStorage parse).
- Exactly one `console.error` in the app (`sync.ts:178-179`).
- **No React ErrorBoundary anywhere** (`App.tsx`).

### Netlify functions
- `account.mts` (96 lines): parameterized SQL ✅. **No rate limiting** (62³ = 238k code space → enumeration
  risk), no `name` max length, no JSON payload size cap.
- `ros.mts` (384 lines): fallback chain + per-attempt timeout (8s) + total budget (22s) well-designed.
  **No cap on messages array length, image base64 size, or context length**; user `context` concatenated into
  system prompt (line ~85).
- `normalizeCode` differs client vs server: client `account.ts:17-22` slices to 3 chars (lenient), server
  `account.mts:83-88` requires exact length (strict). Align them.

### Testing
- Zero test infra. Highest-value pure targets: `phases.ts` (177 l), `season.ts` (84 l), `daylight.ts` (61 l),
  `logSchema.ts` formatLogData (206 l), `engine.ts` `computeInsights` (pure — takes now/month as params),
  `predict.ts`, sync `exportSnapshot`/`importSnapshot`/`isSnapshot` round-trip, `account.ts` normalize/validate,
  varieties guards. Engine purity is a gift — exploit it.

### Dependencies (all current, none unused)
- react 18.3.1, react-router-dom 6.28, dexie 4.0.10, framer-motion 11.15, vite 6.0.7, ts 5.7.2,
  tailwind 3.4.17, lucide-react 0.469, react-markdown 10.1 + remark-gfm, clsx + tailwind-merge,
  @netlify/functions 5.2.2, @netlify/database 1.0.0, @netlify/vite-plugin 2.12.6.
- No bundle analysis configured; no manual chunking; varieties.ts + engine.ts + react-markdown are the
  likely heavy chunks. `vite-plugin-visualizer`/`rollup-plugin-visualizer` would tell us.

### Scripts gap
- Only dev/build/preview/lint. Missing: test runner, ESLint, Prettier (optional), CI-ish check script.

---

## 5. "Other" findings (security / PWA / perf / data safety)

### Security (server)
1. Rate limiting on `/api/account` — brute-force surface on 3-char codes. Netlify functions are stateless;
   options: per-IP counter in the Postgres DB, simple sliding-window table, or Netlify rate-limit config.
2. Input caps: `name` length (~64), snapshot JSONB size (~2–5 MB), ros messages count (~40 turns),
   inline image base64 size (~2 MB each / ~4 total), context length cap.
3. Align client/server `normalizeCode`.

### PWA
- SW disabled on purpose (ghost-SW history — see `src/main.tsx` comment). If re-enabling:
  use `vite-plugin-pwa` with `registerType: 'autoUpdate'` + `skipWaiting`/`clientsClaim`, keep the existing
  unregister-on-boot path for one release as a kill-switch, never precache `/api/*`.
- Missing today: installability, offline HTTP cache, offline indicator, queued-sync UI.
- App data layer is already fully offline-capable (IndexedDB) — only the app shell isn't.

### Data safety
- No user-facing backup: add export (download `SnapshotV1` JSON) + import with `isSnapshot` validation.
  Photos excluded by design; consider optional photo export (zip) as stretch.
- `clearLocalData()` on sign-out is irreversible with no export prompt first.

### Performance
- No route-level code splitting (`React.lazy`) — everything in one bundle incl. SetupWizard, RosWindow,
  react-markdown.
- No bundle visibility. Measure before optimizing.

---

## 6. Hard constraints for ALL implementation sessions

1. **Icelandic UI strings only.** Match existing tone (casual, warm: "Synci klikkaði", "Slakaðu á smá").
2. `npm run lint` (tsc) must pass — it's the only gate. If tests get added (Cat 4 Phase 1), run those too.
3. IndexedDB is source of truth; cloud is backup. Schema changes = new `this.version(n)` block in `db.ts`,
   never edit existing versions.
4. New synced tables require updating: stores(), SnapshotV1, exportSnapshot/importSnapshot/isSnapshot,
   clearLocalData, installAutoSyncHooks. Photos/rosMessages/assessments/reports stay device-local.
5. All overlays must use `src/components/ui/Modal.tsx` (scroll-lock rule).
6. Reuse moss/terracotta/cream/capsicum tokens + ui/ primitives. No new colors.
7. Use `@/` import alias. Keep `growIsOutdoor` semantics: env ?? locationKey, potatoes outdoor (engine).
8. Demo code `123` never syncs; don't route demo data through the account API.
9. Keep `computeInsights` pure (now/month as params, no clock calls inside).
10. The pepper-tuned display timeline in `phases.ts` is distinct from the `GrowPhase` enum in `db.ts` — don't
    conflate them.
