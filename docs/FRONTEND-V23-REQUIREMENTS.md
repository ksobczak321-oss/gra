# HARBORLIGHT — zakres DEV 0.9.1.1 i projekty v23

Zlecenie użytkownika z 31 października 2026 obejmuje analizę nowych zasad, dokumentację całej historii zmian, ręczne scenariusze, widoczną wersję oraz propozycje społeczności i planszówki. Wewnętrzny etap **v23** i cache `frontend-v23` nie są numerem produktu: w Ustawieniach widnieje **0.9.1.1**.

## Zaimplementowane w tym zakresie

- Wersja gry 0.9.1.1 jest widoczna w Ustawieniach po polsku i angielsku, na komputerze oraz telefonie; źródłem jest `harborlight-version.js`.
- Wersja nie zmienia `state.version`, rewizji dokumentu, generacji wyspy ani historii konta. Samo pokazanie etykiety nie wykonuje resetu.
- Osobne karty historycznych zmian i ręcznych przypadków mają stałe ID, relacje i odrębne statusy kodu, CI, PRE-PROD, PROD oraz wykonania przez człowieka. Definicja testu nie jest incydentem; incydent powstaje po rzeczywistym FAIL.
- Importer kart do GitHub Issues ma domyślny lokalny dry-run oraz osobny właścicielski `--apply`. Nie opublikowano natywnych Issues: dostępny token GitHub jest nieprawidłowy. Zapis w Git i natywne Issues są różnymi stanami.

Dokumenty: [rejestr zmian](tracking/CHANGE-REGISTER.md), [plan testów ręcznych](testing/MANUAL-TEST-PLAN.md), [polityka numerowania](VERSIONING.md), [importer](../scripts/README-tracking-issues.md).

## Analiza do decyzji, odrębna od wdrożenia

- [Archipelag, pasażerowie, ceny i handel](design/ARCHIPELAGO-AND-TRADE-v23.md): odczytane wymagania użytkownika są oddzielone od wariantów i rekomendacji. Brakujące parametry obejmują interpretację kosztu, moment założenia córki, poziomy startowe, limit wysp i rodzaj ceny PvP.
- [Liga, społeczność i dobroczynność](design/LEAGUE-COMMUNITY-CHARITY.md): konkretna propozycja kalendarza, punktacji, współpracy, ograniczonego finansowania oraz serwerowego rozliczania. Nie aktywowano ligi, prawdziwych darowizn, bonusów ani nowych przepływów monet.
- [Planszówka 2–6 osób](design/BOARDGAME-LIGHTHOUSE-SESSION.md): scenariusz 50 minut, plansza budynków i dwie talie, fizyczne zadania oraz teoretyczny companion online. Nie ma implementacji QR, serwerowej sesji ani faktycznie przyznanych nagród.

Użytkownik potwierdził: **najpierw analiza i decyzje**, **PvP jako sprzedaż materiałów za monety** oraz **kolejne wyspy od Ratusza 10, 13, 16, 19 i dalej co trzy poziomy**. To rozstrzyga kierunek, ale nie koszt, limit liczby wysp, stan startowy i szczegóły pasażerów. Nie przenosimy proponowanych parametrów do gry bez ich rozstrzygnięcia. Nowe zasady nie zostały opublikowane na PRE-PROD/PROD.

## Koszty i poprzedni reset

Rzeczywiste koszty GCP ostatnich 24 godzin są nieustalone: nie ma konektora Billing ani poświadczeń GCP. [Instrukcja odczytu](GCP-COST-CONTROL.md#odczyt-ostatnich-24-godzin--zlecenie-31-października) i [kwerenda dla istniejącego eksportu](../infra/google-cloud/sql/cost-last-24h.sql) nie są potwierdzeniem wyniku. Nie włączono nowych usług, eksportu lub budżetu w celu sprawdzenia.

Użytkownik zapowiedział samodzielne kliknięcie „Zacznij od nowa”. Nie potwierdzono kliknięcia ani jego wyniku. Przycisk odnawia jedną wyspę i samouczek z zachowaniem historii zakupów/jednorazowych uprawnień, lojalności, poleceń, harmonogramu i danych powitalnych; nie jest pełnym wyzerowaniem trzech kont przez skrypt właściciela. W tym zakresie nie wykonujemy żadnego resetu kont.

## Granice wydania

Obowiązuje DEV → Git/CI → PRE-PROD → PROD. Ostatnie potwierdzone PRE-PROD nadal ma kod v22.1 `092e75226fbb14cab09826f313e11d10891966d8` z promocji `41222765705`; nie posiada nowej etykiety wersji 0.9.1.1, dopóki ten zakres nie przejdzie własnej promocji. Aktualny stan i dowody zapisuje [rejestr środowisk](ENVIRONMENT-STATUS.md).
