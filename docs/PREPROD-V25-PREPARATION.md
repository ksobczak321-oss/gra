# Przygotowanie PRE-PROD do wersji 0.10.1.0

31 października 2026 właściciel przekazał wynik wykonania skryptu przygotowującego konta i reguły Firestore w projekcie `harborlight-dev`. To potwierdzenie z jego zalogowanej sesji Cloud Shell, a nie niezależny odczyt GCP przez tę sesję asystenta. Nie jest dowodem wdrożenia nowej wersji gry.

**Późniejsze wdrożenie:** źródło `353faad347262dce7c3632fdf7c71be124384ab1` ma własne CI 41246449612 SUCCESS (3 min 54 s), Pages 41246449682 SUCCESS (31 s) i [promocję PRE-PROD 41246771480](https://github.com/ksobczak321-oss/gra/actions/runs/41246771480), próba 1, SUCCESS (2 min 05 s). [Bridge 41246756848](https://github.com/ksobczak321-oss/gra/actions/runs/41246756848) zakończył się SUCCESS (15 s). Gra: https://harborlight-dev.web.app. Tag DEV `dev-0.10.1.0-20261031` jest opublikowany. To osobne dowody publikacji, niezależne od opisanego poniżej przygotowania reguł.

## Potwierdzenie właściciela

Log pokazuje aktualizację repozytorium `f161e45..b1cd650` oraz końcowe komunikaty:

```text
PASS DEV — projekt, rozliczenia, Firebase i witryna
PASS DEV — konto admin1, UID dev-admin1; istniejące hasło pozostawiono bez zmian
PASS DEV — konto admin2, UID dev-admin2; istniejące hasło pozostawiono bez zmian
PASS DEV — konto admin3, UID dev-admin3; istniejące hasło pozostawiono bez zmian
APPLY zakończone: trzy konta DEV i prywatny zapis Firestore gotowe.
Nie opublikowano gry, nie resetowano kont ani wysp. PROD nie jest obsługiwany przez ten skrypt.
```

Zachowujemy tylko niezbędny wyciąg. Pełnego logu Cloud Shell nie kopiujemy do repozytorium. SHA-256 przekazanego pliku, sprawdzone lokalnie: `4a05f46b1132ba4b7a02886b6abd8c5fe86692ca3bb4c5cd028ec5a659397326`.

## Co wynika z tego potwierdzenia

Źródło `b1cd650da1c9d669ebce4a77bee81ebfd87ccbc9` zawiera [reguły Firestore](../infra/google-cloud/firestore.dev.rules) obsługujące `schemaVersion` 1 i 2 oraz dokumenty dodatkowych wysp. SHA-256 tego pliku jest zgodny z plikiem przygotowywanym do bieżącej promocji: `88427f35c169d5f7882708345055b0f8cf42535dfd9a197e75b3e67bede5eb8f`.

[prepare-dev-users.py](../infra/google-cloud/prepare-dev-users.py) przed końcowym sukcesem odczytuje aktywną wersję reguł i wymaga zgodności z plikiem źródłowym. Przekazany sukces potwierdza zatem przygotowanie zgodnego kontraktu zapisu w sesji właściciela. Istniejące konta i hasła zachowano; skrypt nie resetuje wysp i nie publikuje gry.

## Co pozostaje do potwierdzenia

- Odbiór końcowego źródła `353faad347262dce7c3632fdf7c71be124384ab1` i publikacja PRE-PROD mają dowody wymienione powyżej. Wewnętrznego ZIP receipt nie odczytano niezależnie. Historyczne CI `41244467302` dla `b1cd650…` pozostaje FAIL; Pages `41244467250` ma SUCCESS (41 s). Tych wcześniejszych wyników nie przepisano ani nie zastąpiono dowodami późniejszego źródła.
- Nowy pakiet z cache `frontend-v25-2` przeszedł **898 testów Node**, **141 testów Python** i **18 zestawów Chromium**. Nowy odczyt 112 widoków nie wykrył angielskich elementów ani błędu wykonania. Historyczny kurs v18 przeszedł cztery warianty, w tym geometrię podpowiedzi na ekranie 360×640. Te lokalne wyniki nie są sukcesem CI ani publikacji GCP; szczegóły zawiera [przegląd polszczyzny](POLISH-REVIEW-v25.md).
- Rzeczywista flaga API kont i uprawnienia runtime nie zostały odczytane niezależnie. Przy API wyłączonym używany jest bezpośredni zapis według przygotowanych reguł. Przy API włączonym zapis obsługuje runtime z dostępem do Firestore.
- Po promocji należy osobno potwierdzić automatyczny zapis i ponowne wczytanie istniejącej wyspy z zachowaniem historii. Odczytowy test hostingu blokuje mutacje i nie stanowi takiego potwierdzenia.

Użytkownik upoważnił do PRE-PROD po testach. Nie jest potrzebne ponowne pytanie o tę samą promocję. W jej zakres nie wchodzą reset kont ani publikacja PROD. Bieżące źródło i wyniki wdrożenia podaje [rejestr środowisk](ENVIRONMENT-STATUS.md); zmiana ma kartę [HL-CHG-0934](tracking/changes/HL-CHG-0934.md).
