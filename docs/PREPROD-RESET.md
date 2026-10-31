# Jednorazowe wyzerowanie trzech profili PRE-PROD

Dyspozycja GO z 31 października 2026 obejmuje wyzerowanie **admin1, admin2 i admin3 dopiero po udanej promocji nowego wydania do PRE-PROD**. Obejmuje także admin1 i zastępuje wcześniejsze polecenie zachowania jego postępu. Nie jest resetem kont produkcyjnych ani usunięciem tożsamości użytkowników. Samo dodanie tego narzędzia nie oznacza wykonania resetu; aktualny stan i dowody są w [ENVIRONMENT-STATUS.md](ENVIRONMENT-STATUS.md).

Narzędzie: `infra/google-cloud/reset-preprod-accounts.py`. Domyślnie wykonuje odczyt i wypisuje plan; modyfikuje zasoby wyłącznie z `--apply`. W tej sesji nie ma poświadczeń GCP, więc rzeczywisty reset musi wykonać właściciel w swoim zalogowanym Cloud Shell. Nie przekazuje haseł, tokenów ani kluczy do czatu.

## Zakres i efekt

Stały projekt to `harborlight-dev`, numer `28040211190`, rozliczenia HARBORLIGHT `010F11-5A6F09-27543C`, baza Native `(default)` i UID `dev-admin1`, `dev-admin2`, `dev-admin3`. Narzędzie nie ma parametru pozwalającego wskazać inny projekt lub użytkownika.

Zachowuje Firebase Authentication: UID, loginy, adresy, hasła i aktywność tożsamości. Nie wysyła żadnego żądania zmiany/usunięcia użytkownika Auth. Zachowuje również zatwierdzenie dokumentów prawnych i kolekcję `legalAcceptances`.

Usuwa obie wyspy każdego profilu, samouczek, zasoby, kufry, nagrody, historię reklam/ekspedycji/płatności testowych, stan bez reklam, zwiększenie pojemności statku, transporty, zapisane postępy konta i całą historię rozgrywki pod `accounts/{uid}`. Usuwa własne oferty `playerTradeOffers`, skrzynki zwrotów, potwierdzenia żądań i użycia kodów przypisane do tych trzech UID. Towary w ich otwartych ofertach przepadają razem z resetowanym światem; nie są przyznawane ponownie. Historyczna oferta łącząca te konta z obcym UID zatrzymuje reset zamiast naruszać dane innego gracza. Oferty należące do innych UID, globalne definicje kodów promocyjnych i ich globalne liczniki pozostają; reset profilu nie odnawia globalnego limitu kodu.

Nie tworzy nowej wyspy w imieniu gracza. Serwer tworzy ją dopiero podczas pierwszego wejścia: 12 mieszkańców, po 100 sześciu zasobów, Ratusz i Magazyn 1, brak przydziałów pracowników, podstawowy statek 1000, wprowadzenie przed samouczkiem. Zegar świata pozostaje zatrzymany do zakończenia lub zamknięcia oprowadzania. Dzięki usunięciu `islandAccountProgress` nowa wyspa nie dziedziczy nagród i zakupów testowych starego świata.

## Warunki blokujące reset

Przed jakąkolwiek zmianą narzędzie potwierdza:

1. Sukces ręcznego workflow `.github/workflows/google-cloud-dev.yml` z `main` w repozytorium `ksobczak321-oss/gra` (ID `1428128759`) oraz sukces wskazanego przez niego CI dla **tego samego pełnego SHA**.
2. SHA256 ZIP artefaktu `harborlight-dev-release-RUN-ATTEMPT` względem metadanych GitHub Actions; zawarty w nim receipt v2 musi potwierdzać CI, API, przeglądarkę i frontend. Ręcznie napisany plik JSON nie jest dowodem.
3. Aktualny `https://harborlight-dev.web.app/release.json`, jego SHA256 i commit względem receipt; aktywne `/api/v1/config` z projektem `harborlight-dev` i środowiskiem `preprod`.
4. Właściwy projekt, numer, etykietę, rozliczenia i niezmienione trzy tożsamości Auth. Aktualny Cloud Run musi mieć dokładnie niezmienny obraz `api@sha256:…` z receipt, ten sam SHA, `HARBORLIGHT_ACCOUNT_API=1`, oczekiwaną tożsamość runtime, gotową najnowszą rewizję i 100% ruchu na nią. Żądana, ale jeszcze niegotowa rewizja nie wystarczy.
5. Istniejące udokumentowane `roles/datastore.user` dla `harborlight-runtime@harborlight-dev.iam.gserviceaccount.com`. Skrypt nie nadaje ról. Inne braki uprawnień/API zatrzymują operację z komunikatem bez drukowania prywatnej zawartości odpowiedzi.
6. Deny-all Firestore dla klientów i co najmniej 10 minut od czasu publikacji tych reguł odczytanego z Google. Stary bezpośredni zapis Firestore nie sprawdza generacji: bez tej blokady stara karta mogłaby przywrócić usunięty świat.

Włączenie API przed promocją opisuje [RUNTIME-ACCOUNTS.md](RUNTIME-ACCOUNTS.md). W środowisku GitHub `google-cloud-dev` musi być ustawione `HARBORLIGHT_ACCOUNT_API_ENABLED=true`, a runtime musi mieć wskazany dostęp do istniejącej bazy. Wymaga to nowego, poprawnego wdrożenia; zmienna ustawiona po starym przebiegu nie zmienia tamtego wydania.

**Po tym resecie API musi pozostać włączone.** Nie wracać do reguł i klienta umożliwiających bezpośredni zapis Firestore. Reguły API-only zawierają trwały znacznik `HARBORLIGHT PRE-PROD API-only v1`; `prepare-dev-users.py` odmawia zastąpienia ich historycznymi uprawnieniami klientów. Kolejne odbiory hostingu mają sprawdzać dane przez API kont, a odmowę bezpośredniego dostępu traktować jako oczekiwaną izolację. Backend runtime przez IAM nadal ma dostęp do bazy.

## Wykonanie po zielonej promocji

Zapisz ID **nowego zakończonego sukcesem** przebiegu PRE-PROD i pełny SHA. W jego sekcji Artifacts pobierz ZIP `harborlight-dev-release-RUN-ATTEMPT`; nie rozpakowuj i nie przepakowuj ZIP. Prześlij go do Cloud Shell poza repozytorium, np. jako `~/harborlight-preprod-release.zip`. Alternatywnie zalogowany GitHub CLI może pobrać dokładne archiwum poleceniem `gh api repos/ksobczak321-oss/gra/actions/artifacts/ID_ARTEFAKTU/zip > ~/harborlight-preprod-release.zip`. Sekrety GitHub pozostają w Cloud Shell; publiczne odczyty metadanych nie wymagają tokenu, o ile nie przekroczono limitu API.

Po zsynchronizowaniu kodu wykonaj plan, wstawiając rzeczywiste wartości:

```sh
cd ~/harborlight-infra
git pull --ff-only
python3 infra/google-cloud/reset-preprod-accounts.py \
  --deployment-run-id ID_NOWEGO_WDROZENIA \
  --commit PELNY_SHA_NOWEGO_WYDANIA \
  --receipt-archive ~/harborlight-preprod-release.zip
```

Plan wypisuje wyłącznie ścieżki operacji, liczbę dokumentów i nowe generacje, bez zawartości świata lub historii nagród. Niczego nie zmienia.

Następnie ta sama komenda z dwoma dodatkowymi argumentami:

```text
--apply --lock-client-writes
```

Jeżeli są jeszcze stare reguły, pierwsze wykonanie zapisze prywatną kopię, opublikuje dokładne deny-all, potwierdzi je odczytem i zatrzyma się przed kasowaniem danych do końca 10-minutowego okresu propagacji. Komunikat poda pozostałą liczbę sekund. To oczekiwany etap zabezpieczenia starych kart. Po wskazanym czasie uruchom **tę samą komendę, z tym samym ID/SHA/ZIP**, ponownie. Nie ma długiego blokującego oczekiwania ani wymogu nowej zgody użytkownika.

Kopie trafiają domyślnie do `~/.harborlight-private-backups` (katalog 0700, pliki 0600). Zawierają prywatny stan profili i poprzednie reguły, ale żadnych haseł, tokenów ani eksportu Auth. Nie umieszczać ich w Git ani w publicznych artefaktach. Opcjonalny `--backup-dir` również musi być prywatnym katalogiem poza repozytorium. Narzędzie drukuje tylko ścieżkę i SHA256 kopii. Kopia umożliwia przygotowanie osobnego, świadomego odzyskania danych; skrypt nie oferuje automatycznego przywracania starej generacji lub niebezpiecznych reguł.

## Atomowość, stare karty i powtórzenia

Wszystkie trzy konta i ich historie są resetowane **jednym Firestore commit**, z warunkiem bieżącego `updateTime` każdego zmienianego dokumentu. Zmiana świata podczas planowania kończy się konfliktem całego commitu; nic nie jest kasowane częściowo. Nowe operacje gry tworzą historie razem ze zmianą porównywanego konta/wyspy, dlatego nie mogą wejść niezauważone między odczytem a atomowym resetem. Narzędzie odmawia planu przekraczającego 450 zapisów lub 9 MB; nie przechodzi po cichu do częściowego kasowania w partiach.

`islandGeneration` każdego konta zwiększa się o jeden, zamiast wracać do 1. Stara karta korzystająca z API dostanie odrzucenie starej generacji; stara karta używająca bezpośredniego Firestore nie ma już uprawnienia do zapisu. Nie należy ręcznie usuwać konta `accounts/{uid}` ani cofać generacji.

Ten sam commit zapisuje `adminOperations/preprod-reset-RUN-ATTEMPT`: SHA, ID/próbę wdrożenia, hashe dowodów, trzy UID, nowe generacje i liczbę usuniętych historii/ofert. Sukces jest ogłaszany dopiero po odczytaniu tego dokumentu i generacji z Google. Ponowienie tego samego przebiegu widzi receipt i **nie resetuje ponownie** świeżej gry. Jeżeli utracono odpowiedź sieciową po commit, ponów te same parametry; nie wybieraj nowego przebiegu, by wymusić kolejny reset.

Po sukcesie uzupełnij [ENVIRONMENT-STATUS.md](ENVIRONMENT-STATUS.md) oraz dziennik implementacji o ID wdrożenia, SHA, ścieżkę receipt, generacje, czas i wynik odczytu; prywatna kopia nie trafia do dokumentacji. Dopiero te dowody pozwalają zmienić status z „zlecony, niewykonany” na „wykonany”. Kontrolę trzech kont wykonaj odczytowo; test odbiorowy nie powinien sam rozpoczynać wyspy.
