# TESTING.md — Prófa-samningur

Þetta skjal er **bindandi samningur** sem öll 6 teymismeðlimir (og
umboðsmenn) hlíta. Lesið það áður en þið skrifið eitt einasta próf.

---

## 1. Skráarviðskeyti → verkefni

| Skráarviðskeyti | Vitest-verkefni | Umhverfi | Dæmi |
|---|---|---|---|
| `*.test.ts` | `node` | Node.js | `src/lib/cn.test.ts` |
| `*.test.tsx` | `jsdom` | jsdom + React | `src/test/example.test.tsx` |
| `e2e/**/*.spec.ts` | Playwright | Vafri (echoes frá vefþjóni) | `e2e/smoke/example.spec.ts` |

**Mikilvægt:**
- Notið **aldrei** `.test.tsx` fyrir hreinar einingar. `.test.ts` nær
  yfir þær.
- Playwright `spec`-skrár eru **aldrei** keyrðar af Vitest (Vitest
  `include` tekur aðeins `src/**/*.test.tsx`).
- `.claude/**` er útilokað í **báðum** Vitest-verkefnum og ESLint.

---

## 2. Möppuuppbygging

```
src/
  lib/
    cn.ts
    cn.test.ts          ← node-próf, við hlið einingarinnar
    ros/
      engine.ts
      engine.test.ts    ← node-próf

  components/
    ui/
      Button.tsx
      Button.test.tsx   ← jsdom-próf, við hlið íhlutarins (þegar til)

  test/                 ← samnýtt prófagrunnur (EKKI einstakar próf hér)
    setup.ts            ← jsdom setupFiles (@testing-library/jest-dom + cleanup)
    utils.tsx           ← renderWithProviders + resetDb

e2e/
  smoke/                ← hröð heilbrigðispróf (hleðsla, fletting)
  mobile/               ← farsímaflæði
  a11y/                 ← aðgengispróf
```

---

## 3. Keyrsla hvers sæts

```bash
# Öll Vitest-próf (node + jsdom):
npm run test
npx vitest run

# Eingöngu node-eininga-próf:
npm run test:node
npx vitest run --project node

# Eingöngu jsdom-íhluta-próf:
npm run test:components
npx vitest run --project jsdom

# Playwright e2e (allar stillingar):
npm run test:e2e
npx playwright test

# Playwright — eingöngu iPhone 14:
npm run test:e2e:iphone
npx playwright test --project="iPhone 14"

# Heildarhlið — verður að vera grænn fyrir hvert commit:
npm run check
```

---

## 4. Hvernig á að gróðursetja IndexedDB í jsdom-prófum

`fake-indexeddb` er þegar devDep. Hér er mynstrið sem öll jsdom-próf nota:

```tsx
// VERÐUR að vera FYRSTA import í skránni (áður en db.ts er hlaðið).
import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { db } from '@/lib/db';
import { renderWithProviders, resetDb } from '@/test/utils';
import { MyComponent } from '@/components/MyComponent';

beforeEach(async () => {
  // Hreinsar allar töflur á milli prófa.
  await resetDb();
  // Setjið inn próf-gögn hér:
  await db.grows.add({ id: 'g1', name: 'Próf', ... });
});

describe('MyComponent', () => {
  it('sýnir gögn', async () => {
    renderWithProviders(<MyComponent growId="g1" />);
    expect(await screen.findByText('Próf')).toBeInTheDocument();
  });
});
```

**Reglur:**
1. `import 'fake-indexeddb/auto'` alltaf FYRST — áður en nokkuð frá
   `@/lib/db` er flutt inn.
2. Notið `resetDb()` í `beforeEach` svo próf séu óháð hvert öðru.
3. Notið `screen.findBy*` (async) þegar gögn koma úr `useLiveQuery` —
   þau eru async.

---

## 5. `renderWithProviders` — notkunarleiðbeiningar

`src/test/utils.tsx` flytur út:

### `renderWithProviders(ui, options?)`

Pakkar íhlutnum í:
- `MemoryRouter` (react-router-dom v6) — `initialEntries` stillanlegt
- `ErrorBoundary` — grípur render-tíma villur

```tsx
import { renderWithProviders } from '@/test/utils';

// Einföld notkun:
renderWithProviders(<MyPage />);

// Með upphafsleiðslóð:
renderWithProviders(<MyPage />, {
  routerOptions: { initialEntries: ['/grow/abc123'] },
});
```

### `resetDb()`

Hreinsar allar töflur í Dexie SpiraDB. Hringið í `beforeEach`.

---

## 6. jsdom-próf — gátlisti

- [ ] `import 'fake-indexeddb/auto'` er FYRSTA lína (ef DB er notað)
- [ ] `beforeEach(resetDb)` er kallað (ef DB er notað)
- [ ] Skráarending er `.test.tsx` (ekki `.test.ts`)
- [ ] Notandi-atburðir fara í gegnum `userEvent.setup()` frá
      `@testing-library/user-event`
- [ ] `@testing-library/jest-dom` matchers (`toBeInTheDocument` o.fl.)
      eru tiltækar án sérstakrar innflutnings — `setup.ts` sér um það
- [ ] Íslenskur texti í `getByText` / `getByRole` passar við íslenska
      UI-strengi í íhlutinum

---

## 7. Playwright e2e — gátlisti

- [ ] Skráarending er `.spec.ts`
- [ ] Skráin er undir `e2e/` (EKKI undir `src/`)
- [ ] Notið `page.goto('/')` — `baseURL` er stillt á `http://localhost:5173`
- [ ] `reuseExistingServer: true` — ef `npm run dev` er þegar í gangi
      notar Playwright það
- [ ] Farsíma-próf fara undir `e2e/mobile/` og keyra á `iPhone 14` eða
      `iPhone SE` stillingum
- [ ] Aðgengispróf fara undir `e2e/a11y/`

---

## 8. Playwright-stillingar

`playwright.config.ts` við rót verkefnisins:

- **Desktop Chromium** — `devices['Desktop Chrome']`
- **iPhone 14** — `devices['iPhone 14']` (WebKit)
- **iPhone SE** — `devices['iPhone SE']` (WebKit)

Vafrarnir eru settir upp: Chromium og WebKit (sjá `npx playwright install`).

---

## 9. Hvað á EKKI að prófa hér

- Netlify-falls (`/api/account`, `/api/ros`) — þurfa Netlify Dev umhverfi
- Þjónustan-Gemini LLM-kall — þarf API-lykil og net
- Service Worker hegðun — þarf sérstaka vafra-uppstillingu

---

## 11. A/B Eval — lykil-gírtar Gemini-prófanir

Skrárnar undir `eval/ai-ab/` keyra LIVE gegn Gemini API og eru EKKI hluti af
`npm run check`. Þær þurfa `GEMINI_API_KEY` í umhverfisbreytum.

### Uppbygging

```
eval/
  ai-ab/
    dataset.ts   — 5 grow-context sviðsmyndir (íslenskar spurningar)
    runner.ts    — A/B keyrslutæki (variant A: temp=1.0, B: temp=0.3)
```

### Keyrsla

```bash
# Settu API-lykilinn (einu sinni í .env eða beint):
GEMINI_API_KEY=<your_key> npm run test:ai-ab

# Ef lykillinn vantar: skriptan hættir með skýrum skilaboðum — ENGIN villa.
```

Skriptan:
1. Sendir sömu 5 spurningar með tveimur stillingunum (A og B).
2. Notar fallback-keðju líkt og `/api/ros` (gemini-3.5-flash → gemini-3.1-flash-lite → gemini-2.5-flash).
3. Keyrir LLM-dómara (Gemini við lágan hita) sem gefur einkunn á:
   - **Correctness** (0–3): réttir ræktunarlegar ráð fyrir Ísland
   - **Icelandic fluency** (0–3): málfræðilega náttúrulegt íslenskt
   - **Actionability** (0–3): skýr, hagnýt skref
   - **Rubric** (0–1): forritunarlegt athugun á leitarorðum
4. Prentar samanburðartöflu og skrifar `results-<timestamp>.json` í `eval/ai-ab/`.

### Þegar á að keyra

- Við breytingar á kerfiskerfinu (SYSTEM prompt) í `netlify/functions/ros.mts`
- Við prófun á nýjum Gemini-líkönum
- Reglulega á millilofsréna grein til að fylgjast með gæðum svara

---

## 10. Samantekt skráar-viðskeyti → verkefni (endurtekin fyrir skjótari uppflettingu)

```
*.test.ts    → vitest --project node   (Node umhverfi, hreinar einingar)
*.test.tsx   → vitest --project jsdom  (jsdom + React Testing Library)
e2e/**/*.spec.ts → playwright test     (vafri, krefst npm run dev)
```
