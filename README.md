# HARBORLIGHT

Aktualny rozwój **DEV 0.11.0.0 / v27**: zatwierdzone opisy, 34 kroki tutoriala i 25 lekcji samouczka wznawiane przez Pomoc, objaśnienia rzeczywistych skutków, dwuminutowe dojście pracowników, niezależny limit ludności i łóżek oraz misje Latarni 8/5/3 z oceną wykonalności. Lokalnie **1017 Node i 141 Python PASS**; **27 nazwanych zestawów Chromium PASS** po poprawkach i kierunkowych ponowieniach. Audyt obejmuje 114 widoków PL bez angielskich pozostałości oraz dodatkowe 8 prób odzyskiwania zapisu. Własny SHA, CI i Pages v27 oczekują. **PRE-PROD pozostaje na 0.10.1.0**, bez resetu kont. [Zakres DEV v27](docs/FRONTEND-V27-REQUIREMENTS.md) · [bieżąca walidacja](docs/DEV-0.11.0.0-VALIDATION.md) · [stan środowisk](docs/ENVIRONMENT-STATUS.md).

**[Testy do odhaczania — zacznij tutaj](docs/testing/START-HERE.md)** · **[Interaktywna lista 70 scenariuszy](docs/testing/qa-checklist.html)** · **[Planszówka: kompletny ZIP, plansza, karty, pionki, pudełko i instrukcja](docs/boardgame/README.md)**. Wszystkie ręczne wyniki pozostają NOT RUN; nowe HL-TC-0060–0070 odbierają zakres v27. Integracja sesji fizycznej z kontami online jest odłożona.

Gra przeglądarkowa o rozwoju wyspy, produkcji, mieszkańcach i odbudowie Latarni. Bazowe reguły **frontend-v18** zatwierdzono przez GO użytkownika 30 października 2026: [pełne wymagania](docs/FRONTEND-V18-REQUIREMENTS.md), [reguły gospodarki](docs/ECONOMY-RULES.md) i [budynki](docs/BUILDINGS.md). Bieżący zakres roboczy DEV to [0.11.0.0 / v27](docs/FRONTEND-V27-REQUIREMENTS.md); opublikowane PRE-PROD ma [0.10.1.0 / v25](docs/FRONTEND-V25-REQUIREMENTS.md). To dwa różne etapy wydania.

**[Stan środowisk i dowody wydań](docs/ENVIRONMENT-STATUS.md)** rozdziela kod roboczy, własne CI, podgląd Pages i publikację GCP. Ostatni potwierdzony podgląd DEV to historyczne 0.10.2.0 / 170cd31… z własnymi CI, Pages i tagiem. Nie jest dowodem publikacji roboczego v27. Historyczny tag `dev-0.10.1.0-20261031` oraz udana promocja PRE-PROD 41246771480 odnoszą się do źródła `353faad347262dce7c3632fdf7c71be124384ab1`. Dane graczy pozostają zachowane.

## Wersja lokalna a opublikowana

| Miejsce | Stan |
|---|---|
| DEV — ta przestrzeń robocza | **0.11.0.0 / v27**, cache `frontend-v27`. 1017 Node i 141 Python PASS lokalnie; 27 nazwanych zestawów Chromium PASS po odpowiednich ponowieniach; własny SHA/CI/Pages oczekują. Tylko DEV, bez GCP i resetu. [Bieżąca walidacja](docs/DEV-0.11.0.0-VALIDATION.md). |
| PRE-PROD — `harborlight-dev` | [Graj](https://harborlight-dev.web.app): **0.10.1.0 / `353faad347262dce7c3632fdf7c71be124384ab1`**, [promocja 41246771480 / próba 1 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41246771480), 2 min 05 s. Zachowane konta, hasła i postęp. Nowy zakres v27 nie jest tu opublikowany. |
| PROD — `harborlight-prod` / `harborlight.pl` | Brak potwierdzonej publikacji i powiązania domeny. |
| GitHub Pages | [Podgląd DEV 0.10.2.0](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v26). [Pages 41337284572 SUCCESS, 25 s](https://github.com/ksobczak321-oss/gra/actions/runs/41337284572) dla 170cd31… . Podgląd działa w pamięci, odrębnie od kont chmurowych. |

PRE-PROD ma trzy osobne konta `admin1`, `admin2`, `admin3`. Odczytowy odbiór wdrożenia blokuje zapisy gry i nie resetuje postępu. Historyczna promocja v22.1 zakończyła się sukcesem; wcześniej [zlecony reset wszystkich trzech kont](docs/PREPROD-RESET.md), także `admin1`, **nadal nie został wykonany**. Wymaga oryginalnego ZIP potwierdzenia wydania i odczytu konfiguracji/usług w sesji właściciela GCP; UID, loginy i hasła pozostaną zachowane. Nie odczytano jeszcze wartości włączenia API kont. Bezpośredni odczyt `web.app` z tej sesji blokuje brama HTTP 403. [Rejestr](docs/ENVIRONMENT-STATUS.md) zachowuje hashe ZIP obu nowych artefaktów oraz historyczne dowody v18.

W [v22](docs/FRONTEND-V22-REQUIREMENTS.md) udane działanie wykonane przed swoją lekcją usuwa ją z dalszego samouczka bez skrzyni i nagrody. Kolejny krok nie czeka na powtórzenie czynności ani odbiór nieistniejącej premii; wcześniej przyznane nagrody zostają zachowane.

## Wcześniejsza pilna poprawka 0.9.1.2

[Zakres v23.1](docs/FRONTEND-V23-1-REQUIREMENTS.md) obejmuje wyłącznie wybór języka PL/EN na pierwszym wprowadzeniu i przy nazwie wyspy. Zmiana ma zachować wpisaną nazwę, etap, zatrzymany czas i postęp. Poprawka przeszła własne CI i promocję PRE-PROD; dowody zapisano w rejestrze środowisk. Nie resetowano kont. Tamten zakres miał 251 zmian i 46 ręcznych przypadków; bieżąca ewidencja DEV ma **296 zmian i 70 przypadków**, w tym nowe HL-TC-0060–0070 dla v27.

## Poprzedni zakres DEV 0.9.1.1

W Ustawieniach dodano widoczne **0.9.1.1**; schema świata i zapis pozostają odrębne. [Zakres v23](docs/FRONTEND-V23-REQUIREMENTS.md) obejmuje również przegląd historii czatu, [osobne karty zmian](docs/tracking/CHANGE-REGISTER.md) i [ręczne przypadki testowe](docs/testing/MANUAL-TEST-PLAN.md), z wynikami NOT RUN do rzeczywistego odbioru. Karty są w Git; natywnych GitHub Issues jeszcze nie utworzono z powodu braku poprawnej autoryzacji. [Importer](scripts/README-tracking-issues.md) domyślnie tylko pokazuje plan.

Do decyzji są konkretne projekty: [wyspy/pasażerowie/handel](docs/design/ARCHIPELAGO-AND-TRADE-v23.md), [liga/społeczność/dobroczynność](docs/design/LEAGUE-COMMUNITY-CHARITY.md), [planszówka 2–6 osób](docs/design/BOARDGAME-LIGHTHOUSE-SESSION.md). W tamtym zakresie były projektami, przed implementacją v24 i obecną promocją. [Polityka wersji](docs/VERSIONING.md) odróżnia numer produktu od SHA i numerów sklepów; pierwsze wydanie Google Play użytkownik wskazał jako 1.0.0.0.

Projekt ligi w tamtej rewizji miał średnią wyników z premią współpracy i sojusze z czatem, a dobroczynność — ograniczoną pulę, przycisk i rzeczywisty bonus szczęścia. Planszówka ma teraz jedną talię, telefon i pionki oraz korzyści online. Była to rewizja zasad przed GO. Wówczas rejestr miał 241 zmian i 46 przypadków; aktualne liczby i stan są w tabeli powyżej.

Rzeczywisty koszt ostatnich 24 h jest nieustalony z powodu braku dostępu do Billing; [przygotowany odczyt](docs/GCP-COST-CONTROL.md#odczyt-ostatnich-24-godzin--zlecenie-31-października) nie jest wynikiem finansowym. Nie wykonywano pełnego resetu trzech kont.

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

Zakres [v20](docs/FRONTEND-V20-REQUIREMENTS.md), zawarty w opublikowanym v22.1, zaczyna nową wyspę od opisu gry, jej nazwania i oprowadzania po interfejsie. Zegar rusza po ukończeniu lub zamknięciu oprowadzania, a następnie zaczyna się standardowy samouczek. Migracja zachowuje istniejące światy i postęp lekcji. Postęp zapisuje się automatycznie co 30 sekund wyłącznie w chmurze; ręczny panel zapisu zastępuje bezpośrednie wylogowanie. Sesja po przekroczeniu bezczynności nie odnawia się samoczynnie po ponownym otwarciu przeglądarki.

## Konta i integracje

Zakres [v21](docs/FRONTEND-V21-REQUIREMENTS.md), zawarty w opublikowanym v22.1, przeplata nagrody nowego 25-krokowego samouczka z wydawaniem zasobów i dąży do zakończenia z pełnym magazynem bez zaległych skrzyń. Zachowuje stare postępy i nagrody. Rozbudowa Ratusza od 3→4 wymaga 75% ludności poprzedzającego poziomu; od Ratusza 6 handel graczy zastępuje nowe zlecenia NPC. Ratusz 10 pozwala utworzyć drugą wyspę, z jednorazowym skopiowaniem poziomów Ratusza i Magazynu. Własny statek przewozi 1000 sztuk w 10 minut bez opłaty za rejs; płatne zwiększenie pojemności jest symulacją DEV/PRE-PROD. Aktywacja serwerowego API i nowego rynku pozostaje do odrębnego potwierdzenia.

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

Pilna poprawka0.9.1.2 jest odebrana na DEV i PRE-PROD; [tag urgent-0.9.1.2-20261031](https://github.com/ksobczak321-oss/gra/tree/urgent-0.9.1.2-20261031) wiąże źródło i wyniki. Wszystkie wcześniejsze wskazania v22.1 pozostają opisem historii zawartych reguł; aktualne dowody podaje rejestr środowisk.
