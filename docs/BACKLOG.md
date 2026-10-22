# Backlog HARBORLIGHT

Stan: 2026-10-22. Zadania są podzielone według istniejących milestone’ów [frontend #3](https://github.com/ksobczak321-oss/gra/milestone/3) i [backend #4](https://github.com/ksobczak321-oss/gra/milestone/4). Utworzono i potwierdzono czternaście GitHub Issues FE/BE z przypisaniem do milestone’ów. Identyfikatory FE/BE porządkują dokumentację; numery i linki rzeczywistych zgłoszeń są podane przy zadaniach.

Utrzymujemy spokojną rozbudowę wyspy i pętlę ekspedycja → zasoby → osada. Zachowujemy zaakceptowany kierunek wizualny. Backend nie jest wymagany do uruchomienia obecnego statycznego prototypu.

## Frontend

### FE-01 — Interaktywna wyspa na zaakceptowanym ekranie

Status: zrealizowane, sprawdzone lokalnie i na publicznej piaskownicy; zgłoszenie zamknięte jako completed. Milestone: frontend #3. GitHub Issue: [#7](https://github.com/ksobczak321-oss/gra/issues/7).

Zakres: menu, HUD, dzielnice, budynki, produkcja, mieszkańcy, handel, zadania, cel latarni, ekspedycje i zapis przeglądarkowy. Implementacja w plikach `harborlight-v1-play.*` i `harborlight-v1-state.js`.

Kryteria odbioru:

- Widoczne główne kontrolki prowadzą do działających paneli lub operacji; koszty i nagrody wpływają na jeden stan gry.
- Gracz odbiera produkcję, ulepsza budynek, rozwiązuje ekspedycję i naprawia latarnię.
- Odświeżenie zachowuje postęp; odebrane nagrody nie są przyznawane drugi raz.
- Reguły gospodarki mają testy, a cały przebieg jest sprawdzony w przeglądarce na komputerze i telefonie.
- Zapisany jest wynik publikacji GitHub Pages oraz aktualny link podglądu.

### FE-02 — Niezależne warstwy świata i stany budynków

Status: zaplanowane. Zależność: FE-01. GitHub Issue: [#8](https://github.com/ksobczak321-oss/gra/issues/8).

Zakres: zastąpienie wycinków wspólnego obrazu osobnymi assetami terenu, dróg, roślinności i budynków zgodnie z [specyfikacją v1](HARBORLIGHT-V1-SCREEN-SPEC.md).

Kryteria odbioru:

- Co najmniej sześć dzielnic zachowuje układ i styl zaakceptowanej wyspy.
- Każdy główny budynek ma osobne stany: niedostępny, budowa, aktywny, ulepszony.
- Budowa oraz ulepszenie zmieniają obiekt w świecie bez przemalowania jednego zbiorczego tła.
- Teren i interfejs pozostają oddzielone; porównanie wyglądu jest zapisane w dokumentacji.

### FE-03 — Obsługa dotyku, kamera i dostępność

Status: zaplanowane; dialogi responsywne i etykiety kontrolek są częściowo wdrożone w FE-01. GitHub Issue: [#9](https://github.com/ksobczak321-oss/gra/issues/9).

Kryteria odbioru:

- Na telefonie można wygodnie otworzyć menu, ekspedycję i zarządzanie budynkami bez trafiania w pomniejszone ikony.
- Kamera obsługuje przesuwanie, wheel/pinch zoom i ograniczenia zapobiegające zgubieniu wyspy.
- Stały HUD i dialogi pozostają czytelne przy zmianie orientacji; dialogi nie wychodzą poza ekran.
- Cała główna pętla działa z klawiatury, fokus jest zachowywany, a ograniczenie animacji jest respektowane.

### FE-04 — Żywa wyspa — animacje świata

Status: trzecia iteracja opublikowana w `0816d27`; przegląd wizualny, regresje lokalne i rozszerzony test publicznej strony zaliczone. Zgłoszenie pozostaje otwarte do wizualnej oceny poprawki przez użytkownika; wcześniejsze testy nie wystarczały do odbioru czytelności ruchu i pełnego brzegu. Zakres doprecyzowany przez użytkownika do frontendu i grafiki. GitHub Issue i dowody: [#10](https://github.com/ksobczak321-oss/gra/issues/10#issuecomment-6324387868). Szczegóły: [animacje świata](WORLD-ANIMATION.md).

Kryteria odbioru:

- Wiatrak ma obracające się łopaty, bez drugiego nieruchomego wirnika pod spodem.
- Dym powstaje przy wylocie komina, unosi się, rozszerza i zanika w czytelny sposób; mewy latają, a chmury przesuwają się nad dalekim planem.
- Woda płynie w wodospadach. Fale i przybój obejmują wszystkie widoczne odcinki brzegu, port, wodę pomiędzy pomostami i skały; nie przesuwają lądu ani budowli.
- Wszystkie 24 postacie świata przemieszczają się po ścieżkach bez postojów, o widoczny dystans w ciągu kilku sekund. Zwierzęta chodzą pomiędzy miejscami wypasu i mają ruch podczas postoju.
- Nieruchome postacie, zwierzęta i smugi dymu z tła są zastąpione oczyszczonym obrazem całego świata przed narysowaniem animacji; interfejs zachowuje oryginalną grafikę, a ograniczenia oczyszczonego obrazu są opisane w dokumentacji.
- Plac budowy sprawia wrażenie pracy: dźwig, lina lub hak poruszają się przy budowie.
- Pauza, tempo i ograniczenie ruchu sterują animacjami; niewidoczna karta nie zużywa zasobów na aktywną animację.
- Efekty zachowują styl zaakceptowanego obrazu, nie zasłaniają HUD ani kontrolek i są sprawdzone na komputerze oraz telefonie.
- Test potwierdza przemieszczenie aktorów i pokrycie nazwanych stref brzegu, nie tylko zmianę dowolnych pikseli w wybranych fragmentach sceny.

FE-02 nadal obejmuje pełne rozdzielenie assetów świata. Integrację lokalnego zapisu z API, obsługę braku połączenia i konfliktu wersji należy zaplanować oddzielnie po BE-01 i BE-03; zakres backendu nie wchodzi do obecnej iteracji animacji.

### FE-05 — Poziom ratusza, szczęście i populacja

Status: zrealizowane, sprawdzone lokalnie i na publicznym Pages; zgłoszenie zamknięte jako completed. Milestone: frontend #3. GitHub Issue i dowody: [#15](https://github.com/ksobczak321-oss/gra/issues/15#issuecomment-6324709772).

Zakres: górny pasek HTML pokazuje poziom, szczęście, mieszkańców i wszystkie zasoby; panel mieszkańców wyjaśnia zmianę populacji. Reguły, przykłady i migracja zapisu są opisane w [instrukcji prototypu](INTERACTIVE-ISLAND.md).

Kryteria odbioru:

- Nowa wyspa zaczyna na poziomie 1, ze szczęściem 0%, 12 mieszkańcami i po 100 sztuk każdego z pięciu zasobów. Istniejący zapis zachowuje postęp.
- Poziom jest poziomem ratusza, a teoretyczny limit mieszkańców wynosi `24 × poziom`. Rozbudowa domu nie dodaje natychmiast nowych mieszkańców; jego miejsca mieszkalne doprecyzowano w FE-06.
- Szczęście mieści się w zakresie −100%…+100%. Przy 0% populacja się nie zmienia; przy ±50% zmienia się o osobę co 6 godzin, a przy ±100% co godzinę.
- Przyjęta interpolacja tempa daje zmianę co 12 godzin przy ±25% i co około 1 godzinę 43 minuty przy ±75%. Kierunek zmiany zależy od znaku.
- Populacja nie spada poniżej 6 i nie przekracza limitu ratusza. Po ubytku pracownicy nie przekraczają liczby mieszkańców; wyspa pozostaje grywalna.
- Liczony jest rzeczywisty aktywny czas, niezależnie od przyspieszenia; pauza zatrzymuje naliczanie. Nie ma naliczania poza grą. Zapis zachowuje niepełny postęp, ale 0%, odwrócenie znaku i osiągnięcie granicy nie pozwalają gromadzić zmian na później.
- Górny pasek i panel mieszkańców są czytelne oraz działają na komputerze i telefonie. Testy obejmują granice, progi czasu, zapis, migrację i regresję dotychczasowych akcji.

### FE-06 — Rozbudowa zależna od ratusza, mieszkania i przeludnienie

Status: zrealizowane, sprawdzone lokalnie i na publicznym Pages; zgłoszenie zamknięte jako completed. Milestone: frontend #3. GitHub Issue i dowody: [#16](https://github.com/ksobczak321-oss/gra/issues/16#issuecomment-6335468633).

Zakres: ratusz ogranicza poziom rozbudowy pozostałych budynków, a dom wyznacza rzeczywistą liczbę miejsc mieszkalnych. Brak miejsc stopniowo obniża szczęście; gracz widzi osobno limit osady, mieszkania i liczbę osób bez miejsca.

Kryteria odbioru:

- Pozostałe budynki nie mogą być rozbudowywane powyżej poziomu ratusza, w ramach bieżącego maksimum 100 (rozszerzenie w FE-07). Blokada wyjaśnia wymagany poziom i nie wydaje zasobów; sam ratusz można podnosić do następnego poziomu.
- Teoretyczny limit populacji wynosi `24 × poziom ratusza`, a miejsca mieszkalne `24 × poziom domu`. Rozbudowa jednego nie podnosi drugiego i nie dodaje ludzi natychmiast.
- Ratusz 4, dom 3 i 78 osób oznaczają limit 96, 72 miejsca i 6 osób bez miejsca. Populacja może przekroczyć miejsca mieszkalne, ale nie limit ratusza.
- Każda osoba bez miejsca obniża szczęście o 1 punkt procentowy na godzinę aktywnej gry. Dla stałego przeludnienia 6 osób spadek wynosi 6 punktów na godzinę. Część ułamkowa jest zachowywana w zapisie.
- Rozbudowa domu do wystarczającej pojemności zatrzymuje dalszą karę, bez automatycznego zwracania utraconego szczęścia. Zmieniająca się populacja zmienia tempo kary.
- Kara respektuje pauzę, widoczność karty i rzeczywisty aktywny czas niezależnie od tempa 1×/2×/4×. Dotychczasowy przelicznik narodzin i ubytku oraz minimum 6 pozostają aktualne.
- Nowy start ma ratusz 1 i dom 1. Migracja zapisów 1/2 zachowuje zasoby i osiągnięte poziomy: ratusz otrzymuje co najmniej najwyższy posiadany poziom budynku. Schemat 3 waliduje dalszą zgodność poziomów i zapisuje ułamkowe szczęście.
- Latarnia po pierwszej naprawie do poziomu 1 może być dalej rozbudowywana do poziomu ratusza; zapis nie cofa naprawionej latarni do poziomu 1.
- Testy obejmują blokady i koszty, odblokowanie po ratuszu, osobne pojemności, naliczanie i zatrzymanie kary, zapis, migrację, działające panele oraz regresję rozgrywki na komputerze i telefonie.

### FE-07 — Pracownicy, podatki i fizyczny transport

Status: zrealizowane, sprawdzone lokalnie i na publicznym Pages; zgłoszenie zamknięte jako completed. Milestone frontend #3. GitHub Issue: [#17](https://github.com/ksobczak321-oss/gra/issues/17).

- Dokładnie osiem miejsc pracy, limit połowy faktycznej populacji i wspólna pula; ratusz, dom, kaplica i latarnia bez załogi.
- Sześciu zatrudnionych na starcie, targ od 2 i przystań od 4; minimum populacji 6 oraz przykład ratusza 6 bez ograniczenia dawnego maksimum 5.
- Podatek 1/os./aktywną godzinę, bez automatycznej produkcji monet; zwolnieni wracają 5 minut i nie mogą ponownie pracować w tym czasie.
- Produkcja 10/os./h, osobne niełączone fazy, utrata niedokończonej sztuki; młyn i tartak 2:1.
- Lokalne składy 200 × ratusz; przewóz 60/os./h, zapisane priorytety i centralne limity 1000/4000 × 1,5^(poziom−1), monety poza objętością.
- Centralne koszty bez ręcznego obejścia logistyki; bezstratna migracja zapasów i wcześniejszych gotowych monet.
- Zapis schematu 6, testy jednostkowe i przeglądarkowe; pełne reguły w [instrukcji](ECONOMY-RULES.md).

### FE-08 — Szczęście załogi, powiadomienia, targ i kaplica

Status: zrealizowane, sprawdzone lokalnie i na publicznym Pages; zgłoszenie zamknięte jako completed. Milestone frontend #3. GitHub Issue: [#18](https://github.com/ksobczak321-oss/gra/issues/18).

- Pełny skład zatrzymuje produkcję; −10 szczęścia jego załogi i kolejne −10/24 h do −50, z resetem po opróżnieniu. Średnia szczęścia obejmuje całą populację.
- Powiadomienie przy każdym ponownym zapełnieniu, przeczytanie i stan zachowane w zapisie.
- Targ: dwie grupy towarów, 10% marży, bez monet, dostawy 60/os./h, godzina blokady od przybycia, odbiór magazynierów; pojemność 1000,1500,2250…
- Kaplica: bez pasywnego efektu poziomu 1; ukończenie rozbudowy daje +10 × poziom i podatki ×2/10 h. Ręcznie +50 wszystkich zasobów i +20 szczęścia/1 h, liczba jednorazowych użyć = poziom.
- Lokalna seria kolejnych dni do 10 bez wymyślania nagrody; docelowe logowanie pozostaje backendem.

### FE-09 — Rozbudowa, kolejka, uprawnienia pakietu i latarnia

Status: zrealizowane, sprawdzone lokalnie i na publicznym Pages; zgłoszenie zamknięte jako completed. Milestone frontend #3. GitHub Issue: [#19](https://github.com/ksobczak321-oss/gra/issues/19).

- Zaakceptowane koszty producentów 72 drewna +72 kamienia +120 produktu, razy obecny poziom; sumowanie powtórzonego produktu. Główne budynki 500 każdego zasobu wraz z monetami × obecny poziom.
- Rezerwacja całego kosztu przy zwykłym zleceniu, przewóz istniejącą załogą magazynu i następnie równie długa budowa. Poziom dopiero po zakończeniu.
- Ratusz L: L aktywnych i L opłaconych miejsc kolejki, automatyczne przejście i kolejne poziomy tego samego budynku bez równoległego budowania dwóch jego poziomów.
- Lokalny model pakietu: +4 aktywne, kolejka bez limitu, plany z estymat dostaw. Wygasanie kalendarzowe; rozpoczęte kończą się, opłacone czekają na normalny limit, nieopłacone zachowane i wstrzymane. Sprzedaż nie jest uruchomiona.
- Latarnia: 500 każdego zasobu ze złotem, transport T + budowa 2T; +100 szczęścia i produkcja pięciu materiałów ×2 przez 24 h × osiągnięty poziom. Podatki bez zmiany. Użytkownik zaakceptował minimum około 35 h zbierania od startu.
- Panel ratusza: poziom, obecni/limit, podatki/h, bez przydziału i odbioru. Bezpośrednie „Ulepsz”; magazynowe posiadane/wymagane w czerwieni/zieleni. Scenę zachowujemy.

## Backend

### BE-01 — Kontrakt API i model postępu gracza

Status: zaplanowane; backend nie jest jeszcze zaimplementowany. GitHub Issue: [#11](https://github.com/ksobczak321-oss/gra/issues/11).

Zakres: opisać kontrakt przed wyborem technologii. Kliencki schemat `version: 6` jest punktem wyjścia, nie gotowym modelem serwerowym.

Kryteria odbioru:

- Udokumentowane są odczyt stanu, komendy gry, wyniki ekspedycji i odbiór nagród.
- Model obejmuje zasoby, budynki, przydziały, cel latarni, zadania, ekspedycje, poziom ratusza, miejsca mieszkalne, przeludnienie, ułamkowe szczęście, postęp populacji, osiem miejsc pracy, limity załóg, ułamek podatku i wersję stanu.
- Kontrakt określa format błędów, walidację, idempotencję komend i obsługę konfliktu wersji.
- Są przykłady poprawnych i odrzuconych żądań oraz plan migracji zapisów.

### BE-02 — Tożsamość gracza i bezpieczne sesje

Status: zaplanowane. Zależność: BE-01. GitHub Issue: [#12](https://github.com/ksobczak321-oss/gra/issues/12).

Kryteria odbioru:

- Ustalony jest przepływ gry gościa i przejścia do trwałego konta bez utraty wyspy.
- Pierwsze utworzenie wyspy po zalogowaniu stosuje start z FE-05/FE-06/FE-07: ratusz 1, dom 1, szczęście 0%, 12 mieszkańców i po 100 każdego zasobu; 6 osób pracuje po jednej w pięciu producentach i magazynie, a 6 pozostaje wolnych. Kolejne logowanie odczytuje postęp zamiast przyznawać start ponownie.
- Użytkownik może odczytać i zmienić wyłącznie własny postęp; testy obejmują próbę dostępu do cudzej wyspy.
- Sesje mają bezpieczne przechowywanie, wygaśnięcie i wylogowanie; sekrety nie trafiają do plików klienta ani logów.
- Udokumentowane są minimalne dane konta i ich usuwanie.

### BE-03 — Trwały zapis i synchronizacja wyspy

Status: zaplanowane. Zależności: BE-01, BE-02. GitHub Issue: [#13](https://github.com/ksobczak321-oss/gra/issues/13).

Kryteria odbioru:

- Stan wyspy jest zapisany trwale i dostępny po nowej sesji lub zmianie urządzenia.
- Aktualizacje mają kontrolę wersji i nie nadpisują po cichu nowszego postępu.
- Powtórzenie tego samego żądania nie wydaje zasobów i nie przyznaje nagrody ponownie.
- Import lokalnego zapisu ma określone zasady walidacji; kopia i odtworzenie danych są sprawdzone testem.

### BE-04 — Serwerowe reguły gospodarki i wyników ekspedycji

Status: zaplanowane. Zależność: BE-01; zapis i autoryzacja wymagają BE-02 i BE-03. GitHub Issue: [#14](https://github.com/ksobczak321-oss/gra/issues/14).

Kryteria odbioru:

- Serwer oblicza koszty, produkcję, upływ czasu oraz nagrody zamiast ufać licznikom klienta.
- Serwer weryfikuje poziom ratusza, zakres szczęścia i zmianę populacji według FE-05; osobno należy ustalić zasady naliczania poza grą przed ich wdrożeniem.
- Serwer sprawdza dokładnie osiem miejsc pracy z FE-07, limit `floor(aktualna populacja / 2)` na budynek oraz wspólną pulę mieszkańców bez podwójnego przydziału. Dom, ratusz, kaplica i latarnia nie zatrudniają załogi.
- Serwer nalicza 1 monetę podatku za osobę przydzieloną do istniejącego miejsca pracy na rzeczywistą aktywną godzinę, z rozliczeniem zmian załogi i zachowaniem ułamka. Bezrobotni nie płacą; brak osobnej automatycznej produkcji monet w porcie, targu i ratuszu. Handel i nagrody pozostają odrębnymi operacjami. Zasady czasu poza grą wymagają osobnego ustalenia.
- Serwer odrzuca rozbudowę ponad poziom ratusza bez wydania zasobów. Wylicza osobno limit populacji i miejsca w domu oraz nalicza karę za przeludnienie z FE-06: 1 punkt procentowy szczęścia na osobę bez miejsca na godzinę, z zachowaniem części ułamkowej i spójnej migracji zapisów.
- Serwer odtwarza indywidualną produkcję, centralny transport i rezerwacje, targ, czasowe premie kaplicy i latarni, średnią szczęścia oraz kolejkę budowy zgodnie z FE-07/08/09 i [aktualnymi regułami](ECONOMY-RULES.md). Uprawnienia pakietu są częścią BE-05.
- Walidowane są przejścia planszy, zużycie narzędzi i liczba skrzyń; sam komunikat klienta „ukończono” nie wystarcza do wypłaty.
- Testy obejmują ujemne ilości, nieprawidłowe liczby, duplikaty komend, wyścigi dwóch sesji i wielokrotny odbiór nagrody.
- Istnieją testy integracyjne całego przepływu ekspedycja → nagroda → ulepszenie oraz diagnostyka błędów bez danych wrażliwych.

### BE-05 — Płatny pakiet i serwerowa walidacja kolejki

Status: zaplanowane, bez implementacji płatności. Milestone backend #4. GitHub Issue: [#20](https://github.com/ksobczak321-oss/gra/issues/20). Cena i warianty długości wymagają przyszłej definicji użytkownika.

- Serwer nadaje datę ważności po zweryfikowanej płatności; klient nie stanowi dowodu zakupu.
- Walidacja limitu L+4, kolejki bez limitu i planów dostaw; atomowa, idempotentna rezerwacja dopiero rzeczywiście dostępnych centralnych materiałów.
- Zależności kolejnych poziomów i ratusza, odporność na powtórzenie komend, konflikt sesji i zmianę zegara klienta.
- Kalendarzowe wygaśnięcie oraz zachowanie już rozpoczętych i opłaconych projektów zgodnie z [regułami](ECONOMY-RULES.md).

## Aktualizowanie planu

Po utworzeniu zgłoszenia dopisujemy jego URL, numer i faktyczny milestone. Przy zamykaniu zadania dodajemy commit, wynik testów i wynik publikacji do [dziennika](IMPLEMENTATION-LOG.md). Backend nie powinien opóźniać sprawdzenia użyteczności obecnego prototypu.
