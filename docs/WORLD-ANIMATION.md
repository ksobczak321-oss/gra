# Żywa wyspa — animacje świata

Stan: 2026-10-21, trzecia iteracja usuwa cały nieruchomy tłum i stare smugi ze świata; opublikowana w commicie `0816d27`, sprawdzona wizualnie i testem publicznej strony. [Aktualna wyspa](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=0816d27) oraz [nagranie pełnego widoku i zbliżenia](https://ksobczak321-oss.github.io/gra/assets/previews/living-world-v3.webm). Zadanie [FE-04 / #10](https://github.com/ksobczak321-oss/gra/issues/10) pozostaje otwarte do oceny użytkownika, milestone [frontend #3](https://github.com/ksobczak321-oss/gra/milestone/3). Dowody publikacji zapisano w [dzienniku implementacji](IMPLEMENTATION-LOG.md).

## Cel tej iteracji

Ożywić zaakceptowaną wyspę HARBORLIGHT przy zachowaniu układu, skali i palety istniejącej grafiki. Praca obejmuje frontend i efekty świata. Obecna gospodarka, lokalny zapis oraz działające kontrolki pozostają podstawą interaktywnego prototypu.

## Poprawki po ocenie użytkownika

Sama zmiana pikseli w pojedynczym regionie nie jest wystarczającym odbiorem grafiki. W pierwszej wersji fale obejmowały cztery wybrane obszary morza, postacie poruszały się powoli nad tłem zawierającym również nieruchomych ludzi i zwierzęta, a dym był mało wyraźny. Użytkownik ponownie wskazał te cztery elementy jako wymagające poprawy.

Warunki odbioru tej poprawki:

- Ludzie rzeczywiście przemieszczają się po ścieżkach, ze zmianą położenia czytelną w ciągu kilku sekund. Animacja samych kończyn w miejscu nie wystarcza.
- Zwierzęta przechodzą pomiędzy miejscami wypasu i mają ruch nóg, głowy lub ogona; nie ograniczamy odbioru do zmiany pojedynczych pikseli.
- Przybój i falowanie obejmują wszystkie widoczne odcinki brzegu: zatoki północne, zachodni klif, port i wodę między pomostami, ujście południowe, plażę, wschodni brzeg oraz małe skały. Oddzielne maski mają chronić ląd, pomosty i interfejs.
- Dym powstaje przy wylocie komina, unosi się, rozszerza, dryfuje i zanika. Efekt musi być czytelny w normalnym widoku wyspy.
- Nieruchome postacie, zwierzęta i stare smugi z obrazu bazowego są zastępowane oczyszczonym tłem całego świata przed rysowaniem ruchomych obiektów. Nie oznacza to pełnego rozdzielenia wszystkich budynków i terenu na assety.

Komplet regresji lokalnych oraz rozszerzony test publicznej strony zaliczono dla trzeciej iteracji. Przegląd wizualny i nagranie uzupełniają testy; zgłoszenie pozostaje otwarte do oceny użytkownika.

| Element | Oczekiwane zachowanie | Stan odbioru |
| --- | --- | --- |
| Wiatrak | Łopaty obracają się wokół osi; miejscowe tło zastępuje stare łopaty przed rysowaniem wirnika | Opublikowane; ruch sprawdzony |
| Dym z domów | Osobne kłęby z wylotów kominów unoszą się, rozszerzają, dryfują i zanikają | 9 kominów; test śledzi te same kłęby między klatkami także na publicznej stronie |
| Mewy | Siedem mew przelatuje nad światem i porusza skrzydłami | Opublikowane; ruch sprawdzony |
| Wodospady | Dwie kaskady mają opadającą teksturę, strugi, pianę i rozprysk | Opublikowane; ruch sprawdzony |
| Fale | Przybój przesuwa się przy wszystkich widocznych odcinkach brzegu i skałach, z ruchem wody pomiędzy pomostami | 13 sektorów brzegu; test lokalny i publiczny zaliczony |
| Mieszkańcy | Postacie wyraźnie przemieszczają się po ścieżkach; położenie i chód są sprawdzane osobno | Wszystkie 24 postacie idą bez postojów, w tempie 6,8–9,1 px/s; test lokalny i publiczny zaliczony |
| Chmury | Trzy warstwy chmur przesuwają się nad niebem i dalekim planem | Opublikowane; ruch sprawdzony |
| Budowa | Dwa wciągniki poruszają linami i ładunkiem; pył pokazuje pracę na budowie | Opublikowane; ruch sprawdzony |
| Zwierzęta | Zwierzęta przechodzą pomiędzy miejscami wypasu, poruszają nogami i wykonują ruchy podczas postoju | Przejścia między punktami wypasu, pasienie i ruch uszu/ogona; test pełnego cyklu zaliczony |

## Architektura renderowania

Animacja korzysta z logicznego układu współrzędnych sceny 1672×941. Obraz referencyjny `assets/harborlight-v1-approved.png` pozostaje źródłem wyglądu świata. Ruchome obiekty i efekty są renderowane na osobnej warstwie Canvas nad grafiką, poniżej klikalnych kontrolek i HUD.

Podział odpowiedzialności:

| Plik | Rola |
| --- | --- |
| `harborlight-v1-ambient.js` | Wspólny zegar i pętla renderowania, wiatrak, chmury i aktywność budowy |
| `harborlight-v1-smoke.js` | Emisja i cykl życia kłębów z 9 kominów |
| `harborlight-v1-inhabitants.js` | Nieprzezroczyste oczyszczone tło świata i misa fontanny |
| `harborlight-v1-water.js` | Maskowana powierzchnia morza, fale, wodospady, piana i rozprysk |
| `harborlight-v1-life.js` | Trasy mieszkańców, ruch zwierząt i lot mew |
| `harborlight-v1-play.js` | Przekazanie aktualnego stanu pauzy, tempa i ustawień gracza do warstwy animacji |
| `tests/harborlight-animation-smoke.py` | Sprawdzenie faktycznego ruchu i zatrzymywania animacji w przeglądarce |

Moduły efektów otrzymują czas animacji z jednej pętli `requestAnimationFrame`. Nie tworzą własnych timerów. Canvas `#island-ambient` jest warstwą o `z-index: 6`; przyciski pozostają nad nim na poziomie 10. Maski wyznaczają powierzchnię świata: fale nie przesuwają lądu ani portowych budowli, a chmury i postacie nie przykrywają stałego interfejsu. Canvas efektów ma `pointer-events: none`, dzięki czemu zachowuje się dotychczasowa obsługa przycisków.

`createAmbientScene(stage, getState)` pobiera aktualny stan gry i zwraca `ready` oraz `destroy()`. `drawWater(ctx, source, t)` renderuje wodę, a `drawLife(ctx, t, options)` postacie, zwierzęta i mewy. Warstwa życia pozwala osobno wyłączyć każdą grupę, co umożliwia sprawdzenie ich rzeczywistego ruchu bez mylenia go z sąsiednimi efektami. Poprawka rozszerza diagnostykę o położenie aktorów i nazwane strefy brzegu, aby test potwierdzał przemieszczenie oraz zasięg przyboju.

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

Przebieg testu poprzedniej publikacji wykazał ruch wszystkich dziewięciu grup przez porównanie pikseli w wybranych regionach. Dla mieszkańców, zwierząt i mew sprawdzono również odizolowane grupy. W chronionych regionach HUD i kart interfejsu liczba narysowanych pikseli warstwy efektów wyniosła zero. Sprawdzono 51 przycisków, telefon w obu orientacjach, zatrzymanie i wznowienie przez pauzę, ustawienie animacji oraz systemowe ograniczenie ruchu. Nie wystąpiły błędy JavaScript ani nieudane żądania zasobów. Ten test nie dowodził pełnego pokrycia brzegu ani wystarczająco czytelnego przemieszczenia postaci, dlatego zakres odbioru został rozszerzony po opinii użytkownika.

Po ostatniej optymalizacji zatrzymywania pętli ponownie zaliczono test animacji, 9 testów ekonomii oraz regresję rozgrywki: trzy ekspedycje, gospodarkę i 29 przejść do paneli w trzech rozmiarach ekranu. Po udanej publikacji sprawdzono również publiczną stronę: HTTP 200, oba obrazy PNG, działający zegar animacji, 51 kontrolek, ustawienia i pauzę/wznowienie, bez błędów JavaScript ani HTTP. Dowody publikacji są w dzienniku.

## Dalszy zakres

Pełne rozdzielenie wszystkich budynków, terenu i mieszkańców na niezależne assety pozostaje w [FE-02 / #8](https://github.com/ksobczak321-oss/gra/issues/8). Integracja zapisu z przyszłym API jest oddzielną pracą zależną od kontraktu BE-01 i trwałego zapisu BE-03. Ta iteracja nie dodaje backendu.

Liczby mieszkańców, zwierząt i mew dotyczą ruchomych obiektów. Trzecia iteracja zastępuje tło świata oczyszczoną grafiką bez nieruchomych ludzi, zwierząt i smug; zatwierdzony interfejs pozostaje oryginalny. Szczegóły i ograniczenia oczyszczonego obrazu opisano niżej. Pełny rozdział budynków i terenu na assety pozostaje FE-02. Budowa otrzymała wizualną aktywność; ta zmiana nie dodaje kolejek czasowych ani nie zmienia zasad wydawania zasobów przy ulepszeniu budynku.


## Druga iteracja (historyczna): czytelny ruch i pełny brzeg

Zmiany są opublikowane i sprawdzone także na publicznym adresie. Wyniki regresji i publikacji są zapisane w dzienniku.

- `harborlight-v1-water.js` definiuje 13 `COASTAL_ZONES`: zatoki północne, zachodni klif, dwa sektory portu, ujście, południowe i wschodnie skały, plażę, skały północno-wschodnie oraz dwie grupy wysepek. Przybój narasta, przesuwa się do brzegu i zanika. Drobne falowanie oryginalnej tekstury obejmuje wodę wewnątrz pełnej maski, zamiast czterech izolowanych plam.
- Maskę wody tworzą obwiednie przestrzenne i kolory pikseli źródła. Z maski wyłączone są interfejs, łodzie i pomosty. Błękitne dachy oraz pola pozostają poza animacją. Sprawdzane są także próbki budynków, pól i latarni.
- 14 mieszkańców porusza się ze stałą prędkością 6,8–9,1 pikseli logicznych/s. Przy końcach tras robią krótkie postoje; nogi i ręce pracują podczas chodu. W próbce dwusekundowej widoczny dystans wynosi co najmniej 10 px u większości postaci.
- 7 zwierząt przechodzi pomiędzy punktami wypasu, zatrzymuje się, skubie trawę i porusza głową, uszami lub ogonem. Test próbuje pełny cykl 12 sekund, aby odróżnić rzeczywisty postój/nawrót od braku ruchu; każde zwierzę przemieszcza się o co najmniej 8 px.
- `harborlight-v1-smoke.js` emituje kłęby przy sprawdzonych wylotach kominów: `(533,207)`, `(793,155)`, `(492,314)`, `(700,301)`, `(689,351)`, `(474,403)`. Cząstki unoszą się, rozszerzają, dryfują z wiatrem i zanikają; ich cykl jest testowany niezależnie od samego istnienia Canvasu.
- `assets/harborlight-inhabitants-clean.png` powstał przez edycję zatwierdzonego oryginału narzędziem generowania grafiki. Renderer nie zastępuje nim całej sceny: `harborlight-v1-inhabitants.js` wybiera 48 obszarów starych sylwetek, 6 zwierząt i 2 starych smug dymu. Miejscowe wycinki mają nieprzezroczysty środek oraz miękką krawędź poza ciałem, aby nie pozostawiać półprzezroczystych postaci. Część drobnych figur z obrazu referencyjnego poza tym inwentarzem może pozostać nieruchoma; pełne rozdzielenie assetów nadal należy do FE-02.
- Wersjonowane adresy modułów i CSS `coast-life-2` odświeżają pliki w pamięci przeglądarki po publikacji.

Dodatkowy test odbioru:

```sh
python3 tests/harborlight-coastal-smoke.py
```

Test mierzy zmianę obrazu osobno dla 13 sektorów, rzeczywiste położenie postaci i zwierząt, wznoszenie/rozszerzanie/zanikanie dymu, nieprzezroczyste zakrycie starych sylwetek oraz brak malowania wody na chronionych fragmentach interfejsu i lądu. Nie zastępuje oględzin w normalnej skali.


## Trzecia iteracja: bez nieruchomych kopii ludzi i dymu

Po ponownej uwadze użytkownika przegląd obrazu ujawnił dwie przyczyny: częściowe maski zostawiały figury poza inwentarzem oraz większa smuga ratusza pochodziła z bocznego komina `(820,208)`, którego wcześniej nie zastąpiono w całości. Duża liczba nakładających się miękkich cząstek sprawiała ponadto wrażenie prawie nieruchomej mgły.

Bieżący renderer korzysta z całego oczyszczonego obrazu świata `assets/harborlight-inhabitants-clean.png` wewnątrz maski świata; zatwierdzony interfejs pozostaje z oryginalnego obrazu. Oczyszczone tło nie zawiera widocznych ludzi, zwierząt ani smug z kominów. Nie pobieramy już miejscowych wycinków tylko z 48 pozycji. Ta sama czysta grafika służy do próbkowania wody, aby nie wrysować ponownie fragmentów dawnych sylwetek. Również wycinek pomocniczego tła wiatraka sprawdzono pod kątem braku postaci.

Źródło jest wygenerowaną, oczyszczoną wersją wzorca, więc nie deklarujemy zgodności piksel w piksel całego świata z oryginałem. Układ i styl wyspy są zachowane, oryginalny asset nie jest nadpisywany. Ponieważ oczyszczanie usunęło figurę fontanny, dodano prostą kamienną misę z wodą bez sylwetki przypominającej nieruchomego NPC.

- Wszystkie **24 widoczne postacie świata są animowane**. Idą ze stałą prędkością; nie mają zaprogramowanych postojów. Na końcu trasy zawracają.
- Dym pochodzi z **9 kominów**: `(533,207)`, `(792,154)`, `(820,208)`, `(491,311)`, `(701,300)`, `(690,352)`, `(477,409)`, `(445,516)`, `(1349,179)`.
- Co 0,68 s rodzi się osobny kłąb; żyje 3,8 s, przemieszcza się w górę z prędkością ok. 24–30 px/s, rośnie, dryfuje i zanika. Widoczne są poszczególne jasne kłęby, zamiast jednolitej kolumny. Test śledzi identyfikator tego samego kłębu między klatkami.
- Wersja wejścia, CSS i modułów to `living-world-3`, aby stary cache nie podmieniał nowych efektów.
- Nagranie [pełnego widoku i zbliżenia](../assets/previews/living-world-v3.webm) pochodzi z przeglądarki. Zawiera 7 s widoku całej sceny i 9 s zbliżenia, zapisanych w 10 klatkach/s. Przybliżenie dotyczy nagrania kontrolnego, nie nowej funkcji kamery w grze.

Przegląd wizualny po zwiększeniu jasności i rozmiaru kłębów potwierdził, że dym jest widoczny także przy oknie szerokości 1200 px i wyraźnie przemieszcza się między klatkami oddalonymi o 0,9 s. W tle nie znaleziono widocznych nieruchomych sylwetek. Test odbioru wymaga teraz 24 stale idących postaci, nieprzezroczystego pokrycia całego świata oraz ruchu tych samych kłębów o co najmniej 23 px w sekundę, oprócz sprawdzenia wszystkich stref brzegu i wcześniejszych regresji.
