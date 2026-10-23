# Interaktywna wyspa HARBORLIGHT

Stan: 2026-10-23, `harborlight-v1-layered.html`, lokalny prototyp ze schematem zapisu 8. Bazę stanowią HARBORLIGHT6 i D01–D17 z [arkusza 7](arkusze/HARBORLIGHT7-zasady.xlsx). Bieżący [arkusz 8](arkusze/HARBORLIGHT8-zasady.xlsx) uwzględnia późniejsze pakiety frontendu i najnowsze „go”; arkusz 7 pozostaje niezmieniony. Końcowa weryfikacja aktualizacji jest w toku. Wyniki sprawdzeń i publikacji zapisujemy osobno w [dzienniku implementacji](IMPLEMENTATION-LOG.md).

## Wyspa i sterowanie

Widok zachowuje zaakceptowany układ i grafikę wyspy, z kontrolkami HTML i responsywnymi dialogami. Aktywny interfejs jest po angielsku. Kliknięcie budynku otwiera jego panel; operacje używają jednego zapisanego stanu. Telefon ma czytelne menu i dialogi bez konieczności trafiania w pomniejszone napisy grafiki. Kontrolki mają etykiety, widoczny fokus i obsługę klawiatury.

Marka, Level i pozostałe pola nagłówka mają osobne obszary, bez nakładania na lewą nawigację i bez przebijania starych napisów lub obrazków spod nowych kontrolek. Dolne Resources zastępuje cały pasek kart Buildings dokładnie pięcioma produktami: Wood → Lumber Camp, Planks → Sawmill, Stone → Quarry, Grain → Farm i Food → Windmill. Kliknięcie otwiera ten sam panel co budynek na wyspie. Nad ilustracją produktu jest liczba aktywnie pracujących w tym zakładzie, a pod nią ilość tego produktu w lokalnym składzie producenta / ilość tego samego produktu w magazynie głównym. Monety nie mają karty produktu. Buildings przywraca karty budynków.

| Element | Co otwiera lub pokazuje |
| --- | --- |
| Logo / Game menu | Główne funkcje gry |
| Settings | Zapis, animacje, lokalny wynik rankingu i potwierdzany reset |
| Sign in or create an account | Stronę formularzy konta; gra gościa pozostaje dostępna |
| Zasoby | Centralne zapasy, osobny skarbiec monet i logistykę |
| Level | Poziom ratusza, jego rozbudowę i zarządzanie kolejką budowy |
| Happiness | Średnią osobistego szczęścia i tempo demografii |
| Residents | Informacyjny przegląd osób, przydziałów, podróży i szczęścia; przejście do domu |
| House → Manage all workers | Jedyne wejście do zbiorczego zarządzania obsadą wszystkich miejsc pracy |
| Zegar | Rzeczywisty czas wyspy; bez kontroli pauzy i przyspieszenia gospodarki |
| Budynki / dolny dok | Szczegóły, koszty, pracowników, transport i Upgrade danego budynku |
| Dolne Resources | Pięć obrazkowych kart produktów: nad ilustracją aktywna obsada, pod nią lokalny zapas / centralny zapas; wybór otwiera właściwego producenta |
| Lighthouse tasks | Trzy bieżące zadania, nagrody, terminy i wpłaty |
| Expeditions | Osobne plansze i pulę monet do wypłaty albo dalszego ryzyka |
| Harbor / statek | Paczki handlu portowego, ceny i etapy dostawy |
| Dolne Decorations | Pięć ofert dekoracji i wydarzeń na 24 h, w miejscu kart Buildings, bez osobnego okna |
| Dolne Paths | Pięć poziomów ścieżek z postępem 100 odcinków i ulepszaniem za kamień |
| Town Hall — aktywne efekty | Źródło, wartość, zakres i pozostały czas albo warunek zakończenia wszystkich premii i kar |

Animacje obejmują obrót wiatraka, unoszący się i zanikający dym, mewy, wodospady, fale i przybój przy całym widocznym brzegu, idące postacie, chmury, budowę i zwierzęta. Ich szczegóły i ograniczenia warstw opisuje [WORLD-ANIMATION.md](WORLD-ANIMATION.md). Domyślnie gra respektuje systemowe ograniczenie ruchu. Świadoma zmiana Animations and highlights w Settings ma jednak pierwszeństwo i jest zapisywana: włączenie uruchamia efekty również przy ograniczeniu systemowym, wyłączenie je zatrzymuje. Niewidoczna karta wstrzymuje rysowanie, a powrót je przywraca. Dawne flagi pause/speed nie sterują obrazem; gospodarka nadal rozlicza czas rzeczywisty.

## Rozpoczęcie gry

Bez istniejącego zapisu powstaje wyspa z ratuszem i domem 1, 12 mieszkańcami w domu, 0 pracowników i szczęściem 0%. Każdy z sześciu zasobów ma 100: Coins, Wood, Stone, Grain, Food, Planks. Lokalne składy producentów są puste. Odświeżenie zachowuje istniejącą wyspę; nie przyznaje ponownie zasobów startowych.

Na prośbę użytkownika ta aktualizacja ma osobne, **jednorazowe uzupełnienie materiałów centralnych do testowania budowy**, wykonywane przy najbliższym wczytaniu. Respektuje oba limity magazynu i zapisuje wykonanie, więc kolejne odświeżenie nie odnawia materiałów. Zapewnia także minimum **10 000 monet**, zachowując większe istniejące saldo. Nie podnosi poziomów i nie zmienia obsady, populacji czy budów. Nie jest częścią zwykłego startu ani usługą Premium.

[Link nowego gracza](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player) otwiera osobny profil z normalnymi ustawieniami startowymi, bez testowego grantu. Korzysta z `harborlight-v1-new-player-save`, zachowując dotychczasową wyspę pod `harborlight-v1-interactive-save`. Kolejne otwarcie kontynuuje ten profil zamiast ponownie rozdawać startowe zasoby. Reset z ustawień dotyczy bieżącego profilu.

Poziom ratusza wyznacza poziom gry, maksymalny poziom innych budynków i limit `24 × poziom ratusza` mieszkańców. Dom ma własne `24 × poziom domu` miejsc mieszkalnych. Przy ratuszu 4, domu 3 i 78 osobach limit osady wynosi 96, miejsc jest 72, a 6 osób bez miejsca powoduje −6 pp/h dla każdej uprawnionej osoby. Dopiero ukończenie większego domu zatrzymuje dalszą karę. Minimum populacji to 6 osób, maksimum techniczne poziomu 100.

## Praca, produkcja i podatki

Na starcie trzeba samodzielnie przypisać ludzi z domu. Pracować można w farmie, młynie, drwalach, tartaku, kamieniołomie, magazynie, targu i porcie. Limit każdego miejsca pracy wynosi `12 × własny poziom budynku`, z jednej puli wolnych osób. Targ otwiera ratusz 2, port ratusz 4. Dom, ratusz, kaplica i latarnia nie mają etatów.

Dojście do pracy zajmuje 5 min. Dopiero po dotarciu zaczyna się praca i podatek 1 moneta/os./h. Zwolnienie oznacza 5 min powrotu, bez podatku i możliwości kolejnego przydziału. Gotowe towary zostają, niedokończona sztuka przepada. Podatek płynie również przy głodzie lub blokadzie produkcji, a jego ułamkowy postęp jest zapisany.

Własny poziom producenta zwiększa lokalną pojemność i wydajność na osobę: poziomy 1/2/3/4 dają 10/12/13/14 szt./h. Każdy ma osobną fazę sztuki. Farma produkuje zboże, drwale drewno, kamieniołom kamień. Młyn zużywa 2 centralne zboża na 1 lokalną żywność, tartak 2 centralne drewna na 1 lokalną deskę. Brak materiału albo pełny bufor zatrzymuje produkcję.

Wszystkie budynki mają u góry status odpowiadający ich funkcji. Producent pokazuje Producing, Waiting for workers, Storage full albo Waiting for resources; przy produkcji także najbliższy czas, produkt i liczbę sztuk, które trafią do lokalnego składu. Storage ma format **obecny zapas / pojemność na tym poziomie / pojemność po jednym ulepszeniu**, np. 50 / 200 / 400; pod liczbami są krótkie podpisy **In stock / Current cap. / Next level cap.** Workers pokazuje **przypisani / wolni w domu / limit tego budynku**, np. 1 / 4 / 12, z podpisami **Assigned / Free at home / Max workers** i małymi −/+. Mniejszy Level jest po lewej, Storage po prawej, a Workers pod Storage. Wszystkie informacje o podatkach usunięto z nagłówka, paneli, kart pracowników i widocznych objaśnień. To zmiana prezentacji; silnik nalicza dochód według dotychczasowych zasad.

Licznik nad ilustracją produktu w dolnym doku pokazuje rzeczywistą pracę: osoba musi już dotrzeć i nie mieć blokady produkcji. Osoba idąca lub czekająca przy pełnym składzie nie zwiększa tego licznika; głodny, ale pracujący producent nadal jest liczony przy swojej połowie wydajności. Jest to inne pole niż liczba wszystkich przypisanych w panelu Workers. Limity obsady i norma wymagań zadań pozostają bez zmian.

House pokazuje cztery wartości: obecną populację, limit według ratusza, miejsca do spania i tempo przyrostu/spadku. Opisy Housing capacity oraz House happiness są pod „i”. Wszystkie przyciski pomocy działają po najechaniu, fokusem i dotykiem; nie wymagają stałych bloków opisowych.

## Jedzenie i szczęście osób

Każdy automatycznie zjada 1 Food/h wyłącznie z centrali, także offline, w drodze i podczas zwiedzania. Przydzielona cała jednostka posiłku i jej ułamek nie mogą być ponownie wydane. Chroniona rezerwa to `50 × poziom magazynu` Food: ludzie ją jedzą, ale budowa/handel jej nie zabierają. Magazynier ratunkowo nosi gotowe Food poniżej progu; nie można wówczas ręcznie odwołać ostatniej obsady magazynu.

Jedzenie daje osobiste +1 pp/h, rzeczywista praca kolejne +1. Po 12 h ciągłego braku jedzenia albo pracy każdy brak daje własne −5 pp/h. Je i pracuje: +2/h. Je i jest bezrobotny ponad 12 h: −4/h. Pracuje i głoduje ponad 12 h: −4/h. Oba braki ponad 12 h: −10/h. Pierwsze 12 h nie są karane wstecz. Blokada produkcyjna nie daje +1 pracy ani kary bezrobocia, ale daje osobny składnik przestoju −10, potem −10 co 24 h do −50 pp. Limit tego składnika nie ogranicza całej osoby do −50%.

Głód od razu obniża produkcję i tempo transportu do 50%, bez obniżenia podatku. Dostawa jedzenia zeruje głód, a zatrudnienie bezrobocie; osobiste szczęście i tożsamość pozostają. Odejście ludności jest wybierane z domu/osób w drodze, następnie z największej załogi według ustalonej kolejności; zwiedzający są chronieni.

Nowy mieszkaniec trafia do domu i przez 24 h ma zamrożone 0% szczęścia, również przy premiach latarni i kaplicy; potem zwykłe naliczanie zaczyna się od zera. Początkowa dwunastka nie jest tak zamrożona. Każde osobiste szczęście mieści się w ±100%, a z tych wyników powstaje średnia wyspy. Pełne procenty są zaokrąglane w górę wyłącznie na ekranie; silnik zachowuje ułamki.

Średnia 0% nie zmienia populacji; ±25% daje zmianę osoby co 12 h, ±50% co 6 h, ±75% co około 1 h 43 min, ±100% co godzinę. Wartość dodatnia daje przyrost, ujemna odejście. Znak i granice populacji nie pozwalają przechować zapasu zmian na później.

W House można rozdysponować dzienną pulę szczęścia równą liczbie mieszkańców w chwili jej odnowienia. Punkty dodają osobiste pp, nie usuwają kar ani liczników. Po 23 h 58 min automat przyznaje resztę pełnymi punktami najmniej szczęśliwym, losując przy remisie; po 24 h przychodzi nowa pula.

## Transport i handel

Towar producenta mieści się w osobnym buforze `200 × własny poziom producenta` i staje się dostępny do wydania dopiero centralnie. Magazynier niesie jeden rodzaj na kurs, pełny lub częściowy. Bazowy kurs z powrotem trwa 300 sekund; ukończony poziom wszystkich ścieżek `R` dzieli ten czas przez `1 +0,1R`, a głód mnoży czas przez 2. Bazowy ładunek transportowego budynku poziomu 1/2/3 to 60/66/72; ścieżki 3/4/5 dodają odpowiednio 10/20/30%, z zaokrągleniem ładunku w dół. Domyślnie zaopatrzenie centrali jest przed budowami. Towar zabrany przez odwołaną osobę dokończy kurs.

W Warehouse od razu widać, co robi każdy magazynier: materiał, liczbę sztuk, źródło → cel oraz czas do końca aktualnej dostawy. Oczekiwanie i droga pracownika są osobnymi stanami, zamiast pozornego aktywnego kursu. Można wybrać do trzech podświetlonych priorytetów z numerami 1/2/3, spośród materiałów oraz pozycji **Construction**. Construction zajmuje jedno z tych samych trzech miejsc i kieruje przypadające mu kursy na aktywne budowy. Ich przydział liczy rzeczywiście rozpoczęte kursy, również niepełne; brak gotowego towaru albo miejsca nie zatrzymuje wolnej załogi, która może obsłużyć inny dostępny przewóz. Ratunkowa dostawa Food zachowuje ochronę mieszkańców.

Priorytety pozostają wybrane do ręcznej zmiany. Powtarzane dziesiątki kursów mają podział 8 +2 losowe przy jednym priorytecie, 5 +3 +2 losowe przy dwóch i 5 +3 +2 przy trzech. Brak wskazanego ładunku pozwala wykonać dostępny kurs zastępczy; stan dziesiątki i losowania są zachowane przy wczytaniu.

Magazyn ma 1000 na rodzaj i 4000 łącznie na poziomie 1; oba limity rosną ×1,5 z każdym kolejnym poziomem. Port ma analogiczne limity, targ 1000 łącznie ×1,5. Monety nie zajmują miejsca. Powiadomienia o pełnych składach pojawiają się przy zmianie stanu, z zapisem przeczytania.

Targ używa własnej załogi w obie strony i nie używa monet. Wymienia drewno/kamień/zboże albo deski/żywność, 10 za 9 po marży. Dostawa jest zablokowana na godzinę; niewykorzystana partia przepada po 24 h. Wynik wymiany ma nowy termin 24 h.

Port używa własnej załogi i paczek po 100. Podstawowe surowce sprzedaje/kupuje po 40/50 monet, deski i Food po 140/150. Zakup kolejnej paczki tego samego towaru w ruchomych 3 h zwiększa cenę liniowo o 10% bazowej; inny towar ma własny licznik. Monety zakupu są pobierane przy zatwierdzeniu. Sprzedaż wymaga centrala → port → statek i płaci przy wypłynięciu. Rejs zakupu trwa 5 min, następnie potrzebne są rozładunek i transport do centrali. Towary nieodebrane przez 24 h przepadają.

## Rozbudowa i usługi za monety

Upgrade dotyczy wybranego budynku bez dodatkowego wybierania miejsca. Koszt pokazuje centralne dostępne/wymagane: czerwony oznacza niedobór, zielony wystarczający zapas; monety pochodzą ze skarbca, a chroniona rezerwa Food nie jest wydawalna na budowę. Wyjaśnienia źródła kosztu i czasu są w popupie „i”, z obsługą dotyku, fokusu i Escape. Opłacone materiały są rezerwowane, dowożone, a nowy poziom działa po ukończeniu. Postęp dostarczone/wymagane i ETA odpowiadają obecnym priorytetom. Etykieta przy budowanym budynku ma dwa wiersze: **Transport · ETA** oraz pod nim **Construction · ETA**, z czasami właściwych faz.

Licznik Construction / Queue oraz wejście Construction and queue występują tylko w Town Hall. Każdy budynek zachowuje własne Upgrade. W farmie, młynie, drwalach, tartaku i kamieniołomie obok Upgrade znajdują się dwie małe informacje: **Delivery time** oraz **Building time**. W tej samej sekcji Building upgrade jest obramowana ramka **Premium** z dwoma dotychczasowymi głównymi przyciskami. Opisy monet, odblokowania i zasad Premium są w informacji „i” rozbudowy; osobna dolna sekcja Premium building options została usunięta z producentów. Kontrolki skracania już trwającej budowy pozostają dostępne przy tej rozbudowie.

Estymata rozdziela dowóz i budowanie, uwzględnia bieżącą załogę, jej drogę, zabrane ładunki, konkurujące dostawy i ustawione priorytety. Zakłada obecne warunki pracy oraz gotowość potrzebnych materiałów; zbieranie i kolejka są poza tym czasem. Brak możliwej trasy lub obsady ma opis przyczyny zamiast pozornego zera. Do zbiorczego Manage all workers wchodzi się tylko z House; pozostałe budynki zachowują własne małe −/+.

Standardowy czas to transport `T` + budowa `T`; latarnia `T +4T`, kaplica `T +3T×(nowy poziom−1)`. Dokładne ceny, dopłatę +10% w kolejce i przykłady zawiera [tabela budynków](BUILDINGS.md). Zwykły limit to tyle aktywnych i tyle opłaconych w kolejce, ile poziomów ratusza.

Lokalne usługi za monety obejmują 25/50/75/100% skrócenia pozostałej budowy za pełne minuty, zawsze co najmniej 5 monet; natychmiastowy transport po 10 monet/kurs; oraz od poziomu 4 kupno pełnego budynku z gotowością po 10 s. Zakup kompletu nie pobiera własnych materiałów ani nie wymaga tragarzy. Wszystkie ceny są pokazywane przed operacją.

Pakiet za `1000 × poziom ratusza` monet działa 24 h, daje +4 aktywne i kolejkę bez limitu; kolejny zakup przedłuża ważność. Dopłata kolejki +10% pozostaje. Wykonalny plan dostaw kosztuje ponadto 25% bazowej wartości portowej braków, po dopłacie kolejki, i czeka na realne materiały. Prototyp korzysta z istniejących lokalnych monet; nie ma rzeczywistej sprzedaży pakietów za PLN.

## Kaplica i zwiedzanie latarni

Rozbudowa kaplicy daje +10 pp × nowy poziom i podatki ×2/10 h. Darmowe ręczne użycia w całej grze odpowiadają poziomowi kaplicy; każde daje +50 wszystkich sześciu zasobów i +20 pp/1 h. Płatne użycie kosztuje `100 × poziom` monet. Nie nakłada się drugiego ręcznego efektu, a kolejne płatne użycie jest możliwe 4 h po końcu poprzedniego.

Ukończenie poziomu latarni daje efektywne 100% szczęścia i produkcję materiałów ×2 przez `24 h × nowy poziom`; po końcu przywraca osobiste szczęście sprzed premii. Nie zmienia podatku i transportu ani zamrożenia nowych osób.

Z House można wysłać wolne osoby na 4 h zwiedzania bez czasu dojścia i bez wycofania. Dopiero po powrocie dostają osobiste 100% na 24 h i 24 h zakazu kolejnej wizyty; każda grupa daje populacji +10 pp na 6 h, z niezależnym zegarem i sumowaniem. Limit jednoczesny to `2 × latarnia`, darmowych wejść `2 × latarnia` w ruchomych 24 h. Do 3 dodatkowych pakietów po 2L wejść kosztuje `300 × numer pakietu 2/3/4 × poziom latarni`. Zwiedzający jedzą, nie produkują i nie płacą podatku.

## Dekoracje, wydarzenia i ścieżki

Kliknięcie Decorations na dole zmienia poziomy pasek na pięć kart z puli 20 atrakcji. Karty pokazują cenę, indywidualną premię, liczbę odbiorców i czas 6 h. Zestaw i wylosowane `Y=5…100` są zapisane; zmiana pięciu propozycji następuje co 24 h, także offline. Cena wynosi `Y × poziom ratusza`, a bazowy efekt `+Y` pp dla tylu osób, ile poziom ratusza. Najpierw wybierane są uprawnione osoby o najmniejszym efektywnym szczęściu, ze stabilnym ID przy remisie. Nowi mieszkańcy z zamrożonym 0% pozostają chronieni; jeżeli uprawnionych jest mniej, premia obejmuje dostępnych.

Przyzwyczajenie do każdej atrakcji liczy się osobno: 100%, 75%, 50%, 25%, potem 0% podstawowej premii; zakup przy zerowej skuteczności jest niedostępny. Po 24 h bez kupowania danego rodzaju wraca pełny efekt. Wymiana ofert nie resetuje przyzwyczajenia. Każdy zakup ma własne 6 h, efekty się sumują w granicach osobistego szczęścia, a historia kar pozostaje zachowana.

Paths przełącza dolny pasek na pięć kafelków poziomów z postępem np. 37 / 100. Wyspa ma 100 odcinków, początkowo wszystkie poziomu 0. Kliknięcie ulepsza jeden odcinek o jeden dostępny poziom za 100 centralnego kamienia, natychmiast. Nie można zaczynać kolejnego poziomu przed ukończeniem poprzedniego na wszystkich 100 odcinkach. Cały poziom kosztuje 10 000 kamienia; dojście wszystkich do 5 kosztuje 50 000.

Premia zaczyna działać po ukończeniu całego poziomu: poziomy 1…5 dają szybkość kursów +10/20/30/40/50%, a poziomy 3/4/5 dodatkowo ładowność +10/20/30%. Działa na tragarzy magazynu, targu i portu, w tym dowóz na budowę. Nie przyspiesza produkcji, drogi mieszkańca do pracy lub domu ani rejsu statku. Zapis zachowuje wcześniej opłacone odcinki i dekoracje starszej wersji.

## Premie, kary i powiadomienia

Góra Town Hall pokazuje wszystkie aktualne premie, kary i ograniczenia: źródło, wartość, odbiorców lub zakres oraz czas do końca albo warunek ustąpienia. Obejmuje to także błogosławieństwa, kaplicę, latarnię, wizyty, atrakcje, przyzwyczajenie, ścieżki, głód, bezrobocie, pełne składy i przeludnienie. Informacja podatkowa jest ukryta także w opisach efektów kaplicy.

Notifications zapisuje rozpoczęcie, istotną zmianę i zakończenie efektu. Samo odliczanie sekund nie tworzy kolejnych wiadomości; odświeżenie nie powtarza istniejącej aktywacji. Powiadomienia zachowują przeczytanie i wcześniejszą historię. Jednorazowe punkty lub nagrody pokazują swoje zdarzenie zamiast pozornego aktywnego zegara.

## Zadania i ekspedycje

Prawy panel pokazuje trzy zadania latarni z nagrodami, wpłatami i osobnymi terminami. **Aktywne może być tylko jedno zadanie.** Przyjęcie na liście od razu podświetla tę samą kartę jako Active także po prawej, z osobnym dostarczone / wymagane dla każdego towaru, np. Planks 100 / 480 i Food 345 / 480. Pozostałe karty w obu widokach są wyszarzone, a rozpoczęcie ich i wpłaty są zablokowane. Można nadal podejrzeć wymagania. Ukończenie albo wygaśnięcie zwalnia miejsce aktywnego zadania.

Na starcie są S/M/L; później każdy nowy losowy rozmiar trafia na koniec FIFO. Przyjęcie przed 15 s zapisuje mnożnik ×3, przed 5 min ×2, później ×1. Wpłaty są w ratach prosto z centrali, bez przewozu i zwrotu; przeterminowane przepadają. Po pełnej wpłacie nagroda jest jednorazowa, a nowa karta pojawia się od razu. Materiały przekraczające pojemność czekają w automatycznie zwalnianym buforze nagród. Migracja starszego zapisu nie kasuje rat ani zapisanego mnożnika; spośród wcześniej przyjętych zadań aktywne jest jedno, a pozostałe zachowują swój postęp i termin.

Ukończenie zadania otwiera popup świętowania z fajerwerkami, a na wspieranym telefonie krótką wibracją. Potem Share your achievement udostępnia **Share on Facebook** i **Skip**. Kliknięcie Share on Facebook daje dodatkowe **500 monet raz na ukończone zadanie**, zgodnie z osobną decyzją użytkownika. Skip zachowuje zwykłą nagrodę bez bonusu. Odświeżenie i powtórne kliknięcie nie przyznają ponownie monet. Na tym etapie przycisk nie publikuje posta ani nie łączy się z Facebookiem; to zatwierdzony lokalny bonus prototypu. Wibracja zależy od wsparcia przeglądarki, szczególnie na iPhone; jej brak nie blokuje świętowania ani nagrody.

Początkowe terminy to 6 h. Pierwsze ukończenie każdego łańcucha wyznacza jego stałą dobową godzinę odnowienia w Europe/Warsaw. Wymagania zachowują zatwierdzoną normę `12 × własny poziom producenta × jego wydajność × godziny`, podobnie jak dotychczasowy limit miejsc pracy. Norma nie jest obietnicą zebrania całości od zera w takim czasie przy wspólnej populacji i karmieniu. Nagrody nadal skalują się wobec poziomu 3. Szczegóły i zakresy są w [ECONOMY-RULES.md](ECONOMY-RULES.md).

Ekspedycja wypłaca tylko monety. Za pierwszy etap pula wynosi 50, za kolejne 100, 200, 400… Można ją wypłacić albo postawić całą na dalszy etap; porażka lub limit czasu traci niewypłaconą pulę. Gra sprawdza trasę i bieżący etap, nie przyznaje dawnych dodatkowych materiałów. Dokupowanie ruchów/czasu, zewnętrzne reklamy i ich nagrody czekają na zdefiniowanie i weryfikację.

## Konto, zapis i granice prototypu

`harborlight-auth.html` udostępnia Sign in i Create account, walidację pól, przełączanie widoczności hasła, komunikaty i link Continue as guest. `?mode=register` albo `#register` otwiera rejestrację. Google/Facebook są przyciskami z ikonami i komunikatem Coming soon: **nie ma OAuth ani wysyłki danych do tych usług**. Formularz nie udaje utworzenia konta, nie zapisuje haseł i informuje, że usługa kont jest niedostępna.

Gra zapisuje postęp lokalnie w `localStorage` pod dotychczasowym kluczem `harborlight-v1-interactive-save`; profil `?profile=new-player` używa niezależnego `harborlight-v1-new-player-save`. Schemat 8 zachowuje starsze zasoby, mieszkańców, ich historię, fazy produkcji, posiłek, podatek i budowy; dodaje zegar offline, ładunki, terminy handlu, wizyty, pulę domu i bieżące aktywności. Rezerwa materiałów, fizyczne ładunki oraz znaczniki odbioru zapobiegają podwójnemu lokalnemu rozliczeniu. Reset wymaga potwierdzenia i dotyczy zapisu tej przeglądarki.

Klient pozostaje edytowalnym prototypem. Nie ma serwerowego konta, synchronizacji między web/Android/iPhone, wspólnego rankingu, potwierdzania płatności, postów, poleceń ani reklam. Rzeczywiste wydanie wymaga uwierzytelnionego API i serwerowej weryfikacji czasu, komend, nagród oraz transakcji; plan jest w [BACKLOG.md](BACKLOG.md).

## Uruchomienie i testy

Instrukcja HTTP oraz zależności są w [README](../README.md). Testy reguł uruchamia `node --test --test-timeout=10000 tests/*.test.mjs`. Są osobne zestawy dla stanu, jedzenia, nowych reguł stanu, logistyki, mieszkańców i aktywności. Auth oraz aktualne panele mają osobne testy przeglądarkowe; animacje i wybrzeże nadal mają własne zestawy regresji. Rzeczywiście wykonane wyniki, rozmiary okien i stan publikacji zapisujemy w dzienniku, bez utożsamiania historycznych sprawdzeń z bieżącą wersją.
