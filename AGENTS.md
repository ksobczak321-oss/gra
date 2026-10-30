# Zasady pracy nad HARBORLIGHT

## Rozwój i publikacja

- Rozwijamy projekt w tej przestrzeni roboczej i synchronizujemy zmiany z GitHubem.
- Obowiązuje kolejność ustalona przez użytkownika: **praca tutaj → GitHub i CI → GCP DEV → GCP PROD**.
- Synchronizacja Git nie oznacza promocji do chmury. Wdrożenia GCP są oddzielnymi operacjami.
- Nie wdrażaj na PROD commitu ani obrazu, który nie przeszedł wcześniejszych etapów. Korzystaj z przygotowanych workflow; nie omijaj blokad ręcznym `gcloud run deploy`.
- DEV wymaga udanego CI tego samego commitu. PROD wymaga udanego przebiegu DEV i ważnego potwierdzenia wydania oraz promuje identyczny obraz po digest, bez ponownej budowy aplikacji.
- Poprawka po testach wymaga ponownej walidacji zmienionego wydania. Frontend produkcyjny i migracje bazy muszą dołączyć do tego samego procesu przed publikacją.
- GitHub Pages jest podglądem deweloperskim repozytorium, nie środowiskiem GCP PROD.
- Jeżeli użytkownik wyraźnie zbiera serię uwag do wdrożenia po „GO”, zapisuj kontekst i czekaj z wdrożeniem do jego sygnału.

Szczegóły i kontrakt promocji: [docs/RELEASE-PROCESS.md](docs/RELEASE-PROCESS.md).

## Środowiska i potwierdzanie wyników

- DEV: projekt `harborlight-dev`; PROD: oddzielny projekt `harborlight-prod`. Region API i repozytoriów obrazów: `europe-central2`.
- Dostęp workflow do Google Cloud odbywa się przez Workload Identity Federation. Nie zapisuj kluczy ani tokenów w kodzie i nie proś o ich przesyłanie w czacie.
- Odróżniaj testy lokalne, synchronizację Git, kontrolę konfiguracji i faktyczne wdrożenie z testami działającej usługi.
- Początkowy obraz backendu zawiera sondy HTTP; sam jego sukces nie potwierdza działania kont graczy, trwałego zapisu ani bazy.
- Wyniki i istotne ograniczenia zapisuj w [docs/IMPLEMENTATION-LOG.md](docs/IMPLEMENTATION-LOG.md).
