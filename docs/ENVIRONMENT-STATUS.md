# HARBORLIGHT — stan środowisk

Aktualizacja: **31 października 2026**. Ten dokument jest głównym rejestrem tego, co rzeczywiście znajduje się na DEV, PRE-PROD i PROD. Historia czynności i wyników pozostaje w [dzienniku](IMPLEMENTATION-LOG.md), a warunki promocji w [procesie wydań](RELEASE-PROCESS.md).

## DEV 0.10.1.0 / v25 — końcowa redakcja w przygotowaniu

Zakres: prowadzenie 25 lekcji przez rzeczywiste kliknięcia mapy, naturalny polski całej gry, wspólne okno ligi 19:00–21:00 i potwierdzone parametry archipelagu. Ostatnie doprecyzowanie dotyczy prostego, przyjaznego języka opisów: co gracz może zrobić i po co. Przeredagowano 12 krótkich i 12 pełnych opisów budynków oraz główne instrukcje. Cache końcowej poprawki: `frontend-v25-2`.

Pierwszy podgląd: `b1cd650da1c9d669ebce4a77bee81ebfd87ccbc9`; [Pages41244467250 SUCCESS, 41s](https://github.com/ksobczak321-oss/gra/actions/runs/41244467250), ale [CI41244467302 FAILURE, 2m48s](https://github.com/ksobczak321-oss/gra/actions/runs/41244467302). CI wykryło układ trzech przycisków historycznego samouczka wychodzący poza ekran. Nie tworzono tagu odbioru ani promocji tego kandydata. Naprawa zawijania i nowy test geometrii są gotowe. Końcowy pakiet przeszedł 898 Node + 141 Python + 18 zestawów Chromium, w tym ponowny odczyt112widoków. Wymaga nowego SHA i własnego CI. Wyników wcześniejszego pakietu nie przypisujemy nowej redakcji.

[Wymagania v25](FRONTEND-V25-REQUIREMENTS.md) · [Przegląd polszczyzny](POLISH-REVIEW-v25.md) · [Odbiór wydania](DEV-0.10.1.0-VALIDATION.md). Rejestr: 263 zmiany i 53 ręczne przypadki NOT RUN. Użytkownik autoryzował PRE-PROD po testach. Właściciel potwierdził już [przygotowanie zgodnych prywatnych reguł zapisu](PREPROD-V25-PREPARATION.md), zachowując konta i postęp. Flagi API nie odczytano niezależnie; promocja zachowuje dotychczasowy tryb. Bez resetu kont i PROD. Bieżące PRE-PROD nadal poniżej0.9.1.2.

## Ostatni odebrany DEV — 0.10.0.0 / v24, komplet PL

**Końcowe źródło: `1b3de32869c8164ed8d0b85df7ea743ca76a3719`.** [CI41238818669 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41238818669),5min15s; [Pages41238818743 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41238818743),24s. Nieprzesuwany adnotowany tag `dev-0.10.0.0-pl-20261031` wiąże źródło i dowody. [Podgląd DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v24-2) działa w pamięci, odrębnie od kont GCP. [Dokładny odbiór i hashe](DEV-0.10.0.0-VALIDATION.md).

Zakres: archipelag do20wysp, kolonizacja i pasażerowie, NPC+sprzedaż PvP, sojusze/dwa czaty/liga, dobroczynność w jawnej symulacji, oba powroty w Pomocy i samodzielna planszówka. Końcowe PL obejmuje także odmowy i nazwy zasobów, zachowując nazwy graczy; cache frontend-v24-2. [Parametry DEV](FRONTEND-V24-REQUIREMENTS.md) odróżniają potwierdzone decyzje i odwracalne założenia.

Odbiór: **878 Node,141 Python oraz16zestawów Chromium — PASS**;3generatory --check PASS. Pakiet54pliki/10 955 440bajtów, SHA-256archiwum `78d62aee489b7f8ea529b4a7e7435a430f463dd5fa9b7201e5c2fbe55925d51b`, manifestu `8c1a4fa8f4c20d94037f647e19009bbe2e8376b406f6e7fb7de1f193cab93174`.53pliki zawartości zgodne z końcowym pakietem przeglądarkowym.

Rejestr:256kart zmian,50ręcznych przypadków NOT RUN; [lista do odhaczania](testing/qa-checklist.html), [start](testing/START-HERE.md). Importer306kart w dry-run, bez natywnych Issues. TC41 integracji fizycznej BLOCKED. Planszówka: ZIP z planszą A3/A4,24kartami,pionkami,pudełkiem,instrukcją,QR i telefonem;7testów modelu (wliczone w878), kontrole PDF/fontów/hash/ZIP i dwie partie przeglądarkowe2/6osób PASS. Fizyczny test zabawy, druku, składania i skanowania pozostaje NOT RUN.

**Bez promocji GCP, stosowania nowych reguł lub resetu kont. PRE-PROD pozostaje na poniższym0.9.1.2; PROD bez potwierdzonej publikacji.** Integracja sesji fizycznej z kontem online jest wyłączona. Realna dobroczynność wymaga autorytatywnej gospodarki, API jako jedynej drogi zapisu oraz organizacji, finansowania i potwierdzeń; aktualny program jest nieaktywny poza symulacją. Opublikowanie Pages nie jest aktywacją API GCP.

Pierwszy odebrany kandydat tego zakresu:351baaf6b21386b2f2641875269e6f7d9c2d44fd, CI41237587670 SUCCESS (4m46s), Pages41237587641 SUCCESS (23s), niezmieniony tag dev-0.10.0.0-20261031. Zachowuje własne dowody; końcowe uzupełnienie PL powyżej ma odrębne źródło, CI i tag.

## Aktualne PRE-PROD — 0.9.1.2, pilne

**Opublikowane i odebrane:** źródło **`3be1f9d2094f1432acacbb782eed1665fd00e6e1`**, [CI 41233382228 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41233382228), [Pages 41233382382 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41233382382), [bridge 41233723831 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41233723831), [PRE-PROD 41233737873, próba 1 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41233737873), czas **2 min 10 s**. [Gra PRE-PROD](https://harborlight-dev.web.app). Tag priorytetu w rejestrze: **pilne**; nieprzesuwany [tag Git urgent-0.9.1.2-20261031](https://github.com/ksobczak321-oss/gra/tree/urgent-0.9.1.2-20261031) jest opublikowany i wskazuje ten sam kod.

Poprawka dodaje Polski/English w opisie i przy nazwie wyspy, zachowuje roboczą nazwę i etap, a język obowiązuje w dalszym interfejsie. Dane graczy, Authentication i postęp nie były resetowane. W tym wydaniu pilnym pozostałe projekty były odłożone; obecny DEV rozwija je osobno. PROD bez promocji. Końcowa kontrola manifestu, publicznych plików oraz wymagane testy rzeczywistego hostingu przeszły w workflow. Wartości flagi API i wewnętrznego digestu backendu nie odczytano niezależnie z ZIP.

| Artefakt próby 1 | Publiczny SHA-256 ZIP GitHub |
|---|---|
| `harborlight-dev-frontend-41233737873-1` | `0cb747023ad430c647c045913ef2712d8c475f9344fe3e14a4ddee3b713bde56` |
| `harborlight-dev-release-41233737873-1` | `3da4a3be0466a81597eec76c130c69b2d0bcffbc3e6dd377fa2f33aac1aadae1` |

Lokalny deterministyczny pakiet tego SHA: 49 plików z manifestem, 10 841 951 bajtów; archiwum SHA-256 `8fba6ec781e959d855273b333e1922ce3db113b058a51f2c8c92c3071435fd1f`, manifest `31185615e64a8dca97440799125a1e13bd160cf3dbc609991e0e05e9c3c3ce0e`. Publiczne bajty są identyczne z przeglądarkowo sprawdzoną poprawką: 13 scenariuszy wprowadzenia i Settings PL/EN desktop/mobile PASS. Pełny Node747PASS, pakowanie12PASS, importer18PASS; niezależny ręczny odbiór46przypadków nadal NOT RUN. Pierwsza próba11f6ff1/41232457485 była nieudana; nie uznajemy jej za odbiór ani nie przesuwamy jej statusu na sukces. Przyczyny ówczesnej niezgodności nie rozstrzygnięto; nowa kontrola zachowuje pełną zgodność i bounded retries.

## Historia przygotowania pilnej poprawki 0.9.1.2

**Pierwszy przebieg:** źródło `11f6ff1e7f46bd1fabb7c55da137244cf2848b08`, [CI 41232065516 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41232065516), [Pages 41232065503 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41232065503), [bridge 41232445801 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41232445801). Automatyczna [promocja 41232457485, próba 1 — FAILURE](https://github.com/ksobczak321-oss/gra/actions/runs/41232457485) zatrzymała się po publikacji Hostingu na kontroli dokładnego manifestu; nie utworzono pary artefaktów. Ostatni pełny odbiór pozostaje v22.1, ale aktualny Hosting może już zawierać częściowo opublikowaną 0.9.1.2. Nie potwierdzamy starej serwowanej wersji ani sukcesu nowej. Brak resetu kont. Przygotowywana jest ścisła kontrola gotowości manifestu; nie traktujemy hipotezy propagacji jako ustalonej przyczyny.

Użytkownik zlecił wybór języka PL/EN w pierwszym wprowadzeniu po zalogowaniu, także na ekranie nadawania nazwy wyspie. **Implementacja i lokalny odbiór zakończone:** 739 testów Node, 12 pakowania, 18 importera PASS; 13 scenariuszy onboarding Chromium oraz zestaw Ustawień PL/EN komputer/telefon PASS. Autoryzowana kolejność to DEV → Git/CI dokładnego SHA → standardowa promocja PRE-PROD. Git/CI/Pages pierwszej próby potwierdzono wyżej; pełny odbiór GCP nie przeszedł. Poprawka kontroli manifestu wymaga własnego nowego CI. Zlecony bridge Actions po sukcesie dokładnego CI uruchamia istniejący standardowy workflow wyłącznie dla markera `[preprod:0.9.1.2]`, bez nowych poświadczeń Google; szczegóły i ograniczenie ref main opisuje [zakres v23.1](FRONTEND-V23-1-REQUIREMENTS.md).

Rejestr obejmuje **251 zmian / 46 ręcznych przypadków NOT RUN**. Pozostałe nowe uwagi zapisano jako odłożone, bez projektowania druku, generowania obrazów lub wdrażania ligi/czatów. Wcześniejsze CI poniżej nie są dowodem nowej poprawki. Ostatni pełny odbiór PRE-PROD ma v22.1 / `092e75226fbb14cab09826f313e11d10891966d8`; po nieudanej nowej próbie możliwa częściowa publikacja. Nie zmieniono PROD ani nie resetowano kont.

## Poprzedni zakres DEV — wersja 0.9.1.1 (wewnętrzny etap v23)

**Najnowsza rewizja projektu społeczności i planszówki:** zaakceptowano średnią z premią współpracy, sojusze/czat, przycisk dobroczynny, limity finansowania i serwerowe pochodzenie monet oraz rzeczywisty bonus szczęścia. Planszówka zmienia się na jedną talię, telefon, ruch pionków i zaliczane korzyści online. Parametry i scenariusze są opisane jako propozycje, bez nowego GO na implementację. Rejestr obejmuje **241 zmian i 46 przypadków ręcznych NOT RUN**. Nie zmieniono kodu wersji 0.9.1.1, danych graczy, PRE-PROD, PROD ani finansowania. Historyczne CI aplikacji nie są wynikiem testu tych nowych mechanik.

**Późniejsze decyzje, wyłącznie dokumentacja:** pięć odpowiedzi do analizy zatwierdza cenę kumulacyjną, dynamiczne prefiksy, teleport sześciu kolonistów, limit 20 wysp łącznie, ochronę matki 12 także przed zdarzeniami oraz bazowy pułap ceny NPC. Rejestr ma teraz **229 zmian**; nowe karty 0826/0827 i zaktualizowane przypadki ręczne są specyfikacją, nie implementacją. Nie zmieniono aplikacji, jej wersji, stanu kont ani GCP. Poniższy tag 0.9.1.1 jest niezmiennym dowodem wcześniejszego kodu i dokumentacji z 227 kartami; nie jest dowodem CI tych późniejszych decyzji.

Ten wcześniejszy zapis 229 decyzji ma pełny SHA `51d55c1b4cb4a3b417902251de0dad11cee2726d`; [CI 41228251188](https://github.com/ksobczak321-oss/gra/actions/runs/41228251188) i [Pages 41228251189](https://github.com/ksobczak321-oss/gra/actions/runs/41228251189) mają SUCCESS. To odrębny dowód synchronizacji dokumentacji, bez zmiany mechanik i bez GCP. Nie obejmuje nowszego powyższego projektu społeczności/planszówki z 241 kartami, który wymaga własnego commitu i CI.

Po wcześniejszej publikacji v22.1 użytkownik zlecił nowe opracowanie. W DEV widoczna wersja w Ustawieniach to **0.9.1.1** (nowy moduł `harborlight-version.js`, cache `frontend-v23`). Implementacja obejmuje tę etykietę, rejestr zmian, ręczne przypadki oraz importer kart do Issues; mechaniki wielu wysp, pasażerów i nowego handlu są [analizą do decyzji](FRONTEND-V23-REQUIREMENTS.md), a liga/dobroczynność/planszówka są projektami. Kod aplikacji ma pełny SHA **`82152651a3edd490866a9c2c5f8cc5c4a7104492`**; [CI 41226626826](https://github.com/ksobczak321-oss/gra/actions/runs/41226626826) i [Pages 41226626838](https://github.com/ksobczak321-oss/gra/actions/runs/41226626838) mają **SUCCESS** dla tego SHA. Późniejsze odpowiedzi użytkownika i korekty projektów są odrębnym uzupełnieniem dokumentacji; ich końcowy odbiór zapisuje adnotowany tag `dev-0.9.1.1-20261031`. Tag v22.1 poniżej dotyczy wcześniejszej aplikacji.

Lokalnie **730 testów gry/synchronizacji/promocji + 62 backendu + 141 Python = 933 PASS**, ponadto **12 zestawów Chromium PASS**. Do testów Python wliczono 18 testów importera na izolowanych danych; nie tworzyły Issues. Sprawdzono widoczną wersję 0.9.1.1 po polsku i angielsku, na komputerze i telefonie, oraz zachowanie schematu świata 9. Ręczne przypadki nadal mają wynik NOT RUN.

**PRE-PROD nadal ma poniższy kod v22.1 `092e752…`, bez nowej etykiety 0.9.1.1.** W tym zakresie nie uruchomiono promocji GCP ani resetu kont, nie aktywowano płatności, darowizn lub publikacji społecznościowych. Rzeczywisty koszt GCP ostatnich 24 godzin jest niedostępny; przygotowana kwerenda nie jest pomiarem. Natywne Issues są nieopublikowane z powodu nieprawidłowego tokena; karty są przygotowane do synchronizacji przez właściciela.

Pakiet aplikacji dla `8215265`: **49 plików z manifestem, 10 838 477 bajtów**, SHA-256 archiwum `64be76270ffd19e7e6715f21cb06970fe5519fd54f1ce6e77104764b150489f4`, manifestu `89cfabb18cbdb831ad044c76c1b0c1a2b476ae65dffede1ff807db3d6777ec37`. Wszystkie 48 plików zawartości porównano bajtowo z pakietem sprawdzonym przez 12 zestawów Chromium. To lokalny dowód pakowania źródłowego wydania, nie artefakt promocji GCP. Dokładny końcowy SHA dokumentacji, jego CI/Pages i hashe własnego pakietu wiąże nieprzesuwany tag DEV; nie zastępuje on CI wymaganego przed przyszłą promocją.

## Historyczny odbiór v22.1 i pilnej poprawki 0.9.1.2

Uzupełnienie po uwagach ma nazwę **v22.1** (cache `frontend-v22-1`), pełny SHA **`092e75226fbb14cab09826f313e11d10891966d8`**. Adnotowany tag [dev-v22.1-20261031](https://github.com/ksobczak321-oss/gra/tree/dev-v22.1-20261031) został utworzony i opublikowany po sukcesie CI/Pages: wiąże commit, wyniki oraz hashe pakietu. Jest dowodem odbioru **DEV**, odrębnym od udanej promocji GCP opisanej poniżej. Odczyt tagu opisuje [proces wydań](RELEASE-PROCESS.md#niezmienny-dowód-odbioru-dev).

| Miejsce | Kod i dowód | Co pozostaje do wykonania lub potwierdzenia |
|---|---|---|
| **DEV — przestrzeń robocza** | **0.9.1.2**, źródło `3be1f9d2094f1432acacbb782eed1665fd00e6e1`, lokalne kontrole i własne CI/Pages SUCCESS. | Tag `pilne`; kod odebrany także na PRE-PROD. Projekty społeczne/planszowe odłożone. |
| **GitHub / CI — v22.1** | SHA `092e75226fbb14cab09826f313e11d10891966d8`; [CI 41221965032 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41221965032). Adnotowany tag **`dev-v22.1-20261031`** opublikowany. | Odczyt: `git show --no-patch dev-v22.1-20261031`. Nowe zmiany aplikacji wymagają własnego SHA i CI. |
| **GitHub Pages — podgląd DEV** | [Podgląd 0.9.1.2](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v23-1); Pages41233382382 SUCCESS dla3be1f9d. | Podgląd w pamięci, odrębny od kont PRE-PROD; bezpośredni odczyt tej sesji ogranicza brama sieciowa. |
| **PRE-PROD — GCP `harborlight-dev`** | **0.9.1.2 / `3be1f9d2094f1432acacbb782eed1665fd00e6e1`**, [41233737873 próba1 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41233737873); 2m10s, oba artefakty opublikowane. | Konta nie były resetowane. ZIP potwierdzenia nie został odczytany niezależnie; nie wnioskuj o włączeniu API z samego sukcesu. |
| **PROD — GCP `harborlight-prod`** | Projekt i docelowa domena `harborlight.pl` są wskazane przez właściciela. | Brak potwierdzonej publikacji gry, powiązania domeny, propagacji DNS i certyfikatu. Nie promujemy kodu bez przejścia PRE-PROD. |

Lokalny odbiór v22.1: **730 testów gry/synchronizacji/promocji, 62 backendu i 123 przygotowania/pakowania/konfiguracji — razem 915 PASS**, ponadto **12 zestawów Chromium PASS**. Pakiet przeglądarkowy ma 48 plików; wszystkie publiczne bajty porównano ze źródłami po testach. Odbiór jest izolowany: bez rzeczywistych zapisów lub resetów Google.

## Historyczna promocja PRE-PROD v22.1

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
