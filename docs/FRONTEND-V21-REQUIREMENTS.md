# HARBORLIGHT — samouczek, handel i druga wyspa v21

Zakres zatwierdzony kolejnym „GO developuj” 31 października 2026 r. Uzupełnia [v18](FRONTEND-V18-REQUIREMENTS.md), [v19](FRONTEND-V19-REQUIREMENTS.md) i [v20](FRONTEND-V20-REQUIREMENTS.md). Jest specyfikacją pracy w DEV; nie stanowi potwierdzenia wdrożenia ani włączenia usług Google Cloud.

## Samouczek i nagrody

- Zachowujemy 25 rzeczywistych kroków. Czytanie podpowiedzi ani samo otwarcie okna nie zastępuje wymaganego działania.
- Pierwsze działania obejmują przydzielenie tragarza Magazynu, drwala i rolnika, a każde ma własną premię. Kolejne zadania przeplatają dostarczanie nagród z wydatkami, m.in. rozbudową Ratusza, Kamieniołomu i pozostałych potrzebnych budynków.
- Nagrody nowego programu są dopasowane do kolejnych zadań. Nie należy kumulować szeregu niewykonalnych do przyjęcia skrzyń, a później dostarczać ich nagle hurtem. Zasada wydawalnych materiałów bonusowych poza limitem zwykłych dostaw pozostaje aktualna.
- Celem ukończenia nowego programu jest pełny magazyn zwykłych materiałów i brak nieodebranych skrzyń samouczka. Nie osiągamy tego przez ukryte usunięcie zasobów, wcześniej przyznanych nagród ani zakupów. Końcowe rozliczenie wymaga odebrania poprzednich 24 nagród, braku rezerwacji budowy/Targu/Portu oraz wcześniejszego wykorzystania zewnętrznych materiałów bonusowych. Warunki i brakujące czynności są widoczne w samouczku.
- Dotychczasowy zapis, ukończone lekcje, wylosowane i odebrane nagrody nie są resetowane. Migracja programu nie przyznaje ponownie nagród za te same działania. Odbiór równowagi wymaga przejścia całej nowej ścieżki, a nie ręcznego ustawienia 25 flag ukończenia.

Przykładowy [bilans pełnej ścieżki testowej](TUTORIAL-V21-BALANCE.json) rozlicza 25 rzeczywistych komend i 8 h 55 min czasu symulowanego świata: Ratusz 3, Magazyn 2, zwykły zapas 6000/6000 (po 1200 każdego materiału), brak bonusowej nadwyżki i brak oczekujących skrzyń. To dowód konkretnego przebiegu modelu, a nie obietnica identycznego czasu dla każdej strategii gracza.

## Objaśnienia w grze

Dolne menu zasobów wyjaśnia zapis `lokalny / centralny (w transporcie)` oraz osobno bilans godzinowy. Przykład Kamienia `0 / 537 (0)` i `0 szt./h` oznacza: brak gotowego kamienia przy Kamieniołomie, 537 sztuk w magazynie centralnym, brak w drodze i zerowy obecny bilans na godzinę. Informacja pojawia się we wprowadzeniu i jest dostępna w odpowiednim menu gry.

Menu Monet wyjaśnia, którzy rzeczywiście pracujący mieszkańcy płacą podatki i jakie efekty zmieniają ich wysokość. Opisuje nagradzane reklamy oraz ekspedycje/minigry: dobrowolność, dostępne premie i limity, wypłatę albo ryzyko puli, bez udawania aktywnego dostawcy reklam.

Dom pokazuje przydzielanie ludzi, dzienną pulę szczęścia i jej odnowienie o północy Warszawy. Objaśnia, że średnie szczęście steruje przybywaniem albo odchodzeniem mieszkańców, a Ratusz i łóżka mają odrębne funkcje.

Kaplica objaśnia błogosławieństwa oraz dobrą lub złą passę wyspy zgodnie z rzeczywistym mechanizmem wydarzeń. Monitorowanie zaniedbania zaczyna się od poziomu 3 Kaplicy. Regularność wynosi `3 + poziom Kaplicy` dni; zła prognoza może wystąpić dopiero 6–15 dni po przekroczeniu tego odstępu. Opis „łaski lub gniewu” nie może obiecywać gwarantowanego skarbu po każdym błogosławieństwie ani natychmiastowej plagi po pominięciu jednego dnia. Obowiązuje ochrona Latarni i wcześniejsze reguły wydarzeń.

W zaznaczonym obszarze opcji premium budynku pozostaje jedna czytelna płatność Paynow zamiast zduplikowanych przycisków do tego samego zakupu. Inne, odrębne zakupy nadal mają własną cenę i opis.

## Ludność wymagana do rozbudowy Ratusza

Od promocji Ratusza z 3 na 4, a także przy każdej późniejszej promocji, gracz potrzebuje co najmniej 75% limitu mieszkańców poziomu poprzedzającego docelowy. Wynik zaokrąglamy w górę:

| Promocja | Limit poprzedzającego poziomu | Wymagana ludność |
|---|---:|---:|
| 3 → 4 | 72 | 54 |
| 4 → 5 | 96 | 72 |
| 5 → 6 | 120 | 90 |

Warunek dotyczy wyłącznie Ratusza. Koszty i pozostałe wymagania nadal obowiązują. Nowy płatny projekt ani planowanie kolejnego poziomu nie omija progu. Zatwierdzone wcześniej projekty i osiągnięte poziomy nie są cofane po aktualizacji.

## Handel od poziomu 6

Użytkownik potwierdził, że od Ratusza 6 handel między graczami **zastępuje** dotychczasowy handel z grą. Nowe zlecenia NPC w Porcie i Targu są od tego poziomu niedostępne. Dawne rozpoczęte przewozy i zamówienia mogą się zakończyć bez utraty towarów.

Gracze publikują oferty wymiany pięciu materiałów fizycznych: wskazują oddawany zasób i ilość oraz oczekiwany zasób i ilość. Ta wersja nie obejmuje monet. Sami określają przelicznik, np. kamień za drewno. Wersja podstawowa realizuje ofertę w całości; nie narzuca automatycznej ceny NPC ani ukrytej marży.

Towar sprzedającego jest rezerwowany na serwerze. Przyjęcie, anulowanie i odbiór zwrotu wymagają uwierzytelnienia oraz kontroli wersji; dwie osoby nie mogą skutecznie przyjąć tej samej oferty. Nie można kupić własnej oferty. Brak wymaganych towarów lub miejsca nie usuwa zasobów. Zwracany towar, który nie mieści się po anulowaniu lub wygaśnięciu, pozostaje w trwałej serwerowej skrzynce zwrotów do odbioru.

Domyślny techniczny okres ważności oferty to 24 godziny. Jest parametrem wdrożeniowym nowego modułu. Kod i izolowane testy serwera nie dowodzą aktywacji usługi na PRE-PROD; wymagane są routing, IAM, konfiguracja API i odbiór na wcześniejszym środowisku. Pozostała gospodarka nadal jest wyliczana przez klienta i nie jest opisywana jako pełny autorytatywny serwer ekonomii.

## Druga wyspa i transport między wyspami

- Przy Ratuszu 10 na pierwszej wyspie można utworzyć drugą wyspę tego samego konta. Wyraźnie inna kolorystyka i nazwa pomagają odróżnić aktywny świat; zestaw budynków pozostaje ten sam.
- Przy utworzeniu druga wyspa przejmuje ówczesny poziom Ratusza i Magazynu pierwszej. Pozostałe budynki zaczynają od poziomu 1. Kopiowanie poziomów jest jednorazowe; późniejsza rozbudowa wysp jest niezależna.
- Oba światy, wybór aktywnego świata i przewozy należą do jednego zapisu chmurowego konta. Przełączenie nie kasuje ani nie nadpisuje drugiej wyspy i rozlicza nieobecność obu światów. Starszy pojedynczy zapis pozostaje pierwszą wyspą.
- Historie zakupów, nagród jednorazowych i uprawnień są wspólne dla konta. Utworzenie drugiej wyspy nie uruchamia ponownie 72 godzin powitalnej ochrony, przywilejów Latarni ani już wykorzystanych nagród konta.
- Przewóz towarów między własnymi wyspami odbywa się przez Port. Podstawowa pojemność wynosi 1000 sztuk, czas jednego rejsu 10 minut, opłata za sam przewóz wynosi zero.
- Towar opuszcza źródłowy magazyn przy zatwierdzeniu wysyłki. Przewóz ma trwały identyfikator; ponowne wczytanie i rozliczenie czasu nie dostarcza go dwukrotnie. Gdy w docelowym magazynie brakuje zwykłego miejsca, zwykła część ładunku czeka na rozładunek zamiast zniknąć albo obejść limit. Przewóz zachowuje ewidencję materiałów bonusowych i ich wcześniejsze zwolnienie ze zwykłego limitu.
- Jeden wspólny statek obsługuje jeden rejs naraz; po rozładunku można nadać następny. Historia zachowuje ostatnie 50 zakończonych rejsów i bieżący ładunek, a identyfikatory stale rosną. Historii płatnej pojemności nie skracamy. Reset pojedynczej wyspy jest blokowany przy istniejącej drugiej, bieżącym przewozie lub nierozliczonym handlu, aby nie usuwać historii ani nie powielać pakietu startowego.
- Użytkownik potwierdził zakup zwiększenia pojemności za prawdziwe pieniądze. Przyjęty przelicznik DEV to **4,99 zł za dodatkowe 1000 sztuk**; można wybrać 1–100 pakietów na transakcję (do 499 zł) i powtarzać zakup. Nie jest to opłata za każdy rejs. DEV/PRE-PROD mają wyraźną symulację Paynow bez pobierania pieniędzy; rzeczywista sprzedaż i serwerowe potwierdzenia pozostają odrębnym etapem.

## Odbiór i granice publikacji

Regresja powinna objąć pełne 25 działań nowego samouczka, stare nagrody, pojedynczą płatność, zgodność opisów z regułami, próg ludności, równoczesne przyjęcie jednej oferty, izolację kont i dwóch światów, 10-minutowy transport, brak miejsca, wznowienie przewozu i brak powtórnej wypłaty zakupów. Przeglądarki korzystają z odizolowanych syntetycznych zapisów i usług testowych.

W zakresie v21 nie resetowaliśmy prawdziwych wysp `admin1`–`admin3`. Późniejsza dyspozycja v22 dopuszcza jednorazowy reset wszystkich trzech dopiero po potwierdzonej promocji: [zakres v22](FRONTEND-V22-REQUIREMENTS.md). Nadal nie uruchamiamy opłat i nie uznajemy pushu za promocję. Obowiązuje **DEV → GitHub/CI → PRE-PROD → PROD**. Stan implementacji, wyniki testów i faktyczne publikacje są zapisywane osobno w [dzienniku](IMPLEMENTATION-LOG.md).
