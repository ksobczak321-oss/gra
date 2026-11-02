# HL-CHG-1019 — Regulamin draft5 odpowiada usługom monetowym, lidze i Pomagam; prywatność pozostaje draft4

**Typ:** Bug · **Obszar:** Wersjonowane dokumenty rejestracji · **Epik:** `HL-EPIC-ACC`

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

- Regulamin 2026-11-02-draft 5 opisuje statek 50 monet, usługi TH1/doładowanie TH3, limit Ratusza bez warunku łóżek dla pasażerów, nowe nagrody ligi i właściwe źródła/minimum Pomagam.
- Frontend i backend wymagają tej samej wersji Regulaminu; niezmieniona Polityka prywatności zachowuje 2026-10-31-draft 4. Generator obsługuje osobne wersje.
- Stare potwierdzenia pozostają audytem, istniejące światy i konta PRE-PROD nie są resetowane lub zmuszane do ponownej rejestracji. Dokument nadal jest szkicem Lorem ipsum, bez realnych płatności.

## Źródło

Niezgodność wykryta w rzeczywistych testach zbiorczego GOv28 i poprawiona w lokalnym kodzie przed odbiorem końcowym. Kryteria opisują końcowe zachowanie, nie dodatkową aktywację usług.

Odniesienie: `chat:GO:dev-v28:validation-regression:HL-CHG-1019`.

Data pierwotnej wiadomości: 2026-11-02. Data zbiorczego GO i doprecyzowań, Europe/Warsaw; wcześniejsze decyzje zachowują własną historię.

## Dowody

- **Dokumenty:** [docs/FRONTEND-V28-REQUIREMENTS.md](../../FRONTEND-V28-REQUIREMENTS.md), [docs/DEV-0.12.0.0-VALIDATION.md](../../DEV-0.12.0.0-VALIDATION.md), [docs/ENVIRONMENT-STATUS.md](../../ENVIRONMENT-STATUS.md), [docs/ECONOMY-RULES.md](../../ECONOMY-RULES.md), [docs/BUILDINGS.md](../../BUILDINGS.md), [docs/TERMS-DRAFT.pl.md](../../TERMS-DRAFT.pl.md), [docs/PRIVACY-DRAFT.pl.md](../../PRIVACY-DRAFT.pl.md)
- **Kod:** [harborlight-legal.js](../../../harborlight-legal.js), [harborlight-auth.js](../../../harborlight-auth.js), [harborlight-auth-providers.js](../../../harborlight-auth-providers.js), [backend/account-service.mjs](../../../backend/account-service.mjs), [scripts/build_legal_pages.py](../../../scripts/build_legal_pages.py), [harborlight-terms.html](../../../harborlight-terms.html)
- **Scenariusze automatyczne:** [tests/harborlight-legal.test.mjs](../../../tests/harborlight-legal.test.mjs), [backend/test/legal-acceptance.test.mjs](../../../backend/test/legal-acceptance.test.mjs), [tests/harborlight-v18-auth-smoke.py](../../../tests/harborlight-v18-auth-smoke.py)
- **Kod dowodowy:** `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`.
- **CI tego wydania:** https://github.com/ksobczak321-oss/gra/actions/runs/41480146644.
- **Promocja kodu:** https://github.com/ksobczak321-oss/gra/actions/runs/41482455135.
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

Powiązane przypadki do ręcznego przeklikania:

- [HL-TC-0094 — Nowa rejestracja zapisuje Regulamin draft5 i niezmienioną Politykę prywatności draft4](../../testing/manual/HL-TC-0094.md) — `NOT RUN`.

Odebrany DEV 0.12.0.0: źródło `0ca7715b6e9282b31ca7941c89c3c742ac0df9e6`, cache frontend-v28-2, push main potwierdzony. [Własne CI 41475214118](https://github.com/ksobczak321-oss/gra/actions/runs/41475214118) **SUCCESS, 12 min 33 s**, obie grupy Chromium tego SHA SUCCESS; [Pages 41475213874](https://github.com/ksobczak321-oss/gra/actions/runs/41475213874) **SUCCESS, 31 s**.1128 Node/141 Python/32 Chromium PASS, kierunkowe 132 próby przewijania PLEN/release UI4/forecast 7 +144 PASS. Browser QA 96 PASS, ręczne 96 NOT RUN. Pakiet 62 pliki/11 332 589 bajtów, verify/extract PASS, hashe w walidacji 0.12. Tag [`dev-0.12.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/dev-0.12.0.0-20261102) **opublikowany i potwierdzony zdalnie**, wskazuje dokładnie źródło `0ca7715b6e9282b31ca7941c89c3c742ac0df9e6`. Pierwszy0d17/CI 41471972606 zachowuje FAILURE, 9 min 48 s; nie CANCELLED. Niezależne porównanie bajtów Pages niepotwierdzone, wcześniejszy proxy 403. PRE-PROD 0.11/c7c3974 bez nowej promocji/resetu; PROD bez zmian. Nowa jawnie zlecona promocja PRE-PROD0.12 zakończyła się dla `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`: własneCI41480146644SUCCESS13min46s, Pages41480146737SUCCESS41s, rzeczywistybridge41482423516SUCCESS21s i deploy41482455135/próba1SUCCESS2min20s. Kontrole Hostingu, zalogowanej gry i trzech kont/izolacji przeszły; oba artefakty opublikowano. Bez resetu historii i PROD.52bieżące karty aplikacji otrzymują deployed_source_d9e2940; dane poprzednich akapitów pozostają historią wcześniejszych etapów. Ręczne wyniki nadalNOT RUN. Granice odczytuZIP i tagu są w docs/PREPROD-V28-PROMOTION.md. Tag `preprod-0.12.0.0-20261102` jest opublikowany i potwierdzony zdalnie: `d66b25ba216e5b686e6a92b9b8558d35eda9fd2d`→`d9e2940b9a00755d979c159ec0fb62e290dd7ff1`; nie przesuwamy go na późniejsze metadane.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-0972](HL-CHG-0972.md), [HL-CHG-1004](HL-CHG-1004.md), [HL-CHG-1010](HL-CHG-1010.md), [HL-CHG-1015](HL-CHG-1015.md)

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
