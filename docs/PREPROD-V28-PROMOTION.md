# PRE-PROD 0.12.0.0 — promocja z zachowaniem kont

Użytkownik zlecił **„Promuj na pre prod” 2 listopada2026**. Promujemy aktualną odebraną aplikację DEV0.12.0.0/cachefrontend-v28-2 do istniejącego projektu `harborlight-dev`. Konta, hasła, postęp i rozpoczęte projekty pozostają. Nie uruchamiamy resetu, PROD, realnych płatności, reklam, przelewów ani integracji planszówki.

## Źródło i niezmienność aplikacji

Odebrane źródło DEV: `0ca7715b6e9282b31ca7941c89c3c742ac0df9e6`, [CI41475214118](https://github.com/ksobczak321-oss/gra/actions/runs/41475214118) SUCCESS12min33s, [Pages41475213874](https://github.com/ksobczak321-oss/gra/actions/runs/41475213874) SUCCESS31s. Nieprzesuwany tag `dev-0.12.0.0-20261102` pozostaje na tym SHA. Metadane `1e8b67ca29d807a543a5b0708f622b79e5d26cde` nie zmieniają60publicznych wejść.

Nowy commit promocji dodaje zamknięty marker0.12 do istniejącej allowlisty, testy dispatchera i dokumentację. Zachowuje wszystkie60wejść oraz backend aplikacji odebranego DEV. Nowy SHA potrzebuje własnego zielonego CI, mimo identycznych plików gry. Archiwum i manifest otrzymają jego SHA, więc ich nowe hashe nie mogą być podstawiane hashem dawnego archiwum DEV.

## Bieżące etapy

| Etap | Stan |
|---|---|
| Zlecenie właściciela | Potwierdzone: standardowy PRE-PROD0.12, bez resetu i PROD |
| Kod i wymagane lokalne kontrole dispatchera | PASS30/30 testów dispatchera i bramek promocji; generatory i brak zmian60wejść potwierdzone |
| Commit promocji / własneCI / Pages | PENDING — wymagany dokładny pełnySHA |
| Bridge / standardowy deploy | PENDING; brak wysłanego dispatchu przez tę sesję |
| Hosting, zalogowana gra, odczyty kont i izolacja | PENDING — osobne wyniki workflow |
| Oba artefakty i receipt | PENDING — dopiero po pełnym sukcesie tego samego przebiegu i próby |
| PRE-PROD przed tym zleceniem | Ostatni potwierdzony0.11.0.0/`c7c39742594599c54ee8b074b5c313efd88af4cb`, deploy41362782175SUCCESS |
| Dane / PROD | Bez resetu i nowej promocji PROD |

## Sposób uruchomienia i odbioru

Bezpośredni odczyt GHAPI w tej sesji ponownie zwróciłForbidden. Istniejący workflow_run bridge używa tokenu GitHubActions i standardowego `google-cloud-dev.yml`; pozwalamy tylko na dokładny `[preprod:0.12.0.0]`. Zachowuje tożsamość repozytorium, świeży sukces właściwego CI/SHA/próby, deduplikację i niezmieniony main tuż przed pojedynczym POST. Brak zmiany WIF, uprawnień workflow, sposobu wdrażania lub bramek. Nie ponawiamy niepewnego dispatchu bez odczytu faktycznego przebiegu.

Workflow sprawdza istniejące konta i postęp odczytowo, publikuje identyczny zweryfikowany pakiet i tworzy frontend+releasev2 artefakty dopiero po odbiorze. Zmiany modeli zapisują się przez normalną migrację klienta z zachowaniem generacji; nie jest potrzebny zbiorczy reset. API/Firestore pozostają w istniejącym trybie; nie przełączamy reguł w ciemno.

[Kontrakt](RELEASE-PROCESS.md) · [Odbiór DEV](DEV-0.12.0.0-VALIDATION.md) · [Stan środowisk](ENVIRONMENT-STATUS.md). Ręczne scenariusze nadal NOTRUN; automatyczne kontrole wdrożenia nie zmieniają ręcznych wyników.
