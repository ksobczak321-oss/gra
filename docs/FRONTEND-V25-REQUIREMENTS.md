# DEV 0.10.1.0 — wspólna liga, prowadzenie po mapie i polszczyzna całej gry

Dodatkowe GO użytkownika rozszerza bieżące prace w DEV o praktyczny samouczek 25 lekcji. Obejmuje też potwierdzone wspólne okno ligi 19:00–21:00 Warszawy dla obu zadań oraz późniejsze rozszerzenie przeglądu polszczyzny na całą grę. PRE-PROD/PROD, reset kont oraz integracja planszówki online pozostają poza zakresem.

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

## Odbiór

Oddzielne przypadki ręczne: [TC51 — mapa i prawdziwe kliknięcie](testing/manual/HL-TC-0051.md) oraz [TC52 — polski wszystkich 25 lekcji](testing/manual/HL-TC-0052.md). Pełny przegląd gry prowadzi [TC53](testing/manual/HL-TC-0053.md). Wyniki ręczne pozostają NOT RUN. Automatyzacja sprawdza wskazanie celu, brak automatycznego otwarcia, przejście do kontrolki i zachowanie historii; nie zastępuje ludzkiej oceny języka.

Rejestr zmian: [HL-CHG-0036](tracking/changes/HL-CHG-0036.md), [HL-CHG-0037](tracking/changes/HL-CHG-0037.md), [HL-CHG-0038](tracking/changes/HL-CHG-0038.md) i [HL-CHG-0932](tracking/changes/HL-CHG-0932.md). Własne lokalne wyniki i CI wymagają dowodów tej poprawki; wcześniejszy odbiór wersji 0.10.0.0 nie jest odbiorem nowego prowadzenia.
