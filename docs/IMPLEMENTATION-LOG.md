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

Status: poprawki zintegrowane, rozszerzone testy lokalne i publiczne zaliczone, publikacja zakończona.

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

- Implementację opublikowano w commicie [`42b6285`](https://github.com/ksobczak321-oss/gra/commit/42b6285). Workflow [39656338266](https://github.com/ksobczak321-oss/gra/actions/runs/39656338266) zakończył się Success.
- `HARBORLIGHT_BASE_URL=https://ksobczak321-oss.github.io/gra python3 tests/harborlight-coastal-smoke.py` zaliczono na publicznej stronie: wszystkie 13 sektorów wykazało ruch, postacie i każde zwierzę miały rzeczywiste przemieszczenie, 6 kominów emitowało wznoszący i zanikający dym. Potwierdzono zakrycie środków 48 sylwetek i 6 zwierząt, brak błędów JavaScript/HTTP i brak efektów w chronionych próbkach UI/lądu.
- Aktualny [podgląd poprawki](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=42b6285) używa wersji modułów i CSS `coast-life-2`. Zgłoszenie #10 pozostaje otwarte do oceny wizualnej po publikacji; techniczne testy nie zastępują oceny odbiorcy.
- Wyniki i link do poprawki dopisano do [zgłoszenia #10](https://github.com/ksobczak321-oss/gra/issues/10#issuecomment-6323959176). Zgłoszenie zachowuje milestone frontend #3 i stan otwarty.


## 2026-10-21 — frontend: pełny świat bez nieruchomych ludzi i rzeczywiście lecący dym

Status: implementacja, oględziny, komplet regresji lokalnych, publikacja i rozszerzony test publicznej strony zakończone.

- Użytkownik wskazał, że nie wszyscy ludzie chodzą i dym nadal nie leci. Oględziny pokazały, że częściowe maski nie obejmowały wszystkich figur, a duża smuga przy ratuszu miała źródło w bocznym kominie `(820,208)`, a nie tylko na wieży.
- Cały świat otrzymuje teraz oczyszczone tło bez ludzi i smug; zatwierdzony interfejs zachowano. Woda próbkuje tę samą czystą grafikę. Sprawdzono, że wycinek tła wiatraka również nie zawiera postaci. Zamiast usuniętej figury fontanny narysowano kamienną misę bez sylwetki NPC.
- Dodano 24 stale chodzące postacie bez postojów. Dym jest emitowany z 9 sprawdzonych kominów jako odrębne jasne kłęby, co 0,68 s, z czasem życia 3,8 s i prędkością wznoszenia ok. 24–30 px/s. Wzmocniono jasny rdzeń i rozmiar po oględzinach w zwykłym widoku.
- Niezależny przegląd wizualny w świeżej sesji przeglądarki potwierdził czytelny ruch dymu przy szerokości 1200 px, wyraźne przemieszczenie w ciągu 0,9 s oraz brak widocznych nieruchomych sylwetek w tle. Przygotowano nagranie pełnej sceny i zbliżenia `assets/previews/living-world-v3.webm`.
- Rozszerzono test o nieprzerwane chodzenie wszystkich 24 postaci, pełne pokrycie oczyszczonego świata oraz śledzenie tych samych kłębów między klatkami.
- Ponownie zaliczono 9 testów gospodarki, pełną regresję gry (3 ekspedycje, 29 tras dialogów × 3 rozmiary ekranu), test animacji z pauzą/ustawieniami/telefonem oraz wzmocniony test wybrzeża, wszystkich 24 pieszych i śledzenia tych samych kłębów z 9 kominów. Brak błędów JavaScript i HTTP. Nagranie ma 16 sekund, 1280×720 i rozmiar 1 343 525 bajtów.
- Commit [`0816d27`](https://github.com/ksobczak321-oss/gra/commit/0816d27) wysłano do `main`. Workflow Pages [39659487227](https://github.com/ksobczak321-oss/gra/actions/runs/39659487227) zakończył się Success.
- Na [publicznej wyspie](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=0816d27) ponownie zaliczono `harborlight-coastal-smoke.py`: 13 sektorów brzegu, 24 stale chodzące postacie, pełne czyste tło, te same wznoszące się kłęby z 9 kominów oraz osłony interfejsu i lądu. Przeglądarka potwierdziła renderer `living-world-3`; bez błędów JavaScript ani HTTP.
- Publiczne [nagranie](https://ksobczak321-oss.github.io/gra/assets/previews/living-world-v3.webm) przeglądarka poprawnie zdekodowała: 16 s, 1280×720, również po przewinięciu do 8. sekundy.
- Dowody publikacji, testów oraz linki dopisano do [FE-04 / #10](https://github.com/ksobczak321-oss/gra/issues/10#issuecomment-6324387868). Zadanie pozostaje otwarte do wizualnej oceny użytkownika.

## 2026-10-21 — frontend: poziom ratusza, szczęście i zmiany populacji

Status: implementacja, przegląd wizualny i komplet testów lokalnych zakończone; publikacja wymaga osobnego potwierdzenia. [FE-05 / #15](https://github.com/ksobczak321-oss/gra/issues/15), milestone frontend #3.

- Użytkownik określił nowy start: po 100 sztuk każdego zasobu, 12 mieszkańców, szczęście 0% i poziom 1. Poziom ma odpowiadać poziomowi ratusza, a limit mieszkańców rosnąć o 24 z każdym poziomem.
- Użytkownik zaakceptował proporcjonalną interpolację tempa: 25% → jedna osoba co 12 godzin, 50% → co 6 godzin, 75% → około co 1 godzinę 43 minuty, 100% → co godzinę. Przy szczęściu ujemnym populacja maleje w tym samym tempie, przy 0% pozostaje stała.
- Wdrożono minimum 6 mieszkańców, ograniczenie pracowników po spadku populacji oraz usunięcie natychmiastowego przyrostu i zmiany limitu przy rozbudowie domu. Limit wynosi `24 × poziom ratusza`.
- Naliczanie dotyczy rzeczywistego czasu aktywnej gry na widocznej karcie, jest niezależne od przyspieszenia i zatrzymywane pauzą. Obecny prototyp nie nalicza postępu poza grą. Schemat zapisu 2 przechowuje część niepełnego postępu i zachowuje zasoby oraz osiągnięcia starszej wyspy. Czas przed zmianą szczęścia lub pauzy jest rozliczany według poprzedniego stanu.
- Dodano opis reguł, przykładów i przyszłego startu po zalogowaniu do dokumentacji i backlogu. Logowanie i serwerowy zapis pozostają planem backendu; nie są częścią tej implementacji frontendu.
- Górny pasek zastąpiono rzeczywistym HTML z poziomem, szczęściem, pięcioma zasobami i populacją. Dodano panel zasad i aktualizowany licznik czasu do następnej zmiany populacji. Wersja telefonu ma osobny czytelny pasek nad sceną; 54 kontrolki pozostają dostępne na komputerze i w obu orientacjach telefonu. Moduły stanu, wejście i CSS mają wersję `population-v2`.
- Zaliczono 23 testy stanu: progi i interpolację obu znaków, akumulację oraz zapis ułamka, natychmiastowy reset przy 0%/zmianie znaku, limit ratusza, minimum 6 i nadal działającą gospodarkę. Nowy test `harborlight-population-smoke.py` zaliczył w Chromium startowe wartości i mobilny HUD, pełną aktywną godzinę przy tempie 4×, pauzę, odświeżenie, migrację starego zapisu, ujemne szczęście oraz minimum 6 z aktualizacją pracowników.
- Regresja przeglądarkowa zaliczona: trzy ekspedycje, koszty i wybór rozbudowy, handel, latarnia, nagrody, zapis i produkcja oraz 32 trasy paneli przy 1672×941, 390×844 i 844×390. Testy animacji i wybrzeża potwierdziły 9 grup ruchu, 13 sektorów brzegu, 24 stale idące sylwetki oraz unoszenie tych samych kłębów z 9 kominów. Brak błędów JavaScript i HTTP.
