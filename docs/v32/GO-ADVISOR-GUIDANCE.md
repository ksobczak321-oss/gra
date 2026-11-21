# GO DEV 0.15.3.0 — tutorial i Doradca Królestwa

Użytkownik 21 listopada 2026 zatwierdził pakiet poleceniem **GO**, początkowo wyłącznie dla DEV/Git/CI/Pages. Następnie jawnie rozszerzył autoryzację: **„jak skończysz wrzuć na pre prod”**. Obowiązuje ukończenie DEV → Git i własny CI oraz Pages → standardowy PRE-PROD dokładnie tego samego zweryfikowanego źródła. Nie wymaga to kolejnej zgody. CODE **`f6572ee7500b42f56d1575de2e173d1bd635216c`** jest zamrożony i 119 plików runtime potwierdzono bajtowo. Kanoniczny pipeline ma PASS; publikacja, CI, Pages, pakiet publikacyjny i tagi nowego źródła pozostają **PENDING**. Faktyczne PRE-PROD nadal ma odebrane C6 / 0.15.2.4 / cache21, publikację `d5ad35cf530b9df62bc4e50d9e1d6e2c308fb63d` i workflow 44577083312/próba1; autoryzacja nie jest dowodem wdrożenia. Konta, hasła i postęp mają być zachowane. Bez resetu, PROD i DNS.

## Zakres zatwierdzony

| Dawne numery tutoriala | Bieżąca prezentacja |
|---|---|
| 1–11 | Zostają. Krok Pomocy opisuje dostępny tutorial i Doradcę. |
| 12–19 | Poza tutorialem; osiem opisów pozostaje pod „i” we właściwych menu. |
| 20 i 21 | Jeden wspólny krok: czat, sojusze i liga. |
| 22–26 | Zostają; „Ubrani” zmienia się na „Ubrania”. |
| 27–28 | Zostają. |
| 29–47 | Poza aktywnym tutorialem. |
| 48–56 | Zostają. |

Wynik to **28 kroków**, a nie kilkanaście. Zachowany katalog 56 stabilnych identyfikatorów i wersja trasy 5 służą odczytowi istniejącego postępu. Zachowany krok wznawia swój temat; usunięta pozycja przechodzi do następnego właściwego wyjaśnienia, a dawna Liga do połączonego kroku czatu. Nie zerujemy wyspy, nazwy, zdobytych nagród ani wcześniejszej historii.

Osiem przeniesionych tematów to Królestwo, pożyczki dla Królestwa, pożyczki od Królestwa, depozyty, ekspedycje, zasady minigier, archipelag i dobroczynność. Ich treść pozostaje dostępna w menu pod „i”; otwarcie informacji nie uruchamia ponownie tutoriala.

Osobny **25-lekcyjny Samouczek** jest tymczasowo wyłączony i ukryty wraz z wejściami, przeglądem, automatycznymi wskazówkami i oknami nagród. Kod, treści i zapisany postęp pozostają do możliwego przywrócenia. Czysta polityka `PRACTICAL_TUTORIAL_ENABLED=false` nie przestawia `completed`, `claimed`, `settled`, flag przeglądu ani zapisanych opóźnień reklam. Nie odbieramy ani nie rozliczamy nagród w imieniu gracza. Historyczne pełne testy kursu używają jawnej, izolowanej fikstury z włączoną polityką; osobny test domyślnego pakietu sprawdza wyłączenie. Produkt nie otrzymuje parametru lub przycisku obchodzącego tę flagę.

**Doradca Królestwa** przedstawia jeden bieżący cel i **2–5 konkretnych działań**. Zalecenia wynikają z zapasów, jedzenia i rezerw, obsady, dostaw, produkcji, rozpoczętych budów oraz rzeczywistych warunków rozbudowy. Zmiana stanu odświeża cel i akcje; ukończone czynności nie pozostają zadaniem do powtórzenia. Gracz zachowuje swobodę, możliwość wyciszenia i rozmowę o własnym celu. Wskazówki korzystają z praktycznej wiedzy zachowanego kursu, bez otwierania jego osobnego okna. Wybór doradcy jest planem bieżących priorytetów, nie dowodem globalnego optimum wszystkich przyszłych decyzji.

Przy braku monet Doradca może wskazać dostępne **minigry z rzeczywistymi nagrodami**, dokończenie rozpoczętej serii albo wypłatę istniejącej puli. Nagroda zależy od wyniku i czasu, a pula trafia do skarbca dopiero po wypłacie. Samo kliknięcie wskazówki nie gra, nie ogląda reklamy, nie kupuje usługi i nie przyznaje monet. Osobne strony demonstracyjne minigier nie są źródłem nagrody dla wyspy.

Etykiety poziomu **Kaplicy i Latarni** oraz pozostałych budynków mają pozostać widoczne po najechaniu lub ustawieniu fokusu. Położenie uwzględnia górny, prawy i dolny panel oraz krawędzie widoku. Nie zmieniamy grafik i miejsc budynków ani nie dodajemy stałych podpisów. Etykieta znika po opuszczeniu celu, Escape lub otwarciu modala; obsługuje zmianę rozmiaru i przesunięcie planszy.

## Dostępność i koszt odczytów

Wyłączenie praktycznego kursu nie może blokować zwykłych ofert ani misji. Misje zachowują próg Ratusza 2 i rozpoczętego świata; nie przyjmują się automatycznie. Reklamowe zaproszenia nadal respektują pierwsze wprowadzenie, aktywny tutorial ekranów i zapisany cooldown. Koszty, czasy, formuły nagród i rozpoczęte projekty nie są zmieniane tą neutralną zmianą bramek.

Automatyczne rady czytają zwięzły widok potrzebnych danych. Nie klonują całego świata lub historii i nie wykonują pełnej prognozy budowy przy każdym odświeżeniu. Szczegółowe obliczenia pozostają na świadome pytanie gracza lub wybór innej drogi. Etykiety mapy również nie dodają stałej pętli odświeżania. Nowa paczka zachowuje naprawę nadrabiania nieobecności C6.

## Autoryzowana kolejność publikacji

Po zakończeniu integracji i eksportów nowe źródło musi przejść własny pełny CI oraz Pages, a następnie otrzymać nieprzesuwany tag DEV. Root uruchamia standardowy `google-cloud-dev.yml` z niezmienionego źródła `main`; nie zastępuje go ręcznym deployem lub starym przebiegiem. PRE-PROD wymaga natywnego odbioru istniejących admin1 i admin3 z zablokowanymi zapisami testowej przeglądarki, także responsywności po starcie, odczytowej kontroli kont i zegara oraz weryfikacji obu oryginalnych ZIP-ów, czterech warunków receipt, obrazu API i całego pakietu. Root przewiduje 462 pliki; liczbę i hashe ma potwierdzić końcowy manifest. Odbiór obejmuje publiczne bajty i zachowanie kont. Dopiero po komplecie wyników powstaje tag PRE-PROD. Bez resetu, zmiany haseł lub działań PROD/DNS.

## Dowody i stan odbioru

Pierwszy pełny lokalny frontend miał **1644/1646 PASS, 2 FAIL** w 225,866 s. Dwie usterki kopii tekstów poprawiono, a kierunkowe ponowienie ma **22/22 PASS**; nie deklarujemy pełnego lokalnego 1646 PASS. Niezmieniony watchdog 96 h przeszedł w 9602,511 ms przy limicie 10 000 ms. Pierwszy master źródła `ffb54aa54bbb2c39bfd823a75a24d89cdf2506ea` nie przeszedł świeżej walidacji: 12 wejściowych JSON różniło się losowym `activitySeed` tworzonym z `Date.now()` w fiksturze eksportera. Poprawka obejmuje konstruktor fikstury; surowy FAIL jest zachowany. Wcześniejsza próba porównania miała także sześć różnic zboża; surowe pliki i wynik FAIL zachowano w `attempt-ffb54aa-uncontrolled-fixture`. Obecne dwa rzeczywiste pełne eksporty 24/24/72 h mają ścisłe zero różnic całego JSON, 4 039 094 bajty i SHA-256 `bfb697686e0a9b9700b58033cfa68e39b333746089df0bc699bb470238971863`. Fikstury mają jawne `activitySeed=3454386051` i START `1794812400000`; runtime od ffb pozostaje bez zmiany. Porównanie z C6 zachowuje wszystkie stare wartości i typy, także zboże. Pełne JSON profili nie są identyczne z C6, ponieważ doszły dokładnie dwa jawne pola pochodzenia na profil: `activitySeed` i `ambientClockDuringConstruction`. Surowy komparator nadal pokazuje te sześć dodanych pól; ich odrębny przegląd nie ukrywa ani nie wyłącza starych wartości.

Bieżące dowody opisuje [ADVISOR-GUIDANCE-EVIDENCE.json](ADVISOR-GUIDANCE-EVIDENCE.json). Master z CODE f657 ma **161 kart, 61 bieżących, 64 876 wierszy, 130 źródeł i 200 wariantów grafiki**, 8 059 335 bajtów, SHA-256 `ab4570ad897eeb2d26d3ca69fa36488afe31f435141a4636be1d5f9802c4b87b`; budowa i świeża walidacja PASS. Aktywny tutorial ma 28 wpisów, archiwum 56, zachowany kurs 25. Redakcyjny Excel nadal ma **6 kart / 413 wierszy / ABC / pustą C / 112 odcisków**, 60 329 bajtów, SHA-256 `75afe37fc988e9e367dd9c7f4f9da08e49cb9a169d725c3b3006542b2ca430e7`; wszystkie 419 wierszy z nagłówkami w A/B/C są dokładnie identyczne z C6, bez poszerzenia zakresu. Trzynaście tabel liczbowych gospodarki i wszystkie 200 wierszy grafiki są dokładnie zgodne z C6. Zachowano 100 archiwalnych kart, 220 części ZIP, 48 komentarzy i 4982 wyniki formuł.

Katalog 55 minigier i 110 instrukcji ma PASS: 1045 części DOCX oraz 56 TXT i indeks linków zachowują treść poza SHA źródła; nie przesunięto żadnej kotwicy. ZIP 2 390 666 bajtów ma SHA-256 `9046c7e1b9438d5eb0ea3a587a812c0f2d279cd27225333d70a237bb9f176bb0`. Pełny backend 178 testów i planszówka 7 mają PASS. Niezależny Python ma 145 PASS po zachowanej historii czterech testów walidatora archiwum 179/187, a 28 testów pakietu ma PASS w 15,268 s: łącznie **173 Python PASS**. Pierwsza próba pakietu miała 27/28 PASS przez drugie stare oczekiwanie 460 plików zamiast 462. Poprawiono tylko test: doliczono dwa jawnie sprawdzane moduły polityki i etykiet; limity 512 plików / 128 MiB pozostały bez zmiany. Surowy FAIL `frontend-bundle-stable.log` i późniejszy PASS `frontend-bundle-count-corrected.log` pozostają oddzielne. Siedem nowych kierunkowych UI plus poprawione izolowane wznowienie starego kursu, siedem historycznych programów UI i trzy kontrole domyślnego cache/etapów/redakcji mają osobne PASS przy zachowanych asercjach i limitach. Prywatne narzędzia audytu mają 74 Python i 20 Node PASS offline; nie są to nowe testy aplikacji lub dowód publikacji. Publikacja i jej własny pełny CI pozostają osobnym wymaganym etapem.

Osiem kart [HL-CHG-1175](../tracking/changes/HL-CHG-1175.md)–[HL-CHG-1182](../tracking/changes/HL-CHG-1182.md) daje 511 wpisów. Ręczne przypadki HL-TC-0180–0187 uzupełniają 179 historycznych; **187 wyników pozostaje NOT RUN**. Testy automatyczne nie odznaczają prób użytkownika. Schemat świata 9, ruleset 32 i archipelag 2 pozostają zachowane. Konta i postęp nie są resetowane.
