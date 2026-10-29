# Sterowanie i zapis HARBORLIGHT — frontend v17

Bieżąca instrukcja opisuje [dziewięć poprawek v17](FRONTEND-V17-REQUIREMENTS.md) i zachowane zasady wcześniejszych wydań. Wymagania v17 nadpisują wybór gry i wskazane elementy interfejsu [manifestu v10](decisions-v10.json). [Excel 10](arkusze/HARBORLIGHT10-zasady.xlsx) pozostaje niezmienionym archiwum v16, z dawnym losowaniem minigry; końcowy odbiór, wysłanie kodu i publiczną publikację opisuje [dziennik](IMPLEMENTATION-LOG.md).

## Otwieranie gry

- [Dotychczasowa wyspa](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=frontend-v17).
- [Oddzielny profil nowego gracza](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v17): przy pierwszym otwarciu 12 osób, po 100 zasobów, Ratusz 1 i brak pracowników. Kolejne wejście zachowuje jego postęp; zmiana parametru wersji nie resetuje wyspy.
- [Rejestracja i logowanie](https://ksobczak321-oss.github.io/gra/harborlight-auth.html?v=frontend-v17): formularz rejestracji pozwala nazwać wyspę, lecz nadal nie tworzy prawdziwego konta ani połączenia OAuth. Nazwa należy do wybranego lokalnego profilu i pozostaje dosłowna w obu językach.

Sam odnośnik z wersją nie potwierdza publikacji. Potwierdzony stan Pages oraz ewentualne ograniczenia dostępu opisuje dziennik.

## Samouczek i nagrody

Samouczek ma **25 kolejnych lekcji**, bez czekania na pięć kolejnych dni. Otwiera się przy każdym wejściu aż do ukończenia albo wybrania „Nie pokazuj automatycznie”; można go wznowić ręcznie z zachowaniem postępu. Zwykłe zamknięcie lub powrót na wyspę odkłada naukę na później i nie usuwa dotychczasowych osiągnięć.

Początek prowadzi przez menu w lewym górnym rogu i przeczytanie zasad, mapę, przydzielenie producenta oraz tragarza, sprawdzenie jedzenia, zlecenie rozbudowy Ratusza i poprawę szczęścia. Dalej poznajesz dojście do pracy, oba magazyny, priorytety i dostawy, żywność, punkty Domu, indywidualne potrzeby, koszty i kolejkę, ścieżki, atrakcje, Kaplicę, Targ, Latarnię, zadania, ekspedycję oraz bezpieczne odwołanie pracownika. Mała karta wskazuje aktualny krok; lekcje czytania wymagają odwiedzenia wskazanego miejsca i potwierdzenia „Przeczytane”, a działania są zaliczane na podstawie rzeczywistych zmian w grze.

Przy kroku rozbudowy Ratusza jawny przycisk jednorazowo pokrywa braki do 500 monet i po 500 materiałów, z 600 żywności na budowę oraz posiłki. Zlecenie rozbudowy zalicza lekcję; transport i osobna faza budowania przebiegają dalej normalnie. Pomoc nie obniża wyższych zapasów i nie odnawia się po ponownym wejściu.

Każdy sukces ma fanfarę i skrzynię z osobno wylosowaną ilością **100–300 każdego z pięciu materiałów**, bez monet. Share daje jeszcze raz dokładnie te same zasoby, najwyżej raz; Skip zachowuje zwykłą nagrodę, a odłożoną decyzję można później otworzyć ponownie. Losowanie, odbiór i wybór są zapisane, nadwyżki bezpiecznie czekają na pojemność centrali, a dawne odebrane lekcje są zachowane w migracji bez ponownego wypłacania nagród.

Share w tym prototypie przyznaje premię za wybór przycisku, bez publikowania na Facebooku. Dźwięk respektuje ustawienia i wymaga odblokowania dźwięku rzeczywistą akcją gracza; wspierane telefony mogą krótko zawibrować. Wyłączenie animacji lub systemowe ograniczenie ruchu ogranicza efekty, ale nie zatrzymuje postępu ani zegarów.

## Nagłówek i dolny pasek

Lewy pasek nawigacji został usunięty. Górny pasek pokazuje własną nazwę wyspy, poziom, szczęście, monety i mieszkańców oraz faktycznie pracujących, czas do nowej osoby i Punkty. Funkcje są dostępne przez menu, karty i budynki, bez klikalnych pól plaży lub innych pól otoczenia.

Administracja obejmuje Ratusz, Dom, Magazyn, Targ, Port, Kaplicę i Latarnię; Gospodarka — Gospodarstwo, Młyn, Kamieniołom, Drwali i Tartak. Miniatury mają wspólny rozmiar i proporcje, u góry widnieje własny poziom, a miejsca pracy pokazują „Pracuje: n” oraz idących `(+n)` i odwołanych `(−n)`. Ratusz, Dom, Kaplica i Latarnia nie dostają fikcyjnej obsady.

Zasoby mają pięć materiałów: drewno, deski, kamień, zboże i żywność. Górny licznik pokazuje pracujących producenta, dolny — **lokalny / centralny (w przewozie)**, ze wszystkimi fizycznymi trasami materiału, także budowy, Targu i Portu. Strzałka ↑/↓/→ pokazuje produkcję minus zużycie całej wyspy; sam przewóz nie zmienia tego bilansu ani nie zwiększa zapasu dostępnego w centrali.

Dekoracje przełączają pasek na pięć ofert odnawianych o północy czasu polskiego. Oferta obejmuje losowe 1–50% populacji, kosztuje według rzeczywistej sumy przyznawanych punktów szczęścia i działa sześć godzin; kolejna atrakcja czeka na koniec poprzedniej. Ścieżki pokazują pięć poziomów i postęp odcinków, a zakup ma krótkie potwierdzenie wizualne zgodne z ustawieniami.

## Panele, efekty i powiadomienia

Główny panel budynku mieści najważniejsze dane oraz działania na jednym ekranie komputera; górne krawędzie lewej kolumny statystyk i prawej kolumny rozbudowy są równe. Dalsze funkcje mają osobny widok z powrotem, a dolne przyciski menu wyspy mieszczą się wewnątrz ramki z odstępem od jej krawędzi. Krótki opis wyjaśnia funkcję obiektu, strzałka przywraca poprzednie menu, a X zamyka okno. Latarnia na poziomie 0 ma stan Ruiny, a osiągnięte poziomy 1–100 własne nazwy.

Producent pokazuje produkt, ilość i ETA najbliższej gotowej sztuki. Magazyn ma podpisane zapas / pojemność teraz / pojemność po rozbudowie, a Pracownicy — przydzieleni / wolni w domu / limit, z małymi +/−. Nie pokazujemy podatków, choć silnik nadal je nalicza.

Bazowa produkcja wynosi 20/24/26/28… na osobę i godzinę, a bazowy ładunek tragarza 120 na poziomie 1 przy pięciominutowym kursie. Poziomy, drogi, głód i wcześniejsze premie nadal stosują własne mnożniki. Podwojenie bazy nie podwoiło podatku ani zapotrzebowania mieszkańców na jedzenie.

Ratusz skupia zarządzanie kolejką i budową, a Dom mieszkańców i zbiorcze przydziały. Każdy efekt ma wiersz z nazwą, wartością, czasem lub statusem i przyciskiem i rozwijającym źródło, odbiorców oraz warunek końca. Powiadomienia obejmują rozpoczęcie, istotną zmianę i koniec efektu oraz przyczynę przestoju, bez nowego wpisu co sekundę. Nad producentem z aktywną karą za brak wejścia lub pełny magazyn lokalny widać smutną buźkę; po ustaniu kary oznaczenie znika.

Magazyn pokazuje tragarza, jego ładunek, trasę i ETA. Po zmniejszeniu obsady wyraźny popup objaśnia wycofanie, a licznik od razu pokazuje planowaną zmianę, np. `5 (−2)`: odwołany z ładunkiem kończy dostawę, potem wraca pięć minut do domu i dopiero jest wolny. Maksymalnie trzy priorytety materiałów lub Budowy są numerowane i podświetlone; kategorie powiadomień można filtrować bez usuwania historii.

## Zadania i ukończenie

Przyjęcie nieodwołalnego zadania otwiera potwierdzenie na 60 sekund. Otwarcie utrwala mnożnik szybkiego kliknięcia, lecz oferta musi być ważna również przy potwierdzeniu. Aktywne jest jedno zadanie, a pozostałe pozwalają obejrzeć wymagania bez rozpoczęcia i wpłat.

Darowizny trafiają z magazynu centralnego i mogą być przekazywane w ratach, z zachowaniem chronionej rezerwy żywności. Wpłaty są bezzwrotne i przepadają po końcu terminu; pierwsze oferty mają sześć godzin, a po pierwszym sukcesie następcy danego ciągu wygasają o północy czasu polskiego. Norma kosztów zadań pozostaje wcześniejsza mimo podwojenia produkcji.

Po sukcesie zadania są fajerwerki, próba wibracji i opcjonalne Share/Skip. Share zadania daje osobne 500 monet raz, a Skip zachowuje zwykłą nagrodę; nierozstrzygnięta propozycja pozostaje w powiadomieniach. Ten bonus różni się od podwajania materiałowej skrzyni samouczka i również nie publikuje posta na Facebooku.

## Dwie gry ekspedycji

Rozpoczynając ekspedycję gracz wybiera **labirynt z kulkami albo dopasowywanie trójek**. Wybór zostaje zapisany i jest domyślny przy kontynuacji; przed następną rundą można wskazać drugi rodzaj. Sukces dodaje do puli najwyżej 50 monet, pomniejszonych według czasu tej rundy; kontynuacja ryzykuje całą niewypłaconą pulę, a wypłata kończy serię. Upływ pełnego limitu oznacza przegraną i stratę całej niewypłaconej puli, bez dodatkowego czasu za monety.

Labirynt przechyla się kursorem lub myszą na komputerze, a na telefonie ruchem urządzenia po włączeniu sterowania; przy braku obsługi lub odmowie dostępu pozostaje sterowanie dotykiem. Kulki trzeba umieścić w otworach, z rzeczywistymi kolizjami ścian. Pierwsza runda trwa trzy minuty i daje pełne 50 monet przez pierwsze dwie, następnie odejmuje jedną monetę co 15 sekund, a po końcu plansza trzęsie się i kulki się rozsypują.

Dopasowywanie usuwa trzy identyczne odsłonięte czarno-białe obrazki i pozwala ponawiać próby bez limitu odkryć. Projektowa krzywa zaczyna od 24 pól i czterech minut, dodaje po sześć pól oraz 30 sekund na etap do 120 pól i maksymalnie 15 minut; od czwartego etapu zakryte, niedopasowane obrazki okresowo zmieniają miejsca. Odkryte i już dopasowane pola pozostają stabilne podczas przesunięcia, a całą planszę trzeba wyczyścić przed terminem. Wszystkie 24–120 kart dopasowują wielkość i kolumny do dostępnego okna bez suwaka i obcinania, również na telefonie.

Dla obu nowych gier pełna nagroda trwa przez pierwsze dwie trzecie limitu, a później maleje o jedną monetę co jedną dwunastą limitu. Użytkownik określił zakres trudności; konkretna krzywa rozmiarów, czasów i przesunięć jest jawnym doborem projektu zapisanym w manifeście. Wczytane starsze serie zachowują dawną planszę i rozliczenie do końca tej serii, a nowe starty używają już dwóch nowych gier.

Jedna seria zasłania i blokuje zarządzanie wyspą, podczas gdy gospodarka nadal działa. Po pięciu minutach bez rzeczywistej aktywności pojawia się pytanie z 60 sekundami na potwierdzenie; zegar działa także w tle i podczas pytania. W minigrze nie ma strzałki powrotu; opuszczenie próby i X nadal respektują potwierdzenie straty albo wypłaty. Przycisk „Obejrzyj reklamę” w prawej kolumnie pod wyjściem otwiera informację o przyszłej funkcji w obu grach. Dodatkowy czas, premia i limity pozostają do ustalenia, więc przycisk nie daje nagrody, nie zatrzymuje zegara i nie wywołuje sieci reklamowej.

## Lojalność, język i zapis

Kolejne dni logowania tworzą serię, dzień przerwy ją resetuje, a granicą dnia jest północ Europe/Warsaw. Wprowadzający program lojalnościowy kończy się po odebraniu dziesiątej nagrody albo przy Ratuszu 4; kwoty tych nagród nadal nie zostały ustalone. Skrzynie samouczka nie zastępują nieustalonych nagród lojalnościowych.

Rzeczywista akcja w widocznej aktywnej karcie odnawia premię produkcji na pięć minut, bez dodawania kolejnych czasów. Ustawienia pozwalają wybrać EN/PL, kategorie powiadomień, dźwięk i animacje oraz wznowić samouczek. Nie zawierają przycisku „Zaloguj się lub załóż konto”, który pozostaje częścią oddzielnych formularzy. Zapisany wybór animacji pozostaje zachowany, a po powrocie do widocznej karty świat wznawia rysowanie.

Stan i preferencje są lokalne w tej przeglądarce; dotychczasowy oraz nowy profil mają oddzielne klucze, a reset dotyczy tylko wybranego profilu. Nie jest to synchronizacja web/Android/iPhone, rzeczywista usługa kont, płatności ani serwerowe potwierdzanie udostępnień i poleceń. Bieżące zasady opisują [reguły gospodarki](ECONOMY-RULES.md) oraz [wymagania v17](FRONTEND-V17-REQUIREMENTS.md); [manifest v10](decisions-v10.json) i [Excel 10](arkusze/HARBORLIGHT10-zasady.xlsx) zachowują źródło wcześniejszego v16. Wyniki konkretnego wydania zawiera dziennik.
