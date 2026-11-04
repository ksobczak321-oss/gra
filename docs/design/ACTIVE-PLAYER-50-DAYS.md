# Aktywny gracz — projekt pierwszych 50 dni

Status z 4 listopada 2026, Europe/Warsaw: użytkownik zatwierdził realizację paczki **DEV 0.14.0.0 / v31**. Poniżej zachowano pełną ostatnią redakcję projektu, włącznie z historycznymi uwagami „przed GO” i „nie wdrożono”. Bieżący zakres, decyzje oraz stan implementacji rozstrzygają [wymagania v31](../FRONTEND-V31-REQUIREMENTS.md) i [odbiór DEV](../DEV-0.14.0.0-VALIDATION.md).

**50 dni do poziomu 20 i 150 godzin aktywnej zabawy są celami projektu.** Sama biblioteka scenariuszy ani liczby poziomów nie potwierdzają jeszcze takiego wyniku w pełnej grze. Potrzebne są odrębne dowody budżetu nagród, produkcji, rekrutacji, transportu, kosztów i jakości treści. Dokument nie publikuje nowego PRE-PROD ani nie zalicza ręcznych testów.

---

**HARBORLIGHT — pierwsze 50 dni aktywnego gracza, poziomy 1–20**

Projekt scenariusza z 4 listopada 2026. Nie wdrożono nowych treści ani zmian reguł. Plan zakłada około 3 godzin aktywnej zabawy dziennie, w kilku sesjach; przygotowuje też krótszy powrót i dalszą grę dla osób spędzających więcej czasu. To 50 dni świata, a nie nieprzerwany czas zalogowania. Budowa, produkcja i napływ mieszkańców są rozliczane również między sesjami.

**Cel: gracz ma zawsze sensowny następny wybór**

Na ekranie proponujemy trzy równoległe kierunki: (1) bieżący etap przygody Latarni, (2) kontynuowana wyprawa na 5–30 minut, (3) krótkie zdarzenie lub własny projekt wyspy. Oczekiwanie na deski nie blokuje wyprawy. Brak pieniędzy na fontannę nie blokuje głównej fabuły. Propozycje są w panelu, bez lawiny popupów i bez wymagania ciągłej obecności.

Poziom 1 jest prologiem wewnątrz 25 praktycznych lekcji. Poziomy 2–20 to 19 rozdziałów po 8 etapów, czyli 152 cele główne. Co kilka dni gracz poznaje nową mechanikę, zmieniający się problem i widoczny rezultat na wyspie. Później łączy już poznane umiejętności, zamiast dostawać wyłącznie większe liczby.

**Jak czytać dni i poziomy**

Poniższe okna to docelowe tempo projektu. Treści odblokowuje postęp i gotowość wyspy, nie sztywny numer dnia. Szybszy gracz przechodzi wcześniej; wolniejszy zachowuje cały scenariusz, pomoc i nagrody. Tylko jedno zadanie główne jest aktywne; przygotowania do kolejnych można obejrzeć osobno.

Dojście do Ratusza 20 w 50 dni jest celem balansu, a nie potwierdzonym wynikiem obecnej gry. Bieżące nominalne czasy samych awansów 1→20 sumują się do około 208 godzin, czyli 8,67 dnia. Potrzeba 342 mieszkańców i Domu 15, aby każdemu z tego progu zapewnić łóżko. Zasoby, transport, podatki i bonusy muszą być sprawdzone razem przed uznaniem całej trajektorii za wykonalną.

Obecny model wymusza zakup mieszkańca w każdym rozdziale: 18 zaproszeń przed wejściem na poziom 20 kosztuje 94 500 KAŻDEGO zasobu, także monet. W tym projekcie odchodzimy od takiego powtarzania: są zaproszenia, ratunek, przygotowanie mieszkań i przyjęcie grupy. Cena zwykłego zakupu pozostaje dotychczasową regułą; zmienia się dobór celów fabularnych. Tę zmianę trzeba zatwierdzić wraz z budżetem nagród.

**Pierwsze 90 minut — docelowa reżyseria, bez obietnicy identycznego tempa każdego gracza**

| Minuty | Działanie gracza | Rezultat |
|---|---|---|
|0–8|Nazwa, język, krótka orientacja, wskazanie Latarni jako głównego celu.|Gracz wie, po co rozwija osadę.|
|8–30|Samouczek: tragarze, produkcja, dwie drogi budowy, szczęście i zadanie. Część opisów można zamknąć i wznowić.|Rzeczywiste zmiany gospodarki, pierwsza Latarnia; nagrody wystarczają do wymaganych kroków.|
|30–40|Fabularne wezwanie o meteorach i początek pierwszego rozdziału.|Tylko etap 1 aktywny; wymagania i droga do nich są czytelne.|
|40–55|W czasie produkcji desek gracz rozwiązuje pierwszą mapę albo mechanizm sygnałowy.|Samodzielna przygoda kończy się odkryciem, a gospodarka pracuje w tle.|
|55–70|Dom, jedzenie i jedno jasno sfinansowane zaproszenie w Domu. Przy pełnym szczęściu uczymy zachowania punktów.|Prawdziwy nowy mieszkaniec; żaden zbędny awans Ratusza nie pojawia się jako ukryty warunek.|
|70–85|Zapasy i drugi poziom Latarni; końcowa scena pierwszego rozdziału.|Święto, widoczna zmiana i premia.|
|85–90|Wybór: dalszy rozwój, nowa przygoda albo własna aranżacja. Przygotowanie pracy na czas nieobecności.|Następny cel jest gotowy, ale gracz nie musi zostać.|

Poziom 3 może pojawić się w dniu 1, lecz awans na 4 musi zaczekać na rzeczywistą gotowość 54 osób, mieszkań i jedzenia. Pierwszy rozdział o osadnikach przygotowuje ten próg wcześniej; nie wymaga nagłego zakupu kilkudziesięciu osób.

**Okna rozwoju poziomów**

| Poziom | Orientacyjne dni | Główna opowieść |
|---|---|---|
|1|1|Pierwsze światło|
|2|1|Goście spod spadających gwiazd|
|3|1–2|Miejsce dla nowych sąsiadów|
|4|3–4|Przystań otwarta|
|5|5–6|Sztorm, na który jesteśmy gotowi|
|6|7–8|Wiadomość w butelce|
|7|9–10|Sygnały we mgle|
|8|11–12|Zaginiona mapa latarnika|
|9|13–15|Zapasy na dalszą drogę|
|10|16–18|Światło na drugim brzegu|
|11|19–21|Tajemnica zamkniętej Latarni|
|12|22–24|Teatr pod gwiazdami|
|13|25–27|Cisi goście oceanu|
|14|28–30|Nic się nie marnuje|
|15|31–33|Święto ludzi morza|
|16|34–36|Szlak wielu świateł|
|17|37–39|Skarbiec pod klifem|
|18|40–42|Światło ponad burzą|
|19|43–46|Wielki zlot żagli|
|20|47–50|Wyspa, do której się wraca|

**Scenariusz dzień po dniu**

Każdy wiersz wskazuje akcent dnia. Obok niego działają powtarzalne warianty przygód, nauka kolejnych rozwiązań, zarządzanie wyspą i własne projekty. Nie jest to obowiązkowa codzienna lista do odhaczenia. Etapy przygotowania nie mają licznika wymuszającego nieosiągalny awans; termin próby rusza dopiero po przyjęciu wykonalnego celu.

| Dzień | Orientacyjny poziom | Wątek | Główne działanie | Zabawa w czasie produkcji/budowy | Odczuwalny rezultat |
|---|---|---|---|---|---|
|1|1–3|Pierwsze światło|Tutorial i 25 lekcji, działająca produkcja, pierwsza Latarnia. Wejście do pierwszej opowieści.|Proste sygnały, pierwsza mapa skarbu, próbna aranżacja Teatru.|Wyspa działa; gracz rozumie cel i wybiera dalszą drogę.|
|2|3|Miejsce dla nowych sąsiadów|Dom 3, jedzenie i plan dojścia do 54 osób. Aktualny brak pokazany od początku.|Statek bez kapitana: kajuta, radio, łódź ratunkowa.|Nowi ludzie z przewidzianej w misji akcji; gotowość awansu sprawdzona.|
|3|4|Przystań otwarta: przygotowanie|Awans na 4 dopiero po gotowości; uruchomienie obsady portu.|Rozplącz cumy i zapakuj wyposażenie pierwszego rejsu.|Port ma prawdziwą ekipę i wolne miejsce na dostawę.|
|4|4|Przystań otwarta: pierwszy rejs|Pierwszy mały zakontraktowany zakup i faktyczne dowiezienie do centrali.|Rejs we mgle oraz przechył statku po załadunku.|Regularna trasa morska, ukończony rozdział portowy.|
|5|5|Przed sztormem|Przygotuj rezerwy i osłony; oddziel żywność mieszkańców od materiałów budowy.|Most ratowników i ratowanie paczek z uszkodzonego samolotu.|Osada przygotowana; dokładnie wiadomo, co jeszcze brakuje.|
|6|5|Noc sztormowa|Napraw mechanizm awaryjnego światła i zakończ modernizację Latarni.|Escape room: magazyn sygnałowy, zalana maszynownia, bezpieczna kolejność śluz.|Pozytywny finał sztormu i pierwsza opowieść w kronice.|
|7|6|Wiadomość w butelce|Odczytaj list i ustal lokalnego adresata; handel graczy można poznać opcjonalnie.|Logiczna układanka listów i porównanie dwóch map brzegu.|Rozpoznana trasa do sąsiadówNPC, bez czekania na innego gracza.|
|8|6|Paczka dla sąsiedniej osady|Przygotuj i nadaj niewielki zestaw pomocy; odbierz potwierdzenie.|Kajuta kuriera: porządek dostaw, wskazówki z pieczęci i kompasu.|Nowy znak na mapie szlaku; wybór lokalnego albo społecznego kontaktu.|
|9|7|Sygnały we mgle|Poznaj język błysków i przygotuj próbny sygnał.|Układ optyczny, zapamiętywanie znaczących komunikatów, obserwacja boi.|Gracz potrafi naprowadzić statek zamiast tylko podnieść poziom budynku.|
|10|7|Konwój przez mgłę|Zabezpiecz nocny zapas i przeprowadź mały konwój.|Trasa przez prądy, kolejność wejścia łodzi, korekta z błędnego pomiaru.|Udany rejs oraz modernizacja Latarni.|
|11|8|Zaginiona mapa latarnika|Zdobądź i zestaw gwarantowane fragmenty mapy.|Trójki w trybie fabularnym odsłaniają informacje; stara mapa ma zmienioną linię brzegu.|Mapa jest wskazówką do następnej przygody, nie osobną ślepą nagrodą.|
|12|8|Cień wskazuje zatoczkę|Połącz mapę, położenie Latarni i oznaczenia na skałach.|Escape room terenowy: obserwacja cienia, układ przejść, skrytka na końcu.|Odkryta zatoczka i trwała pamiątka.|
|13|9|Zapasy na dalszą drogę|Sprawdź pojemność i przygotuj mały lokalny ładunek wyprawy.|Skrzynka ratunkowa i zadanie zakupowe z ograniczonym budżetem scenariusza.|Gotowy próbny rejs; bez obowiązkowego finansowania kolonii.|
|14|9|Rozpoznanie nowego brzegu|Wyznacz trasę rozpoznawczą; obejrzyj warunki dobrowolnej kolonizacji.|Mapa pływów i wybór bezpiecznego miejsca lądowania.|Świadomy wybór: rozwój matki albo przygotowanie córki.|
|15|9|Próba generalna wyprawy|Zrealizuj próbny kontrakt i wyrównaj zaniedbaną część gospodarki.|Konwój łączący pakowanie, nawigację i odbiór; warianty według wybranego stylu.|Wyspa przygotowana do kolejnego etapu, bez sztucznego zadania naprawy sprawnego systemu.|
|16|10|Światło na drugim brzegu|Wybierz główną drogę lokalnąNPC albo opcjonalną własną kolonię.|Nowy brzeg: obóz ekspedycji, odnalezienie źródła sygnału.|Obie drogi prowadzą dalej; zakup wyspy nie jest ukrytą opłatą fabularną.|
|17|10|Dostawa pierwszej pomocy|Przygotuj i odbierz potrzebny pakiet; przy córce osobny plan startu 6 osób.|Łódź ratunkowa, kompletowanie wyposażenia i bezpieczna kolejność rozładunku.|Działający nowy punkt szlaku albo rozruch córki.|
|18|10|Dwa brzegi, jeden szlak|Potwierdź rzeczywistą dostawę i domknij rozdział.|Wariant ratunku kupca: kulki → przecięcie blokady → wyważenie ocalałego ładunku.|Widoczny postęp archipelagu i jasny następny cel.|
|19|11|Dziennik starego latarnika|Odczytaj zapiski i ustal, czego brakuje mechanizmowi.|Detektywistyczna przygoda w magazynku: ślady, daty, znaki pod światłem.|Komplet informacji do naprawy; bez losowego oczekiwania na klucz.|
|20|11|Tajemnica zamkniętej Latarni|Uruchom przeciwwagę, napęd i soczewki.|Pełny escape room: rozwiązania z wcześniejszych pomieszczeń zmieniają kolejne.|Otwarta część historyczna Latarni.|
|21|11|Galeria dawnych świateł|Zabezpiecz znaleziska i ukończ docelową modernizację.|Wariant optyczny oraz nowa trasa poszukiwania pamiątki.|Kronika rozwoju i odblokowanie kolejnego rozdziału.|
|22|12|Teatr pod gwiazdami|Wybierz oprawę przedstawienia z udostępnionych rekwizytów misji.|Skrzynie rekwizytora: przestrzeń, światło, logiczne przyporządkowanie elementów.|Własny pomysł gracza widoczny na scenie; brak wymogu reklamy.|
|23|12|Zaginiona część spektaklu|Odtwórz scenariusz i uruchom mechanizm sceny.|Escape room: cienie na kurtynie, zapadnia i brakujący instrument.|Przygotowany finał przedstawienia.|
|24|12|Wieczór premiery|Zapewnij poczęstunek i zsynchronizuj muzykę ze światłem Latarni.|Rytm w trybie wizualnym lub dźwiękowym; wariant według wybranej oprawy.|Spektakl, widzowie i pamiątka do własnej aranżacji.|
|25|13|Cisi goście oceanu|Rozpoznaj trasę morskich zwierząt.|Obserwacja śladów, porównanie dziennika i mapy prądów.|Wyznaczony bezpieczny korytarz.|
|26|13|Szlak omijający wędrówkę|Zaplanuj dostawy z uwzględnieniem natury.|Rejs z dwoma równoważnymi kursami i ograniczonymi punktami pomiaru.|Ruch portu działa bez blokowania obserwowanego obszaru.|
|27|13|Punkt obserwacyjny|Przygotuj prostą konstrukcję i zakończ rozdział.|Most widokowy oraz brama przypływu w nowym układzie.|Nowe miejsce historii wyspy; kolejna kolonia nadal dobrowolna.|
|28|14|Nic się nie marnuje|Sprawdź realne wąskie gardło. Sprawny system zalicza kontrolę bez wywoływania zastoju.|Kontrakt przetwórczy: wspólny budżet drewna/desek i zboża/jedzenia.|Plan przepływu potrzebnych produktów.|
|29|14|Port bez korków|Ułóż odbiór i wykorzystanie realnych partii materiałów.|Logiczna kolejka statków i nabrzeży z różnymi czasami rozładunku.|Sprawniejszy przepływ, nie sztuczne zużywanie zapasów.|
|30|14|Pokaz sprawnej osady|Dostarcz mały zestaw ekipie Latarni i zakończ modernizację.|Próba konwoju łącząca planowanie, pakowanie i sygnały.|Widoczny rezultat współpracy budynków.|
|31|15|Święto ludzi morza|Wybierz temat wydarzenia i przygotuj lokalne ekipy.|Nowy program muzyczny, oznaczenia tras i przygotowanie wyposażenia.|Gracz wybiera charakter święta.|
|32|15|Miasto przygotowuje święto|Zapewnij jedzenie, miejsca i transport.|Listy mieszkańców tworzą jedną zagadkę organizacyjną; warianty solo i wspólne są równoważne.|Gotowy plan wydarzenia bez czekania na znajomych.|
|33|15|Parada osadników|Uruchom scenę i pokaz Latarni.|Rytm, światła i wybór kolejności scen.|Parada i trwały proporzec w kronice.|
|34|16|Szlak wielu świateł|Poznaj manifesty i zaplanuj kolejność gwarantowanych zleceńNPC.|Pakowanie ładunków o różnych masach i przeznaczeniu.|Plan mieści się w prawdziwej pojemności i trybach statku.|
|35|16|Kupiec w opałach|Uwolnij ładunek potrzebny do umówionej dostawy.|Labirynt kul → blokada piratów → naprawa i wyważenie barki.|Realnie uratowany ładunek, jedna wypłata za cały łańcuch.|
|36|16|Dostawa na czas|Zakończ oba rejsy we właściwej kolejności.|Rozbudowany problem nabrzeży i pływów.|Nowy fragment mapy szlaku; kolonia jest wyborem.|
|37|17|Wejście pod klifem|Odczytaj ślady dawnego przejścia.|Mapa, poszlaki geometrii skał i obserwacja stanu wody.|Odkryta droga do podziemnej przygody.|
|38|17|Skarbiec pod klifem|Otwórz mechanizm bez odcięcia drogi powrotnej.|Escape room: kanały, zapadnie, ograniczone ciężarki i kolejność działań.|Zabezpieczony skarb.|
|39|17|Historia znaleziska|Ustal pochodzenie pamiątki i ukończ rozdział.|Porównanie inskrypcji i próba rekonstrukcji dawnego urządzenia.|Rzeźba do Teatru i wpis do historii.|
|40|18|Światło ponad burzą|Przygotuj zapasy i rzeczywiste obsady przed rozpoczęciem terminu.|Pomiary pogody i wybór planu osłon.|Plan, którego czas obejmuje dostawy i dojście pracowników.|
|41|18|Zmiana ekip|Zrealizuj dwa ważne odbiory bez zaniedbania żywności.|Logiczna gra harmonogramów; w tle trwa prawdziwy powrót i dojście ludzi.|Działające priorytety i zachowana rezerwa jedzenia.|
|42|18|Bezpieczna noc|Zakończ modernizację i przeprowadź statki.|Nowy wieloetapowy układ świateł, soczewek i bezpiecznych kursów.|Panorama osady po burzy i wybór ograniczonej premii.|
|43|19|Wielki zlot żagli|Poznaj gwarantowane wizytyNPC i zaplanuj potrzebne ładunki.|Detektywistyczne manifesty: adresaci, terminy i oznaczenia skrzyń.|Każda partia ma odbiorcę i osiągalny termin.|
|44|19|Port pełen życia|Wykonaj pierwsze dostawy i przygotuj znaki orientacyjne.|Trudniejszy układ nabrzeży, cum i bezpiecznego pierwszeństwa ratowników.|Pierwsze łodzie goszczą na wyspie.|
|45|19|Regaty po zmroku|Przygotuj trasę oraz zabezpieczenie wydarzenia.|Żagle, wiatr i prądy; wybór spokojniejszej albo trudniejszej drogi.|Regaty dają wynik i historię, bez konieczności wygranejPvP.|
|46|19|Przybycie flotylli|Domknij ostatni kontrakt i sygnał powitalny.|Finał łączący elementy wcześniejszych zagadek w nowej konfiguracji.|Zlot żagli i pamiątkowy puchar wydarzenia.|
|47|20|Wyspa, do której się wraca|Obejrzyj kronikę i wybierz temat finału: odkrywcy, gospodarze albo twórcy.|Trzy równoważne ścieżki przygotowań z różnymi zagadkami.|Finał zależy od stylu gracza, nie od kupienia wszystkich ozdób.|
|48|20|Ostatnie przygotowania|Potwierdź sprawną gospodarkę i sfinansuj rzeczywisty docelowy projekt.|Ulubiony typ przygody w mistrzowskim wariancie z pełnymi podpowiedziami.|Gotowość finału bez podwójnej wpłaty.|
|49|20|Próba wielkiego pokazu|Połącz światło, muzykę i bezpieczny ruch gości.|Rozwiązania wcześniejszych przygód wracają w nowym wspólnym mechanizmie.|Gracz widzi, do czego doprowadziły jego decyzje.|
|50|20|Wielkie rozświetlenie|Zakończ docelową modernizację i uruchom pokaz.|Finał przygody, kronika osobistej wyspy, dobrowolna prezentacja i następny trop.|Zamknięcie sezonu oraz zapowiedź dalszego świata.|

**Zawartość na około 3 godziny aktywnej sesji dziennie**

Nie liczymy minut oczekiwania na budowę jako minut dostarczonej zabawy. Następujący podział jest budżetem projektowym treści, a nie pomiarem obecnej gry:

| Część | Minuty dziennie | Suma przez 50 dni |
|---|---:|---:|
|Przyjęcie sytuacji na wyspie i plan najbliższych działań|10|8 godz. 20 min|
|Aktywne sceny i decyzje głównego rozdziału|25|20 godz. 50 min|
|Dwie dłuższe przygody lub escape roomy po około 20 minut|40|33 godz. 20 min|
|Kilka krótszych zagadek/nawigacji/wyzwań — średnio siedem po 10 minut|70|58 godz. 20 min|
|Krótkie zdarzenia — łącznie, nie obowiązek udziału w każdym|15|12 godz. 30 min|
|Własny projekt: Teatr, dodatkowa wyspa, handel, kronika lub kolejna łamigłówka|20|16 godz. 40 min|
|Razem|180|150 godzin|

Sesję można podzielić na trzy godziny rozłożone w ciągu dnia albo krótsze powroty. Jeżeli zagadka z misji jest jednocześnie przygodą, jej czas liczymy tylko raz. Liczbę pozostałych propozycji trzeba wtedy uzupełnić, zamiast zawyżać sumę.

Skala potrzebnej biblioteki to orientacyjnie 100 sesji dłuższych przygód, 350 krótszych układów i około 500 wariantów krótkich zdarzeń w całych 50 dniach. Nie oznacza to pisania 100 całkowicie osobnych escape roomów: około 20 większych konstrukcji może mieć po kilka wariantów, które naprawdę zmieniają wskazówki, kolejność, zależności i rozwiązanie. Podobnie krótkie gry potrzebują nowych układów i reguł, nie tylko innego obrazka.

Są to wymagania zawartości, jeżeli chcemy obiecać tak intensywny tryb. Dzisiejsze 9 prostszych przygód i 3 motywy misji nie zapewniają jeszcze takiej biblioteki. Dłuższy pobyt gracza wymaga również dobrze działającej gry powtarzalnej: nowych rozwiązań, rekordów, własnych projektów i personalizacji. Więcej czasu na wyspie nie musi oznaczać nieograniczonego dodruku monet.

**Pętla jednej godziny — przykład zamiast samego czekania**

0–8 min: odbiór sytuacji, wybór etapu, uruchomienie potrzebnej produkcji. 8–25 min: nowa przygoda sygnałowa. 25–30 min: powrót do wyspy, realna dostawa i kolejna decyzja. 30–45 min: problem mostu lub ładunku w nowym układzie. 45–55 min: druga krótka zagadka albo własny projekt. 55–60 min: domknięcie osiągniętego celu i wybór następnej aktywności. Jeżeli produkcja nadal trwa, kolejna przygoda jest dostępna od razu; nie czekamy bezczynnie do pełnej godziny.

W pierwszych poziomach gracz często widzi ukończony budynek. Przy dłuższych budowach późniejszych poziomów dostaje własny finał przygody, nowe odkrycie lub ukończoną aranżację, podczas gdy budowa pracuje między sesjami. Najbliższy mały rezultat powinien być widoczny w ramach aktywnej zabawy, bez konieczności zakupu przyspieszenia.

**Nagrody i tempo bez obowiązkowego grindu**

- Główna fabuła oraz produkcja muszą finansować konieczne wymagania bez farmienia opcjonalnych gier, reklam i zakupów za pieniądze. To wymaga końcowego bilansu monet, a nie wyłącznie porównania czasu budowy.
- Mała aktywność wspiera konkretny brak, średnia domyka lokalne przygotowanie, finał daje znaczącą jednorazową nagrodę. Ilość ludzi i faktyczne przyjęcie są pokazane przed startem; limit Ratusza jest zachowany.
- Podpowiedzi podstawowe i zestaw narzędzi do rozwiązania są dostępne bezpłatnie. Porażka otwiera pomoc lub ponowienie, zamiast żądania obowiązkowego zakupu.
- Jedna pula wartości nagród pobocznych na konto zapobiega mnożeniu wypłat przez inne gry lub wyspy. Potrzebny jest także limit całego rozdziału; samo odnawianie puli każdego dnia mogłoby w kilka dni finansować wszystko.
- Przykładowy parametr do strojenia: wypłaty poboczne do 20% referencyjnej wartości celu dziennie i do 30% tej wartości w całym rozdziale, ze wspólnym rozliczeniem monet oraz materiałów. To propozycja, nie zatwierdzony cennik. Nie zmieniamy po cichu już przyznanych nagród.
- Produkcyjne ×2 wyceniamy według rzeczywistej obsady i łączenia premii. Nie dokładamy nieograniczonej dwugodzinnej premii co kilka minut. Ważne nagrody fabularne pozostają osobne od tanich powtórek.
- Godzinny licznik minigier zachowuje trudność po wyjściu, wypłacie i przegranej w danym okresie oraz po zmianie wyspy. Odrębnie trzeba skorygować rosnące wykładniczo monety. Gracz przed startem widzi, czy gra o wypłatę, kontrakt fabularny, pamiątkę czy rekord.
- Fragment mapy, wskazówka i kula do konkretnej przygody są elementami zadania, nie drugim portfelem pieniędzy. Za usługi nadal płaci się monetami gry.

**Brak przymusowej bezczynności — reguły odbioru**

1. Dla każdego stanu ścieżki istnieje co najmniej jedna dostępna aktywność solo, bez kosztu startowego i bez niezweryfikowanej zależności zewnętrznej. W zwykłej sytuacji panel pokazuje trzy sensowne wybory.
2. Rozpoczęcie długiej budowy nie zamyka przygód. Całość najbliższych wymagań ma sprawdzony plan zasobów, ludzi, mieszkania i transport.
3. Wyższa trudność zmienia decyzje i mechanikę. Nie polega wyłącznie na skracaniu czasu lub zwiększaniu liczby powtórzeń.
4. Jedna porażka nie wymusza wydania monet. Pomoc daje prostszą wykonalną drogę, zachowując wpłaty i rzeczywisty postęp.
5. Zapis nie blokuje kolejnych łapań i nie zużywa czasu próby, kiedy gracz nie może działać. Nagroda jest rozliczona jednokrotnie.
6. Przerwa gracza zachowuje główny scenariusz. Nie ma konieczności zalogowania w konkretnym dniu planu; liga zachowuje osobny kalendarz.
7. Każdy wariant łamigłówki ma sprawdzone rozwiązanie. Losowanie kodu nie może stworzyć nieistniejącej wskazówki lub zbyt małej liczby narzędzi.
8. Osiągnięte wcześniej cele są uznawane. Pełne szczęście nie blokuje lekcji, sprawna logistyka nie wymaga celowego wywołania zastoju, a pełny końcowy limit ludności ma równoważny cel.
9. W całym planie nie wymagamy PvP, zakupu kolejnej wyspy, obecności sojuszu, wygranej ligi, realnej darowizny lub reklamy. Mogą to być dodatkowe drogi dla zainteresowanych.
10. Po wyczerpaniu ograniczonej puli gospodarczej nadal da się grać w jasno opisane warianty, rozwijać umiejętności i własne projekty. Nie obiecujemy nowej wypłaty, jeżeli jej nie ma.

**Co uznamy za dowód, że plan działa**

Przed uznaniem tempa 20/50 za gotowe potrzeba odtworzyć dzień po dniu co najmniej trzy przebiegi: aktywny gracz bez płatności i reklam, gracz rozwijający budynki w innej kolejności oraz gracz wracający po opuszczonych dniach. Bilans obejmuje podatki faktycznie pracujących, dostępne nagrody, jedzenie, rezerwacje, receptury, terminy i czas pracy między sesjami. Nie korzystamy z dowolnego dopisania pieniędzy, stałego 100 szczęścia ani nieograniczonego farmienia minigry jako ukrytego założenia.

Osobno sprawdzamy zawartość: czy panel zawsze ma wykonalny wybór, ile minut gracz rzeczywiście działa i czy kolejne warianty wymagają nowych rozwiązań. Test modelu potwierdzi osiągalność; testy z ludźmi pokażą, czy aktywności naprawdę chcą powtarzać. Sam dokument nie potwierdza 150 godzin gotowej zabawy.

Poniżej szczegółowy projekt celów każdego poziomu i ścieżek 5/3. Wszystkie nowe akcje i sceny pozostają propozycjami do akceptacji; repo gry pozostaje bez zmian.

---

**HARBORLIGHT — projekt fabuły poziomów 1–20 na pierwsze 50 dni**

To propozycja treści i zasad, bez implementacji. Dzień osiągnięcia poziomu pozostaje do planu głównego. Poziom 1 obejmuje osiem kamieni milowych wewnątrz istniejących 25 lekcji; nie dokładamy drugiego obowiązkowego kursu. Odpoziomu 2 każdy rozdział ma 8 celów:19 rozdziałów 2–20, łącznie 152 cele główne. Wszystkie opisane nowe scenki, przemiany świata i escape roomy są projektem, nie funkcjami już wdrożonymi.

**Wspólny kontrakt**: rozdział nie wymaga prawdziwej płatności, reklamy, PvP, nagrody ligi, przelewu Pomagam ani losowego łupu. Wymagana wskazówka pojawia się zawsze, a logiczna próba ma darmowe stopniowane podpowiedzi. Zakup i poprzedzające go przygotowanie zapasu to jeden koszt, nie dwie wpłaty. Faktycznie ukończona wcześniej rozbudowa jest uznawana. Jeżeli nowi ludzie są potrzebni do następnego celu, misja musi zagwarantować legalne przyjęcie; nie zakładamy, że losowa nagroda, zakup lub przyrost naturalny akurat to zapewnią.

| Poziom | Rozdział i sens rozwoju | Przygotowanie / odblokowanie | Przykładowe konkretne cele | Finał i nagroda / zmiana świata — projekt |
|---|---|---|---|---|
|1|**Pierwsze światło** — osada zaczyna działać|Start 12 osób; istniejące 25 lekcji, bez ośmiu dodatkowych zadań|Przydziel 3 tragarzy; uruchom łańcuchzboże→żywność; porównaj zwykłe czekanie i przyspieszenie|Pierwszy blask Latarni, przejęcie sterowania przez gracza i zaproszenie do pierwszej opowieści|
|2|**Goście spod spadających gwiazd** — przygotuj pierwszy bezpieczny nocleg|Dom, produkcja, wolny limit osoby, poprawne wejście do zakupu w Domu|Przygotuj pożywienie; wyprodukuj deski na punkt widokowy; powitaj jednego przewidywalnie finansowanego gościa|Noc meteorów i widoczna łódź gości; mała nagroda materiałowa, bonus Latarni według zasad|
|3|**Miejsce dla nowych sąsiadów** — zbuduj realne podstawy awansu 3→4|Przygotuj Dom 3/łóżka oraz 54 osoby przed samym awansem; próg pokazany od początku|Zapewnij zapas jedzenia na napływ; ukończ gwarantowaną akcję ratunkową uzupełniającą uzgodnioną część braku; sprawdź rzeczywistą gotowość 54 osób|Nowi osadnicy pojawiają się w osadzie; mapa pokazuje ożywioną dzielnicę. Zakres rekrutacji wymaga balansu; nie obiecujemy 54 osób za jedno kliknięcie|
|4|**Przystań otwarta** — połącz Latarnię z pierwszą regularną dostawą|Port odRatusza 4, rzeczywisty czas rejsu i obsada odbioru|Przygotuj niewielki zakontraktowany ładunek; odbierz faktyczną dostawę; ustaw zapas żywności poza rezerwacjami budowy|Pierwsza regularna trasa statku widoczna na mapie; oznaczenie portu i jednorazowa premia handlowa materiałowa|
|5|**Sztorm, na który jesteśmy gotowi** — naucz planowania rezerw|Magazyn, produkcja i kolejka; zapas nie może pochłonąć niezbędnego jedzenia|Zbuduj osłonę z dostarczonych desek; zapewnij jednego wolnego odbiorcę żywności; uruchom światło awaryjne|Sztorm przechodzi, osada świętuje przygotowanie; premia produkcyjna i dekoracja osłony. Nie niszczymy wcześniej zbudowanej wyspy|
|6|**Wiadomość w butelce** — poznaj sąsiadów bez zależności od ich obecności|Handel graczy dostępny od 6, ale nieobowiązkowy; podstawowa wersja celu realizowana lokalnie/NPC|Odczytaj gwarantowany list; dopasuj mapę brzegu; przygotuj paczkę dla sąsiedniej osady|Wyspa trafia na mapę szlaku; list z podziękowaniem i pamiątka. Sojusz/PvP jest opcjonalną odnogą|
|7|**Sygnały we mgle** — Latarnia prowadzi statki mimo słabej widoczności|Zapas paliwa jako fabularne użycie istniejących zasobów, dostępna obsada i Latarnia|Odtwórz krótki rytm błysków; ustaw trzy bezpieczne punkty kursu; przygotuj zapas na noc|Nowy wzór sygnału oraz bezpieczny rejs floty; krótka premia odbioru lub materiały — dokładny bonus do balansu|
|8|**Zaginiona mapa latarnika** — pierwsza większa przygoda logiczna|Przygoda z darmową drogą rozwiązania, zapisywane wskazówki, bez obowiązkowego losowania|Połącz fragmenty mapy; odczytaj oznaczenie z cienia Latarni; dopasuj drogę do właściwej zatoczki|Odkryta zatoczka widoczna w dzienniku/mapie; wyjątkowa ozdoba. Rozbudowany escape room jest opcjonalnym rozwinięciem|
|9|**Zapasy na dalszą drogę** — przygotuj wyprawę, zanim wydasz koszt nowej wyspy|Główna droga: lokalny magazyn i próbna wyprawaNPC. Opcjonalna kolonia od 10:21 tys.każdegozasobu, Magazyn minimum 9|Przygotuj osiągalny próbny ładunek lokalny; obejrzyj cenę kolonii. Tylko po wyborze kolonizacji planuj jej pełną pojemność i 6 osób w Domu|Gotowy manifest wyprawy i widoczny drogowskaz morski. Nie pobieramy kosztu wyspy przed odblokowaniem i świadomym wyborem|
|10|**Światło na drugim brzegu** — pokaż skalę archipelagu|Kolejna wyspa dostępna od 10; jej zakup jest wyborem, główna fabuła ma równoważną drogę na matce|Wybierz rozpoznanie zatoki albo założenie córki; przygotuj skrzynię pierwszej pomocy; wyznacz bezpieczną trasę|Nowy punkt na mapie szlaku; przy wyborze kolonii własna córka z osobnym rozruchem. Pozostałe rozdziały nie wymagają zakupu córki|
|11|**Tajemnica zamkniętej Latarni** — poznaj dawną historię światła|Łańcuch wskazówek bez testu refleksu; mechanizmy nie wymagają nowego płatnego narzędzia|Z dziennika odtwórz sygnał; uruchom przeciwwagę; ustaw soczewki tak, aby odczytać ukrytą wiadomość|Otwarta galeria historyczna, soczewka-pamiątka i przydatne zasoby. Pełny escape room 8–15 min jako opcjonalna przygoda|
|12|**Teatr pod gwiazdami** — zrób miejsce integracji wyspy|Teatr dostępny jako istniejący budynek; główne zadanie nie wymaga płatnej ozdoby z reklamą|Użyj udostępnionych bezpłatnych rekwizytów misji do podstawowej aranżacji; dopasuj światło i rekwizyt do sceny; dostarcz pożywienie na spotkanie|Pierwsze przedstawienie i grupa widzów na placu; tytuł wydarzenia i kosmetyczna pamiątka|
|13|**Cisi goście oceanu** — ruch statków szanuje przyrodę|Dodatkowa wyspa z 13 pozostaje opcjonalna; używamy istniejącej gospodarki i mapy|Rozpoznaj trasę wędrówki zwierząt; wyznacz bezpieczny kurs; przygotuj punkt obserwacyjny z desek|Widoczna sezonowa wizyta zwierząt i delikatna iluminacja; dekoracja przyrodnicza, bez wpływu realnych datków|
|14|**Nic się nie marnuje** — opanuj nadwyżki zamiast stale powiększać magazyny|Wolne miejsce konkretnego towaru, przepływ drewno→deski/zboże→żywność i odbiór|Usuń istniejący zastój albo potwierdź sprawny odbiór; przetwórz potrzebną partię; dostarcz niewielki zestaw do ekip Latarni|Wydajniejsza dzielnica dostaw pokazana scenką; premia wybranego producenta. Nie wymagamy wyrzucania bonusowych zapasów|
|15|**Święto ludzi morza** — doceń wszystkich mieszkańców|Wystarczające jedzenie i łóżka, bez wymogu obecności innych graczy|Przygotuj bezpieczny festyn; skoordynuj trzy lokalne ekipy; połącz sygnał Latarni z krótką scenką Teatru|Widoczna parada osadników i pamiątkowy proporzec; limitowana premia szczęścia, bez wymuszonego zakupu nowych osób|
|16|**Szlak wielu świateł** — logistyka jest siecią, a nie jednym kursem|Kolejna córka od 16 opcjonalna; trasę można ćwiczyć z gwarantowanymi zleceniami osadyNPC|Ułóż kolejność dostaw; dopasuj ładunek do pojemności statku; odbierz dwie kontraktowane dostawy bez mieszania trybów statku|Mapa bezpiecznego szlaku staje się pełniejsza; sygnał rozpoznawczy i środki na samodzielny rozwój|
|17|**Skarbiec pod klifem** — zaplanuj mechanizm i drogę|Przygoda logiczna z rozwiązaniem podstawowym zestawem; opcjonalna trudniejsza wersja|Przekieruj wodę kanałami; rozłóż ograniczone ciężarki; otwórz przejście w prawidłowej kolejności|Odkryta skrytka i historyczna rzeźba do Teatru; nagroda nie jest wymagana do zakończenia bieżącej rozbudowy|
|18|**Światło ponad burzą** — zarządzaj kilkoma potrzebami jednocześnie|Produkcja, rezerwa jedzenia, budowa i rotacja pracowników; bramki sprawdzone przed terminem|Zaplanuj zmianę tragarzy; utrzymaj dwa kluczowe odbiory; przygotuj realny zapas na działanie świateł|Wieczorna panorama wyspy po burzy, nowy efekt Latarni i wybór jednej premii produkcyjnej|
|19|**Wielki zlot żagli** — pokaż efekty rozwoju osady|Opcjonalna córka od 19; wszystkie obowiązkowe wizyty i zlecenia są gwarantowaneNPC|Przygotuj trzy różne ładunki gości; ustal okna odbioru; rozmieść znaki orientacyjne w porcie|Różne łodzie odwiedzają zatokę; puchar wydarzenia i ozdoba. Liga pozostaje osobną aktywnością|
|20|**Wyspa, do której się wraca** — finał pierwszego wielkiego sezonu|Sprawdzenie całego działającego łańcucha; nie wymaga wszystkich budynków/dekoracji na 20 ani określonego wyglądu placu|Wybierz specjalizację obchodów; uruchom działający łańcuch dostaw; przygotuj pokaz Latarni i zakończ docelową rozbudowę|Panorama całej osady i wpis historii rozwoju; unikalna, czysto kosmetyczna nagroda oraz otwarcie kolejnego sezonu fabularnego|

**Osiem celów każdego rozdziału — skrócony projekt**

1. (Kamienie milowe w 25 lekcjach) nazwa i orientacja →3 tragarzy → priorytet → rolnicy → drwale → żywność → dwie drogi budowy → pierwsza Latarnia/przejęcie sterowania. To projekt grupowania, nie nowy program lekcji.
2. Odczytaj wiadomość o meteorach → sprawdź miejsca noclegu → dostarcz małą partię drewna → wyprodukuj deski → przygotuj jedzenie → powitaj finansowanego gościa we właściwym budynku → sprawdź pełny koszt Latarni → uruchom światło/ukończ docelowy poziom.
3. Sprawdź próg 54 → oszacuj żywienie → rozbuduj Dom 3 lub uznaj istniejący → uruchom dostępny plan rekrutacji → przyjmij realne osoby w kolejnych partiach → osiągnij 54 bez utraty rezerwy → zakończ Ratusz 4 lub uznaj wykonany awans → zakończ związany z nim etap Latarni. Rozdział startuje naTH 3 i ma za cel przygotowanie awansu, a nie żądanie awansu przed wejściem.
4. Obejrzyj trasę statku → sprawdź obsadę portu → przygotuj zakontraktowane środki → złóż niewielkie zlecenie → odbierz dostawę statku → dowieź do centrali → przygotuj modernizację Latarni → ukończ sygnał otwarcia przystani.
5. Odczytaj prognozę → sprawdź jedzenie → przygotuj deski na osłony → dowieź kamień → zapewnij odbiorcę żywności → sprawdź kolejkę budowy → wykonaj modernizację Latarni → przeprowadź bezpieczną noc sztormową.
6. Znajdź gwarantowaną butelkę → odczytaj symbole → dopasuj mapę → wybierz lokalnego adresataNPC → przygotuj mały zestaw pomocy → nadaj paczkę → odbierz potwierdzenie → uruchom nowy sygnał Latarni.
7. Poznaj rytm → dopasuj sygnał do łodzi → wyznacz punkt na mapie → przygotuj zapas materiału → sprawdź obsadę → przeprowadź próbę → ukończ modernizację → doprowadź flotę przez mgłę.
8. Odbierz fragment mapy → znajdź drugi w gwarantowanej scence → odtwórz mapę → odczytaj cień → wybierz zatoczkę → przygotuj wyprawę → odbierz skrytkę → odtwórz znak Latarni.
9. Odczytaj mapę dalszego szlaku → wybierz lokalny rejs próbny albo przygotowanie kolonizacji → poznaj koszt wybranej drogi → sprawdź potrzebną pojemność → przygotuj żywność → przygotuj ekipę odpowiednią dla tej drogi → wykonaj próbny pakunek → ukończ znak dalekiego szlaku. Wariant lokalny nie wymaga Magazynu 9 ani odsyłania 6 osób. Nie pobieramy ceny kolonii ani nie zakładamy jej przedTH 10.
10. Poznaj dwie ścieżki → wybierz rozpoznanie albo kolonię → potwierdź koszt wybranej drogi → przygotuj pakiet → wykonaj wybraną akcję → uruchom rozruch na córce albo lokalny punktNPC → potwierdź bezpieczną dostawę → rozświetl drugi brzeg.
11. Otwórz dziennik → dopasuj daty i sygnały → odnajdź klucz → uruchom przeciwwagę → ustaw soczewki → odczytaj wiadomość → zabezpiecz znalezisko → ukończ galerię Latarni.
12. Poznaj temat spektaklu → wybierz bezpłatny bazowy układ → ustaw jeden rekwizyt → dopasuj światło → przygotuj poczęstunek → rozwiąż prostą scenkę → zaproś lokalnych widzów → zsynchronizuj finał z Latarnią.
13. Odczytaj dziennik obserwacji → znajdź trasę wędrówki → wyznacz omijający kurs → przygotuj deski → ustaw znak obserwacyjny → wykonaj próbny rejs → dostosuj sygnał Latarni → obejrzyj bezpieczną wizytę zwierząt.
14. Sprawdź drożność odbioru → wskaż aktualne wąskie gardło albo potwierdź sprawny transport → zaplanuj mały potrzebny kontrakt → skieruj tragarzy → przetwórz rzeczywistą partię materiału → odbierz produkt → dostarcz ekipie → ukończ zmianę Latarni. Nie wywołujemy sztucznego przestoju, aby dało się go naprawiać.
15. Wybierz temat święta → sprawdź jedzenie → przygotuj lokalną ekipę → dostarcz zapasy → ustaw bezpłatny element sceny → wykonaj wspólny rytm → włącz sygnał Latarni → otwórz święto mieszkańców.
16. Odczytaj manifesty → wybierz kolejność → sprawdź pojemność → zarezerwuj pierwszy ładunek → odbierz pierwszą dostawę → przełącz tryb statku dopiero po jej zakończeniu → zrealizuj drugą dostawę → uruchom sygnał nowego szlaku.
17. Znajdź wejście → odczytaj plan kanałów → przekieruj wodę → rozłóż ciężarki → otwórz pierwsze drzwi → zachowaj drogę powrotną → odbierz skrytkę → odtwórz podziemny symbol Latarni.
18. Odczytaj trzy potrzeby osady → sprawdź gotowe obsady → zabezpiecz jedzenie → ułóż kolejkę → wykonaj pierwszą dostawę → zmień ekipę z realnym dojściem → ukończ modernizację → zapal światło ponad burzą.
19. Poznaj listę gościNPC → oszacuj trzy ładunki → przygotuj pierwszy → odbierz drugi → wyznacz znaki orientacyjne → skoordynuj ostatnią dostawę → przygotuj sygnał Latarni → otwórz zlot żagli.
20. Obejrzyj kronikę → wybierz akcent obchodów → sprawdź sprawny łańcuch zboże/żywność → potwierdź działający odbiór → przygotuj docelowy koszt → ukończ zaplanowaną modernizację → uruchom pokaz → odbierz pamiątkę i wybierz kolejny kierunek rozwoju.

**Pomoc 5 / ratunek 3 — wspólna metoda, nie powtórzenie ślepego celu**

Gałąź pomocy bada przyczynę przerwania i ma pięć etapów: (1) pokaż konkretny brak, (2) przygotuj warunek wstępny, (3) wykonaj realną akcję usuwającą brak, (4) sprawdź gotowość i zachowane wpłaty, (5) dokończ przygotowany cel i wróć do następnego etapu. Ratunek trzech etapów: (1) wybierz prostszą darmową ścieżkę, (2) uzupełnij brak małymi gwarantowanymi krokami, (3) powróć do przerwanej pomocy z realnie poprawionym stanem.

- Brak ludzi: sprawdź miejsca/łóżka/jedzenie → zapewnij miejsca → wykonaj gwarantowaną akcję rekrutacyjną → przyjmij uzgodnioną partię → ukończ cel. Ratunek nie daje samej paczki monet i polecenia zakupu tej samej niedostępnej osoby.
- Brak zasobów: wskaż konkretny surowiec → zapewnij producenta i wejście receptury → wyprodukuj małą osiągalną partię → odbierz transport → dokończ cel. Przy braku całej ekipy lub zasobów startowych pierwsza pomoc dostarcza zestaw rozruchowy, nie wymaga niemożliwej produkcji.
- Brak miejsca: sprawdź limit towaru i całości → wskaż potrzebne wykorzystanie lub osiągalną rozbudowę → wykonaj akcję → odbierz towar → wróć. Nie każemy niszczyć bonusowych nagród.
- Brak transportu: pokaż gdzie są ludzie → przywołaj dopuszczalną ekipę → zaczekaj na realny powrót/dojście z zajęciem pobocznym → odbierz małą dostawę → dokończ cel. Wycieczki/modlitwa pozostają uwzględnione.
- Pełny końcowy limit: od początku równoważny cel pomocy gościom/sąsiadom; nie żądamy nowych ludzi ponad limit ani wywoływania emigracji. Dokładne nagrody zastępcze do balansu.
- Awaria zapisu: to nie fabularna wina gracza; działająca ścieżka odzyskania i ochrona czasu, zamiast uruchamiania 5 nowych zadań za błąd systemu.

**Co trzeba wycenić przed GO**

1. Ile osób dostaje się za gwarantowaną akcję rekrutacyjną na danym poziomie i jak rozkładają się te porcje w 50 dniach. Cel 54 przed 3→4 nie może zostać ukryty za bezterminowym czekaniem.
2. Które rozdziały kończą się realnym awansem Latarni, a które tylko wydarzeniem/nagrodą. Nie wymagamy kolejnego poziomu ponad aktualny limitRatusza. Przed uznaniem wcześniejszego ulepszenia sprawdzamy, że to ta sama wcześniej zrealizowana potrzeba, nie żądamy ponownej opłaty.
3. Czas rozdziałów i etapy bez terminu przygotowawczego. Timery zaczynają się po pokazaniu warunków i osiągalnej drogi, a nie przy samym przeczytaniu opowiadania.
4. Wartość nagród, koszt przygód i obsługa pełnego limitu. Kosmetyka pozostaje bez koniecznych premii gospodarczych; zadania nie zakładają kupowania wszystkich 20 ozdób ani obecności dostawcy reklam.
5. Świadomy wybór: druga wyspa jest nową gałęzią zabawy, a nie ukrytą obowiązkową opłatą za dalszą fabułę. Jeśli ma być obowiązkowa, musi otrzymać własny osiągalny i finansowany plan oraz rozruch córki.

Przygotowano wyłącznie projekt. Żaden scenariusz, nagroda, nowa czynność, zmiana balansu ani integracja nie zostały wdrożone.


**Doprecyzowanie po uwadze: kreatywność i różny wysiłek myślowy**

Oferta miesza trzy smaki zabawy. Krótkie akcje dają przyjemność natychmiastowego działania, średnie pozwalają odkryć sprytną zasadę, dłuższe wymagają łączenia wskazówek. Gracz widzi przed startem rodzaj i przewidywaną długość. Trudność nie jest ukrytym wymogiem refleksu ani coraz krótszym stoperem. Nie każda przygoda ma odliczanie.

Przykłady nowych wariantów do biblioteki:

| Zabawa | Poziom wysiłku | Konkretna interakcja |
|---|---|---|
|Mewa-złodziejka|Lekka|Obserwuj, do którego gniazda mewa zaniosła błyszczący klucz; odszukaj go i odblokuj następną wskazówkę.|
|Kraby na promenadzie|Lekka|Klikaj drogowskazy, by skierować kraby do bezpiecznej zatoczki. Nie trzeba ich łapać ani robić krzywdy; zabawne reakcje są częścią nagrody.|
|Melodia z butelek|Średnia|Przelewaj wodę między butelkami i ustaw ich dźwięki w kolejności pokazanej symbolami. Rozwiązanie można odczytać również bez słuchania.|
|Papuga pozamieniała etykiety|Średnia|Trzy skrzynie opisano „drewno”, „kamień” i „mieszane”. Wszystkie etykiety są błędne. Można zajrzeć do jednej skrzyni i na tej podstawie poprawić komplet.|
|Pocztówka nie z tego miejsca|Średnia|Dobierz punkt widzenia mapy i fragmenty panoramy tak, żeby stary rysunek pokrył się z obecną wyspą; w dopasowanym widoku pojawia się miejsce skrytki.|
|Fontanna, która gra|Średnia|Przekieruj wodę przez różne dysze; wzór strumieni odtwarza kod znajdujący się na scenariuszu przedstawienia.|
|Latarnia w lustrze|Wymagająca|Zwykła mapa nie pasuje do znaków na ścianie. Dziennik i odbicie wskazują, że część instrukcji trzeba odczytać przez lustro. Ustawione światło ujawnia właściwą trasę.|
|Zegar przypływu|Wymagająca|Przełączaj model zatoki między stanami wody, aby otwierać przejścia w poprawnej kolejności. Nie czekasz na rzeczywisty przypływ i nie tracisz wymaganych narzędzi.|
|Fałszywy sygnał|Wymagająca|Porównaj komunikaty trzech statków z mapą i dziennikiem obserwacji. Ustal, który sygnał pochodzi od uszkodzonej lampy, i wyznacz kurs na podstawie pozostałych dowodów.|
|Teatr cieni|Wymagająca|Przestaw kilka rekwizytów i reflektor. Cienie tworzą brakujący fragment obrazu, a ten podaje kolejność otwierania mechanizmu pod sceną.|

Dla skrzyń z etykietami generator musi rzeczywiście zachować warunek „wszystkie etykiety błędne”, a dla fałszywego sygnału przygotować jednoznaczny komplet dowodów. Kreatywny pomysł przechodzi dalej dopiero po rozpisaniu rozwiązania oraz sprawdzeniu, że wariant jest wykonalny. Nie ma potrzeby nazywania zwykłego losowania zagadką logiczną.


**Dalsze pomysły: humor, odkrywanie i kombinowanie**

- **Latarnik zgubił okulary — lekka scena.** Wskazówka „czytałem przy oknie” kieruje uwagę na właściwe miejsce. Odsuwasz mapę, sprawdzasz kapelusz, odkrywasz, że okulary nosi krab. Trop prowadzi do rozwiązania bez klikania po całym ekranie.
- **Stemple dla turystów — lekka zabawa.** Przybywa chór rybaków albo odkrywczyni z kozą. Wybierasz stempel trasy po wyspie według biletu i planu wydarzeń. Nietypowy gość jest małym żartem, a nie błędem wymagającym pośpiechu.
- **Pracownia dziwnych wynalazków — średnia zagadka.** Trzeba wydobyć żelazny klucz ze studni. Wybierasz części, łączysz je i widzisz skutek próby. Można użyć magnesu na sznurku albo odpowiedniego chwytaka. Kilka poprawnych rozwiązań pozwala eksperymentować.
- **Plotka, która obiegła port — średnia przygoda detektywistyczna.** Rozmowy, godziny przypłynięć i znalezione przedmioty ujawniają drogę przesyłki. „Czerwony żagiel” okazuje się czerwoną kurtyną Teatru. Nowy dowód otwiera nowe pytanie, a nie tylko następny tekst.
- **Echo z zatoki — średnia zagadka obserwacyjna.** Trzy miejsca pomiaru dają różne echa, również na wizualnym wykresie. Porównujesz opóźnienia i kierunki, żeby znaleźć właściwą jaskinię. Nie potrzeba mikrofonu ani wiedzy fizycznej spoza wskazówek gry.
- **Hotel dla rozbitków — wymagające planowanie.** Na osobnej planszy przygody przydzielasz pokoje grupom o różnych potrzebach. Rodzina z seniorem potrzebuje parteru, muzyk dużego instrumentu. Wspólna sala może rozwiązać problem instrumentu i uwolnić właściwy pokój. Próby nie zajmują po cichu prawdziwych łóżek wyspy.
- **Rada przed świętem — wymagające negocjacje.** Stolarz potrzebuje narzędzi kupca, kupiec odzyskanej skrzynki, a rybacy dostępu do nabrzeża. Gracz łączy rozmowy, zadania i wymiany, szukając kolejności lub innej umowy, która pomoże wszystkim. Nie ma konieczności rozwiązywania każdej sceny identycznie.
- **Magnetyczny wrak — wymagająca zagadka przestrzenna.** Obracasz bieguny magnesów i prowadzisz kapsułę do zamka. Proste przyciągnięcie blokuje ją za kratą; najpierw trzeba odepchnąć ją w boczny korytarz. Podgląd i cofanie ruchu pozwalają świadomie zaplanować trasę.
- **Papierowy testament szkutnika — wymagająca przygoda.** Wirtualny plan łodzi składasz, obracasz i oglądasz przez wycięte okienka. Połączenie północy z południem róży wiatrów ujawnia znak szuflady. Znalezione narzędzie prowadzi do następnego pomieszczenia. Papier zawsze można rozłożyć; nie wymaga to gry fizycznej, kamery ani skanowania.

Pierwsze warianty uczą własnej reguły, kolejne ją rozwijają: np. wynalazek da się zbudować z dwóch różnych kompletów części, a hotel ma wspólną salę albo dwa wejścia. Zamiana koloru przedmiotu bez zmiany rozwiązania nie jest nowym scenariuszem.
