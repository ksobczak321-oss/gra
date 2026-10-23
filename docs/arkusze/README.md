# Arkusz zasad HARBORLIGHT

[Pobierz Excel 8 — HARBORLIGHT8-zasady.xlsx](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT8-zasady.xlsx)

Jeżeli GitHub pokazuje stronę pliku, wybierz **Download raw file**. Plik otworzysz w Excelu lub LibreOffice Calc; można go też zaimportować do Arkuszy Google.

Wersja **8** powstała na podstawie niezmienionego pliku 7 oraz wszystkich późniejszych zaakceptowanych zmian z rozmowy: obu pakietów wcześniejszego frontendu, najnowszych uwag do ekranów, atrakcji, dróg i efektów. Zawiera **45 zakładek, 265 wpisów w rejestrze zasad, 48 nowych pozycji V8, 20 atrakcji oraz zachowany katalog 100 narracji zadań latarni**. Zaktualizowano właściwe tabele i kalkulatory, a nie tylko dopisano osobną listę zmian.

Oryginał **HARBORLIGHT7-zasady.xlsx nie został zmieniony**. Zachowano wszystkie 48 komentarzy użytkownika, źródłowe notatki w komórkach oraz archiwalne zakładki. Nowy „Rejestr historyczny v7” przechowuje poprzedni stan 217 reguł. Wcześniejsze różnice i źródła pozostają w swoich zakładkach; nowsze decyzje w „Zmiany v8” mają pierwszeństwo.

## Najnowsze zasady V8

- **Bufory i ludzie:** lokalny magazyn producenta ma `200 × własny poziom`, a limit pracy pozostaje `12 × własny poziom zakładu`. Norma wymagań zadań nie została zmieniona. Storage ma podpisy `In stock / Current cap. / Next level cap.`, a Workers: `Assigned / Free at home / Max workers`.
- **Podatki:** wszystkie informacje podatkowe usunięte z interfejsu. Sam rachunek pozostaje: 1 moneta/os./h od dotarcia do zakładu, także podczas przestoju; czasowa premia kaplicy nadal podwaja podatek. Excel opisuje tę mechanikę.
- **Resources:** pięć kart produktów. Mały górny numerek pokazuje osoby faktycznie pracujące u producenta; dolna para to **zapas lokalny / zapas tego produktu w centrali**. Kliknięcie otwiera ten sam panel producenta co budynek na wyspie.
- **Budynki:** właściwy status u góry każdego panelu, produkt/ilość/czas najbliższej produkcji, objaśnienia pod „i”. U pięciu producentów Upgrade, osobne czasy i sąsiednia ramka Premium z dwoma przyciskami. Etykieta budowy ma dwa wiersze: `Transport · ETA` oraz `Construction · ETA`.
- **Zarządzanie:** Construction and queue tylko w ratuszu; Manage all workers tylko z domu. Dom pokazuje populację, limit ratusza, łóżka i przyrost/spadek; opisy Housing capacity i House happiness pod „i”.
- **Priorytety:** najwyżej trzy wybrane spośród pięciu produktów oraz **Construction**, we wspólnej numeracji 1/2/3. Powtarzane bloki rzeczywistych kursów: 8 + 2 losowe; 5 + 3 + 2 losowe; albo 5/3/2. Wybór działa bezterminowo, a ratunkowy transport żywności zachowuje ochronę.
- **Podgląd tragarzy:** aktualne przypisanie, towar, ilość, źródło → cel i pozostały czas; odrębnie dojście i oczekiwanie. Odwołanie nie przenosi starego ładunku na nową osobę ani nie usuwa towaru.
- **Zadania:** zawsze trzy oferty, tylko jedno aktywne zadanie. Podświetlenie i postęp każdego produktu w obu widokach; pozostałe karty są wyszarzone. Zachowane stare wpłaty, terminy i mnożniki.
- **Ukończenie zadania:** fajerwerki i krótka wibracja na obsługującym ją telefonie. Ekran Share your achievement można pominąć. Kliknięcie Share on Facebook daje **500 monet, jeden raz na ukończone zadanie**, bez rzeczywistej integracji Facebook. Skip zachowuje normalną nagrodę.
- **Atrakcje:** pięć ofert z katalogu 20 dekoracji i wydarzeń, wymienianych co 24 h. Y jest losową liczbą całkowitą 5–100; koszt to `Y × aktualny poziom ratusza L` monet. Premia: `Y × współczynnik` pp dla L osób przez 6 h. Przyzwyczajanie osobno na rodzaj: 100%, 75%, 50%, 25%, 0%; reset po 24 h bez jego zakupu. Przy zerowej skuteczności zakup jest zablokowany. Dokładne składniki mogą być ułamkowe, prezentacja H pozostaje zaokrąglona w górę do pełnego procentu.
- **Ścieżki:** 100 odcinków, start 0, maksimum 5. Jeden odcinek o jeden poziom kosztuje 100 kamienia z centrali i działa po kliknięciu. Kolejny poziom dopiero po ukończeniu całej setki poprzedniego. Ukończone poziomy 1–5 dają +10/+20/+30/+40/+50% szybkości; od poziomu 3 także +10/+20/+30% ładunku. Premia działa na tragarzy magazynu, targu i portu; nie na rejs statku czy dojście do pracy. Koszt pełnego poziomu: 10 000 kamienia, wszystkich pięciu: 50 000.
- **Efekty:** błogosławieństwa, premie i kary w powiadomieniach oraz na górze karty Town Hall. Źródło, wartość, odbiorcy i czas albo warunek zakończenia. Wpis przy aktywacji, zmianie lub końcu, bez ponawiania co odświeżenie.
- **Nowy gracz i testy:** zwykły start to 12 mieszkańców i po 100 zasobów. Osobny link `profile=new-player` ma niezależny zapis i zachowuje istniejącą wyspę. Jednorazowe pełne materiały i minimum 10 000 monet dotyczą wcześniejszego podglądu testowego, a nie zwykłego startu.
- **Grafika i animacje:** poprawiona geometria nagłówka i lewej nawigacji. Jawne włączenie animacji w grze działa również przy systemowym ograniczeniu ruchu i jest zapisywane. Aktywny interfejs pozostaje po angielsku.

## Zakładki do przeglądu

| Zakładka | Zawartość |
|---|---|
| Start | Nawigacja po całym pliku i pierwszeństwo nowych decyzji |
| Zmiany v8 | 48 nowych pozycji ze skutkiem i uwagami |
| Frontend v8 | Finalne podpisy, wartości i zachowanie widoków |
| Budynki / Czlowiek | Poprawione bieżące reguły budynków i mieszkańca |
| Atrakcje | Katalog 20 dekoracji i wydarzeń |
| Atrakcje - kalkulator | 100 przykładów ceny, przyzwyczajania i prezentacji premii |
| Sciezki | Koszty i bonusy każdego ukończonego poziomu |
| Sciezki - transport | 24 scenariusze własnego poziomu i dróg, głód oraz cena przewozu Premium |
| Efekty i notyfikacje | Źródła, wartości, odbiorcy i terminy efektów |
| Sprawdzenia v8 | 231 jawnych porównań formuł z niezależnymi wartościami oczekiwanymi |
| Ustalenia - uwagi | Pełny bieżący rejestr 265 reguł |
| Rejestr historyczny v7 / v6 | Zachowane wcześniejsze wersje rejestru |

## Kalkulatory i weryfikacja

Przeliczono i zapisano wyniki **3601 formuł**, bez błędów ani pustych wyników. Wszystkie **231 sprawdzeń** z zakładki „Sprawdzenia v8” dają TRUE. Walidacja sprawdza też źródłowe komórki, 48 komentarzy, integralność XLSX oraz niezmieniony SHA-256 pliku 7.

Istniejące 74 warianty kosztów i czasów budowy uwzględniają nowy parametr ukończonego poziomu dróg; domyślnie jest to **0**, więc porównawcze wyniki V7 pozostają takie same. Nowe kalkulatory pokazują zależność od dróg jawnie. Estymaty obejmują transport i budowę przy opisanej obsadzie; zbieranie, żywienie, wcześniejsze ulepszenia i czekanie w kolejce nie są doliczane. Konkurujące dostawy w rzeczywistej grze mogą wydłużyć czas.

Skrypt odtwarzający plik i weryfikację: [scripts/build_workbook_v8.py](../../scripts/build_workbook_v8.py). Wymaga `openpyxl` i LibreOffice:

```sh
python3 scripts/build_workbook_v8.py
python3 scripts/build_workbook_v8.py --validate-only
```

Opcja `--no-recalc` jest wyłącznie robocza i nie przygotowuje pliku do publikacji, ponieważ nie zapisuje wyników formuł.

SHA-256 niezmienionego źródła 7: `bf49eef3b43ba81e0492c6eb187940c99177bbb8ae925ceca2b09ab0a2b9e945`.

## Zachowane decyzje i zakres odłożony

Wszystkie 17 decyzji D01–D17 nadal jest zachowanych: terminy i limity wizyt latarni, pula domu, zamrożenie nowych mieszkańców, osobne kary przestoju, kaplica, kolejka i prognozy, ceny i terminy portowe oraz koszty i czasy Premium. Późniejsze zmiany V8 zastępują tylko wskazane reguły i widoki; nie kasują tych ustaleń.

Prawdziwe konta, OAuth, płatności, reklamy z hasłem, starsze zasady weryfikacji poleceń i publikacji, docelowy balans ekspedycji, osobna modlitwa oraz wartości nagród lojalnościowych pozostają oddzielnym zakresem. Nowy bonus 500 monet za kliknięcie Share po zadaniu jest wyraźnym wyjątkiem prototypu, zgodnie z najnowszą instrukcją. Arkusz nie oznacza uruchomienia integracji Facebook/Google ani prawdziwych płatności. Stan gry, testów i wdrożenia opisuje [dziennik implementacji](../IMPLEMENTATION-LOG.md).

Poprzednie pliki: [wersja 7](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT7-zasady.xlsx), [oryginał 6 użytkownika](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT6-zasady.xlsx), [wersja 5](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT5-zasady.xlsx), [wersja 4](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT4-zasady.xlsx), [wersja 3](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT3-zasady.xlsx), [wersja 2](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT2-zasady.xlsx), [wersja 1](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT1-zasady.xlsx), [pierwszy arkusz](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT-zasady.xlsx).
