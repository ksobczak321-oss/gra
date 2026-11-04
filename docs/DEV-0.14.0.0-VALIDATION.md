# DEV 0.14.0.0 / v31 — odbiór lokalny i promocja w toku

Stan z 4 listopada 2026. Użytkownik zatwierdził [zakres v31](FRONTEND-V31-REQUIREMENTS.md), a później doprecyzował publikację jako **DEV → PRE-PROD**. Ten raport rozdziela kod, dowody lokalne, własne CI i rzeczywiste wdrożenie. [Promocja](PREPROD-V31-PROMOTION.md) ma osobny rejestr.

## Stan

| Warstwa | Wynik |
|---|---|
| Kod |0.14.0.0, cache frontend-v31-2; schemat świata9 / archipelagu2 zachowany |
| Reguły gry |1190/1190 frontend Node PASS, najnowszy pełny przebieg188,02s |
| Pozostały Node |134 backend +7 planszówka PASS; razem1331 |
| Python |141/141 PASS w11zestawach |
| Chromium |43zestawy lokalniePASS po poprawkach; własnyCI powtórzy cały spis |
| SHA / CI / Pages |`4db95a38a507df887e255331271a007947bc69c0`; CI41901040379 INPROGRESS; Pages41901040067SUCCESS1m20s |
| Pakiet / tag |85plików /19681606bajtów; verify/extractPASS. Tag nadalPENDING do sukcesuCI |
| Excel14 |100zakładek, walidacjaPASS; historyczny13 zachowany |
| Ewidencja |450kart,179ręcznych prób NOT RUN |
| PRE-PROD |Nadal0.13.1.0 /68e9bcd; nowa promocja autoryzowana, wynik PENDING |
| Dane / PROD |Bez resetu kont, zmiany haseł lub operacjiPROD |

Pełny Node: `node --test --test-concurrency=1 --test-isolation=none tests/*.test.mjs`. Log roboczy: `/tmp/harborlight-v31-frontend-final.log`. Backend i planszówka mają odrębne przebiegi. Automatyczne sprawdzenie nie zmienia ręcznych wyników NOT RUN.

Lokalny spis Chromium odtworzono z obu grup workflowCI. Regresje kończono w osobnych przebiegach po naprawach funkcji i aktualizacji starych oczekiwań wersji, istniejących misji i rozszerzonej biblioteki. Własny CI końcowegoSHA ma ponownie uruchomić wszystkie43zestawy w całości.

## Co faktycznie sprawdzono

- Wszystkie19 rozdziałów2–20 ukończono legalnymi komendami, ruchami zagadek, dostawami Portu i budowami w jawnie finansowanych niezależnych fiksturach. To dowód przechodniości152 celów, nie bezpłatnej ekonomii50 dni.
- Model rozwiązuje2750 wygenerowanych plansz i wszystkie100 wariantów 20 opowieści, odtwarzając zapis po pokojach. Odrzuca podrobione ukończenia i podwójne wypłaty. Zapis32 odłożonych sześciopokojowych historii i33. aktywnej ma108972 bajty przy limicie 700000; długie sterowanie nie przepełnia dziennika ruchów.
- Prawdziwe działania State obejmują zakończenie Latarni, zachowanie punktów Domu przy100 szczęścia, finał lekcji 7 z bonusami i rezerwacjami, zakup z uzgodnioną ceną oraz wspólne liczniki dwóch wysp. Niedokończona zwykła historia może zostać przypisana do pomocy misji: po pierwszym pokoju, zapisie i pozostałych pięciu przyjmuje 41 osób raz, zwiększając populację13→54.
- Odbiór UI obejmuje PL/EN i emulowane widoki komputera/telefonu. Rozszerzony test v31 zaliczył12 scenariuszy: położenie Teatru, buźkę Farmy, poprawione opisy, prawdziwą strzałkę lekcji 14 oraz zamknięcie/odczyt/wznowienie kulki i historii przez X i nagłówkowy powrót. Ukryta plansza nie porusza się przez 5 minut działania wyspy.
- Zapis sprawdzono przy utraconym ACK, kolejce szybkich wejść, obcej rewizji, odrzuconym stanie i potwierdzonym reloadzie. Cztery próby rzeczywistego hosta chronią aktywne timery podczas 240 sekund znanej awarii, ale nie rekompensują zwykłej nieobecności po ukryciu karty. Zamknięcie tutoriala nie jest ponownie zapisywane po odczycie już zatwierdzonej operacji.
- Teatr zachowuje 20 swobodnych pozycji, własność, poziomy powyżej 20, układy, opłaty oraz reklamy. Właściwy plac ma 1005×703 px na komputerze i 350×244 px na telefonie; miniatury zapisanych pomysłów są osobnymi elementami.

Nowy budżet dotyczy zagadek i opowieści z rozszerzonej biblioteki. Dziewięć wcześniejszych przygód zachowuje podane nagrody, w tym dokładnie złapany ładunek. Ekspedycje mają osobny godzinny licznik konta i pułap 800 monet na rundę nowych serii; rozpoczęte starsze serie zachowują własną politykę.

## Trajektoria i granice dowodów

[Projekt50 dni](design/ACTIVE-PLAYER-50-DAYS.md) zawiera 50 wpisów dnia,20 okien poziomów i19 rozdziałów po 8 celów. `scripts/simulate-campaign-v31.mjs` rozpoczyna od normalnego profilu, bez dopisywania monet, mieszkańców lub poziomów. Używa prawdziwych 25 lekcji, produkcji, podatków, transportu, zakupów NPC i legalnych rozwiązań zagadek; nie korzysta z pieniędzy, reklam ani darów innych graczy.

Ukończona próba 3 dni osiągnęła Ratusz 6, 144 mieszkańców i rozdziały 2–6, bez błędnych komend. Pełny eksperyment50 dni **pozostaje w toku**. Doskonały solver, trzy jednogodzinne sesje i przyjęte minimum 5/15 minut na zagadkę/opowieść są założeniami strategii. Nie są pomiarem ludzkiej trudności, retencji ani 150 godzin atrakcyjnej zabawy.

Długi catch-up jest kosztowny na maszynie testowej. Zmniejszono alokacje dróg i skanowania ładunków oraz dodano ograniczony cache części kalendarza; testy równoważności obejmują mutacje, błędne daty, zmiany czasu i zapis. Mikrobenchmark samych funkcji nie dowodzi szybkości całej gry ani telefonu. Trwający eksperyment wczytał wcześniejszą implementację tych równoważnych funkcji; nie przypisujemy mu fałszywie końcowego hasha załadowanych bajtów.

[Audyt](design/FLOW-AUDIT-20261104.md) opisuje stary model i nie zastępuje testów nowego kodu. Pozostawiono wcześniej nierozstrzygnięte reguły: zamrożenie bazowego szczęścia pod Latarnią, utratę powitalnej okazji przy pełnym limicie oraz24h jako referencyjny budżet, a nie absolutną gwarancję ukończenia w każdych warunkach.

## Arkusz i publikacja

Excel14 zachowuje 88 historycznych zakładek13,48 komentarzy,208 części OOXML i4658 wyników formuł. Nowe 324 formuły z cache oraz200 próbek runtime przechodzą walidację. Nie uruchamiano LibreOffice i nie przypisujemy mu przeliczenia pliku. Aktualny hash jest w [raporcie arkusza](arkusze/HARBORLIGHT14-walidacja.json).

Ostateczny SHA, hashe pakietu, własne CI/Pages, tag i standardowy PRE-PROD wymagają uzupełnienia po odczycie rzeczywistych wyników. Rzeczywistych kont nie resetowano. [179 prób ręcznych](testing/START-HERE.md) pozostaje NOT RUN.

## Wysłane źródło i pakiet

Commit `d2f9ab311b9f3ad5e6d45a6f4e934ce501973324` jest w main z autoryzowanym znacznikiem PRE-PROD0.14.0.0. [CI41896847613](https://github.com/ksobczak321-oss/gra/actions/runs/41896847613) zakończył się FAILURE13m16s. [Pages41896847615](https://github.com/ksobczak321-oss/gra/actions/runs/41896847615) zakończyło się SUCCESS25s. Bez niezależnego odczytu bajtów Pages przez ograniczony proxy tej sesji.

Pakiet85plików/19681606bajtów: TAR`fa07a6100414cfc35e812a6eecb7fa6a2bbaf58ab0b16285827b2cb40e81a60d`, manifest`e3f8c9590dd36274506a970512e34868992c9c3516721cfe085d969ceff57638`. Weryfikacja i rozpakowanie dokładnego źródła PASS. Te digests nie są digestamiZIPartefaktów GitHub ani obrazuAPI. BieżącyExcel14: SHA`9216f66d10a69f2ee27249053a3462bcae1c29b809806f645317ba249d4b2ebb`.

## Pierwszy CI — zachowany błąd

Źródło d2f9ab3 ma FAILURE13m16s w `tests/harborlight-theatre-free-placement-v31-smoke.py`, pierwsza próba PL/desktop. Wszystkie wcześniejsze reguły, pakowanie/Excel i starsze testy Teatru przeszły. Publiczna adnotacja urywała traceback przed przyczyną; diagnoza i poprawka wymagają osobnego źródła/CI. Nie utworzono tagu i nie uruchomiono PRE-PROD. Pages tego źródła pozostaje SUCCESS25s.

### Poprawka gotowości testu

Kontrolowane opóźnienie lokalnych CSS o2,5s odtworzyło nieostylowany plac i błąd starego testu. Fixture czeka teraz na oba arkusze, geometrię, fonty i obrazy; zachowano dokładność ruchu62/30,1, klawiaturę3/15, pojedynczy zapis i ochronę portfela. Nowy test zaliczył4/4 zwykle i4/4 z opóźnieniem. UI/CSS i pozostałe pliki publiczne gry nie zmieniły się. LokalnyChromium154 nie zastępuje przypiętego151 wCI; oba oficjalne pobrania151 blokuje sieciowe403. Pełna przyczyna pierwszegoCI pozostaje niedostępna poza uciętym tracebackiem, więc nowy własnyCI jest wymagany. Publiczne adnotacje skrócono do końcowych2500znaków, aby zachowały przyczynę.

## Poprawiony kandydat4db95a3

`4db95a38a507df887e255331271a007947bc69c0` wysłany do main. [CI41901040379](https://github.com/ksobczak321-oss/gra/actions/runs/41901040379) trwa, [Pages41901040067](https://github.com/ksobczak321-oss/gra/actions/runs/41901040067) SUCCESS1m20s. Wszystkie83publiczne wejścia aplikacji są identyczne z d2f9ab3. Pakiet85plików/19681606bajtów verify/extractPASS; TAR`8f63d334d618c225ac7b9b8bb163901bc74b8cac47480c88c8aa0dc604b4ebdd`, manifest`5953c91a5ea5cbc36195f4bc7725d81d4c620aed040296c12d175baa14c72149`. Hash manifestu zmienia się razem ze źródłem release.json. Pierwszy błądCI pozostaje przypisany d2f9ab3.

## DrugiCI i naprawa fokusu

Źródło4db95a3: [CI41901040379](https://github.com/ksobczak321-oss/gra/actions/runs/41901040379) FAILURE12m33s, Pages41901040067SUCCESS1m20s. Po udanej instalacji9m33s test ujawnił utratę drugiego klawisza w PL/desktop, już z gotowym CSS. Publiczny pełny ślad pokazuje wykonanyArrowRight i niewykonanyShift+ArrowDown. PRE-PROD nie wystartował.

Odtworzono przyczynę: wyłączenie aktywnego przycisku przenosi fokus doBODY przed jego zapamiętaniem. UI zapisuje teraz token przed stanem oczekiwania i używa go przy końcowym renderowaniu.8/8prób PASS naChromium154, w tym wymuszony synchronicznyblur oraz cztery szybkie klawisze przy wstrzymanymRAF; zachowano SELECT, zapis układu, cenę i pozycję. Cache zmieniono nafrontend-v31-2; nowy pakiet/Excel i własnyCI wymagają ponownego odbioru.

### Lokalny odbiór poprawki fokusu

1190/1190frontend NodePASS po poprawce i zmianie namespace cache. Sześć pakietowych regresji PASS: swobodne rozmieszczanie8wariantów (w tym blur), studio4, pełna gra4, mapa/House/wznowienie12, biblioteka przygód4 i awariachmury4. Historyczny spis43zestawów zaliczono wcześniej; własnyCI nowegoSHA ponowi go w całości. Excel14, karty i lista ręczna zwalidowane;179ręcznych nadalNOTRUN.
