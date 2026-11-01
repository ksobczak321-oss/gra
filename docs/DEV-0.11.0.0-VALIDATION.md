# DEV 0.11.0.0 / v27 — lokalny odbiór zakończony

**PRE-PROD — niepełna promocja, 2 listopada 2026 (Europe/Warsaw).** [deploy PRE-PROD 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479), źródło `7d45290b911e359a8940f28551df4692053cadb2`, ma **FAILURE** w kroku24 „Verify permanent DEV accounts and cloud save isolation”. Hosting został wcześniej opublikowany; kontrola dokładnego wydania i rzeczywisty test hostowanej gry przeszły. Frontend0.11.0.0 może więc już być serwowany, ale pełnego odbioru PRE-PROD nie zaliczono. Artefakty/receipt pominięto; tagów i resetu brak. [incydent promocji](PREPROD-V27-INCIDENT-20261102.md).

Automatyczny [bridge 41360957057](https://github.com/ksobczak321-oss/gra/actions/runs/41360957057) ma **SUCCESS, 18 s**. Uruchomiony [deploy PRE-PROD 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479) ma **FAILURE po publikacji Hostingu**, z publicznie potwierdzonym źródłem `7d45290b911e359a8940f28551df4692053cadb2`. [gate 125011066732](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479/job/125011066732) ma **SUCCESS**, zadanie [deploy125011120868](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479/job/125011120868) zakończyło się błędem kroku24. Potwierdzono właściwe źródło, ale końcowy odbiór tego wdrożenia nie przeszedł. Pełne wdrożenie GCP zakończone błędem; brak receipt i tagów v27.

**Odbiór operacyjny: 2 listopada 2026, Europe/Warsaw.** Źródło `7d45290b911e359a8940f28551df4692053cadb2` ma własne [CI 41360046508](https://github.com/ksobczak321-oss/gra/actions/runs/41360046508) **SUCCESS, 10 min 31 s** oraz [Pages 41360046453](https://github.com/ksobczak321-oss/gra/actions/runs/41360046453) **SUCCESS, 47 s**. Obie grupy testów przeglądarkowych pakietu przeszły w CI tego źródła. Automatyczny [bridge 41360957057](https://github.com/ksobczak321-oss/gra/actions/runs/41360957057) ma **SUCCESS, 18 s**. Wdrożenie PRE-PROD nadal oczekuje na odrębny wynik GCP; tagów v27 nie utworzono.

Stan roboczy z **1 listopada 2026, Europe/Warsaw**. Pierwotne GO obejmowało DEV i normalne Git/CI/Pages, bez promocji GCP. Późniejsze polecenie „promuj na pre prod” autoryzuje standardową promocję kandydata opisaną niżej; reset, PROD i integracja planszówki online pozostają poza zakresem. Numer aplikacji to **0.11.0.0**, cache **`frontend-v27`**, schemat świata pozostaje **9**. Lokalny odbiór zakończono: **1017 Node, 141 Python i 27 nazwanych zestawów Chromium PASS**, po poprawkach i kierunkowych ponowieniach. Źródło [`6ff5ae976e31add7fb93e3872e0d9046a25edd37`](https://github.com/ksobczak321-oss/gra/commit/6ff5ae976e31add7fb93e3872e0d9046a25edd37) wysłano do `main`; własne [CI 41359303259](https://github.com/ksobczak321-oss/gra/actions/runs/41359303259) ma **CANCELLED**, a [Pages 41359303232](https://github.com/ksobczak321-oss/gra/actions/runs/41359303232) zakończyło się **SUCCESS, 30 s**, zgodnie z odczytem GitHub. Tag v27 nie został jeszcze utworzony.

[Wymagania v27](FRONTEND-V27-REQUIREMENTS.md) · [Rejestr środowisk](ENVIRONMENT-STATUS.md) · [Karty zmian](tracking/CHANGE-REGISTER.md) · [Ręczny odbiór](testing/START-HERE.md).

## Źródła zatwierdzonego zakresu

GO użytkownika brzmi **„tu masz z drobnymi poprawkami; GO”**. Pełny wcześniejszy projekt jest bazą; poprawiona wklejka nadpisuje wskazane fragmenty. Nieprzepisane opisy pozostają zaakceptowane. Powtórzony opis zegara T10 nie usuwa właściwego T10 o misjach; pusty T34 zachowuje opis Menu wyspy. [Zasada połączenia](approval/v27-approval-record.md) rozróżnia treść użytkownika, redakcję i wybory integracyjne.

| Migawka źródła, zachowana bajtowo | Rozmiar | SHA-256 |
|---|---:|---|
| [Pełny projekt opisów](approval/v27-proposed-copy.pl.md) | 37 766 bajtów | `4f2c5aec3040227a660706217faa2ecc63ef21a87efcf648cb6e8e5a22314e2e` |
| [Poprawki użytkownika](approval/v27-user-edits.pl.md) | 15 335 bajtów | `5b4d4bf95226fbb154c62037b36d33ab7e4275c954207274e70b8a0c990ca572` |

Oba rozmiary i hashe sprawdzono lokalnie z plikami wejściowymi. Archiwum akceptacji dowodzi źródła wymagań, nie publikacji aplikacji ani sukcesu testu gry.

## Potwierdzone kontrole lokalne i granice dowodu

| Kontrola | Bieżący wynik |
|---|---|
| Pełna regresja Node i backendu po integracji | **1017 PASS** — końcowy lokalny przebieg po integracji, 20,46 s. Wynik 954 z v26 pozostaje historyczny. Nowa zmiana kodu wymaga właściwego ponowienia. |
| Python: konfiguracja, pakowanie, konta i importer | **141 PASS w 11 zestawach**. Suma z logu: 2+14+23+12+17+12+12+10+13+8+18. To kontrole lokalne, bez nowej aktywacji GCP. |
| Chromium: [housing v27](../tests/harborlight-housing-v27-smoke.py) | **PASS** — rzeczywista aplikacja, PL/EN na komputerze i telefonie, dwa stany Domu: 48 osób/24 łóżka/24 punkty/72 żywności na godzinę oraz ukończony Dom 2 po północy Warszawy: 48 łóżek/48 punktów/48 żywności. Rzeczywiste kliknięcie przydziału zmienia tylko uprawnioną osobę, zachowuje 48 tożsamości i zapisuje wynik w izolowanym Firebase. |
| Chromium: [learning feedback v27](../tests/harborlight-learning-feedback-v27-smoke.py) | **PASS** — skutki Ratusza, Latarni, Domu i Kaplicy, kolejka objaśnień, strzałki w granicach ekranu, brak mutacji świata przez opis, wznowienie i przypomnienie po wyjściu; PL/EN na komputerze i telefonie. To test komponentów z rzeczywistym modelem. |
| Chromium: [learning flow v27](../tests/harborlight-learning-flow-v27-smoke.py) | **PASS** — zintegrowana aplikacja: dwa wejścia w Pomocy, 34 kroki z Czat i dynamicznymi zasobami, zachowany kursor i historia, przegląd praktyczny, faktyczny czas budowy oraz nagroda przed objaśnieniem efektu; PL/EN na komputerze i telefonie. Firebase jest izolowany. |
| Wymagany inwentarz Chromium po poprawkach | **27/27 nazwanych zestawów PASS** — bazowe wyniki oraz właściwe ponowienia krytycznych i zmienionych obszarów. Szczegóły i granice dowodu podaje inwentarz niżej; konfiguracje ekranowe nie są osobnymi zestawami. |
| Generatory rejestru zmian, listy ręcznej i dokumentów prawnych | `--check` **PASS**. Rejestr ma **296 kart**, lista ma **70 przypadków**; dokumenty prawne pozostają szkicami, nie odbiorem prawnym. |
| Ręczny odbiór właściciela | **70 NOT RUN**. Automaty nie zmieniają wyników ręcznego przeklikania. Integracja planszówki online nadal poza GO. |

Lokalne logi robocze m.in. `/tmp/harborlight-v27-node-release.log`, `/tmp/harborlight-v27-python-final.log`, `/tmp/harborlight-learning-feedback-v27.log` i `/tmp/harborlight-learning-flow-v27.log` nie są trwałymi artefaktami Git ani dowodem CI. Pierwsza próba housing smoke zatrzymała się na ukrytym desktopowym przycisku użytym przez test mobilny. Po zmianie testu na rzeczywistą ścieżkę Menu wyspy → Mieszkańcy wszystkie warianty przeszły. Nie była to zmiana kodu gry.

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

Nowy zakres ma osobne karty **HL-CHG-0951–0967**. Po zakończonym odbiorze lokalnym te 17 kart ma **implemented / verified_locally**, a własne CI **passed_source_7d45290**. DEV ma verified_own_ci_and_pages; PRE-PROD ma failed_after_hosting_source_7d45290, PROD pozostaje not_deployed. Nie zmieniamy statusów pozostałych historycznych kart ani wyników ręcznych.

| Scenariusze | Przedmiot odbioru |
|---|---|
| HL-TC-0060–0062 | Zatwierdzone opisy, 34 kroki, dynamiczne dane, Pomoc, wznowienie i skutki działań. |
| HL-TC-0063–0065 | Dwie minuty dojścia/powrotu, łóżka, punkty Domu, indywidualna praca i posiłki. |
| HL-TC-0066 | Stabilne i prawdziwe prognozy dostaw oraz budowy. |
| HL-TC-0067–0069 | Zapamiętany cel Latarni, ścieżki 8/5/3, terminy i wykonalność zadań. |
| HL-TC-0070 | Migracja, nieobecność, trwałość tożsamości i brak ponownego rozliczenia. |

[Plan z odrębnymi kartami](testing/MANUAL-TEST-PLAN.md) i [interaktywna lista](testing/qa-checklist.html) zachowują wszystkie **70 wyników NOT RUN**.

## Bazowe źródło aplikacji 6ff5ae9 — odrębny dowód DEV

| Dowód | Stan |
|---|---|
| Bazowy SHA aplikacji v27 | [`6ff5ae976e31add7fb93e3872e0d9046a25edd37`](https://github.com/ksobczak321-oss/gra/commit/6ff5ae976e31add7fb93e3872e0d9046a25edd37) — commit aplikacji wysłany do `main`. To własne źródło v27, odrębne od historycznego v26. |
| Lokalny pakiet walidacyjny | **61 plików z manifestem / 60 plików treści, 11 219 303 bajtów**. Końcowy pakiet lokalnej walidacji `build/frontend-v27-final2`, z drzewa roboczego ze znacznikiem źródła `000…`. Służy testom lokalnym; nie jest finalnym pakietem własnego commitu ani opublikowanym artefaktem CI. |
| Pakiet dokładnego źródła 6ff5ae9 | **61 plików z manifestem / 60 treści / 11 219 303 bajty**. TAR SHA-256 `af8a64508044d344b4e01122145d3b0b1653c6c4abfecfec5fc502e7b36e1e55`; manifest SHA-256 `84ac0f9528cadaab15c92d3f789abd041d45b9a4580051e638472879d0709d49`. Archiwum zweryfikowano i rozpakowano; wszystkie 60 plików treści jest identyczne bajtowo z lokalnie testowanym final2. To lokalny pakiet dokładnego SHA, odrębny od przyszłego artefaktu CI. |
| Push / własne CI / Pages | Push 6ff5ae9 wykonany. [CI 41359303259](https://github.com/ksobczak321-oss/gra/actions/runs/41359303259): **CANCELLED**. [Pages 41359303232](https://github.com/ksobczak321-oss/gra/actions/runs/41359303232): **SUCCESS, 30 s**. Stan potwierdzony odczytem publicznego GitHub; nie deklarujemy sukcesu publikacji ani CI. |
| Nieprzesuwany tag odbioru DEV | **Nieutworzony dla v27**; wymaga potwierdzenia własnego CI i Pages. |
| PRE-PROD | **Bez nowej promocji** — pozostaje 0.10.1.0 / `353faad347262dce7c3632fdf7c71be124384ab1`, przebieg 41246771480 / próba 1 SUCCESS. |
| PROD, reset kont, prawdziwe płatności/reklamy/darowizny | **Bez zmian i aktywacji**. Testowe odpowiedzi Firebase nie dotykają prawdziwych wysp. |

Nazwy, UID, hasła, postęp, rozpoczęte budowy i rejsy są danymi do zachowania. Własny zielony CI i Pages trzeba powiązać z końcowym SHA w tym dokumencie oraz w rejestrze środowisk; żaden lokalny test nie zastępuje takiego dowodu.

## Kandydat autoryzowanej promocji PRE-PROD 7d45290

Późniejsza dyspozycja użytkownika **„promuj na pre prod”** zastępuje wcześniejsze ograniczenie publikacji do DEV w zakresie tego wydania. Konta, hasła, historia i rozpoczęte działania pozostają do zachowania; brak zgody na reset lub PROD. [Przygotowanie PRE-PROD v27](PREPROD-V27-PREPARATION.md) zachowuje sprawdzenie niezmienionych reguł Firestore i zasad standardowej promocji.

Kandydat [`7d45290b911e359a8940f28551df4692053cadb2`](https://github.com/ksobczak321-oss/gra/commit/7d45290b911e359a8940f28551df4692053cadb2) wysłany do main z markerem `[preprod:0.11.0.0]`. Własne [CI 41360046508](https://github.com/ksobczak321-oss/gra/actions/runs/41360046508): **SUCCESS, 10 min 31 s**; [Pages 41360046453](https://github.com/ksobczak321-oss/gra/actions/runs/41360046453): **SUCCESS, 47 s**. Wcześniejsze [CI 41359303259](https://github.com/ksobczak321-oss/gra/actions/runs/41359303259): **CANCELLED** — nie jest zieloną bramką promocji. Własne CI dokładnego kandydata przeszło. Automatyczny [bridge 41360957057](https://github.com/ksobczak321-oss/gra/actions/runs/41360957057) ma **SUCCESS, 18 s**; [deploy PRE-PROD 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479) ma **FAILURE po publikacji Hostingu**, a jego źródło `7d45290b911e359a8940f28551df4692053cadb2` potwierdzone; końcowy wynik: FAILURE w kontroli kont po publikacji Hostingu. Tagów v27 nie utworzono.

**61 plików z manifestem / 60 treści / 11 219 303 bajty**. TAR SHA-256 `d202c79783b1dc2787d3db2a859031a9dc03fb87a089b2e81a09c2d8d0253ff4`; manifest SHA-256 `0905956f17d0b249cf8faae7a3aed486e86e74d20b2a5145f72d6a9730792993`. Zachowano 59 publicznych plików aplikacji z 6ff5ae9; wszystkie 60 plików treści są identyczne bajtowo z testowanym final2. To dokładny lokalny pakiet kandydata, nie dowód publikacji GCP.

Lokalne **1017 Node /141 Python /27 nazwanych zestawów Chromium PASS** dotyczą niezmienionej publicznej aplikacji; dodatkowo **28/28 testów dispatchera i promocji PASS** obejmuje marker oraz istniejące blokady. Nie zastępuje to własnego pełnego CI7d45290, odczytu bridge, wdrożenia ani artefaktów GCP. Wcześniejszego anulowanego CI6ff5ae9 nie przepisujemy na sukces. Wszystkie 70 ręcznych wyników nadal NOT RUN.
