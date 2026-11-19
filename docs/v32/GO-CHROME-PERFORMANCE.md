# Naprawa ładowania i obciążenia Chrome — 19 listopada 2026

## Hotfix 0.15.2.2 / cache19 — manifest i start admin3

Po pierwszej publikacji potwierdzono błąd rzeczywistego ciepłego cache. Przeglądarka, która wcześniej pobrała manifest e5 z `Cache-Control: public, max-age=86400`, uruchamiała nowy kod b94/cache18 ze starym manifestem z dysku. Liczba żądań manifestu pozostała 1 przed i po uruchomieniu gry, a CDP potwierdził `fromDiskCache`. Gra ponownie ładowała stare pełne atlasy i ustawiała Zakład skórzany na962, pod Kamieniołomem972. Nie było błędów JS sygnalizujących tę degradację.

Dowód `/workspace/work/perf-20261119/cache-warm/pilot-report.json` pochodzi z prawdziwego lokalnego HTTP i natywnego cache Chrome: bez Playwright routing, wyłączenia lub czyszczenia cache oraz bez mutacji modelu i kont. To materialny **warm-cache quality FAIL**, mimo poprawnych wyników pierwszego własnego CI i standardowego wdrożenia na świeżej przeglądarce.

Pierwsza paczka zachowuje historyczne sukcesy: CI44520278661 dla b94 **SUCCESS38min20s**, Pages44520278629 **SUCCESS28s**, standardowy GCP44526548282/próba1 **SUCCESS6min44s**, z wykonanymi wymaganymi testami i bez resetu. Ręczny odbiór „tak jest ok” i tag DEV `dev-0.15.2.1-20261119` odnoszą się do b94/cache18. Wykrycie błędu ciepłego cache ponownie otworzyło odbiór; tag PRE-PROD tej paczki nie powstał. Błędnego wariantu nie przedstawiamy jako kompletnego odbioru stabilności istniejących przeglądarek.

Niezależna kontrola pierwszego wdrożenia b94 potwierdziła oba oryginalne ZIP-y, wszystkie cztery warunki receipt oraz identyczne archiwum455plików. Zachowano UID i generację2 wszystkich trzech istniejących wysp. Rewizje przed/po wyniosły107→119,34→34 i591→591; admin1 kontynuował grę, a pełne ładunki admin2 i admin3 są identyczne. Kontrole były odczytowe. Te dowody potwierdzają integralność publikacji i zachowanie kont; nie usuwają błędów ciepłego cache i startu admin3 ani nie tworzą odbioru PRE-PROD.

Zgłoszenie „Admin3 na pre prod wisi pozostałe chodzą” odtworzono na prywatnej kopii rzeczywistego zapisu, bez zapisów do konta. Authentication i API działają; admin3 ma generację2, rewizję591, 97 mieszkańców i prawie48h do rozliczenia. Zegar zwraca1×. Przeglądarka zatrzymuje heartbeat po rozpoczęciu synchronicznego `advanceArchipelago`, bez błędów JS; odczyt zapisu i jego odtworzenie są szybkie. Pierwsze2000 zdarzeń nadal przesuwało czas, więc nie potwierdzono stałej pętli drobnego kroku. Problemem jest długie nadrabianie czasu na głównym wątku oraz wielokrotne wyliczanie statusów mieszkańców i produkcji. Dotychczasowy test UI publikacji b94 obejmował admin1; poprawny odczyt wszystkich trzech kont nie był dowodem uruchomienia admin3.

Bieżący kandydat **C4 / 0.15.2.2 / cache19** łączy przeniesienie początkowego rozliczenia do Workera z ograniczeniem powtarzanych obliczeń diety do jednego `advancePopulation`, z jawnym unieważnianiem po każdej zmianie wejść. Worker używa jednego wywołania istniejącego modelu ze stałym czasem docelowym; transport zachowuje pełny stan bez kompaktowania zapisu, a przed adopcją ponownie potwierdzane są sesja, generacja, rewizja i zegar. Zamknięcie strony, wylogowanie, zmiana konta lub nowszego zapisu odrzucają wynik. Nie zapisuje się częściowo przeliczonego świata. Zakończony klient startowy jest zwalniany, aby nie zatrzymywać starej kopii świata.

Testy komponentu Workera: **23 Node i 12 natywnych przypadków przeglądarkowych PASS**. Publiczny scenariusz 97 osób, 35 pracowników i 48 h zakończył pełny stały przedział w jednym Workerze przy 602 sygnałach heartbeat i maksymalnej przerwie74ms, bez błędów JS. To skonstruowany scenariusz testowy, nie odbiór prywatnego admin3. Sprawdzono również anulowanie, zmianę rewizji i zegara oraz ponowne rozliczenie czasu pozostałego po wolnym potwierdzeniu. Po małym zwolnieniu pamięci klienta ponownie przeszły 26 przypadków startu, 4 wydajności i rzeczywisty ciepły cache. Dowody komponentowe mają własne odciski plików; pierwszy przebieg Workera obejmował C3, a kontrole następcze nie są odbiorem końcowego C4 ani jeszcze niezamrożonego SHA.

Wcześniejszy C3 dał dokładnie taki sam JSON pierwszej godziny rzeczywistego zapisu jak B94: 11,103s wobec32,351s. Dalszy checkpoint około9,78h ujawnił jednak77 636 wierszy historii posiłków / 8,26MB i nieakceptowalny czas dalszych obliczeń; szacunek pełnego przebiegu wynosił około30min. Dlatego C3 nie jest kandydatem do odbioru. C4 zachowuje tę historię i zasady, a przyspiesza wyłącznie ponawiane odczyty: 18 kierunkowych testów zakresów i unieważniania PASS. Dokładne porównania C4 mają **PASS** dla dwóch całych wyników: pierwsza godzina rzeczywistego admin3 jest identyczna bajtowo z B94 (239 055 bajtów), a kolejna godzina z gęstego checkpointu9,78h daje identyczne9 226 855 bajtów jak C3, bez ponownej normalizacji. Pierwsza godzina C4 trwała14,603s — więcej niż11,103s dla wcześniejszego C3; nie deklarujemy ogólnego przyspieszenia zimnego stanu. Godzina gęstego checkpointu C4 zajęła17,261s czasu ściennego /20,778s CPU. Czas referencji C3 obejmuje celowe wstrzymanie procesu, więc nie służy do wyznaczania dokładnego przyspieszenia. Pełne47,885h C4 nie zostało jeszcze uruchomione i pozostaje **PENDING**. [Lokalny odbiór admin3](ADMIN3-OFFLINE-CATCHUP-LOCAL-ACCEPTANCE.json) rozdziela te dowody od nieukończonej pełnej referencji. Wcześniejsze pełne przebiegi C1–C3 zostały zastąpione bez końcowego wyniku; nie opisuje się ich jako PASS. Długi referencyjny B94 jest wstrzymany po około15h symulacji i21min CPU.

Standardowy PRE-PROD otrzymuje osobny obowiązkowy test rzeczywistego admin3 z limitem600s, kontrolą heartbeat i obserwacją Workera, gdy start przekracza30s. Dotychczasowy limit30s dla admin1 pozostaje bez zmian. Wszystkie zapisy przeglądarki są blokowane, a schemat receipt nadal ma cztery warunki; dodany test admin3 musi przejść w tym samym standardowym jobie. Źródło C4, pełny przebieg47,885h, rzeczywisty start admin3, własny CI i nowa publikacja pozostają **PENDING**. Bez pomijania nieobecności, usuwania historii, resetowania konta lub zmiany jego zegara.

Lokalny test ciepłego cache roboczego cache19 ma **PASS**: dwie kontrole negatywne, trzy rzeczywiste starty gry, pięć żądań manifestu z ponowną walidacją i końcowym304; bez czyszczenia cache, Playwright routing, starych atlasów, błędów JS lub zapisów chmurowych. Widoczna kolejność Zakład/Kamieniołom1000/972 jest prawidłowa. To kontrola roboczego kodu przed zamrożeniem, nie odbiór nowego wydania.

Bieżąca rutynowa poprawka **0.15.2.2 / `frontend-v32-19`** ma trzy części: wersjonowany URL manifestu, żądanie `fetch` z `cache:no-cache` i jawny nagłówek Hostingu dla manifestu, nadrzędny wobec ogólnego cache obrazów24h. Zlecone „sprawdź i popraw” oraz „wrzuć na preprod” obejmują naprawę tego błędu bez dodatkowej zgody. Gracz nie musi ręcznie czyścić cache.

Nowy kod, źródła eksportów i publikacja czekają na zamrożenie. Własny CI, Pages, test pełnego startu admin3, pełny przebieg modelu, tag i nowy standardowy PRE-PROD są **PENDING**. Lokalny test rzeczywistego ciepłego cache roboczego kodu przeszedł; jego ponowna kontrola końcowego źródła pozostaje wymagana. Ręczny odbiór cache19 na DEV i PRE-PROD **NOT_RUN**. Poprzednie benchmarki pozostają pomiarami pierwszego kandydata; nie nadajemy im nowego źródła cache19. Zakres nadal obejmuje wydajność i kolejność Zakładu skórzanego, z zachowaniem zaakceptowanych pikseli, gospodarki, kont i postępu; bez PROD, DNS i resetu.

[Dowody bieżącego hotfixa](CHROME-PERFORMANCE-EVIDENCE.json) przechowują całą pierwszą paczkę pod `previous_cache18_attempt`. Poniższy tekst zachowuje historyczny snapshot pierwszej paczki z wcześniejszym stanem promocji; aktualny etap opisano powyżej.

## Historia pierwszej paczki 0.15.2.1 / cache18

Użytkownik zgłosił: „gra się wolno ładuje i czasami zawiesza Chrome, sprawdź czemu i popraw”. Zakres obejmuje diagnozę rzeczywistego startu, poprawkę na DEV, pomiar przed/po oraz standardową promocję sprawdzonej poprawki do PRE-PROD. Kod i eksporty **0.15.2.1 / `frontend-v32-18`** są zamrożone na `bf2f4ac12c1ef1cd69adb8c3e572649fdc975190`. Publikacja `b94af8befa671d936eeaf6e4be9b933cbf61ff08` jest odebrana na DEV: własny CI i Pages SUCCESS, ręczny odbiór użytkownika PASS, tag zdalnie potwierdzony. Standardowa promocja PRE-PROD44526548282/próba1 jest w trakcie.

Późniejsze zgłoszenie ze screenem — „co tu się stało z tym domkiem producenta skór” — obejmuje także naprawę kolejności rysowania Zakładu skórzanego. Jego grafika i geometria są zachowane; naprawiany jest porządek nakładania budynków.

19 listopada użytkownik potwierdził podgląd DEV słowami „tak jest ok”, a następnie polecił „wrzuć na preprod”. To jawny ręczny odbiór DEV **PASS** dla publikacji b94/cache18 i osobne GO promocji tego samego źródła do PRE-PROD po sukcesie dokładnego CI. Ręczny odbiór PRE-PROD nadal **NOT_RUN**. Dawny lokalny checkpoint bf2 i jego ówczesny NOT_RUN pozostają bez zmiany.

## Potwierdzony problem

Izolowany pomiar poprzedniego źródła `e5d76110365c77d5c026b53b6195e56a3a327542`, z rzeczywistymi obrazami i pustą pamięcią podręczną, pobrał na starcie **52 630 275 bajtów / 29 adresów obrazów**. Gra ładowała wszystkie atlasy dziesięciu wariantów każdej rodziny, stare obrazy miniatur i wiatraka oraz bazowy PNG pod dwoma adresami.

W pomiarze desktop renderer Chrome osiągnął około **748 MB RSS**, a na telefonie 2× około **717 MB**, przy stercie JS około 14 MB. Przez 6 s bezczynności czas wykonywania skryptów wzrósł o 3,19 s na desktopie i 3,14 s na telefonie. Osobny profil wskazał koszt pełnoekranowych masek i pośredniej kopii animacji wody. Nie odtworzono w tym pomiarze awarii procesu przeglądarki.

To pomiary lokalnego HTTP i headless Chromium z renderowaniem programowym. Czas startu nie obejmuje opóźnień publicznej sieci, wyniki FPS nie są przewidywaniem dla sprzętowego GPU, a suma RSS procesów może liczyć współdzielone strony. Dlatego osobno zapisano RSS renderera. Pierwsze pomiary z równoległymi przeglądarkami zachowano jako pomocnicze; porównanie końcowe musi używać izolowanych przebiegów.

## Przygotowana poprawka

- 200 osobnych WebP wydziela dokładne istniejące kadry. Każdy ma identyczne piksele RGBA, również RGB przezroczystych pikseli. Bez skalowania, retuszu lub zmiany zaakceptowanych budynków, ich kotwic i obwiedni.
- Start pobiera i dekoduje bieżący wariant każdej z 20 rodzin oraz teren. Dekoracyjna chatka może potrzebować 21. kadru, jeżeli jej wygląd zależny od Ratusza różni się od aktualnego Domu. Żuraw jest wymagany wtedy, gdy istnieje rzeczywista budowa. Dekodowanie ma ograniczoną współbieżność; pełna bieżąca scena pozostaje warunkiem odsłonięcia gry.
- Menu powstaje po wczytaniu katalogu aktualnych grafik, bez wcześniejszego żądania zastąpionych obrazów. Nowa scena nie pobiera nieużywanego starego wiatraka ani zbędnej kopii referencyjnego PNG.
- Galeria zachowuje wszystkie 200 wariantów i dołącza obrazy przy zbliżaniu się do widocznego obszaru.
- Woda używa przygotowanych raz masek `Path2D` i rysowania bezpośredniego zamiast pełnoekranowych operacji mieszania oraz kopiowania pośredniego canvasa. Źródło animacji, parametry fal, brzegi, chronione obiekty i ustawienia ruchu pozostają zachowane. Pięć testów jednostkowych wody i 13 sektorów testu wybrzeża PASS. Porównanie rastra wykazuje drobne różnice antyaliasingu przy skalowaniu, z niezmienioną alfą; nie deklarujemy identyczności bajtowej wody. To odrębne od ścisłej zgodności RGBA wszystkich 200 grafik budynków.

Pierwszy wariant wszystkich 20 rodzin zajmuje **2 075 264 bajty plików / 6 586 756 bajtów RGBA**, wobec **28 851 038 / 125 822 076** dla pełnych 20 atlasów. To porównanie samych grafik budynków pierwszego etapu; rzeczywisty transfer całego roboczego kandydata opisano poniżej.

Oryginalne 22 WebP pozostają niezmienione i dostępne dla starszego kodu. Pełny pakiet obejmuje dodatkowo 200 pochodnych grafik, więc cały artefakt wdrożeniowy rośnie, chociaż bieżąca gra pobiera mniejszy podzbiór. Lista pozostaje jawna i zamknięta: **455 plików, limit 512 wpisów i 128 MiB**. Nie używamy dowolnego globu ani nie wyłączamy rygorystycznej weryfikacji archiwum.

## Lokalny pomiar przed i po

Powtórzono izolowany pomiar tym samym narzędziem i rzeczywistymi obrazami, z pustą pamięcią podręczną. Roboczy kandydat pobrał **12 749 925 bajtów / 25 adresów obrazów**, czyli o **75,8% mniej bajtów obrazów** niż poprzednia wersja. Nie było błędów JavaScript ani żądań do prawdziwych kont.

| Pomiar | Przed | Po |
| --- | ---: | ---: |
| Start desktop 1440×900 | 3,60 s | 2,46 s |
| Start telefon 390×844, 2× | 2,98 s | 1,68 s |
| Renderer RSS desktop | 748 MB | 553 MB |
| Renderer RSS telefon | 717 MB | 516 MB |

Próba wody z wymuszonym odczytem pikseli, 40 iteracji dla każdej skali, obniżyła koszt pełnego rozmiaru z 20,63 do 13,19 ms na klatkę. To lokalny mikrobenchmark, a nie deklaracja FPS u użytkownika. Pomiary pochodzą z roboczego drzewa przed zamrożeniem końcowego źródła i cache; nie zastępują jego CI, odbioru publikacji ani późniejszego testu poprawki warstw.

## Zakład skórzany — kolejność warstw

Analityczna kontrola dokładnych pikseli alfa wykazała, że grunt Kamieniołomu na wysokości 486 dawał mu `z-index:972`, a grunt Zakładu skórzanego na wysokości 481 — `z-index:962`. Kamieniołom zasłaniał około 44% nieprzezroczystych pikseli pierwszego wariantu domku; dla 100 kombinacji wariantów obu budynków było to 42,6–57,5%.

Manifest otrzymuje wyłącznie `buildings.leatherworks.paintDepth=500`, co daje Zakładowi skórzanemu `z-index:1000`. Normalizer ściśle sprawdza tę wartość. Pozycje, skala, kotwice, kadry, obwiednie alfa i hotspot pozostają bez zmiany. Wcześniejszy dowód identyczności metadanych dotyczył etapu przed tą poprawką; bieżące wyjątki to dodane `sprites` i ten jeden porządek rysowania. Analityczny wynik obejmuje wszystkie 100 kombinacji; końcowy test rzeczywistego UI cache18 potwierdził kolejność Zakład/Kamieniołom 1000/972. Łącznie kierunkowe testy Node: **26/26 PASS** — 21 grafiki budynków i 5 wody.

## Lokalny odbiór zamrożonego cache18

Na dokładnym kodzie `bf2f4ac12c1ef1cd69adb8c3e572649fdc975190` wszystkie cztery końcowe programy przeglądarkowe przeszły: wydajność z prawdziwymi obrazami (4 przypadki), pełny runtime budynków (200 obwiedni alfa, 160 przypadków geometrii żurawi i 4 kontrole negatywne), bramka startu (26 przypadków) oraz zaakceptowany front w szerokościach 1672/1440/390/320. Nie było błędów JS ani operacji na prawdziwych kontach. Rzeczywisty start pobrał 12 749 925 bajtów, nie pobrał pełnych atlasów ani starych grafik gospodarstwa, portu i wiatraka; niezmieniony tick nie żądał kolejnych obrazów. Sprawdzono także niezależność od błędu przyszłego nieużywanego wariantu oraz blokadę i retry błędu bieżącego kadru i aktywnego żurawia.

Nowy dowód zgodności potwierdził 22 niezmienione oryginalne WebP oraz zgodność wcześniejszych pól manifestu po odjęciu wyłącznie `sprites` i `leatherworks.paintDepth=500`. Ponowna kontrola wszystkich 200 pochodnych kadrów RGBA PASS. Końcowe QA cache18 nie powtarzało benchmarku czasu; wcześniejsze izolowane porównanie czasów pozostaje osobnym pomiarem roboczego kandydata.

Pierwszy pełny lokalny frontend Node zakończył się wynikiem **1500/1501 PASS**: niezmieniony test długiego nadrabiania 96 godzin przekroczył limit subprocessu 10 000 ms podczas równoległych zestawów. Ten sam przypadek uruchomiony osobno przeszedł w **9335,864 ms**, z zachowanym oryginalnym limitem. Ten pierwszy lokalny wynik pozostaje w historii. Backend: **170/170 PASS**. Późniejszy własny CI dokładnego źródła publikacji przeszedł wszystkie 1501 testów frontendu; ten sam watchdog PASS w **6358,099351 ms**, bez zmiany limitu 10 000 ms.

Odczyt kontrolny obecnego PRE-PROD przed nową publikacją potwierdził 3 logowania, 3 istniejące wyspy, generacje 2/2/2 i izolację dostępu; nie zapisywał wysp. To punkt odniesienia do porównania po wdrożeniu, a nie dowód nowej promocji lub zachowania danych po niej.

## Artefakty publikacji

Artefakty odświeżono z dokładnego kodu `bf2f4ac12c1ef1cd69adb8c3e572649fdc975190`. Master ma 158 kart, w tym 58 bieżących i 62 568 bieżących wierszy, 120 odcisków źródeł i 200 wierszy wyglądów budynków; budowa i świeża walidacja PASS. Redakcyjny Excel zachowuje 6 kart, 413 wierszy, kolumny ABC i pustą C, ze 105 odciskami źródeł; budowa i walidacja PASS. Sprawdzono także zachowanie archiwum i świeże rzeczywiste symulacje 24/24/72 h. Wszystkie 14 tabel gospodarki jest identyczne z poprzednim źródłem.

Katalog 55 minigier oraz 55 DOCX i 55 TXT przeszedł wszystkie pięć kroków eksportu, budowy i kontroli. Semantyka gier i instrukcji pozostała identyczna; zmieniła się proweniencja dokładnego źródła. Commit publikacji `b94af8befa671d936eeaf6e4be9b933cbf61ff08` zachowuje kod i eksporty bf2; późniejsze uzupełnienie dowodów nie zmienia tych źródeł.

[Zbiorczy lokalny odbiór](CHROME-PERFORMANCE-LOCAL-ACCEPTANCE.json) zachowuje checkpoint lokalnej gotowości sprzed publikacji. Późniejszy własny CI opisano poniżej; nowa promocja PRE-PROD ma oddzielny przebieg.

## DEV odebrany — PRE-PROD w trakcie

[Pages44520278629](https://github.com/ksobczak321-oss/gra/actions/runs/44520278629) dla b94 zakończył się SUCCESS w 28 s, 19 listopada 13:03:08–13:03:36 czasu Warszawy (12:03:08–12:03:36 UTC). Niezależny normalny HTTPS/TLS potwierdził wszystkie **454 publiczne pliki / 96 462 542 bajty** zgodne ze źródłem; indeks Pages porównano z jego rzeczywistym plikiem w Git, bez deklarowania publikacji generowanego manifestu Firebase. Nowa próba bezpośredniego wejścia HTTPS w lokalnym Chromium pozostała **BLOCKED_CERT_AUTHORITY**; nie obchodzono TLS i nie deklaruje się natywnego odbioru Pages.

Pakiet tego commita ma **455 plików / 96 517 666 bajtów**. SHA-256 archiwum: `e94f3d50012b1dfb6397a6198d041a12a74d5b5bd1f1fd15a4bb8acc7a3ef730`; manifestu: `2f5df940c48abcf24d5e146d8e08c43e26bad93d5cef6468a2a12a6dfa0e2745`.

[CI44520278661](https://github.com/ksobczak321-oss/gra/actions/runs/44520278661) zakończył się **SUCCESS, 38 min 20 s**, job 38 min 16 s: 1501 frontend + 170 backend + 7 planszówki = **1678 Node**, **168 Python** i wszystkie **71 programów Chromium** (1 osobnych minigier + 52 główne + 18 chmurowych). Było 36 kroków SUCCESS, 2 pominięte warunkowe diagnostyki błędów i 0 FAILURE. Pełne testy jednostkowe i przeglądarkowe dokładnie b94 przeszły; wcześniejszy lokalny timeout pozostaje osobnym wynikiem historycznym.

Niezmienny tag `dev-0.15.2.1-20261119`, obiekt `38d0bb099e7bd5fff16ba46e5aa790a2cfc2664e`, jest zdalnie potwierdzony na b94. Ręczny odbiór DEV użytkownika pozostaje PASS.

Po jawnym GO rozpoczęto standardowy [PRE-PROD44526548282/próba1](https://github.com/ksobczak321-oss/gra/actions/runs/44526548282) 19 listopada o **13:43:32 czasu Warszawy (12:43:32 UTC)**. Źródło b94 jest potwierdzone, przebieg trwa. Receipt, niezależne oryginalne artefakty, natywny odbiór nowego PRE-PROD i jego tag pozostają PENDING; nie deklaruje się ukończonej promocji. Ręczny odbiór PRE-PROD **NOT_RUN**. Main pozostaje b94 do zakończenia standardowej promocji; dokumentacyjne uzupełnienie nie jest teraz wysyłane.

[Podgląd DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?preview=admin1-level5&v=frontend-v32-18). To podgląd deweloperski, nie nowe wdrożenie PRE-PROD.

## Odbiór i granice

Przed publikacją wymagane są: niezależny pomiar przed/po tym samym narzędziem, kontrola liczby i bajtów rzeczywistych żądań, zachowanie wyglądu i animacji, testy bramki startu oraz uszkodzonych wymaganych zasobów, przejścia wariantów i budowy, pełne CI dokładnego końcowego SHA, Pages i niezmienny tag DEV. PRE-PROD wymaga następnie standardowego `google-cloud-dev.yml`, potwierdzenia opublikowanych plików, istniejącej zalogowanej wyspy, izolacji kont, oryginalnych artefaktów i receipt.

Konta, hasła, UID, generacje, zapisy i zasady gospodarki pozostają zachowane. Poprawka nie resetuje postępu, nie zmienia zaakceptowanych grafik i nie publikuje PROD ani DNS. Bieżący ręczny odbiór DEV: **PASS** („tak jest ok”, b94/cache18); PRE-PROD: **NOT_RUN**. Poprzednie odebrane DEV/PRE-PROD 0.15.2.0 i ich tagi pozostają historycznym punktem odniesienia.

[Dowody i bieżący status](CHROME-PERFORMANCE-EVIDENCE.json) · [Odebrane wcześniejsze wydanie](BUILDING-UPGRADE-ART-PREPROD-ACCEPTANCE.json).
