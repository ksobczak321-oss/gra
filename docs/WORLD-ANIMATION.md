# Żywa wyspa — animacje świata

Stan: 2026-10-21, poprawki po ocenie użytkownika w toku. Poprzednia wersja została opublikowana i przeszła opisane niżej testy techniczne, ale nie spełniła oczekiwania wyraźnego chodu, ruchu zwierząt, dymienia i fal przy całej widocznej linii brzegowej. Zadanie [FE-04 / #10](https://github.com/ksobczak321-oss/gra/issues/10) ponownie wymaga odbioru, milestone [frontend #3](https://github.com/ksobczak321-oss/gra/milestone/3). Commity i faktyczne wyniki publikacji zapisujemy w [dzienniku implementacji](IMPLEMENTATION-LOG.md).

## Cel tej iteracji

Ożywić zaakceptowaną wyspę HARBORLIGHT przy zachowaniu układu, skali i palety istniejącej grafiki. Praca obejmuje frontend i efekty świata. Obecna gospodarka, lokalny zapis oraz działające kontrolki pozostają podstawą interaktywnego prototypu.

## Poprawki po ocenie użytkownika

Sama zmiana pikseli w pojedynczym regionie nie jest wystarczającym odbiorem grafiki. W pierwszej wersji fale obejmowały cztery wybrane obszary morza, postacie poruszały się powoli nad tłem zawierającym również nieruchomych ludzi i zwierzęta, a dym był mało wyraźny. Użytkownik ponownie wskazał te cztery elementy jako wymagające poprawy.

Warunki odbioru tej poprawki:

- Ludzie rzeczywiście przemieszczają się po ścieżkach, ze zmianą położenia czytelną w ciągu kilku sekund. Animacja samych kończyn w miejscu nie wystarcza.
- Zwierzęta przechodzą pomiędzy miejscami wypasu i mają ruch nóg, głowy lub ogona; nie ograniczamy odbioru do zmiany pojedynczych pikseli.
- Przybój i falowanie obejmują wszystkie widoczne odcinki brzegu: zatoki północne, zachodni klif, port i wodę między pomostami, ujście południowe, plażę, wschodni brzeg oraz małe skały. Oddzielne maski mają chronić ląd, pomosty i interfejs.
- Dym powstaje przy wylocie komina, unosi się, rozszerza, dryfuje i zanika. Efekt musi być czytelny w normalnym widoku wyspy.
- Wybrane nieruchome postacie, zwierzęta i stare smugi z obrazu bazowego są zastępowane miejscowymi fragmentami tła przed rysowaniem ruchomych obiektów. Zakres usunięcia trzeba opisać zgodnie z faktycznymi maskami; nie oznacza to pełnego rozdzielenia całego obrazu.

Nowe wyniki testów i publikacja tej poprawki nie są jeszcze potwierdzone. Poprzedni zaliczony test pozostaje dowodem działania poprzedniego renderera, nie odbioru tych rozszerzonych warunków.

| Element | Oczekiwane zachowanie | Stan odbioru |
| --- | --- | --- |
| Wiatrak | Łopaty obracają się wokół osi; miejscowe tło zastępuje stare łopaty przed rysowaniem wirnika | Wdrożone lokalnie; ruch sprawdzony |
| Dym z domów | Ciągłe emisje z wylotów kominów unoszą się, rozszerzają, dryfują i zanikają | Ciągła emisja z 6 sprawdzonych kominów; lokalne testy zaliczone |
| Mewy | Siedem mew przelatuje nad światem i porusza skrzydłami | Wdrożone lokalnie; ruch sprawdzony |
| Wodospady | Dwie kaskady mają opadającą teksturę, strugi, pianę i rozprysk | Wdrożone lokalnie; ruch sprawdzony |
| Fale | Przybój przesuwa się przy wszystkich widocznych odcinkach brzegu i skałach, z ruchem wody pomiędzy pomostami | 13 sektorów brzegu; ruch wody i przyboju sprawdzony lokalnie |
| Mieszkańcy | Postacie wyraźnie przemieszczają się po ścieżkach; położenie i chód są sprawdzane osobno | Stałe tempo 6,8–9,1 px/s, wyraźny chód i krótkie postoje |
| Chmury | Trzy warstwy chmur przesuwają się nad niebem i dalekim planem | Wdrożone lokalnie; ruch sprawdzony |
| Budowa | Dwa wciągniki poruszają linami i ładunkiem; pył pokazuje pracę na budowie | Wdrożone lokalnie; ruch sprawdzony |
| Zwierzęta | Zwierzęta przechodzą pomiędzy miejscami wypasu, poruszają nogami i wykonują ruchy podczas postoju | Przejścia między punktami wypasu, pasienie i ruch uszu/ogona; test pełnego cyklu zaliczony |

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

Liczby mieszkańców, zwierząt i mew dotyczą ruchomych obiektów, nie wszystkich postaci widocznych na obrazie referencyjnym. Obraz nadal zawiera nieruchome elementy świata. Nowa poprawka ma usuwać wybrane najbardziej widoczne nieruchome postacie i zwierzęta miejscowymi maskami, a nie zastępować cały obraz generowaną wersją. Pełny rozdział assetów pozostaje FE-02. Budowa otrzymała wizualną aktywność; ta zmiana nie dodaje kolejek czasowych ani nie zmienia zasad wydawania zasobów przy ulepszeniu budynku.


## Druga iteracja: czytelny ruch i pełny brzeg

Zmiany są zintegrowane lokalnie; wynik ponowienia regresji i publikacji opisujemy w dzienniku.

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
