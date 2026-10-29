# HARBORLIGHT

Gra o rozwoju wyspy, pracy mieszkańców i odbudowie latarni. Repozytorium zawiera przeglądarkowy prototyp HTML/CSS/JavaScript z lokalnym zapisem, gospodarką offline i zaakceptowaną ilustracją wyspy. Nie wymaga instalowania zależności aplikacji ani kroku kompilacji.

Bieżący pakiet **frontend-v16** prowadzi przez 25 lekcji samouczka: od zasad i mapy po pracę, wyżywienie, rozbudowę oraz szczęście. Samouczek wraca przy wejściu do ukończenia albo rezygnacji; każdy sukces daje fanfarę i utrwaloną skrzynię po 100–300 każdego z pięciu materiałów, z jednorazowym Share ×2. Zasady lojalności pozostają bez zmian, a jej kwoty nadal nie są ustalone.

Ekspedycje losują labirynt z kulkami albo dopasowywanie trójek. Nowe rundy mają twardy limit czasu i stopniowo malejącą nagrodę; wygrana powiększa ryzykowaną pulę. Gra zachowuje wszystkie [17 zmian v15](docs/FRONTEND-V15-REQUIREMENTS.md), w tym własną nazwę wyspy, czytelne karty i podwojoną bazową produkcję oraz ładunek. Bieżące reguły i [Excel 10](docs/arkusze/HARBORLIGHT10-zasady.xlsx) uwzględniają oba pakiety; starsze arkusze pozostają historią.

## Podgląd

- [Wyspa](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=frontend-v16).
- [Profil nowego gracza z 29 października](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&slot=start-20261029-v16&v=frontend-v16) — przy pierwszym otwarciu poziom 1, 12 osób, po 100 każdego zasobu, zero przydzielonych pracowników. Osobny zapis zachowuje wcześniejsze wyspy; kolejne otwarcie wznawia jego postęp.
- [Logowanie/rejestracja](https://ksobczak321-oss.github.io/gra/harborlight-auth.html) — formularze, bez prawdziwej usługi kont i OAuth.
- [Pobierz Excel 10](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT10-zasady.xlsx) — aktualne zasady, 25 lekcji i kalkulator; publiczne pobranie potwierdzone identyczną sumą kontrolną. Pliki 7–9 pozostają niezmienione.

Pełny publiczny odbiór v13 i pobranie Excela 9 zapisano w dzienniku. W tym środowisku proxy nadal blokuje Pages i API GitHuba błędem 403; publicznego odbioru v16 nie można utożsamiać z testami lokalnymi. Parametr wersji w linku sam nie potwierdza wdrożenia.

## Co obejmuje ta wersja

- Wspólny polski dzień o północy i rzeczywiste czasy efektów, indywidualne H, jedzenie, praca, transport, fizyczne rezerwacje, budowa i gospodarka offline.
- Zadania z potwierdzeniem, darowiznami i trwałym Share/Skip; ekspedycje z pulą +50, potrąceniami za spóźnienie i jedną serią blokującą wyspę.
- Brak lewego paska, 12 kart budynków w Administracji i Gospodarce, jednakowe miniatury, podpisane obsady, pięć zasobów z przewozami, EN/PL i filtry powiadomień. Szczegóły budynków mają zwięzły widok główny oraz osobny widok dodatkowy z powrotem.
- Bazowa produkcja 20/24/26/28… na osobę i godzinę oraz 120 sztuk na pięciominutowy kurs na poziomie 1. Wymagania zadań zachowują wcześniejszą normę; podatki i zapotrzebowanie mieszkańców na żywność nie są podwajane przez zmianę bazy.
- 25 kolejnych lekcji bez czekania na następne dni, skrzynie po 100–300 każdego materiału, Share ×2 i premia aktywnej gry. Kulki mają sterowanie kursorem, klawiaturą, dotykiem lub ruchem telefonu; trójki rosną od 24 do 120 pól i później przesuwają zakryte obrazki.
- Excel 10 ma cztery widoczne zakładki, krótkie opisy mechanik i bieżący kalkulator. Całe źródło 9 oraz wszystkie 48 komentarzy pozostaje ukrytym archiwum; pliki 7, 8 i 9 zachowują identyczne bajty.

Zewnętrzne konta, synchronizacja web/Android/iPhone, płatności, reklamy i potwierdzanie publikacji/poleceń wymagają backendu. W tej iteracji są lokalne reguły i czyste punkty przyszłej integracji, bez deklarowania rzeczywistych połączeń.

## Uruchomienie

```sh
python3 -m http.server 8002 --bind 127.0.0.1
```

Otwórz `http://127.0.0.1:8002/harborlight-v1-layered.html`. Bezpośrednie `file://` nie obsługuje modułów aplikacji. Inny wolny port jest dopuszczalny.

## Sprawdzenia

```sh
node --test --test-concurrency=1 --test-isolation=none tests/*.test.mjs
python3 tests/harborlight-frontend-v16-smoke.py
python3 scripts/build_workbook_v10.py --validate-only
```

Odbiór lokalny v16: **476/476 testów modelu PASS**, bez błędów i pominięć. Nowy Chromium zaliczył siedem grup wymagań; regresje v15 (36 widoków budynków), auth i new-player również PASS, bez błędów JavaScript/HTTP. Excel 10: 3866 przeliczonych formuł i 323 kontrole TRUE, zachowane źródła 7–9 oraz wszystkie 48 komentarzy. Szczegóły i ograniczenie publicznego odbioru opisuje [dziennik](docs/IMPLEMENTATION-LOG.md).

Zestawy przeglądarkowe wymagają Python Playwright i Chromium; ścieżkę można ustawić przez `HARBORLIGHT_CHROMIUM`. Dziennik rozdziela bieżący odbiór lokalny od wcześniejszych testów rzeczywistego adresu Pages. Workflow `.github/workflows/pages.yml` publikuje `main` bez kompilacji.

## Dokumentacja

- [Jak działa gospodarka](docs/ECONOMY-RULES.md)
- [Tabela 12 budynków i mieszkaniec](docs/BUILDINGS.md)
- [Sterowanie, język i zapis](docs/INTERACTIVE-ISLAND.md)
- [Arkusze i odtwarzanie Excela 10](docs/arkusze/README.md)
- [Macierz odbioru](docs/FRONTEND-REVIEW.md)
- [Dziennik implementacji i publikacji](docs/IMPLEMENTATION-LOG.md)
- [Backlog frontend/backend](docs/BACKLOG.md)
- [Historia animacji świata](docs/WORLD-ANIMATION.md)

Starsze BLACKOUT, PANIC PETS i pierwsze makiety zachowano jako historię repozytorium. Aktywny projekt to HARBORLIGHT.
