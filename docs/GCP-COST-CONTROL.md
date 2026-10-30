# Monitorowanie kosztów Google Cloud

Stan instrukcji: 30 października 2026 r. Właściciel wybrał **budżet alertowy 100 USD miesięcznie łącznie na PRE-PROD i PROD**. Przygotowano sprawdzany skrypt właścicielski; nie potwierdzono jeszcze utworzenia budżetu w Google Cloud. Nie ustawiono automatycznego odcinania usług ani nie zmieniono rozliczeń projektów.

## Odczyt kosztu

[Raport kosztów konta HARBORLIGHT](https://console.cloud.google.com/billing/010F11-5A6F09-27543C/reports): wybierz bieżący miesiąc i łącznie projekty `harborlight-dev` (PRE-PROD) oraz `harborlight-prod`. Grupowanie według usługi pokaże obliczenia, bazę, hosting/transfer, obrazy i inne rzeczywiście użyte zasoby. Sprawdź też prognozę i to, czy raport uwzględnia kredyty/rabaty. Świeże zużycie może pojawiać się z opóźnieniem.

Raport prezentuje walutę konta. Nie utożsamiaj kwoty w USD z tą samą liczbą PLN; karta lub bank mogą stosować własne przewalutowanie. Publiczny cennik i lokalny szacunek nie są pomiarem faktycznego zużycia. Szczegółowych prywatnych wartości rachunku nie zapisujemy w tym publicznym repozytorium.

## Wybrany budżet 100 USD

Standardowy budżet Google Cloud wysyła alerty, lecz nie jest twardym limitem całej faktury. Wybrana kwota to jawnie **100 USD**, a nie przeliczony automatycznie odpowiednik kwoty w PLN. Skrypt wymaga właściwej waluty konta i zatrzymuje się przy innej walucie. Opóźnienia raportowania, podatki i korekty trzeba porównać z rozliczeniem. Miesięczny okres budżetu stosuje kalendarz Google (czas pacyficzny), nie zegar Warszawy używany przez grę.

Budżet obejmuje wszystkie usługi w projektach `harborlight-dev` oraz `harborlight-prod`, łącznie — nie po 100 USD na każde środowisko. Progi alertów to **50, 75, 90 i 100 USD**. `INCLUDE_ALL_CREDITS` oznacza koszt po zastosowanych kredytach. Alerty trafiają do istniejących domyślnych odbiorców IAM konta rozliczeniowego; nie dodajemy adresów e-mail, kanałów Monitoring ani Pub/Sub.

Aktualny oficjalny schemat zawiera także **Spend Cap**, ale jeden taki limit wymaga jednego projektu i jednej kwalifikującej się usługi. Nie potwierdzono, że obejmuje łącznie Cloud Run, Firestore, Firebase Hosting, Artifact Registry i oba projekty gry. Nie przedstawiamy go jako zbiorczego limitu rachunku. W tej sesji nie włączano Spend Cap; skrypt odmawia konwersji istniejącego Spend Cap na alerty.

API Budgets udostępnia konfigurację budżetu, a nie bieżący koszt. Samo utworzenie alertów nie tworzy eksportu kosztów ani pomiaru wstecz. Automatyczne wyłączenie rozliczeń całego projektu może przerwać działanie usług i nie zostało wdrożone jako mechanizm oszczędności.

## Ustawienie i potwierdzenie

[`prepare-budget.py`](../infra/google-cloud/prepare-budget.py) jest ograniczony do znanego konta HARBORLIGHT i dwóch znanych projektów z kontrolą numerów, etykiet i powiązania rozliczeń. Domyślny `--check` jest odczytowy. `--apply` uzgadnia wyłącznie budżet o nazwie `HARBORLIGHT 100 USD miesiecznie` oraz w razie potrzeby włącza Budgets API w istniejącym projekcie kwot PRE-PROD. Zachowuje ewentualne istniejące kanały zarządzanego budżetu, używa `etag` przy aktualizacji i nie tworzy duplikatu po zwykłym ponowieniu. Innych budżetów nie aktualizuje; nie nadaje ról i nie zmienia danych graczy.

W zalogowanym Cloud Shell właściciela, po synchronizacji repozytorium:

```sh
cd ~/harborlight-infra
git pull --ff-only
python3 infra/google-cloud/prepare-budget.py --apply
```

Za potwierdzenie uznajemy dopiero komunikat **„APPLY zakończone: potwierdzony budżet 100 USD…”** po ponownym odczycie rzeczywistego zasobu z Google. Testy lokalne nie są potwierdzeniem utworzenia budżetu. Brak `gcloud`, poświadczeń lub wymaganych uprawnień oznacza błąd i brak potwierdzenia; nie zastępujemy go komunikatem sukcesu.

Późniejsza kontrola bez zmian:

```sh
python3 infra/google-cloud/prepare-budget.py --check
```

Potrzebne są uprawnienia do odczytu konta i projektów oraz `billing.budgets.list/get/create/update`. Jeśli Budgets API jest wyłączone, jego włączenie wymaga uprawnień Service Usage na projekcie kwot. Skrypt `--apply` może włączyć tam tylko Budgets API; nie nadaje sobie wymaganych ról.

## Już istniejące ograniczenia

PRE-PROD Cloud Run ma minimum 0 i maksimum 2 instancje na rewizję, 1 vCPU, 512 MiB, współbieżność 20 i limit żądania 30 s. Zmniejsza to część zużycia, ale nie ogranicza wszystkich opłat. Baza, transfer, przechowywanie obrazów i logi rozliczają się osobno. Warto sprawdzać raport po wdrożeniach i większych testach; harmonogram monitorowania ustala właściciel.

## Źródła i zakres weryfikacji

- [Oficjalny schemat Budgets REST](https://raw.githubusercontent.com/googleapis/google-api-python-client/main/googleapiclient/discovery_cache/documents/billingbudgets.v1.json), odczytany revision **20261011**: pola `notificationsRule` i `spendCap`, ograniczenia projektu/usługi i brak pola bieżącego kosztu.
- [Oficjalny model budżetów](https://raw.githubusercontent.com/googleapis/googleapis/master/google/cloud/billing/budgets/v1/budget_model.proto): waluta, kredyty, odbiorcy i okres kalendarzowy; w odczytanej wersji proto brakuje nowych pól Spend Cap, dlatego dla nich wykorzystano nowszy schemat REST.
- [Budżety Google Cloud](https://docs.cloud.google.com/billing/docs/how-to/budgets), [Spend Cap](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps#eligible-services), [raporty kosztów](https://docs.cloud.google.com/billing/docs/how-to/reports).

Bezpośrednie strony dokumentacji i API Google były ograniczone sieciowo. Nie odczytano tutaj kosztu przez uwierzytelnione API ani nie potwierdzono kwalifikacji poszczególnych usług do Spend Cap. Schematy z oficjalnych repozytoriów Google odczytano poprawnie; prywatny odczyt raportu właściciela pozostaje osobnym źródłem danych.
