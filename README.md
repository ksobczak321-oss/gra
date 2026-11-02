# HARBORLIGHT

**[Graj w PRE-PROD 0.11.0.0](https://harborlight-dev.web.app)** — ostatni odebrany deploy41362782175/próba 1, źródło `c7c39742594599c54ee8b074b5c313efd88af4cb`. Konta i postęp zachowano; brak nowej promocji PRE-PROD/PROD i resetu.

**Bieżący DEV 0.12.0.0 / cache `frontend-v28-2`: dwie poprawki są gotowe w katalogu roboczym, a końcowy SHA, pełna rewalidacja i własne CI nowego kandydata oczekują.** Prognoza wykonalności uwzględnia wygaśnięcie czasowej premii; krzyżyk tutoriala pozostaje dostępny przy przewijaniu długiej karty telefonu.

Pierwszy kandydat `0d17b7aa91fef72f0fb36d28451d711daeaee909` ma [Pages 41471972395](https://github.com/ksobczak321-oss/gra/actions/runs/41471972395) **SUCCESS, 29 s**, lecz jego [CI 41471972606](https://github.com/ksobczak321-oss/gra/actions/runs/41471972606) zakończyło się **FAILURE, 9 min 48 s**. Publiczna adnotacja onboarding-v20 wskazała przycisk X poza ekranem telefonu (y=-21); grupa 1 Chromium przeszła. To historia nieudanego kandydata, bez tagu i promocji. Dodatkowy audyt wykrył zawyżoną prognozę premii (400 zamiast 240 w przykładowym oknie 10 h); obie regresje muszą przejść własny odbiór poprawionego źródła.

**[Testy do odhaczania](docs/testing/START-HERE.md)** · **[96 scenariuszy ręcznych](docs/testing/qa-checklist.html)** · **[350 kart zmian](docs/tracking/CHANGE-REGISTER.md)** · **[Planszówka do wydruku](docs/boardgame/README.md)**. Wszystkie ręczne wyniki **NOT RUN**; integracja planszówki online pozostaje odłożona.

Nowe reguły obejmują 33 opisy tutoriala, 25 lekcji programu 6 od 3 tragarzy, rzeczywiste przyspieszenia, bank 7 porcji, modlitwę, narracyjne misje Latarni, usługi monetami TH1/doładowania TH3, ligę z playoffami i oznaczony mock Pomagam. [Zakres](docs/FRONTEND-V28-REQUIREMENTS.md) · [Bieżący odbiór](docs/DEV-0.12.0.0-VALIDATION.md) · [Środowiska](docs/ENVIRONMENT-STATUS.md).

## Środowiska i wydanie

| Miejsce | Bieżący stan |
|---|---|
| DEV | Poprawiony kandydat 0.12.0.0/cache `frontend-v28-2`; końcowy SHA/pełne testy/własne CI PENDING. Pierwszy kandydat0d17b7a ma historyczne CI FAILURE. |
| PRE-PROD `harborlight-dev` |0.11.0.0 /`c7c39742594599c54ee8b074b5c313efd88af4cb`, deploy41362782175/próba 1 SUCCESS. Bez nowej promocji. |
| PROD `harborlight-prod` | Bez nowej promocji i potwierdzenia uruchomienia domeny. |

Lokalny odbiór **pierwszego kandydata**:1121 Node (984 frontend +130 backend +7 planszówki),141 Python, 32 zestawy Chromium oraz 2 ponowienia rejestracji PASS. Browserów lista QA 94 PASS dotyczyła narzędzia raportowego, nie ręcznego wykonania 94 zadań. Aktualny rejestr 96 i poprawiony kod wymagają odpowiedniego ponowienia. Te wyniki nie obejmują nowo wykrytych regresji. Proxy 403 blokuje wtej sesji niezależny odczyt bajtów hostowanego Pages.

## Wcześniejsza pilna poprawka 0.9.1.2

[Zakres v23.1](docs/FRONTEND-V23-1-REQUIREMENTS.md) obejmuje wyłącznie wybór języka PL/EN na pierwszym wprowadzeniu i przy nazwie wyspy. Zmiana ma zachować wpisaną nazwę, etap, zatrzymany czas i postęp. Poprawka przeszła własne CI i promocję PRE-PROD; dowody zapisano w rejestrze środowisk. Nie resetowano kont. Tamten zakres miał 251 zmian i 46 ręcznych przypadków; bieżąca ewidencja DEV ma **350 zmian i 96 przypadków**, w tym nowe HL-TC-0071–0096 dla v28.

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
- Nagrody rund 50, 100, 200, 400… i pula 50, 150, 350, 750…; dobrowolne przedłużenie przed terminem, ryzyko niewypłaconej serii i zachowany wybór kulek/trójek.
- Zapisywany harmonogram propozycji minigry/reklamy, nagrody materiałowe 10–30, osobne uprawnienie bez reklam w standardowej grze po zakupach 1999 gr/30 dni. Reklamy za czas ekspedycji pozostają także dla uprawnionych.
- Codzienne darmowe błogosławieństwo, wydarzenia dobre/złe, regularność Kaplicy, lojalność 50–200 sześciu zasobów oraz czytelne powiadomienia.
- Postęp konta wyłącznie w chmurze. Brak lokalnej wyspy i lokalnej kopii odzyskiwania; brak połączenia blokuje zatwierdzanie działań. Język i techniczna sesja logowania nie są zapisem postępu.

Nowe parametry cen dodatkowego czasu i wag wydarzeń są jawnie opisane jako konfigurowalne wartości wdrożeniowe. Ostatni wygenerowany [Excel 11](docs/arkusze/HARBORLIGHT11-zasady.xlsx) jest migawką reguł v18/v19 i [scenariuszy testowych](docs/TEST-SCENARIOS-v18.md); nie obejmuje rozszerzeń v20–v22. Starsze arkusze pozostają archiwami i nie są nadpisywane.

Uzupełnienie v19 dodaje bezpośrednie wylogowanie i odnośniki do dokumentów w Ustawieniach. Rejestracja wymaga osobnej akceptacji [roboczego Regulaminu](docs/TERMS-DRAFT.pl.md) i potwierdzenia przeczytania [Polityki prywatności](docs/PRIVACY-DRAFT.pl.md); nowe konta otrzymują wersjonowane potwierdzenie serwera. Dane operatora „Lorem ipsum” wymagają uzupełnienia przed publicznym uruchomieniem. Stałe konta PRE-PROD zachowują dostęp i historię.

Zakres [v20](docs/FRONTEND-V20-REQUIREMENTS.md), zawarty w opublikowanym v22.1, zaczyna nową wyspę od opisu gry, jej nazwania i oprowadzania po interfejsie. Zegar rusza po ukończeniu lub zamknięciu oprowadzania, a następnie zaczyna się standardowy samouczek. Migracja zachowuje istniejące światy i postęp lekcji. Postęp zapisuje się automatycznie co 30 sekund wyłącznie w chmurze; ręczny panel zapisu zastępuje bezpośrednie wylogowanie. Sesja po przekroczeniu bezczynności nie odnawia się samoczynnie po ponownym otwarciu przeglądarki.

## Konta i integracje

Zakres [v21](docs/FRONTEND-V21-REQUIREMENTS.md), zawarty w opublikowanym v22.1, przeplata nagrody nowego 25-krokowego samouczka z wydawaniem zasobów i dąży do zakończenia z pełnym magazynem bez zaległych skrzyń. Zachowuje stare postępy i nagrody. Rozbudowa Ratusza od 3→4 wymaga 75% ludności poprzedzającego poziomu; historyczne v21 zastępowało NPC handlem graczy od Ratusza 6; późniejsza przyjęta zasada przywraca obie ścieżki równolegle. Ratusz 10 pozwala utworzyć drugą wyspę, z jednorazowym skopiowaniem poziomów Ratusza i Magazynu. Własny statek przewozi 1000 sztuk w 10 minut bez opłaty za rejs; aktualnie zwiększenie pojemności towarowej kosztuje 50 monet za 1000 sztuk, zamiast osobnego zakupu PLN. Aktywacja serwerowego API i nowego rynku pozostaje do odrębnego potwierdzenia.

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

Pilna poprawka 0.9.1.2 jest odebrana na DEV i PRE-PROD; [tag urgent-0.9.1.2-20261031](https://github.com/ksobczak321-oss/gra/tree/urgent-0.9.1.2-20261031) wiąże źródło i wyniki. Wszystkie wcześniejsze wskazania v22.1 pozostają opisem historii zawartych reguł; aktualne dowody podaje rejestr środowisk.
