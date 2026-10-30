# HARBORLIGHT — zatwierdzony zakres v18

GO użytkownika: 30 października 2026. Poniższy zapis zastępuje sprzeczne wcześniejsze propozycje z rozmowy i v17. Nie jest potwierdzeniem wdrożenia.

## Środowiska i dostarczenie

- DEV oznacza pracę tutaj; PRE-PROD to istniejący projekt `harborlight-dev`; PROD to `harborlight-prod`. Identyfikatory zasobów i nazwy istniejących workflow pozostają technicznie niezmienione.
- Obowiązuje praca → GitHub/CI → PRE-PROD → PROD; ten sam zatwierdzony pakiet i obraz. Sam push nie publikuje na PROD.
- PRE-PROD zachowuje stałe konta admin1–3 i ich wyspy. PROD ma rzeczywiste konta. Nowe wydanie nie resetuje istniejącego postępu.
- Postęp konta jest wyłącznie w chmurze. Nie zapisujemy wysp, kopii ani kolejki odzyskiwania w pamięci przeglądarki. Sesja logowania i język nie są zapisem wyspy. Lokalny DEV może mieć nietrwały podgląd w pamięci procesu.

## Materiały, transport i budowy

- Zwykły zapas i wydawalny zapas bonusowy mają osobną ewidencję. `resources` prezentuje ich sumę. Nagrody nie zajmują limitu zwykłych dostaw; nic nie przepada. Wydawanie: najpierw bonus, potem zwykły zapas.
- Przykład limitu 300: 200 zwykłego + nagroda 200 = dostępne 400; producent może dowieźć jeszcze 100, razem 500. Nadal działają rezerwacje budów i ochrona jedzenia.
- Przepełnienie blokuje następne skrzynie samouczka i ich podwajanie, a nie zarządzanie wyspą, rozbudowę, pomoc czy nagrody reklamowe/zadań.
- Zakup natychmiastowego przewozu sprawdza miejsce razem z już nadchodzącymi zwykłymi ładunkami; odmowa następuje przed opłatą i pobraniem towaru.
- Premium odbiór niezarezerwowanego towaru z Targu zachowuje wcześniejsze zwykłe zlecenia.
- Ładunek faktycznie podjęty przed terminem ważności pozostaje chroniony także przy rozładunku statku; niepodjęty wygasa. Chronionych materiałów nie usuwamy po zakończeniu pierwszego etapu.
- Zwykła kolejka nie przekracza limitu Ratusza. Następny poziom tego samego budynku zajmuje miejsce kolejki także przy wolnym miejscu aktywnym.
- Po osiągnięciu maksymalnej pojemności Magazynu (poziom 24) dalszy jego poziom zwiększa tylko limit obsady: zatrzymujemy wzrost pojemności, bazowego ładunku i rezerwy żywności. Drogi działają niezależnie.
- Zachowujemy rzeczywiste T transportu jako podstawę czasu budowania. Aktywność przyspieszająca transport skraca więc także wynikową budowę. Popup przyspieszenia podaje faktycznie oszczędzone minuty i sekundy.

## Ludzie, szczęście i czas

- Nowa wyspa zaczyna z rzeczywistym bazowym szczęściem 20%. Przez pierwsze 72 godziny ma ochronę co najmniej 20% obejmującą wszystkich, także nowo przybyłych. Nie zbieramy pod nią ukrytego długu kar; koniec nie odejmuje automatycznie 20 pp.
- Wymuszone 100% ma pierwszeństwo nad ochroną powitalną i standardowym 24-godzinnym 0% nowych osób. Przybyły podczas premii Latarnianej korzysta tylko do wspólnego końca efektu.
- Dodatni przyrost populacji jest dwukrotnie szybszy; odejścia nie są przyspieszone. Dojście pracownika nadal trwa 5 minut.
- Przydział do pracy wstrzymuje karę bezrobocia już podczas dojścia. Licznik zeruje dopiero dotarcie, aby przydzielanie i odwoływanie nie dawało nowej ochrony. Podatek zaczyna się po dojściu.
- Faktyczna aktywność w ostatnich 5 minutach daje produkcję, podatki i prędkość transportu ×2. Potem ×1; po 48 godzinach bez grania ×0,5. Rozliczenie nieobecności jest przedziałowe. To nie zmienia zegara świata, jedzenia ani czasu efektów.
- Aktywność obejmuje rzeczywisty dotyk, klawiaturę i sterowanie minigrą w aktywnej karcie. Animacja, automatyczny zapis i odświeżenie sesji nie liczą się.
- Po 30 minutach bez aktywności ostrzeżenie; po kolejnych 30 sekundach bez odpowiedzi wylogowanie. Wcześniejszy minigrowy mechanizm obecności 5 minut + 60 sekund nadal chroni serię.
- Nowa wyspa pokazuje 1 stycznia i rzeczywistą godzinę Warszawy. Fikcyjna data nie zastępuje prawdziwych znaczników czasu. Dzienne odnowienia używają Europe/Warsaw.

## Samouczek i komunikaty

- Zachowujemy 25 kolejnych kroków i odebrane nagrody starszych zapisów. Każdy nowy krok wymaga rzeczywistego działania, nie samego potwierdzenia przeczytania. Strzałka wskazuje właściwy dostępny przycisk.
- Minigra ma pierwszeństwo; samouczek i skrzynie czekają na bezpieczny moment. Nie zużywamy limitu rundy na przymusowe czytanie skrzyni.
- Port i Targ odświeżają etapy dostaw. Opisy producentów podają skalowaną wydajność. Opis głodu mówi o pełnej godzinie karmienia do resetu. Przestój rozróżnia brak wejścia i brak miejsca oraz pokazuje rzeczywiste indywidualne kary.
- Powiadomienia: historia do 100, konfiguracja kategorii obejmuje dzwonek; ręczne usuwanie tylko przeczytanych. Dźwięk pozostaje odłożony.

## Ekspedycje, reklamy i monetyzacja

- Nominalna nagroda rundy to 50,100,200,400…; łączna pula 50,150,350,750… . Kontynuacja nadal ryzykuje niewypłaconą serię, a wypłata kończy ją. Nie przywracamy automatycznego płacenia za przekroczenie limitu.
- Dodatkowy czas jest kupowany dobrowolnie przed końcem rundy za monety albo potwierdzone obejrzenie reklamy. Nie wskrzesza przegranej rundy.
- Parametry wdrożeniowe, jawne i zmienne konfiguracyjnie: +30 s za 10 monet, maksymalnie dwa zakupy na rundę; reklama +60 s, maksymalnie raz na rundę. To dobór wdrożeniowy, nie wcześniejsza wybrana przez użytkownika cena.
- Podczas świadomie uruchomionej reklamy zegar rundy jest wstrzymany, świat działa dalej. Prawdziwa nagroda wymaga potwierdzenia dostawcy, a symulacja jest oznaczona jako DEV. Nie obiecujemy dokładnie 10 sekund każdej reklamy sieciowej.
- Pierwsza propozycja reklamy: raz na konto w 4–8 aktywnej minucie. Po zakończeniu/pominięciu: pierwsza propozycja minigry albo reklamy po 5–15 aktywnych minutach. Po zakończeniu wybranej aktywności: druga po 43–62. Następne po 60–100. Harmonogram zachowany między logowaniami; kolejka nie przerywa trwającej gry.
- Reklama materiałowa: 10–30 każdego z pięciu materiałów, bez monet. Nie dokłada automatycznie nagrody za czas lub błogosławieństwo.
- Bez reklam w standardowej grze po potwierdzonych zakupach brutto co najmniej 1999 groszy w ostatnich ruchomych 30 dniach. To oddzielne uprawnienie od 24-godzinnego pakietu budowlanego. Standardowe bonusy pozostają bez filmu z tymi samymi limitami. Reklamy za czas WEWNĄTRZ ekspedycji nadal dotyczą również takich graczy.
- U uprawnionego bez reklam punkt 4–8 minut automatycznie rozpoczyna harmonogram, raz; późniejszy odbiór bonusu nie uruchamia go ponownie.
- Paynow zastępuje PayU. Na DEV/PRE-PROD tylko wyraźnie oznaczona symulacja, bez pobierania pieniędzy. Rzeczywista sprzedaż wymaga konta operatora, sekretów na serwerze i zweryfikowanych potwierdzeń.
- Zakup za zdobyte monety od Ratusza 4, odrębny zakup za pieniądze od poziomu 1. Wyraźny przycisk płatności i miejsce na kod.
- Kody: nagroda oraz globalny limit ustalane przez właściciela; pierwszych 20 wymaga atomowego licznika serwera. Zwykły klient nie może sam potwierdzać globalnych realizacji.
- Lojalność: 50–200 każdego zasobu. Wdrożeniowo oznacza sześć zasobów wraz z monetami; zachowane istniejące warunki 10 dni/TH4 i odbiór raz. Losowanie utrwalone.
- Facebook i Google: rejestracja/logowanie oraz udostępnienie osiągnięcia inicjowane i zatwierdzone przez gracza. Automatyzacja strony i osobiste powiadomienia FB odłożone. E-mail nie daje uprawnienia do facebookowego pusha.

## Kaplica i wydarzenia

- Jedno darmowe błogosławieństwo na dzień Warszawy, reset o północy, bez kumulowania. Płatne i reklamowe współdzielą 4 godziny blokady od końca ich godzinnego efektu. Darmowe nie przesuwa tej blokady. Ręczne efekty nie nakładają się.
- Od poziomu Kaplicy 3 regularność wymaga użycia co `3 + poziom Kaplicy` dni. Po przekroczeniu odstępu termin zagrożenia jest losowany za dalsze 6–15 dni. Każde faktyczne ręczne błogosławieństwo odnawia regularność.
- Dobre wydarzenia co 36–60 godzin świata. Podczas globalnej premii Latarnianej najwyżej jedno dobre czeka do końca; złe terminy anulujemy i losujemy po ochronie z zachowaniem okresu Kaplicy.
- Trwająca plaga nie blokuje wymuszonych 100%, ale Latarnia nie zwraca utraconych mieszkańców ani dóbr. Inne czasowe skutki nadal działają.
- Rozbitek bez wolnego miejsca: 500 × poziom Ratusza monet. Minimum populacji 6; nie niszczymy zarezerwowanych dóbr ani niesionego ładunku. Najwyżej jedno zaległe negatywne wydarzenie.
- Jawna konfiguracja balansu wydarzeń: skarb 50–150×TH monet, nadpłata podatkowa 20–60×TH, materiały 50–150 pięciu rodzajów, +1 mieszkaniec, nawóz Farmy +25%/6h. Negatywne: jeden główny skutek i kara H/6h; ludność do20%, wolne monety/drewno do20%, transport do50% wolniej. Wagi i wielkości są strojoną konfiguracją projektu.

## Nieaktywna wyspa i ograniczenia uruchomienia

- Po trzech miesiącach kalendarzowych bez rzeczywistego grania wyspa może zostać usunięta. Zachowujemy konto, historię płatności/kodów/poleceń i nagrody raz na konto. PRE-PROD admin1–3 są wyłączone. Stara karta nie może odtworzyć usuniętej generacji wyspy.
- Automatyczne zwroty wycofane. Przepadek dóbr powiązanych z wyspą jest założeniem projektu; ostateczny regulamin płatnej sprzedaży wymaga weryfikacji praw konsumenta przed uruchomieniem.
- Rzeczywiste reklamy, płatności i OAuth mogą wymagać konfiguracji właścicielskiej. Nie zastępujemy jej pozorowanym sukcesem ani klienckim potwierdzeniem produkcyjnym.
