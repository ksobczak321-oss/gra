# HARBORLIGHT

## Rozbudowa grafiki wszystkich budynków — DEV 0.15.2.0 / cache16, w przygotowaniu

GO użytkownika obejmuje wszystkie 20 funkcji wyspy i dekoracyjną chatkę: 10 wyglądów dla par poziomów 1–2 do 19–20, wspólne warianty na mapie i w menu, średniowieczny żuraw tylko podczas rzeczywistej budowy. Powyżej poziomu 20 pozostaje ostatni wygląd; limit poziomów i model gospodarki bez zmian. Ozdobna chatka nie ma funkcji ani przycisku, a jej wygląd podąża za Ratuszem. Teatr zachowuje funkcjonalny poziom1 i również zmienia wygląd według Ratusza. Port zachowuje istniejący statek.

Przygotowano 200 wariantów, 22 obrazy WebP bez strat (32 305 562 bajty; potwierdzona identyczność pikseli RGBA z wygenerowanymi PNG), 26 masek terenu i osobną galerię. Pakiet ma zamkniętą listę 255 plików; limit 80 MiB zachowuje pełną jakość i dotychczasową granicę 256 wpisów. Nowe testy modelu prezentacji: 15/15 PASS. Przegląd 200 wariantów i kierunkowy program rzeczywistego runtime PASS; pełny startup po lokalnym timeout wymaga końcowego CI. Końcowy odbiór obrazu, pełny CI, publikacja Pages i niezmienny tag nowego źródła pozostają **PENDING**. Arkusze odświeżone i świeżo zwalidowane: master ma 158 kart (100 archiwalnych i 58 bieżących), 62 491 bieżących wierszy i 120 odcisków źródeł, w tym tabelę 200 wariantów. Redakcyjny Excel zachowuje 6 kart, 413 wierszy i pustą kolumnę C. **Tylko DEV; bez PRE-PROD, PROD, DNS, resetów lub zmian kont.**

[Zakres](docs/v32/GO-BUILDING-UPGRADE-ART.md) · [Dowody](docs/v32/BUILDING-UPGRADE-ART-EVIDENCE.json) · [Grafiki](docs/v32/BUILDING-UPGRADE-ART-ASSETS.json).

[Gra DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-16) · [Galeria 200 wariantów](https://ksobczak321-oss.github.io/gra/harborlight-building-gallery.html?v=frontend-v32-16).

## Doradca Królestwa — DEV 0.15.1.0 / cache15, odebrany

Pierwsze wprowadzenie ma trzy kroki: **górny pasek → dolne menu → Gospodarstwo**. Dalsze rady i rozmowa z doradcą są dobrowolne. Pełny katalog i 25 lekcji pozostają w Pomocy, z zachowaną historią i nagrodami.

Uwzględniono pięć fioletowych zakładek, także jasnofioletowe „Odłożone odkrycia”: 175 wierszy, 34 niepuste C, 35 poprawionych tekstów i 10 dodanych rekordów katalogu. Siedem projektów pozostaje odłożonych. Testy kierunkowe: 30/30 PASS. Pełny master ma źródło 76a663d: obejmuje 157 arkuszy i 61 971 bieżących wierszy, a arkusz redakcyjny ze źródła abacd3f ma 6 zakładek, 413 wierszy i pustą kolumnę C. Budowa i niezależna walidacja przeszły.

DEV 0.15.1.0 / cache15 z poprawką CSS layout2 odebrany dla źródła `4dcc34ec3b462992330f88a22062070fcc0f7092`: [CI44164876130](https://github.com/ksobczak321-oss/gra/actions/runs/44164876130) i [Pages44164876499](https://github.com/ksobczak321-oss/gra/actions/runs/44164876499) **SUCCESS**. 1475 testów frontend, 170 backend, 7 planszówki i wszystkie 69 programów Chromium PASS; master i oba arkusze zwalidowane. Wszystkie 229 plików (36 879 151 bajtów) pobrano przez HTTPS i porównano z wersją w Git. Natywny HTTPS Chromium w tej infrastrukturze ma ograniczenie certyfikatu; odtworzenie rzeczywistych publicznych bajtów lokalnie PASS, bez obchodzenia TLS. Tag `dev-0.15.1.0-20261117` opublikowany i zdalnie potwierdzony na tym samym źródle. Poprzednie CI44141264184,44148037986,44154508808,44160545938 pozostają FAILURE. Doradca pozostawia dostęp do mapy na 320 i 390 px i dolnego menu starszych zapisów, także po wyciszeniu. Ręczny odbiór użytkownika: NOT_RUN. **Zakres: wyłącznie DEV.**

[DEV — start gry](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-15&ui=3) · [DEV — podgląd poziomu 5](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5&v=frontend-v32-15&ui=3)

[Zakres](docs/v32/GO-KINGDOM-ADVISOR.md) · [Dowody](docs/v32/KINGDOM-ADVISOR-EVIDENCE.json) · [HL-CHG-1159](docs/tracking/changes/HL-CHG-1159.md).


**Osobne minigry — DEV odebrany, pierwszy odbiór PRE-PROD nieudany.** Źródło 03f39a2 ma CI i Pages SUCCESS oraz niezmienny tag DEV. Gotowe 55 gier, 55 Word i 55 TXT są opublikowane na Hostingu, lecz PRE-PROD 44093734171/próba1 zakończył się FAILURE przez ścieżkę uruchamiania modułu. Nowa poprawka, własny CI i ponowna standardowa promocja oczekują; nie ma udanego receipt ani tagu PRE-PROD tej próby. [Indeks i dokumenty](https://harborlight-dev.web.app/minigames/) · [Zakres i przyczyna](docs/v32/GO-MINIGAMES-STANDALONE.md) · [Dowody](docs/v32/MINIGAMES-STANDALONE-EVIDENCE.json).

**DEV i PRE-PROD0.15.0.2/cache13 odebrane — 16listopada2026.** Aplikacja37061c, publikacja/wdrożenie `c4f752142c0421aad1dc0490a2f5139c277e6ee5`. WłasnyCI43850690541 SUCCESS24m31s (1614Node,166Python,66programówChromium), Pages43850690456 SUCCESS22s i PRE-PROD43854387444/1 SUCCESS2m22s. Start bez starej mapy/HUD; tempo1×/2×/6× tylkoadmin3. Natywny odbiór zalogowanej istniejącej wyspy i wszystkie109bajtowo zgodne plikiTLS PASS. TagiDEV/PRE-PROD0.15.0.2 opublikowane i zdalnie potwierdzone na c4.

[Graj w PRE-PROD](https://harborlight-dev.web.app/harborlight-auth.html?mode=login&v=frontend-v32-13) · [Podgląd DEV bez konta](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-13) · [Dowody odbioru](docs/v32/CACHE13-ACCEPTANCE.json) · [MASTER 15 — pełne zasady](docs/arkusze/HARBORLIGHT15-zasady.xlsx) · [Teksty6arkuszy do redakcji](docs/arkusze/HARBORLIGHT15-redakcja-6-zakladek.xlsx).

Wcześniejszy reset zakończony; nowe wdrożenie zachowało generacje2,1istniejącą wyspę i2puste, bez zapisów audytowych. Ręczny odbiór użytkownika NOT_RUN. PROD i DNS odłożone. Kolejny commit metadanych nie zmienia odebranego źródła c4 ani tagów.

**MASTER Excel 15** zawiera 156 arkuszy (100 archiwalnych i 56 bieżących), 61 262 bieżące wiersze i przeszedł świeżą walidację PASS. Obejmuje zasady, teksty i warunki, produkcję, minigry oraz rzeczywiste próby 24/24/72 h; 50 dni pozostaje planem. [Opis i regenerowanie](docs/arkusze/README.md) · [Raport](docs/arkusze/HARBORLIGHT15-zasady-walidacja.json). Gra i wdrożenia bez zmian. Artefakt gotowy do publikacji w Git; wynik nowego CI należy sprawdzić w Actions.

## Historia wcześniejszych wydań i checkpointów

**DEV 0.15.0.0 / v32 — zmiany wyłącznie na DEV.** Bazą jest dokładny kod odebranego PRE-PROD `7e81a1a436770f57fd8abf390b6af8022e3300f6` / 0.14.0.0. Zintegrowano uzgodnienia z załączonej rozmowy i 47 odpowiedzi. PRE-PROD i PROD nie otrzymują tego wydania.

**[DEV — podgląd admin1 na poziomie5](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5&v=frontend-v32-6)** — publikacja i odbiór bieżącego źródła są ewidencjonowane osobno w [statusie DEV](docs/v32/DEV-READY.md). Podgląd działa bez konta, w pamięci bieżącej karty; odświeżenie zaczyna nową próbę. Trwałe konta i współdzielone usługi wymagają lokalnego serwera DEV.

[Ściągawka zmian do testów](docs/v32/TEST-CHEATSHEET.md) · [Lista z checkboxami](https://ksobczak321-oss.github.io/gra/docs/testing/dev-v32-checklist.html) · [Excel15 — teksty do redakcji](docs/arkusze/HARBORLIGHT15-teksty-DEV.xlsx).

Lokalny DEV: `node scripts/serve-dev.mjs`, `http://localhost:3000/harborlight-auth.html`; pary login/hasło `admin1/admin1`, `admin2/admin2`, `admin3/admin3`. Zapis znajduje się na serwerze DEV, poza repozytorium. [Zakres i dostęp](docs/v32/DEV-READY.md) · [Audyt reguł](docs/v32/IMPLEMENTATION-AUDIT.md) · [Interfejs](docs/v32/VISUAL-REVIEW.md) · [Balans](docs/v32/DEV-BALANCE.md).

15 listopada 2026 potwierdzono osobno rzeczywiste logowanie Firebase PRE-PROD trzema parami `adminN/adminN`; hasła już były zgodne, nie zmieniano kont ani zapisów. Kod PRE-PROD nadal wskazuje `7e81a1a`; bieżący odczyt `/api/v1/config` zwracał 503 i nie stanowi odbioru działania usług.

Poniżej zachowano historię poprzednich wydań i ich własne wyniki.

**DEV i PRE-PROD 0.14.0.0 / v31 odebrane — 4 listopada 2026.** Źródło `7e81a1a436770f57fd8abf390b6af8022e3300f6`, cache `frontend-v31-2`. Własne [CI 41906515746](https://github.com/ksobczak321-oss/gra/actions/runs/41906515746) SUCCESS 17 min 12 s, [Pages 41906515747](https://github.com/ksobczak321-oss/gra/actions/runs/41906515747) SUCCESS 50 s, [bridge 41909239074](https://github.com/ksobczak321-oss/gra/actions/runs/41909239074) SUCCESS 13 s i [deploy 41909268052, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41909268052) SUCCESS 2 min 12 s. Kontrole API, dokładnego Hostingu, zalogowanej gry i izolacji trzech kont PASS; oba artefakty opublikowano. Konta, hasła i postęp zachowano bez resetu. PROD bez nowej promocji.

**[Graj w PRE-PROD](https://harborlight-dev.web.app)** · **[Podgląd DEV](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v31-2)** · [Dowody promocji](docs/PREPROD-V31-PROMOTION.md) · [Odbiór DEV](docs/DEV-0.14.0.0-VALIDATION.md) · [Excel 14](docs/arkusze/HARBORLIGHT14-zasady.xlsx).

Oba opublikowane tagi `dev-0.14.0.0-20261104` i `preprod-0.14.0.0-20261104` wskazują to samo źródło. Nowy pakiet obejmuje naprawy misji, rekrutacji, logistyki i zapisu, godzinny licznik minigier, 22 mechaniki zagadek, 20 opowieści po 5 wariantów oraz swobodny plac Teatru. [Plan 50 dni](docs/design/ACTIVE-PLAYER-50-DAYS.md) i [częściowa symulacja](docs/design/CAMPAIGN-V31-SIMULATION.md) rozdzielają projekt od obserwacji; pełnego testu 50 dni i 150 godzin ludzkiej zabawy nie zaliczono. **450 kart / 179 ręcznych prób NOT RUN**. Późniejszy commit metadanych nie zmienia źródła wdrożenia.

**Poprzedni PRE-PROD 0.13.1.0 — historia odbioru.** Źródło `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`; CI [41671140612](https://github.com/ksobczak321-oss/gra/actions/runs/41671140612) **SUCCESS, 14m 57s**, Pages [41671140578](https://github.com/ksobczak321-oss/gra/actions/runs/41671140578) **SUCCESS, 32s**, bridge [41673757060](https://github.com/ksobczak321-oss/gra/actions/runs/41673757060) **SUCCESS, 26s**, deploy [41673824262, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41673824262) **SUCCESS, 2m 56s**. Kontrole API/health/ready, dokładnego Hostingu, zalogowanej gry i izolacji trzech kont PASS; oba artefakty opublikowano. Konta, UID, hasła i postęp zachowano bez resetu. PROD i rzeczywiści operatorzy bez nowej aktywacji.

**Adresy poniżej pokazują bieżące wydanie; historyczny odbiór 0.13.1.0:** [PRE-PROD](https://harborlight-dev.web.app) · **[Podgląd dawnego DEV 0.13.1.0](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v30)** · [Pełne dowody promocji](docs/PREPROD-V30-PROMOTION.md). Tag `preprod-0.13.1.0-20261103` jest opublikowany i potwierdzony zdalnie: obiekt `52888386a2233fc326e4fa6e0169b1054c0316d4` rozwiązuje się do `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`. Tag DEV `dev-0.13.1.0-20261103` pozostaje na `13c55a4e4853edf44c185747c1c626ac42c221fc`. Późniejszy commit dokumentacji nie zastępuje źródła wdrożenia ani nie przesuwa tagów.

**Poprzedni DEV 0.13.1.0 / v30 — historia odbioru.** Źródło `13c55a4e4853edf44c185747c1c626ac42c221fc`; [CI 41667711260](https://github.com/ksobczak321-oss/gra/actions/runs/41667711260) **SUCCESS, 14m 39s**; [Pages 41667711124](https://github.com/ksobczak321-oss/gra/actions/runs/41667711124) **SUCCESS, 50s**. Tag `dev-0.13.1.0-20261103` opublikowany i zdalnie potwierdzony na tym samym źródle. Teatr pasujący do wyspy, plac po kliknięciu, bogate dekoracje, trzy pomysły i automatyczny zapis. Dalsze poziomy ozdób przy20miejscach. [Odbiór](docs/DEV-0.13.1.0-VALIDATION.md) · [Wymagania](docs/FRONTEND-V30-REQUIREMENTS.md) · [Excel13](docs/arkusze/HARBORLIGHT13-zasady.xlsx) · [147 scenariuszy](docs/testing/START-HERE.md). Odebrana promocja PRE-PROD ma osobne źródło68e9bcd i [dowody](docs/PREPROD-V30-PROMOTION.md).

**Poprzedni DEV 0.13.0.0 / v29 odebrany.** Źródło `cf6739a081d89bb5b2c6773a04a34f3fe2a8a8da`, [CI 41657032913](https://github.com/ksobczak321-oss/gra/actions/runs/41657032913) **SUCCESS, 13m 13s**, [Pages 41657032922](https://github.com/ksobczak321-oss/gra/actions/runs/41657032922) **SUCCESS, 41s**. Tag `dev-0.13.0.0-20261103` jest opublikowany i wskazuje to samo źródło. Nowa krzywa budowy, pojemność Magazynu, tutorial34/samouczek25, powitalni mieszkańcy, Teatr i dziewięć przygód. [Zakres](docs/FRONTEND-V29-REQUIREMENTS.md) · [Bieżąca walidacja](docs/DEV-0.13.0.0-VALIDATION.md) · [Excel12](docs/arkusze/HARBORLIGHT12-zasady.xlsx) · [134 scenariusze do odhaczania](docs/testing/START-HERE.md). Wyniki ręczne nadal NOT RUN. W dniu tego odbioru DEV PRE-PROD pozostawał0.12.0.0; późniejszy odbiór0.13.1.0 opisano powyżej.

Poniżej zachowano dowody poprzedniego odebranego wydania; nie zastępują własnego odbioru nowego kodu.

**Historyczny odbiór PRE-PROD 0.12.0.0.** Źródło `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`, [CI 41480146644](https://github.com/ksobczak321-oss/gra/actions/runs/41480146644) **SUCCESS, 13 min 46 s**, [Pages 41480146737](https://github.com/ksobczak321-oss/gra/actions/runs/41480146737) **SUCCESS, 41 s**, [bridge 41482423516](https://github.com/ksobczak321-oss/gra/actions/runs/41482423516) **SUCCESS, 21 s** oraz [deploy 41482455135, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41482455135) **SUCCESS, 2 min 20 s**. Przeszły kontrole dokładnego Hostingu, zalogowanej gry i izolacji trzech kont. Oba artefakty opublikowano. Kont, haseł i historii gry nie resetowano; PROD i rzeczywiści operatorzy bez nowej aktywacji. [Pełne dowody promocji](docs/PREPROD-V28-PROMOTION.md).

Tag [`preprod-0.12.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/preprod-0.12.0.0-20261102) jest **opublikowany i potwierdzony zdalnie**: obiekt `d66b25ba216e5b686e6a92b9b8558d35eda9fd2d` rozwiązuje się do `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`. Nie przesuwamy go na późniejsze commity metadanych.

**Historyczny pakiet0.12.0.0** (adresy środowisk pokazują obecnie bieżące wydanie). Aplikacja zachowuje schemat świata9 i archipelag2; 60 publicznych wejść jest identycznych z odebranym DEV0ca7715.

**Poprzedni DEV 0.12.0.0 odebrany dla źródła `0ca7715b6e9282b31ca7941c89c3c742ac0df9e6`**, cache `frontend-v28-2`. Własne [CI 41475214118](https://github.com/ksobczak321-oss/gra/actions/runs/41475214118) zakończyło się **SUCCESS, 12 min 33 s**; obie grupy Chromium przeszły dla tego samego SHA. [Pages 41475213874](https://github.com/ksobczak321-oss/gra/actions/runs/41475213874) ma **SUCCESS, 31 s**. Push na `main` potwierdzono. Tag [`dev-0.12.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/dev-0.12.0.0-20261102) jest **opublikowany i potwierdzony zdalnie**, wskazuje dokładnie ten SHA.

**[179 scenariuszy ręcznych](docs/testing/qa-checklist.html)** · **[Lista do odhaczania](docs/testing/START-HERE.md)** · **[450 kart zmian](docs/tracking/CHANGE-REGISTER.md)** · **[Planszówka do wydruku](docs/boardgame/README.md)**. Automatyczny odbiór listy QA nie zalicza prób ręcznych; wszystkie ich wyniki nadal **NOT RUN**. Integracja planszówki online pozostaje odłożona.

Historyczny pakiet v29 miał34kroki tutoriala,25lekcji programu7, nową krzywą budowy i pojemności, powitalnych mieszkańców, Teatr i9przygód. Zachowuje bank7porcji, modlitwę, misje Latarni, usługi monetami, ligę i oznaczony mock Pomagam. [Zakres](docs/FRONTEND-V29-REQUIREMENTS.md) · [Pełny odbiór i artefakty](docs/DEV-0.13.0.0-VALIDATION.md) · [Środowiska](docs/ENVIRONMENT-STATUS.md).

## Środowiska i wydanie

| Miejsce | Potwierdzony stan |
|---|---|
| DEV | **0.15.0.2/cache13**, źródło `c4f752142c0421aad1dc0490a2f5139c277e6ee5`; CI43850690541 SUCCESS24m31s, Pages43850690456 SUCCESS22s; tag `dev-0.15.0.2-20261116` potwierdzony. |
| PRE-PROD `harborlight-dev` | **0.15.0.2/cache13**, źródło `c4f752142c0421aad1dc0490a2f5139c277e6ee5`; deploy43854387444/1 SUCCESS2m22s, natywne UI i109plikówTLS PASS; tag `preprod-0.15.0.2-20261116` potwierdzony. |
| PROD `harborlight-prod` | Bez nowej promocji i potwierdzenia uruchomienia domeny. |

**Historyczny lokalny odbiór0.12:**1128Node (991frontend +130backend +7planszówka),141Python i32ChromiumPASS. **Historyczna promocja0.13.1.0:**1221Node (1080frontend +134backend +7planszówka),18testów rejestru i generatory/Excel13PASS. Własny CI poprawionego źródła zaliczył obie grupy przeglądarkowe, więc dawny wynik pierwszego pakietu nie zastępuje już bieżącego odbioru. Kierunkowe regresje obejmują dodatkowo 132 wymuszone próby przewijania PL/EN na telefonie, 4 warianty UI, 7 nowych testów prognozy i zestaw 144 testów powiązanych.

Pierwszy kandydat `0d17b7aa91fef72f0fb36d28451d711daeaee909` zachowuje CI 41471972606 **FAILURE, 9 min 48 s**: mobilny przycisk wyjścia tutoriala miał y=-21. Osobny audyt wykrył zawyżoną prognozę czasowej premii. Poprawione źródło0ca7715 ma własny późniejszy sukces; nie przepisujemy wcześniejszej awarii na sukces lub anulowanie.

Nie porównano niezależnie hostowanych bajtów Pages w tej sesji; wcześniejszy odczyt blokował proxy HTTP403. To ograniczenie osobnego odczytu hosta, nie wynik własnego CI lub pakowania.

## Wcześniejsza pilna poprawka 0.9.1.2

[Zakres v23.1](docs/FRONTEND-V23-1-REQUIREMENTS.md) obejmuje wyłącznie wybór języka PL/EN na pierwszym wprowadzeniu i przy nazwie wyspy. Zmiana ma zachować wpisaną nazwę, etap, zatrzymany czas i postęp. Poprawka przeszła własne CI i promocję PRE-PROD; dowody zapisano w rejestrze środowisk. Nie resetowano kont. Tamten zakres miał 251 zmian i 46 ręcznych przypadków; historyczna ewidencja tego odbioru miała **351 zmian i 96 przypadków**, w tym nowe HL-TC-0071–0096 dla v28.

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
