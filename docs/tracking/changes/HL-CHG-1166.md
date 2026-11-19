# HL-CHG-1166 — Ogranicz ładowanie grafik i koszt rysowania morza powodujące zawieszanie Chrome

**Typ:** Bug · **Obszar:** Wydajność startu i animacji wyspy · **Epik:** `HL-EPIC-UI`

Ta karta jest wersjonowanym wpisem w Git. **Nie została opublikowana jako natywne GitHub Issue** (`issue_url: null`).

## Status

| Warstwa | Stan |
|---|---|
| Implementacja | `implemented` |
| DEV | `ACCEPTED_C6_OWN_CI_PAGES_EXACT_BYTES_PASS` |
| CI | `SUCCESS_44569674535_EXACT_d5ad35c` |
| PRE-PROD | `ACCEPTED_C6_44577083312_1_NATIVE_EXISTING_ADMIN1_ADMIN3_RECEIPT_ALL_BYTES_ACCOUNTS_PASS` |
| PROD | `postponed_by_user` |
| Decyzja | `accepted` |

**Tagi:** `v32`, `performance`, `chrome`, `loading`, `dev-preprod`.

Status kodu nie jest potwierdzeniem aktywacji usług, wykonania operacji chmurowej ani ręcznego testu.

## Zakres i odbiór

- Na starcie pobierane są tylko bieżące warianty20rodzin i wymagane warstwy; grafiki przyszłych poziomów nie blokują startu.
- Każdy z200wyodrębnionych kadrów jest pikselowo identyczny RGBA z zatwierdzonym atlasem; pozycje, skala, miniatury, zablokowane budynki, Teatr i statek zachowują zachowanie.
- Liczba równoległych dekodowań jest ograniczona; nie są pobierane zbędne stare grafiki ani drugiURL tego samego bazowegoPNG.
- Brak wymaganej aktualnej grafiki blokuje pokazanie częściowej wyspy i zachowuje dostępne ponowienie; awaria nieużywanej grafiki przyszłego poziomu nie blokuje gry.
- Koszt animacji morza maleje dzięki maskomcache bez wyłączania fal, zmniejszaniaFPS, nakładania wody na ląd lub zmiany zegara gry.
- Porównanie przed/po obejmuje transfer, procesChrome i główny wątek na desktopie oraz mobile2x w izolowanym przebiegu z prawdziwymi grafikami; wyniki nie są gwarancją dla każdego sprzętu.
- Własny dokładnySHA,CI,Pages i rzeczywisty standardowy odbiórPRE-PROD poprzedzają oznaczenie wydania; konta i postęp zachowane.

## Źródło

Gra ładuje się wolno i czasami zawiesza Chrome; sprawdź przyczynę i popraw.

Odniesienie: `chat:2026-11-19:slow-start-chrome-freeze; docs/v32/GO-CHROME-PERFORMANCE.md`.

Data pierwotnej wiadomości: 2026-11-19. Europe/Warsaw

## Dowody

- **Dokumenty:** [docs/v32/GO-CHROME-PERFORMANCE.md](../../v32/GO-CHROME-PERFORMANCE.md), [docs/v32/CHROME-PERFORMANCE-EVIDENCE.json](../../v32/CHROME-PERFORMANCE-EVIDENCE.json), [docs/v32/CHROME-PERFORMANCE-LOCAL-ACCEPTANCE.json](../../v32/CHROME-PERFORMANCE-LOCAL-ACCEPTANCE.json), [docs/v32/ADMIN3-OFFLINE-CATCHUP-LOCAL-ACCEPTANCE.json](../../v32/ADMIN3-OFFLINE-CATCHUP-LOCAL-ACCEPTANCE.json)
- **Kod:** [harborlight-v1-building-stages.js](../../../harborlight-v1-building-stages.js), [harborlight-v1-water.js](../../../harborlight-v1-water.js), [harborlight-v1-ambient.js](../../../harborlight-v1-ambient.js), [harborlight-v1-play.js](../../../harborlight-v1-play.js), [harborlight-v1-map-art.js](../../../harborlight-v1-map-art.js), [scripts/build_building_sprites.py](../../../scripts/build_building_sprites.py)
- **Scenariusze automatyczne:** [tests/harborlight-building-stages.test.mjs](../../../tests/harborlight-building-stages.test.mjs), [tests/harborlight-water.test.mjs](../../../tests/harborlight-water.test.mjs), [tests/harborlight-performance-v32-smoke.py](../../../tests/harborlight-performance-v32-smoke.py)
- **Kod dowodowy:** `d5ad35cf530b9df62bc4e50d9e1d6e2c308fb63d`.
- **CI tego wydania:** https://github.com/ksobczak321-oss/gra/actions/runs/44569674535.
- **Promocja kodu:** https://github.com/ksobczak321-oss/gra/actions/runs/44577083312/attempts/1.
- **Ręczne wykonanie przypadku:** `NOT_RUN_CURRENT_C6`.

C6/0.15.2.4/cache21, kod e394ea8, publikacja d5ad35c: własne CI44569674535 SUCCESS (1784Node/173Python/73Chromium), Pages44569674475 SUCCESS i PRE-PROD44577083312/1 SUCCESS. Dwa oryginalne ZIP, cztery kontrole receipt, pięć pinów TAR i wszystkie460 plików normalnym TLS PASS. Admin1 start4,696s; rzeczywisty admin3 start280,121s, Worker2762heartbeatów/max498,2ms, gotowy ekran10s:91heartbeatów/max541,2ms. Pełne47,885h C6 zgodne z kompletnymi C4/C5; B94 ma nieukończony limit CPU, bez twierdzenia o pełnej zgodności. Trzy istniejące profile i zegary zachowane. Ręczne przypadki NOT RUN; bez resetu/PROD/DNS. Historyczne nieprzyjęte B94-warm/C4-CI/C5-steady pozostają w dowodach.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-1164](HL-CHG-1164.md), [HL-CHG-1165](HL-CHG-1165.md), [HL-CHG-1167](HL-CHG-1167.md)

## Uwagi

- Stare20atlasów pozostają w pakiecie dla wcześniejszych klientów i odniesień; dodatkowe200małych plików zwiększa całe archiwum, lecz zmniejsza transfer i pamięć bieżącej gry.
- Historyczny pakiet cache18:455elementów; aktualny C6:460plików/96 565 038bajtów, ten sam limit512wpisów/128MiB. To nie są zasoby pobierane wszystkie przy starcie.
- Bieżące przyjęcie dotyczy C6/0.15.2.4/cache21 i osobno udokumentowanego PRE-PROD44577083312/1; wcześniejsze próby zachowują swoje pierwotne wyniki. Ręczny odbiór użytkownika NOT_RUN.

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
