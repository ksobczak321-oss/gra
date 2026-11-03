# PRE-PROD 0.13.1.0 — wdrożenie potwierdzone

**Odebrano 2026-11-03T16:28:40+00:00: [gra PRE-PROD](https://harborlight-dev.web.app).** Źródło `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`; CI [41671140612](https://github.com/ksobczak321-oss/gra/actions/runs/41671140612) **SUCCESS, 14m 57s**, Pages [41671140578](https://github.com/ksobczak321-oss/gra/actions/runs/41671140578) **SUCCESS, 32s**, bridge [41673757060](https://github.com/ksobczak321-oss/gra/actions/runs/41673757060) **SUCCESS, 26s**, deploy [41673824262, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41673824262) **SUCCESS, 2m 56s**. Kontrole API/health/ready, dokładnego Hostingu, zalogowanej gry i izolacji trzech kont PASS; oba artefakty opublikowano. Konta, UID, hasła i postęp zachowano bez resetu. PROD i rzeczywiści operatorzy bez nowej aktywacji.

## Autoryzacja i dokładne źródło

Użytkownik polecił „super GO na pre prod”. Standardowy bridge z dokładnym markerem `[preprod:0.13.1.0]` uruchomił istniejący workflow GCP po własnym zielonym CI pełnego SHA. Nie zmieniano WIF ani bramek repozytorium, workflow, prób, deduplikacji i niezmienionego main. Nie wykonano resetu, PROD ani aktywacji rzeczywistych płatności, reklam i przelewów.

| Etap | Potwierdzony wynik |
|---|---|
| Kod odebranego DEV | `13c55a4e4853edf44c185747c1c626ac42c221fc`, 0.13.1.0 / cache `frontend-v30`; CI41667711260 SUCCESS14m39s, Pages41667711124 SUCCESS50s |
| Commit promocji | `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`; osobne źródło z własnym CI |
| CI dokładnego SHA | [41671140612](https://github.com/ksobczak321-oss/gra/actions/runs/41671140612) **SUCCESS, 14m 57s** |
| Pages promocji | [41671140578](https://github.com/ksobczak321-oss/gra/actions/runs/41671140578) **SUCCESS, 32s**; podgląd odrębny od GCP |
| Rzeczywisty bridge | [41673757060](https://github.com/ksobczak321-oss/gra/actions/runs/41673757060) **SUCCESS, 26s** |
| Standardowy deploy | [41673824262](https://github.com/ksobczak321-oss/gra/actions/runs/41673824262) **SUCCESS, 2m 56s**, próba 1 |
| Joby tej próby | gate `126048966118` SUCCESS, deploy `126049286557` SUCCESS |
| Kontrole środowiska | API/health/ready, dokładne pliki Hostingu, rzeczywista zalogowana gra i izolacja trzech stałych kont PASS |
| Publikacja artefaktów | Frontend i potwierdzenie wydania z tej samej udanej próby opublikowano |
| Ręczne testy | Wszystkie 147 wyników nadal **NOT RUN**; automatyzacja ich nie zalicza |

Tag `preprod-0.13.1.0-20261103` jest opublikowany i potwierdzony zdalnie: obiekt `52888386a2233fc326e4fa6e0169b1054c0316d4` rozwiązuje się do `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`. Tag DEV `dev-0.13.1.0-20261103` pozostaje na `13c55a4e4853edf44c185747c1c626ac42c221fc`. Późniejszy commit dokumentacji nie zastępuje źródła wdrożenia ani nie przesuwa tagów.

## Zachowanie aplikacji i lokalna walidacja

Wszystkie **75 jawnych wejść PUBLIC_FILES i osobno generowany index.html — łącznie 76 plików treści — są identyczne z DEV13c55a4**. Backend aplikacji zachowany. Wersja pozostaje0.13.1.0, schemat świata9 i archipelag2. Manifest wiąże nowe źródło promocji, więc jego digest jest osobnym dowodem.

Lokalnie przed promocją: **1221 Node PASS =1080 frontend +134 backend +7 planszówka**, w tym15 testów bridge;18 testów rejestru i generatory oraz Excel13 PASS. Odbiór DEV i jego własne CI zachowują oddzielne źródło i wyniki. Promocja ma własny sukces CI pełnego SHA wskazany powyżej.

## Artefakty i oddzielne digests

| Artefakt udanej próby | ID GitHub | SHA-256 ZIP GitHub |
|---|---:|---|
| `harborlight-dev-frontend-41673824262-1` | 13248538829 | `35c21f4ac8230927de659d341820f6afd7707f916e343aa19e20871f22057229` |
| `harborlight-dev-release-41673824262-1` | 13248913826 | `b23aaeb6b7f4f6eaaa2a501634b6ac593616a9d28fff66a36b175cbbc9f82f7c` |

Lokalny deterministyczny pakiet źródła promocji: **77 plików /19 410 989 bajtów**, z manifestem release.json; verify i extract PASS.

- TAR SHA-256: `9b49b70d318222ed3740e26aa632975e7a760f5f108cf5f2c0ce4833779b60d4`.
- Manifest SHA-256: `1e960edec80fdc7d89e359700d1c1c29e621369d04f78ed7f80364f681020b6d`.

Powyższe publiczne digests ZIP GitHub nie są hashem TAR, manifestu ani obrazu backendu. Prywatnej zawartości ZIP, wewnętrznego receipt, dokładnego digestu obrazu backendu ani rzeczywistego zapisu Firestore nie odczytano niezależnie w tej sesji. Kontrole hostowanych bajtów i zalogowanej gry wykonał runner workflow; nie zastępują osobnego testu zapisu. Test trwałości Teatru przez trzy sesje i dni używał lokalnego izolowanego store, a nie produkcyjnego dysku lub Firestore.

## Dane i historia

Istniejące Authentication, UID, loginy, hasła, wyspy, kolekcje i postęp admin1–admin3 zachowano. Odczytowy odbiór nie nadpisywał wysp fiksturą. Bieżący rejestr ma411kart;59 wdrożonych implementacji v29/v30 i operacja1082 otrzymują `deployed_source_68e9bcd`; decyzje częściowo zastąpione i dawne dowody DEV pozostają zachowane. Wszystkie147ręcznych scenariuszy nadal NOT RUN, w tym osobne próby zapisu TC0031/0145/0146.

Poprzedni PRE-PROD0.12.0.0/d9e2940 i deploy41482455135/próba1 pozostają historią w [poprzednim odbiorze](PREPROD-V28-PROMOTION.md). Nie przenosimy ich dowodów na nowe źródło.

[Kontrakt promocji](RELEASE-PROCESS.md) · [Odbiór DEV](DEV-0.13.1.0-VALIDATION.md) · [Stan środowisk](ENVIRONMENT-STATUS.md) · [Lista ręczna](testing/START-HERE.md).
