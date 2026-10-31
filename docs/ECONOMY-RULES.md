# Reguły gospodarki HARBORLIGHT — frontend v21

Bieżące reguły DEV wynikają z [bazy v18](FRONTEND-V18-REQUIREMENTS.md), [wprowadzenia v20](FRONTEND-V20-REQUIREMENTS.md) i [rozszerzenia v21](FRONTEND-V21-REQUIREMENTS.md). Opis nie jest dowodem publikacji. Ostatnie potwierdzone wydanie PRE-PROD to v18 / `6ec3c6d` / workflow `41112673285`; uzupełnienie interfejsu i dokumentów [v19](FRONTEND-V19-REQUIREMENTS.md) jest osobnym zakresem DEV. Lokalną walidację i kolejne promocje opisuje [dziennik](IMPLEMENTATION-LOG.md).

V18 zastępuje sprzeczne reguły v17 i wcześniejszych manifestów. Excel 10 pozostaje niezmienionym archiwum v16; ukryte dawne pytania nie otwierają ponownie później rozstrzygniętych zasad.

## Start, ludzie i zegary

| Mechanika | Obowiązująca zasada |
|---|---|
| Start | Raz przy pierwszym wejściu do nowej wyspy: Ratusz 1, 12 osób w domu, brak przydziałów, po 100 monet i każdego z pięciu materiałów, bazowe H20%. Kolejne wejścia wznawiają zapis, nie przyznają startu ponownie. |
| Ochrona powitalna | Przez 72 h minimum 20% obejmuje wszystkich, również nowe osoby. Nie odkłada ukrytego długu kar; koniec nie odejmuje 20 pp. |
| Pierwszeństwo H | Wymuszone 100% > minimum powitalne 20% > zwykłe zasady, w tym początkowe 24 h nowej osoby na 0%. Osoba przybyła podczas Latarnianej premii korzysta tylko do wspólnego końca efektu. |
| Poziom i mieszkanie | Poziom Ratusza ogranicza rozbudowę innych budynków i daje 24 miejsca populacji/poziom; Dom osobno daje 24 łóżka/poziom. Brak łóżek daje −1 pp/h wszystkim za każdą osobę bez miejsca. |
| Przydział | Osiem miejsc pracy: limit 12 × własny poziom i wspólna pula wolnych w domu. Dojście 5 min; w drodze kara bezrobocia jest wstrzymana, licznik zeruje dopiero dotarcie. Podatek zaczyna się po dojściu. |
| Odwołanie | Osoba bez ładunku wraca 5 min; tragarz z ładunkiem kończy dostawę, nie bierze nowej i dopiero wraca. Wyraźny popup i licznik np.5(−2) pokazują oczekujące odejścia. |
| Jedzenie | Każdy mieszkaniec zużywa 1 żywność/h z dostępnej centrali. Brak jedzenia od razu daje wydajność ×0,5, po 12 h karę−5 pp/h. Posiłek zatrzymuje karę od razu, ale licznik głodu zeruje dopiero pełna godzina nieprzerwanego karmienia. |
| Szczęście | Indywidualne H jest ograniczone do−100…100%, wyspa pokazuje średnią. Jedzenie i rzeczywista praca dają osobno+1 pp/h, brak pracy po 12 h daje−5 pp/h. Wyświetlenie zaokrągla w górę; obliczenia zachowują ułamki. |
| Przestój | Brak wejścia lub miejsca zatrzymuje produkcję i premię pracy. Indywidualna kara−10 pp od początku, kolejne−10 co 24 h, maks.−50 z tego składnika; bez dodatkowej kary bezrobocia za ten sam przestój. Przyczyna i indywidualne zegary są jawne, smutna ikona dotyczy aktywnej kary. |
| Demografia | Dodatni przyrost jest ×2 wobec wcześniejszego wzoru; ujemne odejścia bez przyspieszenia. Minimum 6 osób, maksimum 24 × TH. Kolejność grup odejścia zachowana, potem najmniej szczęśliwy z losowaniem remisów; chronieni nie tworzą długu odejść. |
| Czas | Pierwsza wyspa zaczyna bieg czasu po zakończeniu wprowadzenia; pokazuje 1 stycznia i aktualną godzinę Warszawy. To fikcyjna data prezentacji; znaczniki kont, efekty i rozliczenia używają rzeczywistego czasu. Odnowienia dzienne o 00:00 Europe/Warsaw uwzględniają DST. |
| Aktywność | Rzeczywiste sterowanie w widocznej aktywnej karcie daje produkcję/podatki/prędkość transportu ×2 przez 5 min; potem ×1, po 48 h bez rzeczywistej gry ×0,5. Nieobecność rozliczana przedziałami; jedzenie, efekty i kalendarz nie zwalniają. |
| Sesja | Po30 min bez aktywności ostrzeżenie, po dalszych 30 s bez odpowiedzi wylogowanie. Animacja, autosave i odnowienie tokenu nie są aktywnością. Wylogowanie nie zatrzymuje rozpoczętego świata; niedokończone wprowadzenie zachowuje zatrzymany czas. |

## Produkcja, zapas, transport i budowanie

| Mechanika | Obowiązująca zasada |
|---|---|
| Produkcja | Bazowa wydajność/osobę:20,24,26,28… szt./h; oddzielny postęp produktu każdej osoby. Głód, aktywność, Latarnia i odpowiedni efekt wydarzenia składają się z bazą. Zwolnienie usuwa niedokończoną sztukę. |
| Przetwórstwo | Młyn:2 zboża → 1 żywność; Tartak:2 drewna → 1 deska. Pobranie dostępnego wejścia przy ukończeniu produktu. Brak wejścia lub miejsca wstrzymuje postęp bez jego utraty. |
| Lokalny skład | Gotowe produkty czekają lokalnie do 200 × własny poziom producenta. Tragarze przewożą je do centrali; monety są osobno w skarbcu. |
| Zapas bonusowy | `resources` jest sumą zwykłego i bonusowego zapasu. Nagrody są od razu wydawalne, nie zajmują limitu zwykłych dostaw; wydajemy najpierw bonus. Rezerwacje i ochrona jedzenia nadal obowiązują. |
| Pojemność centrali | Magazyn 1:1000/rodzaj i4000 łącznie; wzrost ×1,5 do maks.10 mln/rodzaj i40 mln łącznie osiąganych naL24. Dalszy poziom Magazynu zwiększa tylko limit obsady, nie bazowy ładunek ani rezerwę żywności. |
| Przykład bonusu | Limit 300: zwykłe 200 + nagroda 200 = dostępne 400; producent może dowieźć jeszcze 100, razem 500. Nie wolno uznać nagrody za zajęcie zwykłego miejsca. |
| Rezerwa jedzenia | Dla Magazynu obowiązuje 50 × min(L,24). Zastawione materiały nadal zajmują fizyczny skład, dopóki tragarz ich nie odbierze, i nie są wydawane drugi raz. |
| Kurs | Bazowy pełny kurs 5 min, jeden rodzaj towaru, L1 do 120 sztuk. Drogi i wyżywienie wpływają na przewóz; aktywność zmienia prędkość, nie ładowność. Trwający kurs zachowuje postęp przy zmianie mnożnika. |
| Priorytety | Do trzech trwałych priorytetów materiałów/budowy:8+2 losowe,5+3+2 losowe albo 5/3/2; ochrona ratunkowej żywności. Budowy obsługiwane od najstarszej aktywnej. |
| Rozbudowa | RatuszL: L aktywnych i L miejsc kolejki. Następny poziom tego samego budynku zajmuje miejsce kolejki także przy wolnym slocie aktywnym. Kolejka kosztuje+10% każdego składnika. |
| Próg ludności Ratusza | Od3→4 min.75% limitu poziomu poprzedzającego cel:ceil(0,75×24×(cel−1)). Dotyczy tylko Ratusza i nowych projektów, także premium/kolejki; starych nie anuluje. |
| Rzeczywiste T | T biegnie od pierwszego odbioru materiałów do ostatniej dostawy, również podczas przerw. Budowanie trwaT, Latarnia 4T, Kaplica 3T ×(N−1). Szybsze dostawy skracają również wynikową budowę. |
| Pakiet budowlany |1000 × TH monet/24 h, +4 aktywne budowy i dowolna kolejka; planowanie braków za 25% bazowej wartości portowej po dopłacie kolejki. Materiały przypisujemy FIFO, bez podwójnego zastawu. |
| Anulowanie | Przed pierwszym przewozem/budową, ze zwrotem rzeczywistych rezerwacji bez zwrotu opłaty prognozy. Późniejszy zależny poziom anulujemy przed wcześniejszym, bez ukrytej kaskady. |
| Skrócenie budowy |25/50/75/100% pozostałego czasu,1 moneta za pełną oszczędzoną minutę, min.5. Popup podaje faktycznie oszczędzony czas. |
| Natychmiastowy przewóz |10 monet za potrzebny kurs, także niepełny. Wycena uwzględnia wcześniej nadchodzący zwykły ładunek; brak miejsca blokuje usługę przed opłatą. Zakup dotyczy wybranego etapu. |
| Dowóz budowy | Przywozi brakujące materiały i zamraża osobną fazę budowania według minionegoT i zwykłej estymaty reszty; bez magazynierów przyjmujemy jednego hipotetycznego tragarza. Nie kończy automatycznie budowania. |
| Pełne kupno | Portowa wartość materiałów ×1,25 + nominalne monety + kursy Premium; gotowość po 10 s poza zwykłymi slotami, bez wydania własnych materiałów. Nadal obowiązuje limit Ratusza i kolejność poziomów. |
| Dwa kanały zakupu | Za zdobyte monety od TH4; osobny zakup za pieniądze od TH1. Paynow poza PROD ma wyraźną symulację; prawdziwa usługa pozostaje wyłączona do konfiguracji. |

## Targ, Port, zadania i atrakcje

- Targ NPC od TH2 do TH5: pełne dziesiątki w grupie drewno/kamień/zboże albo deski/żywność;10 → 9. Dostawa zablokowana 1 h, partie ważne 24 h, wynik wymiany ma nowy termin. Własna obsada przenosi towary, wymiana działa bez obsady. Natychmiastowy odbiór niezarezerwowanej partii zachowuje wcześniejsze zwykłe zlecenia.
- Port NPC od TH4 do TH5: paczki 100; bazowe sprzedaż/kupno 40/50 dla podstawowych,140/150 dla przetworzonych. Kolejna paczka kupna w ruchomych 3 h podnosi cenę o 10% bazowej osobno dla rodzaju. Cena zamrożona przy zamówieniu, sprzedaż opłacana przy wypłynięciu.
- Od TH6 nowe transakcje z grą zastępują wymiany między graczami według własnej ceny zasób/ilość. Serwer rezerwuje ofertę i rozlicza przyjęcie; brak miejsca wstrzymuje wymianę, a zwroty oczekują w trwałej skrzynce. Uruchomienie wymaga konfiguracji API. Poprzednie zlecenia NPC nadal kończą się według swoich warunków.
- Partie mają 24 h od fizycznego przybycia; kupiona partia od przybycia statku. Faktycznie podjęty przed terminem ładunek kończy rozpoczęty kurs także statek → Port. Niepodjęty wygasa. Sprzedaż częściowo wygasła wypłaca faktycznie wysłaną część zamrożonej ceny, w dół do monet.
- Zadania Latarni:3 oferty,1 aktywne, brak porzucenia. Potwierdzenie 60 s; mnożnik utrwala otwarcie okna:×3 przed 15 s,×2 przed 5 min, później ×1. Oferta musi być ważna przy potwierdzeniu; zamknięcie usuwa szkic.
- Darowizny są nieodwracalne, z dostępnego zapasu z zachowaniem rezerwy jedzenia, bez tragarzy. Pierwsze zadania 6 h; po pierwszym sukcesie następcy mają termin o północy Warszawy. Nagroda materiałowa nigdy nie ginie przy ładunku w drodze i trafia do bonusu.
- Premie społecznościowe 1000 za pierwszą publikację,500 za poziom od TH2 i1000 za co trzeci kwalifikowany post mają punkty integracji zaufanych zdarzeń; maks.1 liczony post/dzień łącznie platform. Samo otwarcie dialogu nie potwierdza zewnętrznej publikacji. Osobny historycznie zatwierdzony bonus zadania 500 za wybór Share pozostaje raz na ukończenie.
- Polecenie ma stałego polecającego:1000 monet po pierwszym logowaniu i500 pięciu materiałów po trzech aktywnych dniach w30 dniach rejestracji. Aktywność nie może poprzedzać pierwszego logowania. Weryfikacja rzeczywistych poleceń nie jest jeszcze podłączona.
- O północy 5 ofert z katalogu 20 atrakcji; losowe 5–100 pp i1–50% populacji. Bonus 6 h dla uprawnionych najmniej szczęśliwych, cena pp po przyzwyczajeniu × faktyczna liczba odbiorców w górę do monet. Jedna nowa atrakcja naraz.
- Przyzwyczajenie osobne dla rodzaju:100/75/50/25/0%; po 24 h bez zakupu pełna skuteczność. Przy 0% nie pobieramy opłaty. Oferta zachowuje udział procentowy; odbiorcy=min(uprawnieni,max(1,floor(populacja × procent/100))).
- Dom o północy dostaje punkty równe populacji, bez starej reszty; o 23:58 rozdaje niewykorzystane uprawnionym o najniższymH. Punkty nie kasują liczników kar.
- Ścieżki:100 odcinków 0–5,100 kamienia/krok; wszystkie kończą poziom przed następnym. Pełne poziomy+10…50% szybkości tragarzy; poziomy 3/4/5 także+10/20/30% ładunku.

## Kaplica, Latarnia i wraki

Jedno darmowe błogosławieństwo na dzień Warszawy, reset o północy bez kumulowania; daje+50 sześciu zasobów i+20 pp na godzinę. Płatne kosztuje 100 × poziom Kaplicy monet. Płatne i reklamowe współdzielą 4 h blokady od końca godzinnego efektu; darmowe nie przesuwa blokady. Ręczne efekty nie nakładają się. Ulepszenie Kaplicy daje+10 × nowy poziom pp/10 h oraz mechaniczne podatki ×2.

Od Kaplicy 3 regularność: użycie co 3+poziom Kaplicy dni. Po przekroczeniu losujemy dalsze 6–15 dni do zagrożenia. Wszystkie rzeczywiste ręczne błogosławieństwa odnawiają opiekę. Ulepszenie Latarni wymusza 100% i produkcję ×2 przez 24 h × nowy poziom. Nakładające wymuszenia korzystają ze wspólnego stanu sprzed pierwszego; po końcu wracają zwykłe zasady nadal aktywnych efektów.

Wizyta w Latarni trwa 4 h bez dojścia/wycofania, miejsca 2 × poziom. Uczestnik po powrocie ma100%/24 h, blokadę wizyty 24 h, a grupa+10 pp/6 h populacji. Darmowe 2L wejść w ruchomych 24 h oraz trzy dodatkowe pakiety zachowują zatwierdzony cennik.

Dobre wraki losujemy co 36–60 h. Pod globalną Latarnianą ochroną jedno dobre zdarzenie może czekać do końca; złe terminy anulujemy i losujemy po ochronie z zachowaniem okresu Kaplicy. Najwyżej jedno negatywne zdarzenie na nieaktywny okres. Latarnia podczas plagi daje 100%, nie oddaje utraconych dóbr/osób; pozostałe efekty mają własny termin.

Jawne wartości konfiguracji wydarzeń: skarb 50–150 × TH monet, zwrot podatkowy 20–60 × TH, dostawa 50–150 pięciu materiałów, rozbitek+1, nawóz+25% Farmy/6 h. Gdy brak miejsca na człowieka:500 × TH monet. Negatywne mają jeden główny skutek oraz karę H/6 h: ludność do 20% z minimum 6, wolne monety/drewno do 20%, transport wolniejszy do 50%. Rezerwacje i niesione ładunki pozostają chronione. Wagi i kwoty są strojoną konfiguracją, nie odtworzonym dawnym ustaleniem o wraku.

## Ekspedycje, reklamy i nagrody

- Gracz wybiera kulki albo trójki. Nominalne nagrody rund 50,100,200,400…; pula 50,150,350,750… . Zachowany spadek nagrody według czasu i utrata całej niewypłaconej serii przy porażce; wypłata kończy serię. Nie ma automatycznych opłat za przekroczenie twardego terminu.
- Jawny dobór wdrożeniowy dodatkowego czasu:30 s/10 monet, maks.2 zakupy/rundę; reklama 60 s, maks.1/rundę. Zakup przed końcem, bez wskrzeszania przegranej. Świadoma reklama zatrzymuje zegar rundy, świat biegnie dalej. Prawdziwy dostawca potwierdza nagrodę, nie własny licznik 10 sekund.
- Zapisany harmonogram aktywnego czasu: pierwsza reklama 4–8 min raz/konto; po końcu/pominięciu pierwszy wybór minigra/reklama po 5–15; po końcu aktywności drugi po 43–62; potem 60–100. Powiadomienia czekają na bezpieczny moment. Minigra nadal wzywa do obecności po 5 min z60 s na odpowiedź.
- Reklama materiałowa daje 10–30 pięciu materiałów bez monet. Reklama za czas i za błogosławieństwo nie dokłada automatycznie nagrody materiałowej.
- Bez reklam standardowych po potwierdzonych zakupach brutto≥1999 gr w ostatnich 30 dniach; oddzielnie od pakietu budowlanego 24 h. Bonusy standardowe bez filmu, te same limity. Reklama za czas ekspedycji pozostaje także dla uprawnionego. Punkt 4–8 min automatycznie kotwiczy harmonogram raz.
- Paynow i reklamy są oznaczoną symulacją wyłącznie poza PROD. Prawdziwa płatność/reklama wymaga integracji i zaufanego potwierdzenia. Kody mają nagrody i globalne limity rozliczane atomowo na serwerze; przeglądarka nie ustala globalnego licznika.
- Lojalność:50–200 każdego z sześciu zasobów raz na dzień Warszawy, zapisany wynik i odbiór. Przerwa resetuje serię;10 odebranych nagród lub TH4 kończy program.
- Nowy samouczek v21:25 rzeczywistych działań przeplata przydziały, produkcję i wydatki z dopasowanymi nagrodami mieszczącymi się w zwykłym Magazynie. Końcowe jawne rozliczenie uzupełnia wolne miejsce dopiero po wykorzystaniu nadwyżek i rozliczeniu poprzednich nagród/zleceń; nie usuwa zasobów. Cel:pełny zwykły magazyn bez zaległych skrzyń.
- Starszy program v3 zachowuje wylosowane skrzynie100–300 pięciu materiałów i jednorazowe Share. Przepełnienie blokuje kolejne skrzynie, nie zarządzanie. Odebrane nagrody nie wracają, a minigra odkłada popup do końca.

## Wzory zachowane i aktualizowane

- Produkcja/osobę: p(1)=20; dla L≥2 p(L)=2 ×(L+10), następnie mnożniki wyżywienia, aktywności, Latarni i właściwego wydarzenia.
- Obsada 12 × własnyL; lokalny zapas 200 × własnyL. Bazowy ładunek=floor(120 ×1,1^(E−1)), E=min(L,24) tylko dla Magazynu; dalej niezależna premia dróg.
- Kurs=300/(wyżywienie × drogi × aktywność × modyfikator wydarzenia) sekund; osobiste dojście/powrót 5 min nie jest kursem ładunkowym.
- Podstawowe tempo demografii: |H|≤50 → |H|/300 osoby/h; powyżej 1/6+(|H|−50)/60. Dodatni wynik ×2, ujemny bez zmiany.
- Norma zadań zachowuje historyczne q(1)=10, q(L≥2)=L+10:12 × poziom producenta × q(L) × godziny. Podwojona aktualna produkcja nie podwaja wymagań już ustalonej normy/oferty.
- Punkty są migawką TH × monety o pełnej godzinie. Podatek 1moneta/h przybyłego przypisanego pracownika, także przy blokadzie; Kaplica i aktywność mają własne mnożniki. Menu Monet wyjaśnia podatników, mnożniki i dodatkowe nagrody reklam/minigier.

## Druga wyspa i własne rejsy

Druga wyspa jest dostępna raz od Ratusza 10 pierwszej wyspy. Przy utworzeniu kopiuje jego poziom Ratusza i Magazynu; inne budynki zaczynają na 1. Oba światy mają niezależne zasoby i gospodarkę, wyróżnienie kolorystyczne oraz wspólny zapis konta. Uprawnienia, odebrane premie konta i historia zakupów nie są dublowane. Późniejsze poziomy nie synchronizują się samoczynnie.

Własny Port przewozi do 1000 sztuk w 10 minut bez opłaty. Rezerwacja od razu zabiera towary źródłowe, zapisany rejs kończy się raz; brak zwykłego miejsca zachowuje zwykły ładunek do rozładunku, a materiały bonusowe zachowują odrębne pochodzenie. Dodatkowe 1000 pojemności kosztuje 4,99 zł, możliwe są wielokrotności pakietu. NaDEV to oznaczona symulacja Paynow, nie płatność; rzeczywiste zwiększenie wymaga zaufanego potwierdzenia operatora i serwera.

## Chmura, konto i zakres uruchomienia

Postęp konta wyłącznie w chmurze, bez lokalnych wysp/kopii/kolejek. Awaria zapisu blokuje dalsze zatwierdzanie, nie uruchamia gościa. Lokalny DEV jest nietrwałym podglądem. Techniczna sesja i język mogą być przechowywane przez przeglądarkę.

Kod rejestracji e-mail i Google/Facebook wymaga aktywacji dostawców przez właściciela. Udostępnienie osiągnięcia inicjuje i zatwierdza gracz; strona i osobisty push FB są odłożone. Zapisane punkty weryfikacji społecznościowej/poleceń nie są prawdziwym potwierdzeniem publikacji.

Backend zawiera kod API kont, atomowych kodów i retencji, ale jego aktywacja wymaga routingu, uprawnień i konfiguracji. Gospodarka nadal jest wyliczana przez klienta. Po trzech miesiącach kalendarzowych bez rzeczywistej gry wyspa może zostać usunięta; konto i historie pozostają, admin1–3 PRE-PROD są wyłączeni. Automatyczne zwroty wycofane; [regulamin](TERMS-DRAFT.pl.md) to szkic do weryfikacji.

Na później pozostają: autorytatywna gospodarka/wyniki serwera, rzeczywiści dostawcy płatności i reklam, aktywacja OAuth, potwierdzanie publikacji/poleceń, osobna modlitwa, błogosławieństwa za wyzwania/social, AR/planszówka i dalszy balans. Wysokości lojalności i podstawowe reguły reklam nie są już otwartymi pytaniami.

## Historyczny odbiór wersji 9

Wydanie **frontend-v13 / Excel 9** zakończyło implementację, odbiór lokalny, publikację i odbiór publiczny: **388/388 testów modelu PASS**, pięć lokalnych zestawów przeglądarkowych i trzy zestawy rzeczywistego Pages PASS. Udane [Pages 40012462614](https://github.com/ksobczak321-oss/gra/actions/runs/40012462614); publiczny Excel i 17 plików gry zwracały HTTP 200 oraz zgadzały się z lokalnymi sumami kontrolnymi. Dowody zachowuje [dziennik](IMPLEMENTATION-LOG.md); ten wpis nie opisuje odbioru v17.
