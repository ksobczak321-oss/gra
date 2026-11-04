# PRE-PROD 0.14.0.0 / v31 — odebrany

**4 listopada 2026: promocja DEV → PRE-PROD zakończona sukcesem.** Gra jest dostępna pod adresem [harborlight-dev.web.app](https://harborlight-dev.web.app). Użytkownik doprecyzował „Miałem na myśli z dev na pre prod”; operacje PROD nie były objęte tym zleceniem.

Wdrożono dokładne źródło `7e81a1a436770f57fd8abf390b6af8022e3300f6`, aplikacja **0.14.0.0**, cache `frontend-v31-2`. Standardowa ścieżka zachowała bramki CI, niezmienionego main i WIF. Konta, UID, hasła, wyspy, kolekcje i historia nagród pozostały zachowane bez resetu.

## Własne przebiegi dokładnego źródła

| Etap | Przebieg | Wynik | Czas |
|---|---|---|---|
| CI | [41906515746](https://github.com/ksobczak321-oss/gra/actions/runs/41906515746) | SUCCESS | 17 min 12 s |
| Podgląd Pages | [41906515747](https://github.com/ksobczak321-oss/gra/actions/runs/41906515747) | SUCCESS | 50 s |
| Bridge PRE-PROD | [41909239074](https://github.com/ksobczak321-oss/gra/actions/runs/41909239074) | SUCCESS | 13 s |
| Standardowy deploy | [41909268052, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41909268052) | SUCCESS | 2 min 12 s |

Pełny SHA potwierdzono na stronach przebiegów. Bramka wdrożenia miała 7 pomyślnych kroków, a job deploy 31. CI zaliczył obie grupy Chromium: 26 zestawów gry i nauki w 10 min 37 s oraz 17 zestawów logowania/zapisów w 3 min 30 s. Lokalne wyniki to 1190 frontend + 134 backend + 7 planszówka = 1331 Node, 141 Python oraz 43 zestawy Chromium PASS.

## Odbiór faktycznie opublikowanej gry

Standardowy workflow `google-cloud-dev.yml` potwierdził właściwe API/health/ready, dokładne wydanie Hostingu i każdy publiczny plik. Test Chromium otworzył rzeczywistą zalogowaną istniejącą wyspę, a osobna kontrola zaliczyła logowanie stałych kont admin1–admin3, odczyt własnego zapisu i izolację danych. Kontrole były odczytowe; nie zastępują ręcznej próby trwałego zapisu. Oba wymagane artefakty powstały z tej samej udanej próby.

Nie wykonywano resetu kont ani aktywacji rzeczywistych płatności, reklam, przelewów dobroczynnych lub integracji fizycznej gry. PROD zachował wcześniejszy stan.

## Pakiet i artefakty

Dokładny lokalny pakiet zawiera **85 plików / 19 682 273 bajty**. Budowa, pełna weryfikacja i rozpakowanie PASS:

- TAR SHA-256: `b43a736f4c30e8db9d2704b50219e0e6c1cf06c32660640ef66f1861cc412196`.
- Manifest SHA-256: `2dea4d8563fadaf38dcd8103dc9ee66088e69e34ba8cc74b544aaea4bf3bc54e`.

| Artefakt udanej próby | ID GitHub | Publiczny SHA-256 ZIP GitHub |
|---|---:|---|
| `harborlight-dev-frontend-41909268052-1` | 13362655258 | `703190f7cbdcb5c958e43ca13b9eb0ba0329f62916fb3aab8b19fb068d66e18b` |
| `harborlight-dev-release-41909268052-1` | 13361328096 | `2a13c37f0180e310ba11c545737a48a19ee16bd057ac823836a74d8c359fd01e` |

Nazwy, ID i digests odczytano z publicznego HTML GitHub Actions. Prywatnych ZIP-ów, wnętrza receipt, digestu obrazu ani dokumentów Firestore nie pobrano niezależnie w tej sesji. Publiczne hashe ZIP są odrębne od wewnętrznego TAR, manifestu i obrazu. Workflow zweryfikował i opublikował pełne potwierdzenie wydania; nie przypisujemy sobie osobnego odczytu jego prywatnych pól.

## Tagi i ewidencja

Oba tagi są opublikowane i potwierdzone zdalnie; rozwiązują się do `7e81a1a436770f57fd8abf390b6af8022e3300f6`:

- `dev-0.14.0.0-20261104`: obiekt `df353ff2a4ab68a7f4a671cb6261f81d4d805b1c`.
- `preprod-0.14.0.0-20261104`: obiekt `1b32f383eed957b03120c1616cbb50435e19c19f`.

Późniejszy commit dokumentacji nie przesuwa tagów ani nie zastępuje źródła wdrożenia. Rejestr ma **450 kart**; nowe implementacje HL-CHG-1083–1120 i operacja HL-CHG-1121 mają `deployed_source_7e81a1a`. Wszystkie **179 ręcznych prób pozostaje NOT RUN**. Excel 14 zaliczył walidację jako migawka reguł przygotowana przed promocją; jego informacja o poprzednim PRE-PROD jest historyczna.

## Zachowana historia i granice dowodów

Pierwszy kandydat `d2f9ab311b9f3ad5e6d45a6f4e934ce501973324` zachowuje CI 41896847613 FAILURE 13 min 16 s, Pages 41896847615 SUCCESS 25 s. Drugi `4db95a38a507df887e255331271a007947bc69c0` zachowuje CI 41901040379 FAILURE 12 min 33 s, Pages 41901040067 SUCCESS 1 min 20 s. Oba CI zablokowały promocję; tagów dla nich nie utworzono. Naprawiono gotowość osobnego testu i rzeczywisty błąd utraty fokusu Teatru. Dopiero trzeci kandydat ma własny pełny sukces.

Poprzedni odebrany PRE-PROD 0.13.1.0 / `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`, deploy 41673824262, pozostaje historią. Jego tagów i dowodów nie zmieniono.

[Symulacja gracza](design/CAMPAIGN-V31-SIMULATION.md) jest częściową obserwacją. Nie zaliczamy pełnych 50 dni ani 150 godzin ludzkiej zabawy na podstawie katalogu, finansowanych fikstur lub dotychczasowego śladu. Te ograniczenia pozostają oddzielne od pomyślnego wdrożenia.

[Dowody strukturalne](PREPROD-V31-EVIDENCE.json) · [Odbiór DEV](DEV-0.14.0.0-VALIDATION.md) · [Stan środowisk](ENVIRONMENT-STATUS.md) · [Proces promocji](RELEASE-PROCESS.md).
