# HARBORLIGHT

Gra o rozwoju wyspy, gospodarce mieszkańców i odbudowie latarni. Repozytorium zawiera działający lokalny prototyp przeglądarkowy w HTML, CSS i JavaScript. Zachowuje zaakceptowaną grafikę oraz animacje świata. Nie wymaga instalowania zależności aplikacji i nie ma jeszcze backendu.

Podstawowe reguły pochodzą z arkusza HARBORLIGHT6 oraz 17 decyzji z 23 października 2026, zebranych w [HARBORLIGHT7-zasady.xlsx](docs/arkusze/HARBORLIGHT7-zasady.xlsx). Późniejszy pakiet zmian zatwierdzony słowem „go” ujednolica panele i zmienia lokalne pojemności, priorytety oraz aktywne zadania. Reguła limitu pracy `12 × własny poziom budynku` pozostaje zachowana. Aktualny opis jest w [ECONOMY-RULES.md](docs/ECONOMY-RULES.md), a lista budynków i assetu Człowiek w [BUILDINGS.md](docs/BUILDINGS.md); plik Excel 7 zachowano bez zmian.

Nowa wyspa ma 12 mieszkańców w domu, 0 pracowników, szczęście 0% i po 100 każdego z sześciu zasobów. Poziom ratusza wyznacza poziom gry i limit `24 × poziom` mieszkańców; dom zapewnia osobne miejsca mieszkalne. Każde z ośmiu miejsc pracy ma limit `12 × własny poziom budynku`, ze wspólnej puli dostępnych mieszkańców. Droga do pracy i powrót trwają po 5 minut. Produkcja na pracownika rośnie z poziomem producenta: 10, 12, 13, 14… szt./h, a jego lokalny magazyn mieści `200 × własny poziom`. Cała gospodarka, jedzenie, podatki, budowa, szczęście i terminy działają również offline, według rzeczywistego czasu.

Prototyp obejmuje fizyczne kursy transportowe, centralną rezerwę żywności, barter na targu, port, indywidualne szczęście, dzienną pulę punktów domu, wizyty w latarni, kaplicę, kolejkę budowy, zadania latarni oraz ekspedycje z ryzykowaną pulą monet. Usługi za monety mają lokalne wyceny i operacje; nie uruchomiono rzeczywistych płatności, reklam ani nagród społecznościowych.

Panele pokazują status budynku, lokalny zapas / pojemność teraz / po rozbudowie oraz pracowników przypisanych / wolnych w domu / limit. Magazyn ma podgląd kursów z ładunkiem, trasą i czasem do zakończenia. Zadanie może być aktywne tylko jedno: jest podświetlone i pokazuje dostarczone / wymagane każdego produktu na liście oraz w prawym panelu, a pozostałe karty są wyszarzone i nie pozwalają rozpocząć drugiego zadania. Zarządzanie kolejką jest wyłącznie w ratuszu, a zbiorcze Manage all workers otwiera się wyłącznie z domu. Małe −/+ pozostają w poszczególnych miejscach pracy.

W pięciu budynkach produkcyjnych Building upgrade zawiera Upgrade, dwie osobne małe estymaty Delivery time i Building time oraz sąsiadującą ramkę Premium z dwoma dotychczasowymi przyciskami. Objaśnienia Premium są pod „i” rozbudowy; osobnej dolnej sekcji Premium building options w tych budynkach nie ma. Estymacja uwzględnia bieżącą załogę, dostawy i priorytety; nie dolicza zbierania materiałów ani oczekiwania w kolejce.

Do testowania budowy ta aktualizacja jednorazowo uzupełnia materiały magazynu centralnego przy najbliższym otwarciu gry, w granicach pojemności na rodzaj i łącznie, oraz zapewnia co najmniej **10 000 monet**; większego salda nie zmniejsza. Poziomy, mieszkańcy i trwające zlecenia pozostają takie jak w zapisie. To pomoc tej piaskownicy, a nie zmiana zwykłego zestawu startowego ani powtarzalny przycisk przyznawania zasobów.

Dolny dok przełącza cały pasek Buildings na pięć obrazkowych kart produktów: Wood, Planks, Stone, Grain i Food. Każda otwiera ten sam panel producenta co kliknięcie budynku na wyspie. Nad obrazkiem jest liczba osób rzeczywiście pracujących w zakładzie, a pod nim wolni mieszkańcy w domu / maksymalna obsada zakładu. Monety pozostają w skarbcu i nagłówku; nie są szóstym produktem tego paska. Buildings przywraca karty budynków. Układ nagłówka rozdziela markę, Level i lewą nawigację, także przy zmianie rozmiaru okna.

[Strona logowania i rejestracji](harborlight-auth.html) ma formularze oraz ikony Google i Facebook. To frontend: waliduje pola i uczciwie informuje o niedostępności usługi kont. Nie tworzy kont, sesji ani integracji OAuth. Można przejść do gry jako gość. Zapis pozostaje w tej przeglądarce, bez synchronizacji web/Android/iPhone; docelowe konto i wiarygodne rozliczenia wymagają serwera.

## Podgląd

- [Interaktywna wyspa na GitHub Pages](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html)
- [Logowanie i rejestracja po opublikowaniu zmian](https://ksobczak321-oss.github.io/gra/harborlight-auth.html)
- [Zaakceptowany wzorzec wizualny](https://ksobczak321-oss.github.io/gra/harborlight-v1-screen.html)

Publiczny adres pokazuje ostatnią udaną publikację `main`. Obecność plików w lokalnym środowisku nie potwierdza wdrożenia; wyniki publikacji zapisujemy w [dzienniku implementacji](docs/IMPLEMENTATION-LOG.md).

## Uruchomienie i sprawdzenia

W katalogu repozytorium:

```sh
python3 -m http.server 8002 --bind 127.0.0.1
```

Otwórz `http://127.0.0.1:8002/harborlight-v1-layered.html` albo `http://127.0.0.1:8002/harborlight-auth.html`. Moduły JavaScript wymagają HTTP; bezpośrednie `file://` nie jest wspierane. Wystarczą Python 3 i aktualna przeglądarka. Gdy port jest zajęty, wybierz inny wolny port.

Testy reguł wymagają aktualnego Node.js z wbudowanym runnerem:

```sh
node --test --test-timeout=10000 tests/*.test.mjs
```

Sprawdzenia przeglądarkowe wymagają Python `playwright` i Chromium:

```sh
python3 tests/harborlight-auth-smoke.py
python3 tests/harborlight-agreed-ui-smoke.py
python3 tests/harborlight-frontend-v10-smoke.py
python3 tests/harborlight-motion-v10-smoke.py
python3 tests/harborlight-animation-smoke.py
python3 tests/harborlight-coastal-smoke.py
```

Test auth uruchamia własny serwer, jeśli nie podano `HARBORLIGHT_BASE_URL`. Pozostałe testy korzystają z serwera gry; inny adres lub Chromium można wskazać przez `HARBORLIGHT_BASE_URL` i `HARBORLIGHT_CHROMIUM`. Zestawy starszych testów przeglądarkowych pozostają w `tests/`; ich historyczny wynik nie oznacza zgodności z nowymi regułami, dopóki nie zostaną ponownie uruchomione i dostosowane.

GitHub Pages publikuje workflow `.github/workflows/pages.yml` po wysłaniu zmian do `main`. Aplikacja nie ma kroku kompilacji.

## Dokumentacja

- [Sterowanie, panele, zapis i ograniczenia prototypu](docs/INTERACTIVE-ISLAND.md)
- [Aktualne reguły gospodarki i decyzje D01–D17](docs/ECONOMY-RULES.md)
- [12 budynków i asset Człowiek](docs/BUILDINGS.md)
- [Arkusze i ich wersje](docs/arkusze/README.md)
- [Animacje świata](docs/WORLD-ANIMATION.md)
- [Dziennik zmian i weryfikacji](docs/IMPLEMENTATION-LOG.md)
- [Backlog Frontend i Backend](docs/BACKLOG.md)
- [Warunki odbioru wszystkich uwag frontendowych](docs/FRONTEND-REVIEW.md)
- [Koncepcja gry](docs/HARBORLIGHT-CONCEPT.md)
- [Zaakceptowany kierunek wizualny](docs/HARBORLIGHT-V1-SCREEN-SPEC.md)

Starsze pliki BLACKOUT i PANIC PETS są wcześniejszymi eksperymentami. Aktywny kierunek projektu to HARBORLIGHT; aktywny interfejs gry oraz formularze kont są po angielsku.
