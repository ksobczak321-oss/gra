# PRE-PROD 0.14.0.0 / v31 — promocja autoryzowana, wynik PENDING

**4 listopada 2026, Europe/Warsaw:** użytkownik doprecyzował „Miałem na myśli z dev na pre prod”; wcześniejsze niejednoznaczne „go na prod” oznacza zatem wyłącznie promocję DEV → PRE-PROD, bez operacji PROD.

Realizujemy standardową kolejność **DEV → własne CI dokładnego źródła → PRE-PROD i jego odbiór**. Zachowujemy konta, hasła, wyspy, kolekcje i historię nagród. Dokument zapisuje autoryzację i wymagane dowody, nie potwierdza ukończenia nowej publikacji.

Do sukcesu nowego wdrożenia ostatnim odebranym PRE-PROD pozostaje **0.13.1.0**, źródło `68e9bcd6adf22ab98f963688726a71d4d8a66c6b`, deploy [41673824262, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41673824262). Nowa wersja 0.14.0.0 ma status **PENDING**. Główny [rejestr środowisk](ENVIRONMENT-STATUS.md) rozdziela bieżący kod, własne CI, podgląd Pages i faktycznie opublikowany pakiet GCP.

## Stan etapów i wymagane dowody

| Etap | Stan przed publikacją |
|---|---|
| Autoryzacja | Jawne doprecyzowanie: wyłącznie DEV → PRE-PROD |
| Końcowe źródło DEV 0.14.0.0 | **PENDING**: pełny SHA, własny odbiór, pakiet i manifest |
| Źródło promocji | **PENDING**: pełny SHA i własne zielone CI tego samego źródła |
| Pages | **PENDING**: oddzielny podgląd, który nie potwierdza wdrożenia Google Cloud |
| Wąski bridge PRE-PROD | Dokładny marker `[preprod:0.14.0.0]`; rzeczywisty run i dispatch pozostają **PENDING** |
| Standardowy deploy | **PENDING**: run, próba i źródło istniejącego workflow `google-cloud-dev.yml` |
| API/health/ready | **PENDING**: potwierdzenie właściwego środowiska i dokładnego wydania |
| Hosting | **PENDING**: publikacja oraz zgodność manifestu i każdego pliku publicznego z pakietem |
| Rzeczywista gra | **PENDING**: odczyt zalogowanej istniejącej wyspy w Chromium, z blokadą zapisów testowych |
| Stałe konta | **PENDING**: logowanie admin1–admin3, odczyt własnych zapisów i izolacja danych |
| Artefakty v2 | **PENDING**: `harborlight-dev-frontend-RUN-ATTEMPT` i `harborlight-dev-release-RUN-ATTEMPT` z jednej udanej próby |
| Potwierdzenie wydania | **PENDING**: SHA, własny CI, próba, digest obrazu, hash TAR i manifestu; wartości odrębne od digestów ZIP GitHub |
| Tag PRE-PROD | **PENDING**: tworzony po sukcesie publikacji i potwierdzony odczytem zdalnego źródła |
| Ręczna lista | **179 przypadków NOT RUN**; automatyzacja nie zalicza prób użytkownika |

## Standardowa ścieżka uruchomienia

Istniejący [bridge](../.github/workflows/promote-urgent-preprod.yml) reaguje na sukces właściwego CI, a [dispatcher](../infra/google-cloud/urgent-preprod-dispatch.mjs) przyjmuje tylko jawnie autoryzowane oznaczenia. Wersja 0.14.0.0 korzysta z dokładnego markera `[preprod:0.14.0.0]`, zachowując kontrole repozytorium, workflow, pełnego SHA, próby, poprzednich uruchomień i niezmienionego `main`.

Przygotowany marker, push i pozytywny lokalny test nie są dowodem uruchomienia ani sukcesu Google Cloud. Końcowy commit promocji musi mieć własne zielone CI. Do odczytu źródła rozpoczętego deployu nie przesuwamy `main`; nie ponawiamy niepewnego dispatchu bez sprawdzenia faktycznego przebiegu.

[google-cloud-dev.yml](../.github/workflows/google-cloud-dev.yml) zachowuje bramkę wymaganego CI dokładnego źródła przed dostępem WIF. Buduje niezmienny obraz backendu i deterministyczny publiczny frontend, publikuje je do istniejącego projektu **harborlight-dev**, a następnie sprawdza endpointy API, wszystkie hostowane pliki, rzeczywistą zalogowaną grę i stałe konta. Dopiero wymagany sukces tworzy oraz publikuje pełne potwierdzenie wydania i parę artefaktów tej samej próby.

## Dane i zakres odbioru

Zwykłe wdrożenie zachowuje Authentication, UID, loginy, hasła i postęp admin1–admin3. Test opublikowanej gry nie tworzy zastępczej wyspy i nie nadpisuje istniejącego świata fiksturą. Potwierdzenie odczytowego renderowania nie jest automatycznie odbiorem trwałego zapisu; odpowiednie ręczne przypadki zachowują swój wynik NOT RUN.

Nie uruchamiamy resetu kont, integracji fizycznej gry ani rzeczywistych płatności, reklam czy przelewów dobroczynnych. Nie zmieniamy istniejących bramek CI/WIF ani konfiguracji usług w celu obejścia braku dowodu. Stan aktualnego PRE-PROD oraz rezultat nowej promocji są rozliczane osobno.

## Pakiet, artefakty i zakończenie odbioru

Końcowy manifest wiąże pełny SHA z nazwą, rozmiarem i hashem każdego publicznego pliku. Liczbę plików, rozmiar TAR, hash archiwum, hash manifestu i dokładny digest obrazu uzupełniamy po zbudowaniu i weryfikacji tego źródła. Nie przenosimy wartości z 0.13.1.0 na nowe 0.14.0.0.

Po rzeczywistym sukcesie dopisujemy numery runów i prób CI/bridge/deploy, pełne źródło, wyniki bramek i kontroli, identyfikatory obu artefaktów oraz osobne digests i zdalnie potwierdzony tag. Publiczny digest ZIP artefaktu nie zastępuje odczytu oryginalnego receipt, hashów wewnętrznego TAR i manifestu ani digestu obrazu. Brak niezależnego odczytu tych wartości pozostaje jawnym ograniczeniem odbioru.

Osobna karta operacji **HL-CHG-1121** reprezentuje tę promocję; rejestr ma **450 kart**, a **179 ręcznych prób pozostaje NOT RUN**.

[Wymagania v31](FRONTEND-V31-REQUIREMENTS.md) · [Odbiór DEV](DEV-0.14.0.0-VALIDATION.md) · [Proces promocji](RELEASE-PROCESS.md) · [Stan środowisk](ENVIRONMENT-STATUS.md).

## Wysłane źródło — stan po uruchomieniu

`d2f9ab311b9f3ad5e6d45a6f4e934ce501973324` w main. WłasneCI41896847613FAILURE13m16s; Pages41896847615SUCCESS25s. Most PRE-PROD czeka na sukcesCI; nowego wdrożenia ani tagu nie zaliczono. Bieżący PRE-PROD pozostaje0.13.1.0/68e9bcd.

Pierwszy CI zablokował promocję na pierwszej próbie PL/desktop swobodnego Teatru. PRE-PROD nie wystartował; poprzedni0.13.1.0 pozostaje aktualny. Wymagana poprawka oraz własny udanyCI nowego źródła.

Przygotowano poprawkę gotowości osobnego testu Teatru, z zachowanymi asercjami i diagnostyką.4/4+4/4 przy opóźnieniuCSSPASS; publiczna aplikacja bez zmian. Kolejnycommit wymaga własnego udanegoCI i standardowej promocji.
