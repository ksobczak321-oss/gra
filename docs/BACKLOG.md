# Backlog HARBORLIGHT — frontend v17

Bieżący zakres określają [dziewięć wymagań v17](FRONTEND-V17-REQUIREMENTS.md) i [reguły gospodarki](ECONOMY-RULES.md), z zachowaniem wcześniejszych zasad samouczka oraz ekonomii. Końcowe wyniki modelu i przeglądarki, wysłanie kodu oraz publiczny odbiór zapisuje [dziennik](IMPLEMENTATION-LOG.md); wyniki dawnych wydań nie potwierdzają tego pakietu.

## Bieżąca iteracja v17

- Wyrównane górne krawędzie kolumn budynków, wszystkie karty trójek dopasowane bez suwaków i dolne przyciski menu wewnątrz ramki.
- Wybór kulek albo trójek przy rozpoczęciu oraz przed kolejną rundą; zapisany typ jest domyślny przy kontynuacji. Parametry, czas, pula i zgodność rozpoczętych starszych serii pozostają zachowane.
- Wyraźny popup po wycofaniu tragarzy i natychmiastowa informacja w liczniku, np. `5 (−2)`. Osoba z ładunkiem nadal kończy dostawę i dopiero po pięciominutowym powrocie do domu jest wolna.
- Smutna buźka nad producentem objętym aktywną karą za przestój, usuwana po ustaniu kary.
- Ustawienia bez logowania, ekran minigry bez strzałki powrotu i przycisk „Obejrzyj reklamę” pod wyjściem w obu grach. Jego ekran informacyjny nie przyznaje czasu ani nagrody; zasady i integracja pozostają do ustalenia.
- Uwaga o miniaturze Portu została wycofana przez użytkownika jako stary zrzut. Nie jest poprawką tego pakietu.

[Excel 10](arkusze/HARBORLIGHT10-zasady.xlsx) i [manifest v10](decisions-v10.json) pozostają archiwum v16, w tym dawnego losowania minigier. Nie generujemy nowego arkusza i nie zmieniamy plików 7–10. Aktualny opis wyboru gry i interfejsu jest w wymaganiach oraz dokumentach v17.

## Kierunki przyszłe

Prowadzenie Facebooka z zatwierdzaniem postów i komentarzy, kody promocyjne, logo na koszulkę oraz planszowe 2–4 osoby i AR były omawiane jako przyszłość. Plan infrastruktury i kosztów nie oznacza zakupu usług ani uruchomienia backendu. Nagrody reklamowe, kwoty lojalności, prawdziwe konta, płatności, reklamy, publikacja i serwerowa weryfikacja nadal wymagają osobnych ustaleń lub integracji.

Nowego numeru zgłoszenia nie przypisujemy bez jego rzeczywistego utworzenia. Milestone’y zachowują identyfikatory [frontend #3](https://github.com/ksobczak321-oss/gra/milestone/3) i [backend #4](https://github.com/ksobczak321-oss/gra/milestone/4).

## Historia: wydanie v16 / Excel 10

Wydanie v16 zachowało 25 kolejnych lekcji bez pięciodniowej blokady, automatyczne otwieranie do ukończenia lub rezygnacji, skrzynie po 100–300 każdego z pięciu materiałów oraz jednorazowe Share ×2. Dwie nowe minigry były wówczas losowane co rundę; v17 zastępuje tę część wyborem gracza. Excel 10 z krótkimi regułami i kalkulatorem pozostaje archiwum tej wersji, a pozostałe zasady v16 są nadal obowiązujące, o ile wymagania v17 ich nie zmieniają.

## Historia: wydanie V9 / frontend v13

Historyczny zakres: **58 decyzji V9, 19 uwag frontendu oraz uproszczony Excel 9**, wydanie frontend-v13. Implementacja i odbiór lokalny zakończone: 388/388 testów modelu PASS, pięć zestawów przeglądarkowych i przegląd wizualny zaliczone. Commit 8025f3d i udane Pages 40012462614 potwierdzają publikację; publiczne sumy kontrolne gry i Excela są zgodne. Końcowy odbiór rzeczywistego Pages: trzy zestawy PASS; dowody zapisuje dziennik. Milestone’y: [frontend #3](https://github.com/ksobczak321-oss/gra/milestone/3), [backend #4](https://github.com/ksobczak321-oss/gra/milestone/4).

### Historyczny zakres iteracji V9

- [Manifest 58+19](decisions-v9.json) jest kompletem uzgodnień, a [macierz odbioru](FRONTEND-REVIEW.md) pokazuje wymagania końcowe. Nie otwieramy ponownie rozstrzygniętych zasad.
- Model: nowe liczniki potrzeb, premie i odbiorcy, realny T i rezerwacje, anulowanie, Food, pełne zakupy i dowóz Premium, potwierdzanie zadań, seria ekspedycji, kalendarz, samouczek i potwierdzone zdarzenia przyszłych integracji.
- UI: usunięty lewy pasek, nowy nagłówek, 12 uporządkowanych budynków i pięć zasobów z przewozami, EN/PL, filtry powiadomień, zwarte efekty, bezpieczne potwierdzenia i ciągłe animacje.
- Arkusz: cztery widoczne zakładki, każda mechanika do trzech zdań, tylko pięć prawdziwych tematów przyszłych. Całe 45 zakładek źródła i 48 komentarzy pozostaje ukrytym archiwum; pliki 7 i 8 bez zmian.
- Kwoty samouczka oraz krzywa czasu minigier są jawnie projektowe. Kwoty lojalnościowe nadal nieustalone; brak rzeczywistych integracji kont, płatności, reklam, publikacji i kont poleconych.

Nowy numer zadania GitHub dopisujemy dopiero po faktycznym utworzeniu. Historyczne zgłoszenia poniżej zachowują własny zakres i dowody, a backend pozostaje odrębny.

## Historyczne wydania v12 i wcześniejsze

### FE-17 — atrakcje, ścieżki, efekty i Excel 8 — [#27](https://github.com/ksobczak321-oss/gra/issues/27)

Status: completed — cały pakiet wdrożony i publicznie sprawdzony; 270/270 testów modelu, 14/14 lokalnych zestawów Chromium oraz 3 ponowione zestawy na Pages. Excel 8 pobrany i porównany z zatwierdzonym plikiem. Workflow `39945595611`: success. Zgłoszenie [#27](https://github.com/ksobczak321-oss/gra/issues/27), milestone frontend #3. [Aktualna macierz odbioru](FRONTEND-REVIEW.md) oddziela nowy pakiet od historycznego v11.

- Mniejszy Level po lewej, Storage i Workers po prawej z podpisami poszczególnych wartości. Podatki są usunięte ze wszystkich widoków, bez zmiany naliczania przez silnik.
- Pięć kart Resources zachowuje górną aktywną obsadę, a pod ilustracją pokazuje lokalny zapas produktu / jego zapas centralny. Przy budowie osobne Transport · ETA i Construction · ETA.
- Ukończenie zadania: popup z fajerwerkami, wibracja na wspieranym telefonie, Share on Facebook albo Skip. Osobno zatwierdzono 500 lokalnych monet za kliknięcie Share, raz na ukończenie; brak integracji i publikacji posta.
- Decorations: pięć kart na dolnym pasku z puli 20, rotacja co 24 h; Y 5…100, cena Y × ratusz, Y pp dla L osób przez 6 h. Osobne przyzwyczajenie 100/75/50/25/0%, reset po 24 h bez zakupu, trwałe zegary i offline.
- Paths: 100 odcinków poziomu 0…5, 100 kamienia za jeden krok, wszystkie na poprzednim poziomie przed kolejnym; premia dopiero po pełnych 100. Szybkość +10…50%, ładowność od poziomu 3 +10…30%; zakres obejmuje tragarzy, nie produkcję, dojście ani rejs.
- Construction jest dodatkowym priorytetem obok materiałów, w tym samym limicie trzech i tym samym powtarzanym podziale kursów.
- Wszystkie aktywne premie i kary na górze Town Hall; start, istotna zmiana i koniec w Notifications, bez wpisu na każdą sekundę.
- Oddzielny profil ?profile=new-player z normalnym startem, bez testowego doładowania i bez usuwania istniejącego zapisu. Nowy Excel 8 obejmuje wszystkie bieżące ustalenia; Excel 7 pozostaje nienaruszony.

## Wcześniejsze ukończone wydania

### FE-16 — Spójne panele, priorytety i jedno aktywne zadanie — [#26](https://github.com/ksobczak321-oss/gra/issues/26)

Status: completed — pełny zestaw obu serii uwag ze screenów i komentarzy wdrożony jako frontend-v11. Milestone frontend. Zaliczone 225/225 testów modelu, 12/12 lokalnych zestawów Chromium i 3 zestawy na rzeczywistym publicznym adresie. [Macierz odbioru](FRONTEND-REVIEW.md) obejmuje wcześniejsze i najnowsze wymagania; commit `43348df`, udane wdrożenie Pages `39936929230`.

- Wspólny górny status każdego budynku; u producentów rodzaj i liczba najbliższych sztuk oraz czas odłożenia do lokalnego magazynu.
- Storage: obecny zapas / pojemność teraz / po ulepszeniu, ze składami `200 × własny poziom producenta`.
- Workers: przypisani / wolni w domu / limit `12 × własny poziom budynku`; podatki tego budynku/h i dotychczasowe małe −/+.
- House: populacja, limit ratusza, miejsca do spania i tempo demografii. Housing capacity i House happiness chowają opisy pod „i”.
- Construction and queue i jej licznik tylko w ratuszu. Manage all workers otwierane tylko z domu; Residents pozostaje przeglądem informacyjnym, a małe −/+ przy budynkach nadal działają.
- U wszystkich pięciu producentów Building upgrade łączy Upgrade, dwie małe osobne estymaty Delivery time / Building time i sąsiadującą obramowaną ramkę Premium z dwoma głównymi przyciskami. Opisy Coins/Instant są pod „i” rozbudowy z myszą, klawiaturą i dotykiem; osobna dolna sekcja Premium building options znika z producentów.
- Warehouse: jawny przydział każdego magazyniera, ładunek, źródło → cel, ETA lub oczekiwanie. Do trzech podświetlonych numerowanych priorytetów; powtarzany podział dziesięciu kursów 8/2 losowe, 5/3/2 losowe lub 5/3/2. Wybór pozostaje do zmiany przez gracza.
- Jedno aktywne zadanie naraz; podświetlenie Active oraz dostarczone/wymagane każdego produktu są zgodne na liście i po prawej. Pozostałe karty są wyszarzone i blokują rozpoczęcie oraz wpłaty, ale pozwalają obejrzeć wymagania. Migracja zachowuje stare wpłaty, terminy i mnożniki.
- Zadania zachowują dotychczasową normę wymagań `12 × własny poziom producenta × jego wydajność × godziny`. Dotychczasowa reguła limitu obsady również pozostaje zachowana; zmienia się tylko prezentacja trzech liczb.
- Naprawa nieruchomej wody i dymu: systemowe ograniczenie ruchu nadpisywało nawet świadomie włączoną opcję w grze. Jawny wybór Animations and highlights ma teraz pierwszeństwo i jest zapisywany; domyślnie nadal respektujemy ustawienie systemu. Test motion-v10 potwierdził ruch pikseli wody/dymu, zapis, wyłączenie/włączenie, ukrycie/powrót i ignorowanie dawnych flag pause/speed.
- Jednorazowe uzupełnienie materiałów centralnych przy następnym wczytaniu do testowania budowy; oba limity magazynu i saldo co najmniej 10 000 monet, bez obniżania większego salda. Bez zmiany poziomów i istniejącego postępu oraz bez powtarzalnego przycisku grantu.
- Poprawa geometrii i warstw nagłówka: marka, Level i początek lewej nawigacji nie nachodzą na siebie, a stary obraz nie przebija spod kontrolek.
- Dolne Resources zastępuje cały pasek Buildings dokładnie pięcioma obrazkowymi kartami produktów: Wood, Planks, Stone, Grain, Food. Nad obrazkiem liczba rzeczywiście pracujących w zakładzie; pod nim wolni mieszkańcy w domu / limit zakładu. Wybór otwiera ten sam panel producenta co budynek na wyspie. Buildings przywraca karty budynków; monety nie są kartą produktu.

FE-16 powyżej jest historycznym zakresem v11: najnowszy FE-17 usuwa podatki z UI i zastępuje dolny licznik wolni/limit przez lokalny/centralny zapas. Poniższe ukończone zakresy FE-14/15 dokumentują jeszcze wcześniejsze wydanie. Bufor zależny od ratusza został zastąpiony własną pojemnością producenta; reguła limitu obsady pozostaje taka sama.

### Formularze konta — [#5](https://github.com/ksobczak321-oss/gra/issues/5)

Tytuł GitHub: **[FE-14] Ekrany logowania/rejestracji bez OAuth**. Milestone frontend. Status: completed — implementacja, testy lokalne, publikacja i publiczny test formularzy zaliczone. Rzeczywiste konta pozostają w BE-02.

- Oddzielna strona Sign in / Create account w stylu wyspy, przełączanie formularza i widoczności hasła, walidacja, komunikaty, klawiatura i układ mobilny.
- Ikony Google i Facebook z uczciwym Coming soon; bez OAuth, żądań do dostawców i pozorowanego konta.
- Formularze nie zapisują haseł ani nie tworzą lokalnego dowodu zalogowania. Brak usługi kont jest komunikowany przy wysłaniu.
- Continue as guest oraz wejście do strony z wyspy; istniejący zapis gracza pozostaje dostępny.
- Test `tests/harborlight-auth-smoke.py` obejmuje formularze, tryby, telefon, klawiaturę i brak integracji zewnętrznej.

### Reguły arkusza 6 + D01–D17 — [#25](https://github.com/ksobczak321-oss/gra/issues/25)

Tytuł GitHub: **[FE-15] reguły arkusza 6 + D01–D17**. Milestone frontend. Status: completed — 189 testów modelu, 10 lokalnych zestawów przeglądarkowych, publikacja i 3 zestawy publicznej wersji zaliczone. Excel 7 dostępny na `main`.

- Schemat 8: realny czas także offline, bez kontroli stop/play/speed; zapis kotwicy rozliczenia i idempotentny powrót.
- Start 12 osób w domu i zero pracowników; limit `12 × własny poziom`, dojście 5 min i podatek od przybycia, pięciominutowy powrót.
- Produkcja 10/12/13/14… na poziomach, transport jednego towaru w kursach 5 min, ładunek 60/66/72… i ochrona rezerwy Food `50 × poziom magazynu`.
- Własne załogi targu i portu, blokada targu 1 h, wygasanie partii 24 h, port 40/50 i 140/150, liniowa historia podwyżek oddzielnie dla każdego towaru.
- Nowe koszty budynków, kolejka +10%, standard 2T, latarnia 5T, kaplica 4T/7T/10T i zatwierdzony koszt kaplicy.
- Osobiste szczęście, przestoje bez +1 pracy i bez kary bezrobocia; limit −50 dotyczy tylko przestoju. Nowe osoby zamrożone na 0% przez 24 h.
- Dzienna pula domu, rozdział reszty po 23 h 58 min i odnowienie co 24 h; punkty nie kasują kar.
- Zwiedzanie 4 h bez wycofania, osobiste 100%/24 h po powrocie, grupowe +10 pp/6 h, miejsca i wejścia 2L oraz trzy płatne pakiety.
- Zadania latarni: trzy karty FIFO, losowe rozmiary po starcie S/M/L, indywidualne dobowe łańcuchy, skalowane nagrody, zapisywany mnożnik reakcji, raty i utrata wpłat po terminie.
- Ekspedycje tylko za monety, pula 50/100/200…, wypłata albo ryzyko całej puli.
- Lokalne wyceny/operacje monetowe: skrócenia z minimum 5 monet, kursy po 10, komplet budynku gotowy po 10 s, pakiet 1000 × ratusz/24 h i wykonalne plany dostaw z dodatkową opłatą 25% wartości braków.
- Płatne błogosławieństwo z 4 h oczekiwania od końca efektu, lokalny wynik rankingu co pełną godzinę i seria dni bez niezdefiniowanej nagrody.
- Dokumentacja, nowy arkusz oraz testy stanu, jedzenia, mieszkańców, logistyki, aktywności, formularzy i paneli. Końcowy wynik, commit i publikację zapisujemy w dzienniku.

W powyższym zakresie nie ma prawdziwych płatności, OAuth, reklam, automatycznego publikowania postów ani wypłat za niezweryfikowane polecenia.

## Zachowany frontend i dalsza grafika

| Zgłoszenie | Zakres | Stan |
| --- | --- | --- |
| [#7](https://github.com/ksobczak321-oss/gra/issues/7) | Interaktywna wyspa, panele, wspólny stan i zapis | Wcześniej completed i opublikowane; reguły uaktualnia #25. |
| [#8](https://github.com/ksobczak321-oss/gra/issues/8) | Osobne assety świata i stany budynków | Zaplanowane: teren, drogi, roślinność i każdy budynek niezależnie, bez zmiany zaakceptowanego układu. |
| [#9](https://github.com/ksobczak321-oss/gra/issues/9) | Dotyk, kamera, dostępność | Częściowo: responsywne panele i klawiatura są; kamera wheel/pinch i pełny odbiór pozostają. |
| [#10](https://github.com/ksobczak321-oss/gra/issues/10) | Żywa wyspa i animacje | Poprzednie iteracje opublikowane; otwarte do oceny wizualnej użytkownika. Bieżąca zmiana zachowuje animacje. |
| [#15](https://github.com/ksobczak321-oss/gra/issues/15) | Ratusz, szczęście i populacja | Wcześniej completed; aktualne reguły czasu i noworodków w #25. |
| [#16](https://github.com/ksobczak321-oss/gra/issues/16) | Limit ratusza, dom i przeludnienie | Wcześniej completed; zachowany rozdział limitu osady i miejsc w domu. |
| [#17](https://github.com/ksobczak321-oss/gra/issues/17) | Ludzie, podatki i transport | Wcześniej completed; aktualne własne limity i kursy 5 min w #25. |
| [#18](https://github.com/ksobczak321-oss/gra/issues/18) | Szczęście załogi, targ, kaplica i powiadomienia | Wcześniej completed; nowe wizyty, terminy i przestoje w #25. |
| [#19](https://github.com/ksobczak321-oss/gra/issues/19) | Budowa, kolejka, model pakietu i latarnia | Wcześniej completed; nowe ceny, 5T i lokalny cennik monetowy w #25. |
| [#21](https://github.com/ksobczak321-oss/gra/issues/21) | Angielski interfejs i pomoc „i” | Wcześniej completed; zachowane. |
| [#22](https://github.com/ksobczak321-oss/gra/issues/22) | Automatyczne żywienie i posiłek | Wcześniej completed; aktualnie offline i rezerwa Food, bez dawnej kary −25/h. |
| [#23](https://github.com/ksobczak321-oss/gra/issues/23) | Kompaktowe panele producentów | Wcześniej completed; zachowane małe −/+ i pomoc. |
| [#24](https://github.com/ksobczak321-oss/gra/issues/24) | Indywidualne szczęście i pełne procenty | Wcześniej completed; #25 dodaje nowe stany i pulę domu. |

Numer i URL GitHub są jednoznacznym identyfikatorem zadania. Kolejne iteracje zachowują osobny zakres i dowody w dzienniku.

Odbiór grafiki nadal wymaga czytelnego ruchu wszystkich postaci, dymu unoszącego się z kominów i zanikającego, obracającego wiatraka, mew, chmur, wodospadów, wszystkich widocznych brzegów, zwierząt i pracującej budowy. Efekty mają zachować styl i nie zasłaniać interfejsu. Testy animacji sprawdzają przesunięcia aktorów i nazwane strefy brzegu, a nie samą zmianę dowolnego piksela. Rendering respektuje ograniczenie ruchu i widoczność karty; gospodarka działa offline niezależnie.

## Backend

### BE-01 — Kontrakt API i model postępu — [#11](https://github.com/ksobczak321-oss/gra/issues/11)

Status: zaplanowane, backend nie jest wdrożony. Kliencki schemat 8 jest materiałem wejściowym, nie modelem zaufanego serwera.

- Jedno API dla web, Android i iPhone: odczyt wyspy, komendy, potwierdzone wyniki, błędy i migracje.
- Pełny stan mieszkańców, zegara, porcji Food, ładunków i rezerwacji, partii targu/portu, wizyt, puli domu, budów, zadań, przebiegów ekspedycji i uprawnień; również ofert atrakcji, przyzwyczajenia, osobistych efektów, 100 odcinków dróg oraz jednorazowych bonusów ukończenia.
- Idempotency keys, kontrola wersji stanu i konfliktów równoległych sesji; przykłady przyjętych i odrzuconych komend.

### BE-02 — Konto i bezpieczne sesje — [#12](https://github.com/ksobczak321-oss/gra/issues/12)

Status: zaplanowane; gotowy frontend formularzy nie jest usługą kont. Zależność: BE-01.

- Gość i przejście do konta bez utraty wyspy, weryfikacja adresu, bezpieczne sesje i wylogowanie.
- Późniejszy OAuth Google/Facebook wymaga konfiguracji dostawców i przepływu serwerowego. Sekrety oraz tokeny uprzywilejowane nie trafiają do statycznego klienta.
- Start tylko raz: 12 osób w domu, 0 pracowników, poziom 1, 0% szczęścia, po 100 sześciu zasobów. Kolejne logowanie odczytuje postęp.
- Dostęp wyłącznie do własnego stanu, minimalizacja i usuwanie danych, testy dostępu do cudzego konta.

### BE-03 — Trwały zapis i synchronizacja — [#13](https://github.com/ksobczak321-oss/gra/issues/13)

Status: zaplanowane. Zależności: BE-01 i BE-02.

- Trwała wyspa dostępna na wszystkich trzech klientach, serwerowa kotwica czasu i identyczne rozliczenie offline.
- Transakcje, wersjonowanie, bezpieczne ponowienia i kontrola konfliktów dwóch urządzeń.
- Zdefiniowany import lokalnego prototypu, kopie zapasowe, sprawdzone odtworzenie i migracje.

### BE-04 — Serwerowe reguły i wyniki — [#14](https://github.com/ksobczak321-oss/gra/issues/14)

Status: zaplanowane; zgłoszenie uaktualnione o bieżące reguły. Backend pozostaje niewdrożony.

- Serwer rozlicza produkcję, offline, jedzenie, szczęście, narodziny/odejścia, podatek, kursy i budowę z własnego zaufanego czasu.
- Waliduje limity pracy `12 × własny poziom budynku`, lokalne składy `200 × własny poziom producenta`, przybycie/powrót 5 min, blokady, zamrożenie nowej osoby przez 24 h, rezerwę Food i ochronę transportu.
- Atomowo liczy koszty, dopłatę kolejki, fizyczne rezerwacje i dostępność pojemności; klient nie może tworzyć materiałów.
- Weryfikuje partię i termin targu/portu, historyczne podwyżki per produkt, wizyty i pakiety wejść, pulę domu, opłaty kaplicy oraz D01–D17.
- Zadania mają serwerowe losowanie, terminy, jedno aktywne zadanie i jednorazowe wypłaty; zachowują zatwierdzoną normę wymagań. Ekspedycje mają potwierdzoną trasę/limit/etap i pulę monet. Sam komunikat „wygrana” z klienta nie wystarcza.
- Rozdział dziesięciu kursów według maksymalnie trzech priorytetów przechowuje numer bloku i losowanie. Ponowienie lub ponowne połączenie nie może zabrać towaru dwa razy ani stale wracać do pierwszego kursu.
- Atrakcje wymagają serwerowego Y/rotacji, niezależnego przyzwyczajenia, odbiorców i końca 6 h; ścieżki walidacji 100 odcinków oraz kolejności poziomów i premii przewozu. Construction dzieli limit i rozkład trzech priorytetów z towarami.
- Bonus 500 po zadaniu musi mieć jednoznaczny identyfikator ukończenia i rozliczenie raz; obecny prototyp daje go za kliknięcie bez potwierdzenia posta, zgodnie z decyzją użytkownika. Docelowe zasady integracji mogą to zastąpić.
- Testy obejmują modyfikację zegara i zapisu, nieprawidłowe liczby, powtórzenia, wyścigi, rozłączenia oraz konserwację zasobów.
- Ranking wielu graczy wymaga serwerowej agregacji i zasad remisów; lokalny wynik ustawień nie jest takim rankingiem.

### BE-05 — Płatności, monety i uprawnienia — [#20](https://github.com/ksobczak321-oss/gra/issues/20)

Status: zaplanowane, zgłoszenie uaktualnione; żadnej prawdziwej sprzedaży nie uruchomiono.

- Serwer przyznaje zakup po zweryfikowanym, podpisanym potwierdzeniu operatora/sklepu; kliencki przycisk i lokalny zapis nie są dowodem płatności. Uwzględnić kanały web, Android i iPhone.
- Jedna waluta, przyjęty przelicznik 1 PLN =10 monet; księga transakcji, idempotencja, reklamacje i zwroty wymagają projektu.
- Pakiet kosztuje 1000 × ratusz/24 h, przedłuża ważność i daje L+4/unlimited queue. Serwer sprawdza dopłatę kolejki +10% i planowanie za 25% wartości braków po dopłacie.
- Weryfikacja wycen i pobrania monet: przyspieszenie min. 5, natychmiastowe kursy po 10, komplet budynku za materiały ×1,25 plus natywne monety/transport, gotowość 10 s bez tragarzy.
- Uprawnienia i czasy wygasania po stronie serwera, odporność na powtórzenie komendy i konflikt sesji. Rozpoczęte budowy, opłacona kolejka i plany zachowują uzgodnione zachowanie po wygaśnięciu.

## Dalsze zadania bez utworzonego zgłoszenia

- Ustalono i zapisano [obowiązkową kolejność promocji](RELEASE-PROCESS.md): praca tutaj → GitHub/CI → GCP DEV → PROD. Przygotowane workflow blokują pominięcie CI/DEV i kopiują dokładnie obraz sprawdzony na DEV. Pierwsze rzeczywiste przebiegi i odbiór GCP wymagają podłączenia środowisk GitHub; serwer pozostaje początkową usługą sond. Frontend produkcyjny i migracje bazy mają dołączyć do tego samego łańcucha przed ich publikacją.

- Google Cloud wybrane przez użytkownika z oddzielnymi projektami DEV i PROD. Przygotowano [pierwszy etap infrastruktury](GOOGLE-CLOUD.md): sondy HTTP, kontener Node.js, dwa ręczne workflow Cloud Run i bootstrap WIF/IAM. Konto rozliczeniowe jest aktywne według ekranu użytkownika; podłączenie projektów, rzeczywisty bootstrap i wdrożenie pozostają do wykonania po udostępnieniu dostępu. Cloud SQL, Firebase Auth i autorytatywna gospodarka pozostają odrębnymi etapami BE-01–04. Nie utworzono nowego zgłoszenia GitHub.

- Ustalić i zintegrować nagrody lojalnościowe, weryfikację poleceń i udostępnień oraz zasady reklam. Przechowywać uzgodnione wartości przyszłych nagród. Oddzielny, zatwierdzony bonus prototypu 500 za Share po ukończeniu zadania działa raz za kliknięcie; pozostałe nagrody społecznościowe nadal wymagają zdefiniowanej weryfikacji.
- Doprecyzować dodatkowy czas/ruchy ekspedycji, weryfikację obejrzanej reklamy, kod i ewentualne challenge. Nie ma obecnie integracji reklamowej ani automatycznej publikacji postów.
- Zaprojektować i zmierzyć infrastrukturę wspólnego backendu: autorytatywne API, trwała baza, kolejki prac, monitoring, kopie i skalowanie; oszacować koszty według ruchu i czasu offline. Sam hosting statycznej strony nie gwarantuje skalowalności pełnej gry.
- Uzupełnić osobne assety, stany budynków i kamerę zgodnie z #8/#9 oraz wizualny odbiór #10.

## Aktualizowanie planu

URL, numer i milestone dopisujemy po rzeczywistym utworzeniu zgłoszenia. Zakończenie prac lokalnych, commit, publikację oraz test opublikowanej wersji zapisujemy osobno w [dzienniku](IMPLEMENTATION-LOG.md). Wszystkie D01–D17 są rozstrzygnięte; dawne luki własnej korzyści poziomu producentów/portu i ceny kaplicy zostały zamknięte.
