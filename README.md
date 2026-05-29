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

- **Pipar** — afbrigði úr öllum fimm _Capsicum_-tegundunum (annuum, chinense, baccatum,
  frutescens, pubescens), frá mildum papríkum að superhots, með SHU-styrk, litaflokkun og
  **kuldaþoli**. Sía „Fyrir Ísland" sýnir kuldaþolin yrki — t.d. _Rocoto_ (C. pubescens) sem
  þolir niður í 5°C og hentar íslenskum stofuhita.
- **Tómatar** — _Steinunn_, íslenskt dvergyrki með hjartalaga aldin og hrukkótt blöð. Fylgir
  ítarleg ræktunarleiðbeining (markgildi, vökvun, frjóvgun með rafmagnstannbursta, áburðaráætlun
  og bilanaleit).

## Skipulagsverkfæri (Umhverfi)

- **Birtualmanak fyrir Reykjavík** — mánaðarleg dagsbirta, hvort gróðurljós þarf, og
  „á döfinni þennan mánuð" (hvað á að sá/gera) byggt á íslensku ræktunardagatali.
- **Ljósareiknir (DLI)** — reiknar daglegt ljósmagn út frá ljósstyrk (PPFD) og ljóstíma og
  segir hvort plantan fái nóg fyrir hvern vaxtarfasa.

## Fasi 1 — Grunnur (núverandi)

- [x] Vite + React + TypeScript + Tailwind scaffold
- [x] App shell með mobile/desktop responsive navigation
- [x] Animated setup wizard (4 skref) með SVG piparplöntu sem vex
- [x] IndexedDB schema (Dexie) — extensible fyrir fleiri flokka síðar
- [x] Welcome screen með Framer Motion animations
- [x] Home screen með grow cards og empty state

## Fasi 2 — Grow journal core (næst)

- [ ] Bæta við plöntum eftir setup
- [ ] Daglegt log (vökva/næra/nóta/photo)
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
