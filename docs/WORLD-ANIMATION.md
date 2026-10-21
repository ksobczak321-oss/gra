# Żywa wyspa — animacje świata

Stan: 2026-10-21, implementacja i testy zakończone; animowana wersja jest opublikowana i sprawdzona publicznie. Zadanie [FE-04 / #10](https://github.com/ksobczak321-oss/gra/issues/10), milestone [frontend #3](https://github.com/ksobczak321-oss/gra/milestone/3). Commity, udaną publikację oraz sprawdzenie podglądu zapisano w [dzienniku implementacji](IMPLEMENTATION-LOG.md).

## Cel tej iteracji

Ożywić zaakceptowaną wyspę HARBORLIGHT przy zachowaniu układu, skali i palety istniejącej grafiki. Praca obejmuje frontend i efekty świata. Obecna gospodarka, lokalny zapis oraz działające kontrolki pozostają podstawą interaktywnego prototypu.

| Element | Oczekiwane zachowanie | Stan odbioru |
| --- | --- | --- |
| Wiatrak | Łopaty obracają się wokół osi; miejscowe tło zastępuje stare łopaty przed rysowaniem wirnika | Wdrożone lokalnie; ruch sprawdzony |
| Dym z domów | Kłęby z pięciu kominów unoszą się, rozszerzają i zanikają | Wdrożone lokalnie; ruch sprawdzony |
| Mewy | Siedem mew przelatuje nad światem i porusza skrzydłami | Wdrożone lokalnie; ruch sprawdzony |
| Wodospady | Dwie kaskady mają opadającą teksturę, strugi, pianę i rozprysk | Wdrożone lokalnie; ruch sprawdzony |
| Fale | Grzbiety fal i refleksy przesuwają się na maskowanej powierzchni morza | Wdrożone lokalnie; ruch sprawdzony |
| Mieszkańcy | Czternaście postaci chodzi po zdefiniowanych trasach ścieżek | Wdrożone lokalnie; ruch sprawdzony |
| Chmury | Trzy warstwy chmur przesuwają się nad niebem i dalekim planem | Wdrożone lokalnie; ruch sprawdzony |
| Budowa | Dwa wciągniki poruszają linami i ładunkiem; pył pokazuje pracę na budowie | Wdrożone lokalnie; ruch sprawdzony |
| Zwierzęta | Siedem zwierząt porusza się na pastwisku i wykonuje drobne ruchy | Wdrożone lokalnie; ruch sprawdzony |

## Architektura renderowania

Animacja korzysta z logicznego układu współrzędnych sceny 1672×941. Obraz referencyjny `assets/harborlight-v1-approved.png` pozostaje źródłem wyglądu świata. Ruchome obiekty i efekty są renderowane na osobnej warstwie Canvas nad grafiką, poniżej klikalnych kontrolek i HUD.

Podział odpowiedzialności:

| Plik | Rola |
| --- | --- |
| `harborlight-v1-ambient.js` | Wspólny zegar i pętla renderowania, wiatrak, dym, chmury i aktywność budowy |
| `harborlight-v1-water.js` | Maskowana powierzchnia morza, fale, wodospady, piana i rozprysk |
| `harborlight-v1-life.js` | Trasy mieszkańców, ruch zwierząt i lot mew |
| `harborlight-v1-play.js` | Przekazanie aktualnego stanu pauzy, tempa i ustawień gracza do warstwy animacji |
| `tests/harborlight-animation-smoke.py` | Sprawdzenie faktycznego ruchu i zatrzymywania animacji w przeglądarce |

Moduły efektów otrzymują czas animacji z jednej pętli `requestAnimationFrame`. Nie tworzą własnych timerów. Canvas `#island-ambient` jest warstwą o `z-index: 6`; przyciski pozostają nad nim na poziomie 10. Maski wyznaczają powierzchnię świata: fale nie przesuwają lądu ani portowych budowli, a chmury i postacie nie przykrywają stałego interfejsu. Canvas efektów ma `pointer-events: none`, dzięki czemu zachowuje się dotychczasowa obsługa przycisków.

`createAmbientScene(stage, getState)` pobiera aktualny stan gry i zwraca `ready` oraz `destroy()`. `drawWater(ctx, source, t)` renderuje wodę, a `drawLife(ctx, t, options)` postacie, zwierzęta i mewy. Warstwa życia pozwala osobno wyłączyć każdą grupę, co umożliwia sprawdzenie ich rzeczywistego ruchu bez mylenia go z sąsiednimi efektami.

## Grafika pomocnicza wiatraka

`assets/harborlight-windmill-clean.png` (1672×941) pochodzi z edycji obrazu referencyjnego narzędziem generowania grafiki. Polecenie dotyczyło usunięcia starych łopat wiatraka. Otrzymany obraz zmienił również inne fragmenty, dlatego nie zastępuje obrazu referencyjnego ani całej wyspy.

Renderer pobiera z tego assetu wyłącznie prostokąt `x: 221, y: 193, szerokość: 114, wysokość: 116`, nadaje mu miękką maskę krawędzi i umieszcza w okolicy wiatraka. Nad miejscowym tłem rysuje obracający się wirnik ze szkieletem i płótnem. Oryginalny `assets/harborlight-v1-approved.png` pozostaje bez zmian.

## Czas, ustawienia i wydajność

Pauza gry zatrzymuje ruch świata. Wznowienie kontynuuje ruch bez skoku wynikającego z czasu spędzonego na pauzie. Tempo gry 1× / 2× / 4× jest przekazywane do animacji przez wspólny zegar.

Wyłączenie animacji w ustawieniach oraz systemowe `prefers-reduced-motion` zatrzymują ruch, pozostawiając nieruchomą klatkę warstwy. Pauza gry, ograniczenie ruchu i niewidoczna karta wstrzymują aktywną pętlę; po powrocie nie odtwarzamy gwałtownie wszystkich pominiętych klatek. Efekty nie modyfikują zasobów, nagród ani postępu zapisanych w gospodarce.

Renderer ogranicza odmalowywanie do 30 klatek na sekundę na komputerze i 24 przy szerokości okna poniżej 900 px. Rozdzielczość bufora uwzględnia skalę sceny oraz gęstość ekranu i mieści się w zakresie 40–100% rozmiaru logicznego. Ruch pozostaje sterowany czasem, a nie liczbą wyrenderowanych klatek.

## Sprawdzanie

Odbiór obejmuje porównanie klatek oddzielonych czasem dla każdego z dziewięciu elementów, a także oględziny całej sceny. Zmiana licznika czasu lub samo istnienie Canvas nie dowodzą, że wiatrak, woda i postacie poruszają się we właściwych miejscach.

W przeglądarce trzeba potwierdzić:

- widoczny ruch w odpowiednich regionach oraz brak ruchu HUD i bocznych kart;
- zatrzymanie i wznowienie przez pauzę, ustawienie animacji i preferencję ograniczenia ruchu;
- poprawne działanie klikania pod warstwą efektów i istniejącej pętli gry;
- brak błędów JavaScript i nieudanych żądań assetów;
- czytelność sceny na komputerze i telefonie w obu orientacjach.

Po uruchomieniu lokalnego serwera uruchom:

```sh
python3 tests/harborlight-animation-smoke.py
```

Test wymaga Python Playwright i Chromium. `HARBORLIGHT_BASE_URL` i `HARBORLIGHT_CHROMIUM` mają takie samo znaczenie jak w teście interaktywnej wyspy.

Potwierdzony przebieg testu wykazał ruch wszystkich dziewięciu grup przez porównanie pikseli w odpowiednich regionach. Dla mieszkańców, zwierząt i mew sprawdzono również odizolowane grupy. W chronionych regionach HUD i kart interfejsu liczba narysowanych pikseli warstwy efektów wyniosła zero. Sprawdzono 51 przycisków, telefon w obu orientacjach, zatrzymanie i wznowienie przez pauzę, ustawienie animacji oraz systemowe ograniczenie ruchu. Nie wystąpiły błędy JavaScript ani nieudane żądania zasobów.

Po ostatniej optymalizacji zatrzymywania pętli ponownie zaliczono test animacji, 9 testów ekonomii oraz regresję rozgrywki: trzy ekspedycje, gospodarkę i 29 przejść do paneli w trzech rozmiarach ekranu. Po udanej publikacji sprawdzono również publiczną stronę: HTTP 200, oba obrazy PNG, działający zegar animacji, 51 kontrolek, ustawienia i pauzę/wznowienie, bez błędów JavaScript ani HTTP. Dowody publikacji są w dzienniku.

## Dalszy zakres

Pełne rozdzielenie wszystkich budynków, terenu i mieszkańców na niezależne assety pozostaje w [FE-02 / #8](https://github.com/ksobczak321-oss/gra/issues/8). Integracja zapisu z przyszłym API jest oddzielną pracą zależną od kontraktu BE-01 i trwałego zapisu BE-03. Ta iteracja nie dodaje backendu.

Liczby mieszkańców, zwierząt i mew dotyczą nowych ruchomych obiektów. Obraz referencyjny nadal zawiera namalowane nieruchome postacie i elementy świata. Budowa otrzymała wizualną aktywność; ta zmiana nie dodaje kolejek czasowych ani nie zmienia zasad wydawania zasobów przy ulepszeniu budynku.
