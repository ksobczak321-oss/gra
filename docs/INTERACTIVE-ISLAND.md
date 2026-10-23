# Interaktywna wyspa HARBORLIGHT

Stan: 2026-10-23, `harborlight-v1-layered.html`, lokalny prototyp ze schematem zapisu 8. Reguły bazują na HARBORLIGHT6 i decyzjach D01–D17, zebranych w [arkuszu 7](arkusze/HARBORLIGHT7-zasady.xlsx). Wyniki sprawdzeń i publikacji zapisujemy osobno w [dzienniku implementacji](IMPLEMENTATION-LOG.md).

## Wyspa i sterowanie

Widok zachowuje zaakceptowany układ i grafikę wyspy, z kontrolkami HTML i responsywnymi dialogami. Aktywny interfejs jest po angielsku. Kliknięcie budynku otwiera jego panel; operacje używają jednego zapisanego stanu. Telefon ma czytelne menu i dialogi bez konieczności trafiania w pomniejszone napisy grafiki. Kontrolki mają etykiety, widoczny fokus i obsługę klawiatury.

| Element | Co otwiera lub pokazuje |
| --- | --- |
| Logo / Game menu | Główne funkcje gry |
| Settings | Zapis, animacje, lokalny wynik rankingu i potwierdzany reset |
| Sign in or create an account | Stronę formularzy konta; gra gościa pozostaje dostępna |
| Zasoby | Centralne zapasy, osobny skarbiec monet i logistykę |
| Level | Poziom ratusza i jego rozbudowę |
| Happiness | Średnią osobistego szczęścia i tempo demografii |
| Residents | Przydziały, dostępnych, idących i wracających, wizyty, osobiste szczęście i podatki |
| Zegar | Rzeczywisty czas wyspy; bez kontroli pauzy i przyspieszenia gospodarki |
| Budynki / dolny dok | Szczegóły, koszty, pracowników, transport i Upgrade danego budynku |
| Lighthouse tasks | Trzy bieżące zadania, nagrody, terminy i wpłaty |
| Expeditions | Osobne plansze i pulę monet do wypłaty albo dalszego ryzyka |
| Harbor / statek | Paczki handlu portowego, ceny i etapy dostawy |
| Ścieżki / dekoracje | Dostępne ulepszenia wyspy |

Animacje obejmują obrót wiatraka, unoszący się i zanikający dym, mewy, wodospady, fale i przybój przy całym widocznym brzegu, idące postacie, chmury, budowę i zwierzęta. Ich szczegóły i ograniczenia warstw opisuje [WORLD-ANIMATION.md](WORLD-ANIMATION.md). Ograniczenie ruchu lub niewidoczna karta może zatrzymać rysowanie efektów, ale gospodarka nadal rozlicza czas rzeczywisty.

## Rozpoczęcie gry

Bez istniejącego zapisu powstaje wyspa z ratuszem i domem 1, 12 mieszkańcami w domu, 0 pracowników i szczęściem 0%. Każdy z sześciu zasobów ma 100: Coins, Wood, Stone, Grain, Food, Planks. Lokalne składy producentów są puste. Odświeżenie zachowuje istniejącą wyspę; nie przyznaje ponownie zasobów startowych.

Poziom ratusza wyznacza poziom gry, maksymalny poziom innych budynków i limit `24 × poziom ratusza` mieszkańców. Dom ma własne `24 × poziom domu` miejsc mieszkalnych. Przy ratuszu 4, domu 3 i 78 osobach limit osady wynosi 96, miejsc jest 72, a 6 osób bez miejsca powoduje −6 pp/h dla każdej uprawnionej osoby. Dopiero ukończenie większego domu zatrzymuje dalszą karę. Minimum populacji to 6 osób, maksimum techniczne poziomu 100.

## Praca, produkcja i podatki

Na starcie trzeba samodzielnie przypisać ludzi z domu. Pracować można w farmie, młynie, drwalach, tartaku, kamieniołomie, magazynie, targu i porcie. Limit wynosi `12 × własny poziom miejsca pracy`, z jednej puli wolnych osób. Targ otwiera ratusz 2, port ratusz 4. Dom, ratusz, kaplica i latarnia nie mają etatów.

Dojście do pracy zajmuje 5 min. Dopiero po dotarciu zaczyna się praca i podatek 1 moneta/os./h. Zwolnienie oznacza 5 min powrotu, bez podatku i możliwości kolejnego przydziału. Gotowe towary zostają, niedokończona sztuka przepada. Podatek płynie również przy głodzie lub blokadzie produkcji, a jego ułamkowy postęp jest zapisany.

Własny poziom producenta zwiększa limit załogi oraz wydajność na osobę: poziomy 1/2/3/4 dają 10/12/13/14 szt./h. Każdy ma osobną fazę sztuki. Farma produkuje zboże, drwale drewno, kamieniołom kamień. Młyn zużywa 2 centralne zboża na 1 lokalną żywność, tartak 2 centralne drewna na 1 lokalną deskę. Brak materiału albo pełny bufor zatrzymuje produkcję.

Pięć kompaktowych paneli producentów ma Level i Storage z małym czasem do sztuki, a niżej Workers aktualni/limit z małym −/+ i Taxes. Wyjaśnienia są pod „i”. W ratuszu zamiast pracowników i odbioru są mieszkańcy obecni/limit oraz podatki/h. Ratusz nie ma przydziału ani odbioru produkcji.

## Jedzenie i szczęście osób

Każdy automatycznie zjada 1 Food/h wyłącznie z centrali, także offline, w drodze i podczas zwiedzania. Przydzielona cała jednostka posiłku i jej ułamek nie mogą być ponownie wydane. Chroniona rezerwa to `50 × poziom magazynu` Food: ludzie ją jedzą, ale budowa/handel jej nie zabierają. Magazynier ratunkowo nosi gotowe Food poniżej progu; nie można wówczas ręcznie odwołać ostatniej obsady magazynu.

Jedzenie daje osobiste +1 pp/h, rzeczywista praca kolejne +1. Po 12 h ciągłego braku jedzenia albo pracy każdy brak daje własne −5 pp/h. Je i pracuje: +2/h. Je i jest bezrobotny ponad 12 h: −4/h. Pracuje i głoduje ponad 12 h: −4/h. Oba braki ponad 12 h: −10/h. Pierwsze 12 h nie są karane wstecz. Blokada produkcyjna nie daje +1 pracy ani kary bezrobocia, ale daje osobny składnik przestoju −10, potem −10 co 24 h do −50 pp. Limit tego składnika nie ogranicza całej osoby do −50%.

Głód od razu obniża produkcję i tempo transportu do 50%, bez obniżenia podatku. Dostawa jedzenia zeruje głód, a zatrudnienie bezrobocie; osobiste szczęście i tożsamość pozostają. Odejście ludności jest wybierane z domu/osób w drodze, następnie z największej załogi według ustalonej kolejności; zwiedzający są chronieni.

Nowy mieszkaniec trafia do domu i przez 24 h ma zamrożone 0% szczęścia, również przy premiach latarni i kaplicy; potem zwykłe naliczanie zaczyna się od zera. Początkowa dwunastka nie jest tak zamrożona. Każde osobiste szczęście mieści się w ±100%, a z tych wyników powstaje średnia wyspy. Pełne procenty są zaokrąglane w górę wyłącznie na ekranie; silnik zachowuje ułamki.

Średnia 0% nie zmienia populacji; ±25% daje zmianę osoby co 12 h, ±50% co 6 h, ±75% co około 1 h 43 min, ±100% co godzinę. Wartość dodatnia daje przyrost, ujemna odejście. Znak i granice populacji nie pozwalają przechować zapasu zmian na później.

W House można rozdysponować dzienną pulę szczęścia równą liczbie mieszkańców w chwili jej odnowienia. Punkty dodają osobiste pp, nie usuwają kar ani liczników. Po 23 h 58 min automat przyznaje resztę pełnymi punktami najmniej szczęśliwym, losując przy remisie; po 24 h przychodzi nowa pula.

## Transport i handel

Towar producenta mieści się w osobnym buforze `200 × poziom ratusza` i staje się dostępny do wydania dopiero centralnie. Magazynier niesie jeden rodzaj na kurs, pełny lub częściowy. Kurs z powrotem trwa 5 min, przy głodzie efektywnie 10 min. Ładunek transportowego budynku poziomu 1/2/3 to 60/66/72. Domyślnie zaopatrzenie centrali jest przed budowami; można zmienić priorytety materiału, producenta i budowy. Towar zabrany przez odwołaną osobę dokończy kurs.

Magazyn ma 1000 na rodzaj i 4000 łącznie na poziomie 1; oba limity rosną ×1,5 z każdym kolejnym poziomem. Port ma analogiczne limity, targ 1000 łącznie ×1,5. Monety nie zajmują miejsca. Powiadomienia o pełnych składach pojawiają się przy zmianie stanu, z zapisem przeczytania.

Targ używa własnej załogi w obie strony i nie używa monet. Wymienia drewno/kamień/zboże albo deski/żywność, 10 za 9 po marży. Dostawa jest zablokowana na godzinę; niewykorzystana partia przepada po 24 h. Wynik wymiany ma nowy termin 24 h.

Port używa własnej załogi i paczek po 100. Podstawowe surowce sprzedaje/kupuje po 40/50 monet, deski i Food po 140/150. Zakup kolejnej paczki tego samego towaru w ruchomych 3 h zwiększa cenę liniowo o 10% bazowej; inny towar ma własny licznik. Monety zakupu są pobierane przy zatwierdzeniu. Sprzedaż wymaga centrala → port → statek i płaci przy wypłynięciu. Rejs zakupu trwa 5 min, następnie potrzebne są rozładunek i transport do centrali. Towary nieodebrane przez 24 h przepadają.

## Rozbudowa i usługi za monety

Upgrade dotyczy wybranego budynku bez dodatkowego wybierania miejsca. Koszt pokazuje centralne posiadane/wymagane na czerwono albo zielono. Wyjaśnienia źródła kosztu i czasu są w popupie „i”, z obsługą dotyku, fokusu i Escape. Opłacone materiały są rezerwowane, dowożone, a nowy poziom działa po ukończeniu. Postęp dostarczone/wymagane i ETA odpowiadają obecnym priorytetom.

Standardowy czas to transport `T` + budowa `T`; latarnia `T +4T`, kaplica `T +3T×(nowy poziom−1)`. Dokładne ceny, dopłatę +10% w kolejce i przykłady zawiera [tabela budynków](BUILDINGS.md). Zwykły limit to tyle aktywnych i tyle opłaconych w kolejce, ile poziomów ratusza.

Lokalne usługi za monety obejmują 25/50/75/100% skrócenia pozostałej budowy za pełne minuty, zawsze co najmniej 5 monet; natychmiastowy transport po 10 monet/kurs; oraz od poziomu 4 kupno pełnego budynku z gotowością po 10 s. Zakup kompletu nie pobiera własnych materiałów ani nie wymaga tragarzy. Wszystkie ceny są pokazywane przed operacją.

Pakiet za `1000 × poziom ratusza` monet działa 24 h, daje +4 aktywne i kolejkę bez limitu; kolejny zakup przedłuża ważność. Dopłata kolejki +10% pozostaje. Wykonalny plan dostaw kosztuje ponadto 25% bazowej wartości portowej braków, po dopłacie kolejki, i czeka na realne materiały. Prototyp korzysta z istniejących lokalnych monet; nie ma rzeczywistej sprzedaży pakietów za PLN.

## Kaplica i zwiedzanie latarni

Rozbudowa kaplicy daje +10 pp × nowy poziom i podatki ×2/10 h. Darmowe ręczne użycia w całej grze odpowiadają poziomowi kaplicy; każde daje +50 wszystkich sześciu zasobów i +20 pp/1 h. Płatne użycie kosztuje `100 × poziom` monet. Nie nakłada się drugiego ręcznego efektu, a kolejne płatne użycie jest możliwe 4 h po końcu poprzedniego.

Ukończenie poziomu latarni daje efektywne 100% szczęścia i produkcję materiałów ×2 przez `24 h × nowy poziom`; po końcu przywraca osobiste szczęście sprzed premii. Nie zmienia podatku i transportu ani zamrożenia nowych osób.

Z House można wysłać wolne osoby na 4 h zwiedzania bez czasu dojścia i bez wycofania. Dopiero po powrocie dostają osobiste 100% na 24 h i 24 h zakazu kolejnej wizyty; każda grupa daje populacji +10 pp na 6 h, z niezależnym zegarem i sumowaniem. Limit jednoczesny to `2 × latarnia`, darmowych wejść `2 × latarnia` w ruchomych 24 h. Do 3 dodatkowych pakietów po 2L wejść kosztuje `300 × numer pakietu 2/3/4 × poziom latarni`. Zwiedzający jedzą, nie produkują i nie płacą podatku.

## Zadania i ekspedycje

Prawy panel pokazuje trzy zadania latarni z nagrodami, wpłatami i osobnymi terminami. Na starcie są S/M/L; później każdy nowy losowy rozmiar trafia na koniec FIFO. Przyjęcie przed 15 s zapisuje mnożnik ×3, przed 5 min ×2, później ×1. Wpłaty są w ratach prosto z centrali, bez przewozu i zwrotu; przeterminowane przepadają. Po pełnej wpłacie nagroda jest jednorazowa, a nowa karta pojawia się od razu. Materiały przekraczające pojemność czekają w automatycznie zwalnianym buforze nagród.

Początkowe terminy to 6 h. Pierwsze ukończenie każdego łańcucha wyznacza jego stałą dobową godzinę odnowienia w Europe/Warsaw. Wymagania zależą od maksymalnej produkcji właściwych budynków, a nagrody skalują się wobec poziomu 3. Szczegóły i zakresy są w [ECONOMY-RULES.md](ECONOMY-RULES.md).

Ekspedycja wypłaca tylko monety. Za pierwszy etap pula wynosi 50, za kolejne 100, 200, 400… Można ją wypłacić albo postawić całą na dalszy etap; porażka lub limit czasu traci niewypłaconą pulę. Gra sprawdza trasę i bieżący etap, nie przyznaje dawnych dodatkowych materiałów. Dokupowanie ruchów/czasu, zewnętrzne reklamy i ich nagrody czekają na zdefiniowanie i weryfikację.

## Konto, zapis i granice prototypu

`harborlight-auth.html` udostępnia Sign in i Create account, walidację pól, przełączanie widoczności hasła, komunikaty i link Continue as guest. `?mode=register` albo `#register` otwiera rejestrację. Google/Facebook są przyciskami z ikonami i komunikatem Coming soon: **nie ma OAuth ani wysyłki danych do tych usług**. Formularz nie udaje utworzenia konta, nie zapisuje haseł i informuje, że usługa kont jest niedostępna.

Gra zapisuje postęp lokalnie w `localStorage` pod dotychczasowym kluczem `harborlight-v1-interactive-save`. Schemat 8 zachowuje starsze zasoby, mieszkańców, ich historię, fazy produkcji, posiłek, podatek i budowy; dodaje zegar offline, ładunki, terminy handlu, wizyty, pulę domu i bieżące aktywności. Rezerwa materiałów, fizyczne ładunki oraz znaczniki odbioru zapobiegają podwójnemu lokalnemu rozliczeniu. Reset wymaga potwierdzenia i dotyczy zapisu tej przeglądarki.

Klient pozostaje edytowalnym prototypem. Nie ma serwerowego konta, synchronizacji między web/Android/iPhone, wspólnego rankingu, potwierdzania płatności, postów, poleceń ani reklam. Rzeczywiste wydanie wymaga uwierzytelnionego API i serwerowej weryfikacji czasu, komend, nagród oraz transakcji; plan jest w [BACKLOG.md](BACKLOG.md).

## Uruchomienie i testy

Instrukcja HTTP oraz zależności są w [README](../README.md). Testy reguł uruchamia `node --test --test-timeout=10000 tests/*.test.mjs`. Są osobne zestawy dla stanu, jedzenia, nowych reguł stanu, logistyki, mieszkańców i aktywności. Auth oraz aktualne panele mają osobne testy przeglądarkowe; animacje i wybrzeże nadal mają własne zestawy regresji. Rzeczywiście wykonane wyniki, rozmiary okien i stan publikacji zapisujemy w dzienniku, bez utożsamiania historycznych sprawdzeń z bieżącą wersją.
