# Sterowanie i zapis HARBORLIGHT — frontend v13

Stan wydania **frontend-v13 / Excel 9**: implementacja i odbiór lokalny zakończone — **388/388 testów modelu PASS** oraz zaliczone testy interfejsu, nowego gracza, formularzy i animacji. Publikacja i sprawdzenie rzeczywistego Pages pozostają do potwierdzenia w [dzienniku](IMPLEMENTATION-LOG.md); lokalny wynik nie potwierdza publicznej wersji. Historyczne wyniki v12 są oddzielone od v13.

## Otwieranie gry

- [Dotychczasowa wyspa](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=frontend-v13).
- [Osobny profil nowego gracza](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v13): 12 osób, po 100 zasobów, Ratusz 1, bez testowego grantu. Kolejne otwarcie kontynuuje ten profil.
- [Formularze logowania/rejestracji](https://ksobczak321-oss.github.io/gra/harborlight-auth.html): nadal bez rzeczywistego konta i OAuth.

Do potwierdzenia publikacji odnośnik może pokazywać poprzednie wydanie. Wersję udanego Pages i wyniki publicznego testu zapisuje dziennik.

## Nagłówek i dolny pasek

Lewy pasek nawigacji został usunięty. Górny pasek zachowuje markę, poziom, szczęście, monety i mieszkańców, a zamiast pięciu liczników materiałów pokazuje faktycznie pracujących, czas do nowej osoby i Punkty. Funkcje są dostępne przez menu, karty i odpowiednie budynki; nie pozostawiamy niewidocznego pola plaży czy innych pól otoczenia.

Buildings pokazuje wszystkie 12 budynków w kolejności z tabeli. U góry każdej karty jest własny poziom, a u pracodawców na dole pracujący, idący `(+n)` i odwołani `(−n)`; Ratusz, Dom, Kaplica i Latarnia nie dostają fikcyjnej obsady.

Resources ma pięć materiałów: drewno, deski, kamień, zboże, żywność. Górny licznik to faktycznie pracujący producenta, dolny to **lokalny / centralny (w przewozie)**. Nawias sumuje wszystkie fizyczne trasy tego materiału, w tym budowy, targ i port; nie zwiększa dostępnego zapasu centrali. Strzałka bilansu ↑/↓/→ dotyczy produkcji minus zużycie całej wyspy, a nie samego przewozu.

Decorations przełącza pasek na pięć atrakcji, odnawianych o północy. Paths pokazuje pięć poziomów i postęp odcinków; skuteczne ulepszenie ma krótkie potwierdzenie wizualne zgodne z ustawieniem animacji.

## Panele, efekty i powiadomienia

Panel budynku ma właściwy status, a producent również rodzaj/ilość/ETA najbliższej produkcji. Storage ma podpisane trzy wartości stanu i obu pojemności; Workers ma przydzielonych, wolnych w domu i limit, z małymi +/−. Nie wyświetlamy podatków, choć silnik nadal je nalicza.

Ratusz skupia kolejkę i budowę, Dom mieszkańców i zbiorcze przydziały. Najważniejsze liczby są widoczne od razu, a opisy pod i. Wiersz efektu zawiera nazwę, wartość, czas/status i i na końcu; kliknięcie rozwija źródło, odbiorców i warunek zakończenia.

Magazyn pokazuje każdą osobę, ładunek, trasę i czas dostawy. Maksymalnie trzy priorytety materiałów/Construction są numerowane i podświetlone. Odwołany z ładunkiem kończy kurs, potem idzie pięć minut do domu.

W Notifications można wybierać kategorie widocznych wpisów; filtr nie usuwa historii. Start, istotna zmiana i koniec efektu oraz przyczyna przestoju mają wpisy bez tworzenia nowego przy każdym odświeżeniu.

## Zadania i ukończenie

Przyjęcie nieodwołalnego zadania otwiera potwierdzenie na 60 sekund. Otwarcie utrwala mnożnik szybkiego kliknięcia, ale oferta musi być nadal ważna przy potwierdzeniu. Aktywne jest jedno zadanie; pozostałe są szare, a oba widoki pokazują te same darowizny produktów.

Angielskie Deposit jest zastąpione Donate/Donation, polskie nazwy to Przekaż/Darowizna. Wpłaty są bezzwrotne; po końcu terminu przepadają. Pierwsze oferty mają sześć godzin, a po pierwszym sukcesie następcy danego ciągu wygasają o północy Europe/Warsaw.

Po sukcesie są fajerwerki, próba wibracji na wspieranym telefonie i opcjonalne Share/Skip. Share daje 500 monet raz, Skip zachowuje zwykłą nagrodę, a nierozstrzygnięte zaproszenie czeka bezterminowo w powiadomieniach. To lokalny mechanizm bez zewnętrznej publikacji Facebook.

## Challenge, samouczek i aktywność

Jedna seria ekspedycji zasłania i blokuje zarządzanie wyspą; gospodarka dalej działa. Kolejna wygrana dodaje 50 do faktycznie zachowanej puli, a po czasie odejmowane jest 10 monet za pełną sekundę opóźnienia. Wyjście w rundzie wymaga potwierdzenia straty; zamknięcie po wygranej wymaga potwierdzenia pełnej wypłaty i zakończenia serii.

Po pięciu minutach bez rzeczywistej aktywności jest pytanie i 60 sekund na odpowiedź. Zegar działa także przy ukrytej/zamkniętej grze i podczas pytania. Nie ma fikcyjnego oglądania reklamy ani przycisku kupowania czasu za monety; reklamy pozostają przyszłą integracją.

Samouczek ma 25 trwałych mikrozadań, po pięć na każdy z pierwszych pięciu aktywnych dni. Kwoty są jawnie projektowe: łącznie 1000 monet i 400 materiałów. Osobny program lojalnościowy ma zatwierdzony przebieg, ale brak skonfigurowanych nagród.

Rzeczywista akcja w widocznej aktywnej karcie odnawia premię produkcji na pięć minut, bez dodawania kolejnych czasów. Przełącznik animacji zachowuje świadomy wybór również przy systemowym ograniczeniu ruchu; po powrocie do karty świat powinien wznowić rysowanie.

## Język, zapis i ograniczenia

Settings pozwala wybrać EN/PL dla całego widocznego interfejsu, podpowiedzi, komunikatów i liczb. Wibracja zależy od obsługi przez urządzenie i przeglądarkę. Wyłączenie ruchu ogranicza fajerwerki i animacje, lecz nie zegar gospodarki.

Stan i preferencje są lokalne w tej przeglądarce. Domyślny i nowy profil mają oddzielne klucze; reset dotyczy wybranego profilu. Nie jest to synchronizacja web/Android/iPhone, prawdziwa usługa kont, płatności ani potwierdzanie publikacji i poleceń.

Reguły: [ECONOMY-RULES.md](ECONOMY-RULES.md). Czytelny arkusz: [Excel 9](arkusze/HARBORLIGHT9-zasady.xlsx). Odbiór wdrożenia: [FRONTEND-REVIEW.md](FRONTEND-REVIEW.md).
