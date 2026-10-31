# DEV0.10.0.0 i aktualizacja0.10.1.0 — archipelag i społeczność

GO użytkownika z 31 października 2026 obejmuje wdrożenie wcześniejszych projektów **wyłącznie w DEV**, dwa powroty w Pomocy, komplet samodzielnej planszówki do wydruku i scenariusze do ręcznego odbioru. Integracja gry fizycznej z kontami online jest wyłączona z tego zlecenia. GitHub Pages pozostaje podglądem DEV. Nie uruchamiamy promocji GCP, migracji chmurowych ani resetu kont.

## Zakres

- Archipelag do 20 wysp: kolejne progi Ratusza matki 10/13/16/19…, kumulacyjny koszt rozbudów Ratusza i Domu 1→A w każdym z sześciu zasobów, dynamiczny prefiks nazwy matki. Natychmiastowa kolonizacja dokładnie sześcioma istniejącymi mieszkańcami rzeczywiście obecnymi w Domu. Matka zachowuje minimum 12 także wobec odejść i dżumy.
- Zwykły statek przewozi albo towary (1000+, 10 min), albo ludzi (100, 30 min). Zachowujemy rekordy osób, rezerwujemy miejsca u celu i rozliczamy normalne posiłki. Rejs nie pobiera monet. Historyczne wyspy i rejsy nie są usuwane ani opłacane wstecz.
- NPC i sprzedaż materiałów graczom za monety działają równolegle. Maksimum PvP jest bazową ceną sprzedaży NPC, a historyczne oferty barterowe zachowują literalne warunki. Transakcje, rezerwacje i ponowienia są rozliczane serwerowo.
- Pole Sojusz przy Rankingu, tworzenie/dołączanie/odchodzenie, kapitan i zamrożony skład ligowy. Dwa czaty: sojuszu oraz prywatny gracz–gracz; sprawdzanie dostępu, blokowanie, zgłaszanie, ograniczenia wiadomości i potwierdzenia serwera.
- Liga: średnia całego zgłoszonego składu, +2 za kolejnego aktywnego uczestnika, najwyżej +8. Dwa zadania dziennie, logiczne i zręcznościowe, dostępne w tym samym wspólnym oknie19:00–21:00 Warszawy, po dwie próby i nagrody kosmetyczne. Serwer oblicza wynik z legalnych działań i własnego zegara.
- Pomagam: 1000 kwalifikowanych monet → 1 zł z zabezpieczonej puli operatora, raz na miesiąc Warszawy i co najmniej 30 dni odstępu. Pula najwyżej 50 zł, później dodatkowo ograniczona do 5% rzeczywistej marży i odłożonych pieniędzy. Monety kupione, handlowe i o nieznanym pochodzeniu nie kwalifikują się. +20 p.p. szczęścia na jednej wyspie przez 6 h i światło Portu dopiero po potwierdzeniu przelewu. DEV ma jawny, oddzielny tryb symulacji, bez prawdziwych przelewów.
- Pomoc: „Wróć do tutoriala” ponawia objaśnienia ekranu bez zmiany świata; „Wróć do samouczka” wznawia istniejące lekcje bez powtarzania nagród. Zegar rozpoczętej wyspy biegnie także podczas ponownego oprowadzania.
- Planszówka 2–6 osób / 45–60 min: jeden komplet kart, ruch pionków, sceny aktorskie i telefon lub wydruk instrukcji. Samodzielny prototyp do wydruku, bez przyznawania nagród kontom online.

## Potwierdzone parametry i aktualizacja0.10.1.0

Poniższe parametry były najpierw jawnymi założeniami prototypu. Użytkownik następnie potwierdził oba zestawy zasad wysp i posiłków oraz wybrał **jedno wspólne okno ligi19:00–21:00** dla obu zadań. Ta decyzja zastępuje wcześniejszy podział19–20/20–21; pozostałe parametry pozostają bez zmiany. Aktualizacja dotyczy wyłącznieDEV0.10.1.0, bez promocjiGCP i resetu kont.

- Dalsze A=10/11…; Ratusz i Magazyn córki kopiowane raz, pozostałe budynki poziom 1. Córka startuje bez darmowych zasobów; potrzebuje dowozu żywności. Minimum córki 6, wolne miejsca Ratusza i łóżka u celu rejsu pasażerskiego.
- Zwykłe posiłki na 30-minutowy rejs przygotowujemy przy wypłynięciu: 0,5 żywności na osobę. Jest to normalne żywienie, bez dodatkowej opłaty w monetach. Nie można zmieniać trybu ładunku w czasie rejsu.
- Liga 15–21 każdego miesiąca, Europe/Warsaw; oba zadania, logiczne i zręcznościowe, we wspólnym oknie19:00–21:00. Dzienny wynik to średnia obu zadań, brak zadania daje 0. Trening dostępny poza slotami nie punktuje w lidze.

## Migracja i granice dowodów

Schemat samego świata pozostaje 9. Metadane archipelagu przechodzą z v1 do v2 z prywatnymi dokumentami poszczególnych wysp, aby 20 światów nie przekraczało limitu dokumentu Firestore. Zapis zachowuje rewizje i kontrolę konfliktów; operacja konta nadal jest atomowa. Reguły i kod przygotowane w Git wymagają osobnego przyszłego przejścia przez PRE-PROD przed PROD.

Gospodarka zwykłej wyspy nadal jest wyliczana przez klienta. Każdy nieprzejrzysty zapis klienta zachowuje wszystkie monety jako **niekwalifikowane** dla prawdziwej dobroczynności, także przy zerowej zmianie netto: nie znamy emisji i wydatków pomiędzy zapisami. Dopiero autorytatywne komendy gospodarki mogą zastąpić ten bezpieczny tryb; zaufane emisje i potwierdzenia finansowania/przelewu nie są publicznymi komendami gracza. Włączenie realnej akcji wymaga wybranej organizacji i zaufanych źródeł. Podgląd społeczności korzysta z wyraźnie opisanej ulotnej demonstracji, jeżeli nie ma uwierzytelnionego API. To nie jest dowód aktywacji API w GCP.

Odbiór i stan środowisk: [ENVIRONMENT-STATUS.md](ENVIRONMENT-STATUS.md). Ręczne sprawdzanie od poniedziałku: [testing/START-HERE.md](testing/START-HERE.md). Żaden automatyczny test nie oznacza wykonania ręcznego scenariusza.
