# Reguły gospodarki HARBORLIGHT — wersja 9

Stan wydania **frontend-v13 / Excel 9**: implementacja i odbiór lokalny zakończone — **388/388 testów modelu PASS** oraz zaliczone testy interfejsu, nowego gracza, formularzy i animacji. Publikacja i sprawdzenie rzeczywistego Pages pozostają do potwierdzenia w [dzienniku](IMPLEMENTATION-LOG.md); lokalny wynik nie potwierdza publicznej wersji. Historyczne wyniki v12 są oddzielone od v13.

Źródłem bieżących reguł jest [manifest 58 decyzji i 19 wymagań frontendu](decisions-v9.json), zatwierdzony w rozmowie po Excelu 8. Nowsze rozstrzygnięcia zastępują wcześniejsze opisy. Pliki 7 i 8 zachowują identyczne bajty; ich źródła i wszystkie 48 komentarzy zachowano w ukrytym archiwum Excela 9.

## Jak działa gra

Każda mechanika ma najwyżej trzy zdania. Szczegóły wyjątków i pełne brzmienie decyzji są w manifeście; tabela nie wprowadza nowych pytań.

| Mechanika | Zasada | Źródło |
|---|---|---|
| Start | Zaczynasz z 12 osobami w domu, Ratuszem 1 i po 100 każdego z sześciu zasobów. Nie ma przydzielonych pracowników, a szczęście wynosi 0%. Oddzielny profil nowego gracza nie kasuje poprzedniej wyspy. | Start / oddzielny zapis |
| Poziom i mieszkanie | Poziom Ratusza jest poziomem gry i ogranicza ulepszanie innych budynków. Ratusz daje limit 24 mieszkańców na poziom, a Dom osobno zapewnia 24 łóżka na swój poziom. Brak łóżek zmniejsza szczęście wszystkich o 1 pp/h za każdą osobę bez miejsca. | Reguły V7/V8 zachowane |
| Przydział i podróż | Każde z ośmiu miejsc pracy ma limit 12 × własny poziom, ze wspólnej puli wolnych osób w domu. Do pracy i z powrotem idzie się po 5 minut. Po zwolnieniu osoba bez ładunku od razu rozpoczyna powrót. | V9-19 / F04 |
| Tragarz z ładunkiem | Odwołany tragarz najpierw kończy rozpoczętą dostawę i do tego czasu nadal pracuje. Nie bierze kolejnego kursu, potem wraca do domu przez 5 minut. Dopiero powrót czyni go dostępnym. | V9-19 |
| Produkcja | Poziomy 1, 2, 3, 4 dają na osobę 10, 12, 13, 14 sztuk/h, a dalej +1 sztukę/h na poziom. Każda osoba ma własny postęp gotowej sztuki. Zwolnienie kasuje jej niedokończoną sztukę. | V9-50 |
| Młyn i tartak | Młyn zużywa 2 zboża z centrali na 1 żywność, a tartak 2 drewna na 1 deskę. Surowiec schodzi dopiero przy ukończeniu produktu. Brak wejścia lub miejsca wstrzymuje postęp bez jego utraty. | V9-50 |
| Dwa magazyny | Gotowe produkty czekają lokalnie: pojemność wynosi 200 × własny poziom producenta. Dopiero tragarze zanoszą je do centrali, skąd można je wydawać i karmić ludzi. Monety są osobno w skarbcu. | V8 / V9-45 |
| Pojemność centrali | Magazyn 1 mieści 1000 każdego materiału i 4000 łącznie; oba limity rosną ×1,5 na poziom. 50 × poziom Magazynu pojemności łącznej jest zarezerwowane dla żywności. Materiały przypisane budowie nadal zajmują miejsce aż do odbioru przez tragarza. | V9-14,45 |
| Jedzenie | Każdy mieszkaniec zużywa 1 żywność/h, automatycznie i równomiernie z centrali. Jedna sztuka wystarcza 12 osobom na 5 minut. Po wyczerpaniu posiłku wszystkich dotyczy brak jedzenia. | V9-46 |
| Głód i ponowne karmienie | Brak jedzenia od razu zmniejsza wydajność do połowy; po 12 h nalicza −5 pp/h. Posiłek od razu zatrzymuje karę i przywraca wydajność. Dopiero pełna godzina nieprzerwanego karmienia zeruje wcześniejszy licznik głodu. | V9-1 |
| Szczęście | Każda osoba ma własne szczęście ograniczone do −100…100%, a wyspa pokazuje średnią. Jedzenie i rzeczywista praca dodają osobno +1 pp/h; brak pracy po 12 h daje −5 pp/h. Prezentacja zaokrągla w górę do pełnego procentu, lecz rachunek zachowuje ułamki. | V7/V8 + V9-1,2 |
| Nowy mieszkaniec | Nowa osoba przez pierwsze 24 h ma zamrożone 0% szczęścia. Nadal je i może pracować, ale liczniki głodu i bezrobocia zaczynają działać dopiero po tym czasie. Startowa dwunastka nie ma zamrożenia. | V9-2 |
| Przestój | Brak wejścia lub miejsca zatrzymuje produkcję i jej premię szczęścia za pracę. Kara wynosi −10 pp od początku, kolejne −10 co 24 h, maksymalnie −50 z tego składnika. Nie dodajemy za ten sam przestój drugiej kary bezrobocia. | V7 D14 / V9-50 |
| Przyrost i odejścia | Dokładna średnia szczęścia wyznacza tempo przyrostu albo odejść; minimum populacji to 6. Zachowujemy kolejność grup odejścia, a w wybranej grupie odchodzi najmniej szczęśliwy, z losowaniem remisów. Gdy wszyscy są chronieni, ubytek przepada i nie tworzy długu. | V9-48,49 |
| Punkty Domu | O północy Dom dostaje pulę pp równą aktualnej populacji, bez przenoszenia starej reszty. O 23:58 automat rozdaje niewykorzystane punkty najmniej szczęśliwym uprawnionym osobom. Punkty nie usuwają kar ani ich liczników. | V9-57 |
| Kaplica | Ulepszenie daje +10 × nowy poziom pp na 10 h; kolejna rozbudowa zastępuje poprzedni efekt pełnym nowym czasem. Ręczne błogosławieństwo daje +50 każdego zasobu i +20 pp na godzinę, bez nakładania dwóch ręcznych efektów. Darmowe użycia zależą od poziomu; płatne kosztuje 100 × poziom i ma 4 h blokady od końca poprzedniego płatnego efektu. | V9-4,56; mechaniczne podatki w szczegółach |
| Darmowe błogosławieństwo | Darmowego użycia można dokonać podczas blokady płatnego, jeżeli inne błogosławieństwo już nie trwa. Darmowe użycie nie przesuwa terminu następnego płatnego. Błogosławieństwa pozostają odrębne od nieustalonej aktywności modlitewnej. | V9-56 |
| Latarnia | Ulepszenie daje wymuszone 100% szczęścia i produkcję ×2 przez 24 h × osiągnięty poziom. Każdy efekt ma własny zegar, a nakładające się wymuszenia 100% korzystają z jednego zapisanego stanu sprzed pierwszego. Stan wraca po końcu ostatniego wymuszenia, z nadal aktywnymi dodatkami i karami. | V9-3,4 |
| Zwiedzanie latarni | Wizyta trwa 4 h bez dojścia i wycofania; jednocześnie są 2 × poziom latarni miejsca. Po powrocie uczestnik ma 100% H i blokadę wizyty na 24 h, a jego grupa daje +10 pp populacji na 6 h. Pula darmowych wejść 2L działa w ruchomych 24 h, a trzy dodatkowe pakiety według zatwierdzonego cennika. | V7 D01–D02 + V9-3 |
| Atrakcje | O północy pojawia się 5 ofert z katalogu 20 dekoracji i wydarzeń. Atrakcja daje Y pp na 6 h osobom o najniższym uprawnionym H, najwyżej tylu, jaki jest poziom Ratusza; cena wynosi Y × faktyczna liczba odbiorców. Y jest losową liczbą całkowitą 5–100, a brak odbiorców blokuje zakup. | V9-5,6,8 |
| Przyzwyczajanie | Każdy rodzaj atrakcji ma osobny ciąg skuteczności: 100%, 75%, 50%, 25%, 0%. Po 24 h bez zakupu tego rodzaju wraca pełna skuteczność, a przy 0% nie pobieramy opłaty. Każdy zakup ma własne 6 h, a efekty sumują się przed ograniczeniem H. | V9-7,8 + V8 |
| Ścieżki | Jest 100 odcinków na poziomach 0–5; jedno ulepszenie kosztuje 100 kamienia i działa po kliknięciu. Kolejny poziom wolno zacząć po ukończeniu wszystkich 100 odcinków poprzedniego. Pełne poziomy dają +10…50% szybkości tragarzy, a poziomy 3/4/5 również +10/20/30% ładunku. | V8 + F10 |
| Kursy i priorytety | Bazowy pełny kurs trwa 5 min i zabiera jeden rodzaj, do 60 sztuk na poziomie miejsca pracy 1. Trzy trwałe priorytety towarów/Construction dzielą kursy 8+2 losowe, 5+3+2 losowe albo 5/3/2, z ochroną ratunkowej żywności. Construction wysyła najpierw wszystkie ładunki najstarszej aktywnej budowy, a potem następnej. | V9-20 + V8 |
| Rozbudowa | Ratusz L daje L aktywnych budów i L miejsc kolejki; kolejka kosztuje +10% każdego składnika. T biegnie od pierwszego odbioru materiałów do ostatniej dostawy, także przez przerwy; obsada zmienia ETA i daje powiadomienie. Sama budowa trwa T, latarnia 4T, kaplica 3T × (nowy poziom−1). | V9-9,45 |
| Plany i anulowanie | Pakiet 1000 × poziom Ratusza/24 h daje +4 budowy, dowolną kolejkę i planowanie braków za 25% ich bazowej wartości portowej po +10% kolejki. Dostępne materiały przypisujemy planom FIFO, bez podwójnego zastawiania. Anulować wolno przed pierwszym przewozem/budową, ze zwrotem rzeczywistych rezerwacji, lecz bez opłaty prognozy. | V9-11,12 |
| Nagrody i zwroty | Materiały wypełniają centralę zgodnie z limitami i przestrzenią żywności. Nadwyżka czeka bezterminowo i wchodzi automatycznie bez tragarzy. Przed przyjęciem nadwyżki nie można wydać. | V9-13,14,44 |
| Przyspieszanie za monety | Skrócenie 25/50/75/100% budowania kosztuje 1 monetę za pełną minutę oszczędności, minimum 5 monet. Natychmiastowy przewóz kosztuje 10 monet za każdy potrzebny kurs, także niepełny, i dotyczy tylko wybranego etapu. Budowanie i dostawa są osobnymi usługami. | V9-15,54 |
| Premium dowóz budowy | Dostawa Premium przywozi brakujące materiały od razu i zamraża budowanie według minionego T oraz normalnej estymaty reszty. Bez magazynierów przyjmujemy w kalkulacji jednego hipotetycznego tragarza z obecnymi parametrami. Sama faza budowania nie znika i może być skrócona oddzielnie. | V9-54,55 |
| Pełne kupno budynku | Kompletny budynek kosztuje portową wartość wszystkich materiałów ×1,25, nominalne monety i potrzebne kursy Premium. Jest gotowy po 10 s w osobnej usłudze, poza zwykłą kolejką i bez pobrania własnych materiałów. Obowiązują limit Ratusza i kolejność poziomów tego samego budynku. | V9-10 |
| Targ | Od Ratusza 2 wymieniasz pełne dziesiątki tylko w grupie drewno/kamień/zboże albo deski/żywność: 10 daje 9. Dostawa jest zablokowana 1 h; fizyczna partia ma ważność 24 h, a wynik wymiany dostaje nowy termin. Wymiana działa bez obsady, lecz to własna załoga nosi towary w obie strony. | V9-51,52,53 |
| Port | Od Ratusza 4 handlujesz paczkami 100: podstawowe sprzedaż/kupno 40/50, przetworzone 140/150 monet. Każda kolejna paczka kupna podnosi cenę liniowo o 10% bazowej ceny, osobno dla towaru w ruchomych 3 h. Cena zamraża się przy transakcji, a monety za sprzedaż przychodzą przy wypłynięciu. | V7 D16 |
| Ważność towaru | Każda fizyczna partia targowa i portowa ma 24 h od przybycia. Faktyczne podjęcie ładunku przed terminem chroni rozpoczęty kurs. Samo zlecenie odbioru nie chroni towaru pozostawionego na miejscu. | V9-52 |
| Zadania latarni | Są 3 oferty, ale tylko 1 aktywne zadanie i nie można go porzucić. Potwierdzenie ma 60 s; mnożnik utrwala otwarcie okna: ×3 przed 15 s, ×2 przed 5 min, później ×1. Oferta musi nadal być ważna przy potwierdzeniu, a zamknięcie usuwa szkic. | V9-16,17 |
| Darowizny i terminy | Towary przekazujesz w nieodwracalnych ratach bez tragarzy z centrali, zachowując rezerwę jedzenia. Pierwsze zadania trwają 6 h; po pierwszym sukcesie w ciągu następcy mają termin o północy, nawet gdy pojawiają się wcześniej po kolejnym sukcesie. Norma kosztów i skalowanie nagród z poziomu 3 pozostają zachowane. | V9-47 + V8 |
| Ukończenie i Share | Sukces zadania przyznaje nagrodę, pokazuje fajerwerki i krótką wibrację obsługiwanego telefonu. Share daje osobne 500 monet raz, a Skip zachowuje normalną nagrodę. Nierozstrzygnięta propozycja pozostaje bezterminowo w powiadomieniach, bez rzeczywistej integracji Facebook. | V9-18 |
| Pula ekspedycji | Nowa bezpłatna seria zaczyna od pustej puli; każda terminowa wygrana dodaje 50 monet. Dalej ryzykujesz całą niewypłaconą pulę, a przegrana ją zeruje. Wypłata kończy serię; wcześniej wypłaconych monet nie tracisz. | V9-21,22,23,31,58 |
| Zegar ekspedycji | Zegar działa także w tle i podczas pytania o obecność; po limicie potencjalna pula maleje o 10 monet za pełną sekundę spóźnienia. Po 5 min bez aktywności jest pytanie i 60 s na odpowiedź, po czym seria przegrywa. Jedna seria blokuje wyspę do wypłaty albo przegranej; dokładne plansze i czasy to parametry projektu. | V9-24…30,58 |
| Premie społecznościowe | Docelowo pierwsza publikacja daje 1000 monet raz, awans od Ratusza 2 daje 500 raz na poziom, a każda trzecia kwalifikowana publikacja 1000. Liczymy najwyżej jeden wpis dziennie ze wszystkich platform, a spełnione premie mogą się sumować. W grze są reguły i sprawdzone punkty integracji, bez prawdziwego potwierdzania zewnętrznych publikacji. | V9-37…41 |
| Polecenia | Nowe konto z indywidualnego linku ma jednego stałego polecającego, który dostaje 1000 monet po pierwszym logowaniu. Trzy aktywne dni w ciągu 30 dni od rejestracji dają polecającemu po 500 pięciu materiałów, bez monet w tej drugiej premii. Prawdziwe konta i potwierdzenia wymagają backendu. | V9-33,42,43 |
| Lojalność | Liczymy kolejne dni logowania, a przerwa rozpoczyna serię od początku. Program kończy się przy Ratuszu 4 albo po odebraniu dziesiątej dziennej nagrody. Wartości nagród nie zostały ustalone, więc nie przyznajemy fikcyjnych kwot. | V9-35,36 |
| Samouczek | 25 mikrozadań pojawia się po 5 w pierwszych 5 aktywnych dniach gry; postęp i odbiór nagród są trwałe. Uczą obsady, jedzenia, przewozu, szczęścia, budów i pozostałych podstaw. Kwoty dobrano projektowo: łącznie 1000 monet i 400 materiałów, niezależnie od nieustalonej lojalności. | F07 / jawny dobór projektowy |
| Aktywna gra | Rzeczywista akcja w widocznej aktywnej karcie odnawia bonus produkcji i podatków ×2 na 5 minut. Czas się nie sumuje; z latarnią produkcja może wynosić ×4, z kaplicą podatki ×4. Bonus nie przyspiesza transportu, a informacje podatkowe pozostają ukryte w interfejsie. | F08 / jawne założenie przed GO |
| Kupno osoby | Osoba kosztuje 500 × obecny poziom Ratusza każdego z sześciu zasobów, jak najbliższa rozbudowa Ratusza. Potrzebne są wolne łóżko i miejsce w limicie ratusza, a osoba zaczyna z zasadami pierwszych 24 h. Tę cenę oznaczamy jako ogłoszone założenie wdrożeniowe, nie historyczną cenę ustaloną w V7. | F16 / jawne założenie przed GO |
| Punkty i zasoby | Punkty to migawka poziom Ratusza × monety przeliczana o pełnej godzinie. Strzałka ↑/↓/→ pokazuje bilans godzinowy produkcji i zużycia całej wyspy. Samo przeniesienie towaru między magazynami nie zmienia tego bilansu. | F18,F19 |
| Dzień i zapis | Odnowienia dzienne i dni aktywności używają 00:00 Europe/Warsaw, także offline. Czasy trwania efektów 6 h i 24 h, ruchome okna oraz 30 dni nadal liczymy od zdarzenia. Przeglądarka zachowuje oba oddzielne profile, bez synchronizacji z prawdziwym kontem. | V9-34 |
| Nowy interfejs | Nie ma lewego paska ani pięciu materiałów w nagłówku; są pracujący, ETA nowej osoby i Punkty. Kafelki budynków mają ustaloną kolejność i stany osób, a zasoby pokazują lokalny / centralny (wszystkie przewozy w toku). Ustawienia obejmują EN/PL, filtry powiadomień oraz animacje, a rozwijane szczegóły efektu są pod i. | F01…F06,F09…F15,F17 |

## Wzory, które pozostają obowiązujące

- **Produkcja na osobę:** `p(1)=10`, dla `L≥2`: `p(L)=L+10`; głód daje ×0,5. Premia aktywnej gry ×2 i latarnia ×2 mogą dać ×4, ale nie przyspieszają tragarzy.
- **Praca i bufory:** limit `12 × własny L`; lokalny bufor `200 × własny L`; TH ustala jedynie granicę ulepszeń.
- **Transport:** bazowy ładunek `floor(60 × 1,1^(własny L−1))`, następnie `floor(baza × (1+0,1×max(0,R−2)))`; `R` jest pełnym poziomem wszystkich dróg. Pełny kurs trwa `300 / ((1+0,1R) × wyżywienie)` sekund.
- **Budowanie:** standard `T`, latarnia `4T`, kaplica `3T×(N−1)` samej fazy budowania. T jest rzeczywiste, od pierwszego odbioru do ostatniej dostawy, z przerwami; nie jest czasem od zamówienia ani sumą osobogodzin.
- **Dowóz Premium:** po zakupie budowanie zamraża `(miniony T + normalna estymata pozostałego transportu) × współczynnik`; bez obsady przyjmujemy jednego hipotetycznego tragarza. Pełne kupno kompletnego budynku to osobna usługa 10 s, poza zwykłymi slotami.
- **Norma zadań:** `12 × własny poziom producenta × p(L) × wylosowane godziny`, bez bieżącej obsady i chwilowych bonusów. Nagrody zachowują bazę L3/468, 1/2/3 rodzaje materiałów oraz zamrożenie kwot oferty.
- **Demografia:** dokładna średnia H steruje przyrostem/ubytkiem. Do 50% tempo to `|H|/300` osoby/h, powyżej `1/6+(|H|−50)/60`; znak H wyznacza kierunek. Minimum 6, maksimum `24×TH`.
- **Podatek silnika:** przybyły przypisany pracownik płaci 1 monetę/h, także podczas blokady; idący, wracający i zwiedzający nie płaci. Kaplica ×2 oraz aktywna gra ×2 mogą dać ×4. Informacji podatkowych nie pokazujemy w interfejsie.

## Doprecyzowania wdrożenia i przyszłe integracje

- Anulowanie wcześniejszego poziomu wymaga wcześniejszego anulowania późniejszych zależnych poziomów tego samego budynku; nie ma ukrytej kaskady.
- Zakupiony portowy ładunek rozpoczyna 24 h wraz z przybyciem statku; rozładunek nie odnawia tego czasu. Partie sprzedażowe mają czas od każdego przybycia tragarza do portu.
- Gdy część sprzedawanego zamówienia wygaśnie, płatność dotyczy faktycznie wysłanej ilości, proporcjonalnie do zamrożonej ceny, w dół do całych monet. Te operacyjne doprecyzowania nie są przedstawiane jako osobne odpowiedzi użytkownika.
- Wirtualne monety, czyste funkcje nagród i potwierdzone zdarzenia testowe nie stanowią zewnętrznej integracji. Nie podłączono prawdziwych płatności, kont/OAuth, publikacji ani kont poleconych.
- Samouczek ma jawnie projektowe kwoty: 10 pierwszych lekcji po 25 monet +10 materiału, 15 kolejnych po 50 monet +20 materiału, razem 1000 monet i 400 materiałów. To nie są nieustalone nagrody lojalnościowe.
- Prototypowa krzywa czasu ekspedycji to `180/(1+0,1×(runda−1))` sekund. Jest eksportowaną konfiguracją projektu, nie zatwierdzoną docelową trudnością.
- Cena kupna osoby, agregacja wszystkich przewozów w Resources i składanie premii aktywności zostały ogłoszone przed GO jako założenia wdrożeniowe; manifest oznacza je jawnie.

## Co naprawdę pozostaje na później

- Docelowe plansze i limity czasu minigier; krzywa prototypu musi być jawnie oznaczona jako projektowa.
- Zewnętrzne reklamy, dodawanie czasu/podwajanie, hasło i limity.
- Wysokości premii lojalnościowych i odbiór po konfiguracji.
- Osobna aktywność modlitewna.
- Prawdziwe konta/OAuth, płatności i serwerowa weryfikacja publikacji/poleceń.

Skrót i kalkulator: [Excel 9](arkusze/HARBORLIGHT9-zasady.xlsx). Budynki: [tabela](BUILDINGS.md). Interfejs: [instrukcja](INTERACTIVE-ISLAND.md).
