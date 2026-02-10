# Catan Online (Next.js + MongoDB) – API polling MVP

Ez egy **minimális**, letölthető/futtatható Catan-szerű online MVP:
- **Next.js (App Router) frontend** (reszponzív mobil/tablet/desktop)
- **Next.js backend (Route Handlers /api)**
- **MongoDB + Mongoose**
- **Nincs realtime websocket** – a kliens **SWR pollinggal** frissít (2 mp)
- A tábla **SVG** + mintázott **pattern tile-okkal**

> Fontos: ez **MVP**, nem teljes szabályrendszer. Setup fázisban település + út lerakás megy (alap validáció). A fő játékban dobás/kör vége/log/chat van. Erőforrás kiosztás, építés, kereskedelem később bővíthető.

## 1) Telepítés

```bash
npm install
```

## 2) Környezeti változók

Másold le `.env.example` -> `.env.local`:

```bash
cp .env.example .env.local
```

Majd állítsd be:
- `MONGODB_URI` (pl. Atlas connection string)
- opcionálisan `MONGODB_DB`

## 3) Futtatás

```bash
npm run dev
```

Nyisd meg: `http://localhost:3000`

## 4) Használat

1. Adj meg nevet
2. "Új játék létrehozása" -> kapsz Game ID-t
3. Másik böngészőben (vagy másik gépen) csatlakozz a Game ID-val
4. Amikor megvan legalább 2 játékos, a játék automatikusan elindul (setup)

## 5) Bővítési ötletek

- Erőforrás kiosztás dobáskor (települések alapján)
- Kikötők, bank csere, játékos csere ajánlatok
- Fejlesztés kártyák, rabló (7), lopás
- Teljes építési szabályok a fő fázisban
- Auth (ha kell)

