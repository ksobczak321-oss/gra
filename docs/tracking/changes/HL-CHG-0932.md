# HL-CHG-0932 — Oba zadania ligi mają wspólne okno 19:00–21:00 Warszawy

**Typ:** Story · **Obszar:** Liga i harmonogram · **Epik:** `HL-EPIC-SOC`

Ta karta jest wersjonowanym wpisem w Git. **Nie została opublikowana jako natywne GitHub Issue** (`issue_url: null`).

## Status

| Warstwa | Stan |
|---|---|
| Implementacja | `implemented` |
| DEV | `verified_own_ci_and_pages` |
| CI | `passed_source_353faad` |
| PRE-PROD | `deployed_source_353faad` |
| PROD | `not_deployed` |
| Decyzja | `accepted` |

Status kodu nie jest potwierdzeniem aktywacji usług, wykonania operacji chmurowej ani ręcznego testu.

## Zakres i odbiór

- W dniach 15–21 oba zadania, logiczne i zręcznościowe, są dostępne w jednym oknie 19:00–21:00 Europe/Warsaw; gracz wybiera kolejność.
- Oba rodzaje działają o 19:00 i 20:00. Przed 19:00 i od 21:00 nowe punktujące akcje/próby są zamknięte; strefa Warszawy respektuje czas letni i zimowy.
- Pozostają dwie próby każdego rodzaju, średnia dwóch wyników dnia i 0 za niezagrane. Rozliczenie już przyjętych akcji nie dodaje czasu na grę.
- Interfejs, API, opisy i testy wskazują to samo okno. Wcześniejszy podział 19–20/20–21 oraz jego wyniki CI są zachowaną historią.
- Dokumenty prawne i potwierdzenia mają zgodną wersję 2026-10-31-draft4; draft2/draft3 nie omijają bieżącej akceptacji nowego świata, a stare dowody pozostają.
- Początkowe GO obejmowało DEV; późniejsza odrębna dyspozycja dopuszcza PRE-PROD po testach i zielonym CI nowego źródła. Reset kont, PROD oraz integracja planszówki online nadal nie są wykonywane w tej promocji.

## Źródło

Użytkownik wybrał wspólne 19:00–21:00 dla zadania logicznego i zręcznościowego oraz potwierdził pozostałe grupy parametrów wysp.

Odniesienie: `chat:potwierdzenie-parametrow-i-wspolne-okno-ligi-po-DEV0.10.0.0`.

Data pierwotnej wiadomości: 2026-10-31. Późniejsza odpowiedź użytkownika po odbiorze wcześniejszego wariantu DEV; nie zastępujemy nią historii jego CI.

## Dowody

- **Dokumenty:** [docs/FRONTEND-V24-REQUIREMENTS.md](../../FRONTEND-V24-REQUIREMENTS.md), [docs/design/LEAGUE-COMMUNITY-CHARITY.md](../../design/LEAGUE-COMMUNITY-CHARITY.md), [docs/TERMS-DRAFT.pl.md](../../TERMS-DRAFT.pl.md), [docs/PRIVACY-DRAFT.pl.md](../../PRIVACY-DRAFT.pl.md), [docs/testing/manual/HL-TC-0049.md](../../testing/manual/HL-TC-0049.md)
- **Kod:** [backend/league-rules.mjs](../../../backend/league-rules.mjs), [backend/community-service.mjs](../../../backend/community-service.mjs), [harborlight-v1-community-ui.js](../../../harborlight-v1-community-ui.js), [harborlight-legal.js](../../../harborlight-legal.js), [backend/account-service.mjs](../../../backend/account-service.mjs), [scripts/build_legal_pages.py](../../../scripts/build_legal_pages.py)
- **Scenariusze automatyczne:** [backend/test/community-service.test.mjs](../../../backend/test/community-service.test.mjs), [tests/harborlight-community-v24-smoke.py](../../../tests/harborlight-community-v24-smoke.py), [tests/harborlight-legal.test.mjs](../../../tests/harborlight-legal.test.mjs), [backend/test/legal-acceptance.test.mjs](../../../backend/test/legal-acceptance.test.mjs), [tests/harborlight-v18-auth-smoke.py](../../../tests/harborlight-v18-auth-smoke.py)
- **Kod dowodowy:** `353faad347262dce7c3632fdf7c71be124384ab1`.
- **CI tego wydania:** https://github.com/ksobczak321-oss/gra/actions/runs/41246449612.
- **Promocja kodu:** https://github.com/ksobczak321-oss/gra/actions/runs/41246771480.
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

Powiązane przypadki do ręcznego przeklikania:

- [HL-TC-0019 — Rejestracja wymaga odrębnych potwierdzeń dokumentów](../../testing/manual/HL-TC-0019.md) — `NOT RUN`.
- [HL-TC-0038 — Liga miesięczna: granice sezonu, drużyny i punktacja](../../testing/manual/HL-TC-0038.md) — `NOT RUN`.
- [HL-TC-0049 — Liga: dwa zadania dziennie wyłącznie w ogłoszonych slotach Warszawy](../../testing/manual/HL-TC-0049.md) — `NOT RUN`.

Oba rodzaje zadania ligi działają w tym samym oknie 19:00–21:00 Europe/Warsaw; gracz wybiera kolejność. Testy sprawdzają oba rodzaje o 19:00/20:00, odmowę poza oknem, czas letni/zimowy i granicę zamknięcia. Zachowano po dwie próby, średnią obu wyników i 0 za brak zadania. Dokumenty draft4, klient i serwer są zgodne; stare potwierdzenia draft2/draft3 nie omijają aktualnej wersji dla nowego świata, a ich historia pozostaje.

Historyczny podgląd b1cd650da1c9d669ebce4a77bee81ebfd87ccbc9 miał lokalnie 897 Node, 141 Python i 18 zestawów Chromium PASS. Pages 41244467250 zakończyło się SUCCESS (41 s), natomiast własne CI 41244467302 zakończyło się FAIL: historyczna podpowiedź z trzema przyciskami miała niepoprawną geometrię. Te dowody nie potwierdzają późniejszej poprawki układu ani dalszej redakcji polskich opisów. Nowy lokalny odbiór po późniejszych poprawkach opisano poniżej; nowe źródło, CI i promocja oczekują na potwierdzenie. Nie wykonano resetu kont ani promocji PROD.

Późniejsze GO użytkownika upoważnia do PRE-PROD po zielonym CI dokładnego nowego SHA i odbiorze wdrożenia, z zachowaniem kont i historii. Samo upoważnienie nie jest dowodem publikacji.

Końcowy lokalny odbiór NOWEGO pakietu po dalszej przyjaznej redakcji i poprawce geometrii: 898 testów Node PASS / 0 FAIL, 141 testów Python w 11 zestawach PASS i 18 zestawów Chromium PASS. Ponowny odczyt 112 widoków (56 komputer + 56 telefon) ma 0 wykrytych angielskich elementów i execution_error:null. Historyczny kurs v18 przeszedł 4 warianty, w tym rzeczywistą geometrię 360×640 odpowiadającą usterce z CI. Cache frontend-v25-2; źródło końcowego commitu, własne CI i publikacja pozostają odrębnie pending. Stary FAIL b1cd650 ani starsze receipt nie są zastępowane tym lokalnym wynikiem. Ręczne przypadki nadal NOT RUN; kont nie resetowano.

Końcowe źródło aplikacji 353faad347262dce7c3632fdf7c71be124384ab1 zostało wysłane do main. Własne CI 41246449612 zakończyło się SUCCESS (3 min 54 s), a Pages 41246449682 — SUCCESS (31 s) dla tego samego źródła. DEV jest odebrany; promocja PRE-PROD nadal oczekuje na osobne potwierdzenie. Znacznik [preprod:0.10.1.0] zleca bridge po zielonym CI tego samego źródła. Ostateczny pakiet ma 54 pliki z manifestem, 10 991 135 bajtów; 53 pliki treści są zgodne ze sprawdzonym pakietem. SHA-256 archiwum: 6c738006d57e115b3293a88460e9432ccb1fafb51e1eb9c08fdb116914e4c744; manifestu: 0010c121de03c64e157596d014d80eb04970e7f5d03e81350374b9ce1a6abd0d. To dowód przygotowania i synchronizacji kodu, nie wykonania wdrożenia ani resetu.

Potwierdzono osobno sukces CI i Pages końcowego źródła 353faad347262dce7c3632fdf7c71be124384ab1. Ten odbiór DEV nie jest potwierdzeniem konfiguracji API, wdrożenia GCP, autosave na prawdziwym koncie ani resetu. Wyniki ręczne pozostają NOT RUN.

PRE-PROD potwierdzone: google-cloud-dev.yml 41246771480, próba 1, SUCCESS (2 min 05 s), źródło 353faad347262dce7c3632fdf7c71be124384ab1. Bridge 41246756848 zakończył się SUCCESS (15 s). Gra: https://harborlight-dev.web.app. DEV tag dev-0.10.1.0-20261031 jest opublikowany. To dowód wdrożenia kodu tego samego źródła; nie oznacza ręcznego PASS przypadków, niezależnego odczytu ZIP receipt, odczytu flagi API ani potwierdzenia autosave po grze. Nie resetowano kont i nie promowano PROD. Wszystkie 53 ręczne scenariusze nadal NOT RUN.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-0715](HL-CHG-0715.md), [HL-CHG-0817](HL-CHG-0817.md), [HL-CHG-0819](HL-CHG-0819.md), [HL-CHG-0825](HL-CHG-0825.md), [HL-CHG-0901](HL-CHG-0901.md), [HL-CHG-0914](HL-CHG-0914.md), [HL-CHG-0918](HL-CHG-0918.md), [HL-CHG-0926](HL-CHG-0926.md), [HL-CHG-0927](HL-CHG-0927.md)

## Uwagi

- Wcześniejsze karty zachowują dowody źródła 351baaf6b21386b2f2641875269e6f7d9c2d44fd. To potwierdzenie poprzedniego wariantu, nie nowego wspólnego okna.

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
