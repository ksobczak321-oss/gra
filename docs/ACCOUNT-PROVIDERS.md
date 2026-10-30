# Konta Google/Facebook i e-mail

Kod rejestracji i logowania obsługuje Firebase Authentication. Faktyczne włączenie dostawców wymaga dostępu właściciela do konsol Google i Meta; obecność przycisków i testy z odpowiedziami testowymi nie potwierdzają logowania rzeczywistym kontem.

## Środowiska

- DEV to lokalny rozwój i testy z izolowanymi odpowiedziami Firebase.
- PRE-PROD to istniejący projekt `harborlight-dev` i stałe konta `admin1`, `admin2`, `admin3`. Rejestracja e-mail jest wyłączona. OAuth dopuszcza tylko te trzy UID; tester może jawnie powiązać Google/Facebook ze swoim istniejącym kontem, wpisując login i hasło przed wybraniem dostawcy. Nie zmieniamy UID, hasła ani wyspy.
- PROD to projekt `harborlight-prod`, domeny `harborlight-prod.web.app`, `harborlight-prod.firebaseapp.com`, `harborlight.pl` i `www.harborlight.pl`. Rejestracja e-mail i logowanie Google/Facebook tworzą rzeczywiste tożsamości Firebase.

Konfiguracja publiczna pochodzi z `/__/firebase/init.json` właściwego hostingu. Klient sprawdza projekt, UID i spójność tokenu; Google oraz serwer sprawdzają rzeczywistą tożsamość. Wyspa PROD jest pobierana i zapisywana wyłącznie przez uwierzytelnione `/api/v1`, bez awaryjnego tworzenia lokalnego postępu lub bezpośredniego zapisu do Firestore przez przeglądarkę.

## Konfiguracja właścicielska przed uruchomieniem

1. W istniejącym projekcie Firebase **`harborlight-prod`** przygotuj aplikację internetową i Authentication. Włącz metodę e-mail/hasło.
2. W Authentication włącz Google i wybierz wymagany adres wsparcia.
3. W ustawieniach autoryzowanych domen uwzględnij rzeczywiście używane domeny PROD: hosting Firebase oraz domenę własną. Nie kopiuj listy domen PRE-PROD bez sprawdzenia projektu.
4. W Meta przygotuj aplikację z logowaniem Facebook dla witryny gry. W konfiguracji OAuth użyj adresu przekierowania Firebase:
   `https://harborlight-prod.firebaseapp.com/__/auth/handler`.
5. W dostawcy Facebook w Firebase wpisz identyfikator aplikacji i sekret z Meta. **Sekret pozostaje w konfiguracji dostawcy; nie trafia do repozytorium, klienta JavaScript ani czatu.** Sprawdź zgodność domen i wymagane przez Meta adresy witryny/polityk.
6. Zweryfikuj tryb aplikacji Meta i to, czy logowanie jest dostępne dla docelowych użytkowników. Tryb deweloperski może dopuszczać wyłącznie role i konta testowe. Wymagania publikacji i przeglądu zależą od konfiguracji Meta.
7. Skonfiguruj produkcyjne API kont oraz przekierowanie Hosting `/api/**` do właściwej usługi Cloud Run. Bez skonfigurowanego API gra zgłasza błąd, zamiast udawać zapis.

Właściciel nie musi przekazywać sekretów agentowi. Dostawców można włączyć w konsolach; publiczne parametry klient pobiera przy uruchomieniu.

Najpierw tę samą konfigurację dostawców należy sprawdzić w istniejącym projekcie PRE-PROD `harborlight-dev`, z jego własną aplikacją Meta i adresem `https://harborlight-dev.firebaseapp.com/__/auth/handler`. Powiązanie odbywa się przez uwierzytelnienie istniejącego konta hasłem i oficjalne `linkWithPopup`, nie przez kopiowanie tożsamości na PROD. Kolejne logowanie dostawcą jest dopuszczone wyłącznie dla stałego testowego UID. Obca tożsamość może zostać utworzona przez dostawcę Auth, ale nie uzyskuje dostępu do gry, nowej wyspy ani uprawnień jednego z trzech testerów.

## Zachowanie kont i osiągnięć

- Pierwszy start wyspy następuje po pierwszym wejściu do gry, nie po samym przygotowaniu tożsamości lub testowym sprawdzeniu hasła.
- Rejestracja może zapisać wybraną nazwę wyspy w profilu Auth, z prefiksem `HARBORLIGHT:`. Zwykła nazwa użytkownika dostawcy nie jest automatycznie nazwą jego wyspy.
- Konto z inną metodą logowania nie jest łączone wyłącznie dlatego, że podało ten sam e-mail. Gracz otrzymuje informację, aby użyć dotychczasowej metody.
- Przeglądarka może zachować techniczną sesję logowania i język. Nie przechowuje lokalnego postępu wyspy.
- Udostępnienie osiągnięcia otwiera systemowe udostępnianie lub formularz Facebooka. Gracz sam zatwierdza publikację. Otwarcie formularza nie jest dowodem opublikowania posta.
- Automatyczne posty na stronie gry i osobiste powiadomienia Facebooka pozostają odłożone. OAuth nie daje takiego kanału powiadomień.

## Weryfikacja

Testy modelu: `tests/harborlight-dev-cloud.test.mjs`, `tests/harborlight-v18-auth.test.mjs`.

Testy formularzy z izolowanymi odpowiedziami, bez prawdziwych kont: `tests/harborlight-dev-auth-smoke.py`, `tests/harborlight-v18-auth-smoke.py`.

Odbiór rzeczywistego dostawcy wymaga zalogowania w opublikowanym środowisku, sprawdzenia UID i dostępu wyłącznie do własnej wyspy. Nie należy utożsamiać go z testami interfejsu ani samym sukcesem wdrożenia.
