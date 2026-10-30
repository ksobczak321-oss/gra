# Google Cloud — DEV, PROD i domena HARBORLIGHT

## Potwierdzony stan

30 października 2026 użytkownik pokazał aktywne konto rozliczeniowe HARBORLIGHT, projekty `harborlight-dev` i `harborlight-prod` oraz wynik kontroli z Cloud Shell: **PASS=22, FAIL=0**. Potwierdza to początkowy bootstrap, WIF i IAM. Nie potwierdza publikacji gry, działania kont graczy ani bazy.

Użytkownik następnie zlecił wdrożenie gry na DEV oraz przypisanie zarejestrowanej w nazwa.pl domeny **harborlight.pl** do PROD. Po początkowej odmowie `addFirebase` właściciel aktywował Firebase w istniejącym projekcie przez jego konsolę. Ponowny skrypt potwierdził aktywny projekt i gotową witrynę `harborlight-dev`. Pierwszy workflow DEV przeszedł gate oraz publikację usługi Cloud Run, ale kontrola `/healthz` otrzymała Google HTTP 404 przed publikacją strony gry. Po zmianie publicznych sond na `/health` i `/ready` oraz poprawce układu planszy commit `c025895` przeszedł CI, a następny DEV zaliczył kontrole API. Publikację Firebase zatrzymał HTTP 403 przy odczycie stanu usługi `firebasehosting.googleapis.com`. Uzupełniono przygotowanie hostingu o rolę Service Usage Viewer dla deployera; właściciel musi ponowić `--apply`. Gra nie została jeszcze potwierdzona na GCP, a DNS domeny nie został zmieniony przez te skrypty.

Najnowszy potwierdzony pakiet gry przeszedł zdalne CI [41047950235](https://github.com/ksobczak321-oss/gra/actions/runs/41047950235) dla `c025895`. DEV [41050480920](https://github.com/ksobczak321-oss/gra/actions/runs/41050480920) zatrzymał się na opisanym odczycie Service Usage. Po naprawie konfiguracji można ponowić ten sam przebieg, zachowując jego zatwierdzony SHA. Nowy commit gry wymaga własnego CI i odbioru po publikacji.

## Adresy i usługi

| Element | DEV | PROD |
| --- | --- | --- |
| Projekt Google Cloud | `harborlight-dev` | `harborlight-prod` |
| Środowisko GitHub Actions | `google-cloud-dev` | `google-cloud-prod` |
| Hosting gry | planowany `https://harborlight-dev.web.app` | docelowo `https://harborlight.pl` |
| Witryna Firebase Hosting | `harborlight-dev` | `harborlight-prod` |
| Początkowy serwer HTTP | `harborlight-api-dev` | `harborlight-api-prod` |

Firebase Hosting udostępnia stronę, moduły gry i grafiki przez HTTPS/CDN. Cloud Run zawiera obecnie tylko publiczne sondy `/health` i `/ready`; gospodarka i zapis nadal działają w przeglądarce. Aliasy `/healthz` i `/readyz` pozostają dostępne w kontenerze, ale publiczna kontrola korzysta z tras bez kolizji z frontendem Cloud Run. Cloud SQL PostgreSQL, Firebase Authentication i serwerowe komendy są kolejnymi etapami, a nie częścią publikacji statycznej gry.

API i repozytoria obrazów są w Warszawie, `europe-central2`. Projekty współdzielą konto rozliczeniowe, ale mają osobne konta usługowe, WIF i zasoby. Późniejsze bazy oraz konta Firebase także mają być oddzielone. 100 jednoczesnych graczy to kolejny próg pomiaru wydajności, nie limit chmury. Cloud Run automatycznie dodaje instancje do ustawionego maksimum; moc przyszłej bazy wymaga osobnego doboru.

## Przygotowanie hostingu DEV

Początkowy [bootstrap](../infra/google-cloud/bootstrap.sh) wymaga istniejącego projektu z rozliczeniami, sprawdza etykietę `harborlight_env`, konfiguruje Artifact Registry, konta usługowe i WIF. Domyślny `--check` tylko odczytuje stan, a `--apply` uzgadnia konfigurację. Ustawienie etykiety używa `gcloud alpha projects update`, ponieważ stabilny wariant odrzuca `--update-labels`.

Po bootstrapie, w zalogowanym Cloud Shell właściciela, z katalogu repozytorium:

```sh
git pull --ff-only
python3 infra/google-cloud/prepare-hosting.py --project harborlight-dev --apply
```

Skrypt włącza API Firebase/Hosting, nadaje deployerowi `roles/firebasehosting.admin` i `roles/serviceusage.serviceUsageViewer`, dodaje Firebase do właściwego istniejącego projektu oraz tworzy lub sprawdza witrynę. Viewer pozwala Firebase CLI odczytać, czy API jest włączone; nie pozwala go włączać ani wyłączać. Skrypt nie publikuje gry i nie tworzy bazy ani kluczy. Domyślny `--check` jest odczytowy i zgłasza brak każdej wymaganej roli. Ponowne `--apply` dodaje tylko brakujące role we wskazanym projekcie. Przy błędzie pokazuje ograniczony komunikat i powód z oficjalnego API bez tokenów lub pełnego zrzutu odpowiedzi. Ewentualną akceptację warunków Firebase użytkownik wykonuje w konsoli Google, jeżeli rzeczywista odpowiedź tego wymaga.

To środowisko Codex nie ma działającego `gcloud`, poświadczeń konta użytkownika ani tokenu GitHub CLI do uruchamiania Actions. Przygotowanie wymagające konta właściciela odbywa się w jego Cloud Shell. Publikację uruchamia uprawniona sesja GitHub, korzystając z WIF; nie przekazujemy haseł ani kluczy w czacie.

## Pakiet i publikacja gry

[`scripts/build_frontend.py`](../scripts/build_frontend.py) tworzy deterministyczny pakiet **34 publicznych plików**, około 10,4 MB przed kompresją. Jawna lista obejmuje aktywne HTML/CSS/JS i trzy grafiki, bez dokumentacji, starych gier, konfiguracji lokalnych czy poświadczeń. `release.json` wiąże pełne SHA commitu z hashami i rozmiarami plików. Archiwum i manifest mają własne SHA-256.

Root `index.html` kieruje do gry, zachowuje query/hash i domyślnie wybiera nowego gracza. Pierwszy start ma poziom 1, 12 osób i po 100 każdego zasobu. Istniejące profile pozostają rozdzielone. Zapis `localStorage` jest zależny od domeny: nowy adres DEV nie przejmuje automatycznie wyspy z GitHub Pages. Konta, synchronizacja i import zapisu wymagają osobnej integracji.

[`firebase.json`](../firebase.json) i [`.firebaserc`](../.firebaserc) jawnie mapują target **`hosting:game`** na odpowiednie witryny DEV/PROD. Nie polegają na automatycznym wyborze domyślnej witryny. HTML, JS, CSS i manifest wymagają ponownej walidacji cache; grafiki mogą być buforowane. Nie dodajemy przekierowania wszystkich brakujących ścieżek do HTML, które ukrywałoby brak modułu gry.

Obowiązuje [proces promocji](RELEASE-PROCESS.md): **praca tutaj → GitHub/CI → DEV → PROD**. CI sprawdza grę z zbudowanego publicznego pakietu. DEV publikuje frontend na Firebase Hosting i obraz sond na Cloud Run, weryfikuje manifest po HTTPS oraz przeprowadza pełne pięć grup testów gry z rzeczywistego hostingu. Dopiero wtedy zapisuje archiwum frontendu i potwierdzenie wydania v2. Sam push nie publikuje usług GCP.

PROD wymaga udanego przebiegu DEV i obu jego artefaktów. Kopiuje ten sam obraz backendu po digest i publikuje to samo zweryfikowane archiwum frontendu bez ponownej budowy. Starsze potwierdzenia obejmujące wyłącznie sondy backendu nie uprawniają do publikacji całej gry.

## Domena harborlight.pl

Po przygotowaniu witryny PROD właściciel uruchamia:

```sh
python3 infra/google-cloud/prepare-hosting.py --project harborlight-prod --apply
python3 infra/google-cloud/prepare-domain.py --apply
```

Skrypt domeny tworzy wyłącznie powiązanie **harborlight.pl → harborlight-prod** i wypisuje rekordy `ADD`, `REMOVE` lub `NONE` otrzymane z Firebase. Nie publikuje gry, nie zmienia DNS w nazwa.pl i nie zgaduje adresów A, TXT ani rekordów certyfikatu. Zakres obejmuje domenę główną; `www` nie jest automatycznie dodawane ani przekierowywane.

W panelu nazwa.pl trzeba wpisać dokładne wartości z odpowiedzi Firebase i zachować niezwiązane rekordy, w tym pocztę. Po propagacji sprawdzić:

```sh
python3 infra/google-cloud/prepare-domain.py --check
```

`OCZEKUJE` oznacza, że powiązanie istnieje, ale DNS, własność lub certyfikat jeszcze nie są gotowe. Gotowość wymaga `HOST_ACTIVE`, `OWNERSHIP_ACTIVE` oraz `CERT_ACTIVE` lub `CERT_EXPIRING_SOON`. Odczytowe `--status-only` służy workflow i nie wymaga dostępu deployera do rozliczeń. Warunkiem ruchu PROD jest poprawna domena/HTTPS oraz przejście wcześniejszych etapów wydania; samo skonfigurowanie domeny nie promuje gry.

## Uprawnienia i koszty

WIF dopuszcza właściwe numeryczne ID repozytorium/właściciela, `main`, dokładny workflow i ręczne uruchomienie. Konta runtime nie otrzymują ról projektowych. Deployer ma uprawnienia Cloud Run i Hosting tylko w swoim projekcie. PROD dodatkowo potrzebuje `artifactregistry.reader` na repozytorium obrazów DEV, aby skopiować sprawdzony obraz — bez dostępu do danych lub bazy DEV.

Domyślne, publiczne identyfikatory projektów są zapisane w workflow, a zmienne środowisk GitHub mogą je opcjonalnie nadpisać. Nie tworzymy klucza JSON. [Kontrola podstawowa](../infra/google-cloud/verify.py) ma 22 punkty; `--promotion` dodaje 23. punkt odczytu obrazów DEV dla PROD. Potwierdzono dotąd wynik 22/22; wyniku 23. kontroli nie otrzymano.

Początkowy Cloud Run: 1 vCPU, 512 MiB, min. 0, maks. 2 instancje na rewizję, współbieżność 20 i 30 s na żądanie. Brak ruchu może obniżyć liczbę instancji do zera, ale obrazy, transfer, logi i Hosting mają własne rozliczenia. Maksimum instancji i alerty budżetowe nie są twardym limitem faktury. Cloud SQL nalicza koszt także poza godzinami testów; przed jej uruchomieniem potrzebna jest wycena konkretnej konfiguracji. Aktualnych cenników nie potwierdzono z tego środowiska.

## Sprawdzenia lokalne

```sh
node --test --test-concurrency=1 --test-isolation=none tests/*.test.mjs
node --test backend/test/*.test.mjs
python3 tests/harborlight-gcp-bootstrap.test.py
python3 tests/harborlight-gcp-verify.test.py
python3 tests/harborlight-frontend-bundle.test.py
python3 tests/harborlight-firebase-hosting.test.py
python3 tests/harborlight-domain.test.py
```

Testy konfiguracji używają atrap usług. Testy lokalnego pakietu nie są testami rzeczywistego Firebase Hosting ani dowodem zmiany DNS; wynik każdego z tych etapów zapisujemy osobno w dzienniku.
