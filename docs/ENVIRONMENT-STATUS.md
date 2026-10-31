# HARBORLIGHT — stan środowisk

Aktualizacja: **31 października 2026**. Ten dokument jest głównym rejestrem tego, co rzeczywiście znajduje się na DEV, PRE-PROD i PROD. Historia czynności i wyników pozostaje w [dzienniku](IMPLEMENTATION-LOG.md), a warunki promocji w [procesie wydań](RELEASE-PROCESS.md).

## Stan potwierdzony

Uzupełniony podgląd po uwagach ma nazwę **v22.1** (cache `frontend-v22-1`). Jego niezmiennym dowodem Git jest adnotowany tag [dev-v22.1-20261031](https://github.com/ksobczak321-oss/gra/tree/dev-v22.1-20261031): pełny commit, wynik i numery CI/Pages oraz hashe pakietu są w adnotacji. Tag powstaje dopiero po sukcesie obu przebiegów; jeżeli go jeszcze nie ma, odbiór nowego podglądu oczekuje na zakończenie. Odczyt dowodu opisuje [proces wydań](RELEASE-PROCESS.md#niezmienny-dowód-odbioru-dev).

| Miejsce | Kod i dowód | Co pozostaje do wykonania lub potwierdzenia |
|---|---|---|
| **DEV — przestrzeń robocza** | **v22.1**: wcześniejsze lekcje bez nagrody, kolejność oprowadzania szczęście → monety → mieszkańcy, nagrody 3×2 i wskazówka przez szczegóły Magazynu. **915 testów lokalnych PASS i 12 zestawów Chromium PASS**. | Pełny SHA i własny wynik CI/Pages wiąże opisany wyżej tag. Przygotowanie kodu nie jest publikacją GCP. |
| **GitHub / CI — v22.1** | Dokładny commit aplikacji i numery CI/Pages zapisuje adnotacja nieprzesuwanego tagu **`dev-v22.1-20261031`**, utworzonego dopiero po sukcesie obu przebiegów. | Odczyt: `git show --no-patch dev-v22.1-20261031`; bez tagu nie potwierdzamy zakończenia nowego odbioru. Bazowy sukces v22 opisano poniżej jako historię. |
| **GitHub Pages — podgląd DEV** | [Link roboczy v22.1](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v22-1). Przebieg publikacji i jego SHA potwierdza adnotacja powyższego tagu po sukcesie Pages. | Bezpośredni odczyt Pages z tej sesji blokuje brama sieciowa HTTP 403. Nie potwierdzono tu sieciowego odbioru serwowanych plików. Podgląd działa w pamięci; nie jest kontem chmurowym ani zapisem PRE-PROD. |
| **PRE-PROD — GCP `harborlight-dev`** | Ostatnie potwierdzone wdrożenie: **v18**, SHA `6ec3c6d8625420fd96474a22a8b1d699672416cd`; [CI 41111528800 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41111528800), [wdrożenie 41112673285 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41112673285). [Gra PRE-PROD](https://harborlight-dev.web.app). | Brak potwierdzonej nowszej promocji v19–v22. Po weryfikacji nowego wdrożenia zaplanowany osobny reset wszystkich trzech kont testowych. |
| **PROD — GCP `harborlight-prod`** | Projekt i docelowa domena `harborlight.pl` są wskazane przez właściciela. | Brak potwierdzonej publikacji gry, powiązania domeny, propagacji DNS i certyfikatu. Nie promujemy kodu bez przejścia PRE-PROD. |

Lokalny odbiór v22.1: **730 testów gry/synchronizacji/promocji, 62 backendu i 123 przygotowania/pakowania/konfiguracji — razem 915 PASS**, ponadto **12 zestawów Chromium PASS**. Pakiet przeglądarkowy ma 48 plików; wszystkie publiczne bajty porównano ze źródłami po testach. Odbiór jest izolowany: bez rzeczywistych zapisów lub resetów Google.

Historyczny bazowy v22: `087000b2fe6faec97717f705f9fabcc0d3469803`, [CI 41220294183 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41220294183), [Pages 41220294194 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41220294194), 911 testów i 11 zestawów Chromium PASS. Poprawki po podglądzie mają odrębny powyższy odbiór v22.1.

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

SHA i znane przebiegi GitHub v22 zapisano wyżej. Dowód uzupełnienia po podglądzie wiąże pełny commit z CI/Pages w opisanym tagu. Nie znamy numeru przyszłej promocji GCP/resetu; nie wpisujemy wymyślonych wartości. Aktualizację potwierdzamy dowodem, a nie samym zakończeniem pracy nad kodem.
