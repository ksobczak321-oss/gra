# Pakiet GO — frontend v17

Status: implementacja i odbiór lokalny ukończone — 486/486 testów modelu, pięć grup Chromium v17 oraz regresja siedmiu grup v16 PASS. Poniższe dziewięć wymagań zbiera uwagi po v16 zatwierdzone poleceniem „GO” 30 października 2026. Wyniki testów oraz odrębny stan publikacji zawiera [dziennik](IMPLEMENTATION-LOG.md); wcześniejsze wyniki v15/v16 nie potwierdzają tego pakietu.

## Uzgodnione zmiany

| ID | Wymaganie | Kryterium odbioru |
|---|---|---|
| V17-01 | Równe kolumny budynku | W głównej karcie budynku górna krawędź prawej kolumny z „Rozbudową budynku” jest na tej samej wysokości co lewa kolumna ze statystykami. Układ zachowuje czytelność i widoczność najważniejszych działań na komputerze. |
| V17-02 | Cała plansza trójek | Wszystkie 24–120 kart mieszczą się w przeznaczonym miejscu bez pionowego i poziomego suwaka ani obcięcia. Liczba kolumn i wielkość pól dopasowują się do dostępnego okna na komputerze i telefonie; dopasowanie nie zmienia układu gry, odkrytych kart, czasu ani liczby ruchów. |
| V17-03 | Gracz wybiera minigrę | Rozpoczynając ekspedycję gracz wybiera kulki albo trójki. Wybór jest zapisany i domyślny przy kontynuacji, a przed kolejną rundą można wybrać drugi rodzaj. Rozpoczęta plansza i dawne zapisane serie trasowe zachowują swoje zasady oraz postęp. |
| V17-04 | Wyraźne wycofanie tragarzy | Po udanym zmniejszeniu obsady Magazynu czytelny popup wyjaśnia wycofanie i dokończenie rozpoczętych kursów. Licznik od razu pokazuje planowaną zmianę, np. `5 (−2)`; tragarz z ładunkiem nadal kończy dostawę, potem wraca 5 minut do domu i dopiero wtedy jest wolny. |
| V17-05 | Menu wewnątrz ramki | Przyciski menu wyspy, w tym „Magazyn” i „Handel”, nie nachodzą na dolną ramkę i nie są obcinane. Układ oraz odstęp od ramki pozostają poprawne również po przewinięciu na małym ekranie. |
| V17-06 | Smutna ikona przestoju | Nad budynkiem z aktywną karą za przestój produkcji pojawia się smutna buźka. Obejmuje brak wejściowego zasobu i brak miejsca na produkt, a znika po ustaniu kary; sam brak pracowników nie jest taką karą. |
| V17-07 | Bez logowania w Ustawieniach | Ustawienia w grze nie zawierają przycisku „Zaloguj się lub załóż konto”. Oddzielne formularze rejestracji i logowania zachowują dotychczasowy zakres prototypu; ta poprawka nie tworzy prawdziwej usługi kont. |
| V17-08 | Bez powrotu w minigrze | Ekran minigry nie pokazuje strzałki powrotu w lewym górnym rogu. Dotychczasowe wyjście z próby i zamknięcie nadal respektują potwierdzenie utraty puli albo jej wypłatę po wygranej. |
| V17-09 | Przycisk reklamy w obu grach | W prawej kolumnie pod opuszczeniem próby jest „Obejrzyj reklamę”, zarówno dla kulek, jak i trójek. Otwiera informację o planowanej reklamie nagradzanej; dodatkowy czas, premia i limity pozostają do ustalenia, więc niczego nie przyznaje i nie zatrzymuje zwykłego zegara. Nie wywołuje sieci reklamowej ani nie pozoruje obejrzenia reklamy. |

## Zachowane zasady

- Wybrany typ dotyczy kolejnej rozpoczynanej rundy; nie podmienia aktywnej planszy. Parametry etapów, twardy limit czasu, potrącenie nagrody według czasu, obecność, ryzyko całej niewypłaconej puli i wypłata pozostają takie jak w v16.
- Komunikat i licznik wycofania pokazują istniejące fazy transportu oraz powrotu; nie usuwają ładunku i nie udostępniają osoby przed powrotem. Zmiana obsady nadal przelicza ETA budów według wcześniejszych zasad.
- Smutna buźka wynika z rzeczywistej aktywnej kary modelu, a nie samego czasu bez nowej sztuki produktu. Powiadomienia o przestoju i istniejące wartości kar pozostają zachowane.
- Zapisy, nazwa wyspy, 25 lekcji i skrzynie samouczka, kwoty Share, produkcja i ładowność, drogi oraz sześciogodzinne atrakcje zachowują swoje reguły. Zmiana cache na `frontend-v17` nie resetuje postępu ani nie odnawia testowego grantu.

## Zakres odłożony i archiwum

Użytkownik wycofał uwagę o miniaturze Portu, bo pochodziła ze starego zrzutu. Ta uwaga nie jest zadaniem v17.

Prowadzenie Facebooka, zatwierdzane posty i komentarze, kody promocyjne, logo na koszulkę i planszowa gra 2–4-osobowa z AR pozostały rozmową o przyszłości. Analiza infrastruktury i kosztów nie oznacza zakupu usług ani uruchomienia backendu. Zasady nagród reklamowych, kwoty lojalności i prawdziwe integracje nadal wymagają oddzielnego ustalenia.

[Excel 10](arkusze/HARBORLIGHT10-zasady.xlsx) pozostaje niezmienionym archiwum v16, łącznie z dawnym losowaniem rodzaju gry; nie jest bieżącym opisem wyboru minigry v17. W tym pakiecie użytkownik nie zamawiał nowego arkusza. Aktualny opis stanowią te wymagania, [reguły gospodarki](ECONOMY-RULES.md), [budynki](BUILDINGS.md) i [instrukcja](INTERACTIVE-ISLAND.md).
