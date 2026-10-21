# Dziennik implementacji

Każdy wpis powinien podawać wynik zmiany, sposób sprawdzenia oraz stan publikacji. Prace lokalne, wysłanie commita i udana publikacja GitHub Pages są osobnymi zdarzeniami.

## 2026-10-21 — przywrócenie ekranu v1

- Zdiagnozowano `assets/harborlight-v1-approved.jpg`: plik zawierał uszkodzony tekst Base64 zamiast poprawnego obrazu JPEG. Próba dekodowania nie przywracała kompletnego obrazu.
- Użytkownik dostarczył oryginalny PNG 1672×941 przez GitHub. Przeniesiono go do `assets/harborlight-v1-approved.png` bez zmiany zawartości.
- Podłączono poprawny PNG do widoku referencyjnego i warstwowego. Oba obrazy porównano z oryginałem piksel w piksel przy 1672×941; sprawdzono też układy 390×844 i 844×390, bez błędów JavaScript i HTTP.
- Commit `234a0ac` został wysłany do `main`. Workflow GitHub Pages [39647578062](https://github.com/ksobczak321-oss/gra/actions/runs/39647578062) zakończył się statusem Success. Bezpośrednie sprawdzenie hosta Pages ze środowiska było ograniczone przez proxy; sukces publikacji potwierdzono na stronie workflow.

## 2026-10-21 — klikalna wyspa i gospodarka

Status: implementacja, weryfikacja i publikacja interaktywnej piaskownicy zakończone.

- Dodano warstwę przycisków nad zaakceptowanym ekranem, dialogi i aktualizowane liczniki HUD. Obsłużono menu, nawigację, zasoby, mieszkańców, zegar, cel latarni, dzielnice i dolny dok.
- Oddzielono reguły gry do `harborlight-v1-state.js`: produkcja, pracownicy, ulepszenia, przetwarzanie, handel, zadania, dostawy, naprawa latarni, dekoracje i ścieżki.
- Dodano trzy plansze ekspedycji z narzędziami, skrzyniami i jednorazowymi nagrodami. Skrzynie dają bonus monet przy pierwszym ukończeniu.
- Dodano zapis `harborlight-v1-interactive-save`, normalizację danych, ograniczenia gospodarki oraz potwierdzenie resetu.
- Sprawdzenia: 9 testów silnika zaliczonych; 51 środków obszarów kliknięć trafia w odpowiadające przyciski; 29 przejść do paneli sprawdzono przy 1672×941, 390×844 i 844×390. Dialogi mieszczą się w ekranie, bez poziomego przepełnienia i bez błędów JavaScript.
- W przeglądarce zaliczono przebieg: odbiór produkcji → rozbudowa domu → nagroda za zadanie → handel → naprawa latarni → pierwsza ekspedycja → odświeżenie i zachowany zapis.
- Dodano i wykonano `tests/harborlight-browser-smoke.py`: zaliczono wszystkie trzy ekspedycje przez rzeczywiste ruchy z narzędziami i premiami za skrzynie, aktualizację produkcji bez ponownego otwierania panelu, 29 tras dialogów w trzech rozmiarach ekranu, menu mobilne oraz brak błędów JavaScript i HTTP. Test używa świeżej sesji i nie wywołuje wewnętrznych akcji gry zamiast kliknięć.
- Po przeglądzie poprawiono odświeżanie liczników produkcji i zachowanie fokusu oraz dodano niepomniejszane menu na telefonie. Ograniczenie ruchu respektuje ustawienie użytkownika.
- Dodano widoczne oznaczenia nowych poziomów budynków, dekoracje SVG, ulepszone ścieżki i światło naprawionej latarni. Bazowa grafika wyspy pozostaje zaakceptowanym obrazem.
- Commit [`3da64c8`](https://github.com/ksobczak321-oss/gra/commit/3da64c87f2810f804da0f054f18731b73de43b6a) wysłano do `main`. Publikacja [39650146663](https://github.com/ksobczak321-oss/gra/actions/runs/39650146663) zakończyła się statusem Success.
- [Publiczną piaskownicę](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=3da64c8) sprawdzono po publikacji w Chromium: HTTP 200, załadowany PNG, 51 kontrolek, działające menu i lista trzech ekspedycji, bez błędów JavaScript ani HTTP. Postęp pozostaje lokalny w przeglądarce; reset jest dostępny w ustawieniach.

## 2026-10-21 — dokumentacja i plan Frontend / Backend

- Zaktualizowano README z kierunku BLACKOUT na aktywny projekt HARBORLIGHT, dodając sposób uruchamiania, testy i dokumentację.
- Dodano [opis interaktywnej wyspy](INTERACTIVE-ISLAND.md), ten dziennik i [backlog](BACKLOG.md) z zadaniami oraz kryteriami odbioru dla milestone’ów Frontend i Backend.
- Potwierdzono istniejące milestone’y: [frontend #3](https://github.com/ksobczak321-oss/gra/milestone/3) i [backend #4](https://github.com/ksobczak321-oss/gra/milestone/4). Przygotowano po cztery zadania z kryteriami odbioru.
- Początkowa próba dostępu do API GitHub w sandboxie otrzymała proxy 403. Obsługiwane rozszerzenie uprawnień narzędzia pozwoliło odczytać API z istniejącym uwierzytelnianiem, bez nowego tokenu. Dodatki domen `api.github.com` i `ksobczak321-oss.github.io` zapisano również w szkicu konfiguracji środowiska; szkic nie jest równoznaczny z aktywacją sieci ani publikacją środowiska.

- Potwierdzono utworzenie i przypisanie zgłoszeń: Frontend [#7](https://github.com/ksobczak321-oss/gra/issues/7), [#8](https://github.com/ksobczak321-oss/gra/issues/8), [#9](https://github.com/ksobczak321-oss/gra/issues/9), [#10](https://github.com/ksobczak321-oss/gra/issues/10) w milestone `frontend #3`; Backend [#11](https://github.com/ksobczak321-oss/gra/issues/11), [#12](https://github.com/ksobczak321-oss/gra/issues/12), [#13](https://github.com/ksobczak321-oss/gra/issues/13), [#14](https://github.com/ksobczak321-oss/gra/issues/14) w `backend #4`.
- Zgłoszenie FE-01 / #7 zamknięto jako completed z [dowodami testów i publikacji](https://github.com/ksobczak321-oss/gra/issues/7#issuecomment-6323171303). Pozostałe siedem zgłoszeń pozostaje otwartych. Backend jest planem prac, nie działającą usługą tej wersji.

## 2026-10-21 — frontend: animacje świata

Status: implementacja, komplet regresji, publikacja i sprawdzenie publicznego podglądu zakończone.

- Użytkownik ustalił priorytet frontendu i grafiki oraz dziewięć wymaganych animacji: wiatrak, dym, mewy, wodospady, fale, mieszkańcy, chmury, budowa z pracującym dźwigiem i zwierzęta na farmie.
- Doprecyzowano FE-04 / #10 do animacji świata. Integracja zapisu z API pozostaje oddzielną przyszłą pracą, zależną od BE-01 i BE-03.
- Dodano [dokument animacji świata](WORLD-ANIMATION.md) z kryteriami odbioru, podziałem warstw i wymaganiami wobec czasu, masek interfejsu oraz ograniczenia ruchu.
- Dodano osobną warstwę Canvas `#island-ambient` oraz moduły wody i życia wyspy. Zawiera wiatrak, dym z pięciu kominów, trzy warstwy chmur, fale, dwie kaskady, 14 mieszkańców, 7 zwierząt, 7 mew i dwa pracujące wciągniki z ładunkami oraz pyłem.
- Pomocniczy `assets/harborlight-windmill-clean.png` (1672×941) powstał przez edycję oryginału narzędziem generowania grafiki w celu usunięcia łopat. Ponieważ wynik zmienił również inne fragmenty, runtime korzysta wyłącznie z miejscowego wycinka 114×116 i miękkiej maski przy wiatraku. Oryginalny PNG pozostaje bez zmian.
- Wspólna pętla renderuje do 30 klatek/s na komputerze i 24 na małym ekranie z buforem 40–100% skali. Pauza, ustawienia animacji, systemowe ograniczenie ruchu i niewidoczna karta zatrzymują aktywną pętlę bez nadrabiania czasu po wznowieniu.
- `tests/harborlight-animation-smoke.py` zaliczył porównanie ruchu dziewięciu grup, w tym odizolowanych mieszkańców, zwierząt i mew. Chronione regiony HUD i kart miały zero narysowanych pikseli efektów. Sprawdzono 51 przycisków, telefon w obu orientacjach, pauzę/wznowienie, ustawienie animacji i `prefers-reduced-motion`, bez błędów JavaScript ani HTTP.
- Po ostatniej optymalizacji pętli ponownie zaliczono `node --test tests/harborlight-state.test.mjs` (9 testów), `python3 tests/harborlight-animation-smoke.py` oraz `python3 tests/harborlight-browser-smoke.py` (trzy ekspedycje z premiami za skrzynie, pełna gospodarka, zapis, produkcja i 29 tras paneli przy trzech rozdzielczościach). Bez błędów JavaScript i HTTP. Potwierdzenie publikacji znajduje się poniżej.

- Implementacja: commit [`b3f5bf1`](https://github.com/ksobczak321-oss/gra/commit/b3f5bf1); odświeżenie wersji CSS i modułu wejściowego w cache: [`de2b13b`](https://github.com/ksobczak321-oss/gra/commit/de2b13b). Publikacja GitHub Pages [39652870761](https://github.com/ksobczak321-oss/gra/actions/runs/39652870761) zakończyła się Success.
- Publiczny [podgląd animacji](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=de2b13b) sprawdzono po publikacji w Chromium: HTTP 200, oba PNG i dziewięć grup efektów załadowane, czas renderera postępuje, 51 kontrolek oraz ustawienia działają, pauza zatrzymuje ruch, wznowienie go przywraca. Bez błędów JavaScript i HTTP.
- Oryginalny asset zachował identyczne bajty; SHA-256: `4063f003002f95dd7b00f77a8d6d610b04f134766e52afc97e8a10712fd6d823`.
- Zadanie [FE-04 / #10](https://github.com/ksobczak321-oss/gra/issues/10) zamknięto jako completed w milestone `frontend #3`. [Komentarz odbioru](https://github.com/ksobczak321-oss/gra/issues/10#issuecomment-6323516165) zawiera commity, wynik publikacji, testy, link publiczny i granice obecnej bazy graficznej. FE-02 / #8 pozostaje otwarte.

## 2026-10-21 — frontend: poprawki czytelności ruchu i całej linii brzegowej

Status: poprawki zintegrowane i rozszerzone testy lokalne zaliczone; publikacja w toku.

- Użytkownik ponownie wskazał chodzenie ludzi, ruch zwierząt i dymienie domów oraz doprecyzował ruch wody przy brzegach „wszędzie”. Poprzednie zaliczone testy dowodziły działania renderera, lecz nie pełnego zasięgu przyboju ani wystarczającej czytelności ruchu w normalnym widoku.
- Przegląd wykazał cztery wybrane obszary falowania oraz powolne ruchome postacie nad obrazem, który zawierał nadal nieruchomych ludzi i zwierzęta. Rozszerzono kryteria FE-04 o wszystkie widoczne odcinki brzegu, rzeczywiste przemieszczenie aktorów i dym emitowany przy kominach.
- Zaplanowano miejscowe wykorzystanie pomocniczego tła bez wybranych nieruchomych postaci, zwierząt i smug, z zachowaniem oryginalnego obrazu bazowego. Faktyczny asset, maski i ich zakres zostaną opisane po integracji; nie oznacza to pełnego rozdzielenia assetów FE-02.
- Nowy wynik testów, stan zgłoszenia GitHub oraz commit i publikacja tej poprawki wymagają osobnego potwierdzenia. Nie zmieniono historycznych wyników poprzednich testów w dowód spełnienia nowych kryteriów.

- Zintegrowano `harborlight-v1-inhabitants.js` z miejscowymi, nieprzezroczystymi maskami 48 wybranych sylwetek, 6 zwierząt i 2 starych smug. Nowy pomocniczy PNG powstał przez edycję grafiki; oryginalny asset nie jest nadpisywany.
- Poprawiono sześć punktów emisji dymu po oględzinach kominów. Nowy moduł `harborlight-v1-smoke.js` tworzy unoszące się, rozszerzające i gasnące kłęby.
- Woda otrzymała 13 nazwanych sektorów przyboju i pełniejszą maskę wody z odrzucaniem kolorów lądu/obiektów. Ludzie chodzą stałym tempem, zwierzęta przechodzą między punktami wypasu.
- Zaliczono `tests/harborlight-coastal-smoke.py`: zmiana pikseli we wszystkich 13 sektorach, faktyczny dystans ludzi i zwierząt, cykl 6 źródeł dymu, nieprzezroczyste środki masek sylwetek i brak efektów w chronionych próbkach UI/lądu. Sprawdzono również powiększenie placu i całą scenę.
- Ponownie zaliczono 9 testów gospodarki, test dziewięciu grup animacji z pauzą/ograniczeniem ruchu/telefonem oraz pełną regresję gry: trzy ekspedycje, gospodarka, zapis i 29 tras paneli w trzech rozdzielczościach. Bez błędów JavaScript i HTTP. Nowa publikacja wymaga osobnego potwierdzenia.
- Zadanie [#10](https://github.com/ksobczak321-oss/gra/issues/10) ponownie otwarto w milestone frontend #3; [komentarz po uwagach użytkownika](https://github.com/ksobczak321-oss/gra/issues/10#issuecomment-6323676169) opisuje dodatkowe kryteria. Zgłoszenie pozostaje otwarte do oceny wizualnej poprawionej wersji.
