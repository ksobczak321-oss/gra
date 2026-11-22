// Player-facing instructions shared by island, adventure rooms and practice links.
// This module never creates a run, advances a timer or dispatches an action.
import { ISLAND_PUZZLE_CATALOG, STORY_CATALOG } from './harborlight-v1-story-catalog.js?v=frontend-v32-24';
import { ADVENTURE_CATALOG } from './harborlight-v1-adventures.js?v=frontend-v32-24';
const PL = {
  "puzzle:signal-line": {
    "scenario": "Latarnik musi przywrócić ciągłość sygnału w przystani. Przekaźniki łączy sieć przewodów, a każdy przewód wolno wykorzystać tylko raz.",
    "rules": [
      "Zacznij od jednego z dwóch oznaczonych portów i prowadź ślad tylko wzdłuż istniejących połączeń.",
      "Każdy kolejny węzeł musi być bezpośrednio połączony z ostatnim. Nie można ponownie użyć tego samego przewodu.",
      "Możesz wielokrotnie przejść przez węzeł innym przewodem. Zakaz dotyczy przewodów, nie samych węzłów.",
      "Przerwanie niedokończonej kreski czyści bieżący ślad; ukończenie wymaga jednego ciągłego przejścia przez całą sieć."
    ],
    "controls": [
      "Naciśnij oznaczony węzeł, a następnie prowadź wskaźnik lub palec po kolejnych połączonych węzłach.",
      "Użyj czyszczenia śladu, gdy odcięta część sieci uniemożliwia dalszy ruch."
    ]
  },
  "puzzle:harbor-routes": {
    "scenario": "Reda jest zatłoczona. Konwoje można wyprawiać wyłącznie w kierunku ich strzałek, dlatego trzeba zwalniać wyjścia w odpowiedniej kolejności.",
    "rules": [
      "Wybierz konwój, którego droga od czoła do krawędzi planszy jest wolna.",
      "Konwojów nie obraca się i nie przestawia dowolnie. Wybrany konwój opuszcza planszę w swoim kierunku.",
      "Usunięty konwój zwalnia zajmowane pola, co może odblokować pozostałe jednostki.",
      "Nie można ponownie wyprawić konwoju, który już opuścił redę."
    ],
    "controls": [
      "Kliknij lub dotknij konwoju, który chcesz wyprawić.",
      "Przed kliknięciem sprawdź przebieg strzałki aż do brzegu planszy."
    ]
  },
  "puzzle:gull": {
    "scenario": "Mewa zabrała klucz potrzebny do dalszej wyprawy. Ustaw odpowiednią przynętę, aby odciągnąć ją od zguby.",
    "rules": [
      "Wszystkie trzy cechy przynęty muszą się zgadzać: pokarm, wysokość i bezpieczeństwo od krabów.",
      "Samo wybranie miejsca nie kończy zadania. Klucz odbierasz osobnym przyciskiem."
    ],
    "controls": [
      "Przeczytaj wskazówkę: jakiego jedzenia szuka mewa.",
      "Wśród czterech miejsc wybierz to, które jednocześnie ma właściwy pokarm oraz opisy „wysoko” i „bez krabów”.",
      "Kliknij wybrane miejsce, a następnie przycisk „Zabierz klucz”."
    ]
  },
  "puzzle:crabs": {
    "scenario": "Jeden krab musi zapamiętać bezpieczną trasę do muszli. Najpierw obejrzyj drogę, a potem przeprowadź go po niej z pamięci.",
    "rules": [
      "Krab porusza się o jedno pole w pionie lub poziomie.",
      "Błędny krok cofa kraba na początek; spróbuj ponownie z zapamiętaną trasą."
    ],
    "controls": [
      "Obejrzyj podświetloną bezpieczną trasę.",
      "Kliknij „Zapamiętane — ruszam”, aby ukryć podpowiedź.",
      "Klikaj kolejne sąsiednie pola trasy aż do muszli.",
      "Jeśli chcesz obejrzeć drogę ponownie, wybierz „Pokaż trasę od nowa”."
    ]
  },
  "puzzle:hiddenObjects": {
    "scenario": "Latarnik zgubił okulary. Wskazówka opisuje miejsce ukrycia kolorem i symbolem; trzeba je najpierw obejrzeć.",
    "rules": [
      "Oglądaj miejsca, aby odsłaniać ich kolor i symbol.",
      "Do właściwego miejsca muszą pasować obie cechy, nie tylko kolor albo sam znak.",
      "Potwierdzić można wyłącznie miejsce już obejrzane."
    ],
    "controls": [
      "Przeczytaj obie wskazówki: kolor i symbol szukanego miejsca.",
      "Porównaj widoczne oznaczenia wszystkich miejsc i kliknij to, które pasuje do obu wskazówek.",
      "Po obejrzeniu miejsca kliknij jego przycisk potwierdzenia wyboru."
    ]
  },
  "puzzle:parrot": {
    "scenario": "Papuga pomieszała litery wiadomości kapitana. Odtwórz z nich kolejne słowa.",
    "rules": [
      "Korzystasz z liter dostępnych w bieżącej rozsypance.",
      "Ukończ wszystkie słowa wiadomości."
    ],
    "controls": [
      "Przeczytaj wskazówkę do bieżącego słowa.",
      "Klikaj pojedyncze litery w kolejności tworzącej słowo.",
      "Sprawdź ułożone słowo przyciskiem potwierdzenia.",
      "W razie pomyłki wyczyść odpowiedź i ułóż ją ponownie."
    ]
  },
  "puzzle:packing": {
    "scenario": "Przygotuj skrzynkę ratunkową, mieszcząc cały sprzęt na ograniczonej powierzchni.",
    "rules": [
      "Każdy element musi w całości mieścić się na planszy i nie nachodzić na pozostałe.",
      "Wskazane pole jest lewym górnym rogiem elementu.",
      "Wybrany element można obrócić o ćwierć obrotu lub wyjąć bez kosztu. Obrót usuwa jego dotychczasowe położenie."
    ],
    "controls": [
      "Wybierz element wyposażenia i obejrzyj jego kształt.",
      "Jeśli trzeba, kliknij „Obróć wybrany element”.",
      "Kliknij pole będące lewym górnym rogiem jego położenia.",
      "Dopasuj wszystkie elementy; możesz je wyjmować i układać ponownie."
    ]
  },
  "puzzle:untangle": {
    "scenario": "Liny zaplątały się między punktami mocowania. Zamieniaj położenia punktów tak, aby wszystkie liny przestały się krzyżować.",
    "rules": [
      "Zamiana dotyczy punktów mocowania i wszystkich przyczepionych do nich lin.",
      "Wszystkie pary lin muszą być wolne od przecięć."
    ],
    "controls": [
      "Pod rysunkiem kliknij przycisk z symbolem wybranego punktu mocowania.",
      "Następnie kliknij „Zamień z…” przy symbolu drugiego punktu.",
      "Obserwuj przesuwające się razem z punktami liny i kontynuuj zamiany, aż znikną przecięcia."
    ]
  },
  "puzzle:navigation": {
    "scenario": "Przeprowadź łódź przez mgłę i rafy do portu, mieszcząc się w ograniczonym zapasie drogi.",
    "rules": [
      "Mgła skrywa rafy. Wpłynięcie na rafę odkrywa ją i cofa łódź na początek.",
      "Ruch po przekątnej jest niedozwolony.",
      "Obserwuj pozostały zapas kroków."
    ],
    "controls": [
      "Przeczytaj wskazówki dotyczące kursu.",
      "Klikaj sąsiednie pola: w górę, w dół, w lewo lub w prawo.",
      "Zapamiętuj odkryte rafy i doprowadź łódź do portu."
    ]
  },
  "puzzle:scheduling": {
    "scenario": "Statki potrzebują miejsca i czasu na rozładunek. Ułóż im harmonogram, w którym każdy zdąży i żadne dwa statki nie zajmą jednocześnie tego samego nabrzeża.",
    "rules": [
      "Przykład: start o 2 i rozładunek przez 2 godziny zajmuje nabrzeże od 2 do 4. Następny statek może zacząć o 4.",
      "Dwa różne nabrzeża mogą pracować równocześnie."
    ],
    "controls": [
      "Przeczytaj na karcie statku jego nabrzeże, dozwolone godziny rozpoczęcia i długość rozładunku.",
      "Kliknij kartę wybranego statku.",
      "Kliknij pole z parą „nabrzeże · godzina rozpoczęcia”.",
      "Przydziel wszystkie statki i sprawdź, czy ich rozładunki się nie nakładają."
    ]
  },
  "puzzle:gears": {
    "scenario": "Przywróć napęd mechanizmu Latarni, ustawiając trzy przekładnie na właściwą prędkość i kierunek.",
    "rules": [
      "Sterujesz klikaniem przycisków; nie musisz przeciągać prostokątów.",
      "Łączną prędkość otrzymujemy przez pomnożenie trzech ustawień, np. ×2 · ×2 · ×3 = ×12.",
      "Nieparzysta liczba odwróconych kół odwraca kierunek całego napędu. Prędkość i kierunek muszą zgadzać się jednocześnie."
    ],
    "controls": [
      "Dla każdego z trzech kół kliknij jeden z przycisków mnożnika: ×1, ×2 albo ×3.",
      "Przyciskiem ze strzałką odwróć kierunek odpowiedniego koła.",
      "Porównaj wyświetloną łączną prędkość i kierunek z celem."
    ]
  },
  "puzzle:optics": {
    "scenario": "Światło wchodzi z lewej strony układu. Skieruj je przez zwierciadła do złotego odbiornika.",
    "rules": [
      "Kliknięcie zwierciadła przełącza jego ułożenie pomiędzy „/” i „\\”.",
      "Promień odbija się zgodnie z orientacją lustra.",
      "Wyjście promienia poza planszę lub pętla bez odbiornika nie kończy zadania."
    ],
    "controls": [
      "Znajdź źródło światła z lewej strony i złoty odbiornik.",
      "Kliknij zwierciadło, aby przełączyć je między „/” i „\\”.",
      "Śledź promień i ustawiaj następne zwierciadła, aż światło trafi do odbiornika."
    ]
  },
  "puzzle:tides": {
    "scenario": "Otwórz bramę przypływu przez bezpieczne rozdzielenie wody pomiędzy trzy komory śluzy.",
    "rules": [
      "Jedno naciśnięcie przelewa dokładnie jedną jednostkę wody.",
      "Przelewać można tylko między sąsiednimi komorami: 1↔2 i 2↔3.",
      "Źródło musi zawierać wodę, a cel nie może być pełny.",
      "Wszystkie trzy poziomy muszą jednocześnie odpowiadać oznaczonym wartościom."
    ],
    "controls": [
      "Na każdej komorze porównaj aktualny poziom z oznaczonym celem.",
      "Kliknij 1→2, 2→1, 2→3 lub 3→2, aby przelać jedną jednostkę wody w wybranym kierunku.",
      "Przelewaj dalej, aż wszystkie trzy poziomy jednocześnie osiągną cele."
    ]
  },
  "puzzle:hotel": {
    "scenario": "Rozbitkowie potrzebują noclegu. Każda grupa ma własne wymagania; dopasuj do nich wszystkie pokoje.",
    "rules": [
      "Gdy wskażesz zajęty pokój, grupy zamienią się miejscami: dotychczasowi goście przejdą do poprzedniego pokoju wybranej grupy.",
      "Jeżeli wybrana grupa nie miała jeszcze pokoju, goście z zajętego pokoju wrócą do oczekujących."
    ],
    "controls": [
      "Przeczytaj wymagania grupy oraz cechy dostępnych pokoi.",
      "Kliknij grupę gości, a następnie wybrany dla niej pokój.",
      "Sprawdź wszystkie przydziały: każdy pokój musi spełniać wszystkie wymagania swojej grupy."
    ]
  },
  "puzzle:magnets": {
    "scenario": "Przesuń kapsułę przez wrak do zamka. Ustaw magnesy tak, aby razem przesuwały ją dokładnie o jedno pole w dobrą stronę.",
    "rules": [
      "Za silny impuls lub ruch poza tor zostaje odrzucony.",
      "Strzałki magnesów pokazują, które siły dodają się, a które wzajemnie osłabiają."
    ],
    "controls": [
      "Kliknij magnes, aby zmienić jego strzałkę na przeciwną.",
      "Obserwuj komunikat o łącznym ruchu pod planszą. Potrzebujesz dokładnie jednego pola w prawo.",
      "Gdy pojawi się „Gotowe”, klikaj „Wyślij impuls”, aż kapsuła dotrze do zamka."
    ]
  },
  "puzzle:paperFold": {
    "scenario": "Plan szkutnika kryje testament. Zginaj cztery narożniki tak, aby okienka odsłoniły wskazaną wiadomość.",
    "rules": [
      "Każde kliknięcie zmienia tylko jeden narożnik; przeciąganie nie jest potrzebne.",
      "Ponowne kliknięcie tego samego okienka przywraca drugą stronę."
    ],
    "controls": [
      "Przeczytaj docelową „Wiadomość” w notatniku.",
      "Kliknij jedno z czterech okienek planu, aby złożyć albo rozłożyć odpowiadający mu narożnik.",
      "Porównuj słowo w każdym okienku z tą samą pozycją wiadomości.",
      "Powtarzaj kliknięcia wybranych okienek, aż cała wiadomość będzie zgodna."
    ]
  },
  "puzzle:invention": {
    "scenario": "W studni leży potrzebny przedmiot. Z dostępnych części zbuduj narzędzie zapewniające zasięg, chwyt i podnoszenie.",
    "rules": [
      "Każda potrzebna funkcja i każde podane ograniczenie muszą być spełnione jednocześnie.",
      "Samo zaznaczenie części nie kończy zadania; trzeba sprawdzić gotowy wynalazek."
    ],
    "controls": [
      "Przeczytaj wymagania dotyczące zasięgu, chwytu i podnoszenia oraz ograniczenia części.",
      "Klikaj części, które wspólnie spełnią wymagania. Ponowne kliknięcie odznacza część.",
      "Kliknij „Sprawdź wynalazek”, gdy komplet będzie gotowy."
    ]
  },
  "puzzle:photo": {
    "scenario": "Fotograf próbuje nałożyć trzy znaki krajobrazu na złote kontury. Zmień położenie aparatu i przybliżenie.",
    "rules": [
      "Każde naciśnięcie + lub − zmienia wybrane ustawienie o jeden.",
      "Poziom przesuwa znaki w poziomie, pion w pionie, a zoom zmienia wzajemny rozstaw znaków.",
      "Dopasowanie jednego znaku nie oznacza jeszcze poprawnego ustawienia wszystkich trzech parametrów."
    ],
    "controls": [
      "Używaj sześciu przycisków: poziom −/+, pion −/+ i zoom −/+."
    ]
  },
  "puzzle:deduction": {
    "scenario": "W porcie pomylono historię trzech przesyłek. Odtwórz adresatów, korzystając z dowodów i wykluczeń.",
    "rules": [
      "Wskazówki podają jedno miejsce wprost oraz jedno wykluczenie.",
      "Każda paczka ma jednego odbiorcę, a każdy odbiorca jedną paczkę.",
      "Przeniesienie paczki do zajętego miejsca zamienia przydziały."
    ],
    "controls": [
      "Wybierz paczkę, następnie miejsce dostawy."
    ]
  },
  "puzzle:cooking": {
    "scenario": "Przygotuj świąteczne dania zgodnie z przepisami i potrzebami gości. Korzystasz z zapasów tej zagadki.",
    "rules": [
      "Tylko poprawna porcja przechodzi do następnego przepisu.",
      "Składniki zagadki nie zużywają rzeczywistych zapasów wyspy."
    ],
    "controls": [
      "Przeczytaj bieżący przepis oraz wymagania gościa.",
      "Klikaj składniki, aby dodać ich potrzebne ilości do garnka.",
      "Ustaw wymaganą temperaturę dostępnymi przyciskami.",
      "Kliknij „Przygotuj porcję”, aby sprawdzić danie, albo „Opróżnij garnek”, aby zacząć je od nowa."
    ]
  },
  "puzzle:signalsDecode": {
    "scenario": "Boje nadały zakodowany komunikat. Odczytaj legendę i odpowiedz liczbami we właściwej kolejności.",
    "rules": [
      "Każdy symbol tłumaczy się według aktualnej legendy, nie według zapamiętanej legendy z poprzedniej próby.",
      "Wprowadź liczby w kolejności symboli komunikatu.",
      "Nieprawidłowa liczba czyści całą dotychczasową odpowiedź."
    ],
    "controls": [
      "Naciskaj przyciski 1, 2, 3 i 4 zgodnie z legendą."
    ]
  },
  "puzzle:balance": {
    "scenario": "Skarbiec otwierają dwie zapadnie. Rozłóż cztery ciężarki tak, aby obie miały wymagane obciążenia jednocześnie.",
    "rules": [
      "Każdy ciężarek musi trafić na jedną z dwóch szal.",
      "Ciężarek można przenosić; jego wartość nie zmienia się.",
      "Liczy się suma wartości na każdej szali, a nie liczba elementów.",
      "Trzeba wykorzystać wszystkie cztery ciężarki."
    ],
    "controls": [
      "Wybierz ciężarek, potem lewą lub prawą szalę."
    ]
  },
  "puzzle:memoryTriples": {
    "scenario": "Dziennik rozpadł się na fragmenty. Odzyskaj go, odnajdując wszystkie trójki takich samych symboli.",
    "rules": [
      "Odkrywaj po jednej karcie; jednocześnie sprawdzana jest trójka odkrytych pól.",
      "Trzy takie same symbole zostają dopasowane i usunięte z dalszego wyboru.",
      "Niedopasowana trójka zakrywa się po 0,8 s.",
      "Od trudności 4 zakryte, niedopasowane karty są okresowo przetasowywane.",
      "Jest to plansza w przygodzie: nie prowadzi osobnej wypłacanej puli ekspedycji."
    ],
    "controls": [
      "Klikaj lub dotykaj zakrytych kart."
    ]
  },
  "puzzle:marbleMaze": {
    "scenario": "Kulka uruchamia mechanizm, jeżeli dotrze do zagłębienia. Prowadź ją przechylaniem planszy, omijając ściany.",
    "rules": [
      "Nachylenie planszy przyspiesza kulki; bezwładność powoduje dalszy ruch po zmianie kierunku.",
      "Ściany i obramowanie blokują przejazd i odbijają kulki.",
      "Każda kulka musi osiąść w innym wolnym otworze; trafiona kulka przestaje się poruszać.",
      "Precyzyjne małe przechylenia pomagają wyhamować przy celu."
    ],
    "controls": [
      "Na komputerze poruszaj kursorem nad planszą albo użyj klawiszy strzałek.",
      "Na telefonie steruj dotykiem lub użyj dostępnego sterowania ruchem telefonu po udzieleniu zgody.",
      "Wycentruj sterowanie, aby przestać nadawać przyspieszenie."
    ]
  },
  "adventure:cargoRain": {
    "scenario": "Samolot transportowy zgubił część ładunku. Masz 45 sekund, aby odzyskać spadające monety i materiały, zanim wpadną do morza.",
    "rules": [
      "Złap widoczny ładunek, zanim skończy się jego czas spadania.",
      "Ładunki zawierają monety, drewno, kamień, zboże, mąkę i deski.",
      "Monet jest po 5 na ładunek; materiałów po 10. Tego samego ładunku nie można odebrać drugi raz."
    ],
    "controls": [
      "Klikaj lub dotykaj spadających ikon."
    ]
  },
  "adventure:treasureMap": {
    "scenario": "Odkrywaj trójki w ekspedycji, zbierz cztery fragmenty mapy i ułóż je. Wskazówka zaprowadzi Cię do skarbu na wyspie.",
    "rules": [
      "Fragmenty powstają przy dopasowywaniu trójek w ekspedycji; potrzeba czterech różnych fragmentów.",
      "Na mapie wybierz dwa pola, aby zamienić fragmenty miejscami. Komplet jest poprawny dopiero po ułożeniu całego obrazu.",
      "Odczytaj wskazówkę gotowej mapy i wybierz miejsce na wyspie.",
      "Miejscem skarbu może być Gospodarstwo, Kamieniołom, Latarnia albo Teatr."
    ],
    "controls": [
      "Wejdź do trójek, aby zdobywać fragmenty.",
      "Klikaj pary fragmentów do zamiany, potem miejsce poszukiwań wskazane przez zagadkę."
    ]
  },
  "adventure:pirateCannon": {
    "scenario": "Każda wygrana runda z kulką daje jedną kulę do armaty. Wyceluj w piratów i utoruj kupcowi drogę do portu.",
    "rules": [
      "Jedna wygrana runda z kulką daje jedną kulę.",
      "Wycelowanie wyznacza kierunek, ale nie strzela. Strzał zużywa jedną kulę.",
      "Pocisk startuje przy armacie i leci ze stałą prędkością; trzeba uwzględnić ruch celu.",
      "Jednocześnie mogą lecieć najwyżej trzy pociski. Trafienie jest sprawdzane przez symulację, a nie przez kliknięcie statku."
    ],
    "controls": [
      "Wskaż punkt na morzu, aby wycelować.",
      "Naciśnij strzał; w razie potrzeby przejdź do rundy z kulką po amunicję."
    ]
  },
  "adventure:bridge": {
    "scenario": "Połącz podpory ograniczoną liczbą belek. Sprawdź konstrukcję, zanim przejdą po niej mieszkańcy. Wszystkie potrzebne belki dostajesz na początku.",
    "rules": [
      "Łącz tylko dozwolone, niezbyt odległe pary punktów.",
      "Powtórne wskazanie istniejącej pary usuwa belkę i zwraca ją do zapasu.",
      "Most musi mieć ciągły dolny pomost od jednego brzegu do drugiego oraz sztywną konstrukcję pod obciążeniem.",
      "Po ustawieniu belek uruchom test, aby sprawdzić, czy most bezpiecznie utrzyma mieszkańców.",
      "Rozwiązanie mieści się w początkowym budżecie; dodatkowe belki są pomocą, nie obowiązkiem."
    ],
    "controls": [
      "Wybierz dwa punkty konstrukcji.",
      "Naciśnij sprawdzenie mostu, a po błędzie popraw układ."
    ]
  },
  "adventure:signals": {
    "scenario": "Zapamiętaj kolejność świateł i powtórz sygnał. Dzięki Tobie zagubiony statek bezpiecznie trafi do portu.",
    "rules": [
      "Najpierw obejrzyj pełny sygnał.",
      "Po pokazie naciskaj światła w tej samej kolejności.",
      "Błąd czyści odpowiedź i uruchamia pokaz od początku.",
      "Można zażądać powtórki pokazu, co również czyści bieżącą odpowiedź."
    ],
    "controls": [
      "Obserwuj oznaczenia świateł, potem wybieraj przyciski czterech sygnałów.",
      "Użyj powtórnego pokazu, jeśli potrzebujesz przypomnienia."
    ]
  },
  "adventure:letters": {
    "scenario": "Adresy rozmyła woda. Przeczytaj wskazówki w trzech listach i odszukaj ich odbiorców na wyspie.",
    "rules": [
      "Najpierw otwórz list i przeczytaj wskazówkę.",
      "Następnie wskaż budynek, w którym pracuje jego odbiorca.",
      "Każdy list doręcza się raz. Nietrafne doręczenie można poprawić.",
      "Wskazówki prowadzą do Kamieniołomu, Młyna i Latarni."
    ],
    "controls": [
      "Wybierz list i przeczytaj go.",
      "Wybierz miejsce doręczenia na wyspie."
    ]
  },
  "adventure:rhythm": {
    "scenario": "Odszukaj trzy instrumenty, posłuchaj melodii i wystukaj rytm powitalnego koncertu.",
    "rules": [
      "Odszukaj wszystkie trzy instrumenty.",
      "Zapamiętaj kolejność pięciu uderzeń i odstępy między nimi.",
      "Wystukaj sekwencję bęben–dzwon–flet–dzwon–bęben.",
      "Kolejne uderzenia są oddalone o 0,7 s; tolerancja czasu wynosi ±0,35 s.",
      "Pomyłka instrumentu lub rytmu cofa wykonanie do etapu odsłuchu."
    ],
    "controls": [
      "Wybieraj miejsca poszukiwania instrumentów.",
      "Po odsłuchu naciskaj odpowiednie przyciski instrumentów w rytmie."
    ]
  },
  "adventure:garden": {
    "scenario": "Obracaj kamienne rynienki i doprowadź wodę do trzech sadzawek. Stary ogród znów zakwitnie.",
    "rules": [
      "Każde kliknięcie obraca rynienkę o 90 stopni.",
      "Woda płynie wyłącznie przez zgodne, stykające się otwory dwóch sąsiednich rynienek.",
      "Pierwsza rynienka musi przyjąć wodę od strony zachodniej.",
      "Zbuduj sieć doprowadzającą wodę do wszystkich trzech sadzawek; sam wizualny kontakt bez zgodnych otworów nie wystarcza."
    ],
    "controls": [
      "Klikaj kafelki rynienek, obserwując zaznaczone nawodnione pola."
    ]
  },
  "adventure:cargoBalance": {
    "scenario": "Rozmieść skrzynie tak, aby statek utrzymał równowagę. Potem wybierz bezpieczną trasę do portu.",
    "rules": [
      "Każdą skrzynię ustaw na jednej pozycji; wybranie zajętej pozycji zamienia skrzynie miejscami.",
      "Moment skrzyni to masa × położenie. Łączny moment wszystkich skrzyń musi wynosić zero.",
      "Po załadunku sprawdź równowagę. Dopiero poprawny załadunek otwiera wybór trasy.",
      "Na końcu wybierz osłoniętą zatokę, zamiast krótszego przesmyku przy rafie."
    ],
    "controls": [
      "Wybierz skrzynię i miejsce na pokładzie.",
      "Sprawdź ładunek, następnie wybierz trasę."
    ]
  },
  "expedition:tilt": {
    "scenario": "Ekspedycja rozpoczyna się za darmo. Wygrane rundy budują pulę monet, która pozostaje zagrożona do momentu świadomej wypłaty. Jest to odrębny tryb od pojedynczej planszy użytej w opowieści.",
    "rules": [
      "Nachylenie planszy przyspiesza kulki; bezwładność powoduje dalszy ruch po zmianie kierunku.",
      "Ściany i obramowanie blokują przejazd i odbijają kulki.",
      "Każda kulka musi osiąść w innym wolnym otworze; trafiona kulka przestaje się poruszać.",
      "Precyzyjne małe przechylenia pomagają wyhamować przy celu.",
      "Po wygranej runda zatrzymuje się w stanie decyzji. Możesz wypłacić całą pulę albo zaryzykować ją w następnej rundzie.",
      "Nie można uruchomić drugiej serii ekspedycji, dopóki pierwsza jest aktywna lub czeka na decyzję."
    ],
    "controls": [
      "Na komputerze poruszaj kursorem nad planszą albo użyj klawiszy strzałek.",
      "Na telefonie steruj dotykiem lub użyj dostępnego sterowania ruchem telefonu po udzieleniu zgody.",
      "Wycentruj sterowanie, aby przestać nadawać przyspieszenie.",
      "Po zwycięstwie użyj wypłaty albo przejścia do kolejnego poziomu."
    ]
  },
  "expedition:triples": {
    "scenario": "Ekspedycja rozpoczyna się za darmo. Wygrane rundy budują pulę monet, która pozostaje zagrożona do momentu świadomej wypłaty. Jest to odrębny tryb od pojedynczej planszy użytej w opowieści.",
    "rules": [
      "Odkrywaj po jednej karcie; jednocześnie sprawdzana jest trójka odkrytych pól.",
      "Trzy takie same symbole zostają dopasowane i usunięte z dalszego wyboru.",
      "Niedopasowana trójka zakrywa się po 0,8 s.",
      "Od trudności 4 zakryte, niedopasowane karty są okresowo przetasowywane.",
      "Po wygranej runda zatrzymuje się w stanie decyzji. Możesz wypłacić całą pulę albo zaryzykować ją w następnej rundzie.",
      "Nie można uruchomić drugiej serii ekspedycji, dopóki pierwsza jest aktywna lub czeka na decyzję."
    ],
    "controls": [
      "Klikaj lub dotykaj zakrytych kart.",
      "Po zwycięstwie użyj wypłaty albo przejścia do kolejnego poziomu."
    ]
  }
};
const LEGACY_PL = {
  "crabs": {
    "scenario": "Trzy kraby muszą dotrzeć do swoich muszli po prawej stronie kamienistego brzegu.",
    "rules": [
      "Wybierz kraba i przesuwaj go o jedno sąsiednie pole pionowo lub poziomo.",
      "Nie wolno wejść na kamień, inne zwierzę ani do pary rzędów należącej do innego kraba.",
      "Obejdź przeszkody dolnym lub górnym rzędem własnej strefy."
    ],
    "controls": [
      "Wybierz kraba z listy.",
      "Wskaż sąsiednie wolne pole planszy."
    ]
  },
  "parrot": {
    "scenario": "Papuga kapitana powtarza zakodowane słowa. Odczytaj każde z nich wspak i zachowaj kolejność wypowiedzi.",
    "rules": [
      "Odwróć litery każdego słowa osobno.",
      "Naciskaj nazwy w tej samej kolejności, w jakiej występują zakodowane słowa.",
      "Błąd czyści dotychczasową sekwencję odpowiedzi; trzeba wprowadzić ją od początku."
    ],
    "controls": [
      "Naciskaj kolejne przyciski nazw."
    ]
  },
  "untangle": {
    "scenario": "Liny cumownicze pomieszały się między lewymi zaczepami a prawymi mocowaniami. Uporządkuj je, aby żadne się nie krzyżowały.",
    "rules": [
      "Wybierz lewą cumę i wskaż prawe mocowanie.",
      "Jeżeli mocowanie jest zajęte, dwie liny zamieniają się prawymi końcami.",
      "Cel dotyczy wszystkich par lin: żadna para nie może się przecinać."
    ],
    "controls": [
      "Wybierz lewy zaczep.",
      "Kliknij docelowe prawe mocowanie."
    ]
  },
  "navigation": {
    "scenario": "Przeprowadź łódź przez mgłę i rafy do portu, mieszcząc się w ograniczonym zapasie drogi.",
    "rules": [
      "Poruszaj się po sąsiednich polach w czterech kierunkach.",
      "Rafy są niedostępne, a ruch po przekątnej nie jest dozwolony.",
      "Każde przejście zużywa krok; powrót na wcześniejsze pole również kosztuje krok. Cofnięcie dostępnego ruchu może przywrócić zapas."
    ],
    "controls": [
      "Kliknij sąsiednie wolne pole, na które ma wpłynąć łódź."
    ]
  },
  "cooking": {
    "scenario": "Przygotuj trzy świąteczne porcje według kolejnych przepisów, używając zapasów należących do scenariusza.",
    "rules": [
      "Kliknięcie składnika dodaje jedną jednostkę do garnka.",
      "W garnku mieszczą się najwyżej trzy jednostki.",
      "Przycisk przygotowania porównuje skład z bieżącym przepisem i po każdej próbie opróżnia garnek.",
      "Tylko poprawna porcja zwiększa licznik podanych dań; błędna nie przechodzi do następnego przepisu.",
      "Składniki tej zagadki nie zużywają rzeczywistych zasobów wyspy."
    ],
    "controls": [
      "Dodawaj wskazane składniki.",
      "Użyj „Przygotuj porcję” albo „Opróżnij garnek”."
    ]
  },
  "gull": {
    "scenario": "Mewa zabrała klucz potrzebny do dalszej wyprawy. Ustaw odpowiednią przynętę, aby odciągnąć ją od zguby.",
    "rules": [
      "Przeczytaj, jaki pokarm wybiera mewa.",
      "Wybierz miejsce z właściwym jedzeniem, wysokością 2 i bezpieczne od krabów.",
      "Samo wskazanie przynęty nie kończy zadania: po poprawnym wyborze trzeba jeszcze zabrać klucz."
    ],
    "controls": [
      "Wskaż jedno z czterech miejsc.",
      "Naciśnij „Zabierz klucz”."
    ]
  },
  "hiddenObjects": {
    "scenario": "Latarnik zgubił okulary. Wskazówka opisuje miejsce ukrycia kolorem i symbolem; trzeba je najpierw obejrzeć.",
    "rules": [
      "Oglądaj miejsca, aby odsłaniać ich kolor i symbol.",
      "Do właściwego miejsca muszą pasować obie cechy, nie tylko kolor albo sam znak.",
      "Potwierdzić można wyłącznie miejsce już obejrzane."
    ],
    "controls": [
      "Dotknij zakrytego pola, aby je obejrzeć.",
      "Wybierz przycisk „Tu są okulary?” odpowiadający właściwemu obejrzanemu polu."
    ]
  },
  "magnets": {
    "scenario": "Wewnątrz wraku kapsuła musi przejść przez magnetyczny zamek. Zrównoważ siły trzech magnesów.",
    "rules": [
      "Odwrócenie magnesu zmienia znak jego siły.",
      "Wypadkowa jest sumą sił ze znakami; legalny impuls ma wartość +1 lub −1.",
      "W kierunku celu potrzebna jest wypadkowa +1. Zbyt silny impuls albo ruch poza tor jest odrzucany."
    ],
    "controls": [
      "Klikaj magnesy, aby zmieniać ich bieguny.",
      "Naciśnij „Wyślij impuls”, aby przesunąć kapsułę."
    ]
  }
};
const EN = {
  'puzzle:signal-line': ['Restore the keeper’s signal by tracing the complete network.', ['Start at an anchor-marked port. Hold the pointer or finger down and follow connected nodes.', 'Use every wire once; a node may be visited again through a different wire.', 'Release only when the complete route is drawn. Clear the trace to try another route.'], ['The route must be one continuous stroke. Starting away from an anchor or reusing a wire is not allowed.']],
  'puzzle:harbor-routes': ['The harbor is crowded. Send the convoys out in an order that clears their exits.', ['Follow a convoy’s arrow all the way to the edge of the board.', 'Click or tap that convoy only when no other convoy blocks this straight exit.', 'Keep clearing exits until every convoy has left.'], ['Convoys cannot be rotated. A convoy that has left cannot be selected again.']],
  'puzzle:gull': ['A gull is guarding the key. Choose the right bait to lure it away.', ['Read which food the gull wants.', 'Choose the place with that food and the descriptions “high” and “no crabs” together.', 'Select that place, then press “Recover the key”.'], ['All three bait requirements must match. Choosing the bait alone does not finish the puzzle; recover the key with its separate button.']],
  'puzzle:crabs': ['Help the crab remember a safe route across the shore.', ['Study the marked safe route before moving.', 'Start the crossing when you are ready.', 'Choose the next adjacent safe cell until the crab reaches its shell.'], ['A wrong step returns the crab to its starting point.']],
  'puzzle:hiddenObjects': ['The keeper has lost his glasses. Use the clue to identify their hiding place.', ['Read both parts of the clue: its color and symbol.', 'Compare the visible markings and inspect the place matching both features.', 'Confirm that inspected place with its choice button.'], ['A place matching only the color or only the symbol is not the right hiding place.']],
  'puzzle:parrot': ['The captain’s parrot has mixed up a message. Rebuild its words.', ['Read the clue for the current word.', 'Choose the letters in the correct order.', 'Complete every word in the message.'], ['Use the available letters to reconstruct the word.']],
  'puzzle:packing': ['Fit all rescue equipment into the kit.', ['Choose an equipment piece.', 'Rotate the selected piece if necessary.', 'Click its top-left destination cell, or remove it and try another position.'], ['Every part of a piece must fit inside the grid without overlapping another piece.']],
  'puzzle:untangle': ['The mooring ropes have become tangled between their attachment points. Swap points until no ropes cross.', ['Below the drawing, click the button showing an attachment point’s symbol.', 'Then click “Swap with…” beside the second point’s symbol.', 'Watch the ropes move with the points and continue until all crossings disappear.'], ['Swapping moves the two attachment points and every rope connected to them.']],
  'puzzle:navigation': ['Guide the boat through fog and hidden reefs to the port.', ['Study the safe passage and any route clues.', 'Click a neighboring cell above, below, left or right.', 'Reach the port within the available steps.'], ['A wrong step onto a reef resets the crossing. Diagonal moves are not allowed.']],
  'puzzle:scheduling': ['Arrange unloading times so every ship can use its required quay.', ['Read each ship’s quay, permitted start times and unloading duration.', 'Select a ship card.', 'Select a destination labeled with a quay and start time.', 'Check every ship; two ships at the same quay must have non-overlapping unloading intervals.'], ['Different quays can unload ships at the same time. For example, a ship starting at 2 for two hours occupies [2,4).']],
  'puzzle:gears': ['Restore the Lighthouse drive by setting all three gear stages.', ['Use the multiplier buttons for the first, second and third gear.', 'Use a gear’s direction button to reverse that gear.', 'Compare the displayed overall speed and direction with the target.'], ['Click the controls; no dragging is needed. Overall speed multiplies the three ratios. An odd number of reversed gears reverses the overall direction.']],
  'puzzle:optics': ['Guide the light beam from the left-hand source into the gold receiver.', ['Locate the light source and the gold receiver.', 'Click a mirror to switch it between / and \\.', 'Follow the beam and adjust the next mirror until the receiver lights up.'], ['Only mirrors rotate. A beam leaving the grid or looping without reaching the receiver does not solve the puzzle.']],
  'puzzle:tides': ['Move the water between the locks until every chamber reaches its marked target.', ['Compare each chamber’s current amount, capacity and target.', 'Press 1→2, 2→1, 2→3 or 3→2 to move one unit of water.', 'Continue until all three current amounts match their targets at the same time.'], ['Water can move only between neighboring chambers. The source needs water and the destination needs free space.']],
  'puzzle:hotel': ['Find a suitable room for every group of castaways.', ['Read each group’s needs and the rooms’ features.', 'Select a group of guests, then select a suitable room.', 'Check that every assigned room meets all of its group’s requirements.'], ['Choosing an occupied room exchanges the two groups: the group already there moves into the selected group’s former room.']],
  'puzzle:magnets': ['Move the capsule one safe step at a time until it reaches the lock.', ['Click a magnet to reverse its pole.', 'Watch the displayed push direction and strength.', 'When it shows one step toward the goal, press “Send pulse”. Repeat until the capsule arrives.'], ['A push that is too strong or points outside the track is rejected. Reversing a magnet changes whether it pushes or pulls.']],
  'puzzle:paperFold': ['Fold the shipwright’s plan until all its windows reveal the target message.', ['Read the target message above the plan.', 'Click a corner/window to switch that corner between folded and unfolded.', 'Compare every window’s visible symbol with the target in the same position.'], ['Clicking changes one corner at a time; no dragging is required. You can switch a corner back by clicking it again.']],
  'puzzle:invention': ['Build a tool that can retrieve the object from the well.', ['Read the reach, grip and lifting requirements.', 'Select the parts that can work together; select a part again to remove it.', 'Press “Test invention” once the tool is complete.'], ['Every required function and stated constraint must be satisfied together.']],
  'puzzle:photo': ['Adjust the camera until all landscape marks align with their gold outlines.', ['Use horizontal −/+ to move the picture sideways.', 'Use vertical −/+ to move it up or down.', 'Use zoom −/+ to change the spacing between the marks.', 'Align all three marks, not just the central one.'], ['Each press changes the chosen setting by one step.']],
  'puzzle:deduction': ['Use the harbor evidence to restore the correct parcel deliveries.', ['Read all the clues, including the exclusions.', 'Select a parcel, then select its destination.', 'Assign every parcel; each destination receives exactly one.'], ['Selecting an occupied destination swaps its parcel with the selected parcel.']],
  'puzzle:cooking': ['Prepare the feast by following the guests’ recipes.', ['Read the current recipe and any guest restrictions.', 'Click ingredients to add the required amounts to the pot.', 'Set the required temperature with its buttons.', 'Press “Prepare portion” to check the dish, or empty the pot and start again.'], ['A wrong dish does not advance the recipe. Puzzle ingredients do not use the island’s real supplies.']],
  'puzzle:signalsDecode': ['Read the buoy legend and send the decoded message.', ['Look up each message symbol in the current legend.', 'Press its corresponding number in the message’s order.', 'Complete the entire sequence.'], ['A wrong number clears the current answer. The legend may change in a new attempt.']],
  'puzzle:balance': ['Open both catches by loading the two scales correctly.', ['Read the required total on each scale.', 'Select a weight, then select its scale.', 'Use every weight and make both totals match their targets.'], ['The total weight matters, not the number of pieces on a scale. Weights can be moved again.']],
  'puzzle:memoryTriples': ['Recover journal fragments by finding sets of three matching symbols.', ['Reveal covered cards one at a time.', 'Remember their positions and reveal three identical symbols together.', 'Match every card on the board.'], ['A mismatched triple turns face down again after a short delay. At higher difficulty, covered unmatched cards are periodically shuffled.']],
  'puzzle:marbleMaze': ['Tilt the board to bring every marble to an empty goal.', ['Move the pointer over the board or use the arrow keys; on a phone use touch controls.', 'Use small tilts to move around walls.', 'Counter-steer to slow down and settle a marble into a goal.'], ['Marbles keep moving after the direction changes. Each marble needs its own goal.']],
  'adventure:cargoRain': ['A transport plane is dropping its cargo. Recover it before it falls into the sea.', ['Click or tap the falling coins and materials.', 'Catch as much as you can before the 45-second flight ends.'], ['Each piece can be caught once. You keep the cargo you actually catch.']],
  'adventure:treasureMap': ['Recover the old map, put it together and follow its clue to the treasure.', ['Collect four different map fragments by matching triples in the expedition.', 'Select two map pieces to swap them into the right places.', 'Read the completed map’s clue and choose the matching island building.'], ['A completed triples board alone does not finish the treasure hunt.']],
  'adventure:pirateCannon': ['Drive the pirate boats away with the harbor cannon.', ['Earn ammunition by completing a marble-maze round.', 'Point at the sea to aim ahead of a moving boat.', 'Press “Fire” to launch a shot. Hit every pirate boat.'], ['Aiming does not fire. Each shot uses one cannonball.']],
  'adventure:bridge': ['Build a safe bridge so the islanders can cross.', ['Select two allowed nearby support points to add a beam.', 'Select the same pair again to remove the beam and recover it.', 'Build a continuous deck with bracing, then press “Test bridge”.'], ['The starting beams are enough. Triangular braces strengthen the bridge; a line of deck beams alone is unstable.']],
  'adventure:signals': ['Watch the Lighthouse signal and repeat it.', ['Watch the entire light sequence.', 'Press the four light buttons in the same order.', 'Use the replay button if you need to see the sequence again.'], ['A wrong light resets the answer and replays the signal.']],
  'adventure:letters': ['Find the intended island recipient for each letter.', ['Select a letter and read its clue.', 'Select the building where its recipient works.', 'Deliver all three letters.'], ['A letter must be read before it can be delivered. An incorrect delivery can be corrected.']],
  'adventure:rhythm': ['Find the instruments and repeat the island rhythm.', ['Find the drum at the Warehouse, flute at the Farm and bell at the Lighthouse.', 'Watch and listen to the rhythm.', 'Repeat the instruments in order with the same spacing between beats.'], ['A wrong instrument or timing starts the listening stage again.']],
  'adventure:garden': ['Bring water from the source to every marked pond.', ['Click a gutter tile to turn it a quarter-turn.', 'Match touching outlets between neighboring tiles.', 'Connect the western inlet through the network to all three ponds.'], ['Water crosses a tile boundary only when both touching openings agree.']],
  'adventure:cargoBalance': ['Balance the cargo and choose a safe route for the ship.', ['Select a crate and a place on the deck.', 'Arrange all four crates so the displayed balance reaches zero.', 'Test the load, then choose the sheltered bay.'], ['Choosing an occupied place swaps the crates. Equal masses at equal distances on opposite sides balance each other.']],
  'expedition:tilt': ['Guide the marbles through the maze to earn the next expedition prize.', ['Use the pointer or arrow keys on a computer, or touch controls on a phone.', 'Tilt gently around the walls and counter-steer to slow down near a goal.', 'After a win, cash out the pot or choose the next round.'], ['Each marble needs its own goal. A later lost round puts the unclaimed pot at risk.']],
  'expedition:triples': ['Find matching triples to earn the next expedition prize.', ['Reveal covered cards one at a time.', 'Reveal three identical symbols together and clear the whole board.', 'After a win, cash out the pot or choose the next round.'], ['Mismatched cards turn face down again. A later lost round puts the unclaimed pot at risk.']]
};

function identity(subject) {
  if (subject?.type && subject?.id) return { type: subject.type, id: subject.id };
  if (subject?.data?.puzzle?.kind) return { type: 'puzzle', id: subject.data.puzzle.kind };
  if (subject?.kind === 'escapeStory' || subject?.storyId) return { type: 'story', id: subject.storyId || subject.data?.story?.storyId };
  if (subject?.kind === 'islandPuzzle' || subject?.puzzleKind) return { type: 'puzzle', id: subject.puzzleKind };
  if (subject?.miniGame?.kind) return { type: 'expedition', id: subject.miniGame.kind };
  const id = typeof subject === 'string' ? subject : subject?.kind;
  if (['tilt', 'triples'].includes(id)) return { type: 'expedition', id };
  if (ISLAND_PUZZLE_CATALOG.some(row => row.id === id)) return { type: 'puzzle', id };
  return { type: 'adventure', id };
}

export function getMiniGameInstructionContent(subject, language = 'pl') {
  const { type, id } = identity(subject), lang = language === 'en' ? 'en' : 'pl';
  const choose = value => typeof value === 'string' ? value : value?.[lang] || value?.pl || '';
  const spec = (type === 'puzzle' ? ISLAND_PUZZLE_CATALOG : type === 'story' ? STORY_CATALOG : ADVENTURE_CATALOG).find(row => (row.id || row.kind) === id);
  if (type === 'story' && spec) return { id: `${type}:${id}`, type, title: choose(spec.title), scenario: choose(spec.intro),
    objective: lang === 'en' ? `Complete all ${spec.mechanics.length} rooms to finish the story.` : `Rozwiąż wszystkie ${spec.mechanics.length} pomieszczeń, aby ukończyć opowieść.`,
    steps: lang === 'en' ? ['Read the current room’s goal and controls.', 'Start that room when you are ready, then solve its puzzle.', 'Confirm the next room after solving this one. Continue until the story’s finale.'] : ['Przeczytaj cel i sterowanie bieżącego pomieszczenia.', 'Rozpocznij etap, gdy będziesz gotowy, i rozwiąż jego zagadkę.', 'Po rozwiązaniu potwierdź przejście do następnego pomieszczenia. Kontynuuj do finału opowieści.'],
    rules: lang === 'en' ? ['Completed rooms and their clues are kept. Each new room has its own instructions before the timer starts.'] : ['Ukończone pomieszczenia i zdobyte wskazówki pozostają zachowane. Każde nowe pomieszczenie ma własną instrukcję przed uruchomieniem zegara.'] };
  const legacy = subject?.data?.puzzle && subject.data.puzzle.generatorVersion !== 2;
  const legacyEnglish = {
    gull: ['Lure the gull away from the key.', ['Read which food the gull wants.', 'Choose the place showing that food, height2 and a safe-from-crabs checkmark.', 'Press “Recover the key”.'], ['All three bait requirements must match together.']],
    hiddenObjects: ['Find the keeper’s glasses using both clues.', ['Read the required color and symbol.', 'Inspect a covered place.', 'Confirm the inspected place that matches both clues.'], ['Matching only one clue does not find the glasses.']],
    magnets: ['Use the magnets to move the capsule to the lock.', ['Reverse the magnets until the displayed total is +1.', 'Send a pulse to move one cell toward the lock.', 'Continue until the capsule reaches the goal.'], ['A push that is too strong or points outside the track is rejected.']],
    crabs: ['Three crabs need to cross the shore to their shells.', ['Select a crab from the list.', 'Click its neighboring free cell above, below, left or right.', 'Go around stones within that crab’s two-row zone. Repeat for every crab.'], ['Crabs cannot enter another crab’s zone, a stone or an occupied cell.']],
    parrot: ['The parrot reads the captain’s message backwards. Restore its words.', ['Read each reversed word in the clue.', 'Choose its correct name from the word buttons.', 'Enter every word in the displayed order.'], ['A wrong word clears the current answer.']],
    untangle: ['The ropes have crossed between the left-hand and right-hand attachments.', ['Select a left-hand rope attachment.', 'Select its new right-hand attachment.', 'Continue until no ropes cross.'], ['Selecting an occupied right-hand attachment swaps the ropes’ right-hand ends.']],
    navigation: ['Guide the boat around the visible reefs to the port.', ['Click a free neighboring cell above, below, left or right.', 'Reach the port within the remaining steps.'], ['Reef cells and diagonal moves are not allowed. Every move uses a step.']],
    cooking: ['Prepare the three feast portions from the displayed recipes.', ['Read the current recipe.', 'Click ingredients to add the required three units to the pot.', 'Press “Prepare portion”, or empty the pot and try again.'], ['A wrong dish does not advance the recipe. Puzzle ingredients do not use island supplies.']]
  };
  const key = `${type}:${id}`, pl = legacy && LEGACY_PL[id] || PL[key], en = legacy && legacyEnglish[id] || EN[key];
  if (!pl || !en) throw new TypeError('Unknown mini-game instructions: ' + key);
  const expedition = type === 'expedition';
  const title = expedition ? id === 'tilt' ? lang === 'en' ? 'Marble expedition' : 'Wyprawa z kulką' : lang === 'en' ? 'Matching triples expedition' : 'Wyprawa z trójkami' : choose(spec?.title);
  const objective = expedition ? id === 'tilt' ? lang === 'en' ? 'Bring every marble to its goal before time runs out.' : 'Doprowadź wszystkie kulki do celów przed końcem czasu.' : lang === 'en' ? 'Match all sets of three symbols before time runs out.' : 'Dopasuj wszystkie trójki symboli przed końcem czasu.' : choose(spec?.description);
  return { id: key, type, title, objective: legacy && id === 'crabs' ? lang === 'en' ? 'Guide all three crabs to their shells.' : 'Doprowadź wszystkie trzy kraby do ich muszli.' : legacy && id === 'parrot' ? lang === 'en' ? 'Decode the reversed words in the correct order.' : 'Odczytaj odwrócone słowa we właściwej kolejności.' : objective, scenario: lang === 'en' ? en[0] : pl.scenario,
    steps: [...(lang === 'en' ? en[1] : pl.controls)], rules: [...(lang === 'en' ? en[2] : pl.rules)] };
}

export function miniGameInstructionSubjects() {
  return [...ISLAND_PUZZLE_CATALOG.map(row => ({ type: 'puzzle', id: row.id })),
    ...STORY_CATALOG.map(row => ({ type: 'story', id: row.id })),
    ...ADVENTURE_CATALOG.map(row => ({ type: 'adventure', id: row.kind })),
    ...['tilt', 'triples'].map(id => ({ type: 'expedition', id }))];
}

function node(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}
export function createMiniGameInstructions({ subject, language = 'pl', onStart, onBack, compact = false, startLabel } = {}) {
  const lang = language === 'en' ? 'en' : 'pl', t = (pl, en) => lang === 'en' ? en : pl;
  const copy = getMiniGameInstructionContent(subject, lang);
  if (!document.querySelector('[data-minigame-instructions-css]')) {
    const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = new URL('./harborlight-v1-minigame-instructions.css?v=frontend-v32-24', import.meta.url).href;
    style.dataset.minigameInstructionsCss = ''; document.head.append(style);
  }
  const root = node(compact ? 'details' : 'section', 'minigame-instructions');
  root.dataset.minigameInstructions = copy.id; root.dataset.compact = String(compact); root.dataset.i18nIgnore = '';
  root.setAttribute('aria-label', t('Zasady i sterowanie: ', 'Rules and controls: ') + copy.title);
  root.append(node(compact ? 'summary' : 'h4', '', compact ? t('Zasady i sterowanie', 'Rules and controls') : copy.title));
  root.append(node('h5', '', t('Scenariusz', 'Scenario')), node('p', '', copy.scenario), node('h5', '', t('Twój cel', 'Your goal')), node('p', '', copy.objective), node('h5', '', t('Jak grać — krok po kroku', 'How to play — step by step')));
  const steps = node('ol'); for (const step of copy.steps) steps.append(node('li', '', step)); root.append(steps);
  const rules = node('ul'); for (const rule of copy.rules) rules.append(node('li', '', rule)); root.append(node('h5', '', t('O czym pamiętać', 'Keep in mind')), rules);
  if (!compact && onStart) {
    root.append(node('p', 'minigame-instructions-reading', t('Przeczytaj spokojnie. Zegar i ruch na planszy ruszą dopiero po kliknięciu „Rozpocznij grę”.', 'Take your time reading. The timer and board movement begin only after you press “Start game”.')));
    const actions = node('div', 'minigame-instructions-actions'), start = node('button', '', startLabel || t('Rozpocznij grę', 'Start game'));
    start.type = 'button'; start.dataset.minigameBegin = '';
    start.addEventListener('click', async () => {
      if (start.disabled) return;
      const dialogBody = root.closest('.dialog-body'), practiceBoard = root.closest('#board');
      start.disabled = true;
      try {
        const result = await onStart();
        if (result?.ok !== false) {
          if (dialogBody?.isConnected) dialogBody.scrollTop = 0;
          else if (practiceBoard?.isConnected) practiceBoard.scrollIntoView({ block: 'start' });
        }
      } finally { if (start.isConnected) start.disabled = false; }
    });
    actions.append(start);
    if (onBack) { const back = node('button', 'secondary', t('Wróć', 'Back')); back.type = 'button'; back.addEventListener('click', onBack); actions.append(back); }
    root.append(actions);
  }
  return root;
}
