# Wersja gry HARBORLIGHT

Numer bieżącego roboczego DEV wyświetlany w Ustawieniach: **0.11.0.0 / v27**. Opublikowane PRE-PROD pozostaje na **0.10.1.0**; nowy numer nie oznacza promocji do GCP. Jedynym źródłem etykiety aplikacji jest `harborlight-version.js`. Wersja aplikacji jest odrębna od `state.version` (schemat świata), rewizji zapisu, generacji wyspy, wersji dokumentów prawnych i SHA wydania. Zmiana etykiety nie migruje ani nie zeruje świata.

Użytkownik wyznaczył pierwsze wydanie w Google Play jako **1.0.0.0**. Do tej promocji obecne zmiany są przedpremierowe. Nie nazywamy wysłania do GitHub/Pages publikacją sklepową.

## Proponowana polityka czterech segmentów

Interpretacja „mniejsze zmiany podnoszą dalsze miejsce, większe wcześniejsze” wymaga jednoznacznego zapisu. Proponujemy `A.B.C.D`:

| Segment | Zastosowanie | Przykład po 0.9.1.1 |
|---|---|---|
| D | Poprawka błędu i drobne dostosowanie interfejsu | 0.9.1.2 |
| C | Mała funkcja lub spójny pakiet zmian; D wraca do 0 | 0.9.2.0 |
| B | Większe rozszerzenie zasad/trybu gry; C i D wracają do 0 | 0.10.0.0 |
| A | Główne wydanie; pierwsze sklepowe ustalone przez użytkownika | 1.0.0.0 |

To propozycja interpretacji kolejnych podbić; pierwotne **0.9.1.1** i docelowe **1.0.0.0** są wskazaniami użytkownika. Opracowanie dokumentów ligi lub planszówki nie oznacza wdrożenia tych funkcji ani osobnego podbijania wersji. Jeden zatwierdzony pakiet zmian ma jeden numer; kolejne poprawki w trakcie jego przygotowania nie zmieniają numeru same z siebie.

## Bieżący pakiet 0.11.0.0

Pakiet v27 podnosi segment **B**: `0.10.2.0 → 0.11.0.0`, a **C** i **D** wracają do 0. Powodem jest większe rozszerzenie zasad: niezależna pojemność ludności i łóżek z nowymi skutkami braku mieszkania oraz wieloetapowa ścieżka misji Latarni 8/5/3. Opisy, wznowienie nauki, objaśnienia skutków, dwuminutowe dojście i stabilna prognoza są częścią tego samego GO. Wewnętrzne `v27` i cache `frontend-v27` nie zastępują numeru produktu ani SHA.

Schemat świata pozostaje **9**; nowe opcjonalne pola i normalizacja zachowują tożsamości, postęp, wydane nagrody, rozpoczęte budowy i rejsy. [Zakres v27](FRONTEND-V27-REQUIREMENTS.md) rozdziela decyzje użytkownika od parametrów integracyjnych. [Walidacja](DEV-0.11.0.0-VALIDATION.md) potwierdza lokalny odbiór: 1017 Node, 141 Python i 27 nazwanych zestawów Chromium PASS po odpowiednich ponowieniach. Własny commit, CI, Pages i tag nadal wymagają osobnych dowodów. Nie nadajemy numeru 0.11.0.0 PRE-PROD ani PROD przez samą zmianę pliku wersji. Pierwsze wydanie Google Play nadal ma mieć **1.0.0.0**.

## Poprzedni pakiet 0.10.2.0

Pakiet v26 podnosi segment **C** z 1 do 2, a **D** pozostaje 0: `0.10.1.0 → 0.10.2.0`. To jeden spójny pakiet funkcji i poprawek interfejsu oraz początku gry, zgodny z powyższą polityką; nie każda poprawka testu w trakcie przygotowania otrzymuje osobny numer. Wewnętrzna etykieta `v26` i cache `frontend-v26` nie zastępują numeru produktu ani pełnego SHA.

GO z 1 listopada obejmuje DEV i przygotowanie Git/CI/Pages. Własne zielone CI, publikacja podglądu i nieprzesuwany tag wymagają odrębnego potwierdzenia; nie przypisujemy wersji 0.10.2.0 do PRE-PROD na podstawie samego pliku wersji. Pierwsze wydanie Google Play nadal ma być 1.0.0.0.

## Android, Apple i dowody wydania

W grze można wyświetlać cztery segmenty. Android `versionName` może zachować tę etykietę, a `versionCode` musi być osobnym, stale rosnącym licznikiem. Nie porównujemy numerów jako tekstu i nie sklejamy dowolnie segmentów w licznik.

Apple `CFBundleShortVersionString` używa trzech segmentów, dlatego dla widocznego 0.9.1.1 marketingowy numer iOS ma postać 0.9.1, a `CFBundleVersion` jest osobnym numerem kompilacji. Nie przypisujemy automatycznie czwartego segmentu do licznika buildów: licznik musi nadal rosnąć również przy zmianie większej wersji. Widoczne 1.0.0.0 odpowiada marketingowemu iOS 1.0.0 oraz właściwemu kolejnemu buildowi. Pakiety sklepowe nie są jeszcze budowane ani publikowane w tym zadaniu.

Dokładny commit, CI, środowisko, manifest i artefakty zapisujemy osobno w [rejestrze środowisk](ENVIRONMENT-STATUS.md). Widoczny numer 0.9.1.1 nie jest dowodem, że właśnie ta paczka została już promowana na PRE-PROD lub PROD.
