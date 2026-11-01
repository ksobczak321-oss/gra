# DEV i PRE-PROD 0.11.0.0 /v27 — odbiór zakończony

**DEV i PRE-PROD 0.11.0.0 odebrane — 2 listopada 2026, Europe/Warsaw.** Źródło [`c7c39742594599c54ee8b074b5c313efd88af4cb`](https://github.com/ksobczak321-oss/gra/commit/c7c39742594599c54ee8b074b5c313efd88af4cb): [CI 41361938909](https://github.com/ksobczak321-oss/gra/actions/runs/41361938909) **SUCCESS, 10 min 9 s**, [Pages 41361938868](https://github.com/ksobczak321-oss/gra/actions/runs/41361938868) **SUCCESS, 21 s**, [bridge 41362763426](https://github.com/ksobczak321-oss/gra/actions/runs/41362763426) **SUCCESS, 16 s**, [PRE-PROD 41362782175, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41362782175) **SUCCESS, 2 min 17 s**. Pełne źródło wdrożenia potwierdzono.

Nieprzesuwane tagi [`dev-0.11.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/dev-0.11.0.0-20261102) i [`preprod-0.11.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/preprod-0.11.0.0-20261102) są **opublikowane i potwierdzone zdalnie**; oba wskazują dokładnie `c7c39742594599c54ee8b074b5c313efd88af4cb`.

Pierwotne GO opisów z1 listopada obejmowało DEV. Późniejsze **„promuj na pre prod”** autoryzowało standardową promocję bez resetu i PROD. Poprawka checkera nie zmienia publicznej gry, kont, reguł Firestore ani bramek CI/WIF.

[Wymagania v27](FRONTEND-V27-REQUIREMENTS.md) · [Rejestr środowisk](ENVIRONMENT-STATUS.md) · [Karty zmian](tracking/CHANGE-REGISTER.md) · [Ręczny odbiór](testing/START-HERE.md).

## Źródła zatwierdzonego zakresu

GO użytkownika brzmi **„tu masz z drobnymi poprawkami; GO”**. Pełny wcześniejszy projekt jest bazą; poprawiona wklejka nadpisuje wskazane fragmenty. Nieprzepisane opisy pozostają zaakceptowane. Powtórzony opis zegara T10 nie usuwa właściwego T10 o misjach; pusty T34 zachowuje opis Menu wyspy. [Zasada połączenia](approval/v27-approval-record.md) rozróżnia treść użytkownika, redakcję i wybory integracyjne.

| Migawka źródła, zachowana bajtowo | Rozmiar | SHA-256 |
|---|---:|---|
| [Pełny projekt opisów](approval/v27-proposed-copy.pl.md) | 37 766 bajtów | `4f2c5aec3040227a660706217faa2ecc63ef21a87efcf648cb6e8e5a22314e2e` |
| [Poprawki użytkownika](approval/v27-user-edits.pl.md) | 15 335 bajtów | `5b4d4bf95226fbb154c62037b36d33ab7e4275c954207274e70b8a0c990ca572` |

Oba rozmiary i hashe sprawdzono lokalnie z plikami wejściowymi. Archiwum akceptacji dowodzi źródła wymagań, nie publikacji aplikacji ani sukcesu testu gry.


## Potwierdzone wyniki i granice dowodu

| Kontrola | Wynik |
|---|---|
| Końcowy lokalny Node po naprawie checkera | **1023/1023 PASS,19,92s**. Wcześniejszy lokalny odbiór aplikacji miał1017; późniejszy wynik obejmuje poprawkę kontrolera. |
| Skupione regresje kontrolera kont | **26/26 PASS**: legalne koperty1/2, wielowyspowe API, ścisłe odrzucanie uszkodzeń i bezpieczne adnotacje bez surowych odpowiedzi. |
| Python | **141 PASS w11 zestawach**; suma2+14+23+12+17+12+12+10+13+8+18. |
| Lokalny inwentarz Chromium | **27/27 nazwanych zestawów PASS** po poprawkach i kierunkowych ponowieniach. Inwentarz niżej wskazuje rzeczywiste pochodzenie każdego wyniku; warianty ekranowe nie są osobnymi zestawami. Publiczna aplikacja nie zmieniła się przy poprawce checkera. |
| Własny CI c7c3974 | **SUCCESS10m9s**, w tym obie pełne grupy przeglądarkowego odbioru pakietu. To własny wynik końcowego źródła. |
| Rzeczywisty PRE-PROD | **SUCCESS2m17s**: dokładny manifest/publiczne pliki, hostowany Chromium oraz stałe konta i izolacja zapisu przeszły. |
| Polska wersja i odzyskiwanie |114 rzeczywistych widoków PL, zero wykrytych angielskich pozostałości;8 sond nawigacji/restartu/utratyACK PASS. |
| Generatory | Rejestr297 kart,70 przypadków ręcznych i dokumenty prawne zgodne z generatorami; dokumenty prawne nadal są szkicami. |
| Ręczny odbiór | **70 NOT RUN**. Odczytowe kontrole wdrożenia nie zastępują ręcznego testu zapis→ponowne wczytanie ani odbioru fizycznej planszówki. |

Kontrola stałych kont i izolacji zapisu **przeszła** w tym wdrożeniu, podobnie jak dokładny manifest/publiczne pliki oraz rzeczywisty hostowany Chromium. Odbiór kont zakończył się 1 listopada o23:36:47Z, czyli 2 listopada o00:36:47 w Warszawie; publikacja receipt i artefaktów zakończyła się sukcesem do23:36:50Z. Są to kontrole odczytowe, bez zapisu gry lub resetu. Ręczny test zapis→ponowne wczytanie nadal NOT RUN.

## Inwentarz 27 nazwanych zestawów Chromium

Każdy wiersz ma własny wynik **PASS**. To suma dowodów po poprawkach i kierunkowych ponowieniach, nie deklaracja jednego czystego przebiegu wszystkich testów na final2. Kolumna wskazuje rzeczywiste pochodzenie wyniku: bazowy `frontend-v27-validation`, ponowienie `frontend-v27-release-candidate` albo ostatni `frontend-v27-final2`. Niezmienione części zachowują wcześniejszy lokalny wynik; zmienione zachowania otrzymały ponowienie.

| Zestaw w `tests/` | Wynik | Przebieg dowodowy |
|---|---|---|
| [harborlight-frontend-v17-smoke.py](../tests/harborlight-frontend-v17-smoke.py) | PASS | Ponowienie krytyczne z kandydata |
| [harborlight-frontend-v18-smoke.py](../tests/harborlight-frontend-v18-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-tutorial-v18-smoke.py](../tests/harborlight-tutorial-v18-smoke.py) | PASS | Ponowienie krytyczne z kandydata |
| [harborlight-tutorial-v21-smoke.py](../tests/harborlight-tutorial-v21-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-tutorial-v22-smoke.py](../tests/harborlight-tutorial-v22-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-tutorial-priority-v22-smoke.py](../tests/harborlight-tutorial-priority-v22-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-tutorial-map-v25-smoke.py](../tests/harborlight-tutorial-map-v25-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-learning-review-v26-smoke.py](../tests/harborlight-learning-review-v26-smoke.py) | PASS | Ponowienie krytyczne z kandydata |
| [harborlight-learning-flow-v26-smoke.py](../tests/harborlight-learning-flow-v26-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-starter-course-v26-smoke.py](../tests/harborlight-starter-course-v26-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-learning-feedback-v27-smoke.py](../tests/harborlight-learning-feedback-v27-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-learning-flow-v27-smoke.py](../tests/harborlight-learning-flow-v27-smoke.py) | PASS | Ponowienie krytyczne z kandydata |
| [harborlight-missions-ui-v27-smoke.py](../tests/harborlight-missions-ui-v27-smoke.py) | PASS | Ponowienie krytyczne z kandydata |
| [harborlight-missions-game-v27-smoke.py](../tests/harborlight-missions-game-v27-smoke.py) | PASS | Ponowienie krytyczne z kandydata |
| [harborlight-dev-auth-smoke.py](../tests/harborlight-dev-auth-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-dev-game-smoke.py](../tests/harborlight-dev-game-smoke.py) | PASS | Ponowienie krytyczne z kandydata |
| [harborlight-settings-signout-smoke.py](../tests/harborlight-settings-signout-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-v18-auth-smoke.py](../tests/harborlight-v18-auth-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-onboarding-v20-smoke.py](../tests/harborlight-onboarding-v20-smoke.py) | PASS | Ponowienie krytyczne z kandydata |
| [harborlight-v21-features-smoke.py](../tests/harborlight-v21-features-smoke.py) | PASS | Końcowy pakiet final2 |
| [harborlight-help-v24-smoke.py](../tests/harborlight-help-v24-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-community-v24-smoke.py](../tests/harborlight-community-v24-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-charity-v24-smoke.py](../tests/harborlight-charity-v24-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-manual-checklist-smoke.py](../tests/harborlight-manual-checklist-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-polish-panels-smoke.py](../tests/harborlight-polish-panels-smoke.py) | PASS | Końcowy pakiet final2 |
| [harborlight-economy-review-v26-smoke.py](../tests/harborlight-economy-review-v26-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |
| [harborlight-housing-v27-smoke.py](../tests/harborlight-housing-v27-smoke.py) | PASS | Bazowy pakiet; zachowany wynik części bez zmiany |

Dodatkowo `learning-flow-v27` otrzymał na final2 **8 sond nawigacji, restartu i odzyskiwania po utracie ACK — PASS, 17,50 s**; filtr `HARBORLIGHT_LEARNING_RECOVERY_ONLY=1` nie zastępuje wcześniejszego pełnego wyniku zestawu. Końcowe `v21-features` PASS trwało 20,81 s, a audyt polskich paneli PASS 35,05 s: **114 rzeczywistych widoków PL, zero wykrytych angielskich pozostałości**. Ostatnia poprawka obejmuje oba opisy dwuminutowej drogi do pracy i pełne polskie komunikaty wyceny transportu/przyspieszenia.

Pierwszy pełny przebieg zawierał 20 sukcesów i 7 niepowodzeń. Naprawiono sześć nieaktualnych założeń/fixture testów oraz rzeczywisty błąd odzyskiwania zapisu; następnie ponowiono obszary zmienione i krytyczne. Nie usuwamy nieudanych prób z historii ani nie przypisujemy ich sukcesu wcześniejszemu wydaniu. Roboczy inwentarz `/tmp/harborlight-v27-browser-inventory.json` i logi `/tmp/harborlight-v27-browser-final.log`, `/tmp/harborlight-v27-browser-last-probes.log` nie są dowodem CI.


## Rzeczywiste reguły sprawdzanej implementacji

- Ratusz wyznacza limit ludności niezależnie od łóżek. Dotyczy to naturalnych przybyć, zaproszeń, uratowanych rozbitków i pasażerów z rezerwacją miejsc. Pełny Dom sam nie zmienia rozbitka w rekompensatę; decyduje wolny limit Ratusza po rezerwacjach. Stabilne identyfikatory wyznaczają zakwaterowanie; zmiana pracy nie losuje nowych łóżek. Bez łóżka własna praca i zwykły przewóz mają wydajność ×0,5, a posiłki ×2. Dawna globalna kara szczęścia za każdą osobę bez łóżka została zastąpiona zgodnie z odpowiedzią użytkownika.
- Punkty Domu dotyczą zakwaterowanych. Rozbudowa nie przyznaje dodatkowej puli w połowie dnia; nowa liczba obowiązuje po odnowieniu o północy Warszawy. Migracja zachowuje już wydane punkty. Powitalne minimum, głód, bezrobocie, przestój i wymuszone 100% pozostają osobnymi efektami.
- Dojście i powrót każdego pracownika trwają 120 sekund, także dla pierwszych sześciu tragarzy. Zwykły bazowy kurs ładunku nadal trwa 300 sekund; czasy turbo są osobnym mechanizmem. Załadowany odwołany tragarz najpierw kończy dostawę.
- Nowy rejs pasażerów trwa 30 minut i zabiera 0,5 żywności dla osoby z łóżkiem albo 1 dla osoby bez łóżka według stanu odpłynięcia. Stare rejsy zachowują wcześniej opłacone posiłki, tożsamości i czas; nie są przeliczane ani obciążane drugi raz.
- Rozdział Latarni zapamiętuje poziom Ratusza oraz następny poziom Latarni w chwili aktywacji. Pierwszy wymaga Ratusza co najmniej 2 i zakończenia albo świadomego zamknięcia samouczka. Wcześniejsze działania mogą spełnić warunek; misje nie blokują klasycznej rozbudowy. Główne 8 etapów, pomocnicze 5 i ratunkowe 3 zachowują wcześniejszy postęp oraz jednokrotne nagrody.
- Termin dotyczy aktywnego etapu: **600 sekund–7 dni**. Dla produkcji i dostaw zachowawczy plan zaczyna ocenę od **6 godzin**. Uwzględnia dostępne zapasy, wspólne wsady i posiłki, mieszkańców, dojście, tragarzy i pojemność. Nie zakłada płatnych premii, przyszłego imigranta, losowej nagrody lub handlu. To ograniczony konserwatywny plan, nie pełny solver strategii. Może odrzucić wykonalny innym sposobem cel. Przyjęte ilości i termin pozostają stałe.
- Cel budowy sprawdza pełne `completionTotal` z kolejką; nieznany/nieskończony czas blokuje przyjęcie także przy gotowych zapasach. Cel przydziału wymaga realnej wolnej osoby w Domu lub wystarczającej istniejącej obsady. Modlący się i zwiedzający Latarnię nie tworzą dostępnej załogi.
- Odzyskiwanie zapisu po niepewnym ACK odczytuje stan przed ponowieniem. Równoległy błąd aktywności nie jest kasowany samym sukcesem zapisu, a poprawne odzyskiwanie przywraca potwierdzony stan bez blokady UI, resetu i nadpisania nowszego zapisu innej karty.
- Statek z plagą w misjach jest na tym etapie narracją prowadzącą do pomocy. Nie dodaje odrębnej epidemii ani strat. Istniejąca plaga związana z Kaplicą działa bez zmiany reguły.


## Ręczne scenariusze i rejestr

Zakres gry ma karty HL-CHG-0951–0967, a poprawka checkera osobny BugHL-CHG-0968. Te18 kart ma implemented /verified_own_ci_and_pages /passed_source_c7c3974 /deployed_source_c7c3974; PROD not_deployed. Historia wcześniejszych źródeł i nieudanej promocji pozostaje osobna.

HL-TC-0060–0062 obejmują opisy, Pomoc i skutki;0063–0065 dojście, łóżka, pracę i posiłki;0066 ETA;0067–0069 misje8/5/3 i wykonalność;0070 migrację i trwałość. [Plan](testing/MANUAL-TEST-PLAN.md) i [interaktywna lista](testing/qa-checklist.html) nadal mają **70 wyników NOT RUN** dla konkretnego buildu do samodzielnego wykonania.

## Dokładny pakiet i artefakty wydania

**61 plików z manifestem / 60 plików treści / 11 219 303 bajty**. Lokalny TAR SHA-256 `794d1e30f9af8d21d64caac2b073fbee17d4127566333de73f93393beb4d260b`; manifest SHA-256 `f83609519dd2becb96ea3532b1b746d63128f8631311720090c5c88e4e45c62e`. Archiwum zweryfikowano i rozpakowano; wszystkie 60 plików treści są identyczne bajtowo z testowanym final2, a 59 publicznych źródeł gry nie zmieniło się w poprawce checkera.

| Artefakt próby 1 | Publiczne ID GitHub | SHA-256 archiwum ZIP podany przez GitHub |
|---|---:|---|
| `harborlight-dev-frontend-41362782175-1` | 13106171196 | `308d5b66fab731689b7d2f67343936d3b1141ca9e986d300d5a25393daeb1840` |
| `harborlight-dev-release-41362782175-1` | 13105684537 | `546c85f8005efa6a9c6daf2dbc5394b54e214ec26e7ce2a59eb0ff2f3ed19252` |

Są to publiczne digests ZIP GitHub, odrębne od lokalnego TAR i manifestu aplikacji. Wewnętrznego ZIP receipt ani digestu obrazu backendu nie pobrano i nie odczytano niezależnie. Rzeczywista flaga API kont także pozostaje nieodczytana niezależnie.

## Historia awarii i osobne źródła

Poprzednie źródło `7d45290b911e359a8940f28551df4692053cadb2` zachowuje [nieudany deploy 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479): **FAILURE** w kroku24 kontroli stałych kont po udanej publikacji Hostingu, kontroli dokładnego wydania i hostowanym Chromium. Jego CI41360046508 SUCCESS10m31s, Pages41360046453 SUCCESS47s i bridge41360957057 SUCCESS18s są odrębnymi dowodami. Nie utworzono receipt ani tagu tej nieudanej próby. Bazowe źródło `6ff5ae976e31add7fb93e3872e0d9046a25edd37` ma CI41359303259 **CANCELLED** i Pages41359303232 SUCCESS30s. Nie przepisujemy żadnego z tych wyników na sukces c7c3974.

Nieudany checker ograniczał kopertę do1 przy obecnym kliencie2. Znany problem odtworzono i naprawiono bez osłabienia kontroli izolacji. Pierwotny prywatny wierszERROR nie został przekazany; nie przedstawiamy go jako niezależnie odczytanego. W kolejnej standardowej promocji kontrola kont faktycznie przeszła. [Pełny incydent i rozwiązanie](PREPROD-V27-INCIDENT-20261102.md).

Bazowe lokalne logi i inwentarz `/tmp/harborlight-v27-browser-inventory.json` nie są trwałym artefaktem Git ani dowodem CI. Pierwszy pełny lokalny przebieg miał20 sukcesów i7 niepowodzeń; naprawiono sześć nieaktualnych fixture i rzeczywiste odzyskiwanie zapisu, a zmienione obszary ponowiono. Pierwsza próba housing smoke miała błędną nawigację mobilną testu, poprawioną bez zmiany gry. Własne końcowe CI i odczytowe wdrożenie powyżej są odrębnymi, rzeczywistymi dowodami.

Rejestr zawiera **297 kart zmian**, w tym HL-CHG-0951–0968 dla tego zakresu i poprawki checkera. Wszystkie **70 ręcznych wyników pozostają NOT RUN**. Nie resetowano kont, wysp, haseł ani historii; PROD bez zmian.
