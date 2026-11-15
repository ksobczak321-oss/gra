# DEV 0.14.0.0 / v31 — odbiór potwierdzony

Stan z **4 listopada 2026, Europe/Warsaw**. Użytkownik zatwierdził [zakres v31](FRONTEND-V31-REQUIREMENTS.md), a następnie doprecyzował publikację jako **DEV → PRE-PROD**. Końcowe źródło `7e81a1a436770f57fd8abf390b6af8022e3300f6` ma własne zielone CI, opublikowany podgląd i zdalnie potwierdzony tag DEV. Standardowa promocja tego źródła na PRE-PROD również zakończyła się sukcesem; jej artefakty i tag mają osobny [raport promocji](PREPROD-V31-PROMOTION.md). Kont, haseł i postępu nie resetowano. Nie wykonano operacji PROD.

## Końcowy stan wydania

| Warstwa | Potwierdzony wynik |
|---|---|
| Źródło | `7e81a1a436770f57fd8abf390b6af8022e3300f6` |
| Aplikacja | **0.14.0.0**, cache `frontend-v31-2`; schemat świata 9 i archipelagu 2 zachowany |
| Własne CI | [41906515746](https://github.com/ksobczak321-oss/gra/actions/runs/41906515746) **SUCCESS, 17 min 12 s** |
| Chromium w CI | Wszystkie **43 zestawy PASS**; grupa gry i nauki 10 min 37 s, grupa kont i zapisu 3 min 30 s |
| Pages | [41906515747](https://github.com/ksobczak321-oss/gra/actions/runs/41906515747) **SUCCESS, 50 s**; podgląd odrębny od Google Cloud |
| Tag DEV | `dev-0.14.0.0-20261104` opublikowany i potwierdzony zdalnie; obiekt `df353ff2a4ab68a7f4a671cb6261f81d4d805b1c` rozwiązuje się do końcowego źródła |
| Lokalny Node | **1331 PASS**: 1190 frontend + 134 backend + 7 samodzielna planszówka; ostatni pełny frontend 188,02 s |
| Lokalny Python | **141 PASS** w 11 zestawach |
| Lokalny Chromium | **43 zestawy PASS** po poprawkach; własne CI tego źródła ponownie wykonało cały spis |
| Pakiet | **85 plików / 19 682 273 bajty**, weryfikacja i rozpakowanie PASS |
| Excel 14 | **100 zakładek**, walidacja PASS; chroniony Excel 13 zachowany |
| Ewidencja | **450 kart**, wszystkie **179 ręcznych prób NOT RUN** |
| PRE-PROD | [Deploy 41909268052, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41909268052) **SUCCESS, 2 min 12 s**; [bridge 41909239074](https://github.com/ksobczak321-oss/gra/actions/runs/41909239074) **SUCCESS, 13 s** |
| Dane i zakres | Bez resetu kont, zmiany haseł, operacji PROD i aktywacji rzeczywistych operatorów |

Pełny lokalny frontend uruchamiano poleceniem `node --test --test-concurrency=1 --test-isolation=none tests/*.test.mjs`; log roboczy: `/tmp/harborlight-v31-keyboard-frontend-final.log`. Backend i planszówka mają odrębne przebiegi. Lokalny spis Chromium odtworzono z obu grup workflow. Ręczne przypadki nie dziedziczą wyników automatyzacji.

## Dokładny pakiet i arkusz

| Dowód końcowego źródła | SHA-256 |
|---|---|
| TAR frontendu | `b43a736f4c30e8db9d2704b50219e0e6c1cf06c32660640ef66f1861cc412196` |
| Manifest `release.json` | `2dea4d8563fadaf38dcd8103dc9ee66088e69e34ba8cc74b544aaea4bf3bc54e` |
| Excel 14 | `7f7ae4918964309b8e2b391edf8999d366dbbd0dcfa2676692984853e10962b6` |

Pakiet zawiera 83 jawne wejścia źródłowe, generowany `index.html` oraz manifest. Wszystkie wejścia odpowiadają dokładnemu commitowi, a rozmiar i hash każdej pozycji pasują do manifestu. **203 lokalne odwołania** prowadzą do istniejących plików i stosują zgodny cache `frontend-v31-2`. To odczyt zawartości pakietu, odrębny od sprawdzenia opublikowanej witryny.

Chroniona ilustracja wyspy, trzy PNG Teatru, Excel 13 oraz 147 historycznych definicji ręcznych są identyczne z baseline 0.13.1.0. Backend, standardowe workflow PRE-PROD/PROD i narzędzia kont/resetu pozostały bez zmian; nie ma nowego bridge PROD.

Excel 14 zachowuje 88 historycznych zakładek arkusza 13, 48 komentarzy, 208 części OOXML i 4658 wyników formuł. Walidacja obejmuje 324 nowe formuły z cache i 200 próbek runtime. Nie uruchamiano LibreOffice i nie przypisujemy mu przeliczenia pliku. Szczegóły zawiera [raport arkusza](arkusze/HARBORLIGHT14-walidacja.json).

Hash TAR, hash manifestu i hash arkusza nie są digestami ZIP artefaktów GitHub ani digestem obrazu API. Publikację Pages potwierdził workflow; niezależnego odczytu jego bajtów nie potwierdzono z powodu ograniczeń proxy tej sesji. [Odbiór PRE-PROD](PREPROD-V31-PROMOTION.md) osobno rozlicza hostowany pakiet, konta i artefakty rzeczywistej promocji.

## Co faktycznie sprawdzono

- Wszystkie **19 rozdziałów 2–20 i 152 cele** ukończono legalnymi komendami, ruchami zagadek, dostawami Portu i budowami w jawnie finansowanych, niezależnych fiksturach. To dowód przechodniości celów, a nie bezpłatnej ekonomii 50 dni.
- Model rozwiązuje **2750 wygenerowanych plansz i 100 wariantów 20 opowieści**, odtwarzając zapis po pokojach. Odrzuca podrobione ukończenia i podwójne wypłaty. Zapis 32 odłożonych sześciopokojowych historii i 33. aktywnej zajmuje 108 972 bajty przy limicie 700 000. Długie sterowanie nie przepełnia dziennika ruchów.
- Rzeczywiste działania modelu State obejmują zakończenie Latarni, zachowanie punktów Domu przy 100 szczęścia, finał lekcji programu 7 z bonusami i rezerwacjami, zakup z uzgodnioną ceną oraz wspólne liczniki dwóch wysp. Niedokończona zwykła historia może zostać przypisana do pomocy misji: po pierwszym pokoju, zapisie i pozostałych pięciu przyjmuje 41 osób raz, zwiększając populację 13→54.
- Odbiór UI obejmuje PL/EN i emulowane widoki komputera/telefonu. Rozszerzony test v31 zaliczył 12 scenariuszy: położenie Teatru, buźkę Gospodarstwa, poprawione opisy, rzeczywistą strzałkę lekcji 14 oraz zamknięcie, odczyt i wznowienie kulki oraz historii przez X i nagłówkowy powrót. Ukryta plansza nie porusza się przez pięć minut działania wyspy.
- Synchronizację sprawdzono przy utraconym ACK, kolejce szybkich wejść, obcej rewizji, odrzuconym stanie i potwierdzonym reloadzie. Cztery lokalne próby w przeglądarce chronią aktywne timery podczas 240 sekund znanej awarii, lecz nie rekompensują zwykłej nieobecności po ukryciu karty. Zamknięcie tutoriala nie jest ponownie zapisywane po odczycie już zatwierdzonej operacji.
- Teatr zachowuje 20 swobodnych pozycji, własność, poziomy powyżej 20, układy, opłaty i reklamy. Właściwy plac ma 1005×703 px na komputerze i 350×244 px na telefonie; miniatury zapisanych pomysłów są osobnymi elementami. Naprawę utraty fokusu sprawdzono także przy wymuszonym synchronicznym blur i szybkich kolejnych klawiszach.

Nowy budżet dotyczy zagadek i opowieści z rozszerzonej biblioteki. Dziewięć wcześniejszych przygód zachowuje podane nagrody, w tym dokładnie złapany ładunek. Ekspedycje mają osobny godzinny licznik konta i pułap 800 monet na rundę nowych serii; rozpoczęte starsze serie zachowują własną politykę.

## Trajektoria i granice dowodów

[Projekt 50 dni](design/ACTIVE-PLAYER-50-DAYS.md) zawiera 50 wpisów dnia, 20 okien poziomów i 19 rozdziałów po 8 celów. `scripts/simulate-campaign-v31.mjs` rozpoczyna od normalnego profilu, bez dopisywania monet, mieszkańców lub poziomów. Używa rzeczywistych 25 lekcji, produkcji, podatków, transportu, zakupów NPC i legalnych rozwiązań zagadek. Nie korzysta z pieniędzy, reklam ani darów innych graczy.

**Ostatni częściowy raport obejmuje 35 dni, Ratusz 19 i ukończony rozdział 19.** Nie jest to potwierdzenie Ratusza 20, pełnych 50 dni ani 150 godzin atrakcyjnej zabawy. Wcześniejsza krótka próba trzech dni osiągnęła Ratusz 6, 144 mieszkańców i rozdziały 2–6 bez błędnych komend. Doskonały solver, trzy jednogodzinne sesje i przyjęte minimum 5/15 minut na zagadkę/opowieść są założeniami strategii, a nie pomiarem ludzkiej trudności i retencji.

Długi catch-up jest kosztowny na maszynie testowej. Zmniejszono alokacje dróg i skanowania ładunków oraz dodano ograniczony cache części kalendarza; testy równoważności obejmują mutacje, błędne daty, zmiany czasu i zapis. Mikrobenchmark funkcji nie dowodzi szybkości całej gry ani telefonu. Długi eksperyment rozpoczął się na wcześniejszej implementacji tych równoważnych funkcji; jego wyniku nie przypisujemy fałszywie do końcowego hasha załadowanych bajtów.

[Audyt](design/FLOW-AUDIT-20261104.md) opisuje wcześniejszy model i nie zastępuje testów nowego kodu. Do osobnej decyzji pozostają zamrożenie bazowego szczęścia pod Latarnią, utrata powitalnej okazji przy pełnym limicie oraz 24 h jako referencyjny budżet, zamiast absolutnej gwarancji ukończenia w każdych warunkach.

## Historia wcześniejszych kandydatów

Wcześniejsze niepowodzenia zachowują własne źródła i nie są sukcesami końcowego wydania.

| Kandydat | Własny CI | Pages |
|---|---|---|
| `d2f9ab311b9f3ad5e6d45a6f4e934ce501973324` | [41896847613](https://github.com/ksobczak321-oss/gra/actions/runs/41896847613) **FAILURE, 13 min 16 s** | [41896847615](https://github.com/ksobczak321-oss/gra/actions/runs/41896847615) **SUCCESS, 25 s** |
| `4db95a38a507df887e255331271a007947bc69c0` | [41901040379](https://github.com/ksobczak321-oss/gra/actions/runs/41901040379) **FAILURE, 12 min 33 s** | [41901040067](https://github.com/ksobczak321-oss/gra/actions/runs/41901040067) **SUCCESS, 1 min 20 s** |

Pierwszy CI zatrzymał się w `tests/harborlight-theatre-free-placement-v31-smoke.py`, w pierwszej próbie PL/desktop. Publiczna adnotacja urywała traceback przed przyczyną; **dokładnej przyczyny pierwszej awarii nie potwierdzono**. Lokalnie opóźnienie CSS o 2,5 s odtworzyło nieostylowany plac. Scenariusz testowy poprawiono tak, aby czekał na oba arkusze, geometrię, fonty i obrazy, zachowując dokładność ruchu 62/30,1, klawiaturę 3/15, pojedynczy zapis i ochronę portfela. Zaliczono 4 zwykłe i 4 opóźnione warianty. Była to odtworzona lokalna usterka gotowości, nie dowód pełnej przyczyny tamtego CI. Lokalny Chromium 154 nie zastępował przypiętego 151 w CI; oba oficjalne pobrania 151 blokowało sieciowe 403. Publiczne adnotacje skrócono do końcowych 2500 znaków, aby zachowały przyczynę kolejnej awarii.

Drugi CI, już po instalacji zależności trwającej 9 min 33 s, pokazał wykonany `ArrowRight` i utracony `Shift+ArrowDown` przy gotowym CSS. Odtworzono przyczynę: wyłączenie aktywnego przycisku przenosiło fokus do BODY przed jego zapamiętaniem. Końcowy kod zapamiętuje token przed stanem oczekiwania i wykorzystuje go po renderowaniu, zachowując nowszą selekcję. Zaliczono 8 wariantów na Chromium 154, w tym wymuszony synchroniczny blur i cztery szybkie klawisze przy wstrzymanym RAF. Zachowano SELECT, zapis układu, cenę i pozycję. Nowy cache, pakiet i arkusz przeszły odrębny odbiór końcowego źródła.

### Historyczne hashe pakietów i arkusza

Oba wcześniejsze pakiety miały 85 plików / 19 681 606 bajtów i przeszły lokalne verify/extract. Wszystkie 83 publiczne wejścia aplikacji kandydata `4db95a3` były identyczne z `d2f9ab3`; różne manifesty wiązały różne źródła.

| Źródło | TAR SHA-256 | Manifest SHA-256 |
|---|---|---|
| `d2f9ab3` | `fa07a6100414cfc35e812a6eecb7fa6a2bbaf58ab0b16285827b2cb40e81a60d` | `e3f8c9590dd36274506a970512e34868992c9c3516721cfe085d969ceff57638` |
| `4db95a3` | `8f63d334d618c225ac7b9b8bb163901bc74b8cac47480c88c8aa0dc604b4ebdd` | `5953c91a5ea5cbc36195f4bc7725d81d4c620aed040296c12d175baa14c72149` |

Excel 14 z pierwszego kandydata miał hash `9216f66d10a69f2ee27249053a3462bcae1c29b809806f645317ba249d4b2ebb`. Jest to wartość historyczna, odrębna od końcowego `7f7ae4918964309b8e2b391edf8999d366dbbd0dcfa2676692984853e10962b6`. Nie utworzono tagów ani nie uruchomiono PRE-PROD dla tych dwóch nieudanych kandydatów.

Po końcowej poprawce lokalnie ponownie zaliczono 1190 testów frontendu oraz sześć pakietowych regresji: swobodne rozmieszczanie 8 wariantów, studio 4, pełna gra 4, mapa/Dom/wznowienie 12, biblioteka przygód 4 i awaria chmury 4. Excel 14, karty i lista ręczna przeszły walidację. Własny CI `41906515746` potwierdził następnie cały spis 43 zestawów, więc wcześniejszych awarii nie trzeba traktować jako nierozstrzygniętego odbioru bieżącego kodu.

[179 prób ręcznych](testing/START-HERE.md) nadal pozostaje NOT RUN. Późniejszy commit dokumentacji nie zastępuje odebranego źródła ani nie przesuwa jego tagu.
