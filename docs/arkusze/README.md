# Arkusz zasad HARBORLIGHT

**Archiwum v16:** Excel 10 zachowuje zasady wydania frontend-v16, w tym dawne losowanie minigier. Bieżące zmiany v17 opisują [wymagania pakietu](../FRONTEND-V17-REQUIREMENTS.md) i [reguły gospodarki](../ECONOMY-RULES.md); w tym pakiecie nie generujemy nowego arkusza. Poniższy raport walidacji dotyczy niezmienionego pliku v16.

[Pobierz Excel 10 — HARBORLIGHT10-zasady.xlsx](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT10-zasady.xlsx)

Jeżeli GitHub pokazuje stronę pliku, wybierz **Download raw file**. Plik otworzysz w Excelu lub LibreOffice Calc; można go też zaimportować do Arkuszy Google. Bieżące zasady opisują frontend-v16 wraz ze wszystkimi zmianami v15, a [manifest aktualizacji](../decisions-v10.json) oddziela decyzje użytkownika, jawne ustawienia projektu i przyszłe integracje.

Excel 10 zachowuje **cztery widoczne zakładki**. Każda mechanika ma najwyżej trzy zdania; pełna lista 25 akcji samouczka jest także w pierwszej zakładce. Wszystkie **52 zakładki Excela 9**, ich wartości, formuły i **48 komentarzy źródłowych** pozostają niezmienionym ukrytym archiwum. Pliki 7, 8 i 9 zachowują identyczne bajty.

## Od czego zacząć

| Widoczna zakładka | Zawartość |
|---|---|
| Jak działa gra v10 | Krótkie bieżące zasady i 25 kolejnych akcji samouczka |
| Budynki v10 | Wszystkie 12 budynków: przeznaczenie, obsada, koszt, czas i efekt rozbudowy |
| Do decyzji v10 | Wyłącznie nadal nieustalone kwoty i odłożone integracje |
| Kalkulator v10 | Niebieskie pola wejściowe: produkcja, transport, FIFO, atrakcje, nagrody nowych minigier, skrzynie, drogi i pojemność |

Nazwy widocznych zakładek mają końcówkę v10, aby nie zmieniać odwołań dawnych formuł. Ukryte arkusze można pokazać przez **Odkryj arkusz / Unhide**; nie trzeba ich przeglądać podczas normalnego czytania. Dawne kalkulatory pozostają historią, a bieżące pierwszeństwo mają cztery zakładki v10.

## Co obejmuje aktualizacja

- Samouczek zachowuje **25 akcji**, łączy wcześniejsze tematy z nową kolejnością początku i nie wymaga pięciu dni oczekiwania. Otwiera się przy wejściu do ukończenia albo rezygnacji; później można go wznowić ręcznie z zachowaniem postępu.
- Pierwsze kroki to zasady w menu lewego górnego rogu, mapa, przydział ludzi, sprawdzenie jedzenia, zlecenie rozbudowy Ratusza i zwiększenie szczęścia. Jednorazowa pomoc przy piątej akcji uzupełnia dostępne środki do 500 monet i każdego materiału, z 600 żywności, aby budowa była wykonalna.
- Każda akcja ma fanfarę i skrzynię: osobno **100–300 każdego z pięciu materiałów**, bez monet. Share daje drugi raz identyczną wylosowaną skrzynię, najwyżej raz; Skip zachowuje zwykłą nagrodę. Wynik i rozliczenie pozostają zapisane, a nadwyżki czekają na miejsce w centrali.
- Dwie losowane minigry zastępują nowe rundy ekspedycji: przechylany labirynt z kulkami oraz czarno-białe dopasowywanie trójek. Gra zachowuje ryzyko całej niewypłaconej puli i możliwość wypłaty po wygranej.
- Pierwszy labirynt ma 180 s i 50 monet; po 120 s nagroda nowej rundy maleje o jedną monetę co pełne 15 s. Przy końcu limitu następuje przegrana; późniejsze rundy mają proporcjonalne granice czasu. Komputer obsługuje mysz i klawiaturę, telefon ruch urządzenia albo dotyk.
- Dopasowywanie zaczyna się od 24 pól i 240 s, rośnie do 120 pól i najwyżej 900 s, a od czwartego etapu wprowadza ruch zakrytych niedopasowanych kafelków. Te konkretne krzywe są jawnym doborem projektu w ramach uzgodnionej trudności, a nie dodatkową decyzją użytkownika.
- Zakres v15 obejmuje bazową produkcję **20/24/26/28…**, ładowność **120 na poziomie 1**, jedną sześciogodzinną atrakcję na całej wyspie, utrwalony zasięg **1–50% populacji** i cenę według faktycznej sumy punktów szczęścia. Równe miniatury, podpisy pracujących, zwarte karty, powrót, nazwa wyspy, opisy i kompletna polska wersja są ujęte w manifeście.

Za 25 skrzyń podstawowych można otrzymać łącznie **12 500–37 500 sztuk materiałów**, średnio **25 000**; podwojenie każdej skrzyni daje średnio **50 000**. To suma pięciu różnych materiałów, bez monet i bez osobnej pomocy do budowy Ratusza. Nie jest to nagroda programu lojalnościowego.

Lojalność zachowuje serię kolejnych dni, reset po przerwie, granicę 00:00 Europe/Warsaw i koniec po dziesiątej odebranej nagrodzie albo osiągnięciu Ratusza 4. **Wysokości nagród nadal nie ustalono.** Arkusz nie zastępuje ich skrzyniami samouczka ani fikcyjną wypłatą.

Lokalne Share nie potwierdza publikacji na Facebooku. Prawdziwe konta, płatności, reklamy i serwerowa weryfikacja publikacji lub poleceń pozostają oddzielnymi integracjami; ich stan jest jawnie opisany.

## Odtworzenie i weryfikacja

Skrypt: [scripts/build_workbook_v10.py](../../scripts/build_workbook_v10.py). Wymaga `openpyxl`, Node.js i LibreOffice; pobiera rzeczywiste lekcje oraz parametry minigier z eksportów modułów gry.

```sh
python3 scripts/build_workbook_v10.py
python3 scripts/build_workbook_v10.py --validate-only
```

Walidacja porównuje wszystkie 52 archiwalne zakładki z Excelem 9, treść i autorów 48 komentarzy oraz sumy kontrolne niezmienionych plików 7–9. LibreOffice zapisuje wyniki formuł; openpyxl sprawdza brak błędów i brakujących wyników, bieżące i historyczne kontrole TRUE, komplet 25 akcji oraz zgodność parametrów z kodem. Opcja `--no-recalc` służy wyłącznie roboczemu podglądowi i nie daje pełnego odbioru pliku.

## Końcowy odbiór lokalny Excela 10

Plik ma **59 zakładek, cztery widoczne, 57 mechanik opisanych najwyżej trzema zdaniami, 25 akcji samouczka i 32 wpisy zmian**. LibreOffice przeliczył **3866 formuł**; nie ma błędów ani brakujących zapisanych wyników. **62 bieżące kontrole oraz 30 kontroli wersji 9 i 231 kontroli wersji 8 dają TRUE**. Wszystkie 52 archiwalne zakładki i 48 komentarzy są identyczne z Excelem 9; źródłowe pliki 7–9 nie zostały zmienione.

Excel 10: **364049 bajtów**, SHA-256 `4dd371e4fe779e51e1f060e69493635f25971a9c365ff9b55f961d457f31145a`. To wynik lokalny; publikację kodu i ewentualne potwierdzenie publicznego pobrania zapisuje dziennik.

Sumy niezmienionych źródeł:

- Excel 9: `3fc10a5d84df001e67e217dbc8c045cc5025b7777f91239c60b6694966864cc8`.
- Excel 8: `74ea3cc586d8d889ff34de8819694430503f45ed5fa2743873c9ad0c0b83cc3e`.
- Excel 7: `bf49eef3b43ba81e0492c6eb187940c99177bbb8ae925ceca2b09ab0a2b9e945`.

Końcowy raport walidacji i stan publikacji zapisuje [dziennik implementacji](../IMPLEMENTATION-LOG.md). Odtworzenie zachowuje zasady i wyniki, lecz metadane programu mogą zmienić sumę kontrolną nowego pliku. Lokalny odbiór nie jest potwierdzeniem publicznego pobrania.

Poprzednie wydania: [Excel 9](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT9-zasady.xlsx), [Excel 8](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT8-zasady.xlsx), [Excel 7](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT7-zasady.xlsx). Historyczny odbiór publiczny wersji 9 jest zachowany w dzienniku; nie przypisujemy go wersji 10.

Bieżące zasady tekstowe: [gospodarka](../ECONOMY-RULES.md), [budynki](../BUILDINGS.md), [instrukcja interfejsu](../INTERACTIVE-ISLAND.md).
