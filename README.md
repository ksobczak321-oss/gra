# HARBORLIGHT

Gra przeglądarkowa o rozwoju wyspy, produkcji, mieszkańcach i odbudowie Latarni. Bazowe reguły **frontend-v18** zatwierdzono przez GO użytkownika 30 października 2026: [pełne wymagania](docs/FRONTEND-V18-REQUIREMENTS.md), [reguły gospodarki](docs/ECONOMY-RULES.md) i [budynki](docs/BUILDINGS.md). Bieżący zakres DEV to [v22](docs/FRONTEND-V22-REQUIREMENTS.md), uzupełniający [v21](docs/FRONTEND-V21-REQUIREMENTS.md).

**[Stan środowisk i dowody wydań](docs/ENVIRONMENT-STATUS.md)** to główny rejestr wersji DEV, PRE-PROD i PROD. Rozdziela przygotowany kod, Git/CI, podgląd, publikację GCP, aktywację usług i reset danych. Po uwagach z podglądu powstaje **v22.1**: kolejność szczęście → monety → mieszkańcy, nagrody 3×2 i wskazanie szczegółów Magazynu przed priorytetem. Własne SHA, CI i Pages potwierdza adnotowany tag `dev-v22.1-20261031`, tworzony dopiero po sukcesie odbioru ([jak odczytać dowód](docs/RELEASE-PROCESS.md#niezmienny-dowód-odbioru-dev)).

## Wersja lokalna a opublikowana

| Miejsce | Stan |
|---|---|
| DEV — ta przestrzeń robocza | [v22.1](docs/FRONTEND-V22-REQUIREMENTS.md): wcześniejsze lekcje bez premii, kolejność oprowadzania, nagrody 3×2 i pełna droga do priorytetu Budowy. **915 testów lokalnych i 12 zestawów Chromium PASS**. Dokładny SHA oraz wyniki CI/Pages są adnotacją tagu `dev-v22.1-20261031`, tworzonego dopiero po ich sukcesie. |
| PRE-PROD — `harborlight-dev` | [Gra](https://harborlight-dev.web.app), opublikowane v18 / `6ec3c6d`; [sukces 41112673285](https://github.com/ksobczak321-oss/gra/actions/runs/41112673285), testy hostingu i kont, oba artefakty v2. |
| PROD — `harborlight-prod` / `harborlight.pl` | Brak potwierdzonej publikacji i powiązania domeny. |
| GitHub Pages | [Link roboczy — v22.1](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v22-1). Publikację potwierdza przebieg wskazany w adnotacji tego samego tagu. Nietrwały podgląd DEV, bez zapisu kont PRE-PROD. Bezpośredni odczyt z tej sesji blokuje sieć HTTP 403; dowód publikacji pochodzi z GitHub Actions. |

PRE-PROD ma trzy osobne konta `admin1`, `admin2`, `admin3`. Odczytowy odbiór wdrożenia blokuje zapisy gry i nie resetuje postępu. Najnowsze GO zleca osobny **reset wszystkich trzech kont, także `admin1`, dopiero po pomyślnej promocji i jej weryfikacji**; UID, loginy i hasła zostają zachowane. [Reset](docs/PREPROD-RESET.md) jest przygotowany i przetestowany na izolowanych danych, niewykonany w Google. Dowodem ostatniej publikacji v18 jest udany przebieg powyżej; sam push nie publikuje gry w GCP. Historia pozostaje w [dzienniku](docs/IMPLEMENTATION-LOG.md).

W [v22](docs/FRONTEND-V22-REQUIREMENTS.md) udane działanie wykonane przed swoją lekcją usuwa ją z dalszego samouczka bez skrzyni i nagrody. Kolejny krok nie czeka na powtórzenie czynności ani odbiór nieistniejącej premii; wcześniej przyznane nagrody zostają zachowane.

## Co zmienia v18

- Materiały bonusowe są od razu wydawalne i nie zajmują pojemności zwykłych dostaw. Wydajemy bonus przed zwykłym zapasem. Przepełnienie blokuje dalsze skrzynie samouczka, nie rozbudowę i zarządzanie wyspą.
- Poprawione przyjęcie nagród, limity kolejki, natychmiastowy transport, zachowanie wcześniejszych zleceń Targu i ochrona podjętego na czas ładunku Portu.
- Bazowe 20% szczęścia nowej wyspy, minimum 20% przez 72 h dla wszystkich, pierwszeństwo wymuszonego 100% i dwukrotnie szybszy dodatni przyrost ludności. Aktywność daje produkcję/podatki/transport ×2; po pięciu minutach ×1, po 48 h bez grania ×0,5.
- 25 prawdziwych działań samouczka ze wskazaniem właściwego przycisku, skrzynie 100–300 pięciu materiałów, zachowane odebrane nagrody i brak zasłaniania trwającej minigry.
- Nagrody rund 50,100,200,400… i pula 50,150,350,750…; dobrowolne przedłużenie przed terminem, ryzyko niewypłaconej serii i zachowany wybór kulek/trójek.
- Zapisywany harmonogram propozycji minigry/reklamy, nagrody materiałowe 10–30, osobne uprawnienie bez reklam w standardowej grze po zakupach 1999 gr/30 dni. Reklamy za czas ekspedycji pozostają także dla uprawnionych.
- Codzienne darmowe błogosławieństwo, wydarzenia dobre/złe, regularność Kaplicy, lojalność 50–200 sześciu zasobów oraz czytelne powiadomienia.
- Postęp konta wyłącznie w chmurze. Brak lokalnej wyspy i lokalnej kopii odzyskiwania; brak połączenia blokuje zatwierdzanie działań. Język i techniczna sesja logowania nie są zapisem postępu.

Nowe parametry cen dodatkowego czasu i wag wydarzeń są jawnie opisane jako konfigurowalne wartości wdrożeniowe. Ostatni wygenerowany [Excel 11](docs/arkusze/HARBORLIGHT11-zasady.xlsx) jest migawką reguł v18/v19 i [scenariuszy testowych](docs/TEST-SCENARIOS-v18.md); nie obejmuje rozszerzeń v20–v22. Starsze arkusze pozostają archiwami i nie są nadpisywane.

Uzupełnienie v19 dodaje bezpośrednie wylogowanie i odnośniki do dokumentów w Ustawieniach. Rejestracja wymaga osobnej akceptacji [roboczego Regulaminu](docs/TERMS-DRAFT.pl.md) i potwierdzenia przeczytania [Polityki prywatności](docs/PRIVACY-DRAFT.pl.md); nowe konta otrzymują wersjonowane potwierdzenie serwera. Dane operatora „Lorem ipsum” wymagają uzupełnienia przed publicznym uruchomieniem. Stałe konta PRE-PROD zachowują dostęp i historię.

Zakres [v20](docs/FRONTEND-V20-REQUIREMENTS.md) zaczyna nową wyspę od opisu gry, jej nazwania i oprowadzania po interfejsie. Zegar rusza po ukończeniu lub zamknięciu oprowadzania, a następnie zaczyna się standardowy samouczek. Migracja zachowuje istniejące światy i postęp lekcji. Postęp zapisuje się automatycznie co 30 sekund wyłącznie w chmurze; ręczny panel zapisu zastępuje bezpośrednie wylogowanie. Sesja po przekroczeniu bezczynności nie odnawia się samoczynnie po ponownym otwarciu przeglądarki. Zmiany wchodzą w zweryfikowaną bazę v21; osobna promocja PRE-PROD pozostaje niepotwierdzona.

## Konta i integracje

Zakres [v21](docs/FRONTEND-V21-REQUIREMENTS.md) przeplata nagrody nowego 25-krokowego samouczka z wydawaniem zasobów i dąży do zakończenia z pełnym magazynem bez zaległych skrzyń. Zachowuje stare postępy i nagrody. Rozbudowa Ratusza od 3→4 wymaga 75% ludności poprzedzającego poziomu; od Ratusza 6 handel graczy zastępuje nowe zlecenia NPC. Ratusz 10 pozwala utworzyć drugą wyspę, z jednorazowym skopiowaniem poziomów Ratusza i Magazynu. Własny statek przewozi 1000 sztuk w 10 minut bez opłaty za rejs; płatne zwiększenie pojemności jest w DEV symulacją. Te zmiany wymagają osobnego odbioru reguł, pakietu, usług i promocji.

PRE-PROD ma rzeczywiste Firebase Authentication/Firestore dla stałych kont testowych. Kod produkcyjnych kont obsługuje e-mail oraz ścieżki Google/Facebook, lecz aktywacja dostawców, domen i aplikacji wymaga właścicielskiej konfiguracji. Brak konfiguracji nie jest zastępowany pozorowanym logowaniem. Gracz sam inicjuje i zatwierdza udostępnienie osiągnięcia; automatyczne posty strony i osobisty facebookowy push są odłożone.

**Paynow i reklamy są symulowane tylko w DEV/PRE-PROD**, z wyraźnym oznaczeniem i bez pobierania pieniędzy. PROD nie przyznaje zakupów ani nagród na podstawie symulacji. Uruchomienie rzeczywistego operatora/dostawcy wymaga osobnego przygotowania i weryfikacji potwierdzeń.

Backend zawiera kod API kont, transakcyjnego limitu kodów promocyjnych i retencji wysp. Włączenie tych usług wymaga konfiguracji serwera, Firestore, IAM i routingu; ich kod nie dowodzi działającej usługi w chmurze. Gospodarka pozostaje obliczana przez przeglądarkę, więc autorytatywne serwerowe rozliczenie komend i wyników jest kolejnym etapem.

Po trzech miesiącach kalendarzowych bez rzeczywistej gry wyspa może zostać zresetowana przy zachowaniu konta i historii. Stałe konta PRE-PROD są wyłączone. Automatyczne zwroty zakupów wycofano; [szkic regulaminu](docs/TERMS-DRAFT.pl.md) wymaga sprawdzenia przed rozpoczęciem płatnej sprzedaży.

## Uruchomienie DEV

```sh
python3 -m http.server 8002 --bind 127.0.0.1
```

Otwórz `http://127.0.0.1:8002/harborlight-v1-layered.html`. To nietrwały podgląd w pamięci, bez udawania konta i bez zapisu wyspy w przeglądarce. Konta chmurowe wymagają właściwego hosta i konfiguracji. Moduły nie działają przez `file://`.

## Sprawdzenia

```sh
node --test --test-concurrency=1 --test-isolation=none tests/*.test.mjs
node --test backend/test/*.test.mjs
python3 tests/harborlight-frontend-bundle.test.py
python3 tests/harborlight-frontend-v18-smoke.py
python3 tests/harborlight-v18-auth-smoke.py
```

Przeglądarka wymaga Python Playwright i Chromium; opcjonalna ścieżka wykonywalna to `HARBORLIGHT_CHROMIUM`. Wyniki lokalne, testy z atrapami i rzeczywisty odbiór hostingu są osobnymi dowodami. Aktualne liczby i ograniczenia zapisujemy wyłącznie w dzienniku po zakończeniu danego sprawdzenia.

## Publikacja i dokumentacja

Obowiązuje **DEV tutaj → GitHub/CI → PRE-PROD → PROD**. PRE-PROD wymaga CI tego samego SHA. PROD promuje identyczne archiwum frontendu i obraz po digest z udanego PRE-PROD, bez ponownej budowy. Nazwy techniczne `google-cloud-dev.yml` i `harborlight-dev-*` pozostają niezmienione.

- [Kontrakt promocji](docs/RELEASE-PROCESS.md)
- [Bieżący stan DEV / PRE-PROD / PROD](docs/ENVIRONMENT-STATUS.md)
- [Zlecony reset kont po promocji PRE-PROD](docs/PREPROD-RESET.md)
- [Sterowanie, samouczek i zapis](docs/INTERACTIVE-ISLAND.md)
- [Backlog i ograniczenia uruchomienia](docs/BACKLOG.md)
- [Dziennik wyników i publikacji](docs/IMPLEMENTATION-LOG.md)
- [Konfiguracja Google Cloud](docs/GOOGLE-CLOUD.md) — wcześniejsze instrukcje używają technicznej nazwy DEV dla obecnego PRE-PROD.
- [Archiwa arkuszy](docs/arkusze/README.md)
- [Monitorowanie kosztów i budżet alertowy GCP](docs/GCP-COST-CONTROL.md)
- [Zakup licencji na muzykę](docs/MUSIC-LICENSING.md)

BLACKOUT, PANIC PETS i wcześniejsze makiety pozostają historią repozytorium. Aktywny projekt to HARBORLIGHT.
