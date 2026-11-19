# HARBORLIGHT

## Hotfix 0.15.2.2 / cache19 — manifest i blokada startu admin3

Dodatkowy test rzeczywistego ciepłego cache wykazał materialny błąd pierwszej paczki: stary manifest e5 miał `Cache-Control: public, max-age=86400`. Nowy kod b94/cache18 brał ten sam adres z dysku, bez ponownego żądania do serwera. Powracały pełne atlasy i kolejność Zakład/Kamieniołom 962/972. Test używał prawdziwego HTTP i cache Chrome, bez czyszczenia cache, Playwright routing lub operacji na kontach. Ocena tego wariantu: **QUALITY FAIL**.

Wcześniejsze [CI44520278661](https://github.com/ksobczak321-oss/gra/actions/runs/44520278661) i [GCP44526548282/próba1](https://github.com/ksobczak321-oss/gra/actions/runs/44526548282) dla b94 zachowują rzeczywiste **SUCCESS** (38 min 20 s i 6 min 44 s). Pozytywny ręczny odbiór „tak jest ok” i tag DEV `dev-0.15.2.1-20261119` dotyczą wyłącznie pierwszej paczki. Późniejsza kontrola ciepłego cache ponownie otwiera odbiór; tagu PRE-PROD tej paczki nie utworzono.

Niezależna kontrola pierwszego wdrożenia b94 potwierdziła oba oryginalne ZIP-y, wszystkie cztery warunki receipt oraz identyczne archiwum455plików. Zachowano UID i generację2 wszystkich trzech istniejących wysp. Rewizje przed/po wyniosły107→119,34→34 i591→591; admin1 kontynuował grę, a pełne ładunki admin2 i admin3 są identyczne. Kontrole były odczytowe. Te dowody potwierdzają integralność publikacji i zachowanie kont; nie usuwają błędów ciepłego cache i startu admin3 ani nie tworzą odbioru PRE-PROD.

Zgłoszenie „Admin3 na pre prod wisi pozostałe chodzą” odtworzono na prywatnej kopii rzeczywistego zapisu, bez zapisów do konta. Authentication i API działają; admin3 ma generację2, rewizję591, 97 mieszkańców i prawie48h do rozliczenia. Zegar zwraca1×. Przeglądarka zatrzymuje heartbeat po rozpoczęciu synchronicznego `advanceArchipelago`, bez błędów JS; odczyt zapisu i jego odtworzenie są szybkie. Pierwsze2000 zdarzeń nadal przesuwało czas, więc nie potwierdzono stałej pętli drobnego kroku. Problemem jest długie nadrabianie czasu na głównym wątku oraz wielokrotne wyliczanie statusów mieszkańców i produkcji. Dotychczasowy test UI publikacji b94 obejmował admin1; poprawny odczyt wszystkich trzech kont nie był dowodem uruchomienia admin3.

Bieżący kandydat **C4 / 0.15.2.2 / cache19** łączy przeniesienie początkowego rozliczenia do Workera z ograniczeniem powtarzanych obliczeń diety do jednego `advancePopulation`, z jawnym unieważnianiem po każdej zmianie wejść. Worker używa jednego wywołania istniejącego modelu ze stałym czasem docelowym; transport zachowuje pełny stan bez kompaktowania zapisu, a przed adopcją ponownie potwierdzane są sesja, generacja, rewizja i zegar. Zamknięcie strony, wylogowanie, zmiana konta lub nowszego zapisu odrzucają wynik. Nie zapisuje się częściowo przeliczonego świata. Zakończony klient startowy jest zwalniany, aby nie zatrzymywać starej kopii świata.

Testy komponentu Workera: **23 Node i 12 natywnych przypadków przeglądarkowych PASS**. Publiczny scenariusz 97 osób, 35 pracowników i 48 h zakończył pełny stały przedział w jednym Workerze przy 602 sygnałach heartbeat i maksymalnej przerwie74ms, bez błędów JS. To skonstruowany scenariusz testowy, nie odbiór prywatnego admin3. Sprawdzono również anulowanie, zmianę rewizji i zegara oraz ponowne rozliczenie czasu pozostałego po wolnym potwierdzeniu. Po małym zwolnieniu pamięci klienta ponownie przeszły 26 przypadków startu, 4 wydajności i rzeczywisty ciepły cache. Dowody komponentowe mają własne odciski plików; pierwszy przebieg Workera obejmował C3, a kontrole następcze nie są odbiorem końcowego C4 ani zamrożonego później źródła62db46b.

Wcześniejszy C3 dał dokładnie taki sam JSON pierwszej godziny rzeczywistego zapisu jak B94: 11,103s wobec32,351s. Dalszy checkpoint około9,78h ujawnił jednak77 636 wierszy historii posiłków / 8,26MB i nieakceptowalny czas dalszych obliczeń; szacunek pełnego przebiegu wynosił około30min. Dlatego C3 nie jest kandydatem do odbioru. C4 zachowuje tę historię i zasady, a przyspiesza wyłącznie ponawiane odczyty: 18 kierunkowych testów zakresów i unieważniania PASS. Dokładne porównania C4 mają **PASS** dla dwóch całych wyników: pierwsza godzina rzeczywistego admin3 jest identyczna bajtowo z B94 (239 055 bajtów), a kolejna godzina z gęstego checkpointu9,78h daje identyczne9 226 855 bajtów jak C3, bez ponownej normalizacji. Pierwsza godzina C4 trwała14,603s — więcej niż11,103s dla wcześniejszego C3; nie deklarujemy ogólnego przyspieszenia zimnego stanu. Godzina gęstego checkpointu C4 zajęła17,261s czasu ściennego /20,778s CPU. Czas referencji C3 obejmuje celowe wstrzymanie procesu, więc nie służy do wyznaczania dokładnego przyspieszenia. Pełne47,885h C4 i jego porównanie z pełną referencją B94 pozostają **PENDING**; zlecono osobny pełny przebieg i wznowienie zachowanej referencji. [Lokalny odbiór admin3](docs/v32/ADMIN3-OFFLINE-CATCHUP-LOCAL-ACCEPTANCE.json) rozdziela te dowody od nieukończonej pełnej referencji. Wcześniejsze pełne przebiegi C1–C3 zostały zastąpione bez końcowego wyniku; nie opisuje się ich jako PASS. Długi referencyjny B94 był wstrzymany po około15h symulacji i21min CPU; jego ukończenie nie jest jeszcze potwierdzone.

Standardowy PRE-PROD otrzymuje osobny obowiązkowy test rzeczywistego admin3 z limitem600s, kontrolą heartbeat i obserwacją Workera, gdy start przekracza30s. Dotychczasowy limit30s dla admin1 pozostaje bez zmian. Wszystkie zapisy przeglądarki są blokowane, a schemat receipt nadal ma cztery warunki; dodany test admin3 musi przejść w tym samym standardowym jobie. Źródło C4 jest zamrożone na62db46b; pełny przebieg47,885h, rzeczywisty start admin3, własny CI i nowa publikacja pozostają **PENDING**. Bez pomijania nieobecności, usuwania historii, resetowania konta lub zmiany jego zegara.

Lokalny test ciepłego cache roboczego cache19 ma **PASS**: dwie kontrole negatywne, trzy rzeczywiste starty gry, pięć żądań manifestu z ponowną walidacją i końcowym304; bez czyszczenia cache, Playwright routing, starych atlasów, błędów JS lub zapisów chmurowych. Widoczna kolejność Zakład/Kamieniołom1000/972 jest prawidłowa. To kontrola roboczego kodu przed zamrożeniem, nie odbiór nowego wydania.

Kod aplikacji i źródła eksportów **0.15.2.2 / cache19** są lokalnie zamrożone w `62db46b75cbda3c74264504ebca15cade7b4e1e4`. Pełny frontend Node ma **1548/1548 PASS** w210,141s; niezmieniony watchdog96h z limitem10s przeszedł w8418,451ms. Backend170 i planszówka7 PASS. Testy pakietu28/28 PASS po poprawieniu dwóch nieaktualnych oczekiwań455→458 dla trzech jawnie wymaganych modułów Workera; pierwszy błąd zachowano. Limity512wpisów/128MiB pozostają bez zmian. Korekta dotyczy testu pakietu w przyszłym commicie publikacyjnym, bez zmiany zamrożonego runtime.

Kanoniczne artefakty ze źródła62db46b mają budowę i świeżą walidację **PASS**: master158kart,58bieżących,62 998wierszy,123odciski źródeł i200wariantów grafik (7 789 221bajtów, SHA-256 `3a94bf8397a09c0eef2e890e32fee3acf1133e2bc0c7e9ade0b1d103d26472d7`); redakcyjny Excel6kart/413wierszy/pustaC/108odcisków (60 328bajtów, SHA-256 `7250f176b7e8e7f2b0717b0f587a2b868a64a5cc53f51b406891715673edac7f`). Trzynaście tabel wyników gospodarki, katalogi, reguły i stan początkowy są identyczne z BF2/B94. Rzeczywiste kanoniczne symulacje24/24/72h zachowują wszystkie checkpointy, komendy, typy, liczby zmiennoprzecinkowe i kolejność serializacji — zero różnic. Katalog55minigier i110instrukcji odświeżono wyłącznie w proweniencji, z przesunięciem istniejącej kotwicy1127→1129. To osobne dowody od nadal nieukończonego pełnego47,885h rzeczywistego admin3.

Fizyczny PRE-PROD nadal serwuje b94: workflow zakończył się sukcesem, lecz odbiór jakości jest ponownie otwarty. Ostatnim w pełni odebranym wydaniem pozostaje DDA/cache17. Nowy commit publikacyjny, jego własny CI i Pages oraz standardowe wdrożenie z wymaganym testem admin3 są **PENDING**. Kod62db46b po zamrożeniu nie jest zmieniany; obecne dokumenty i artefakty nie są dowodem publikacji.

Rutynowa poprawka **0.15.2.2 / `frontend-v32-19`** obejmuje wersjonowany adres manifestu, `fetch` z `cache:no-cache` i osobny nagłówek Hostingu wymuszający świeży manifest zamiast ogólnej polityki zasobów 24 h. Nie wymaga czyszczenia cache przez gracza ani nowej zgody na naprawę. Kod i źródła eksportów są zamrożone na62db46b; nowa publikacja, jej własny CI, Pages, tag oraz standardowy PRE-PROD pozostają **PENDING**. Ręczny odbiór nowego DEV i PRE-PROD: **NOT_RUN**. Dawne pomiary wydajności opisują pierwszego roboczego kandydata, nie nowy benchmark cache19. Grafiki, zasady, konta i postęp zachowane; bez PROD, DNS i resetu.

[Zakres hotfixa i historia](docs/v32/GO-CHROME-PERFORMANCE.md) · [Dowody i oddzielny snapshot cache18](docs/v32/CHROME-PERFORMANCE-EVIDENCE.json).

Poniższy snapshot pierwszej paczki zachowuje wcześniejszą chronologię, w tym stan sprzed zakończenia GCP i wykrycia błędu ciepłego cache. Bieżący stan dotyczy hotfixa cache19 powyżej.

## Naprawa wydajności Chrome i warstw — DEV odebrany, PRE-PROD w trakcie

Zgłoszenia z 19 listopada obejmują wolny start, okresowe zawieszanie Chrome i zasłonięty domek producenta skór. Izolowane porównanie rzeczywistych obrazów obniżyło transfer startowy z 52 630 275 do 12 749 925 bajtów (−75,8%). Lokalny start desktop zmienił się z 3,60 na 2,46 s, telefon 2× z 2,98 na 1,68 s; renderer RSS odpowiednio z około 748 do 553 MB i z 717 do 516 MB. Pomiar czasu pochodzi z roboczego kandydata przed zamrożeniem, lokalnego HTTP i headless Chromium; nie obejmuje publicznej sieci, a RSS nie jest samą stertą JS. Nie odtworzono crashu procesu.

200 osobnych kadrów ma ścisłą zgodność RGBA, a 22 oryginalne WebP pozostają zachowane. Loader pobiera bieżące warianty 20 rodzin i ewentualny dodatkowy kadr dekoracyjnej chatki zależnej od Ratusza, z ograniczonym dekodowaniem. Woda rysowana bezpośrednio przez przygotowane maski usuwa koszt pośredniej pełnoekranowej kopii; 5 testów wody i 13 sektorów wybrzeża PASS. Jawny pakiet zachowuje stare atlasy dla zgodności i dodaje nowe kadry: 455 plików, limit 512 wpisów / 128 MiB, 28 testów pakietu PASS. Cały artefakt jest większy, lecz start pobiera mniejszy podzbiór.

Kamieniołom zasłaniał około 44% pierwszego wariantu Zakładu skórzanego przez błędną kolejność rysowania. Jedyny dodatkowy wyjątek w dawnych metadanych to `leatherworks.paintDepth=500`; bez przesunięcia, skalowania lub zmiany grafiki i hotspotu. Analityczna kontrola obejmuje 100 kombinacji wariantów; końcowy rzeczywisty UI cache18 potwierdził kolejność Zakład/Kamieniołom 1000/972. Łącznie kierunkowe Node: 26/26 PASS (21 budynków + 5 wody).

Kod **0.15.2.1 / `frontend-v32-18`** jest zamrożony na `bf2f4ac12c1ef1cd69adb8c3e572649fdc975190`. Wszystkie 4 końcowe programy przeglądarkowe PASS: wydajność, runtime budynków, 26 przypadków startu i front w 4 szerokościach; bez prawdziwych zapisów i błędów JS. Pierwszy lokalny frontend Node miał 1500/1501 PASS — niezmieniony watchdog 10 s przekroczony przy równoległych zestawach, osobny identyczny przypadek PASS w 9335,864 ms, bez zmiany limitu; backend170 PASS. Ten wcześniejszy lokalny wynik pozostaje w historii. Publikacja `b94af8befa671d936eeaf6e4be9b933cbf61ff08` zachowuje kod i eksporty bf2. Jej [CI44520278661](https://github.com/ksobczak321-oss/gra/actions/runs/44520278661) ma **SUCCESS, 38 min 20 s** (job 38 min 16 s): 1501 frontend + 170 backend + 7 planszówki = 1678 Node, 168 Python i 71 programów Chromium (1 + 52 + 18); 36 kroków SUCCESS, 2 pominięte warunkowe diagnostyki i 0 FAILURE. Niezmieniony watchdog 10 s przeszedł w 6358,099351 ms. [Pages44520278629](https://github.com/ksobczak321-oss/gra/actions/runs/44520278629) **SUCCESS28s**; normalny TLS potwierdził 454 publiczne pliki / 96 462 542 bajty. Natywny lokalny HTTPS Chromium nadal BLOCKED_CERT_AUTHORITY, bez obejścia TLS. Tag `dev-0.15.2.1-20261119`, obiekt `38d0bb099e7bd5fff16ba46e5aa790a2cfc2664e`, jest zdalnie potwierdzony na b94. Standardowy PRE-PROD44526548282/próba1 rozpoczął się 19 listopada o 13:43:32 czasu Warszawy (12:43:32 UTC), ze źródłem b94; trwa, bez potwierdzonego receipt, oryginalnych artefaktów i tagu PRE-PROD. Obowiązuje DEV → zielony CI końcowego źródła → standardowy PRE-PROD. Konta, postęp, zasady i zaakceptowane grafiki zachowane; bez PROD, DNS lub resetu. Ręczny odbiór DEV **PASS**: użytkownik 19 listopada potwierdził „tak jest ok” dla b94/cache18, a następnie jawnie zlecił „wrzuć na preprod”. PRE-PROD jest w trakcie; jego ręczny odbiór nadal **NOT_RUN**. Dawny lokalny checkpoint bf2 nie jest przepisywany. Wcześniejsze odebrane 0.15.2.0 pozostaje poniżej jako historia.

Paczka b94 ma 455 plików / 96 517 666 bajtów. Artefakty bf2 są gotowe: master 158 kart / 58 bieżących / 62 568 wierszy / 120 źródeł / 200 wariantów oraz redakcyjny Excel 6 kart / 413 ABC / pusta C / 105 źródeł mają budowę i świeżą walidację PASS. Rzeczywiste symulacje 24/24/72 h i identyczność 14 tabel gospodarki PASS; 55 minigier i 110 instrukcji zachowuje semantykę po odświeżeniu proweniencji do bf2f4ac. [Zbiorczy lokalny odbiór](docs/v32/CHROME-PERFORMANCE-LOCAL-ACCEPTANCE.json). Własny CI SUCCESS, nowa promocja w trakcie; main pozostaje zamrożony na b94 do jej zakończenia, bez dokumentacyjnego push.

[Zakres](docs/v32/GO-CHROME-PERFORMANCE.md) · [Dowody i bieżący status](docs/v32/CHROME-PERFORMANCE-EVIDENCE.json).

## DEV i PRE-PROD 0.15.2.0 / cache17 — odebrane

GO użytkownika obejmuje wszystkie 20 funkcji wyspy i dekoracyjną chatkę: 10 wyglądów dla par poziomów 1–2 do 19–20, wspólne warianty na mapie i w menu, średniowieczny żuraw tylko podczas rzeczywistej budowy. Powyżej poziomu 20 pozostaje ostatni wygląd; limit poziomów i model gospodarki bez zmian. Ozdobna chatka nie ma funkcji ani przycisku, a jej wygląd podąża za Ratuszem. Teatr zachowuje funkcjonalny poziom1 i również zmienia wygląd według Ratusza. Port zachowuje istniejący statek.

Przygotowano 200 wariantów, 22 obrazy WebP bez strat (32 305 562 bajty; potwierdzona identyczność pikseli RGBA z wygenerowanymi PNG), 26 masek terenu i osobną galerię. Zamknięta lista pakietu zachowuje granicę 256 wpisów i limit 80 MiB, który pozwala utrzymać pełną jakość. Nowe testy modelu prezentacji: 17/17 PASS. Przegląd 200 wariantów i rzeczywisty runtime PASS; pełny program startu przeszedł w końcowym CI oraz na lokalnie odtworzonych publicznych bajtach. Wcześniejszy lokalny timeout pozostaje w dowodach. Arkusze odświeżone i świeżo zwalidowane: master ma 158 kart (100 archiwalnych i 58 bieżących), 62 497 bieżących wierszy i 120 odcisków źródeł, w tym tabelę 200 wariantów. Redakcyjny Excel zachowuje 6 kart, 413 wierszy i pustą kolumnę C. Późniejsze GO obejmuje PRE-PROD z Doradcą Królestwa, krótkim wprowadzeniem i zaakceptowanymi zmianami z Excela.

DEV **0.15.2.0 / cache `frontend-v32-17`** jest odebrany dla źródła `dda2fa1793e49ec23811ccffb147a7e56a366692`. [CI44287093749](https://github.com/ksobczak321-oss/gra/actions/runs/44287093749) zakończył się **SUCCESS 35 min 15 s** (job 34 min 54 s): 1492 testy frontend, 170 backend i 7 planszówki, łącznie 1669 Node, 167 Python i wszystkie 70 programów Chromium (1 osobnych minigier + 51 głównych + 18 chmurowych). [Pages44287093698](https://github.com/ksobczak321-oss/gra/actions/runs/44287093698) ma **SUCCESS 41 s**. Niezmienny tag `dev-0.15.2.0-20261118`, obiekt `8e896679845498da472156697c1a412635cf8443`, jest zdalnie potwierdzony na tym samym źródle.

Pakiet ma 255 plików / 69 289 150 bajtów, w tym generowany manifest wydania. Normalny HTTPS/TLS potwierdził wszystkie 254 publiczne pliki Pages / 69 262 846 bajtów zgodne z Git; obu publicznych arkuszom również sprawdzono pełne SHA-256. Odtworzenie pobranych publicznych bajtów lokalnie przeszło program budynków, cztery szerokości mapy oraz pełny start. Natywna przeglądarka HTTPS w tej infrastrukturze pozostaje **BLOCKED: ERR_CERT_AUTHORITY_INVALID**; nie obchodzono TLS i nie deklaruje się jej PASS.

Standardowa promocja [PRE-PROD44292700743/próba1](https://github.com/ksobczak321-oss/gra/actions/runs/44292700743) dla dokładnie tego samego źródła zakończyła się **SUCCESS 6 min 51 s**, 18 listopada **12:13:25–12:20:16 czasu Warszawy (11:13:25–11:20:16 UTC)**. Gate: 7 s / 7 kroków SUCCESS; deploy: 6 min 35 s / 32 kroki SUCCESS i 1 pominięta diagnostyka. Natywny odbiór hostowanych minigier przeszedł 110 plansz, 100 wariantów opowieści i 110 dokumentów. Natywny test istniejącej zalogowanej wyspy potwierdził 254 dokładne hashe zasobów, z zablokowanymi wszystkimi zapisami przeglądarki. Kontrola kont potwierdziła 3 logowania, 3 istniejące zapisy, 0 pustych wysp i izolację dostępu: odmowy 6 obcych i 3 anonimowych odczytów Firestore, 3 własnych bezpośrednich oraz 3 anonimowych API; 3 własne odczyty API PASS. Niezależne porównanie przed/po potwierdziło niezmienione UID, generacje 2/2/2, rewizje 54/9/591 i pełne ładunki wszystkich trzech zapisów. Nie zmieniono kont ani postępu. Niezależnie pobrano i sprawdzono oba oryginalne ZIP-y GitHub po rozmiarze i SHA-256; standardowa walidacja receipt potwierdziła wszystkie 4 kontrole, obraz API po digest oraz identyczne archiwum i manifest frontendu. Normalny TLS potwierdził wszystkie **255 plików PRE-PROD / 69 289 150 bajtów** identyczne z oryginalnym archiwum. Tag `preprod-0.15.2.0-20261118`, obiekt `99899f7585b0fd9adb4686b5dfd0c331a19ca089`, jest zdalnie potwierdzony na tym samym źródle. **DEV i PRE-PROD są odebrane.** PROD, DNS i reset poza zakresem. Ręczny odbiór użytkownika **NOT_RUN**.

[Pełny odbiór DEV i PRE-PROD](docs/v32/BUILDING-UPGRADE-ART-PREPROD-ACCEPTANCE.json) · [Gra PRE-PROD](https://harborlight-dev.web.app/harborlight-v1-layered.html?v=frontend-v32-17) · [Galeria PRE-PROD](https://harborlight-dev.web.app/harborlight-building-gallery.html?v=frontend-v32-17).

[Zakres](docs/v32/GO-BUILDING-UPGRADE-ART.md) · [Dowody](docs/v32/BUILDING-UPGRADE-ART-EVIDENCE.json) · [Grafiki](docs/v32/BUILDING-UPGRADE-ART-ASSETS.json).

[Gra DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-17) · [Galeria 200 wariantów](https://ksobczak321-oss.github.io/gra/harborlight-building-gallery.html?v=frontend-v32-17).

Pierwszy CI44279863651 dla9fc8cb1 zakończył się FAILURE na odciskach katalogu minigier. Odświeżono katalog i110 instrukcji bez zmian treści poza źródłowymSHA; kolejny SHA wymaga własnego pełnego CI. [GO PRE-PROD](docs/v32/GO-PREPROD-0.15.2.0.md).

Dodatkowy odbiór wykrył zasłonięcie żurawia wysokiej Latarni przez HUD w cache16. Cache17 przenosi go obok podstawy wieży: 160/160 przypadków DOM/alpha i 4 kontrole negatywne PASS, 38 pozycji innych rodzin bez zmiany. Cache16 nie jest promowany do PRE-PROD.

## Doradca Królestwa — DEV 0.15.1.0 / cache15, odebrany

Pierwsze wprowadzenie ma trzy kroki: **górny pasek → dolne menu → Gospodarstwo**. Dalsze rady i rozmowa z doradcą są dobrowolne. Pełny katalog i 25 lekcji pozostają w Pomocy, z zachowaną historią i nagrodami.

Uwzględniono pięć fioletowych zakładek, także jasnofioletowe „Odłożone odkrycia”: 175 wierszy, 34 niepuste C, 35 poprawionych tekstów i 10 dodanych rekordów katalogu. Siedem projektów pozostaje odłożonych. Testy kierunkowe: 30/30 PASS. Pełny master ma źródło 76a663d: obejmuje 157 arkuszy i 61 971 bieżących wierszy, a arkusz redakcyjny ze źródła abacd3f ma 6 zakładek, 413 wierszy i pustą kolumnę C. Budowa i niezależna walidacja przeszły.

DEV 0.15.1.0 / cache15 z poprawką CSS layout2 odebrany dla źródła `4dcc34ec3b462992330f88a22062070fcc0f7092`: [CI44164876130](https://github.com/ksobczak321-oss/gra/actions/runs/44164876130) i [Pages44164876499](https://github.com/ksobczak321-oss/gra/actions/runs/44164876499) **SUCCESS**. 1475 testów frontend, 170 backend, 7 planszówki i wszystkie 69 programów Chromium PASS; master i oba arkusze zwalidowane. Wszystkie 229 plików (36 879 151 bajtów) pobrano przez HTTPS i porównano z wersją w Git. Natywny HTTPS Chromium w tej infrastrukturze ma ograniczenie certyfikatu; odtworzenie rzeczywistych publicznych bajtów lokalnie PASS, bez obchodzenia TLS. Tag `dev-0.15.1.0-20261117` opublikowany i zdalnie potwierdzony na tym samym źródle. Poprzednie CI44141264184,44148037986,44154508808,44160545938 pozostają FAILURE. Doradca pozostawia dostęp do mapy na 320 i 390 px i dolnego menu starszych zapisów, także po wyciszeniu. Ręczny odbiór użytkownika: NOT_RUN. **Zakres: wyłącznie DEV.**

[DEV — start gry](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-15&ui=3) · [DEV — podgląd poziomu 5](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5&v=frontend-v32-15&ui=3)

[Zakres](docs/v32/GO-KINGDOM-ADVISOR.md) · [Dowody](docs/v32/KINGDOM-ADVISOR-EVIDENCE.json) · [HL-CHG-1159](docs/tracking/changes/HL-CHG-1159.md).


**Osobne minigry — DEV odebrany, pierwszy odbiór PRE-PROD nieudany.** Źródło 03f39a2 ma CI i Pages SUCCESS oraz niezmienny tag DEV. Gotowe 55 gier, 55 Word i 55 TXT są opublikowane na Hostingu, lecz PRE-PROD 44093734171/próba1 zakończył się FAILURE przez ścieżkę uruchamiania modułu. Nowa poprawka, własny CI i ponowna standardowa promocja oczekują; nie ma udanego receipt ani tagu PRE-PROD tej próby. [Indeks i dokumenty](https://harborlight-dev.web.app/minigames/) · [Zakres i przyczyna](docs/v32/GO-MINIGAMES-STANDALONE.md) · [Dowody](docs/v32/MINIGAMES-STANDALONE-EVIDENCE.json).

**DEV i PRE-PROD0.15.0.2/cache13 odebrane — 16listopada2026.** Aplikacja37061c, publikacja/wdrożenie `c4f752142c0421aad1dc0490a2f5139c277e6ee5`. WłasnyCI43850690541 SUCCESS24m31s (1614Node,166Python,66programówChromium), Pages43850690456 SUCCESS22s i PRE-PROD43854387444/1 SUCCESS2m22s. Start bez starej mapy/HUD; tempo1×/2×/6× tylkoadmin3. Natywny odbiór zalogowanej istniejącej wyspy i wszystkie109bajtowo zgodne plikiTLS PASS. TagiDEV/PRE-PROD0.15.0.2 opublikowane i zdalnie potwierdzone na c4.

[Graj w PRE-PROD](https://harborlight-dev.web.app/harborlight-auth.html?mode=login&v=frontend-v32-13) · [Podgląd DEV bez konta](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-13) · [Dowody odbioru](docs/v32/CACHE13-ACCEPTANCE.json) · [MASTER 15 — pełne zasady](docs/arkusze/HARBORLIGHT15-zasady.xlsx) · [Teksty6arkuszy do redakcji](docs/arkusze/HARBORLIGHT15-redakcja-6-zakladek.xlsx).

Wcześniejszy reset zakończony; nowe wdrożenie zachowało generacje2,1istniejącą wyspę i2puste, bez zapisów audytowych. Ręczny odbiór użytkownika NOT_RUN. PROD i DNS odłożone. Kolejny commit metadanych nie zmienia odebranego źródła c4 ani tagów.

**MASTER Excel 15** zawiera 156 arkuszy (100 archiwalnych i 56 bieżących), 61 262 bieżące wiersze i przeszedł świeżą walidację PASS. Obejmuje zasady, teksty i warunki, produkcję, minigry oraz rzeczywiste próby 24/24/72 h; 50 dni pozostaje planem. [Opis i regenerowanie](docs/arkusze/README.md) · [Raport](docs/arkusze/HARBORLIGHT15-zasady-walidacja.json). Gra i wdrożenia bez zmian. Artefakt gotowy do publikacji w Git; wynik nowego CI należy sprawdzić w Actions.

## Historia wcześniejszych wydań i checkpointów

**DEV 0.15.0.0 / v32 — zmiany wyłącznie na DEV.** Bazą jest dokładny kod odebranego PRE-PROD `7e81a1a436770f57fd8abf390b6af8022e3300f6` / 0.14.0.0. Zintegrowano uzgodnienia z załączonej rozmowy i 47 odpowiedzi. PRE-PROD i PROD nie otrzymują tego wydania.

**[DEV — podgląd admin1 na poziomie5](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5&v=frontend-v32-6)** — publikacja i odbiór bieżącego źródła są ewidencjonowane osobno w [statusie DEV](docs/v32/DEV-READY.md). Podgląd działa bez konta, w pamięci bieżącej karty; odświeżenie zaczyna nową próbę. Trwałe konta i współdzielone usługi wymagają lokalnego serwera DEV.

[Ściągawka zmian do testów](docs/v32/TEST-CHEATSHEET.md) · [Lista z checkboxami](https://ksobczak321-oss.github.io/gra/docs/testing/dev-v32-checklist.html) · [Excel15 — teksty do redakcji](docs/arkusze/HARBORLIGHT15-teksty-DEV.xlsx).

Lokalny DEV: `node scripts/serve-dev.mjs`, `http://localhost:3000/harborlight-auth.html`; pary login/hasło `admin1/admin1`, `admin2/admin2`, `admin3/admin3`. Zapis znajduje się na serwerze DEV, poza repozytorium. [Zakres i dostęp](docs/v32/DEV-READY.md) · [Audyt reguł](docs/v32/IMPLEMENTATION-AUDIT.md) · [Interfejs](docs/v32/VISUAL-REVIEW.md) · [Balans](docs/v32/DEV-BALANCE.md).

15 listopada 2026 potwierdzono osobno rzeczywiste logowanie Firebase PRE-PROD trzema parami `adminN/adminN`; hasła już były zgodne, nie zmieniano kont ani zapisów. Kod PRE-PROD nadal wskazuje `7e81a1a`; bieżący odczyt `/api/v1/config` zwracał 503 i nie stanowi odbioru działania usług.

Poniżej zachowano historię poprzednich wydań i ich własne wyniki.

**DEV i PRE-PROD 0.14.0.0 / v31 odebrane — 4 listopada 2026.** Źródło `7e81a1a436770f57fd8abf390b6af8022e3300f6`, cache `frontend-v31-2`. Własne [CI 41906515746](https://github.com/ksobczak321-oss/gra/actions/runs/41906515746) SUCCESS 17 min 12 s, [Pages 41906515747](https://github.com/ksobczak321-oss/gra/actions/runs/41906515747) SUCCESS 50 s, [bridge 41909239074](https://github.com/ksobczak321-oss/gra/actions/runs/41909239074) SUCCESS 13 s i [deploy 41909268052, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41909268052) SUCCESS 2 min 12 s. Kontrole API, dokładnego Hostingu, zalogowanej gry i izolacji trzech kont PASS; oba artefakty opublikowano. Konta, hasła i postęp zachowano bez resetu. PROD bez nowej promocji.

**[Graj w PRE-PROD](https://harborlight-dev.web.app)** · **[Podgląd DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v31-2)** · [Dowody promocji](docs/PREPROD-V31-PROMOTION.md) · [Odbiór DEV](docs/DEV-0.14.0.0-VALIDATION.md) · [Excel 14](docs/arkusze/HARBORLIGHT14-zasady.xlsx).

Oba opublikowane tagi `dev-0.14.0.0-20261104` i `preprod-0.14.0.0-20261104` wskazują to samo źródło. Nowy pakiet obejmuje naprawy misji, rekrutacji, logistyki i zapisu, godzinny licznik minigier, 22 mechaniki zagadek, 20 opowieści po 5 wariantów oraz swobodny plac Teatru. [Plan 50 dni](docs/design/ACTIVE-PLAYER-50-DAYS.md) i [częściowa symulacja](docs/design/CAMPAIGN-V31-SIMULATION.md) rozdzielają projekt od obserwacji; pełnego testu 50 dni i 150 godzin ludzkiej zabawy nie zaliczono. **450 kart / 179 ręcznych prób NOT RUN**. Późniejszy commit metadanych nie zmienia źródła wdrożenia.

**Poprzedni PRE-PROD 0.13.1.0 — historia odbioru.** Źródło `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`; CI [41671140612](https://github.com/ksobczak321-oss/gra/actions/runs/41671140612) **SUCCESS, 14m 57s**, Pages [41671140578](https://github.com/ksobczak321-oss/gra/actions/runs/41671140578) **SUCCESS, 32s**, bridge [41673757060](https://github.com/ksobczak321-oss/gra/actions/runs/41673757060) **SUCCESS, 26s**, deploy [41673824262, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41673824262) **SUCCESS, 2m 56s**. Kontrole API/health/ready, dokładnego Hostingu, zalogowanej gry i izolacji trzech kont PASS; oba artefakty opublikowano. Konta, UID, hasła i postęp zachowano bez resetu. PROD i rzeczywiści operatorzy bez nowej aktywacji.

**Adresy poniżej pokazują bieżące wydanie; historyczny odbiór 0.13.1.0:** [PRE-PROD](https://harborlight-dev.web.app) · **[Podgląd dawnego DEV 0.13.1.0](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v30)** · [Pełne dowody promocji](docs/PREPROD-V30-PROMOTION.md). Tag `preprod-0.13.1.0-20261103` jest opublikowany i potwierdzony zdalnie: obiekt `52888386a2233fc326e4fa6e0169b1054c0316d4` rozwiązuje się do `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`. Tag DEV `dev-0.13.1.0-20261103` pozostaje na `13c55a4e4853edf44c185747c1c626ac42c221fc`. Późniejszy commit dokumentacji nie zastępuje źródła wdrożenia ani nie przesuwa tagów.

**Poprzedni DEV 0.13.1.0 / v30 — historia odbioru.** Źródło `13c55a4e4853edf44c185747c1c626ac42c221fc`; [CI 41667711260](https://github.com/ksobczak321-oss/gra/actions/runs/41667711260) **SUCCESS, 14m 39s**; [Pages 41667711124](https://github.com/ksobczak321-oss/gra/actions/runs/41667711124) **SUCCESS, 50s**. Tag `dev-0.13.1.0-20261103` opublikowany i zdalnie potwierdzony na tym samym źródle. Teatr pasujący do wyspy, plac po kliknięciu, bogate dekoracje, trzy pomysły i automatyczny zapis. Dalsze poziomy ozdób przy20miejscach. [Odbiór](docs/DEV-0.13.1.0-VALIDATION.md) · [Wymagania](docs/FRONTEND-V30-REQUIREMENTS.md) · [Excel13](docs/arkusze/HARBORLIGHT13-zasady.xlsx) · [147 scenariuszy](docs/testing/START-HERE.md). Odebrana promocja PRE-PROD ma osobne źródło68e9bcd i [dowody](docs/PREPROD-V30-PROMOTION.md).

**Poprzedni DEV 0.13.0.0 / v29 odebrany.** Źródło `cf6739a081d89bb5b2c6773a04a34f3fe2a8a8da`, [CI 41657032913](https://github.com/ksobczak321-oss/gra/actions/runs/41657032913) **SUCCESS, 13m 13s**, [Pages 41657032922](https://github.com/ksobczak321-oss/gra/actions/runs/41657032922) **SUCCESS, 41s**. Tag `dev-0.13.0.0-20261103` jest opublikowany i wskazuje to samo źródło. Nowa krzywa budowy, pojemność Magazynu, tutorial34/samouczek25, powitalni mieszkańcy, Teatr i dziewięć przygód. [Zakres](docs/FRONTEND-V29-REQUIREMENTS.md) · [Bieżąca walidacja](docs/DEV-0.13.0.0-VALIDATION.md) · [Excel12](docs/arkusze/HARBORLIGHT12-zasady.xlsx) · [134 scenariusze do odhaczania](docs/testing/START-HERE.md). Wyniki ręczne nadal NOT RUN. W dniu tego odbioru DEV PRE-PROD pozostawał0.12.0.0; późniejszy odbiór0.13.1.0 opisano powyżej.

Poniżej zachowano dowody poprzedniego odebranego wydania; nie zastępują własnego odbioru nowego kodu.

**Historyczny odbiór PRE-PROD 0.12.0.0.** Źródło `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`, [CI 41480146644](https://github.com/ksobczak321-oss/gra/actions/runs/41480146644) **SUCCESS, 13 min 46 s**, [Pages 41480146737](https://github.com/ksobczak321-oss/gra/actions/runs/41480146737) **SUCCESS, 41 s**, [bridge 41482423516](https://github.com/ksobczak321-oss/gra/actions/runs/41482423516) **SUCCESS, 21 s** oraz [deploy 41482455135, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41482455135) **SUCCESS, 2 min 20 s**. Przeszły kontrole dokładnego Hostingu, zalogowanej gry i izolacji trzech kont. Oba artefakty opublikowano. Kont, haseł i historii gry nie resetowano; PROD i rzeczywiści operatorzy bez nowej aktywacji. [Pełne dowody promocji](docs/PREPROD-V28-PROMOTION.md).

Tag [`preprod-0.12.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/preprod-0.12.0.0-20261102) jest **opublikowany i potwierdzony zdalnie**: obiekt `d66b25ba216e5b686e6a92b9b8558d35eda9fd2d` rozwiązuje się do `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`. Nie przesuwamy go na późniejsze commity metadanych.

**Historyczny pakiet0.12.0.0** (adresy środowisk pokazują obecnie bieżące wydanie). Aplikacja zachowuje schemat świata9 i archipelag2; 60 publicznych wejść jest identycznych z odebranym DEV0ca7715.

**Poprzedni DEV 0.12.0.0 odebrany dla źródła `0ca7715b6e9282b31ca7941c89c3c742ac0df9e6`**, cache `frontend-v28-2`. Własne [CI 41475214118](https://github.com/ksobczak321-oss/gra/actions/runs/41475214118) zakończyło się **SUCCESS, 12 min 33 s**; obie grupy Chromium przeszły dla tego samego SHA. [Pages 41475213874](https://github.com/ksobczak321-oss/gra/actions/runs/41475213874) ma **SUCCESS, 31 s**. Push na `main` potwierdzono. Tag [`dev-0.12.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/dev-0.12.0.0-20261102) jest **opublikowany i potwierdzony zdalnie**, wskazuje dokładnie ten SHA.

**[179 scenariuszy ręcznych](docs/testing/qa-checklist.html)** · **[Lista do odhaczania](docs/testing/START-HERE.md)** · **[450 kart zmian](docs/tracking/CHANGE-REGISTER.md)** · **[Planszówka do wydruku](docs/boardgame/README.md)**. Automatyczny odbiór listy QA nie zalicza prób ręcznych; wszystkie ich wyniki nadal **NOT RUN**. Integracja planszówki online pozostaje odłożona.

Historyczny pakiet v29 miał34kroki tutoriala,25lekcji programu7, nową krzywą budowy i pojemności, powitalnych mieszkańców, Teatr i9przygód. Zachowuje bank7porcji, modlitwę, misje Latarni, usługi monetami, ligę i oznaczony mock Pomagam. [Zakres](docs/FRONTEND-V29-REQUIREMENTS.md) · [Pełny odbiór i artefakty](docs/DEV-0.13.0.0-VALIDATION.md) · [Środowiska](docs/ENVIRONMENT-STATUS.md).

## Środowiska i wydanie

| Miejsce | Potwierdzony stan |
|---|---|
| DEV | **0.15.0.2/cache13**, źródło `c4f752142c0421aad1dc0490a2f5139c277e6ee5`; CI43850690541 SUCCESS24m31s, Pages43850690456 SUCCESS22s; tag `dev-0.15.0.2-20261116` potwierdzony. |
| PRE-PROD `harborlight-dev` | **0.15.0.2/cache13**, źródło `c4f752142c0421aad1dc0490a2f5139c277e6ee5`; deploy43854387444/1 SUCCESS2m22s, natywne UI i109plikówTLS PASS; tag `preprod-0.15.0.2-20261116` potwierdzony. |
| PROD `harborlight-prod` | Bez nowej promocji i potwierdzenia uruchomienia domeny. |

**Historyczny lokalny odbiór0.12:**1128Node (991frontend +130backend +7planszówka),141Python i32ChromiumPASS. **Historyczna promocja0.13.1.0:**1221Node (1080frontend +134backend +7planszówka),18testów rejestru i generatory/Excel13PASS. Własny CI poprawionego źródła zaliczył obie grupy przeglądarkowe, więc dawny wynik pierwszego pakietu nie zastępuje już bieżącego odbioru. Kierunkowe regresje obejmują dodatkowo 132 wymuszone próby przewijania PL/EN na telefonie, 4 warianty UI, 7 nowych testów prognozy i zestaw 144 testów powiązanych.

Pierwszy kandydat `0d17b7aa91fef72f0fb36d28451d711daeaee909` zachowuje CI 41471972606 **FAILURE, 9 min 48 s**: mobilny przycisk wyjścia tutoriala miał y=-21. Osobny audyt wykrył zawyżoną prognozę czasowej premii. Poprawione źródło0ca7715 ma własny późniejszy sukces; nie przepisujemy wcześniejszej awarii na sukces lub anulowanie.

Nie porównano niezależnie hostowanych bajtów Pages w tej sesji; wcześniejszy odczyt blokował proxy HTTP403. To ograniczenie osobnego odczytu hosta, nie wynik własnego CI lub pakowania.

## Wcześniejsza pilna poprawka 0.9.1.2

[Zakres v23.1](docs/FRONTEND-V23-1-REQUIREMENTS.md) obejmuje wyłącznie wybór języka PL/EN na pierwszym wprowadzeniu i przy nazwie wyspy. Zmiana ma zachować wpisaną nazwę, etap, zatrzymany czas i postęp. Poprawka przeszła własne CI i promocję PRE-PROD; dowody zapisano w rejestrze środowisk. Nie resetowano kont. Tamten zakres miał 251 zmian i 46 ręcznych przypadków; historyczna ewidencja tego odbioru miała **351 zmian i 96 przypadków**, w tym nowe HL-TC-0071–0096 dla v28.

## Poprzedni zakres DEV 0.9.1.1

W Ustawieniach dodano widoczne **0.9.1.1**; schema świata i zapis pozostają odrębne. [Zakres v23](docs/FRONTEND-V23-REQUIREMENTS.md) obejmuje również przegląd historii czatu, [osobne karty zmian](docs/tracking/CHANGE-REGISTER.md) i [ręczne przypadki testowe](docs/testing/MANUAL-TEST-PLAN.md), z wynikami NOT RUN do rzeczywistego odbioru. Karty są w Git; natywnych GitHub Issues jeszcze nie utworzono z powodu braku poprawnej autoryzacji. [Importer](scripts/README-tracking-issues.md) domyślnie tylko pokazuje plan.

Do decyzji są konkretne projekty: [wyspy/pasażerowie/handel](docs/design/ARCHIPELAGO-AND-TRADE-v23.md), [liga/społeczność/dobroczynność](docs/design/LEAGUE-COMMUNITY-CHARITY.md), [planszówka 2–6 osób](docs/design/BOARDGAME-LIGHTHOUSE-SESSION.md). W tamtym zakresie były projektami, przed implementacją v24 i obecną promocją. [Polityka wersji](docs/VERSIONING.md) odróżnia numer produktu od SHA i numerów sklepów; pierwsze wydanie Google Play użytkownik wskazał jako 1.0.0.0.

Projekt ligi w tamtej rewizji miał średnią wyników z premią współpracy i sojusze z czatem, a dobroczynność — ograniczoną pulę, przycisk i rzeczywisty bonus szczęścia. Planszówka ma teraz jedną talię, telefon i pionki oraz korzyści online. Była to rewizja zasad przed GO. Wówczas rejestr miał 241 zmian i 46 przypadków; aktualne liczby i stan są w tabeli powyżej.

Rzeczywisty koszt ostatnich 24 h jest nieustalony z powodu braku dostępu do Billing; [przygotowany odczyt](docs/GCP-COST-CONTROL.md#odczyt-ostatnich-24-godzin--zlecenie-31-października) nie jest wynikiem finansowym. Nie wykonywano pełnego resetu trzech kont.

## Co zmienia v18

- Materiały bonusowe są od razu wydawalne i nie zajmują pojemności zwykłych dostaw. Wydajemy bonus przed zwykłym zapasem. Przepełnienie blokuje dalsze skrzynie samouczka, nie rozbudowę i zarządzanie wyspą.
- Poprawione przyjęcie nagród, limity kolejki, natychmiastowy transport, zachowanie wcześniejszych zleceń Targu i ochrona podjętego na czas ładunku Portu.
- Bazowe 20% szczęścia nowej wyspy, minimum 20% przez 72 h dla wszystkich, pierwszeństwo wymuszonego 100% i dwukrotnie szybszy dodatni przyrost ludności. Aktywność daje produkcję/podatki/transport ×2; po pięciu minutach ×1, po 48 h bez grania ×0,5.
- 25 prawdziwych działań samouczka ze wskazaniem właściwego przycisku, skrzynie 100–300 pięciu materiałów, zachowane odebrane nagrody i brak zasłaniania trwającej minigry.
- Nagrody rund 50, 100, 200, 400… i pula 50, 150, 350, 750…; dobrowolne przedłużenie przed terminem, ryzyko niewypłaconej serii i zachowany wybór kulek/trójek.
- Zapisywany harmonogram propozycji minigry/reklamy, nagrody materiałowe 10–30, osobne uprawnienie bez reklam w standardowej grze po zakupach 1999 gr/30 dni. Reklamy za czas ekspedycji pozostają także dla uprawnionych.
- Codzienne darmowe błogosławieństwo, wydarzenia dobre/złe, regularność Kaplicy, lojalność 50–200 sześciu zasobów oraz czytelne powiadomienia.
- Postęp konta wyłącznie w chmurze. Brak lokalnej wyspy i lokalnej kopii odzyskiwania; brak połączenia blokuje zatwierdzanie działań. Język i techniczna sesja logowania nie są zapisem postępu.

Nowe parametry cen dodatkowego czasu i wag wydarzeń są jawnie opisane jako konfigurowalne wartości wdrożeniowe. Ostatni wygenerowany [Excel 11](docs/arkusze/HARBORLIGHT11-zasady.xlsx) jest migawką reguł v18/v19 i [scenariuszy testowych](docs/TEST-SCENARIOS-v18.md); nie obejmuje rozszerzeń v20–v22. Starsze arkusze pozostają archiwami i nie są nadpisywane.

Uzupełnienie v19 dodaje bezpośrednie wylogowanie i odnośniki do dokumentów w Ustawieniach. Rejestracja wymaga osobnej akceptacji [roboczego Regulaminu](docs/TERMS-DRAFT.pl.md) i potwierdzenia przeczytania [Polityki prywatności](docs/PRIVACY-DRAFT.pl.md); nowe konta otrzymują wersjonowane potwierdzenie serwera. Dane operatora „Lorem ipsum” wymagają uzupełnienia przed publicznym uruchomieniem. Stałe konta PRE-PROD zachowują dostęp i historię.

Zakres [v20](docs/FRONTEND-V20-REQUIREMENTS.md), zawarty w opublikowanym v22.1, zaczyna nową wyspę od opisu gry, jej nazwania i oprowadzania po interfejsie. Zegar rusza po ukończeniu lub zamknięciu oprowadzania, a następnie zaczyna się standardowy samouczek. Migracja zachowuje istniejące światy i postęp lekcji. Postęp zapisuje się automatycznie co 30 sekund wyłącznie w chmurze; ręczny panel zapisu zastępuje bezpośrednie wylogowanie. Sesja po przekroczeniu bezczynności nie odnawia się samoczynnie po ponownym otwarciu przeglądarki.

## Konta i integracje

Zakres [v21](docs/FRONTEND-V21-REQUIREMENTS.md), zawarty w opublikowanym v22.1, przeplata nagrody nowego 25-krokowego samouczka z wydawaniem zasobów i dąży do zakończenia z pełnym magazynem bez zaległych skrzyń. Zachowuje stare postępy i nagrody. Rozbudowa Ratusza od 3→4 wymaga 75% ludności poprzedzającego poziomu; historyczne v21 zastępowało NPC handlem graczy od Ratusza 6; późniejsza przyjęta zasada przywraca obie ścieżki równolegle. Ratusz 10 pozwala utworzyć drugą wyspę, z jednorazowym skopiowaniem poziomów Ratusza i Magazynu. Własny statek przewozi 1000 sztuk w 10 minut bez opłaty za rejs; aktualnie zwiększenie pojemności towarowej kosztuje 50 monet za 1000 sztuk, zamiast osobnego zakupu PLN. Aktywacja serwerowego API i nowego rynku pozostaje do odrębnego potwierdzenia.

PRE-PROD ma rzeczywiste Firebase Authentication/Firestore dla stałych kont testowych. Kod produkcyjnych kont obsługuje e-mail oraz ścieżki Google/Facebook, lecz aktywacja dostawców, domen i aplikacji wymaga właścicielskiej konfiguracji. Brak konfiguracji nie jest zastępowany pozorowanym logowaniem. Gracz sam inicjuje i zatwierdza udostępnienie osiągnięcia; automatyczne posty strony i osobisty facebookowy push są odłożone.

**Paynow i reklamy są symulowane tylko w DEV/PRE-PROD**, z wyraźnym oznaczeniem i bez pobierania pieniędzy. PROD nie przyznaje zakupów ani nagród na podstawie symulacji. Uruchomienie rzeczywistego operatora/dostawcy wymaga osobnego przygotowania i weryfikacji potwierdzeń.

Backend zawiera kod API kont, transakcyjnego limitu kodów promocyjnych i retencji wysp. Włączenie tych usług wymaga konfiguracji serwera, Firestore, IAM i routingu; ich kod nie dowodzi działającej usługi w chmurze. Gospodarka pozostaje obliczana przez przeglądarkę, więc autorytatywne serwerowe rozliczenie komend i wyników jest kolejnym etapem.

Po trzech miesiącach kalendarzowych bez rzeczywistej gry wyspa może zostać zresetowana przy zachowaniu konta i historii. Stałe konta PRE-PROD są wyłączone. Automatyczne zwroty zakupów wycofano; [szkic regulaminu](docs/TERMS-DRAFT.pl.md) wymaga sprawdzenia przed rozpoczęciem płatnej sprzedaży.

## Uruchomienie DEV

```sh
python3 -m http.server 8002 --bind 127.0.0.1
```

Otwórz `http://127.0.0.1:8002/harborlight-v1-layered.html`. To nietrwały podgląd w pamięci, bez udawania konta i bez zapisu wyspy w przeglądarce. Konta chmurowe wymagają właściwego hosta i konfiguracji. Moduły nie działają przez `file://`.

## Sprawdzenia

```sh
node --test --test-concurrency=1 --test-isolation=none tests/*.test.mjs
node --test backend/test/*.test.mjs
python3 tests/harborlight-frontend-bundle.test.py
python3 tests/harborlight-frontend-v18-smoke.py
python3 tests/harborlight-v18-auth-smoke.py
```

Przeglądarka wymaga Python Playwright i Chromium; opcjonalna ścieżka wykonywalna to `HARBORLIGHT_CHROMIUM`. Wyniki lokalne, testy z atrapami i rzeczywisty odbiór hostingu są osobnymi dowodami. Aktualne liczby i ograniczenia zapisujemy wyłącznie w dzienniku po zakończeniu danego sprawdzenia.

## Publikacja i dokumentacja

Obowiązuje **DEV tutaj → GitHub/CI → PRE-PROD → PROD**. PRE-PROD wymaga CI tego samego SHA. PROD promuje identyczne archiwum frontendu i obraz po digest z udanego PRE-PROD, bez ponownej budowy. Nazwy techniczne `google-cloud-dev.yml` i `harborlight-dev-*` pozostają niezmienione.

- [Kontrakt promocji](docs/RELEASE-PROCESS.md)
- [Bieżący stan DEV / PRE-PROD / PROD](docs/ENVIRONMENT-STATUS.md)
- [Zlecony reset kont po promocji PRE-PROD](docs/PREPROD-RESET.md)
- [Sterowanie, samouczek i zapis](docs/INTERACTIVE-ISLAND.md)
- [Backlog i ograniczenia uruchomienia](docs/BACKLOG.md)
- [Dziennik wyników i publikacji](docs/IMPLEMENTATION-LOG.md)
- [Konfiguracja Google Cloud](docs/GOOGLE-CLOUD.md) — wcześniejsze instrukcje używają technicznej nazwy DEV dla obecnego PRE-PROD.
- [Archiwa arkuszy](docs/arkusze/README.md)
- [Monitorowanie kosztów i budżet alertowy GCP](docs/GCP-COST-CONTROL.md)
- [Zakup licencji na muzykę](docs/MUSIC-LICENSING.md)

BLACKOUT, PANIC PETS i wcześniejsze makiety pozostają historią repozytorium. Aktywny projekt to HARBORLIGHT.

Pilna poprawka 0.9.1.2 jest odebrana na DEV i PRE-PROD; [tag urgent-0.9.1.2-20261031](https://github.com/ksobczak321-oss/gra/tree/urgent-0.9.1.2-20261031) wiąże źródło i wyniki. Wszystkie wcześniejsze wskazania v22.1 pozostają opisem historii zawartych reguł; aktualne dowody podaje rejestr środowisk.
