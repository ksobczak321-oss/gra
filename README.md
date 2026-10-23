# HARBORLIGHT

Gra o rozwoju wyspy, gospodarce mieszkańców i odbudowie latarni. Repozytorium zawiera działający lokalny prototyp przeglądarkowy w HTML, CSS i JavaScript. Zachowuje zaakceptowaną grafikę oraz animacje świata. Nie wymaga instalowania zależności aplikacji i nie ma jeszcze backendu.

Aktualne reguły wynikają z arkusza HARBORLIGHT6 oraz 17 decyzji z 23 października 2026, zebranych w [HARBORLIGHT7-zasady.xlsx](docs/arkusze/HARBORLIGHT7-zasady.xlsx). Opis wdrożonych reguł znajduje się w [ECONOMY-RULES.md](docs/ECONOMY-RULES.md), a lista budynków i assetu Człowiek w [BUILDINGS.md](docs/BUILDINGS.md).

Nowa wyspa ma 12 mieszkańców w domu, 0 pracowników, szczęście 0% i po 100 każdego z sześciu zasobów. Poziom ratusza wyznacza poziom gry i limit `24 × poziom` mieszkańców; dom zapewnia osobne miejsca mieszkalne. Każde z ośmiu miejsc pracy mieści `12 × własny poziom` osób, ze wspólnej puli dostępnych mieszkańców. Droga do pracy i powrót trwają po 5 minut. Produkcja na pracownika rośnie z poziomem producenta: 10, 12, 13, 14… szt./h. Cała gospodarka, jedzenie, podatki, budowa, szczęście i terminy działają również offline, według rzeczywistego czasu.

Prototyp obejmuje fizyczne kursy transportowe, centralną rezerwę żywności, barter na targu, port, indywidualne szczęście, dzienną pulę punktów domu, wizyty w latarni, kaplicę, kolejkę budowy, zadania latarni oraz ekspedycje z ryzykowaną pulą monet. Usługi za monety mają lokalne wyceny i operacje; nie uruchomiono rzeczywistych płatności, reklam ani nagród społecznościowych.

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
- [Koncepcja gry](docs/HARBORLIGHT-CONCEPT.md)
- [Zaakceptowany kierunek wizualny](docs/HARBORLIGHT-V1-SCREEN-SPEC.md)

Starsze pliki BLACKOUT i PANIC PETS są wcześniejszymi eksperymentami. Aktywny kierunek projektu to HARBORLIGHT; aktywny interfejs gry oraz formularze kont są po angielsku.
