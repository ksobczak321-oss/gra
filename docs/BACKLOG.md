# Backlog HARBORLIGHT

Stan: 2026-10-23. Milestone’y: [frontend #3](https://github.com/ksobczak321-oss/gra/milestone/3), [backend #4](https://github.com/ksobczak321-oss/gra/milestone/4). Bieżąca specyfikacja to [HARBORLIGHT7-zasady.xlsx](arkusze/HARBORLIGHT7-zasady.xlsx): wpisy arkusza 6 i wszystkie rozstrzygnięte decyzje D01–D17. Wersja frontendowa `6b06f20` została opublikowana na Pages i sprawdzona publicznie; [wyniki](IMPLEMENTATION-LOG.md) rozdzielają ten zakres od backendu.

Zachowujemy zaakceptowany wygląd wyspy i jej animacje. Reguły działają w przeglądarce bez backendu. Docelowe trzy sposoby gry — web, Android, iPhone — wymagają wspólnego konta, trwałego stanu i serwerowego rozliczania postępu; obecny lokalny zapis tego nie zapewnia.

## Bieżący frontend

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

Numer i URL GitHub są jednoznacznym identyfikatorem zadania. Nowe zakresy mają oznaczenia FE-14 i FE-15.

Odbiór grafiki nadal wymaga czytelnego ruchu wszystkich postaci, dymu unoszącego się z kominów i zanikającego, obracającego wiatraka, mew, chmur, wodospadów, wszystkich widocznych brzegów, zwierząt i pracującej budowy. Efekty mają zachować styl i nie zasłaniać interfejsu. Testy animacji sprawdzają przesunięcia aktorów i nazwane strefy brzegu, a nie samą zmianę dowolnego piksela. Rendering respektuje ograniczenie ruchu i widoczność karty; gospodarka działa offline niezależnie.

## Backend

### BE-01 — Kontrakt API i model postępu — [#11](https://github.com/ksobczak321-oss/gra/issues/11)

Status: zaplanowane, backend nie jest wdrożony. Kliencki schemat 8 jest materiałem wejściowym, nie modelem zaufanego serwera.

- Jedno API dla web, Android i iPhone: odczyt wyspy, komendy, potwierdzone wyniki, błędy i migracje.
- Pełny stan mieszkańców, zegara, porcji Food, ładunków i rezerwacji, partii targu/portu, wizyt, puli domu, budów, zadań, przebiegów ekspedycji i uprawnień.
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
- Waliduje własne limity pracy 12L, przybycie/powrót 5 min, blokady, zamrożenie nowej osoby przez 24 h, rezerwę Food i ochronę transportu.
- Atomowo liczy koszty, dopłatę kolejki, fizyczne rezerwacje i dostępność pojemności; klient nie może tworzyć materiałów.
- Weryfikuje partię i termin targu/portu, historyczne podwyżki per produkt, wizyty i pakiety wejść, pulę domu, opłaty kaplicy oraz D01–D17.
- Zadania mają serwerowe losowanie, terminy i jednorazowe wypłaty; ekspedycje mają potwierdzoną trasę/limit/etap i pulę monet. Sam komunikat „wygrana” z klienta nie wystarcza.
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

- Ustalić i zintegrować nagrody lojalnościowe, weryfikację poleceń i udostępnień oraz zasady reklam. Przechowywać uzgodnione wartości nagród; nie wypłacać ich za samo kliknięcie.
- Doprecyzować dodatkowy czas/ruchy ekspedycji, weryfikację obejrzanej reklamy, kod i ewentualne challenge. Nie ma obecnie integracji reklamowej ani automatycznej publikacji postów.
- Zaprojektować i zmierzyć infrastrukturę wspólnego backendu: autorytatywne API, trwała baza, kolejki prac, monitoring, kopie i skalowanie; oszacować koszty według ruchu i czasu offline. Sam hosting statycznej strony nie gwarantuje skalowalności pełnej gry.
- Uzupełnić osobne assety, stany budynków i kamerę zgodnie z #8/#9 oraz wizualny odbiór #10.

## Aktualizowanie planu

URL, numer i milestone dopisujemy po rzeczywistym utworzeniu zgłoszenia. Zakończenie prac lokalnych, commit, publikację oraz test opublikowanej wersji zapisujemy osobno w [dzienniku](IMPLEMENTATION-LOG.md). Wszystkie D01–D17 są rozstrzygnięte; dawne luki własnej korzyści poziomu producentów/portu i ceny kaplicy zostały zamknięte.
