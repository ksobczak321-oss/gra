# DEV 0.13.1.0 — odbiór Teatru v30

Użytkownik zatwierdził przebudowę wyglądu, zaakceptował przygotowane ilustracje i doprecyzował: na mapie tylko budynek, plac po kliknięciu, automatyczny zapis między dniami oraz dalsze poziomy dekoracji przy 20 miejscach. [Wymagania](FRONTEND-V30-REQUIREMENTS.md). To wydanie DEV; PRE-PROD pozostaje 0.12.0.0/d9e2940. Nie resetowano kont i nie aktywowano prawdziwych płatności ani reklam.

## Lokalny odbiór

**1219 testów Node PASS**: 1078 frontendu, 134 backendu i 7 samodzielnej planszówki. **141 testów Pythona PASS**. Końcowy frontend przeszedł w 21,692 s bez pominięć i bez podnoszenia 10-sekundowego limitu testu 96 godzin. Źródło `13c55a4e4853edf44c185747c1c626ac42c221fc`; [CI 41667711260](https://github.com/ksobczak321-oss/gra/actions/runs/41667711260) **SUCCESS, 14m 39s**; [Pages 41667711124](https://github.com/ksobczak321-oss/gra/actions/runs/41667711124) **SUCCESS, 50s**. Tag `dev-0.13.1.0-20261103` opublikowany i zdalnie potwierdzony na tym samym źródle.

| Kontrola | Wynik |
|---|---|
| Model i cała gra |1078/1078 Node PASS; `/tmp/harborlight-v30-full-node.log`|
| Backend |134/134 PASS; `/tmp/harborlight-v30-backend.log`|
| Python |141 PASS; `/tmp/harborlight-v30-python.log`|
| Nowe studio |4/4 PL/EN × komputer/telefon PASS na końcowym atlasie i UI|
| Nowa pełna gra |4/4 PL/EN × komputer/telefon PASS na końcowym atlasie|
| Poprzednie przebiegi |Teatr v29:4/4; pełna gra v29:2/2 PASS|
| Wygląd |Zrzuty obejrzane: pełna korona drzewa20, fontanny20/21/22, poprawne kadrowanie i widoczny tytuł na telefonie|
| Excel13 |Wygenerowany i oddzielnie zwalidowany z aktualnych eksportów; PASS|
| Ewidencja |410 kart /147 ręcznych prób NOT RUN; generatory PASS|

Nowe testy przeglądarkowe sprawdzają rzeczywiste ulepszenia20→21→22, anulowaną i ukończoną reklamę przy25, zapis i przywrócenie aranżacji bez cofania poziomów/monet/własności, klawiaturę, powiększenie i status zapisu bez utraty fokusu. Starsze próby zachowują dokładne nagrody z samolotu i prawdziwy przepływ reklam. Własne CI tego źródła zaliczyło pełne38zestawów Chromium. Lokalny odbiór kierunkowy i starszy wynik36zestawów pozostają osobnymi dowodami.

## Trwałość

`backend/test/theatre-persistence-v30.test.mjs` sprawdza rzeczywiste lokalne HTTP accountAPI: trzy kolejne dni, trzy tokeny sesji i dwa restarty serwera. Poziomy21→22→23, atmosfera, pomysły i własność przechodzą PUT/GET oraz normalizację. Ulepszenie pobiera monety, przeniesienie i zdjęcie nie gubią ozdoby, a stary pomysł nie cofa późniejszego rozwoju. Spóźniony zapis otrzymuje409.

To izolowany transakcyjny adapter w pamięci utrzymywany między instancjami serwera. Jest dowodem kontraktu API, a nie nowym odczytem Firestore, trwałości dysku ani wdrożeniem GCP. Zapis bieżącego placu jest automatyczny razem z wyspą; trzy „Pomysły” to dodatkowe warianty aranżacji. Tymczasowy podgląd Pages działa w pamięci i jasno to pokazuje. Konta chmurowe pokazują rzeczywisty status zapisu; nie deklarujemy potwierdzenia przed odpowiedzią koordynatora.

## Grafika i granice zmian

Zachowano podstawową ilustrację wyspy. Nowy budynek korzysta z przezroczystej grafiki, a plac i atlas50 ilustracji otwierają się wewnątrz Teatru. Poprawiono wyciek całego atlasu poza wybraną komórkę i jego układ tak, aby nie ucinać wysokich drzew/rzeźb. Poziomy ponad20 zachowują mistrzowską bazę i dodają widoczne wykończenia przy ograniczonej złożoności renderowania.

Ceny1–20 pozostały zgodne z poprzednim modelem. Dalsze poziomy korzystają z tej samej formuły i reklamy co5 poziomów; błędna lub nieprzedstawialna wycena nie pobiera monet. Przestawianie, kolekcja, światło, posadzka i trzy pomysły nie tworzą nagród gospodarczych.

[Excel13](arkusze/HARBORLIGHT13-zasady.xlsx) ma88 arkuszy. Zachowuje77historycznych arkuszy,48komentarzy i4325wyników formuł. Sprawdzono333noweformuły,500 próbek runtime oraz260 próbek cen, także ponad20. Poprzedni Excel12 ma niezmieniony SHA-256 `8e2ffb524398aabcae98653f6adce2a217d26e2c72decaf151147a58de6b0eca`.

Źródło `13c55a4e4853edf44c185747c1c626ac42c221fc`; [CI 41667711260](https://github.com/ksobczak321-oss/gra/actions/runs/41667711260) **SUCCESS, 14m 39s**; [Pages 41667711124](https://github.com/ksobczak321-oss/gra/actions/runs/41667711124) **SUCCESS, 50s**. Tag `dev-0.13.1.0-20261103` opublikowany i zdalnie potwierdzony na tym samym źródle. Historyczny tag0.13.0.0 pozostaje na cf6739a; nie przesuwamy go na nową grafikę.


## Niezmienny pakiet i publikacja

| Warstwa | Potwierdzony stan |
|---|---|
| Źródło |`13c55a4e4853edf44c185747c1c626ac42c221fc`|
| CI |[41667711260](https://github.com/ksobczak321-oss/gra/actions/runs/41667711260) SUCCESS, 14m 39s; pełne38zestawów Chromium|
| Pages |[41667711124](https://github.com/ksobczak321-oss/gra/actions/runs/41667711124) SUCCESS, 50s|
| Tag |[`dev-0.13.1.0-20261103`](https://github.com/ksobczak321-oss/gra/tree/dev-0.13.1.0-20261103) → `13c55a4e4853edf44c185747c1c626ac42c221fc`|
| Pakiet |77 plików /19410989 bajtów; verify/extractPASS|
| TAR SHA-256 |`8e685319cc16329804dcffc141c2cf15c3ceae54eb106c99ea1cc02c98cb8996`|
| Manifest SHA-256 |`fba33dbcc47072b05c7e48295f3391e3ef3ca867d003bae6b3d346028e02df03`|
| PRE-PROD |Nadal0.12.0.0/d9e2940; bez nowej promocji/resetu/PROD|

Hashe dotyczą lokalnego TAR i manifestu dokładnie tego źródła, nie ZIP artefaktu GitHub ani obrazu backendu. Publikację Pages potwierdził standardowy workflow; niezależnego odczytu bajtów hosta nie potwierdzono z powodu ograniczeń proxy tej sesji. Nowy kod API i trwałość przez sesje sprawdzono lokalnie, bez deklaracji nowego wdrożenia Firestore/GCP. Podgląd Pages pozostaje nietrwały. Następny commit dowodów nie zmienia plików aplikacji ani nie przesuwa odebranego tagu.
