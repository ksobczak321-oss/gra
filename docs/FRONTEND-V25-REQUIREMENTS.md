# DEV 0.10.1.0 — wspólna liga, prowadzenie po mapie i polszczyzna całej gry

Dodatkowe GO użytkownika rozszerza bieżące prace w DEV o praktyczny samouczek 25 lekcji. Obejmuje też potwierdzone wspólne okno ligi 19:00–21:00 Warszawy dla obu zadań oraz późniejsze rozszerzenie przeglądu polszczyzny na całą grę. Początkowo zakres dotyczył wyłącznie DEV; późniejsza dyspozycja upoważnia do promocji PRE-PROD po testach i zielonym CI dokładnego nowego źródła. PROD, reset kont oraz integracja planszówki online pozostają poza tą promocją.

## Zlecenie użytkownika

Użytkownik chce mocniejszego wskazywania kolejnego działania: zamiast automatycznie otwierać budynek drwala, zadanie ma najpierw polecić odnalezienie go na mapie. Budynek zaczyna migać, miejsce kliknięcia pozostaje podświetlone, a dopiero faktyczne kliknięcie gracza prowadzi do budynku i dodania obsady. Prosi też o naturalniejsze tłumaczenia polskie, z poprawną odmianą i zasadami języka.

## Wymagane zachowanie

- Dla lekcji związanej z budynkiem prowadzenie zaczyna się na mapie: znajdź wskazany budynek → kliknij go → wykonaj opisaną czynność. Samo przejście do lekcji nie otwiera automatycznie okna docelowego budynku.
- Właściwy budynek i rzeczywiste miejsce kliknięcia są wyraźnie wskazane. Po kliknięciu mapa przekazuje prowadzenie do odpowiedniej kontrolki w oknie, np. dodania pracownika, przycisku „Więcej o budynku” otwierającego szczegóły oraz priorytetów. Podpowiedź opisuje widoczny kolejny krok, nie ukrytą jeszcze kontrolkę.
- Gracz wykonuje działania sam. Animacja, podświetlenie, zamknięcie podpowiedzi i samo obejrzenie okna nie przydzielają pracownika, nie ulepszają budynku i nie przyznają nagrody.
- Zamknięcie lub ponowne otwarcie okna, przełączenie języka i zmiana aktualnej lekcji nie pozostawiają wskaźnika na nieaktualnym celu. Prowadzenie ma być czytelne na komputerze i telefonie.
- Przy systemowym ograniczeniu ruchu lub wyłączonych animacjach pozostaje czytelne statyczne wyróżnienie. To sposób zapewnienia dostępności, a nie nowa decyzja użytkownika zmieniająca zasady gry.

## Język polski i zachowanie historii

Przegląd obejmuje tytuły i opisy wszystkich 25 praktycznych lekcji, ich wskazówki, nazwy czynności i komunikaty związane z przejściem do działania. Tekst ma być naturalny, poprawnie odmieniony i zgodny z nazwami budynków oraz przycisków rzeczywiście obecnych w interfejsie. Instrukcja ma wyjaśniać kolejność działań, zamiast kopiować techniczną nazwę zdarzenia.

Identyfikatory lekcji, warunki zaliczenia, kolejność, nagrody, reguły automatycznego pomijania już wykonanych działań oraz historia odebranych premii pozostają zachowane. To zmiana prowadzenia i tekstu, nie nowy program nauki ani zmiana gospodarki. Ponowne objaśnianie nie resetuje wyspy i nie zamienia samouczka praktycznego w pierwsze oprowadzanie przed startem czasu.

## Późniejsze rozszerzenie: polszczyzna całej gry

Użytkownik doprecyzował, że uwaga o tłumaczeniach dotyczy nie tylko samouczka, lecz wszystkiego w grze. Przegląd polskiej wersji obejmuje zatem pierwsze wejście, rejestrację i logowanie, HUD i mapę, budynki i gospodarkę, mieszkańców, Kaplicę i zdarzenia, zadania, ekspedycje i reklamy, symulacje płatności, archipelag i rynek, Pomoc/Ustawienia oraz sojusze, ligę, wiadomości i dobroczynność.

Przegląd obejmuje teksty stałe i dynamiczne: opisy, tytuły, przyciski, wskazówki, potwierdzenia, odmowy, stany zapisu/sesji i powiadomienia. W języku PL komunikat ma być naturalny i wskazywać zrozumiałą przyczynę oraz dalszy krok. Nie może pozostawiać angielskiego zdania ani surowego klucza zasobu w miejscu opisu dla gracza. Sprawdzamy odmianę, liczbę i zgodność nazw z rzeczywistymi elementami. Nazwy własne dostawców, wybrane przez gracza nazwy i jego wiadomości pozostają jego treścią; nie tłumaczymy ich automatycznie.

To rozszerzenie tekstowe nie zmienia cen, czasów, limitów, kwalifikacji monet, punktacji, historii ani warunków dostępu. Automatyczny skan może wykryć brak tłumaczenia, ale nie potwierdza sam poprawnej polszczyzny wszystkich stanów. Zakres i rzeczywiste wyniki opisuje [POLISH-REVIEW-v25.md](POLISH-REVIEW-v25.md).

Po pierwszym podglądzie użytkownik doprecyzował, że chodzi także o przyjazny sposób pisania, np. w opisach budynków. Dalsza redakcja obejmuje 12 krótkich opisów celu, 12 pełnych opisów oraz główne instrukcje mieszkańców, magazynu, produkcji, szczęścia, żywienia i ochrony powitalnej. Tekst ma wyjaśniać wprost, co można zrobić i po co, zamiast jedynie zastępować angielskie słowa. Liczby, warunki i nazwy faktycznych przycisków pozostają bez zmian.

## Poprawka po CI i warunki promocji

Pierwszy podgląd aplikacji `b1cd650da1c9d669ebce4a77bee81ebfd87ccbc9` ma opublikowane Pages 41244467250 (SUCCESS, 41 s), ale jego CI 41244467302 zakończyło się FAIL. Historyczna podpowiedź z trzema przyciskami ściskała opis do zerowej szerokości i mogła wychodzić poza ekran. [HL-CHG-0933](tracking/changes/HL-CHG-0933.md) obejmuje zawijanie treści oraz test rzeczywistych wymiarów panelu, tekstu i przycisków na komputerze i telefonie. Pierwsze lokalne wyniki nie są sukcesem tego nieudanego CI ani odbiorem dalszej redakcji tekstu.

[HL-CHG-0934](tracking/changes/HL-CHG-0934.md) zapisuje późniejsze GO na PRE-PROD. Bridge dopuszcza dokładny znacznik `[preprod:0.10.1.0]` obok historycznej wersji 0.9.1.2; nie oznacza to etykiety pilnej zmiany ani ominięcia CI. Nowy kod wymaga nowego SHA, własnego zielonego CI i odbioru opublikowanej gry. Nie resetujemy kont, wysp ani historii.

Przed publikacją trzeba ustalić rzeczywisty tryb zapisu. W bezpośrednim Firestore nowy klient zapisuje `schemaVersion=2` również dla jednej wyspy, więc aktywne reguły muszą przyjmować formaty 1 i 2 oraz dokumenty córek. Właściciel przekazał [sukces przygotowania zgodnych reguł i istniejących kont](PREPROD-V25-PREPARATION.md), bez resetu i bez publikacji gry. Zwykły workflow publikuje Hosting, bez reguł bazy. API obsługuje odczyt starych zapisów i rozdziela dokumenty dopiero przy kolejnym zapisie; potrzebuje istniejących uprawnień runtime do Firestore. Nie ma wymogu resetowania ani hurtowej migracji starych wysp. Odczytowy test hostingu blokuje mutacje, dlatego zapis i ponowne wczytanie trzeba potwierdzić odrębnie po wdrożeniu.

## Odbiór

Oddzielne przypadki ręczne: [TC51 — mapa i prawdziwe kliknięcie](testing/manual/HL-TC-0051.md) oraz [TC52 — polski wszystkich 25 lekcji](testing/manual/HL-TC-0052.md). Pełny przegląd gry prowadzi [TC53](testing/manual/HL-TC-0053.md). Wyniki ręczne pozostają NOT RUN. Automatyzacja sprawdza wskazanie celu, brak automatycznego otwarcia, przejście do kontrolki i zachowanie historii; nie zastępuje ludzkiej oceny języka.

Rejestr zmian: [HL-CHG-0036](tracking/changes/HL-CHG-0036.md), [HL-CHG-0037](tracking/changes/HL-CHG-0037.md), [HL-CHG-0038](tracking/changes/HL-CHG-0038.md) i [HL-CHG-0932](tracking/changes/HL-CHG-0932.md). Własne lokalne wyniki i CI wymagają dowodów tej poprawki; wcześniejszy odbiór wersji 0.10.0.0 nie jest odbiorem nowego prowadzenia.

Końcowy nowy pakiet po dalszej redakcji i poprawce układu ma lokalnie **898 Node + 141 Python + 18 zestawów Chromium PASS**. Ponowny przegląd 112 rzeczywistych widoków zakończył się bez wykrytych angielskich elementów i błędu wykonania. Kurs historyczny v18 obejmuje cztery warianty, w tym geometrię 360×640. Cache `frontend-v25-2`; źródło `353faad347262dce7c3632fdf7c71be124384ab1` ma własne CI 41246449612 SUCCESS (3 min 54 s), Pages 41246449682 SUCCESS (31 s) oraz [promocję PRE-PROD 41246771480](https://github.com/ksobczak321-oss/gra/actions/runs/41246771480), próba 1, SUCCESS (2 min 05 s). Bridge 41246756848 ma SUCCESS (15 s); tag DEV `dev-0.10.1.0-20261031` jest opublikowany. Gra: https://harborlight-dev.web.app.

Wewnętrznego ZIP receipt ani aktywacji API nie odczytano niezależnie. Sam sukces wdrożenia nie potwierdza osobnego testu autosave na rzeczywistym koncie. Wszystkie 53 ręczne przypadki nadal są NOT RUN; nie resetowano kont i nie promowano PROD.
