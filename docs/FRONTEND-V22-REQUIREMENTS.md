# HARBORLIGHT — samodzielne działania i przygotowanie promocji v22

Zakres zatwierdzony GO użytkownika **31 października 2026 r.** Uzupełnia [v21](FRONTEND-V21-REQUIREMENTS.md), zachowując reguły gospodarki i wcześniejszą kolejność środowisk. Stan implementacji, CI, podglądu i GCP zapisuje [rejestr środowisk](ENVIRONMENT-STATUS.md); niniejszy dokument jest specyfikacją, nie dowodem publikacji.

## Samodzielne wykonanie przyszłej lekcji

- Jeżeli gracz skutecznie wykonał działanie wymagane przez późniejszą lekcję, zanim ta stała się bieżącym zadaniem, lekcja zostaje pominięta i nie jest ponownie wymagana. Przykład: rzeczywiste wydanie punktów szczęścia Domu przed krokiem 13 usuwa potrzebę powtórzenia tego kroku.
- Pominięcie nie tworzy skrzyni, premii materiałowej ani monet i nie otwiera decyzji o podwajaniu nagrody. Nie blokuje dalszych lekcji przez oczekiwanie na nieistniejącą skrzynię, jej odbiór lub udostępnienie.
- Aktualna lekcja wykonywana zgodnie z instrukcją nadal otrzymuje zwykłe rozliczenie i nagrodę. Znikanie dotyczy działań wykonanych wcześniej samodzielnie; nie odbiera wcześniej zdobytych nagród.
- Liczą się udane rzeczywiste działania. Samo otwarcie okna, przeczytanie opisu, ruch kursora, heartbeat, autosave ani nieudana komenda nie zastępują przydziału, wydatku lub innego wymaganego działania.
- Kolejne lekcje tego samego typu wymagają odrębnych działań. Jeden przydział tragarza nie może zaliczyć zarówno pierwszego, jak i dodatkowego tragarza; dwa osobne awanse Ratusza nadal mają własne cele.
- Rozpoznane wykonanie i pominięcie są trwałą częścią zapisu. Wczytanie, kolejne logowanie i ponowna normalizacja nie przywracają pominiętej lekcji, nie tworzą skrzyni wstecz i nie przyznają powtórnej nagrody.
- Zachowujemy historię zakończonych lekcji, odebranych nagród oraz rozpoczętych dawnych programów. Nie wymyślamy historii działań, której poprzedni zapis nie rejestrował. Bieżący poziom lub dostarczony produkt może być dowodem wyłącznie tam, gdzie faktycznie odpowiada warunkowi danej lekcji.
- Zachowanie dotyczy zarówno nowego zbilansowanego programu v21, jak i wspieranego programu historycznego. Zmiana nie wymaga resetowania istniejących wysp.

Pełna kolejna ścieżka 25 działań nowego programu nadal wymaga odbioru równowagi: końcowy pełny zwykły magazyn, brak bonusowej nadwyżki i oczekujących skrzyń. Ominięte działania nie otrzymują zaległych premii, więc dowolna kolejność samodzielnej gry może wymagać własnej produkcji lub wydatków. Końcowe rozliczenie pozostaje jawną czynnością z rzeczywistymi warunkami; przypadkowa inna akcja nie może samoczynnie przyznać końcowego napełnienia magazynu.

## Link roboczy i promocja

Użytkownik otrzymuje działający podgląd DEV z opisem tego, czy sprawdzana wersja jest już opublikowana. Pages nie jest kontem PRE-PROD, nie zapisuje postępu tych kont i nie dowodzi aktualizacji GCP. Nowy pakiet ma przejść lokalną walidację, synchronizację Git i CI dla dokładnie tego SHA przed osobną promocją.

Obowiązuje **DEV → GitHub/CI → PRE-PROD (`harborlight-dev`) → PROD (`harborlight-prod`)**. Przygotowanie pod promocję nie omija bramki CI, testów opublikowanych plików ani odbioru rzeczywistej tożsamości i konfiguracji API. Kod handlu graczy nie oznacza jego aktywacji na GCP.

## Reset po udanej promocji PRE-PROD

Użytkownik zlecił po promocji restart od zera wszystkich trzech kont testowych: **`admin1`, `admin2`, `admin3`**. Dla tej jednej operacji zastępuje to wcześniejsze polecenia zachowania postępu `admin1` oraz zakaz resetowania tych wysp. Nie upoważnia do resetu przed pomyślnym odbiorem promocji ani na PROD.

Tożsamości Firebase Authentication, UID, loginy i hasła zostają zachowane. Reset stanu gry jest osobną operacją właściciela z kontrolą właściwego projektu i odczytem wyniku; nie jest ukrytą częścią zwykłego deployu. Procedura zabezpiecza się przed przywróceniem poprzedniego świata przez starą sesję. Szczegóły i wymagane dowody opisuje [PREPROD-RESET.md](PREPROD-RESET.md).

Do czasu odrębnego potwierdzenia w [rejestrze](ENVIRONMENT-STATUS.md) reset ma status **zlecony, niewykonany**. Nie zgłaszamy jego wykonania na podstawie samego istnienia skryptu lub lokalnego testu.

## Odbiór

Testy powinny objąć wcześniejsze punkty Domu, serię kilku przyszłych działań, różne przydziały tego samego typu, brak nagrody i skrzyni za pominięcie, możliwość przejścia do następnej lekcji, zachowane dawne nagrody, zapis/wczytanie oraz pełną ścieżkę równowagi v21. Odbiór przeglądarkowy ma sprawdzić rzeczywistą listę i bieżącą podpowiedź po zniknięciu kroku.

Narzędzie resetu jest testowane wyłącznie na izolowanych fiksturach przed promocją. Rzeczywisty odczyt wszystkich trzech kont po operacji i niezmienność ich tożsamości stanowią osobny dowód wykonania w PRE-PROD.
