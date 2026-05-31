<div align="center">

# 🌱 Spíra

**A local-first grow journal for the Icelandic climate — peppers, tomatoes & strawberries indoors, potatoes in the garden — with Rós, a hybrid AI growing companion.**

[![Version](https://img.shields.io/badge/version-1.1.0-2f8f4f)](#)
[![React](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8?logo=pwa&logoColor=white)](#-progressive-web-app)
[![Deploy: Netlify](https://img.shields.io/badge/deploy-Netlify-00c7b7?logo=netlify&logoColor=white)](https://www.netlify.com)

_The product UI and all content strings are in **Icelandic** — built for growers in Reykjavík's short, dark winters and brief summers._

</div>

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Rós — the AI growing companion](#rós--the-ai-growing-companion)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Progressive Web App](#-progressive-web-app)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

**Spíra** ("to sprout") is a React PWA that helps home growers run a full **grow cycle** — from seed to harvest — rather than tracking isolated plants. It is **local-first** (IndexedDB is the source of truth; it works offline) and tuned for Iceland, where success hinges on two very different advice axes:

| Axis | Driven by | Applies to |
| --- | --- | --- |
| ☀️ **Daylight** | The Reykjavík monthly daylight table → grow-light recommendations | Indoor grows |
| ❄️ **Season & frost** | The Reykjavík season/frost calendar (last frost ≈ late May, first frost ≈ late Sep) | Outdoor grows |

A grow's axis is derived from its environment (`indoor` / `outdoor`, falling back to its location or category — a garden or potatoes ⇒ outdoor). The data model is **category-extensible**, already covering peppers, tomatoes, strawberries and potatoes, with room for herbs, leafy greens, fruit and houseplants.

> **Why local-first?** Your journal, photos and plant data live on your device and keep working with no network. The cloud is only an optional backup/transport keyed to a tiny account code — never a hard dependency.

---

## Features

### 🌶️ Multi-crop catalog
- **Peppers** — 40+ varieties from sweet bells to superhots, with SHU heat and colour classification.
- **Tomatoes** — _Steinunn_, an Icelandic dwarf cultivar, plus an international indoor catalog. Each carries a structured **`CropCare`** guide (targets, watering, electric-toothbrush pollination, feeding schedule, troubleshooting).
- **Strawberries** — day-neutral and alpine types, indoor and outdoor, with deblossoming and runner-management advice.
- **Potatoes** — outdoor, with a chitting → planting → hilling → harvest seasonal checklist.

### 📓 Structured grow journal
- **Typed log entries** — instead of freeform notes, each event has fields (water → ml / EC / pH, feed, environment, prune, pollinate, harvest…) stored in `LogEntry.data`.
- **Photos in logs** — capture or upload a picture straight into a log; stored locally in IndexedDB and shown as thumbnails. Photos can be attached to a specific plant or the whole grow.
- **Phase tracker** — a per-crop growth timeline that reflects the plant's real stage, not just calendar age.
- **Harvest ledger** — grams per pod / plant / variety.

### 🌍 Iceland-aware advice
- **Indoor:** a Reykjavík daylight almanac tells you *which months you need an LED* and for how long.
- **Outdoor:** a season/frost calendar drives planting windows, potato hilling, harvest-before-frost warnings and winter mulching.

### 🔐 Frictionless accounts
- No email, no password — an account **is** a single 3-character code (`A–Z`, `0–9`). Sign up, sign in, and your whole dataset syncs as one snapshot.
- **Demo account `123`** seeds a rich ghost dataset and disables all network sync, so you can explore safely.

### 📱 Installable PWA
- Responsive mobile/desktop shell, animated onboarding, manifest + icons, offline-capable.

---

## Rós — the AI growing companion

**Rós** is a per-grow assistant (`vinkona ræktandans` — "the grower's friend") opened from any grow. She is **hybrid**: a deterministic offline engine plus an optional vision-capable LLM. She lives across **three tabs**:

| Tab | What it does | Needs an API key? |
| --- | --- | --- |
| **Ráð** (Advice) | An **offline rule engine** derives reminders — watering, feeding, topping, hand-pollination, deblossoming, runner-trimming, fruit-ready ETA, grow-light, frost, hilling, mulch — from your logs + phase + variety + the Reykjavík calendars. Pure & deterministic. | ❌ No |
| **Heilsa** (Health) | Rós analyses the **latest photo of each plant** and returns a health assessment (`Heilsa: N/10` + what she sees + the most important next step). One card per plant; the re-run button **always re-analyses the newest photo**, even if it was assessed before. | ✅ Yes (vision) |
| **Spjall** (Chat) | Free-form chat about your grow, with optional **vision** — attach plant photos and ask. Rós answers in warm, concise Icelandic Markdown, grounded in your journal context. | ✅ Yes |

**How it works**
- The **Ráð** engine (`src/lib/ros/engine.ts`) is a set of pure functions — it takes `now`/`month` as arguments and never calls the clock or RNG internally, so it is fully testable and works with **no API key**.
- **Heilsa** and **Spjall** call a Netlify function (`netlify/functions/ros.mts`, path `/api/ros`) that proxies to **Google Gemini**. The browser never holds the API key. Vision images are downscaled client-side before upload — this is the one path where local photos leave the device.
- **Heilsa** results persist in a device-local Dexie table (`rosAssessments`), keyed by plant so a re-run overwrites the previous result. Like photos and chat history, they are **never added to the sync snapshot**.

> Without a `GEMINI_API_KEY` the **Ráð** tab still works fully; **Heilsa** and **Spjall** surface a friendly "not configured" message.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| **Framework** | React 18 + TypeScript 5.7 |
| **Build** | Vite 6 |
| **Styling** | Tailwind CSS 3.4 — custom palette `moss` · `terracotta` · `cream` · `capsicum`; fonts `Fraunces` (display) / `Inter` (sans) |
| **Animation** | Framer Motion 11 |
| **Local storage** | Dexie 4 (IndexedDB) + `dexie-react-hooks` (`useLiveQuery`) |
| **Routing** | React Router 6 |
| **Markdown** | `react-markdown` + `remark-gfm` |
| **Icons** | `lucide-react` |
| **Backend** | Netlify Functions (ESM `.mts`) + Netlify Postgres (`@netlify/database`) |
| **AI** | Google Gemini (`generateContent`, vision-enabled) |
| **Type gate** | `tsc --noEmit` (no ESLint — `tsc` is the single check) |

---

## Architecture

### Local-first: IndexedDB is the source of truth
`src/lib/db.ts` defines a Dexie database (`SpiraDB`) with tables for `grows`, `plants`, `logs`, `photos`, `environment`, `harvests`, `varieties`, `meta`, `rosMessages` and `rosAssessments`. Pages read and write IndexedDB **directly** via `useLiveQuery`; the UI reacts the instant data changes. Built-in variety presets are re-seeded on every load, so they stay current while user-created varieties coexist.

### Accounts = a 3-character code
Auth is a single uppercase 3-char code matching `^[A-Z0-9]{3}$` — the code *is* the account. The client stores it in `localStorage`; the server (`netlify/functions/account.mts`, path `/api/account`) persists the **entire app dataset as one JSONB blob** per code in Netlify Postgres.

### Sync = whole-snapshot, last-write-wins
`src/lib/sync.ts` serialises grows/plants/logs/environment/harvests/meta into a `SnapshotV1` and pushes it (debounced) on any mutation. **Photos, chat history and health assessments are intentionally device-local and never synced.** There is no field-level merge — two devices on the same code overwrite each other, by design for simplicity.

### Rós: hybrid rule engine + LLM
See [Rós — the AI growing companion](#rós--the-ai-growing-companion). The deterministic engine and the LLM proxy are cleanly separated: `src/lib/ros/engine.ts` (pure logic), `src/lib/ros/assessment.ts` (Heilsa prompt + score parsing), `src/lib/ros/chat.ts` (client transport), `netlify/functions/ros.mts` (server proxy), and `src/components/ros/` (UI).

---

## Project structure

```
spira/
├─ src/
│  ├─ components/
│  │  ├─ ros/              # RosWindow (Ráð / Heilsa / Spjall), RosAvatar
│  │  ├─ ui/              # Button, Card, Tabs, Modal, PhaseBar, Sparkline…
│  │  └─ *.tsx            # CareGuide, LogComposer, plant glyphs, cards
│  ├─ lib/
│  │  ├─ db.ts            # Dexie schema + domain types (source of truth)
│  │  ├─ sync.ts          # whole-snapshot sync engine
│  │  ├─ account.ts       # 3-char code auth (client)
│  │  ├─ daylight.ts      # Reykjavík daylight table (indoor axis)
│  │  ├─ season.ts        # Reykjavík season/frost calendar (outdoor axis)
│  │  ├─ varieties.ts     # BUILT_IN_VARIETIES catalog + CropCare
│  │  ├─ phases.ts        # grow-cycle phase timeline
│  │  ├─ photos.ts        # local photo store + downscale
│  │  ├─ demo.ts          # demo account `123` seed data
│  │  └─ ros/             # engine.ts · assessment.ts · chat.ts · types.ts
│  ├─ pages/              # Home, Grows, GrowDetail, Plants, Varieties,
│  │                      # Environment, Harvest, History, Login, Welcome, Setup
│  └─ App.tsx             # root state machine + routing
├─ netlify/
│  ├─ functions/         # account.mts (/api/account), ros.mts (/api/ros)
│  └─ database/          # Postgres migrations
├─ research/             # Icelandic grow-guide source material (not shipped)
├─ public/               # PWA manifest + icons
└─ netlify.toml          # build + SPA fallback + function bundling
```

---

## Getting started

### Prerequisites
- **Node.js 18+** and npm.
- (Optional) the **Netlify CLI** to run the serverless functions and database locally.

### Install & run the frontend

```bash
git clone https://github.com/arnar111/spira.git
cd spira
npm install
npm run dev          # Vite dev server on http://localhost:5173
```

Plain `vite` serves the full frontend — the offline **Ráð** engine, journaling, photos and the demo account all work without any backend. Sign in with code **`123`** to explore the seeded demo.

### Run with backend (accounts + Rós chat/vision)

The `/api/account` and `/api/ros` functions and the Postgres database require the Netlify dev environment:

```bash
npm install -g netlify-cli
netlify dev          # wires functions + DB env into the Vite server
```

Set the environment variables below for Rós's LLM tabs to respond.

---

## Environment variables

Set these in your Netlify site (or a local `.env` for `netlify dev`). See `.env.example`.

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | for Heilsa & Spjall | Google Gemini API key. The browser never sees it. |
| `GEMINI_MODEL` | optional | Model override (default `gemini-3.5-flash`). |

Netlify Postgres env vars (provisioned by `@netlify/database`) back the accounts table.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server on `:5173` (host exposed on LAN). |
| `npm run build` | `tsc -b` (typecheck/build refs) **then** `vite build` → `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | `tsc --noEmit` — the **single** type gate (there is no ESLint). |

---

## Deployment

Netlify is the deploy target (`netlify.toml`):

- **Build:** `npm run build` → publishes `dist/`.
- **Functions:** bundled from `netlify/functions` with esbuild; each exports a `config` with its `path`.
- **SPA fallback:** a `/* → /index.html` (200) catch-all lets React Router handle deep links and reloads, while `/api/*` and static assets are matched first so they aren't shadowed.

---

## 📲 Progressive Web App

Spíra ships a web manifest and maskable icons (`public/`), so it installs to the home screen on mobile and desktop and runs offline against its local IndexedDB store.

---

## Roadmap

- [x] **Phase 1** — Vite + React + TS + Tailwind scaffold, responsive shell, animated setup wizard, Dexie schema, Home/Welcome screens
- [x] **Phase 2** — Grow-journal core: add plants, typed daily logs (water/feed/note/photo), per-crop phase tracker
- [x] **Outdoor axis** — potatoes + outdoor strawberries, season/frost calendar, `SeasonCard`, outdoor setup flow
- [x] **v1.1.0** — Interactive typed logs, photos in logs, scroll-lock modals, and **Rós** (offline rule engine + Gemini chat with vision)
- [x] **Rós · Heilsa** — per-plant photo health assessment (always the latest photo)
- [ ] Per-plant photo timeline & plant detail page
- [ ] Environment insights (temp / humidity / light-hours) + LED presets
- [ ] Variety library editor & year-over-year comparison
- [ ] Hot-sauce ledger

---

## License

No license file is currently included — all rights reserved by the author. If you intend to reuse this code, please open an issue to discuss.

---

<div align="center">

Made with 🌱 for Icelandic growers · powered by [Rós](#rós--the-ai-growing-companion)

</div>
