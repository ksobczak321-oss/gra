# Backlog HARBORLIGHT

Stan: 2026-10-21. Zadania są podzielone według istniejących milestone’ów [frontend #3](https://github.com/ksobczak321-oss/gra/milestone/3) i [backend #4](https://github.com/ksobczak321-oss/gra/milestone/4). Utworzono i potwierdzono osiem GitHub Issues z przypisaniem do milestone’ów. Identyfikatory FE/BE porządkują dokumentację; numery i linki rzeczywistych zgłoszeń są podane przy zadaniach.

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

Status: implementacja lokalna, test dziewięciu grup ruchu i końcowe regresje zaliczone; publikacja w toku. Zakres doprecyzowany przez użytkownika do frontendu i grafiki. GitHub Issue: [#10](https://github.com/ksobczak321-oss/gra/issues/10). Szczegóły: [animacje świata](WORLD-ANIMATION.md).

Kryteria odbioru:

- Wiatrak ma obracające się łopaty, bez drugiego nieruchomego wirnika pod spodem.
- Dym unosi się z kominów; mewy latają, a chmury przesuwają się nad dalekim planem.
- Woda płynie w wodospadach, a fale są widoczne na morzu i nie przesuwają lądu.
- Mieszkańcy chodzą po ścieżkach; zwierzęta poruszają się w obrębie farmy.
- Plac budowy sprawia wrażenie pracy: dźwig, lina lub hak poruszają się przy budowie.
- Pauza, tempo i ograniczenie ruchu sterują animacjami; niewidoczna karta nie zużywa zasobów na aktywną animację.
- Efekty zachowują styl zaakceptowanego obrazu, nie zasłaniają HUD ani kontrolek i są sprawdzone na komputerze oraz telefonie.

FE-02 nadal obejmuje pełne rozdzielenie assetów świata. Integrację lokalnego zapisu z API, obsługę braku połączenia i konfliktu wersji należy zaplanować oddzielnie po BE-01 i BE-03; zakres backendu nie wchodzi do obecnej iteracji animacji.

## Backend

### BE-01 — Kontrakt API i model postępu gracza

Status: zaplanowane; backend nie jest jeszcze zaimplementowany. GitHub Issue: [#11](https://github.com/ksobczak321-oss/gra/issues/11).

Zakres: opisać kontrakt przed wyborem technologii. Obecne `version: 1` jest punktem wyjścia, nie gotowym modelem serwerowym.

Kryteria odbioru:

- Udokumentowane są odczyt stanu, komendy gry, wyniki ekspedycji i odbiór nagród.
- Model obejmuje zasoby, budynki, przydziały, cel latarni, zadania, ekspedycje i wersję stanu.
- Kontrakt określa format błędów, walidację, idempotencję komend i obsługę konfliktu wersji.
- Są przykłady poprawnych i odrzuconych żądań oraz plan migracji zapisów.

### BE-02 — Tożsamość gracza i bezpieczne sesje

Status: zaplanowane. Zależność: BE-01. GitHub Issue: [#12](https://github.com/ksobczak321-oss/gra/issues/12).

Kryteria odbioru:

- Ustalony jest przepływ gry gościa i przejścia do trwałego konta bez utraty wyspy.
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
- Walidowane są przejścia planszy, zużycie narzędzi i liczba skrzyń; sam komunikat klienta „ukończono” nie wystarcza do wypłaty.
- Testy obejmują ujemne ilości, nieprawidłowe liczby, duplikaty komend, wyścigi dwóch sesji i wielokrotny odbiór nagrody.
- Istnieją testy integracyjne całego przepływu ekspedycja → nagroda → ulepszenie oraz diagnostyka błędów bez danych wrażliwych.

## Aktualizowanie planu

Po utworzeniu zgłoszenia dopisujemy jego URL, numer i faktyczny milestone. Przy zamykaniu zadania dodajemy commit, wynik testów i wynik publikacji do [dziennika](IMPLEMENTATION-LOG.md). Backend nie powinien opóźniać sprawdzenia użyteczności obecnego prototypu.
