# Audyt implementacji DEV v32: R01–R59

Stan roboczego kodu z14listopada2026. To mapa wymagań do kodu i dowodów, nie protokół odbioru PRE-PROD. Źródła: `docs/FRONTEND-V32-REQUIREMENTS.md`,47odpowiedzi z `docs/v32/USER-DECISIONS.json`, rejestr R01–R59 w `/workspace/work/editorial/data.py`, najnowsze GO DEV w `AGENTS.md`. Historyczne adnotacje „niewdrożone/bez developmentu” w materiałach źródłowych nie zastępują późniejszego GO.

„Kod + test” oznacza test zachowania silnika lub integracji. Nie oznacza ręcznego odebrania każdego ekranu ani zatwierdzonego balansu. Dla obszarów innych agentów poniżej wskazano ich pliki/testy; końcowy wspólny przebieg i odczyt raportu testów pozostają zadaniem odbioru roota.

Skróty dowodów:

- **P**: `harborlight-v1-provisions.js`; `tests/harborlight-v32-provisions.test.mjs`.
- **L**: `harborlight-v1-development-logistics.js`, `harborlight-v1-logistics.js`, `harborlight-v1-inventory.js`; `tests/harborlight-v32-logistics.test.mjs`.
- **E/M**: `harborlight-v1-education.js`, `harborlight-v1-military.js`, `harborlight-v1-housing.js`, `harborlight-v1-residents.js`; `tests/harborlight-v32-people.test.mjs`.
- **W**: `harborlight-v1-state.js`, `harborlight-v1-development.js`, `harborlight-v1-archipelago.js`; `tests/harborlight-v32-world-integration.test.mjs`.
- **K**: `harborlight-v1-kingdom.js`; `tests/harborlight-v32-kingdom.test.mjs`; `docs/v32/KINGDOM-CONTRACT.md`.
- **DEV API**: `backend/dev-runtime.mjs`, `scripts/serve-dev.mjs`, lokalny adapter; `tests/harborlight-v32-dev-runtime.test.mjs`; `docs/v32/DEV-RUNTIME.md`.
- **G**: `harborlight-v1-original-puzzles.js`, wspólny `harborlight-v1-expedition-hour.js`, kod prób etapowych/przygód; `tests/harborlight-v32-original-puzzles.test.mjs` i testy przeglądarkowe minigier.

| Reguła | Kod i dowód zachowania | Zakres potwierdzenia / pozostały temat |
|---|---|---|
| R01 Start i populacja | W `createState(...,{ruleset:32})`; housing36L; root populationRate×1,5; test pierwszego stanu W. |18osób,36L Ratusza/Domu. Nie jest to wynik50-dniowej symulacji. |
| R02 Siedem powitań | W `claimWelcomeWorker`/pending, zegar Warszawy i deadline24h; zachowane stare testy welcome. | Oczekujący ma osobny termin; brak łóżka nie blokuje wolnego Ratusza. Wspólny odbiór UI jeszcze wymagany. |
| R03 Nowe budynki | P `NEW_BUILDINGS`, W `settleDevelopment` i tworzenie poziomu1; testy progów P/W. | Próg1/2/4 odblokowuje budynek; rozbudowa pozostaje pod limitem Ratusza. |
| R04 Gospodarstwo | P `availableRecipes`/`productionAssignments`; L realne równoległe cykle i osobne bufory. | L1zboże/warzywa, L2żywiec/mleko, L6ser+odkrycie. Test rozdziału1+2pracowników i reloadu połowy cyklu. |
| R05 Receptury spożywcze | P `RECIPE_CATALOG`; L kompletny cykl ze składników dostarczonych kursem. |4→1mąka,4→1chleb,4+2→1ciasto,4→1pasteryzowane. Bazowe ciasto bez badania (decyzja11). |
| R06 Osobne procesy Rzeźni | P `meat` i `leather`; L test atomowości2żywca→2mięsa przy limicie. | Nie działa dawny wspólny proces4→2+1. |
| R07 Stroje i szaty | P receptury4/8/8skór; E/M koszt nominacji/treningu i wyposażone dary. | Szaty automatyczne przy Akademii (decyzja12); sprzęt specjalisty nie zużywa cywilnego stroju. |
| R08 Świeżość mleka | P partie `centralSeconds`; L lokalne, kurierskie, targowe i portowe metadane; testy72h/wyjazdu/reloadu. | Tylko czas centralny się sumuje; transport i lokalny bufor nie odmładzają. Host przekazuje `stockRoom` dla utraty nadmiaru kwaśnego mleka. |
| R09 Ser | P `farmCheese`4kwaśne→1ser, sytość12; odkrycie E. | Farma6 i odkrycie, bez Akademii6. Brak producenta kwaśnego mleka dla trasy omijającej centralę. Koszt odkrycia oznaczony propozycją DEV. |
| R10 Sytość | P `GOODS`, `mealStatus`, `feedResidents`; housing potrzeba6/os./h i×2bez łóżka. | Dzielenie proporcjonalne i wartości wszystkich produktów są testowane. Żywiec/skóra nie są jadalne. |
| R11 Dieta | P `dietStatus`/`dietPenalty`, historia realnych posiłków24h, próg20%; P test ochrony24h i progu Ratusza. |1/2/3rodzaje od1/3/8. Ochrona dla nowych i po wzroście wymagań (decyzja6). |
| R12 Głód | P pokrycie racji,0,5+0,5pokrycia, głód równoważny i reset po1h; E/M/ housing używają mnożnika osoby. | Test24h połówek racji→12h głodu i pełnej godziny powrotu. Mnożniki nie są dublowane globalnie. |
| R13 Wydawanie/rezerwa | P ustawienia jednorazowych ilości, awaryjne wyłączone typy; inventory chroni1h sytości+różnorodności. | Wyjątek limitu ilości tylko przy jedynym pozostałym jedzeniu (decyzja4). P/L testy ochrony, limitów i reloadu. |
| R14 Obsada | P `crewCapacity`12L[1+0,5(N−1)],12L/kierunek; W limit i normalizacja. | P/L testy całkowitych osób i braku powielania; W obejmuje zachowanie Farmy L2po reloadzie. |
| R15 Magazyny lokalne | P `localStorageStatus`; L bufory ze składnikami i rezerwacją cargo. |200L/towar,300Lłącznie. Pełny wynik blokuje całą recepturę; inne kierunki mogą działać. |
| R16 Magazyn centralny | Economy `warehouseCapacityPlan`/`warehouseCapacityForLevel(...,{ruleset:32})`; L liczy wszystkie20towarów. | Wzór40%obejmuje proponowane budowy/misje/dobę jedzenia. Konkretna tabela jest propozycją DEV; brak pełnej symulacji balansu. |
| R17 Transport | L kursy `producerInput`, `producer`, `directRoute`; `developmentRoute`, `directRouteWorkers`; E odkrycie dokładnej trasy. | Magazyn5,≤połowa załogi na trasę i≥1ogólny; odbiorca rezerwuje miejsca dla cargo. Test zwykłego odbioru nadmiaru obok zapełnionej trasy. |
| R18 Akademia/profesor | E `educationAction`, founding gifts, E/M housing/work; W test daru4+4 tylko matce. | Limit3+L stanowisk oddzielony od łóżek; profesor cywilny0,5bazowej wydajności. |
| R19 Kurs cywilny | E kurs, zamrożona opłata10L i⅓budowy, tax/occupation hooks; E/M/W testy końca na granicy i jednej opłaty. | Ręczne anulowanie traci postęp/opłatę; wymuszone odejście profesora zachowuje proces (decyzje18/19). |
| R20 Absolwent | E `educationWorkMultiplier`, `highestAcademyLevel`, `educationHappiness`; E/M/W testy migracji. |100na7dni; mnożnik maxAkademii×(1+0,05kolejnych rund+badania). Nie przyspiesza samych kursów. |
| R21 Rundy | E lokalny cohort i eksport/import osoby; W test nadrabiania rund po migracji/reloadzie. | Postęp należy do UID, lista źródła usuwa wyjeżdżającego; nowi nadrabiają4/5po3rundach. |
| R22 Wiele badań | E `researchQuote`/actions/advance; E/M test podziału, min1profesora, pauzy i anulowania. | Rozbudowa nie wyłącza Akademii. Opłata i postęp zachowane po wymuszonej utracie prowadzącego. |
| R23 Czas badań | E `RESEARCH_TIME_SECONDS`1800…259200 i liczba profesorów/indeks wyspy; E/M testy. | Jedzenie i łóżka spowalniają; nominalne72h oznacza nakład1profesora. Tabela nie dowodzi kalendarza50dni. |
| R24 Odkrycia i badania | E `RESEARCH_CATALOG`, N², maxAkademia, odkrycia produktów/tras. | **Świadomie odłożona sieć wzmacniana skórą**: źródło `data.py:358` nie ustala ilości skór, liczbowego efektu ani progu; decyzja13nakazuje odłożyć niepełne. Zwykłe+5%Rybaka nie udaje tej sieci. Dalsze ciasta też czekają na komplet receptur. |
| R25 Wyłączność karier | E/M kontrola ukończonego kursu, szkolenia i nominacji; test E/M. | Cywil po Akademii nie wchodzi do Koszar; żołnierz nie wchodzi do Akademii; brak dobrowolnej rezygnacji z profesji. |
| R26 Koszary | M łóżka4+2(L−1), founding four, gotowy instruktor; E/M/W testy. | Rekrut zostaje w Domu; nadmiar gotowych może mieszkać w Domu. |
| R27 Trening żołnierza | M3stroje,⅓samej budowy, podatek/posiłek/przerwanie; W test pobrania raz i połowy racji. | Przerwanie nie oddaje strojów/postępu; potrzeba całej opłaty ponownie. |
| R28 Żołnierz | M/housing/residents:100stałe,0,5praca cywilna, wyprawa poza populacją, odpoczynek. | Finansowy offset pozostaje wyjątkiem; stan na statku/wyprawie nie uruchamia daru ratunkowego. |
| R29 Oficer | M koszt8strojów+250+50(TH−4), czas3×budowa ograniczony4…72h; E/M test. | Osobny instruktor oficer; nie pomija gotowego żołnierza. |
| R30 Nominacja i łupy | M persistowane rozstrzygnięcie, nominacja20%, festyn10/6h, bonusy25%+5pp. | Szanse/ukryte czasy nie są tekstem gracza. Konkretne skale łupów to parametry DEV do symulacji. |
| R31 Wyprawy | M wysłanie gotowych, wynik/czas zapisany,1…96h, częściowy jednoosobowy75%,24h odpoczynku; E/M testy. | Zegar działa offline; otwarcie gry nie losuje ponownie. Nie jest to analiza prawdopodobieństw pełnej ekonomii. |
| R32 Powrót i pełne budynki | M waiting queue i deadlines, darmowe Koszary; E/M/W test oczekujących. | Oczekiwanie poza populacją i96h/konieczny poziom Ratusza (decyzja20), potem24h; odpoczynek zaczyna dopiero przyjęcie. |
| R33 Ratunkowi specjaliści | M accountwide counters i transit/away/rest; W test niepowielania profesorów i wojska. | Dar tylko gdy rzeczywisty brak kadry na koncie; ratunkowy profesor nie oddaje nagrody zadania (decyzja22). |
| R34 Oferty Królestwa | K harmonogram aktywnego dnia Warszawy, max1/h,1/5wojskowa, building gate/portfolio; DEV API transakcje. | Parametry wielkości ofert i szacunki przygotowania są propozycjami DEV. Nie wstecznie za każdy dzień nieobecności. |
| R35 Terminy | K24h oferta,2×przygotowanie min6h, osobny zegar wyprawy; K testy i idempotentne API. | Przed przyjęciem status pokazuje deadline; wykonalność wymaga balansu opisanych łańcuchów. |
| R36 Zaproszenie sojuszu | K≤5osób,2h,≤50%wartości wraz z wpłatami, zamrożona wycena; DEV API konta. | Indywidualne depozyty/rozwój; ratunkowy profesor wyłączony. Decyzja27nie pozwala ukryć60wpłaconych+10posiadanych. |
| R37 Wspólne zadanie | K czas/N, pełny cel i pełna nagroda/kara dla każdego, roster lock/maxN; DEV API jedna transakcja. | Testy pojedynczej wypłaty, pozostania po reloadzie, zablokowanego leave/kick. Wpłaty po porażce przepadają. |
| R38 Windykacja | K20%/10%/72h wspólny cooldown,150%zobowiązań, centralne dobra najliczniejsze i rezerwa; K testy. |200monet braku→−1; tylko lokalna Latarnia odracza. Cena produktu z P, a nie koszt per-sztuka po zaokrągleniu. |
| R39 Finansowanie Królestwa | K3%/24h,12…96h,3oczekujące; kapitał według wpłacających i pełne nagrody; API test. | **Granica DEV**: klientowska gospodarka w autosave ujawnia netto, nie każde historyczne zużycie; pochodzenie monet śledzone konserwatywnie. Częstość dodatkowego daru10% i skala to propozycje DEV. |
| R40 Pożyczka od Królestwa | K TH5+royalCredit, limit majątku/TH,70%, retry24h,5%linear,1…28dni, automat i ban28dni. | K testy częściowej spłaty, wartości i terminów. Koszt samego odkrycia to propozycja DEV. |
| R41 Umorzenie | K5zapisanych losowań10%, umorzenie całej reszty i blokada następnej; K test powtórzeń/reloadu. | **Decyzja30nie zatwierdza liczb**: próg10%poprzedniego kapitału+24h jest jawnie propozycją DEV. Przed PRE-PROD potrzebna analiza i akceptacja. |
| R42 Depozyt | K indywidualny, używalny centralny towar, automatyczny zwrot,150%braku; K testy. | Równoczesne wydatki przechodzą przez transakcje DEV API; zwykła gospodarka pozostaje klientowska. |
| R43 Stroje cywilne | P grant2razdlaTH≤3, startTH5,21dni; E/M wyjątek specjalistów; P test reloadu/nowej osoby. | Mleko/ubrania mają własne zegary; powrót osoby nie tworzy drugiego prezentu. |
| R44 Ceny i wyrzucanie | P `quoteGoods`, K `goodsValue`, L market/harbor/discard; DEV API ceny PvP. |125%składników, zakup1,5×, ceilcałejmonetarnejtransakcji; wymiana wartości−10%z floortowaru; discardmin1. L test2mięsa=8zakupu i6mięsa=2wyrzucenia. |
| R45 Budowa | Economy timing po `targetLevel`; L prógTH3→4=81, rezerwacje i ukończenie36L; W koszt fizycznego miksu. | Późniejszy spadek populacji nie blokuje opłaconej inwestycji. Czas/koszty wymagają symulacji ekonomii. |
| R46 Ratunek cywilów | G metadata `civilianRescue`, W grupa2×THstart i rozdzielone przyjmowanie; testy G/W. | Darmowe podejście bez obowiązkowej reklamy; brak obcięcia nagrody, oczekujący blokują nadmiar kolejnych ratunków. |
| R47 Archipelag | W sharedWallet, sumy towarów, dziedziczenieTH/Magazynu i inneL1; W test reloadu portfela i braku ponownych4+4. | Lokalne badania i kursy, highestAcademy z konta. Rzeczywisty wieloletni bilans monet nieprzebadany. |
| R48 Pasażerowie | W admission arrival, specialsfirst, overflowreturn/wait-home/redirection, capture/restore UID records. | W test nadmiaru, powrotu, rund i jednego długiego offline. Nie scalać z wojskową kolejką96h ani ratunkiem bez statku. |
| R49 Dar sojusznikowi | DEV API `/api/v1/gifts`, TH6,1/24h, shipcapacity, rezerwa, one-use receipts. | API test automatycznej dostawy/zwrotu i braku odnowienia limitu. Czas10min odziedziczony jako jawny parametr DEV; nie operator płatności ani PRE-PROD. |
| R50 Teatr | Theatre showquote/actions/advance/status; L porter guard; K/L testy. |45minplanu,10minshow,2monety/widz,10pkt/6h odnawiane. Lista/koszt zamrożone; produkcja i nauka działają; tragarz kończy kurs. Pełny zwrot za anulowanie przedstartem jest propozycją UX/DEV. |
| R51 Dekoracje | Theatre existing collection/freeplacement +32ad step3 i całowyspowybonuscap10; stare testy Teatru. |20miejsc/10typów/powtórzenia/indywidualne poziomy. Przelicznik0,05pkt/poziom jest propozycją DEV, nie zatwierdzonym bilansem. |
| R52 Przygody | G/journey oddzielne ledgerprzedmiotów, nagrody etapowe/finałowe,3×maxTH, zamrożenie etapu. | Stare ukończone etapy i receipts zachowane. Test silnika nie dowodzi150godzin różnorodnej treści; odbiór całej kampanii osobno. |
| R53 Trudność minigier | G expedition-hourv2 licznik pervariant/h, wzrost tylko win, alias solo/journey;3porażki hint/easier. | Wspólna jedna aktywna odmiana; solwery nowych oryginalnych plansz. Przekrój wszystkich starszych odmian wymaga wspólnego testu przeglądarkowego. |
| R54 Czas minigier | G próba etapowa:30s/5s popup, pausead/payment, ponowny downcrossing, min60s lub50%,10monet×maxTH. | Wyjście bieżącą próbą przegraną (decyzja40), wcześniejsze etapy zostają. Reklamy/płatności jedynie jawna symulacja/capability DEV, brak realnego operatora. |
| R55 Przyspieszanie nauki | E/M przyspieszenie min10%czasu/600s, natychmiast ceilpozostałeminuty; E/M test. | Dla badań cena po bieżącej obsadzie (decyzja43). Zweryfikowana reklama/capability, bez realnego dostawcy. |
| R56 Finansowy offset | K offset/recover/defer i E/M/residents protected happiness; K/E/M testy. | Dodatnie premie nie kasują salda, odbudowa pracą/jedzeniem; Latarnia odracza, nie umarza. |
| R57 Tutorial i kopia | Approved-copy tourv4 +developmentText, lessonCopy25, tutorial UI/learning, P/L warunki opisów. | Krótkie polskie teksty, warunkowa Farma/Ser/Szaty, smutna buźka osobno. Nowy Excel pozostawiaCzupełniepustą. Pełny odbiór redakcji należy do użytkownika. |
| R58 Historyczny zakaz | `AGENTS.md` bieżące GO DEV14XI, odizolowany lokalny runtime. | Reguła historyczna zastąpiona wyłącznie dlaDEV. Bez nowej promocji PRE-PROD/PROD i bez resetu kont chmury. |
| R59 Wyżywienie budowy | P `quoteConstructionFood`, editablemix, W zamiana staregofood×6na fizyczne dobra; L przewóz tych dóbr. | P/L test6food→36sytości, całość ponad rezerwę. WolneCwExcelunie oznacza zgody na wdrożenie PRE-PROD. |

## Ograniczenia wymagające oddzielnego odbioru

Nie ma dowodu pełnej50-dniowej kampanii ani150godzin gry. Stawki nowych receptur40batchy/h (mięso20×2), tabela pojemności, koszty pierwszych badań, wielkości próśb i łupów, przelicznik dekoracji oraz próg pomijanej pożyczki pozostają nazwanymi propozycjami DEV. Odpowiedź30wprost wymaga przedstawienia analizy przed promocją; testy mechaniki tej analizy nie zastępują.

Sieć wzmacniana skórą i dalsze nieopisane wypieki są świadomie odłożone zgodnie z decyzją13. Nie dopisano receptur lub skutków liczbowych bez źródła.

Lokalny serwer zapewnia trwały plik i transakcje dla Królestwa/handlu/darów. Zwykła gospodarka pozostaje symulacją klienta. Admin3przyspiesza swoją symulację, a wspólne zobowiązania kont używają rzeczywistego zegara serwera. Tego modelu nie należy nazywać pełnym autorytatywnym backendem świata ani wdrożeniem Firebase. Szeroki odbiór przeglądarkowy, kontrola załączonegoXLSX i wynik całego wspólnego test runu muszą mieć osobne dowody roota.

Własny przebieg obszaru P/L:116testów NodePASS w `/workspace/provisions-final.log` w lokalnym obszarze roboczym; w tym20provisions,23physicalintegration i73regresje logistyki/inventory. Log jest artefaktem lokalnej weryfikacji, nie częścią publicznej aplikacji. Późniejsze poprawki integracji wymagają odpowiedniego końcowego przebiegu.

## Odrębna analiza liczbowych propozycji DEV

Powstały `docs/v32/DEV-BALANCE.md`, `DEV-BALANCE.json` i `scripts/simulate-v32-balance.mjs`:100000 matematycznych wniosków,1000 rzeczywistych wniosków silnika,18 pojedynczych receptur z gotowymi składnikami i4przebiegi żywienia24h. Powtarzalny SHA JSON opisano w raporcie. To dowód wybranych własności, nie pełnego łańcucha transportu ani50dni. Raport wykazuje40,951%łącznego umorzenia oraz dodatni oczekiwany wynik krótkich pożyczek; pełne odsetki5członków i legalna konwersja pożyczonych monet w towary umożliwiają dodatni długoterminowy wynik przy dostatecznej dostępności ofert. Próg propozycji30usuwa szybkie symboliczne obejście, lecz nie inflację. Te wyniki wymagają świadomej oceny przed PRE-PROD; nie zmieniono po cichu zatwierdzonych szans ani pełnych nagród.

## Rzeczywisty zapis posiłków i maksymalnej populacji

Nowa historia diety scala następujące po sobie okresy o identycznym tempie posiłku; granicę24h odcina proporcjonalnie. Zapisowy klon używa `compactDietHistories`: wspólnych końcówek historii, krotek osoby i wspólnych profili, bez kasowania rzeczywistych zdarzeń. `normalizeProvisions`/`ensure` odtwarzają osobne mutowalne rekordy; pełne karmienie jest ograniczone do potrzebnego progu3600s. Testy obejmują720różnych kohort z tymi samymi100końcowymi okresami, niezależność odtworzonych osób i idempotencję kompakcji.

Pełny `tick`24h w rzeczywistym rdzeniu, z18osobami na starcie,6rolnikami i4tragarzami, zakończył się25osobami,2874wyprodukowanymi jednostkami każdego zboża/warzyw i2865rzeczywiście dostarczonymi. Po cyklach dostaw i wyczerpywaniu priorytetowego jedzenia historia miała do108okresów na osobę. Zapis całego świata pozostaje poniżej700000bajtów; dokładny wynik bieżącego przebiegu podaje diagnostyka w `/workspace/provisions-final.log`.

Osobny rzeczywisty stan Ratusza100/Domu100/3600osób po kompakcji mieszkańców i prowiantu:550262bajtów bazowo,568198zubraniem/ciastem,568201zpełnymkarmieniem,568209zgłodem/pokryciem0,5. Odtworzenie zachowuje liczniki, czas stroju, premię ciasta i ochronę diety. Nie jest to jeszcze dowód połączonego maksimum3600osób ze100rozbudowanymi przygodami w tej samej wyspie; ten połączony przypadek ma osobny audyt agenta minigier.

Agent minigier potwierdził204NodePASS i6scenariuszyChromiumPASS, w tym starePL/ENdesktop/mobile,21mechanik, klawiaturę i prawdziwy dotyk390px. Dowody: `/workspace/work/dev-v32-original-puzzles/node-validation.log`, `browser-validation.log`, `legacy-browser-validation.log`; osobne payloady300przygód/3wyspy i100przygód/435cluesopisano w `payload-validation.log`. Te testy nie są50-dniową rozgrywką.

## Końcowa kontrola braku tworzenia dawnego `food`

W32nowy zakup NPC i wymiana kierowana do `GOODS[id].legacy` są zablokowane. Istniejące stare zapasy pozostają jadalne i fizycznie przewożone/sprzedawane. `receiveMaterials` przelicza stare definicje nagrody `{food:n}` na `{flour:n}` tylko w trybie nagrody; jawny `bonus:false` zachowuje rzeczywisty ładunek. Bezpośredni `grantBonusMaterials` również konwertuje nowe nagrody i kolejkuje je do przyjęcia, bez nowego ledgeru bonusowego i bez obchodzenia pojemności. Historyczne bufory i istniejący ładunek bonusowy wymagają jawnego `{preserveLegacyFood:true}`. Testy obejmują pełny magazyn, zachowanie dawnego zapasu, karmienie, sprzedaż, blokadę zakupów/wymian i niezmienione reguły sprzed32. Stare cele wymagające jednostek Food dalej korzystają z mostu6sytości, a rzeczywisty Młyn daje mąkę.

Agent progresji potwierdził60testów PASS, w tym rzeczywiste25komend samouczka z30-sekundowym krokiem oraz `resources.food===0` po każdej komendzie. Końcowy zapas obejmuje pięć podstawowych typów32: drewno/kamień/zboże/mąkę/deski, bez równoległego dawnego Food. Metadane skrzyń, pomocy, lojalności i poleceń również wskazują mąkę. Własny końcowy przebieg P/L po tej poprawce:116/116PASS w `/workspace/provisions-final.log`.
