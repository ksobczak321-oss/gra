# Wersja gry HARBORLIGHT

Bieżące odebrane **DEV i PRE-PROD:0.11.0.0 /v27**, źródło `c7c39742594599c54ee8b074b5c313efd88af4cb`. Numer aplikacji jest odrębny od schematu świata9, rewizji zapisu, generacji wyspy i SHA. Zmiana numeru nie resetuje świata. Pierwsze wydanie Google Play użytkownik określił jako **1.0.0.0**.

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
