# HARBORLIGHT — scenariusze testowe v18

Wersja planu: 1, 30 października 2026. **155 scenariuszy. Wszystkie: „Nie wykonano”.**

To plan testów, nie raport wykonania. Każdy scenariusz ma status Nie wykonano. Historyczne wyniki automatyzacji nie są przypisane tym ręcznym przypadkom.

Bazowe potwierdzone wydanie PRE-PROD: `6ec3c6d` / [41112673285](https://github.com/ksobczak321-oss/gra/actions/runs/41112673285). Nowy zakres wylogowania i dokumentów rejestracji jest oznaczony osobno.

Dane do Excela: [test-scenarios-v18.json](test-scenarios-v18.json). Zasady: [zakres v18](FRONTEND-V18-REQUIREMENTS.md), [gospodarka](ECONOMY-RULES.md), [proces wydania](RELEASE-PROCESS.md).

## Bezpieczne wykonanie

- admin1, admin2 i admin3 są trwałymi kontami. Nie resetować ich ani nie używać jako jednorazowych danych do testów destrukcyjnych.
- Na admin1 wykonywać kontrolę istniejącej historii wyłącznie zabezpieczonym harnessem blokującym zapisy wyspy i aktywności przed nawigacją; zwykłe przeglądanie zalogowanej gry może uruchomić userActivity lub autosave. Pozostałe scenariusze wymagają lokalnego fixture, atrap albo wyraźnie wydzielonego projektu i jednorazowych kont.
- Nie zmieniać ręcznie zegara, bazy, płatności, budżetu ani retencji prawdziwych kont w ramach scenariuszy lokalnych. Zmiana czasu dotyczy harnessu lub serwerowego zegara testowego.
- PROD, dostawcy OAuth, prawdziwe płatności, reklamy, kody globalne i konfiguracja Billing wymagają wcześniejszej konfiguracji oraz odbioru właściciela. Nie oznaczać ich PASS na podstawie symulacji.
- Nowy przycisk wylogowania i dokumenty rejestracji są nowym zakresem do odbioru; nie są automatycznie uznane za opublikowane w baseline v18.

Priorytety: **P0** — utrata danych/środków, dostęp, blokada gry lub wydania; **P1** — istotna reguła i obsługa; **P2** — pomocniczy odbiór. Warunek blokujący konfiguracji należy zapisać jako „Zablokowano”, zamiast nadawać fikcyjny PASS. W tym planie nie wpisano jeszcze wyników.

## Indeks

| Moduł | Liczba |
|---|---:|
| Konta i zapis w chmurze | 15 |
| Wylogowanie i dokumenty rejestracji | 10 |
| Zapasy i transport | 15 |
| Budowy, produkcja i drogi | 9 |
| Mieszkańcy, szczęście i zegary | 17 |
| Kaplica i wydarzenia | 11 |
| Ekspedycje i minigry | 13 |
| Reklamy, płatności i kody | 12 |
| Samouczek — 25 prawdziwych działań | 25 |
| Samouczek — przepełnienie i prowadzenie | 6 |
| Lojalność, zadania i udostępnianie | 7 |
| Retencja, wdrożenie, bezpieczeństwo i koszty | 10 |
| Interfejs i zgodność opisów | 5 |

## Konta i zapis w chmurze

### ACC-001 — Anonimowe wejście na chronioną grę

**P0 · Nie wykonano · Manualnie — odczyt**

Środowisko: PRE-PROD — odczyt. Konto/dane: Czysty profil; bez konta.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Czysty profil prywatny bez jakiejkolwiek sesji Firebase; wyłącznie anonimowe wejście hostowane. W tym przypadku nie wpisuj danych konta i nie przechodź do zalogowanej gry.

Kroki:

1. Otwórz bezpośredni adres gry w czystym profilu przeglądarki.
2. Poczekaj na zakończenie przekierowania.

Oczekiwany wynik:

- Pojawia się formularz logowania.
- Gra nie otwiera lokalnej wyspy i nie oferuje wejścia gościa.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).

### ACC-002 — Historia admin1 przez harness blokujący zapis

**P0 · Nie wykonano · Właścicielski harness z obowiązkową blokadą zapisów**

Środowisko: PRE-PROD — odczyt postępu przez zabezpieczony harness. Konto/dane: admin1 / dev-admin1; istniejąca wyspa; bez tworzenia i resetu.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Istniejący dokument wyspy admin1 i wcześniej zanotowany stan do porównania. Obowiązkowo użyj tests/harborlight-hosted-v18-smoke.py oraz zweryfikowanego pakietu/manifestu. Przed pierwszą nawigacją kontekst przeglądarki musi blokować wszystkie żądania zapisu wyspy i aktywności; brak zapisanej wyspy ma zakończyć odbiór bez tworzenia startera.

Kroki:

1. Sprawdź w harnessie rejestrację ochrony prohibit_writes przed page.goto; dozwolone są odczyty oraz niezbędne odczytowe wywołania Auth lookup/refresh, a zapisy wyspy, aktywności i realizacji nagród są blokowane.
2. Uruchom istniejący odczytowy harness dla PRE-PROD. Potwierdź UID dev-admin1 i własny istniejący dokument. Jeśli harness wybierze inne konto lub nie ma zapisanej wyspy admin1, oznacz scenariusz jako Zablokowano; nie twórz nowej wyspy.
3. Porównaj poziomy, zasoby, statystyki i historię z odczytanej odpowiedzi lub dowodów harnessu z zanotowanym stanem. Ewentualny dalszy upływ czasu w renderowanej grze traktuj wyłącznie jako ulotną symulację w pamięci, której nie wolno zapisać.
4. Sprawdź dowody blokady żądań mutujących i zamknij kontekst testowy. Nie wykonuj tego scenariusza przez zwykłe zalogowanie i klikanie paneli żywej gry: userActivity i autosave mogą wtedy zapisać stan.

Oczekiwany wynik:

- Odczyt dotyczy istniejącej wyspy dev-admin1; zachowuje jej poziomy, zasoby, statystyki i treść historii. Nie powstaje nowy UID, starter ani dokument zastępujący wyspę.
- Zapisy gry i aktywności są przechwytywane przed dotarciem do backendu/Firestore, także przy automatycznym zapisie lub zdarzeniach wejścia. Porównanie nie zatwierdza ulotnej symulacji.
- Dowód jest ważny tylko dla admin1 i przy aktywnej blokadzie zapisów. Sam poprawny ekran gry lub udane logowanie nie jest dowodem testu bez zapisu; logowanie może zmienić techniczne metadane Auth.

Źródła: [harborlight-hosted-v18-smoke.py](../tests/harborlight-hosted-v18-smoke.py), [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js).

### ACC-003 — Trzy tożsamości mają oddzielne wyspy

**P0 · Nie wykonano · Kontrola właścicielska — odczyt**

Środowisko: PRE-PROD — odczyt. Konto/dane: admin1–3; wyłącznie sprawdzenie tożsamości i odczytu.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Przygotowane konta admin1–3; kontrola przez odczytowy check-dev-accounts.mjs.

Kroki:

1. Uruchom przewidzianą odczytową kontrolę kont w zatwierdzonym workflow.
2. Sprawdź UID i wyniki odczytów własnych oraz cudzych dokumentów.

Oczekiwany wynik:

- UID są dev-admin1, dev-admin2 i dev-admin3.
- Cudze i anonimowe odczyty są odrzucane; brak nadpisania wysp.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py), [check-dev-accounts.mjs](../infra/google-cloud/check-dev-accounts.mjs).

### ACC-004 — Starter tworzony raz przy pierwszym wejściu

**P0 · Nie wykonano · Atrapa API / izolowana baza**

Środowisko: DEV — atrapa chmury. Konto/dane: Jednorazowe konto testowe.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Nowe jednorazowe konto w izolowanej bazie testowej; brak dokumentu wyspy.

Kroki:

1. Wejdź pierwszy raz do gry.
2. Sprawdź Ratusz, populację, przydziały i sześć zasobów.
3. Wyloguj i zaloguj ponownie.

Oczekiwany wynik:

- Start: Ratusz 1, 12 mieszkańców, 0 przydzielonych, po100 sześciu zasobów i bazowe H20%.
- Kolejne wejście wznawia zapis zamiast dopisywać drugi starter.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).

### ACC-005 — Zapis na drugim urządzeniu

**P0 · Nie wykonano · Atrapa API / izolowana baza**

Środowisko: DEV — atrapa chmury. Konto/dane: Jednorazowe konto testowe.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: To samo jednorazowe konto w dwóch czystych profilach; brak równoległej gry.

Kroki:

1. W profilu A wykonaj pojedynczy przydział i poczekaj na potwierdzenie zapisu.
2. Wyloguj A.
3. Zaloguj profil B.

Oczekiwany wynik:

- Profil B odczytuje potwierdzony przydział, zasoby i historię z chmury.
- Nie importuje żadnej lokalnej wyspy.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).

### ACC-006 — Awaria chmury przed otwarciem

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Prawidłowa sesja testowa; endpoint odczytu wyspy zwraca błąd sieci.

Kroki:

1. Otwórz grę.
2. Sprawdź ekran błędu i dostępność działań.
3. Przywróć sieć i użyj Ponów.

Oczekiwany wynik:

- Brak lokalnego startera i brak dostępnych operacji gospodarki podczas awarii.
- Ponowienie odczytuje istniejącą wyspę.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).

### ACC-007 — Nieudany pierwszy zapis startera

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Atrapa starej ścieżki PRE-PROD: brak wyspy, pierwszy commit odrzucony.

Kroki:

1. Spróbuj otworzyć grę z nowym kontem testowym.
2. Odrzuć utworzenie dokumentu.

Oczekiwany wynik:

- Gra nie ogłasza utworzenia wyspy i nie otwiera niezapisanego świata.
- Nie zapisuje startera ani kopii w localStorage/sessionStorage.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).

### ACC-008 — Konflikt dwóch kart

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Jednorazowe konto; dwa klienty odczytały tę samą rewizję.

Kroki:

1. Klient A zapisuje zmianę i otrzymuje potwierdzenie.
2. Klient B próbuje zapisać swój starszy stan.
3. W B wybierz jawne wczytanie chmury.

Oczekiwany wynik:

- Drugi zapis jest odrzucony warunkiem rewizji.
- B przestaje zatwierdzać działania, a po wczytaniu pokazuje stan A.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).

### ACC-009 — Utrata odpowiedzi po skutecznym commicie

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Atrapa zapisuje żądanie w bazie, lecz gubi odpowiedź do klienta.

Kroki:

1. Wykonaj komendę.
2. Zasymuluj brak odpowiedzi.
3. Sprawdź liczbę żądań, następnie jawnie wczytaj chmurę.

Oczekiwany wynik:

- Klient nie ponawia bez końca niejednoznacznego zapisu i blokuje dalsze komendy.
- Odczyt pokazuje pojedynczy serwerowy skutek, bez podwojenia.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).

### ACC-010 — Brak pamięci wysp w przeglądarce

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture lub atrapa chmury; otwarte narzędzia pamięci przeglądarki.

Kroki:

1. Rozegraj kilka akcji i wyloguj.
2. Sprawdź klucze localStorage i sessionStorage.

Oczekiwany wynik:

- Nie ma payloadu wyspy, kopii zapasowej ani trwałej kolejki jej zapisu.
- Techniczna sesja logowania i preferencja języka są dozwolone.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).

### ACC-011 — Migracja zapisu opublikowanego v17

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Syntetyczny plik tests/fixtures/harborlight-v17-admin-history.json; czas symulacji zatrzymany.

Kroki:

1. Wczytaj fixture przez nowy normalizator.
2. Zapisz i ponownie wczytaj trzy razy.
3. Porównaj zasoby, populację, poziomy, obsadę, budowę, rezerwacje i historię.

Oczekiwany wynik:

- Nie giną środki, mieszkańcy, budowa ani treść historycznych wiadomości.
- Nie odnawia się72 h premia powitalna i nie wypłacają ponownie stare skrzynie.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).

### ACC-012 — Nieprawidłowy zapis nie jest zastępowany

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Atrapa zwraca niepoprawny JSON lub błędną strukturę dokumentu.

Kroki:

1. Otwórz konto testowe.
2. Sprawdź komunikat oraz liczbę zapisów do API.

Oczekiwany wynik:

- Gra odmawia otwarcia i nie nadpisuje uszkodzonego dokumentu nową wyspą.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).

### ACC-013 — Brak obejścia ścieżki API produkcyjnego konta

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Atrapa hosta PROD; API kont zwraca503.

Kroki:

1. Zaloguj konto testowe i otwórz grę.
2. Obserwuj żądania i pamięć przeglądarki.

Oczekiwany wynik:

- Brak przejścia do bezpośredniego Firestore lub lokalnej gry jako awaryjnego zapisu.
- Wyświetlony jest błąd wymagający przywrócenia API.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).

### ACC-014 — Wykrywanie włączonego API — atrapa PRE-PROD

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Wyłącznie lokalna atrapa /api/v1/config podaje poprawny projekt i accountApi=true; wszystkie operacje Auth/Firestore/API są obsługiwane przez fixture, bez żądań do prawdziwych kont.

Kroki:

1. Otwórz istniejącą sesję.
2. Zapisz zmianę testowego konta.
3. Zasymuluj późniejszy błąd API.

Oczekiwany wynik:

- Klient używa API dla wyspy, aktywności i kodów.
- Późniejszy błąd nie przełącza go na stary bezpośredni zapis Firestore.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).

### ACC-015 — Wygaśnięcie sesji i odświeżanie

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Atrapa wygasającego tokenu oraz prawidłowego refresh tokenu.

Kroki:

1. Poczekaj na odświeżenie sesji bez dotykania gry.
2. Sprawdź UID, zegar realnej aktywności i stan wyspy.

Oczekiwany wynik:

- Odświeżenie zachowuje konto, lecz nie jest działaniem gracza i nie odnawia pięciominutowej premii.

Źródła: [harborlight-dev-cloud.js](../harborlight-dev-cloud.js), [harborlight-dev-sync.js](../harborlight-dev-sync.js), [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py).


## Wylogowanie i dokumenty rejestracji

### REG-001 — Wylogowanie bezpośrednio w Ustawieniach

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: Nowy zakres 2026-10-30 — odbiór wymagany; publikacja PRE-PROD niepotwierdzona.

Warunki: Zalogowane jednorazowe konto testowe; istniejący potwierdzony zapis.

Kroki:

1. Otwórz Ustawienia.
2. Wybierz widoczny przycisk Wyloguj się bez przechodzenia do osobnego panelu konta.
3. Zaloguj ponownie.

Oczekiwany wynik:

- Sesja jest usunięta, pojawia się logowanie, a ponowny login wczytuje tę samą wyspę.
- Nie następuje reset ani przyznanie startera.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-auth.js](../harborlight-auth.js), [harborlight-auth.html](../harborlight-auth.html), [TERMS-DRAFT.pl.md](../docs/TERMS-DRAFT.pl.md).

### REG-002 — Wylogowanie podczas zapisu

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: Nowy zakres 2026-10-30 — odbiór wymagany; publikacja PRE-PROD niepotwierdzona.

Warunki: Atrapa opóźnia odpowiedź na ostatnią komendę.

Kroki:

1. Wykonaj komendę i natychmiast wybierz wylogowanie.
2. Zakończ odpowiedź albo zasymuluj błąd.
3. Zaloguj ponownie i odczytaj stan.

Oczekiwany wynik:

- Interfejs nie ogłasza niepotwierdzonego zapisu jako sukcesu.
- Ponowne wejście pokazuje wyłącznie prawdę z chmury; brak lokalnej kopii i brak resetu.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-auth.js](../harborlight-auth.js), [harborlight-auth.html](../harborlight-auth.html), [TERMS-DRAFT.pl.md](../docs/TERMS-DRAFT.pl.md).

### REG-003 — Wylogowanie usuwa dostęp w drugiej karcie

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: Nowy zakres 2026-10-30 — odbiór wymagany; publikacja PRE-PROD niepotwierdzona.

Warunki: Dwie karty jednorazowego konta, ta sama sesja w pamięci technicznej.

Kroki:

1. Wyloguj pierwszą kartę.
2. Spróbuj działać w drugiej bez ponownego logowania.

Oczekiwany wynik:

- Druga karta wykrywa zmianę sesji i kończy dostęp do poprzedniego konta.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-auth.js](../harborlight-auth.js), [harborlight-auth.html](../harborlight-auth.html), [TERMS-DRAFT.pl.md](../docs/TERMS-DRAFT.pl.md).

### REG-004 — Domyślnie niezaznaczone wymagane potwierdzenia

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: Nowy zakres 2026-10-30 — odbiór wymagany; publikacja PRE-PROD niepotwierdzona.

Warunki: Tryb nowej rejestracji e-mail; aktualny roboczy komplet dokumentów.

Kroki:

1. Otwórz rejestrację w czystym profilu.
2. Sprawdź pola akceptacji bez klikania.
3. Wypełnij pozostałe dane i spróbuj wysłać formularz.

Oczekiwany wynik:

- Potwierdzenia są niezaznaczone.
- Konto nie powstaje bez akceptacji regulaminu i potwierdzenia zapoznania się z polityką.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-auth.js](../harborlight-auth.js), [harborlight-auth.html](../harborlight-auth.html), [TERMS-DRAFT.pl.md](../docs/TERMS-DRAFT.pl.md).

### REG-005 — Każde potwierdzenie jest wymagane osobno

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: Nowy zakres 2026-10-30 — odbiór wymagany; publikacja PRE-PROD niepotwierdzona.

Warunki: Nowa rejestracja e-mail w atrapie Auth.

Kroki:

1. Zaznacz tylko regulamin i wyślij formularz.
2. Zaznacz tylko politykę i ponów.
3. Zaznacz oba i wyślij.

Oczekiwany wynik:

- Pierwsze dwie próby są blokowane.
- Trzecia może utworzyć konto po przejściu pozostałej walidacji.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-auth.js](../harborlight-auth.js), [harborlight-auth.html](../harborlight-auth.html), [TERMS-DRAFT.pl.md](../docs/TERMS-DRAFT.pl.md).

### REG-006 — Dokumenty są dostępne przed rejestracją

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: Nowy zakres 2026-10-30 — odbiór wymagany; publikacja PRE-PROD niepotwierdzona.

Warunki: Brak sesji; formularz rejestracji.

Kroki:

1. Otwórz oba linki klawiaturą i dotykiem.
2. Przeczytaj oznaczenie wersji oraz dane operatora/oznaczone braki.
3. Wróć do formularza.

Oczekiwany wynik:

- Dokumenty otwierają się bez logowania i pozostają czytelne na telefonie.
- Oznaczenie robocze i pola nieuzupełnione nie udają gotowych danych przedsiębiorcy.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-auth.js](../harborlight-auth.js), [harborlight-auth.html](../harborlight-auth.html), [TERMS-DRAFT.pl.md](../docs/TERMS-DRAFT.pl.md).

### REG-007 — Potwierdzenie polityki nie jest zgodą marketingową

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: Nowy zakres 2026-10-30 — odbiór wymagany; publikacja PRE-PROD niepotwierdzona.

Warunki: Formularz nowej rejestracji i treść dokumentów.

Kroki:

1. Przeczytaj etykiety pól i podstawy przetwarzania.
2. Sprawdź brak automatycznej zgody na reklamę, newsletter i publikowanie w FB.

Oczekiwany wynik:

- Wymóg zapoznania się z polityką jest oddzielony od akceptacji umowy.
- Brak warunku udzielenia zbędnej zgody marketingowej w celu gry.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-auth.js](../harborlight-auth.js), [harborlight-auth.html](../harborlight-auth.html), [TERMS-DRAFT.pl.md](../docs/TERMS-DRAFT.pl.md).

### REG-008 — Zapis wersji dokumentów powiązany z UID

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: Nowy zakres 2026-10-30 — odbiór wymagany; publikacja PRE-PROD niepotwierdzona.

Warunki: Jednorazowe konto w izolowanym API; poprawne potwierdzenia.

Kroki:

1. Zarejestruj konto.
2. Odczytaj metadane akceptacji przez uprawnione narzędzie właścicielskie.
3. Porównaj wersje z linkowanymi dokumentami.

Oczekiwany wynik:

- Akceptacja jest przypisana do uwierzytelnionego UID i konkretnych wersji.
- Zapis czasu po stronie serwera nie zależy od dowolnego czasu podanego przez klienta.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-auth.js](../harborlight-auth.js), [harborlight-auth.html](../harborlight-auth.html), [TERMS-DRAFT.pl.md](../docs/TERMS-DRAFT.pl.md).

### REG-009 — Nowy OAuth nie omija wymaganych dokumentów

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: Nowy zakres 2026-10-30 — odbiór wymagany; publikacja PRE-PROD niepotwierdzona.

Warunki: Atrapa nowego Google/Facebook UID; dwa wejścia: rejestracja oraz przycisk w logowaniu.

Kroki:

1. Spróbuj utworzyć nowe konto każdym wejściem bez potwierdzeń.
2. Następnie zatwierdź dokumenty i dokończ rejestrację.

Oczekiwany wynik:

- Żadna ścieżka nowego konta nie daje dostępu do nowej wyspy bez wymaganych potwierdzeń.
- Zgody nie są fabrykowane samym otwarciem popupu.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-auth.js](../harborlight-auth.js), [harborlight-auth.html](../harborlight-auth.html), [TERMS-DRAFT.pl.md](../docs/TERMS-DRAFT.pl.md).

### REG-010 — Istniejące konta nie są rejestrowane ponownie

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: Nowy zakres 2026-10-30 — odbiór wymagany; publikacja PRE-PROD niepotwierdzona.

Warunki: Wyłącznie syntetyczny profil starego konta w DEV oraz pełna atrapa Auth/Firestore/API. Żądania nie mogą docierać do rzeczywistego PRE-PROD ani PROD. Test można powtórzyć na wymyślonych profilach odwzorowujących techniczne UID dev-admin1–3; nie kopiować prawdziwych zapisów.

Kroki:

1. Uruchom lokalny harness z syntetycznym istniejącym kontem i zablokowanymi nieoczekiwanymi żądaniami sieciowymi.
2. Zaloguj syntetyczny profil zwykłą metodą w atrapie, a następnie sprawdź UID, zapis i brak nowego startera lub ponownej rejestracji.
3. Dla każdego syntetycznego profilu odwzorowującego UID porównaj stan przed i po zmianie wymogów rejestracji. Ewentualną kontrolę rzeczywistej historii admin1 wykonuj wyłącznie jako osobny ACC-002 z obowiązkową blokadą zapisów przed nawigacją.

Oczekiwany wynik:

- Dotychczasowe logowanie i syntetyczna wyspa pozostają dostępne zgodnie z polityką wdrożenia, bez nowego UID i startera.
- Dodanie wymogów rejestracji nie resetuje syntetycznych profili odwzorowujących UID dev-admin1–3. Ten scenariusz nie loguje się do prawdziwych kont i nie zapisuje ich dokumentów.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-auth.js](../harborlight-auth.js), [harborlight-auth.html](../harborlight-auth.html), [TERMS-DRAFT.pl.md](../docs/TERMS-DRAFT.pl.md).


## Zapasy i transport

### MAT-001 — Bonus poza zwykłą pojemnością

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: limit300, zwykły zapas200, bonus0.

Kroki:

1. Przyznaj kontrolowaną nagrodę200 tego zasobu.
2. Dostarcz100 zwykłego towaru od producenta.

Oczekiwany wynik:

- Dostępne jest500/300: 300 zwykłego i200 bonusowego.
- Nagroda jest wydawalna i nie zajmuje limitu zwykłych dostaw.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-002 — Wydawanie bonusu przed zwykłym zapasem

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: 200 zwykłego i200 bonusowego jednego materiału; koszt150.

Kroki:

1. Wydaj150 na prawidłowe działanie.
2. Sprawdź ledger i łączny zapas.

Oczekiwany wynik:

- Zostaje200 zwykłego i50 bonusowego, łącznie250.
- Nie nalicza się ponownej opłaty za już zarezerwowany koszt.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-003 — Sześć zasobów i monety poza pojemnością

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: magazyn na zwykłym limicie; zasób Coins można zwiększyć.

Kroki:

1. Przyznaj nagrodę monetową i materiałową.
2. Porównaj użycie zwykłej pojemności.

Oczekiwany wynik:

- Monety nie zajmują miejsca materiałów.
- Materiał nagrody trafia do wydawalnego zapasu bonusowego.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-004 — Rezerwacja chroni środki budowy

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: koszt budowy dostępny tylko raz.

Kroki:

1. Zleć rozbudowę.
2. Spróbuj wydać te same środki na drugie działanie.
3. Obserwuj podjęcie zarezerwowanego ładunku.

Oczekiwany wynik:

- Pierwsza budowa rezerwuje koszt.
- Inne działanie nie wydaje go drugi raz, a odbiór fizycznie zmniejsza właściwy zapas.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-005 — Rezerwa żywności na posiłki

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: zapas Food równy rezerwie Magazynu i mieszkańcy do karmienia.

Kroki:

1. Spróbuj oddać lub sprzedać całą żywność.
2. Obserwuj posiłek.

Oczekiwany wynik:

- Operacja nie wydaje chronionej rezerwy; karmienie nadal może z niej korzystać.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-006 — Natychmiastowy transport uwzględnia towar w drodze

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: planowana dostawa zwykła zajmuje pozostałe miejsce.

Kroki:

1. Otwórz płatną usługę odbioru kolejnego towaru.
2. Spróbuj zatwierdzić przewóz przekraczający miejsce.

Oczekiwany wynik:

- Operacja odmawia przed pobraniem opłaty i towaru.
- Istniejący ładunek i zlecenie pozostają nienaruszone.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-007 — Wycofanie załadowanego tragarza

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: tragarz Magazynu niesie ładunek; dostępne UI obsady.

Kroki:

1. Zmniejsz obsadę o1.
2. Sprawdź wyraźny popup i liczbę kończących kurs.
3. Poczekaj na dostawę oraz pięciominutowy powrót.

Oczekiwany wynik:

- Ładunek jest dowieziony raz.
- Tragarz nie zaczyna kolejnego kursu; staje się wolny dopiero po powrocie.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-008 — Powrót pustego pracownika

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: pracownik produkcji bez gotowego ładunku.

Kroki:

1. Odwołaj pracownika.
2. Spróbuj natychmiast przypisać go ponownie.
3. Odczekaj5 min.

Oczekiwany wynik:

- Powrót trwa5 min rzeczywistego czasu; podczas niego pracownik nie jest dostępny.
- Po powrocie można go przypisać.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-009 — Pojemność i ładunek Magazynu kończą wzrost na24

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: poziomy23,24,25 i ta sama droga.

Kroki:

1. Porównaj limity całkowite, materiałowe, rezerwę Food i ładunek tragarza.
2. Zwiększ poziom drogi przy Magazynie25.

Oczekiwany wynik:

- Po24 nie rośnie pojemność, rezerwa ani wkład Magazynu w ładunek; rośnie limit obsady.
- Droga nadal niezależnie poprawia transport.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-010 — Limit całkowity i limit materiału

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: całkowity limit ma miejsce, lecz jeden materiał osiągnął własny limit.

Kroki:

1. Zaplanuj dostawę pełnego materiału i innego, który ma miejsce.

Oczekiwany wynik:

- Dostawa pierwszego materiału jest ograniczona jego własnym limitem.
- Wolne miejsce innych materiałów nie jest błędnie liczone jako jego pojemność.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-011 — Priorytety transportu są trwałe

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: co najmniej dwa materiały czekają i wolny tragarz.

Kroki:

1. Ustaw numeryczne priorytety materiałów i Budowy.
2. Obserwuj wybór kolejnych kursów.
3. Wczytaj zapis.

Oczekiwany wynik:

- Wybór odpowiada ustawionej kolejności i cyklowi priorytetów.
- Konfiguracja nie znika po wczytaniu.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-012 — Premium Targu nie usuwa poprzednich zwykłych zleceń

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: zwykła wysyłka Targu w kolejce i inny niezarezerwowany towar.

Kroki:

1. Wykonaj natychmiastowy odbiór tylko niezarezerwowanego towaru.
2. Obserwuj poprzednie zlecenie.

Oczekiwany wynik:

- Premium nie usuwa wcześniej zamówionej zwykłej wysyłki i nie pobiera jej towaru drugi raz.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-013 — Termin Portu na obu etapach przewozu

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: partie tuż przed wygaśnięciem; jedna podjęta przed terminem, druga niepodjęta.

Kroki:

1. Przekrocz termin podczas załadunku/rozładunku i ostatniego odcinka do Magazynu.
2. Dokończ kurs podjętej partii.

Oczekiwany wynik:

- Towar podjęty przed terminem przetrwa oba etapy i jest dostarczony raz.
- Niepodjęty przeterminowany towar wygasa.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-014 — Etapy Portu i Targu odświeżają się w otwartym panelu

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z trwającym rejsem i osobna dostawa Targu.

Kroki:

1. Pozostaw odpowiedni panel otwarty.
2. Przekrocz granicę rejs/rozładunek lub dostawa/blokada.

Oczekiwany wynik:

- Nazwy etapów i liczniki zmieniają się bez zamykania panelu.
- Zakończone zlecenie nie pozostaje jako fikcyjnie aktywne.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).

### MAT-015 — Blokada i odnowienie terminu na Targu

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: towar po przybyciu na Targ.

Kroki:

1. Spróbuj wymienić go przed upływem1 h.
2. Po odblokowaniu wykonaj wymianę.
3. Porównaj termin otrzymanej partii.

Oczekiwany wynik:

- Przybyły towar jest zablokowany1 h.
- Wymieniony otrzymuje własne świeże24 h, zamiast dziedziczyć stary termin.

Źródła: [harborlight-v1-inventory.js](../harborlight-v1-inventory.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v18-inventory.test.mjs](../tests/harborlight-v18-inventory.test.mjs).


## Budowy, produkcja i drogi

### BLD-001 — Limit poziomu przez Ratusz

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: Ratusz 1, inny budynek1, dostępne środki.

Kroki:

1. Spróbuj podnieść zwykły budynek ponad poziom Ratusza.
2. Następnie podnieś Ratusz i ponów.

Oczekiwany wynik:

- Pierwsza próba jest blokowana jasnym powodem.
- Po osiągnięciu właściwego poziomu Ratusza rozbudowa staje się możliwa.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v1-leisure.js](../harborlight-v1-leisure.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js).

### BLD-002 — Rozdzielenie transportu i budowy

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: zamówiony upgrade i przydzieleni tragarze.

Kroki:

1. Obserwuj rezerwację, podjęcie kosztu i dostawy.
2. Po dostarczeniu porównaj faktyczny czas transportu z czasem fazy budowania.

Oczekiwany wynik:

- Fazy nie biegną równolegle jako jedna ukryta operacja.
- Budowa zależy od rzeczywistego transportu i właściwego mnożnika typu budynku.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v1-leisure.js](../harborlight-v1-leisure.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js).

### BLD-003 — Kolejka nie przekracza limitu Ratusza

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: zajęte miejsca aktywne i zwykła kolejka na limicie.

Kroki:

1. Spróbuj dodać kolejny projekt.
2. Zakończ jeden i ponów.

Oczekiwany wynik:

- Nadmiarowy projekt nie pobiera środków i nie trafia do kolejki.
- Zwolnienie miejsca dopuszcza poprawne zlecenie.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v1-leisure.js](../harborlight-v1-leisure.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js).

### BLD-004 — Dwa poziomy tego samego budynku

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: poprzedni poziom budynku już zamówiony; wolne miejsce aktywne dla innego projektu.

Kroki:

1. Zamów następny poziom tego samego budynku.
2. Sprawdź liczbę zajętych miejsc kolejki i kolejność.

Oczekiwany wynik:

- Następny poziom jest liczony do kolejki i nie wyprzedza poprzedniego poziomu.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v1-leisure.js](../harborlight-v1-leisure.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js).

### BLD-005 — Anulowanie tylko przed pierwszym podjęciem

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: dwie kopie projektu, przed podjęciem i po podjęciu materiałów.

Kroki:

1. Spróbuj anulować oba projekty przez UI.

Oczekiwany wynik:

- Projekt przed podjęciem można anulować zgodnie z warunkami i uwolnić rezerwację.
- Rozpoczęty nie oddaje zasobów błędnie ani nie znika z ładunkiem.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v1-leisure.js](../harborlight-v1-leisure.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js).

### BLD-006 — Popup dokładnego skrócenia budowy

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture:125 s budowania i środki na skrócenie25%.

Kroki:

1. Kup skrócenie25%.
2. Porównaj różnicę licznika z popupem w minutach i sekundach.

Oczekiwany wynik:

- Popup podaje faktycznie zaoszczędzony czas zgodnie z zaokrągleniem UI.
- Nie podaje czasu całej budowy ani wartości innego etapu.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v1-leisure.js](../harborlight-v1-leisure.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js).

### BLD-007 — Wydajność 20/24/26/28 i receptury2:1

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: po1 przybyłym najedzonym pracowniku na poziomach1–4.

Kroki:

1. Obserwuj bazową produkcję przy mnożniku×1.
2. W Młynie i Tartaku zanotuj pobór wejścia na ukończoną sztukę.

Oczekiwany wynik:

- Baza wynosi20/24/26/28 na godzinę.
- Żywność zużywa2 Grain, a deska2 Wood na sztukę; opis rozróżnia bazę i aktualne mnożniki.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v1-leisure.js](../harborlight-v1-leisure.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js).

### BLD-008 — Brak wejścia i pełny bufor producenta

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Dwa fixtures: brak Grain w Młynie oraz pełny lokalny bufor Gospodarstwa.

Kroki:

1. Otwórz budynki i obserwuj zatrzymanie.
2. Przywróć wejście lub odbierz gotowe towary.

Oczekiwany wynik:

- Powód przestoju jest poprawny; smutna ikona pojawia się dla rzeczywistej kary.
- Po wznowieniu produkcji komunikat i ikona ustępują.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v1-leisure.js](../harborlight-v1-leisure.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js).

### BLD-009 — Sto odcinków drogi przed następnym poziomem

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture:99 ulepszonych odcinków bieżącego poziomu i200 Stone.

Kroki:

1. Spróbuj przejść do następnego poziomu.
2. Ulepsz setny odcinek za100 Stone.
3. Rozpocznij następny poziom.

Oczekiwany wynik:

- Nowy poziom nie omija brakującego odcinka.
- Każdy poprawny zakup pobiera100 Stone raz.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-logistics.js](../harborlight-v1-logistics.js), [harborlight-v1-leisure.js](../harborlight-v1-leisure.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js).


## Mieszkańcy, szczęście i zegary

### POP-001 — Powitalne minimum wszystkich mieszkańców

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Nowa wyspa; mieszkańcy początkowi i nowo przybyły; brak Latarni.

Kroki:

1. W ciągu72 h wywołaj ujemne czynniki na fixture.
2. Porównaj indywidualne szczęście i średnią.

Oczekiwany wynik:

- Każdy ma co najmniej20%, także przybyły w okresie ochrony; średnia nie spada poniżej20%.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-002 — Koniec ochrony bez ukrytego długu

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture blisko końca72 h; ujemne czynniki działały pod ochroną.

Kroki:

1. Przekrocz granicę72 h.
2. Obserwuj zmianę bez dodatkowej komendy.

Oczekiwany wynik:

- Nie następuje automatyczne odjęcie20 pp ani jednorazowe naliczenie całej chronionej kary.
- Dalsze naliczanie jest zgodne z aktualnymi czynnikami.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-003 — Latarnia ma pierwszeństwo nad nowym mieszkańcem

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: aktywna globalna Latarnia i nowa osoba z24 h osiedlania.

Kroki:

1. Dodaj przybyłego w połowie efektu.
2. Przekrocz wspólny koniec efektu Latarni.

Oczekiwany wynik:

- W czasie globalnej ochrony osoba ma100%.
- Nie otrzymuje osobnego pełnego nowego czasu Latarni po przybyciu.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-004 — Dwukrotnie szybsze przybywanie, stare odejścia

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixtures ze stałym H+100 i H−100; wolne miejsce i populacja powyżej6.

Kroki:

1. Mierz czas do zmiany o1 osobę.
2. Porównaj tabelę UI.

Oczekiwany wynik:

- Przy+100 przybywa1 co30 min, przy−100 odchodzi1 co1 h.
- Tabela pokazuje osobne czasy dodatnie i ujemne.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-005 — Limit Ratusza i minimum sześciu

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixtures: pełny limit Ratusza przy dodatnim H oraz6 osób przy ujemnym H.

Kroki:

1. Przekrocz termin kolejnej zmiany populacji w obu fixtures.

Oczekiwany wynik:

- Pierwszy nie przekracza limitu Ratusza.
- Drugi nie schodzi poniżej6 mieszkańców.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-006 — Dojście trwa pięć rzeczywistych minut

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: wolna osoba, aktywność×2 i dobre drogi.

Kroki:

1. Przydziel osobę do producenta.
2. Zmierz czas rozpoczęcia pracy.

Oczekiwany wynik:

- Droga do pracy trwa5 min; mnożnik przewozu nie skraca dojścia osobistego.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-007 — Podatek dopiero po dotarciu

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: przypisana osoba jeszcze w drodze, a następnie przybyła.

Kroki:

1. Porównaj naliczenie podatku przed i po końcu dojścia.

Oczekiwany wynik:

- Osoba w drodze nie płaci podatku jak przybyły pracownik.
- Naliczenie zaczyna się po dotarciu.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-008 — Przydział wstrzymuje bezrobocie bez kasowania licznika

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: osoba ma naliczone ponad12 h bezrobocia.

Kroki:

1. Przydziel ją do pracy.
2. Odwołaj przed dojściem.
3. Ponownie przydziel i tym razem pozwól dojść.

Oczekiwany wynik:

- Kara jest wstrzymana podczas dojścia, ale sam przydział nie zeruje zegara.
- Tylko dotarcie zeruje licznik; szybkie odwołanie nie daje nowej ochrony.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-009 — Karmienie resetuje głód po pełnej godzinie

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: ponad12 h głodu, zapas Food przywracany odcinkami.

Kroki:

1. Nakarm przez30 min i przerwij.
2. Przywróć karmienie na pełne60 min.

Oczekiwany wynik:

- Kara szczęścia zatrzymuje się po przywróceniu jedzenia.
- Krótki posiłek nie kasuje historii; pełna nieprzerwana godzina zeruje licznik.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-010 — Głód od razu zmniejsza wydajność

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: przybyli pracownicy i tragarze; zapas Food spada do0.

Kroki:

1. Porównaj produkcję i prędkość przewozu przed brakiem Food i bezpośrednio po nim.

Oczekiwany wynik:

- Mnożnik głodu×0,5 działa od razu; nie czeka na12 h kary szczęścia.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-011 — Aktywność kończy się po pięciu minutach

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z wystarczającymi materiałami i porównywalnym pracownikiem.

Kroki:

1. Wykonaj rzeczywisty dotyk lub klawisz w aktywnej karcie.
2. Przez kolejne5 min nie wykonuj wejścia.
3. Porównaj mnożniki przed i po granicy.

Oczekiwany wynik:

- Produkcja, podatki i przewóz mają×2 przez5 min od aktywności, następnie×1.
- Automatyczny zegar i zapis nie odnawiają premii.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-012 — Powrót po60 h jest liczony przedziałowo

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture: zapis tuż po realnym działaniu; identyczny stan porównawczy.

Kroki:

1. Rozlicz60 h jednym skokiem.
2. W drugim stanie rozlicz te same granice odcinkami.

Oczekiwany wynik:

- Pierwsze5 min mają×2, pozostały czas do48 h×1, dopiero ostatnie12 h×0,5.
- Wyniki całego i dzielonego rozliczenia są zgodne.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-013 — Spowolnienie nie zmienia jedzenia i efektów

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture:60 h nieobecności, znane zużycie Food i efekt krótszy niż nieobecność.

Kroki:

1. Rozlicz nieobecność i porównaj zegary z rzeczywistym czasem.

Oczekiwany wynik:

- Jedzenie, kalendarz, szczęście i czas efektów biegną normalnie.
- Populacja ma osobną regułę przyrostu; spowolnienie ekonomii nie przedłuża efektu.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-014 — Tylko prawdziwe wejście w aktywnej karcie

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z licznikiem realnej aktywności.

Kroki:

1. Użyj dotyku, klawisza i sensownego przechylenia w minigrze.
2. Następnie pozostaw kartę w tle z animacją i odświeżaniem sesji.

Oczekiwany wynik:

- Rzeczywiste sterowanie odnawia aktywność.
- Tło, animacja, neutralna fizyka, automatyczny zapis i refresh tokenu tego nie robią.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-015 — Globalne wylogowanie30 min+30 s

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z zalogowaną atrapą sesji i zatrzymanym zegarem testowym.

Kroki:

1. Odczekaj30 min bez rzeczywistego wejścia.
2. Nie odpowiadaj przez30 s.
3. Powtórz, potwierdzając obecność przed końcem.

Oczekiwany wynik:

- Po30 min jest widoczne ostrzeżenie, po dalszych30 s wylogowanie.
- Potwierdzenie w terminie zachowuje sesję bez resetu wyspy.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-016 — Fikcyjny1 stycznia i rzeczywista godzina Warszawy

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Nowa wyspa; różne strefy urządzenia.

Kroki:

1. Porównaj dzień startu i zegar przy UTC oraz strefie innej niż Polska.
2. Sprawdź rzeczywiste znaczniki zapisu.

Oczekiwany wynik:

- Startowa data świata to1 stycznia, a godzina wynika z Europe/Warsaw.
- Znaczniki płatności, aktywności i zapisu pozostają rzeczywiste.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).

### POP-017 — Północ Warszawy podczas zmiany czasu

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Kontrolowane daty zmiany czasu i przejścia przez północ Europe/Warsaw.

Kroki:

1. Zmień strefę systemu testera.
2. Rozlicz przed i po warszawskiej północy oraz godzinie DST.

Oczekiwany wynik:

- Dzienny reset następuje raz według Warszawy, nie według lokalnego urządzenia ani po arbitralnych24 h.

Źródła: [harborlight-v1-residents.js](../harborlight-v1-residents.js), [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-calendar.js](../harborlight-v1-calendar.js).


## Kaplica i wydarzenia

### EVT-001 — Jedno darmowe błogosławieństwo dziennie

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z Kaplicą i brakiem aktywnego błogosławieństwa.

Kroki:

1. Odbierz darmowe użycie.
2. Po końcu efektu spróbuj drugi raz tego dnia.
3. Przekrocz warszawską północ.

Oczekiwany wynik:

- Darmowe użycie jest pojedyncze na dzień; nie kumuluje niewykorzystanych dni.
- O północy odnawia się1 użycie.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-events.js](../harborlight-v1-events.js), [harborlight-v1-effects.js](../harborlight-v1-effects.js).

### EVT-002 — Wspólna blokada płatnego i reklamowego błogosławieństwa

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture ze środkami, symulacją reklam i Kaplicą.

Kroki:

1. Odbierz płatne błogosławieństwo.
2. Po1 h spróbuj reklamowego.
3. Odczekaj dalsze4 h i ponów.

Oczekiwany wynik:

- Płatne i reklamowe użycia mają wspólną blokadę4 h od końca godzinnego efektu, czyli5 h start–start.
- Próba w blokadzie nie pobiera środków.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-events.js](../harborlight-v1-events.js), [harborlight-v1-effects.js](../harborlight-v1-effects.js).

### EVT-003 — Darmowe użycie nie przesuwa płatnego terminu

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z aktywną blokadą płatnego użycia, po końcu efektu i z wolnym darmowym użyciem.

Kroki:

1. Odbierz darmowe błogosławieństwo.
2. Porównaj zapisany termin płatnego użycia przed i po.

Oczekiwany wynik:

- Termin płatnego/reklamowego odnowienia nie jest przesunięty.
- Aktywne ręczne błogosławieństwa nie nakładają się.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-events.js](../harborlight-v1-events.js), [harborlight-v1-effects.js](../harborlight-v1-effects.js).

### EVT-004 — Regularność Kaplicy3 i4

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Dwa fixtures: Kaplica 3 oraz4, znany ostatni ręczny blessing.

Kroki:

1. Sprawdź dozwolony odstęp i kontrolowane najwcześniejsze zagrożenie.
2. Użyj prawdziwego ręcznego błogosławieństwa.

Oczekiwany wynik:

- Okres łaski to6 dni dla Kaplicy3 oraz7 dni dla Kaplicy4.
- Użycie odnawia regularność; zagrożenie jest dopiero dalsze6–15 dni po łasce.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-events.js](../harborlight-v1-events.js), [harborlight-v1-effects.js](../harborlight-v1-effects.js).

### EVT-005 — Dobre wydarzenie36–60 h bez ponownego losowania

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture ze znanym ziarnem generatora i bez Latarni.

Kroki:

1. Zapisz termin dobrego wydarzenia.
2. Wielokrotnie otwórz panel i wczytaj stan.
3. Rozlicz dojście do terminu.

Oczekiwany wynik:

- Termin leży w36–60 h i pozostaje taki sam po odczytach.
- Wydarzenie oraz nagroda występują tylko raz.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-events.js](../harborlight-v1-events.js), [harborlight-v1-effects.js](../harborlight-v1-effects.js).

### EVT-006 — Latarnia odkłada najwyżej jedno dobre wydarzenie

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z wieloma potencjalnymi terminami podczas długiej globalnej ochrony.

Kroki:

1. Rozlicz całą ochronę.
2. Zakończ jej wspólny efekt i sprawdź historię.

Oczekiwany wynik:

- Podczas ochrony nie narasta dowolna kolejka nagród.
- Po końcu uwalnia się najwyżej jedno odłożone dobre wydarzenie i powstaje nowy przyszły termin.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-events.js](../harborlight-v1-events.js), [harborlight-v1-effects.js](../harborlight-v1-effects.js).

### EVT-007 — Latarnia anuluje złe prognozy bez fikcyjnego błogosławieństwa

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z należnym negatywnym wydarzeniem i później włączaną Latarnią.

Kroki:

1. Włącz globalną ochronę.
2. Przekrocz dawny zły termin.
3. Zakończ ochronę i sprawdź nowe prognozy oraz lastBlessingAt.

Oczekiwany wynik:

- Stara zła prognoza nie wybucha podczas ochrony.
- Nowy termin respektuje łaskę i losowe opóźnienie, a timestamp prawdziwego błogosławieństwa nie jest podmieniany.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-events.js](../harborlight-v1-events.js), [harborlight-v1-effects.js](../harborlight-v1-effects.js).

### EVT-008 — Dżuma respektuje minimum6 i chroni ładunek

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z kontrolowanym wynikiem dżumy,6–10 osobami i załadowanym kurierem.

Kroki:

1. Wywołaj należne wydarzenie w lokalnym modelu.
2. Sprawdź populację, rezerwacje i towar w drodze.

Oczekiwany wynik:

- Populacja nie spada poniżej6.
- Zarezerwowane i niesione dobra nie są niszczone przez usunięcie osoby.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-events.js](../harborlight-v1-events.js), [harborlight-v1-effects.js](../harborlight-v1-effects.js).

### EVT-009 — Latarnia po dżumie nie zwraca strat

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture po utracie ludzi i dóbr; czynna kara dżumy.

Kroki:

1. Ukończ poziom Latarni.
2. Sprawdź szczęście oraz poprzednie straty.

Oczekiwany wynik:

- Szczęście jest wymuszone na100%, lecz utracone dobra i ludzie nie wracają automatycznie.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-events.js](../harborlight-v1-events.js), [harborlight-v1-effects.js](../harborlight-v1-effects.js).

### EVT-010 — Rozbitek przy pełnym limicie

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z pełnym Domem lub limitem Ratusza oraz kontrolowanym rozbitkiem.

Kroki:

1. Wywołaj pozytywne wydarzenie rozbitka.
2. Porównaj populację i saldo monet.

Oczekiwany wynik:

- Nie przekracza dostępnego miejsca.
- Zamiast mieszkańca przyznaje500×poziom Ratusza monet dokładnie raz.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-events.js](../harborlight-v1-events.js), [harborlight-v1-effects.js](../harborlight-v1-effects.js).

### EVT-011 — Najwyżej jedno złe zaległe wydarzenie

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z długą nieobecnością bez realnej aktywności i wysoką Kaplicą.

Kroki:

1. Rozlicz długą nieobecność jednym i dzielonym skokiem.
2. Dopiero później wykonaj prawdziwe działanie.

Oczekiwany wynik:

- W niezmienionym okresie bez grania naliczane jest najwyżej jedno złe zaległe wydarzenie.
- Nowe działanie pozwala uzbroić kolejne przyszłe okno, bez natychmiastowego wielokrotnego ataku.

Źródła: [harborlight-v1-state.js](../harborlight-v1-state.js), [harborlight-v1-events.js](../harborlight-v1-events.js), [harborlight-v1-effects.js](../harborlight-v1-effects.js).


## Ekspedycje i minigry

### MIN-001 — Wybór obu gier i następnej rundy

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z dostępną ekspedycją.

Kroki:

1. Wybierz kulki, zakończ serię i wybierz trójki.
2. Po wygranej wybierz inny typ następnej rundy.
3. Wczytaj zapis.

Oczekiwany wynik:

- Wybrany typ jest respektowany i utrwalony.
- Przyciski nawigacji nie wprowadzają niezamierzonego powrotu niszczącego serię.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).

### MIN-002 — Rosnące nagrody i suma puli

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z możliwością kontrolowanego szybkiego zwycięstwa.

Kroki:

1. Wygrywaj4 rundy przed progiem potrąceń i nie wypłacaj wcześniej.
2. Zapisz nagrodę każdej oraz pulę.

Oczekiwany wynik:

- Nagrody to50,100,200,400; pula50,150,350,750.
- Kolejny etap nie zastępuje puli samą nagrodą rundy.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).

### MIN-003 — Wypłata kończy serię raz

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z wygraną i niewypłaconą pulą.

Kroki:

1. Wypłać pulę.
2. Ponów kliknięcie/żądanie i wczytaj stan.

Oczekiwany wynik:

- Monety są dopisane tylko raz i seria zakończona.
- Nie można jednocześnie wypłacić i zachować ryzykowanej puli.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).

### MIN-004 — Przegrana na twardym limicie

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z pulą po poprzedniej wygranej i aktywną kolejną rundą.

Kroki:

1. Pozwól upłynąć całemu limitowi.
2. Spróbuj kontynuować, dopłacić i odświeżyć.

Oczekiwany wynik:

- Niewypłacona pula przepada i próba pozostaje zakończona po wczytaniu.
- Nie ma automatycznej płatności ani wskrzeszenia po terminie.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).

### MIN-005 — Potrącenia za czas w pierwszej rundzie

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture pierwszych kulek i osobno trójek.

Kroki:

1. Sprawdź ofertę przed i po progu pełnej nagrody.
2. Przekraczaj kolejne pełne interwały.

Oczekiwany wynik:

- Kulki: limit180 s, pełna nagroda do120 s, potem−1 co15 s.
- Trójki: limit240 s, pełna nagroda do160 s, potem−1 co20 s.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).

### MIN-006 — Dobrowolny zakup30 s za10 monet maksymalnie dwa razy

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture aktywnej rundy i przynajmniej30 Coins.

Kroki:

1. Kup dodatkowy czas przed końcem.
2. Kup drugi raz.
3. Spróbuj trzeci raz i po końcu rundy.

Oczekiwany wynik:

- Każdy dozwolony zakup dodaje30 s i pobiera10 Coins.
- Trzeci i spóźniony zakup są odrzucone bez opłaty.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).

### MIN-007 — Reklama za60 s tylko raz

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture aktywnej rundy z symulacją DEV.

Kroki:

1. Uruchom reklamę.
2. Zakończ wymagane oglądanie i potwierdzenie.
3. Spróbuj ponowić ten sam dowód i uruchomić drugą reklamę.

Oczekiwany wynik:

- Runda otrzymuje60 s raz.
- Przerwany film i powtórzony dowód nie dają nagrody; limit jednego użycia działa.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).

### MIN-008 — Film zatrzymuje rundę, a nie świat

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z trwającą budową, jedzeniem i aktywną rundą.

Kroki:

1. Zanotuj zegary.
2. Włącz symulowaną reklamę czasu na10 s.
3. Porównaj postęp świata i rundy.

Oczekiwany wynik:

- Zegar rundy i ochrony obecności nie zużywa czasu filmu.
- Budowa, jedzenie i efekty świata nadal biegną; pauza ma ograniczony czas, nie jest bezterminowa.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).

### MIN-009 — Ochrona obecności w ekspedycji

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture aktywnej rundy z odpowiednio długim limitem.

Kroki:

1. Nie wykonuj sterowania przez5 min.
2. Potwierdź obecność przed60 s.
3. Powtórz bez potwierdzenia.

Oczekiwany wynik:

- Pojawia się osobna kontrola obecności5 min+60 s.
- Brak odpowiedzi kończy chronioną serię zgodnie z zasadą; sam popup nie jest dobrowolnym zakupem czasu.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).

### MIN-010 — Trzy zgodne karty i dowolna liczba błędów

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture planszy24 pól ze znanym układem.

Kroki:

1. Odkrywaj błędne trójki wielokrotnie.
2. Odkryj trzy identyczne obrazki.
3. Wczytaj stan przy częściowo ukończonej planszy.

Oczekiwany wynik:

- Błędy nie wprowadzają limitu prób.
- Zgodna trójka jest usunięta, a wczytanie zachowuje postęp i nie odtwarza dopasowanych kart.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).

### MIN-011 — Tasowanie zachowuje odkryte i dopasowane karty

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture trójek od etapu4 z częścią dopasowaną i aktualnie odkrytą kartą.

Kroki:

1. Przekrocz termin tasowania ukrytych kart.
2. Porównaj widoczną kartę i dopasowane pozycje.

Oczekiwany wynik:

- Przemieszczają się tylko zakryte niedopasowane obrazy.
- Odkryte i już dopasowane nie są podmienione.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).

### MIN-012 — Plansze24/42/120 mieszczą się bez suwaka

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixtures odpowiadające24,42 i120 polom; rozdzielczości1366×768,1536×864,390×844 i360×740.

Kroki:

1. Otwórz każdą planszę.
2. Zmień rozmiar także przy wstrzymanych callbackach resize/ResizeObserver w lokalnym harnessie.
3. Sprawdź skrajne karty.

Oczekiwany wynik:

- Widać całą planszę bez przycięcia i obu suwaków.
- Karty pozostają kwadratowe, co najmniej20 px, a dopasowany stan nie ginie.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).

### MIN-013 — Kulki działają myszą, dotykiem i przechyłem

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny labirynt oraz telefon z dostępem do sensora.

Kroki:

1. Doprowadź kulkę do celu myszą/klawiaturą.
2. Powtórz dotykiem.
3. Na telefonie jawnie udziel lub odmów zgody na orientację.

Oczekiwany wynik:

- Każde wspierane sterowanie prowadzi rzeczywistą fizykę.
- Odmowa sensora pozostawia działającą alternatywę dotykową.

Źródła: [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-v1-minigames.js](../harborlight-v1-minigames.js), [harborlight-v1-minigame-ui.js](../harborlight-v1-minigame-ui.js), [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py).


## Reklamy, płatności i kody

### PAY-001 — Paynow — testowe zachowanie PRE-PROD w fixture

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Wyłącznie lokalny fixture dostępnych pakietów i usług, odwzorowujący możliwości PRE-PROD. Żadnego logowania do rzeczywistych admin1–3 ani wysyłania zapisu do chmury.

Kroki:

1. Otwórz płatność z poziomu1.
2. Przeczytaj oznaczenie symulacji.
3. Potwierdź testowy zakup, następnie ponów potwierdzenie.

Oczekiwany wynik:

- Nie jest pobierana prawdziwa płatność.
- Testowa nagroda trafia raz; cena i usługa są ponownie weryfikowane przed rozliczeniem.

Źródła: [harborlight-v1-commerce.js](../harborlight-v1-commerce.js), [harborlight-v1-engagement.js](../harborlight-v1-engagement.js), [account-service.mjs](../backend/account-service.mjs).

### PAY-002 — Anulowanie płatności niczego nie przyznaje

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z rozpoczętym checkoutem monet lub budynku.

Kroki:

1. Anuluj popup.
2. Spróbuj dokończyć anulowany checkout.

Oczekiwany wynik:

- Brak nagrody, kosztu i uprawnienia bez reklam z anulowanego zakupu.

Źródła: [harborlight-v1-commerce.js](../harborlight-v1-commerce.js), [harborlight-v1-engagement.js](../harborlight-v1-engagement.js), [account-service.mjs](../backend/account-service.mjs).

### PAY-003 — PROD odrzuca dowolny kliencki dowód zakupu

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Atrapa hosta i API PROD; brak rzeczywistego potwierdzenia operatora.

Kroki:

1. Wyślij testowe completeCheckout, devSimulation i własne verified=true.
2. Ponownie odczytaj zapis serwera.

Oczekiwany wynik:

- Przeglądarka nie może stworzyć potwierdzonego zakupu produkcyjnego ani trwałego uprawnienia.
- Realny operator nie jest udawany.

Źródła: [harborlight-v1-commerce.js](../harborlight-v1-commerce.js), [harborlight-v1-engagement.js](../harborlight-v1-engagement.js), [account-service.mjs](../backend/account-service.mjs).

### PAY-004 — Usługi za monety od4, za kasę od1

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixtures Ratusz 1 i4; spełnione zwykłe warunki poziomu docelowego.

Kroki:

1. Porównaj usługę kupna budynku/transportu za zdobyte monety z osobnym linkiem płatności.
2. NaRatuszu1 spróbuj kupić poziom innego budynku wyższy niż limit.

Oczekiwany wynik:

- Ścieżka monetowa wymaga Ratusza4.
- Osobna ścieżka pieniężna działa od1, lecz nie omija limitu poziomu budynku.

Źródła: [harborlight-v1-commerce.js](../harborlight-v1-commerce.js), [harborlight-v1-engagement.js](../harborlight-v1-engagement.js), [account-service.mjs](../backend/account-service.mjs).

### PAY-005 — Próg bez reklam jest ruchomy i sumowany

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z potwierdzonymi płatnościami1000 gr29 dni temu i999 gr14 dni temu.

Kroki:

1. Sprawdź standardowe reklamy.
2. Przekrocz dzień wygaśnięcia starszej wpłaty.

Oczekiwany wynik:

- Suma1999 gr daje uprawnienie.
- Po wygaśnięciu starszej części suma999 gr nie daje uprawnienia; termin nie jest liczony od ostatniej wpłaty.

Źródła: [harborlight-v1-commerce.js](../harborlight-v1-commerce.js), [harborlight-v1-engagement.js](../harborlight-v1-engagement.js), [account-service.mjs](../backend/account-service.mjs).

### PAY-006 — Bez reklam zachowuje bonus i limity

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z aktywnym potwierdzonym uprawnieniem i dostępnym standardowym bonusem.

Kroki:

1. Odbierz bonus bez filmu.
2. Spróbuj odebrać drugi raz w tym samym oknie.
3. W ekspedycji otwórz reklamę za czas.

Oczekiwany wynik:

- Standardowy bonus jest przyznany bez filmu, lecz bez obejścia limitu.
- Reklama za czas ekspedycji nadal wymaga oglądania.

Źródła: [harborlight-v1-commerce.js](../harborlight-v1-commerce.js), [harborlight-v1-engagement.js](../harborlight-v1-engagement.js), [account-service.mjs](../backend/account-service.mjs).

### PAY-007 — Pierwsza reklama raz między4 a8 min aktywności

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Nowe konto testowe ze stałym ziarnem harmonogramu.

Kroki:

1. Graj w widocznej aktywnej karcie do pierwszej propozycji.
2. Zakończ lub pomiń.
3. Wyloguj i wróć.

Oczekiwany wynik:

- Pierwszy termin mieści się w4–8 aktywnych minutach.
- Odczyt ani ponowny login nie losuje i nie proponuje pierwszego bonusu od nowa.

Źródła: [harborlight-v1-commerce.js](../harborlight-v1-commerce.js), [harborlight-v1-engagement.js](../harborlight-v1-engagement.js), [account-service.mjs](../backend/account-service.mjs).

### PAY-008 — Kolejne okna liczone od końca aktywności

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture po pierwszej reklamie z zapisanym harmonogramem.

Kroki:

1. Zakończ/pomiń pierwszą reklamę.
2. Zakończ pierwszą i drugą wybraną ekspedycję albo reklamę.
3. Zanotuj aktywne minuty następnych propozycji.

Oczekiwany wynik:

- Odstępy wynoszą5–15, następnie43–62, następnie60–100 aktywnych minut od właściwego zakończenia.
- Tło i logowanie nie dodają fikcyjnych aktywnych minut.

Źródła: [harborlight-v1-commerce.js](../harborlight-v1-commerce.js), [harborlight-v1-engagement.js](../harborlight-v1-engagement.js), [account-service.mjs](../backend/account-service.mjs).

### PAY-009 — Materiałowa reklama nie daje monet ani dowolnego farmienia

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z należną propozycją reklamy i drugi bez propozycji.

Kroki:

1. Zakończ prawidłową reklamę.
2. Porównaj wszystkie zasoby.
3. Prześlij powtórzony dowód oraz prośbę bez okna harmonogramu.

Oczekiwany wynik:

- Przyznaje10–30 każdego z5 materiałów, bezCoins.
- Powtórzenie i brak należnej propozycji nie przyznają kolejnej nagrody.

Źródła: [harborlight-v1-commerce.js](../harborlight-v1-commerce.js), [harborlight-v1-engagement.js](../harborlight-v1-engagement.js), [account-service.mjs](../backend/account-service.mjs).

### PAY-010 — Pierwszy bonus premium nie kotwiczy zegara dwa razy

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z uprawnieniem bez reklam przed4–8 minutą.

Kroki:

1. Przekrocz pierwszy termin bez odbioru bonusu.
2. Później odbierz materiałowy bonus.
3. Porównaj termin kolejnej propozycji przed i po odbiorze.

Oczekiwany wynik:

- Harmonogram zakotwicza się automatycznie raz.
- Późniejszy odbiór nie uruchamia zegara od nowa i nie wymaga filmu.

Źródła: [harborlight-v1-commerce.js](../harborlight-v1-commerce.js), [harborlight-v1-engagement.js](../harborlight-v1-engagement.js), [account-service.mjs](../backend/account-service.mjs).

### PAY-011 — Globalny limit20 realizacji kodu

**P0 · Nie wykonano · Wymaga przygotowania właściciela**

Środowisko: Izolowany projekt / emulator. Konto/dane: Jednorazowe konta kampanii.

Stan zakresu: API kodów zaimplementowane; aktywacja/IAM wymagają osobnego odbioru.

Warunki: Izolowany transakcyjny backend; kampania maxClaims20, minimum21 jednorazowych UID.

Kroki:

1. Wyślij równolegle21 poprawnych realizacji.
2. Ponów kod z konta, które otrzymało nagrodę.
3. Porównaj saldo i licznik globalny.

Oczekiwany wynik:

- Najwyżej20 kont otrzymuje nagrodę; licznik nie przekracza20.
- Powtórzenie nie wypłaca drugi raz ani nie zwiększa licznika.

Źródła: [harborlight-v1-commerce.js](../harborlight-v1-commerce.js), [harborlight-v1-engagement.js](../harborlight-v1-engagement.js), [account-service.mjs](../backend/account-service.mjs).

### PAY-012 — Niewłączone API kodów nie udaje sukcesu

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Ścieżka UI kodu, ale backend wyłączony503.

Kroki:

1. Wpisz kod i spróbuj go wykorzystać.
2. Porównaj zasoby oraz komunikat.

Oczekiwany wynik:

- Brak klienckiej fikcyjnej nagrody i globalnego licznika.
- Interfejs jawnie informuje o braku potwierdzenia serwera.

Źródła: [harborlight-v1-commerce.js](../harborlight-v1-commerce.js), [harborlight-v1-engagement.js](../harborlight-v1-engagement.js), [account-service.mjs](../backend/account-service.mjs).


## Samouczek — 25 prawdziwych działań

### TUT-001 — 01/25 — Wyślij mieszkańca do Gospodarstwa

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 1/25 (rules-read); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Otwórz Gospodarstwo i naciśnij +1, aby przydzielić rolnika. Wskazany strzałką przycisk rozpoczyna prawdziwą pracę.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 1 — rules-read, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-002 — 02/25 — Przydziel tragarza do Magazynu

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 2/25 (island-map); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Otwórz Magazyn i przydziel jednego tragarza. Tragarze przynoszą gotowe produkty do centrali.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 2 — island-map, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-003 — 03/25 — Uruchom obsadę Młyna

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 3/25 (first-job); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Przydziel mieszkańca do Młyna. Jedna żywność wymaga dwóch sztuk dostępnego zboża z centrali.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 3 — first-job, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-004 — 04/25 — Rozpocznij pozyskiwanie drewna

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 4/25 (food-check); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Przydziel mieszkańca do Obozu drwali, aby zapewnić stałe dostawy drewna na rozbudowę.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 4 — food-check, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-005 — 05/25 — Rozpocznij rozbudowę Ratusza

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 5/25 (townhall-upgrade); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Odbierz jednorazowe materiały i zleć rozbudowę Ratusza. Materiały bonusowe można wydawać także przy pełnym zwykłym magazynie.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 5 — townhall-upgrade, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-006 — 06/25 — Popraw szczęście mieszkańców

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 6/25 (happiness-action); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Rozdaj punkty Domu, udziel błogosławieństwa albo kup atrakcję. Wykonaj prawdziwe działanie poprawiające szczęście.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 6 — happiness-action, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-007 — 07/25 — Rozpocznij pozyskiwanie kamienia

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 7/25 (workplace-journey); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Przydziel mieszkańca do Kamieniołomu. W drodze do pracy nie ma kary bezrobocia, a podatek zaczyna płacić po dojściu.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 7 — workplace-journey, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-008 — 08/25 — Rozpocznij produkcję desek

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 8/25 (resources-dock); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Przydziel mieszkańca do Tartaku. Dwie sztuki drewna schodzą z centrali dopiero po ukończeniu deski.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 8 — resources-dock, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-009 — 09/25 — Wybierz priorytet transportu

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 9/25 (transport-priority); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Ustaw w Magazynie numerowany priorytet materiału lub Budowy.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 9 — transport-priority, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-010 — 10/25 — Odbierz prawdziwą dostawę

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 10/25 (first-delivery); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Poczekaj, aż tragarz zakończy dostawę do centrali. Samo otwarcie okna nie zalicza tego kroku.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 10 — first-delivery, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-011 — 11/25 — Dodaj kolejnego tragarza

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 11/25 (storage-limits); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Przydziel jeszcze jedną osobę do Magazynu. Ten krok wymaga nowego przydziału, wykonanego po jego rozpoczęciu.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 11 — storage-limits, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-012 — 12/25 — Ukończ przetworzony produkt

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 12/25 (food-chain); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Poczekaj na ukończenie produktu w Młynie lub Tartaku. Krok zalicza prawdziwa produkcja.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 12 — food-chain, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-013 — 13/25 — Wykorzystaj punkty Domu

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 13/25 (house-points); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Przekaż punkty szczęścia jednemu mieszkańcowi albo wszystkim. Pula odnawia się o północy Warszawy.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 13 — house-points, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-014 — 14/25 — Wybierz swoje powiadomienia

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 14/25 (personal-happiness); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Zmień jedną kategorię powiadomień w Ustawieniach. Wybór dotyczy także licznika dzwonka.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 14 — personal-happiness, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-015 — 15/25 — Rozbuduj Gospodarstwo

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 15/25 (upgrade-cost); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Gdy pozwoli na to poziom Ratusza, zleć rozbudowę Gospodarstwa z dostępnych materiałów.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 15 — upgrade-cost, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-016 — 16/25 — Zleć większy Dom

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 16/25 (construction-queue); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Zleć rozbudowę Domu. Aktywne budowy i kolejka mają osobne limity.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 16 — construction-queue, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-017 — 17/25 — Ulepsz odcinek ścieżki

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 17/25 (path-upgrade); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Wydaj 100 kamienia na odcinek. Ukończ poziom wszystkich ścieżek przed rozpoczęciem następnego.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 17 — path-upgrade, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-018 — 18/25 — Kup jedną atrakcję

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 18/25 (daily-attractions); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Wybierz atrakcję, na którą Cię stać. Jednocześnie może działać jedna nowa atrakcja.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 18 — daily-attractions, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-019 — 19/25 — Uruchom błogosławieństwo

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 19/25 (chapel-blessing); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Użyj dostępnego darmowego lub płatnego błogosławieństwa. Jedno darmowe użycie odnawia się każdego dnia Warszawy i nie kumuluje się.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 19 — chapel-blessing, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-020 — 20/25 — Wyślij towar na Targ

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 20/25 (market-rules); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Od drugiego poziomu Ratusza zleć prawdziwą dostawę na Targ. Towar przenosi jego obsada.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 20 — market-rules, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-021 — 21/25 — Rozpocznij odbudowę Latarni

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 21/25 (lighthouse-visits); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Zleć kolejny poziom Latarni. Ukończenie rozbudowy przyzna czasową premię całej wyspie.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 21 — lighthouse-visits, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-022 — 22/25 — Podejmij zadanie

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 22/25 (lighthouse-task); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Sprawdź koszt i termin, a następnie potwierdź zadanie. Jednocześnie aktywne jest jedno.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 22 — lighthouse-task, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-023 — 23/25 — Spróbuj ekspedycji

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 23/25 (expedition-rules); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Rozpocznij wybraną minigrę. Skrzynia samouczka poczeka do zakończenia ekspedycji.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 23 — expedition-rules, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-024 — 24/25 — Bezpiecznie odwołaj pracownika

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 24/25 (returning-workers); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Po ekspedycji odwołaj jednego pracownika. Tragarz z ładunkiem najpierw dokończy kurs, potem wróci do Domu.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 24 — returning-workers, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).

### TUT-025 — 25/25 — Przekaż darowiznę na zadanie

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny fixture przed krokiem 25/25 (island-review); poprzednie kroki ukończone; środki, wolni mieszkańcy i odblokowania potrzebne do tej akcji.

Kroki:

1. Otwórz samouczek i użyj Przejdź do działania.
2. Jeżeli krok ma strzałkę, sprawdź wskazany przycisk; przy kroku dostawy/produkcji obserwuj fizyczne zdarzenie. Samo czytanie nie kończy lekcji.
3. Przekaż dostępny materiał na przyjęte zadanie. Ta prawdziwa darowizna kończy Twoje wprowadzenie.
4. Porównaj ukończenie i nagrodę po rzeczywistym zdarzeniu; wczytaj zapis.

Oczekiwany wynik:

- Kończy się właściwy krok 25 — island-review, a nie sąsiednia lekcja.
- Gdy magazyn nie blokuje nagrody, podstawowa skrzynia100–300 każdego z5 materiałów jest przyznana raz. Sama skrzynia nie przyznaje Coins; koszt wykonanego polecenia rozlicza się osobno.
- Jeżeli istnieje przepełnienie, ukończenie pozostaje zapisane, a skrzynia czeka do zwolnienia warunków.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-v16-copy.js](../harborlight-v1-v16-copy.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js).


## Samouczek — przepełnienie i prowadzenie

### TUX-001 — Przepełnienie blokuje tylko następną skrzynię

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture pierwszych czterech skrzyń, ziarno57, próg magazynu przekroczony.

Kroki:

1. Odbierz legalną czwartą skrzynię.
2. Zleć upgrade i przydziel tragarzy.
3. Odbierz fizycznie zarezerwowane towary, aż oba limity przestaną blokować.

Oczekiwany wynik:

- Czwarta wypłata i jej przegląd nie znikają.
- Zarządzanie i wydawanie działają mimo przepełnienia; kolejna należna skrzynia jest odroczona i wypłacona raz po odblokowaniu.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js), [harborlight-v1-tutorial.css](../harborlight-v1-tutorial.css), [harborlight-tutorial-v18-smoke.py](../tests/harborlight-tutorial-v18-smoke.py).

### TUX-002 — Tło podpowiedzi przepuszcza kliknięcia w wyspę

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny harness ustawia pływającą podpowiedź nad hotspotem Magazynu.

Kroki:

1. Kliknij Magazyn przez nieinteraktywne tło podpowiedzi.
2. Następnie użyj właściwego przycisku samej podpowiedzi.

Oczekiwany wynik:

- Tło nie przechwytuje kliknięcia budynku.
- Przyciski podpowiedzi pozostają dostępne wskaźnikiem i klawiaturą.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js), [harborlight-v1-tutorial.css](../harborlight-v1-tutorial.css), [harborlight-tutorial-v18-smoke.py](../tests/harborlight-tutorial-v18-smoke.py).

### TUX-003 — Share daje identyczną skrzynię, nie potwierdza FB

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture odebranej skrzyni z zapamiętanym wynikiem i wolną pojemnością.

Kroki:

1. Wybierz opcję udostępnienia/podwojenia.
2. Porównaj drugi grant z pierwszym.
3. Ponów akcję i wczytaj stan.

Oczekiwany wynik:

- Drugi grant jest identyczny, bez nowego losowania i tylko raz.
- UI nie udaje potwierdzonej publikacji Facebooka.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js), [harborlight-v1-tutorial.css](../harborlight-v1-tutorial.css), [harborlight-tutorial-v18-smoke.py](../tests/harborlight-tutorial-v18-smoke.py).

### TUX-004 — Samouczek i skrzynia czekają na koniec ekspedycji

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z krokiem23 i uruchamianą minigrą.

Kroki:

1. Rozpocznij ekspedycję kończącą krok.
2. Graj i obserwuj ekran rundy.
3. Zakończ serię przez wypłatę lub rezygnację.

Oczekiwany wynik:

- Samouczek, fanfara i skrzynia nie zasłaniają aktywnej gry.
- Należna prezentacja pojawia się po zakończeniu serii.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js), [harborlight-v1-tutorial.css](../harborlight-v1-tutorial.css), [harborlight-tutorial-v18-smoke.py](../tests/harborlight-tutorial-v18-smoke.py).

### TUX-005 — Pomoc do Ratusza raz i mimo przepełnienia

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture przed piątym krokiem; środki poniżej potrzeb, magazyn przepełniony nagrodami.

Kroki:

1. Odbierz pomoc.
2. Spróbuj odebrać ją drugi raz.
3. Zleć rozbudowę Ratusza.

Oczekiwany wynik:

- Pomoc zapewnia docelowe500 Coins i materiały wymagane do kroku, Food 600 według konfiguracji.
- Nie jest powtarzalnym źródłem środków i nie jest blokowana jak następna skrzynia.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js), [harborlight-v1-tutorial.css](../harborlight-v1-tutorial.css), [harborlight-tutorial-v18-smoke.py](../tests/harborlight-tutorial-v18-smoke.py).

### TUX-006 — Wyłączenie automatu i wznowienie zachowują postęp

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z kilkoma ukończonymi lekcjami i skrzynią.

Kroki:

1. Wyłącz automatyczne pokazywanie.
2. Wczytaj zapis.
3. Otwórz samouczek ręcznie i wznów prowadzenie.

Oczekiwany wynik:

- Ukończenia i wypłaty pozostają zapisane, bez ponownej nagrody.
- Automatyczne otwieranie respektuje wybór gracza.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-tutorial-ui.js](../harborlight-v1-tutorial-ui.js), [harborlight-v1-tutorial.css](../harborlight-v1-tutorial.css), [harborlight-tutorial-v18-smoke.py](../tests/harborlight-tutorial-v18-smoke.py).


## Lojalność, zadania i udostępnianie

### SOC-001 — Lojalność losuje wszystkie sześć zasobów raz

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture kwalifikującego się dnia i Ratusz poniżej4.

Kroki:

1. Otwórz nagrodę i zanotuj draw.
2. Wczytaj stan przed odbiorem.
3. Odbierz, ponów i sprawdź sześć sald.

Oczekiwany wynik:

- Draw50–200 każdego z6 zasobów, takżeCoins, jest utrwalony.
- Powtórzenie tego dnia nic nie dopisuje.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-auth-providers.js](../harborlight-auth-providers.js).

### SOC-002 — Koniec lojalności po10 nagrodach lub Ratuszu4

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Dwa fixtures:9 odebranych dni orazRatusz3 z niewykorzystaną nagrodą.

Kroki:

1. Odbierz dziesiątą nagrodę w pierwszym.
2. Osiągnij Ratusz 4 w drugim i wczytaj stan.

Oczekiwany wynik:

- Program zamyka się po dziesiątej wypłacie albo osiągnięciu4; reset/wczytanie nie otwierają go ponownie.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-auth-providers.js](../harborlight-auth-providers.js).

### SOC-003 — Przerwa w serii i północ Warszawy

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture aktywnej lojalności z ustalonym ostatnim dniem.

Kroki:

1. Pomiń pełny dzień Warszawy.
2. Powróć i porównaj serię.
3. Sprawdź odbiór tuż przed i po północy.

Oczekiwany wynik:

- Seria uwzględnia przerwę i dzienne granice Warszawy.
- Nie ma dwóch wypłat w tym samym dniu dzięki zmianie strefy urządzenia.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-auth-providers.js](../harborlight-auth-providers.js).

### SOC-004 — Akceptacja zadania po sprawdzeniu kosztu

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture propozycji zadania i brak aktywnego zadania.

Kroki:

1. Otwórz ofertę.
2. Porównaj koszt i termin, potwierdź w dozwolonym czasie.
3. Spróbuj zaakceptować drugie zadanie.

Oczekiwany wynik:

- Samo otwarcie nie akceptuje zadania.
- Po świadomym potwierdzeniu istnieje najwyżej jedno aktywne zadanie.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-auth-providers.js](../harborlight-auth-providers.js).

### SOC-005 — Wkład do zadania nie jest wydany dwa razy

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture zaakceptowanego zadania i części dostępnych materiałów.

Kroki:

1. Wpłać materiał w dwóch ratach.
2. Spróbuj cofnąć wkład i wydać go na budowę.
3. Doprowadź osobny fixture do wygaśnięcia zadania.

Oczekiwany wynik:

- Wpłacone środki stają się wkładem i nie są dalej wydawalne.
- Wkład wygasłego zadania nie wraca fikcyjnie do magazynu.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-auth-providers.js](../harborlight-auth-providers.js).

### SOC-006 — Udostępnienie osiągnięcia wymaga działania gracza

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture osiągniętego celu; brak podłączonej strony FB.

Kroki:

1. Wybierz Udostępnij.
2. Anuluj systemowy composer lub Facebook.
3. Sprawdź komunikaty i żądania.

Oczekiwany wynik:

- Otwarcie jest zainicjowane przez gracza i wymaga jego zatwierdzenia.
- Nie ma automatycznego posta na stronie ani twierdzenia, że anulowany formularz został opublikowany.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-auth-providers.js](../harborlight-auth-providers.js).

### SOC-007 — Powiadomienia: filtr dzwonka i kasowanie

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Fixture z przeczytanymi i nieprzeczytanymi wiadomościami różnych kategorii.

Kroki:

1. Wyłącz jedną kategorię.
2. Porównaj listę z dzwonkiem.
3. Usuń przeczytane i sprawdź nieprzeczytane.

Oczekiwany wynik:

- Filtr dotyczy listy i licznika.
- Ręczne kasowanie zachowuje każdą nieprzeczytaną wiadomość; historia nie rośnie powyżej100.

Źródła: [harborlight-v1-progression.js](../harborlight-v1-progression.js), [harborlight-v1-activities.js](../harborlight-v1-activities.js), [harborlight-auth-providers.js](../harborlight-auth-providers.js).


## Retencja, wdrożenie, bezpieczeństwo i koszty

### OPS-001 — Wygasła wyspa zachowuje konto i historie

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Izolowana produkcyjna instancja testowa; jednorazowy UID z historią zakupów, kodów i jednorazowych nagród.

Kroki:

1. Przesuń serwerowy czas za3 miesiące kalendarzowe bez realnej gry.
2. Odczytaj wyspę, a po świadomym potwierdzeniu utwórz nową.

Oczekiwany wynik:

- Stara wyspa wygasa, ale konto i historie pozostają.
- Nowa generacja ma świeże środki/ludzi i nie odnawia raz odebranych uprawnień ani pierwotnego welcome.

Źródła: [account-service.mjs](../backend/account-service.mjs), [retention.mjs](../backend/retention.mjs), [google-cloud-dev.yml](../.github/workflows/google-cloud-dev.yml), [google-cloud-prod.yml](../.github/workflows/google-cloud-prod.yml), [RELEASE-PROCESS.md](../docs/RELEASE-PROCESS.md).

### OPS-002 — Stara karta nie przywraca usuniętej generacji

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Izolowany backend, zapis generacji1; backend wygasił świat i przeszedł do2.

Kroki:

1. Wyślij stary zapis, activity i kod z generacją1.
2. Odczytaj generację2.

Oczekiwany wynik:

- Stare żądania są odrzucane i nie odtwarzają poprzedniej wyspy ani nie przyznają kolejnej nagrody.

Źródła: [account-service.mjs](../backend/account-service.mjs), [retention.mjs](../backend/retention.mjs), [google-cloud-dev.yml](../.github/workflows/google-cloud-dev.yml), [google-cloud-prod.yml](../.github/workflows/google-cloud-prod.yml), [RELEASE-PROCESS.md](../docs/RELEASE-PROCESS.md).

### OPS-003 — Brak obejścia retencji pierwszym zapisem starej karty

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Izolowany backend z przekroczonym terminem3 miesięcy, bez wcześniejszego sweep/read.

Kroki:

1. Jako pierwsze żądanie po terminie wyślij activity, save lub redeemCode.
2. Odczytaj metadane po odmowie.

Oczekiwany wynik:

- Wygaśnięcie zapisuje tombstone przed odpowiedzią410.
- Aktywność nie odnawia już wygasłego świata, a transakcja nie cofa tombstone.

Źródła: [account-service.mjs](../backend/account-service.mjs), [retention.mjs](../backend/retention.mjs), [google-cloud-dev.yml](../.github/workflows/google-cloud-dev.yml), [google-cloud-prod.yml](../.github/workflows/google-cloud-prod.yml), [RELEASE-PROCESS.md](../docs/RELEASE-PROCESS.md).

### OPS-004 — Trzy konta PRE-PROD są wyłączone z retencji

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Wyłącznie wymyślone profile o technicznych UID dev-admin1–3 w lokalnym store testowym; żadnych odczytów, kopii i mutacji prawdziwych dokumentów kont.

Kroki:

1. Przesuń czas poza termin i wywołaj retencję w lokalnym modelu.

Oczekiwany wynik:

- Żadne z trzech UID nie jest wygaszane.
- Test nie jest wykonywany mutująco na prawdziwych wyspach.

Źródła: [account-service.mjs](../backend/account-service.mjs), [retention.mjs](../backend/retention.mjs), [google-cloud-dev.yml](../.github/workflows/google-cloud-dev.yml), [google-cloud-prod.yml](../.github/workflows/google-cloud-prod.yml), [RELEASE-PROCESS.md](../docs/RELEASE-PROCESS.md).

### OPS-005 — Token innego projektu lub UID odrzucony

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Wyłącznie izolowany backend lub atrapa HTTP odwzorowująca reguły PRE-PROD, kontrolowane podpisane tokeny testowe i brak połączeń do rzeczywistych kont lub wysp.

Kroki:

1. Do izolowanej atrapy API odwzorowującej reguły PRE-PROD wyślij tokeny ze złym aud/iss/terminem/podpisem oraz UID spoza trójki.
2. Wyłącznie w tym izolowanym backendzie spróbuj anonimowego zapisu i odczytaj syntetyczny store po odmowie.

Oczekiwany wynik:

- Niepoprawna tożsamość nie dostaje danych ani prawa zapisu.
- PRE-PROD dopuszcza tylko znane UID; anonimowe operacje są odrzucane.

Źródła: [account-service.mjs](../backend/account-service.mjs), [retention.mjs](../backend/retention.mjs), [google-cloud-dev.yml](../.github/workflows/google-cloud-dev.yml), [google-cloud-prod.yml](../.github/workflows/google-cloud-prod.yml), [RELEASE-PROCESS.md](../docs/RELEASE-PROCESS.md).

### OPS-006 — Obraz zawiera wszystkie moduły uruchomieniowe

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalne źródła backendu; dostęp do Docker lub testu filtrowanego pakietu.

Kroki:

1. Uruchom test backend-package.
2. Zbuduj i wystartuj obraz z --network none oraz HARBORLIGHT_ACCOUNT_API=0.
3. Odpytaj /health i /ready.

Oczekiwany wynik:

- Brak ERR_MODULE_NOT_FOUND; obraz startuje przed pobraniem poświadczeń Google.
- Testy i pliki prywatne są wyłączone z kontekstu.

Źródła: [account-service.mjs](../backend/account-service.mjs), [retention.mjs](../backend/retention.mjs), [google-cloud-dev.yml](../.github/workflows/google-cloud-dev.yml), [google-cloud-prod.yml](../.github/workflows/google-cloud-prod.yml), [RELEASE-PROCESS.md](../docs/RELEASE-PROCESS.md).

### OPS-007 — PRE-PROD wymaga CI tego samego SHA

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Wyłącznie lokalny verifier bramki promocji z atrapami odpowiedzi GitHuba; bez uruchamiania workflow i bez poświadczeń lub zmian GCP.

Kroki:

1. W lokalnym verifierze podaj syntetyczny SHA bez zielonego CI oraz inny SHA niż w zasymulowanym udanym CI.
2. Następnie sprawdź syntetyczne właściwe SHA z atrapą udanego CI. Nie wywołuj dispatch ani rzeczywistego wdrożenia.

Oczekiwany wynik:

- Verifier odrzuca brak zielonego CI oraz niezgodność SHA przed etapem dostępu do poświadczeń.
- Poprawny zestaw dowodów przechodzi wyłącznie lokalną kontrolę bramki. Test nie wysyła obrazów ani pakietu i nie zmienia chmury.

Źródła: [account-service.mjs](../backend/account-service.mjs), [retention.mjs](../backend/retention.mjs), [google-cloud-dev.yml](../.github/workflows/google-cloud-dev.yml), [google-cloud-prod.yml](../.github/workflows/google-cloud-prod.yml), [RELEASE-PROCESS.md](../docs/RELEASE-PROCESS.md), [harborlight-promotion.test.mjs](../tests/harborlight-promotion.test.mjs).

### OPS-008 — PROD nie przebudowuje i nie pomija dowodu PRE-PROD

**P0 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Test bramki promocji, bez wykonywania prawdziwego wdrożenia PROD.

Kroki:

1. Podaj niepełne receipt lub brak jednego artefaktu.
2. Podmień hash/commit.
3. Sprawdź prawidłową parę w testowym verifierze.

Oczekiwany wynik:

- Brak lub podmiana są odrzucone.
- Poprawna promocja używa identycznego archiwum i digestu obrazu; API musi mieć własny dowód PRE-PROD.

Źródła: [account-service.mjs](../backend/account-service.mjs), [retention.mjs](../backend/retention.mjs), [google-cloud-dev.yml](../.github/workflows/google-cloud-dev.yml), [google-cloud-prod.yml](../.github/workflows/google-cloud-prod.yml), [RELEASE-PROCESS.md](../docs/RELEASE-PROCESS.md).

### OPS-009 — Plan i odczyt budżetu alertowego 100 USD dla obu projektów

**P0 · Nie wykonano · Lokalne atrapy/dry-run oraz osobny prywatny odczyt właściciela**

Środowisko: DEV — atrapy/dry-run; po osobnym zastosowaniu prywatny odczyt Billing. Konto/dane: Syntetyczne odpowiedzi Billing; rzeczywisty odczyt tylko przez uprawnionego właściciela.

Stan zakresu: Uzgodniony plan 100 USD/miesiąc dla obu projektów; zastosowanie niepotwierdzone.

Warunki: Aktualny uzgodniony plan to miesięczny budżet alertowy 100 USD łącznie dla harborlight-dev i harborlight-prod. Jego zastosowanie w GCP nie jest potwierdzone w tym planie. Test konfiguracji wykonuje się wyłącznie na atrapach lub w domyślnym dry-run; autoryzowane zastosowanie narzędziem właścicielskim jest osobną operacją poza fixture.

Kroki:

1. Na lokalnych odpowiedziach testowych uruchom domyślny podgląd/dry-run przygotowanego narzędzia. Sprawdź kwotę 100 USD, miesięczny okres, prawidłowe konto rozliczeniowe oraz wspólny filtr obejmujący harborlight-dev i harborlight-prod.
2. Sprawdź uzgodnione progi i adresatów alertów w podglądzie. Potwierdź, że próba lokalna nie wysyła zapisu do prawdziwego Billing, nie tworzy dwóch niezależnych budżetów po 100 USD i nie uruchamia wyłączenia usług.
3. Dopiero po osobnym, autoryzowanym zastosowaniu przez narzędzie właściciel odczytuje rzeczywistą konfigurację w swojej prywatnej konsoli: walutę USD, kwotę 100, okres miesięczny i oba projekty. Bez potwierdzonego zastosowania część rzeczywistego odbioru pozostaje Nie wykonano lub Zablokowano.
4. Porównaj odczytany budżet z planem bez publikowania sald i raportów kosztowych. Potwierdź, że alert jest informacją o przekroczeniu progu, a nie gwarantowanym twardym limitem rachunku.

Oczekiwany wynik:

- Lokalny plan opisuje jeden miesięczny budżet alertowy 100 USD obejmujący łącznie oba projekty. Dry-run nie wykonuje mutacji w GCP.
- Odbiór rzeczywistej konfiguracji wymaga osobnego odczytu po faktycznym autoryzowanym zastosowaniu. Sama atrapa lub gotowy skrypt nie oznaczają utworzonego budżetu.
- Budżet nie zatrzymuje automatycznie naliczania opłat ani usług; możliwe są dalsze koszty i opóźnienie raportowania. Prywatne rzeczywiste wydatki nie trafiają do publicznych scenariuszy ani Excela.

Źródła: [AGENTS.md](../AGENTS.md), [GOOGLE-CLOUD.md](../docs/GOOGLE-CLOUD.md).

### OPS-010 — Raport kosztów odróżnia wydatek od kredytów

**P1 · Nie wykonano · Manualnie — prywatny odczyt właściciela**

Środowisko: Google Cloud Billing — odczyt. Konto/dane: Uprawniony właściciel; bez zmian.

Stan zakresu: Rzeczywisty raport odczytuje właściciel w prywatnej konsoli; nie publikuje jego wartości.

Warunki: Właścicielski dostęp do raportu Billing, bez modyfikacji zasobów.

Kroki:

1. Ustaw bieżący miesiąc i projekty harborlight-dev/prod.
2. Porównaj koszt naliczony, kredyty oraz kwotę netto i datę aktualizacji.
3. Nie przenoś rzeczywistych kwot, sald, danych konta rozliczeniowego ani zrzutów raportu do publicznych plików; odnotuj jedynie wykonanie prywatnej kontroli.

Oczekiwany wynik:

- Raport nie myli0 dozapłaty z zerowym zużyciem zasobów.
- Kwota ma podany okres, walutę, zakres i opóźnienie danych.

Źródła: [GOOGLE-CLOUD.md](../docs/GOOGLE-CLOUD.md).


## Interfejs i zgodność opisów

### UI-001 — PL i EN wszystkich głównych paneli

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Lokalny rozwinięty fixture oraz widoki desktop/mobile.

Kroki:

1. Przejdź przez12 budynków, mieszkańców, Ustawienia, premium, zadania i obie minigry.
2. Zmień język w obie strony.

Oczekiwany wynik:

- Etykiety, komunikaty, jednostki i popupy odpowiadają wybranemu językowi.
- Imiona i nazwy wprowadzone przez gracza nie są tłumaczone.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-v1-play.css](../harborlight-v1-play.css), [harborlight-v1-i18n.js](../harborlight-v1-i18n.js), [ECONOMY-RULES.md](../docs/ECONOMY-RULES.md).

### UI-002 — Przyciski menu mieszczą się w ramce

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Widoki1366×768 i1536×864.

Kroki:

1. Otwórz menu wyspy.
2. Sprawdź dolne Magazyn i Handel oraz wszystkie przyciski.

Oczekiwany wynik:

- Żaden przycisk nie wystaje poza ciało dialogu lub ramkę.
- Wszystkie są dostępne myszą i klawiaturą.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-v1-play.css](../harborlight-v1-play.css), [harborlight-v1-i18n.js](../harborlight-v1-i18n.js), [ECONOMY-RULES.md](../docs/ECONOMY-RULES.md).

### UI-003 — Mobile390/360 bez poziomego przewijania

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Telefon albo emulacja390×844 i360×740.

Kroki:

1. Otwórz menu, producenta, budowę, płatność i dokumenty.
2. Obróć ekran i wróć.

Oczekiwany wynik:

- Brak poziomego przewijania strony i ukrytych kluczowych kontrolek.
- Dotyk i fokus pozostają dostępne po zmianie rozmiaru.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-v1-play.css](../harborlight-v1-play.css), [harborlight-v1-i18n.js](../harborlight-v1-i18n.js), [ECONOMY-RULES.md](../docs/ECONOMY-RULES.md).

### UI-004 — Opisy odpowiadają aktualnym liczbom

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: v18 — implementacja; wynik tego scenariusza nie został wpisany.

Warunki: Rozwinięty lokalny fixture; dostęp do informacji i tabel.

Kroki:

1. Porównaj H+100/−100, reguły nowych mieszkańców, progi Kaplicy, koszt czasu i pulę ekspedycji z wynikami modelu.

Oczekiwany wynik:

- Opisy uwzględniają przybycie30 min kontra odejście1 h, welcome/Latarnię,3+poziom łaski,30 s/10 Coins oraz pulę50/150/350/750.
- Nie sugerują starego systemu lojalności ani ograniczonej liczby darmowych błogosławieństw na poziom.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-v1-play.css](../harborlight-v1-play.css), [harborlight-v1-i18n.js](../harborlight-v1-i18n.js), [ECONOMY-RULES.md](../docs/ECONOMY-RULES.md).

### UI-005 — Brak mylącego logowania w ustawieniach zalogowanego

**P1 · Nie wykonano · Lokalnie**

Środowisko: DEV — izolowany fixture. Konto/dane: Syntetyczna wyspa; bez kont chmurowych.

Stan zakresu: Nowy zakres 2026-10-30 — odbiór wymagany; publikacja PRE-PROD niepotwierdzona.

Warunki: Atrapa prawidłowej sesji chmurowej oraz lokalny podgląd jako osobna próba.

Kroki:

1. Otwórz Ustawienia.
2. Sprawdź komunikat miejsca zapisu i akcje konta.

Oczekiwany wynik:

- Zalogowany gracz widzi informacje o chmurze i wylogowanie.
- Brak przycisku rejestracji/logowania wewnątrz zalogowanej gry; lokalny podgląd nie udaje trwałego zapisu.

Źródła: [harborlight-v1-play.js](../harborlight-v1-play.js), [harborlight-v1-play.css](../harborlight-v1-play.css), [harborlight-v1-i18n.js](../harborlight-v1-i18n.js), [ECONOMY-RULES.md](../docs/ECONOMY-RULES.md).

