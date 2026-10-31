# HARBORLIGHT — zakres DEV 0.9.1.1 i projekty v23

Zlecenie użytkownika z 31 października 2026 obejmuje analizę nowych zasad, dokumentację całej historii zmian, ręczne scenariusze, widoczną wersję oraz propozycje społeczności i planszówki. Wewnętrzny etap **v23** i cache `frontend-v23` nie są numerem produktu: w Ustawieniach widnieje **0.9.1.1**.

## Zaimplementowane w tym zakresie

- Wersja gry 0.9.1.1 jest widoczna w Ustawieniach po polsku i angielsku, na komputerze oraz telefonie; źródłem jest `harborlight-version.js`.
- Wersja nie zmienia `state.version`, rewizji dokumentu, generacji wyspy ani historii konta. Samo pokazanie etykiety nie wykonuje resetu.
- Osobne karty historycznych zmian i ręcznych przypadków mają stałe ID, relacje i odrębne statusy kodu, CI, PRE-PROD, PROD oraz wykonania przez człowieka. Definicja testu nie jest incydentem; incydent powstaje po rzeczywistym FAIL.
- Importer kart do GitHub Issues ma domyślny lokalny dry-run oraz osobny właścicielski `--apply`. Nie opublikowano natywnych Issues: dostępny token GitHub jest nieprawidłowy. Zapis w Git i natywne Issues są różnymi stanami.

Dokumenty: [rejestr zmian](tracking/CHANGE-REGISTER.md), [plan testów ręcznych](testing/MANUAL-TEST-PLAN.md), [polityka numerowania](VERSIONING.md), [importer](../scripts/README-tracking-issues.md).

## Analiza do decyzji, odrębna od wdrożenia

- [Archipelag, pasażerowie, ceny i handel](design/ARCHIPELAGO-AND-TRADE-v23.md): odczytane wymagania i zaakceptowane decyzje są oddzielone od pozostałych wariantów. Poziomy/zasoby startowe córki, dalsza wycena po trzeciej córce oraz szczegóły zwykłych rejsów wymagają rozstrzygnięcia.
- [Liga, społeczność i dobroczynność](design/LEAGUE-COMMUNITY-CHARITY.md): użytkownik wybrał średnią z rosnącą premią współpracy, pole Sojusz przy Rankingu, zakładanie/dołączanie/odchodzenie i czat gry. Zaakceptował limity finansowania, serwerowe pochodzenie monet z wyłączeniem wszystkich wpływów handlowych, przycisk udziału oraz rozświetlenie i rzeczywiste szczęście. Konkretna formuła premii, zadania/nagrody i wysokość/czas bonusu H są propozycjami. Nie aktywowano ligi, czatu, prawdziwych darowizn, bonusów ani nowych przepływów monet.
- [Planszówka 2–6 osób](design/BOARDGAME-LIGHTHOUSE-SESSION.md): nowy projekt zastępuje dwie talie **jedną talią i treściami z telefonu**. Każdy ma pionek i wykonuje ruchy, a scenariusz łączy przejście planszy/punkty, kreatywne zadania typu kalambury i zaliczane korzyści online. Wejście „Gra fizyczna” jest wymaganiem przyszłej aplikacji, nie dodanym przyciskiem. Wartość korzyści i reguły scenariusza są do oceny; nie ma serwerowej sesji, faktycznych wypłat ani testu przy stole.

Użytkownik potwierdził: **najpierw analiza i decyzje**, **PvP jako sprzedaż materiałów za monety** oraz **kolejne wyspy od Ratusza 10, 13, 16, 19**. W kolejnych pięciu odpowiedziach zatwierdził:

- cenę jako sumę wszystkich rozbudów Ratusza i Domu od 1 do A — pierwsze trzy córki po 21 000 / 28 000 / 36 000 każdego z sześciu zasobów;
- aktualizowanie prefiksów wszystkich córek po zmianie nazwy matki;
- natychmiastowy teleport dokładnie sześciu osób z Domu matki przy kolonizacji, bez statku i 30-minutowego rejsu; zwykłe późniejsze przewozy nadal trwają 30 minut;
- limit **20 wysp łącznie** oraz ochronę matki przed spadkiem poniżej **12 osób także przez dżumę i odejścia**;
- pułap PvP równy bazowej cenie sprzedaży NPC do gracza, z możliwością tańszej oferty i odsprzedaży NPC.

To zaakceptowane wymagania przyszłego wdrożenia. Nie zaimplementowano tych mechanik ani migracji, nie zmieniono kont i nie opublikowano nowych zasad na PRE-PROD/PROD. Stan startowy córki i szczegóły zwykłych rejsów pozostają otwarte.

## Koszty i poprzedni reset

Rzeczywiste koszty GCP ostatnich 24 godzin są nieustalone: nie ma konektora Billing ani poświadczeń GCP. [Instrukcja odczytu](GCP-COST-CONTROL.md#odczyt-ostatnich-24-godzin--zlecenie-31-października) i [kwerenda dla istniejącego eksportu](../infra/google-cloud/sql/cost-last-24h.sql) nie są potwierdzeniem wyniku. Nie włączono nowych usług, eksportu lub budżetu w celu sprawdzenia.

Użytkownik zapowiedział samodzielne kliknięcie „Zacznij od nowa”. Nie potwierdzono kliknięcia ani jego wyniku. Przycisk odnawia jedną wyspę i samouczek z zachowaniem historii zakupów/jednorazowych uprawnień, lojalności, poleceń, harmonogramu i danych powitalnych; nie jest pełnym wyzerowaniem trzech kont przez skrypt właściciela. W tym zakresie nie wykonujemy żadnego resetu kont.

## Granice wydania

Obowiązuje DEV → Git/CI → PRE-PROD → PROD. Ostatnie potwierdzone PRE-PROD nadal ma kod v22.1 `092e75226fbb14cab09826f313e11d10891966d8` z promocji `41222765705`; nie posiada nowej etykiety wersji 0.9.1.1, dopóki ten zakres nie przejdzie własnej promocji. Aktualny stan i dowody zapisuje [rejestr środowisk](ENVIRONMENT-STATUS.md).
