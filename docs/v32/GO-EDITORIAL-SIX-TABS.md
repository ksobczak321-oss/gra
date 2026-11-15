# GO DEV — redakcja z sześciu arkuszy

Status: **pierwsza publikacjaDEV ma PagesSUCCESS i lokalny odbiór publicznych bajtówPASS, lecz własnyCIFAILURE starego oczekiwania tekstu; nowy kandydat testowy oczekuje własnegoCI**. Wersja0.15.0.0, cache `frontend-v32-9`, kartaHL-CHG-1150. Aplikacja `0b41a9b819127416d92836f42ccc812c2bec960d`, pierwsza publikacja `b1a929dc1f2e0c470166a0086ab74f61e828b4f0`; Pages43752880924SUCCESS20s, CI43752880913FAILURE. [Dowody](EDITORIAL-SIX-TABS-EVIDENCE.json), [dane publicznych plików bez nagłówków](EDITORIAL-SIX-TABS-PUBLIC-RECEIPTS.json). Bazą pracy był `485f46664c35643813c37506a1561cecf84986de`; poprzedni odebrany cache8 zachowuje własne źródło i dowody.

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

Cache9 zachowuje zaakceptowane grafiki wyspy,20przypisań funkcji, miniatury i krawędźmenu1664 oraz nazwy i grupy mieszkańców cache8. Import tekstów nie zmieniaUID, zapisów, przydziałów lub postępu kont. Wersja pozostaje0.15.0.0. Opublikowany [podglądDEV poziomu5](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5&v=frontend-v32-9) nadal jest oznaczonym, nietrwałym podglądem bez konta; nowy kandydat po poprawce testu wymaga własnegoCI.

To zadanie obejmujeDEV. Oddzielna zlecona promocjaPROD pozostaje zablokowana niezgodnym potwierdzeniem (`account_api:false`, kontrakt bieżącego weryfikatora108plików wobec85w potwierdzeniu). Import nie zmieniaworkflowPROD ani nie zastępuje wymaganego zgodnego potwierdzenia wydania. DotychczasowePRE-PROD i konta pozostają bez nowej mutacji w ramach tego importu.

## Odbiór

Potrzebny jest raport powiązania wszystkich413wierszy i zastosowaniaC/B, z odrębnym zaznaczeniem instrukcji redakcyjnych, tekstów niezmienionych i oczekujących decyzji o regułach. Testy mają sprawdzić polskie teksty Tutoriala, opisów i informacji budynków, dolnego paska, komunikatów warunkowych i przycisków, zachowanie parametrów dynamicznych oraz brak notatek roboczych wUI. Odbiór obejmuje komputer, telefon i właściwe konteksty wyświetlania.

Lokalne wyniki i pierwsza publikacja cache9 mają własne dowody poniżej; CI43752880913 pozostajeFAILURE, a nowy kandydat po korekcie testu oczekuje własnegoSHA/CI/Pages. Nie przejmują sukcesu cache8/CI43740930893/Pages43740930892. Oryginalny plik i wyciąg są źródłami wejściowymi; ta dokumentacja ich nie zmienia. Ręczny odbiór użytkownika nowej redakcji pozostajeNOT_RUN.

## Arkusz wynikowy

Historyczny pełny `docs/arkusze/HARBORLIGHT15-teksty-DEV.xlsx` pozostaje bez zmiany. Wygenerowany i zwalidowany `docs/arkusze/HARBORLIGHT15-redakcja-6-zakladek.xlsx` obejmuje tylko sześć wybranych arkuszy i413wierszyABC. B zawiera tekst rzeczywiście przyjęty po scaleniu i rozstrzygnięciu notatek, C pozostaje pusta do dalszej redakcji, a A zachowuje kontekst oraz metadane rozstrzygnięcia. To plik wynikowy, odrębny od przesłanego źródła z87niepustymiC.

Aktualny raport `docs/arkusze/HARBORLIGHT15-walidacja.json` wskazuje nowy sześciowybiórczy plik oraz zgodne odciski źródła `0b41a9b819127416d92836f42ccc812c2bec960d`. SHA256Excela: `517a6d98f35e7eba07a437de3f1b28f9069ddb13920403dbf8ca868e726c4096`; eksport413wierszy/6arkuszy/pustaC i walidacjaPASS. Ta aktualizacja dowodów nie zmienia Excela, raportu walidacji ani JSONmapowania.

## Wyniki lokalne i publikacja

186testów kierunkowychPASS. Pełne56kroków oprowadzania na1440/390, układmenu i sekcjeMagazynu na1440/390 oraz nowy odbiór sześciu arkuszy z20informacjami budynków na1672/1366/390 — PASS. Notatki robocze i niepodstawione parametry nie trafiły doUI; zachowany świat oprowadzania i niewybrane katalogi oraz obrazy pozostają bez zmiany według raportu odbioru.

Publikacja `b1a929dc1f2e0c470166a0086ab74f61e828b4f0` została potwierdzona na remote main i dev/0.15.0.0. Pages43752880924SUCCESS20s, job132930513223. Wszystkie106PUBLIC_FILES/30742201bajtów pobrano przezHTTPS z weryfikacjąTLS i zgodnościąSHA256 do publikacji. Render1672/390PASS wykonał lokalnie te rzeczywiste publiczne bajty z ichContent-Type, bez wstrzykniętego świata, atrapAPI lub konta: potwierdzono informacjeAkademii po redakcjiC, zachowane role,20funkcji mapy i pięćzakładek. To nie bezpośredni renderHTTPSChromium; natywna nawigacja jest nadal blokowana przez zarządzaneTLS, bez jego ignorowania.

WłasnyCI43752880913/b1a929d zakończył sięFAILURE:1402testy,1401PASS i1FAIL. `tests/harborlight-learning-v29.test.mjs:69` oczekiwał „przy przypłynięciu”, podczas gdy użytkownik wC jawnie przyjął „po przypłynięciu”. Przeglądarkowe etapy tegoCI zostały pominięte; lokalne rzeczywiste odbioryUI opisane wyżej zachowują własne wynikiPASS. Wąska poprawka oczekiwania zachowuje wymagania4/6,ładunku i czasu. Nie zmienia kodu gry ani106publicznychplików; nowa publikacja testowa potrzebuje własnegoSHA/CI/Pages. PierwszyFAILURE iPagesSUCCESS nie są nadpisywane. Nowe modele sera i reklam pozostają oczekującymi decyzjami; oddzielna promocjaPROD nadal blokowana istniejącymi bramkami.

Korekta oczekiwania learning-v29 przeszła lokalnie13/13 z zachowaniem4/6,ładunku i czasu. Selektor starszego testuUI wskazuje submit własnego formularza zgodnie z zaakceptowanymi nazwami przycisków; runtime bez zmiany. PublicznyExcel i raportwalidacji mająHTTP200, normalnie zweryfikowaneTLS i zgodneSHA256; szczegóły w dowodach. Nowy kandydat nadal wymaga własnegoCI/Pages.
