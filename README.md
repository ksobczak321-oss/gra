# HARBORLIGHT

Gra o rozwoju wyspy, pracy mieszkańców i odbudowie latarni. Repozytorium zawiera przeglądarkowy prototyp HTML/CSS/JavaScript z lokalnym zapisem, gospodarką offline i zaakceptowaną ilustracją wyspy. Nie wymaga instalowania zależności aplikacji ani kroku kompilacji.

Bieżący pakiet **frontend-v15** obejmuje [17 uzgodnionych zmian](docs/FRONTEND-V15-REQUIREMENTS.md): jednakowe miniatury i podpisy pracowników, karty budynków na jednym ekranie, powrót do poprzedniego menu, własną nazwę wyspy oraz nowe opisy i pełniejsze tłumaczenia. Bazowa produkcja i ładowność transportu są podwojone; jedna atrakcja działa przez sześć godzin dla losowego udziału 1–50% mieszkańców, z ceną zależną od sumy punktów szczęścia.

Wydanie zachowuje wcześniejsze [58 decyzji i 19 wymagań](docs/decisions-v9.json), z późniejszymi zmianami opisanymi w pakiecie v15. **Excel 9** pozostaje archiwum wcześniejszych zasad i nie jest aktualnym opisem podwojonej produkcji ani nowych atrakcji. Bieżące reguły są w [opisie gospodarki](docs/ECONOMY-RULES.md); wyniki sprawdzeń i publikację zapisuje [dziennik](docs/IMPLEMENTATION-LOG.md).

## Podgląd

- [Wyspa](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=frontend-v15).
- [Profil nowego gracza z 29 października](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&slot=start-20261029&v=frontend-v15) — przy pierwszym otwarciu poziom 1, 12 osób, po 100 każdego zasobu, zero przydzielonych pracowników. Osobny zapis zachowuje wcześniejsze wyspy; kolejne otwarcie wznawia jego postęp.
- [Logowanie/rejestracja](https://ksobczak321-oss.github.io/gra/harborlight-auth.html) — formularze, bez prawdziwej usługi kont i OAuth.
- [Pobierz Excel 9](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT9-zasady.xlsx) — opublikowany i sprawdzony przez pobranie.

Pełny publiczny odbiór v13 i pobranie Excela 9 zapisano w dzienniku. W tym środowisku proxy nadal blokuje Pages i API GitHuba błędem 403; publicznego odbioru v15 nie można utożsamiać z testami lokalnymi. Parametr wersji w linku sam nie potwierdza wdrożenia.

## Co obejmuje ta wersja

- Wspólny polski dzień o północy i rzeczywiste czasy efektów, indywidualne H, jedzenie, praca, transport, fizyczne rezerwacje, budowa i gospodarka offline.
- Zadania z potwierdzeniem, darowiznami i trwałym Share/Skip; ekspedycje z pulą +50, potrąceniami za spóźnienie i jedną serią blokującą wyspę.
- Brak lewego paska, 12 kart budynków w Administracji i Gospodarce, jednakowe miniatury, podpisane obsady, pięć zasobów z przewozami, EN/PL i filtry powiadomień. Szczegóły budynków mają zwięzły widok główny oraz osobny widok dodatkowy z powrotem.
- Bazowa produkcja 20/24/26/28… na osobę i godzinę oraz 120 sztuk na pięciominutowy kurs na poziomie 1. Wymagania zadań zachowują wcześniejszą normę; podatki i zapotrzebowanie mieszkańców na żywność nie są podwajane przez zmianę bazy.
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
python3 tests/harborlight-frontend-v15-smoke.py
python3 scripts/build_workbook_v9.py --validate-only
```

Odbiór lokalny v15: **440/440 testów modelu PASS, 0 błędów i 0 pominiętych**. Nowy zestaw Chromium zaliczył siedem grup: 24 widoki budynków po polsku w dwóch rozdzielczościach, wszystkie 12 po angielsku, telefon, nawigację i opisy, zadania/atrakcje/ekspedycję oraz rejestrację nazw wysp. Brak błędów JavaScript/HTTP; osobne regresje formularzy i animacji również PASS. Audyt źródeł objął 1486 konkretnych tekstów i wiadomości z 12 plików. Publiczny odbiór v15 pozostaje niepotwierdzony z powodu HTTP 403 proxy; historyczne wyniki publicznego v13 są oddzielnie w dzienniku.

Zestawy przeglądarkowe wymagają Python Playwright i Chromium; ścieżkę można ustawić przez `HARBORLIGHT_CHROMIUM`. Dziennik rozdziela bieżący odbiór lokalny od wcześniejszych testów rzeczywistego adresu Pages. Workflow `.github/workflows/pages.yml` publikuje `main` bez kompilacji.

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
