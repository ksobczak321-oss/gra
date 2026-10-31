# HL-CHG-0934 — Jawna promocja 0.10.1.0 po zielonym CI, bez resetu kont

**Typ:** Ops · **Obszar:** Promocja wydania DEV → PRE-PROD · **Epik:** `HL-EPIC-INF`

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

- Bridge rozpoznaje wyłącznie jawnie dozwolone znaczniki [preprod:0.9.1.2] oraz [preprod:0.10.1.0]; bieżąca zmiana nie otrzymuje etykiety pilne.
- Promocja używa tego samego pełnego SHA, które zakończyło własne CI sukcesem, i nie omija ograniczeń main, aktualnej próby, tożsamości repozytorium ani blokady duplikatów.
- Pozostaje istniejący workflow PRE-PROD z kontrolą obrazu, dokładnego pakietu i opublikowanej gry. PROD nie jest uruchamiany.
- Authentication, loginy, hasła i dotychczasowy stan trzech kont pozostają zachowane. Żadna operacja resetu nie jest częścią zwykłego deployu.
- Przed frontendem należy potwierdzić rzeczywisty tryb API oraz zgodność aktywnych reguł zapisu z nowym formatem. Dla bezpośredniego Firestore potrzebne są reguły schemaVersion 1/2, także przy pojedynczej wyspie; dla API wymagany jest istniejący dostęp runtime do Firestore.
- Odbiór odczytowy hostingu nie potwierdza zapisu: po wdrożeniu trzeba osobno potwierdzić automatyczny zapis i ponowny odczyt istniejącej wyspy, bez zerowania danych.

## Źródło

Użytkownik zlecił po testach wdrożenie bieżących zmian na PRE-PROD. Dyspozycja rozszerza poprzedni zakres DEV; nie obejmuje PROD ani resetowania historii.

Odniesienie: `chat:DEV-v25-followup-ci-and-preprod-go`.

Data pierwotnej wiadomości: 2026-10-31. Doprecyzowanie i odbiór po pierwszym podglądzie DEV 0.10.1.0; zachowujemy oddzielne dowody każdego źródła.

## Dowody

- **Dokumenty:** [docs/FRONTEND-V25-REQUIREMENTS.md](../../FRONTEND-V25-REQUIREMENTS.md), [docs/PREPROD-V25-PREPARATION.md](../../PREPROD-V25-PREPARATION.md)
- **Kod:** [infra/google-cloud/urgent-preprod-dispatch.mjs](../../../infra/google-cloud/urgent-preprod-dispatch.mjs), [.github/workflows/promote-urgent-preprod.yml](../../../.github/workflows/promote-urgent-preprod.yml), [.github/workflows/google-cloud-dev.yml](../../../.github/workflows/google-cloud-dev.yml), [infra/google-cloud/firestore.dev.rules](../../../infra/google-cloud/firestore.dev.rules)
- **Scenariusze automatyczne:** [tests/harborlight-urgent-preprod-dispatch.test.mjs](../../../tests/harborlight-urgent-preprod-dispatch.test.mjs), [tests/harborlight-hosted-v18-smoke.py](../../../tests/harborlight-hosted-v18-smoke.py)
- **Kod dowodowy:** `353faad347262dce7c3632fdf7c71be124384ab1`.
- **CI tego wydania:** https://github.com/ksobczak321-oss/gra/actions/runs/41246449612.
- **Promocja kodu:** https://github.com/ksobczak321-oss/gra/actions/runs/41246771480.
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

Powiązane przypadki do ręcznego przeklikania:

- [HL-TC-0031 — Promocja zachowuje kolejność DEV → PRE-PROD → PROD](../../testing/manual/HL-TC-0031.md) — `NOT RUN`.

Zgoda na PRE-PROD jest udzielona. Rozszerzenie allowlisty bridge przeszło 10 kierunkowych testów. Nowe pełne źródło, CI, rzeczywisty tryb API, reguły/IAM oraz wynik promocji pozostają do odczytania. Nie wykonano resetu ani promocji PROD. Read-only analiza wskazuje migrację zapisu przy pierwszym CAS, bez wymagania hurtowego przepisywania wysp.

Właściciel przekazał sukces prepare-dev-users.py po aktualizacji f161e45..b1cd650: projekt/Firebase i trzy istniejące UID potwierdzone, hasła pozostawione, prywatny zapis gotowy, bez publikacji gry i resetu. To dowód z sesji właściciela, nie niezależny odczyt GCP. Minimalny wyciąg i SHA-256 logu są w PREPROD-V25-PREPARATION.md; plik reguł b1cd650 jest zgodny z bieżącym. Przygotowanie reguł nie zastępuje własnego zielonego CI nowego źródła ani odbioru zapisu po wdrożeniu. Nowy pakiet frontend-v25-2 ma 898 Node, 141 Python i 18 zestawów Chromium PASS; to odbiór lokalny, nie wynik CI ani publikacji GCP.

Końcowy lokalny odbiór NOWEGO pakietu po dalszej przyjaznej redakcji i poprawce geometrii: 898 testów Node PASS / 0 FAIL, 141 testów Python w 11 zestawach PASS i 18 zestawów Chromium PASS. Ponowny odczyt 112 widoków (56 komputer + 56 telefon) ma 0 wykrytych angielskich elementów i execution_error:null. Historyczny kurs v18 przeszedł 4 warianty, w tym rzeczywistą geometrię 360×640 odpowiadającą usterce z CI. Cache frontend-v25-2; źródło końcowego commitu, własne CI i publikacja pozostają odrębnie pending. Stary FAIL b1cd650 ani starsze receipt nie są zastępowane tym lokalnym wynikiem. Ręczne przypadki nadal NOT RUN; kont nie resetowano.

Końcowe źródło aplikacji 353faad347262dce7c3632fdf7c71be124384ab1 zostało wysłane do main. Własne CI 41246449612 zakończyło się SUCCESS (3 min 54 s), a Pages 41246449682 — SUCCESS (31 s) dla tego samego źródła. DEV jest odebrany; promocja PRE-PROD nadal oczekuje na osobne potwierdzenie. Znacznik [preprod:0.10.1.0] zleca bridge po zielonym CI tego samego źródła. Ostateczny pakiet ma 54 pliki z manifestem, 10 991 135 bajtów; 53 pliki treści są zgodne ze sprawdzonym pakietem. SHA-256 archiwum: 6c738006d57e115b3293a88460e9432ccb1fafb51e1eb9c08fdb116914e4c744; manifestu: 0010c121de03c64e157596d014d80eb04970e7f5d03e81350374b9ce1a6abd0d. To dowód przygotowania i synchronizacji kodu, nie wykonania wdrożenia ani resetu.

Potwierdzono osobno sukces CI i Pages końcowego źródła 353faad347262dce7c3632fdf7c71be124384ab1. Ten odbiór DEV nie jest potwierdzeniem konfiguracji API, wdrożenia GCP, autosave na prawdziwym koncie ani resetu. Wyniki ręczne pozostają NOT RUN.

PRE-PROD potwierdzone: google-cloud-dev.yml 41246771480, próba 1, SUCCESS (2 min 05 s), źródło 353faad347262dce7c3632fdf7c71be124384ab1. Bridge 41246756848 zakończył się SUCCESS (15 s). Gra: https://harborlight-dev.web.app. DEV tag dev-0.10.1.0-20261031 jest opublikowany. To dowód wdrożenia kodu tego samego źródła; nie oznacza ręcznego PASS przypadków, niezależnego odczytu ZIP receipt, odczytu flagi API ani potwierdzenia autosave po grze. Nie resetowano kont i nie promowano PROD. Wszystkie 53 ręczne scenariusze nadal NOT RUN.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-0036](HL-CHG-0036.md), [HL-CHG-0038](HL-CHG-0038.md), [HL-CHG-0932](HL-CHG-0932.md)

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
