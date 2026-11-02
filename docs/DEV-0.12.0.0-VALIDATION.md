# DEV 0.12.0.0/v28 — odbiór poprawionego kandydata

**Bieżący DEV 0.12.0.0 / cache `frontend-v28-2`: dwie poprawki są gotowe w katalogu roboczym, a końcowy SHA, pełna rewalidacja i własne CI nowego kandydata oczekują.** Prognoza wykonalności uwzględnia wygaśnięcie czasowej premii; krzyżyk tutoriala pozostaje dostępny przy przewijaniu długiej karty telefonu.

Pierwszy kandydat `0d17b7aa91fef72f0fb36d28451d711daeaee909` ma [Pages 41471972395](https://github.com/ksobczak321-oss/gra/actions/runs/41471972395) **SUCCESS, 29 s**, lecz jego [CI 41471972606](https://github.com/ksobczak321-oss/gra/actions/runs/41471972606) zakończyło się **FAILURE, 9 min 48 s**. Publiczna adnotacja onboarding-v20 wskazała przycisk X poza ekranem telefonu (y=-21); grupa 1 Chromium przeszła. To historia nieudanego kandydata, bez tagu i promocji. Dodatkowy audyt wykrył zawyżoną prognozę premii (400 zamiast 240 w przykładowym oknie 10 h); obie regresje muszą przejść własny odbiór poprawionego źródła.

## Bieżąca bramka po poprawkach

| Kontrola | Stan |
|---|---|
| Kod/cache | Poprawka prognozy oraz przewijania tutoriala gotowe; `frontend-v28-2`. Nowy pełny SHA PENDING. |
| Prognoza | Nowy `harborlight-forecast-mission-bonus-v28.test.mjs`:7/7 PASS, zestaw kierunkowy 144/144 PASS. |
| Pełny Node/Python/Chromium po poprawkach | PENDING końcowych wyników nowego źródła; nie przenosimy sum pierwszego kandydata na zmieniony kod. |
| Ręczna lista i generatory | **350 kart /96 ręcznych NOT RUN**. Generatory rejestru/listy/legal --check PASS; browser aktualnej listy 96 PENDING. |
| Nowy pakiet/Git/CI/Pages/tag | PENDING nowego źródła, bez tagu do własnego zielonego CI. |
| PRE-PROD/PROD/dane | Bez nowej promocji, resetu, zmiany haseł lub aktywacji realnych dostawców. PRE-PROD 0.11/c7c3974 pozostaje. |

## Co zmienia v28

- Nowy program 6: 25 praktycznych lekcji, trzy osoby w Magazynie na początku, zwykłe czasy nowych budów i rzeczywiste prowadzenie przez zakup dostawy oraz przyspieszenia. Startowy rabat Ratusza 1→2 i zapisane czasy starych projektów pozostają.
- Tutorial: 33 opisy bez ikony czasu; Pomoc z dwiema ramkami wznowienia, wskazanie `?` po zamknięciu, poprawiona polszczyzna i wszędzie punkty szczęścia.
- Dom: zbiorowe rozdawanie, bank siedmiu niewydanych porcji, jeden punkt straty na północy Warszawy także offline. Zwykła praca i jedzenie nadal dają razem +2 punkty/h; **nie ma krzywej przy 30 punktach**.
- Modlitwa: 10 min × ukończony Ratusz wraz z dojściem/powrotem, +50 punktów na 6 h po powrocie. Parametry DEV: 10 × TH monet/osobę, pojemność według ukończonej Kaplicy.
- Usługi za monety od TH1; PLN kupują wyłącznie monety od TH3, 10 monet/zł. Statek +1000 towarów kosztuje 50 monet. Prawdziwi operatorzy pozostają nieaktywowani.
- Lojalność jest wiadomością i dziennym popupem. Po ostatniej nagrodzie kursu następuje narracyjny rozdział ośmiu zadań Latarni, bez rozpoczęcia terminu samym otwarciem opowieści.
- Zróżnicowane nagrody misji: materiały, monety, mieszkańcy do wolnego limitu bez kolejki nadwyżki, czasowa produkcja ×2. Z premią Latarni daje ×4; identyczna premia wydłuża czas.
- Dwanaście zaakceptowanych poprawek przeglądu obejmuje terminy co najmniej 30 min, proporcjonalne nagrody, zaległe rozdziały, cenę zaproszenia 500 × ukończony TH każdego zasobu, unikalność nazw, gotowość pracowników i jawny mnożnik podatku Kaplicy.
- Liga: siedem punktujących dni i oba zadania 19–21 Warszawy, zamrożone składy, top 4 i playoffy z dogrywkami, cztery warstwy nagród. Czat: 1000 znaków, 20 wiadomości/20 s/konto, zwykła historia 30 dni.
- Pomagam: zaufane podatki/darmowe zadania/wygrane ekspedycji, jeden portfel ze zużyciem niekwalifikowanych monet najpierw; minimum 100 monet = 10 gr. Osobny, jawny trwały mock przelewu i premii +20 punktów/6 h jest kodem przygotowanym dla PRE-PROD, bez nowego wdrożenia ani rzeczywistej pomocy.

## Parametry DEV wymagające oceny balansu

Liczby poniżej są konfiguracją implementacji do przetestowania, nie wcześniejszymi liczbowymi decyzjami użytkownika:

| Obszar | Parametr |
|---|---|
| Modlitwa | Cena 10 × ukończony TH monet za osobę, pojemność według ukończonego poziomu Kaplicy |
| Nagrody misji | Wybrany etap daje jednego mieszkańca; finał grupę 1–3 zależną od rozdziału; reprezentatywna premia producenta trwa 2 h |
| Playoffy | 22 dzień: dogrywki rozstawienia; 23: półfinały; 24: finał; 25: rezerwa; 19–21 Warszawy |
| Mała liga | Dwa składy: finał; trzy: wolny los i półfinał; jeden: pełna liga zasadnicza i nagrody udziału, bez fikcyjnego pucharu |
| Nagrody ligi | 25 udział +75 komplet 14 konkurencji +150 top 4 +500 mistrz, do 750 monet łącznie oraz puchar |
| Nierozstrzygnięcie | Po wyczerpaniu dogrywek w rezerwie wynik oczekuje; nie przyznajemy arbitralnie zwycięstwa |

## Historia prób pierwszego kandydata — nie zastępuje odbioru poprawek

To rzeczywiście wykonane próby zgłoszone przez właścicieli modułów podczas integracji. **Nie sumujemy ich jako pełnego odbioru**: mogą obejmować te same testy, a późniejsze zmiany wymagają ponowienia właściwego zakresu.

| Próba | Bieżący dowód lokalny |
|---|---|
| Misje | 22/22 Node: `harborlight-missions-v27` + `harborlight-missions-v28`; 4 warianty Chromium PL/EN × komputer/telefon w smoke misji |
| Zwykłe zadania | 38/38 Node w dwóch zestawach activities |
| Dom | 10/10 nowych testów banku; 15/15 housing-v27 i 17/17 v9-integration |
| Modlitwa | 11/11 nowych testów prayer-v28 |
| Jednostki i komunikaty szczęścia | 8/8 nowych happiness-copy-v28; effects 13, i 18 n 12, polish-copy 17, progression-copy 3 |
| Handel i archipelag | 116 kierunkowych testów po integracji; nowe commerce-v28 12, ship-capacity-cloud-v28 3 |
| Backend | 130 testów w lokalnym pełnym zestawie modułów backendu; nowe ship-capacity-v28 11, social-v28 8 |
| Społeczność i Pomagam | community 18, charity 12, preview 6; nowe charity-v28 3 |
| Społeczność w Chromium | Nowy social-v28: 4 warianty PL/EN × komputer/telefon; istniejące charity/community smoke po dostosowaniu fixture |
| Python | Pełne 11 plików `*.test.py`: 141/141 lokalnie po poprawce pakowania backendu; rozgrywka planszówki 7/7, bez zmiany integracji online |

Pełny lokalny Node frontendu przeszedł **984/984** po aktualizacji cache, backend **130/130**. Końcowy wspólny przebieg modeli i generatorów: `/tmp/harborlight-v28-final-validation.log`; wcześniejszy pełny frontend: `/tmp/harborlight-v28-node-final2.log`. Generatory rejestru i listy przechodzą dla 350 kart/96 przypadków. Wszystkie **32 zestawy Chromium PASS** na lokalnie zbudowanym pakiecie: 13 w `/tmp/v28-packaged-group1.log`, 12 w `/tmp/v28-packaged-group2.log`, 4 zestawy społeczności i kursu, 1 zestaw zakupu statku oraz 2 w `/tmp/v28-packaged-root.log`. Zmiana wyłącznie dokumentów prawnych ma osobny ponowny odbiór rejestracji: `/tmp/v28-packaged-legal.log`, 2/2 PASS. Testy nie oznaczają wykonania przypadków ręcznych.

## Historyczna bramka pierwszego kandydata

| Kontrola | Stan końcowego źródła v28 |
|---|---|
| Pełny Node | **1121/1121 PASS**:984 frontend +130 backend +7 planszówki; końcowy wspólny przebieg modeli/generatorów i zgodność pakietu potwierdzone |
| Python i import backendu z kontekstu pakowania | **141/141 PASS** na końcowym źródle; obejmuje reguły pakowania i dostępność modułu league-season w obrazie |
| Cały pakiet Chromium PL/EN, desktop/mobile | PASS — 32 zestawy na pakiecie; dodatkowo dwa ponowione zestawy rejestracji po zmianie Regulaminu |
| Generatory rejestru i ręcznej listy | PASS lokalnie: `build_change_register.py --check`, `build_manual_checklist.py --check`; 350 kart/96 przypadków |
| Importer/QA dokumentacji | Importer 18/18 PASS; aktualny browser wcześniejszej listy **94 przypadków PASS**, aktualna lista 96 PENDING. To test narzędzia raportowego, nie ręczne wykonanie 94 scenariuszy |
| Deterministyczny pakiet | **PASS**, 62 pliki/11 330 478 bajtów, archiwum `acaa6991ad61b4f84fb0f9cc32fd2411d21f5ed7ef7d183f01c84fda6fb399fd`, manifest `b505368ece93bb32bc4b34e67c3ee31adba37d8c920028bd9a3a581b675ae321`; weryfikacja i rozpakowanie PASS |
| Git/CI/Pages/tag dokładnego źródła | `0d17b7aa91fef72f0fb36d28451d711daeaee909` push potwierdzony; Pages SUCCESS, 29 s; CI FAILURE9 min 48 s; tag nieutworzony |
| Nowa promocja PRE-PROD/PROD | NOT AUTHORIZED w tym GO, nie uruchomiono |
| Ręczne przeklikanie TC0071–0096 | NOT RUN; żaden automat nie zmienia tego wyniku |

## Historyczny pakiet i publikacja pierwszego kandydata

Źródło aplikacji **`0d17b7aa91fef72f0fb36d28451d711daeaee909`** wysłano do `main` i potwierdzono zdalnie. [Pages 41471972395](https://github.com/ksobczak321-oss/gra/actions/runs/41471972395) zakończone **SUCCESS, 29 s**. Własne [CI 41471972606](https://github.com/ksobczak321-oss/gra/actions/runs/41471972606) jest **FAILURE9 min 48 s**; mobilny błąd wyjścia onboarding-v20. **Tagu v28 jeszcze nie utworzono** — nowe poprawione źródło wymaga własnego zielonego CI. Bezpośredni odczyt hostowanego Pages w tej sesji blokuje proxy HTTP 403; nie potwierdzono niezależnie bajtów serwowanych przez host. Sukces workflow Pages nie jest taką kontrolą.

| Właściwość | Wartość |
|---|---|
| Źródło aplikacji | `0d17b7aa91fef72f0fb36d28451d711daeaee909` |
| Pliki i bajty lokalnego archiwum |62 pliki /11 330 478 bajtów |
| Wejścia publiczne |60 wejść identycznych z odebranym pakietem po zmianie Regulaminu |
| SHA-256 archiwum |`acaa6991ad61b4f84fb0f9cc32fd2411d21f5ed7ef7d183f01c84fda6fb399fd` |
| SHA-256 manifestu |`b505368ece93bb32bc4b34e67c3ee31adba37d8c920028bd9a3a581b675ae321` |
| Weryfikacja i rozpakowanie |PASS |
| Odbiór hostowanych bajtów Pages |BLOCKED: proxy HTTP 403 w tej sesji; nie uznano ich za niezależnie porównane |
| Nowy tag |Nieutworzony; czeka na własne CI |

Końcowe lokalne wyniki: **1121 Node, 141 Python i 32 zestawy Chromium PASS**, dwa ponowienia po zmianie dokumentów prawnych PASS oraz browser aktualnej listy QA 94 PASS. Ręczne przypadki mają nadal **NOT RUN**. Dowód 32 zestawów dotyczy lokalnego serwowania zbudowanego pakietu; dodatkowe 2 ponowienia obejmują zmianę dokumentów/wersji rejestracji. Pakiet tego źródła ma te same 60 wejść publicznych. Ta migawka dotyczy pierwszego kandydata. Późniejsze poprawki prognozy i wyjścia zmieniają kod oraz wymagają nowego źródła, pakietu i własnego CI; nie używamy tych hashy jako odbioru poprawek.

## Ręczne scenariusze i ograniczenia

[Lista do odhaczania](testing/START-HERE.md) · [interaktywny raport](testing/qa-checklist.html) · [plan i stosowanie historycznych przypadków](testing/MANUAL-TEST-PLAN.md) · [rejestr zmian](tracking/CHANGE-REGISTER.md).

Nowe przypadki wymagają izolowanych danych QA oraz rzeczywistego buildu. Brak usługi, zegara testowego lub fixture oznacza BLOCKED. Kod trwałego mocka i test z atrapą nie dowodzą uruchomienia go w chmurze. Gospodarka klienta nie staje się autorytatywną symulacją serwerową wskutek tej paczki. Rzeczywiści beneficjenci, dostawcy płatności/reklam/OAuth, publikacja społecznościowa i integracja planszówki online pozostają osobnymi pracami.

## Poprawki po pierwszym kandydacie

- HL-CHG-1020: logistics.js, nowa regresja prognozy 7/7 PASS, kierunkowy zestaw 144/144 PASS. Pełne nowe źródło i CI oczekuje.
- HL-CHG-1021: pierwszy CI 41471972606 FAILURE9 m 48 s, onboarding-v20 mobile Xy=-21. Poprawka przewijanego nagłówka/przycisku i wymuszona regresja są gotowe; pełny wynik nowego źródła oczekuje. Wynik nie jest CANCELLED.
- Ręczne TC0095–0096 NOT RUN. Browser QA 94 był zaliczony przed ich dodaniem; aktualny indeks 96 i generator to odrębna kontrola.


Końcowa próba kandydata 2 przed wysłaniem: **991/991 testów modeli PASS**, `/tmp/harborlight-v28-2-final-node.log`, bez równoległego Chromium. Wcześniejsze przekroczenie limitu 10 sekund w teście96 h przy obciążeniu przeglądarką pozostaje nieudaną próbą; test izolowany przeszedł w8 s, a pełny ponowny przebieg przeszedł z niezmienionym limitem. Dla zamykania tutoriala przeszły: pierwotny onboarding20, **132 wymuszone długie i przewijane kroki** na małych ekranach PL/EN oraz cztery warianty UI release28. Nowe CI dokładnego kandydata nadal wymaga osobnego wyniku.
