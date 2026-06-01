# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Spíra is a **local-first grow journal** for growing peppers, tomatoes and strawberries indoors plus potatoes (and outdoor strawberries) in the garden, built as a React PWA that works on mobile and desktop. The UI and all content strings are in **Icelandic** — preserve that when editing text. It is built for the Icelandic climate, with **two advice axes**: indoor grows are driven by the Reykjavík daylight calendar (`daylight.ts` → grow-light recommendations); outdoor grows are driven by the season/frost calendar (`season.ts`). A grow's axis comes from `Grow.environment` (falls back to its `locationKey`/category — `garden` or potatoes ⇒ outdoor). The data model is category-extensible (`PlantCategory` also covers herbs, leafy, fruit, houseplants, etc.).

## Commands

```bash
npm install
npm run dev       # Vite dev server on :5173 (host: true, exposed on LAN)
npm run build     # tsc -b (typecheck/build refs) THEN vite build → dist/
npm run lint      # tsc --noEmit — this is the ONLY check; there is no ESLint
npm run preview   # serve the production build locally
```

There is no test runner and no linter beyond `tsc`. Treat `npm run lint` (and the typecheck inside `npm run build`) as the gate — keep the project type-clean.

Netlify functions and the Postgres database require the Netlify dev environment / deployment to exercise (`@netlify/vite-plugin` wires functions into the dev server; `getDatabase()` needs Netlify DB env vars). Plain `vite` serves the frontend but `/api/account` and `/api/ros` will not work without it. Rós chat additionally needs **`GEMINI_API_KEY`** (and optional `GEMINI_MODEL`) in the Netlify env — without it the rule-engine "Ráð" tab still works, but chat returns a configured-message error. See `.env.example`.

## Architecture

### Local-first: IndexedDB is the source of truth

`src/lib/db.ts` defines a Dexie database (`SpiraDB`, name `'spira'`) with tables: `grows`, `plants`, `logs`, `photos`, `environment`, `harvests`, `varieties`, `meta`. **The app reads and writes IndexedDB directly** (pages use `dexie-react-hooks` `useLiveQuery`); the cloud is only a backup/transport. All domain types (`Grow`, `Plant`, `LogEntry`, `GrowPhase`, `LogType`, etc.) live in `db.ts`. Use `newId()` for IDs. To bump the schema, add a `this.version(n).stores({...})` block — do not edit version 1 in place.

`BUILT_IN_VARIETIES` (from `src/lib/varieties.ts`) is re-`put` into the `varieties` table on every app load (`App.tsx`), so built-in presets are always current; user-created varieties coexist.

### Accounts = a 3-character code (no email, no password)

Auth is a single uppercase 3-char code matching `/^[A-Z0-9]{3}$/`. The code IS the account.

- **Client** (`src/lib/account.ts`): stores the current account in `localStorage` (`spira:account`), normalizes/validates codes, and POSTs to `/api/account?action={signup|signin|sync}`.
- **Server** (`netlify/functions/account.mts`, path `/api/account`): backed by Netlify Postgres (`@netlify/database`). The `accounts` table (migration in `netlify/database/migrations/`) is `code TEXT PRIMARY KEY, name, data JSONB, created_at, updated_at`. The **entire app dataset is stored as one `data` JSONB blob per code.**

`normalizeCode` / the code regex exist in **both** client and server — keep them consistent (currently 3 chars, `A–Z0–9`). User-facing error messages from the function are Icelandic and surfaced directly in the UI.

### Sync = whole-snapshot, last-write-wins

`src/lib/sync.ts` is the sync engine. There is **no field-level merge** — sync replaces everything:

- `exportSnapshot()` serializes grows/plants/logs/environment/harvests/meta into a `SnapshotV1` (`version: 1`). **Photos are NOT included** — image blobs stay device-local and never sync. The `lastSyncedAt` meta key is stripped.
- On **sign-in**, the server's `data` blob is `importSnapshot()`ed: it **clears local tables then bulk-adds** the snapshot. So signing in overwrites local data with the cloud copy.
- `syncManager` (singleton) debounces pushes by `SYNC_DEBOUNCE_MS` (1200ms) and serializes in-flight requests. `installAutoSyncHooks()` (called once in `App.tsx`) attaches Dexie `creating`/`updating`/`deleting` hooks to the synced tables so any mutation schedules a push. Photos table is intentionally not hooked.
- Because it's whole-snapshot last-write-wins, **two devices on the same code overwrite each other** — there is no conflict resolution. Keep this in mind for any feature touching sync.

If you add a new synced table, update: the `stores()` schema, `SnapshotV1` + `exportSnapshot`/`importSnapshot`/`isSnapshot`, `clearLocalData`, and the hook list in `installAutoSyncHooks`.

### Rós — the AI grow helper (v1.1.0)

Rós is a per-grow assistant opened from `GrowDetail`. It is **hybrid**:

- **Offline rule engine** (`src/lib/ros/engine.ts`, pure/deterministic — takes `now`/`month` as params, no clock calls inside): `computeInsights()` derives watering/feeding/topping/pollination/fruit-ready/grow-light reminders (`RosInsight`, types in `src/lib/ros/types.ts`) from logs + phase + variety + the Reykjavík `daylight.ts` table. `buildContextDigest()` produces the Icelandic context string fed to the LLM. This works with **no API key**.
- **LLM chat** (`netlify/functions/ros.mts`, path `/api/ros`) proxies to **Google Gemini** (`generateContent`). It tries a **fallback chain** of models in order, advancing to the next on a retryable upstream status (503/429/5xx) or a per-attempt timeout, so a single overloaded model doesn't surface as a 502/504. The chain is `GEMINI_MODEL` (or comma-separated `GEMINI_MODELS`) first, then the built-in `DEFAULT_CHAIN` (`gemini-3.5-flash → gemini-3.1-flash-lite → gemini-2.5-flash`), de-duped; default primary is `gemini-3.5-flash`. Non-retryable statuses (400/403/404) stop the chain immediately. The success response includes which `model` answered. The browser never holds the key — it reads `GEMINI_API_KEY` from the Netlify env (set `GEMINI_API_KEY` as a Netlify env var; see `.env.example`). Client wrapper: `src/lib/ros/chat.ts` (`askRos`, `blobToInlineImage`). **Vision is enabled** — selected plant photos are downscaled and sent as inline base64 (this is the one path where local photos leave the device). UI lives in `src/components/ros/`.

Chat history is stored in the **`rosMessages`** Dexie table (db schema **v2**) and, like photos, is **device-local — NOT added to the sync snapshot.**

### Modals & the scroll-lock rule

All overlays use `src/components/ui/Modal.tsx` (portal + framer-motion + Escape-to-close), which calls `useScrollLock` (`src/lib/useScrollLock.ts`, ref-counted, iOS-safe). **Use `<Modal>` for any new dialog/window** — opening a bare `fixed inset-0` overlay reintroduces the bug where the page scrolls behind the window.

### Logs are structured

Log entries are composed via `src/components/LogComposer.tsx` using the field schema in `src/lib/logSchema.ts` (`LOG_FIELDS`, `LOG_TYPE_META`, `formatLogData`). Per-type inputs (e.g. water → ml/EC/pH) are written into `LogEntry.data` (`Record<string, unknown>`, already part of the synced snapshot). Photos attach via `src/lib/photos.ts` (`addPhotoFromFile`, `usePhotoUrl`) → `db.photos` (local-only). When adding a log type, extend `logSchema.ts` rather than hardcoding fields in the UI.

### Demo account `123`

Code `123` is special everywhere: `Login.tsx` seeds a rich ghost dataset (`seedDemoData()` in `src/lib/demo.ts`, which wipes local data first), and `syncManager.isDemo()` **disables all network sync** so demo edits never hit the server. Don't route demo data through the account API.

### App shell & routing

`src/App.tsx` is the root state machine: `loading → unauthenticated (Login) | authenticated`. When authenticated it gates on `onboardingComplete` (a `meta` row): `/` shows `Welcome` until setup is done, then redirects to `/home`. Authenticated routes (`/home`, `/grows`, `/grow/:id`, `/plants`, `/varieties`, `/environment`, `/harvest`, `/history`) render inside `Layout` (responsive mobile/desktop nav). `SetupWizard` (`/setup`) is the animated onboarding flow. Page transitions use Framer Motion `AnimatePresence` keyed on pathname.

### Domain logic (pure modules in `src/lib/`)

- `phases.ts` — the grow-cycle phase timeline (`PHASES`, `TOTAL_CYCLE_DAYS = 140`) and day/progress helpers. Note the phase *display* timeline here is pepper-tuned and distinct from the broader `GrowPhase` enum in `db.ts`.
- `daylight.ts` — Reykjavík monthly daylight table; `needsGrowLight()` / `daylightStatus()` drive the "do you need an LED this month" feature (indoor grows). Central to the tomato (Steinunn) guide.
- `season.ts` — Reykjavík **outdoor** season/frost calendar (last frost ~late May, first frost late Sep); `frostRisk()` / `seasonForMonth()` / `seasonStatus()` drive outdoor advice (planting window, hilling, harvest-before-frost), and `growIsOutdoor(grow)` (env ?? `locationKey === 'garden'`) is the shared indoor/outdoor switch for UI. The Rós engine has its own plant-aware `growIsOutdoor(grow, plants)` (also treats potatoes as outdoor): outdoor grows skip the indoor watering/feed/LED/hand-pollination insights and get season/frost/hilling/mulch ones instead. UI mirrors this split: `DaylightCard` (indoor) vs `SeasonCard` (outdoor) on the Environment page and per-grow in `GrowDetail`; the `SetupWizard` swaps its LED step for a season step when the `garden` location is chosen.
- `varieties.ts` — `BUILT_IN_VARIETIES` catalog (pepper SHU/color, the Icelandic `tomato-steinunn` dwarf + international `tomato-*`, day-neutral/alpine `strawberry-*`, and outdoor `potato-*` varieties). Tomatoes, strawberries and potatoes carry a structured **`CropCare`** block (`TomatoCare` is a back-compat alias; `pollination` and `seasonal` are optional — potato uses `seasonal` for the chitting→hilling→harvest checklist and has no pollination) rendered by `CareGuide.tsx`. Use the `isTomato`/`isStrawberry`/`isPotato`/`hasCare` (→ `CaredVariety`) guards rather than checking `category` strings. Add a glyph in `components/` and wire it into `PlantGlyph.tsx` when adding a crop. `locations.ts` (each `LocationCategory` has an `environment`; `garden` is the outdoor one), `account.ts`, `sync.ts`, `demo.ts`, `cn.ts` round out the lib.

### `research/` — source material, not shipped code

`research/` holds the Icelandic grow-guide research (tomato/potato/strawberry, HTML + PDF) that domain content like `daylight.ts`, the Steinunn guide, and `varieties.ts` is derived from. It is reference/provenance for the data model and a pointer to planned categories — it is not bundled into the app.

### Conventions

- Import alias **`@` → `src`** (configured in `vite.config.ts` and `tsconfig.json`); prefer `@/lib/...`, `@/components/...`.
- Styling is Tailwind with a custom palette — **`moss`, `terracotta`, `cream`, `capsicum`** — and fonts `Fraunces` (`font-display`) / `Inter` (`font-sans`). Reuse these tokens and the primitives in `src/components/ui/` (`Button`, `Card`, `Tabs`, `PhaseBar`, `Sparkline`, etc.) rather than introducing new colors.
- Netlify is the deploy target: `netlify.toml` builds to `dist/`, bundles functions from `netlify/functions` with esbuild. Functions are `.mts` (ESM) and export a `config` with their `path`.
