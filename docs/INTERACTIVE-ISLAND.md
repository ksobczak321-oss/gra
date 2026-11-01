# Sterowanie i zapis HARBORLIGHT — bieżący DEV 0.10.2.0 / v26

Instrukcja opisuje bieżący kod DEV i wyjątki [v26](FRONTEND-V26-REQUIREMENTS.md), wraz z wcześniejszym [archipelagiem i społecznością v24](FRONTEND-V24-REQUIREMENTS.md). Nie jest dowodem publikacji. Potwierdzony PRE-PROD pozostaje **0.10.1.0 / `353faad347262dce7c3632fdf7c71be124384ab1`**, [wdrożenie 41246771480 / próba 1 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41246771480). Nowy zakres jest tylko DEV; bez promocji GCP, resetu i PROD. [Rejestr środowisk](ENVIRONMENT-STATUS.md) podaje właściwe źródła i wyniki. Excel 11 jest migawką wcześniejszych reguł, bez aktualizacji do v26.

## Nowy zakres v26 — prowadzenie i szybki początek

- **Tutorial** to 33 opisy elementów ekranu, **samouczek** to 25 praktycznych lekcji. Pomoc rozdziela oba narzędzia. Każde można zamknąć, kontynuować od zapamiętanego miejsca albo przejrzeć od początku bez resetu wyspy i powtórnych nagród. Tylko pierwsze wprowadzenie przed pierwotnym startem zatrzymuje czas; powtórka rozpoczętego świata go nie cofa i nie zatrzymuje.
- Nowa nazwa ma większą czcionkę, 3–40 znaków i walidację wulgaryzmów PL/EN. Wczytanie dawnej dwuznakowej nazwy zachowuje świat; reguła nowych nazw nie jest przymusowym resetem.
- Nowy program 5 zaczyna się od sześciu tragarzy, potem priorytetu Budowa, rolnika, drwala i Ratusza 2. W dalszej części osobne zadanie Latarni i minigra zastępują dwie lekcje Ratusza 3. Nagrody wystarczają na Latarnię z rezerwą żywności, a koniec wyrównuje zwykły Magazyn bez zaległych skrzyń. Programy 3/4 zachowują historię.
- Pierwsza nowo przydzielona szóstka tragarzy na macierzystej wyspie z Ratuszem 1 dostaje dojście najwyżej 20 sekund. Po uzyskaniu tego osiągnięcia zwykła cała dostawa na poziomie 1 trwa 30 sekund, a budowa Ratusza 1→2 minutę. Przy Ratuszu 2 transport Ratusza trwa 2 minuty, jego budowa 5 minut; inne budowy proporcjonalnie, transport najwyżej 5 minut. Nowe zlecenia od Ratusza 3 i zapisane starsze projekty zachowują zwykłe czasy. Zobacz [dokładne wyjątki gospodarki](ECONOMY-RULES.md#wyjątki-początku-gry-v26).
- Automatyczne reklamy nie przykrywają tutoriala ani samouczka. Po wcześniejszym zamknięciu czekają **3600 aktywnych sekund / 60 aktywnych minut**, z zachowaniem terminu po odczycie; offline i bezczynność go nie skracają.
- Główne wiersze Magazynu pokazują sumy; szczegóły zwykłego i bonusowego zapasu oraz zasady są pod ⓘ. Dom otwiera pełne przydziały dopiero przyciskiem „Zarządzaj pracownikami”. Ranking, Sojusz i liga oraz Pomagam są osobnymi wejściami, poza Ustawieniami. Chmurka czatu jest przed dzwonkiem; demonstracja usług jest oznaczona.
- Smutna buźka nad producentem wskazuje pełny lokalny magazyn także bez aktywnej kary. Opisy pięciu producentów to objaśniają. Odrębne szczegóły nadal pokazują przestój z braku materiału i rzeczywiste kary pracowników.

## Wejście i zapis

PRE-PROD używa trzech stałych kont testowych. Produkcyjne formularze e-mail/Google/Facebook wymagają przygotowania dostawców i serwera przez właściciela. Każde konto ma własną wyspę: Ratusz 1, 12 mieszkańców, brak pracowników, po 100 sześciu zasobów i bazowe 20% szczęścia. Nowy świat najpierw pokazuje opis gry, wymaga nazwania wyspy i oprowadza po interfejsie. Jego czas rusza dopiero po ukończeniu lub zamknięciu oprowadzania; potem można rozpocząć standardowy samouczek.

Postęp konta zapisuje się automatycznie co 30 sekund przy oczekujących zmianach, wyłącznie w chmurze. Przeglądarka nie zapisuje wyspy, kopii odzyskiwania ani kolejki zmian w localStorage/sessionStorage. Przechowywanie sesji logowania i języka jest odrębne. Ważne operacje oraz wylogowanie mogą dodatkowo zapisywać stan wcześniej. Ustawienia mają przycisk wylogowania; osobna karta konta, status techniczny i ręczne przyciski zapisz/wczytaj zostały usunięte.

Po błędzie zapisu działania są wstrzymane, a mechanizm ponawia odczyt i uzgadnia wersje automatycznie. Odczyt chmury rozstrzyga niepewne potwierdzenie oraz konflikt równoczesnych okien/urządzeń; nowsza wyspa innej sesji nie jest nadpisywana. Błąd odczytu ani nieprawidłowy zapis nie może udawać nowego konta. Ponowne logowanie wznawia zachowany świat i samouczek, a nie tworzy wyspy od początku.

Lokalny DEV może uruchomić nietrwały podgląd w pamięci. Nie jest kontem ani dowodem zapisu. Stare zapisy Pages/gościa nie importują się automatycznie do konta; zwykłe wdrożenie zachowuje istniejącą wyspę chmurową.

## Wprowadzenie przed startem świata

Okno otwierające wyjaśnia rozwój osady, potrzeby mieszkańców, pracę, transport i dodatkowe aktywności. „Dalej” prowadzi do nazwy wyspy: 3–40 znaków, bez znaków sterujących, nawiasów ostrokątnych i wulgaryzmów PL/EN. Pole nazwy ma większą czcionkę; wcześniejsze dwuznakowe nazwy pozostają czytelne po wczytaniu. Oprowadzanie kolejno podświetla nazwę i przegląd wyspy, elementy nagłówka, budynki oraz dolne menu. Chmurki mają strzałki wstecz/dalej i wyjście w prawym górnym rogu. Wyjście jest dostępne po nazwaniu wyspy, na etapie oprowadzania.

Czytanie nie wykonuje komend i nie przyznaje skrzyń. Do zakończenia oprowadzania tło jest zablokowane, a czas świata, jego potrzeby, produkcja, ochrona powitalna i harmonogramy pozostają zatrzymane. Etap, krok i nazwa trafiają do zapisu chmurowego: przerwanie i powrót, także na innym urządzeniu, wznawia tę samą nierozpoczętą wyspę bez naliczania nieobecności.

Wprowadzenie dotyczy nowych światów z jego znacznikiem. Starsze zapisy bez tego znacznika pozostają rozpoczętymi wyspami; nie pokazujemy im obowiązkowego początku ani nie resetujemy zegara, historii czy lekcji. `admin1`–`admin3` zachowują własny postęp.

## Samouczek

25 kolejnych kroków wymaga faktycznego działania lub rzeczywistej dostawy/produkcji. Samo przeczytanie, otwarcie okna albo odrzucona komenda nie przyznaje nagrody. Strzałka wskazuje przycisk związany z bieżącym zadaniem.

**Historyczny program v3:** początek uczy przydzielenia rolnika, tragarza, młynarza i drwala. Piąty krok udostępnia jednorazową pomoc do rozbudowy Ratusza; dalej uczysz się szczęścia, kamienia/desek, priorytetu i dostawy, dodatkowego tragarza, przetwarzania, punktów Domu, filtrów powiadomień, rozbudów, ścieżek, atrakcji, Kaplicy, Targu, Latarni, przyjęcia zadania, ekspedycji, odwołania pracownika i darowizny.

Pomoc historycznego programu v3 pokrywa braki do 500 monet, po 500 drewna/kamienia/zboża/desek i600 żywności. Materiały bonusowe są wydawalne od razu. Rzeczywiste zamówienie Ratusza zalicza krok, ale nie pomija dostaw i budowania.

Skrzynia historycznego programu v3 losuje 100–300 każdego z pięciu materiałów, bez monet. Losowanie jest trwałe; jednorazowe Share daje identyczną zawartość, Skip pozostawia podstawową nagrodę. Odebrane starsze lekcje nie są wypłacane ponownie. Gdy dostępny zapas przekracza limit jednego materiału lub całkowity limit Magazynu, kolejne skrzynie i ich podwajanie czekają na wydanie materiałów; zarządzanie, rozbudowa, pomoc oraz nagrody reklamowe/zadań pozostają dostępne.

**Wcześniejszy zapisany program v21 / program 4:** 25 kroków przeplata przydziały tragarza, rolnika i drwala z rzeczywistym wydawaniem zasobów na Ratusz, Kamieniołom i inne działania. Dopasowane nagrody trafiają do zwykłego zapasu i są rozliczane przed kolejną lekcją. Końcowe jawne rozliczenie wymaga odebrania poprzednich nagród i wykorzystania nadwyżek; uzupełnia tylko wolne zwykłe miejsce, nie usuwa żadnych materiałów. Celem jest pełny Magazyn bez oczekujących skrzyń. Starszy program i jego odebrane premie są zachowane.

Samouczek otwiera się po uruchomieniu świata do ukończenia lub świadomej rezygnacji. Powrót na konto i ręczne wznowienie zachowują ukończone kroki oraz odebrane nagrody. Trwająca minigra ma pierwszeństwo — skrzynia i przewodnik czekają, zamiast zużywać limit rundy.

## Wyspa i budynki

Nagłówek pokazuje nazwę, poziom, szczęście, monety, populację, pracujących, ETA nowego mieszkańca i Punkty. Administracja: Ratusz, Dom, Magazyn, Targ, Port, Kaplica, Latarnia. Gospodarka: Gospodarstwo, Młyn, Kamieniołom, Drwale, Tartak. Zasoby, Dekoracje i Ścieżki mają osobne kategorie.

Przy miejscu pracy widać pracujących, osoby w drodze i oczekujące odejścia. Załoga z ładunkiem kończy kurs, a następnie pięć minut wraca do domu; popup wyjaśnia to po odwołaniu. Dopiero powrót udostępnia osobę do nowego przydziału. Przydział wstrzymuje karę bezrobocia już w drodze, lecz resetuje jej licznik dopiero po dotarciu.

Karta budynku pokazuje rzeczywiste dostępne materiały, koszt, etap dostaw i osobny etap budowania. Limity zwykłej kolejki są egzekwowane także dla kolejnych poziomów tego samego budynku. Popup skrócenia budowy podaje faktycznie oszczędzone minuty i sekundy.

Pojemność zwykłych dostaw jest oddzielna od wydawalnych materiałów bonusowych. Producent przechowuje lokalny zapas, a zasoby centralne można wydać po dostarczeniu. Natychmiastowy przewóz sprawdza miejsce także dla wcześniejszych ładunków w drodze przed pobraniem opłaty. Targ i Port odświeżają etapy na otwartej karcie; towar podjęty przed terminem ważności kończy rozpoczęty przewóz.

Dolna karta zasobu ma postać `lokalny / centralny (w transporcie)` oraz osobny bilans godzinowy. Kamień `0 / 537 (0)` i `0 szt./h` to zero przy Kamieniołomie,537 w Magazynie centralnym,zero w drodze i zerowy bieżący bilans. Nie jest to ilość oczekującej nagrody.

Smutna buźka nad producentem oznacza pełny lokalny magazyn także bez obsady lub przy ochronie szczęścia. Może też wskazywać rzeczywisty przestój; szczegóły rozróżniają brak surowca od braku miejsca i uwzględniają indywidualne zegary pracowników. Sama ikona pełności nie nalicza nowej kary. Premie/kary są dostępne w Ratuszu; menu Monet objaśnia podatników, aktywność, reklamy i minigry. Dom pokazuje przycisk Zarządzaj pracownikami, dzienną pulę szczęścia i wpływ średniego szczęścia na populację. Pozostałe po Daj wszystkim punkty można wydać pojedynczo; przycisk przekazania jest niedostępny przy niewystarczającej puli, nieprawidłowej kwocie lub braku odbiorcy. To jawna interpretacja niejednoznacznej uwagi, otwarta na korektę użytkownika.

## Ratusz, sprzedaż graczom i archipelag

Od awansu 3→4 Ratusz potrzebuje 75% limitu ludności poziomu poprzedzającego cel: 54 dla4,72 dla5,90 dla6. Inne budynki nie mają tego wymogu. Nowe plany premium/kolejki również go sprawdzają; dawnych zatwierdzonych projektów nie cofamy.

Od Ratusza 6 obok handlu z NPC można sprzedawać materiały graczom za monety. Wybierz materiał, ilość i cenę nie wyższą niż bazowa cena sprzedaży przez NPC; można wystawić taniej. Oferta jest rezerwowana na serwerze i realizowana w całości, z kontrolą miejsca oraz środków. Zwrot po anulowaniu lub wygaśnięciu czeka w trwałej skrzynce, jeśli Magazyn jest pełny. Stare oferty barterowe zachowują literalne warunki; nowe korzystają ze sprzedaży za monety. Bez aktywnego API interfejs wyjaśnia brak połączenia lub oznacza demonstrację, nie udaje rynku.

Od Ratusza matki 10, potem 13, 16, 19 i dalej co trzy poziomy można zakładać kolejne córki, do 20 wysp łącznie. Opcja pojawia się w Ratuszu i powiadomieniu po spełnieniu wymagań. Pierwsza córka kosztuje sumę wszystkich rozbudów Ratusza i Domu 1→7 w sześciu zasobach; następne używają A=8, 9, 10 itd. Matka potrzebuje co najmniej 18 mieszkańców, z czego sześciu rzeczywiście w Domu. Przy założeniu te same osoby teleportują się natychmiast; nie płyną i nie tworzymy ich kopii. Matce zostaje co najmniej 12.

Córka zaczyna od poziomu 1 innych budynków i jednorazowej kopii poziomów Ratusza oraz Magazynu matki. Nie dostaje drugiego darmowego pakietu zasobów. Nazwa ma obowiązkowy prefiks matki, aktualizowany po zmianie jej nazwy; odmienna kolorystyka wyróżnia aktywną wyspę. Późniejszy rozwój jest niezależny, a archipelag i przewozy zachowuje wspólny zapis konta.

Wspólny statek przewozi towary (1000 sztuk / 10 minut) albo pasażerów (100 osób / 30 minut), bez opłaty za rejs w monetach. Pasażerowie muszą być w Domu; przygotowujemy 0,5 żywności na osobę i rezerwujemy wolne łóżka oraz limit populacji u celu. U źródła musi zostać minimum 12 na matce lub 6 na córce. Trybu towarowego i pasażerskiego nie zmieniamy w trakcie podróży.

Przy pełnym docelowym Magazynie zwykły towar czeka na miejsce; bonus zachowuje zwolnienie z limitu. Można dokupić wielokrotności 1000 pojemności towarowej po 4,99 zł, bez automatycznej zmiany limitu pasażerów. W DEV/PRE-PROD zakup jest jawnie symulowany, bez pobrania pieniędzy. Wyspy nie dublują wspólnych uprawnień ani odebranych nagród konta.


## Szczęście, czas i aktywność

Minimum powitalne 20% przez 72 h dotyczy wszystkich. Wymuszone 100% ma pierwszeństwo także dla nowych osób. Po wspólnym końcu Latarnianej premii nowy mieszkaniec wraca do zwykłych zasad wieku; nie otrzymuje dodatkowych 24 h za sam moment przybycia. Koniec ochrony powitalnej nie odejmuje 20 pp ani nie rozlicza ukrytych strat.

Nowa wyspa zaczyna kalendarz od 1 stycznia i godziny Warszawy w momencie zakończenia albo zamknięcia oprowadzania. Przed tym momentem kalendarz i czas symulacji są zatrzymane. Fikcyjna data nie zastępuje prawdziwego czasu konta. W rozpoczętym świecie dzienne odnowienia używają 00:00 Europe/Warsaw, a czas działania efektów pozostaje rzeczywisty. Dodatni przyrost populacji jest ×2; odejścia nie są przyspieszone.

Rzeczywiste sterowanie w aktywnej karcie rozpoczętego świata odnawia na 5 minut produkcję, podatki i transport ×2. Potem działają ×1, a po 48 h bez rzeczywistej gry ×0,5. Nieobecność rozliczamy przedziałami; animacja, odświeżenie sesji i automatyczny zapis nie są działaniem gracza. Po 30 minutach bezczynności pojawia się 30-sekundowe ostrzeżenie, potem wylogowanie. Termin nie zaczyna się od nowa po zamknięciu lub uśpieniu przeglądarki: powrót po jego przekroczeniu wymaga logowania. Rozpoczęty świat nadal działa, a jego zapis nie jest usuwany przez wylogowanie. Rzeczywiste kliknięcia i klawiatura podczas wprowadzenia podtrzymują wyłącznie sesję, nie uruchamiają zegara ani bonusu gospodarki.

## Ekspedycje i propozycje aktywności

Wybierasz kulki lub trójki, również przed następną rundą. Nominalne nagrody rund to50,100,200,400…; łączna pula 50,150,350,750… . Wypłata kończy serię; kontynuacja ryzykuje całą niewypłaconą pulę. Twardy termin kończy rundę; nie ma automatycznego pobierania opłat za przekroczenie czasu. Starsze rozpoczęte serie zachowują własne reguły do końca.

Przed końcem rundy można dobrowolnie dokupić czas. Jawne domyślne parametry wdrożeniowe:30 s za 10 monet, najwyżej dwa zakupy/rundę; potwierdzona reklama 60 s, najwyżej raz/rundę. Reklama wybrana dla czasu zatrzymuje zegar rundy, a nie gospodarkę świata. Nie wskrzesza przegranej. Wcześniejsze wezwanie do obecności po 5 minutach z60 sekundami na odpowiedź nadal chroni serię.

Harmonogram aktywnego czasu jest zapisywany: pierwsza propozycja reklamy w4–8 minucie raz na konto; po jej końcu/pominięciu wybór minigra albo reklama po 5–15 minutach; po zakończeniu tej aktywności kolejny po 43–62; dalsze po 60–100. Ważne okno, trwająca minigra oraz aktywny tutorial/samouczek odkładają propozycję do bezpiecznego momentu. Wcześniejsze zamknięcie któregoś z narzędzi nauki uruchamia dodatkową ochronę 60 aktywnych minut, opisaną wyżej. Nagroda materiałowa reklamy to10–30 każdego z pięciu materiałów, bez monet.

## Premium, płatności i udostępnianie

Uprawnienie bez reklam w standardowej grze wymaga potwierdzonych zakupów brutto co najmniej 1999 gr w ostatnich 30 dniach. Standardowe bonusy są wtedy dostępne bez filmu przy tych samych limitach. Reklamy za dodatkowy czas ekspedycji pozostają. Punkt 4–8 minut automatycznie uruchamia dalszy harmonogram raz; odbiór bonusu nie uruchamia go drugi raz. To odrębne uprawnienie od pakietu budowlanego 24 h za monety.

W opcjach premium budynku jest jedna płatność do tego samego zakupu. Przycisk płatności prowadzi do Paynow lub oznaczonej symulacji. Symulacja działa wyłącznie poza PROD, nie pobiera pieniędzy i nie jest dowodem działającego operatora. Zakupy budynku/transportu za zdobyte monety od Ratusza 4, odrębne zakupy za pieniądze od poziomu 1. Kody mają nagrody i globalne limity rozliczane na serwerze; wpisanie tekstu w przeglądarce nie potwierdza realizacji.

Gracz sam inicjuje i zatwierdza udostępnienie osiągnięcia. Nie publikujemy automatycznie na jego profilu ani stronie gry. Logowanie przez Facebooka nie daje osobistego kanału powiadomień; automatyzacja FB pozostaje odłożona.

## Kaplica, wydarzenia, lojalność i wiadomości

Jedno darmowe błogosławieństwo odnawia się o północy Warszawy bez kumulowania. Płatne/reklamowe współdzielą 4 h blokady od końca poprzedniego takiego efektu. Ręczne efekty się nie nakładają, darmowe użycie nie przesuwa tej blokady.

Od Kaplicy 3 odstęp regularności wynosi 3+poziom Kaplicy dni. Po przekroczeniu losujemy dalsze 6–15 dni do zagrożenia. Dobre wraki pojawiają się co 36–60 h; podczas globalnych 100% jedno dobre zdarzenie może zaczekać, a złe terminy są anulowane i losowane po ochronie. Latarnia nie przywraca dóbr ani osób straconych przed jej aktywacją.

Lojalność pozwala odebrać zapisane 50–200 każdego z sześciu zasobów raz na dzień Warszawy. Seria resetuje się po przerwie; program zamyka się po 10 odebranych nagrodach albo Ratuszu 4. Odbiór nie jest powtarzany po przeładowaniu.

Historia przechowuje do 100 wiadomości. Kategorie kontrolują listę i dzwonek; przycisk usuwania usuwa tylko przeczytane. Ustawienia dźwięku pozostają odłożone; nie obiecujemy przełącznika, którego nie ma.

Po trzech miesiącach kalendarzowych bez rzeczywistej gry świat może zostać usunięty. Konto i historie pozostają; stałe konta PRE-PROD są wyłączone. Ta usługa wymaga aktywacji backendu/retencji. [Szkic regulaminu](TERMS-DRAFT.pl.md) nie jest zatwierdzonym dokumentem sprzedaży.
