# Zasady pracy nad HARBORLIGHT

## Rozwój i publikacja

- Rozwijamy projekt w tej przestrzeni roboczej i synchronizujemy zmiany z GitHubem.
- Obowiązuje kolejność ustalona przez użytkownika: **praca tutaj → GitHub i CI → GCP DEV → GCP PROD**.
- Synchronizacja Git nie oznacza promocji do chmury. Wdrożenia GCP są oddzielnymi operacjami.
- Nie wdrażaj na PROD commitu ani obrazu, który nie przeszedł wcześniejszych etapów. Korzystaj z przygotowanych workflow; nie omijaj blokad ręcznym `gcloud run deploy`.
- DEV wymaga udanego CI tego samego commitu i testów gry opublikowanej z pakietu. PROD wymaga pełnego potwierdzenia wydania v2 oraz obu artefaktów z udanego DEV: identycznego archiwum frontendu i obrazu backendu po digest, bez ponownej budowy aplikacji. Potwierdzenia API-only v1 nie uprawniają do publikacji całej gry.
- Poprawka po testach wymaga ponownej walidacji zmienionego wydania. Frontend produkcyjny i migracje bazy muszą dołączyć do tego samego procesu przed publikacją.
- GitHub Pages jest podglądem deweloperskim repozytorium, nie środowiskiem GCP PROD.
- Jeżeli użytkownik wyraźnie zbiera serię uwag do wdrożenia po „GO”, zapisuj kontekst i czekaj z wdrożeniem do jego sygnału.

Szczegóły i kontrakt promocji: [docs/RELEASE-PROCESS.md](docs/RELEASE-PROCESS.md).

## Środowiska i potwierdzanie wyników

- DEV: projekt `harborlight-dev`; PROD: oddzielny projekt `harborlight-prod`. Region API i repozytoriów obrazów: `europe-central2`.
- Gra jest przygotowywana na Firebase Hosting: DEV `harborlight-dev.web.app`, docelowy PROD `harborlight.pl` (domena zarejestrowana w nazwa.pl). Rekordy DNS pochodzą z rzeczywistej odpowiedzi Firebase; nie zgaduj ich i nie traktuj przygotowania domeny jako publikacji gry.
- Dostęp workflow do Google Cloud odbywa się przez Workload Identity Federation. Nie zapisuj kluczy ani tokenów w kodzie i nie proś o ich przesyłanie w czacie.
- Odróżniaj testy lokalne, synchronizację Git, kontrolę konfiguracji i faktyczne wdrożenie z testami działającej usługi.
- Obraz backendu nadal zawiera sondy HTTP. DEV ma integrację Firebase Authentication i prywatnych zapisów Firestore dla `admin1`, `admin2`, `admin3`; rzeczywiste zasoby przygotowuje właścicielski `prepare-dev-users.py`. Konta mają stałe UID `dev-admin1`–`dev-admin3`; zwykłe wdrożenia nie tworzą ich ponownie ani nie zmieniają haseł/wysp. Tych kont i reguł nie przenosi się na PROD.
- Konfiguracja Firebase pochodzi z `/__/firebase/init.json`, a nie z osobnej kompilacji DEV. Frontend zachowuje te same bajty przy promocji. Bez zalogowanej sesji działa dotychczasowy lokalny podgląd; Firestore wymaga rzeczywistego tokenu właściciela dokumentu. Zapis gospodarki DEV nadal jest obliczany przez klienta, nie przez autorytatywny serwer.
- Publikacja na nowej domenie ani logowanie nie importują automatycznie `localStorage` z GitHub Pages lub profilu gościa. Sam sukces hostingu/sond nie potwierdza działania kont i zapisów. DEV wymaga dodatkowo rzeczywistej kontroli logowania i odmowy odczytu cudzych wysp, która nie nadpisuje postępu.
- Wyniki i istotne ograniczenia zapisuj w [docs/IMPLEMENTATION-LOG.md](docs/IMPLEMENTATION-LOG.md).
