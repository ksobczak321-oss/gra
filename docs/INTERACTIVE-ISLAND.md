# Interaktywna wyspa HARBORLIGHT

Stan dokumentu: 2026-10-22. Dotyczy `harborlight-v1-layered.html`. Stan publikacji i wyniki kolejnych sprawdzeń są w [dzienniku implementacji](IMPLEMENTATION-LOG.md).

Bieżący priorytet: frontend, grafika i reguły osady. Dziewięć animacji świata z [FE-04](WORLD-ANIMATION.md) oraz pasek poziomu, szczęścia i populacji z FE-05 są opublikowane i sprawdzone na publicznym Pages. FE-06 dodaje zależność rozbudowy od ratusza, miejsca w domu i spadek szczęścia przy przeludnieniu; potwierdzenie testów i publikacji tej zmiany zapisujemy oddzielnie w dzienniku.

## Co działa

Interaktywny prototyp zachowuje układ i styl zaakceptowanej wyspy i dodaje 54 kontrolki HTML na scenie oraz dodatkowy czytelny pasek i menu na telefonie. Kliknięcie budynku otwiera jego panel, a operacje zmieniają wspólny stan gospodarki. Kontrolki mają etykiety dla czytników ekranu, obsługę klawiatury oraz widoczny fokus. Dialogi dostosowują się do szerokości ekranu.

| Element ekranu | Działanie |
| --- | --- |
| Logo i menu | Podsumowanie wyspy oraz przejście do funkcji gry |
| Koło zębate | Ustawienia animacji, zapis i potwierdzany reset wyspy |
| Pasek zasobów | Wszystkie pięć zasobów, magazyn i przejście do handlu |
| Poziom | Poziom ratusza, limit rozbudowy pozostałych budynków i przejście do rozbudowy ratusza |
| Szczęście | Wartość od −100% do +100% oraz zasady zmiany populacji |
| Liczba mieszkańców | Populacja, teoretyczny limit ratusza, miejsca w domu, przeludnienie i przydział pracowników |
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

Nowa wyspa zaczyna z **100 monet, 100 drewna, 100 kamienia, 100 żywności i 100 desek**, **12 mieszkańcami**, **szczęściem 0%**, **ratuszem na poziomie 1** i **domem na poziomie 1**. W obecnym prototypie oznacza to pierwszą wizytę bez zapisu albo potwierdzone rozpoczęcie nowej wyspy. Logowanie do konta jest przyszłym zakresem backendu; odświeżenie strony zachowuje istniejący postęp.

Poziom gracza jest zawsze poziomem ratusza. **Każdy pozostały budynek można rozbudować najwyżej do poziomu ratusza**, w ramach obecnego maksimum 5. Ratusz sam można podnosić do następnego poziomu. Zablokowana rozbudowa wskazuje wymagany poziom ratusza i nie pobiera zasobów. Latarnia najpierw wymaga dostaw i naprawy do poziomu 1; późniejsze poziomy podlegają tej samej zasadzie co pozostałe budynki.

Teoretyczny limit populacji wynosi `24 × poziom ratusza`: poziomy 1–5 pozwalają na 24, 48, 72, 96 i 120 mieszkańców. Rzeczywista liczba miejsc mieszkalnych wynosi osobno `24 × poziom domu`. Ulepszenie ratusza zwiększa limit osady, ale nie dodaje miejsc w domu. Ulepszenie domu zwiększa miejsca mieszkalne, ale nie zmienia limitu ratusza i nie dodaje od razu ludzi.

| Przykład | Wartość |
| --- | --- |
| Ratusz na poziomie 4 | Poziom gry 4, limit 96 mieszkańców, pozostałe budynki najwyżej na poziomie 4 |
| Dom na poziomie 3 | 72 miejsca mieszkalne |
| Populacja 78 | 6 mieszkańców bez miejsca, mimo wolnego limitu ratusza |
| Skutek przeludnienia | Szczęście spada o 6 punktów procentowych na godzinę aktywnej gry, dopóki liczba osób bez miejsca pozostaje równa 6 |

Populacja może przekroczyć liczbę miejsc mieszkalnych i dalej rosnąć do limitu ratusza, jeżeli szczęście jest dodatnie. **Każda osoba bez miejsca obniża szczęście o 1 punkt procentowy na rzeczywistą godzinę aktywnej gry.** Tempo jest liczone z bieżącego przeludnienia: `max(0, populacja − miejsca mieszkalne)` punktów procentowych na godzinę. Spadek jest płynny, a ułamkowa wartość szczęścia zachowuje się po zapisie i odświeżeniu. Rozbudowa domu do odpowiedniej pojemności zatrzymuje dalszą karę, ale nie zwraca już utraconego szczęścia.

Szczęście jest jedyną wartością gospodarczą dopuszczającą znak ujemny. Zasoby, liczby mieszkańców i pozostałe liczniki pozostają nieujemne. Szczęście jest ograniczone do przedziału **−100%…+100%**. Przy 0% populacja się nie zmienia. Dodatnia wartość zwiększa populację, ujemna zmniejsza ją w tym samym tempie:

| Wartość bezwzględna szczęścia | Czas na zmianę o jedną osobę |
| --- | --- |
| 0% | Brak zmiany |
| 25% | 12 godzin |
| 50% | 6 godzin |
| 75% | Około 1 godziny 43 minut |
| 100% | 1 godzina |

Użytkownik zaakceptował proporcjonalne tempo pomiędzy punktami 0%, 50% i 100%. Dla `h = |szczęście|` liczba osób na godzinę wynosi `h / 300` dla `0 ≤ h ≤ 50` oraz `1/6 + (h − 50) / 60` dla `50 < h ≤ 100`. Znak szczęścia określa kierunek zmiany.

Czas oznacza rzeczywisty czas aktywnej gry na widocznej karcie. Przyspieszenie 1×/2×/4× nie przyspiesza narodzin, ubytku ani kary za przeludnienie; pauza je zatrzymuje. Ukryta karta i czas poza grą nie naliczają postępu. Niepełna część postępu jest zapisywana. Zmiana znaku lub ustawienie 0% zeruje postęp poprzedniego kierunku. Przy maksymalnej populacji nie odkłada się zapas narodzin; przy minimum nie odkłada się ubytek.

Populacja nigdy nie spada poniżej **6 osób**. Po jej spadku przydziały pracowników są ograniczane do liczby mieszkańców, a gracz może dalej rozdzielać pracę, produkować i handlować. Dekoracje i ścieżki podnoszą szczęście o 1 punkt procentowy, rozbudowa kaplicy o 3, a pierwsza naprawa latarni o 10. Przeludnienie obniża szczęście i może doprowadzić do wartości ujemnej, która uruchamia ubytek mieszkańców.

## Jak grać

1. Wybierz budynek produkcyjny i odbierz gotowe towary. Pierwsze partie drewna, żywności i kamienia są dostępne od początku.
2. W mieszkańcach przydziel pracowników. Produkcja działa w cyklach czasu symulacji, a pauza zatrzymuje również produkcję.
3. Najpierw rozbuduj ratusz, aby odblokować kolejny poziom pozostałych budynków. W panelu budynku sprawdź koszt ulepszenia, wybierz rozbudowę i kliknij podświetlone miejsce na mapie. Anulowanie lub blokada poziomu nie pobiera zasobów. Pilnuj poziomu domu: wolny limit ratusza nie zastępuje miejsc mieszkalnych.
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
| `harborlight-v1-state.js` | Czysty silnik: stan, limit rozbudowy ratusza, miejsca mieszkalne, przeludnienie, koszty, produkcja, szczęście, populacja, nagrody i postęp |
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

Klucz `localStorage`: `harborlight-v1-interactive-save`, wersja schematu `version: 3`. Zapis następuje po udanej operacji, okresowo oraz przy opuszczeniu strony. Przycisk „Zapisz teraz” pozwala wymusić zapis. Błąd dostępu do pamięci przeglądarki jest komunikowany graczowi.

Stan zawiera:

- `resources`: monety, drewno, kamień, żywność i deski;
- `buildings`: poziom, pracownicy i produkcja czekająca na odbiór;
- `population`, `capacity`, `happiness` (z zachowaniem części ułamkowej), `populationProgress`, `populationDirection`; miejsca mieszkalne i przeludnienie są wyliczane z domu i populacji;
- `objective`: dostawy i stan latarni;
- `tasks`, `expeditions`, `statistics`: odebrane nagrody i postęp;
- `decorations`, `paths`;
- `day`, `minutes`, `productionSeconds`, `speed`, `paused`;
- `settings` i `lastActionAt`.

`normalizeState()` przywraca brakujące wartości, odrzuca nieprawidłowe liczby oraz ogranicza poziomy, przydziały i ilości. Stare zapisy wersji 1 i 2 zachowują zasoby, poziomy budynków i dotychczasowy postęp. Jeżeli budynek był wyższy niż ratusz, migracja podnosi ratusz do najwyższego posiadanego poziomu, zamiast cofać zakupioną rozbudowę. Przykładowo stary dom na poziomie 2 przy ratuszu 1 zostaje zachowany, a ratusz otrzymuje poziom 2. Migracja nie dodaje mieszkańców ani zasobów.

W zapisach wersji 3 poziomy pozostałych budynków są walidowane względem ratusza. Populacja jest dostosowywana do minimum 6 i teoretycznego limitu; nie obcinamy jej do liczby miejsc mieszkalnych. Nowe wartości startowe nie nadpisują istniejącej wyspy. Pole `capacity` jest wyliczane z ratusza, zamiast przyjmować zapisany limit. Brakujące szczęście przyjmuje wartość 0%, a brakujący postęp populacji zaczyna od zera. Naprawiona latarnia zachowuje osiągnięty poziom 1–5 po odświeżeniu.

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

Sprawdzenie powinno obejmować: nowy start, blokadę rozbudowy powyżej ratusza bez pobrania zasobów, odblokowanie po rozbudowie ratusza, osobne miejsca w domu i limit osady, przykład 96/72/78, płynną karę −6 punktów procentowych na godzinę przy 6 osobach bez miejsca, zachowanie ułamka szczęścia oraz zatrzymanie kary po rozbudowie domu. Odbiór obejmuje też kolejne poziomy latarni i migrację starszych budynków bez ich cofania. Regresja demografii sprawdza dodatnią i ujemną populację dla zaakceptowanych progów, brak zmiany przy 0% bez przeludnienia, minimum 6, zapis i odświeżenie. Regresja gry obejmuje otwarcie kontrolek, odbiór produkcji, koszt rozbudowy, handel, ekspedycję z nagrodą oraz brak ponownego odbioru nagrody. Sprawdź telefon w obu orientacjach, ograniczenie animacji, fokus klawiatury i błędy konsoli. Wyników nie należy uznawać za zaliczone na podstawie samego uruchomienia serwera.

## Granice tej wersji

Scena nadal wykorzystuje wycinki zatwierdzonego obrazu oraz kontrolki i oznaczenia stanu. Poziomy budynków, dodane dekoracje SVG, ulepszone ścieżki i światło naprawionej latarni mają osobne oznaczenia nad bazową grafiką. Nie jest to jeszcze komplet niezależnych grafik terenu, budynków, mieszkańców i efektów. Pełne stany budowy, swobodne rozmieszczanie nowych budynków oraz kamera z pan/zoom pozostają oddzielnymi pracami Frontend. Prototyp ma trzy plansze ekspedycji i uproszczoną gospodarkę.

Warstwa Canvas dodaje obracający się wiatrak, dym z 9 kominów, trzy warstwy chmur, fale i dwie kaskady, 24 chodzące sylwetki mieszkańców, 7 zwierząt, 7 mew oraz pracujące wciągniki na budowie. Sylwetki są obecnie dekoracją świata i nie odwzorowują licznika populacji 1:1. Ruch respektuje pauzę, tempo i ograniczenie animacji; efekty nie blokują kontrolek. Tło świata oczyszczono z nieruchomych postaci i starych smug. Szczegóły assetów i ograniczeń są w [dokumencie animacji świata](WORLD-ANIMATION.md).

Nie ma backendu, logowania, synchronizacji urządzeń ani serwerowej walidacji gospodarki. Prace te są opisane w [backlogu](BACKLOG.md). Nie dodajemy PvP, płatności ani wymuszonych reklam w ramach tej iteracji.
