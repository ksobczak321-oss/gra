# HL-CHG-0964 — Niepowodzenia otwierają pięć pomocniczych i trzy ratunkowe z prawidłowym powrotem

**Typ:** Story · **Obszar:** Pomoc i ratunek · **Epik:** `HL-EPIC-TUT`

Ta karta jest wersjonowanym wpisem w Git. **Nie została opublikowana jako natywne GitHub Issue** (`issue_url: null`).

## Status

| Warstwa | Stan |
|---|---|
| Implementacja | `implemented` |
| DEV | `verified_own_ci_and_pages` |
| CI | `awaiting_checker_fix_ci` |
| PRE-PROD | `awaiting_checker_fix_candidate` |
| PROD | `not_deployed` |
| Decyzja | `accepted` |

Status kodu nie jest potwierdzeniem aktywacji usług, wykonania operacji chmurowej ani ręcznego testu.

## Zakres i odbiór

- Nieudane4/8 →5 pomocniczych →5/8; nieudane2/5 pomocniczych →3 ratunkowe →3/5 pomocniczych. Wcześniejsze zaliczenia zostają.
- Ostatni etap pomocy/ratunku naprawdę realizuje naprawiany cel. Zakończenie 8/8 lub5/5 kończy właściwy zakres zamiast tworzyć 9/8 lub6/5.
- Parametry wykonawcze: termin aktywnego zadania, ponowienie nieudanego ratunkowego i jednokrotne nagrody. Narracja wsparcia nie udaje wykonanej budowy ani ogólnej odporności na plagi.

## Źródło

GO użytkownika „tu masz z drobnymi poprawkami; GO” zatwierdza pakiet opisów i wcześniej zebrane zmiany. Nowa wklejka zawiera także regułę mieszkań i rzeczywistego przykładu zasobów.

Odniesienie: `chat:DEV-v27-964`.

Data pierwotnej wiadomości: 2026-11-01. Data klienta Europe/Warsaw. Zlecenie po wydaniu0.10.2.0; nie zmienia dat historycznych wpisów.

## Dowody

- **Dokumenty:** [docs/FRONTEND-V27-REQUIREMENTS.md](../../FRONTEND-V27-REQUIREMENTS.md), [docs/approval/v27-approval-record.md](../../approval/v27-approval-record.md), [docs/DEV-0.11.0.0-VALIDATION.md](../../DEV-0.11.0.0-VALIDATION.md), [docs/PREPROD-V27-PREPARATION.md](../../PREPROD-V27-PREPARATION.md), [docs/PREPROD-V27-INCIDENT-20261102.md](../../PREPROD-V27-INCIDENT-20261102.md)
- **Kod:** [harborlight-v1-activities.js](../../../harborlight-v1-activities.js), [harborlight-v1-state.js](../../../harborlight-v1-state.js), [harborlight-v1-missions.js](../../../harborlight-v1-missions.js), [harborlight-v1-missions-ui.js](../../../harborlight-v1-missions-ui.js)
- **Scenariusze automatyczne:** [tests/harborlight-missions-v27.test.mjs](../../../tests/harborlight-missions-v27.test.mjs), [tests/harborlight-missions-game-v27-smoke.py](../../../tests/harborlight-missions-game-v27-smoke.py)
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

Powiązane przypadki do ręcznego przeklikania:

- [HL-TC-0068 — Pomoc i ratunek wracają do kolejnego etapu bez kasowania postępu](../../testing/manual/HL-TC-0068.md) — `NOT RUN`.
- [HL-TC-0070 — Migracja, nieobecność i powroty nie dublują mieszkań ani misji](../../testing/manual/HL-TC-0070.md) — `NOT RUN`.

DEV 0.11.0.0/v27: bazowe źródło `6ff5ae976e31add7fb93e3872e0d9046a25edd37`, lokalnie1017 Node,141 Python i27 nazwanych zestawów Chromium PASS; bazowe CI41359303259 CANCELLED, Pages41359303232 SUCCESS30s. Późniejsze polecenie „promuj na pre prod” autoryzuje kandydata [`7d45290b911e359a8940f28551df4692053cadb2`](https://github.com/ksobczak321-oss/gra/commit/7d45290b911e359a8940f28551df4692053cadb2) z markerem [preprod:0.11.0.0], bez resetu. Własne [CI 41360046508](https://github.com/ksobczak321-oss/gra/actions/runs/41360046508): SUCCESS, 10 min31 s; [Pages 41360046453](https://github.com/ksobczak321-oss/gra/actions/runs/41360046453): SUCCESS47s. Automatyczny [bridge 41360957057](https://github.com/ksobczak321-oss/gra/actions/runs/41360957057): SUCCESS,18s. [deploy PRE-PROD 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479): FAILURE w kroku24 po publikacji Hostingu; pełne źródło `7d45290b911e359a8940f28551df4692053cadb2` i wcześniejszy gate SUCCESS potwierdzone. Receipt i tagów brak. Publiczne59 plików i wszystkie60 treści zgodne z testowanym final2; pakiet61/60/11 219 303bajty i hashe w [przygotowaniu](../../PREPROD-V27-PREPARATION.md). Focused dispatcher/promocja28/28 PASS nie zastępuje pełnego CI. PRE-PROD pozostaje ostatnio odebrane0.10.1.0/353faad do potwierdzenia wdrożenia;70 ręcznych NOT RUN, PROD bez zmian. Odbiór operacyjny CI/Pages: 2 listopada2026 Europe/Warsaw; akceptacja i bazowy lokalny DEV z1 listopada zachowują wcześniejszą datę. Promocja [deploy PRE-PROD 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479) zakończyła się FAILURE w kroku24 kontroli stałych kont po publikacji Hostingu; dokładny manifest i hostowany Chromium przeszły, więc nowy frontend może być już serwowany. Artefakty/receipt pominięte, tagów/resetu brak. Ostatni pełny odbiór pozostaje0.10.1.0. Szczegóły i przygotowanie ścisłej poprawki schematu1/2: [incydent](../../PREPROD-V27-INCIDENT-20261102.md). Po awarii kont przygotowano odrębny kandydat z kontrolerem obsługującym legalne koperty1/2;26 testów kontrolera i1023 pełnej regresji PASS lokalnie. Publiczna aplikacja niezmieniona. Nowy SHA wymaga własnego CI i deployu.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-0963](HL-CHG-0963.md)

## Uwagi

- W wymaganiach oddzielono dosłowną decyzję użytkownika od wybranego parametru integracyjnego; nie traktujemy wyboru implementacji jako dodatkowej odpowiedzi użytkownika.

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
