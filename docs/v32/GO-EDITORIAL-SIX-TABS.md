# GO DEV — redakcja z sześciu arkuszy

Status: **zakres przyjęty, import i odbiór cache9 w toku**. Wersja0.15.0.0, cache `frontend-v32-9`, kartaHL-CHG-1150. [Dowody](EDITORIAL-SIX-TABS-EVIDENCE.json). Bazą pracy jest `485f46664c35643813c37506a1561cecf84986de`; ostatnia odebrana publikacja gry to cache8/`06db93ada1c5cbd3071709ab84fc959f9674e5a1`.

Użytkownik polecił połączyć teksty z wybranych zakładek przekazanego pliku `HARBORLIGHT_teksty_do_redakcji_ABC.xlsx`. Dozwolonym źródłem pracy jest wyciąg `selected-workbook.json` zawierający tylko wskazane sześć arkuszy. Treść pozostałych arkuszy nie jest odczytywana ani importowana.

| Dozwolony arkusz | Wiersze | NiepustaC | C różna odB |
|---|---:|---:|---:|
| Tutorial | 55 | 15 | 15 |
| Budynki — opisy | 24 | 6 | 6 |
| Budynki — informacje | 30 | 17 | 15 |
| Dolny pasek | 24 | 4 | 4 |
| Komunikaty | 215 | 40 | 40 |
| Przyciski | 65 | 5 | 5 |
| Razem | 413 | 87 | 85 |

W dwóch wierszach niepustaC jest zgodna zB. Liczby opisują wiersze wejściowe, nie liczbę unikalnych literałów kodu, nowych reguł lub kroków tutoriala. W sześciu wybranych arkuszach nie ma formuł. SHA256 przekazanego pliku: `0c3d0c17b095f479b5dd9d4b6ec4c3d63ea1244f04462a47812db1373845239e`.

## Zasady importu

Obowiązuje niepustaC, a przy pustejC tekstB. A jest opisem kontekstu. Zachowujemy zaakceptowany sens, polskie znaki, składnię, istotne podziały akapitów i występujące w tekstach parametry dynamiczne. Powiązanie z kodem wynika z arkusza, obszaru i kontekstu, aby podobny tekst na innym ekranie zachował właściwe znaczenie.

Część komórek zawiera instrukcję redakcyjną, a nie gotowy tekst dla gracza. Taka notatka prowadzi do poprawienia właściwego opisu lub komunikatu; samo polecenie nie staje się dosłownym elementem interfejsu. Zmiana opisu nie oznacza automatycznej zmiany reguły gry. W miejscach, w których redakcja dotyka nieuzgodnionej mechaniki, tekst musi pozostać zgodny z działającą logiką do otrzymania odpowiedzi użytkownika.

Import nie jest dowodem uruchomieniaAPI ani rzeczywistych usług. Opis funkcji, kont, reklam i innych integracji musi odpowiadać faktycznie dostępnemu działaniu; samo poprawienie tekstu nie aktywuje dostawcy lub usługi.

## Oczekujące decyzje o logice

Przeniesienie produkcji sera doMleczarni oraz dostępność reklam na każdym poziomie pozostają dwiema oczekującymi odpowiedziami. Na etapie tego zapisu nie są potwierdzone jako wdrażane zmiany modelu. Po odpowiedzi zakres i dowody muszą jawnie odnotować przyjętą decyzję oraz odpowiednie sprawdzenie. Pozostały wcześniejszy roboczy pakiet modeli, w tym otręby i pasza, nie jest automatycznie włączany przez import tekstów.

## Zachowane elementy i środowiska

Cache9 zachowuje zaakceptowane grafiki wyspy,20przypisań funkcji, miniatury i krawędźmenu1664 oraz nazwy i grupy mieszkańców cache8. Import tekstów nie zmieniaUID, zapisów, przydziałów lub postępu kont. Wersja pozostaje0.15.0.0. Docelowy [podglądDEV poziomu5](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5&v=frontend-v32-9) nadal jest oznaczonym, nietrwałym podglądem bez konta; publikacja cache9 wymaga własnego potwierdzenia.

To zadanie obejmujeDEV. Oddzielna zlecona promocjaPROD pozostaje zablokowana niezgodnym potwierdzeniem (`account_api:false`, kontrakt bieżącego weryfikatora108plików wobec85w potwierdzeniu). Import nie zmieniaworkflowPROD ani nie zastępuje wymaganego zgodnego potwierdzenia wydania. DotychczasowePRE-PROD i konta pozostają bez nowej mutacji w ramach tego importu.

## Odbiór

Potrzebny jest raport powiązania wszystkich413wierszy i zastosowaniaC/B, z odrębnym zaznaczeniem instrukcji redakcyjnych, tekstów niezmienionych i oczekujących decyzji o regułach. Testy mają sprawdzić polskie teksty Tutoriala, opisów i informacji budynków, dolnego paska, komunikatów warunkowych i przycisków, zachowanie parametrów dynamicznych oraz brak notatek roboczych wUI. Odbiór obejmuje komputer, telefon i właściwe konteksty wyświetlania.

Nowe wyniki lokalne, źródło aplikacji, publikacja, CI i odczyt hostowanego cache9 pozostająPENDING do ich faktycznego wykonania. Nie przejmują sukcesu cache8/CI43740930893/Pages43740930892. Oryginalny plik i wyciąg są źródłami wejściowymi; ta dokumentacja ich nie zmienia. Ręczny odbiór użytkownika nowej redakcji pozostajeNOT_RUN.

## Arkusz wynikowy

Historyczny pełny `docs/arkusze/HARBORLIGHT15-teksty-DEV.xlsx` pozostaje bez zmiany. Nowy `docs/arkusze/HARBORLIGHT15-redakcja-6-zakladek.xlsx` ma obejmować tylko sześć wybranych arkuszy i413wierszyABC. B zawiera tekst rzeczywiście przyjęty po scaleniu i rozstrzygnięciu notatek, C pozostaje pusta do dalszej redakcji, a A zachowuje kontekst oraz metadane rozstrzygnięcia. To plik wynikowy, odrębny od przesłanego źródła z87niepustymiC.

Aktualny raport `docs/arkusze/HARBORLIGHT15-walidacja.json` ma wskazywać nowy sześciowybiórczy plik oraz jego odciski źródłowe. Eksport i walidacja oczekują własnego wyniku; ta aktualizacja dokumentacji nie tworzy ani nie zmienia żadnego Excela i nie odczytuje niewybranych arkuszy przesłanego pliku.
