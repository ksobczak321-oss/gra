# HL-CHG-1169 — Usuń zawieszanie startu admin3 po długiej nieobecności

**Typ:** Bug · **Obszar:** Nadrabianie nieobecności · **Epik:** `HL-EPIC-UI`

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

**Tagi:** `v32`, `performance`, `dev-preprod`, `no-reset`.

Status kodu nie jest potwierdzeniem aktywacji usług, wykonania operacji chmurowej ani ręcznego testu.

## Zakres i odbiór

- Admin3 kończy nadrabianie całej rzeczywistej nieobecności bez resetu, zmiany zegara, zasobów lub pomijania czasu.
- Wynik pełnego jednorazowego przeliczenia pozostaje identyczny z dotychczasowym modelem; cache pochodnych nie przekracza naturalnej granicy zmiany stanu.
- Długie przeliczenie pozostawia responsywny ekran; wynik jest przyjmowany atomowo tylko dla niezmienionej sesji, wersji zapisu i świata.
- Wylogowanie, zmiana sesji, opuszczenie strony, błąd Workera lub nowszy restore nie mogą zapisać częściowego lub spóźnionego wyniku.
- DEV i standardowy PRE-PROD wymagają własnego zielonego CI oraz sprawdzenia rzeczywistego istniejącego zapisu; żadnego resetu kont.

## Źródło

Admin3 na PRE-PROD zawiesza się, pozostałe konta działają. Odczyt, zegar 1× i zapis są poprawne; rzeczywista kopia ze 97 mieszkańcami blokuje główny wątek przy nadrabianiu prawie 48 godzin.

Odniesienie: `chat:2026-11-19:1169; docs/v32/GO-CHROME-PERFORMANCE.md`.

Data pierwotnej wiadomości: 2026-11-19. Europe/Warsaw

## Dowody

- **Dokumenty:** [docs/v32/GO-CHROME-PERFORMANCE.md](../../v32/GO-CHROME-PERFORMANCE.md), [docs/v32/CHROME-PERFORMANCE-EVIDENCE.json](../../v32/CHROME-PERFORMANCE-EVIDENCE.json), [docs/v32/ADMIN3-OFFLINE-CATCHUP-LOCAL-ACCEPTANCE.json](../../v32/ADMIN3-OFFLINE-CATCHUP-LOCAL-ACCEPTANCE.json)
- **Kod:** [harborlight-v1-state.js](../../../harborlight-v1-state.js), [harborlight-v1-provisions.js](../../../harborlight-v1-provisions.js), [harborlight-v1-development-logistics.js](../../../harborlight-v1-development-logistics.js), [harborlight-v1-residents.js](../../../harborlight-v1-residents.js), [harborlight-v1-archipelago.js](../../../harborlight-v1-archipelago.js), [harborlight-v1-play.js](../../../harborlight-v1-play.js), [harborlight-v1-logistics.js](../../../harborlight-v1-logistics.js), [harborlight-v1-startup-replay.js](../../../harborlight-v1-startup-replay.js), [harborlight-v1-startup-replay-model.js](../../../harborlight-v1-startup-replay-model.js), [harborlight-v1-startup-replay-worker.js](../../../harborlight-v1-startup-replay-worker.js), [.github/workflows/google-cloud-dev.yml](../../../.github/workflows/google-cloud-dev.yml)
- **Scenariusze automatyczne:** [tests/harborlight-simulation-transfer.test.mjs](../../../tests/harborlight-simulation-transfer.test.mjs), [tests/harborlight-resident-read-scopes.test.mjs](../../../tests/harborlight-resident-read-scopes.test.mjs), [tests/harborlight-startup-replay.test.mjs](../../../tests/harborlight-startup-replay.test.mjs), [tests/harborlight-startup-replay-v32-smoke.py](../../../tests/harborlight-startup-replay-v32-smoke.py), [tests/harborlight-hosted-v18-smoke.py](../../../tests/harborlight-hosted-v18-smoke.py), [tests/harborlight-runtime-config.test.py](../../../tests/harborlight-runtime-config.test.py)
- **Kod dowodowy:** `d5ad35cf530b9df62bc4e50d9e1d6e2c308fb63d`.
- **CI tego wydania:** https://github.com/ksobczak321-oss/gra/actions/runs/44569674535.
- **Promocja kodu:** https://github.com/ksobczak321-oss/gra/actions/runs/44577083312/attempts/1.
- **Ręczne wykonanie przypadku:** `NOT_RUN_CURRENT_C6`.

C6/0.15.2.4/cache21, kod e394ea8, publikacja d5ad35c: własne CI44569674535 SUCCESS (1784Node/173Python/73Chromium), Pages44569674475 SUCCESS i PRE-PROD44577083312/1 SUCCESS. Dwa oryginalne ZIP, cztery kontrole receipt, pięć pinów TAR i wszystkie460 plików normalnym TLS PASS. Admin1 start4,696s; rzeczywisty admin3 start280,121s, Worker2762heartbeatów/max498,2ms, gotowy ekran10s:91heartbeatów/max541,2ms. Pełne47,885h C6 zgodne z kompletnymi C4/C5; B94 ma nieukończony limit CPU, bez twierdzenia o pełnej zgodności. Trzy istniejące profile i zegary zachowane. Ręczne przypadki NOT RUN; bez resetu/PROD/DNS. Historyczne nieprzyjęte B94-warm/C4-CI/C5-steady pozostają w dowodach.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-1166](HL-CHG-1166.md), [HL-CHG-1167](HL-CHG-1167.md)

## Uwagi

- B94: workflow CI i PRE-PROD SUCCESS pozostają w historii; późniejszy raport użytkownika ponownie otworzył odbiór jakości.
- Prywatne kopie zapisów służą wyłącznie lokalnemu odczytowemu testowi i nie trafiają do Git.
- Wcześniejszy test zalogowanej wyspy obejmował ekran admin1. Nowy wymagany test obejmuje osobno wyłącznie istniejące admin3, bez fallbacku i bez zapisów, z kontrolą responsywności podczas Worker.
- Wynik Workera jest przypięty do UID, generacji, rewizji/CAS, epoki adopcji, wyspy oraz generacji/rewizji/tempa zegara.
- Bieżące przyjęcie dotyczy C6/0.15.2.4/cache21 i osobno udokumentowanego PRE-PROD44577083312/1; wcześniejsze próby zachowują swoje pierwotne wyniki. Ręczny odbiór użytkownika NOT_RUN.

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
