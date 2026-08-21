# 🏰 Tower Defense

Klasyczna gra Tower Defense w czystym JavaScript (ES modules) — bez frameworków, bez build tools, bez assetów. Grafika rysowana na `<canvas>`, dźwięki syntezowane przez WebAudio API.

## Uruchomienie

Moduły ES nie działają z `file://` — potrzebny jest serwer HTTP:

```bash
cd tower-defense
./start.sh            # domyślnie port 8000, otwiera przeglądarkę
./start.sh 9000       # własny port
```

Ręcznie: `python3 -m http.server 8000` → http://localhost:8000

## Rozgrywka

- Fale wrogów, **boss co 5. falę**
- Wieże stawiasz na trawie — nigdy na drodze
- Po każdej fali bonus złota; sprzedaż wieży zwraca 70% inwestycji
- Przed startem wybierasz poziom trudności

### Poziomy trudności

| Tryb | Fale | Życia | HP wrogów | Bonus złota | Uwagi |
|------|------|-------|-----------|-------------|-------|
| Easy | 20 | 20 | ×1.00 | ×1.00 | wygodny — wystarczy dobrze ułożyć wieże |
| Normal | 25 | 15 | ×1.15 | ×0.95 | wymaga mocniejszego startu i kilku ulepszeń |
| Hard | 30 | 12 | ×1.30 | ×0.88 | wymaga ulepszeń i przemyślanego rozstawu |

Wszystkie tryby startują od **150 złota** (3 archery). Trudność rośnie głównie przez liczbę fal — późniejsze fale mają znacznie wyższe HP i bossy — oraz przez mniej żyć i niższy dochód. HP wrogów w danej fali to `podstawa × krzywa fali × mnożnik trybu`.

### Wieże

| # | Wieża | Koszt | Ranga | Atak | Cecha |
|---|-------|-------|-------|------|-------|
| 1 | Archer | 50g | 100 | szybki | tani, niezawodny single-target |
| 2 | Cannon | 90g | 110 | wolny | splash damage (promień 60) |
| 3 | Frost | 70g | 90 | szybki | spowalnia o 50% na 1.5s |
| 4 | Sniper | 140g | 230 | rzadki | ogromny zasięg, celuje w najgrubsze cele |

Każda wieża: 3 ulepszenia (max Lv 4). Ulepszenia zwiększają obrażenia (×1.45/poziom), zasięg (×1.08) i częstotliwość strzału (×0.92).

### Wrogowie

| Typ | HP | Prędkość | Złoto |
|-----|----|----------|-------|
| Runner | 38 | szybki | 6 |
| Soldier | 70 | średnia | 9 |
| Tank | 240 | wolny | 20 |
| BOSS | 1400+ | wolny | 150 |

HP wrogów rośnie z falą (`1 + 0.08·(w−1) + 0.005·(w−1)²`), bossy jeszcze szybciej.

## Sterowanie

| Akcja | Klawisz / gest |
|-------|----------------|
| Wybór wieży | `1`–`4` lub klik w shop |
| Anulowanie | `Esc` / prawy klik / long-press |
| Inspekcja / upgrade / sprzedaż | klik na wieżę |
| Wyślij falę | `Space` lub przycisk |
| Pauza | `P` |
| Prędkość 1×/2× | `F` |
| Upgrade / sprzedaż wybranej | `U` / `X` |
| Wyciszenie | `M` |
| **Touch** | tap = postaw/wyber, drag = ghost pod palcem, release = buduj, long-press = anuluj |

Na telefonach w pionie gra auto-pauzuje i prosi o obrócenie urządzenia.

## Struktura projektu

```
index.html      markup + style (jeden plik, bez zewnętrznych zależności)
start.sh        start serwera HTTP + otwiera przeglądarkę
js/
  main.js       punkt wejścia: pętla gry, TD_DEBUG, listenery resize/orientation
  state.js      stan gry (state, world: towers/enemies/projs/effects/…), reset
  config.js     balans: wieże, wrogowie, fale, krzywe HP/prędkości
  board.js      plansza: siatka, ścieżka (waypoints), pointAt/dirsAt
  render.js     rysowanie: statyczne tło, wieże, wrogowie, pociski, efekty, fitCanvas
  update.js     krok symulacji: spawn, ruch, strzały, pociski, fx, koniec fali
  combat.js     spawnEnemy, acquire (celowanie), fire, hitEnemy
  towers.js     akcje: canPlace, placeTower, doUpgrade, doSell, towerStats
  waves.js      sendWave, doGameOver, doVictory
  fx.js         addFloat, burst (teksty i cząsteczki)
  audio.js      syntezowane SFX (WebAudio, zero assetów)
  dom.js        HUD, shop, panel info, overlay, detekcja orientacji
  input.js      mysz, touch, klawiatura, przyciski
  util.js       TAU, clamp, rand, rgba, rr, $
```

Kierunek zależności: `main → input → dom → render → state`, symulacja (`update/combat/towers/waves`) nie zna DOM-u — komunikuje się z nim tylko przez `state`/`world`.

## Debugowanie / testy

Globalny obiekt `window.TD_DEBUG` udostępnia stan do inspekcji i sterowania z konsoli:

```js
TD_DEBUG.state            // { phase, gold, lives, wave, … }
TD_DEBUG.towers           // aktualna lista wież
TD_DEBUG.enemies          // aktualna lista wrogów
TD_DEBUG.sendWave()       // wyślij falę
TD_DEBUG.placeTower('cannon', 5, 3)
TD_DEBUG.stats(tower)     // statystyki wieży po ulepszeniach
```
