# DEV 0.14.0.0 / v31 — spójna droga gracza i nowe przygody

GO z 4 listopada 2026 obejmuje zebraną paczkę po PRE-PROD 0.13.1.0 oraz zatwierdzony [projekt 50 dni](design/ACTIVE-PLAYER-50-DAYS.md). Prace dotyczą DEV, Git, własnego CI i podglądu Pages. **Nowa promocja PRE-PROD wymaga osobnego polecenia**; odebrana chmura pozostaje 0.13.1.0 / `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`. Nie resetujemy kont, wysp, haseł, kolekcji ani nagród. PROD, rzeczywiści operatorzy i integracja gry fizycznej pozostają poza zakresem.

Punktem wyjścia jest [audyt ścieżek](design/FLOW-AUDIT-20261104.md). Zgłoszenie ze zrzutu nie jest samo w sobie dowodem jednej przyczyny: misja 6/8 dotyczyła rekrutacji, ale prowadziła do Ratusza; ekran pokazywał blokadę niepotrzebnego awansu 3→4. Odbiór v31 wymaga własnego odtworzenia napraw, a nie przepisania sukcesu historycznych testów.

## Wspólny kontrakt głównej ścieżki

- Poziom 1 jest prologiem w 25 praktycznych lekcjach. Poziomy 2–20 mają 19 rozdziałów po 8 celów. Bieżący etap pozostaje jedynym aktywnym; podgląd przygotowań może pokazać przyszłe zależności.
- Wykonalność rozdziału obejmuje poziomy i odblokowania, koszt po rezerwacjach, chronione jedzenie, limit i łóżka ludności, pojemność każdego materiału, gotowość ekipy, wejścia receptur, dostawy i rzeczywisty czas budowy. Sam wystarczający zapas drewna nie oznacza gotowości całej czynności.
- Główna fabuła nie może wymagać płatności prawdziwymi pieniędzmi, reklamy, cudzej oferty, obecności sojusznika lub nagrody z konkretnego dnia ligi. Są to dodatkowe drogi i przyspieszenia.
- Przed terminem i nieodwracalną wpłatą gracz widzi brak oraz osiągalną drogę jego uzupełnienia. Zlecenie niemożliwe z powodu końcowego limitu ma równoważny cel, zamiast wymuszać emigrację lub utratę ludzi.
- Wcześniej osiągnięty poziom budynku zalicza wymóg tego poziomu. Cel nowej czynności mówi jasno, czy wymaga zakupu, ratunku, dostawy czy innego zdarzenia. Wznowienie i zmiana wyspy zachowują jednokrotne rozliczenie.

## Misje, rekrutacja i pomoc

Misja zaproszenia prowadzi do właściwej czynności w Domu. Wartość przygotowywana w misji jest tą samą wartością, którą pobiera odpowiadający jej zakup. Przed przyjęciem oferta odświeża się po zmianie Ratusza; po przyjęciu uzgodniony koszt nie rośnie niejawnie podczas trwającego terminu.

Rekrutacja z przygody ma rzeczywiście przyjmować ludzi i zaliczać odpowiadający jej cel. Przed startem trzeba pokazać przyjmowaną liczbę i obowiązujący limit. Pomoc 5 etapów dobiera działania do przyczyny braku, ratunek 3 etapów daje prostszą osiągalną drogę. Nie wystarcza skopiowanie niedostępnego celu na koniec kolejnej gałęzi. Wcześniejsze wpłaty i ukończone etapy pozostają zaliczone.

Awans Ratusza 3→4 nadal wymaga przygotowania ludności, łóżek oraz żywności. Scenariusz wyjaśnia ten próg odpowiednio wcześniej; nie udaje, że misja zaproszenia jednej osoby wymaga natychmiast 54 mieszkańców. Pozytywna pomoc przy pełnym końcowym limicie może dotyczyć gości lub sąsiedniej osady.

## Gospodarka i transport

- Odbiór żywności ma działać również podczas budowy. Widok obsady musi wyjaśnić, ilu ludzi faktycznie może odbierać produkcję; ETA uwzględnia zmianę przydziału.
- Legalny starszy projekt turbo nie może po migracji utknąć na ukrytym wymaganiu 6 tragarzy, kiedy bieżący kurs uczy 3. Zachowujemy opłacone materiały, pozostały transport i wykonane prace.
- Przyjęty i opłacony plan rozbudowy zachowuje możliwość realizacji po końcu pakietu. Nie wymagamy kupienia kolejnego pakietu, aby uruchomić wcześniej sprzedaną usługę.
- Sprawdzamy osobno limit danego materiału, całą przestrzeń, zapasy bonusowe i rezerwy. Przy opóźnionym Magazynie gra podaje osiągalny następny krok, zamiast proponować zlecenie z niemożliwą pojemnością.
- Rozruch córki z 6 osobami i zerowym zapasem ma własną osiągalną drogę dostaw. Zakup córki pozostaje dobrowolną gałęzią głównej fabuły.

## Chmura, szybkie akcje i czas

Płynny ruch, przeciąganie i łapanie ładunku nie mogą czekać na ACK chmury po każdym wejściu. Współbieżne snapshoty mają zachować najnowszy stan; starsze potwierdzenie nie cofa sceny. Wypłata, zakup i inne czynności gospodarcze nadal zachowują ochronę przed podwójnym wydaniem oraz utraconym potwierdzeniem.

Oczekiwanie na własny system zapisu nie powinno zużywać czasu próby, w którym gracz nie może działać. Tymczasowa awaria, ponowne logowanie oraz powrót do potwierdzonego stanu mają osobne działające ścieżki. Odrzuconego payloadu nie wysyłamy w ciemno. Żółty komunikat oczekiwania znika po potwierdzeniu; sam stary komunikat nie udaje bieżącej blokady.

## Tutorial, samouczek i redakcja

Samouczek ma poprawnie przejść przez wariant 100 szczęścia po wcześniejszej Latarni: można świadomie zachować punkty, zamiast czekać dobę lub pogarszać stan wyspy. Finał 25 lekcji nie wymaga pozbycia się bonusowych materiałów lub legalnych rezerwacji. Dawne programy zachowują historię i wskazują obecne przyciski.

Smutna buźka ma być nad Gospodarstwem, również podczas demonstracji tutoriala. Teatr przenosimy na polanę wskazaną strzałką użytkownika po prawej stronie wyspy; przenosi się budynek, obszar kliknięcia i podświetlenie. Targ ma tekst „Od 6 poziomu Ratusza”. Latarnia: „Mieszkańcy też chętnie ją zwiedzają — po powrocie ze zwiedzania otrzymają premię szczęścia”.

## Teatr i własna aranżacja

Zachowujemy limit 20 ustawionych dekoracji, ale zastępujemy skokowe pola swobodnymi pozycjami w obrębie placu. Przeciąganie myszą i dotykiem, wybór miejsca i klawiatura powinny wskazywać przewidywalny rezultat. Ustawienia atmosfery, pomysłów i inspektora są czytelne na telefonie.

Punktem wyjścia jest ładny urządzony plac, którego elementy można zmieniać, ulepszać i kupować w katalogu. Migracja zachowuje własność, tożsamość, poziom, styl, dawne pomysły i dalsze ulepszenia ponad20. Przeniesienie lub zdjęcie nie duplikuje ozdoby ani nie cofa kosztu. Reklamy pozostają jawną symulacją poza PROD; kosmetyka nie blokuje fabuły.

## Przygody i biblioteka 50 dni

Projekt miesza lekkie sceny, średnie zagadki i dłuższe escape roomy. Czynności mają rzeczywisty skutek w zagadce: dowód otwiera następny trop, ustawione światło odsłania znak, a narzędzie umożliwia przejście. Sam opis lub przycisk „rozwiązane” nie potwierdza rozwiązania.

Biblioteka ma około 20 większych konstrukcji i warianty naprawdę zmieniające dane, układ, zależności i rozwiązanie. Dochodzą różne nowe mechaniki, m.in. mewa, kraby, ukryte przedmioty, papuga, pakowanie, cumy, nawigacja, nabrzeża, przekładnie, optyka, śluzy, hotel, magnesy, składanie planu, wynalazki, perspektywa, dedukcja, gotowanie, język boi i wagi. Istniejące trójki i kulki mogą być elementami dłuższego łańcucha. Różnica obrazka lub losowanie bez jednoznacznej reguły nie jest nowym scenariuszem.

Podpowiedzi podstawowe i narzędzia konieczne do rozwiązania są dostępne bezpłatnie. Rozgrywkę można przerwać i wznowić. Nagroda wynika z faktycznego ukończenia i jest rozliczana raz. „Łap ładunek” działa pojedynczym kliknięciem lub dotknięciem.

Licznik minigier i wynikająca z niego trudność są powiązane z kontem. Wyjście, wypłata, przegrana, ponowne logowanie i zmiana wyspy nie odnawiają go przed godzinnym resetem. UI pokazuje czas do resetu i wyjaśnia zachowanie trudności. Wspólna pula nowych zagadek i opowieści ogranicza mnożenie wypłat przez gry i wyspy. Dziewięć wcześniejszych przygód zachowuje swoje nagrody, w tym dokładnie złapany ładunek; nowa krzywa ekspedycji ma osobny pułap rundy. Konkretne nowe kwoty, progi i budżety są parametrami DEV wymagającymi własnego odbioru.

**Poziom20 w50 dni oraz150 godzin zabawy są celami, nie wynikiem walidacji.** Model ma pokazać odrębnie koszty, gwarantowane wpływy, tempo rekrutacji, produkcję i transport. Biblioteka wymaga również sprawdzenia jakości i rzeczywistej długości zabawy. Nie obiecujemy pełnej trajektorii na podstawie pojedynczej krótkiej próby lub sumy czasów budowy.

## Reguły pozostawione do osobnej decyzji

To GO nie wprowadza arbitralnie trzech dodatkowych zmian: narastania bazowego szczęścia pod premią Latarni, odroczenia powitalnego mieszkańca przy pełnym limicie i bezwzględnego limitu24 h niezależnie od obsady/głodu. Pozostają dotychczasowe zasady; audyt wskazuje je jako osobne decyzje. Nie przedstawiamy ich jako naprawionych w tej paczce.

## Dokumentacja i odbiór

Zmiany mają atomowe karty HL-CHG-1083–1120. Nowe ręczne scenariusze HL-TC-0148–0179 startują jako NOT RUN; historycznych147 nie odznaczamy ani nie przepisujemy. Własny SHA, CI, Pages, pakiet, testy przeglądarkowe i tag v31 wymagają oddzielnych dowodów. [Raport odbioru](DEV-0.14.0.0-VALIDATION.md) początkowo pozostaje PENDING. Rejestr nie jest publikacją natywnych GitHub Issues.

## Późniejsze GO — wyłącznie DEV → PRE-PROD

**4 listopada 2026:** użytkownik doprecyzował „Miałem na myśli z dev na pre prod”. Oznacza to autoryzację standardowej promocji wersji 0.14.0.0 z DEV do PRE-PROD po własnym zielonym CI dokładnego źródła. Wcześniejsze niejednoznaczne „go na prod” nie zleca operacji PROD; żadnej takiej operacji nie wykonano.

Zachowujemy pierwotny zapis zakresu prac DEV z pierwszego akapitu. Późniejsza dyspozycja rozszerza go wyłącznie o **DEV → własne CI → standardowy PRE-PROD i pełny odbiór**, bez resetu kont, haseł, wysp, kolekcji i historii nagród. Stan nowego SHA, CI, bridge, deployu, artefaktów i tagu pozostaje PENDING do własnego potwierdzenia.

Osobna karta operacji **HL-CHG-1121** opisuje przygotowanie i wynik tej promocji. Rejestr ma **450 kart**, a **179 ręcznych prób pozostaje NOT RUN**. Poprzednie karty zachowują własne decyzje i dowody; ręczne wyniki nie są odznaczane automatycznie. [Dokument promocji PRE-PROD v31](PREPROD-V31-PROMOTION.md) rozdziela autoryzację od sukcesu CI, faktycznego wdrożenia GCP, odbioru istniejących kont oraz publikacji obu artefaktów.
