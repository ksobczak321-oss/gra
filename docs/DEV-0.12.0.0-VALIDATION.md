# DEV 0.12.0.0 / v28 — bieżący odbiór

**Stan: implementacja i pełna walidacja DEV w toku, 2 listopada 2026, Europe/Warsaw.** Zakres wynika z [GO v28](FRONTEND-V28-REQUIREMENTS.md). Ten dokument nie jest odbiorem nowej publikacji. Wyników 0.11.0.0 nie przenosimy na zmieniony kod.

## Źródło i granice

| Warstwa | Stan tej paczki |
|---|---|
| Aplikacja bazowa | 0.11.0.0 / `c7c39742594599c54ee8b074b5c313efd88af4cb` |
| Bazowy commit metadanych | `aae61ec38b61b0e4f96f4fb0378dacd88a37d836` |
| Zmieniony kod DEV 0.12.0.0 | Lokalny katalog roboczy; końcowy pełny SHA i odbiór wymagają uzupełnienia |
| Własne CI / Pages / tag | **PENDING** — brak potwierdzonego przebiegu końcowego źródła v28 |
| PRE-PROD | Bez nowej promocji: 0.11.0.0 / `c7c39742594599c54ee8b074b5c313efd88af4cb`; [41362782175, próba 1, SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41362782175) to odbiór poprzedniego wydania |
| PROD i dane graczy | Bez promocji, resetu kont/wysp, zmiany haseł oraz aktywacji prawdziwych płatności, reklam lub darowizn |
| Ewidencja | **348 atomowych kart zmian, 94 ręczne przypadki NOT RUN**; nowe karty HL-CHG-0969–1019 i przypadki HL-TC-0071–0094 |

Konta i postęp `admin1`–`admin3` pozostają chronione. Zmiany zapisów zachowują starsze programy lekcji, aktywne projekty, historyczne kwoty i jednokrotność nagród. Kontrole lokalne oraz symulowane API nie potwierdzają aktywacji usług GCP.

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

## Potwierdzone próby cząstkowe w lokalnym katalogu roboczym

To rzeczywiście wykonane próby zgłoszone przez właścicieli modułów podczas integracji. **Nie sumujemy ich jako pełnego odbioru**: mogą obejmować te same testy, a późniejsze zmiany wymagają ponowienia właściwego zakresu.

| Próba | Bieżący dowód lokalny |
|---|---|
| Misje | 22/22 Node: `harborlight-missions-v27` + `harborlight-missions-v28`; 4 warianty Chromium PL/EN × komputer/telefon w smoke misji |
| Zwykłe zadania | 38/38 Node w dwóch zestawach activities |
| Dom | 10/10 nowych testów banku; 15/15 housing-v27 i 17/17 v9-integration |
| Modlitwa | 11/11 nowych testów prayer-v28 |
| Jednostki i komunikaty szczęścia | 8/8 nowych happiness-copy-v28; effects 13, i18n 12, polish-copy 17, progression-copy 3 |
| Handel i archipelag | 116 kierunkowych testów po integracji; nowe commerce-v28 12, ship-capacity-cloud-v28 3 |
| Backend | 130 testów w lokalnym pełnym zestawie modułów backendu; nowe ship-capacity-v28 11, social-v28 8 |
| Społeczność i Pomagam | community 18, charity 12, preview 6; nowe charity-v28 3 |
| Społeczność w Chromium | Nowy social-v28: 4 warianty PL/EN × komputer/telefon; istniejące charity/community smoke po dostosowaniu fixture |
| Python | Pełne 11 plików `*.test.py`: 141/141 lokalnie po poprawce pakowania backendu; rozgrywka planszówki 7/7, bez zmiany integracji online |

Pełny lokalny Node frontendu przeszedł **984/984** po aktualizacji cache, backend **130/130**. Końcowy wspólny przebieg modeli i generatorów: `/tmp/harborlight-v28-final-validation.log`; wcześniejszy pełny frontend: `/tmp/harborlight-v28-node-final2.log`. Generatory rejestru i listy przechodzą dla 348 kart/94 przypadków. Wszystkie **32 zestawy Chromium PASS** na lokalnie zbudowanym pakiecie: 13 w `/tmp/v28-packaged-group1.log`, 12 w `/tmp/v28-packaged-group2.log`, 4 zestawy społeczności i kursu, 1 zestaw zakupu statku oraz 2 w `/tmp/v28-packaged-root.log`. Zmiana wyłącznie dokumentów prawnych ma osobny ponowny odbiór rejestracji: `/tmp/v28-packaged-legal.log`, 2/2 PASS. Testy nie oznaczają wykonania przypadków ręcznych.

## Bramka końcowego odbioru

| Kontrola | Stan końcowego źródła v28 |
|---|---|
| Pełny Node: frontend i backend | Lokalnie 984/984 frontend i 130/130 backend PASS; przypisać końcowy SHA po zakończeniu prac |
| Python i import gotowego obrazu backendu | Próba lokalna 141 PASS; potwierdzić zgodność z końcowym źródłem |
| Cały pakiet Chromium PL/EN, desktop/mobile | PASS — 32 zestawy na pakiecie; dodatkowo dwa ponowione zestawy rejestracji po zmianie Regulaminu |
| Generatory rejestru i ręcznej listy | PASS lokalnie: `build_change_register.py --check`, `build_manual_checklist.py --check`; 348 kart/94 przypadków |
| Importer/QA dokumentacji | Importer `harborlight-tracking-issues.test.py`: 18/18 PASS; browser listy PASS przed dodaniem czterech ostatnich przypadków; ich indeks i HTML potwierdzają generatory, aktualny browser zostanie ponowiony |
| Deterministyczny pakiet, rozpakowanie i publiczne pliki | PENDING — liczba plików/bajtów, SHA-256 archiwum i manifestu |
| Git/CI/Pages/tag dokładnego źródła | PENDING — oddzielne SHA i linki po faktycznym sukcesie |
| Nowa promocja PRE-PROD/PROD | NOT AUTHORIZED w tym GO, nie uruchomiono |
| Ręczne przeklikanie TC0071–0094 | NOT RUN; żaden automat nie zmienia tego wyniku |

## Ręczne scenariusze i ograniczenia

[Lista do odhaczania](testing/START-HERE.md) · [interaktywny raport](testing/qa-checklist.html) · [plan i stosowanie historycznych przypadków](testing/MANUAL-TEST-PLAN.md) · [rejestr zmian](tracking/CHANGE-REGISTER.md).

Nowe przypadki wymagają izolowanych danych QA oraz rzeczywistego buildu. Brak usługi, zegara testowego lub fixture oznacza BLOCKED. Kod trwałego mocka i test z atrapą nie dowodzą uruchomienia go w chmurze. Gospodarka klienta nie staje się autorytatywną symulacją serwerową wskutek tej paczki. Rzeczywiści beneficjenci, dostawcy płatności/reklam/OAuth, publikacja społecznościowa i integracja planszówki online pozostają osobnymi pracami.
