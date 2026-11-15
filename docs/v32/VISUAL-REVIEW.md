# Przegląd interfejsu DEV v32

Po uwadze użytkownika poprawiono wyrównanie pól „Osoby” i przycisków „Przydziel”. W przeglądarce pola i przyciski mają te same górne i dolne krawędzie:40px wysokości na komputerze i44px na telefonie. Pomiary obejmują rzeczywisty panel, nie ukryte kopie elementów.

Przejrzano52 warianty głównych paneli przy1440px i390px, dodatkowe formularze nowych budynków oraz uwierzytelnione widoki Królestwa, darów, ratunku i ustawień. Poprawki obejmują formularze, kontrolki obsady, osie pól finansowych, odstępy narzędzia czasu, układy Teatru, kontrast sekcji na jasnym tle i czytelność pól. Usunięto przypadkowe `nullnull` w darach. Przegląd działania handlu skorygował widoczne instrukcje, katalog19 bieżących produktów, podgląd wymiany według wartości oraz ceny i limity ofert. Menu produkcji korzysta z nowych receptur.

Po korekcie użytkownika z15listopada pierwsza propozycja osobnych ilustracji została wycofana. Nowe funkcje wykorzystują nieużywane budynki już namalowane na bazowej planszy: M/Mleczarnia, P/Piekarnia, R/Rybak, A/Akademia, K/Koszary zgodnie ze screenem; Rzeźnia używa małej obory przy polach, a Zakład skórzany małego warsztatu za Akademią. Mapa ma wyłącznie przezroczyste obszary kliknięcia, bez dodatkowych domków. Miniatury są wycinkami tej samej planszy. Atlas pierwszej propozycji usunięto z bieżącego pakietu; historia pozostaje w Git.

Ostateczny układ: Teatr w dawnym budynku Targu, Targ na pasiastym straganie po prawej; Piekarnia nad nimi pozostaje. Dawny Teatr spod Kamieniołomu zniknął w v32. Usunięto stałe nazwy i plakietki poziomów z planszy. Nazwa i poziom pokazują się po najechaniu lub fokusie klawiatury. Oryginalny PNG ma ten sam SHA2564063f003002f95dd7b00f77a8d6d610b04f134766e52afc97e8a10712fd6d823.

Rzeczywisty test `tests/harborlight-native-map-v32-smoke.py`:1440/390,po9kliknięć do właściwych paneli, pozycje zgodne z grafiką, hover-only, brak staregoTeatru i dodatkowych grafik, miniatury z bazowegoPNG,zeroJS/overflow. Zdjęcia: `/workspace/work/native-map-v32-review`.

W minigrach sprawdzono48 widoków komponentów oraz22 okna działającej aplikacji na komputerze i telefonie. Poprawiono10 zbyt małych przycisków i4 okna czasu wychodzące poza ekran. Przyciski mają co najmniej44px, okna mieszczą się w obszarze ekranu i przewijają zawartość. Kontrast przycisków okna czasu wynosi7,46:1. Zweryfikowano też wybór następnej gry po wygranej oraz sterowanie planszami pamięci24/42/120 kart na360px i390px. Nowa scena przygody otwiera się od góry; rysowanie i zwykłe ruchy nie resetują przewijania.

Kontrole odtwarzalne: `tests/harborlight-v32-ui-smoke.py`, `tests/harborlight-v32-live-cas-smoke.py`, `tests/harborlight-original-puzzles-v32-smoke.py` i nowe testy geometrii minigier w katalogu `tests`. Lokalna dokumentacja pomiarów i zdjęcia przed/po: `/workspace/work/v32-visual-audit`, `/workspace/work/v32-form-audit`, `/workspace/work/dev-v32-minigame-layout`. Raport do pobrania: `/workspace/output/HARBORLIGHT_audyt_UI_DEV_v32.md`.

Przegląd dotyczy DEV. Roboczy podgląd jest publikowany wyłącznie na DEV Pages. Nie wykonano zmian PRE-PROD/PROD. Bieżące teksty pozostają do jutrzejszej redakcji użytkownika w Excelu ABC.


## Kolejny odbiór: ramki, ciemne menu i blokady

Nowe budynki mają identyczną ramkę hover jak stara Kaplica:2px,zaokrąglenie12px,ten sam złoty kolor, tło i cień. Całe wnętrza siedmiu nowych paneli mają ciemną paletę #102c3d, jasne teksty i pola #092b3e.14paneli1440/390 sprawdzono wraz z kontrastem(tekst>10:1,muted>8:1),bezpoziomegooverflowiJSerrors. Zachowano wyrównanie „Osoby”/„Przydziel”.

Kliknięcie zablokowanego budynku z mapy, doku lub menu szczegółów pokazuje wyłącznie komunikat z wymaganym i aktualnym poziomem Ratusza. Progi nowych budynków pochodzą z tego samego katalogu co silnik, a Targ i Port zachowują progi2i4. Brak normalnych kontrolek budynku oraz zapisu odwiedzin samouczka. Test `harborlight-building-access-v32-smoke.py` sprawdza obie szerokości, Ratusz1/2/4 oraz siedem budynków z dwóch wejść; stan kosztów, przypisań, budowy i ukończonych lekcji nie zmienia się po otwarciu informacji.

RęcznyRatusz5przypisano tylko do istniejącego lokalnego konta dev-admin1, atomowo i z podniesieniem rewizji. Wszystkie wcześniejsze osoby i zasoby zachowano; pozostałe dokumenty nie zostały zmienione przez operację. Standardowe odblokowanie Akademii/Koszar dodało zwykłą pierwszą grupę specjalistów. OdczytAPIpotwierdził admin1=5,admin2=1,admin3=1. Dane i kopia przed operacją pozostają poza repozytorium.

Późniejsze pełne GO objęło także kolejność oprowadzania, selektor widzów Teatru i poprawki Magazynu: [zakres](PENDING-NOTES.md).


## Pełne GO: Teatr, oprowadzanie i Magazyn

Oprowadzanie V5 ma 56 kroków: najpierw górne kontrolki i związane z nimi funkcje, potem budynki razem z Teatrem, na końcu wszystkie pięć dolnych zakładek. Tytuł „Ubrani” zastępuje dawny tytuł o ubraniach cywilnych; nazwa towaru pozostaje osobną etykietą. Wyjaśnienie magazynu lokalnego podświetla wyłącznie niezadowoloną buźkę. Migracja zachowuje stabilne identyfikatory, zakończenie oprowadzania, praktyczne lekcje i odebrane nagrody. [Pełna kolejność](CURRENT-TUTORIAL-ORDER.md).

Test `harborlight-tour-route-v5-smoke.py` przeszedł 56 rzeczywistych podświetleń na 1440/390, pięć poprawnie wybieranych dolnych zakładek, Teatr w grupie budynków i ramkę buźki. Nie wykryto wyjścia ramki poza ekran ani błędów JavaScript. Stan świata i praktycznych lekcji pozostawał zatrzymany podczas pierwszego oprowadzania. Ukierunkowany zestaw Node dla kolejności i migracji: 47 PASS.

W Teatrze dodano „Wyślij wszystkich” i rozwijaną listę wielokrotnego wyboru z grupami według zajęcia mieszkańców. Podgląd kosztu korzysta z tej samej wyceny co planowanie. Test `harborlight-theatre-selection-v32-smoke.py` na 1440/390 potwierdził rzeczywistych 100 dostępnych widzów za 200 monet, wybraną parę za 4 monety, pomijanie nieobecnych, zamrożony skład i cenę po zaplanowaniu oraz zachowanie roboczego wyboru przy odświeżeniu stanu. Zachowano dotychczasowe 45 minut planowania i 10 minut pokazu.

Magazyn udostępnia trzy osobne, początkowo zamknięte sekcje: „Przegląd Magazynu”, „Wyżywienie” i „Priorytety transportu”. Treść powstaje po otwarciu, aktywna sekcja pozostaje wybrana po akcji. Test `harborlight-warehouse-sections-v32-smoke.py` na 1440/390 potwierdził zamknięty start, zapis ustawień jedzenia i priorytetów, zachowanie wpisu oraz brak wystających kart. Kolumny Młyna, Gospodarstwa i Ratusza mają po 553 px na komputerze, a na telefonie karty mieszczą się w szerokości 336 px. Sekcje produkcji również w starych panelach mają ciemny styl.

Zgodnie z ostatnią decyzją użytkownika wspólny limit Magazynu wylicza się z koszyka potrzeb +40%, po czym zaokrągla w dół do pełnych 10 000. Bazowy poziom 1 ma 40 000 wspólnej pojemności; nie mnoży się tego koszyka przez 20 typów towaru. Stary zapas ponad limit pozostaje, a nowe przyjęcia czekają na miejsce. Ukierunkowane regresje pojemności, runtime i pełnych 25 praktycznych lekcji przeszły; szczegóły wzoru i tabela: [DEV-BALANCE.md](DEV-BALANCE.md).

To lokalne dowody bieżącego GO, bez przypisywania im sukcesu publikacji lub CI nieopublikowanego źródła. Poprzednie źródło `fc2e87e` / cache4 ma własne CI43703967814 i Pages43703967803 SUCCESS. Publikacja cache5, odczyt hostowanych plików i CI końcowego SHA wymagają oddzielnego potwierdzenia. Ręczny odbiór użytkownika pozostaje NOT RUN.

Końcowy test integracyjny `harborlight-v32-ui-smoke.py` przeszedł rzeczywiste przepływy receptur, żywienia, Akademii, Koszar, Teatru, Królestwa i minigier na komputerze i telefonie. Poprawiono brak sygnatury panelu nowego budynku, przez który okresowe odświeżenie mogło zastąpić niezapisany wpis; test wymaga teraz zachowania wpisu przez 1,2 sekundy przed zatwierdzeniem. Osobny test 96 godzin offline przeszedł 1/1 z dotychczasowym limitem 10 sekund. Są to wyniki lokalne; końcowy pełny przebieg i CI pozostają osobnymi dowodami.

Przy końcowej weryfikacji usunięto również niespójność kosztu założenia kolejnej wyspy w v32: koszyk jest teraz sprawdzany i pobierany atomowo, a dawna żywność oznacza faktyczne jedzenie po 6 punktów sytości, ponad chronioną rezerwę. Ta sama porcja zboża nie może opłacić równocześnie dwóch pozycji kosztu. Dwie regresje sprawdzają rzeczywiste pobranie oraz odmowę bez wydatku i przenosin, gdy pełnego koszyka nie wystarcza. Cały zestaw archipelagu, mieszkań i recovery: 38/38 PASS.
