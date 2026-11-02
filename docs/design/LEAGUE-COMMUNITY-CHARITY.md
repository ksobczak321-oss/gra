# Liga Portów, sojusze i dobroczynność — ustalenia i projekt wykonania

Stan:**2 listopada 2026, DEV 0.12.0.0/v28 w trakcie odbioru**. Kod 0.11/c 7 c 3974 pozostaje ostatnim potwierdzonym PRE-PROD, bez nowej promocji, resetu i PROD. [Wymagania v28](../FRONTEND-V28-REQUIREMENTS.md) mają pierwszeństwo nad wcześniejszymi propozycjami; rzeczywiste wyniki rozdziela [odbiór 0.12](../DEV-0.12.0.0-VALIDATION.md).

## Kod DEV i granice uruchomienia

- [community-service](../../backend/community-service.mjs), [league-rules](../../backend/league-rules.mjs) i nowy [league-season](../../backend/league-season.mjs) obsługują sojusze, skład sezonowy, siedem punktujących dni, dwie konkurencje, playoffy i nagrody. [Panel](../../harborlight-v1-community-ui.js) używa [klienta API](../../harborlight-v1-community-client.js). Kod i testy lokalne nie są dowodem aktywacji usług w GCP.
- Dwa czaty: sojusz i prywatny 1:1; zwykła historia 30 dni, 1000 znaków, 20 wiadomości na 20 s/konto łącznie między pokojami. Aktualne członkostwo jest niezależne od zamrożonego składu ligowego.
- [Księga monet](../../backend/charity-ledger.mjs), [usługa](../../backend/charity-service.mjs) i [panel Pomagam](../../harborlight-v1-charity.js) oddzielają zaufane operacje serwera od jawnej symulacji. Kod obsługuje osobny trwały mock przygotowany dla PRE-PROD; brak nowego deployu. Realny program jest wyłączony: brak umów 2–3 beneficjentów, rzeczywistego finansowania i zaufanej autorytatywnej gospodarki nie tworzy zobowiązania przez kliknięcie.
- Zwykłe wydatki jednego portfela zużywają najpierw niekwalifikowane monety. Nieautorytatywny zapis całego klientowego świata nadal nie dowodzi przychodów brutto; konserwatywnie unieważnia kwalifikację pozostałej części, zachowując nominalne saldo.
- Aktualne uzgodnione wartości: średnia zamrożonego składu i+2 za kolejnego aktywnego, do+8; oba zadania 15–21 wspólnie 19–21 Warszawy; Pomagam+20 punktów/6 h po potwierdzeniu przelewu (w mocku po jawnym testowym potwierdzeniu); minimum 100 monet=10 gr, wielokrotności 100.
- Ręczne przypadki TC0087–0090 pozostają NOT RUN, mimo prób automatycznych. Integracja planszówki online i automatyczna publikacja FB pozostają poza GO.

## Przyjęte przez użytkownika

- Ligę rozliczamy **średnią wyników i premią za współpracę rosnącą wraz z liczbą uczestników sojuszu**, zamiast dawnej sumy trzech najlepszych. Użytkownik przyjął później średnią całego zgłoszonego składu i+2 za kolejną aktywną osobę, maksymalnie+8 przy pięciu osobach.
- Przy Rankingu pojawia się pole/sekcja **Sojusz**: zakładanie, dołączanie, odchodzenie i prawdziwy czat w grze. Gotowe sygnały mogą być dodatkiem, nie zastępują wpisywania wiadomości.
- Program dobroczynny przyjmuje **1000 kwalifikowanych zarobionych monet → 1 zł operatora**, najwyżej raz na osobę w miesiącu i co najmniej 30 dni między operacjami. Zmiana wyspy nie odnawia limitu.
- Przyjęto wcześniej sfinansowaną, globalną pulę bety najwyżej **50 zł miesięcznie**, a później dodatkowo najwyżej **5% rzeczywistej marży poprzedniego miesiąca**. Brak miejsca w puli oznacza brak pobrania monet.
- Potrzebny jest widoczny przycisk programu, serwerowa księga pochodzenia i zużycia monet oraz wykluczenie **wszystkich wpływów handlowych**, także pośredniego zakupu materiałów za kupione monety i ich odsprzedaży.
- Nagrodą ma być rozświetlenie Portu **oraz rzeczywisty bonus szczęścia**. Wycofano rekomendację ograniczenia nagrody wyłącznie do kosmetyki. Późniejsza odpowiedź przyjęła+20 punktów przez 6 h na jednej wyspie po potwierdzeniu przelewu; uprawnienie do odbioru w DEV nie ma dodatkowej siedmiodniowej daty wygaśnięcia.

Nowe GO uruchamia implementację w DEV; nie jest promocją do PRE-PROD ani zleceniem przelewu. Zapisów kont nie resetujemy.

## Kalendarz i udział w lidze

Aktualny kalendarz obejmuje **dni 15–21 miesiąca**, w strefie `Europe/Warsaw`, ze wspólnym oknem **19:00–21:00 dla obu zadań**. Siedem dni nie musi oznaczać poniedziałku–niedzieli. Wcześniejszy podział godzin był prototypem, a nie nadal obowiązującą drugą kolejką. Zmiana czasu letniego/zimowego nie przenosi godzin na stałe UTC — używamy lokalnego czasu Warszawy.

| Dni | Działanie w bieżącym DEV |
|---|---|
|1–7|Kronika, trening i rekrutacja.|
|8–14|Zapisy i deklaracja składu; zamknięcie 14 dnia o 23:59:59 Warszawy.|
|15–21|Siedem punktujących dni, po zadaniu logicznym i zręcznościowym we wspólnym oknie 19–21.|
|22|Dogrywki rozstawienia do najlepszej czwórki, 19–21.|
|23|Półfinały 1–4 i 2–3, 19–21.|
|24|Finał, 19–21.|
|25|Rezerwowe dogrywki, 19–21; nierozstrzygnięte pozostają oczekujące.|
|Pozostałe dni|Odbiór rozliczonych nagród, trening i zwykły rozwój wyspy.|

Kalendarz playoffów jest jawnym **parametrem DEV do odbioru**, a nie wcześniejszą decyzją użytkownika o konkretnych datach. Zgłoszony sojusz liczy 1–5 kont; solista zakłada jednoosobowy. Jedno konto ma jeden sezonowy slot, niezależnie od liczby wysp. Wszystkie 7 dni punktuje również przy jednym zespole. Przy 2 zespołach jest bezpośredni finał, przy 3 wolny los i półfinał; pełna czwórka gra 1–4/2–3. Jeden zespół dostaje nagrody udziału/kompletu, bez fikcyjnego pucharu.

Dzienna konfrontacja ma 3 punkty za wygraną, 1 za remis, 0 za porażkę. Wyniki z różnych liczebnie grup nie są porównywane naiwnie samą liczbą meczów. Na granicy kwalifikacji i w playoffach pełna równość wymaga dodatkowej próby; nie rozstrzygamy jej zakupem, identyfikatorem lub przypadkowym kapitanem. Brak rozstrzygnięcia po rezerwie nie daje wymyślonego zwycięzcy. **Nie ma spadków, sezonowych kar ani zabierania zasobów wyspy.** Ewentualna awaria operatora wymaga wspólnego rozstrzygnięcia, nie automatycznych kar.

## Średnia i premia współpracy — przyjęta formuła

Dla każdego dnia serwer używa składu sezonowego zamrożonego przed pierwszą kolejką:

- `N`: liczba kont zapisanych w składzie na sezon, 1–5; nie bieżąca liczba osób na czacie.
- `s_i`: średnia lepszego wyniku zadania logicznego i lepszego wyniku zręcznościowego, każde z dwóch prób; brakujące zadanie=0, zakres wyniku dnia 0–100. Brak próby oznacza 0. Samo wyjście z sojuszu nie blokuje dalszych prób dla zamrożonego składu.
- `K`: liczba tych zapisanych osób, które uzyskały co najmniej **16 punktów**, liczone z wyniku dnia, np. po jednym celu w każdym z dwóch zadań. To definicja udziału w proponowanym wyzwaniu ligowym, nie zamiennik ogólnej aktywności sesji, ruchu myszy lub logowania.
- `średnia = suma(s_i) / N`, `premia = 2 × max(0, K−1)`, najwyżej **8 punktów**.
- **`wynik meczu = średnia + premia`**, obliczony bez zaokrąglania części i dopiero na końcu zaokrąglony do dwóch miejsc po przecinku. Zakres 0–108. Nie obcinamy go do 100, bo ukryłoby to różnicę między najlepszymi pełnymi sojuszami.

| Przykład | Średnia | Premia | Wynik |
|---|---:|---:|---:|
| Solista: 95 | 95 | 0 | **95** |
| Pięć osób po 80 | 80 | 8 | **88** |
| Trzy osoby: 96, 94, 92 | 94 | 4 | **98** |
| Dopisane bierne konta: 95, 0, 0, 0, 0 | 19 | 0 | **19** |
| Pięć osób po 100 | 100 | 8 | **108** |

Solista może więc pokonać przeciętny kompletny sojusz, a większa **aktywnie współpracująca** załoga ma premię. Bierna liczba kont nie wystarcza do jej uzyskania i obniża średnią. Bonus ma być zrozumiałą zachętą do współpracy, nie dowodem, że za kontami siedzą różni ludzie; unikalność konta i ochronę przed botami trzeba sprawdzać osobno.

Dwa pojedyncze słabe wyniki nie mogą zniknąć z mianownika przez usunięcie ich autorów. Nie wybieramy po meczu samych najlepszych członków ani średniej tylko obecnych. Każdy gracz nadal ma indywidualny zapis udziału niezależny od sukcesu zespołu.

## Sojusz przy Rankingu — ekran DEV i cykl członkostwa

Proponowany układ:**Ranking → Sojusz**, zawsze widoczne pole z nazwą własnego sojuszu albo przyciskiem „Załóż lub znajdź sojusz”. Wewnątrz: członkowie, zaproszenia, tabela ligi, czat oraz „Opuść sojusz”. Nowe GO obejmuje ten ekran DEV; jego obecność nie dowodzi aktywacji API GCP.

| Działanie | Proponowane zachowanie |
|---|---|
| Założenie | Nazwa, krótki opis i proporzec; bez opłaty, założyciel staje się kapitanem. Nazwa jest publiczną nazwą grupy, nie e-mailem konta. |
| Dołączenie | Wyszukiwarka i prośba albo prywatny kod/link zaproszenia. Użytkownik sam potwierdza; brak automatycznych zaproszeń FB. Jedno konto należy do jednego sojuszu naraz. |
| Kapitan | Akceptuje zgłoszenia, zaprasza, przekazuje rolę i zarządza bieżącym członkostwem. Nie przejmuje wysp, zakupów ani punktów innych osób. |
| Odejście | Możliwe od razu, także podczas sezonu. Odbiera dostęp do czatu i uprawnień grupy; nie usuwa historycznego wyniku. Gdy wychodzi kapitan, może przekazać rolę; przy braku wyboru propozycją jest najstarszy stażem pozostały członek. |
| Usunięcie przez kapitana | Kończy bieżące członkostwo i dostęp do czatu. Nie usuwa slotu ani dawnych wyników z zamrożonego składu sezonu. |
| Nowy członek w trakcie ligi | Może rozmawiać i trenować po przyjęciu, ale do składu punktującego trafia dopiero od kolejnego sezonu. |
| Zmiana klubu w sezonie | Dołączenie społecznościowe jest dozwolone, ale konto nie punktuje dla nowej drużyny w tym samym sezonie. Nie przenosi swoich punktów między zespołami. |
| Rozwiązanie sojuszu | Pusty sojusz znika z aktywnego wyszukiwania; sezonowa tabela zachowuje historyczny identyfikator, nazwę i wyniki do zakończenia rozliczenia. |

**Członkostwo społeczne i skład sezonowy są odrębne.** Po odejściu lub usunięciu slot, mianownik i dotychczasowy wynik pozostają. Uczestnik może dokończyć sezon i rozpoczęte próby dla zgłoszonej drużyny, lecz nie punktować dla drugiej. Dostęp do czatu zmienia się natychmiast zgodnie z bieżącym członkostwem. Nie blokujemy opuszczenia grupy do końca miesiąca i nie pozwalamy usuwać słabszych wyników z sezonowej średniej.

## Czat sojuszu w grze

Użytkownik wybrał **prawdziwy tekstowy czat**. Późniejsza dyspozycja rozszerzyła zakres do **dwóch rodzajów rozmów: kanał własnego sojuszu oraz prywatne rozmowy 1:1 między graczami**, również z różnych sojuszy. Nie tworzymy globalnego publicznego pokoju. Serwer sprawdza uczestnictwo rozmowy prywatnej przy każdym odczycie i wysłaniu, a blokada jest egzekwowana także dla starej otwartej karty.

- Serwer sprawdza członkostwo przy każdym odczycie, wysłaniu i wznowieniu kanału. Po odejściu stare połączenie traci dostęp; sam ukryty przycisk nie jest zabezpieczeniem. Nie można pobrać wiadomości obcej drużyny po podaniu jej ID.
- Przyjęte limity: wiadomości do 1000 znaków, najwyżej 20 w 20 sekund na konto łącznie między pokojami, bez załączników. Zwykłe wiadomości wygasają po 30 dniach. Fragment celowo zgłoszony do sprawdzenia może pozostać do 90 dni z ograniczonym dostępem operatora; te wartości wymagają zatwierdzenia w polityce danych.
- Widoczny pseudonim i nazwa wyspy, bez adresów e-mail, UID Firebase, danych płatniczych i prywatnych sald. Gracz może wyciszyć rozmowę, zablokować autora i zgłosić konkretną wiadomość. Kapitan nie dostaje dostępu do sekretów kont.
- Po zaakceptowanym wysłaniu pojawia się potwierdzenie. Brak sieci nie udaje dostarczonej wiadomości; ponowienie z tym samym ID nie powiela wpisu. Tekst jest renderowany jako tekst, bez uruchamiania HTML lub skryptów.
- Skróty „zagram rano”, „potrzebuję zastępstwa” i pinezka trasy są dodatkiem do zwykłego wpisywania, a nie jedyną formą rozmowy. Nie wysyłamy automatycznych wiadomości ani postów poza grę.

## Siedem zadań logicznych — bieżący prototyp DEV

Każde zadanie jest osobną, równą dla wszystkich **miniaturową symulacją**, nie operacją na prawdziwej wyspie. Nie zużywa kupionych materiałów, nie korzysta z płatnej pojemności statku i nie skraca prawdziwego rejsu. WDEV każdy dzień zawiera **dwa odrębne zadania**. Logiczne ma dwie próby do 180 s, zręcznościowe — dwie próby do 45 s; **oba są dostępne w tym samym oknie 19:00–21:00 Warszawy** i gracz wybiera kolejność. Lepszy wynik każdego zadania liczy się do średniej dnia, a niezagrane zadanie daje 0. Trening jest dostępny o dowolnej porze i nie punktuje w prawdziwej lidze. Dawne dowolne godziny 06:00–23:00 nie obowiązują w tym prototypie. **Koniec okna:** faktyczny zegar próby kończy się wcześniej z dwóch momentów: jej własnego limitu lub zamknięcia slotu. Po zamknięciu nie można wykonać nowej akcji. Wolno natomiast zapisać wyłącznie wynik już przyjętych akcji do zamknięcia rozliczenia właściwej fazy sezonu; to rozliczenie, nie dodatkowy czas na grę. Nie można dokupić czasu, prób ani reklamy poprawiającej wynik.

W każdym zadaniu jest **pięć jednoznacznych celów**, każdy zaliczany najwyżej raz. W logicznym punktacja to `16 × c`, gdzie c jest liczbą zaliczonych celów, plus przy wszystkich pięciu `20 × (180−t)/180`, gdzie t to serwerowy czas osiągnięcia kompletu pięciu celów w sekundach ograniczony do 0–180, a nie chwila późniejszego kliknięcia zapisu wyniku. Wynik zaokrąglamy na końcu do dwóch miejsc: maksymalnie 100; pełne ukończenie na granicy czasu daje 80; cztery cele dają 64. Błędne ruchy nie zaliczają celu i zużywają czas, nie mogą dawać dodatnich punktów. Serwer weryfikuje legalne przejścia i wynik; nie ufa polu `verified` z przeglądarki.

| Dzień / zadanie | Co robi gracz | Pięć celów i równe warunki |
|---|---|---|
| **1. Ostatni konwój** | Pakuje i przewozi pięć oznaczonych partii po 20 sztuk do dwóch wskazanych nabrzeży A/B; łódź mieści 40. | Każda dostarczona właściwa partia daje jeden cel. Żadnej nie wolno skopiować ani zostawić równocześnie w dwóch miejscach. |
| **2. Fabryka bez zatoru** | Dla pięciu zamówień wybiera poprawny produkt, materiał wejściowy i ilość w recepturze zboże→żywność lub drewno→deski. Prototyp używa jawnych wariantów decyzji, bez osobnego zarządzania obsadą. | Każde poprawnie zbilansowane zamówienie to cel. Wzory 2:1 i wydajności są pokazane; zakup premii nie jest opcją. |
| **3. Mapa po sztormie** | Dla pięciu konwojów wybiera spośród pokazanych wariantów trasę Port→Magazyn→Kamieniołom→Latarnia, unikając niedopuszczalnego przejścia. Rozbudowana sieć sześciu węzłów była pierwotną koncepcją, a nie aktualnym edytorem mapy. | Jeden cel za konwój po legalnej drodze do wskazanego miejsca. Nie wystarcza samo narysowanie kreski przez przeszkodę. |
| **4. Miasto w drodze** | Przenosi pięć grup po dwie osoby z matki mającej 22 ludzi do dwóch schronień po sześć miejsc; łódź mieści cztery. | Cel za każdą legalnie przyjętą grupę. Na matce pozostaje minimum 12, schronienia nie mogą się przepełnić. To skrócona plansza zadania, nie rzeczywisty 30-minutowy transport. |
| **5. Rynek kapitana** | Porównuje pięć zestawów ofert na potrzebne ilości towarów i wybiera najtańsze legalne zakupy. | Cel za każdą poprawną decyzję ilość+cena. Limit to pokazana bazowa cena NPC; tani zakup i legalna odsprzedaż nie są oszustwem. |
| **6. Sieć sygnałów** | Dla pięciu punktów wybiera poprawną ścieżkę sygnału Latarnia→A→C→punkt, odrzucając uszkodzoną trasę i połączenie bez Latarni. Przydział osobnych żetonów łączników pozostaje przyszłą rozbudową. | Cel za każdy punkt, do którego istnieje legalna ciągła ścieżka. Wszystkie konta mają te same łączniki i ograniczenia. |
| **7. Rejs mistrzów** | Rozwiązuje pięć decyzji łączących bezpieczną trasę, recepturę 2:1 i dopuszczalny koszt; komplet warunków musi zgadzać się w jednym wariancie. | Cel za całe zamówienie; częściowa produkcja bez dostawy nie wystarcza. Te same warianty wejścia dla całej kolejki. |

### Drugie zadanie każdego dnia: zręczność

| Dzień | Wariant DEV | Co jest mierzone |
|---|---|---|
|1|Łowcy gwiazd|Trafienia poruszających się złotych gwiazd z pominięciem pułapek.|
|2|Serce Portu|Trafienia zielonych serc; czerwone usuwają wcześniejsze trafienie.|
|3|Puls Latarni|Kliknięcia tylko w dozwolonym zielonym impulsie.|
|4|Ruchome nabrzeża|Przechwycenia skrzyń w wyróżnionym oknie dostawy.|
|5|Kod radiowy|Powtarzana kolejność gwiazda→serce→romb.|
|6|Pirackie pułapki|Skarby z unikaniem czaszek, które usuwają dwa wcześniejsze trafienia.|
|7|Konstelacja załogi|Czytelne kolejne cele świetlne według instrukcji pokazywanej przy próbie.|

W zręcznościowym każde cztery aktualnie zachowane legalne trafienia zaliczają jeden z pięciu celów. Punktacja to 16 za cel oraz 20 za komplet pięciu, pomniejszone o 4 za błąd i ograniczone od dołu do 0; pułap 100. Złapanie pułapki usuwa odpowiednio jedno lub dwa wcześniejsze trafienia i aktualizuje liczbę celów. **Ten wariant nie ma premii za pozostały czas** — obiekty pojawiają się według tego samego zegara dla wszystkich, więc taka premia czyniłaby 100 nieosiągalnym. Serwer odtwarza pozycję/czas celu i legalność akcji, nie przyjmuje klienckiego pola wyniku. Wyjście z sojuszu nie usuwa zamrożonego slotu sezonowego. Punkty stołowe nie biorą udziału w lidze.

Parametry, plansze i treść zadań są do prototypu i testu trudności. W obrębie jednej kolejki wszystkie konta dostają tę samą wersję/ziarno oraz limity; kolejka kolejnego sezonu może mieć nową wersję. Dwie próby pozwalają nauczyć się zadania wszystkim na tych samych zasadach. Podpowiedzi drużyny na czacie są legalne, ale serwer nie przekazuje gotowego wyniku ani dodatkowego czasu. Po zakończeniu próby harmonogram zwykłych reklam/minigier wraca do bezpiecznego momentu; nie zasłania trwającego wyzwania.

## Nagrody DEV i późniejsze rozwinięcia

| Warstwa | Konfiguracja bieżącego DEV |
|---|---|
| Udział w lidze |25 monet oraz zapis udziału.|
| Udział we wszystkich 14 konkurencjach |Dodatkowe 75 monet.|
| Najlepsza czwórka |Dodatkowe 150 monet.|
| Mistrz po finale/dogrywce |Dodatkowe 500 monet, puchar i uprawnienie kosmetyczne.|

Kwoty 25/75/150/500 są **parametrami DEV**, nie wcześniejszymi liczbowymi decyzjami. Warstwy sumują się: mistrz z kompletem może otrzymać 750 monet. Każda nagroda jest przypisana raz do konta i sezonu; liczba wysp jej nie mnoży. Po przegranej nie ma kary, spadku lub odbierania zwykłego majątku. Nierozstrzygnięty mistrz nie dostaje pucharu do czasu wyniku.

Zachowane dawne sezony mają własne rozliczenia i kosmetyczne warunki; nie wypłacamy im ponownie nowych kwot. Nowa księga nagród sprawdza identyfikatory i ponowienia. Nagrody ligi nie są monetami kwalifikowanymi do Pomagam. Trwały wpis pucharu/uprawnienia nie oznacza wykonanej grafiki proporca na mapie ani uruchomienia rzeczywistego sezonu w GCP.

## Społeczność poza meczem

Kronika sojuszu, wspólny proporzec, możliwość przypięcia planu rejsu i głosowanie nad trasą tworzą powód do powrotu także po przegranym dniu. Krótka historia rozbitka albo statku sezonu może zmienić wygląd i opis zadania, ale nie warunki punktowe rywali. Wspólne rozświetlenie Portu Dobroczynności pokazuje cel i potwierdzone przelewy; nie tworzy rankingu najbogatszych ani automatycznych postów na Facebooku.

## Dlaczego nie wolno obiecać nieograniczonego „1000 monet = 1 zł”

Aktualny kod nalicza podstawowo **1 monetę za godzinę rzeczywiście przybyłego, przypisanego pracownika**. Aktywność mnoży ten dochód przez 2, zwykły okres przez 1, a nieobecność po 48 godzinach przez 0, 5. Osobny aktywny efekt Kaplicy może podwoić podatek. Przy codziennym powrocie nie występuje kara za ciągłą nieobecność ponad 48 godzin.

Jawne założenia poniższego przykładu: 30 dni, stała obsada, efektywne 2 godziny aktywnego mnożnika na dobę i 22 godziny zwykłe, bez dodatkowego mnożnika Kaplicy. To model emisji, nie prognoza zachowania graczy. Nie obejmuje monet z zadań, ekspedycji, samouczka, wydarzeń i innych nagród; rzeczywista emisja może być większa.

`monety/osobę/miesiąc = liczba pracowników × 30 × (2 h × 2 + 22 h × 1) = 780 × pracownicy`

| Stała obsada jednego konta | Monety w miesiącu | Nieograniczone zobowiązanie przy 1000 monet = 1 zł |
|---|---:|---:|
| 12 pracujących | 9360 | 9, 36 zł na konto |
| 48 pracujących | 37 440 | 37, 44 zł na konto |
| 2400 pracujących, rozwinięta wyspa | 1 872 000 | 1872 zł na konto |
| 4800 pracujących łącznie na dwóch rozwiniętych wyspach | 3 744 000 | 3744 zł na konto |

Kwoty w tabeli są proporcjonalnym ekwiwalentem całej emisji monet. Aktualne operacje mają krok 100 monet=10 gr; 9360 monet odpowiada 9, 36 zł w samym modelu emisji. Limit jednej operacji na miesiąc/30 dni i globalna pula ograniczają rzeczywistą wpłatę, więc nie oznacza to dziewięciu dostępnych operacji. Przykłady 1000 monet→1 zł w tabelach są jednostką porównania, a nie aktualnym minimum. Przy zachowaniu reszt w kolejnych miesiącach proporcjonalny ekwiwalent obrazuje długoterminowy koszt; nie jest dokładną liczbą wpłat jednego miesiąca od pustego salda.

Teoretyczne 2400 osób wynika z limitu Ratusza 100; nie oznacza natychmiast dostępnej obsady. Gdy efekt podatkowy Kaplicy działa przez cały rozpatrywany okres, wynik modelu byłby jeszcze dwukrotnie większy. Do realnego kosztu nie wystarczy znać liczbę graczy, trzeba także ograniczyć kwotę finansowaną przez operatora.

| Kwalifikowane konta w miesiącu | Bez ograniczenia, po 12 pracujących | Bez ograniczenia, po 48 pracujących | Historyczny wariant jednej wpłaty 1000 monet/konto/miesiąc | **Z przyjętą pulą globalną najwyżej 50 zł** |
|---:|---:|---:|---:|---:|
| 100 | 936 zł | 3744 zł | maks. 100 zł | **maks. 50 zł** |
| 500 | 4680 zł | 18 720 zł | maks. 500 zł | **maks. 50 zł** |
| 1000 | 9360 zł | 37 440 zł | maks. 1000 zł | **maks. 50 zł** |

Kolumna historycznego wariantu 1000 monet jest przykładem porównawczym, a nie nowym limitem kwoty operacji. Aktualne minimum i krok wynoszą 100 monet. W tej tabeli 100/500/1000 to **różne, kwalifikowane konta uczestniczące w miesiącu**, a nie gracze jednocześnie. Ustalona wcześniej jednostka skalowania infrastruktury to równocześni gracze; 100 CCU może oznaczać znacznie więcej niż 100 kont w miesiącu. Globalna pula chroni koszt niezależnie od tej różnicy.

## Dobroczynność: przyjęte limity i przycisk

| Element | Przyjęte ograniczenie / otwarty szczegół |
|---|---|
| Przelicznik | **1000 kwalifikowanych monet→1 zł**, minimum 100 monet=10 gr i krok 100 monet, z puli operatora. Brak wypłaty dla gracza i brak wymiany jego portfela na gotówkę. |
| Częstotliwość | Najwyżej raz na osobę w miesiącu Warszawy oraz co najmniej 30 dni od poprzedniej zatwierdzonej operacji. Równocześnie oba warunki; zmiana wyspy ich nie odnawia. |
| Pula startowa | Przyjęta beta: najwyżej **50 zł globalnie w miesiącu**, przed aktywacją faktycznie wydzielone. Akceptacja projektu nie oznacza, że środki już odłożono lub przelano. |
| Dalsze miesiące | `min(50 zł, 5% faktycznej marży poprzedniego miesiąca, faktycznie wydzielone środki)`, zaokrąglone w dół do pełnych złotych. Brak marży po pilotażu oznacza pulę 0. |
| Brak puli | Brak odjęcia monet i komunikat „Pula tego miesiąca jest wykorzystana”. Lista zainteresowania nie pobiera niczego automatycznie. |
| Kwalifikacja | Przyjęte: konto starsze niż 14 dni, pięć różnych aktywnych dni Warszawy, ukończony Ratusz matki co najmniej 4. Konta techniczne/testowe i symulowane wpływy są wykluczone. |
| Cel | Operator planuje umowy z 2–3 rzeczywistymi beneficjentami; konkretny cel kampanii i odbiorcy do wskazania przed aktywacją; brak przelewów do graczy. |
| Przelew | Nadal propozycja: zbiorczo do 7. dnia następnego miesiąca, potem potwierdzenie. Przekroczenie terminu nie może zostać ukryte jako sukces. |
| Niewykorzystana pula | Bez automatycznego przenoszenia i powiększania kolejnego miesiąca. Nowy limit ma osobne rzeczywiste finansowanie. |

Widoczny przycisk **Pomagam** prowadzi do osobnego panelu z celem, miesiącem, pulą i kwalifikowanym saldem. Użytkownik wybiera kwotę od 100 monet, w krokach 100. Przed potwierdzeniem widzi wydatek monet oraz przeliczenie na grosze/złote z puli operatora; nie płaci Paynow i nie podaje rachunku.

Rzeczywisty program rozróżnia rezerwację od otrzymania przelewu przez organizację. Do uruchomienia potrzebuje zaufanej księgi, wyodrębnionego funduszu, celu i beneficjentów. W bieżącym kodzie **jawny trwały mock przygotowany dla PRE-PROD** zapisuje testowe potwierdzenie oddzielnie od realnej ewidencji, a następnie pozwala odebrać fanfary, światło i+20 punktów/6 h. Nie jest to realny przelew, nowa publikacja ani dowód prawdziwej pomocy.

Przy 50 zł globalnego funduszu można rozliczyć do 500 minimalnych operacji po 10 gr albo mniej większych wpłat, przy zachowaniu limitu jednego konta. Nie gwarantujemy każdemu indywidualnego złotego. Beneficjentów i termin realnych zbiorczych przelewów ustali operator. Brak udziału nie blokuje zwykłej gry; szczęście jest korzyścią gospodarczą, więc nie twierdzimy, że program ma wyłącznie efekt kosmetyczny.

## Serwerowe pochodzenie monet — kontrakt i granica aktualnego DEV

Obecny portfel jest wyliczany przez klienta. Sama liczba `coins`, historia `statistics.taxCollected` lub deklaracja `earned: true` nie są podstawą zobowiązania w złotych. Użytkownik zaakceptował **serwerowy rejestr źródeł i wydawania monet**, z jednokrotnym rozliczeniem; kod ewidencji istnieje, lecz nie oznacza jeszcze przeniesienia całej gospodarki na serwer lub aktywacji programu. Istniejący serwer escrow handlu nie czyni całej gospodarki zaufaną.

| Źródło | Kwalifikacja |
|---|---|
| Podatek podstawowy z zaufanego rozliczenia serwera | Kwalifikuje się wyłącznie zaufane zdarzenie z zatwierdzonej białej listy. |
| Zweryfikowane bezpłatne zadanie | Kwalifikuje się raz na zaufane zdarzenie. |
| Zweryfikowana wygrana ekspedycji | Kwalifikuje się raz na zaufane zdarzenie; sama deklaracja klienta nie wystarcza. |
| Lojalność, błogosławieństwa, reklamy, polecenia, kupione monety, płatny bonus, prezent operatora, test | Niekwalifikowane. |
| **Wszelkie wpływy handlowe**: sprzedaż NPC/Pv P, wymiana, transfer, prezent między kontami | **Niekwalifikowane niezależnie od pochodzenia towaru.** To przyjęte wykluczenie, nie otwarty wariant. |
| Polecenia, publikacje, nagrody ligi/planszówki, nieznany zapis historyczny | Domyślnie niekwalifikowane; nie odtwarzamy uprawnienia z samego dawnego salda. Punkty zadaniowe z planszówki nie są monetami. |

Wyłączenie wszystkich wpływów handlowych zamyka ścieżkę **kupione monety → materiały → sprzedaż → rzekomo zarobione monety** bez znakowania każdej deski. Legalny zysk z taniego zakupu Pv P i sprzedaży NPC pozostaje dozwolony, ale nie kwalifikuje się do programu. Jeśli wpływy handlowe miałyby się kwalifikować później, potrzebny jest nowy projekt śledzący pochodzenie przez produkcję i konta pośrednie; ostatnia operacja inna niż Paynow nie dowodzi zarobku kwalifikowanego.

Każdy wydatek zmniejsza konkretne partie salda. Zwykłe wydatki zużywają **najpierw niekwalifikowane monety**, potem kwalifikowane; wszystkie mają tę samą siłę nabywczą. Przykład:300 podatków+1000 kupionych, po wydaniu 1200 zostaje 100 kwalifikowanych. Nie można przekazać historycznego licznika już wydanych monet; zwrot zachowuje faktycznie pierwotne pochodzenie.

**Aktualna granica wdrożenia:** zaufane transakcje księgi zachowują ewidencję partii i zużywają niekwalifikowane monety w pierwszej kolejności. Nieautorytatywny zapis pełnej wyspy z klienta nie udowadnia jednak jej obrotów brutto — nawet przy niezmienionym saldzie. Taki zapis bez jawnego zaufanego autora księgi zmienia całą pozostałą kwalifikowaną część na niekwalifikowaną, zachowując faktyczne monety. Ta konserwatywna blokada zabezpiecza wyłączony program; nie oznacza pełnego przeniesienia gospodarki na serwer.

Jedna transakcja serwera weryfikuje wybraną wielokrotność 100 kwalifikowanych monet, oba limity osoby, pulę, cel i identyfikator żądania. Dopiero wtedy jednocześnie rezerwuje właściwą kwotę w groszach i umarza właściwe monety. Klient nie podaje wiążących `fundAvailable`, `verified` ani limitów. Utrata odpowiedzi nie tworzy drugiej rezerwacji; wyspy jednego konta mają wspólną księgę i limit. Maksymalny budżet jest kontrolowany transakcyjnie, także przy równoległych zgłoszeniach wielu osób.

Rozróżniamy **rezerwację → rzeczywisty przelew → publikację potwierdzenia → odbiór bonusu**. Gdy przelew nie nastąpi, zwrot monet zachowuje pochodzenie i zamyka rezerwację dokładnie raz. Nie wypłaca bonusu ani drugiego zwrotu; uwolnienie puli również jest idempotentne. Ponowne przyjęcie do anulowanej kampanii wymaga jawnych zasad operatora, a nie automatycznego odnowienia limitu przez klienta.

## Realny bonus szczęścia i rozświetlenie Portu

**Przyjęte wymaganie:** dodajemy do projektu prawdziwe szczęście oraz rozświetlenie Portu. Poprzednia rekomendacja „tylko dekoracja” jest zastąpiona. Prawdziwe szczęście może zwiększyć populację, a później dochód z podatków. Limity pieniędzy ograniczają zobowiązanie operatora, ale nie są dowodem idealnego balansu lub rentowności.

**Przyjęte parametry:** **+20 punktów szczęścia na 6 godzin**, na jednej wskazanej własnej wyspie, jako czasowy efekt uwzględniany przez reguły szczęścia mieszkańców. Nie omija osobnego okresu osiedlania ani pierwszeństwa wymuszonego 100 punktów. Najwyżej jeden taki odbiór na konto za kampanię i dodatkowo 30 dni od poprzedniego odbioru; liczba wysp nie mnoży efektu. Nowi mieszkańcy nie powodują wielokrotnego przyznania tej samej premii. Obowiązuje normalny limit 100 punktów, pierwszeństwo Latarni oraz brak kumulowania i przedłużania aktywnego bonusu dobroczynnego. To nie jest mnożnik produkcji ani podatku, ale jego pośredni efekt populacyjny pozostaje rzeczywisty.

**Przyjęty moment w realnym programie:** dopiero po potwierdzonym rzeczywistym przelewie. W jawnym mocku ten krok jest testowym potwierdzeniem, bez przelewu bankowego. Od chwili rezerwacji gracz widzi kartę **„Nagroda oczekuje na przelew: +20 punktów przez 6 h”**, lecz jeszcze nic nie naliczamy. Po publikacji potwierdzenia dostaje **„Odbierz Światło Wdzięczności”**; sześciogodzinny zegar rusza po zatwierdzeniu odbioru przez serwer. +20 punktów/6 h/po potwierdzeniu są przyjęte. Siedmiodniowe okno odbioru było wcześniejszą propozycją, ale **nie jest regułą aktualnego DEV**: potwierdzone, niewykorzystane uprawnienie nie wygasa po siedmiu dniach. Przed przekazaniem monet trzeba pokazać, że nagroda nie zacznie działać natychmiast.

Serwer zapisuje konkretną kampanię, przelew, konto, instancję/generację wyspy, `rewardClaimId` i czas końca efektu. Podwójny klik, utrata odpowiedzi, zmiana aktywnej wyspy albo ponowny odczyt starej odznaki nie odnawiają nagrody. Jeżeli poprzedni efekt lub serwerowy limit 30 dni jeszcze trwa, odbiór niczego nie pobiera; można ponowić go po uzyskaniu gotowości, bez dodatkowego siedmiodniowego terminu. Niedostępna/usunięta wyspa nie odbiera ani nie kasuje uprawnienia automatycznie: przed odbiorem trzeba wskazać legalny istniejący świat, a efekt przyznaje się tylko tam. Reset po przyznaniu nie odtwarza raz zużytego uprawnienia.

W aktualnym DEV osobisty Port rozświetla się wraz z odebranym sześciogodzinnym efektem i gaśnie po jego końcu. Historia potwierdzonej operacji pozostaje, lecz nie jest kolejnym kuponem. Wspólny mural i publiczna prezentacja kampanii to propozycje dalszej oprawy; nie opisujemy ich jako istniejącego ekranu. Sama rezerwacja nie daje światła ani szczęścia.

## Rentowność: obliczenia bez zgadywania reklam

Rzeczywisty koszt GCP za bieżące 24 godziny nie jest dostępny w tej sesji. Oznaczamy go jako parametr **G**. Kwoty 50 i 100 zł poniżej są wyłącznie scenariuszami miesięcznymi, nie odczytem rozliczeń. Nie wykorzystujemy dawnego raportu jako dowodu obecnego kosztu. Budżet alertowy nie jest kosztem ani twardym limitem faktury.

Obecne reklamy i Paynow są symulacjami. Zasymulowane 19, 99 zł nie jest przychodem, a obejrzenie atrapy reklamy nie generuje rzeczywistej stawki reklamowej. Nie znamy kontraktu reklamowego, fill rate, potrąceń, zwrotów ani rzeczywistej marży płatności; nie zakładamy konkretnego e CPM.

### Dwa jawne scenariusze progu kosztów

Założenia wyłącznie do obliczenia: GCP **G = 50 albo 100 zł/miesiąc**, inne koszty **O = 50 zł/miesiąc**, pilotażowy fundusz **B = 50 zł**. „Inne koszty” są przyjętą rezerwą modelu, nie ofertą licencji muzycznej lub księgowości. Model nie wycenia pracy właściciela i wymaga dodania jej, jeśli ma oznaczać pełną rentowność firmy.

`wymagany wkład netto po opłatach, podatkach, zwrotach i prowizjach = G + O + B`

| Kwalifikowane aktywne konta w miesiącu | Przy G = 50 zł: razem 150 zł | Przy G = 100 zł: razem 200 zł |
|---:|---:|---:|
| 100 | 1, 50 zł wkładu netto/konto | 2, 00 zł/konto |
| 500 | 0, 30 zł/konto | 0, 40 zł/konto |
| 1000 | 0, 15 zł/konto | 0, 20 zł/konto |

To próg pokrycia przyjętych kosztów, nie prognoza przychodu z każdego gracza. Jeżeli jeden faktycznie płacący klient pozostawia po wszystkich potrąceniach **10 zł wkładu netto** — założenie, nie obecna stawka Paynow — potrzeba odpowiednio 15 lub 20 takich klientów miesięcznie. Dla 100 kont oznacza to 15–20% płacących, dla 500: 3–4%, dla 1000: 1, 5–2%, przy zerowym wkładzie reklamowym.

Jeżeli później potwierdzony wkład z reklam wynosi `A`, a płatności dają `P`, wynik tej prostej kalkulacji to `A + P − G − O − B`. Liczba odsłon sama w sobie nie jest przychodem. Kwoty netto należy brać z rzeczywiście rozliczonych raportów dostawców, z odpowiednią rezerwą na zwroty i rozliczenia, nie z deklaracji klienta gry.

### Fundusz utrzymywany z marży poprzedniego miesiąca

Użytkownik przyjął następującą regułę po jednorazowej, świadomie sfinansowanej promocji startowej:

`M = max(0, rzeczywiście rozliczone wpływy − rzeczywiste prowizje/podatki/zwroty − GCP − inne koszty − uzgodniona rezerwa)`

`B następnego miesiąca = min(50 zł, 5% × M poprzedniego miesiąca, środki faktycznie wydzielone na ten cel)`, w dół do pełnych złotych.

| Potwierdzona marża M poprzedniego miesiąca | Najwyższa kolejna pula przy limicie 50 zł | Maksymalna liczba operacji 1000 monet → 1 zł |
|---:|---:|---:|
| 0 zł | 0 zł | 0 |
| 100 zł | 5 zł | 5 |
| 400 zł | 20 zł | 20 |
| 1000 zł | 50 zł | 50 |
| 3000 zł | 50 zł | 50 |

Przy tej polityce pełna stała pula 50 zł wymaga co najmniej 1000 zł potwierdzonej marży przed jej wydzieleniem. To konserwatywna reguła pozostawiająca 95% tej marży na biznes, a nie matematyczne twierdzenie, że 50 zł darowizny zawsze wymaga 1000 zł zysku. Większa pula, np. 200 zł przy rosnącej społeczności, wymaga nowej decyzji, rzeczywistych danych i odpowiedniego zabezpieczenia — nie włącza się automatycznie po osiągnięciu 500 lub 1000 graczy.

## Multikonta, koszt obsługi i warunki uruchomienia

- Jeden uczestnik ma jedno kwalifikowane konto; inny e-mail i Firebase UID nie dowodzą innej osoby. Staż i dni aktywności ograniczają proste farmy, ale nie zapewniają odporności na boty. Wspólne domowe IP nie jest samo w sobie podstawą blokady wszystkich domowników.
- Serwer egzekwuje skład, terminy, próby, wynik, budżet i jednokrotny odbiór. Klientowy zegar i zapis całej wyspy nie są dowodem ukończenia wyzwania lub zarobienia monet. Sygnały nadużyć wymagają rzeczywistego sprawdzenia, bez wstrzymywania zwykłej wyspy za sporny medal.
- Proponowany budżet około 50 podstawowych żądań ligowych na konto i sezon obejmuje 28 rozpoczęć/zakończeń 14 prób i ograniczone odczyty tabeli; **nie obejmuje nowego czatu**, ponowień i moderacji. Czat wymaga osobnego pomiaru odczytów/wysyłki i limitów kosztowych, bez odpytywania pełnej historii co sekundę.
- Przykładowy limit dowodu próby 64 Ki B daje 896 Ki B na konto za 14 prób, około 875 Mi B przy 1000 kont, przed narzutem i replikacją. To projektowy limit do zmierzenia, nie koszt aktualnego GCP.
- Kampania pokazuje cel, organizację, miesiąc, liczbę operacji, kwotę zarezerwowaną i rzeczywiście przelaną, datę i potwierdzenie bez niepotrzebnych prywatnych danych. Nie publikuje e-maili, sald lub płatności graczy; nie wysyła automatycznych postów FB.
- Przed prawdziwym programem potrzebne są dane operatora zamiast „Lorem ipsum”, uzgodnione zasady działalności i księgowania, odbiorca, publiczne reguły, zabezpieczony fundusz oraz zaufany serwer. Dokumentacja i symulacja Paynow nie spełniają tych warunków. Nie zakładamy konkretnego odliczenia podatkowego wpłaty.

**Nadal otwarte do korekty przed dalszą promocją:** balans trudności czternastu zadań, balans parametrów nagród i dogrywek, dokumenty retencji zgłoszonych wiadomości, konfiguracja zaufanego emitenta i rzeczywistego finansowania, organizacja/termin przelewu oraz ewentualna przyszła zmiana zasad odbioru. Formuła średniej+premii oraz+20 punktów/6 h po przelewie zostały już przyjęte; nie pytamy o nie ponownie. **Przyjęte są** kierunek średnia+premia, tworzenie/dołączanie/odchodzenie i czat, przycisk dobroczynności, finansowe limity, serwerowa księga, wykluczenie handlu i rzeczywisty bonus szczęścia. Żaden program nie został aktywowany przez ten dokument.
