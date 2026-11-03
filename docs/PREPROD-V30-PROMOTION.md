# PRE-PROD 0.13.1.0 — promocja autoryzowana, wynik PENDING

Użytkownik zlecił „super GO na pre prod”. Zgoda obejmuje standardową promocję wersji 0.13.1.0 po własnym zielonym CI dokładnego źródła. Nie obejmuje resetu kont, PROD ani aktywacji rzeczywistych płatności, reklam lub przelewów.

**To dokument przygotowania, nie potwierdzenie wdrożenia.** Do odczytu nowego deployu zakończonego SUCCESS aktualnym odebranym PRE-PROD pozostaje **0.12.0.0**, źródło `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`, deploy [41482455135, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41482455135). Stan bieżący rozstrzyga [rejestr środowisk](ENVIRONMENT-STATUS.md).

## Przygotowane źródło i wymagane dowody

| Etap | Stan w chwili przygotowania |
|---|---|
| Kod aplikacji DEV |`13c55a4e4853edf44c185747c1c626ac42c221fc`, wersja 0.13.1.0 / cache `frontend-v30` |
| CI źródła DEV |[41667711260](https://github.com/ksobczak321-oss/gra/actions/runs/41667711260): **SUCCESS, 14 min 39 s** |
| Pages źródła DEV |[41667711124](https://github.com/ksobczak321-oss/gra/actions/runs/41667711124): **SUCCESS, 50 s**; podgląd jest odrębny od GCP |
| Dokładny marker |`[preprod:0.13.1.0]` w zamkniętej allowliście istniejącego bridge |
| Commit promocji |**TODO: pełny SHA** po utworzeniu; nie zastępuj go samym SHA wcześniejszego DEV |
| Własne CI commitu promocji |**TODO: numer przebiegu, próba i SUCCESS tego samego pełnego SHA** |
| Bridge |**TODO: rzeczywisty przebieg i wynik dispatchu**; przygotowanie markera nie oznacza uruchomienia |
| Standardowy deploy GCP |**TODO: numer, próba, źródło i końcowy wynik** workflow `google-cloud-dev.yml` |
| Hosting i API |**PENDING**: zgodność dokładnych plików, wydania, `/health` i `/ready` |
| Zalogowana gra i izolacja kont |**PENDING**: odbiór odczytowy istniejących wysp, bez zastępowania postępu fiksturą |
| Artefakty i receipt |**TODO: nazwy, numery prób, identyfikatory i odpowiednie digests** |
| Tag PRE-PROD |**TODO po sukcesie wdrożenia i weryfikacji**; nie twórz go na podstawie samego push lub Pages |
| Ręczne scenariusze |147 przypadków nadal **NOT RUN**; ta promocja nie odznacza listy automatycznie |

Własne CI kodu DEV nie zwalnia nowego commitu promocji z jego własnej kontroli. Nie przenosimy na nowy SHA historycznych wyników 0.13.0.0 lub 0.12.0.0. Dotychczasowy zielony odbiór markera i pełne lokalne testy są przygotowaniem, nie dowodem uruchomionego GCP.

## Zachowanie kodu aplikacji

Commit promocji może dodać autoryzowany marker, testy bramek i metadane. Kod, grafika oraz konfiguracja publicznego pakietu mają odpowiadać odebranemu źródłu aplikacji DEV. Bieżący skrypt pakowania rozróżnia:

- **75 jawnych wejść** `PUBLIC_FILES`;
- generowany osobno **`index.html`**, razem 76 plików treści;
- **`release.json`**, który wiąże pełny SHA z hashami treści; łącznie 77 plików pakietu.

Porównaj 75 wejść bajt w bajt i sprawdź generowany indeks osobno. Manifest dla nowego SHA, hash manifestu oraz hash TAR są odrębnymi metadanymi. Digest ZIP artefaktu GitHub ani digest obrazu backendu nie mogą być zastępowane lokalnym hashem TAR. Rzeczywiste liczby i digests zakończonej promocji uzupełnij dopiero z jej wyniku.

## Standardowa ścieżka promocji

1. Potwierdź własne zielone CI źródła aplikacji DEV i opublikowany podgląd właściwego SHA.
2. Utwórz commit promocji z dokładnym markerem i zachowanymi plikami aplikacji. Ten commit musi przejść własne pełne CI.
3. Istniejący bridge sprawdza repozytorium, workflow, sukces CI, pełny SHA, próbę, deduplikację i niezmieniony `main`, a następnie uruchamia standardowy workflow GCP. Nie omijaj WIF ani bramek ręcznym wdrożeniem.
4. Nie przesuwaj `main` do potwierdzenia źródła rozpoczętego deployu. Nie ponawiaj niepewnego POST; najpierw odczytaj rzeczywisty przebieg i jego SHA.
5. Oddziel sukces API, Hostingu, dokładnych plików, odczytowej gry i kont od publikacji obu artefaktów oraz potwierdzenia wydania.
6. Dopiero po końcowym SUCCESS uzupełnij ten dokument, rejestr środowisk i nieprzesuwany tag faktycznego źródła.

## Dane i granice odbioru

Zachowujemy Authentication, UID, loginy, hasła, istniejące wyspy, kolekcje Teatru i postęp `admin1`–`admin3`. Nie uruchamiamy skryptu resetu, nie podmieniamy świata testową fiksturą i nie zapisujemy do kont z odczytowego odbioru przeglądarki. Zwykłe procesy gry oraz jej prawidłowe migracje nie są resetem danych.

Trwała aranżacja i dalsze poziomy dekoracji należą do kodu aplikacji. Lokalny test HTTP z izolowanym store nie jest dowodem nowego zapisu w Firestore lub wyniku tej promocji. Rzeczywisty zapis, jeśli wymaga osobnego ręcznego odbioru, zachowuje swój status zamiast dziedziczyć PASS z odczytu Hostingu. Istniejące [TC0031](testing/manual/HL-TC-0031.md), [TC0145](testing/manual/HL-TC-0145.md) i [TC0146](testing/manual/HL-TC-0146.md) pozostają osobnymi przypadkami; nie zwiększamy liczby ręcznych scenariuszy na potrzeby tej karty operacyjnej.

[Kontrakt wydania](RELEASE-PROCESS.md) · [Odbiór DEV 0.13.1.0](DEV-0.13.1.0-VALIDATION.md) · [Lista ręczna](testing/START-HERE.md).
