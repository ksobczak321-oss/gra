# Naprawa ładowania i obciążenia Chrome — 19 listopada 2026

Użytkownik zgłosił: „gra się wolno ładuje i czasami zawiesza Chrome, sprawdź czemu i popraw”. Zakres obejmuje diagnozę rzeczywistego startu, poprawkę na DEV, pomiar przed/po oraz standardową promocję sprawdzonej poprawki do PRE-PROD. Kod **0.15.2.1 / `frontend-v32-18`** jest zamrożony na `bf2f4ac12c1ef1cd69adb8c3e572649fdc975190`. Źródło publikacji z odświeżonymi artefaktami, jego własne CI, Pages, tag i nowa promocja pozostają PENDING.

Późniejsze zgłoszenie ze screenem — „co tu się stało z tym domkiem producenta skór” — obejmuje także naprawę kolejności rysowania Zakładu skórzanego. Jego grafika i geometria są zachowane; naprawiany jest porządek nakładania budynków.

## Potwierdzony problem

Izolowany pomiar poprzedniego źródła `e5d76110365c77d5c026b53b6195e56a3a327542`, z rzeczywistymi obrazami i pustą pamięcią podręczną, pobrał na starcie **52 630 275 bajtów / 29 adresów obrazów**. Gra ładowała wszystkie atlasy dziesięciu wariantów każdej rodziny, stare obrazy miniatur i wiatraka oraz bazowy PNG pod dwoma adresami.

W pomiarze desktop renderer Chrome osiągnął około **748 MB RSS**, a na telefonie 2× około **717 MB**, przy stercie JS około 14 MB. Przez 6 s bezczynności czas wykonywania skryptów wzrósł o 3,19 s na desktopie i 3,14 s na telefonie. Osobny profil wskazał koszt pełnoekranowych masek i pośredniej kopii animacji wody. Nie odtworzono w tym pomiarze awarii procesu przeglądarki.

To pomiary lokalnego HTTP i headless Chromium z renderowaniem programowym. Czas startu nie obejmuje opóźnień publicznej sieci, wyniki FPS nie są przewidywaniem dla sprzętowego GPU, a suma RSS procesów może liczyć współdzielone strony. Dlatego osobno zapisano RSS renderera. Pierwsze pomiary z równoległymi przeglądarkami zachowano jako pomocnicze; porównanie końcowe musi używać izolowanych przebiegów.

## Przygotowana poprawka

- 200 osobnych WebP wydziela dokładne istniejące kadry. Każdy ma identyczne piksele RGBA, również RGB przezroczystych pikseli. Bez skalowania, retuszu lub zmiany zaakceptowanych budynków, ich kotwic i obwiedni.
- Start pobiera i dekoduje bieżący wariant każdej z 20 rodzin oraz teren. Dekoracyjna chatka może potrzebować 21. kadru, jeżeli jej wygląd zależny od Ratusza różni się od aktualnego Domu. Żuraw jest wymagany wtedy, gdy istnieje rzeczywista budowa. Dekodowanie ma ograniczoną współbieżność; pełna bieżąca scena pozostaje warunkiem odsłonięcia gry.
- Menu powstaje po wczytaniu katalogu aktualnych grafik, bez wcześniejszego żądania zastąpionych obrazów. Nowa scena nie pobiera nieużywanego starego wiatraka ani zbędnej kopii referencyjnego PNG.
- Galeria zachowuje wszystkie 200 wariantów i dołącza obrazy przy zbliżaniu się do widocznego obszaru.
- Woda używa przygotowanych raz masek `Path2D` i rysowania bezpośredniego zamiast pełnoekranowych operacji mieszania oraz kopiowania pośredniego canvasa. Źródło animacji, parametry fal, brzegi, chronione obiekty i ustawienia ruchu pozostają zachowane. Pięć testów jednostkowych wody i 13 sektorów testu wybrzeża PASS. Porównanie rastra wykazuje drobne różnice antyaliasingu przy skalowaniu, z niezmienioną alfą; nie deklarujemy identyczności bajtowej wody. To odrębne od ścisłej zgodności RGBA wszystkich 200 grafik budynków.

Pierwszy wariant wszystkich 20 rodzin zajmuje **2 075 264 bajty plików / 6 586 756 bajtów RGBA**, wobec **28 851 038 / 125 822 076** dla pełnych 20 atlasów. To porównanie samych grafik budynków pierwszego etapu; rzeczywisty transfer całego roboczego kandydata opisano poniżej.

Oryginalne 22 WebP pozostają niezmienione i dostępne dla starszego kodu. Pełny pakiet obejmuje dodatkowo 200 pochodnych grafik, więc cały artefakt wdrożeniowy rośnie, chociaż bieżąca gra pobiera mniejszy podzbiór. Lista pozostaje jawna i zamknięta: **455 plików, limit 512 wpisów i 128 MiB**. Nie używamy dowolnego globu ani nie wyłączamy rygorystycznej weryfikacji archiwum.

## Lokalny pomiar przed i po

Powtórzono izolowany pomiar tym samym narzędziem i rzeczywistymi obrazami, z pustą pamięcią podręczną. Roboczy kandydat pobrał **12 749 925 bajtów / 25 adresów obrazów**, czyli o **75,8% mniej bajtów obrazów** niż poprzednia wersja. Nie było błędów JavaScript ani żądań do prawdziwych kont.

| Pomiar | Przed | Po |
| --- | ---: | ---: |
| Start desktop 1440×900 | 3,60 s | 2,46 s |
| Start telefon 390×844, 2× | 2,98 s | 1,68 s |
| Renderer RSS desktop | 748 MB | 553 MB |
| Renderer RSS telefon | 717 MB | 516 MB |

Próba wody z wymuszonym odczytem pikseli, 40 iteracji dla każdej skali, obniżyła koszt pełnego rozmiaru z 20,63 do 13,19 ms na klatkę. To lokalny mikrobenchmark, a nie deklaracja FPS u użytkownika. Pomiary pochodzą z roboczego drzewa przed zamrożeniem końcowego źródła i cache; nie zastępują jego CI, odbioru publikacji ani późniejszego testu poprawki warstw.

## Zakład skórzany — kolejność warstw

Analityczna kontrola dokładnych pikseli alfa wykazała, że grunt Kamieniołomu na wysokości 486 dawał mu `z-index:972`, a grunt Zakładu skórzanego na wysokości 481 — `z-index:962`. Kamieniołom zasłaniał około 44% nieprzezroczystych pikseli pierwszego wariantu domku; dla 100 kombinacji wariantów obu budynków było to 42,6–57,5%.

Manifest otrzymuje wyłącznie `buildings.leatherworks.paintDepth=500`, co daje Zakładowi skórzanemu `z-index:1000`. Normalizer ściśle sprawdza tę wartość. Pozycje, skala, kotwice, kadry, obwiednie alfa i hotspot pozostają bez zmiany. Wcześniejszy dowód identyczności metadanych dotyczył etapu przed tą poprawką; bieżące wyjątki to dodane `sprites` i ten jeden porządek rysowania. Analityczny wynik obejmuje wszystkie 100 kombinacji; końcowy test rzeczywistego UI cache18 potwierdził kolejność Zakład/Kamieniołom 1000/972. Łącznie kierunkowe testy Node: **26/26 PASS** — 21 grafiki budynków i 5 wody.

## Lokalny odbiór zamrożonego cache18

Na dokładnym kodzie `bf2f4ac12c1ef1cd69adb8c3e572649fdc975190` wszystkie cztery końcowe programy przeglądarkowe przeszły: wydajność z prawdziwymi obrazami (4 przypadki), pełny runtime budynków (200 obwiedni alfa, 160 przypadków geometrii żurawi i 4 kontrole negatywne), bramka startu (26 przypadków) oraz zaakceptowany front w szerokościach 1672/1440/390/320. Nie było błędów JS ani operacji na prawdziwych kontach. Rzeczywisty start pobrał 12 749 925 bajtów, nie pobrał pełnych atlasów ani starych grafik gospodarstwa, portu i wiatraka; niezmieniony tick nie żądał kolejnych obrazów. Sprawdzono także niezależność od błędu przyszłego nieużywanego wariantu oraz blokadę i retry błędu bieżącego kadru i aktywnego żurawia.

Nowy dowód zgodności potwierdził 22 niezmienione oryginalne WebP oraz zgodność wcześniejszych pól manifestu po odjęciu wyłącznie `sprites` i `leatherworks.paintDepth=500`. Ponowna kontrola wszystkich 200 pochodnych kadrów RGBA PASS. Końcowe QA cache18 nie powtarzało benchmarku czasu; wcześniejsze izolowane porównanie czasów pozostaje osobnym pomiarem roboczego kandydata.

Pierwszy pełny lokalny frontend Node zakończył się wynikiem **1500/1501 PASS**: niezmieniony test długiego nadrabiania 96 godzin przekroczył limit subprocessu 10 000 ms podczas równoległych zestawów. Ten sam przypadek uruchomiony osobno przeszedł w **9335,864 ms**, z zachowanym oryginalnym limitem. Nie oznaczamy z tego powodu całego lokalnego zestawu jako PASS. Backend: **170/170 PASS**. Własny pełny CI dokładnego źródła publikacji nadal jest wymagany.

Odczyt kontrolny obecnego PRE-PROD przed nową publikacją potwierdził 3 logowania, 3 istniejące wyspy, generacje 2/2/2 i izolację dostępu; nie zapisywał wysp. To punkt odniesienia do porównania po wdrożeniu, a nie dowód nowej promocji lub zachowania danych po niej.

## Paczka gotowa do własnego CI publikacji

Artefakty odświeżono z dokładnego kodu `bf2f4ac12c1ef1cd69adb8c3e572649fdc975190`. Master ma 158 kart, w tym 58 bieżących i 62 568 bieżących wierszy, 120 odcisków źródeł i 200 wierszy wyglądów budynków; budowa i świeża walidacja PASS. Redakcyjny Excel zachowuje 6 kart, 413 wierszy, kolumny ABC i pustą C, ze 105 odciskami źródeł; budowa i walidacja PASS. Sprawdzono także zachowanie archiwum i świeże rzeczywiste symulacje 24/24/72 h. Wszystkie 14 tabel gospodarki jest identyczne z poprzednim źródłem.

Katalog 55 minigier oraz 55 DOCX i 55 TXT przeszedł wszystkie pięć kroków eksportu, budowy i kontroli. Semantyka gier i instrukcji pozostała identyczna; zmieniła się proweniencja dokładnego źródła. Paczka jest gotowa do commita publikacji i jego własnego CI. Nie wymaga dopisywania przyszłego SHA do jego własnego drzewa; opublikowany SHA i rzeczywiste wyniki przebiegów zostaną zapisane po ich powstaniu.

[Zbiorczy lokalny odbiór](CHROME-PERFORMANCE-LOCAL-ACCEPTANCE.json). To dowód lokalnej gotowości, nie udanego CI lub nowej promocji PRE-PROD.

## Odbiór i granice

Przed publikacją wymagane są: niezależny pomiar przed/po tym samym narzędziem, kontrola liczby i bajtów rzeczywistych żądań, zachowanie wyglądu i animacji, testy bramki startu oraz uszkodzonych wymaganych zasobów, przejścia wariantów i budowy, pełne CI dokładnego końcowego SHA, Pages i niezmienny tag DEV. PRE-PROD wymaga następnie standardowego `google-cloud-dev.yml`, potwierdzenia opublikowanych plików, istniejącej zalogowanej wyspy, izolacji kont, oryginalnych artefaktów i receipt.

Konta, hasła, UID, generacje, zapisy i zasady gospodarki pozostają zachowane. Poprawka nie resetuje postępu, nie zmienia zaakceptowanych grafik i nie publikuje PROD ani DNS. Ręczny odbiór użytkownika: **NOT_RUN**. Poprzednie odebrane DEV/PRE-PROD 0.15.2.0 i ich tagi pozostają historycznym punktem odniesienia.

[Dowody i bieżący status](CHROME-PERFORMANCE-EVIDENCE.json) · [Odebrane wcześniejsze wydanie](BUILDING-UPGRADE-ART-PREPROD-ACCEPTANCE.json).
