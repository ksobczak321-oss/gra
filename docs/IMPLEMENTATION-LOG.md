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

Status: implementacja, przegląd wizualny, komplet testów lokalnych, publikacja i test publicznej strony zakończone. [FE-05 / #15](https://github.com/ksobczak321-oss/gra/issues/15) zamknięte jako completed, milestone frontend #3.

- Użytkownik określił nowy start: po 100 sztuk każdego zasobu, 12 mieszkańców, szczęście 0% i poziom 1. Poziom ma odpowiadać poziomowi ratusza, a limit mieszkańców rosnąć o 24 z każdym poziomem.
- Użytkownik zaakceptował proporcjonalną interpolację tempa: 25% → jedna osoba co 12 godzin, 50% → co 6 godzin, 75% → około co 1 godzinę 43 minuty, 100% → co godzinę. Przy szczęściu ujemnym populacja maleje w tym samym tempie, przy 0% pozostaje stała.
- Wdrożono minimum 6 mieszkańców, ograniczenie pracowników po spadku populacji oraz usunięcie natychmiastowego przyrostu i zmiany limitu przy rozbudowie domu. Limit wynosi `24 × poziom ratusza`.
- Naliczanie dotyczy rzeczywistego czasu aktywnej gry na widocznej karcie, jest niezależne od przyspieszenia i zatrzymywane pauzą. Obecny prototyp nie nalicza postępu poza grą. Schemat zapisu 2 przechowuje część niepełnego postępu i zachowuje zasoby oraz osiągnięcia starszej wyspy. Czas przed zmianą szczęścia lub pauzy jest rozliczany według poprzedniego stanu.
- Dodano opis reguł, przykładów i przyszłego startu po zalogowaniu do dokumentacji i backlogu. Logowanie i serwerowy zapis pozostają planem backendu; nie są częścią tej implementacji frontendu.
- Górny pasek zastąpiono rzeczywistym HTML z poziomem, szczęściem, pięcioma zasobami i populacją. Dodano panel zasad i aktualizowany licznik czasu do następnej zmiany populacji. Wersja telefonu ma osobny czytelny pasek nad sceną; 54 kontrolki pozostają dostępne na komputerze i w obu orientacjach telefonu. Moduły stanu, wejście i CSS mają wersję `population-v2`.
- Zaliczono 23 testy stanu: progi i interpolację obu znaków, akumulację oraz zapis ułamka, natychmiastowy reset przy 0%/zmianie znaku, limit ratusza, minimum 6 i nadal działającą gospodarkę. Nowy test `harborlight-population-smoke.py` zaliczył w Chromium startowe wartości i mobilny HUD, pełną aktywną godzinę przy tempie 4×, pauzę, odświeżenie, migrację starego zapisu, ujemne szczęście oraz minimum 6 z aktualizacją pracowników.
- Regresja przeglądarkowa zaliczona: trzy ekspedycje, koszty i wybór rozbudowy, handel, latarnia, nagrody, zapis i produkcja oraz 32 trasy paneli przy 1672×941, 390×844 i 844×390. Testy animacji i wybrzeża potwierdziły 9 grup ruchu, 13 sektorów brzegu, 24 stale idące sylwetki oraz unoszenie tych samych kłębów z 9 kominów. Brak błędów JavaScript i HTTP.
- Commit [`df0b5fe`](https://github.com/ksobczak321-oss/gra/commit/df0b5fe) wysłano do `main`; workflow Pages [39661793850](https://github.com/ksobczak321-oss/gra/actions/runs/39661793850) zakończył się Success. [Aktualna gra](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=df0b5fe).
- Na publicznej stronie ponownie zaliczono cały `harborlight-population-smoke.py`: startowe wartości i mobilny pasek, pełną aktywną godzinę przy tempie 4×, pauzę i zapis, migrację istniejącej wyspy oraz ujemne szczęście i minimum 6 z aktualizacją pracowników. Bez błędów JavaScript i HTTP.
- [Dowody odbioru FE-05](https://github.com/ksobczak321-oss/gra/issues/15#issuecomment-6324709772) zapisano przed zamknięciem zadania. Reguły pierwszego utworzenia wyspy po zalogowaniu dopisano do [BE-02 / #12](https://github.com/ksobczak321-oss/gra/issues/12#issuecomment-6324711661), a przyszłą walidację demografii do [BE-04 / #14](https://github.com/ksobczak321-oss/gra/issues/14#issuecomment-6324713419); oba zadania backendu pozostają otwarte.

## 2026-10-22 — frontend: ratusz ogranicza rozbudowę, dom zapewnia miejsca

Status: implementacja, przegląd wizualny, komplet testów lokalnych, publikacja i test publicznej strony zakończone. [FE-06 / #16](https://github.com/ksobczak321-oss/gra/issues/16) zamknięte jako completed, milestone frontend #3.

- Użytkownik doprecyzował rolę ratusza: jego poziom jest poziomem gry i najwyższym poziomem rozbudowy pozostałych budynków. Ratusz 4 pozwala zatem rozbudować pozostałe budynki najwyżej do poziomu 4 i daje teoretyczny limit 96 mieszkańców.
- Dom wyznacza osobno rzeczywistą liczbę miejsc: `24 × poziom domu`. Dom 3 mieści 72 osoby. Przy populacji 78 sześć osób nie ma miejsca, mimo że nie osiągnięto limitu ratusza.
- Użytkownik zaakceptował karę: każda osoba bez miejsca obniża szczęście o 1 punkt procentowy na rzeczywistą godzinę aktywnej gry. Sześć osób bez miejsca daje spadek o 6 punktów na godzinę, dopóki przeludnienie pozostaje stałe. Rozbudowa domu zatrzymuje dalszą karę po zapewnieniu miejsc, bez zwrotu utraconego szczęścia.
- Dotychczasowe tempo narodzin i ubytku, minimum 6 osób oraz zatrzymywanie czasu przy pauzie i ukrytej karcie pozostają aktualne. Kara również jest niezależna od przyspieszenia produkcji. Schemat zapisu 3 zachowuje ułamkowe szczęście. Silnik wspólnie nalicza płynny spadek szczęścia oraz zmiany populacji na granicach jej tempa i kierunku, zamiast liczyć całą godzinę według początkowej wartości.
- Nowy start otrzymuje dom i ratusz na poziomie 1. Migracja zapisów 1/2 zachowuje zainwestowane poziomy budynków i zasoby przez podniesienie ratusza do najwyższego posiadanego poziomu; nie przyznaje dodatkowych mieszkańców. Pierwsza naprawa latarni daje poziom 1, a dalsza rozbudowa podlega limitowi ratusza, z zachowaniem osiągniętego poziomu po odświeżeniu.
- Zaktualizowano instrukcję, README oraz kryteria FE-06 i przyszłe wymagania BE-04. Wyniki bieżących testów i wdrożenia nie są wnioskowane z historycznego odbioru FE-05.
- HUD pokazuje osobno populację względem limitu ratusza oraz miejsca mieszkalne. Panel mieszkańców wyświetla oba limity, liczbę osób bez miejsca i karę godzinową, a panele budynków wyjaśniają blokadę i wskazują wymagany ratusz. Przy zmiennym szczęściu czas do zmiany populacji jest oznaczony jako szacunek. Wejście, CSS i moduł stanu mają wersję `housing-v3`.
- Zaliczono 37 testów stanu: wszystkie blokady poziomów bez pobrania zasobów, odblokowanie po rozbudowie ratusza, przykład 96/72/78 i −6 punktów na godzinę, część ułamkową, przejście przez 0%, zgodność długich i krótkich kroków czasu, minimum 6, brak przepełnienia dla skrajnego czasu, dalsze poziomy latarni i migrację zapisów.
- W Chromium zaliczono rozszerzony test populacji: pełną godzinę przy tempie 4×, płynną karę (−0,1 punktu po minucie i −6 po godzinie), aktualizację panelu, rozbudowę domu 3→4 z usunięciem przeludnienia bez zwrotu szczęścia, blokadę poziomu 5 przy ratuszu 4, zachowanie stanu po odświeżeniu oraz latarnię 2→3. Regresja całej gry zaliczyła trzy ekspedycje, zdobycie budżetu przez rzeczywiste akcje, rozbudowę ratusza i domu, handel, naprawę latarni, nagrody, zapis i produkcję oraz 32 trasy paneli przy trzech rozdzielczościach.
- Test animacji zaliczył dziewięć grup ruchu, pauzę, ograniczenie ruchu i dostępność kontrolek na telefonie. Test wybrzeża ponownie potwierdził 13 sektorów brzegu, 24 stale idące sylwetki i ruch tych samych kłębów z 9 kominów. Bez błędów JavaScript ani HTTP.
- Commit [`0ecf924`](https://github.com/ksobczak321-oss/gra/commit/0ecf924) wysłano do `main`; workflow Pages [39741841215](https://github.com/ksobczak321-oss/gra/actions/runs/39741841215) zakończył się Success. [Aktualna gra](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=0ecf924).
- Na publicznym Pages zaliczono cały rozszerzony `harborlight-population-smoke.py`: nowy start, HUD na telefonie, aktywną godzinę przy tempie 4×, pauzę, minimum 6, przykład 96/72/78 i spadek o 6 punktów, rozbudowę domu i zatrzymanie kary, blokadę następnego poziomu, migrację oraz zachowanie latarni na poziomie 3 po odświeżeniu. Bez błędów JavaScript ani HTTP.
- [Dowody odbioru FE-06](https://github.com/ksobczak321-oss/gra/issues/16#issuecomment-6335468633) zapisano przed zamknięciem zadania. Reguły przyszłej walidacji poziomów i przeludnienia dopisano do [BE-04 / #14](https://github.com/ksobczak321-oss/gra/issues/14#issuecomment-6335471150); backend pozostaje otwartym zadaniem.


## 2026-10-22 — frontend: gospodarka godzinowa, transport, rozbudowa i premie

Status: implementacja `economy-v6`; 56 testów stanu oraz lokalna regresja gry, logistyki i populacji zaliczone. Test budowy, pakietu, obu premii i targu oraz oba testy animacji również zaliczono. Publikacja i test publicznej strony pozostają do potwierdzenia. Zadania: [FE-07 / #17](https://github.com/ksobczak321-oss/gra/issues/17), [FE-08 / #18](https://github.com/ksobczak321-oss/gra/issues/18), [FE-09 / #19](https://github.com/ksobczak321-oss/gra/issues/19), plan backendu [BE-05 / #20](https://github.com/ksobczak321-oss/gra/issues/20).

- Wdrożono osiem miejsc pracy, wspólną pulę i limit połowy rzeczywistej populacji, podatki 1/os./h, powrót do domu 300 s i indywidualne fazy produkcji. Start: sześć pracujących i sześć wolnych, po 100 sześciu zasobów, ratusz/dom 1, szczęście 0%. Poziom techniczny do 100 obsługuje wymagany poziom 6.
- Dodano zboże i przetwarzanie 2:1, osobne składy 200 × ratusz, transport 60/os./h, priorytety i centralne limity 1000/4000 z mnożnikiem 1,5. Nadwyżki są zachowane w dostawach, nie mogą finansować budowy przed rzeczywistym przyjęciem. Odbiór i ręczne wytwarzanie nie omijają czasu.
- Pełny skład zatrzymuje pracę i obniża szczęście swojej załogi o 10, następnie o kolejne 10 co 24 aktywne godziny do 50. Średnia obejmuje wszystkich z indywidualnym ograniczeniem ±100. Dodano trwałe powiadomienia o zapełnieniu, także centralnym i na targu, oraz ich przeczytanie.
- Targ od poziomu 2, przystań od 4. Targ przenosi towary 60/os./h, blokuje każdą dostawę na godzinę i wymienia tylko w dwóch zaakceptowanych grupach, z 10% marżą i bez monet. Wynik wraca do magazynu za pośrednictwem magazynierów.
- Kaplica poziomu 1 bez pasywnej premii. Ukończenie rozbudowy daje na 10 h +10 × nowy poziom szczęścia i podatki ×2. Osobne jednorazowe błogosławieństwa dają +50 każdego zasobu i +20 szczęścia/1 h; liczba użyć w całej grze = poziom, bez nakładania dwóch ręcznych efektów. Lokalny licznik lojalności do 10 dni nie przyznaje nieokreślonych jeszcze nagród.
- Po obliczeniu minimum około 31/59 godzin dla pierwotnej normy użytkownik zaakceptował normę kosztową producentów 240/dobę × obecny poziom: 72 drewna +72 kamienia +120 produktu. Dla drewna/kamienia kwoty sumują się. Główne budynki kosztują 500 każdego zasobu wraz z monetami × obecny poziom. Cennika kaplicy nie zmieniono bez nowej reguły.
- Rozbudowa rezerwuje pełny koszt, przewozi materiały istniejącą załogą i następnie buduje przez równy czas. Nowy poziom i skutki działają dopiero po ukończeniu. Limit ratusza L daje L aktywnych oraz L opłaconych miejsc kolejki; zależności kolejnych poziomów i kolejność są zapisane.
- Lokalny model przyszłego płatnego pakietu dodaje 4 aktywne miejsca, kolejkę bez limitu i wielopoziomowe plany z szacunku dostaw. Materiały planu są rezerwowane dopiero po rzeczywistej centralnej dostawie. Data ważności jest kalendarzowa; rozpoczęte budowy kończą się, opłacona kolejka korzysta po wygaśnięciu ze zwykłego limitu, nieopłacone plany są zachowane i wstrzymane. Sprzedaż, cena i serwerowe potwierdzenie zapłaty nie są wdrożone.
- Latarnia kosztuje 500 każdego zasobu ze złotem. Użytkownik zdecydował zachować koszt po przedstawieniu minimum około 35 aktywnych godzin od startu przy 12 osobach. Jej budowa to transport T i budowanie 2T. Użytkownik potwierdził obie premie na 24 h × ukończony poziom: +100 szczęścia i produkcja pięciu materiałów ×2; podatki i transport bez mnożnika.
- Na podstawie zrzutu użytkownika usunięto z ratusza przydział i odbiór. Obok poziomu są mieszkańcy obecni/limit i podatki na godzinę. „Ulepsz” działa bez wyboru miejsca; wszystkie wymagane zasoby pokazują centralne posiadane/wymagane w czerwieni lub zieleni. Oględziny wykonano na komputerze i przy szerokości 390 px.
- Schemat 6 zachowuje osiągnięcia i zasoby poprzednich wydań, rozlicza nieodebrane stare monety jednokrotnie i zachowuje dawną gotową żywność farmy jako żywność. Robocze wersje 4/5 nie były publikowane. Czas aktywnej gospodarki nie jest mnożony przez tempo zegara ani naliczany poza grą.
- Pełną specyfikację i ocenę czasu zapisano w [ECONOMY-RULES.md](ECONOMY-RULES.md), zaktualizowano instrukcję, README i backlog frontend/backend. Backend, logowanie, synchronizacja i płatności nadal pozostają przyszłymi zadaniami.

- Lokalne testy przeglądarkowe: cała rozgrywka z trzema ekspedycjami i 34 trasami paneli × 3 rozdzielczości; produkcja 7/13 min, powroty, receptury, transport i limity; godzina populacji, przeludnienie i migracja; koszty ratusza w czerwieni/zieleni, 23/48 i podatki, bezpośrednie ulepszenie, 2+2, zapis i automatyczna promocja, wygaśnięcie pakietu podczas pauzy, latarnia 2 → obie premie 48 h, kaplica i targ. Długie czasy budowy sprawdzają pełne testy stanu; przeglądarka używa zapisanych stanów przy granicy ukończenia. Brak błędów JavaScript/HTTP.
- Oba lokalne testy animacji zaliczone: dziewięć grup efektów i sterowanie ruchem, wszystkie 13 sektorów brzegu, 24 stale idące sylwetki oraz te same wznoszące się kłęby z dziewięciu kominów. Ruch i maski interfejsu zachowane.
