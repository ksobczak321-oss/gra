# Interaktywna wyspa HARBORLIGHT

Stan dokumentu: 2026-10-21. Dotyczy `harborlight-v1-layered.html`. Stan publikacji i wyniki kolejnych sprawdzeń są w [dzienniku implementacji](IMPLEMENTATION-LOG.md).

Bieżący priorytet: frontend, grafika i reguły osady. Dziewięć animacji świata z [FE-04](WORLD-ANIMATION.md) jest opublikowanych. Nowy pasek poziomu, szczęścia i populacji z FE-05 przeszedł testy lokalne; wyniki publikacji zapisujemy oddzielnie w dzienniku.

## Co działa

Interaktywny prototyp zachowuje układ i styl zaakceptowanej wyspy i dodaje rzeczywiste kontrolki HTML oraz dodatkowe, niepomniejszane menu na telefonie. Kliknięcie budynku otwiera jego panel, a operacje zmieniają wspólny stan gospodarki. Kontrolki mają etykiety dla czytników ekranu, obsługę klawiatury oraz widoczny fokus. Dialogi dostosowują się do szerokości ekranu.

| Element ekranu | Działanie |
| --- | --- |
| Logo i menu | Podsumowanie wyspy oraz przejście do funkcji gry |
| Koło zębate | Ustawienia animacji, zapis i potwierdzany reset wyspy |
| Pasek zasobów | Wszystkie pięć zasobów, magazyn i przejście do handlu |
| Poziom | Poziom ratusza oraz przejście do jego rozbudowy |
| Szczęście | Wartość od −100% do +100% oraz zasady zmiany populacji |
| Liczba mieszkańców | Populacja, limit wyznaczony przez ratusz i przydział pracowników |
| Zegar, pauza, odtwarzanie, przyspieszenie | Zegar i produkcja; tempo 1×, 2× lub 4× |
| Nawigacja boczna | Wyspa, ekspedycje, zadania, mieszkańcy i mapa dzielnic |
| Główny cel | Dostawy drewna i kamienia oraz naprawa latarni |
| Karta ekspedycji | Wybór jednej z trzech rozgrywalnych plansz |
| Budynki na mapie i karty dolnego doku | Szczegóły, koszty i wybór miejsca rozbudowy |
| Statek i przystań | Kupno i sprzedaż towarów |
| Most, plaża i wodospad | Ścieżki, mosty i dekoracje |
| Kategorie dolnego doku | Budynki, produkcja, dekoracje i ścieżki |

Silnik obsługuje dom, farmę, tartak, kamieniołom, przystań, magazyn, latarnię, obóz drwali, młyn, ratusz, kaplicę i targ. Budynki produkcyjne zatrudniają pracowników; brak wolnych mieszkańców, surowców lub miejsca na produkcję ogranicza wykonanie operacji.

## Start, poziom i szczęście

Nowa wyspa zaczyna z **100 monet, 100 drewna, 100 kamienia, 100 żywności i 100 desek**, **12 mieszkańcami**, **szczęściem 0%** oraz **poziomem 1**. W obecnym prototypie oznacza to pierwszą wizytę bez zapisu albo potwierdzone rozpoczęcie nowej wyspy. Logowanie do konta jest przyszłym zakresem backendu; odświeżenie strony zachowuje istniejący postęp.

Poziom gracza jest zawsze poziomem ratusza. Maksymalna populacja wynosi `24 × poziom ratusza`: poziomy 1–5 pozwalają na 24, 48, 72, 96 i 120 mieszkańców. Ulepszenie domu nie zwiększa tego limitu i nie dodaje od razu ludzi.

Szczęście jest jedyną wartością gospodarczą dopuszczającą znak ujemny. Zasoby, liczby mieszkańców i pozostałe liczniki pozostają nieujemne. Szczęście jest ograniczone do przedziału **−100%…+100%**. Przy 0% populacja się nie zmienia. Dodatnia wartość zwiększa populację, ujemna zmniejsza ją w tym samym tempie:

| Wartość bezwzględna szczęścia | Czas na zmianę o jedną osobę |
| --- | --- |
| 0% | Brak zmiany |
| 25% | 12 godzin |
| 50% | 6 godzin |
| 75% | Około 1 godziny 43 minut |
| 100% | 1 godzina |

Użytkownik zaakceptował proporcjonalne tempo pomiędzy punktami 0%, 50% i 100%. Dla `h = |szczęście|` liczba osób na godzinę wynosi `h / 300` dla `0 ≤ h ≤ 50` oraz `1/6 + (h − 50) / 60` dla `50 < h ≤ 100`. Znak szczęścia określa kierunek zmiany.

Czas oznacza rzeczywisty czas aktywnej gry na widocznej karcie. Przyspieszenie 1×/2×/4× nie przyspiesza narodzin ani ubytku; pauza je zatrzymuje. Ukryta karta i czas poza grą nie naliczają postępu. Niepełna część postępu jest zapisywana. Zmiana znaku lub ustawienie 0% zeruje postęp poprzedniego kierunku. Przy maksymalnej populacji nie odkłada się zapas narodzin; przy minimum nie odkłada się ubytek.

Populacja nigdy nie spada poniżej **6 osób**. Po jej spadku przydziały pracowników są ograniczane do liczby mieszkańców, a gracz może dalej rozdzielać pracę, produkować i handlować. Dekoracje i ścieżki podnoszą szczęście o 1 punkt, rozbudowa kaplicy o 3, a naprawa latarni o 10. Ta zmiana obsługuje ujemne szczęście, ale nie dodaje nowych zdarzeń, które je obniżają.

## Jak grać

1. Wybierz budynek produkcyjny i odbierz gotowe towary. Pierwsze partie drewna, żywności i kamienia są dostępne od początku.
2. W mieszkańcach przydziel pracowników. Produkcja działa w cyklach czasu symulacji, a pauza zatrzymuje również produkcję.
3. W panelu budynku sprawdź koszt ulepszenia, wybierz rozbudowę i kliknij podświetlone miejsce na mapie. Anulowanie nie pobiera zasobów.
4. W głównym celu dostarczaj materiały do latarni partiami po maksymalnie 10 sztuk. Potrzeba łącznie 50 drewna i 30 kamienia; początkowy postęp to 20/50 i 12/30.
5. Po dostawach napraw latarnię za 300 monet i 30 desek. Odbierz nagrodę w zadaniach.
6. Rozwiązuj ekspedycje: przejdź z obozu `S` do celu `G`, używając ograniczonych narzędzi. Nagroda za każdą planszę jest przyznawana raz. Skrzynie `C` dają dodatkowo po 10 monet przy pierwszym ukończeniu.

Przykładowe operacje gospodarcze:

| Operacja | Zmiana zasobów |
| --- | --- |
| Przetwarzanie w tartaku | 10 drewna → 6 desek |
| Przetwarzanie w młynie | 4 żywności + 2 monety → 10 żywności |
| Sprzedaż 10 drewna / kamienia / żywności / desek | +30 / +40 / +20 / +60 monet |
| Zakup 10 drewna / kamienia / żywności / desek | −60 / −80 / −40 / −120 monet |
| Kwiaty / lampa / ławka | −25 / −40 / −35 monet i +1 szczęścia, maksymalnie 100% |
| Ulepszenie ścieżek | −5 drewna, −10 kamienia i +1 szczęścia |

Koszty kolejnych poziomów budynków rosną wraz z poziomem. Źródłem aktualnych liczb jest `BUILDINGS` w `harborlight-v1-state.js`; interfejs korzysta z tych samych danych.

## Pliki i podział odpowiedzialności

| Plik | Odpowiedzialność |
| --- | --- |
| `harborlight-v1-layered.html` | Scena 1672×941, dziewięć wycinków obrazu, dialog i punkty montażu interfejsu |
| `assets/harborlight-v1-approved.png` | Oryginalny zaakceptowany PNG, bez zmiany pikseli |
| `harborlight-v1-play.js` | Obszary kliknięć, panele, HUD, plansze ekspedycji i zapis przeglądarkowy |
| `harborlight-v1-play.css` | Interakcje, fokus, dialogi, plansze, układ mobilny i ograniczenie ruchu |
| `harborlight-v1-state.js` | Czysty silnik: stan, walidacja, koszty, produkcja, szczęście, populacja, nagrody i postęp |
| `harborlight-v1-ambient.js` | Osobna warstwa Canvas, wspólny czas, wiatrak, chmury i budowa |
| `harborlight-v1-smoke.js` | Emisja i cykl życia kłębów dymu z 9 kominów |
| `harborlight-v1-inhabitants.js` | Oczyszczone tło świata bez nieruchomych ludzi i starych smug |
| `harborlight-v1-water.js` | Maskowana animacja morza, fal i dwóch wodospadów |
| `harborlight-v1-life.js` | Ruch mieszkańców, zwierząt i mew |
| `tests/harborlight-state.test.mjs` | Testy reguł gospodarki i normalizacji zapisu |
| `tests/harborlight-browser-smoke.py` | Regresja całej gry przez rzeczywiste kliknięcia w Chromium |
| `tests/harborlight-population-smoke.py` | Nowy HUD, start, rzeczywisty licznik czasu, ujemne szczęście i migracja zapisów |
| `tests/harborlight-animation-smoke.py` | Ruch grup efektów, maski interfejsu i zatrzymywanie animacji |

## Zapis

Klucz `localStorage`: `harborlight-v1-interactive-save`, wersja schematu `version: 2`. Zapis następuje po udanej operacji, okresowo oraz przy opuszczeniu strony. Przycisk „Zapisz teraz” pozwala wymusić zapis. Błąd dostępu do pamięci przeglądarki jest komunikowany graczowi.

Stan zawiera:

- `resources`: monety, drewno, kamień, żywność i deski;
- `buildings`: poziom, pracownicy i produkcja czekająca na odbiór;
- `population`, `capacity`, `happiness`, `populationProgress`, `populationDirection`;
- `objective`: dostawy i stan latarni;
- `tasks`, `expeditions`, `statistics`: odebrane nagrody i postęp;
- `decorations`, `paths`;
- `day`, `minutes`, `productionSeconds`, `speed`, `paused`;
- `settings` i `lastActionAt`.

`normalizeState()` przywraca brakujące wartości, odrzuca nieprawidłowe liczby oraz ogranicza poziomy, przydziały i ilości. Stare zapisy wersji 1 zachowują zasoby, budynki i dotychczasowy postęp; populacja jest dostosowywana do minimum 6 i limitu ratusza. Nowe wartości startowe nie nadpisują istniejącej wyspy. Pole `capacity` jest wyliczane z ratusza, zamiast przyjmować zapisany limit. Brakujące szczęście przyjmuje wartość 0%, a nowy postęp populacji zaczyna od zera.

Operacje nie pozwalają odebrać tej samej nagrody ponownie po odświeżeniu. To ochrona integralności prototypu, a nie zabezpieczenie przed świadomą edycją stanu przez właściciela przeglądarki. Zapis nie jest kontem użytkownika ani kopią w chmurze. Usunięcie danych witryny usuwa postęp.

## Sprawdzanie zmian

Uruchomienie z katalogu repozytorium:

```sh
python3 -m http.server 8002 --bind 127.0.0.1
node --test tests/harborlight-state.test.mjs
python3 tests/harborlight-browser-smoke.py
python3 tests/harborlight-population-smoke.py
python3 tests/harborlight-animation-smoke.py
```

Test przeglądarkowy wymaga Python Playwright i Chromium (domyślnie `/usr/bin/chromium`). Serwer musi działać w osobnym terminalu. Inny port/adres oraz Chromium ustawia się przez `HARBORLIGHT_BASE_URL` i `HARBORLIGHT_CHROMIUM`.

Sprawdzenie powinno obejmować: nowy start, powiązanie poziomu i limitu z ratuszem, dodatnią i ujemną populację dla zaakceptowanych progów, brak zmiany przy 0%, minimum 6, zachowanie niepełnego postępu po odświeżeniu i migrację starego zapisu. Regresja obejmuje też otwarcie kontrolek, odbiór produkcji, koszt rozbudowy, handel, latarnię, ekspedycję z nagrodą oraz brak ponownego odbioru nagrody. Sprawdź telefon w obu orientacjach, ograniczenie animacji, fokus klawiatury i błędy konsoli. Wyników nie należy uznawać za zaliczone na podstawie samego uruchomienia serwera.

## Granice tej wersji

Scena nadal wykorzystuje wycinki zatwierdzonego obrazu oraz kontrolki i oznaczenia stanu. Poziomy budynków, dodane dekoracje SVG, ulepszone ścieżki i światło naprawionej latarni mają osobne oznaczenia nad bazową grafiką. Nie jest to jeszcze komplet niezależnych grafik terenu, budynków, mieszkańców i efektów. Pełne stany budowy, swobodne rozmieszczanie nowych budynków oraz kamera z pan/zoom pozostają oddzielnymi pracami Frontend. Prototyp ma trzy plansze ekspedycji i uproszczoną gospodarkę.

Warstwa Canvas dodaje obracający się wiatrak, dym z 9 kominów, trzy warstwy chmur, fale i dwie kaskady, 24 chodzące sylwetki mieszkańców, 7 zwierząt, 7 mew oraz pracujące wciągniki na budowie. Sylwetki są obecnie dekoracją świata i nie odwzorowują licznika populacji 1:1. Ruch respektuje pauzę, tempo i ograniczenie animacji; efekty nie blokują kontrolek. Tło świata oczyszczono z nieruchomych postaci i starych smug. Szczegóły assetów i ograniczeń są w [dokumencie animacji świata](WORLD-ANIMATION.md).

Nie ma backendu, logowania, synchronizacji urządzeń ani serwerowej walidacji gospodarki. Prace te są opisane w [backlogu](BACKLOG.md). Nie dodajemy PvP, płatności ani wymuszonych reklam w ramach tej iteracji.
