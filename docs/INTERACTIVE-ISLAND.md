# Interaktywna wyspa HARBORLIGHT

Stan dokumentu: 2026-10-21. Dotyczy `harborlight-v1-layered.html`. Stan publikacji i wyniki kolejnych sprawdzeń są w [dzienniku implementacji](IMPLEMENTATION-LOG.md).

## Co działa

Interaktywny prototyp zachowuje zaakceptowane tło wyspy i dodaje rzeczywiste kontrolki HTML: 51 obszarów interakcji na scenie oraz dodatkowe, niepomniejszane menu na telefonie. Kliknięcie budynku otwiera jego panel, a operacje zmieniają wspólny stan gospodarki. Kontrolki mają etykiety dla czytników ekranu, obsługę klawiatury oraz widoczny fokus. Dialogi dostosowują się do szerokości ekranu.

| Element ekranu | Działanie |
| --- | --- |
| Logo i menu | Podsumowanie wyspy oraz przejście do funkcji gry |
| Koło zębate | Ustawienia animacji, zapis i potwierdzany reset wyspy |
| Pasek zasobów | Magazyn, zapasy i przejście do handlu |
| Liczba mieszkańców | Pojemność osady, szczęście i przydział pracowników |
| Zegar, pauza, odtwarzanie, przyspieszenie | Zegar i produkcja; tempo 1×, 2× lub 4× |
| Nawigacja boczna | Wyspa, ekspedycje, zadania, mieszkańcy i mapa dzielnic |
| Główny cel | Dostawy drewna i kamienia oraz naprawa latarni |
| Karta ekspedycji | Wybór jednej z trzech rozgrywalnych plansz |
| Budynki na mapie i karty dolnego doku | Szczegóły, koszty i wybór miejsca rozbudowy |
| Statek i przystań | Kupno i sprzedaż towarów |
| Most, plaża i wodospad | Ścieżki, mosty i dekoracje |
| Kategorie dolnego doku | Budynki, produkcja, dekoracje i ścieżki |

Silnik obsługuje dom, farmę, tartak, kamieniołom, przystań, magazyn, latarnię, obóz drwali, młyn, ratusz, kaplicę i targ. Budynki produkcyjne zatrudniają pracowników; brak wolnych mieszkańców, surowców lub miejsca na produkcję ogranicza wykonanie operacji.

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
| `harborlight-v1-state.js` | Czysty silnik: stan, walidacja, koszty, produkcja, nagrody i postęp |
| `tests/harborlight-state.test.mjs` | Testy reguł gospodarki i normalizacji zapisu |
| `tests/harborlight-browser-smoke.py` | Regresja całej gry przez rzeczywiste kliknięcia w Chromium |

## Zapis

Klucz `localStorage`: `harborlight-v1-interactive-save`, wersja schematu `version: 1`. Zapis następuje po udanej operacji, okresowo oraz przy opuszczeniu strony. Przycisk „Zapisz teraz” pozwala wymusić zapis. Błąd dostępu do pamięci przeglądarki jest komunikowany graczowi.

Stan zawiera:

- `resources`: monety, drewno, kamień, żywność i deski;
- `buildings`: poziom, pracownicy i produkcja czekająca na odbiór;
- `population`, `capacity`, `happiness`;
- `objective`: dostawy i stan latarni;
- `tasks`, `expeditions`, `statistics`: odebrane nagrody i postęp;
- `decorations`, `paths`;
- `day`, `minutes`, `productionSeconds`, `speed`, `paused`;
- `settings` i `lastActionAt`.

`normalizeState()` przywraca brakujące wartości, odrzuca nieprawidłowe liczby oraz ogranicza poziomy, przydziały i ilości. Operacje nie pozwalają odebrać tej samej nagrody ponownie po odświeżeniu. To ochrona integralności prototypu, a nie zabezpieczenie przed świadomą edycją stanu przez właściciela przeglądarki. Zapis nie jest kontem użytkownika ani kopią w chmurze. Usunięcie danych witryny usuwa postęp.

## Sprawdzanie zmian

Uruchomienie z katalogu repozytorium:

```sh
python3 -m http.server 8002 --bind 127.0.0.1
node --test tests/harborlight-state.test.mjs
python3 tests/harborlight-browser-smoke.py
```

Test przeglądarkowy wymaga Python Playwright i Chromium (domyślnie `/usr/bin/chromium`). Serwer musi działać w osobnym terminalu. Inny port/adres oraz Chromium ustawia się przez `HARBORLIGHT_BASE_URL` i `HARBORLIGHT_CHROMIUM`.

Sprawdzenie w przeglądarce powinno obejmować: otwarcie każdej głównej kontrolki, odbiór produkcji, koszt rozbudowy, handel, dostawy i naprawę latarni, ekspedycję z nagrodą, zapis po odświeżeniu oraz brak ponownego odbioru nagrody. Sprawdź też telefon w pionie i poziomie, ograniczenie animacji, fokus klawiatury i błędy konsoli. Wyników nie należy uznawać za zaliczone na podstawie samego uruchomienia serwera.

## Granice tej wersji

Scena nadal wykorzystuje wycinki zatwierdzonego obrazu oraz kontrolki i oznaczenia stanu. Poziomy budynków, dodane dekoracje SVG, ulepszone ścieżki i światło naprawionej latarni mają osobne oznaczenia nad bazową grafiką. Nie jest to jeszcze komplet niezależnych grafik terenu, budynków, mieszkańców i efektów. Pełne stany budowy, swobodne rozmieszczanie nowych budynków oraz kamera z pan/zoom pozostają oddzielnymi pracami Frontend. Prototyp ma trzy plansze ekspedycji i uproszczoną gospodarkę.

Nie ma backendu, logowania, synchronizacji urządzeń ani serwerowej walidacji gospodarki. Prace te są opisane w [backlogu](BACKLOG.md). Nie dodajemy PvP, płatności ani wymuszonych reklam w ramach tej iteracji.
