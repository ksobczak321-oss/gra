# Doradca Królestwa — GO development, 17 listopada 2026

Użytkownik zatwierdził wdrożenie na DEV doradcy w lewym dolnym rogu i rozmowy o celach rozwoju wyspy. Doprecyzował uproszczenie pierwszego tutoriala: **górny pasek → dolne menu → jeden budynek produkcyjny (Gospodarstwo)**.

Wersja aplikacji 0.15.1.0. Cały graf modułów ma cache `frontend-v32-15`, aby przeglądarka pobrała również nowe zatwierdzone teksty i zachowała jeden runtime modeli. Schemat świata9 i ruleset32 pozostają bez zmiany.

Doradca wyświetla pojedynczą wskazówkę o jedzeniu, obsadzie, produkcji lub transporcie. Rozmowę i wskazówki można zamknąć albo wyciszyć. Pole tekstowe rozpoznaje polskie nazwy budynków, towarów oraz pytania o pracowników, wyżywienie i priorytety. Planer działa lokalnie według zasad gry; przy nierozpoznanym pytaniu prosi o konkretny cel. Nie wymaga usług AI lub kluczy.

Plan rozbudowy korzysta z rzeczywistych kosztów, rezerw, lokalnych zapasów, transportu, odblokowań i obsady. Wspólna księga zapasów zapobiega podwójnemu wykorzystaniu materiału na budowę i produkcję. Proponowane przydziały nie przekraczają wolnych osób i miejsc pracy. Czas jest szacunkiem istniejącego modelu dopiero przy spełnionych warunkach; doradca nie obiecuje matematycznie najkrótszej drogi. Opcjonalna usługa za monety ma oddzielną rzeczywistą wycenę.

„Pokaż, gdzie” otwiera istniejący ekran, rozwija właściwą sekcję i podświetla miejsce. Doradca nie zatrudnia, nie zmienia priorytetów i nie zleca budowy za gracza. Wpisy, cel i wyciszenie żyją w pamięci bieżącej karty; brak zapisu wyspy lub rozmów do pamięci przeglądarki.

Pierwsze oprowadzanie jest skrócone do trzech przystanków. Adapter zapisuje dotychczasowe stabilne pozycje, zachowując zatrzymanie zegara, potwierdzenia chmurowe i możliwość wznowienia. Pełny katalog 56 opisów i 25 lekcji pozostaje w Pomocy. Kurs praktyczny uruchamia się świadomie; nie otwiera się automatycznie po krótkim wprowadzeniu. Zachowano historię działań i nagród.

Ta publikacja obejmuje DEV, Git i podgląd Pages. **Nie autoryzuje promocji doradcy na PRE-PROD lub PROD.** Nie resetuje kont, nie zmienia haseł ani DNS. Wcześniejsza naprawa bootstrapu minigier08e ma własne zielone CI44096593096; pierwszy nieudany PRE-PROD44093734171 pozostaje w historii i nie jest odbiorem doradcy.

Dowody: [raport](KINGDOM-ADVISOR-EVIDENCE.json), [HL-CHG-1159](../tracking/changes/HL-CHG-1159.md). Status przygotowanego kodu, CI i publicznego DEV należy czytać osobno.

## Uzupełnienie: pięć fioletowych zakładek

Kolejny upload ABC(1), SHA2560253226de2712d22d5ab28098a40931f02e8be652089b0c3fcbd343b459037a7, wskazuje pięć fioletowych zakładek: Samouczek33, Produkty i receptury16, Badania16, Odłożone odkrycia10 i Nazwy poziomów Latarni100. Odczytano175wierszy;34ma niepusteC. Poprawiono35istniejącychtekstów i dodano10rekordów katalogu. Jasnofioletowy motyw7/tint0.6 ma bazę8064A2; jego zakładka była złota w poprzednim pliku, więc również jest oznaczeniem przeglądu. Nie analizowano treści innych zakładek tego uploadu.

C zastępujeB, a pusteC zatwierdzaB. Komentarze redakcyjne rozwiązano jawnie w [MERGE](EDITORIAL-PURPLE-TABS-MERGE.json): konkretne produkty Gospodarstwa zamiast „kierunków”, dokładny wybór adepta i nauczyciela, wolne miejsce w magazynie lokalnym, poziom badania zamiast poziomu budynku. Ukośniki i znaki zapytania nie są tekstem interfejsu. Nazwy Latarni16/18/19/46 to teraz: Dzwon przeciwmgłowy, Wieża nad wybrzeżem, Promień dalekiego zasięgu, Strażnica na każdą pogodę. Wzmianka o niewdrożonych otrębach nie tworzy nowej receptury. Usunięte „Więcej o budynku” zastąpiono istniejącym przyciskiem „Priorytety transportu”, a „Kup rozbudowę” — „Kup pakiet budynku”.

Zmiany dotyczą prezentacji: receptury, poziomy, koszty, warunki i nagrody pozostają zachowane. Opisy produktów są rzeczywiście rozwijane w ekranach produkcji i wyżywienia; opisy badań są w katalogu i komunikacie zakończenia. Osiem instrukcji uzupełniających podłączono do właściwych ekranów. Cały graf modułów otrzymuje cache15, a dokumentacja minigier jest odtworzona z tych samych reguł dla nowego odcisku źródła. To nadal jedna publikacja wyłącznieDEV. [HL-CHG-1160](../tracking/changes/HL-CHG-1160.md).

## Pierwsza publikacja70d i poprawka kopii API

Źródło70d9ed4deebfdfe80fecaf6cdda5c96e14b5f3b9: Pages44141263907SUCCESS36s. Odczyt229publicznychplików/36877692bajtów z normalnymTLS odpowiada Git i modelowi pakietu. Samodzielny natywny Chromium zatrzymał się na ERR_CERT_AUTHORITY_INVALID; nie ignorowano certyfikatów i nie deklaruje się natywnegoPASS. Lokalne odtworzenie opublikowanych bajtów jest osobnym dowodem.

CI44141264184 ma FAILURE2m45s: frontend1474/1474PASS152922ms, następnie kanoniczny stage odrzucił niesynchronizowane kopie API. Pozostałe etapy pominięto; nie jest to pełny zielonyCI. Poprawka odtwarza dokładnie trzy zamknięte kopie istniejącym skryptem. StageCHECK3, pakiet2 i backend170PASS; nie osłabiono bramek, zależności ani testów. Nowy master, własnyCI i odbiór nowego źródła pozostają wymagane. [HL-CHG-1161](../tracking/changes/HL-CHG-1161.md).


Dziesięć opisów z jasnofioletowej zakładki nie tworzy nowych mechanik: siedem projektów pozostaje odłożonych. Działające już ser, kredyt i badania pojedynczych tras używają zatwierdzonych opisów. Przy „Kamień, woda i światło” wyjaśniono, że chodzi o nowe wyglądy fontann, rzeźb i lamp; konkretna lista wariantów wymaga dalszego ustalenia. Nie zmieniono kosztów, progów ani liczby aktywnych odkryć. Kandydatcache15 ma ponownie zsynchronizowane trzy kopie API przed zamrożeniem źródła.

## DEV553 i poprawka testów R3

DEV553/cache15 jest opublikowany: Pages44148037993 SUCCESS29s; 229plików/36 878 716bajtów odpowiada Git przez normalnyTLS. CI44148037986 pozostaje FAILURE na starym oczekiwaniu automatycznego pełnego tutoriala, po1475frontendPASS i170backendPASS; dalsze grupy pominięto. Poprawiono tylko trzy scenariusze testowe, zachowując pełne asercje i rzeczywiste wejście przez Pomoc. Lokalne18pozostałych programówv32 PASS; własny nowyCI R3 oczekuje. PierwszyCI44141264184 również pozostajeFAILURE. NatywnyChromium ma ograniczenie certyfikatu bez obchodzeniaTLS; odtworzenie opublikowanych bajtów lokalniePASS. **TylkoDEV: bez PRE-PROD, PROD, resetu i DNS.**

R3 nie zmienia publicznych plików aplikacji ani117źródeł mastera. Editorial-six-tabs przechodzi na1672/1366/390 z20budynkami,19długimi opisami, zamrożonym światem i0zapisów. Dom/lekcja14 oraz pełna trasa56kroków wraz z naturalną budową przechodzą PL/EN desktop/mobile po jawnym wznowieniu kursu w Pomocy. [HL-CHG-1162](../tracking/changes/HL-CHG-1162.md).

## R3: rzeczywiste zasłonięcie Magazynu i kandydatR4

KandydatR4 ma węższą kartę doradcy na telefonie, aby można było kliknąć wyśrodkowany Magazyn także po odświeżeniu wskazówki. Fizycznekliki1672/1440/390/320 i rozmowa1440/390/480/klawiatura350 PASS. Grafmodułów nadal `frontend-v32-15`; tylkoCSS ma rewizję `frontend-v32-15-layout2`. Master iExcel6 odtworzono z `76a663da9e093d909e6289286649c5c925139614`: 157arkuszy/61971bieżącychwierszy/117źródeł;6arkuszy/413wierszy/pustaC. R3e033 ma Pages44154508829SUCCESS24s, aleCI44154508808FAILURE na rzeczywistym nakładaniu karty, po1475frontend+170backend+7physicalPASS. Dwie wcześniejsze porażkiCI również zachowane. Nowy własnyCI/Pages R4 oczekuje. NatywnyHTTPSChromium ma ograniczeniecertyfikatu bez obchodzeniaTLS; publicznebajty wcześniejszej publikacji odtworzono lokalnie. **TylkoDEV: bezPRE-PROD,PROD,resetu iDNS.**

W izolowanej grupieLiveCAS+cloud16/18przeszło od razu. Dev-game wymagał zwykłego zamknięcia oferty, a settings-signout aktualnego literału wersji; po poprawkach te dwa scenariuszePASS. PierwotneFAIL i dokładny zakres ponowień pozostają zachowane. WłasnyCI R4 musi ponownie objąć wszystkie69programów. [HL-CHG-1163](../tracking/changes/HL-CHG-1163.md).
