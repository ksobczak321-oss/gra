# HARBORLIGHT

Gra o rozwoju wyspy, pracy mieszkańców i odbudowie latarni. Repozytorium zawiera przeglądarkowy prototyp HTML/CSS/JavaScript z lokalnym zapisem, gospodarką offline i zaakceptowaną ilustracją wyspy. Nie wymaga instalowania zależności aplikacji ani kroku kompilacji.

Bieżący pakiet **frontend-v17** obejmuje [9 poprawek po przeglądzie gry](docs/FRONTEND-V17-REQUIREMENTS.md): wyrównanie kart budynków, całą planszę trójek bez przewijania, wybór minigry, czytelne odwołanie tragarzy, oznaczenie kar produkcyjnych i poprawki menu. W minigrach jest miejsce na reklamę nagradzaną; jej efekt i integracja pozostają do ustalenia, więc przycisk nie przyznaje czasu ani monet.

Gracz wybiera **labirynt z kulkami albo dopasowywanie trójek** przy rozpoczęciu oraz może zmienić rodzaj przed kolejną rundą. Wybrany rodzaj jest zachowany po wczytaniu i stanowi domyślny wybór kontynuacji. Zegary, ryzyko całej niewypłaconej puli i wcześniejsze zasady nagród pozostają takie jak w v16.

Zachowane są 25 lekcji samouczka, skrzynie po 100–300 każdego z pięciu materiałów i jednorazowe Share ×2 oraz [zmiany gospodarki v15](docs/FRONTEND-V15-REQUIREMENTS.md). Bieżące reguły opisuje [gospodarka](docs/ECONOMY-RULES.md) wraz z wymaganiami v17. **Excel 10 pozostaje niezmienionym archiwum v16**: opisuje dawne losowanie minigry i nie jest aktualnym opisem wyboru gry ani poprawek interfejsu v17.

## Podgląd

- [Wyspa](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=frontend-v17).
- [Profil nowego gracza z 29 października](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&slot=start-20261029-v16&v=frontend-v17) — przy pierwszym otwarciu poziom 1, 12 osób, po 100 każdego zasobu, zero przydzielonych pracowników. Osobny zapis zachowuje wcześniejsze wyspy; kolejne otwarcie wznawia jego postęp.
- [Logowanie/rejestracja](https://ksobczak321-oss.github.io/gra/harborlight-auth.html) — formularze, bez prawdziwej usługi kont i OAuth.
- [Pobierz Excel 10](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT10-zasady.xlsx) — archiwum zasad v16, 25 lekcji i kalkulator; jego wcześniejsze publiczne pobranie potwierdzono identyczną sumą kontrolną. Pliki 7–10 pozostają niezmienione.

Publikację v17 potwierdza udany [workflow Pages 40975340456](https://github.com/ksobczak321-oss/gra/actions/runs/40975340456) dla commitu gry `72e49da`. Lokalne testy i udane wdrożenie są odrębne od bezpośredniego odbioru publicznej strony, który nadal blokuje HTTP 403 proxy środowiska; pełne dowody są w dzienniku.

## Co obejmuje ta wersja

- Wspólny polski dzień o północy i rzeczywiste czasy efektów, indywidualne H, jedzenie, praca, transport, fizyczne rezerwacje, budowa i gospodarka offline.
- Zadania z potwierdzeniem, darowiznami i trwałym Share/Skip; wybrane przez gracza minigry z nagrodą do 50 monet, potrąceniami według czasu i jedną serią blokującą wyspę.
- Brak lewego paska, 12 kart budynków w Administracji i Gospodarce, jednakowe miniatury, podpisane obsady, pięć zasobów z przewozami, EN/PL i filtry powiadomień. Szczegóły budynków mają zwięzły widok główny z wyrównanymi kolumnami oraz osobny widok dodatkowy z powrotem. Aktywna kara za przestój ma smutną ikonę nad budynkiem.
- Bazowa produkcja 20/24/26/28… na osobę i godzinę oraz 120 sztuk na pięciominutowy kurs na poziomie 1. Wymagania zadań zachowują wcześniejszą normę; podatki i zapotrzebowanie mieszkańców na żywność nie są podwajane przez zmianę bazy.
- 25 kolejnych lekcji bez czekania na następne dni, skrzynie po 100–300 każdego materiału, Share ×2 i premia aktywnej gry. Kulki mają sterowanie kursorem, klawiaturą, dotykiem lub ruchem telefonu; trójki rosną od 24 do 120 pól, dopasowują całą planszę do okna bez suwaków i później przesuwają zakryte obrazki.
- Archiwalny Excel 10 ma cztery widoczne zakładki, krótkie opisy mechanik i kalkulator wydania v16. Całe źródło 9 oraz wszystkie 48 komentarzy pozostaje ukrytym archiwum; pliki 7, 8 i 9 zachowują identyczne bajty.

DEV ma przygotowaną integrację trzech stałych kont **admin1, admin2, admin3** z logowaniem i synchronizacją wysp przez Firebase Authentication/Firestore. [Przygotowanie kont](docs/DEV-ACCOUNTS.md) wykonuje właściciel w Cloud Shell; zwykłe wdrożenia nie resetują haseł ani postępu. Rzeczywisty odbiór wymaga przygotowanych zasobów i udanego workflow DEV. Konta produkcyjne, synchronizacja aplikacji Android/iPhone, płatności, reklamy i potwierdzanie poleceń pozostają kolejnymi etapami.

Wybraną platformą jest **Google Cloud z oddzielnymi projektami DEV i PROD**. [Konfiguracja publikacji](docs/GOOGLE-CLOUD.md) obejmuje grę na Firebase Hosting/CDN oraz początkowy serwer sond Cloud Run. Bootstrap sprawdzono w Cloud Shell użytkownika: **22 kontrole PASS, 0 FAIL**. Hosting DEV jest przygotowany; po błędzie odczytu Service Usage uzupełniono konfigurację deployera. Nadal brak pełnego potwierdzenia wdrożenia gry GCP. Nowe konta i baza DEV czekają na właścicielski skrypt przygotowania.

Obowiązuje [kolejność promocji](docs/RELEASE-PROCESS.md): **praca tutaj → GitHub i CI → GCP DEV → GCP PROD**. DEV wymaga CI tego samego commitu i testów opublikowanej gry. PROD wymaga pełnego potwierdzenia v2 oraz obu artefaktów z DEV: publikuje identyczne archiwum frontendu i obraz backendu po digest, bez przebudowy. Planowany adres DEV to `https://harborlight-dev.web.app`; docelowa domena PROD **harborlight.pl** wymaga jeszcze powiązania i DNS w nazwa.pl. GitHub Pages pozostaje podglądem deweloperskim.

## Uruchomienie

```sh
python3 -m http.server 8002 --bind 127.0.0.1
```

Otwórz `http://127.0.0.1:8002/harborlight-v1-layered.html`. Bezpośrednie `file://` nie obsługuje modułów aplikacji. Inny wolny port jest dopuszczalny.

## Sprawdzenia

```sh
node --test --test-concurrency=1 --test-isolation=none tests/*.test.mjs
python3 tests/harborlight-frontend-v17-smoke.py
```

Odbiór lokalny v17: **486/486 testów modelu PASS**, bez błędów i pominięć. Nowy Chromium zaliczył pięć grup wymagań oraz dodatkową regresję historii wyjścia; siedem grup v16 również PASS, bez błędów JavaScript/HTTP. Sprawdzono natychmiastową geometrię 24/42/120 kart, zmianę rozmiaru, cztery rozdzielczości, oba języki i pełny powrót tragarza. Stan publikacji zawiera [dziennik](docs/IMPLEMENTATION-LOG.md); niezmieniony Excel 10 zachowuje historyczny odbiór v16.

Przygotowanie pełnego wydania GCP rozszerzyło zestaw do **502 testów modelu i promocji**. Integracja kont dodaje testy protokołu, synchronizacji i przygotowania zasobów. Deterministyczny pakiet obejmuje również moduły kont DEV; testy z pakietu są odrębne od odbioru prawdziwego hostingu i DNS.

Zestawy przeglądarkowe wymagają Python Playwright i Chromium; ścieżkę można ustawić przez `HARBORLIGHT_CHROMIUM`. Dziennik rozdziela bieżący odbiór lokalny od wcześniejszych testów rzeczywistego adresu Pages. Workflow `.github/workflows/pages.yml` publikuje `main` bez kompilacji.

## Dokumentacja

- [Pakiet 9 wymagań v17](docs/FRONTEND-V17-REQUIREMENTS.md)
- [Jak działa gospodarka](docs/ECONOMY-RULES.md)
- [Tabela 12 budynków i mieszkaniec](docs/BUILDINGS.md)
- [Sterowanie, język i zapis](docs/INTERACTIVE-ISLAND.md)
- [Arkusze i odtwarzanie Excela 10](docs/arkusze/README.md)
- [Macierz odbioru](docs/FRONTEND-REVIEW.md)
- [Dziennik implementacji i publikacji](docs/IMPLEMENTATION-LOG.md)
- [Backlog frontend/backend](docs/BACKLOG.md)
- [Google Cloud — osobne DEV i PROD](docs/GOOGLE-CLOUD.md)
- [Zasady promocji od pracy lokalnej do PROD](docs/RELEASE-PROCESS.md)
- [Historia animacji świata](docs/WORLD-ANIMATION.md)

Starsze BLACKOUT, PANIC PETS i pierwsze makiety zachowano jako historię repozytorium. Aktywny projekt to HARBORLIGHT.
