# HL-CHG-0932 — Oba zadania ligi mają wspólne okno 19:00–21:00 Warszawy

**Typ:** Story · **Obszar:** Liga i harmonogram · **Epik:** `HL-EPIC-SOC`

Ta karta jest wersjonowanym wpisem w Git. **Nie została opublikowana jako natywne GitHub Issue** (`issue_url: null`).

## Status

| Warstwa | Stan |
|---|---|
| Implementacja | `implemented` |
| DEV | `local_full_suite_and_packaged_browsers_pass` |
| CI | `not_run_for_change` |
| PRE-PROD | `not_deployed` |
| PROD | `not_deployed` |
| Decyzja | `accepted` |

Status kodu nie jest potwierdzeniem aktywacji usług, wykonania operacji chmurowej ani ręcznego testu.

## Zakres i odbiór

- W dniach 15–21 oba zadania, logiczne i zręcznościowe, są dostępne w jednym oknie 19:00–21:00 Europe/Warsaw; gracz wybiera kolejność.
- Oba rodzaje działają o19:00 i 20:00. Przed 19:00 i od 21:00 nowe punktujące akcje/próby są zamknięte; strefaWarszawy respektuje czas letni i zimowy.
- Pozostają dwie próby każdego rodzaju, średnia dwóch wyników dnia i0 za niezagrane. Rozliczenie już przyjętych akcji nie dodaje czasu na grę.
- Interfejs, API, opisy i testy wskazują to samo okno. Wcześniejszy podział19–20/20–21 oraz jego wynikiCI są zachowaną historią.
- Dokumenty prawne i potwierdzenia mają zgodną wersję2026-10-31-draft4; draft2/draft3 nie omijają bieżącej akceptacji nowego świata, a stare dowody pozostają.
- Zakres pozostaje wyłącznie DEV, bez promocji GCP, resetu kont lub integracji planszówki online.

## Źródło

Użytkownik wybrał wspólne 19:00–21:00 dla zadania logicznego i zręcznościowego oraz potwierdził pozostałe grupy parametrów wysp.

Odniesienie: `chat:potwierdzenie-parametrow-i-wspolne-okno-ligi-po-DEV0.10.0.0`.

Data pierwotnej wiadomości: 2026-10-31. Późniejsza odpowiedź użytkownika po odbiorze wcześniejszego wariantuDEV; nie zastępujemy nią historii jegoCI.

## Dowody

- **Dokumenty:** [docs/FRONTEND-V24-REQUIREMENTS.md](../../FRONTEND-V24-REQUIREMENTS.md), [docs/design/LEAGUE-COMMUNITY-CHARITY.md](../../design/LEAGUE-COMMUNITY-CHARITY.md), [docs/TERMS-DRAFT.pl.md](../../TERMS-DRAFT.pl.md), [docs/PRIVACY-DRAFT.pl.md](../../PRIVACY-DRAFT.pl.md), [docs/testing/manual/HL-TC-0049.md](../../testing/manual/HL-TC-0049.md)
- **Kod:** [backend/league-rules.mjs](../../../backend/league-rules.mjs), [backend/community-service.mjs](../../../backend/community-service.mjs), [harborlight-v1-community-ui.js](../../../harborlight-v1-community-ui.js), [harborlight-legal.js](../../../harborlight-legal.js), [backend/account-service.mjs](../../../backend/account-service.mjs), [scripts/build_legal_pages.py](../../../scripts/build_legal_pages.py)
- **Scenariusze automatyczne:** [backend/test/community-service.test.mjs](../../../backend/test/community-service.test.mjs), [tests/harborlight-community-v24-smoke.py](../../../tests/harborlight-community-v24-smoke.py), [tests/harborlight-legal.test.mjs](../../../tests/harborlight-legal.test.mjs), [backend/test/legal-acceptance.test.mjs](../../../backend/test/legal-acceptance.test.mjs), [tests/harborlight-v18-auth-smoke.py](../../../tests/harborlight-v18-auth-smoke.py)
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

Powiązane przypadki do ręcznego przeklikania:

- [HL-TC-0019 — Rejestracja wymaga odrębnych potwierdzeń dokumentów](../../testing/manual/HL-TC-0019.md) — `NOT RUN`.
- [HL-TC-0038 — Liga miesięczna: granice sezonu, drużyny i punktacja](../../testing/manual/HL-TC-0038.md) — `NOT RUN`.
- [HL-TC-0049 — Liga: dwa zadania dziennie wyłącznie w ogłoszonych slotach Warszawy](../../testing/manual/HL-TC-0049.md) — `NOT RUN`.

Oba rodzaje zadania ligi działają w tym samym oknie 19:00–21:00 Europe/Warsaw; gracz wybiera kolejność. Testy sprawdzają oba rodzaje o 19:00/20:00, odmowę poza oknem, czas letni/zimowy i granicę zamknięcia. Zachowano po dwie próby, średnią obu wyników i 0 za brak zadania. Dokumenty draft4, klient i serwer są zgodne; stare potwierdzenia draft2/draft3 nie omijają aktualnej wersji dla nowego świata, a ich historia pozostaje.

Końcowy odbiór lokalny po zamrożeniu: 897 testów Node PASS / 0 FAIL, 141 testów Python w 11 zestawach PASS, 18 zestawów Chromium PASS. W tym rzeczywisty przegląd 112 widoków zakończony bez wykrytej reszty EN i bez błędu wykonania. Własne CI i Pages nowego commitu oczekują na potwierdzenie; nie dziedziczą wyniku wcześniejszego SHA. Ręczne scenariusze pozostają NOT_RUN. Brak promocji GCP, resetu kont i integracji planszówki online.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-0715](HL-CHG-0715.md), [HL-CHG-0817](HL-CHG-0817.md), [HL-CHG-0819](HL-CHG-0819.md), [HL-CHG-0825](HL-CHG-0825.md), [HL-CHG-0901](HL-CHG-0901.md), [HL-CHG-0914](HL-CHG-0914.md), [HL-CHG-0918](HL-CHG-0918.md), [HL-CHG-0926](HL-CHG-0926.md), [HL-CHG-0927](HL-CHG-0927.md)

## Uwagi

- Wcześniejsze karty zachowują dowody źródła351baaf6b21386b2f2641875269e6f7d9c2d44fd. To potwierdzenie poprzedniego wariantu, nie nowego wspólnego okna.

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
