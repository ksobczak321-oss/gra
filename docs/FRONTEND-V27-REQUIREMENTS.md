# DEV 0.11.0.0 / v27 — Latarnia, nauka i warunki życia mieszkańców

GO użytkownika z **1 listopada 2026, Europe/Warsaw** obejmuje zatwierdzone opisy oraz uzgodnioną wcześniej paczkę zmian. Poprawiona wklejka wnosi także nową regułę mieszkań i rzeczywiste dane w przykładzie zasobów. [Archiwum akceptacji i hashe](approval/v27-approval-record.md) zachowuje pełny projekt oraz poprawki użytkownika bez zmiany bajtów.

Ten dokument opisuje zakres, nie wynik testów ani wdrożenia. Status kodu roboczego, własnego SHA/CI/Pages i chmury rozstrzyga [rejestr środowisk](ENVIRONMENT-STATUS.md). **PRE-PROD pozostaje 0.10.1.0 / `353faad347262dce7c3632fdf7c71be124384ab1`**, wdrożenie 41246771480/próba1 SUCCESS. Nowe GO obejmuje **DEV oraz Git/CI/Pages**, bez nowej promocji GCP, PROD, resetu kont, prawdziwych operatorów finansowych ani integracji planszówki online.

## Źródło i reguła łączenia opisów

- Bazą jest pełny projekt W/T/S/M/P/R/K. Fragmenty nadpisane przez użytkownika mają pierwszeństwo. Nieprzepisane fragmenty pozostają zgodne z wcześniejszym ustaleniem, że brak nowego brzmienia oznacza zachowanie zaakceptowanego tekstu.
- Powtórzony T10 o zegarze traktujemy jako przypadkowe zdublowanie T9. Właściwy T10 opisuje misje. Pusty T34 zachowuje dotychczasowy opis Menu wyspy.
- Dopiski w nawiasach kwadratowych przekładamy na mechanikę; nie wyświetlamy ich jako opisu gry. Poprawiamy interpunkcję i oczywiste błędy redakcyjne bez zmiany sensu.
- Polska i angielska wersja opisują te same reguły, czasy i wartości. Liczby zależne od stanu wyspy są dynamiczne, nie wpisane jako pozorny przykład aktualnego stanu.
- Odbiór obejmuje teksty okien, podpowiedzi, tutoriala, samouczka, błędów i powiadomień. Sam brak angielskich słów nie wystarcza: opisy mają naturalnie wyjaśniać, co gracz robi i jaki uzyskuje skutek.

## Tutorial, samouczek i Pomoc

**Tutorial** jest oprowadzaniem po ekranie: **34 opisy** po dodaniu kroku Czat przed dzwonkiem. **Samouczek** jest zestawem **25 praktycznych lekcji**. Kolejność HUD pozostaje: szczęście → monety → pracujący → następny mieszkaniec → punkty → mieszkańcy i miejsca.

Pod znakiem **?** znajduje się Pomoc z dwoma głównymi przyciskami: **Wznów samouczek** i **Wznów tutorial**. Wznowienie zachowuje pozycję oraz historię działań i nagród. Możliwość obejrzenia od początku pozostaje wewnątrz wybranego trybu; przegląd ukończonych lekcji jest tylko odczytowy. Z pokazanego ekranu podsumowania wyspy usuwamy **Pomoc** i **Samouczek**; nie jest to polecenie usuwania innych funkcji menu.

Po zamknięciu tutoriala przez × wyświetlamy informację **„Aby wrócić do przerwanego miejsca, kliknij ? → Wznów tutorial”**. Pierwsze zakończenie lub zamknięcie uruchamia dotychczasowy start czasu wyspy. Powtórne oprowadzanie nie zatrzymuje rozpoczętego świata ani nie tworzy nowej ochrony powitalnej. Nie dodajemy niezamówionego obowiązkowego popupu po każdym zamknięciu samouczka.

Krok zasobów pokazuje **rzeczywiste wartości gracza w momencie wyświetlenia**: zapas przy producencie, centralny, w transporcie i bilans godzinowy. Ostatnia wartość uwzględnia zużycie oraz może być ujemna. Usuwamy statyczny przykład0 / 537 (0) jako rzekomo aktualny stan.

## Informacja o skutkach działań

- Kliknięcie kroku dotyczącego rozpoczętej rozbudowy pokazuje nazwę budynku i rzeczywisty pozostały czas. ETA obejmuje oczekiwanie na ekipę, niedokończone dostawy i budowę; nie zakłada stałych90 sekund od chwili kliknięcia.
- Po faktycznym ukończeniu Ratusza strzałka wskazuje nowy poziom. Po ukończeniu Latarni wskazuje szczęście 100% oraz rzeczywisty czas premii. Nie przyznajemy premii za samo zlecenie budowy.
- Dom, Kaplica i atrakcje wskazują rzeczywistą zmianę szczęścia lub otrzymany efekt. Przy zaokrągleniu średniej albo już aktywnym 100% nie obiecujemy pozornego wzrostu ponad limit.
- Informacja o efekcie nie przerywa aktywnej minigry, tutoriala lub odbioru nagrody. Najpierw rozliczana i pokazana jest nagroda, następnie objaśnienie skutku.
- Komunikat nagrody brzmi: **„Nagroda została dodana do Twoich zasobów. Kliknij »Dalej«, aby przejść do kolejnej lekcji.”** Usuwamy mylące zdanie o dodatkowej skrzyni.
- Zakończenie 25 lekcji wyraźnie pokazuje **„Samouczek ukończony!”** i informację, że gracz wyznacza dalszy kierunek rozwoju wyspy. Nie oznacza to resetu ani ponownego odblokowywania działań już dostępnych podczas nauki.

## Stabilna chmurka nad rozbudowywanym budynkiem

Chmurka pokazuje etap dostaw, budowy lub konkretną przyczynę oczekiwania. Przy niezmienionym stanie nie przeskakuje co 2–3 sekundy między poprawnym czasem a „Niedostępne”. Prognoza nie może mutować świata, wydawać zasobów, kończyć budowy ani zależeć od przypadkowego budżetu czasu procesora.

Jeśli zmienia się rzeczywista obsada, priorytet lub dostępność ładunku, wskazanie aktualizuje się zgodnie z nową sytuacją. Stabilność nie oznacza utrzymywania nieprawdziwego, zbyt optymistycznego terminu. Nieznany czas ma czytelną przyczynę, np. tragarze w drodze lub brak obsady.

## Globalne dojście i powrót pracowników

**Dojście z Domu do miejsca pracy trwa 120 sekund, a powrót do Domu także 120 sekund.** Reguła obejmuje wszystkich, również pierwszych sześciu tragarzy; zastępuje ich wcześniejszy parametr 20 sekund oraz zwykłe 5 minut dojścia. Pracownik rozpoczyna pracę po dotarciu i staje się ponownie dostępny po powrocie.

Tragarz odwołany z ładunkiem kończy już rozpoczętą dostawę i dopiero wraca. Powrót trwa 2 minuty; to nie jest skrócenie samego rejsu lub kursu towarowego do2 minut. Zwykła bazowa trasa towarowa oraz ustalone zegary turbo budowy są odrębnymi mechanikami. Ładunek, rezerwacje i rozpoczęte zlecenia zachowują swoją tożsamość i nie są przyznawane ponownie.

Nowy tekst okna wycofania tragarzy:

> Tragarze są w trakcie transportu towarów. Muszą zakończyć dostawę, która już jest rozpoczęta. Następnie wrócą do Domu. Czas powrotu do domu to 2 min.

## Ratusz, łóżka i codzienne szczęście Domu

Ratusz określa limit ludności, a Dom liczbę miejsc do zamieszkania. Interpretacja wdrożeniowa obejmuje naturalne przybycia, zaproszenie mieszkańca, uratowanych rozbitków i przewóz pasażerów: respektują limit Ratusza oraz rezerwacje, natomiast brak łóżka powoduje nowe konsekwencje zamiast blokady przyjęcia. Nie jest to dodatkowa dosłowna odpowiedź użytkownika ani zmiana ceny zaproszenia. **Ratusz 2 i Dom 1 pozwalają mieć 48 mieszkańców przy 24 łóżkach.** Brak łóżek nie obniża limitu Ratusza ani nie usuwa nadmiarowych mieszkańców.

Potrzebny jest stabilny przydział łóżek do konkretnych osób. Parametr wykonawczy: pierwszeństwo mają wcześniejsi mieszkańcy według stabilnych identyfikatorów; zmiana obsady, otwarcie okna lub wczytanie zapisu nie losuje ponownie zakwaterowania. Łóżko pozostaje miejscem zamieszkania także wtedy, gdy jego mieszkaniec jest w pracy lub w drodze.

Codzienna pula i dystrybucja szczęścia Domu dotyczą osób posiadających miejsce w Domu. W przykładzie 48/24 uwzględniamy 24 zakwaterowane osoby, nie 48. Punkty pojedyncze, „Daj wszystkim”, odnowienie oraz końcowe automatyczne rozdanie respektują ten sam zbiór. Dotychczasowe ograniczenia nowo przybyłych i osób z wymuszonym 100% pozostają niezależne.

Rozbudowa Domu nie dopisuje drugiej puli tego samego dnia. Nowa liczba zakwaterowanych wyznacza pulę przy następnym odnowieniu o północy Warszawy. Migracja starej puli uwzględnia już wydane punkty, aby nie zwracać ich przez wczytanie zapisu.

Mieszkańcy bez miejsca w Domu **zużywają dwa razy więcej żywności**, a ich praca ma **połowę wydajności**. Interpretacja obejmuje własną produkcję oraz pracę przewozową danego mieszkańca, bez spowalniania zakwaterowanych osób. Przy48 mieszkańcach i 24 łóżkach bazowy popyt wynosi 72 żywności/h: 24 × 1 + 24 × 2. To zapotrzebowanie przed odrębnymi efektami gospodarki. Nie podwajamy zużycia wejściowego materiału na każdą wytworzoną sztukę.

**Doprecyzowanie użytkownika:** nowe konsekwencje braku miejsca **zastępują** dawną globalną karę szczęścia −1 p.p./h dla wszystkich za każdą osobę bez łóżka. Nie kumulujemy obu reguł mieszkaniowych i nie dopisujemy nowej indywidualnej kary szczęścia. Głód, bezrobocie, rzeczywisty przestój, powitalne minimum i wymuszone 100% pozostają niezależne.

Nowy rejs pasażerski zachowuje czas 30 minut, pojemność 100 osób oraz brak opłaty w monetach. Zwykłe posiłki na rejs ustalamy według zakwaterowania w chwili odpłynięcia: **0,5 żywności na osobę z łóżkiem i 1 żywność na osobę bez łóżka**. Miejsce docelowe sprawdza wolny limit Ratusza z rezerwacjami pasażerów; nie wymaga dodatkowego wolnego łóżka. Stare zapisane rejsy zachowują opłacone wcześniej posiłki i zegary, bez ponownego pobrania żywności lub przeliczenia według obecnego Domu.

## Latarnia jako motywator i misje 8/5/3

Latarnia jest jednym z głównych celów gry i motywuje do rozwoju całej osady: produkcji, budynków, dostaw i mieszkańców. Narracja jest pozytywna. Ukończony etap przynosi niewielką nagrodę i wskazuje dalszy cel. Zakończenie rozbudowy musi odpowiadać faktycznemu stanowi budynku oraz rzeczywiście należnej premii.

Przyjęty układ:

1. Główna misja ma 8 zadań na poziom wyspy.
2. Niepowodzenie zadania 4/8 otwiera 5 pomocniczych. Po ich ukończeniu gracz przechodzi do 5/8, z zachowaniem wcześniejszego postępu.
3. Niepowodzenie pomocniczego 2/5 otwiera 3 ratunkowe. Po ich ukończeniu wraca do 3/5 pomocniczych; dopiero zakończenie pomocniczych przywraca misję główną.
4. Po naprawieniu ostatniego 8/8 kończy się rozdział; nie tworzymy 9/8. Analogicznie ostatnie 5/5 nie przechodzi do 6/5.

Parametry wykonawcze zatwierdzanego projektu, wybrane do integracji:

- Każde aktywne zadanie ma własny termin. Powrót do kolejnego etapu uruchamia jego termin; nie pozostawiamy gracza pod już wygasłym wspólnym zegarem.
- Nieudany etap ratunkowy można ponawiać z zachowaniem wcześniejszych zaliczeń. Nagroda za ten sam etap jest jednokrotna.
- Ostatni pomocniczy/ratunkowy etap rzeczywiście domyka naprawiany cel. Samo odtworzenie opisu nie buduje Latarni i nie przyznaje jej premii.
- Rozdział odpowiada poziomowi Ratusza, zapamiętanemu przy aktywacji. Awans Ratusza nie przeskakuje rozpoczętego rozdziału.
- Pierwszy rozdział udostępniamy przy Ratuszu≥2 po ukończeniu samouczka albo jego świadomym zamknięciu. Zapamiętujemy następny poziom Latarni w chwili aktywacji; typowy absolwent ma już Latarnię 1 i otrzymuje cel Latarni 2. Spełnione wcześniej warunki budynków są uznawane. Misje nie blokują klasycznej rozbudowy Ratusza/Latarni, co usuwa cykl zależności z istniejącymi 25 lekcjami.

Ostatni punkt jest wyborem integracyjnym, a nie nowym dosłownym poleceniem użytkownika. Nie narusza istniejącego startu czasu, zapisanych starszych kursów ani historii nagród. Opisy i UI powinny jasno wskazywać rzeczywisty docelowy poziom.

W bieżącej implementacji statek z plagą jest **zdarzeniem narracyjnym** prowadzącym do ścieżki wsparcia. Nie nakłada osobnej choroby, strat mieszkańców ani kary produkcji. Dotychczasowa plaga związana z zaniedbaniem Kaplicy działa według swojej wcześniejszej reguły; misje jej nie zastępują ani nie uruchamiają drugi raz. To granica wdrożonej narracji, a nie potwierdzenie nowego mechanizmu epidemii.

## Wykonalność wszystkich zadań

Przed rozpoczęciem zadania sprawdzamy jego wykonalność. **100 sztuk w magazynie +10/h przez 2 h daje najwyżej 120 sztuk przed transportem, więc wymaganie 300 sztuk/2 h jest niedopuszczalne.** Generator dostosowuje ilości nowych zwykłych zadań, a misje wybierają dostępny termin lub pozostają ofertą do przygotowania. Niewykonalnej w ocenie planu oferty nie można rozpocząć.

Parametry wykonawcze są jawne: aktywny etap ma termin od **600 sekund do 7 dni**. Dla nowych celów produkcji lub dostaw ocenę rozpoczynamy od **6 godzin**, następnie sprawdzamy 12 godzin, 1 dzień, 2 dni i 7 dni. Inne cele mogą użyć krótszych terminów. Do szacunku rzeczywistej budowy doliczany jest zapas 25%; cały termin nadal musi mieścić się w 7 dniach. Nie oznacza to, że każda misja trwa 6 godzin lub że limit jest wspólny dla wszystkich 8 etapów.

Ocena korzysta z konserwatywnego planu opartego na obecnych zapasach i istniejących mieszkańcach. Wspólnie budżetuje materiały, wsady, żywienie, pojemność, istniejące rezerwacje, obsadę i transport; uwzględnia 120-sekundowe dojście/powrót, trwające kursy, nieobecność oraz obniżoną wydajność. Może wymagać odwołania i przeniesienia obsady. Nie zakłada nowych imigrantów, losowych nagród, handlu, płatnego przyspieszenia ani przyszłych bonusów jako warunku sukcesu.

To **plan zachowawczy, nie pełny solver strategii**. Dzieli produkcję i dostawy na etapy, używa ostrożnych współczynników i może odrzucić zadanie, które doświadczony gracz wykona inną strategią. Nie dowodzi optymalności czasu, osiągalności każdej przyszłej rozbudowy ani powodzenia po dowolnym późniejszym wydaniu zasobów czy zmianie obsady. Celem jest niewymaganie ścieżki, której wskazany plan nie potrafi uzasadnić, a nie obietnica automatycznej realizacji za gracza.

Reguła dotyczy misji głównych, pomocniczych i ratunkowych oraz nowych zwykłych zadań Latarni. **Przyjęte ilości, cel i deadline pozostają stałe**; zapis/odczyt lub późniejsze pogorszenie gospodarki nie przelicza ich wstecz. Dostawa faktycznie zużywa wskazany towar, a cel zgromadzenia zapasu nie pobiera go po raz drugi. Zaproszenie mieszkańca nie staje się zakupem wyłącznie za monety bez osobnej decyzji cenowej; aktualna pełna cena w sześciu zasobach pozostaje punktem odniesienia.

## Trwałość, zakres testów i publikacji

- Schemat świata 9 pozostaje rozdzielony od wersji aplikacji 0.11.0.0. Nowe, opcjonalnie normalizowane pola nie resetują wysp, UID, haseł, nazw, nagród ani rozpoczętych dostaw.
- Odbiór obejmuje model, naliczanie offline, polską/angielską wersję i rzeczywiste kliknięcia na komputerze/telefonie. Wznowienie/replay nie podwaja nagród ani zadań.
- Każda grupa ma osobną kartę zmian i osobne ręczne przypadki. Wyniki ręczne pozostają NOT RUN do rzeczywistego wykonania; automatyzacja ich nie zalicza.
- Nowy kod wymaga własnego SHA/CI i publikacji podglądu DEV. Dawne 954 Node / 141 Python / 22 Chromium z 0.10.2.0 nie są wynikiem tej paczki. Nie zmieniamy starych tagów.
- PRE-PROD/PROD, prawdziwe przelewy/płatności/reklamy oraz reset kont pozostają poza nowym GO.

Przypadki ręcznego odbioru tego zakresu: **HL-TC-0060–0070**, w [planie testów](testing/MANUAL-TEST-PLAN.md) i [liście do odhaczania](testing/qa-checklist.html). Rejestr zawiera 296 kart zmian, a lista 70 przypadków ręcznych nadal ma wynik **NOT RUN**. [Walidacja 0.11.0.0](DEV-0.11.0.0-VALIDATION.md) potwierdza lokalnie **1017 Node, 141 Python i 27 nazwanych zestawów Chromium PASS** po poprawkach i kierunkowych ponowieniach. Własny końcowy SHA, CI i Pages wymagają osobnych dowodów.

Końcowy przegląd wykonalności uwzględnia pełny czas kolejki (`completionTotal`). Brak skończonego harmonogramu dostaw blokuje przyjęcie celu budowy nawet przy gotowych materiałach. Przydział wymaga wystarczającej obsady lub wolnej osoby rzeczywiście w Domu; modlitwa i zwiedzanie Latarni nie tworzą dostępnego pracownika. Te osoby nie wchodzą też do planowanej załogi produkcji. Oferta czeka na przygotowanie obsady, a rozpoczęty termin pozostaje stały.

Niepewne potwierdzenie zapisu wymaga odczytu chmury przed wznowieniem. Sukces jednego zapisu podczas równoległego błędu aktywności nie może pozostawić zatrzymanego koordynatora z mylącym stanem „zapisano”. Odzyskiwanie zachowuje potwierdzony stan i kontrolę wersji; nie tworzy nowej wyspy ani nie nadpisuje nowszej historii innej karty.
