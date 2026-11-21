# GO DEV 0.15.3.0 — tutorial i Doradca Królestwa

Użytkownik 21 listopada 2026 zatwierdził pakiet poleceniem **GO**. Zakres obejmuje wyłącznie DEV, Git, własne CI i podgląd Pages. Kod jest w integracji; końcowy SHA, publikacja, CI, Pages, pakiet i tag nowego źródła pozostają **PENDING**. PRE-PROD nadal ma odebrane C6 / 0.15.2.4 / cache21, publikację `d5ad35cf530b9df62bc4e50d9e1d6e2c308fb63d` i standardowy workflow 44577083312/próba1. Nowe GO nie obejmuje promocji tej paczki do PRE-PROD, PROD, DNS ani resetu.

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

## Dowody i stan odbioru

Bieżące wyniki kierunkowe opisuje [ADVISOR-GUIDANCE-EVIDENCE.json](ADVISOR-GUIDANCE-EVIDENCE.json). Nie zastępują pełnego odbioru końcowego źródła ani własnego CI i publikacji. Arkusze i instrukcje będą odświeżone po zamrożeniu CODE; planowany master ma 161 kart, aktywny tutorial 28, archiwum katalogu 56 i zachowany praktyczny kurs 25. Do wykonania eksportu nie opisujemy tych liczb jako gotowego pliku.

Osiem kart [HL-CHG-1175](../tracking/changes/HL-CHG-1175.md)–[HL-CHG-1182](../tracking/changes/HL-CHG-1182.md) daje 511 wpisów. Ręczne przypadki HL-TC-0180–0187 uzupełniają 179 historycznych; **187 wyników pozostaje NOT RUN**. Testy automatyczne nie odznaczają prób użytkownika. Schemat świata 9, ruleset 32 i archipelag 2 pozostają zachowane. Konta i postęp nie są resetowane.
