# HARBORLIGHT — stan środowisk

Aktualizacja: **31 października 2026**. Ten dokument jest głównym rejestrem tego, co rzeczywiście znajduje się na DEV, PRE-PROD i PROD. Historia czynności i wyników pozostaje w [dzienniku](IMPLEMENTATION-LOG.md), a warunki promocji w [procesie wydań](RELEASE-PROCESS.md).

## Stan potwierdzony

| Miejsce | Kod i dowód | Co pozostaje do wykonania lub potwierdzenia |
|---|---|---|
| **DEV — przestrzeń robocza** | Zaimplementowano [v22](FRONTEND-V22-REQUIREMENTS.md): pomijanie wcześniejszych działań bez nagrody, migracja wiarygodnych dawnych dowodów i zabezpieczony reset po promocji. **911 testów lokalnych PASS i 11 zestawów Chromium PASS**. | Synchronizacja nowego SHA i jego własne zielone CI. Testy lokalne nie potwierdzają publikacji GCP. |
| **GitHub / CI — ostatnia zweryfikowana baza DEV** | **v21**, SHA `1fcfc8ba897a495a3878f15ed67595fa89071656`; [CI 41218163406 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41218163406). | Nowy SHA v22 wymaga własnego CI. Sukces v21 nie jest jego zastępstwem. |
| **GitHub Pages — podgląd DEV** | Baza **v21**, [Pages 41218163559 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41218163559). [Link roboczy nowej wyspy](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v21). | Publikacja v22 pozostaje do potwierdzenia. Próba odczytu Pages z tej sesji została zablokowana przez bramę sieciową HTTP 403; nie jest to dowód błędu samej gry. Podgląd działa w pamięci; nie jest kontem chmurowym ani zapisem PRE-PROD. |
| **PRE-PROD — GCP `harborlight-dev`** | Ostatnie potwierdzone wdrożenie: **v18**, SHA `6ec3c6d8625420fd96474a22a8b1d699672416cd`; [CI 41111528800 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41111528800), [wdrożenie 41112673285 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41112673285). [Gra PRE-PROD](https://harborlight-dev.web.app). | Brak potwierdzonej nowszej promocji v19–v22. Po weryfikacji nowego wdrożenia zaplanowany osobny reset wszystkich trzech kont testowych. |
| **PROD — GCP `harborlight-prod`** | Projekt i docelowa domena `harborlight.pl` są wskazane przez właściciela. | Brak potwierdzonej publikacji gry, powiązania domeny, propagacji DNS i certyfikatu. Nie promujemy kodu bez przejścia PRE-PROD. |

Lokalny odbiór v22: **726 testów gry/synchronizacji/promocji, 62 backendu i 123 przygotowania/pakowania/konfiguracji — razem 911 PASS**, ponadto **11 zestawów Chromium PASS**. Pakiet przeglądarkowy ma 48 plików; wszystkie publiczne bajty porównano ze źródłami po testach. Odbiór jest izolowany: bez rzeczywistych zapisów lub resetów Google.

Historyczny lokalny odbiór bazy v21: **871 testów PASS i 10 zestawów Chromium PASS**. Jest dowodem testów tego zakresu, odrębnym od CI, podglądu Pages i publikacji w GCP. Lokalny kontener zbudowano i uruchomiono bez dostępu do chmury; nie jest to dowód aktualizacji Cloud Run.

Potwierdzenie PRE-PROD v18 obejmuje sondy API, zgodność publicznych plików z manifestem, rzeczywiste logowanie/renderowanie istniejącej wyspy oraz izolację trzech kont bez nadpisywania ich postępu. Zachowano parę artefaktów v2 z próby 1:

- `harborlight-dev-frontend-41112673285-1`;
- `harborlight-dev-release-41112673285-1`.

Zawartość i hashe tych artefaktów muszą być ponownie sprawdzone przez workflow przed ewentualną promocją PROD. Historyczny sukces nie potwierdza ich bieżącej dostępności.

## Usługi i dane to odrębne statusy

| Obszar | Status |
|---|---|
| Stałe konta PRE-PROD | Istnieją `admin1`, `admin2`, `admin3`, z UID `dev-admin1`, `dev-admin2`, `dev-admin3`, Firebase Authentication i prywatnym zapisem Firestore. |
| API kont i rynek graczy v21 | Kod i lokalne testy są przygotowane. Aktywacja właściwego API, routingu, IAM i rzeczywisty odbiór nowego rynku na PRE-PROD nie zostały potwierdzone. Sam kod, odpowiedź anonimowa ani publikacja statycznych plików nie dowodzą aktywacji. |
| Reset trzech kont po promocji | **Zlecony, niewykonany.** Obejmuje także `admin1`; szczegóły poniżej i w [instrukcji resetu](PREPROD-RESET.md). |
| Prawdziwe Paynow i reklamy | Bez potwierdzonej aktywacji. DEV/PRE-PROD używają oznaczonych symulacji; PROD nie może przyznawać zakupu za symulację. |
| Google/Facebook OAuth i posty | Kod ścieżek logowania nie dowodzi aktywacji dostawcy. Właścicielska konfiguracja i rzeczywisty odbiór są osobnymi warunkami; automatyczna publikacja na Facebooku jest odłożona. |

## Zlecony reset po promocji v22

Najnowsze GO użytkownika z 31 października 2026 upoważnia do rozpoczęcia od zera **wszystkich trzech kont PRE-PROD: `admin1`, `admin2`, `admin3`, dopiero po udanej i zweryfikowanej promocji**. Dla tej konkretnej operacji zastępuje wcześniejsze polecenie zachowania historii `admin1`. Przed jej wykonaniem nadal obowiązuje ochrona dotychczasowych zapisów. Zwykły deploy i odczytowe testy hostingu nie resetują kont.

Reset dotyczy stanu gry kont testowych, nie tożsamości Authentication: UID, loginy i hasła pozostają te same. Przygotowanie narzędzia lub jego test na fiksturze nie jest wykonaniem resetu w Google. Operacja nie obejmuje PROD ani innych użytkowników. Procedura i dowody odczytu po zapisie: [PREPROD-RESET.md](PREPROD-RESET.md).

**Bieżący wynik operacji: oczekuje na promocję i weryfikację; brak potwierdzenia resetu.**

## Jak aktualizować rejestr

Przy każdej zmianie statusu zapisujemy osobno:

1. Zakres kodu przygotowanego w DEV i rzeczywiste lokalne wyniki testów.
2. Pełny commit SHA zsynchronizowany z Git oraz numer i wynik CI dla tego samego SHA; jeśli istotne, również numer próby.
3. Link i numer publikacji podglądu Pages oraz wynik sprawdzenia faktycznie serwowanej wersji.
4. Numer i próbę promocji PRE-PROD, źródłowe CI/SHA, manifest opublikowanego frontendu, wynik sond i realnego odbioru kont/API, parę artefaktów v2.
5. Osobny wynik aktywacji nowej konfiguracji/usług i osobny wynik resetu wraz z kontrolą wszystkich trzech kont. Nie wpisujemy „gotowe” na podstawie samego uruchomienia skryptu.
6. Przy PROD: źródłowe udane PRE-PROD, identyczny pakiet/digest, własny odbiór oraz domenę/DNS/TLS potwierdzone rzeczywistym odczytem.

Nie znamy jeszcze SHA ani numerów przyszłego CI/promocji v22; nie wpisujemy wymyślonych wartości. Aktualizację potwierdzamy dowodem, a nie samym zakończeniem pracy nad kodem.
