# PRE-PROD 0.11.0.0 — niepełna promocja z 2 listopada2026

**PRE-PROD — niepełna promocja, 2 listopada 2026 (Europe/Warsaw).** [deploy PRE-PROD 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479), źródło `7d45290b911e359a8940f28551df4692053cadb2`, ma **FAILURE** w kroku24 „Verify permanent DEV accounts and cloud save isolation”. Hosting został wcześniej opublikowany; kontrola dokładnego wydania i rzeczywisty test hostowanej gry przeszły. Frontend0.11.0.0 może więc już być serwowany, ale pełnego odbioru PRE-PROD nie zaliczono. Artefakty/receipt pominięto; tagów i resetu brak.

## Potwierdzone warstwy

| Warstwa | Rzeczywisty wynik |
|---|---|
| Źródło | `7d45290b911e359a8940f28551df4692053cadb2` — potwierdzone publicznie w uruchomionym deployu. |
| Własne CI41360046508 | SUCCESS,10 min31s; obie grupy testów przeglądarkowych przeszły. |
| Pages41360046453 | SUCCESS,47s. |
| Bridge41360957057 | SUCCESS,18s. |
| Gate125011066732 | SUCCESS. |
| Hosting i sprawdzenie treści | Publikacja, dokładny manifest/publiczne pliki oraz rzeczywisty hostowany Chromium przeszły przed późniejszym błędem. |
| Końcowy odbiór kont | Krok24 „Verify permanent DEV accounts and cloud save isolation” — FAILURE. |
| Receipt/artefakty/tagi | Kroki artefaktów i receipt pominięte; nie powstał tag odbioru tej promocji. |

Ostatni **pełny** odbiór pozostaje0.10.1.0 /`353faad347262dce7c3632fdf7c71be124384ab1`. Nie jest to potwierdzenie, że Hosting nadal serwuje stare pliki: nieudany krok wystąpił już po publikacji nowego frontendu. Nie oznaczamy PRE-PROD jako zielonego na podstawie wcześniejszego sukcesu Hostingu.

## Rozpoznanie i następny krok

Przegląd kodu wykazał niezgodność walidatora: checker zakłada kopertę Firestore `schemaVersion1`, podczas gdy obecny klient zapisuje także kontrakt2. Przygotowywana poprawka ma ściśle walidować obsługiwane1/2 i odrzucać nieznane lub niespójne koperty. Nie usuwa kontroli izolacji kont, nie zmienia reguł zapisu i nie obniża bramek promocji.

Dokładna linia `ERROR` z zalogowanego logu kroku jest jeszcze oczekiwana od właściciela. Odczyt kodu wskazuje konkretny problem zgodności; nie zastępuje pełnego logu ani nie potwierdza naprawy. Poprawka i ponowienie będą miały własne źródło, testy i wynik. Nie przepisujemy tego przebiegu na sukces.

Pakiet7d45290:61 plików/60 treści/11 219 303 bajty, TAR `d202c79783b1dc2787d3db2a859031a9dc03fb87a089b2e81a09c2d8d0253ff4`, manifest `0905956f17d0b249cf8faae7a3aed486e86e74d20b2a5145f72d6a9730792993`. Własne CI i hashe pozostają dowodem tego źródła; nie są receipt GCP.

Nie wykonywano resetu kont, wysp ani haseł. Ręczny test zapis→ponowne wczytanie i pozostałe70 przypadków nadal NOT RUN. PROD bez zmian. [Rejestr środowisk](ENVIRONMENT-STATUS.md) i [przygotowanie promocji](PREPROD-V27-PREPARATION.md) rozdzielają bieżący stan od późniejszej naprawy.

## Przygotowana naprawa kontrolera

Po nieudanej promocji poprawiono kontroler kont bez zmiany plików gry lub danych. Akceptuje legalne koperty1/2; dla2 wymaga zgodnej generacji, ograniczonego indeksu wysp, poprawnego korzenia bez zagnieżdżonych córek i dotychczasowego limitu700kB na świat. API może zwracać uwodniony archipelag do14MB, ale każdy świat nadal podlega własnemu limitowi. Porównanie tego samego revision projektuje korzeń z API zgodnie z rzeczywistym adapterem dokumentów. Pozostają wszystkie kontrole właściciela, sześciu obcych odczytów, odczytów anonimowych i brak żądań zapisu.

Regresje używają rzeczywistego adaptera backendu, także dla pustej listy córek i poprawnego wielowyspowego payloadu większego od700kB. Nowe nieprawidłowe koperty nadal są odrzucane. Kontroler26/26PASS; pełny lokalny zestaw po poprawce1023/1023PASS (19,92s). Błędy wykonania dostają bezpieczną adnotację GitHub z ustalonego komunikatu, bez tokenów, haseł i surowych odpowiedzi. Eksportowana funkcja CLI zachowuje dotychczasowy kontrakt.

To naprawiony i odtworzony w testach błąd kodu. Oryginalnego prywatnego wiersza ERROR nie odczytano, więc powiązanie z tą konkretną awarią zostanie ostatecznie zweryfikowane przez kolejny standardowy deploy. Nowy oznaczony commit wymaga własnego CI; stara awaria pozostaje FAILURE.
