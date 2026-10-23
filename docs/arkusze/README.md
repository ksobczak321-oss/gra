# Arkusz zasad HARBORLIGHT

[Pobierz aktualny Excel — HARBORLIGHT7-zasady.xlsx](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT7-zasady.xlsx)

Jeżeli GitHub pokazuje stronę pliku, wybierz **Download raw file**. Plik otworzysz w Excelu lub LibreOffice Calc; można go też zaimportować do Arkuszy Google.

Wersja 7 uwzględnia przesłany `HARBORLIGHT6-zasady.xlsx` oraz wszystkie 17 późniejszych decyzji użytkownika z 23.10.2026. Zawiera **36 zakładek, 217 wpisów w rejestrze zasad i katalog 100 narracji zadań latarni**. Właściwe tabele i kalkulatory zostały zaktualizowane; wcześniejsze pytania nie pozostają oznaczone jako nierozstrzygnięte, jeżeli uzyskano odpowiedź.

Oryginalny plik 6 pozostał niezmieniony. Wszystkie 85 różnic względem poprzedniego pliku 5 zachowano dosłownie w „Twoje wpisy v6”, a poprzednie 200 wpisów rejestru w „Rejestr historyczny v6”. Wpisy źródłowe i 48 komentarzy zachowano; najnowsza rozmowa ma pierwszeństwo przed starszymi opisami wizyt znajdującymi się w przesłanej kopii.

## Najnowsze decyzje

- **Latarnia:** pobyt 4 h bez dojścia i wycofania. Od powrotu uczestnicy mają 100% szczęścia i indywidualną blokadę ponownej wizyty przez 24 h. Każda osobno wysłana grupa daje populacji +10 pp przez **6 h**; premie grup sumują się. Jednocześnie jest 2 × poziom latarni miejsc, a darmowa pula wynosi 2 × poziom wejść w ruchomych 24 h. Można dokupić do trzech pakietów, każdy po 2L wejść, za 300 × numer pakietu (2, 3, 4) × poziom latarni monet.
- **Dom:** raz na 24 h pula pełnych punktów równa populacji w chwili odnowienia. Punkty dodają osobiste szczęście i nie kasują kar ani ich liczników. Po 23 h 58 min automat rozdaje wyłącznie niewykorzystaną resztę najmniej szczęśliwym, losując przy remisie.
- **Nowi mieszkańcy:** przez pierwsze 24 h mają zamrożone 0% szczęścia, również podczas premii. Potem zwykłe naliczanie od 0%. Początkowa dwunastka nie podlega zamrożeniu.
- **Przestój:** podatek płynie, ale nie ma +1 pp/h za pracę ani dodatkowej kary bezrobocia. Limit −50 dotyczy samej kary przestoju; suma z innymi karami może być niższa.
- **Kaplica:** płatne błogosławieństwo kosztuje 100 × poziom kaplicy monet. Kolejne można uruchomić 4 h po końcu godzinnego efektu: aktywacja o 12:00, koniec o 13:00, następne od 17:00. Zatwierdzony koszt rozbudowy: nowy poziom × (180 monet + 20 drewna + 60 kamienia + 10 desek).
- **Zadania:** zawsze trzy; start małe/średnie/duże, dalej nowe losowego rozmiaru na końcu FIFO. Mogą zostać trzy małe lub trzy duże. Początkowy termin wynosi 6 h; pierwsze ukończenie każdego łańcucha ustala jego niezależną dobową godzinę odnowienia w strefie Europe/Warsaw. Następcy pojawiają się natychmiast, zachowując kotwicę. Nagrody są zamrożone przy generowaniu i skalowane względem poziomu ratusza 3. Towarów w nagrodzie: 1/2/3 rodzaje. Wpłaty chronią rezerwę żywności, a nadmiar nagrody czeka w buforze i automatycznie uzupełnia centralę.
- **Premium:** pakiet budowlany kosztuje 1000 × poziom ratusza monet za 24 h. Kolejka nadal +10%; prognoza wymaga aktywnego pakietu oraz dopłaty 25% bazowej portowej wartości braków po koszcie kolejki. Pełny zakup budynku kosztuje wszystkie materiały według proporcjonalnych cen zakupu portu +25%, nominalne monety budynku i natychmiastowy transport. Nie zabiera własnych materiałów; budynek jest gotowy po **10 sekundach**. Przyspieszenie: zawsze `max(5, pełne minuty skrócenia)` monet.
- **Port:** osobny licznik podwyżek dla każdego rodzaju produktu w ruchomych 3 h; cena zamrożona przy kliknięciu zamówienia. Zakup drewna nie podnosi ceny kamienia.

Nagrody monetowe zachowują kolejność **małe < średnie < duże wśród aktualnych ofert**. Nowy rozmiar losujemy tylko spośród tych, których skalowany zakres pasuje do już pokazanych, zamrożonych nagród; rozmiary nie muszą być jednakowo prawdopodobne. Warunki godzinowe sprawdzamy przy generowaniu. Nowe małe może wymagać więcej godzin niż stare średnie — nie oznacza to większej nagrody monetowej.

## Kalkulatory i sprawdzenie

Przeliczono i zapisano wyniki **2161 formuł**. Kontrola objęła 74 warianty kosztów, kursów i czasów budowy oraz nowe kalkulatory przyspieszeń, zakupu całego budynku, prognoz dostaw i skalowania nagród. Sprawdzono 3164 warunki: brak błędów formuł i brak pustych wyników.

Przykład prognozy: bazowe 300 kamienia → kolejka 330; przy 200 w centrali brakuje 130. Dopłata 25% bazowej wartości zakupu tych 130 sztuk wynosi 16,25 monety, a cena w pełnych monetach 17. Wpis źródłowy z wcześniejszą różnicą 100 zachowano w archiwum.

Estymaty czasu obejmują **wyłącznie transport i budowanie**, przy jawnie opisanej obsadzie. Nie obejmują zbierania, karmienia, oczekiwania w kolejce ani wcześniejszych rozbudów. Wspólna populacja, przetwarzanie 2:1 i potrzeba wcześniejszych zapasów nadal mają znaczenie dla balansu.

## Zakres odłożony

Zakładka „Na pozniej” oddziela reguły projektu od brakujących integracji: prawdziwe konta i płatności, weryfikacja social i poleceń, reklamy z hasłem, docelowy balans oraz ratowanie ekspedycji, osobna wizyta modlitewna i wartości nagród lojalnościowych. Kwoty pomysłów pozostają zapisane. Arkusz nie oznacza uruchomienia płatności ani integracji Facebook/Google. Stan wdrożenia frontendowego i testów opisuje [dziennik implementacji](../IMPLEMENTATION-LOG.md).

Poprzednie pliki pozostają dostępne: [oryginał 6 użytkownika](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT6-zasady.xlsx), [wersja 5](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT5-zasady.xlsx), [oryginał 4](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT4-zasady.xlsx), [wersja 3](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT3-zasady.xlsx), [wersja 2](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT2-zasady.xlsx), [oryginał 1](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT1-zasady.xlsx) i [pierwszy arkusz](https://github.com/ksobczak321-oss/gra/blob/main/docs/arkusze/HARBORLIGHT-zasady.xlsx).
