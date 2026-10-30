# Stałe konta DEV

Użytkownik ustalił trzy konta: **admin1, admin2, admin3**, logowanie nazwą i hasłem oraz postęp dostępny na różnych urządzeniach. Początkowe hasła mają odpowiadać nazwom kont. Dotyczy to wyłącznie projektu `harborlight-dev`.

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

Skrypt sprawdza projekt, etykietę DEV i rozliczenia HARBORLIGHT. Żądania właściciela wskazują `harborlight-dev` zarówno w ścieżce zasobu, jak i w nagłówku projektu kwot `x-goog-user-project`; token Cloud Shell nie wybiera wtedy technicznego projektu OAuth jako konsumenta API. Skrypt przygotowuje logowanie e-mail/hasło w Firebase Authentication, aplikację Web i jej powiązanie z Hostingiem, bazę Firestore `(default)` w `europe-central2` oraz reguły prywatnych wysp. Nie publikuje plików gry. Nie tworzy serwera SQL, stałych kluczy ani użytkowników PROD.

UID kont to `dev-admin1`, `dev-admin2`, `dev-admin3`. Alias w formularzu jest mapowany na odpowiedni techniczny adres `adminN@dev.harborlight.pl`; skrzynka pocztowa nie jest potrzebna do tego logowania. Są to tożsamości gry, bez ról administracyjnych Google Cloud.

Opcja `--passwords-match-logins` dotyczy tylko nowych kont. Ponowienie zachowuje istniejące tożsamości, hasła i dokumenty wysp; nie wykonuje resetów ani usuwania danych. Bez tej opcji nowe hasła są pobierane interaktywnie przez `getpass`. Hasła nie trafiają do plików, argumentów polecenia, logów ani frontendu. Rejestracja i usuwanie kont przez klienta są wyłączone.

Domyślny `--check` odczytuje stan. Skrypt odmawia użycia innego projektu, zmiany typu/lokalizacji istniejącej bazy i zastąpienia nieznanej polityki Firestore. Kompiluje reguły przez oficjalne API Google przed ich publikacją. Konfiguracja i końcowy odczyt zasobów nie zastępują testu gry po wdrożeniu.

## Logowanie i trwałość postępu

Wejście przez główny adres `https://harborlight-dev.web.app` kieruje do formularza. Zachowana sesja pozwala wrócić do gry bez ponownego wpisywania hasła. Inne środowiska zachowują dotychczasowy lokalny podgląd; ten pakiet nie uruchamia kont testowych w PROD.

Konfiguracja projektu jest pobierana w czasie działania z `/__/firebase/init.json`. Pozwala to promować identyczne archiwum frontendu, bez wbudowywania poświadczeń albo osobnej kompilacji DEV. Firebase Authentication zarządza hasłami i sesjami, a Firestore weryfikuje tokeny oraz uprawnienia.

Każdy użytkownik ma dokument `islands/{uid}` i osobny lokalny cache. Parametry `profile` i `slot` nie zmieniają tożsamości zalogowanego konta. Zapis gościa lub starej domeny nie jest automatycznie kopiowany do konta.

Gra wczytuje zapis konta przed rozpoczęciem symulacji. Wysyłanie zmian jest ograniczone w czasie, a zapis zawiera numer rewizji i warunek zgodności wersji serwera. Konflikt dwóch urządzeń zatrzymuje automatyczne nadpisywanie i zachowuje lokalną kopię. Błąd sieci nie jest przedstawiany jako udany zapis w chmurze. Wylogowanie ani publikacja nowego pakietu nie usuwają wyspy.

Reguły pozwalają tylko trzem wskazanym UID odczytywać i zmieniać własny dokument. Nie pozwalają przeglądać wszystkich wysp, odczytywać cudzych zapisów ani usuwać dokumentów. Zapis jest ograniczony do 700 000 bajtów i wymaga kolejnej rewizji oraz czasu serwera.

To synchronizacja stanu przeglądarkowej gry DEV. Obliczenia gospodarki nadal wykonuje klient. Konta i gospodarka produkcyjna wymagają osobnego wdrożenia oraz reguł dla rzeczywistych graczy.

## Kontrola wydania

Obowiązuje kolejność: praca tutaj → GitHub/CI → DEV → PROD. Źródłowe CI sprawdza protokół logowania, odświeżanie sesji, trwałość kont, izolację zapisów, konflikty i rzeczywisty interfejs z izolowanymi odpowiedziami usług Google.

Po publikacji DEV workflow uruchamia:

```sh
node infra/google-cloud/check-dev-accounts.mjs --passwords-match-logins
```

Ta kontrola loguje się do rzeczywistego Firebase DEV, odczytuje własne dokumenty oraz wymaga odmowy dostępu dla pozostałych kont i anonimowego żądania. Nie zmienia dokumentów wysp. Udany przebieg jest warunkiem utworzenia potwierdzenia wydania DEV. Odtwarzanie sesji, zapis i konflikty mają dodatkowe testy lokalne; pełne potwierdzenie działania na Google Cloud wymaga przygotowania rzeczywistych zasobów i udanego wdrożenia.

Firestore i Authentication rozliczają wykorzystanie usług. Nie uruchamia się stale działającej bazy SQL. Częstotliwość wysyłania zapisów jest ograniczona; limity i ceny usług trzeba uwzględniać przy zwiększaniu liczby graczy.
