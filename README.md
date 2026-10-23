# HARBORLIGHT

Gra o rozwoju wyspy, pracy mieszkańców i odbudowie latarni. Repozytorium zawiera przeglądarkowy prototyp HTML/CSS/JavaScript z lokalnym zapisem, gospodarką offline i zaakceptowaną ilustracją wyspy. Nie wymaga instalowania zależności aplikacji ani kroku kompilacji.

Bieżący zakres **frontend-v13 / Excel 9** obejmuje [58 decyzji i 19 wymagań frontendu](docs/decisions-v9.json). Implementacja i odbiór lokalny są zakończone: **388/388 testów modelu PASS**, zaliczone testy interfejsu, nowego gracza, formularzy i animacji. Wydanie opublikowano jako [8025f3d](https://github.com/ksobczak321-oss/gra/commit/8025f3d2a482d20ad419b95963a7f03135c7f2c1); [Pages 40012462614](https://github.com/ksobczak321-oss/gra/actions/runs/40012462614) zakończyło się sukcesem. Publiczne pliki gry i Excel mają zgodne sumy kontrolne; wszystkie trzy publiczne scenariusze przeglądarkowe zaliczone. Pełne dowody są w [dzienniku](docs/IMPLEMENTATION-LOG.md).

## Podgląd

- [Wyspa](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=frontend-v13).
- [Oddzielny profil nowego gracza](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v13) — 12 osób, po 100 zasobów, bez testowego grantu; nie usuwa wcześniejszej wyspy.
- [Logowanie/rejestracja](https://ksobczak321-oss.github.io/gra/harborlight-auth.html) — formularze, bez prawdziwej usługi kont i OAuth.
- [Pobierz Excel 9](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT9-zasady.xlsx) — opublikowany i sprawdzony przez pobranie.

Publiczna strona serwuje `frontend-v13`: 17 plików HTML/CSS/JS zwraca HTTP 200 i odpowiada lokalnym plikom. Pobrany Excel 9 ma 329612 bajtów oraz zgodny SHA-256; trzy zestawy testów kliknięć na Pages również zaliczone.

## Co obejmuje ta wersja

- Wspólny polski dzień o północy i rzeczywiste czasy efektów, indywidualne H, jedzenie, praca, transport, fizyczne rezerwacje, budowa i gospodarka offline.
- Zadania z potwierdzeniem, darowiznami i trwałym Share/Skip; ekspedycje z pulą +50, potrąceniami za spóźnienie i jedną serią blokującą wyspę.
- Brak lewego paska, nowy nagłówek, 12 kart budynków, pięć zasobów z przewozami, EN/PL, filtry powiadomień i zwarte efekty. Informacje o podatkach są ukryte; silnik nadal je nalicza.
- 25 mikrozadań przez pięć aktywnych dni oraz premia aktywnej gry. Kwoty samouczka i krzywa czasu minigier są jawnie projektowe, nie udają zatwierdzonych nagród lojalnościowych.
- Excel 9 ma tylko cztery widoczne zakładki, opisy mechanik do trzech zdań i jeden kalkulator. Całe źródło 8 oraz 48 komentarzy pozostaje ukrytym archiwum; pliki 7 i 8 zachowują identyczne bajty.

Zewnętrzne konta, synchronizacja web/Android/iPhone, płatności, reklamy i potwierdzanie publikacji/poleceń wymagają backendu. W tej iteracji są lokalne reguły i czyste punkty przyszłej integracji, bez deklarowania rzeczywistych połączeń.

## Uruchomienie

```sh
python3 -m http.server 8002 --bind 127.0.0.1
```

Otwórz `http://127.0.0.1:8002/harborlight-v1-layered.html`. Bezpośrednie `file://` nie obsługuje modułów aplikacji. Inny wolny port jest dopuszczalny.

## Sprawdzenia

```sh
node --test --test-concurrency=1 --test-isolation=none tests/*.test.mjs
HARBORLIGHT_BASE_URL=http://127.0.0.1:8002 python3 tests/harborlight-frontend-v13-smoke.py
python3 scripts/build_workbook_v9.py --validate-only
```

Lokalny model: **388 PASS, 0 błędów, 0 pominiętych**. Zaliczono pięć scenariuszy Chromium: frontend-v13, new-player, auth, v13-auth-motion oraz dodatkowy odbiór sześciu grup wymagań. Sprawdzono komplet 24 widoków budynków w EN/PL, pięć zasobów, desktop i telefon. Na rzeczywistym Pages ponownie PASS: frontend-v13, dodatkowy odbiór oraz new-player. Brak błędów JavaScript/HTTP i nieoczekiwanych zewnętrznych wywołań udostępniania.

Zestawy przeglądarkowe wymagają Python Playwright i Chromium; ścieżkę można ustawić przez `HARBORLIGHT_CHROMIUM`. Pełny raport obejmuje również wcześniejsze regresje i test rzeczywistego adresu Pages. Workflow `.github/workflows/pages.yml` publikuje `main` bez kompilacji.

## Dokumentacja

- [Jak działa gospodarka](docs/ECONOMY-RULES.md)
- [Tabela 12 budynków i mieszkaniec](docs/BUILDINGS.md)
- [Sterowanie, język i zapis](docs/INTERACTIVE-ISLAND.md)
- [Arkusze i odtwarzanie Excela 9](docs/arkusze/README.md)
- [Macierz odbioru](docs/FRONTEND-REVIEW.md)
- [Dziennik implementacji i publikacji](docs/IMPLEMENTATION-LOG.md)
- [Backlog frontend/backend](docs/BACKLOG.md)
- [Historia animacji świata](docs/WORLD-ANIMATION.md)

Starsze BLACKOUT, PANIC PETS i pierwsze makiety zachowano jako historię repozytorium. Aktywny projekt to HARBORLIGHT.
