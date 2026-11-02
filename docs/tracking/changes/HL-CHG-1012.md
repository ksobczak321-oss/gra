# HL-CHG-1012 — Migracja v28 zachowuje konta, stare kursy, aktywne projekty i jednokrotne nagrody

**Typ:** Story · **Obszar:** Zapis i zgodność · **Epik:** `HL-EPIC-ACC`

Ta karta jest wersjonowanym wpisem w Git. **Nie została opublikowana jako natywne GitHub Issue** (`issue_url: null`).

## Status

| Warstwa | Stan |
|---|---|
| Implementacja | `implemented` |
| DEV | `validated_pages_published` |
| CI | `passed_source_d9e2940` |
| PRE-PROD | `deployed_source_d9e2940` |
| PROD | `not_deployed` |
| Decyzja | `accepted` |

**Tagi:** `v28`, `dev-only`.

Status kodu nie jest potwierdzeniem aktywacji usług, wykonania operacji chmurowej ani ręcznego testu.

## Zakres i odbiór

- Normalizacja nowych pól banku, modlitwy, premii produkcji i narracji zachowuje tożsamości, starsze programy oraz aktywne etapy.
- Nie resetujemyadmin1–admin3, ich haseł, danych ani historii. Zapis i ponowienie operacji nie tworzą dodatkowej wypłaty.
- Nowe metadane pozostają zgodne z limitem zapisu 700 k B na świat i istniejącym formatem archipelagu.

## Źródło

Zbiorcze GO po redakcji samouczka, opisów i logiki gry, z późniejszym doprecyzowaniem zwykłego szczęścia, modlitwy i minimum darowizny. Zakres tej karty jest opisany w kryteriach odbioru.

Odniesienie: `chat:GO:dev-v28:HL-CHG-1012`.

Data pierwotnej wiadomości: 2026-11-02. Data zbiorczego GO i doprecyzowań, Europe/Warsaw; wcześniejsze decyzje zachowują własną historię.

## Dowody

- **Dokumenty:** [docs/FRONTEND-V28-REQUIREMENTS.md](../../FRONTEND-V28-REQUIREMENTS.md), [docs/DEV-0.12.0.0-VALIDATION.md](../../DEV-0.12.0.0-VALIDATION.md), [docs/ENVIRONMENT-STATUS.md](../../ENVIRONMENT-STATUS.md), [docs/ECONOMY-RULES.md](../../ECONOMY-RULES.md), [docs/BUILDINGS.md](../../BUILDINGS.md)
- **Kod:** [harborlight-v1-state.js](../../../harborlight-v1-state.js), [harborlight-v1-archipelago.js](../../../harborlight-v1-archipelago.js), [harborlight-v1-missions.js](../../../harborlight-v1-missions.js), [harborlight-dev-cloud.js](../../../harborlight-dev-cloud.js)
- **Scenariusze automatyczne:** [tests/harborlight-tutorial-v28.test.mjs](../../../tests/harborlight-tutorial-v28.test.mjs), [tests/harborlight-missions-v28.test.mjs](../../../tests/harborlight-missions-v28.test.mjs), [tests/harborlight-prayer-v28.test.mjs](../../../tests/harborlight-prayer-v28.test.mjs)
- **Kod dowodowy:** `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`.
- **CI tego wydania:** https://github.com/ksobczak321-oss/gra/actions/runs/41480146644.
- **Promocja kodu:** https://github.com/ksobczak321-oss/gra/actions/runs/41482455135.
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

Powiązane przypadki do ręcznego przeklikania:

- [HL-TC-0071 — Nowy kurs wymaga trzech tragarzy, starszy zachowuje szóstkę i swoje zaliczenia](../../testing/manual/HL-TC-0071.md) — `NOT RUN`.
- [HL-TC-0079 — Bank Domu kumuluje siedem porcji według zakwaterowanych i nie odtwarza ich przy wczytaniu](../../testing/manual/HL-TC-0079.md) — `NOT RUN`.
- [HL-TC-0081 — Modlitwa zachowuje czas całkowity, koszt, brak podatku i sześciogodzinny efekt](../../testing/manual/HL-TC-0081.md) — `NOT RUN`.
- [HL-TC-0083 — Statek zwiększa towar za pięćdziesiąt monet, a przemianowanie córki nie dubluje nazwy](../../testing/manual/HL-TC-0083.md) — `NOT RUN`.
- [HL-TC-0086 — Narracyjne nagrody pokazują faktycznie przyjętych ludzi i czas produkcji razy cztery](../../testing/manual/HL-TC-0086.md) — `NOT RUN`.
- [HL-TC-0092 — Zakup statku po utracie odpowiedzi nie zmienia płatnika i nie obciąża drugi raz](../../testing/manual/HL-TC-0092.md) — `NOT RUN`.
- [HL-TC-0094 — Nowa rejestracja zapisuje Regulamin draft5 i niezmienioną Politykę prywatności draft4](../../testing/manual/HL-TC-0094.md) — `NOT RUN`.

Odebrany DEV 0.12.0.0: źródło `0ca7715b6e9282b31ca7941c89c3c742ac0df9e6`, cache frontend-v28-2, push main potwierdzony. [Własne CI 41475214118](https://github.com/ksobczak321-oss/gra/actions/runs/41475214118) **SUCCESS, 12 min 33 s**, obie grupy Chromium tego SHA SUCCESS; [Pages 41475213874](https://github.com/ksobczak321-oss/gra/actions/runs/41475213874) **SUCCESS, 31 s**.1128 Node/141 Python/32 Chromium PASS, kierunkowe 132 próby przewijania PLEN/release UI4/forecast 7 +144 PASS. Browser QA 96 PASS, ręczne 96 NOT RUN. Pakiet 62 pliki/11 332 589 bajtów, verify/extract PASS, hashe w walidacji 0.12. Tag [`dev-0.12.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/dev-0.12.0.0-20261102) **opublikowany i potwierdzony zdalnie**, wskazuje dokładnie źródło `0ca7715b6e9282b31ca7941c89c3c742ac0df9e6`. Pierwszy0d17/CI 41471972606 zachowuje FAILURE, 9 min 48 s; nie CANCELLED. Niezależne porównanie bajtów Pages niepotwierdzone, wcześniejszy proxy 403. PRE-PROD 0.11/c7c3974 bez nowej promocji/resetu; PROD bez zmian. Nowa jawnie zlecona promocja PRE-PROD0.12 zakończyła się dla `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`: własneCI41480146644SUCCESS13min46s, Pages41480146737SUCCESS41s, rzeczywistybridge41482423516SUCCESS21s i deploy41482455135/próba1SUCCESS2min20s. Kontrole Hostingu, zalogowanej gry i trzech kont/izolacji przeszły; oba artefakty opublikowano. Bez resetu historii i PROD.52bieżące karty aplikacji otrzymują deployed_source_d9e2940; dane poprzednich akapitów pozostają historią wcześniejszych etapów. Ręczne wyniki nadalNOT RUN. Granice odczytuZIP i tagu są w docs/PREPROD-V28-PROMOTION.md. Tag `preprod-0.12.0.0-20261102` jest opublikowany i potwierdzony zdalnie: `d66b25ba216e5b686e6a92b9b8558d35eda9fd2d`→`d9e2940b9a00755d979c159ec0fb62e290dd7ff1`; nie przesuwamy go na późniejsze metadane.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** Brak.

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
