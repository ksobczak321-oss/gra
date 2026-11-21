# HARBORLIGHT — stan środowisk








## Kandydat DEV 0.15.3.1 / cache23 — drugi CI FAILURE, nowa publikacja PENDING

PUB 32d7d18 ma CI44940453474 **FAILURE 9 min 10 s**: 1896 Node/173 Python i osobne minigry PASS; pierwsze 7/60 głównych programów PASS. Ósmy guidance-smoke zatrzymał się przed przeglądarką na PermissionDenied prywatnego domyślnego katalogu;52 pozostałych main i 18cloud nie uruchomiono. Poprawka tylko portowalnej ścieżki testu ma lokalne5/5kontekstów PASS bez ustawiania zmiennej wyjścia; brak pełnegoCI PASS. CODE ace6/runtime/kanoniczne artefakty pozostają bez zmian, a historie 4f CI FAIL i 6e7 export FAIL zachowane.

Pages44940453447 ma osobny SUCCESS 29 s dla 32d:466 plików /96 673 009 bajtów przez normalny TLS i oba XLSX PASS. Nowy PUB3/CI/Pages są PENDING; brak nowego tagu DEV, GCP i bazowej kontroli kont. Odebrane PRE-PROD nadal 0.15.3.0/fc95/cache22. 519 kart /195 przypadków NOT RUN. [Zakres i historia](v32/GO-ADVISOR-TASKS.md) · [Dowody](v32/ADVISOR-TASKS-EVIDENCE.json).

## DEV i PRE-PROD 0.15.3.0 / cache22 — odebrane automatycznie

Kod aplikacji i kanonicznych eksportów: `f6572ee7500b42f56d1575de2e173d1bd635216c`; odebrana publikacja: `fc95a1aadf36a115538ed0b846f9ce48fbba651b`. Własny [CI44926983827](https://github.com/ksobczak321-oss/gra/actions/runs/44926983827) ma **SUCCESS 29 min 15 s**: 1831 Node, 173 Python i 76 programów Chromium. Bieżące [Pages44926983937](https://github.com/ksobczak321-oss/gra/actions/runs/44926983937) ma osobny SUCCESS; wcześniejsze nieudane Pages oraz nieudane i automatycznie anulowane CI pozostają historią. Standardowy [PRE-PROD44929856572/próba1](https://github.com/ksobczak321-oss/gra/actions/runs/44929856572/attempts/1) ma **SUCCESS 8 min 08 s**.

Rzeczywisty admin3 wystartował w **24,843 s**, a przez kolejne 10 s zwykłej gry zachował gotowy ekran i maksymalną przerwę 422.9000000000233 ms. Zapisy testowej przeglądarki były blokowane. UID kont i generacje 2 zachowano. Profile admin2 i admin3 pozostały identyczne bajtowo, z tymi samymi początkami i rewizjami 475/597 oraz niezmienionym zegarem admin3. Użytkownik jawnie potwierdził rozpoczęcie od nowa na admin1 podczas audytu: rewizja 332→379, populacja 12→18 i nowy początek wyspy. Tego postępu i początku nie opisujemy jako zachowanych; QA oraz wdrożenie nie zapisywały świata ani nie resetowały kont. Oba oryginalne ZIP-y, cztery warunki receipt, obraz API, dokładny TAR i wszystkie 462 publiczne pliki mają niezależny PASS. Oba XLSX sprawdzono osobno na Pages. Niezmienne tagi `dev-0.15.3.0-20261121` i `preprod-0.15.3.0-20261121` są zdalnie potwierdzone na tej samej publikacji.

[Zakres i zachowana historia](v32/GO-ADVISOR-GUIDANCE.md) · [Dowody](v32/ADVISOR-GUIDANCE-EVIDENCE.json). Ręczny odbiór wszystkich 187 przypadków: **NOT RUN**. Końcowe metadane nie zmieniają aplikacji, arkuszy ani tagów; bez resetu przez QA lub wdrożenie, zmiany haseł, PROD lub DNS. Potwierdzony restart właściciela admin1 opisano osobno. QA nie zapisywał przeliczonej wyspy. Poniżej zachowano poprzednie wydania w ich historycznym zakresie.

## DEV i PRE-PROD 0.15.2.4 / cache21 — odebrane

Naprawa admin3 jest wdrożona i automatycznie odebrana na **DEV i PRE-PROD**. Kod aplikacji i źródła artefaktów: `e394ea8fe369f9dfc6615b7a96da1c3e499672e6`; odebrana publikacja: `d5ad35cf530b9df62bc4e50d9e1d6e2c308fb63d`, **0.15.2.4 / `frontend-v32-21`**. [Gra PRE-PROD](https://harborlight-dev.web.app/harborlight-v1-layered.html?v=frontend-v32-21).

Własny [CI44569674535](https://github.com/ksobczak321-oss/gra/actions/runs/44569674535) ma **SUCCESS, 39 min 02 s**: 1784 Node, 173 Python i wszystkie 73 programy Chromium; niezmieniony watchdog 96 h przeszedł w 8084,649 ms przy limicie 10 000 ms. [Pages44569674475](https://github.com/ksobczak321-oss/gra/actions/runs/44569674475) ma **SUCCESS, 31 s**; normalny TLS potwierdził wszystkie 459 plików treści i osobno oba XLSX zgodne z Git. Standardowy [PRE-PROD44577083312/próba1](https://github.com/ksobczak321-oss/gra/actions/runs/44577083312/attempts/1) ma **SUCCESS, 12 min 34 s**, 39 kroków SUCCESS, 1 pominiętą diagnostykę i 0 FAIL.

Rzeczywisty admin3 uruchomił się w **280 120,832 ms** z obserwowanym Workerem: 2762 heartbeatów, maksymalna przerwa 498,2 ms. Przez następne 10 s zwykłej gry 1× zachował gotowy ekran: 91 heartbeatów, maksymalna przerwa 541,2 ms. Admin1 uruchomił się w 4695,791 ms. Wszystkie zapisy testowej przeglądarki były blokowane. Trzy istniejące profile są identyczne bajtowo przed i po wdrożeniu: UID, generacje 2, początki wysp, rewizje 120/373/591 i zegary pozostały zachowane. Pierwsze wejście właściciela nadal rozliczy nieobecność, ponieważ QA nie zapisywał przeliczonego świata.

Oba oryginalne ZIP-y, wszystkie 4 warunki receipt, obraz API po digest oraz pełne archiwum 460 plików / 96 565 038 bajtów mają niezależny PASS. Wszystkie 460 plików PRE-PROD pobrano przez normalny TLS i porównano z oryginalnym archiwum. Manifest budynków ma właściwe bajty i `Cache-Control: public, max-age=0, must-revalidate`. Niezmienne tagi `dev-0.15.2.4-20261119` i `preprod-0.15.2.4-20261119` są zdalnie potwierdzone na tej samej publikacji.

Pełne 47,885 h rzeczywistej kopii admin3 na C6 rozliczono w 356 697,123 ms: cały odkodowany model 849 981 bajtów jest identyczny z ukończonym C4 i C5, a zapis 345 429 bajtów mieści się w niezmienionym limicie 700 000. Potwierdzono 111 plików źródłowych i 43 źródła faktycznie skompilowane przez V8. Zachowano wszystkie historie i zasady; krótkie ticki i panel misji mają osobne kontrole responsywności. Oryginalny pełny B94 zatrzymał się na limicie CPU po 32,18 h symulacji, bez pełnego wyniku — nie jest opisany jako pełny PASS.

Świeże arkusze i minigry pozostają przypięte do kodu e394: master 158 kart / 58 bieżących / 63 921 wierszy / 128 źródeł / 200 wariantów, redakcyjny Excel 6 kart / 413 wierszy / ABC / pusta C / 110 odcisków. Trzynaście tabel gospodarki i rzeczywiste symulacje 24/24/72 h zachowują wyniki; 55 minigier i 110 instrukcji zachowuje treść. Ręczny odbiór użytkownika: **NOT_RUN**. Bez resetu, zmian zegara lub działań PROD/DNS. Końcowe uzupełnienie metadanych nie zmienia aplikacji, artefaktów ani tagów; jego ewentualny CI jest odrębnym przebiegiem.

[Zakres i historia](v32/GO-CHROME-PERFORMANCE.md) · [Dowody odbioru](v32/CHROME-PERFORMANCE-EVIDENCE.json).

Poniższe snapshoty zachowują wcześniejsze PENDING, błędy i QUALITY HOLD w ich pierwotnym kontekście. Bieżący odebrany stan opisano powyżej.

## Historia C6 — snapshot lokalny przed publikacją d5ad

Bieżący kandydat C6 jest **SOURCE_FROZEN / NOT_DEPLOYED**. Kod aplikacji i źródła eksportów **0.15.2.4 / `frontend-v32-21`** są zamrożone w `e394ea8fe369f9dfc6615b7a96da1c3e499672e6`. Własna publikacja, CI, Pages i PRE-PROD tego źródła pozostają oczekujące. PRE-PROD pozostaje b94 / 0.15.2.1 / cache18, z dawnym workflow SUCCESS i ponownie otwartym odbiorem jakości. Ostatnie w pełni odebrane wydanie to DDA / cache17. C5 / cache20 otrzymuje **QUALITY HOLD** po wykryciu regresji zwykłej gry po starcie; nie wolno go tagować jako odebrany ani kierować do GCP na podstawie samego sukcesu CI.

Kod C5 jest zamrożony na `41e0f8e103e00b18779ecd04645bca21a450cdc8`, publikacja na `3d0c8f001815b4dd52efcf4e43ef75ddb77e732a`. Jego własny [CI44559674101](https://github.com/ksobczak321-oss/gra/actions/runs/44559674101) zakończył się **SUCCESS, 32 min 54 s** (job 32 min 49 s): 1770 Node, 172 Python i wszystkie 73 programy Chromium (1+54+18). Było 36 kroków SUCCESS, 2 pominięte warunkowe diagnostyki i 0 FAIL. Niezmieniony watchdog 96 h z limitem 10 s przeszedł w 5500,521 ms. Nie anulowano tego przebiegu. Sukces CI nie zamyka odrębnego QUALITY HOLD C5. Main pozostaje na 3d do przygotowania nowego commita C6; dawny CI jest już zakończony. [Pages44559673862](https://github.com/ksobczak321-oss/gra/actions/runs/44559673862) ma osobny **SUCCESS, 34 s**. Normalny HTTPS/TLS potwierdził wszystkie 459 publicznych plików / 96 507 555 bajtów zgodnych z Git i osobno oba arkusze XLSX. To dowód publikacji bajtów, nie odbiór C5 ani C6 i nie test ciepłego cache przeglądarki.

Natywny Worker na prywatnej kopii admin3 w C5 rozliczył całe 47,885 h w 308,680 s; UI było gotowe po 316,580 s, poniżej istniejącego limitu 600 s. Podczas rozliczenia odnotowano 3081 heartbeatów i maksymalną przerwę 234,4 ms. Po gotowości, przez 10 s przy 1×, były 27 heartbeatów z maksymalną przerwą 1203,3 ms, poniżej zadeklarowanego limitu 1500 ms. Dodatkowy diagnostyczny warunek co najmniej 30 heartbeatów nie przeszedł: **surowy wynik harnessu FAIL pozostaje zachowany**. Spełnienie zadeklarowanych limitów startu i maksymalnej przerwy jest osobnym wynikiem, bez przepisywania surowego FAIL na PASS. To test responsywności kopii z własnym dekoderem; nie zastępuje oficjalnego dowodu zgodności całego modelu. Nie zapisywano wyspy ani zegara.

Niezależna próba oficjalnego modelu potwierdziła materialną regresję C5: z tego samego pełnego zapisu C4, po oficjalnym `restore` i 10 kolejnych tickach po 1 s, C4 zużył 882,791 ms łącznie, maksymalnie 157,687 ms na tick, a C5 **2869,763 ms / maksymalnie 393,629 ms** — około 3,25× wolniej. Cały odkodowany wynik 850 403 bajtów pozostaje identyczny, SHA-256 `e3a6ca606c088c8588e052006dd107a24fbb45a683e8d5357c62da6e708eb8a4`; nie wyłączano pól. Problem dotyczy kosztu zwykłych krótkich ticków, mimo szybszego pełnego nadrabiania nieobecności. To uzasadnia QUALITY HOLD także wtedy, gdy własny CI C5 zakończy się sukcesem.

C6 stosuje indeks historii C5 wyłącznie dla zewnętrznego przedziału dłuższego niż 60 s. Krótki publiczny tick zachowuje memo C4 i dawne pętle; zagnieżdżone wywołania dziedziczą wybór zewnętrznego zakresu. Próg wybiera algorytm pomocniczego odczytu, nie ogranicza nadrabianego czasu, nie zmienia kroku symulacji, zasad, EPS ani arytmetyki historii. Kierunkowe testy zakresu: **71 PASS**. `State.resourceRates` czyta historię jednym uporządkowanym przejściem z zachowaniem działań IEEE; **5 testów różnicowych PASS**. Profil ujawnił też koszt prognozy i klonowania świata w bocznym panelu misji, około 36,56%. Nowe `Missions.missionHeadline` pomija tę nieużywaną prognozę wyłącznie przy budowaniu nagłówka panelu; pełny `missionStatus` i akcje pozostają zachowane. Kierunkowe testy misji: **52 PASS**.

Natywny podgląd **końcowego C6**, uruchomiony na prywatnej kopii pełnego wyniku C4 bez dodatkowej nieobecności (`gap0`), ma **PASS**: zimny start 3,589 s, następnie 10 s zwykłej gry 1× z 79 heartbeatami i maksymalną przerwą 814,1 ms. Czas ścienny 10 093,1 ms odpowiada 10 093 ms symulacji; nie ma przyspieszenia zegara, błędów JS, zewnętrznych żądań ani zapisów wyspy lub zegara. Dziewięć odcisków kodu było stabilnych podczas próby. Podgląd używa lokalnego dekodera `upgradeRules:false`; opcjonalna różnica nazw nie jest ukrywana, a dowód oficjalnego modelu pozostaje osobny. Wcześniejszy C6 z przerwą 4017 ms i surowy C5 z 27 heartbeatami pozostają **FAIL** swoich wcześniejszych kodów. Końcowy PASS nie przepisuje tych wyników.

Pełny 47,885 h przebieg oficjalnego modelu C6 z całkowitą zgodnością stanu pozostaje **PENDING**; nie przypisujemy mu pełnego PASS z C5. Pełny lokalny frontend Node C6 ma **1599/1599 PASS**, exit 0 w 211,138 s, przy niezmienionym watchdogu 96 h **8737,606 ms** i limicie 10 000 ms. Źródło watchdogu zachowuje SHA-256 `de48ed0b4e096cdbecf4c451770aacf97af0f1f15174e9e2b48835ce96cdbaf5`. Pełny backend 178/178 i planszówka 7/7 mają PASS. To wyniki C6, odrębne od pierwszego nieudanego lokalnego zestawu C5. Świeże eksporty nowego źródła mają PASS opisany niżej. Niezależne 11 programów Python mają 145 PASS, a niezmienione 28 testów pakietu przeszły po stabilnym ponowieniu w 11,539 s: **łącznie 173 Python PASS**. Pierwsza próba pakietu miała 1 FAIL / 1 ERROR wskutek `ENOSPC` w katalogu tymczasowym; surowy wynik zachowano. Zwolniono około 847 MB wyłącznie odtwarzalnych kopii budowy, wskazanych manifestem i hashem. Wszystkie oryginalne ZIP/TAR, manifesty, zweryfikowane katalogi, raporty i prywatne referencje pozostały zachowane. Ponowiono dokładnie ten sam test, bez zmian aplikacji i jego asercji. Prywatne narzędzia audytu mają 60/60 PASS w 1,159 s; wcześniejszy błąd wiązania ROOT prywatnej konfiguracji również zachowano, a korekta dotyczy wyłącznie właściwej ścieżki roboczej. Nowy commit publikacyjny, własny CI i Pages pozostają **PENDING**. Wymagany hostowany test admin3 otrzymuje również 10 s zwykłej gry po gotowości z maksymalną przerwą heartbeatów 1500 ms, w tym samym standardowym jobie po starcie z limitem 600 s. Test nie ustawia zegara gry, nie zapisuje kont i nie zmienia czterech warunków receipt. Kierunkowy kontrakt konfiguracji ma 13 PASS i jest objęty ukończonym lokalnym zestawem 173 Python PASS opisanym niżej.

Pełny model C5, jego bezstratne pakowanie i kanoniczne artefakty zachowują własne wcześniejsze **PASS**: całe 47,885 h dało identyczny model 849 981 bajtów jak C4, zapis 345 429 bajtów mieści się w 700 000, a arkusze i rzeczywiste symulacje 24/24/72 h mają zero różnic wyników. Te dowody pozostają historią C5; nie są przypisywane nowemu C6. Oryginalna pełna referencja B94 nadal **PENDING**. Pierwsze lokalne 1583/1585 frontend PASS z dwoma nieaktualnymi oczekiwaniami oraz późniejsze 42 PASS po zmianach wyłącznie testów również pozostają oddzielne; pełnego lokalnego 1585 PASS nie deklarujemy.

Świeże artefakty kanoniczne z dokładnego `e394ea8fe369f9dfc6615b7a96da1c3e499672e6` / 0.15.2.4 mają budowę i niezależną świeżą walidację **PASS**. Master: 158 kart, 58 bieżących, 63 921 wierszy, 128 odcisków źródeł i 200 wariantów grafiki; 7 880 490 bajtów, SHA-256 `1ccb89d1f168682a93271abb564f8566a26ad6c0c73131c983b23331539914ff`. Redakcyjny Excel: 6 kart / 413 wierszy / ABC / pusta C, 110 odcisków, 60 329 bajtów, SHA-256 `047e5324175151aac52c3d95236e2a263d499d073a8bd4dcc05adc22eaea4517`. Trzynaście tabel liczbowych, katalogi, reguły i stan początkowy pozostają identyczne z BF2; trzy rzeczywiste symulacje 24/24/72 h porównano oddzielnie z BF2, C4 i C5 — cały JSON, liczby, typy i kolejność serializacji mają zero różnic. Zachowano 100 archiwalnych kart, 220 części ZIP, 48 komentarzy i 4982 buforowane formuły; 12 nowych formuł i 160 kontroli PASS. Katalog 55 minigier i 110 instrukcji, 1045 części DOCX i pięć kroków kontroli mają PASS; zmieniły się wyłącznie źródłowy SHA i 53 odwołania do tej samej kotwicy 1129→1140. Zasady i treści gier pozostają identyczne. ZIP instrukcji: 2 390 704 bajty, SHA-256 `3c7b77b07e002c0f321cc72f4af4091fff682795c7b909167038fbfc6cb708d5`.

C6 ma zamrożone źródło, lokalny PASS UI po gotowości, pełny lokalny Node, 173 Python i świeże artefakty. Nadal wymaga pełnego oficjalnego nadrabiania i zgodności całego modelu, własnego zielonego CI/Pages i standardowego `google-cloud-dev.yml`. Obowiązkowy hostowany test admin3 zachowuje limit 600 s i przerwę heartbeatów 1500 ms; admin1 nadal ma 30 s. Wszystkie zapisy testowej przeglądarki są blokowane. Brak resetu, pomijania nieobecności, zmiany zegara, PROD lub DNS. Ręczny odbiór C6 na DEV/PRE-PROD: **NOT_RUN**.

[Zakres i historia](v32/GO-CHROME-PERFORMANCE.md) · [Dowody](v32/CHROME-PERFORMANCE-EVIDENCE.json).

Poniżej zachowano snapshot gotowości lokalnego C5 sprzed publikacji 3d i późniejszego testu UI. Późniejsze fakty o własnym CI, Pages i QUALITY HOLD są opisane powyżej; starych wyników nie przepisuje się na odbiór C6.

## Historia C5 — snapshot lokalny 0.15.2.3 / cache20

Bieżąca naprawa jest **NOT_DEPLOYED**. PRE-PROD nadal serwuje b94 / 0.15.2.1 / cache18: jego workflow zakończył się SUCCESS, ale odbiór jakości pozostaje **FAIL** po wykryciu błędu ciepłego cache i zawieszania admin3. Tagu PRE-PROD tej paczki nie utworzono. Ostatnim w pełni odebranym wydaniem pozostaje DDA / cache17. Kod aplikacji i źródła przyszłych eksportów **0.15.2.3 / `frontend-v32-20`** są zamrożone w `41e0f8e103e00b18779ecd04645bca21a450cdc8`. Świeże artefakty kanoniczne mają PASS. Nowy commit publikacyjny, własny CI, Pages i standardowe wdrożenie pozostają oczekujące; zamrożenie lokalnego kodu i walidacja eksportów nie są publikacją.

Publikacja C4 `0bbe8c66c1f5a2c834ea7128968710e9f8662924`, z kodem i źródłami eksportów `62db46b75cbda3c74264504ebca15cade7b4e1e4`, ma rzeczywisty [CI44544378145](https://github.com/ksobczak321-oss/gra/actions/runs/44544378145) **FAILURE, 26 min 57 s**. Przeszły 1725 testów Node i 172 Python; niezmieniony watchdog 96 h zachował limit 10 s i przeszedł w 8475,193 ms. Główny zestaw przeglądarkowy zatrzymał się w 43. programie, `missions-game-v27-smoke.py`, na 30 s oczekiwaniu końca ładowania; 42 wcześniejsze programy i osobny program minigier przeszły, 18 programów chmurowych pominięto. Przy zatrzymanym zegarze testu dwa oczekiwania `requestAnimationFrame` blokowały start Workera. Poprawka C5 używa jednego `await Promise.resolve()` przed Workerem, zachowując anulowanie przez `MutationObserver`; nie uruchamia zegara gry ani nie wydłuża limitu testu. [Pages44544378307](https://github.com/ksobczak321-oss/gra/actions/runs/44544378307) ma osobny **SUCCESS, 35 s**. C4 nie ma nowego GCP ani tagu DEV/PRE-PROD 0.15.2.2.

Pełne 47,885 h rzeczywistego admin3 w zamrożonym C4 **zakończyło się**, lecz trwało 36 min 40,645 s czasu ściennego / 35 min 33,561 s CPU. To **QUALITY FAIL**: czas przekracza 30 min 30 s ważności bezczynnej sesji startowej. Worker chroni główny wątek, lecz tak długi czas obliczeń nadal uniemożliwia skuteczne wejście na konto. Wynik pozostał prywatną kopią; konto, wyspa i zegar nie zostały zapisane. Spakowany wynik miał również 849 981 bajtów przy istniejącym limicie 700 000 na świat. Bezstratne pakowanie zmniejsza tę samą pełną referencję do **351 861 bajtów**. Odtworzony pełny model, wszystkie liczby, 353 309 wierszy historii, 4973 węzły i 135 mieszkańców mają `deepStrictEqual` i kanoniczny JSON PASS; SHA-256 obu kanonicznych postaci wynosi `8f7ad7967394d89275aa1acd2b34c8d4ca31ef21e12d51f7784c071740ff8388`. Kolejność pól obiektu może być inna; nie deklarujemy identyczności niekanonizowanego JSON. Limity 700 000 bajtów na świat i 4 000 000 po rozpakowaniu sekcji pozostają bez zmian. To test transportu pełnej referencji C4, nie ukończonego przebiegu modelu C5.

Nowy zapis wymaga ochrony przed starszym klientem: dawny klient może po konflikcie odczytać nową rewizję CAS, a następnie nie odtworzyć nowego formatu historii. PUT otrzymuje więc jawny `savePackingVersion:1`; serwer odrzuca nieobsługiwany stary klient przed zapisem matki lub córki, jeżeli istniejący zapis używa nowego pakowania. Odrzucenie w lokalnym kliencie i PRE-PROD jest błędem bez automatycznego ponawiania lub nadpisania. Zamrożony stary czytnik bezpiecznie odmawia odczytu nowego formatu. **14 kierunkowych testów pakowania i backendu PASS** obejmuje tę odmowę, wersję 1, powrót do małego zwykłego zapisu, błędny format i dokładne przechowanie przesłanego ładunku przy aktualnej rewizji CAS. Niezależny przegląd pakowania i zabezpieczenia starego klienta: **PASS**. Osobne wąskie testy chmury 2 i API 11 również przeszły. Pełna lokalna regresja backendu ma 178/178 PASS; odbiór wdrożonego serwera pozostaje **PENDING**. Żadna historia nie jest usuwana, konto nie jest resetowane.

C5 przyspiesza odczyty historii posiłków w jednym atomowym `advancePopulation`: indeksuje wygasanie i częściowe skracanie tych samych wierszy oraz wyznacza certyfikowane granice starych uporządkowanych działań IEEE. Jednoznaczny wynik liczby kategorii diety jest używany bez ponownego pełnego skanowania; przypadki niejednoznaczne wracają do oryginalnego algorytmu. Historia, jej kolejność, zasady diety, EPS, czasy i wyniki gry pozostają zachowane. Struktury pomocnicze istnieją wyłącznie w pamięci danego wywołania i nie są częścią zapisu. Niezależny przegląd matematyki, indeksu i integracji: **PASS**.

Trzy dokładne porównania roboczych pomocników modelu C5, wykonane przed zmianą pakowania i cache20, mają **PASS całego JSON**, bez tolerancji liczbowej i ponownej normalizacji. Pierwsza godzina admin3 daje 239 055 bajtów i identyczny wynik jak B94/C4 w 6,524 s wobec 14,603 s C4. Kolejna godzina z checkpointu 9,78 h daje identyczne z C3/C4 9 226 855 bajtów w 8,147 s wobec 17,261 s C4. Późny checkpoint 26,27 h → następna godzina daje identyczne z zamrożonym C4 **23 458 927 bajtów**, SHA-256 `7633793b5ce81efaea093d2090d93865cf285ab3b77cf8218abb0e6fd476f6b5`, w **10,838 s wobec 37,081 s C4** w osobnych przebiegach (3,42×, około 70,8% mniej czasu). To dowody tych trzech przedziałów roboczych pomocników, odrębne od opisanego niżej pełnego przebiegu końcowego źródła. Wcześniejsze pełne C1–C3 zakończono bez wyniku; nie są oznaczane PASS.

Pełny przebieg rzeczywistej prywatnej kopii admin3 na zamrożonym `41e0f8e103e00b18779ecd04645bca21a450cdc8` ma **PASS**: 47,8851866667 h, ten sam stały cel 1795113034733 i 135 mieszkańców, zakończenie exit 0 w **366 650,233 ms czasu ściennego / 373 478,478 ms CPU**. To około 6 min 7 s wobec 36 min 41 s C4. Zapis ma **345 429 bajtów**, poniżej niezmienionego limitu 700 000. Porównanie odpakowało wyłącznie sekcje kodeka obu pełnych wyników, bez normalizacji, dodatkowego ticka lub wyłączania pól; kanonizowano jedynie klucze obiektów, zachowując kolejność tablic. Cały odtworzony model 849 981 bajtów jest identyczny z pełnym C4, SHA-256 `8f7ad7967394d89275aa1acd2b34c8d4ca31ef21e12d51f7784c071740ff8388`. Różnica 351 861→345 429 bajtów między wcześniejszą próbą transportu a pełnym C5 wynika z kolejności wejściowych pól kompresji, nie z różnicy odtworzonego modelu. Pełna pierwotna referencja B94 pozostaje **PENDING**; jej zgodności na całych 47,885 h nie deklarujemy. Nie zapisano wyspy ani zegara.

Powyższy pełny PASS pochodzi z lokalnego Node. Natywny Worker na rzeczywistej prywatnej kopii, następnie 10 s normalnej gry 1× po gotowości oraz rzeczywisty hostowany test admin3 z limitem 600 s są nadal **NOT_RUN/PENDING**. Czas lokalnego Node nie jest odbiorem limitu 600 s w przeglądarce.

Regresja Workera na roboczym C5/query19 ma **13 natywnych przypadków PASS**, w tym start i zakończenie przy zatrzymanym zegarze. Przeszły też **4 niezmienione scenariusze misji** PL/EN na desktopie i telefonie oraz **23 testy Node Workera**. Zegara nie uruchamiano pomocniczo, terminów i limitów nie zmieniano. To dowód komponentu z własnymi odciskami, sprzed końcowego cache20; nie zastępuje testów zamrożonego źródła ani rzeczywistego admin3 po publikacji.

Lokalny pełny frontend Node dla CODE41 zakończył się **1583/1585 PASS, 2 FAIL** w 203,900 s; nie jest przedstawiany jako pełny PASS. Dwa oczekiwania testów nie uwzględniały nowego transportu: ciało PUT w teście PROD pomijało `savePackingVersion:1`, a test 3600 mieszkańców czytał skompresowany kontener bez odpakowania. Zmieniono wyłącznie te dwa testy po zamrożeniu CODE41; runtime pozostał identyczny. Kierunkowe ponowienie obu plików ma **42/42 PASS w 3,172 s**. Pełny zestaw zostanie ponowiony przez własny CI nowego commita publikacyjnego. Niezmieniony watchdog 96 h zachował limit 10 000 ms i przeszedł w 8880,828 ms. Pełny backend **178/178 PASS w 7,231 s**, planszówka **7/7 PASS**. Pierwszy lokalny zestaw Python zatrzymał się na teście pakietu frontendowego: 28 przypadków / 1 FAIL. Przyczyną było równoległe generowanie katalogu minigier: test zapamiętał jeszcze `sourceCommit:62db46b`, a plik odświeżono do CODE41 w trakcie testu. To konflikt czasowy kontroli i generowania artefaktu, bez błędu kodu lub testu; zamknięta lista 460 wpisów i limity były prawidłowe. Po ustabilizowaniu artefaktów ten sam niezmieniony zestaw ma **28/28 PASS w 13,875 s**; zamknięta lista 460 plików oraz limity 512 wpisów / 128 MiB pozostają bez zmian. Pozostałe 11 programów mają 144 PASS, łącznie **172 Python PASS**. Pierwszy równoległy FAIL pozostaje zachowany. Końcowe kontrole stagingu, rejestru zmian, listy ręcznej i stron prawnych mają PASS.

Świeże artefakty dla dokładnego CODE41 / 0.15.2.3 mają budowę i niezależną ponowną walidację **PASS**. Master ma 158 kart / 58 bieżących / 63 897 wierszy,128 odcisków źródeł i 200 wariantów grafik, 7 878 083 bajty, SHA-256 `55355d2daf9d968a35fb00f62f9799014c48e3911af570d5b857e60e5bf239b7`. Redakcyjny Excel zachowuje 6 kart / 413 wierszy / kolumny ABC i pustą C, 110 odcisków źródeł, 60 329 bajtów, SHA-256 `d36ad175836c078e342cee4c11b134dd7c6e91d798126a2267b7856b9a0d7552`. Trzynaście tabel wyników gospodarki, katalogi, reguły i stan początkowy są identyczne z wcześniejszym BF2/B94/C4. Trzy rzeczywiste symulacje kanoniczne 24/24/72 h zachowują cały JSON, checkpointy, komendy, typy, liczby i kolejność serializacji — zero różnic. Zachowano 100 archiwalnych kart, 220 części ZIP, 48 komentarzy i 4982 buforowane formuły; 12 nowych formuł i 160 kontroli zgodności z kodem mają PASS. Katalog 55 minigier i 110 instrukcji ma PASS wszystkich pięciu kroków i 1045 porównanych części DOCX; zmieniła się wyłącznie proweniencja SHA, bez przesunięcia kotwic lub zmian zasad i instrukcji. Prywatne narzędzia kontroli oryginalnych artefaktów i publicznych bajtów przeszły 60/60 testów; to gotowość kontrolerów, nie dowód nieuruchomionej jeszcze publikacji.

Przed nową promocją pozostają: końcowe regresje zamrożonego źródła, natywny odbiór rzeczywistego admin3 i zwykłej gry po gotowości, własny zielony CI i Pages oraz standardowy `google-cloud-dev.yml`. Pełny lokalny wynik modelu, jego poprawne pakowanie i kierunkowa ochrona starego klienta mają własne PASS powyżej. Obowiązkowy natywny test admin3 zachowuje limit 600 s, heartbeat i kontrolę Workera przy starcie powyżej 30 s; admin1 nadal ma 30 s. Wszystkie zapisy testowej przeglądarki są blokowane. Brak pomijania nieobecności, resetu kont, zmiany zegara, działań PROD lub DNS. Ręczny odbiór C5 na DEV i PRE-PROD: **NOT_RUN**.

[Zakres i historia](v32/GO-CHROME-PERFORMANCE.md) · [Dowody](v32/CHROME-PERFORMANCE-EVIDENCE.json).

Poniższa sekcja cache19 zachowuje wcześniejszy snapshot C4 sprzed końca CI i pełnego przebiegu. Rozstrzygające późniejsze wyniki oraz bieżący kandydat C5 są opisane powyżej.

## Hotfix 0.15.2.2 / cache19 — manifest i blokada startu admin3

Dodatkowy test rzeczywistego ciepłego cache wykazał materialny błąd pierwszej paczki: stary manifest e5 miał `Cache-Control: public, max-age=86400`. Nowy kod b94/cache18 brał ten sam adres z dysku, bez ponownego żądania do serwera. Powracały pełne atlasy i kolejność Zakład/Kamieniołom 962/972. Test używał prawdziwego HTTP i cache Chrome, bez czyszczenia cache, Playwright routing lub operacji na kontach. Ocena tego wariantu: **QUALITY FAIL**.

Wcześniejsze [CI44520278661](https://github.com/ksobczak321-oss/gra/actions/runs/44520278661) i [GCP44526548282/próba1](https://github.com/ksobczak321-oss/gra/actions/runs/44526548282) dla b94 zachowują rzeczywiste **SUCCESS** (38 min 20 s i 6 min 44 s). Pozytywny ręczny odbiór „tak jest ok” i tag DEV `dev-0.15.2.1-20261119` dotyczą wyłącznie pierwszej paczki. Późniejsza kontrola ciepłego cache ponownie otwiera odbiór; tagu PRE-PROD tej paczki nie utworzono.

Niezależna kontrola pierwszego wdrożenia b94 potwierdziła oba oryginalne ZIP-y, wszystkie cztery warunki receipt oraz identyczne archiwum455plików. Zachowano UID i generację2 wszystkich trzech istniejących wysp. Rewizje przed/po wyniosły107→119,34→34 i591→591; admin1 kontynuował grę, a pełne ładunki admin2 i admin3 są identyczne. Kontrole były odczytowe. Te dowody potwierdzają integralność publikacji i zachowanie kont; nie usuwają błędów ciepłego cache i startu admin3 ani nie tworzą odbioru PRE-PROD.

Zgłoszenie „Admin3 na pre prod wisi pozostałe chodzą” odtworzono na prywatnej kopii rzeczywistego zapisu, bez zapisów do konta. Authentication i API działają; admin3 ma generację2, rewizję591, 97 mieszkańców i prawie48h do rozliczenia. Zegar zwraca1×. Przeglądarka zatrzymuje heartbeat po rozpoczęciu synchronicznego `advanceArchipelago`, bez błędów JS; odczyt zapisu i jego odtworzenie są szybkie. Pierwsze2000 zdarzeń nadal przesuwało czas, więc nie potwierdzono stałej pętli drobnego kroku. Problemem jest długie nadrabianie czasu na głównym wątku oraz wielokrotne wyliczanie statusów mieszkańców i produkcji. Dotychczasowy test UI publikacji b94 obejmował admin1; poprawny odczyt wszystkich trzech kont nie był dowodem uruchomienia admin3.

Bieżący kandydat **C4 / 0.15.2.2 / cache19** łączy przeniesienie początkowego rozliczenia do Workera z ograniczeniem powtarzanych obliczeń diety do jednego `advancePopulation`, z jawnym unieważnianiem po każdej zmianie wejść. Worker używa jednego wywołania istniejącego modelu ze stałym czasem docelowym; transport zachowuje pełny stan bez kompaktowania zapisu, a przed adopcją ponownie potwierdzane są sesja, generacja, rewizja i zegar. Zamknięcie strony, wylogowanie, zmiana konta lub nowszego zapisu odrzucają wynik. Nie zapisuje się częściowo przeliczonego świata. Zakończony klient startowy jest zwalniany, aby nie zatrzymywać starej kopii świata.

Testy komponentu Workera: **23 Node i 12 natywnych przypadków przeglądarkowych PASS**. Publiczny scenariusz 97 osób, 35 pracowników i 48 h zakończył pełny stały przedział w jednym Workerze przy 602 sygnałach heartbeat i maksymalnej przerwie74ms, bez błędów JS. To skonstruowany scenariusz testowy, nie odbiór prywatnego admin3. Sprawdzono również anulowanie, zmianę rewizji i zegara oraz ponowne rozliczenie czasu pozostałego po wolnym potwierdzeniu. Po małym zwolnieniu pamięci klienta ponownie przeszły 26 przypadków startu, 4 wydajności i rzeczywisty ciepły cache. Dowody komponentowe mają własne odciski plików; pierwszy przebieg Workera obejmował C3, a kontrole następcze nie są odbiorem końcowego C4 ani zamrożonego później źródła62db46b.

Wcześniejszy C3 dał dokładnie taki sam JSON pierwszej godziny rzeczywistego zapisu jak B94: 11,103s wobec32,351s. Dalszy checkpoint około9,78h ujawnił jednak77 636 wierszy historii posiłków / 8,26MB i nieakceptowalny czas dalszych obliczeń; szacunek pełnego przebiegu wynosił około30min. Dlatego C3 nie jest kandydatem do odbioru. C4 zachowuje tę historię i zasady, a przyspiesza wyłącznie ponawiane odczyty: 18 kierunkowych testów zakresów i unieważniania PASS. Dokładne porównania C4 mają **PASS** dla dwóch całych wyników: pierwsza godzina rzeczywistego admin3 jest identyczna bajtowo z B94 (239 055 bajtów), a kolejna godzina z gęstego checkpointu9,78h daje identyczne9 226 855 bajtów jak C3, bez ponownej normalizacji. Pierwsza godzina C4 trwała14,603s — więcej niż11,103s dla wcześniejszego C3; nie deklarujemy ogólnego przyspieszenia zimnego stanu. Godzina gęstego checkpointu C4 zajęła17,261s czasu ściennego /20,778s CPU. Czas referencji C3 obejmuje celowe wstrzymanie procesu, więc nie służy do wyznaczania dokładnego przyspieszenia. Pełne47,885h C4 i jego porównanie z pełną referencją B94 pozostają **PENDING**; zlecono osobny pełny przebieg i wznowienie zachowanej referencji. [Lokalny odbiór admin3](v32/ADMIN3-OFFLINE-CATCHUP-LOCAL-ACCEPTANCE.json) rozdziela te dowody od nieukończonej pełnej referencji. Wcześniejsze pełne przebiegi C1–C3 zostały zastąpione bez końcowego wyniku; nie opisuje się ich jako PASS. Długi referencyjny B94 był wstrzymany po około15h symulacji i21min CPU; jego ukończenie nie jest jeszcze potwierdzone.

Standardowy PRE-PROD otrzymuje osobny obowiązkowy test rzeczywistego admin3 z limitem600s, kontrolą heartbeat i obserwacją Workera, gdy start przekracza30s. Dotychczasowy limit30s dla admin1 pozostaje bez zmian. Wszystkie zapisy przeglądarki są blokowane, a schemat receipt nadal ma cztery warunki; dodany test admin3 musi przejść w tym samym standardowym jobie. Źródło C4 jest zamrożone na62db46b; pełny przebieg47,885h, rzeczywisty start admin3, własny CI i nowa publikacja pozostają **PENDING**. Bez pomijania nieobecności, usuwania historii, resetowania konta lub zmiany jego zegara.

Lokalny test ciepłego cache roboczego cache19 ma **PASS**: dwie kontrole negatywne, trzy rzeczywiste starty gry, pięć żądań manifestu z ponowną walidacją i końcowym304; bez czyszczenia cache, Playwright routing, starych atlasów, błędów JS lub zapisów chmurowych. Widoczna kolejność Zakład/Kamieniołom1000/972 jest prawidłowa. To kontrola roboczego kodu przed zamrożeniem, nie odbiór nowego wydania.

Kod aplikacji i źródła eksportów **0.15.2.2 / cache19** są lokalnie zamrożone w `62db46b75cbda3c74264504ebca15cade7b4e1e4`. Pełny frontend Node ma **1548/1548 PASS** w210,141s; niezmieniony watchdog96h z limitem10s przeszedł w8418,451ms. Backend170 i planszówka7 PASS. Testy pakietu28/28 PASS po poprawieniu dwóch nieaktualnych oczekiwań455→458 dla trzech jawnie wymaganych modułów Workera; pierwszy błąd zachowano. Limity512wpisów/128MiB pozostają bez zmian. Korekta dotyczy testu pakietu w przyszłym commicie publikacyjnym, bez zmiany zamrożonego runtime.

Kanoniczne artefakty ze źródła62db46b mają budowę i świeżą walidację **PASS**: master158kart,58bieżących,62 998wierszy,123odciski źródeł i200wariantów grafik (7 789 221bajtów, SHA-256 `3a94bf8397a09c0eef2e890e32fee3acf1133e2bc0c7e9ade0b1d103d26472d7`); redakcyjny Excel6kart/413wierszy/pustaC/108odcisków (60 328bajtów, SHA-256 `7250f176b7e8e7f2b0717b0f587a2b868a64a5cc53f51b406891715673edac7f`). Trzynaście tabel wyników gospodarki, katalogi, reguły i stan początkowy są identyczne z BF2/B94. Rzeczywiste kanoniczne symulacje24/24/72h zachowują wszystkie checkpointy, komendy, typy, liczby zmiennoprzecinkowe i kolejność serializacji — zero różnic. Katalog55minigier i110instrukcji odświeżono wyłącznie w proweniencji, z przesunięciem istniejącej kotwicy1127→1129. To osobne dowody od nadal nieukończonego pełnego47,885h rzeczywistego admin3.

Fizyczny PRE-PROD nadal serwuje b94: workflow zakończył się sukcesem, lecz odbiór jakości jest ponownie otwarty. Ostatnim w pełni odebranym wydaniem pozostaje DDA/cache17. Nowy commit publikacyjny, jego własny CI i Pages oraz standardowe wdrożenie z wymaganym testem admin3 są **PENDING**. Kod62db46b po zamrożeniu nie jest zmieniany; obecne dokumenty i artefakty nie są dowodem publikacji.

Rutynowa poprawka **0.15.2.2 / `frontend-v32-19`** obejmuje wersjonowany adres manifestu, `fetch` z `cache:no-cache` i osobny nagłówek Hostingu wymuszający świeży manifest zamiast ogólnej polityki zasobów 24 h. Nie wymaga czyszczenia cache przez gracza ani nowej zgody na naprawę. Kod i źródła eksportów są zamrożone na62db46b; nowa publikacja, jej własny CI, Pages, tag oraz standardowy PRE-PROD pozostają **PENDING**. Ręczny odbiór nowego DEV i PRE-PROD: **NOT_RUN**. Dawne pomiary wydajności opisują pierwszego roboczego kandydata, nie nowy benchmark cache19. Grafiki, zasady, konta i postęp zachowane; bez PROD, DNS i resetu.

[Zakres hotfixa i historia](v32/GO-CHROME-PERFORMANCE.md) · [Dowody i oddzielny snapshot cache18](v32/CHROME-PERFORMANCE-EVIDENCE.json).

Poniższy snapshot pierwszej paczki zachowuje wcześniejszą chronologię, w tym stan sprzed zakończenia GCP i wykrycia błędu ciepłego cache. Bieżący stan dotyczy hotfixa cache19 powyżej.

## Naprawa wydajności Chrome i warstw — DEV odebrany, PRE-PROD w trakcie

Zgłoszenia z 19 listopada obejmują wolny start, okresowe zawieszanie Chrome i zasłonięty domek producenta skór. Izolowane porównanie rzeczywistych obrazów obniżyło transfer startowy z 52 630 275 do 12 749 925 bajtów (−75,8%). Lokalny start desktop zmienił się z 3,60 na 2,46 s, telefon 2× z 2,98 na 1,68 s; renderer RSS odpowiednio z około 748 do 553 MB i z 717 do 516 MB. Pomiar czasu pochodzi z roboczego kandydata przed zamrożeniem, lokalnego HTTP i headless Chromium; nie obejmuje publicznej sieci, a RSS nie jest samą stertą JS. Nie odtworzono crashu procesu.

200 osobnych kadrów ma ścisłą zgodność RGBA, a 22 oryginalne WebP pozostają zachowane. Loader pobiera bieżące warianty 20 rodzin i ewentualny dodatkowy kadr dekoracyjnej chatki zależnej od Ratusza, z ograniczonym dekodowaniem. Woda rysowana bezpośrednio przez przygotowane maski usuwa koszt pośredniej pełnoekranowej kopii; 5 testów wody i 13 sektorów wybrzeża PASS. Jawny pakiet zachowuje stare atlasy dla zgodności i dodaje nowe kadry: 455 plików, limit 512 wpisów / 128 MiB, 28 testów pakietu PASS. Cały artefakt jest większy, lecz start pobiera mniejszy podzbiór.

Kamieniołom zasłaniał około 44% pierwszego wariantu Zakładu skórzanego przez błędną kolejność rysowania. Jedyny dodatkowy wyjątek w dawnych metadanych to `leatherworks.paintDepth=500`; bez przesunięcia, skalowania lub zmiany grafiki i hotspotu. Analityczna kontrola obejmuje 100 kombinacji wariantów; końcowy rzeczywisty UI cache18 potwierdził kolejność Zakład/Kamieniołom 1000/972. Łącznie kierunkowe Node: 26/26 PASS (21 budynków + 5 wody).

Kod **0.15.2.1 / `frontend-v32-18`** jest zamrożony na `bf2f4ac12c1ef1cd69adb8c3e572649fdc975190`. Wszystkie 4 końcowe programy przeglądarkowe PASS: wydajność, runtime budynków, 26 przypadków startu i front w 4 szerokościach; bez prawdziwych zapisów i błędów JS. Pierwszy lokalny frontend Node miał 1500/1501 PASS — niezmieniony watchdog 10 s przekroczony przy równoległych zestawach, osobny identyczny przypadek PASS w 9335,864 ms, bez zmiany limitu; backend170 PASS. Ten wcześniejszy lokalny wynik pozostaje w historii. Publikacja `b94af8befa671d936eeaf6e4be9b933cbf61ff08` zachowuje kod i eksporty bf2. Jej [CI44520278661](https://github.com/ksobczak321-oss/gra/actions/runs/44520278661) ma **SUCCESS, 38 min 20 s** (job 38 min 16 s): 1501 frontend + 170 backend + 7 planszówki = 1678 Node, 168 Python i 71 programów Chromium (1 + 52 + 18); 36 kroków SUCCESS, 2 pominięte warunkowe diagnostyki i 0 FAILURE. Niezmieniony watchdog 10 s przeszedł w 6358,099351 ms. [Pages44520278629](https://github.com/ksobczak321-oss/gra/actions/runs/44520278629) **SUCCESS28s**; normalny TLS potwierdził 454 publiczne pliki / 96 462 542 bajty. Natywny lokalny HTTPS Chromium nadal BLOCKED_CERT_AUTHORITY, bez obejścia TLS. Tag `dev-0.15.2.1-20261119`, obiekt `38d0bb099e7bd5fff16ba46e5aa790a2cfc2664e`, jest zdalnie potwierdzony na b94. Standardowy PRE-PROD44526548282/próba1 rozpoczął się 19 listopada o 13:43:32 czasu Warszawy (12:43:32 UTC), ze źródłem b94; trwa, bez potwierdzonego receipt, oryginalnych artefaktów i tagu PRE-PROD. Obowiązuje DEV → zielony CI końcowego źródła → standardowy PRE-PROD. Konta, postęp, zasady i zaakceptowane grafiki zachowane; bez PROD, DNS lub resetu. Ręczny odbiór DEV **PASS**: użytkownik 19 listopada potwierdził „tak jest ok” dla b94/cache18, a następnie jawnie zlecił „wrzuć na preprod”. PRE-PROD jest w trakcie; jego ręczny odbiór nadal **NOT_RUN**. Dawny lokalny checkpoint bf2 nie jest przepisywany. Wcześniejsze odebrane 0.15.2.0 pozostaje poniżej jako historia.

Paczka b94 ma 455 plików / 96 517 666 bajtów. Artefakty bf2 są gotowe: master 158 kart / 58 bieżących / 62 568 wierszy / 120 źródeł / 200 wariantów oraz redakcyjny Excel 6 kart / 413 ABC / pusta C / 105 źródeł mają budowę i świeżą walidację PASS. Rzeczywiste symulacje 24/24/72 h i identyczność 14 tabel gospodarki PASS; 55 minigier i 110 instrukcji zachowuje semantykę po odświeżeniu proweniencji do bf2f4ac. [Zbiorczy lokalny odbiór](v32/CHROME-PERFORMANCE-LOCAL-ACCEPTANCE.json). Własny CI SUCCESS, nowa promocja w trakcie; main pozostaje zamrożony na b94 do jej zakończenia, bez dokumentacyjnego push.

[Zakres](v32/GO-CHROME-PERFORMANCE.md) · [Dowody i bieżący status](v32/CHROME-PERFORMANCE-EVIDENCE.json).

## DEV i PRE-PROD 0.15.2.0 / cache17 — odebrane

GO użytkownika obejmuje wszystkie 20 funkcji wyspy i dekoracyjną chatkę: 10 wyglądów dla par poziomów 1–2 do 19–20, wspólne warianty na mapie i w menu, średniowieczny żuraw tylko podczas rzeczywistej budowy. Powyżej poziomu 20 pozostaje ostatni wygląd; limit poziomów i model gospodarki bez zmian. Ozdobna chatka nie ma funkcji ani przycisku, a jej wygląd podąża za Ratuszem. Teatr zachowuje funkcjonalny poziom1 i również zmienia wygląd według Ratusza. Port zachowuje istniejący statek.

Przygotowano 200 wariantów, 22 obrazy WebP bez strat (32 305 562 bajty; potwierdzona identyczność pikseli RGBA z wygenerowanymi PNG), 26 masek terenu i osobną galerię. Zamknięta lista pakietu zachowuje granicę 256 wpisów i limit 80 MiB, który pozwala utrzymać pełną jakość. Nowe testy modelu prezentacji: 17/17 PASS. Przegląd 200 wariantów i rzeczywisty runtime PASS; pełny program startu przeszedł w końcowym CI oraz na lokalnie odtworzonych publicznych bajtach. Wcześniejszy lokalny timeout pozostaje w dowodach. Arkusze odświeżone i świeżo zwalidowane: master ma 158 kart (100 archiwalnych i 58 bieżących), 62 497 bieżących wierszy i 120 odcisków źródeł, w tym tabelę 200 wariantów. Redakcyjny Excel zachowuje 6 kart, 413 wierszy i pustą kolumnę C. Późniejsze GO obejmuje PRE-PROD z Doradcą Królestwa, krótkim wprowadzeniem i zaakceptowanymi zmianami z Excela.

DEV **0.15.2.0 / cache `frontend-v32-17`** jest odebrany dla źródła `dda2fa1793e49ec23811ccffb147a7e56a366692`. [CI44287093749](https://github.com/ksobczak321-oss/gra/actions/runs/44287093749) zakończył się **SUCCESS 35 min 15 s** (job 34 min 54 s): 1492 testy frontend, 170 backend i 7 planszówki, łącznie 1669 Node, 167 Python i wszystkie 70 programów Chromium (1 osobnych minigier + 51 głównych + 18 chmurowych). [Pages44287093698](https://github.com/ksobczak321-oss/gra/actions/runs/44287093698) ma **SUCCESS 41 s**. Niezmienny tag `dev-0.15.2.0-20261118`, obiekt `8e896679845498da472156697c1a412635cf8443`, jest zdalnie potwierdzony na tym samym źródle.

Pakiet ma 255 plików / 69 289 150 bajtów, w tym generowany manifest wydania. Normalny HTTPS/TLS potwierdził wszystkie 254 publiczne pliki Pages / 69 262 846 bajtów zgodne z Git; obu publicznych arkuszom również sprawdzono pełne SHA-256. Odtworzenie pobranych publicznych bajtów lokalnie przeszło program budynków, cztery szerokości mapy oraz pełny start. Natywna przeglądarka HTTPS w tej infrastrukturze pozostaje **BLOCKED: ERR_CERT_AUTHORITY_INVALID**; nie obchodzono TLS i nie deklaruje się jej PASS.

Standardowa promocja [PRE-PROD44292700743/próba1](https://github.com/ksobczak321-oss/gra/actions/runs/44292700743) dla dokładnie tego samego źródła zakończyła się **SUCCESS 6 min 51 s**, 18 listopada **12:13:25–12:20:16 czasu Warszawy (11:13:25–11:20:16 UTC)**. Gate: 7 s / 7 kroków SUCCESS; deploy: 6 min 35 s / 32 kroki SUCCESS i 1 pominięta diagnostyka. Natywny odbiór hostowanych minigier przeszedł 110 plansz, 100 wariantów opowieści i 110 dokumentów. Natywny test istniejącej zalogowanej wyspy potwierdził 254 dokładne hashe zasobów, z zablokowanymi wszystkimi zapisami przeglądarki. Kontrola kont potwierdziła 3 logowania, 3 istniejące zapisy, 0 pustych wysp i izolację dostępu: odmowy 6 obcych i 3 anonimowych odczytów Firestore, 3 własnych bezpośrednich oraz 3 anonimowych API; 3 własne odczyty API PASS. Niezależne porównanie przed/po potwierdziło niezmienione UID, generacje 2/2/2, rewizje 54/9/591 i pełne ładunki wszystkich trzech zapisów. Nie zmieniono kont ani postępu. Niezależnie pobrano i sprawdzono oba oryginalne ZIP-y GitHub po rozmiarze i SHA-256; standardowa walidacja receipt potwierdziła wszystkie 4 kontrole, obraz API po digest oraz identyczne archiwum i manifest frontendu. Normalny TLS potwierdził wszystkie **255 plików PRE-PROD / 69 289 150 bajtów** identyczne z oryginalnym archiwum. Tag `preprod-0.15.2.0-20261118`, obiekt `99899f7585b0fd9adb4686b5dfd0c331a19ca089`, jest zdalnie potwierdzony na tym samym źródle. **DEV i PRE-PROD są odebrane.** PROD, DNS i reset poza zakresem. Ręczny odbiór użytkownika **NOT_RUN**.

[Pełny odbiór DEV i PRE-PROD](v32/BUILDING-UPGRADE-ART-PREPROD-ACCEPTANCE.json) · [Gra PRE-PROD](https://harborlight-dev.web.app/harborlight-v1-layered.html?v=frontend-v32-17) · [Galeria PRE-PROD](https://harborlight-dev.web.app/harborlight-building-gallery.html?v=frontend-v32-17).

[Zakres](v32/GO-BUILDING-UPGRADE-ART.md) · [Dowody](v32/BUILDING-UPGRADE-ART-EVIDENCE.json) · [Grafiki](v32/BUILDING-UPGRADE-ART-ASSETS.json).

[Gra DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-17) · [Galeria 200 wariantów](https://ksobczak321-oss.github.io/gra/harborlight-building-gallery.html?v=frontend-v32-17).

Pierwszy CI44279863651 dla9fc8cb1 zakończył się FAILURE na odciskach katalogu minigier. Odświeżono katalog i110 instrukcji bez zmian treści poza źródłowymSHA; kolejny SHA wymaga własnego pełnego CI. [GO PRE-PROD](v32/GO-PREPROD-0.15.2.0.md).

Dodatkowy odbiór wykrył zasłonięcie żurawia wysokiej Latarni przez HUD w cache16. Cache17 przenosi go obok podstawy wieży: 160/160 przypadków DOM/alpha i 4 kontrole negatywne PASS, 38 pozycji innych rodzin bez zmiany. Cache16 nie jest promowany do PRE-PROD.

## Doradca Królestwa — DEV 0.15.1.0 / cache15, odebrany

Pierwsze wprowadzenie ma trzy kroki: **górny pasek → dolne menu → Gospodarstwo**. Dalsze rady i rozmowa z doradcą są dobrowolne. Pełny katalog i 25 lekcji pozostają w Pomocy, z zachowaną historią i nagrodami.

Uwzględniono pięć fioletowych zakładek, także jasnofioletowe „Odłożone odkrycia”: 175 wierszy, 34 niepuste C, 35 poprawionych tekstów i 10 dodanych rekordów katalogu. Siedem projektów pozostaje odłożonych. Testy kierunkowe: 30/30 PASS. Pełny master ma źródło 76a663d: obejmuje 157 arkuszy i 61 971 bieżących wierszy, a arkusz redakcyjny ze źródła abacd3f ma 6 zakładek, 413 wierszy i pustą kolumnę C. Budowa i niezależna walidacja przeszły.

DEV 0.15.1.0 / cache15 z poprawką CSS layout2 odebrany dla źródła `4dcc34ec3b462992330f88a22062070fcc0f7092`: [CI44164876130](https://github.com/ksobczak321-oss/gra/actions/runs/44164876130) i [Pages44164876499](https://github.com/ksobczak321-oss/gra/actions/runs/44164876499) **SUCCESS**. 1475 testów frontend, 170 backend, 7 planszówki i wszystkie 69 programów Chromium PASS; master i oba arkusze zwalidowane. Wszystkie 229 plików (36 879 151 bajtów) pobrano przez HTTPS i porównano z wersją w Git. Natywny HTTPS Chromium w tej infrastrukturze ma ograniczenie certyfikatu; odtworzenie rzeczywistych publicznych bajtów lokalnie PASS, bez obchodzenia TLS. Tag `dev-0.15.1.0-20261117` opublikowany i zdalnie potwierdzony na tym samym źródle. Poprzednie CI44141264184,44148037986,44154508808,44160545938 pozostają FAILURE. Doradca pozostawia dostęp do mapy na 320 i 390 px i dolnego menu starszych zapisów, także po wyciszeniu. Ręczny odbiór użytkownika: NOT_RUN. **Zakres: wyłącznie DEV.**

[Zakres](v32/GO-KINGDOM-ADVISOR.md) · [Dowody](v32/KINGDOM-ADVISOR-EVIDENCE.json) · [HL-CHG-1159](tracking/changes/HL-CHG-1159.md).


## Osobne minigry — DEV 03f odebrany, pierwszy PRE-PROD FAILURE

Źródło `03f39a2e8e8854208548ba53dc842aae5955e2af` ma CI 44087431085 SUCCESS 36 min 49 s (1622 Node, 167 Python, 67 Chromium), Pages 44087430928 SUCCESS 52 s i niezmienny, zdalnie potwierdzony tag `dev-minigames-20261117` (obiekt e1538ee8adb3e7801e0f47a3a4103eef7bc37b7b). Gotowe 55 gier i 110 instrukcji obejmują 100 wariantów opowieści; lokalne i dokładnie pakowane testy zachowują własny PASS.

PRE-PROD 44093734171/próba1 zakończył się **FAILURE 6 min 03 s**: gate SUCCESS 8 s, deploy 134075407035 FAILURE 5 min 46 s. Hosting i manifest opublikowano, ale końcowa asercja natywnego testu minigier wykryła 221 HTTP404 dla `/app.js?v=minigames-1`. Główna wyspa, trzy konta/izolacja i publikacja udanych artefaktów zostały pominięte. Ten przebieg nie ma udanego receipt ani tagu PRE-PROD. Niezależny TLS potwierdził wszystkie 226 plików / 36 847 438 bajtów, w tym 55 DOCX i 55 TXT; zgodność bajtów nie jest pełnym odbiorem interfejsu.

Bug [HL-CHG-1158](tracking/changes/HL-CHG-1158.md) obejmuje dynamiczny bezwzględny bootstrap i regresję adresu bez ukośnika z HTTP200 zamiast maskującego HTTP301. Nowe źródło, własny CI i nowy standardowy PRE-PROD są PENDING. Katalog, dokumenty, modele, Excel/MERGE i wersja 0.15.0.2/cache13 bez zmiany; bez resetu i PROD/DNS. [Zakres](v32/GO-MINIGAMES-STANDALONE.md) · [Dowody](v32/MINIGAMES-STANDALONE-EVIDENCE.json) · [HL-CHG-1157](tracking/changes/HL-CHG-1157.md).

## MASTER Excel 15 — gotowy artefakt, gra bez zmian

**MASTER Excel 15 jest gotowy i przeszedł budowę oraz świeżą walidację PASS.** Ma 156 arkuszy: 100 archiwalnych i 56 bieżących (51 widocznych, 5 ukrytych), 61 262 bieżące wiersze oraz 7 581 368 bajtów. SHA-256: `b45a9f67ebcc1653ce2fc5413e5dbd9a42b32c103a52b4eda06db647b5dd1f11`. Artefakt gotowy do publikacji w Git; wynik nowego CI należy sprawdzić w Actions.

Eksport jest przypięty do źródła `e23b713ddbaef3ea6b0507c56a466f23c1f0aa92`. Zachowano 100 arkuszy archiwum, 220 części ZIP, 48 komentarzy i 4982 dotychczasowe wyniki formuł. Sprawdzono 114 plików, odciski trzech eksporterów i generatora, ślad AST, pełny kod oraz limity UTF-16 komórek. Świeże `--validate-only` ponownie wykonało eksporty modeli i tekstów. Kalkulator ma 12 nowych formuł z zapisanymi wynikami i 160 porównań do kodu.

Rzeczywiste symulacje obejmują 24 h bezczynności, 24 h produkcji i 72 h rozwoju. W próbie rozwoju osiągnięto Ratusz 2, Magazyn 2, 64 osoby, 55 pracowników, 2371 monet i 6 przyjętych rozbudów, przy 36 łóżkach. Odnotowano 22 prawidłowe odmowy punktów Domu w 143 próbach. To wynik jawnej strategii z założeniem 3 h aktywności dziennie, bez twierdzenia o optymalnym graczu, symulacji 50 dni lub pomiarze 150 h ludzkiej zabawy. Niedokończona próba 7 dni nie została dołączona.

Gra, konta, wdrożenia, archiwum 14 i redakcyjny Excel z sześcioma zakładkami pozostają bez zmian. Ser nadal powstaje w Gospodarstwie od poziomu 6; otręby i pasza nie są zaimplementowane. Zadanie obejmuje pełne repozytoryjne źródła mastera; nie obejmuje niewybranych zakładek oryginalnego uploadu redakcyjnego. Odebrana aplikacja to nadal 37061c, publikacja c4 i cache13. Ręczny odbiór użytkownika: NOT_RUN. PROD i DNS są odłożone.

[MASTER 15](arkusze/HARBORLIGHT15-zasady.xlsx) · [Raport](arkusze/HARBORLIGHT15-zasady-walidacja.json) · [Dowody](v32/MASTER-WORKBOOK15-EVIDENCE.json).

## Odebrane środowiska i historia wcześniejszych prac

## Odebrane DEV i PRE-PROD0.15.0.2 — 16listopada2026

**DEV i PRE-PROD0.15.0.2/cache `frontend-v32-13` są odebrane.** Aplikacja `37061c43139f32dfba61e4d837b133ed9d2d7da8`, źródło publikacji i wdrożenia `c4f752142c0421aad1dc0490a2f5139c277e6ee5`. Usunięto przebłysk starej mapy/HUD przy starcie oraz wdrożono tempo1×/2×/6× wyłącznie dlaadmin3. Własny CI43850690541 **SUCCESS24m31s**:1437frontend+170backend+7physical=1614Node,166Python oraz **66 programówChromium (48+18)**, obie grupyPASS. Liczba65 pomijała osobnyLiveCAS i nie jest końcowym wynikiem.

Pages43850690456 SUCCESS22s/job17s;108plików wejścia/źródeł i30 774 724bajty zgodne przezHTTPS/TLS. Pobrane publiczne bajty uruchomiono lokalnie wChrome1440/390 PASS jako odtworzenie transportu; nie deklarujemy natywnego odbioruHTTPS wprzeglądarceDEV. StandardowyPRE-PROD43854387444/próba1 **SUCCESS2m22s**: gate12s/7kroków, deploy2m03s/31SUCCESS+1pominięta diagnostyka. Natywny odbiór rzeczywistej zalogowanej istniejącej wyspy PASS108dokładnychhashy; wszystkie zapisy przeglądarkowe zablokowane.

Odczyt kont:3Auth/3API,1istniejąca wyspa i2puste,6obcych+3anonimoweFirestore odmowy,3własne bezpośrednieFirestore403 i3anonimoweAPI odmowy. Niezależny audyt zegara11:07UTC z normalnymTLS potwierdził admin1/admin2 GETclock403 oraz admin3 GET200/rate1/generation2/canSetRate=true/canAdvance=false. Zachowano generacje2 i świat schema9/rules32; nie zmieniano tempa lub gry i nie inicjalizowano pustych wysp. Sekwencję1×/2×/6× sprawdzono wcześniej na rzeczywistym lokalnym runtime i izolowanymAPI; audyt publiczny był wyłącznie odczytowy.

Oba oryginalneZIP-y zweryfikowano po rozmiarze/SHA256. Rzeczywisty receiptv2 ma walidacjęPASS i wszystkie4checks=true; rygorystyczne archiwum109PASS. NiezależnyTLS o11:09UTC potwierdził wszystkie109plików/30 781 978bajtów identyczne z oryginalnym archiwum i źródłem. Oba niezmienne tagi są opublikowane i zdalnie potwierdzone na c4: DEV `dev-0.15.0.2-20261116`, obiekt `9b07b4dd74f2e4dabda6e4eaf361832f411cb506`; PRE-PROD `preprod-0.15.0.2-20261116`, obiekt `9ff02b5d158485dfb955572e6a7d8b6e29d34cf2`.

**To wdrożenie nie resetowało kont.** Wcześniejszy reset pozostaje zakończony i niezależnie potwierdzony; nie wolno go powtarzać. Historyczny8087/cache12/CI43848428119FAILURE pozostaje w dowodach. Excel6/413/ABC/pustaC zachowuje źródło37061c iSHA256 `95f415d0748d5b5e389f92e28df2aef18e71b13968c74ac5a0e54835c7d4be8d`; pliki publiczne, wejściowy zakres sześciu arkuszy, MERGE i fingerprinty bez zmiany tą aktualizacją. **Ręczny odbiór użytkownika NOT_RUN. PROD/DNS odłożone.** Kolejny commit samych metadanych nie zastępuje aplikacji37061c, publikacji c4 ani tych tagów.

[Pełne dowody odbioru](v32/CACHE13-ACCEPTANCE.json).

## Historia przygotowania i wcześniejszych statusów

## Końcowe źródłocache13 — noweCI i publikacje oczekują

Bieżący kandydat **0.15.0.2 / frontend-v32-13** ma zacommitowane źródło **`37061c43139f32dfba61e4d837b133ed9d2d7da8`**. Zmiana względem nieudanegocache12 obejmuje wyłącznie bramkę inicjalizacji zegara klienta dlaUIDdev-admin3 i56publicznych ciągówcache13; serwer pozostaje bez zmiany.

Kierunkowy cloud-rules naFirestore iAccountAPI **PASS134.56s**, bez zmiany testu lub asercji. Speed **6/6 PASS** na rzeczywistym lokalnym runtime i izolowanym lokalnie trybie PRE-PROD/API: admin1/admin2 w obu środowiskach mają **0 automatycznych żądań zegara**, bez przycisków i bez uprawnieniaAPI; admin3 zachowuje pełną sekwencję1×/2×/6×/1×, tempo zapisanej gry, trwałość i ponowne wejście. Pakiet2/2 i stagingtrzechJS PASS po zmianiecache13. To dowody lokalne, nie odbiór opublikowanego PRE-PROD.

Arkusz6/413/ABC/pustaC ma walidacjęPASS ze źródła37061c, SHA256 `95f415d0748d5b5e389f92e28df2aef18e71b13968c74ac5a0e54835c7d4be8d`, fingerprint `7e9f4bf97b7f0d22674bd1eef8832dd44e23142997f4a3082b1bf17c7d160310`. Odczyt/scalenie nadal ograniczone do sześciu wybranych zakładek; dokumentacja nie zmienia pliku lub raportu odcisków.

**Nowy własnyCI, nowePages, promocja i natywny odbiór PRE-PROD pozostająPENDING.** Historyczny8087/cache12 zachowujeCIFAILURE43848428119 i PagesSUCCESS43848428111, bez zaakceptowanego tagu lub promocji. PRE-PROD nadal86/cache11; reset i istniejąca graadmin1 są niezależnie potwierdzone, bez ich ponawiania lub tworzenia świata przezQA. PROD/domena odłożone.

[Dowody lokalnecache13](v32/CACHE13-LOCAL-VALIDATION.json).

## Historia cache12 i przygotowania

## Cache12 opublikowany, własnyCI nieudany; kandydatcache13 oczekuje

Pierwsza publikacja **0.15.0.2/cache12**, aplikacja96c, źródło `8087dc826cb10ee391619d88d9f99fe696f7d036`, ma **CI43848428119 FAILURE450s** (job133234457802). Krok27 cloud-rules-v32 odrzucił zbędnyGET/dev-time wysłany przez admin1. Przed awarią przeszły frontend1437/1437, backend170/170, Python166 oraz startup20/20 i speed6/6; pozostałe późniejsze przeglądarki nie zostały wykonane. Serwer odmawiał niedozwolonej roli403; poprawka ogranicza także inicjalizację klienta do właściwegoUIDdev-admin3. Nowy wynik wymaga własnego źródła i pełnegoCI.

**Pages43848428111 SUCCESS**: job17s, cały przebieg23s. NiezależnyHTTPS/TLS potwierdził108plików/30 774 686bajtów identycznych ze źródłem8087. Te rzeczywiste publiczne bajty pobrano i uruchomiono lokalnie wChrome1440/390 PASS; nie deklarujemy natywnego odbioru HTTPS wprzeglądarceDEV. Nie utworzono zaakceptowanego tagu8087 i nie wdrożono go naPRE-PROD. PRE-PROD pozostaje86/0.15.0.1/cache11, reset niezależnie potwierdzony, istniejąca graadmin1 odczytowo potwierdzona.

Bieżący następny kandydat: **0.15.0.2 / frontend-v32-13**, źródło jeszczePENDING. Poprawka bramkiUID klienta jest przygotowywana; kierunkowe cloud-rules i sześć zakresówUI są w toku. WłasnyCI, nowePages, publikacja/PRE-PROD i natywny odbiór nowej gry pozostająPENDING. Sukcesy częściowe8087 ani jego Pages nie oznaczają pełnego zielonegoCI nowego źródła. PROD i domena pozostają odłożone.

[Dokładne dowody pierwszej publikacji](v32/CACHE12-PUBLICATION-EVIDENCE.json).

## Historia lokalnego odbioru i poprzedniego kandydata

## Końcowe źródło96c — lokalne dowody, publikacje oczekują

Końcowe źródło aplikacji **`96c211fd39826cf804ff286faeff219ac846827c`** jest zacommitowane: **0.15.0.2 / frontend-v32-12**. Publikacja, własny CI i nowe wdrożenie PRE-PROD nadal **PENDING**. Checkpoint9ee zachowano w dowodach i historii; po nim zmieniono wyłącznie kontroler zegara, koordynator i opcję beforeRecover wplay.

Końcowy odbiór startu **20/20 PASS** na1440/390 obejmuje6 opóźnianych barier,5 awarii zasobów na szerokość, utratę kontekstu przed gotowością grafiki, czytelny błąd i odzyskanie po ponowieniu, wprowadzenie oraz prawdziwe przekierowanie logowania. BajtyHTML iambient odpowiadają źródłu96c, ostatnia poprawka zegara nie zmienia startu. Nowe testy zegara/focus/koordynatora **51/51 PASS**, w tym4 przypadki healthyfocus; adaptery lokalnej chmury **58/58 PASS**. Końcowe powtórzenia **speed6/6 i LiveCAS dla96c PASS**; sprawdzenie tempa nadal dotyczy rzeczywistego lokalnego runtime i izolowanego trybu PRE-PROD/API, nie publicznej usługi.

Wcześniejszy checkpoint9ee zachowuje backend170, clock/frontend66, coordinator57,payload2,bundle26,pakiet2 i sześć rzeczywistych lokalnych/izolowanych zakresów speedPASS. Nie jest to publiczny odbiór PRE-PROD. Pierwszy pełny frontend miał **1425/1426**, timeout10s starego96-godzinnego watchdog przy obciążeniuCPU; dokładny retry1/1 PASS8.8s nie zastępuje pełnego zielonegoCI.

Arkusz6/413/ABC/pustaC ze źródła96c ma walidacjęPASS, SHA256 `90943adac77e35ee97899165dfa4e4ae541074b62258323fae27ffab2a158e60`, fingerprint `f7d82a10f46673098129486a911132ae30e0739e0fc27e4a5d64aa9669589771`. Tylko sześć wybranych zakładek; dokumentacja nie zmienia arkusza ani raportu odcisków.

Reset jest niezależnie potwierdzony i nie jest ponawiany. Właściciel utworzył grę admin1; niezależny odczyt16listopada10:21:40UTC PASS z normalnymTLS potwierdził właściweUID, generację2, rewizję12, schema9/rules32,19osób, ukończonewprowadzenie i zegar niezatrzymany. Warunek istnienia świata jest spełniony; dawnyisland=null10:07:30 jest historycznym checkpointem. **Nowy PRE-PROD wymaga jeszcze odebranego nowegoDEV, standardowego wdrożenia i natywnego odbioru tej istniejącej wyspy. QA nie tworzył ani nie zapisywał świata.** PROD/domena bez działań.

[Dowody lokalne](v32/CACHE12-LOCAL-VALIDATION.json).

## 16 listopada — start i tempo admin3 w toku, reset niezależnie potwierdzony

Użytkownik zgłosił, że podczas uruchamiania przez chwilę widać stary obraz referencyjny wyspy i dawny HUD, zanim pojawi się właściwa gra. GO z16listopada2026 obejmuje usunięcie tego przebłysku: najpierw DEV, następnie PRE-PROD. Poprawka **0.15.0.2 / frontend-v32-12** ma zamrożone źródło96c211f i poniższe lokalne wyniki; własnyCI i publikacja pozostająPENDING, wcześniejsze sukcesy86 nie są jej odbiorem.

Przed gotowością właściwej sceny ma być widoczny spójny ekran ładowania. Referencyjna mapa, stary HUD i niegotowe elementy gry nie mogą pojawiać się ani przyjmować kliknięć w pierwszych klatkach. Odbiór powinien objąć pierwsze renderowanie oraz opóźnione ładowanie, a następnie zachowanie właściwej wyspy i działającego interfejsu po zakończeniu startu. Bieżący lokalny odbiór i pozostałe bramki podano poniżej.

Reset właścicielski dla run43768861718/źródła **86eb8d9** jest **RESET_SUCCESS_INDEPENDENTLY_VERIFIED**. Niezależny odczyt16listopada09:41:42UTC z normalną weryfikacjąTLS potwierdził3 logowania z właściwymi UID, generację2 każdego konta, expired=false i island=null; trzy bezpośrednie odczyty własnegoFirestore odmówione403. ConfigAPI200 potwierdza accountAPI=true, projectharborlight-dev, environmentpreprod i resetFencecommunity-profile-v1. Audyt nie zapisał danych ani nie tworzył wysp. Nie powtarzać resetu. Przeszkoda trwającego resetu jest zamknięta; nowy PRE-PROD nadal wymaga odebranego nowegoDEV i własnych dowodów. Bezpośrednio po resecie3wyspy były puste; obecnie admin1 ma grę utworzoną przez właściciela i niezależnie potwierdzoną10:21:40UTC. Warunek istnienia świata jest spełniony, nowy natywny odbiór wdrożonegoUI pozostaje oczekujący, bez tworzenia świata przezQA.

PROD i domena pozostają odłożone. Ten zakres nie zmienia reguł gry, kont ani zapisanego postępu i nie obejmuje oczekujących modeli sera, otrębów/paszy lub zmian reklam. Zawartość wejściowych arkuszy i ustalony zakres sześciu zakładek pozostają bez zmiany. Ręczny odbiór użytkownika nowej poprawki NOT_RUN.

Użytkownik zatwierdził sterowanie prędkością **wyłącznie dla admin3** na **DEV i PRE-PROD**: przycisk **▶ =1×**, pierwsze naciśnięcie **⏩ =2×**, drugie **⏩ =6×**. To odrębna funkcja testowa w planowanej0.15.0.2/cache12, kartaHL-CHG-1155. Widoczność i uprawnienie zmiany tempa mają być związane z właściwym uwierzytelnionym kontem, a rzeczywisty zegar gry ma odpowiadać wybranej wartości; samo przyspieszenie wyświetlanego licznika nie wystarcza. Lokalną implementację i testy podano poniżej; własnyCI i oba nowe wdrożenia pozostająPENDING. Nie przypisywać kontroli admin1/admin2 ani kontom produkcyjnym.

[Zakres tempa admin3](v32/GO-ADMIN3-SPEED.md), [dowody](v32/ADMIN3-SPEED-EVIDENCE.json).

[Zakres](v32/GO-STARTUP-LOADING.md), [dowody](v32/STARTUP-LOADING-EVIDENCE.json), BugHL-CHG-1154. Aktualnym odebranym źródłem DEV/PRE-PROD pozostaje86/0.15.0.1/cache11.

## Odbiór0.15.0.1 — stan historyczny przed zgłoszeniem startu resetu

PRE-PROD **0.15.0.1 / frontend-v32-11** jest wdrożony i przeszedł rzeczywisty odbiór zalogowanej gry. Aplikacja `27f3ea4f08474329108724c68c97c340ecaa1914`, publikacja `86eb8d9a40dab073c17a1b0f96dca38f1a15e24c`. Własny CI43766275390 SUCCESS26m17s (32 kroki SUCCESS, 0 failed, 2 pominięte diagnostyki) i Pages43766275430 SUCCESS18s. Standardowy PRE-PROD43768861718/próba1 SUCCESS: gate8s, deploy22:21:58–22:24:10UTC, 2m12s, 31 kroków SUCCESS/0 failed/1 pominięta diagnostyka.

Natywny odbiór hostowanej gry z rzeczywistym logowaniem PASS26s: 108 dokładnych hashy zasobów, reguły32, 20 funkcji mapy, 7 markerów nowych budynków, 4 nakładki grafiki, 19 kart (Administracja9/Gospodarka10), 21 ikon produktów, natywny Teatr, ciemne wyrównane menu i odsłonięty statek. Potwierdzono3 istniejące konta i3 niepuste zapisy, 0 pustych; 6 obcych i3 anonimowe odczyty odrzucone, 3 odczyty API zalogowanych kont PASS i3 anonimowe API401. Testy nie zapisywały wysp. Niezależny HTTPS potwierdził źródło86, wersję0.15.0.1 i config200 z accountAPI=true oraz `resetFence: community-profile-v1`.

Oba oryginalne ZIP-y pobrano i sprawdzono względem rozmiaru/SHA256 GitHub. Rzeczywisty wewnętrzny receiptv2 odczytano i zwalidowano: wszystkie4 checks=true; rygorystyczny weryfikator archiwum109 plików PASS. Pełny niezależny audyt HTTPS/TLS PASS: 108 plików treści/30 754 604 bajty oraz manifest, łącznie109 plików, są identyczne z niezmiennym archiwum; treść odpowiada źródłu86 i aplikacji27f. Tag `preprod-0.15.0.1-20261115` jest opublikowany i zdalnie potwierdzony: obiekt `446347dab79ebc3e8c088d6d257adbdcd0f5f6e4` →86. Bezpieczny raport: [audyt artefaktów i hostingu](v32/PREPROD-CACHE11-ARTIFACT-AUDIT.json). TagDEV `dev-0.15.0.1-20261115` jest opublikowany i zdalnie potwierdzony: obiekt `1d7997a0074f0f34229807f0092aec808e716783` →86.

**Reset admin1–3 pozostaje NOT_EXECUTED.** Zachowano loginy, hasła, UID i dotychczasowy postęp. W tej sesji brak właścicielskiego GCPADC; chroniony reset wymaga zalogowanego CloudShell właściciela, blokady bezpośrednich zapisów i minimum10min propagacji. Dokładne polecenie z pięcioma zweryfikowanymi argumentami jest w [procedurze resetu](PREPROD-RESET.md). Grant runtime ma status OWNER_REPORTED_APPLIED bez niezależnego odczytu IAM; skuteczne odczyty API potwierdzono osobno. PROD i domena pozostają odłożone. Historyczne E0 REOPENED_USER_REPORT, nieudany b268 oraz opcjonalny late-food UI INCOMPLETE pozostają zapisane; ręczny odbiór użytkownika NOT_RUN.

## Historia E0 — pliki wdrożone, odbiór funkcji ponownie otwarty

Użytkownik odłożyłPROD/domenę i zastąpił kolejność „PROD najpierw” bezpośrednimDEV → PRE-PROD. E0/0.15.0.0 faktycznie wdrożono: własnyCI43755386000SUCCESS18m30s, Pages43755385998SUCCESS19s, standardowyPRE-PROD43757897657/1SUCCESS2m24s/31kroków. Root potwierdziłHTTPS107plików/30742948bajtów, manifest i rzeczywiste artefakty; trzy konta/trzy niepuste zapisy oraz odczytowe smoke bez zapisówPASS. [Raport zakresu tych dowodów](PREPROD-V32-PROMOTION.md).

**Odbiór funkcjonalnyE0 jestREOPENED_USER_REPORT**: stare światy lub nowe chmurowe stany zruleset<=31 pozostawały w dawnymUI; pierwotny smoke logowania nie sprawdzał20funkcji/19kart/Teatru/markerów. TagiE0 zachowują prawdziwą historię plików i artefaktów, nie są dowodem naprawienia tej luki. Nowa poprawka0.15.0.1/cache10 jest lokalnie potwierdzona na obu wejściachFirestoreCAS/API, ale noweCI, wdrożenie i reset nadalPENDING. [Zakres i warunki](v32/GO-PREPROD-RULESET-RESET.md), [dowody](v32/PREPROD-RULESET-RESET-EVIDENCE.json).

Użytkownik jawnie zlecił reset wszystkich trzech kontPRE-PROD z zachowaniem loginów,haseł iUID. Są trzy istniejące zapisy i trzy prywatne kopie. Warunki: nowe odebrane wdrożenie, aktywneAPI, runtime roles/datastore.user, blokada zapisów klienta, minimum10min propagacji i chroniony reset. Grant ma statusOWNER_REPORTED_APPLIED bez niezależnego odczytuIAM; wszystkie pozostałe operacje chmurowe nowej poprawki oczekują; GHenv403 nie jest dowodem włączeniaAPI. Fabryka daje18osób przedintro/19po prezencie. PROD/DNS odłożone, bez nowego wdrożenia gryPROD; nie resetowano kont w ramach samych testów lub dokumentacji.

## Historyczna kolejność, zastąpiona — obecny PRE-PROD doPROD przed DEV doPRE-PROD

Użytkownik jawnie ustalił kolejność: **obecnyPRE-PROD0.14/7e81a1a → PROD, dopiero po potwierdzeniuPROD aktualnyDEV → PRE-PROD**. [Plan](PROD-FIRST-20261115.md), [dowody blokad](PROD-FIRST-20261115-EVIDENCE.json), OpsHL-CHG-1151. Pierwszy krok jestBLOCKED: oryginalnyreceipt41909268052 maaccount_api:false, świeżyCloudRunhealth200 potwierdza7e, readinessaccounts:false/persistence:false i config503account_api_disabled. Nie omijamy bramkiAPI i nie wgrywamy nowszegoDEV naPRE-PROD przedPROD.

Profil85plików związany dokładnie z7e/hashamiarchiwum i manifestu ma lokalnie26testówPASS i usuwa tylko niezgodność historycznej walidacji; domyślny kontrakt108 i wymaganieAPI zachowane. Do konfiguracji brakuje ustalonego dostępu właścicielskiegoGCP/domeny: brak tożsamości/manifestu/ADC w tej sesji; GHenv404 i FirebasePRODversion/config404 nie dowodzą nieistnienia zasobów. harborlight.pl nadal maA85.128.245.188/nazwa.pl i legacy404. Pytanie dotyczy miejsca skonfigurowanego dostępu, nie sekretów wczacie. NowegoPROD ani resetu kont nie potwierdzono. Samego staregoreceipt nie modyfikujemy; ten sam obraz7e wymaga prawdziwej konfiguracjiAPI, odczytowego odbioru i nowego potwierdzenia.

DEVcache9 czeka na kolejny pełny własnyCI po dwóchFAILURE starych oczekiwańcopy. Drugi kandydatcd61dae przeszedł1402Node/backend/Python/Excel i noweUI6arkuszy, lecz zawiódł starszy test opisu odblokowania.106publicznychplików pozostaje bez zmiany w poprawkach testów. Akceptowany tagcache9 nie powstaje przed pełnym zielonymCI; to nie zmienia wyżej ustalonej kolejności promocji.

## Bieżące zadanie DEV — redakcja sześciu arkuszy, cache9

Użytkownik zlecił import tekstów tylko zTutoriala, opisów i informacji budynków, dolnego paska, komunikatów i przycisków. [Zakres](v32/GO-EDITORIAL-SIX-TABS.md), [dowody](v32/EDITORIAL-SIX-TABS-EVIDENCE.json):413wierszy,87niepustychC,85różnychodB; niepustaC ma pierwszeństwo, pustaC oznaczaB. Wyciąg obejmuje wyłącznie sześć wskazanych arkuszy; pozostałe treści nie są odczytywane. Instrukcje redakcyjne nie stają się dosłownymi tekstamiUI.

**Pierwszy cache9 opublikowano wyłącznie naDEV: aplikacja0b41a9b, publikacjab1a929d, Pages43752880924SUCCESS20s; własnyCI43752880913FAILURE starego oczekiwania tekstu.**1401/1402testówPASS, przeglądarki wtymCI pominięte; poprawka dotyczy wyłącznie oczekiwania „po przypłynięciu” zgodnego zC i zachowuje4/6,ładunek oraz czas. Nowy kandydat ma własne oczekująceSHA/CI/Pages, bez zmiany106publicznychplików. [Publiczne dane pierwszej publikacji](v32/EDITORIAL-SIX-TABS-PUBLIC-RECEIPTS.json):106PUBLIC_FILES/30742201bajtów zgodneSHA256 przy włączonej weryfikacjiTLS. Lokalnyrender1672/390PASS oznacza te rzeczywiste publiczne bajty bez fikcyjnego świata,API lub kont; natywneHTTPSChromium nadal blokowane zarządzanymTLS bez jego ignorowania. Potwierdzono redakcję informacjiAkademii, role,20funkcji mapy i pięćzakładek.

Lokalnie186testówPASS, pełne56podświetleń1440/390, układmenu i Magazyn1440/390 oraz20informacjibudynków×1672/1366/390PASS. NowyExcel6arkuszy/413ABC/pustaC ze źródłem0b41a9b zwalidowanyPASS, SHA256517a6d98…; historyczny pełnyExcel bez zmiany. Poprzedni odebrany cache8 zachowuje własne dowody i tag. Dwie decyzje o modelu — ser doMleczarni i reklamy na każdym poziomie — nadal oczekują odpowiedzi; tekst odpowiada działającej logice. Zaakceptowany front, grupy mieszkańców,UID i postęp zachowane. Odrębna promocjaPROD nadal zablokowana zgodnościąreceipt (`account_api:false`,108vs85plików), workflowPROD i konta bez zmian w ramach importu.

## Bieżące GO DEV — nazwy mieszkańców i grupy zajęć, cache8

Użytkownik zgłosił w Akademii etykiety „Mieszkaniec1…X”, wskazał także Koszary i polecił wdrożenie po poprawce. [Zakres cache8](v32/GO-DIRECTORY.md) obejmuje wspólne nazwy ról, osobną numerację profesorów/żołnierzy/oficerów i grupy zajęć w listach i wyborach Akademii, Koszar, Teatru, Królestwa oraz klasycznych paneli. Zaakceptowane grafiki, przypisania20funkcji i prawa krawędź menu1664 z cache7 pozostają zachowane. To prezentacjaUI bez zmiany UID, zapisów, uprawnień wyboru, przydziałów lub postępu. Modele sera i otrębów/paszy nadal wyłączone.

**Cache8 odebrano wyłącznie naDEV: aplikacjafa34c9e, publikacja06db93a, własnyCI43740930893SUCCESS i Pages43740930892SUCCESS dokładnie tegoSHA.** Job132893708888 trwał17m58s (17:24:32–17:42:30UTC),31krokówSUCCESS/0failed, w tym pełneChromium aplikacji i logowań/zapisówDEV. [Dowody](v32/DIRECTORY-EVIDENCE.json) i [dane publicznych plików](v32/DIRECTORY-PUBLIC-RECEIPTS.json).18ukierunkowanychhashyHTTPS i wszystkie106PUBLIC_FILES/30728747bajtów zgodneSHA256 przy włączonej weryfikacjiTLS. Render1672/390PASS oznacza **TLS-zweryfikowane publiczne bajty wykonane lokalnie**, z prawdziwymContent-Type i bez fikcyjnego świata,API lub konta. Natywna nawigacjaHTTPS wChromium nadalBLOCKED_CERT_AUTHORITY, bez ignorowaniaTLS; nie jest oznaczonaPASS.

Pakiet publikacji108plików/30742668bajtów przeszedł lokalnie roleUI,klasyczne listy i mapę. Excel5677wierszy/17arkuszyABC/pustaC ze źródłemfa34c9ePASS. Pobrany front pokazał Akademię19wolnych+Profesorów1–4, Koszary19wolnych+Żołnierzy1–4, grupy27osób,20celówmapy,4nakładki,5zakładek,19miniatur i krawędź1664 przy odsłoniętymstatku. Dziesięć modułów modelu jest niezmienionych po normalizacji namespacequery; wcześniejsze wstrzymane drzewo zachowano. CIcache7/d2af52a/43738724605 pozostajeFAILURE (v17/opóźnionyresize/120kart16.328px<20px); cache8 ma lokalnie pełnyv17 i wymuszony opóźnionyResizeObserverPASS z niezmienionym progiem20px. Publiczny Pages jest nietrwałym podglądem bez konta. PRE-PROD7e81a1a, PROD, Authentication/Firebase i postęp kont bez nowej mutacji.

Niezmienny adnotowany tag `dev-0.15.0.0-cache8-20261115` jest opublikowany i potwierdzony zdalnie: obiekt `d9455d2657c523fc505b26d973311744ff56f11e` wskazuje06db93a. Kolejny commit samych metadanych nie zmienia106publicznychplików ani odebranego kodu i nie przesuwa tagu; jego własnyCI jest osobnym wynikiem. Ręczny odbiór użytkownika pozostajeNOT_RUN.

## Nowe GO DEV — zaakceptowany front, cache7

Użytkownik zatwierdził front i zlecił dalsze przesunięcie dolnego menu do prawej krawędzi panelu misji oraz wdrożenie na DEV. [Zakres](v32/GO-ACCEPTED-FRONT.md): zaakceptowane grafiki czterech budynków, nowe przypisania funkcji bez zmiany zapisów, dawny Zakład skórzany jako dekoracja, zgodne miniatury Administracji/Gospodarki i wspólna krawędź1664 (`474+1190`, `1401+263`). Aplikacja0.15.0.0, cache `frontend-v32-7`.

**Lokalny front przeszedł1672/1440/390, starszy native-map1440/390 i12testów pakietu. Cache7 opublikowano: d2af52a, Pages43738724545SUCCESS i17zgodnychhashyHTTPS z weryfikacjąTLS; pełny CI ma odrębny wynik.** Preflight:107plików/30727097bajtów, kopie PNG identyczne. [Zapis odbioru](v32/ACCEPTED-FRONT-EVIDENCE.json) nie przypisuje im historycznych sukcesów. Dotychczasowy `e3affdc` ma Pages43725629445SUCCESS i CI43725629409FAILURE. Publiczny scenariusz poziomu5 pozostaje nietrwałym podglądem bez kont; lokalne zapisy i konta zachowane. Zasoby mają atlas21aktywnych produktów, a osłona bezczynności chroni podgląd bez konta przed błędnym logowaniem. Wcześniejszy osobny roboczy pakiet sera, otrębów/paszy i nazw mieszkańców nie wchodził do publikacji cache7; nazwy mieszkańców mają teraz osobne GOcache8 powyżej. PRE-PROD7e81a1a, PROD, Authentication/Firebase i postęp kont bez nowej mutacji.

## Bieżąca paczka po odbiorze — cache6

[Podgląd DEV na poziomie5](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5&v=frontend-v32-6) jest opublikowany i sprawdzony. Źródło aplikacji `8a30d70885d99c30d584b74e1030a62e98edaa30`, commit publikacji `739b5dd837bf43e54675a221e3987d8cb2670947`, [Pages43725299560](https://github.com/ksobczak321-oss/gra/actions/runs/43725299560) SUCCESS. Odczyt15plików potwierdził zgodne SHA256; hostowane bajty wykonane na1440/390 pokazały poziom5, limit180 i9dostępnych budynków bez intro, błędówJS/HTTP, żądańAPI i zapisu świata w przeglądarce. [Dowody publikacji](v32/MENU-FISH-LEVEL5-EVIDENCE.json).

Publiczny scenariusz jest wyraźnie oznaczonym podglądem DEV w pamięci karty, bez uwierzytelnionego konta lub trwałego zapisu. Lokalny admin1/admin1 ma rzeczywisty Ratusz5 i26osób bez resetu. Lokalnie1390+1NodePASS,6przypadków/18prawdziwychkliknięć bez przesuwania,14nowychpaneli,16spójności i26klasycznychwidokówPASS; starszy samouczekPL/ENdesktop/mobilePASS. Excel5643/17/3 i pustaC, pakiet101plików verify/extractPASS. Późniejszy commit metadanych nie zmienia aplikacji; pełny własny CI końcowego commitu pozostaje osobnym wynikiem. PRE-PROD7e81a1a iPROD bez nowego wdrożenia.

## DEV 0.15.0.0 / v32 — tylko DEV, 15 listopada 2026

Aktualna gałąź rozwojowa to `dev/0.15.0.0`; publikacja na dotychczasowym GitHub Pages jest autoryzowana i nie uruchamia promocji PRE-PROD. Kod v32 bazuje dokładnie na wdrożonym `7e81a1a`, a późniejsze metadane odbioru 0.14.0.0 z `b2227d5` zachowano przez scalanie historii. [Publiczny podgląd DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-5) · [bieżący stan dostępu i testów](v32/DEV-READY.md).

Podgląd Pages jest bez kont, z postępem tylko w pamięci karty. Lokalny serwer DEV na porcie3000 ma oddzielne, trwałe wyspy i pary login/hasło `admin1/admin1`, `admin2/admin2`, `admin3/admin3`. Nowych zapisów nie przeniesiono do Firebase. Własny CI i Pages bieżącego SHA wymagają osobnego wyniku; wcześniejsze sukcesy 0.14.0.0 go nie zastępują.

PRE-PROD `https://harborlight-dev.web.app/release.json` odczytany15listopada nadal wskazuje `7e81a1a436770f57fd8abf390b6af8022e3300f6`. Potwierdzono auth-only3/3: `adminN/adminN` zwraca właściwe `dev-adminN`; hasła już były zgodne, bez zmiany użytkowników i postępu. `/api/v1/config` zwracał503; nie zmieniano jego konfiguracji. Nie wykonywano nowego deployu PRE-PROD lub PROD.

Bieżące pełne GO / cache `frontend-v32-5` obejmuje oprowadzanie V5/56, Teatr z wyborem widzów według zajęcia i „Wyślij wszystkich”, trzy zamknięte sekcje Magazynu, ciemne wyrównane panele i spójne ramki oraz wspólną pojemność 40 000 na poziomie 1 (koszyk +40%, w dół do 10 000). Lokalny admin1 ma Ratusz 5 bez resetu; admin2/admin3 pozostały na poziomie 1. Nowe ukierunkowane testy przeszły lokalnie; końcowe CI i publikacja nowego SHA wymagają własnego odczytu. Poprzedni cache4 / `fc2e87eec57c0388a16fb9b15a7d80ea0bc9c67c` ma CI43703967814 i Pages43703967803 SUCCESS. Szczegółowe dowody i ręczna ściągawka: [przegląd](v32/VISUAL-REVIEW.md), [lista](v32/TEST-CHEATSHEET.md).

## Opublikowany pełny pakiet GO — cache5

[Nowy link DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-5) jest opublikowany. Źródło aplikacji `e59726a81d84cf8ddd04e3f45072fdd00d688a63`, commit publikacji `2dd923da9b830b755d490aceef3a446472795e33`, [Pages43720459381](https://github.com/ksobczak321-oss/gra/actions/runs/43720459381) SUCCESS. Odczyt dziewięciu plików przez HTTPS potwierdził dokładne SHA256 nowego kodu i niezmienionej planszy. Faktycznie hostowane bajty uruchomiono w Chromium1440/390:18/36 osób,7 nowych budynków, polskie wprowadzenie, bez błędów JS/HTTP, żądań API i zapisu gry w przeglądarce. Transport z zachowaną weryfikacją TLS opisano w [dowodach](v32/GO-PREVIEW-EVIDENCE.json).

Excel DEV ma teraz5622wiersze/17arkuszy i dokładnie3kolumny; C pozostaje całkiem pusta. Archiwum100plików zweryfikowano i rozpakowano. Ta późniejsza aktualizacja dowodów nie zmienia plików aplikacji; pełny własny CI końcowego commitu wymaga odrębnego sukcesu. Pages jest podglądem bez kont i trwałego postępu; admin1 na lokalnym runtime ma Ratusz5, a PRE-PROD pozostaje7e81a1a.

## Odbiór poprzedniego DEV i obecnego źródła PRE-PROD 0.14.0.0 — 4 listopada 2026

Źródło `7e81a1a436770f57fd8abf390b6af8022e3300f6`, cache `frontend-v31-2`; świat9 / archipelag2. Własne [CI41906515746](https://github.com/ksobczak321-oss/gra/actions/runs/41906515746) SUCCESS17m12s, [Pages41906515747](https://github.com/ksobczak321-oss/gra/actions/runs/41906515747) SUCCESS50s, [bridge41909239074](https://github.com/ksobczak321-oss/gra/actions/runs/41909239074) SUCCESS13s i [PRE-PROD41909268052, próba1](https://github.com/ksobczak321-oss/gra/actions/runs/41909268052) SUCCESS2m12s. Sprawdzono API/health/ready, dokładny Hosting, zalogowaną grę i izolację trzech stałych kont. Oba artefakty udanej próby opublikowano. Konta, UID, hasła i postęp zachowano bez resetu; bez nowej promocji PROD i aktywacji rzeczywistych operatorów.

[Graj w PRE-PROD](https://harborlight-dev.web.app) · [Podgląd DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v31-2) · [Raport](PREPROD-V31-PROMOTION.md) · [Dowody JSON](PREPROD-V31-EVIDENCE.json).

Tag DEV `dev-0.14.0.0-20261104`, obiekt `df353ff2a4ab68a7f4a671cb6261f81d4d805b1c`, i tag PRE-PROD `preprod-0.14.0.0-20261104`, obiekt `1b32f383eed957b03120c1616cbb50435e19c19f`, są opublikowane i potwierdzone zdalnie. Oba rozwiązują się do tego samego pełnego źródła. Kolejny commit metadanych nie zastępuje źródła wdrożenia.

Pakiet85plików/19 682 273bajty, verify/extractPASS; TAR`b43a736f4c30e8db9d2704b50219e0e6c1cf06c32660640ef66f1861cc412196`, manifest`2dea4d8563fadaf38dcd8103dc9ee66088e69e34ba8cc74b544aaea4bf3bc54e`. Publiczne digests ZIP i ID obu artefaktów są w raporcie. Prywatnego receipt, obrazu i zapisu Firestore nie odczytano niezależnie.

Lokalnie1331Node +141Python i43zestawyChromiumPASS; własnyCI powtórzył cały spis43przeglądarek. Excel14PASS jako migawka sprzed promocji;450kart/179ręcznychNOTRUN. Pierwsze dwaCI zachowują FAILURE własnych źródeł. [Eksperyment50dni](design/CAMPAIGN-V31-SIMULATION.md) nadal jest częściowy; nie dowodzi150godzin ludzkiej zabawy.

## Historia poprzednich wydań

Aktualizacja operacyjna: **3 listopada 2026, Europe/Warsaw**. Akceptacja opisów i pierwotny odbiór lokalny pozostają z 1 listopada. Historia wyników jest w [dzienniku](IMPLEMENTATION-LOG.md); warunki promocji w [procesie wydań](RELEASE-PROCESS.md).

## Poprzedni PRE-PROD 0.13.1.0 — pełny odbiór SUCCESS

Źródło `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`; CI [41671140612](https://github.com/ksobczak321-oss/gra/actions/runs/41671140612) **SUCCESS, 14m 57s**, Pages [41671140578](https://github.com/ksobczak321-oss/gra/actions/runs/41671140578) **SUCCESS, 32s**, bridge [41673757060](https://github.com/ksobczak321-oss/gra/actions/runs/41673757060) **SUCCESS, 26s**, deploy [41673824262, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41673824262) **SUCCESS, 2m 56s**. Kontrole API/health/ready, dokładnego Hostingu, zalogowanej gry i izolacji trzech kont PASS; oba artefakty opublikowano. Konta, UID, hasła i postęp zachowano bez resetu. PROD i rzeczywiści operatorzy bez nowej aktywacji.

Tag `preprod-0.13.1.0-20261103` jest opublikowany i potwierdzony zdalnie: obiekt `52888386a2233fc326e4fa6e0169b1054c0316d4` rozwiązuje się do `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`. Tag DEV `dev-0.13.1.0-20261103` pozostaje na `13c55a4e4853edf44c185747c1c626ac42c221fc`. Późniejszy commit dokumentacji nie zastępuje źródła wdrożenia ani nie przesuwa tagów.

| Artefakt udanej próby | ID GitHub | SHA-256 ZIP GitHub |
|---|---:|---|
| `harborlight-dev-frontend-41673824262-1` | 13248538829 | `35c21f4ac8230927de659d341820f6afd7707f916e343aa19e20871f22057229` |
| `harborlight-dev-release-41673824262-1` | 13248913826 | `b23aaeb6b7f4f6eaaa2a501634b6ac593616a9d28fff66a36b175cbbc9f82f7c` |

76plików treści identycznych z DEV13c55a4, backend zachowany. Pakiet77plików/19 410 989bajtów: TAR`9b49b70d318222ed3740e26aa632975e7a760f5f108cf5f2c0ce4833779b60d4`, manifest`1e960edec80fdc7d89e359700d1c1c29e621369d04f78ed7f80364f681020b6d`; verify/extractPASS. ZIPy, TAR, manifest i digest obrazu są odrębne. Wnętrza prywatnychZIP, obrazu oraz zapisuFirestore nie odczytano niezależnie.

Rejestr411kart:59implementacji v29/v30 oraz Ops1082 mają `deployed_source_68e9bcd`; decyzje częściowo zastąpione i DEVdowody zachowano.147ręcznychNOTRUN. [Pełny odbiór](PREPROD-V30-PROMOTION.md).

## Poprzedni DEV0.13.1.0 — własne CI i Pages SUCCESS

Nowy Teatr ma zaakceptowaną oprawę,20miejsc i dalsze poziomy, trwałość przez sesje i automatyczny zapis. Źródło `13c55a4e4853edf44c185747c1c626ac42c221fc`; [CI 41667711260](https://github.com/ksobczak321-oss/gra/actions/runs/41667711260) **SUCCESS, 14m 39s**; [Pages 41667711124](https://github.com/ksobczak321-oss/gra/actions/runs/41667711124) **SUCCESS, 50s**. Tag `dev-0.13.1.0-20261103` opublikowany i zdalnie potwierdzony na tym samym źródle. Lokalnie1219Node +141PythonPASS; nowe studio i pełna gra po4wariantyPASS, dwie regresjePASS i końcowe zrzuty obejrzane. [Raport](DEV-0.13.1.0-VALIDATION.md) rozdziela te wyniki od nowego CI i Pages. W chwili tego odbioru DEV PRE-PROD0.12/d9e2940 pozostawał bez zmian; obecny odbiór0.13.1.0 jest powyżej.


## Poprzedni odebrany DEV 0.13.0.0 — własne CI i Pages SUCCESS

Nowy zakres ma GO wyłącznieDEV/Git/CI/Pages. [Wymagania](FRONTEND-V29-REQUIREMENTS.md) i [raport odbioru](DEV-0.13.0.0-VALIDATION.md) oddzielają kod, lokalne testy, publikację i faktyczny stan chmury. PRE-PROD0.12.0.0/d9e2940 pozostaje bez zmian; nie wykonano resetu ani aktywacji operatorów. Lokalnie1200Node +141Python +36zestawówChromiumPASS;397kart/134ręczneNOTRUN. Źródło `cf6739a081d89bb5b2c6773a04a34f3fe2a8a8da`, [CI 41657032913](https://github.com/ksobczak321-oss/gra/actions/runs/41657032913) **SUCCESS, 13m 13s**, [Pages 41657032922](https://github.com/ksobczak321-oss/gra/actions/runs/41657032922) **SUCCESS, 41s**. Tag `dev-0.13.0.0-20261103` jest opublikowany i wskazuje to samo źródło.


## Poprzedni PRE-PROD 0.12.0.0 — historyczny pełny odbiór SUCCESS

**PRE-PROD 0.12.0.0 jest odebrany.** Źródło `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`, [CI 41480146644](https://github.com/ksobczak321-oss/gra/actions/runs/41480146644) **SUCCESS, 13 min 46 s**, [Pages 41480146737](https://github.com/ksobczak321-oss/gra/actions/runs/41480146737) **SUCCESS, 41 s**, [bridge 41482423516](https://github.com/ksobczak321-oss/gra/actions/runs/41482423516) **SUCCESS, 21 s** oraz [deploy 41482455135, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41482455135) **SUCCESS, 2 min 20 s**. Przeszły kontrole dokładnego Hostingu, zalogowanej gry i izolacji trzech kont. Oba artefakty opublikowano. Kont, haseł i historii gry nie resetowano; PROD i rzeczywiści operatorzy bez nowej aktywacji.

| Warstwa | Potwierdzony stan |
|---|---|
| Źródło | `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`, ten sam pełny SHA własnego CI i rozpoczętego deployu. Aplikacja0.12.0.0/cachefrontend-v28-2, schemat9/archipelag2. |
| CI i podgląd | [CI41480146644](https://github.com/ksobczak321-oss/gra/actions/runs/41480146644) SUCCESS13min46s; [Pages41480146737](https://github.com/ksobczak321-oss/gra/actions/runs/41480146737) SUCCESS41s. |
| Dispatch | Rzeczywisty [bridge41482423516](https://github.com/ksobczak321-oss/gra/actions/runs/41482423516) SUCCESS21s; source-main pozostał niezmieniony do potwierdzenia uruchomionego deployu. |
| PRE-PROD | [Deploy41482455135, próba1](https://github.com/ksobczak321-oss/gra/actions/runs/41482455135) SUCCESS2min20s. Job gate125404047839 i deploy125404217870 zakończone sukcesem dla dokładnie źródła d9e2940. |
| Rzeczywiste kontrole | API/health/ready, Hosting, dokładny pakiet plików, zalogowana gra i izolacja trzech stałych kont PASS. Testy odczytowe nie zastępują ręcznego testu zapisu. |
| Dane i PROD | Konta, UID, hasła i historia zachowane bez resetu. Brak nowej promocji PROD oraz aktywacji rzeczywistych płatności, reklam i przelewów. |
| Ewidencja |351 kart;52implementacje v28 oraz karta operacji1022 mają `deployed_source_d9e2940`. Karta1013 odrzucona i niewdrożona. Wszystkie96ręcznych przypadków pozostają NOT RUN. |

Tag [`preprod-0.12.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/preprod-0.12.0.0-20261102) jest **opublikowany i potwierdzony zdalnie**: obiekt `d66b25ba216e5b686e6a92b9b8558d35eda9fd2d` rozwiązuje się do `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`. Nie przesuwamy go na późniejsze commity metadanych.

### Artefakty udanej próby1

| Nazwa | Publiczne ID GitHub | Publiczny SHA-256 ZIP GitHub |
|---|---:|---|
| `harborlight-dev-frontend-41482455135-1` |13160936132|`bc476446a80cc5db333819aecb8d9eda8a433f95d2c401ede26e91681d503769`|
| `harborlight-dev-release-41482455135-1` |13159179197|`1c961039fc2372283fe17c2f898b8db347553c9487e873ccd3d1bc9c73802c80`|

Nazwy, identyfikatory i digests odczytano z publicznego HTML przebiegu, a publikacja obu artefaktów przeszła w standardowym workflow. Nie pobrano ich ZIP-ów; nie odczytano niezależnie zawartości receipt, digestu backendu ani flagi API w receipt. Publiczne digests ZIP nie są hashami wewnętrznego TAR lub manifestu. Nie weryfikowano niezależnie pola API `expired:false`.

[Rejestr promocji](PREPROD-V28-PROMOTION.md) rozdziela te dowody i potwierdzenie tagu. Pominięty bridge41480227597 obsługiwał anulowane CI metadanych1e8b67c; rzeczywisty dispatch tego wydania to41482423516.

## Poprzedni odebrany DEV 0.12.0.0 — własne CI i Pages SUCCESS

**DEV 0.12.0.0 odebrany dla źródła `0ca7715b6e9282b31ca7941c89c3c742ac0df9e6`**, cache `frontend-v28-2`. Własne [CI 41475214118](https://github.com/ksobczak321-oss/gra/actions/runs/41475214118) zakończyło się **SUCCESS, 12 min 33 s**; obie grupy Chromium przeszły dla tego samego SHA. [Pages 41475213874](https://github.com/ksobczak321-oss/gra/actions/runs/41475213874) ma **SUCCESS, 31 s**. Push na `main` potwierdzono. Tag [`dev-0.12.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/dev-0.12.0.0-20261102) jest **opublikowany i potwierdzony zdalnie**, wskazuje dokładnie ten SHA.

| Warstwa | Potwierdzony stan |
|---|---|
| Git/źródło | `0ca7715b6e9282b31ca7941c89c3c742ac0df9e6`, push `main` potwierdzony, cache `frontend-v28-2`, schemat świata 9. |
| Własne CI | [41475214118](https://github.com/ksobczak321-oss/gra/actions/runs/41475214118) **SUCCESS, 12 min 33 s**; obie grupy Chromium dla tego SHA przeszły. |
| Pages | [41475213874](https://github.com/ksobczak321-oss/gra/actions/runs/41475213874) **SUCCESS, 31 s**. [Podgląd](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v28-2). Niezależne porównanie hostowanych bajtów niepotwierdzone; wcześniejszy proxy HTTP403. |
| Lokalny odbiór |1128 Node /141 Python /32 zestawy Chromium PASS oraz kierunkowe 132 próby przewijania, release UI4 i prognoza 7/144 PASS. |
| QA | Browser aktualnej listy 96 PASS; wszystkie 96 ręcznych NOT RUN. |
| Pakiet |62 pliki /11 332 589 bajtów, weryfikacja i rozpakowanie PASS. TAR `3bbadb1f4f0a2f552a465ba6a3730d499598e9430ae0c0396fe559939a3cb80a`, manifest `787e1c1fabe8f338e586a2606b6f1ce4ab33248955f5ba7a0885e9dcd2fc4dd3`. |
| Tag | [`dev-0.12.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/dev-0.12.0.0-20261102) **opublikowany i potwierdzony zdalnie**, wskazuje `0ca7715b6e9282b31ca7941c89c3c742ac0df9e6`. |
| Ewidencja |351 kart; 52 implementacje v28 mają implemented/validated_pages_published/passed_current_source. Karta 1013 zachowuje not_implemented/rejected. |
| PRE-PROD | **0.12.0.0**, `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`; deploy41482455135/próba1 SUCCESS, 2 min 20 s. Szczegóły aktualnego odbioru powyżej. |
| PROD/dane/operatorzy | Bez promocji, resetu kont/wysp/haseł i aktywacji realnych płatności/reklam/darowizn. |

Pierwszy kandydat `0d17b7aa91fef72f0fb36d28451d711daeaee909` zachowuje CI 41471972606 **FAILURE, 9 min 48 s**: mobilny przycisk wyjścia tutoriala miał y=-21. Osobny audyt wykrył zawyżoną prognozę czasowej premii. Poprawione źródło0ca7715 ma własny późniejszy sukces; nie przepisujemy wcześniejszej awarii na sukces lub anulowanie.

[Walidacja](DEV-0.12.0.0-VALIDATION.md) zachowuje osobne źródła, pakiety i wyniki obu kandydatów. Dalszy commit metadanych nie zmienia 60 publicznych wejść gry i nie zastępuje źródła `0ca7715b6e9282b31ca7941c89c3c742ac0df9e6`.

## Historyczne wydanie DEV i PRE-PROD — 0.11.0.0 / v27

**DEV i PRE-PROD 0.11.0.0 odebrane — 2 listopada 2026, Europe/Warsaw.** Źródło [`c7c39742594599c54ee8b074b5c313efd88af4cb`](https://github.com/ksobczak321-oss/gra/commit/c7c39742594599c54ee8b074b5c313efd88af4cb): [CI 41361938909](https://github.com/ksobczak321-oss/gra/actions/runs/41361938909) **SUCCESS, 10 min 9 s**, [Pages 41361938868](https://github.com/ksobczak321-oss/gra/actions/runs/41361938868) **SUCCESS, 21 s**, [bridge 41362763426](https://github.com/ksobczak321-oss/gra/actions/runs/41362763426) **SUCCESS, 16 s**, [PRE-PROD 41362782175, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41362782175) **SUCCESS, 2 min 17 s**. Pełne źródło wdrożenia potwierdzono.

| Warstwa | Rzeczywisty stan |
|---|---|
| DEV /Pages | Źródło `c7c39742594599c54ee8b074b5c313efd88af4cb`, własne CI i Pages SUCCESS. Wersja 0.11.0.0, cache `frontend-v27`, schemat świata 9. |
| PRE-PROD | [Graj](https://harborlight-dev.web.app): 0.11.0.0 /`c7c39742594599c54ee8b074b5c313efd88af4cb`, deploy 41362782175 próba 1 SUCCESS, 2m17s. |
| Kontrole hostingu i kont | Dokładne wydanie, publiczne pliki, rzeczywisty hostowany Chromium i stałe konta/izolacja zapisu PASS. Kontrole odczytowe, bez resetu. |
| Lokalna walidacja | 1023 Node PASS, 19,92 s po poprawce checkera; checker 26/26 PASS. 141 Python i 27 nazwanych zestawów Chromium dla niezmienionej aplikacji PASS po kierunkowych ponowieniach. Własny CI tego SHA zaliczył obie grupy Chromium. |
| Ewidencja | 297 kart; nowe 18: implemented /verified_own_ci_and_pages /passed_source_c7c3974 /deployed_source_c7c3974. 70 ręcznych NOT RUN. |
| PROD i dane | Bez nowej promocji PROD, resetu kont, zmiany haseł lub aktywacji prawdziwych operatorów płatności/reklam/darowizn. |

Nieprzesuwane tagi [`dev-0.11.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/dev-0.11.0.0-20261102) i [`preprod-0.11.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/preprod-0.11.0.0-20261102) są **opublikowane i potwierdzone zdalnie**; oba wskazują dokładnie `c7c39742594599c54ee8b074b5c313efd88af4cb`.

**61 plików z manifestem / 60 plików treści / 11 219 303 bajty**. Lokalny TAR SHA-256 `794d1e30f9af8d21d64caac2b073fbee17d4127566333de73f93393beb4d260b`; manifest SHA-256 `f83609519dd2becb96ea3532b1b746d63128f8631311720090c5c88e4e45c62e`. Archiwum zweryfikowano i rozpakowano; wszystkie 60 plików treści są identyczne bajtowo z testowanym final2, a 59 publicznych źródeł gry nie zmieniło się w poprawce checkera.

Kontrola stałych kont i izolacji zapisu **przeszła** w tym wdrożeniu, podobnie jak dokładny manifest/publiczne pliki oraz rzeczywisty hostowany Chromium. Odbiór kont zakończył się 1 listopada o23:36:47Z, czyli 2 listopada o00:36:47 w Warszawie; publikacja receipt i artefaktów zakończyła się sukcesem do23:36:50Z. Są to kontrole odczytowe, bez zapisu gry lub resetu. Ręczny test zapis→ponowne wczytanie nadal NOT RUN.

### Publiczne artefakty udanej próby1

| Artefakt próby 1 | Publiczne ID GitHub | SHA-256 archiwum ZIP podany przez GitHub |
|---|---:|---|
| `harborlight-dev-frontend-41362782175-1` | 13106171196 | `308d5b66fab731689b7d2f67343936d3b1141ca9e986d300d5a25393daeb1840` |
| `harborlight-dev-release-41362782175-1` | 13105684537 | `546c85f8005efa6a9c6daf2dbc5394b54e214ec26e7ce2a59eb0ff2f3ed19252` |

Są to publiczne digests ZIP GitHub, odrębne od lokalnego TAR i manifestu aplikacji. Wewnętrznego ZIP receipt ani digestu obrazu backendu nie pobrano i nie odczytano niezależnie. Rzeczywista flaga API kont także pozostaje nieodczytana niezależnie.

[Walidacja v27](DEV-0.11.0.0-VALIDATION.md) · [Przygotowanie i zgodność zapisów](PREPROD-V27-PREPARATION.md) · [Wymagania](FRONTEND-V27-REQUIREMENTS.md).

## Historia prób v27 — wyników nie przenosimy między źródłami

Poprzednie źródło `7d45290b911e359a8940f28551df4692053cadb2` zachowuje [nieudany deploy 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479): **FAILURE** w kroku24 kontroli stałych kont po udanej publikacji Hostingu, kontroli dokładnego wydania i hostowanym Chromium. Jego CI41360046508 SUCCESS10m31s, Pages41360046453 SUCCESS47s i bridge41360957057 SUCCESS18s są odrębnymi dowodami. Nie utworzono receipt ani tagu tej nieudanej próby. Bazowe źródło `6ff5ae976e31add7fb93e3872e0d9046a25edd37` ma CI41359303259 **CANCELLED** i Pages41359303232 SUCCESS30s. Nie przepisujemy żadnego z tych wyników na sukces c7c3974.

Poprawka c7c3974 ściśle obsługuje koperty Firestore1/2 oraz równoważny korzeń API, zachowując limity, odczyty obcych/anonimowych i zakaz zapisów testu. Znany błąd kontraktu2 odtworzono i lokalnie naprawiono, a końcowa kontrola kont w GCP przeszła. Oryginalny prywatny wierszERROR z nieudanego kroku nie został przekazany; nie przedstawiamy go jako odczytanego. [Incydent](PREPROD-V27-INCIDENT-20261102.md) zachowuje szczegóły awarii i osobne późniejsze rozwiązanie.

Bazowy pakiet6ff5ae9: TAR `af8a64508044d348b4e01122145d3b0b1653c6c4abfecfec5fc502e7b36e1e55`, manifest `84ac0f9528cadaab15c92d3f789abd041d45b9a4580051e638472879d0709d49`. Nieudany kandydat7d45290: TAR `d202c79783b1dc2787d3db2a859031a9dc03fb87a089b2e81a09c2d8d0253ff4`, manifest `0905956f17d0b249cf8faae7a3aed486e86e74d20b2a5145f72d6a9730792993`. To lokalne hashe pakietów poszczególnych SHA; nie są publicznymi digestami ZIP udanej promocji.

## DEV 0.10.2.0 / v26 — podgląd opublikowany, własne CI i Pages potwierdzone

GO z 1 listopada obejmuje tylko DEV, Git/CI/Pages. Pakiet porządkuje Magazyn i Dom, oddziela Ranking, Sojusz i ligę oraz Pomagam, dodaje wejście czatu przed dzwonkiem, przyjmuje ręczną redakcję opisów oraz nazwę 3–40 znaków z walidacją PL/EN. Tutorial pozostaje oprowadzaniem po 33 elementach, samouczek ma 25 praktycznych lekcji; oba można zamknąć, wznowić lub przejrzeć od początku bez resetu i powtórnych nagród. Nowy kurs zaczyna się od 6 tragarzy oraz priorytetu Budowa, kończy nominalnie na Ratuszu 2, a pierwsze rozbudowy mają turbo dostaw i budowy. Cache: `frontend-v26`; widoczna wersja: **0.10.2.0**. Schemat świata pozostaje 9.

| Warstwa | Stan nowego pakietu |
|---|---|
| Kod lokalny | Zintegrowany i odebrany lokalnie kandydat. [Wymagania v26](FRONTEND-V26-REQUIREMENTS.md). |
| Node | **954 PASS**, lokalny wynik po integracji. Nie jest wynikiem własnego CI przyszłego SHA. |
| Python | **141 PASS w 11 zestawach**; log lokalny potwierdza sumę 2+14+23+12+17+12+12+10+13+8+18. |
| Chromium | **22 zestawy PASS** po poprawkach i odpowiednich ponowieniach; 114 rzeczywistych widoków PL bez reszt EN. Własny CI tego samego SHA ponowił cały pakiet 22 zestawów: SUCCESS. |
| Pakiet | 55 plików z manifestem/54 treści,11 062 246 bajtów. Hashe i potwierdzenie pakietu tego SHA: [odbiór v26](DEV-0.10.2.0-VALIDATION.md). |
| Git / CI / Pages / tag v26 | `170cd31f006c8d3a5765ecb78649c31731b0a7a7` wysłany do main; [Pages 41337284572 SUCCESS, 25 s](https://github.com/ksobczak321-oss/gra/actions/runs/41337284572); [CI 41337284731 SUCCESS, 5 min 22 s](https://github.com/ksobczak321-oss/gra/actions/runs/41337284731). Tag `dev-0.10.2.0-20261101` wiąże ten sam kod i własne wyniki. |
| PRE-PROD | **Bez nowej promocji**; pozostaje 0.10.1.0 / `353faad347262dce7c3632fdf7c71be124384ab1`, przebieg 41246771480 / próba 1 SUCCESS. |
| PROD i dane graczy | Brak nowej publikacji, resetu kont, zmiany haseł lub realnych operacji finansowych. |

[Odbiór v26](DEV-0.10.2.0-VALIDATION.md) zapisuje kolejne rzeczywiste wyniki. Rejestr ma **279 kart zmian i 59 ręcznych przypadków NOT RUN**; TC54–TC59 odbierają nowy zakres. Dwie niejednoznaczności mają jawne założenia otwarte na korektę: kolejność Monety → Pracujący → Następny mieszkaniec → Punkty → Mieszkańcy i miejsca oraz możliwość indywidualnego wydania reszty szczęścia po rozdaniu wszystkim. Brak odpowiedzi użytkownika nie jest dodatkową zgodą na te interpretacje.

Dobroczynność i liga mają oznaczoną demonstrację; beneficjenci są fikcyjnymi przykładami. Nowy przycisk ani test z atrapą nie dowodzi aktywacji usługi, prawdziwego przelewu, OAuth lub reklamy. Stare programy lekcji, nagrody i rozpoczęte zlecenia zachowują historię. Integracja planszówki online i reset `admin1`–`admin3` pozostają poza tym GO.

## Poprzedni odebrany DEV 0.10.1.0 / v25 — redakcja opublikowana w podglądzie

Zakres: prowadzenie 25 lekcji przez rzeczywiste kliknięcia mapy, naturalny polski całej gry, wspólne okno ligi 19:00–21:00 i potwierdzone parametry archipelagu. Ostatnie doprecyzowanie dotyczy prostego, przyjaznego języka opisów: co gracz może zrobić i po co. Przeredagowano 12 krótkich i 12 pełnych opisów budynków oraz główne instrukcje. Cache końcowej poprawki: `frontend-v25-2`.

Pierwszy podgląd: `b1cd650da1c9d669ebce4a77bee81ebfd87ccbc9`; [Pages41244467250 SUCCESS, 41s](https://github.com/ksobczak321-oss/gra/actions/runs/41244467250), ale [CI41244467302 FAILURE, 2m48s](https://github.com/ksobczak321-oss/gra/actions/runs/41244467302). CI wykryło układ trzech przycisków historycznego samouczka wychodzący poza ekran. Nie tworzono tagu odbioru ani promocji tego kandydata. Naprawa zawijania i nowy test geometrii są gotowe. Końcowy pakiet przeszedł 898 Node + 141 Python + 18 zestawów Chromium, w tym ponowny odczyt 112 widoków. Końcowe źródło `353faad347262dce7c3632fdf7c71be124384ab1` jest w Git, z opublikowanym tagiem `dev-0.10.1.0-20261031`; [CI41246449612](https://github.com/ksobczak321-oss/gra/actions/runs/41246449612) SUCCESS, 3 min 54 s, [Pages41246449682](https://github.com/ksobczak321-oss/gra/actions/runs/41246449682) SUCCESS31s. Wyników wcześniejszego pakietu nie przypisujemy nowej redakcji.

[Wymagania v25](FRONTEND-V25-REQUIREMENTS.md) · [Przegląd polszczyzny](POLISH-REVIEW-v25.md) · [Odbiór wydania](DEV-0.10.1.0-VALIDATION.md). Rejestr: 263 zmiany i 53 ręczne przypadki NOT RUN. Użytkownik autoryzował PRE-PROD po testach. Właściciel potwierdził już [przygotowanie zgodnych prywatnych reguł zapisu](PREPROD-V25-PREPARATION.md), zachowując konta i postęp. Flagi API nie odczytano niezależnie; promocja zachowuje dotychczasowy tryb. Bez resetu kont i PROD. Bieżące PRE-PROD ma już opisane niżej 0.10.1.0.

## Poprzedni odebrany DEV — 0.10.0.0 / v24, komplet PL

**Końcowe źródło: `1b3de32869c8164ed8d0b85df7ea743ca76a3719`.** [CI41238818669 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41238818669),5min15s; [Pages41238818743 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41238818743),24s. Nieprzesuwany adnotowany tag `dev-0.10.0.0-pl-20261031` wiąże źródło i dowody. [Podgląd DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v24-2) działa w pamięci, odrębnie od kont GCP. [Dokładny odbiór i hashe](DEV-0.10.0.0-VALIDATION.md).

Zakres: archipelag do20wysp, kolonizacja i pasażerowie, NPC+sprzedaż PvP, sojusze/dwa czaty/liga, dobroczynność w jawnej symulacji, oba powroty w Pomocy i samodzielna planszówka. Końcowe PL obejmuje także odmowy i nazwy zasobów, zachowując nazwy graczy; cache frontend-v24-2. [Parametry DEV](FRONTEND-V24-REQUIREMENTS.md) odróżniają potwierdzone decyzje i odwracalne założenia.

Odbiór: **878 Node,141 Python oraz16zestawów Chromium — PASS**;3generatory --check PASS. Pakiet54pliki/10 955 440bajtów, SHA-256archiwum `78d62aee489b7f8ea529b4a7e7435a430f463dd5fa9b7201e5c2fbe55925d51b`, manifestu `8c1a4fa8f4c20d94037f647e19009bbe2e8376b406f6e7fb7de1f193cab93174`.53pliki zawartości zgodne z końcowym pakietem przeglądarkowym.

Rejestr:256kart zmian,50ręcznych przypadków NOT RUN; [lista do odhaczania](testing/qa-checklist.html), [start](testing/START-HERE.md). Importer306kart w dry-run, bez natywnych Issues. TC41 integracji fizycznej BLOCKED. Planszówka: ZIP z planszą A3/A4,24kartami,pionkami,pudełkiem,instrukcją,QR i telefonem;7testów modelu (wliczone w878), kontrole PDF/fontów/hash/ZIP i dwie partie przeglądarkowe2/6osób PASS. Fizyczny test zabawy, druku, składania i skanowania pozostaje NOT RUN.

**Bez promocji GCP, stosowania nowych reguł lub resetu kont. PRE-PROD pozostaje na poniższym0.9.1.2; PROD bez potwierdzonej publikacji.** Integracja sesji fizycznej z kontem online jest wyłączona. Realna dobroczynność wymaga autorytatywnej gospodarki, API jako jedynej drogi zapisu oraz organizacji, finansowania i potwierdzeń; aktualny program jest nieaktywny poza symulacją. Opublikowanie Pages nie jest aktywacją API GCP.

Pierwszy odebrany kandydat tego zakresu:351baaf6b21386b2f2641875269e6f7d9c2d44fd, CI41237587670 SUCCESS (4m46s), Pages41237587641 SUCCESS (23s), niezmieniony tag dev-0.10.0.0-20261031. Zachowuje własne dowody; końcowe uzupełnienie PL powyżej ma odrębne źródło, CI i tag.

## Poprzednie PRE-PROD — 0.10.1.0 / v25

Nieprzesuwany adnotowany tag `preprod-0.10.1.0-20261031` jest opublikowany i wskazuje sprawdzone źródło `353faad347262dce7c3632fdf7c71be124384ab1`.

**Opublikowane i odebrane:** źródło **`353faad347262dce7c3632fdf7c71be124384ab1`**, [CI41246449612 SUCCESS, 3 min 54 s](https://github.com/ksobczak321-oss/gra/actions/runs/41246449612), [Pages41246449682 SUCCESS, 31 s](https://github.com/ksobczak321-oss/gra/actions/runs/41246449682), [bridge41246756848 SUCCESS, 15 s](https://github.com/ksobczak321-oss/gra/actions/runs/41246756848) i [promocja41246771480, próba 1 — SUCCESS, 2 min 05 s](https://github.com/ksobczak321-oss/gra/actions/runs/41246771480). [Graj w PRE-PROD](https://harborlight-dev.web.app). Źródło rzeczywiście rozpoczętego deployu potwierdzono przed dalszą zmianą main.

Wersja obejmuje wszystkie zmiany DEV do353faad, w tym archipelag, wspólne okno ligi, prowadzenie od mapy i przyjazną redakcję polskich opisów. Kontrole workflow przeszły: obraz API, sondy, dokładny manifest i publiczne pliki, rzeczywiste zalogowane renderowanie istniejącej wyspy oraz izolacja trzech kont. Były odczytowe, bez resetu, zastępowania wysp lub zmiany haseł. [Właściciel wcześniej potwierdził zgodne reguły zapisu](PREPROD-V25-PREPARATION.md).

Lokalne archiwum tego samego SHA:54pliki /10 991 135bajtów, SHA-256 `6c738006d57e115b3293a88460e9432ccb1fafb51e1eb9c08fdb116914e4c744`, manifest `0010c121de03c64e157596d014d80eb04970e7f5d03e81350374b9ce1a6abd0d`. Wszystkie53pliki treści zgodne z pakietem testowanym w Chromium. [Pełny odbiór](DEV-0.10.1.0-VALIDATION.md).

| Artefakt próby 1 | ID GitHub | SHA-256 ZIP podany przez GitHub |
|---|---|---|
| `harborlight-dev-frontend-41246771480-1` | 13058689131 | `6cf2c47780159bd03189ce22d76e695a13bfc3ee4888b090163655539aed1ee0` |
| `harborlight-dev-release-41246771480-1` | 13058489698 | `fd9d122e0d3ddcf84650ff8b0ed9b388563f8d8fa0dd5e0a6922e04b3c77388d` |

Są to digests archiwów GitHub, odczytane z publicznej tabeli artefaktów, odrębne od hasha lokalnego TAR, manifestu aplikacji i obrazu backendu. Wewnętrznego ZIP nie pobrano.

**Bez resetu kont i PROD.** Flagi API kont i wewnętrznego ZIP potwierdzenia nie odczytano niezależnie. Sukces publikacji kodu nie oznacza automatycznej aktywacji Google/Facebook, prawdziwego Paynow, reklam lub dobroczynności. Test hostingu blokuje zapisy, więc osobny TC31 zapis→ponowne wczytanie pozostaje ręczny NOT RUN.

## Poprzednie PRE-PROD — 0.9.1.2, pilne

**Opublikowane i odebrane:** źródło **`3be1f9d2094f1432acacbb782eed1665fd00e6e1`**, [CI 41233382228 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41233382228), [Pages 41233382382 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41233382382), [bridge 41233723831 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41233723831), [PRE-PROD 41233737873, próba 1 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41233737873), czas **2 min 10 s**. [Gra PRE-PROD](https://harborlight-dev.web.app). Tag priorytetu w rejestrze: **pilne**; nieprzesuwany [tag Git urgent-0.9.1.2-20261031](https://github.com/ksobczak321-oss/gra/tree/urgent-0.9.1.2-20261031) jest opublikowany i wskazuje ten sam kod.

Poprawka dodaje Polski/English w opisie i przy nazwie wyspy, zachowuje roboczą nazwę i etap, a język obowiązuje w dalszym interfejsie. Dane graczy, Authentication i postęp nie były resetowane. W tym wydaniu pilnym pozostałe projekty były odłożone; obecny DEV rozwija je osobno. PROD bez promocji. Końcowa kontrola manifestu, publicznych plików oraz wymagane testy rzeczywistego hostingu przeszły w workflow. Wartości flagi API i wewnętrznego digestu backendu nie odczytano niezależnie z ZIP.

| Artefakt próby 1 | Publiczny SHA-256 ZIP GitHub |
|---|---|
| `harborlight-dev-frontend-41233737873-1` | `0cb747023ad430c647c045913ef2712d8c475f9348fe3e14a4ddee3b713bde56` |
| `harborlight-dev-release-41233737873-1` | `3da4a3be0466a81597eec76c130c69b2d0bcffbc3e6dd377fa2f33aac1aadae1` |

Lokalny deterministyczny pakiet tego SHA: 49 plików z manifestem, 10 841 954 bajtów; archiwum SHA-256 `8fba6ec781e959d855273b333e1922ce3db113b058a51f2c8c92c3071435fd1f`, manifest `31185615e64a8dca97440799125a1e13bd160cf3dbc609991e0e05e9c3c3ce0e`. Publiczne bajty są identyczne z przeglądarkowo sprawdzoną poprawką: 13 scenariuszy wprowadzenia i Settings PL/EN desktop/mobile PASS. Pełny Node747PASS, pakowanie12PASS, importer18PASS; niezależny ręczny odbiór46przypadków nadal NOT RUN. Pierwsza próba 11f6ff1/41232457485 była nieudana; nie uznajemy jej za odbiór ani nie przesuwamy jej statusu na sukces. Przyczyny ówczesnej niezgodności nie rozstrzygnięto; nowa kontrola zachowuje pełną zgodność i bounded retries.

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
| **PRE-PROD — GCP `harborlight-dev`** | **0.9.1.2 / `3be1f9d2094f1432acacbb782eed1665fd00e6e1`**, [41233737873 próba 1 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41233737873); 2m10s, oba artefakty opublikowane. | Konta nie były resetowane. ZIP potwierdzenia nie został odczytany niezależnie; nie wnioskuj o włączeniu API z samego sukcesu. |
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

**Bieżący wynik operacji: nowa promocja0.10.1.0 ma SUCCESS; reset nadal niewykonany i nie był częścią tej publikacji.** Kolejny etap wymaga oryginalnego ZIP potwierdzenia, odczytu konfiguracji/API oraz wykonania procedury w zalogowanej sesji właściciela GCP, z końcowym odczytem wszystkich trzech kont.

## Jak aktualizować rejestr

Przy każdej zmianie statusu zapisujemy osobno:

1. Zakres kodu przygotowanego w DEV i rzeczywiste lokalne wyniki testów.
2. Pełny commit SHA zsynchronizowany z Git oraz numer i wynik CI dla tego samego SHA; jeśli istotne, również numer próby.
3. Link i numer publikacji podglądu Pages oraz wynik sprawdzenia faktycznie serwowanej wersji.
4. Numer i próbę promocji PRE-PROD, źródłowe CI/SHA, manifest opublikowanego frontendu, wynik sond i realnego odbioru kont/API, parę artefaktów v2.
5. Osobny wynik aktywacji nowej konfiguracji/usług i osobny wynik resetu wraz z kontrolą wszystkich trzech kont. Nie wpisujemy „gotowe” na podstawie samego uruchomienia skryptu.
6. Przy PROD: źródłowe udane PRE-PROD, identyczny pakiet/digest, własny odbiór oraz domenę/DNS/TLS potwierdzone rzeczywistym odczytem.

SHA, CI/Pages oraz udaną promocję v22.1 zapisano wyżej. Dowód DEV stanowi opisany tag; osobny dowód GCP to przebieg `41222765705` i jego artefakty. Wartość konfiguracji API, wynik resetu i publikacja PROD wymagają dalszych rzeczywistych odczytów; nie wpisujemy ich jako wykonanych. Aktualizację potwierdzamy dowodem, a nie samym zakończeniem pracy nad kodem.
