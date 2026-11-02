# PRE-PROD 0.12.0.0 — wdrożenie potwierdzone

**Wdrożono 2 listopada 2026:** [https://harborlight-dev.web.app](https://harborlight-dev.web.app), źródło `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`, wersja 0.12.0.0 / cache frontend-v28-2. Standardowy [deploy41482455135, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41482455135) zakończył się **SUCCESS, 2 min 20 s**. Konta, hasła i postęp pozostawiono; nie wykonywano resetu, promocjiPROD ani aktywacji realnych operatorów.

## Autoryzacja i dokładne źródło

Użytkownik zlecił „Promuj na pre prod” po odbiorze DEV0.12. Nowe zlecenie zastąpiło ograniczenie samego GO DEV; nie uruchamia historycznie omawianego resetu. Wszystkie60 publicznych wejść oraz kod backendu aplikacji zachowują odebraną implementację `0ca7715b6e9282b31ca7941c89c3c742ac0df9e6`. Nowy commit dodaje dokładny marker0.12 do zamkniętej allowlisty istniejącego bridge, jego testy i dokumentację. Samodzielnie przeszedł pełne CI przed wdrożeniem.

| Etap | Potwierdzony wynik |
|---|---|
| Commit promocji |`d9e2940b9a00755d979c159ec0fb62e290dd7ff1`; pushmain potwierdzony, main zachowany do potwierdzenia źródła deployu |
| CI dokładnegoSHA |[41480146644](https://github.com/ksobczak321-oss/gra/actions/runs/41480146644) **SUCCESS,13min46s** |
| Pages |[41480146737](https://github.com/ksobczak321-oss/gra/actions/runs/41480146737) **SUCCESS,41s**; podgląd odrębny odGCP |
| Rzeczywisty bridge |[41482423516](https://github.com/ksobczak321-oss/gra/actions/runs/41482423516) **SUCCESS,21s** |
| Standardowy deploy |[41482455135, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41482455135) **SUCCESS, 2 min 20 s** |
| Powiązanie zSHA |Publiczna strona deployu wskazuje dokładnie d9e2940…; gate125404047839 i deploy125404217870 zakończoneSUCCESS |
| API/health/ready |DeployAPI i kontrola dokładnego środowiska/wydania **SUCCESS** |
| Hosting |Publikacja oraz kontrola dokładnego pakietu hostowanego **SUCCESS** |
| Rzeczywista gra |Odbiór istniejącej zalogowanej wyspy w Chromium **SUCCESS**, wszystkie zapisy przeglądarki blokowane |
| Stałe konta |Odczytowa kontrola istniejących kont i izolacji zapisów **SUCCESS**; bez nadpisywania danych |
| Frontend/receipt |Publikacja obu artefaktów tej samej próby, zapis i publikacja potwierdzenia wydania **SUCCESS** |
| Tag |`preprod-0.12.0.0-20261102` opublikowany i potwierdzony przez `git ls-remote`; wskazuje dokładnie d9e2940… |
| Ręczne testy |96 przypadków nadal **NOTRUN**; automatyzacja nie odznacza ręcznych wyników |

Lokalnie przed commitem:30/30 testów dispatchera/bramek promocji,18/18 importera oraz generatory rejestru/listy/legal i porównanie60wejść PASS. CI dokładnego commitu ponownie wykonał modele, backend, pakowanie, dokumentację i oba zestawy32 zestawów Chromium.

## Artefakty i rozdzielenie hashy

Publiczne metadane artefaktów odczytano ze strony rzeczywiście udanego przebiegu. Każdy digest porównano w dwóch miejscach HTML GitHub: polu`code` i odpowiadającym`clipboard-copy`. Są to digests **ZIP-ów artefaktów GitHub**, a nie archiwumTAR, manifestu lub obrazuAPI.

| Artefakt próby 1 | ID | GitHubZIP SHA-256 |
|---|---|---|
|`harborlight-dev-frontend-41482455135-1`|`13160936132`|`sha256:bc476446a80cc5db333819aecb8d9eda8a433f95d2c401ede26e91681d503769`|
|`harborlight-dev-release-41482455135-1`|`13159179197`|`sha256:1c961039fc2372283fe17c2f898b8db347553c9487e873ccd3d1bc9c73802c80`|

Lokalnie z tego samegoSHA zbudowano deterministyczny pakiet **62 pliki/11 332 589bajtów**:

- TAR SHA-256:`7507a52b9b580659294cd08635859d97b7956a801d7b29309caa1932acdcfa3a`.
- Manifest SHA-256:`3033aa71c48adc6f51ba993faea4294d9914eb6de1e29cb4e3f4026d74f52c1f`.

Nie pobrano prywatnej zawartości ZIP. Wewnętrznyreceipt, dokładny digest obrazuAPI, wartość potwierdzenia aktywnościAPI i`expired:false` nie były niezależnie odczytane przez tę sesję. Workflow wykonał swoje kontrole i opublikował oba artefakty; nie zastępujemy tym brakującego odczytu wnętrzaZIP. DalszyPROD lub reset musi użyć oryginalnego potwierdzenia i swojej procedury. Weryfikację hostowanych bajtów i gry wykonał runner GCP; proxy tej sesji wcześniej blokował niezależny odczyt witrynyHTTP403.

## Bezpieczne uruchomienie

GHAPI tej sesji ponownie zwracałForbidden. Użyto dotychczasowego bridge z nowym dokładnym markerem `[preprod:0.12.0.0]`; nie zmieniano WIF, uprawnień workflow ani bramek CI/SHA/repozytorium/deduplikacji/niezmienionegomain. Nie było ponownego niepewnegoPOST. Bridge41480227597 SKIPPED dotyczył anulowanegoCI metadanych1e8b67c i nie jest wyzwalaczem tej promocji. Właściwy bridge to41482423516, a faktyczny deploy to41482455135.

Ostatni wcześniejszy PRE-PROD0.11/`c7c39742594599c54ee8b074b5c313efd88af4cb` i deploy41362782175 pozostają historią. TagDEV0.12 `dev-0.12.0.0-20261102` pozostaje na0ca7715; tagPRE-PROD wskazuje nowy, samodzielnie przetestowanyd9e2940. Dalszy commit samych dowodów nie zmienia60 publicznych wejść ani źródła wdrożenia.

[Kontrakt promocji](RELEASE-PROCESS.md) · [Odbiór DEV](DEV-0.12.0.0-VALIDATION.md) · [Stan środowisk](ENVIRONMENT-STATUS.md).


## Potwierdzony tag PRE-PROD

Nieprzesuwany tag `preprod-0.12.0.0-20261102` jest opublikowany i potwierdzony zdalnie. Obiekt tagu: `d66b25ba216e5b686e6a92b9b8558d35eda9fd2d`; wartość po rozwiązaniu tagu: `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`. To ten sam SHA co własne CI, faktyczny deploy oraz oba artefakty próby 1. Tag DEV pozostaje bez zmiany na źródle odebranej aplikacji.
