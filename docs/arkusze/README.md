# Arkusz zasad HARBORLIGHT

[Pobierz Excel 9 — HARBORLIGHT9-zasady.xlsx](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT9-zasady.xlsx)

Jeżeli GitHub pokazuje stronę pliku, wybierz **Download raw file**. Plik otworzysz w Excelu lub LibreOffice Calc; można go też zaimportować do Arkuszy Google. Lokalna walidacja pliku jest zakończona; także gra zaliczyła 388/388 testów modelu i pięć lokalnych i trzy publiczne scenariusze przeglądarkowe. Wersję 9 opublikowano w [commicie 8025f3d](https://github.com/ksobczak321-oss/gra/commit/8025f3d2a482d20ad419b95963a7f03135c7f2c1). Anonimowe pobranie z GitHuba i Pages zwraca HTTP 200, poprawny XLSX i sumę SHA-256 identyczną z plikiem lokalnym; [dziennik implementacji](../IMPLEMENTATION-LOG.md) zawiera dowód publikacji.

Wersja **9** upraszcza arkusz do **czterech widocznych zakładek**. Obejmuje wszystkie **58 rozstrzygnięć logiki i 19 wymagań frontendu** z [manifestu](../decisions-v9.json), wcześniejsze obowiązujące reguły oraz jawnie opisane założenia wdrożenia. Każda z 46 podstawowych mechanik ma najwyżej trzy zdania. Pliki 7 i 8 nie zostały zmienione.

## Od czego zacząć

| Widoczna zakładka | Zawartość |
|---|---|
| Jak działa gra | Krótkie zasady mieszkańców, szczęścia, produkcji, magazynów, budowy, zadań, ekspedycji i premii |
| Budynki v9 | 12 budynków w kolejności paska gry: przeznaczenie, zatrudnienie, koszt, czas oraz efekt rozbudowy |
| Do decyzji | Wyłącznie pięć rzeczywiście odłożonych tematów; rozstrzygnięte pytania nie wracają na listę |
| Kalkulator | Jeden scenariusz z niebieskimi polami wejściowymi: transport i budowa, FIFO, atrakcje, ekspedycja, drogi, kupno osoby, tutorial i pojemność |

Pozostałe **48 zakładek jest ukrytych**, żeby nie utrudniać codziennego czytania. Zawierają 45 niezmienionych zakładek źródłowego Excela 8, pełne brzmienie manifestu V9, 25 lekcji samouczka oraz kontrolę formuł. W Excelu można je wyświetlić poleceniem **Odkryj arkusz / Unhide**. Dawne reguły i kalkulatory są historią; bieżące pierwszeństwo mają cztery widoczne zakładki i decyzje V9.

## Co obejmuje aktualizacja

- Mieszkańcy: karmienie, liczniki głodu i bezrobocia, pierwsze 24 h, indywidualne szczęście, nakładające się 100%, odejścia i codzienna pula Domu.
- Gospodarka: pobranie surowca przy ukończeniu produktu, fizyczne rezerwacje, chronione miejsce żywności, nadwyżki nagród i zwrotów, pełne paczki targu oraz oddzielne terminy partii portowych.
- Budowa: rzeczywisty T, zmienna obsada i ETA, plany FIFO, anulowanie przed transportem, osobna usługa kompletnego budynku 10 s oraz oddzielne przyspieszanie transportu i budowania.
- Aktywności: nieodwołalne przyjęcie zadania, mnożnik z potwierdzeniem, pierwsze terminy 6 h i kolejne o północy, bonus Share 500 raz, liniowa pula ekspedycji +50 i utrata po 10 monet za sekundę spóźnienia.
- Premie: atrakcje i przyzwyczajanie, drogi, pięciominutowy bonus aktywnej gry, samouczek, reguły social/referral, kolejne dni lojalności i Punkty.
- Frontend: usunięty lewy pasek, nowy nagłówek, 12 kart, oba magazyny i wszystkie przewozy na kartach zasobów, EN/PL, filtry powiadomień, zwarte efekty i poprawki animacji. Informacje o podatkach są ukryte w interfejsie; silnik zachowuje naliczanie.

Nagrody 25 lekcji — łącznie **1000 monet i 400 materiałów** — są oznaczone jako dobór projektowy, odrębny od nieustalonych nagród lojalnościowych. Prototypowy czas ekspedycji `180/(1+0,1×(runda−1))` również ma oznaczenie projektowe. Cena kupna osoby to ogłoszone przed GO założenie `500 × obecny poziom Ratusza` każdego z sześciu zasobów; nie przedstawiamy jej jako dawnej ceny z Excela 7.

Arkusz opisuje docelowe reguły publikacji i poleceń, lecz nie oznacza podłączenia Facebooka, Google, prawdziwych kont, płatności ani zewnętrznej weryfikacji postów. Osobny bonus Share po zadaniu pozostaje prototypowym kliknięciem zgodnie z decyzją użytkownika. Prawdziwe integracje, docelowe plansze i czasy minigier, reklamy, kwoty lojalnościowe oraz osobna modlitwa są wyraźnie odłożone.

## Weryfikacja pliku

Wersja 9 ma **52 zakładki**, wszystkie **48 komentarzy źródłowych** oraz **3693 formuły z zapisanymi wynikami**. LibreOffice przeliczył plik, a kontrola openpyxl potwierdziła brak błędów i pustych wyników. **30 nowych kontroli i 231 historycznych kontroli daje TRUE**; porównanie zachowanych 45 zakładek potwierdziło identyczne wartości, formuły i komentarze.

- Excel 9: **329612 bajtów**, SHA-256 `3fc10a5d84df001e67e217dbc8c045cc5025b7777f91239c60b6694966864cc8`.
- Niezmienione źródło 8: SHA-256 `74ea3cc586d8d889ff34de8819694430503f45ed5fa2743873c9ad0c0b83cc3e`.
- Niezmienione źródło 7: SHA-256 `bf49eef3b43ba81e0492c6eb187940c99177bbb8ae925ceca2b09ab0a2b9e945`.

Skrypt odtwarzający i walidujący: [scripts/build_workbook_v9.py](../../scripts/build_workbook_v9.py). Wymaga `openpyxl` i LibreOffice:

```sh
python3 scripts/build_workbook_v9.py
python3 scripts/build_workbook_v9.py --validate-only
```

Opcja `--no-recalc` służy wyłącznie do roboczego podglądu, bo nie zapisuje wyników formuł. Kontrola publikacyjna wymaga pełnego przeliczenia. Odtworzenie zachowuje zasady i wyniki, ale metadane programu mogą zmienić sumę kontrolną pliku.

Poprzednie wydania: [Excel 8](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT8-zasady.xlsx), [Excel 7](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT7-zasady.xlsx), [oryginał 6 użytkownika](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT6-zasady.xlsx). Bieżące zasady tekstowe: [gospodarka](../ECONOMY-RULES.md), [budynki](../BUILDINGS.md), [instrukcja interfejsu](../INTERACTIVE-ISLAND.md).
