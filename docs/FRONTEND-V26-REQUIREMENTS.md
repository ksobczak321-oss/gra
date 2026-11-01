# DEV 0.10.2.0 — czytelne zasoby, tutorial i szybszy początek gry

GO użytkownika z 1 listopada 2026 (Europe/Warsaw) obejmuje zebrane po wydaniu 0.10.1.0 poprawki **wyłącznie DEV**. Dokument rozdziela potwierdzone wymagania, parametry wykonawcze i dwa jawne założenia pozostające otwarte na korektę. Sam zapis wymagań nie potwierdza zakończenia implementacji, testów ani publikacji.

PRE-PROD pozostaje na **0.10.1.0**, źródło `353faad347262dce7c3632fdf7c71be124384ab1`, CI [41246449612](https://github.com/ksobczak321-oss/gra/actions/runs/41246449612), wdrożenie [41246771480](https://github.com/ksobczak321-oss/gra/actions/runs/41246771480). Nowy zakres nie obejmuje promocji GCP, resetu `admin1`–`admin3`, prawdziwych płatności, reklam, przelewów dobroczynnych ani integracji planszówki online. Bieżące dowody publikacji rozstrzyga [rejestr środowisk](ENVIRONMENT-STATUS.md).

## Magazyn, Dom i okno reklamy

- W głównych wierszach Magazynu pokazujemy **łączną dostępną ilość** danego zasobu. Rozbicie „zwykłe + z nagród” trafia do objaśnienia pod **ⓘ**. Pod tą samą ikoną znajduje się „Jak działa magazyn”. Nie zmieniamy mechaniki: nagrody można wydawać od razu i nie zajmują zwykłego limitu dostaw. Liczniki pojemności dotyczą zwykłego zapasu; informacja musi to jasno wyjaśnić.
- Dom pokazuje przycisk **„Zarządzaj pracownikami”**, który dopiero otwiera przydziały wszystkich gałęzi gospodarki. Pełna siatka obsady nie zajmuje pierwszego widoku Domu. Funkcje przypisywania i powrotu pozostają dostępne.
- Użytkownik zgłosił, że po „Daj wszystkim +1 p.p.” przycisk „Przekaż punkty” powinien być niedostępny. Na jego zrzucie po rozdaniu pozostają jednak dwa punkty. **Założenie wykonawcze bez dodatkowego potwierdzenia:** reszta nadal jest wydawalna pojedynczo; przycisk blokujemy przy niewystarczającej puli, nieprawidłowej kwocie lub braku uprawnionego odbiorcy. Nie dodajemy dziennej blokady po samym rozdaniu wszystkim ani nie usuwamy pozostałych punktów. Użytkownik nie odpowiedział na opcjonalne pytanie; interpretacja pozostaje otwarta na korektę.
- W oknie „Reklama z nagrodą” przyciski obejrzenia i pominięcia mają wyraźny odstęp także na telefonie. Dodatkowe zdanie wyjaśnia dobrowolną reklamę i konkretną nagrodę przed wyborem. Symulacja DEV jest jawnie oznaczona.

## Ranking, społeczność i Pomagam

Kliknięcie Punktów prowadzi do **Rankingu**, a nie do części Ustawień. Aktualna pozycja w rankingu jest odróżniona od wyniku punktowego. Dane rankingowe aktualizują się po pełnej godzinie zgodnie z dotychczasową zasadą; brak danych nie jest fikcyjną pozycją rzeczywistego gracza.

Osobne, opisane wejścia to **Ranking**, **Sojusz i liga** oraz **Pomagam**. Ustawienia nie zawierają wklejonych pod nimi sekcji społeczności. Każde wejście tłumaczy, co można zrobić i po co. DEV pokazuje oznaczone dane demonstracyjne sojuszu, ligi i dobroczynności. Nie sugeruje, że wiadomość, członkostwo albo wpłata zostały zapisane na prawdziwym serwerze, jeżeli jest to wyłącznie prezentacja.

Chmurka czatu znajduje się **przed dzwonkiem powiadomień** i otrzymuje opis: **„Tu możesz rozmawiać online z innymi graczami.”** Korzysta z uzgodnionych kanałów: czat sojuszu i prywatna rozmowa jeden na jeden. Nie dodajemy publicznego kanału ujawniającego prywatne wiadomości. Bez skonfigurowanej usługi stan ma jasno wskazywać brak połączenia albo demonstrację.

W „Pomagam” prezentujemy **2–3 fikcyjnych, wyraźnie oznaczonych beneficjentów** jako projekt późniejszej obsługi umów i przelewów zgodnych z wytycznymi właściciela. Nie wpisujemy rzeczywistych organizacji jako zakontraktowanych. Pozostają wcześniejsze ograniczenia:

- 1000 kwalifikowanych monet zdobytych w grze odpowiada 1 zł deklarowanej wpłaty właściciela; monety kupione, wpływy handlowe i nieustalone pochodzenie są wyłączone.
- Najwyżej raz na osobę w miesiącu i co najmniej 30 dni od poprzedniego przekazania; nie dodajemy nowego wymogu wieku konta. Początkowa wspólna pula 50 zł, później dodatkowo najwyżej 5% faktycznej marży poprzedniego miesiąca. To limity, a nie dowód rentowności lub dostępnego finansowania.
- Rozświetlenie portu i +20 p.p. szczęścia przez 6 godzin na jednej wyspie dopiero po potwierdzeniu rzeczywistego przelewu. Demonstracja nie potwierdza przelewu i nie przyznaje prawdziwego uprawnienia.
- Rzeczywista realizacja wymaga osobnego uruchomienia zaufanej ewidencji pochodzenia monet, finansowania, beneficjentów i procesu potwierdzania przelewów. Ten GO zleca czytelny DEV, bez takiej aktywacji.

## Tutorial i samouczek — dwa różne narzędzia

**Tutorial** oznacza oprowadzanie po ekranie: 33 opisy. Opis nowego przycisku czatu znajduje się osobno przy jego ikonie; nie dodaje 34. kroku. **Samouczek** oznacza 25 praktycznych lekcji, wykonywanych w rzeczywistej gospodarce wyspy. Nazwy są konsekwentne w Pomocy, przyciskach, tytułach i podpowiedziach.

Oba narzędzia można zamknąć i później wybrać **kontynuowanie od przerwanego miejsca** albo **obejrzenie od początku**. Przy ponownym przeglądaniu ukończonych działań nie przyznajemy ponownie nagród, nie cofamy ukończonych lekcji i nie resetujemy wyspy. Rozpoczęty świat zachowuje swój czas. Tylko pierwsze wprowadzenie przed pierwotnym startem wyspy podlega dotychczasowej pauzie startowej. Ponowne objaśnienia nie uruchamiają nowej ochrony powitalnej.

Praktyczna lekcja nadal najpierw wyróżnia budynek na mapie, czeka na kliknięcie gracza, a potem pokazuje właściwy przycisk. Przykład priorytetu prowadzi jawnie przez **szczegóły budynku → priorytety → Budowa**. Samo otwarcie okna lub obejrzenie podpowiedzi nie wykonuje operacji.

Automatyczne propozycje reklam i wyboru „ekspedycja albo reklama” nie pojawiają się podczas aktywnego tutoriala **ani** samouczka. Wcześniejsze zamknięcie uruchamia ochronę przez kolejne **60 aktywnych minut**. Czas bezczynności lub wylogowania nie skraca tej ochrony. Ochrona jest zapisywana i respektowana po ponownym wejściu; nie powinna przy okazji usuwać zapamiętanego harmonogramu. Dobrowolne wejście gracza do ekspedycji pozostaje osobnym działaniem.

**Założenie wykonawcze kolejności:** Szczęście → Monety → Pracujący → Następny mieszkaniec → Punkty → Mieszkańcy i miejsca. Użytkownik nakazał przenieść „Pracujący” bezpośrednio po Monetach i „Mieszkańcy i miejsca” za Punkty, lecz ostatni symbol w wiadomości powtarza T4. Odczytujemy go jako T5. Brak odpowiedzi na opcjonalne pytanie nie jest dodatkowym potwierdzeniem; ta jawna interpretacja pozostaje otwarta na korektę.

## Teksty zaakceptowane przez użytkownika

Jeżeli użytkownik nie podał nowego brzmienia, dotychczasowy tekst uznał za poprawny. Redakcja poniżej poprawia interpunkcję i naturalną polszczyznę, bez zmiany sensu lub reguł gospodarki. Polska i angielska wersja zachowują te same liczby oraz warunki.

### W1 — Twoja wyspa, Twoje decyzje

Obejmujesz opiekę nad małą osadą na wyspie. Zapewnij mieszkańcom domy, żywność i pracę, a z czasem rozbuduj ją w tętniący życiem port.

Celem gry jest rozwój i dbanie o dobrostan mieszkańców. Daj mieszkańcom pracę i zadbaj o to, by wyprodukowane materiały trafiały do magazynu. Im szczęśliwsi są mieszkańcy, tym chętniej na wyspę przybywają nowe osoby.

### W2 — Nadaj nazwę swojej wyspie

Nazwa ma większą czcionkę, **3–40 znaków** i nie może zawierać wulgarnych słów po polsku ani angielsku. Walidacja obejmuje tworzenie i zmianę nazwy; użytkownik dostaje zrozumiałą przyczynę odrzucenia. Wczytanie dawnej, dwuznakowej nazwy pozostaje możliwe i nie zmienia jej na nazwę domyślną. Prefiksy i historia wysp córek nie giną podczas migracji.

### T3 — Szczęście mieszkańców

Dbaj o pracę i jedzenie mieszkańców. Atrakcje i błogosławieństwa dodatkowo zwiększają ich szczęście.

Od szczęścia populacji zależy tempo przybywania nowych osadników. Nieszczęśliwi mieszkańcy opuszczają wyspę.

Praca i jedzenie dają mieszkańcowi łącznie +2 punkty procentowe szczęścia na godzinę. Brak pracy i jedzenia z czasem obniża jego szczęście.

Opis +2 p.p./h oznacza sumę dotychczasowych efektów pracy i jedzenia. Nie zmienia istniejących osobnych kar za głód, bezrobocie ani rzeczywisty przestój produkcji; uwzględnia również powitalne minimum i efekt Latarni.

### Pozostałe poprawione opisy

| Element | Brzmienie lub wymagany sens |
|---|---|
| T4 — Monety | Monety służą do handlu oraz rozbudowy budynków. Każdy pracujący mieszkaniec płaci podatki. Dodatkowo możesz je zdobyć w zadaniach i ekspedycjach. |
| T5 — Mieszkańcy i miejsca | Pokazuje aktualną liczbę mieszkańców wyspy, maksymalną liczbę mieszkańców zależną od poziomu Ratusza oraz liczbę dostępnych łóżek zależną od poziomu Domu. |
| T6 — Pracujący mieszkańcy | Bez zmiany: pokazuje osoby, które rzeczywiście dotarły do pracy; nowo przydzielony najpierw idzie do budynku. |
| T8 — Punkty | Aktualna pozycja w rankingu graczy, aktualizowana co pełną godzinę; stąd także dostęp do zawiązywania sojuszy. Nie opisuje dawnego wyniku jako pozycji. |
| T10 — Bieżące zadania | Ruiny Latarni są wizytówką wyspy. Każdy mieszkaniec lubi tam spędzać czas. Dostajesz zadania związane z jej bieżącą eksploatacją. Rozbudowa Latarni jest świętem całej wyspy. Istniejące terminy i warunki zadań pozostają bez zmian. |
| T11 — Ekspedycje i minigry | Sposób na zarabianie dodatkowych monet. |
| T20 — Targ | Dotychczasowy opis zaakceptowany, bez zmiany reguł i prowizji. |
| T21 — Port | Dotychczasowy opis poziomów handlu i wysp pozostaje; ostatnie zdanie: „Statkiem przewozisz towary albo pasażerów.” Usuwamy „Wspólnym”. |
| T22 — Kaplica | W kaplicy zdobywasz błogosławieństwa, które zapewniają szczęście mieszkańców. Częstotliwość modlitw wpływa na przychylność Stwórcy. |
| T24 — Statek i handel | Kliknij statek, aby otworzyć handel w Porcie. |
| T27 — Zasoby | Karta pokazuje kolejno zapas u producenta, w magazynie centralnym i w nawiasie w transporcie. Ostatnia linia to bilans godzinowy uwzględniający produkcję oraz zużycie, dlatego może być ujemna. Przykład Kamień 0 / 537 (0), → 0 szt./h oznacza 0 u producenta, 537 centralnie, 0 w transporcie i zerowy bilans. Kliknięcie otwiera budynek produkcyjny. |
| T28 — Dekoracje i atrakcje | Pojedyncze zdarzenia dają czasowe premie do szczęścia za monety. Przed zakupem sprawdź cenę, objętych premią mieszkańców i czas trwania efektu. |

W opisach **wszystkich pięciu producentów** (Gospodarstwo, Młyn, Kamieniołom, Drwale, Tartak) dodajemy zdanie: **„Jeśli magazyn przy budynku jest pełny, nad budynkiem pojawia się smutna buźka.”** Stan ikony wynika z rzeczywistego zapełnienia; nie przypisujemy bezrobotnemu kary za pełen magazyn i nie usuwamy odrębnych komunikatów o braku surowca do przerobu.

## Nowy początek 25 praktycznych lekcji

1. **Przydziel 6 tragarzy do Magazynu.** Pokazuj postęp 0/6…6/6. Nagroda i zaliczenie dopiero po szóstym rzeczywistym przydziale; podpowiedź wyjaśnia, że to usprawni dostarczanie materiałów na budowę.
2. **Ustaw tragarzom priorytet Budowa.** Prowadzenie pokazuje wejście do szczegółów budynku i konkretny priorytet.
3. **Przydziel rolnika.**
4. **Przydziel drwala.** W czasie tych działań wcześniej przydzieleni tragarze mogą dojść do Magazynu.
5. **Zleć rozbudowę Ratusza do poziomu 2.** Chmurka pokazuje osobno czas transportu i czas budowy oraz możliwość dobrowolnego przyspieszenia za monety. Wartości pochodzą z bieżącego planu, a nie ze stałego tekstu ignorującego warunki.

Pozostałe lekcje zachowują łączną liczbę **25** i wymaganie prawdziwej czynności. Usuwamy z nowego kursu polecenie rozbudowy Ratusza do 3 i oczekiwanie na nią. W to miejsce pojawiają się dwie odrębne lekcje: **ukończ zadanie Latarni** oraz **rozegraj minigrę**. Samo otwarcie Zadania/Ekspedycji nie wystarcza. Nagroda za zadanie zapewnia brakujące monety i materiały potrzebne do pierwszej rozbudowy Latarni, wraz z rezerwą jedzenia; nie tworzy zaległej skrzyni czekającej na dostawę. Nominalny kurs kończy się z Ratuszem 2. Końcowe wyrównanie Magazynu bez czekających skrzyń pozostaje obowiązujące.

Nowe nagrody i warunki dotyczą nowego programu. Zapisane starsze programy, identyfikatory zaliczeń i odebrane nagrody pozostają czytelne. Gracz z historią nie otrzymuje drugi raz nagród wskutek zmiany kolejności, powrotu od początku, zapisu, synchronizacji ani migracji.

## Turbo transportu i budowy na początku

| Poziom Ratusza przy zleceniu | Transport wszystkich materiałów | Budowa |
|---|---|---|
| 1, po przydzieleniu 6 tragarzy | **30 s łącznie**, niezależnie od liczby kursów | Ratusz 1→2: **60 s**; inne budynki proporcjonalnie |
| 2 | Ratusz 2→3: **120 s**; pozostałe proporcjonalnie, najwyżej **300 s** | Ratusz 2→3: **300 s**; pozostałe proporcjonalnie |
| 3 i wyżej | Dotychczasowe zasady | Dotychczasowe zasady |

To czas całej dostawy, nie jednego kursu. Rzeczywiste materiały są nadal pobierane i dowożone, a tragarze oraz postęp są widoczni. Nie zaliczamy budowy przez samo wyświetlenie objaśnienia. Istniejące rozpoczęte zlecenia zachowują migawkę ceny/czasów; wczytanie zapisu i naliczanie offline nie podwaja dostawy ani zapłaty.

**Parametry wykonawcze, nie dosłowna decyzja użytkownika:** przyjmujemy krótsze dojście pierwszych sześciu tragarzy (20 s) oraz koszt pierwszego Ratusza 1→2 po 100 monet i każdego z pięciu materiałów. To wcześniej zaproponowane wartości służące wymaganiu „szybko i wystarczy na początek”; wymagają potwierdzenia rzeczywistymi testami nowego kursu. Nie przeceniamy automatycznie innych poziomów, kosztu kolonii ani zakupu mieszkańców. Osobny numer nowego programu lekcji jest sposobem zachowania starych zapisów, nie nową regułą gry.

## Blokada niedostępnych budynków

Budynek niedostępny na bieżącym poziomie nie może otrzymać rozbudowy: zwykłym przyciskiem, kolejką, zakupem premium ani prognozą omijającą regułę. Targ przed Ratuszem 2 i Port przed Ratuszem 4 pokazują wymaganie odblokowania. Odmowa nie zabiera monet ani materiałów i nie tworzy zlecenia. Nie blokujemy działań samouczka potrzebnych do legalnego awansu.

## Ewidencja i odbiór

Nowe karty [HL-CHG-0935](tracking/changes/HL-CHG-0935.md)–[HL-CHG-0950](tracking/changes/HL-CHG-0950.md) zachowują odrębne statusy DEV, CI, PRE-PROD i PROD. Wcześniejsze wdrożenie 0.10.1.0 nie jest dowodem poprawności tego zakresu. Dane fikcyjne i wyniki lokalne nie są potwierdzeniem chmury.

Nowe ręczne przypadki **TC54–TC59** są na [liście do odhaczania](testing/START-HERE.md) i w [interaktywnym raporcie QA](testing/qa-checklist.html). Wszystkie pozostają **NOT RUN**. Historia 53 wcześniejszych przypadków nie jest kasowana; przypadki zależne od starego programu trzeba wykonać na odpowiednim historycznym fixture. Testy automatyczne i własne CI nowego źródła wymagają osobnego, rzeczywistego dowodu. Żaden test dokumentacji nie ustawia ręcznego PASS.
