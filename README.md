# Spíra 🌱

Grow-dagbók fyrir inniræktun — byggð fyrir piparræktun á Íslandi en hönnuð til að styðja fleiri flokka.

## Stefna

Webapp sem virkar bæði sem mobile PWA og desktop, með áherslu á:

- **Grow cycles** — heil umferð frá fræi að uppskeru, ekki bara stakar plöntur
- **Sjónrænt vandað** — animated setup, falleg mynda-tímalína, hlýtt litaspjald
- **Local-first** — gögn í IndexedDB, virkar offline, engin login í MVP
- **Ísland-stillt** — afbrigði fyrir norðlæg loftslag, íslenskt UI, verslunar-tilvísanir

## Tegundir

Spíra styður nú **tvo plöntuflokka**:

- **Pipar** — yfir 40 afbrigði frá mildum papríkum að superhots, með SHU-styrk og litaflokkun.
- **Tómatar** — _Steinunn_, íslenskt dvergyrki með hjartalaga aldin og hrukkótt blöð. Fylgir
  ítarleg ræktunarleiðbeining (markgildi, vökvun, frjóvgun með rafmagnstannbursta, áburðaráætlun
  og bilanaleit) ásamt **birtualmanaki fyrir Reykjavík** sem sýnir dagsbirtu mánaðarlega og segir
  til um hvenær gróðurljós þarf.

## Fasi 1 — Grunnur (núverandi)

- [x] Vite + React + TypeScript + Tailwind scaffold
- [x] App shell með mobile/desktop responsive navigation
- [x] Animated setup wizard (4 skref) með SVG piparplöntu sem vex
- [x] IndexedDB schema (Dexie) — extensible fyrir fleiri flokka síðar
- [x] Welcome screen með Framer Motion animations
- [x] Home screen með grow cards og empty state

## v1.1.0 — Interactive log + Rós (núverandi)

- [x] **Gagnvirkt log** — skipti út „minnisblaðs"-skráningu fyrir týpur með reitum (vökva → ml/EC/pH, næring, umhverfi o.fl.) sem vistast í `LogEntry.data`
- [x] **Myndir í skráningum** — taka/hlaða inn mynd beint í log; geymt local í IndexedDB (`db.photos`), birt sem smámynd
- [x] **Rós — AI ræktunarhjálp** — sérstakur gluggi í hverri ræktun. Tvíþætt: (1) reglubundin vél (offline) sem reiknar áminningar um vökvun, næringu, klippingu, frjóvgun, gróðurljós og hvenær aldin eru tilbúin út frá dagbók + fasa + afbrigði; (2) spjall við Rós (Google Gemini gegnum Netlify function, með myndgreiningu)
- [x] **Scroll-lás** — gluggar læsa nú skrun á síðunni á bak við (lagar riðl í iOS/PWA)

## Fasi 2 — Grow journal core

- [ ] Bæta við plöntum eftir setup
- [x] Daglegt log (vökva/næra/nóta/mynd)
- [ ] Fasa-tracker með sjálfvirkum dagsetningum
- [ ] Mynda-tímalína per plöntu
- [ ] Plant detail page

## Fasi 3 — Umhverfi + innsýn

- [ ] Environment log (temp/raki/ljóstími)
- [ ] LED preset (Lumii SwitchBlade VEG/BLOOM mode)
- [ ] Áminningar (hand-pollination, topping)
- [ ] Greiningarhjálp (gul blöð, blossom drop, o.fl.)
- [ ] Variety library

## Fasi 4 — Uppskera + slípun

- [ ] Uppskeruskráning (gramm per pod/planta/afbrigði)
- [ ] Ár-til-árs samanburður
- [ ] Hot sauce ledger
- [ ] PWA install
- [ ] Animations polish

## Þróun

```bash
npm install
npm run dev
```

Opnaðu http://localhost:5173.

## Tækni

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** (custom palette: moss, terracotta, cream, capsicum)
- **Framer Motion** fyrir transitions
- **Dexie** fyrir IndexedDB
- **React Router**
- **Lucide React** fyrir ikon
- **Inter + Fraunces** fontar
