# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Spíra is a **local-first grow journal** for growing peppers, tomatoes and strawberries indoors plus potatoes (and outdoor strawberries) in the garden, built as a React PWA that works on mobile and desktop. The UI and all content strings are in **Icelandic** — preserve that when editing text. It is built for the Icelandic climate, with **two advice axes**: indoor grows are driven by the Reykjavík daylight calendar (`daylight.ts` → grow-light recommendations); outdoor grows are driven by the season/frost calendar (`season.ts`). A grow's axis comes from the unified **`growIsOutdoor(grow, plants?)` in `season.ts`** (environment ?? `locationKey === 'garden'`; with the optional plant list, active potato plants also ⇒ outdoor — that's the variant the Rós engine uses). The data model is category-extensible (`PlantCategory` also covers herbs, leafy, fruit, houseplants, etc.).

## Commands

```bash
npm install
npm run dev          # Vite dev server on :5173 (host: true, exposed on LAN)
npm run build        # tsc -b THEN vite build → dist/ (incl. PWA service worker)
npm run lint         # tsc --noEmit
npm run lint:eslint  # ESLint flat config (typescript-eslint + classic react-hooks rules)
npm run test         # vitest run (node env; co-located *.test.ts)
npm run check        # lint + lint:eslint + test — THE gate; must pass before any commit
# $env:ANALYZE='1'; npm run build  → bundle map at dist/stats.html (never precached)
```

There is no Prettier (deliberate). **`npm run check` is the gate** — keep all three legs green. Tests are co-located `*.test.ts` next to their modules (convention; `fake-indexeddb` powers Dexie tests in node). Vitest/ESLint exclude `.claude/` (agent worktrees may live there).

**Gap to know about:** `tsconfig.json` includes only `src/`, so the Netlify `.mts` functions are NOT covered by `npm run lint`. Typecheck them ad-hoc after editing: `npx tsc --noEmit --strict --target ES2022 --module esnext --moduleResolution bundler --skipLibCheck netlify/functions/*.mts`.

Netlify functions and the Postgres database require the Netlify dev environment / deployment to exercise (`@netlify/vite-plugin` wires functions into the dev server; `getDatabase()` needs Netlify DB env vars). Plain `vite` serves the frontend but `/api/account` and `/api/ros` will not work without it. Rós chat additionally needs **`GEMINI_API_KEY`** (and optional `GEMINI_MODEL`) in the Netlify env — without it the rule-engine "Ráð" tab still works, but chat returns a configured-message error. See `.env.example`.

## Architecture

### Local-first: IndexedDB is the source of truth

`src/lib/db.ts` defines a Dexie database (`SpiraDB`, name `'spira'`) with tables: `grows`, `plants`, `logs`, `photos`, `environment`, `harvests`, `varieties`, `meta`, `rosMessages`, `rosAssessments`, `rosReports`, `rosYieldChecks`. **The app reads and writes IndexedDB directly** (pages use `dexie-react-hooks` `useLiveQuery`); the cloud is only a backup/transport. All domain types live in `db.ts`. Use `newId()` for IDs. To bump the schema, add a `this.version(n).stores({...})` block — never edit an existing version. **Current schema version: 7.** Note the `rosAssessments` re-key (`plantId`→`id`) is done the **Dexie-supported way — delete the store in v5 (`null`), recreate with the `id` key in v6** — because Dexie cannot change a primary key in-place (an in-place change threw `Not yet support for changing primary key` for anyone upgrading from a v3/v4 DB). v7 adds device-local `rosYieldChecks` — photo/manual fruit/flower counts feeding the pre-harvest yield estimator; not synced.

`BUILT_IN_VARIETIES` (from `src/lib/varieties.ts`) is re-`put` into the `varieties` table on every app load (`App.tsx`).

### Accounts = a 3-character code (no email, no password)

Auth is a single uppercase 3-char code matching `/^[A-Z0-9]{3}$/`. The code IS the account.

- **Client** (`src/lib/account.ts`): stores the current account in `localStorage` (`spira:account`). `normalizeCode` is **aligned with the server**: uppercase → strip non-`[A-Z0-9]` → wrong length is invalid (no silent slicing; the Login paste handler slices for UX).
- **Server** (`netlify/functions/account.mts`, path `/api/account`): Netlify Postgres, whole dataset as one `data` JSONB blob per code. **Hardened (5.1):** per-IP fixed-window rate limiting via the `rate_limits` table (signin/signup 10/5 min, sync 120/5 min → 429; **fails open** if the table is missing), ~5 MB body cap (413), `name` ≤ 64 chars, and server-side `SnapshotV1`-shape validation before writing JSONB. Migrations live in `netlify/database/migrations/` — the `rate_limits` migration must be applied for limiting to take effect.

User-facing error messages from the functions are Icelandic and surfaced directly in the UI.

### Sync = whole-snapshot, last-write-wins

`src/lib/sync.ts` is the sync engine. There is **no field-level merge** — sync replaces everything:

- `exportSnapshot()` → `SnapshotV1`; **photos are NOT included** (device-local). `lastSyncedAt` meta is stripped. `isSnapshot()` is exported; `migrateSnapshot(raw)` is the forward-compat seam (today validates v1, throws on garbage) — route all imports through it.
- Sign-in `importSnapshot()`s the cloud blob: clears local tables then bulk-adds. Two devices on one code overwrite each other — no conflict resolution (out of scope by decision).
- `syncManager` debounces pushes (1200 ms), serializes in-flight requests, exposes **`syncNow()`** for the manual retry button and carries **`lastError`** in its state (the "Synci klikkaði" badge is tappable → reason + retry modal). `installAutoSyncHooks()` attaches Dexie hooks; photos/ros tables are not hooked.
- **Pull (cross-device convergence):** signed-in devices also *fetch* cloud changes — `syncManager.pull()` runs at app start (forced, App.tsx), on `online` and on `visibilitychange→visible` (wired in `installAutoSyncHooks`, throttled 60 s). It compares server `updated_at` against the device-local stamp `localStorage['spira:cloudUpdatedAt']` (recorded on every push and at sign-in/up; cleared on sign-out) via the `pull` action on `/api/account` (returns `{ unchanged: true }` when nothing new; rate limit 60/5 min). **Push always wins:** pull is skipped while a local change is pending/in-flight/errored, and a first pull with no stamp but existing local data pushes instead of importing. Pull-imports run with the Dexie hooks suspended so they don't echo a push.
- **Backup UI (5.2):** `src/lib/backup.ts` + `src/components/BackupControls.tsx` (in Layout's account footer/modal) — "Sækja afrit" downloads `spira-afrit-YYYY-MM-DD.json`, "Hlaða inn afriti" validates + imports with a ConfirmDialog, and the sign-out confirm embeds an export button before `clearLocalData()`.

If you add a new synced table, update: `stores()`, `SnapshotV1`, `exportSnapshot`/`importSnapshot`/`isSnapshot`/`migrateSnapshot`, `clearLocalData`, and `installAutoSyncHooks`. Photos, rosMessages, rosAssessments, rosReports stay **device-local — never add them to the snapshot.**

### Rós — the AI grow helper

Rós is a per-grow assistant opened from `GrowDetail` plus an overview page (`/ros`). Hybrid:

- **Offline rule engine** — `src/lib/ros/engine/` folder (split 4.4): `index.ts` (computeInsights orchestration), `indoor.ts`, `indoorEnv.ts` (env-band/pH/humidity/germination/photo watches), `outdoor.ts`, `veritable.ts`, `digest.ts` (buildContextDigest), `helpers.ts`. The public API is re-exported from **`src/lib/ros/engine.ts`** — import from there, not the folder. `computeInsights()` is **pure** (`now`/`month` come in as params — keep it that way) and covers watering/feeding/topping/pollination/harvest-ETA/grow-light plus environment-band (vs `envTargets.ts`), pH-out-of-range and humidity-aware pest insights. Works with no API key.
- **LLM chat** (`netlify/functions/ros.mts`, `/api/ros`) proxies to Google Gemini with a model **fallback chain** (`GEMINI_MODEL`/`GEMINI_MODELS` then `DEFAULT_CHAIN`, de-duped; retryable statuses advance the chain; success reports which `model` answered; streaming via SSE). **Input caps (5.1):** ≤ 40 messages (client truncates too in `src/lib/ros/chat.ts`), ≤ 4 images à ~2 MB, context truncated at 24k chars. Vision sends downscaled plant photos as base64 — the one path where photos leave the device.
- **UI** — `src/components/ros/`: **`RosPanel.tsx` is the reusable, modal-free core** — it owns the per-grow live queries (plants/logs/harvests) + active-tab state and renders a `RosPanelTab[]` (`{label, render(ctx)}`). Two mounts: `RosWindow.tsx` (a thin Modal shell, the "Spyrja Rós" popout) and **the sticky desktop pane on `GrowDetail` (`RosEmbeddedPanel.tsx`, `lg:` only)**. Tab sets differ by mount: embedded = **Ráð/Uppskera/Ferill/Vika**; desktop popout = Spjall/Heilsa/Greining; mobile popout = Ráð/Heilsa/Greining/Spjall (no embedded pane on mobile — `useMediaQuery('(min-width:1024px)')` drives the split and the HeroCard button label). Tab bodies: `InsightsTab` (Ráð), `HealthTab` (assessment history + score trend), `DiagnosisWizard`, `ChatTab`, `YieldTab` (Uppskera), `TimelineTab` (Ferill), `WeekTab` (Vika), sharing `rosWindowState.ts` + `RosMarkdown.tsx`. `RosOverview` (`/ros`) is a dashboard: agenda, **Væntanleg uppskera** (total yield forecast), 14-day calendar, health overview, harvest-window predictions, variety leaderboard, photo-week, question-of-the-week, weekly LLM report — each a section in `pages/ros/` fed by `useRosOverviewData.ts`. It deliberately keeps local copies of mapping/colors — don't unify without reading its comments.
- **Yield estimation (pre-harvest "how much")** — `src/lib/ros/yield.ts` is pure/deterministic (`now` as arg, same rules as `predict.ts`): `estimatePlantYield`/`estimateGrowYield` return a **range** (`lowG`/`highG` + `remaining*`) + `confidence` + Icelandic `basis[]` strings shown verbatim in the UI (the trust layer — never a bare number). Counts come from a learned per-variety prior (`harvestStats.gramsPerPod`) → variety `fruitWeightG` → crop size-class default in `yieldBenchmarks.ts` (sourced benchmarks in comments), scaled by phase. Optional refinement: `yieldCount.ts` (`buildCountPrompt`/`parseCount`) drives a Gemini vision fruit-count → persisted as a device-local `rosYieldCheck` (db v6) and re-fed as `manualCount`. Offline-first: the estimate always renders; only "Telja af mynd" needs the network (guarded by `navigator.onLine`). Manual counts also come from a `fruitCount` field on `pollinate` logs.
- `predict.ts` (harvest windows — *when*), `assessment.ts`, `weekDigest.ts` (offline 7-day digest) and `growthTrack.ts` (phase-pace vs variety window) are pure/deterministic. Chat history (`rosMessages`), assessments, reports and yield checks are device-local, NOT synced.

### PWA / service worker (re-enabled in 5.3)

The app **uses a service worker again** (`vite-plugin-pwa`, autoUpdate). Registration lives in `src/lib/sw.ts`, started from `PwaUpdateToast`: it one-time-unregisters legacy "ghost" SWs (the old bug — see git history), respects the **kill-switch `localStorage['spira:disable-sw']`**, and shows a "Ný útgáfa í boði — Endurhlaða" toast instead of silently swapping. **`/api/*` is never cached** (NetworkOnly + navigateFallbackDenylist). One manifest only: `public/manifest.webmanifest` (`manifest: false` in the plugin). Layout shows an offline pill and flushes sync on the `online` event.

### Modals & overlays

All overlays use `src/components/ui/Modal.tsx` (portal + framer-motion + Escape + **focus trap + dialog ARIA**) — never a bare `fixed inset-0` div. Confirmations use `ui/ConfirmDialog.tsx` (title/body/confirmLabel, destructive tone; the confirm button names the action). Full-screen photo viewing uses `ui/Lightbox.tsx` (near-black, arrows/swipe/counter/delete) — `gallery/PhotoLightbox.tsx` is a thin data adapter over it. Screen-reader announcements go through `src/lib/announce.ts` → the single aria-live region in Layout.

### Logs are structured & typed

Log entries are composed via `src/components/LogComposer.tsx` (auto-focus, edit via `existing?: LogEntry`) using `src/lib/logSchema.ts` (`LOG_FIELDS`, `LOG_TYPE_META`, `formatLogData` — includes pest/disease since 3.4). **`LogEntry.data` stays a loose `Record<string, unknown>` in storage, but all reads go through the typed `logData<T>(type, data)` helper** (per-type interfaces `WaterLogData` etc.) — never duck-type `data.key` directly. When adding a log type, extend `logSchema.ts` (fields + interface + `logData` branch + `formatLogData`). Photos attach via `src/lib/photos.ts` → `db.photos` (local-only).

### Pure domain modules in `src/lib/`

- `phases.ts` — per-crop grow-cycle display timelines (pepper/tomato/strawberry/potato; distinct from the `GrowPhase` enum in `db.ts`).
- `daylight.ts` / `season.ts` — the two Reykjavík advice calendars; `season.ts` owns the unified `growIsOutdoor`.
- `dates.ts` — **the** Icelandic date formatting module (`shortDate`, `longDate`, `relativeTime`, `dayWord`). Don't re-implement `toLocaleDateString('is-IS', …)` locally.
- `series.ts` — chart series from logs/samples (pH, EC, light hours, watering intervals). `range.ts` — `RangeDays` + `withinRange` for `ui/RangeToggle`.
- `envTargets.ts` — per-phase indoor temp/humidity bands (+ `bandStatus`) feeding the Environment/GrowDetail band cards AND the engine.
- `harvestStats.ts` — yield analytics (g/day, g/pod, per-variety ranking). `photoGallery.ts` — gallery grouping helpers.
- `varietyFilter.ts` — pure SetupWizard variety filtering (tested).
- `varieties.ts` — the catalog (data file; exempt from the 500-line rule). Tomatoes/strawberries/potatoes carry `CropCare`; **peppers resolve to mother-species tier guides via `resolveCare(v)`/`pepperCareTier(v)`** (`hasCare` still means "has inline care"). `CareGuide.tsx` takes a `care: CropCare` prop — pass `resolveCare(variety)`.
- `locations.ts` (use `getLocation(key)`, it has a fallback), `account.ts`, `sync.ts`, `backup.ts`, `demo.ts`, `cn.ts`, `announce.ts`, `useDelayedFlag.ts`, `useScrollLock.ts`, `sw.ts`.

### Split page/component layout (4.4)

Big screens are folders with a thin shell keeping the import path stable: `pages/Home.tsx` → `pages/home/` (useHomeData/HomeMobile/HomeDesktop), `pages/SetupWizard.tsx` → `pages/setup/` (steps + useSetupState), `components/ros/RosWindow.tsx` → tab modules, `lib/ros/engine.ts` → `lib/ros/engine/`. Aim to keep files ≤ ~500 lines (only `varieties.ts` data is exempt; `Layout.tsx` sits at the line).

Routes: `/home`, `/ros`, `/grows`, `/grow/:id`, `/plants`, `/varieties`, `/environment`, `/harvest`, `/history` inside `Layout`; `/setup`, `/login`. **SetupWizard, RosOverview, Varieties and History are `React.lazy`** (5.4) — react-markdown rides in a lazy chunk; keep heavy deps out of the eager pages.

### Demo account `123`

Code `123` is special everywhere: `Login.tsx` seeds a ghost dataset (`seedDemoData()`), and `syncManager.isDemo()` disables all network sync. Don't route demo data through the account API.

### Conventions

- Import alias **`@` → `src`**.
- Styling is Tailwind with the custom palette — **`moss`, `terracotta`, `cream`, `capsicum`** — fonts `Fraunces`/`Inter`/JetBrains Mono. **Type scale lives in `src/index.css`** (`.sp-h1/.sp-h2/.sp-h3/.sp-stat/.sp-label`) — use the classes, not inline font sizes. Reuse the `src/components/ui/` primitives (`Button`, `Card`, `Tabs` incl. segmented variant, `StatCard`, `HeroCard`, `ActionTile`, `TaskRow`, `Skeleton` + `PageSkeletons`, `SearchInput`, `RangeToggle`, `Lightbox`, `ConfirmDialog`, `PhaseBar`, `Sparkline` with smooth/reference/xLabels options, …). No new colors. Dark-only — do not add a light mode.
- Loading states: pages show their `PageSkeletons` skeleton after a ~150 ms `useDelayedFlag` delay instead of returning null.
- Errors: never `.catch(() => undefined)` — at minimum `console.warn('[spira] …', err)`. React errors are caught by `components/ErrorBoundary.tsx` (around the Outlet in Layout + the whole app).
- Netlify is the deploy target: `netlify.toml` builds to `dist/`, functions are `.mts` (ESM) exporting a `config` with their `path`.

### `research/` — source material, not shipped code

`research/` holds the Icelandic grow-guide research (tomato/potato/strawberry/pepper, HTML + PDF) that domain content like `daylight.ts`, `envTargets.ts`, the care guides and `varieties.ts` derive from. Reference/provenance only — not bundled into the app.
