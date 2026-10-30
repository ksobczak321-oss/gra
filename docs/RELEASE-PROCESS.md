# Kolejność pracy i promocji HARBORLIGHT

Zasada ustalona 30 października 2026: **praca w tym środowisku → synchronizacja do GitHub → CI → GCP DEV → GCP PROD**. Synchronizacja kodu nie jest promocją na chmurę. Oba wdrożenia GCP uruchamiamy osobno, świadomie wybierając kolejne wydanie; PROD nie przyjmuje nieprzetestowanego commitu ani dowolnego obrazu.

## 1. Rozwój i GitHub

Zmiany powstają w roboczym środowisku Codex, przechodzą odpowiednie testy lokalne i trafiają do Git. Push na `main` uruchamia [CI](../.github/workflows/ci.yml): reguły gry, blokady promocji, backend, bootstrap, kontrolę konfiguracji i interfejs w Chromium. Nie wdraża automatycznie usług Google Cloud.

Dotychczasowy GitHub Pages pozostaje **podglądem deweloperskim** repozytorium, a nie środowiskiem GCP PROD. Jego aktualizacja nie stanowi dowodu przejścia DEV i nie uprawnia do promocji produkcyjnej.

## 2. Promocja na GCP DEV

Uruchomienie [workflow DEV](../.github/workflows/google-cloud-dev.yml) z `main` najpierw wymaga udanego przebiegu CI po pushu dla **dokładnie tego samego pełnego SHA commitu**. Brak zielonego CI zatrzymuje proces przed uzyskaniem poświadczeń Google.

Po przejściu kontroli workflow buduje obraz jeden raz, wysyła go do Artifact Registry DEV i odczytuje jego niezmienny identyfikator `sha256`. Cloud Run uruchamia `obraz@sha256`, a nie ruchomy tag. Testy `/healthz` i `/readyz` muszą potwierdzić właściwy serwer, środowisko DEV i SHA źródła.

Dopiero po testach działającego DEV powstaje artefakt `harborlight-dev-release-<run_id>-<run_attempt>`. Zawiera SHA, pełny obraz i digest, repozytorium, identyfikatory CI/DEV oraz numery prób. Retencja wynosi 90 dni. Sam obraz w rejestrze albo zielone testy lokalne nie zastępują tego potwierdzenia.

## 3. Promocja na GCP PROD

W [workflow PROD](../.github/workflows/google-cloud-prod.yml) podajemy `dev_run_id` — identyfikator udanego wdrożenia DEV. Workflow produkcyjny nie wybiera automatycznie najnowszego `main` jako wydania.

Przed udostępnieniem poświadczeń produkcyjnych oddzielny job sprawdza:

- właściwe repozytorium i jego numeryczne ID, gałąź `main` i plik workflow DEV;
- zakończenie DEV sukcesem oraz zgodność przebiegu i numeru próby;
- jedno istniejące, niewygasłe potwierdzenie z tego przebiegu;
- zgodność SHA, repozytorium obrazu i digestu z potwierdzeniem;
- udane CI dla tego samego źródła i wskazanej próby.

Brak lub niezgodność któregokolwiek elementu blokuje promocję. Dawne przebiegi bez potwierdzenia nowego formatu również nie uprawniają do PROD.

Następnie PROD **kopiuje dokładnie obraz sprawdzony na DEV**, zachowując manifest i digest. Nie buduje aplikacji ponownie. Przed wdrożeniem porównuje docelowy digest, a po nim testy HTTP potwierdzają środowisko produkcyjne i SHA promowanego wydania. Nowszy commit pojawiający się w międzyczasie w Git nie zmienia wybranego pakietu.

## Uprawnienia i aktualna konfiguracja chmury

DEV i PROD są oddzielnymi projektami oraz środowiskami GitHub. Joby kontrolne mają wyłącznie dostęp do kodu i metadanych Actions; prawo uzyskania tożsamości Google dostaje dopiero zależny job wdrożenia. WIF nadal wymaga odpowiedniego pliku workflow z `main` i ręcznego uruchomienia.

Deployer PROD potrzebuje dodatkowo **wyłącznie odczytu repozytorium obrazów DEV**, aby skopiować sprawdzony pakiet do własnego rejestru. Nie dostaje dostępu do bazy DEV ani ogólnych ról w jego projekcie. Dodaje to aktualny bootstrap przy `ENVIRONMENT=prod`; po wcześniej wykonanym bootstrapie trzeba pobrać zmiany i ponowić jego część PROD przed pierwszą promocją. DEV musi być skonfigurowany wcześniej.

[Odczytowa kontrola konfiguracji](../infra/google-cloud/verify.py) sprawdza 22 elementy obu środowisk. Jej PASS potwierdza konfigurację początkową, a nie wykonanie wdrożenia czy zakończenie CI. Nie zastępuje potwierdzenia wydania z działającego DEV.

Po uzupełnieniu uprawnienia kopiowania można uruchomić `python3 infra/google-cloud/verify.py --promotion`. Ten wariant dodaje sprawdzenie roli czytelnika obrazów DEV dla deployera PROD: oczekiwane są 23 kontrole PASS. Domyślne 22 kontrole zachowują wcześniejszy zakres. Domyślne identyfikatory potwierdzonych projektów są zapisane w workflow, więc nie trzeba kopiować sekretów ani zmiennych do GitHuba, aby wykonać pierwszą próbę wdrożenia.

## Wycofanie i rozszerzanie wydania

Można ponownie promować poprzedni obraz posiadający ważne potwierdzenie DEV. Gdy potwierdzenie wygasło, zostało usunięte lub CI nie jest już poprawne, wymagane jest ponowne przejście odpowiednich etapów. Zmiana kodu po testach wymaga nowego CI oraz DEV; nie podmieniamy zawartości pakietu między etapami.

Obecny kontener obejmuje początkowe sondy backendu. Produkcyjny hosting frontendu, konta, zapis gry i baza nie są jeszcze wdrożone. Gdy dołączą do wydania, ich artefakty i testy muszą wejść do tego samego łańcucha przed uruchomieniem na PROD. Migracje bazy wymagają osobnych testów na DEV i planu odtworzenia; nie wykonujemy ich przy zwykłym odczycie konfiguracji.

Ta blokada działa w przygotowanej automatyzacji. Administratorzy nadal zarządzają IAM i plikami workflow; normalne publikacje prowadzimy wyłącznie opisaną ścieżką.
