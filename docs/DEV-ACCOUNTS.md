# Stałe konta PRE-PROD — techniczny projekt DEV

Użytkownik ustalił trzy konta:**admin1, admin2, admin3**, logowanie nazwą i hasłem oraz postęp dostępny na różnych urządzeniach. Początkowe hasła mają odpowiadać nazwom kont. Dotyczy to wyłącznie projektu `harborlight-dev`.

DEV oznacza bieżącą przestrzeń roboczą; projekt `harborlight-dev` jest PRE-PROD. **Ostatnie odebrane PRE-PROD to 0.11.0.0 / `c7c39742594599c54ee8b074b5c313efd88af4cb`**, [promocja 41362782175, próba 1 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41362782175). Nowy lokalny zakres 0.12.0.0/v28 jest w trakcie odbioru i nie ma wtym GO nowej promocji ani resetu. Osobne historyczne zlecenie resetu nie zostało wykonane. Bieżące wersje i dowody: [rejestr środowisk](ENVIRONMENT-STATUS.md). Gra PRE-PROD: https://harborlight-dev.web.app.

## Przygotowanie przez właściciela

Po przygotowaniu Firebase Hosting, w zalogowanym Cloud Shell:

```sh
(
set -e
cd ~/harborlight-infra
git pull --ff-only
python3 infra/google-cloud/prepare-dev-users.py --apply --passwords-match-logins
)
```

Jeśli projekt nie ma jeszcze uruchomionego Authentication, otwórz [Authentication DEV](https://console.firebase.google.com/project/harborlight-dev/authentication) i wybierz **Get started / Rozpocznij**, a następnie ponów skrypt. Skrypt skonfiguruje metodę logowania hasłem.

Skrypt sprawdza projekt, etykietę DEV i rozliczenia HARBORLIGHT. Żądania właściciela wskazują `harborlight-dev` zarówno w ścieżce zasobu, jak i w nagłówku projektu kwot `x-goog-user-project`; token Cloud Shell nie wybiera wtedy technicznego projektu OAuth jako konsumenta API. Skrypt przygotowuje logowanie e-mail/hasło w Firebase Authentication, aplikację Web i jej powiązanie z Hostingiem, bazę Firestore `(default)` w `europe-central2` oraz reguły prywatnych wysp. Nie publikuje plików gry. Nie tworzy serwera SQL, stałych kluczy ani użytkowników PROD.

UID kont to `dev-admin1`, `dev-admin2`, `dev-admin3`. Alias w formularzu jest mapowany na odpowiedni techniczny adres `adminN@dev.harborlight.pl`; skrzynka pocztowa nie jest potrzebna do tego logowania. Są to tożsamości gry, bez ról administracyjnych Google Cloud.

Opcja `--passwords-match-logins` dotyczy tylko nowych kont. Ponowienie zachowuje istniejące tożsamości, hasła i dokumenty wysp; nie wykonuje resetów ani usuwania danych. Bez tej opcji nowe hasła są pobierane interaktywnie przez `getpass`. Hasła nie trafiają do plików, argumentów polecenia, logów ani frontendu. Rejestracja i usuwanie kont przez klienta są wyłączone.

Domyślny `--check` odczytuje stan. Skrypt odmawia użycia innego projektu, zmiany typu/lokalizacji istniejącej bazy i zastąpienia nieznanej polityki Firestore. Kompiluje reguły przez oficjalne API Google przed ich publikacją. Po zablokowaniu bezpośrednich zapisów na rzecz API rozpoznaje oznaczone reguły API-only i nie przywraca wcześniejszych uprawnień klienta. Konfiguracja i końcowy odczyt zasobów nie zastępują testu gry po wdrożeniu.

Tworzenie aplikacji Web i bazy zwraca długotrwałe operacje Google. Ich identyfikatory są traktowane jako nieprzezroczyste: mogą zawierać hierarchię Firebase, dwukropki i padding `=`. Odczyt pozostaje na tej samej usłudze Google, a operacje Firestore dotyczą wyłącznie projektu DEV i bazy `(default)`. Ponowienie wyszukuje istniejącą aplikację i bazę zamiast je usuwać lub resetować.

## Logowanie i trwałość postępu

Wejście przez główny adres `https://harborlight-dev.web.app` kieruje do formularza. Bieżący kod DEV pozwala wznowić sesję wyłącznie przed jej terminem bezczynności; 30 minut bez rzeczywistej aktywności i 30 sekund ostrzeżenia kończy sesję, także po zamknięciu przeglądarki. Podgląd DEV jest nietrwały; kont testowych nie przenosimy do PROD.

Konfiguracja projektu jest pobierana w czasie działania z `/__/firebase/init.json`. Pozwala to promować identyczne archiwum frontendu, bez wbudowywania poświadczeń albo osobnej kompilacji DEV. Firebase Authentication zarządza hasłami i sesjami, a Firestore weryfikuje tokeny oraz uprawnienia.

Każdy użytkownik ma własny dokument `islands/{uid}` w chmurze. Nie ma lokalnego cache wyspy, kopii odzyskiwania ani kolejki zapisu w pamięci przeglądarki; pamięć sesji i języka nie jest zapisem gry. Parametry `profile` i `slot` nie zmieniają tożsamości zalogowanego konta. Zapis gościa lub starej domeny nie jest automatycznie kopiowany do konta.

Gra wczytuje zapis konta przed rozpoczęciem symulacji. Bieżący kod zapisuje automatycznie co 30 sekund; zapis zawiera rewizję i warunek zgodności wersji serwera. Konflikt dwóch urządzeń zatrzymuje automatyczne nadpisywanie; nie powstaje trwała lokalna kopia. Błąd sieci nie jest przedstawiany jako udany zapis w chmurze. Wylogowanie ani zwykła publikacja nowego pakietu nie usuwają wyspy.

Nowa wyspa ma Ratusz 1, 12 mieszkańców, po 100 monet i każdego z pięciu materiałów oraz brak przydzielonych pracowników. W bieżącym kodzie DEV nowe konto przechodzi opis gry, nazwanie wyspy i oprowadzanie; czas świata startuje po ukończeniu albo zamknięciu oprowadzania. Samo utworzenie konta i odczytowy test logowania nie uruchamiają wyspy. Kolejne logowania nie odnawiają startera.

Historyczne reguły bezpośrednie pozwalają tylko trzem wskazanym UID odczytywać i zmieniać własny dokument. Po przejściu na API-only wszystkie bezpośrednie odczyty i zapisy Firestore przez klienta są zabronione; backend rozpoznaje właściciela z tokena Firebase. Obce i anonimowe odczyty są zawsze niedozwolone. Zapis jest ograniczony do 700 000 bajtów i wymaga kolejnej rewizji; API kontroluje również generację wyspy.

To synchronizacja stanu przeglądarkowej gry DEV. Obliczenia gospodarki nadal wykonuje klient. Konta i gospodarka produkcyjna wymagają osobnego wdrożenia oraz reguł dla rzeczywistych graczy.

## Kontrola wydania

Obowiązuje kolejność:**DEV tutaj → GitHub/CI → PRE-PROD → PROD**. Źródłowe CI sprawdza protokół logowania, odświeżanie sesji, trwałość kont, izolację zapisów, konflikty i rzeczywisty interfejs z izolowanymi odpowiedziami usług Google.

Po publikacji PRE-PROD z historycznym bezpośrednim dostępem workflow uruchamia:

```sh
node infra/google-cloud/check-dev-accounts.mjs --passwords-match-logins
```

Przy `HARBORLIGHT_ACCOUNT_API_ENABLED=true` albo `1` workflow jawnie dodaje tryb API:

```sh
node infra/google-cloud/check-dev-accounts.mjs --passwords-match-logins --account-api
```

Kontrola loguje wszystkie trzy rzeczywiste tożsamości Firebase, sprawdza ich UID/audience/issuer/ważność tokena i odczytuje `/api/v1/island` na tym samym hostingu. API nie ma parametru wyboru cudzego UID: właściciela wyznacza token. Sprawdzane są generacja, rewizja, znacznik czasu i ograniczony payload, a anonimowe żądanie musi otrzymać 401. Dodatkowo wszystkie obce i anonimowe bezpośrednie odczyty Firestore muszą zwrócić 403. Po blokadzie API-only własny bezpośredni odczyt także zwraca 403; przed pierwszym resetem dopuszczony jest dotychczasowy odczyt własny 200/404. Liczniki wyniku rozdzielają te sytuacje.

Narzędzie nie wysyła komend utworzenia, zapisu, resetu ani usunięcia wyspy. Logowanie aktualizuje metadane Auth; zwykły odczyt API może zainicjować serwerowe metadane starego konta bez nadpisywania wyspy. Udany przebieg jest warunkiem potwierdzenia wydania. Odtwarzanie sesji, zapis i konflikty mają dodatkowe testy lokalne; nie zastępują odbioru wdrożenia Google Cloud.

## Osobny reset po promocji v22

Historyczne zlecenie v22 upoważniało do resetu stanu gry **admin1, admin2 i admin3 po udanej, zweryfikowanej promocji PRE-PROD**. W tej jednej operacji wcześniejsza ochrona postępu admin1 zostaje zastąpiona nową dyspozycją. Tożsamości Authentication, UID, loginy, hasła i zgody prawne pozostają zachowane. Procedura wymaga aktywnego API, blokady starych zapisów, kopii i odczytu wyniku: [PREPROD-RESET.md](PREPROD-RESET.md). Bieżący wynik resetu podaje [rejestr środowisk](ENVIRONMENT-STATUS.md); przygotowany skrypt nie oznacza wykonania resetu.

Firestore i Authentication rozliczają wykorzystanie usług. Nie uruchamia się stale działającej bazy SQL. Częstotliwość wysyłania zapisów jest ograniczona; limity i ceny usług trzeba uwzględniać przy zwiększaniu liczby graczy.

## Zgodność zapisów v28

Nowy kurs 6 ma 25 lekcji i zaczyna się od 3 tragarzy; programy 3/4/5 zachowują stan, kryteria i historię nagród. Usunięcie turbo nowych budów nie przelicza rozpoczętych projektów. Bank Domu, modlitwy, premie misji i obejrzana narracja są normalizowane bez odtwarzania nagród. Nowe przypadki TC0071–0090 w [ręcznym planie](testing/START-HERE.md) wymagają izolowanychfixture; nie służą do zerowaniaadmin1–admin3. Przygotowane endpointy statku i mocka Pomagamnie dowodzą ich nowego wdrożenia w GCP.
