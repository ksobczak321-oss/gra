# Wersja gry HARBORLIGHT

Numer nowego DEV wyświetlany w Ustawieniach: **0.10.1.0**. Ta sama wersja **0.10.1.0** została odebrana również na PRE-PROD. Jedynym źródłem tej etykiety aplikacji jest `harborlight-version.js`. Wersja aplikacji jest odrębna od `state.version` (schemat świata), rewizji zapisu, generacji wyspy, wersji dokumentów prawnych i SHA wydania. Zmiana etykiety nie migruje ani nie zeruje świata.

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

## Android, Apple i dowody wydania

W grze można wyświetlać cztery segmenty. Android `versionName` może zachować tę etykietę, a `versionCode` musi być osobnym, stale rosnącym licznikiem. Nie porównujemy numerów jako tekstu i nie sklejamy dowolnie segmentów w licznik.

Apple `CFBundleShortVersionString` używa trzech segmentów, dlatego dla widocznego 0.9.1.1 marketingowy numer iOS ma postać 0.9.1, a `CFBundleVersion` jest osobnym numerem kompilacji. Nie przypisujemy automatycznie czwartego segmentu do licznika buildów: licznik musi nadal rosnąć również przy zmianie większej wersji. Widoczne 1.0.0.0 odpowiada marketingowemu iOS 1.0.0 oraz właściwemu kolejnemu buildowi. Pakiety sklepowe nie są jeszcze budowane ani publikowane w tym zadaniu.

Dokładny commit, CI, środowisko, manifest i artefakty zapisujemy osobno w [rejestrze środowisk](ENVIRONMENT-STATUS.md). Widoczny numer 0.9.1.1 nie jest dowodem, że właśnie ta paczka została już promowana na PRE-PROD lub PROD.
