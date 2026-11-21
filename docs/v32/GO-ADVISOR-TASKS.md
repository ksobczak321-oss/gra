# DEV i PRE-PROD 0.15.3.1 — zadania i plan Doradcy Królestwa

**Odebrane automatycznie 2026-11-21.** CODE `ace6fb06bb20a65b20a363722cdf35a0799fb1c4`, publikacja `1e21ff1340c7327db9d63a42934547f14548294e`. Własny CI44943513346, Pages44943513266 i standardowy PRE-PROD44946821720/1 mają SUCCESS; tagi DEV/PRE-PROD są zdalnie potwierdzone. Natywne istniejące admin1/admin3, oryginalne ZIP/receipt/obraz/TAR, wszystkie publiczne bajty i nowy ścisły audyt kont mają odrębne PASS w [dowodach](ADVISOR-TASKS-EVIDENCE.json). Wszystkie trzy profile zachowały identyczne bajty, UID, generacje i początki wysp. Zegar admin3 pozostał zachowany. QA i wdrożenie nie zapisywały ani nie resetowały świata lub zegara. Jawnie potwierdzony restart właściciela admin1 z poprzedniego wydania pozostaje wyłącznie tamtym historycznym zdarzeniem. Ręczny odbiór 195 przypadków nadal NOT RUN.

Poniższe checkpointy PENDING i wcześniejszy 6e7 FAIL zachowują kontekst historyczny; końcowy pełny odbiór publikacji pochodzi z jej własnego CI, Pages i standardowego GCP. Poprzednie zezwolenie „jak skończysz wrzuć na pre prod” wykonano w standardowej kolejności DEV→CI/Pages→PRE-PROD. Brak działań PROD/DNS/reset/haseł.

## Trzecia publikacja cache23 — CI FAILURE na globalnym stubie Workera

PUB `5cb9e97f12f13631cb83473cd2506d25370384f4` ma **CI44941704545 FAILURE 8 min 34 s**. Pełne 1896 Node, 173 Python, osobna przeglądarka minigier i **pierwsze 11/60 głównych programów** przeszły, w tym pięć kontekstów guidance. Dwunasty `startup-replay` zatrzymał się na ścisłej asercji jednego Workera i jednego zakończenia: otrzymał 2/2. Globalny stub testowy błędnie przejmował nowego Workera porad jako Workera nadrabiania i odczytywał niewłaściwy `packet.bundle`. Pozostałych **48 głównych i 18 chmurowych programów nie uruchomiono**. Pełnego main lub CI PASS nie deklarujemy.

Poprawka obejmuje wyłącznie test: rozpoznanie rzeczywistej roli replay po origin i pathname `harborlight-v1-startup-replay-worker.js`; pozostałe natywne Workery przechodzą bez przechwytywania. Wszystkie 33 dotychczasowe asercje i limity pozostają zachowane; dodano trzy ścisłe asercje natywnego echo/passthrough. Pełny natywny pakiet replay na niezmienionych bajtach 5cb ma lokalne **14/14 PASS**. Kontrola no-flash desktop/mobile pozostaje PENDING do końcowego raportu właściciela; lokalna naprawa nie oznacza pełnego CI PASS. Niezależny przegląd 310 źródeł nie wykazał innych globalnych założeń o Workerze. CODE ace6, wszystkie 466 publicznych plików i kanoniczne artefakty pozostają bez zmian.

Pages44941704526 ma osobny **SUCCESS 49 s**: 466 plików treści /96 673 009 bajtów przez normalny TLS oraz oba XLSX osobno zgodne z tym samym 5cb. Nowy PUB4, własny CI i Pages pozostają PENDING; brak nowego tagu DEV/PRE-PROD, GCP i bazowej kontroli kont. Wcześniejsze historie 4f FAIL, 32d FAIL i 6e7 export FAIL zachowano; lokalne ace6 canonical PASS pozostaje odrębne. Odebrane PRE-PROD nadal 0.15.3.0/fc95/cache22;195 ręcznych przypadków NOT RUN.

## Druga publikacja cache23 — CI FAILURE na katalogu testu

PUB `32d7d189a482b2001761c7a1c4dfb4a2b69c31fe` ma **CI44940453474 FAILURE 9 min 10 s**. Pełne 1896 Node, 173 Python i osobna przeglądarka minigier przeszły. Z 60 głównych programów przeszło **pierwszych siedem**: cache, wydajność, etapy budynków, redakcja, Doradca UI, układ i Worker. Ósmy `guidance-smoke` zakończył się **przed uruchomieniem przeglądarki**: domyślny prywatny katalog `/workspace` nie był zapisywalny na runnerze GitHub. Pozostałych **52 głównych i 18 chmurowych programów nie uruchomiono**. To nie jest pełny PASS głównych programów lub CI.

Poprawka dotyczy wyłącznie portowalnej domyślnej ścieżki wyjścia testu i importu `tempfile`; pełny program guidance z nieustawionym `HARBORLIGHT_TEST_OUTPUT` ma lokalne **5/5 kontekstów PASS**, z raportem i15 zrzutami w domyślnym `/tmp`. Asercje pozostały bez zmian. Ten wynik naprawy nie jest pełnym PASS CI; nowe źródło wymaga własnego CI. Runtime, CODE ace6 i kanoniczne artefakty pozostały niezmienione.

Pages44940453447 ma osobny **SUCCESS 29 s**: 466 plików treści /96 673 009 bajtów przez normalny TLS i oba XLSX zweryfikowane osobno dla własnego 32d. Nowy PUB3, własny CI i Pages są PENDING. Brak nowego tagu DEV/PRE-PROD, GCP i bazowej kontroli kont. Wcześniejsze 4f CI FAIL i 6e7 export FAIL pozostają zachowane; ace6 canonical PASS nie jest ich pełnym odbiorem. Odebrane PRE-PROD nadal 0.15.3.0/fc95/cache22;195 ręcznych przypadków NOT RUN.

## Pierwsza publikacja cache23 — CI FAILURE, nowe źródło oczekuje

PUB `4f873f489ca7332dfa32647c78cd3debe19d952a` ma własny **CI44939109067 FAILURE 8 min 38 s**. 1896 Node, 173 Python, master, redakcyjny Excel, minigry i osobny program minigier przeszły. Pierwszy główny program `building-cache` zatrzymał się przed uruchomieniem przeglądarki: aktualna fikstura oczekiwała cache22 wobec poprawnego runtime23. **60 głównych i 18 chmurowych programów nie wykonano**; nie deklarujemy pełnego CI PASS. Rzeczywiste raporty i logi pozostają zachowane.

Poprawiono wyłącznie pięć bieżących odwołań w dwóch plikach testów Python: jedno oczekiwanie cache i cztery importy współdzielonego modułu etapów. Asercje, limity i historyczne kontrole negatywne zachowano. Trzy pełne programy przeglądarkowe przeszły na niezmienionych bajtach 4f: rzeczywiste starty cache i kontrole negatywne, wydajność oraz 200 grafik /160 pozycji żurawia. Runtime, ekonomia, CODE ace6 i kanoniczne artefakty pozostały identyczne bajtowo.

Pages44939109035 tego źródła ma osobny **SUCCESS 38 s**: 466 plików treści /96 673 009 bajtów przez normalny TLS oraz oba XLSX zweryfikowane oddzielnie. Jest to dowód publikacji własnych bajtów 4f; nie zalicza następnego źródła. Nowy PUB2, własny CI i Pages są PENDING. Nie utworzono nowego tagu DEV/PRE-PROD, nie uruchomiono GCP ani nie pobrano nowej bazowej kontroli kont. Odebrane PRE-PROD nadal fc95/cache22;195 ręcznych przypadków NOT RUN.

## Historia — lokalna gotowość CODE przed publikacją

Źródło kodu i eksportów **`ace6fb06bb20a65b20a363722cdf35a0799fb1c4`** jest zamrożone. Względem pierwszego CODE 6e7 zmieniono wyłącznie jeden marker pochodzenia tekstu w eksporterze; runtime i testy są identyczne bajtowo. Zachowany pierwszy FAIL zatrzymał eksport tekstów przed symulacjami i nie otrzymuje świeżego PASS. Nowy pełny pipeline i świeża walidacja mają własny PASS przypięty do nowego CODE.

Master: **164 kart / 64 bieżących / 66801 wierszy / 136 źródeł**, 8365051 bajtów, SHA256 `0e91fe4182890d9f59dc6db8450980d2221496be3d38942864a1f8790fa8eaee`. Redakcyjny Excel: 6 kart / 413 wierszy / 117 odcisków, 60328 bajtów, SHA256 `ddbbad979126ed87818e75405670e21c9b7214627f24e6014e9ec52eaa9e5fee`. Wszystkie 419 wierszy A/B/C z nagłówkami pozostają dokładnie zgodne z fc95, przy pustej C. Trzynaście tabel gospodarki i 200 wierszy grafik zachowuje pełną zgodność. Dwa rzeczywiste pełne eksporty 24/24/72 h mają ścisłe zero różnic całego JSON: 4039094 bajtów, SHA256 `8fa1106c1e9a0ccfd7a194987fd8e6ff7c1335f712fe50b14bf70eac936f1467`, bez tolerancji lub wyłączania pól. Wszystkie trzy profile są także zgodne z poprzednim f657.

Minigry: **55 gier /110 instrukcji**, zachowana treść poza źródłowym SHA, 1045 części DOCX i 56 TXT z indeksem; zero przesunięć kotwic. ZIP 2390499 bajtów, SHA256 `5872a18084e4a0c4521b17bb5a831993bc3b21837d17bf4ba0b8f7c040168cb2`. Przykłady Doradcy PL/EN obejmują 12 planów, 30 kart i 88 instrukcji; tutorial 28, archiwum 56, osiem tematów i zachowany kurs 25 pozostają ujęte w aktualnym eksporcie. [Pełny raport](ADVISOR-TASKS-EVIDENCE.json) ma własne dowody nowego źródła.

Rzeczywiste **28 testów pakietu po eksportach PASS** w 14.315 s uzupełnia 145 wcześniejszych: **173 Python PASS**. Pełny frontend 1711, backend 178, planszówka 7 i 8 lokalnych UI zachowują własne dowody; zgodność źródeł runtime/testów potwierdzono między CODE. PUB/push, własny CI 79/Pages, publiczne bajty, tag DEV i standardowy PRE-PROD nadal **PENDING**. 519 kart / 195 ręcznych przypadków NOT RUN.

## Historia — checkpoint przed końcowym CODE

Planista, UI i prowadzenie zostały zgłoszone jako zamrożone do integracji wersji/cache. Niezależny odczytowy przegląd ma **510 PASS** dla poziomów 1/4/5/8/20 i wszystkich budynków; właściciel planisty raportuje osobne 26+27 testów kierunkowych i lokalnego Workera. Raporty układu oraz prowadzenia PL/EN są zachowane z własnymi hashami i ograniczeniami w dowodach. To próby sprzed globalnej zmiany cache, częściowo z adresem Workera cache22, a nie odbiór końcowego źródła cache23. Pełny frontend cache23 przed późniejszym doprecyzowaniem przyjaznego tonu i adaptacyjnego celu miał **1704/1704 PASS** w210702,057066ms; ten surowy wynik pozostaje PRE_STEERING. Późniejsza zmiana wymaga ponowienia pełnego finału. CODE, własny CI/Pages, świeże artefakty i nowy PRE-PROD pozostają **PENDING**.

Statyczna kontrola finalnej allowlisty potwierdza dokładnie pięć nowych nazw: `harborlight-v1-advisor-development-plan.js`, `harborlight-v1-advisor-development-client.js`, `harborlight-v1-advisor-development-worker.js`, `harborlight-v1-advisor-guidance.js` i `harborlight-v1-advisor-guidance.css`. Nie usunięto dawnych plików. Po dołączeniu minigier i indeksu oczekiwane są **466 plików treści / 467 wraz z generowanym manifestem wydania**; faktyczny build, rozmiary i hashe wymagają osobnej kontroli końcowego źródła.

## Historia — odbiór lokalny przed zamrożeniem CODE

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
