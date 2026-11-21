# Wersja gry HARBORLIGHT





## Kandydat DEV 0.15.3.1 / cache23 — lokalne testy PASS, publikacja PENDING

Po końcowym doprecyzowaniu przyjaznego tonu i adaptacji celu pełny frontend ma 1711/1711 PASS; backend 178, planszówka 7, 145 Python i 8 lokalnych programów UI również PASS. Niezmieniony watchdog 96 h: 8866.634829 ms <10 000 ms. Kierunkowe 60, wcześniejsze 510 i nowe 9+25 mają osobne raporty. Poprzednie 1704 PASS oraz pierwszy FAIL stagingu pozostają historią. Nie zastępują końcowego źródła, jego artefaktów lub własnegoCI.

Nowy Doradca przedstawia jeden cel, 2–5 kart i wszystkie uporządkowane instrukcje z krótkim powodem; wspiera swobodę gracza. Automatyczny plan w Workerze dostosowuje się co 120 s rzeczywistych, a jawny cel rozmowy zachowuje osobny kontekst. Prowadzenie wskazuje mapę, a po otwarciu menu dokładną kontrolkę. CODE/PUB, eksporty, pakiet 28 po eksportach, CI 79 / Pages, tagi i nowy standardowy PRE-PROD są **PENDING**. Oczekiwany pakiet 467 plików wymaga rzeczywistej weryfikacji. Odebrane fc95/cache22 z historią restartu właściciela admin1 pozostaje poniżej bez zmian. 519 kart / 195 przypadków NOT RUN; bez resetu, PROD, DNS i zmian haseł. [Zakres](v32/GO-ADVISOR-TASKS.md) · [Dowody](v32/ADVISOR-TASKS-EVIDENCE.json).

## DEV i PRE-PROD 0.15.3.0 / cache22 — odebrane automatycznie

Kod aplikacji i kanonicznych eksportów: `f6572ee7500b42f56d1575de2e173d1bd635216c`; odebrana publikacja: `fc95a1aadf36a115538ed0b846f9ce48fbba651b`. Własny [CI44926983827](https://github.com/ksobczak321-oss/gra/actions/runs/44926983827) ma **SUCCESS 29 min 15 s**: 1831 Node, 173 Python i 76 programów Chromium. Bieżące [Pages44926983937](https://github.com/ksobczak321-oss/gra/actions/runs/44926983937) ma osobny SUCCESS; wcześniejsze nieudane Pages oraz nieudane i automatycznie anulowane CI pozostają historią. Standardowy [PRE-PROD44929856572/próba1](https://github.com/ksobczak321-oss/gra/actions/runs/44929856572/attempts/1) ma **SUCCESS 8 min 08 s**.

Rzeczywisty admin3 wystartował w **24,843 s**, a przez kolejne 10 s zwykłej gry zachował gotowy ekran i maksymalną przerwę 422.9000000000233 ms. Zapisy testowej przeglądarki były blokowane. UID kont i generacje 2 zachowano. Profile admin2 i admin3 pozostały identyczne bajtowo, z tymi samymi początkami i rewizjami 475/597 oraz niezmienionym zegarem admin3. Użytkownik jawnie potwierdził rozpoczęcie od nowa na admin1 podczas audytu: rewizja 332→379, populacja 12→18 i nowy początek wyspy. Tego postępu i początku nie opisujemy jako zachowanych; QA oraz wdrożenie nie zapisywały świata ani nie resetowały kont. Oba oryginalne ZIP-y, cztery warunki receipt, obraz API, dokładny TAR i wszystkie 462 publiczne pliki mają niezależny PASS. Oba XLSX sprawdzono osobno na Pages. Niezmienne tagi `dev-0.15.3.0-20261121` i `preprod-0.15.3.0-20261121` są zdalnie potwierdzone na tej samej publikacji.

[Zakres i zachowana historia](v32/GO-ADVISOR-GUIDANCE.md) · [Dowody](v32/ADVISOR-GUIDANCE-EVIDENCE.json). Ręczny odbiór wszystkich 187 przypadków: **NOT RUN**. Końcowe metadane nie zmieniają aplikacji, arkuszy ani tagów; bez resetu przez QA lub wdrożenie, zmiany haseł, PROD lub DNS. Potwierdzony restart właściciela admin1 opisano osobno. QA nie zapisywał przeliczonej wyspy. Poniżej zachowano poprzednie wydania w ich historycznym zakresie.

## DEV 0.15.1.0 — doradca i redakcja, odebrany

DEV 0.15.1.0 obejmuje doradcę, trzy kroki pierwszego wprowadzenia i pięć fioletowych zakładek ABC. Bieżące źródło aplikacji to `abacd3fffc7fe033fca6c3a1e9003bb688aa4afa`; HTML i źródło pełnego mastera pozostają76a663d; arkusz redakcyjny ma aktualny odciskCSS. Moduły używają cache15, a CSS rewizji layout2. Własne CI44164876130 i Pages44164876499 SUCCESS; odebrane źródło `4dcc34ec3b462992330f88a22062070fcc0f7092`, tag `dev-0.15.1.0-20261117` potwierdzony zdalnie. Schemat9 i ruleset32 są zachowane; zakres wyłącznie DEV. [Dowody](v32/KINGDOM-ADVISOR-EVIDENCE.json).


Bieżące odebrane DEV i PRE-PROD: **0.14.0.0 / v31**, źródło `7e81a1a436770f57fd8abf390b6af8022e3300f6`, cache `frontend-v31-2`. WłasneCI41906515746 iPages41906515747 SUCCESS; standardowyPRE-PROD41909268052/próba1 SUCCESS. Oba tagi `dev-0.14.0.0-20261104` i `preprod-0.14.0.0-20261104` są opublikowane i zdalnie potwierdzone na tym źródle. [Odbiór](DEV-0.14.0.0-VALIDATION.md) · [Promocja](PREPROD-V31-PROMOTION.md). Schemat świata9 i archipelagu2 pozostały zgodne. Pierwsze wydanie Google Play nadal1.0.0.0.

Poprzedni odebrany DEV: **0.13.1.0 / v30**, źródło `13c55a4e4853edf44c185747c1c626ac42c221fc`; własne CI i Pages SUCCESS. PRE-PROD **0.13.1.0** jest odebrany dla źródła `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`; własneCI41671140612 i deploy41673824262/próba1 SUCCESS. Tag`preprod-0.13.1.0-20261103` opublikowany i potwierdzony zdalnie; [dowody](PREPROD-V30-PROMOTION.md). Numer aplikacji jest odrębny od schematu9 i archipelagu2. Pierwsze wydanie Google Play nadal1.0.0.0.

## Proponowana polityka czterech segmentów

Interpretacja „mniejsze zmiany podnoszą dalsze miejsce, większe wcześniejsze” wymaga jednoznacznego zapisu. Proponujemy `A.B.C.D`:

| Segment | Zastosowanie | Przykład po 0.9.1.1 |
|---|---|---|
| D | Poprawka błędu i drobne dostosowanie interfejsu | 0.9.1.2 |
| C | Mała funkcja lub spójny pakiet zmian; D wraca do 0 | 0.9.2.0 |
| B | Większe rozszerzenie zasad/trybu gry; C i D wracają do 0 | 0.10.0.0 |
| A | Główne wydanie; pierwsze sklepowe ustalone przez użytkownika | 1.0.0.0 |

To propozycja interpretacji kolejnych podbić; pierwotne **0.9.1.1** i docelowe **1.0.0.0** są wskazaniami użytkownika. Opracowanie dokumentów ligi lub planszówki nie oznacza wdrożenia tych funkcji ani osobnego podbijania wersji. Jeden zatwierdzony pakiet zmian ma jeden numer; kolejne poprawki w trakcie jego przygotowania nie zmieniają numeru same z siebie.


## Odebrany pakiet0.11.0.0

Pakiet podniósł segmentB:0.10.2.0 →0.11.0.0, z wyzerowaniemC/D. Większe rozszerzenie obejmuje mieszkalnictwo i misje Latarni8/5/3; opisy, nauka i poprawki checkera należą do tego samego wydania. Wewnętrznev27 i cache `frontend-v27` nie zastępują numeru produktu ani pełnego SHA.

**DEV i PRE-PROD 0.11.0.0 odebrane — 2 listopada 2026, Europe/Warsaw.** Źródło [`c7c39742594599c54ee8b074b5c313efd88af4cb`](https://github.com/ksobczak321-oss/gra/commit/c7c39742594599c54ee8b074b5c313efd88af4cb): [CI 41361938909](https://github.com/ksobczak321-oss/gra/actions/runs/41361938909) **SUCCESS, 10 min 9 s**, [Pages 41361938868](https://github.com/ksobczak321-oss/gra/actions/runs/41361938868) **SUCCESS, 21 s**, [bridge 41362763426](https://github.com/ksobczak321-oss/gra/actions/runs/41362763426) **SUCCESS, 16 s**, [PRE-PROD 41362782175, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41362782175) **SUCCESS, 2 min 17 s**. Pełne źródło wdrożenia potwierdzono.

Nieprzesuwane tagi [`dev-0.11.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/dev-0.11.0.0-20261102) i [`preprod-0.11.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/preprod-0.11.0.0-20261102) są **opublikowane i potwierdzone zdalnie**; oba wskazują dokładnie `c7c39742594599c54ee8b074b5c313efd88af4cb`.

Akceptacja opisów oraz bazowy lokalny odbiór pochodzą z1 listopada. Operacyjne CI/Pages, promocja i tagi należą do **2 listopada2026 Europe/Warsaw**. Nie zmieniono PROD ani nie opublikowano aplikacji w sklepie. [Wymagania](FRONTEND-V27-REQUIREMENTS.md), [walidacja](DEV-0.11.0.0-VALIDATION.md) i [historia awarii](PREPROD-V27-INCIDENT-20261102.md) rozdzielają te zdarzenia.

## Android, Apple i dowody wydania

W grze można wyświetlać cztery segmenty. Android `versionName` może zachować tę etykietę, a `versionCode` musi być osobnym, stale rosnącym licznikiem. Nie porównujemy numerów jako tekstu i nie sklejamy dowolnie segmentów w licznik.

Apple `CFBundleShortVersionString` używa trzech segmentów, dlatego dla widocznego 0.9.1.1 marketingowy numer iOS ma postać 0.9.1, a `CFBundleVersion` jest osobnym numerem kompilacji. Nie przypisujemy automatycznie czwartego segmentu do licznika buildów: licznik musi nadal rosnąć również przy zmianie większej wersji. Widoczne 1.0.0.0 odpowiada marketingowemu iOS 1.0.0 oraz właściwemu kolejnemu buildowi. Pakiety sklepowe nie są jeszcze budowane ani publikowane w tym zadaniu.

Dokładny commit, CI, środowisko, manifest i artefakty zapisujemy osobno w [rejestrze środowisk](ENVIRONMENT-STATUS.md). Widoczny numer 0.9.1.1 nie jest dowodem, że właśnie ta paczka została już promowana na PRE-PROD lub PROD.
