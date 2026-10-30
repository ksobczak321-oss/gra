# Zasady pracy nad HARBORLIGHT

## Rozwój i publikacja

- **DEV** oznacza tę przestrzeń roboczą. **PRE-PROD** to projekt Google Cloud `harborlight-dev`, **PROD** to `harborlight-prod`. Nazwy istniejących workflow `google-cloud-dev.yml`, artefaktów `harborlight-dev-*` i zasobów pozostają techniczne; nie zmieniaj ich wyłącznie z powodu nowego nazewnictwa.
- Obowiązuje kolejność użytkownika: **DEV tutaj → GitHub i CI → PRE-PROD → PROD**. Synchronizacja Git nie jest promocją do chmury.
- Korzystaj z przygotowanych workflow; nie omijaj blokad przez ręczne `gcloud run deploy`. PRE-PROD wymaga zielonego CI tego samego pełnego SHA i testów opublikowanej gry.
- PROD wymaga pełnego potwierdzenia wydania v2 oraz obu artefaktów udanego PRE-PROD: identycznego archiwum frontendu i obrazu backendu po digest, bez ponownej budowy aplikacji. Potwierdzenie API-only v1 nie uprawnia do publikacji gry.
- Poprawiony kod wymaga ponownej walidacji. Konfiguracja API, migracje/reguły bazy i wymagane uprawnienia także muszą przejść wcześniejsze środowisko przed PROD.
- GitHub Pages jest podglądem deweloperskim, nie środowiskiem produkcyjnym. Push nie jest dowodem wdrożenia Google Cloud.
- Gdy użytkownik zbiera uwagi „po GO”, czekaj z implementacją i publikacją. GO z 30 października 2026 obejmuje [zakres v18](docs/FRONTEND-V18-REQUIREMENTS.md); jawne parametry wdrożeniowe w tym dokumencie odróżniamy od wcześniejszych decyzji użytkownika.
- Następne jawne zlecenie użytkownika obejmuje [uzupełnienie v19](docs/FRONTEND-V19-REQUIREMENTS.md): wylogowanie, robocze dokumenty i obowiązkowe potwierdzenia rejestracji, Excel 11 i scenariusze. Operator ma celowo dane „Lorem ipsum”; to nie jest gotowość dokumentów do sprzedaży. Ostateczna dyspozycja kosztowa: 100 USD/miesiąc jako alerty łącznie dla dwóch projektów; nie twierdź, że budżet ustawiono bez odczytu Google po zapisie.

Kontrakt promocji: [docs/RELEASE-PROCESS.md](docs/RELEASE-PROCESS.md).

## Stan faktyczny i granice v18

- Ostatnie potwierdzone wydanie PRE-PROD to **v18 / `6ec3c6d8625420fd96474a22a8b1d699672416cd`** na `https://harborlight-dev.web.app`. Pełne CI **`41111528800`** i ręczne wdrożenie **`41112673285`** zakończyły się sukcesem 30 października 2026. Przeszły start rzeczywistego obrazu przed WIF, sondy Cloud Run, manifest/hashes wszystkich plików, odczytowe renderowanie istniejącej zalogowanej wyspy i kontrole trzech kont. Zachowano oba artefakty v2: `harborlight-dev-frontend-41112673285-1` oraz `harborlight-dev-release-41112673285-1`.
- Historia `admin1` nie była resetowana przez wdrożenie. Wcześniejsze wydanie `f161e45` i nieudana próba `41110213741` są dowodami historycznymi opisanymi w dzienniku. Nowe zmiany nadal wymagają własnego CI i promocji; ponowienie starego przebiegu nie pobiera nowszego kodu. Treści potwierdzenia wydania ani jego wewnętrznych hashy nie odczytano tutaj — do PROD workflow musi zweryfikować je z artefaktów.
- PROD `harborlight.pl` w nazwa.pl nie jest jeszcze opublikowany. DNS i certyfikat odczytujemy z rzeczywistych odpowiedzi Firebase; nie zgaduj rekordów ani stanu propagacji.
- Region API i repozytoriów obrazów: `europe-central2`. Dostęp workflow przez WIF, bez kluczy kont usługowych w kodzie. Nie proś o przesyłanie sekretów w czacie.
- PRE-PROD ma stałe loginy `admin1`, `admin2`, `admin3`, UID `dev-admin1`–`dev-admin3`, Firebase Authentication i prywatne wyspy Firestore. Nie resetuj ich haseł ani postępu przy wdrożeniu. Konta testowe są wyłączone z trzymiesięcznego resetu i nie są kopiowane na PROD.
- v18 przechowuje postęp wyłącznie w chmurze: bez wysp, kopii odzyskiwania i kolejki zapisu w localStorage/sessionStorage. Techniczna sesja logowania oraz język mogą używać pamięci przeglądarki. Lokalny DEV może mieć wyraźny nietrwały podgląd w pamięci procesu.
- Awaria chmury nie może otwierać innego profilu, udawać zapisu ani pozwalać na dalsze zatwierdzanie niezapisanych operacji. Zachowaj kontrolę wersji i konfliktów; stare lokalne dane nie są automatycznym importem konta.
- Nowa wyspa powstaje raz przy pierwszym wejściu: Ratusz 1, 12 osób, brak przydzielonych pracowników, po 100 sześciu zasobów i bazowe H20%. Ochrona powitalna min.20% trwa 72 h; wymuszone 100% ma pierwszeństwo. Kolejne wejście wznawia wyspę i rozlicza nieobecność.
- Rejestracja e-mail i kod OAuth Google/Facebook dotyczą kont produkcyjnych po aktywacji dostawców przez właściciela. Sam przycisk lub test z atrapą nie potwierdza konfiguracji Google/Meta. Udostępnianie osiągnięcia inicjuje i zatwierdza gracz; brak automatyzacji strony i osobistych powiadomień FB.
- Paynow i nagradzane reklamy mają oznaczoną symulację tylko poza PROD. Rzeczywiste płatności/nagrody wymagają zaufanego potwierdzenia serwera/dostawcy; nie przyznawaj produkcyjnego zakupu za klienckie `verified:true`. Próg bez reklam 1999 gr/30 dni jest odrębny od pakietu budowlanego 24 h; reklamy za czas ekspedycji pozostają także dla uprawnionych.
- Kod serwerowego API kont, globalnych limitów kodów i retencji nie oznacza jego aktywacji w chmurze. Wymaga konfiguracji routingu, IAM i zasobów oraz osobnych testów. Gospodarka i wyniki nadal są wyliczane przez klienta — nie nazywaj ich autorytatywnym modelem serwerowym.
- Reset po trzech miesiącach kalendarzowych zachowuje konto i historie płatności/kodów/poleceń. Automatyczne zwroty zostały wycofane. [Regulamin](docs/TERMS-DRAFT.pl.md) jest szkicem do weryfikacji, nie potwierdzeniem legalnego uruchomienia sprzedaży.
- Oddzielaj wyniki lokalne, synchronizację Git, odczyt konfiguracji i faktyczne wdrożenie. Zapisuj dowody w [dzienniku](docs/IMPLEMENTATION-LOG.md), nie zamieniając historycznych sukcesów w odbiór nowego kodu.
