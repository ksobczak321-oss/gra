# Audyt ścieżek gracza — stan 0.13.1.0

Raport źródłowy z 4 listopada 2026. Opisuje stan **przed implementacją v31**, nie bieżący wynik poprawek. Użytkownik później zatwierdził prace DEV 0.14.0.0; [wymagania](../FRONTEND-V31-REQUIREMENTS.md) oddzielają przyjęte zmiany od dalszych decyzji, a [raport odbioru](../DEV-0.14.0.0-VALIDATION.md) dokumentuje ich własną walidację.

Odnośniki do kodu wskazują niezmienne źródło audytowanej aplikacji PRE-PROD, aby późniejsze przesunięcia linii nie zmieniły znaczenia dowodu. Wymienione ścieżki `/tmp` są lokalnymi materiałami roboczymi audytu, nie publicznymi artefaktami wydania. Raport zawiera odtworzone obserwacje i ich ograniczenia; nie odczytywano prywatnych kont ani nie ustalano w ciemno przyczyny konkretnego zgłoszenia użytkownika.

---

**HARBORLIGHT — audyt głównej ścieżki i dróg pobocznych, 4 listopada 2026**

Analiza wersji 0.13.1.0: wdrożona aplikacja `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`, bieżący commit dokumentacji `5bfc6d8bdc8f6b56ad8bf3095b220b21cf0d1544`. Przegląd kodu i izolowane przebiegi modelu; bez odczytu prawdziwych kont, zmiany kodu gry, danych, Git lub publikacji. Pierwotny raport powstał poza repozytorium; niniejsza kopia zachowuje wyniki tamtego audytu. Wnioski „potwierdzone” dotyczą odtworzonego działania kodu; nie przypisują automatycznie tej samej przyczyny zgłoszeniom ze zrzutów.

**Najważniejszy wynik**

Problem jest szerszy od jednego zadania. Obecne sprawdzanie wykonalności ocenia pojedynczy etap, podczas gdy jego wykonanie zależy od innych systemów: bieżącej ceny zakupu, dostępnych miejsc ludności, obsady transportu, efektów szczęścia i potwierdzenia zapisu. Znaleziono konkretne przypadki, w których te systemy sobie przeczą. Dodatkowo niektóre pomocnicze etapy powtarzają niespełniony warunek zamiast go rozwiązać.

Zadanie może być trudne i może zakończyć się niepowodzeniem. Poprawny scenariusz powinien jednak wskazywać wykonalną drogę przygotowania i odzyskania postępu, bez wymagania nieaktywnego budynku, nieosiągalnej ceny lub celowego pogarszania sytuacji osady.

**Rzeczywista główna ścieżka obecnej wersji**

Tutorial 34 opisów → samouczek 25 praktycznych lekcji → fabularny rozdział Latarni → kolejne rozdziały odblokowywane przez rozwój Ratusza. Zamknięcie samouczka pozwala rozpocząć misje wcześniej, więc obie ścieżki trzeba uwzględniać także równolegle.

| Etap rozdziału | Rzeczywisty warunek | Co musi być wcześniej osiągalne |
|---|---|---|
| 1/8 | Wpłata drewna ekipie | Dostępny niezarezerwowany zapas albo produkcja i odbiór |
| 2/8 | Wskazany poziom Drwali | Limit Ratusza, koszt i dostawa na budowę |
| 3/8 | Produkcja desek | Obsada Tartaku, drewno w magazynie centralnym, miejsce lokalne |
| 4/8 | Wskazany poziom Domu | Limit budynku, materiały, tragarze i kolejka |
| 5/8 | Zgromadzenie kosztu zaproszenia jednej osoby | Po 500 × ukończony poziom Ratusza każdego z sześciu zasobów; ten etap nie pobiera tego kosztu |
| 6/8 | Zakup/zaproszenie jednej osoby | Wolne miejsce ludności, ten sam koszt co w etapie 5, poprawne wejście do Domu |
| 7/8 | Zgromadzenie materiałów Latarni | Pojemność, produkcja, zapas żywności i bieżący koszt rozbudowy |
| 8/8 | Ukończenie rzeczywistej rozbudowy Latarni | Wymagany poziom, dostępna budowa, tragarze, transport i czas prac |

Wcześniej ukończone wymagane poziomy budynków są zaliczane na podstawie stanu wyspy. Pomoc ma pięć etapów, ratunek trzy; końcowy etap obu gałęzi obecnie odtwarza przerwany cel.

**Potwierdzone niespójności i pułapki**

1. **Etap 6/8 kieruje do niewłaściwego budynku.**

   Misja wymaga zaproszenia mieszkańca, ale przycisk prowadzi do Ratusza. Zakup znajduje się w Domu. W odtworzonym stanie Ratusz 3/populacja 13 dało się kupić jedną osobę, otrzymać populację 14 i przejść dalej bez Ratusza 4. Dla wartości ze zrzutu brakowało 355 monet do zaproszenia, a nie 41 osób do samego celu 6/8. Ratusz miał 59 wolnych miejsc. To prawdopodobne wyjaśnienie skierowania gracza do niepotrzebnego awansu; rzeczywistego zapisu konta nie odczytano.

   Propozycja: prowadzić bezpośrednio do właściwej czynności w Domu i wyświetlać dokładny brak wraz z drogą jego uzupełnienia.

   Dowody: [cel misji](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-missions.js#L312), [błędny przycisk](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-missions-ui.js#L105), [zakup w Domu](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-play.js#L1511).

2. **Koszt misji i koszt rzeczywistego zakupu mogą się rozjechać.**

   Etap utworzony przy Ratuszu 3 zachowuje koszt 1500 każdego zasobu. Po awansie Ratusza na 4 zakup kosztuje już 2000. Odtworzono: misja pozwala rozpocząć zadanie z terminem 600 s, a zakup odmawia z powodu brakujących 500 monet. To rzeczywisty błąd wspólnego kosztorysu.

   Do decyzji: przed rozpoczęciem przeliczać ofertę zgodnie z aktualnym Ratuszem; po akceptacji zachować jedną potwierdzoną cenę dla misji i powiązanego zakupu. Alternatywa wymaga jawnego ponownego uzgodnienia zmienionych warunków i czasu.

   Dowody: [zapis kosztu etapu](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-missions.js#L348), [bieżąca cena zakupu](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-state.js#L1008). Reprodukcje: [wyniki](/tmp/harborlight-mission-flow-audit-20261104.json).

3. **Pomoc i ratunek nie muszą usuwać przyczyny blokady.**

   Ostatni etap kopiuje pierwotny cel i koszt. Pomoc w rozdziale 2 do zaproszenia mieszkańca daje drobne monety, ale nadal kończy się żądaniem zakupu po 1500 każdego zasobu. Nie zapewnia brakujących miejsc ani pełnego finansowania. Dodatkowo obecne przygody o ratowaniu ludzi wypłacają monety i materiały, bez faktycznego przyjęcia mieszkańców. Licznik zaproszeń zwiększa wyłącznie udany zakup; imigracja, powitanie dnia i zwykła nagroda mieszkańcami nie zaliczą automatycznie tego celu.

   Propozycja: pomoc dobierać do konkretnego braku. Jeżeli nagrodą ma być rekrutacja po uratowaniu rozbitka, musi to również spełniać odpowiedni warunek misji. Po pomocy wracamy do następnego etapu z zachowaniem faktycznych wpłat.

   Dowody: [kopiowanie celu](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-missions.js#L341), [zaliczanie zakupu](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-missions.js#L512), [nagrody przygód](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-adventures.js#L264).

4. **Pełna populacja może blokować pozytywny cel rekrutacji.**

   Przy Ratuszu 100 i 2400 osobach zaproszenie jest niedostępne, a dalszy awans Ratusza niemożliwy. Jeżeli gracz ma już wszystkie 20 dozwolonych wysp i wszystkie są pełne, typowy dodatni rozwój nie daje miejsca na obowiązkowe przyjęcie. Przy mniejszej liczbie wysp może jeszcze istnieć droga przez kolonizację i przewóz mieszkańców. Wywoływanie odejść mieszkańców nie powinno być wymaganym rozwiązaniem misji ratunkowej.

   Propozycja: przy pełnym końcowym limicie równoważny cel fabularny, np. pomoc gościom lub sąsiedniej osadzie. Nie obiecywać obowiązkowego przyjęcia kolejnej osoby, jeżeli nie ma legalnego miejsca.

   Dowody: [kontrola miejsca](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-missions.js#L376), [maksimum budynku](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-state.js#L391).

5. **Awans Ratusza 3→4 jest znacznie wolniejszy od początkowego rozwoju materiałowego.**

   Potrzeba 54 mieszkańców. Dla populacji 13 brakuje 41. Nawet przy stale utrzymanym szczęściu 100 naturalny napływ maksymalnie 2 osób/h oznacza co najmniej 20,5 h, bez dodatkowych rekrutacji lub nagród. Przy sztucznie utrzymywanym stałym szczęściu 40 byłoby to 153,75 h; to obliczenie warunkowe, nie prognoza rzeczywistej gry ze zmienną średnią. Dom 2 daje 48 łóżek; przygotowanie 54 osób powinno wcześniej prowadzić przez Dom 3 i wydolne żywienie.

   Propozycja: główna ścieżka przygotowuje populację i mieszkania przed żądaniem awansu. Bezpłatna aktywność rekrutacyjna może być drogą pomocy, ale liczba nagradzanych ludzi wymaga osobnego balansu.

   Dowody: [próg ludności](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-logistics.js#L116), [tempo napływu](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-state.js#L408).

6. **Dobre wcześniejsze działanie może zatrzymać samouczek.**

   Wcześniejsza odbudowa Latarni ustawia wszystkim 100 szczęścia. Lekcja 14 wymaga rozdania punktów Domu, ale nie ma uprawnionych odbiorców; bonus trwa 24 h. Odtworzono tę ścieżkę legalnymi komendami modelu, bez ręcznego ustawiania postępu. To obejście standardowej kolejności, nie awaria podstawowego przebiegu.

   Propozycja: lekcja uczy także świadomego zachowania punktów na później, gdy wszyscy są już szczęśliwi. Wykonane wcześniej wymagania nie powinny wymuszać zbędnego pogarszania stanu wyspy.

   Osobna obecna reguła: finał 25 wymaga pozbycia się każdego bonusowego materiału i wyjścia rezerwacji z magazynu. Nawet 1 jednostka dodatkowej nagrody blokuje rozliczenie. Można zamknąć samouczek i wejść do misji, lecz normalny finał pozostaje zatrzymany. To decyzja do zmiany lub wyjaśnienia, a nie udowodniona nowa regresja.

   Propozycja: finał zachowuje bonusy i rezerwacje; premię dopasowuje do wolnego miejsca bez wymuszania wydania istniejących nagród. Starsze programy wymagają również poprawnego wskazania obecnego zbiorowego przycisku Domu.

   Dowody: [odbiorcy szczęścia](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-residents.js#L340), [finał samouczka](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-progression.js#L701). [Szczegóły prób nauki](/tmp/harborlight-learning-flow-audit-20261104.txt).

7. **Budowa potrafi ignorować priorytet żywności.**

   Pierwszych trzech gotowych tragarzy jest rezerwowanych do transportu budowlanego, poza normalnym wyborem priorytetów. Odtworzono pełny Młyn 400, wolne 1688 miejsca na żywność w centrali i priorytetżywności; po 30 min z trzema tragarzami zapas Młyna pozostał 400. Czwarty tragarz rozpoczął odbiór. To spójna możliwa przyczyna objawu ze zgłoszenia, ale nie potwierdzenie faktycznego stanu tamtej wyspy.

   Osobna pułapka dawnych zapisów: stary projekt turbo wymaga 6 tragarzy, nowy kurs uczy 3. Przy 3 może zatrzymać budowę i odbiory; odtworzono 30 min bez kursu. Istnieje wyjście przez 6 osób lub anulowanie nierozpoczętego projektu, ale wymaga ono jasnego prowadzenia.

   Propozycja: awaryjna żywność ma pierwszeństwo, a ETA budowy jest aktualizowane. Alternatywą jest jawne rozdzielenie ekip i pokazanie, że do odbioru produkcji nie pozostał nikt. Migracja starych projektów musi zachować opłacone materiały i postęp.

   Dowody: [przydział transportu](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-logistics.js#L807). Reprodukcje: `/tmp/audit_logistics_flow.mjs`, `/tmp/audit_legacy_carrier_gate.mjs`.

8. **Szybkie kliknięcia zależą od oczekiwania na chmurę.**

   Złapanie ładunku ma już pojedynczy onclick, ale udana akcja przygody powoduje natychmiastowy zapis. Kolejna akcja podczas tego zapisu jest odrzucana. Czas jednocześnie biegnie. To potrafi zmniejszać liczbę możliwych łapań niezależnie od zręczności. Starsze minigry canvasowe używają odroczonego zapisu, więc nie należy utożsamiać częstotliwości obu mechanizmów.

   Podczas awarii offline lokalny zegar jest wstrzymany, ale po odzyskaniu stanu czas jest nadrabiany. Nie znaleziono osobnej ochrony czasu zadania przed taką awarią.

   Propozycja: oddzielić płynne sterowanie od bezpiecznego zatwierdzania nagrody. Oczekiwanie na potwierdzenie własnego systemu nie powinno zużywać czasu gracza, w którym nie może on działać. Trzeba jednocześnie zachować jednokrotne wypłaty i ochronę przed podwójnym wydawaniem monet.

   Dowody: [blokowanie akcji](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-play.js#L328), [zapis po akcji](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-play.js#L493), [zegar hosta](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-play.js#L267).

9. **Nie każda blokada zapisu ma działającą drogę odzyskania.**

   Dla błędu invalid-state komunikat prosi o wczytanie potwierdzonego stanu, ale przycisk wywołuje funkcję, która nie obsługuje tego błędu. Odtworzono brak kolejnego odczytu i pozostanie w blokadzie. Podobny problem występuje dla niektórych innych trwałych błędów.

   Żółta belka Magazynu może też pozostać po już udanym zapisie. Sam zrzut belki nie dowodzi, że zapis nadal jest zablokowany.

   Propozycja: oddzielne, działające drogi dla ponowienia chwilowej awarii, ponownego logowania i powrotu do ostatniego potwierdzonego stanu. Komunikat oczekiwania znika po sukcesie. Nie usuwać ochrony zapisu.

   Dowody: [komunikat i przycisk](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-play.js#L2717), [obsługiwane odzyskiwanie](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-dev-sync.js#L104), [pozostająca belka](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-play.js#L2723).

10. **Opłacony plan może nie ruszyć po wygaśnięciu pakietu.**

    Odtworzono zakup planowania za 19 monet przy 10 s pozostałego pakietu i 3 godz. 45 minprzewidywanego zbierania. Po 5 h pełne materiały i monety były zarezerwowane, a projekt pozostał planned, ponieważ pakiet wygasł. Anulowanie uwalnia zasoby, ale opłata planowania przepada.

    Do decyzji: zaakceptowany i opłacony plan zachowuje możliwość wykonania po końcu pakietu; alternatywnie ostrzeżenie przed zakupem i jasny zwrot. Nie wymuszać odnowienia pakietu do dokończenia wcześniej sprzedanej usługi.

    Dowody: [aktywacja planu](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-logistics.js#L332). Reprodukcja: `/tmp/audit_forecast_expiry.mjs`.

**Balans i ograniczenia wymagające jawnej decyzji**

- Nowy godzinny licznik minigier jest dopiero uzgodnieniem do wdrożenia po GO. Dzisiaj trwająca seria zachowuje poziom po wznowieniu, ale nowa po wypłacie lub przegranej zaczyna od 1. Trzy serie w próbie modelu wypłaciły po 50 monet. Docelowy licznik powinien uwzględniać także zmianę wyspy i być powiązany z kontem.
- Nagrody ekspedycji nadal podwajają się, gdy trudność osiąga już sufit. Etap 17 daje 3 276 800 monet, etap 20 daje 26 214 400; liczba kart pozostaje 120. To wyniki formuły, bez twierdzenia, że człowiek dojdzie tam w godzinę. Reset godzinny wymaga osobnego ustalenia sufitu lub krzywej nagród. [Formuły](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-minigames.js#L32).
- Bonus Latarni 100 wstrzymuje zwykłe narastanie +1 za pracę i+1 za jedzenie. Odtworzona baza 20 pozostaje 20 przez 24 h, mimo widocznych 100. Po końcu bonusu wraca 20. Do decyzji: jasno opisać wyjątek albo pozwolić bazie rosnąć pod bonusem. [Reguła](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-residents.js#L345).
- Powitalny mieszkaniec przy pełnym limicie daje 0, a dzień jest mimo to wykorzystany. Siedem takich logowań daje 0 nowych osób. Trzeba rozstrzygnąć „do 7 przy wolnym miejscu” albo zachowanie uprawnienia do późniejszego przyjęcia. To osobna decyzja od zaakceptowanego ucinania nagrody rozbitków do limitu. [Reguła](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-welcome.js#L29).
- Obecne maksimum 24 h jest budżetem bazowym transportu i budowy z referencyjną ekipą. Głód, brak łóżek lub mniejsza liczba tragarzy mogą je przekroczyć. Przykładowa wycena Domu naTH 24 z jednym niezakwaterowanym tragarzem wyniosła 54 godz. 11 min 12 s. Do decyzji: maksimum bazowe czy bezwzględne. [Budżet](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-economy.js#L17).
- Zwykłe zlecenia Latarni mają inny kontrakt niż główne 8/5/3: nie dają anulowania, a po terminie tracą wpłacone materiały. To wcześniejsza zasada, nie nowy udowodniony bug. Należy wyraźnie odróżnić te zadania lub ujednolicić ochronę wpłat. [Wygaśnięcie](https://github.com/ksobczak321-oss/gra/blob/68e9bcd6adf22ab98f963688726a71d4d8a66c6b/harborlight-v1-activities.js#L583).

**Sprawdzone drogi poboczne i granice ich użycia w scenariuszu głównym**

| Droga | Rzeczywiste ograniczenie | Wniosek dla głównego flow |
|---|---|---|
| Produkcja i głód | Głód spowalnia, ale nie zatrzymuje całej produkcji; matka zachowuje minimum 12, córka 6 osób | Jest droga odbudowy przez Gospodarstwo → tragarzy → Młyn; trzeba zapewnić rzeczywisty odbiór |
| Magazyn | Łączna wolna przestrzeń i limit konkretnego towaru to różne warunki | Pokazywać dokładny brak i wymagany poziom Magazynu przed celem |
| Handel NPC | Port odRatusza 4; zakup wymaga rejsu i transportu przez obsadę | Nie zakładać natychmiastowego materiału, szczególnie przy krótkim terminie |
| Handel graczy | OdRatusza 6; wymaga cudzej oferty i realizacji | Opcjonalna droga przyspieszenia, bez założenia, że oferta zawsze istnieje |
| Kolejna wyspa | Pierwsza odRatusza 10,18 osób na matce,6 w Domu; koszt 21000 każdego zasobu | Nie jest ratunkiem dla gracza z Ratuszem 3 |
| Nowa córka | Zaczyna z 6 osobami i zerem zasobów | Potrzebny własny scenariusz rozruchu i dostaw; nie dziedziczyć wymagań dużej matki |
| Teatr | Progi ozdób mogą wymagać potwierdzonej reklamy lub uprawnienia bez reklam | Kosmetyka nie może być jedyną drogą do koniecznego awansu bez dostępnego dostawcy |
| Most | Podstawowy zestaw elementów wystarcza do rozwiązania | Zachować możliwość wygranej bez dokupienia elementów |
| Liga | Rejestracja 8–14, rozgrywki 15–21, określone okno godzinowe | Nagrody ligowe nie są gwarantowanym źródłem zasobów dla zwykłej misji |
| Pomagam | Wiek konta, aktywność, pochodzenie monet, pula i 30 dni odstępu | Dobrowolna aktywność; jej premia nie może warunkować podstawowej wykonalności |
| Stare zapisy | Zachowane programy samouczka i stare snapshoty budów | Wymagają osobnego prowadzenia; nie wystarczy poprawny nowy profil |
| Zamknięcie/odświeżenie/zmiana wyspy | Liczniki, potwierdzenia nagród i nieukończone cele muszą być odtworzone | Żadnego podwójnego pobrania ani resetu trudności przez zmianę kontekstu |

Pojemności po nowym balansie sprawdzono dlaRatusza 1–10 i 1200 wariantów kosztów budynków 1–100. Przy Magazynie rozwijanym wraz z Ratuszem nie znaleziono przekroczenia kosztu standardowej rozbudowy. Przy zapóźnionym Magazynie zależność trzeba jawnie podpowiedzieć: Ratusz 6→7 potrzebuje co najmniejMagazynu 2, a 8→9 co najmniejMagazynu 3 z uwzględnieniem chronionego jedzenia. Pierwsze trzy dodatkowe wyspy kosztują po 21000/28000/36000 każdego zasobu; w obecnych pojemnościach potrzebaMagazynu 9/10/10. Wszystkie 19 zakupów córek są pojemnościowo osiągalne. To sprawdzenie kosztów, nie symulacja całej historii gracza do 100.

Standardowy kurs 25 lekcji przeszedł przez rzeczywiste komendy modelu; również próby z opóźnieniem czytania 30/60/180/300/600 s przed lekcją zakończyły się sukcesem. Szybki przebieg 203 s oznacza czas symulacji, nie przewidywany czas człowieka. W najwolniejszej próbie 4 godz. 10 min populacja nadal wynosiła 13. To potwierdza wykonalność standardowego kursu i jednocześnie pokazuje, że nie przygotowuje on sam z siebie 54 osób do pierwszego progu awansu.

**Proponowany wspólny kontrakt zadań — do zatwierdzenia, bez implementacji**

1. Każdy obowiązkowy cel ma dostępną drogę wykonania bez zakupu prawdziwych pieniędzy, obowiązkowej reklamy, obecności innego gracza lub oczekiwania na kalendarz ligi. Te mechaniki mogą być dodatkowymi drogami.
2. Rozdział ma plan zależności wszystkich 8 etapów. Tylko pierwszy bieżący jest aktywny; osobny podgląd przygotowań może pokazywać przyszłe potrzeby. Gracz nie musi posiadać całego kosztu rozdziału na wejściu — potrzebna jest wykonalna droga rozwoju.
3. Zanim zacznie się termin lub nieodwracalna wpłata, wspólny kosztorys sprawdza: poziomy i odblokowania, miejsca ludności, zasoby po rezerwacjach i chronionym jedzeniu, pojemność każdego towaru, gotowych pracowników, wejścia receptur, kolejkę oraz rzeczywisty czas transportu i budowy.
4. Misja i czynność docelowa używają tych samych potwierdzonych warunków. Zmiana wyspy, poziomu Ratusza lub oferty nie może niejawnie wytworzyć dwóch cen tej samej akcji.
5. Pomoc dobiera się do brakującego warunku. Brak ludności → rzeczywista rekrutacja; brak miejsca → przygotowanie pojemności lub alternatywa przy maksimum; brak transportu → uruchomienie ekipy; brak zasobów → osiągalna produkcja/przygoda. Powrót zachowuje wcześniej wykonane etapy i wpłaty.
6. Trzeba rozróżniać spełnienie celu stanem wyspy od wykonania nowej czynności. Wcześniej osiągnięty poziom budynku zalicza się od razu; misja rekrutacyjna jasno określa, czy liczy zakup, ratunek lub każde przyjęcie nowej osoby.
7. Niedostępność chmury ma działającą ścieżkę odzyskania. Czas zręcznościowej próby nie może być zużywany podczas systemowej blokady ruchów. Wynik i nagroda są rozliczane jednokrotnie.
8. Każde ograniczenie pokazuje konkretny powód i następną czynność, np. „Brakuje 355 monet — otwórz dostępne aktywności”, zamiast ogólnego polecenia rozbudowy Ratusza.

**Scenariusze odbioru do przygotowania po GO**

- Standardowy nowy profil oraz wolne czytanie wszystkich 25 lekcji.
- Zamknięcie obu przewodników, samodzielny rozwój i późniejsze wznowienie.
- Wcześniejsza Latarnia i 100 szczęścia przed lekcją rozdawania punktów.
- Dodatkowa nagroda materiałowa tuż przed finałem 25; trwająca rezerwacja handlu lub budowy.
- Misja 6 zRatuszem 3/pop 13: dojście do zakupu jednej osoby w Domu, bez wymuszonegoRatusza 4.
- Ratusz 3→4 pomiędzy przygotowaniem kosztu a przyjęciem lub wykonaniem misji.
- Pełny limit mieszkańców przed zaproszeniem; rezerwacje przybywających pasażerów; Ratusz 100 i pełne wszystkie 20 dozwolonych wysp.
- Pomoc i ratunek osobno dla braku monet, ludzi, miejsca, żywności oraz tragarzy.
- Pełny Młyn, wolny centralny limit żywności, budowa i 1/2/3/4/wielu gotowych tragarzy.
- Dawny legalny projekt turbo po wczytaniu zapisu w nowej wersji.
- Magazyn rozwijany wolniej niż Ratusz, pełny limit jednego materiału, zasoby bonusowe i chronione jedzenie.
- Płatne planowanie przy kończącym się pakiecie, kompletowanie kosztu po jego wygaśnięciu i anulowanie.
- Dwa szybkie kliknięcia, wolne ACK, utracone potwierdzenie, offline, konflikt rewizji, invalid-state i ponowne logowanie podczas minigry.
- Wypłata, przegrana, wyjście i zmiana wyspy przed godzinnym resetem; zachowanie aktywnej serii i jednokrotnej nagrody.
- Początek córki z 6 osobami i zerem zasobów; transport przy pełnym docelowym limicie.
- Brak dostawcy reklam, nieobecny sojusznik, brak oferty handlowej i dzień poza ligą — bez zatrzymania głównej fabuły.

Te pozycje są planem odbioru, nie nowymi testami w repo ani zaliczonymi przypadkami ręcznymi. Dotychczasowych 147 prób nie odznaczano.
