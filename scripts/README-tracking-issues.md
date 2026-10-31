# Karty Git a natywne GitHub Issues

Źródłem definicji i etapów są [rejestr zmian](../docs/tracking/changes.json), [ręczne przypadki testowe](../docs/testing/manual-test-cases.json) i ich osobne pliki Markdown. Plik karty w Git **nie jest opublikowanym Issue**. Importer tworzy osobne natywne Issue dla każdego `HL-CHG-…` i `HL-TC-…` wyłącznie w `ksobczak321-oss/gra`.

Typy Bug/Story/Decision/Ops/TestCase, epic i relacje zapisuje jako metadane treści. Nie zakłada dostępności natywnego typu Epic w osobistym repozytorium; grupy epic pozostają linkami do rejestru Git. Karta historycznej naprawy nie oznacza nowo zaobserwowanego błędu. Etapy DEV/CI/PRE-PROD/PROD i wynik ręczny są oddzielnymi polami; PASS wcześniejszej automatyzacji nie zmienia ręcznego `NOT RUN`.

Importer nie zamyka ani nie otwiera ponownie Issues na podstawie statusu w Git. Stan Open/Closed natywnego Issue nie zastępuje etapów z karty. Relacje zawierają stałe ID i, po publikacji, linki między Issues; oryginalne linki względne z Markdown są zamieniane na linki plików w GitHub.

## Plan bez autoryzacji i bez połączenia z GitHub

```sh
python3 scripts/publish_tracking_issues.py
python3 scripts/publish_tracking_issues.py --json > /tmp/harborlight-issues-plan.json
```

Domyślny tryb jest całkowicie lokalny: nie uruchamia `gh`, nie odczytuje tokena i niczego nie publikuje. `inspect_remote` oznacza, że istniejące Issues i duplikaty nie zostały jeszcze sprawdzone. Liczba kart wynika z obu manifestów; nie jest wpisana na stałe.

Można sprawdzić idempotentny plan na wcześniej zapisanym odczycie wszystkich Issues, także zamkniętych:

```sh
python3 scripts/publish_tracking_issues.py \
  --remote-snapshot /tmp/harborlight-issues-snapshot.json
```

Snapshot jest jedną tablicą JSON z kompletnego odczytu API, z polami `number`, `title`, `body` i `html_url` albo `url`. Pojedyncza strona stu rekordów nie jest pełnym snapshotem większego repozytorium. W trybie `--apply` narzędzie samo pobiera kolejne strony `page=1…`, po 100 rekordów, do pierwszej krótszej strony (maksymalnie 1000 stron). Nie wymaga flagi `--slurp`, której starszy GitHub CLI nie obsługuje. Offline plan nadal nie uruchamia `gh` ani niczego nie publikuje.

## Publikacja przez właściciela

W tej sesji nie ma działającego uwierzytelnienia GitHub, dlatego natywnych Issues nie utworzono. Właściciel może zalogować GitHub CLI lokalnie; sekretów nie przesyła się do czatu:

```sh
gh auth login --hostname github.com --web
gh auth status --hostname github.com
python3 scripts/publish_tracking_issues.py --apply --json \
  > /tmp/harborlight-issues-publication.json
```

`--apply` pobiera świeży stan bez przyjmowania offline snapshotu i dopiero po pełnej kontroli publikuje. Nie wymaga GCP ani zmian IAM. Repozytorium jest stałe; nie ma flagi wyboru innego repo. Wynik zawiera ID, działania i rzeczywiste URL; nie zawiera tokenów. Pola publikacji w manifestach Git nie zmieniają się automatycznie — można je później uzupełnić na podstawie tego rzeczywistego raportu, w osobnym przeglądzie Git.

Każde Issue ma ID w tytule i markerze treści. Powtórzenie importu aktualizuje istniejącą kartę zamiast tworzyć drugą. Konflikt ID, dwa Issues z tym samym ID albo uszkodzone znaczniki blokują publikację przed pierwszym zapisem. Istniejące Pull Requests są pomijane. Import wykonuje się jednym procesem naraz.

Importer zarządza tylko blokiem pomiędzy `<!-- harborlight-managed:HL-…:begin -->` i odpowiadającym `end`. Notatki człowieka poza blokiem zostają zachowane dokładnie; wyniki testów i obserwacje można dopisywać pod „Notatki zespołu”. Treść wewnątrz bloku jest odtwarzana z Git i może zostać zastąpiona. Zapis korzysta z prywatnego tymczasowego pliku `--body-file`, bez poleceń interpolowanych przez powłokę.

Wywołania zapisu są wykonywane kolejno z co najmniej dwusekundowym odstępem. Odczyty po limicie 429/secondary limit mają krótkie oczekiwanie 2/4/8 sekund. Błędu zapisu nie ponawiamy automatycznie: utworzenie mogło się powieść mimo utraty odpowiedzi. Narzędzie zatrzymuje pracę, podaje potwierdzone częściowe wyniki i zaleca ponowienie po sprawdzeniu GitHub/odczekaniu limitu. Ponowny start odczytuje wszystkie stałe ID i uzupełnia pozostałe karty oraz relacje. Raport przerwania nie jest potwierdzeniem opublikowania całego katalogu.

## Testy lokalne

```sh
python3 tests/harborlight-tracking-issues.test.py
```

Testy używają izolowanych kart, zapisanych odpowiedzi i atrap CLI; nie tworzą Issues ani nie wymagają tokenów.
