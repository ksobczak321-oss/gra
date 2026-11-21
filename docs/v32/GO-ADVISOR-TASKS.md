# GO 0.15.3.1 — zadania i plan rozwoju Doradcy Królestwa

**Kandydat DEV 0.15.3.1 / `frontend-v32-23`: PENDING.** Końcowy CODE, publikacja, testy, CI, Pages, artefakty i tagi nie są jeszcze potwierdzone. Ten dokument zapisuje nową dyspozycję użytkownika; nie potwierdza jej wdrożenia. Obecny odebrany DEV i PRE-PROD pozostaje **0.15.3.0 / cache22**, publikacja `fc95a1aadf36a115538ed0b846f9ce48fbba651b`, własny CI44926983827, Pages44926983937 i standardowy PRE-PROD44929856572/próba1. [Poprzedni odbiór](GO-ADVISOR-GUIDANCE.md) i jego [dowody](ADVISOR-GUIDANCE-EVIDENCE.json) pozostają historią tego źródła.

## Lokalny checkpoint przed końcowym CODE

Planista, UI i prowadzenie zostały zgłoszone jako zamrożone do integracji wersji/cache. Niezależny odczytowy przegląd ma **510 PASS** dla poziomów 1/4/5/8/20 i wszystkich budynków; właściciel planisty raportuje osobne 26+27 testów kierunkowych i lokalnego Workera. Raporty układu oraz prowadzenia PL/EN są zachowane z własnymi hashami i ograniczeniami w dowodach. To próby sprzed globalnej zmiany cache, częściowo z adresem Workera cache22, a nie odbiór końcowego źródła cache23. Pełny frontend cache23 przed późniejszym doprecyzowaniem przyjaznego tonu i adaptacyjnego celu miał **1704/1704 PASS** w210702,057066ms; ten surowy wynik pozostaje PRE_STEERING. Późniejsza zmiana wymaga ponowienia pełnego finału. CODE, własny CI/Pages, świeże artefakty i nowy PRE-PROD pozostają **PENDING**.

Statyczna kontrola finalnej allowlisty potwierdza dokładnie pięć nowych nazw: `harborlight-v1-advisor-development-plan.js`, `harborlight-v1-advisor-development-client.js`, `harborlight-v1-advisor-development-worker.js`, `harborlight-v1-advisor-guidance.js` i `harborlight-v1-advisor-guidance.css`. Nie usunięto dawnych plików. Po dołączeniu minigier i indeksu oczekiwane są **466 plików treści / 467 wraz z generowanym manifestem wydania**; faktyczny build, rozmiary i hashe wymagają osobnej kontroli końcowego źródła.

## Końcowy odbiór lokalny przed CODE — PASS, publikacja nadal PENDING

Rzeczywisty pełny frontend po ostatniej uwadze ma **1711/1711 PASS**, exit 0 w 217.702 s. Niezmieniony watchdog 96 h ma 8866.634829 ms przy limicie 10 000 ms. Backend 178, planszówka 7, **145 Python** i wszystkie **8 lokalnych programów UI** mają oddzielne pełne PASS w rzeczywistych logach. To razem 1896 Node w lokalnych zestawach. Zachowano wcześniejsze 1704 PASS sprzed uwagi, pierwszą usterkę stagingu i wszystkie kierunkowe raporty jako odrębne fakty.

Kod i publikacyjny SHA nie są jeszcze przypięte. Kanoniczne eksporty nowego CODE oraz **28 testów pakietu po eksportach** nadal oczekują; nie deklarujemy 173 Python PASS przed tym wynikiem. Własny CI z 79 programami Chromium, Pages, publiczne bajty, tag DEV i standardowy PRE-PROD pozostają PENDING. Bieżące odebrane środowiska nadal mają fc95/cache22. 519 kart i 195 przypadków ręcznych; wszystkie NOT RUN.

## Jeden cel, kilka równoległych zadań

Doradca pokazuje jeden cel rozwoju i pod nim **2–5 kart zadań**, które gracz może realizować równolegle. Każda karta mówi krótko, co zrobić i dlaczego pomaga to osiągnąć cel. Poniżej kart ma być widoczna **cała uporządkowana instrukcja wykonania**, bez ukrywania pozostałych działań po wybraniu pojedynczej karty. Instrukcja wyjaśnia zależności w kolejności wynikającej z rzeczywistego stanu, na przykład **produkcja → transport → budowa**. Oddziela czynności możliwe teraz od tych, które czekają na dostawę lub ukończenie poprzedniego etapu. Wykonane działania nie pozostają poleceniami do powtórzenia.

## Życzliwy towarzysz, swobodna droga gracza

Doradca mówi jak przyjaciel: „Cześć, sugeruję… bo…”. Krótko tłumaczy powód propozycji, zamiast stawiać graczowi obowiązkowy krok lub warunek dalszej gry. Można radę zignorować i wybrać inną drogę. Co120 sekund rzeczywistych automatyczny plan uwzględnia to, co gracz faktycznie zrobił, i proponuje następny wykonalny cel; poprzednia automatyczna propozycja nie blokuje go na stałe. Bieżące oczekiwanie na wybraną kontrolkę nie wymusza wykonania działania, zanim wolno grać dalej.

Jawny cel wpisany w rozmowie, na przykład szybka rozbudowa Portu, jest odrębnym wyborem gracza: kolejne pytanie „dlaczego” lub o pracowników zachowuje kontekst Portu. Nie należy go mylić z poprzednią automatyczną propozycją. Zwykła automatyczna rada oraz jednorazowe pytanie o temat nie mogą trwale przypiąć automatycznego planu do dawnej odpowiedzi ani tworzyć obowiązku gracza. Zakres 2–5 kart dotyczy głównego planu rozwoju; prostej odpowiedzi na temat nie uzupełnia się sztucznymi zadaniami, a główne karty pozostają dostępne. Odświeżenie automatycznego planu nie usuwa szkicu lub treści rozmowy i nie wykonuje czynności w imieniu gracza.

## „Pokaż gdzie”: mapa, a następnie kontrolka

Pierwsze wskazanie prowadzi do właściwego budynku na mapie. Dopiero gdy **gracz sam otworzy jego menu**, wskazówka przechodzi do dokładnej kontrolki potrzebnej w danym kroku: przycisku, pola albo sekcji. Samo wskazanie nie otwiera menu i nie naciska kontrolki. Zmiana zadania, inny budynek, zamknięcie lub zastąpienie okna muszą usuwać nieaktualny cel; po ponownym otwarciu wskazówka odnajduje rzeczywisty element. Obsługa obejmuje desktop, dotyk, zmianę rozmiaru i przewijanie, a strzałka nie może zasłaniać potrzebnego przycisku lub blokować normalnej gry.

## Plan rozwoju co 120 sekund rzeczywistych

Planista porównuje wykonalne warianty rozwoju na podstawie zwięzłego obrazu aktualnej gospodarki i zwraca najlepszy spośród faktycznie ocenionych wariantów. Uzasadnia wybór i uwzględnia ograniczenia: potrzebne zasoby, pracowników, jedzenie, produkcję, transport oraz rozpoczęte projekty. Nie przedstawia ograniczonego porównania jako dowodu globalnego optimum wszystkich przyszłych decyzji.

Automatyczny przegląd odbywa się **co 120 sekund czasu rzeczywistego**, a jawna zmiana celu przez gracza może zlecić nowy plan wcześniej. Tempo gry 1×/2×/6× nie skraca tego okresu. Obliczenia wykonuje Worker w tle. Do Workera trafia ograniczony zestaw danych potrzebnych planowi, bez kopiowania całego świata lub pełnej historii. UI nie czeka synchronicznie na prognozę. Spóźniony wynik poprzedniego celu lub starszej generacji danych nie zastępuje bieżącego planu. Brak lub błąd Workera nie może uruchamiać kosztownego planowania synchronicznie na głównym wątku.

## Zachowana swoboda i zgodność

Rozmowa PL/EN, szkic wiadomości i wyciszenie pozostają dostępne. Rady i podświetlenia nie przydzielają pracowników, nie zmieniają priorytetów, nie rozpoczynają budowy, nie pobierają nagród i nie zapisują zegara. Zwykłe działania gracza pozostają jego decyzją. Zachowany ukryty 25-lekcyjny Samouczek i jego historia oraz aktywna trasa tutoriala 28 nie są przebudowywane przez tę paczkę. Koszty, czasy, reguły i zaakceptowana grafika wyspy pozostają zgodne z poprzednim wydaniem.

## Autoryzacja i wymagany odbiór

Obowiązuje wcześniejsze jawne polecenie **„jak skończysz wrzuć na pre prod”**: ukończenie DEV → własny CI i Pages końcowego źródła → nieprzesuwany tag DEV → standardowy `google-cloud-dev.yml` → natywny odbiór istniejących admin1/admin3, kont i zegara, oryginalnych ZIP/receipt/obrazu/TAR oraz publicznych bajtów → tag PRE-PROD. Autoryzacja nie oznacza wykonanego wdrożenia. Bez nowej zgody na PROD, DNS, reset lub zmianę haseł; ta paczka ich nie wykonuje.

Historyczny restart admin1 w poprzednim odbiorze został jawnie potwierdzony przez właściciela; admin2/admin3 pozostały wtedy identyczne bajtowo, UID i generacje 2 zachowano. Ten konkretny fakt nie stanowi ogólnego wyjątku dla nowej kontroli kont. Nowe wydanie wymaga własnych odczytowych dowodów przed/po, bez resetów lub zapisów przez QA.

[Bieżące dowody oczekujące](ADVISOR-TASKS-EVIDENCE.json). Nowe karty HL-CHG-1183–1190 oraz przypadki HL-TC-0188–0195 dają **519 zmian i 195 ręcznych scenariuszy**. Wszystkie wyniki ręczne pozostają **NOT RUN**. Dawne 511 kart i 187 przypadków zachowują treść oraz historię. Nowego źródła nie zaliczają testy fc95 ani samo istnienie plików implementacji.
