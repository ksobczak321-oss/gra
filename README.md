# HARBORLIGHT

Spokojna gra o rozwoju wyspy: rozwiązuj ekspedycje, zdobywaj materiały i odbuduj latarnię. Repozytorium zawiera statyczny prototyp przeglądarkowy w HTML, CSS i JavaScript, bez zależności do instalowania i bez backendu.

Reguły rozwijanej osady: poziom ratusza wyznacza poziom gry, maksymalną rozbudowę pozostałych budynków i teoretyczny limit mieszkańców (`24 × poziom ratusza`). Dom daje osobno `24 × poziom domu` miejsc mieszkalnych. Każda osoba bez miejsca obniża szczęście o 1 punkt procentowy na godzinę aktywnej gry; szczęście od −100% do +100% steruje wzrostem lub spadkiem populacji. Nowa wyspa zaczyna z ratuszem i domem na poziomie 1, 12 mieszkańcami, szczęściem 0% i po 100 każdego zasobu.

Pracowników można przydzielać do ośmiu miejsc pracy, najwyżej do połowy aktualnej populacji na budynek i bez podwójnych przydziałów. Każdy przydzielony pracownik daje 1 monetę podatku na godzinę aktywnej gry; bezrobotni nie płacą podatku. Szczegóły czasu, limitów i migracji zapisu opisano w [instrukcji prototypu](docs/INTERACTIVE-ISLAND.md); stan wdrożenia jest w dzienniku.

Rozbudowa ma rezerwację, transport i czas budowy, z limitem miejsc oraz kolejką zależnymi od ratusza. Targ wymienia towary bez monet; kaplica i latarnia dają czasowe premie. Model przyszłego płatnego pakietu obsługuje +4 budowy i plany z dostaw, bez uruchamiania sprzedaży. Wszystkie zaakceptowane reguły i ocenę kosztu latarni zapisano w [regułach gospodarki](docs/ECONOMY-RULES.md).

## Podgląd

- [Interaktywna wyspa — adres GitHub Pages](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html)
- [Zaakceptowany wzorzec wizualny](https://ksobczak321-oss.github.io/gra/harborlight-v1-screen.html)

Adres publiczny wskazuje ostatnią udaną publikację `main`. Stan bieżących prac i ich weryfikacji zapisujemy w [dzienniku implementacji](docs/IMPLEMENTATION-LOG.md); lokalna zmiana nie oznacza jeszcze wdrożenia.

## Uruchomienie i testy

W katalogu repozytorium:

```sh
python3 -m http.server 8002 --bind 127.0.0.1
```

Otwórz lokalnie stronę `harborlight-v1-layered.html`. Serwer HTTP jest wymagany przez moduły JavaScript; otwieranie pliku bezpośrednio przez `file://` nie jest wspieranym sposobem uruchamiania. Jeżeli port jest zajęty, wybierz wolny port. Wystarczą Python 3 i aktualna przeglądarka.

Testy ekonomii i zapisu wymagają Node.js z obsługą modułów ES i wbudowanego runnera:

```sh
node --test tests/harborlight-state.test.mjs
```

Po uruchomieniu serwera można wykonać pełny test w Chromium (wymaga pakietu Python `playwright` i Chromium):

```sh
python3 tests/harborlight-browser-smoke.py
python3 tests/harborlight-population-smoke.py
python3 tests/harborlight-logistics-smoke.py
python3 tests/harborlight-construction-smoke.py
python3 tests/harborlight-animation-smoke.py
python3 tests/harborlight-coastal-smoke.py
```

Inny adres serwera lub plik wykonywalny Chromium ustawiają `HARBORLIGHT_BASE_URL` oraz `HARBORLIGHT_CHROMIUM`. Test korzysta z osobnej sesji przeglądarki i nie usuwa zapisu gracza.

Publikację GitHub Pages wykonuje istniejący workflow `.github/workflows/pages.yml` po wysłaniu zmian do `main`. Nie ma kroku budowania aplikacji.

## Dokumentacja

- [Interaktywna wyspa: funkcje, sterowanie, zapis, sprawdzenia](docs/INTERACTIVE-ISLAND.md)
- [Animacje świata: zakres frontendu, warstwy i odbiór](docs/WORLD-ANIMATION.md)
- [Uzgodnione reguły gospodarki, koszty, kolejka i premie](docs/ECONOMY-RULES.md)
- [Dziennik implementacji](docs/IMPLEMENTATION-LOG.md)
- [Backlog Frontend i Backend](docs/BACKLOG.md)
- [Koncepcja gry i pętla rozgrywki](docs/HARBORLIGHT-CONCEPT.md)
- [Zaakceptowany kierunek wizualny v1](docs/HARBORLIGHT-V1-SCREEN-SPEC.md)

Starsze pliki BLACKOUT i PANIC PETS są wcześniejszymi eksperymentami. Aktywny kierunek projektu to HARBORLIGHT. Postęp obecnego prototypu jest przechowywany wyłącznie w przeglądarce; synchronizacja między urządzeniami jest zaplanowana w backlogu Backend.
