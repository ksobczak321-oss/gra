# PRE-PROD 0.11.0.0 — przygotowanie i autoryzacja

Użytkownik po lokalnym odbiorze wydał polecenie **„promuj na pre prod”**. Autoryzuje ono standardowe wdrożenie do `harborlight-dev`, z zachowaniem kont, haseł i postępu. Nie obejmuje resetu ani PROD.

Aplikacja pochodzi ze źródła `6ff5ae976e31add7fb93e3872e0d9046a25edd37`: 1017 testów Node, 141 Python i 27 zestawów Chromium PASS lokalnie, w tym 114 widoków PL i 8 prób utraty potwierdzenia zapisu. Pages 41359303232 zakończyło się SUCCESS (30 s). Osobny commit promocji zachowuje wszystkie 59 publicznych plików aplikacji i dodaje marker `[preprod:0.11.0.0]` do istniejącego wąskiego dispatchera. Ma własne pełne CI; wcześniejszy przebieg źródła 6ff5ae9 nie zastępuje tej bramki.

Bezpośrednie GitHub API tej sesji zwraca Forbidden. Dlatego promocję uruchamia istniejący workflow `promote-urgent-preprod.yml` po udanym CI oznaczonego SHA. Dispatcher zachowuje sprawdzenie repozytorium, świeżego CI, próby, aktywnego workflow i niezmienionego main; nie ponawia istniejącego wdrożenia. Standardowy `google-cloud-dev.yml` nadal wymaga CI dokładnie tego samego SHA oraz używa istniejącego WIF. Testy dispatchera i promocji: **28/28 PASS**. Nie zmieniono uprawnień workflow.

## Zapis i dane

- Schemat świata nadal wynosi 9, archipelagu 2, a koperta Firestore ma dotychczasowy format. Nowe opcjonalne pola misji i liczniki gospodarki mieszczą się wewnątrz istniejącego payloadu JSON.
- Reguły Firestore są bajtowo identyczne z przygotowaniem potwierdzonym przez właściciela dla v25: SHA-256 `88427f35c169d5f7882708345055b0f8cf42535dfd9a197e75b3e67bede5eb8f`. Ta zmiana nie wymaga ponownego uruchamiania skryptu kont.
- Zapisane UID, nazwy, lekcje, nagrody, budowy i rejsy są zachowywane. Stare rejsy nie pobierają ponownie posiłków. Zwykły deploy nie resetuje wysp.
- Przed ukończeniem promocji workflow sprawdza dokładny manifest i pliki, rzeczywisty zalogowany odczyt istniejącej wyspy oraz izolację trzech kont. Są to kontrole bez zapisu gry, więc nie udają ręcznego testu zapis→ponowne wczytanie.

## Stan wykonania

Promocja jest **autoryzowana i przygotowana**, ale jeszcze niepotwierdzona. Pełny SHA kandydata, własne CI, bridge, deploy i artefakty trzeba odczytać z GitHub po uruchomieniu. Do tego momentu ostatnie odebrane PRE-PROD pozostaje 0.10.1.0 / `353faad347262dce7c3632fdf7c71be124384ab1`.

Po wysłaniu oznaczonego commitu nie przesuwamy main do potwierdzenia źródła promocji. Bieżące dowody podaje [rejestr środowisk](ENVIRONMENT-STATUS.md).
