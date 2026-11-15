# HARBORLIGHT — ściągawka zmian do testów DEV

To ściągawka do ręcznego sprawdzenia zmian DEV 0.15.0.0 / v32. Zaznaczaj punkt dopiero po własnej próbie. PRE-PROD nie otrzymał tego wydania.

[Otwórz DEV na poziomie5](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?preview=admin1-level5&v=frontend-v32-6) · [Nowy gracz na poziomie1](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-6) · [Otwórz klikaną listę](../testing/dev-v32-checklist.html)

Podgląd GitHub Pages działa bez logowania i trzyma postęp tylko w otwartej karcie. Odświeżenie lub zamknięcie zaczyna nowy podgląd. Zaznaczenia na osobnej liście nie są zapisem gry. Na szybki pierwszy przegląd wybierz punkty z etykietą „Szybki test”; procesy wielogodzinne wygodniej sprawdzać na lokalnym DEV z zegarem admin3.

Wszystkie punkty poniżej czekają na Twój ręczny odbiór. Wyniki testów automatycznych są opisane osobno w dokumentacji.

## Najpierw: wejście i nowe budynki

- [ ] **DEV-01 — Start i miejsce dla mieszkańców** (Szybki test)
  Sprawdź: Otwórz oddzielny link „Nowy gracz na poziomie1” i spójrz na licznik mieszkańców oraz opis Ratusza.
  Wynik: Start: 18 osób i 36 miejsc. Ratusz i Dom mają po 36 miejsc na poziom; tempo napływu mieszkańców zwiększono o 50%.

- [ ] **DEV-02 — Wprowadzenie i samouczek** (Szybki test)
  Sprawdź: Przejdź pierwsze ekrany, otwieraj wskazane panele i wykonuj lekcje.
  Wynik: Przewodnik ma 56 kroków, samouczek 25 praktycznych lekcji. Oprowadzanie grupuje górne kontrolki, budynki z Teatrem i wszystkie pięć dolnych zakładek. Wskazania prowadzą do rzeczywistych przycisków; końcowe podstawowe materiały to drewno, kamień, zboże, mąka i deski.

- [ ] **DEV-03 — Siedem nowych budynków** (Rozwój wyspy)
  Sprawdź: Kliknij nowe obiekty na mapie i porównaj ich opisy oraz wymagania.
  Wynik: Ratusz 1: Rybak i Rzeźnia. Ratusz 2: Piekarnia, Mleczarnia i Zakład skórzany. Ratusz 4: Akademia i Koszary. Budynki odblokowują się na poziomie 1.

- [ ] **DEV-04 — Gospodarstwo i Młyn** (Rozwój wyspy)
  Sprawdź: Sprawdź wybór produktu i rozdziel pracowników między kierunki produkcji.
  Wynik: Gospodarstwo 1 daje zboże i warzywa; poziom 2 dodaje żywiec i surowe mleko. Młyn przerabia 4 zboża na 1 mąkę. Nie powstaje nowa ogólna „żywność”.

- [ ] **DEV-05 — Piekarnia i Mleczarnia** (Rozwój wyspy)
  Sprawdź: Po odblokowaniu sprawdź receptury, przydziały oraz pobierane składniki.
  Wynik: Chleb: 4 mąki → 1 chleb. Ciasto: 4 mąki + 2 surowe mleka → 1 ciasto, bez osobnego badania podstawowego przepisu. Mleczarnia: 4 surowe mleka → 1 mleko pasteryzowane.

- [ ] **DEV-06 — Rzeźnia, skóry i ubrania** (Rozwój wyspy)
  Sprawdź: W Rzeźni przełącz proces, a w Zakładzie skórzanym porównaj receptury.
  Wynik: Mięso i skóry produkuje się osobno: 2 żywce → 2 mięsa albo 2 żywce → 1 skóra. Ubranie cywilne zużywa 4 skóry, strój wojskowy i szata profesorska po 8; szaty odblokowuje Akademia. Cywilne ubranie działa 21 dni, a obowiązek ubioru zaczyna się od Ratusza 5.

## Jedzenie, magazyny i budowa

- [ ] **DEV-07 — Sytość i brak jedzenia** (Szybki test)
  Sprawdź: Otwórz ustawienia jedzenia w Magazynie i porównaj potrzeby z dostępnymi produktami.
  Wynik: Mieszkaniec potrzebuje 6 punktów sytości na godzinę, bez miejsca do spania dwa razy tyle. Częściowa racja stopniowo pogarsza wydajność; po uzupełnieniu jedzenia dojrzały głód przestaje działać.

- [ ] **DEV-08 — Priorytety i jednorazowe partie jedzenia** (Szybki test)
  Sprawdź: Zmień kolejność produktów i ustaw ilość do wydania.
  Wynik: Ustawiona ilość jest jedną partią i nie odnawia się sama. Limit może zostać przekroczony awaryjnie tylko wtedy, gdy to jedyne dostępne jedzenie. Chroniona rezerwa godzinnego posiłku nie może zostać wydana na zwykłą budowę, handel lub transport.

- [ ] **DEV-09 — Różnorodność i ciasto** (Dłuższy test)
  Sprawdź: Sprawdź opis diety mieszkańców oraz premię po zjedzeniu ciasta.
  Wynik: Wymagane jest 1/2/3 rodzaje jedzenia od Ratusza 1/3/8, liczone z faktycznych posiłków ostatnich 24 godzin. Nowy mieszkaniec i wzrost wymagań dają 24 godziny ochrony. Ciasto daje czasową premię +5 punktów szczęścia na 6 godzin.

- [ ] **DEV-10 — Mleko i ser** (Dłuższy test)
  Sprawdź: Porównaj surowe mleko w magazynie centralnym, lokalnym buforze i w transporcie.
  Wynik: Mleko kwaśnieje po 72 godzinach łącznego pobytu w magazynach centralnych. Lokalny bufor i transport zatrzymują ten zegar, ale nie odmładzają mleka. Ser wymaga Gospodarstwa 6 i odkrycia: 4 kwaśne mleka → 1 ser.

- [ ] **DEV-11 — Osoby, produkty i fizyczne dostawy** (Rozwój wyspy)
  Sprawdź: Przydziel osoby do dwóch produktów i obserwuj składniki, wytworzone towary oraz tragarzy.
  Wynik: Każdy kierunek ma własny przydział, a składniki i produkty zajmują prawdziwe miejsce. Magazyn lokalny mieści 200 × poziom jednego towaru i 300 × poziom łącznie. Pełny bufor blokuje dany proces.

- [ ] **DEV-12 — Bezpośrednie trasy dostaw** (Rozwój wyspy)
  Sprawdź: Po osiągnięciu Magazynu 5 odkryj konkretną trasę i przydziel jej tragarzy.
  Wynik: Trasa prowadzi od określonego producenta do odbiorcy. Na jedną trasę przypada najwyżej połowa załogi; musi pozostać co najmniej jeden tragarz ogólny. Zwykłe kursy nadal odbierają nadmiar.

- [ ] **DEV-13 — Budowa i wymagane jedzenie** (Rozwój wyspy)
  Sprawdź: Otwórz koszt rozbudowy, zmień mieszankę posiłku i spróbuj zatwierdzić niewystarczający zapas.
  Wynik: Każdą dawną jednostkę „żywności” w koszcie zastępuje 6 punktów sytości z prawdziwych produktów ponad rezerwę. Nie da się wydać tego samego składnika dwa razy. Ratusz 3→4 wymaga 81 mieszkańców; późniejszy spadek populacji nie anuluje opłaconej budowy.

- [ ] **DEV-14 — Targ, ceny i całe monety** (Rozwój wyspy)
  Sprawdź: Porównaj wycenę większej partii towaru, wymianę i wyrzucenie zapasu.
  Wynik: Wymiana używa wartości towarów i prowizji 10%, a wynik to pełne sztuki. Monety są całkowite; zaokrąglenie dotyczy całej transakcji. Nowe towary mają własne ceny i kategorie.

## Mieszkańcy, nauka, wyprawy i zabawa

- [ ] **DEV-15 — Akademia, kursy i badania** (Rozwój wyspy)
  Sprawdź: Od Ratusza 4 obejrzyj kursy, obsadę profesorów oraz równoległe badania.
  Wynik: Profesor uczy jednego adepta albo bada jeden temat. Kurs cywilny kosztuje 10 × poziom Akademii i trwa ⅓ czasu budowy jej poziomu. Rozdzielanie profesorów zmienia tempo badań; rozbudowa nie wyłącza Akademii. Ręczne anulowanie i wymuszona utrata prowadzącego mają różne skutki opisane w panelu.

- [ ] **DEV-16 — Kariera, kolejne rundy i ubrania specjalistów** (Dłuższy test)
  Sprawdź: Sprawdź absolwenta oraz możliwość zapisania go do innej profesji.
  Wynik: Ukończony kurs pozostaje przypisany do osoby, także po podróży. Kolejne rundy wzmacniają efekt nauki; absolwent ma czasową premię szczęścia. Wykluczają się ścieżki cywilna i wojskowa, a specjalistyczny strój nie zużywa równolegle cywilnego ubrania.

- [ ] **DEV-17 — Koszary, szkolenie i wyprawy wojskowe** (Dłuższy test)
  Sprawdź: Od Ratusza 4 obejrzyj rekruta, instruktora, koszt szkolenia oraz późniejszy powrót wyprawy.
  Wynik: Szkolenie wymaga gotowego instruktora i 3 strojów wojskowych. Rekrut pozostaje w Domu. Wojskowe wyprawy trwają 1–96 godzin; to osobny czas od oczekiwania na miejsce po powrocie. Odpoczynek trwa 24 godziny od przyjęcia. Przy braku miejsca panel pokazuje terminy: 96 godzin na potrzebny awans Ratusza i następnie 24 godziny na bezpłatną rozbudowę Koszar.

- [ ] **DEV-18 — Archipelag i pasażerowie** (Rozwój wyspy)
  Sprawdź: Po założeniu kolejnej wyspy sprawdź portfel oraz przewóz osób do pełnego celu.
  Wynik: Monety są wspólne dla archipelagu. Nowa wyspa dziedziczy raz poziomy Ratusza i Magazynu; inne budynki startują na poziomie 1. Przybycie osób sprawdza rzeczywiste miejsca, zachowuje kariery i obsługuje nadmiar przez powrót lub oczekiwanie.

- [ ] **DEV-19 — Ratowanie cywilów** (Rozwój wyspy)
  Sprawdź: Uruchom dostępny ratunek, zakończ go i wybierz wyspę przyjęcia uratowanych.
  Wynik: Nagroda to grupa 2 × poziom Ratusza z początku ratunku. Podejście jest darmowe, bez obowiązkowej reklamy. Osoby można przyjmować częściami do różnych wysp; kolejny odbiór nie powiela nagrody.

- [ ] **DEV-20 — Teatr i dekoracje** (Dłuższy test)
  Sprawdź: Zaplanuj przedstawienie, obejrzyj listę widzów i koszt; sprawdź plac oraz ulepszanie ozdób.
  Wynik: Plan trwa 45 minut, pokaz 10 minut, koszt wynosi 2 monety na widza, premia +10 punktów szczęścia na 6 godzin. Produkcja i nauka trwają dalej. Na mapie Teatr zajmuje dawny budynek Targu, a Targ sąsiedni stragan. Plac ma 20 miejsc, 10 typów ozdób i dalsze poziomy; wymagania reklam są widoczne co trzeci poziom.

- [ ] **DEV-21 — Dwie nowe minigry i ich trudność** (Szybki test)
  Sprawdź: Uruchom „Sieć latarnika” i „Konwoje na redzie”; porównaj sterowanie myszą i dotykiem.
  Wynik: W Sieci przechodzisz każdy przewód raz, w Konwojach wybierasz kolejność wypłynięcia. Plansze i grafika są własne. Trudność rośnie po wygranej danej odmiany, a po 3 porażkach pojawia się pomoc lub łatwiejsza próba.

- [ ] **DEV-22 — Czas, pomoc i wyjście z minigry** (Szybki test)
  Sprawdź: Dojdź do końca czasu albo wyjdź z aktywnej próby i wróć do przygody.
  Wynik: Przy 30 sekundach pojawia się 5-sekundowy wybór dodatkowego czasu. Przedłużenie daje co najmniej 60 sekund lub 50% czasu; opcje zależą od dostępnej symulacji DEV. Wyjście z minigry przegrywa bieżącą próbę i zachowuje wcześniejsze ukończone etapy. Na koncie serwerowym tak samo działa odświeżenie. W podglądzie Pages odświeżenie resetuje całą wyspę, ponieważ nie ma tam trwałego zapisu.

- [ ] **DEV-23 — Przygody, interfejs i teksty** (Szybki test)
  Sprawdź: Sprawdź kolejność etapów, zdobyte przedmioty, nagrody, opisy „i” i układ na telefonie.
  Wynik: Przedmioty i wskazówki mają sens w swoich przygodach, nagrody odbiera się raz. „Osoby” i „Przydziel” są wyrównane, nowe funkcje używają istniejących budynków planszy; podpisy pojawiają się po najechaniu; okna i przyciski mieszczą się na telefonie. Teksty są bieżącą wersją do redakcji — kolumna C nowego Excela pozostaje pusta.

## Osobno: testy wymagające serwera i kont DEV

- [ ] **DEV-24 — Logowanie, zapis i izolacja trzech kont** (Serwer DEV)
  Sprawdź: Na uruchomionym serwerze DEV zaloguj się kolejno jako admin1, admin2 i admin3, wykonaj zmianę i odśwież.
  Wynik: Hasło jest takie samo jak login. Lokalne admin1 ma Ratusz 5 po ręcznym awansie bez resetu, a admin2 i admin3 pozostały na poziomie 1. Każde konto wczytuje własny postęp; odświeżenie i restart serwera zachowują zapis. Przez pierwsze 7 dni logowanie może przyznać po jednym powitalnym mieszkańcu dziennie; przy pełnym Ratuszu oczekuje on do 24 godzin na ukończony awans. Pages nie udostępnia tych kont ani trwałego zapisu.

- [ ] **DEV-25 — Zegar admin3 i dłuższe procesy** (Serwer DEV)
  Sprawdź: Na lokalnym DEV użyj przyspieszenia czasu na admin3, potem porównaj admin1.
  Wynik: Przyspiesza się tylko własna symulacja admin3. Jej offset zostaje po ponownym zalogowaniu. Wspólne terminy Królestwa i darów nadal używają rzeczywistego zegara serwera.

- [ ] **DEV-26 — Królestwo, sojusz i wspólne zadania** (Serwer DEV)
  Sprawdź: Na kontach DEV sprawdź ofertę, przyjęcie zadania, zaproszenie do sojuszu i wpłatę drugiego gracza.
  Wynik: Oferty zależą od rozwoju i aktywnego dnia. Sojusz ma do 5 osób; po rozpoczęciu wspólnego zadania skład zostaje zamknięty. Wpłaty, terminy oraz pełna nagroda lub kara każdego członka rozliczają się raz. Wieloosobowych wyników z Pages nie traktuj jako testu serwera.

- [ ] **DEV-27 — Finanse i handel między graczami** (Serwer DEV)
  Sprawdź: Porównaj dwie sesje podczas przyjęcia tej samej oferty, depozytu albo spłaty zobowiązania.
  Wynik: Jedna oferta i jedna wypłata nie mogą zostać odebrane dwukrotnie. Pożyczki, finansowanie, depozyty i kary zachowują historię oraz terminy. Nowe wartości balansu są propozycjami DEV do odbioru przed PRE-PROD.

- [ ] **DEV-28 — Dary dla sojusznika** (Serwer DEV)
  Sprawdź: Od Ratusza 6 wyślij towary na inne konto tego samego sojuszu i sprawdź pełny magazyn odbiorcy.
  Wynik: Dar mieści się na wspólnym statku, wysyła się go raz na 24 godziny i odbiera automatycznie. Nadmiar wraca; zwrot nie odnawia limitu. Chroniona rezerwa jedzenia pozostaje na wyspie.

## Ostatnie GO: poprawki do ponownego sprawdzenia

- [ ] **DEV-29 — Ramki, ciemne menu i blokady** (Szybki test)
  Sprawdź: Najedź na nowy budynek i Kaplicę. Porównaj wnętrza paneli, a potem kliknij budynek zablokowany przez poziom Ratusza.
  Wynik: Nowe ramki mają ten sam złoty styl co stare. Nowe menu i sekcje produkcji Młyna są ciemne. Zablokowany budynek pokazuje tylko wymagany i obecny poziom Ratusza; nie otwiera pełnego menu.

- [ ] **DEV-30 — Kolejność 56 podświetleń** (Szybki test)
  Sprawdź: Przejdź oprowadzanie, zwracając uwagę na powrót między górą, budynkami i dolnymi zakładkami.
  Wynik: Kolejność: górne kontrolki i ich funkcje, budynki wraz z Teatrem, następnie Administracja, Gospodarka, Zasoby, Dekoracje i Ścieżki. Tytuł brzmi „Ubrani”. Magazyn lokalny podświetla niezadowoloną buźkę. Stary postęp i nagrody pozostają zachowane.

- [ ] **DEV-31 — Teatr: wszyscy lub wybrane zajęcia** (Rozwój wyspy)
  Sprawdź: Rozwiń wybór widzów, zaznacz osoby z kilku grup i porównaj koszt z przyciskiem „Wyślij wszystkich”.
  Wynik: Mieszkańcy są pogrupowani według zajęcia. Rozwijana lista pozwala zaznaczyć wybrane osoby, a „Wyślij wszystkich” planuje pokaz dla wszystkich dostępnych. Liczba widzów i pełny koszt są widoczne przed wysłaniem; 100 dostępnych osób kosztuje 200 monet. Nieobecni nie są doliczani.

- [ ] **DEV-32 — Magazyn: trzy osobne przyciski** (Szybki test)
  Sprawdź: Otwórz Magazyn i klikaj kolejno „Przegląd Magazynu”, „Wyżywienie” oraz „Priorytety transportu”. Sprawdź też krawędzie kart Młyna.
  Wynik: Wszystkie trzy sekcje są początkowo zamknięte; treść rozwija się dopiero po kliknięciu. Otwarta sekcja i wpisywane wartości nie znikają przy zwykłym odświeżeniu panelu. Karty mieszczą się w swoich kolumnach na komputerze i telefonie.

- [ ] **DEV-33 — Magazyn 1: wspólne 40 000** (Szybki test)
  Sprawdź: W Przeglądzie Magazynu sprawdź wspólną pojemność na poziomie 1 i opis następnego poziomu; uwzględnij ewentualną premię badania.
  Wynik: Bazowa wspólna pojemność poziomu 1 wynosi 40 000. Koszyk potrzeb powiększa się o 40%, następnie zaokrągla w dół do pełnych 10 000. To jeden wspólny limit, bez mnożenia przez liczbę towarów. Stare zapasy ponad nowy limit nie są kasowane; nowe dostawy czekają na wolne miejsce.

Pełna kolejność podświetleń: [CURRENT-TUTORIAL-ORDER.md](CURRENT-TUTORIAL-ORDER.md).

## Nowe GO: menu, lokalne ryby i poziom5

- [ ] **DEV-34 — Publiczny podgląd na poziomie5** (Szybki test)
  Sprawdź: Otwórz link z preview=admin1-level5; sprawdź Ratusz, nazwę scenariusza i dostępne budynki. Osobno otwórz zwykły nowy profil.
  Wynik: Scenariusz DEV faktycznie ma Ratusz5 i dostęp do budynków odblokowanych do tego poziomu. Rybak5 pozwala sprawdzić nowe badanie. Zwykły nowy gracz pozostaje na poziomie1. Publiczny scenariusz jest jawnie oznaczony i nie udaje logowania jakoadmin1.

- [ ] **DEV-35 — Spójne menu i równowaga kolumn** (Szybki test)
  Sprawdź: Porównaj Dom, Magazyn, producentów, Akademię, Koszary oraz menu główne, Ustawienia i Premium na komputerze i telefonie.
  Wynik: Powiązane funkcje są razem, sekcje mają równe krawędzie i odstępy, pola i przyciski są wyrównane. Modlitwa jest po prawej w Domu. Telefon zachowuje logiczną kolejność jednej kolumny bez poziomego przewijania.

- [ ] **DEV-36 — Trzy szybkie kliknięcia przydziału** (Szybki test)
  Sprawdź: W budynku z wolnymi mieszkańcami kliknij+trzy razy szybko, patrząc na pozycję przycisku i komunikat o dojściu do pracy.
  Wynik: Komunikat pojawia się przy nazwie budynku i nie przesuwa+/− ani przewinięcia. Wszystkie trzy kliknięcia trafiają w ten sam przycisk i przydzielają trzech mieszkańców, jeżeli pozwalają na to limity.

- [ ] **DEV-37 — Lokalne przetwory rybne IIIkategorii** (Rozwój wyspy)
  Sprawdź: Sprawdź próg badania przy Rybaku4/5. Ukończ odkrycie, przydziel załogę połowu i przetwarzania; obserwuj lokalne ryby i gotowe produkty.
  Wynik: Od Rybaka5 jedno badanie odblokowuje rybę wędzoną i przetwory rybne IIIkategorii. Składniki są pobierane z lokalnego połowu bez transportu świeżych ryb do innego budynku. Kalibracja DEV:4ryby→1wędzona/12pkt;6ryb→1przetwory/18pkt.

- [ ] **DEV-38 — Zbędne szczegóły i zachowane funkcje** (Szybki test)
  Sprawdź: Sprawdź dół Magazynu i producentów, a następnie dostęp do zakupu mieszkańca, wizyt Latarni, wymiany Targu i informacji Ratusza.
  Wynik: Nie ma pustego lub powtarzającego bieżący ekran przycisku „Więcej o budynku”. Rzeczywiste funkcje pozostają dostępne przez nazwane wejścia lub główny widok.

## Dostęp i granice testu

- Publiczny Pages: bez konta. Nie sprawdza trwałego zapisu trzech kont, przyspieszania admin3 ani wieloosobowych usług na lokalnym serwerze.
- Lokalny DEV: uruchom `node scripts/serve-dev.mjs`, otwórz `http://localhost:3000/harborlight-auth.html` w tym samym środowisku; `admin1/admin1`, `admin2/admin2`, `admin3/admin3`.
- PRE-PROD ma już te same pary login/hasło, ale nadal wcześniejszy kod 0.14.0.0. Nie używaj go do odbioru zmian v32.
- Realne reklamy i płatności nie zostały uruchomione. Sieć rybacka wzmacniana skórą oraz dalsze nieopisane wypieki są odłożone.
- Balans nowych wartości i pełna kampania wymagają osobnego odbioru; ta lista nie jest dowodem 50 dni rozgrywki ani 150 godzin zabawy.

Źródła: [mapa R01–R59](IMPLEMENTATION-AUDIT.md), [47 odpowiedzi](USER-DECISIONS.json), [dostęp i stan DEV](DEV-READY.md).
