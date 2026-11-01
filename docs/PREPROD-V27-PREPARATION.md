# PRE-PROD 0.11.0.0 — przygotowanie i autoryzacja

**PRE-PROD — niepełna promocja, 2 listopada 2026 (Europe/Warsaw).** [deploy PRE-PROD 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479), źródło `7d45290b911e359a8940f28551df4692053cadb2`, ma **FAILURE** w kroku24 „Verify permanent DEV accounts and cloud save isolation”. Hosting został wcześniej opublikowany; kontrola dokładnego wydania i rzeczywisty test hostowanej gry przeszły. Frontend0.11.0.0 może więc już być serwowany, ale pełnego odbioru PRE-PROD nie zaliczono. Artefakty/receipt pominięto; tagów i resetu brak. [incydent promocji](PREPROD-V27-INCIDENT-20261102.md).

Automatyczny [bridge 41360957057](https://github.com/ksobczak321-oss/gra/actions/runs/41360957057) ma **SUCCESS, 18 s**. Uruchomiony [deploy PRE-PROD 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479) ma **FAILURE po publikacji Hostingu**, z publicznie potwierdzonym źródłem `7d45290b911e359a8940f28551df4692053cadb2`. [gate 125011066732](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479/job/125011066732) ma **SUCCESS**, zadanie [deploy125011120868](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479/job/125011120868) zakończyło się błędem kroku24. Potwierdzono właściwe źródło, ale końcowy odbiór tego wdrożenia nie przeszedł. Pełne wdrożenie GCP zakończone błędem; brak receipt i tagów v27.

**Odbiór operacyjny: 2 listopada 2026, Europe/Warsaw.** Źródło `7d45290b911e359a8940f28551df4692053cadb2` ma własne [CI 41360046508](https://github.com/ksobczak321-oss/gra/actions/runs/41360046508) **SUCCESS, 10 min 31 s** oraz [Pages 41360046453](https://github.com/ksobczak321-oss/gra/actions/runs/41360046453) **SUCCESS, 47 s**. Obie grupy testów przeglądarkowych pakietu przeszły w CI tego źródła. Automatyczny [bridge 41360957057](https://github.com/ksobczak321-oss/gra/actions/runs/41360957057) ma **SUCCESS, 18 s**. Wdrożenie PRE-PROD nadal oczekuje na odrębny wynik GCP; tagów v27 nie utworzono.

Użytkownik po lokalnym odbiorze wydał polecenie **„promuj na pre prod”**. Autoryzuje ono standardowe wdrożenie do `harborlight-dev`, z zachowaniem kont, haseł i postępu. Nie obejmuje resetu ani PROD.

Aplikacja pochodzi ze źródła `6ff5ae976e31add7fb93e3872e0d9046a25edd37`: 1017 testów Node, 141 Python i 27 zestawów Chromium PASS lokalnie, w tym 114 widoków PL i 8 prób utraty potwierdzenia zapisu. Pages 41359303232 zakończyło się SUCCESS (30 s). Osobny commit promocji zachowuje wszystkie 59 publicznych plików aplikacji i dodaje marker `[preprod:0.11.0.0]` do istniejącego wąskiego dispatchera. Ma własne pełne CI; wcześniejszy przebieg źródła 6ff5ae9 nie zastępuje tej bramki.

Bezpośrednie GitHub API tej sesji zwraca Forbidden. Dlatego promocję uruchamia istniejący workflow `promote-urgent-preprod.yml` po udanym CI oznaczonego SHA. Dispatcher zachowuje sprawdzenie repozytorium, świeżego CI, próby, aktywnego workflow i niezmienionego main; nie ponawia istniejącego wdrożenia. Standardowy `google-cloud-dev.yml` nadal wymaga CI dokładnie tego samego SHA oraz używa istniejącego WIF. Testy dispatchera i promocji: **28/28 PASS**. Nie zmieniono uprawnień workflow.

## Zapis i dane

- Schemat świata nadal wynosi 9, archipelagu 2, a koperta Firestore ma dotychczasowy format. Nowe opcjonalne pola misji i liczniki gospodarki mieszczą się wewnątrz istniejącego payloadu JSON.
- Reguły Firestore są bajtowo identyczne z przygotowaniem potwierdzonym przez właściciela dla v25: SHA-256 `88427f35c169d5f7882708345055b0f8cf42535dfd9a197e75b3e67bede5eb8f`. Ta zmiana nie wymaga ponownego uruchamiania skryptu kont.
- Zapisane UID, nazwy, lekcje, nagrody, budowy i rejsy są zachowywane. Stare rejsy nie pobierają ponownie posiłków. Zwykły deploy nie resetuje wysp.
- Przed ukończeniem promocji workflow sprawdza dokładny manifest i pliki, rzeczywisty zalogowany odczyt istniejącej wyspy oraz izolację trzech kont. Są to kontrole bez zapisu gry, więc nie udają ręcznego testu zapis→ponowne wczytanie.

## Stan wykonania

Promocja jest **autoryzowana i przygotowana, wdrożenie GCP jeszcze niepotwierdzone**. Kandydat [`7d45290b911e359a8940f28551df4692053cadb2`](https://github.com/ksobczak321-oss/gra/commit/7d45290b911e359a8940f28551df4692053cadb2) wysłany do main z markerem `[preprod:0.11.0.0]`. Własne [CI 41360046508](https://github.com/ksobczak321-oss/gra/actions/runs/41360046508): **SUCCESS, 10 min 31 s**; [Pages 41360046453](https://github.com/ksobczak321-oss/gra/actions/runs/41360046453): **SUCCESS, 47 s**. Wcześniejsze [CI 41359303259](https://github.com/ksobczak321-oss/gra/actions/runs/41359303259): **CANCELLED** — nie jest zieloną bramką promocji. Własne CI dokładnego kandydata przeszło. Automatyczny [bridge 41360957057](https://github.com/ksobczak321-oss/gra/actions/runs/41360957057) ma **SUCCESS, 18 s**; [deploy PRE-PROD 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479) ma **FAILURE po publikacji Hostingu**, a jego źródło `7d45290b911e359a8940f28551df4692053cadb2` potwierdzone; końcowy wynik: FAILURE w kontroli kont po publikacji Hostingu. Tagów v27 nie utworzono. Ostatnie odebrane PRE-PROD pozostaje 0.10.1.0 / `353faad347262dce7c3632fdf7c71be124384ab1`.

Po wysłaniu oznaczonego commitu nie przesuwamy main do potwierdzenia źródła promocji. Bieżące dowody podaje [rejestr środowisk](ENVIRONMENT-STATUS.md).

## Dokładny kandydat i archiwum

**61 plików z manifestem / 60 treści / 11 219 303 bajty**. TAR SHA-256 `d202c79783b1dc2787d3db2a859031a9dc03fb87a089b2e81a09c2d8d0253ff4`; manifest SHA-256 `0905956f17d0b249cf8faae7a3aed486e86e74d20b2a5145f72d6a9730792993`. Zachowano 59 publicznych plików aplikacji z 6ff5ae9; wszystkie 60 plików treści są identyczne bajtowo z testowanym final2. To dokładny lokalny pakiet kandydata, nie dowód publikacji GCP.

Późniejsze polecenie „promuj na pre prod” rozszerza pierwotne GO ograniczone do DEV. Nie zmienia go w zgodę na reset lub PROD. Własny sukces CI kandydata musi poprzedzić istniejący bridge i standardowy workflow; nie zmieniono bramek dokładnego SHA, aktywnej próby, WIF ani uprawnień. Lokalne 28/28 testów dispatchera/promocji jest odrębnym sprawdzeniem tego mechanizmu, nie wynikiem całego CI ani wdrożenia.
