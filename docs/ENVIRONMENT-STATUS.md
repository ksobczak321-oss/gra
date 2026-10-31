# HARBORLIGHT — stan środowisk

Aktualizacja: **31 października 2026**. Ten dokument jest głównym rejestrem tego, co rzeczywiście znajduje się na DEV, PRE-PROD i PROD. Historia czynności i wyników pozostaje w [dzienniku](IMPLEMENTATION-LOG.md), a warunki promocji w [procesie wydań](RELEASE-PROCESS.md).

## Pilny zakres DEV — wersja 0.9.1.2 (v23.1)

Użytkownik zlecił wybór języka PL/EN w pierwszym wprowadzeniu po zalogowaniu, także na ekranie nadawania nazwy wyspie. **Implementacja i lokalny odbiór zakończone:** 739 testów Node, 12 pakowania, 18 importera PASS; 13 scenariuszy onboarding Chromium oraz zestaw Ustawień PL/EN komputer/telefon PASS. Autoryzowana kolejność to DEV → Git/CI dokładnego SHA → standardowa promocja PRE-PROD. Nie potwierdzono jeszcze nowego commitu, CI, Pages ani wdrożenia GCP. Zlecony bridge Actions po sukcesie dokładnego CI uruchamia istniejący standardowy workflow wyłącznie dla markera `[preprod:0.9.1.2]`, bez nowych poświadczeń Google; szczegóły i ograniczenie ref main opisuje [zakres v23.1](FRONTEND-V23-1-REQUIREMENTS.md).

Rejestr obejmuje **250 zmian / 46 ręcznych przypadków NOT RUN**. Pozostałe nowe uwagi zapisano jako odłożone, bez projektowania druku, generowania obrazów lub wdrażania ligi/czatów. Wcześniejsze CI poniżej nie są dowodem nowej poprawki. PRE-PROD nadal ma v22.1 / `092e75226fbb14cab09826f313e11d10891966d8`; nie zmieniono PROD ani nie resetowano kont.

## Poprzedni zakres DEV — wersja 0.9.1.1 (wewnętrzny etap v23)

**Najnowsza rewizja projektu społeczności i planszówki:** zaakceptowano średnią z premią współpracy, sojusze/czat, przycisk dobroczynny, limity finansowania i serwerowe pochodzenie monet oraz rzeczywisty bonus szczęścia. Planszówka zmienia się na jedną talię, telefon, ruch pionków i zaliczane korzyści online. Parametry i scenariusze są opisane jako propozycje, bez nowego GO na implementację. Rejestr obejmuje **241 zmian i 46 przypadków ręcznych NOT RUN**. Nie zmieniono kodu wersji 0.9.1.1, danych graczy, PRE-PROD, PROD ani finansowania. Historyczne CI aplikacji nie są wynikiem testu tych nowych mechanik.

**Późniejsze decyzje, wyłącznie dokumentacja:** pięć odpowiedzi do analizy zatwierdza cenę kumulacyjną, dynamiczne prefiksy, teleport sześciu kolonistów, limit 20 wysp łącznie, ochronę matki 12 także przed zdarzeniami oraz bazowy pułap ceny NPC. Rejestr ma teraz **229 zmian**; nowe karty 0826/0827 i zaktualizowane przypadki ręczne są specyfikacją, nie implementacją. Nie zmieniono aplikacji, jej wersji, stanu kont ani GCP. Poniższy tag 0.9.1.1 jest niezmiennym dowodem wcześniejszego kodu i dokumentacji z 227 kartami; nie jest dowodem CI tych późniejszych decyzji.

Ten wcześniejszy zapis 229 decyzji ma pełny SHA `51d55c1b4cb4a3b417902250de0dad11cee2726d`; [CI 41228250188](https://github.com/ksobczak321-oss/gra/actions/runs/41228250188) i [Pages 41228250189](https://github.com/ksobczak321-oss/gra/actions/runs/41228250189) mają SUCCESS. To odrębny dowód synchronizacji dokumentacji, bez zmiany mechanik i bez GCP. Nie obejmuje nowszego powyższego projektu społeczności/planszówki z 241 kartami, który wymaga własnego commitu i CI.

Po wcześniejszej publikacji v22.1 użytkownik zlecił nowe opracowanie. W DEV widoczna wersja w Ustawieniach to **0.9.1.1** (nowy moduł `harborlight-version.js`, cache `frontend-v23`). Implementacja obejmuje tę etykietę, rejestr zmian, ręczne przypadki oraz importer kart do Issues; mechaniki wielu wysp, pasażerów i nowego handlu są [analizą do decyzji](FRONTEND-V23-REQUIREMENTS.md), a liga/dobroczynność/planszówka są projektami. Kod aplikacji ma pełny SHA **`82152651a3edd490866a9c2c5f8cc5c4a7104492`**; [CI 41226626826](https://github.com/ksobczak321-oss/gra/actions/runs/41226626826) i [Pages 41226626838](https://github.com/ksobczak321-oss/gra/actions/runs/41226626838) mają **SUCCESS** dla tego SHA. Późniejsze odpowiedzi użytkownika i korekty projektów są odrębnym uzupełnieniem dokumentacji; ich końcowy odbiór zapisuje adnotowany tag `dev-0.9.1.1-20261031`. Tag v22.1 poniżej dotyczy wcześniejszej aplikacji.

Lokalnie **730 testów gry/synchronizacji/promocji + 62 backendu + 141 Python = 933 PASS**, ponadto **12 zestawów Chromium PASS**. Do testów Python wliczono 18 testów importera na izolowanych danych; nie tworzyły Issues. Sprawdzono widoczną wersję 0.9.1.1 po polsku i angielsku, na komputerze i telefonie, oraz zachowanie schematu świata 9. Ręczne przypadki nadal mają wynik NOT RUN.

**PRE-PROD nadal ma poniższy kod v22.1 `092e752…`, bez nowej etykiety 0.9.1.1.** W tym zakresie nie uruchomiono promocji GCP ani resetu kont, nie aktywowano płatności, darowizn lub publikacji społecznościowych. Rzeczywisty koszt GCP ostatnich 24 godzin jest niedostępny; przygotowana kwerenda nie jest pomiarem. Natywne Issues są nieopublikowane z powodu nieprawidłowego tokena; karty są przygotowane do synchronizacji przez właściciela.

Pakiet aplikacji dla `8215265`: **49 plików z manifestem, 10 838 477 bajtów**, SHA-256 archiwum `64be76270ffd19e7e6715f21cb06970fe5519fd54f1ce6e77104764b150489f4`, manifestu `89cfabb18cbdb831ad044c76c1b0c1a2b476ae65dffede1ff807db3d6777ec37`. Wszystkie 48 plików zawartości porównano bajtowo z pakietem sprawdzonym przez 12 zestawów Chromium. To lokalny dowód pakowania źródłowego wydania, nie artefakt promocji GCP. Dokładny końcowy SHA dokumentacji, jego CI/Pages i hashe własnego pakietu wiąże nieprzesuwany tag DEV; nie zastępuje on CI wymaganego przed przyszłą promocją.

## Stan potwierdzony

Uzupełnienie po uwagach ma nazwę **v22.1** (cache `frontend-v22-1`), pełny SHA **`092e75226fbb14cab09826f313e11d10891966d8`**. Adnotowany tag [dev-v22.1-20261031](https://github.com/ksobczak321-oss/gra/tree/dev-v22.1-20261031) został utworzony i opublikowany po sukcesie CI/Pages: wiąże commit, wyniki oraz hashe pakietu. Jest dowodem odbioru **DEV**, odrębnym od udanej promocji GCP opisanej poniżej. Odczyt tagu opisuje [proces wydań](RELEASE-PROCESS.md#niezmienny-dowód-odbioru-dev).

| Miejsce | Kod i dowód | Co pozostaje do wykonania lub potwierdzenia |
|---|---|---|
| **DEV — przestrzeń robocza** | **0.9.1.2 / pilny zakres v23.1**: wybór PL/EN przy nazwie wyspy, tag rejestru `pilne`. Lokalnie 739 Node + 12 pakowania + 18 importera PASS, 13 przypadków onboarding i zestaw Settings Chromium PASS. | Własny commit, CI/Pages i promocja PRE-PROD wymagają potwierdzenia; wcześniejsze wyniki 0.9.1.1 nie zastępują odbioru nowego kodu. |
| **GitHub / CI — v22.1** | SHA `092e75226fbb14cab09826f313e11d10891966d8`; [CI 41221965032 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41221965032). Adnotowany tag **`dev-v22.1-20261031`** opublikowany. | Odczyt: `git show --no-patch dev-v22.1-20261031`. Nowe zmiany aplikacji wymagają własnego SHA i CI. |
| **GitHub Pages — podgląd DEV** | [Link roboczy 0.9.1.1](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v23); [Pages 41226626838 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41226626838) dla `82152651a3edd490866a9c2c5f8cc5c4a7104492`. | Bezpośredni odczyt Pages z tej sesji blokuje brama sieciowa HTTP 403. Nie potwierdzono tu niezależnego odbioru serwowanych plików. Podgląd działa w pamięci; nie jest kontem chmurowym ani zapisem PRE-PROD. |
| **PRE-PROD — GCP `harborlight-dev`** | **v22.1**, SHA `092e75226fbb14cab09826f313e11d10891966d8`; [promocja 41222765705, próba 1 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41222765705), czas 2 min 10 s. [Gra PRE-PROD](https://harborlight-dev.web.app). Para artefaktów v2 opublikowana; szczegóły niżej. | Nie odczytano jeszcze zawartości ZIP potwierdzenia wydania ani faktycznej wartości włączenia API kont. Bezpośredni odczyt hostingu blokuje brama HTTP 403. Osobny reset kont nadal niewykonany. |
| **PROD — GCP `harborlight-prod`** | Projekt i docelowa domena `harborlight.pl` są wskazane przez właściciela. | Brak potwierdzonej publikacji gry, powiązania domeny, propagacji DNS i certyfikatu. Nie promujemy kodu bez przejścia PRE-PROD. |

Lokalny odbiór v22.1: **730 testów gry/synchronizacji/promocji, 62 backendu i 123 przygotowania/pakowania/konfiguracji — razem 915 PASS**, ponadto **12 zestawów Chromium PASS**. Pakiet przeglądarkowy ma 48 plików; wszystkie publiczne bajty porównano ze źródłami po testach. Odbiór jest izolowany: bez rzeczywistych zapisów lub resetów Google.

## Ostatnia potwierdzona promocja PRE-PROD v22.1

Publiczny status [41222765705](https://github.com/ksobczak321-oss/gra/actions/runs/41222765705) potwierdza **SUCCESS**, próbę **1** i źródłowy SHA `092e75226fbb14cab09826f313e11d10891966d8`; źródłowe [CI 41221965032](https://github.com/ksobczak321-oss/gra/actions/runs/41221965032) również ma SUCCESS. Opublikowano:

| Artefakt z próby 1 | SHA-256 ZIP podany przez GitHub |
|---|---|
| `harborlight-dev-frontend-41222765705-1` | `34f7235450a31ac2906acbe1b47d9f7d335a7b531cc55f0f35efb435c1be5622` |
| `harborlight-dev-release-41222765705-1` | `70265c76a8f15bda330967e4cf6d9dc06c114f2428773c5cc13184a4b1b9b278` |

To hashe ZIP artefaktów GitHub, nie odczytane wartości manifestu aplikacji ani digest obrazu backendu. Zawartości ZIP potwierdzenia wydania nie pobrano w tej sesji. Sukces workflow potwierdza przejście jego wymaganych kontroli, w tym zgodność testowanego trybu API z konfiguracją, lecz **nie ujawnia nam wartości tej konfiguracji**. Nie ogłaszamy włączenia API kont ani rynku na podstawie samego sukcesu. Brama sieciowa tej sesji zwraca 403 przy bezpośrednim odczycie `web.app`; nie jest to dowód błędu witryny.

Reset wymaga jeszcze odczytu oryginalnego ZIP potwierdzenia i rzeczywistej konfiguracji/usług w sesji właściciela GCP. Przed resetem i ewentualną promocją PROD narzędzia muszą sprawdzić zawartość, hashe i aktualne wymagania wydania. Sam tag DEV nie zastępuje tych dowodów.

## Historia wcześniejszych wydań

Historyczny bazowy v22: `087000b2fe6faec97717f705f9fabcc0d3469803`, [CI 41220294183 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41220294183), [Pages 41220294194 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41220294194), 911 testów i 11 zestawów Chromium PASS. Poprawki po podglądzie mają odrębny powyższy odbiór v22.1.

Historyczny lokalny odbiór bazy v21: **871 testów PASS i 10 zestawów Chromium PASS**. Jest dowodem testów tego zakresu, odrębnym od CI, podglądu Pages i publikacji w GCP. Lokalny kontener zbudowano i uruchomiono bez dostępu do chmury; nie jest to dowód aktualizacji Cloud Run.

Poprzednia potwierdzona promocja PRE-PROD **v18**, SHA `6ec3c6d8625420fd96474a22a8b1d699672416cd`: [CI 41111528800 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41111528800), [wdrożenie 41112673285 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41112673285), 30 października 2026. Obejmowała sondy API, zgodność publicznych plików z manifestem, rzeczywiste logowanie/renderowanie istniejącej wyspy oraz izolację trzech kont bez nadpisywania ich postępu. Zachowano parę artefaktów v2 z próby 1:

- `harborlight-dev-frontend-41112673285-1`;
- `harborlight-dev-release-41112673285-1`.

Zawartość i hashe tych artefaktów muszą być ponownie sprawdzone przez workflow przed ewentualną promocją PROD. Historyczny sukces nie potwierdza ich bieżącej dostępności.

## Usługi i dane to odrębne statusy

| Obszar | Status |
|---|---|
| Stałe konta PRE-PROD | Istnieją `admin1`, `admin2`, `admin3`, z UID `dev-admin1`, `dev-admin2`, `dev-admin3`, Firebase Authentication i prywatnym zapisem Firestore. |
| API kont i rynek graczy | Kod jest częścią opublikowanego v22.1. Workflow zakończył testy w trybie zgodnym z konfiguracją, ale jej wartości nie odczytano. **Włączenie API kont i nowego rynku pozostaje nieustalone**; wymaga potwierdzenia wydania i rzeczywistego odczytu konfiguracji/API. |
| Reset trzech kont po promocji | **Zlecony, niewykonany.** Obejmuje także `admin1`; szczegóły poniżej i w [instrukcji resetu](PREPROD-RESET.md). |
| Prawdziwe Paynow i reklamy | Bez potwierdzonej aktywacji. DEV/PRE-PROD używają oznaczonych symulacji; PROD nie może przyznawać zakupu za symulację. |
| Google/Facebook OAuth i posty | Kod ścieżek logowania nie dowodzi aktywacji dostawcy. Właścicielska konfiguracja i rzeczywisty odbiór są osobnymi warunkami; automatyczna publikacja na Facebooku jest odłożona. |

## Zlecony reset po promocji v22

Najnowsze GO użytkownika z 31 października 2026 upoważnia do rozpoczęcia od zera **wszystkich trzech kont PRE-PROD: `admin1`, `admin2`, `admin3`, dopiero po udanej i zweryfikowanej promocji**. Dla tej konkretnej operacji zastępuje wcześniejsze polecenie zachowania historii `admin1`. Przed jej wykonaniem nadal obowiązuje ochrona dotychczasowych zapisów. Zwykły deploy i odczytowe testy hostingu nie resetują kont.

Reset dotyczy stanu gry kont testowych, nie tożsamości Authentication: UID, loginy i hasła pozostają te same. Przygotowanie narzędzia lub jego test na fiksturze nie jest wykonaniem resetu w Google. Operacja nie obejmuje PROD ani innych użytkowników. Procedura i dowody odczytu po zapisie: [PREPROD-RESET.md](PREPROD-RESET.md).

**Bieżący wynik operacji: promocja v22.1 ma SUCCESS; reset nadal niewykonany.** Kolejny etap wymaga oryginalnego ZIP potwierdzenia, odczytu konfiguracji/API oraz wykonania procedury w zalogowanej sesji właściciela GCP, z końcowym odczytem wszystkich trzech kont.

## Jak aktualizować rejestr

Przy każdej zmianie statusu zapisujemy osobno:

1. Zakres kodu przygotowanego w DEV i rzeczywiste lokalne wyniki testów.
2. Pełny commit SHA zsynchronizowany z Git oraz numer i wynik CI dla tego samego SHA; jeśli istotne, również numer próby.
3. Link i numer publikacji podglądu Pages oraz wynik sprawdzenia faktycznie serwowanej wersji.
4. Numer i próbę promocji PRE-PROD, źródłowe CI/SHA, manifest opublikowanego frontendu, wynik sond i realnego odbioru kont/API, parę artefaktów v2.
5. Osobny wynik aktywacji nowej konfiguracji/usług i osobny wynik resetu wraz z kontrolą wszystkich trzech kont. Nie wpisujemy „gotowe” na podstawie samego uruchomienia skryptu.
6. Przy PROD: źródłowe udane PRE-PROD, identyczny pakiet/digest, własny odbiór oraz domenę/DNS/TLS potwierdzone rzeczywistym odczytem.

SHA, CI/Pages oraz udaną promocję v22.1 zapisano wyżej. Dowód DEV stanowi opisany tag; osobny dowód GCP to przebieg `41222765705` i jego artefakty. Wartość konfiguracji API, wynik resetu i publikacja PROD wymagają dalszych rzeczywistych odczytów; nie wpisujemy ich jako wykonanych. Aktualizację potwierdzamy dowodem, a nie samym zakończeniem pracy nad kodem.
