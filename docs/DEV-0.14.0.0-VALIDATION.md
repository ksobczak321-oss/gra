# DEV 0.14.0.0 / v31 — odbiór lokalny i promocja w toku

Stan z 4 listopada 2026. Użytkownik zatwierdził [zakres v31](FRONTEND-V31-REQUIREMENTS.md), a później doprecyzował publikację jako **DEV → PRE-PROD**. Ten raport rozdziela kod, dowody lokalne, własne CI i rzeczywiste wdrożenie. [Promocja](PREPROD-V31-PROMOTION.md) ma osobny rejestr.

## Stan

| Warstwa | Wynik |
|---|---|
| Kod |0.14.0.0, cache frontend-v31; schemat świata9 / archipelagu2 zachowany |
| Reguły gry |1190/1190 frontend Node PASS, końcowy pełny przebieg178,84s |
| Pozostały Node |134 backend +7 planszówka PASS; razem1331 |
| Python |141/141 PASS w11zestawach |
| Chromium |43zestawy lokalniePASS po poprawkach; własnyCI powtórzy cały spis |
| SHA / CI / Pages |PENDING — własne źródło i przebiegi po commit/push |
| Pakiet / tag |PENDING — końcowy manifest po ustaleniu SHA; tag dopiero po CI/Pages |
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
