# HARBORLIGHT — wprowadzenie i zapis v20

Zakres zatwierdzony przez użytkownika poleceniem „GO developuj” 31 października 2026 r. Uzupełnia [reguły v18](FRONTEND-V18-REQUIREMENTS.md) i [zakres v19](FRONTEND-V19-REQUIREMENTS.md), bez resetowania istniejących wysp. Ten dokument opisuje wymagania i granice implementacji DEV, nie potwierdza publikacji PRE-PROD ani PROD.

## Pierwsze wejście na nową wyspę

1. Kilkuzdaniowe okno wyjaśnia cel gry: rozwój osady, domy i żywność mieszkańców, pracę i produkcję, transport, szczęście oraz ekspedycje i zadania. Przycisk „Dalej” prowadzi do nazwania wyspy.
2. Gracz nadaje wyspie nazwę zgodną ze wspólną walidacją gry: 2–40 znaków, normalizacja Unicode i odstępów, bez znaków sterujących oraz nawiasów ostrokątnych. Nazwa należy do chmurowego zapisu wyspy. Nie wystarcza zapis preferencji w przeglądarce.
3. Oprowadzanie po kolei wskazuje nazwę wyspy w lewym górnym rogu i dostępny tam przegląd, poziom, szczęście oraz pozostałe elementy górnego interfejsu, budynki wyspy i dolne menu. Złote podświetlenie i wskaźnik pokazują element, a chmurka wyjaśnia jego zastosowanie. Celem jest poznanie interfejsu; czytanie tych opisów nie zalicza działań ani nie wypłaca nagród standardowego samouczka.
4. Na dole każdej chmurki są strzałki wstecz/dalej; pierwszego kroku nie można cofnąć poza początek oprowadzania. Przycisk wyjścia znajduje się w prawym górnym rogu chmurki. Ostatni krok albo wyjście kończy oprowadzanie i uruchamia wyspę. Wcześniejsze nazwanie wyspy jest wymagane.
5. Dopiero wtedy można rozpocząć istniejący samouczek 25 rzeczywistych działań. Podczas wprowadzenia tło jest zablokowane modalnie; podświetlenie nie wykonuje komend budowy, zakupu ani przydziału pracownika.

Wprowadzenie jest jednorazowe dla nowego świata, a nie powtarzane po każdym logowaniu. Etap, indeks kroku i nazwa są utrwalane w chmurze. Po przerwaniu lub ponownym wejściu należy wznowić zapisany etap zamiast rozpoczynać oprowadzanie od początku.

## Zatrzymany czas i zgodność starszych zapisów

- Przez opis, nazwanie i oprowadzanie zegar nowego świata pozostaje zatrzymany. Nie upływa czas produkcji, transportu, żywności, wzrostu populacji, szczęścia, ochrony powitalnej, wydarzeń ani propozycji aktywności. Wczytanie takiej wyspy po dłuższej nieobecności także nie nalicza tego okresu jako rozgrywki.
- Zakończenie lub wyjście uruchamia świat od tego momentu. Bezwzględne kotwice nowego świata są przesunięte bez przyznawania produkcji lub nagród za czas wprowadzenia. Historia konta, zwłaszcza wcześniej wykorzystane uprawnienia przy późniejszym odtworzeniu świata, nie uzyskuje nowego okresu ważności przez ten zabieg.
- Trwała sesja uwierzytelnienia i jej realny termin bezczynności są odrębne od zatrzymanej symulacji. Rzeczywiste sterowanie wprowadzeniem może podtrzymywać sesję, ale nie uruchamia gospodarki ani aktywnego bonusu świata.
- Starsze wyspy, które nie zawierają znacznika wprowadzenia, są traktowane jako już rozpoczęte. Nie wolno zerować ich czasu, nazwy, poziomów, zasobów, budów, przewozów, ukończonych lekcji ani nagród. Nie wymuszamy ponownie pierwszego uruchomienia na `admin1`, `admin2` lub `admin3`.

## Automatyczny zapis i powrót do gry

- Zapis postępu odbywa się **wyłącznie w chmurze**, automatycznie co 30 sekund przy oczekujących zmianach. Ważne operacje oraz wylogowanie mogą dodatkowo wymagać wcześniejszego potwierdzenia zapisu. Interwał nie może być stale odsuwany przez kolejne zmiany stanu.
- Ze wskazanego panelu konta w Ustawieniach znikają status techniczny, przyciski „Zapisz w chmurze” i „Wczytaj zapis z chmury” oraz osobna karta konta. Pozostaje wyraźne wylogowanie. Pozostałe ustawienia i odnośniki do dokumentów gry nadal są dostępne.
- Zwykłe ponowne logowanie wczytuje tę samą wyspę i postęp samouczka. Brak połączenia, nieudany odczyt lub niepoprawny zapis nie może zostać potraktowany jako brak wyspy i zastąpiony nowym światem. Nie wprowadzamy lokalnej kopii wyspy ani lokalnej kolejki odzyskiwania.
- Po błędzie zapisu dalsze działania są wstrzymane. Ponowienie odbywa się automatycznie z ponownym odczytem i kontrolą wersji, bez potrzeby ręcznego przycisku. Odczyt rozstrzyga także sytuację, gdy serwer zapisał dane, ale odpowiedź nie dotarła. Nowszy zapis innej sesji ma pierwszeństwo; nie jest nadpisywany starszym stanem.
- Utrata internetu lub zamknięcie przeglądarki przed potwierdzeniem ostatniej operacji nie jest przedstawiana jako udany zapis. Próba opróżnienia zmian przy opuszczaniu karty jest dodatkowym zabezpieczeniem; sam event zamknięcia nie gwarantuje zakończenia żądania sieciowego.

## Bezczynność i istniejące konta

Uzgodnione wcześniej 30 minut bez rzeczywistej aktywności oraz 30 sekund ostrzeżenia pozostaje aktualne. Termin sesji musi być zachowany także po zamknięciu lub uśpieniu przeglądarki: wejście następnego dnia wymaga ponownego logowania, a nie automatycznego odnowienia zapomnianej sesji. Odświeżenie tokenu, autosave i animacje nie liczą się jako aktywność gracza. Wylogowanie nie usuwa chmurowej wyspy.

Stałe UID i historie kont PRE-PROD pozostają niezmienione. Testy migracji i powrotu korzystają z odizolowanych syntetycznych zapisów; nie resetują prawdziwej historii `admin1`. Wdrożenie nadal wymaga własnego zielonego CI, a potem przygotowanego workflow PRE-PROD. Obowiązuje **DEV → GitHub/CI → PRE-PROD → PROD**; tego GO nie traktujemy jako dowodu wykonanej promocji.
