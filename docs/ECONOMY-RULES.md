# Reguły gospodarki HARBORLIGHT — kandydat DEV 0.11.0.0 / v27

Reguły kandydata DEV wynikają z bazy [v18](FRONTEND-V18-REQUIREMENTS.md), wprowadzenia [v20](FRONTEND-V20-REQUIREMENTS.md), wcześniejszych programów lekcji [v21](FRONTEND-V21-REQUIREMENTS.md), archipelagu i społeczności [v24](FRONTEND-V24-REQUIREMENTS.md), wyjątków początku gry [v26](FRONTEND-V26-REQUIREMENTS.md) oraz zatwierdzonych zmian [v27](FRONTEND-V27-REQUIREMENTS.md). Dokument opisuje zasady kodu, a nie wynik wdrożenia. Ostatni potwierdzony PRE-PROD to **0.10.1.0 / `353faad347262dce7c3632fdf7c71be124384ab1`**, przebieg **41246771480 / próba 1 SUCCESS**. Nowe GO dotyczy tylko DEV, bez promocji GCP, resetu i PROD. [Rejestr środowisk](ENVIRONMENT-STATUS.md) rozstrzyga aktualny kod, CI, publikacje i aktywację usług.

V18 zastąpiło sprzeczne reguły v17 i wcześniejszych manifestów; późniejsze zatwierdzone zmiany poniżej mają pierwszeństwo. Starsze arkusze pozostają archiwami, a dawne pytania nie otwierają ponownie rozstrzygniętych zasad.

## Wyjątki początku gry v26

Po nowym, rzeczywistym przydzieleniu sześciu tragarzy na wyspie macierzystej zapisujemy osiągnięcie wprowadzające turbo. Nie wywodzimy go automatycznie z obsady starego zapisu, nie przenosimy na córki i nie przeliczamy wcześniej zleconych budów. Od v27 **każdy pracownik, także pierwszych sześciu tragarzy, idzie do pracy i wraca do Domu przez 120 sekund**. Zastępuje to dawne dojście pierwszej szóstki w 20 sekund i pozostałe pięciominutowe dojścia. Turbo dotyczy dostaw na budowę i budowania, a nie drogi pracowników.

| Nowe zwykłe zlecenie z aktywnym turbo | Cała dostawa materiałów | Faza budowania |
|---|---|---|
| Ratusz wyspy 1 | **30 s**, dla wszystkich kursów razem | Ratusz 1→2: **60 s**; inne proporcjonalnie do zakresu prac, z zachowaniem własnego mnożnika Latarni/Kaplicy |
| Ratusz wyspy 2 | Ratusz 2→3: **120 s**; inne proporcjonalnie, najwyżej **300 s** | Ratusz 2→3: **300 s**; inne proporcjonalnie, z własnym mnożnikiem budynku |
| Ratusz wyspy 3 i wyżej | Zwykłe wcześniejsze zasady | Zwykłe wcześniejsze zasady |

Proporcja innych zleceń opiera się na liczbie rzeczywistych kursów materiałów względem zwykłej wyceny Ratusza na tym poziomie i pojemności. Monety nie są przewożone. Przed startem dostawy potrzeba sześciu przybyłych tragarzy; przy brakach obsady, materiałów albo kolejce czas oczekiwania jest pokazany osobno. To nie teleport towarów i nie 30 sekund na każdy kurs. Turbo zachowuje własny zapisany zegar; mnożniki aktywności nie skracają obiecanej fazy drugi raz. Istniejące rozpoczęte projekty zachowują migawkę ceny i czasów. Osobne usługi premium/natychmiastowego przewozu utrzymują swoje zatwierdzone zasady.

Nowy program samouczka **5** ma 25 lekcji: 6 tragarzy → priorytet Budowa → rolnik → drwal → Ratusz 2, a zadanie Latarni i rozegrana minigra zastępują dwie lekcje Ratusza 3. Nagroda zadania pokrywa brakujące zasoby na Latarnię z rezerwą żywności. Kurs nominalnie kończy się z Ratuszem 2 i zwykłym Magazynem uzupełnionym bez zaległych skrzyń. Pierwsza rozbudowa Ratusza 1→2 kosztuje po 100 sześciu zasobów jako parametr wykonawczy wprowadzającej ścieżki; nie obniża automatycznie wyceny kolonii. Zapisane programy **3 i 4** zachowują swoje warunki, zaliczenia, odebrane nagrody i rozpoczęte budowy.

Tutorial to **34 opisy ekranu**, w tym opis czatu przed dzwonkiem, a samouczek to **25 praktycznych lekcji**. Oba można wznowić w Pomocy pod znakiem **?**, od zapisanego miejsca albo od początku; powtórka nie resetuje świata ani nie wypłaca ponownie nagród. Podczas któregokolwiek automatyczne reklamy i wybór „ekspedycja albo reklama” czekają. Po wcześniejszym zamknięciu obowiązuje zapisane **3600 aktywnych sekund, czyli 60 aktywnych minut** ochrony; offline i bezczynność go nie skracają.

## Start, ludzie i zegary

| Mechanika | Obowiązująca zasada |
|---|---|
| Start | Raz przy pierwszym wejściu do nowej wyspy: Ratusz 1, 12 osób w domu, brak przydziałów, po 100 monet i każdego z pięciu materiałów, bazowe H20%. Kolejne wejścia wznawiają zapis, nie przyznają startu ponownie. |
| Ochrona powitalna | Przez 72 h minimum 20% obejmuje wszystkich, również nowe osoby. Nie odkłada ukrytego długu kar; koniec nie odejmuje 20 pp. |
| Pierwszeństwo H | Wymuszone 100% > minimum powitalne 20% > zwykłe zasady, w tym początkowe 24 h nowej osoby na 0%. Osoba przybyła podczas Latarnianej premii korzysta tylko do wspólnego końca efektu. |
| Poziom i mieszkanie | Poziom Ratusza ogranicza rozbudowę innych budynków i daje 24 miejsca populacji na poziom; Dom osobno daje 24 łóżka na poziom. Osoba bez łóżka pracuje z połową wydajności, zużywa dwa razy więcej żywności i nie otrzymuje punktów szczęścia z Domu. Brak łóżek nie obniża szczęścia całej wyspy; nowa reguła zastępuje dawną wspólną karę. |
| Przydział | Osiem miejsc pracy: limit 12 × własny poziom i wspólna pula wolnych w Domu. Dojście trwa 120 sekund dla wszystkich, także pierwszej szóstki tragarzy. W drodze kara bezrobocia jest wstrzymana, licznik zeruje dopiero dotarcie. Podatek zaczyna się po dojściu. |
| Odwołanie | Osoba bez ładunku wraca przez 120 sekund. Tragarz z ładunkiem kończy rozpoczętą dostawę, nie bierze nowej i dopiero rozpoczyna dwuminutowy powrót. Popup i licznik, np. 5 (−2), pokazują oczekujące odejścia. |
| Jedzenie | Mieszkaniec mający łóżko zużywa 1 jednostkę żywności na godzinę z dostępnej centrali, a osoba bez łóżka — 2 jednostki. Dotyczy to także czasu offline. Głód od razu mnoży wydajność przez 0,5; po 12 zgromadzonych godzinach uruchamia karę −5 p.p./h. Posiłek zatrzymuje karę od razu, ale licznik głodu zeruje dopiero pełna godzina nieprzerwanego karmienia. |
| Szczęście | Indywidualne H jest ograniczone do−100…100%, wyspa pokazuje średnią. Jedzenie i rzeczywista praca dają osobno+1 pp/h, brak pracy po 12 h daje−5 pp/h. Wyświetlenie zaokrągla w górę; obliczenia zachowują ułamki. |
| Przestój | Brak wejścia lub miejsca zatrzymuje produkcję i premię pracy. Indywidualna kara−10 pp od początku, kolejne−10 co 24 h, maks.−50 z tego składnika; bez dodatkowej kary bezrobocia za ten sam przestój. Przyczyna i indywidualne zegary są jawne. Smutna buźka pojawia się także przy pełnym lokalnym magazynie bez aktywnej kary, np. bez obsady lub przy ochronie Latarni. Sam wskaźnik pełności nie nalicza nowej kary. |
| Demografia | Dodatni przyrost jest ×2 wobec wcześniejszego wzoru; ujemne odejścia bez przyspieszenia. Minimum 12 osób na wyspie macierzystej i 6 na córce, także przy odejściach i dżumie; maksimum 24 × TH. Kolejność grup odejścia zachowana, potem najmniej szczęśliwy z losowaniem remisów; chronieni nie tworzą długu odejść. |
| Czas | Pierwsza wyspa zaczyna bieg czasu po zakończeniu wprowadzenia; pokazuje 1 stycznia i aktualną godzinę Warszawy. To fikcyjna data prezentacji; znaczniki kont, efekty i rozliczenia używają rzeczywistego czasu. Odnowienia dzienne o 00:00 Europe/Warsaw uwzględniają DST. |
| Aktywność | Rzeczywiste sterowanie w widocznej aktywnej karcie daje produkcję/podatki/prędkość transportu ×2 przez 5 min; potem ×1, po 48 h bez rzeczywistej gry ×0,5. Nieobecność rozliczana przedziałami; jedzenie, efekty i kalendarz nie zwalniają. |
| Sesja | Po30 min bez aktywności ostrzeżenie, po dalszych 30 s bez odpowiedzi wylogowanie. Animacja, autosave i odnowienie tokenu nie są aktywnością. Wylogowanie nie zatrzymuje rozpoczętego świata; niedokończone wprowadzenie zachowuje zatrzymany czas. |

## Produkcja, zapas, transport i budowanie

| Mechanika | Obowiązująca zasada |
|---|---|
| Produkcja | Bazowa wydajność na osobę: 20, 24, 26, 28… szt./h; każda osoba ma oddzielny postęp produktu. Głód, brak łóżka, aktywność, Latarnia i właściwy efekt wydarzenia składają się z bazą. Głód i brak łóżka to osobne mnożniki ×0,5. Odwołanie usuwa niedokończoną sztukę. |
| Przetwórstwo | Młyn:2 zboża → 1 żywność; Tartak:2 drewna → 1 deska. Pobranie dostępnego wejścia przy ukończeniu produktu. Brak wejścia lub miejsca wstrzymuje postęp bez jego utraty. |
| Lokalny skład | Gotowe produkty czekają lokalnie do 200 × własny poziom producenta. Tragarze przewożą je do centrali; monety są osobno w skarbcu. |
| Zapas bonusowy | `resources` jest sumą zwykłego i bonusowego zapasu. Nagrody są od razu wydawalne, nie zajmują limitu zwykłych dostaw; wydajemy najpierw bonus. Rezerwacje i ochrona jedzenia nadal obowiązują. |
| Pojemność centrali | Magazyn 1:1000/rodzaj i4000 łącznie; wzrost ×1,5 do maks.10 mln/rodzaj i40 mln łącznie osiąganych naL24. Dalszy poziom Magazynu zwiększa tylko limit obsady, nie bazowy ładunek ani rezerwę żywności. |
| Przykład bonusu | Limit 300: zwykłe 200 + nagroda 200 = dostępne 400; producent może dowieźć jeszcze 100, razem 500. Nie wolno uznać nagrody za zajęcie zwykłego miejsca. |
| Rezerwa jedzenia | Dla Magazynu obowiązuje 50 × min(L,24). Zastawione materiały nadal zajmują fizyczny skład, dopóki tragarz ich nie odbierze, i nie są wydawane drugi raz. |
| Kurs | Bazowy pełny kurs 5 min, jeden rodzaj towaru, L1 do 120 sztuk. Drogi i wyżywienie wpływają na przewóz; aktywność zmienia prędkość, nie ładowność. Trwający kurs zachowuje postęp przy zmianie mnożnika. |
| Priorytety | Do trzech trwałych priorytetów materiałów/budowy:8+2 losowe,5+3+2 losowe albo 5/3/2; ochrona ratunkowej żywności. Budowy obsługiwane od najstarszej aktywnej. |
| Rozbudowa | Niedostępny budynek nie przyjmuje rozbudowy żadną ścieżką: Targ przed Ratuszem 2, Port przed Ratuszem 4. Ratusz L: L aktywnych i L miejsc kolejki. Następny poziom tego samego budynku zajmuje miejsce kolejki także przy wolnym slocie aktywnym. Kolejka kosztuje+10% każdego składnika. |
| Próg ludności Ratusza | Od3→4 min.75% limitu poziomu poprzedzającego cel:ceil(0,75×24×(cel−1)). Dotyczy tylko Ratusza i nowych projektów, także premium/kolejki; starych nie anuluje. |
| Rzeczywiste T poza turbo v26 | T biegnie od pierwszego odbioru materiałów do ostatniej dostawy, również podczas przerw. Budowanie trwaT, Latarnia 4T, Kaplica 3T ×(N−1). Szybsze dostawy skracają również wynikową budowę. |
| Pakiet budowlany |1000 × TH monet/24 h, +4 aktywne budowy i dowolna kolejka; planowanie braków za 25% bazowej wartości portowej po dopłacie kolejki. Materiały przypisujemy FIFO, bez podwójnego zastawu. |
| Anulowanie | Przed pierwszym przewozem/budową, ze zwrotem rzeczywistych rezerwacji bez zwrotu opłaty prognozy. Późniejszy zależny poziom anulujemy przed wcześniejszym, bez ukrytej kaskady. |
| Skrócenie budowy |25/50/75/100% pozostałego czasu,1 moneta za pełną oszczędzoną minutę, min.5. Popup podaje faktycznie oszczędzony czas. |
| Natychmiastowy przewóz |10 monet za potrzebny kurs, także niepełny. Wycena uwzględnia wcześniej nadchodzący zwykły ładunek; brak miejsca blokuje usługę przed opłatą. Zakup dotyczy wybranego etapu. |
| Dowóz budowy | Przywozi brakujące materiały i zamraża osobną fazę budowania według minionegoT i zwykłej estymaty reszty; bez magazynierów przyjmujemy jednego hipotetycznego tragarza. Nie kończy automatycznie budowania. |
| Pełne kupno | Portowa wartość materiałów ×1,25 + nominalne monety + kursy Premium; gotowość po 10 s poza zwykłymi slotami, bez wydania własnych materiałów. Nadal obowiązuje limit Ratusza i kolejność poziomów. |
| Dwa kanały zakupu | Za zdobyte monety od TH4; osobny zakup za pieniądze od TH1. Paynow poza PROD ma wyraźną symulację; prawdziwa usługa pozostaje wyłączona do konfiguracji. |

## Targ, Port, zadania i atrakcje

- Targ NPC od TH2: pełne dziesiątki w grupie drewno/kamień/zboże albo deski/żywność;10 → 9. Dostawa zablokowana 1 h, partie ważne 24 h, wynik wymiany ma nowy termin. Własna obsada przenosi towary, wymiana działa bez obsady. Natychmiastowy odbiór niezarezerwowanej partii zachowuje wcześniejsze zwykłe zlecenia.
- Port NPC od TH4: paczki 100; bazowe sprzedaż/kupno 40/50 dla podstawowych,140/150 dla przetworzonych. Kolejna paczka kupna w ruchomych 3 h podnosi cenę o 10% bazowej osobno dla rodzaju. Cena zamrożona przy zamówieniu, sprzedaż opłacana przy wypłynięciu.
- Od TH6 obok handlu NPC działa sprzedaż materiałów innym graczom za monety. Wystawiający może zejść poniżej ceny maksymalnej; pułap to bazowa cena sprzedaży tych samych materiałów przez NPC. Serwer rezerwuje ofertę i rozlicza przyjęcie; brak miejsca blokuje przyjęcie, a zwroty czekają w trwałej skrzynce. Stare oferty barterowe zachowują literalne warunki, nie tworzymy nowych według zastąpionej reguły. Aktywacja usługi API w GCP wymaga osobnego potwierdzenia; sam kod nie jest dowodem działającego rynku.
- Partie mają 24 h od fizycznego przybycia; kupiona partia od przybycia statku. Faktycznie podjęty przed terminem ładunek kończy rozpoczęty kurs także statek → Port. Niepodjęty wygasa. Sprzedaż częściowo wygasła wypłaca faktycznie wysłaną część zamrożonej ceny, w dół do monet.
- Zadania Latarni:3 oferty,1 aktywne, brak porzucenia. Potwierdzenie 60 s; mnożnik utrwala otwarcie okna:×3 przed 15 s,×2 przed 5 min, później ×1. Oferta musi być ważna przy potwierdzeniu; zamknięcie usuwa szkic.
- Darowizny są nieodwracalne, z dostępnego zapasu z zachowaniem rezerwy jedzenia, bez tragarzy. Pierwsze zadania 6 h; po pierwszym sukcesie następcy mają termin o północy Warszawy. Nagroda materiałowa nigdy nie ginie przy ładunku w drodze i trafia do bonusu.
- Premie społecznościowe 1000 za pierwszą publikację,500 za poziom od TH2 i1000 za co trzeci kwalifikowany post mają punkty integracji zaufanych zdarzeń; maks.1 liczony post/dzień łącznie platform. Samo otwarcie dialogu nie potwierdza zewnętrznej publikacji. Osobny historycznie zatwierdzony bonus zadania 500 za wybór Share pozostaje raz na ukończenie.
- Polecenie ma stałego polecającego:1000 monet po pierwszym logowaniu i500 pięciu materiałów po trzech aktywnych dniach w30 dniach rejestracji. Aktywność nie może poprzedzać pierwszego logowania. Weryfikacja rzeczywistych poleceń nie jest jeszcze podłączona.
- O północy 5 ofert z katalogu 20 atrakcji; losowe 5–100 pp i1–50% populacji. Bonus 6 h dla uprawnionych najmniej szczęśliwych, cena pp po przyzwyczajeniu × faktyczna liczba odbiorców w górę do monet. Jedna nowa atrakcja naraz.
- Przyzwyczajenie osobne dla rodzaju:100/75/50/25/0%; po 24 h bez zakupu pełna skuteczność. Przy 0% nie pobieramy opłaty. Oferta zachowuje udział procentowy; odbiorcy=min(uprawnieni,max(1,floor(populacja × procent/100))).
- Dom o północy dostaje po jednym punkcie za mieszkańca mającego łóżko, bez kumulowania starej reszty. Punkty można przyznawać tylko osobom z miejscem w Domu, poza pierwszymi 24 godzinami osiedlania i bez wymuszonego 100% szczęścia. O 23:58 niewykorzystana pula trafia do uprawnionych osób o najniższym szczęściu. Punkty nie kasują liczników kar.
- Ścieżki:100 odcinków 0–5,100 kamienia/krok; wszystkie kończą poziom przed następnym. Pełne poziomy+10…50% szybkości tragarzy; poziomy 3/4/5 także+10/20/30% ładunku.

## Kaplica, Latarnia i wraki

Latarnia jest sercem wyspy i jednym z głównych celów rozwoju. Od Ratusza 2, po ukończeniu lub zamknięciu samouczka, dostępna jest dodatkowa ścieżka **8 etapów głównych → w razie przekroczenia terminu 5 pomocniczych → w razie kolejnego niepowodzenia 3 ratunkowe**. Rozbudowa Latarni i pozostałe cele wymagają rzeczywistych działań; pomoc nie dopisuje fikcyjnego poziomu budynku. Po dokończeniu przerwanego celu gracz przechodzi do kolejnego etapu właściwej ścieżki: z pomocniczej do głównej, z ratunkowej do pomocniczej. Nieudany etap ratunkowy można powtórzyć bez kasowania wcześniejszego postępu.

Przed przyjęciem etap musi przejść konserwatywną ocenę wykonalności: wolny zapas, rzeczywista obsada, produkcja i jej składniki, pojemność składu, żywność oraz transport są rozpatrywane wspólnie. Ocena nie zakłada płatności, losowej nagrody, handlu ani przyszłego przybycia mieszkańców. Jeżeli nie można wykazać wykonalności, gra pokazuje potrzebne przygotowania zamiast uruchamiać termin. Czas zostaje utrwalony przy przyjęciu i biegnie razem ze światem, także offline. Analogiczna kontrola ogranicza wymagania nowych zwykłych ofert Latarni; zaakceptowane historyczne oferty zachowują zapisane warunki. Szczegóły oraz granice tej oceny opisuje [v27](FRONTEND-V27-REQUIREMENTS.md).

Statek z plagą w ścieżce pomocy jest zdarzeniem narracyjnym, a nie dodatkową ukrytą stratą ludzi lub materiałów. Niezależny mechanizm wydarzeń świata i opieki Kaplicy opisany poniżej zachowuje własne zasady.

Jedno darmowe błogosławieństwo na dzień Warszawy, reset o północy bez kumulowania; daje+50 sześciu zasobów i+20 pp na godzinę. Płatne kosztuje 100 × poziom Kaplicy monet. Płatne i reklamowe współdzielą 4 h blokady od końca godzinnego efektu; darmowe nie przesuwa blokady. Ręczne efekty nie nakładają się. Ulepszenie Kaplicy daje+10 × nowy poziom pp/10 h oraz mechaniczne podatki ×2.

Od Kaplicy 3 regularność: użycie co 3+poziom Kaplicy dni. Po przekroczeniu losujemy dalsze 6–15 dni do zagrożenia. Wszystkie rzeczywiste ręczne błogosławieństwa odnawiają opiekę. Ulepszenie Latarni wymusza 100% i produkcję ×2 przez 24 h × nowy poziom. Nakładające wymuszenia korzystają ze wspólnego stanu sprzed pierwszego; po końcu wracają zwykłe zasady nadal aktywnych efektów.

Wizyta w Latarni trwa 4 h bez dojścia/wycofania, miejsca 2 × poziom. Uczestnik po powrocie ma100%/24 h, blokadę wizyty 24 h, a grupa+10 pp/6 h populacji. Darmowe 2L wejść w ruchomych 24 h oraz trzy dodatkowe pakiety zachowują zatwierdzony cennik.

Dobre wraki losujemy co 36–60 h. Pod globalną Latarnianą ochroną jedno dobre zdarzenie może czekać do końca; złe terminy anulujemy i losujemy po ochronie z zachowaniem okresu Kaplicy. Najwyżej jedno negatywne zdarzenie na nieaktywny okres. Latarnia podczas plagi daje 100%, nie oddaje utraconych dóbr/osób; pozostałe efekty mają własny termin.

Jawne wartości konfiguracji wydarzeń: skarb 50–150 × TH monet, zwrot podatkowy 20–60 × TH, dostawa 50–150 pięciu materiałów, rozbitek+1, nawóz+25% Farmy/6 h. Gdy brak miejsca na człowieka:500 × TH monet. Negatywne mają jeden główny skutek oraz karę H/6 h: ludność do 20% z minimum 12 na matce i 6 na córce, wolne monety/drewno do 20%, transport wolniejszy do 50%. Rezerwacje i niesione ładunki pozostają chronione. Wagi i kwoty są strojoną konfiguracją, nie odtworzonym dawnym ustaleniem o wraku.

## Ekspedycje, reklamy i nagrody

- Gracz wybiera kulki albo trójki. Nominalne nagrody rund 50,100,200,400…; pula 50,150,350,750… . Zachowany spadek nagrody według czasu i utrata całej niewypłaconej serii przy porażce; wypłata kończy serię. Nie ma automatycznych opłat za przekroczenie twardego terminu.
- Jawny dobór wdrożeniowy dodatkowego czasu:30 s/10 monet, maks.2 zakupy/rundę; reklama 60 s, maks.1/rundę. Zakup przed końcem, bez wskrzeszania przegranej. Świadoma reklama zatrzymuje zegar rundy, świat biegnie dalej. Prawdziwy dostawca potwierdza nagrodę, nie własny licznik 10 sekund.
- Zapisany harmonogram aktywnego czasu: pierwsza reklama 4–8 min raz/konto; po końcu/pominięciu pierwszy wybór minigra/reklama po 5–15; po końcu aktywności drugi po 43–62; potem 60–100. Powiadomienia czekają na bezpieczny moment. Minigra nadal wzywa do obecności po 5 min z60 s na odpowiedź.
- Reklama materiałowa daje 10–30 pięciu materiałów bez monet. Reklama za czas i za błogosławieństwo nie dokłada automatycznie nagrody materiałowej.
- Bez reklam standardowych po potwierdzonych zakupach brutto≥1999 gr w ostatnich 30 dniach; oddzielnie od pakietu budowlanego 24 h. Bonusy standardowe bez filmu, te same limity. Reklama za czas ekspedycji pozostaje także dla uprawnionego. Punkt 4–8 min automatycznie kotwiczy harmonogram raz.
- Paynow i reklamy są oznaczoną symulacją wyłącznie poza PROD. Prawdziwa płatność/reklama wymaga integracji i zaufanego potwierdzenia. Kody mają nagrody i globalne limity rozliczane atomowo na serwerze; przeglądarka nie ustala globalnego licznika.
- Lojalność:50–200 każdego z sześciu zasobów raz na dzień Warszawy, zapisany wynik i odbiór. Przerwa resetuje serię;10 odebranych nagród lub TH4 kończy program.
- Zapisany wcześniejszy samouczek v21 / program 4: 25 rzeczywistych działań przeplata przydziały, produkcję i wydatki z dopasowanymi nagrodami mieszczącymi się w zwykłym Magazynie. Końcowe jawne rozliczenie uzupełnia wolne miejsce dopiero po wykorzystaniu nadwyżek i rozliczeniu poprzednich nagród/zleceń; nie usuwa zasobów. Cel:pełny zwykły magazyn bez zaległych skrzyń.
- Starszy program v3 zachowuje wylosowane skrzynie100–300 pięciu materiałów i jednorazowe Share. Przepełnienie blokuje kolejne skrzynie, nie zarządzanie. Odebrane nagrody nie wracają, a minigra odkłada popup do końca.

## Wzory zachowane i aktualizowane

- Produkcja/osobę: p(1)=20; dla L≥2 p(L)=2 ×(L+10), następnie mnożniki wyżywienia, aktywności, Latarni i właściwego wydarzenia.
- Obsada 12 × własnyL; lokalny zapas 200 × własnyL. Bazowy ładunek=floor(120 ×1,1^(E−1)), E=min(L,24) tylko dla Magazynu; dalej niezależna premia dróg.
- Zwykły kurs = 300 / (wyżywienie × osobisty modyfikator mieszkania × drogi × aktywność × modyfikator wydarzenia) sekund, poza zapisanym wyjątkiem turbo v26. Osobiste dojście i powrót trwają po 120 sekund i nie są kursem ładunkowym. Głód oraz brak łóżka to oddzielne mnożniki ×0,5 wydajności przewozu danego tragarza; nie spowalniają pozostałych osób.
- Podstawowe tempo demografii: |H|≤50 → |H|/300 osoby/h; powyżej 1/6+(|H|−50)/60. Dodatni wynik ×2, ujemny bez zmiany.
- Norma zadań zachowuje historyczne q(1)=10, q(L≥2)=L+10:12 × poziom producenta × q(L) × godziny. Podwojona aktualna produkcja nie podwaja wymagań już ustalonej normy/oferty.
- Punkty są migawką TH × monety o pełnej godzinie. Podatek 1moneta/h przybyłego przypisanego pracownika, także przy blokadzie; Kaplica i aktywność mają własne mnożniki. Menu Monet wyjaśnia podatników, mnożniki i dodatkowe nagrody reklam/minigier.

## Archipelag i własne rejsy

Kolejne wyspy odblokowują się na Ratuszu matki 10, 13, 16, 19 i dalej co trzy poziomy, do **20 wysp łącznie**. Koszt pierwszej córki to suma wszystkich rozbudów Ratusza i Domu 1→7 w każdym z sześciu zasobów; dla następnych A=8, 9, 10 itd. Cena kolonii korzysta ze swojej zwykłej wyceny, bez rabatu pierwszej lekcji v26. Wymagane co najmniej 18 osób na matce, w tym sześć faktycznie w Domu. Kolonizacja przenosi te same sześć osób natychmiast, bez rejsu; matce zostaje co najmniej 12.

Córka kopiuje poziom Ratusza i Magazynu matki jednorazowo; inne budynki zaczynają na 1. Nie dostaje nowego darmowego pakietu zasobów ani ponownie wspólnych nagród konta. Ma niezależny świat i odmienną paletę, a nazwa ma obowiązkowy prefiks „Nazwa matki - Nazwa córki”. Zmiana nazwy matki aktualizuje prefiksy. Późniejsze poziomy nie synchronizują się. Wejście do zakładania wyspy jest w Ratuszu i powiadomieniu po spełnieniu wymagań.

Jeden statek przewozi **albo towary** (1000 sztuk, 10 minut), **albo pasażerów** (100 osób, 30 minut). Rejs nie ma opłaty w monetach. Na półgodzinną podróż przygotowujemy zwykłe jedzenie: **0,5 jednostki za pasażera mającego łóżko i 1 jednostkę za pasażera bez łóżka**. U celu rezerwujemy wolne miejsca w limicie Ratusza; brak łóżka nie blokuje przyjazdu, ale po nim obowiązują indywidualne skutki braku mieszkania. Historyczne rozpoczęte rejsy zachowują wcześniej opłacone posiłki i nie są obciążane drugi raz. Wyjeżdżają osoby rzeczywiście w Domu z zachowaniem stanu. U źródła zostaje minimum 12 na matce lub 6 na córce. Nie można zmienić rodzaju ładunku podczas podróży.

Zaproszenie mieszkańca kosztuje pełną cenę kolejnej rozbudowy Ratusza we wszystkich sześciu zasobach. Wymaga wolnego miejsca w limicie Ratusza; wolne łóżko nie jest warunkiem zaproszenia. Przed zakupem gra wyjaśnia zwiększone zużycie jedzenia, połowę wydajności pracy i brak punktów z Domu dla osoby bez łóżka.

Rezerwacja towaru zabiera go źródłu od razu, a zapisany rejs rozlicza się raz. Brak zwykłego miejsca zachowuje ładunek do rozładunku; bonus zachowuje odrębne pochodzenie i zwolnienie z limitu. Dodatkowe 1000 pojemności towarowej kosztuje 4,99 zł w wielokrotnościach pakietu. To oznaczona symulacja Paynow w DEV/PRE-PROD, bez pobrania pieniędzy; rzeczywiste zwiększenie wymaga zaufanego potwierdzenia operatora i serwera. Nie zwiększa automatycznie limitu 100 pasażerów.


## Chmura, konto i zakres uruchomienia

Postęp konta wyłącznie w chmurze, bez lokalnych wysp/kopii/kolejek. Awaria zapisu blokuje dalsze zatwierdzanie, nie uruchamia gościa. Lokalny DEV jest nietrwałym podglądem. Techniczna sesja i język mogą być przechowywane przez przeglądarkę.

Kod rejestracji e-mail i Google/Facebook wymaga aktywacji dostawców przez właściciela. Udostępnienie osiągnięcia inicjuje i zatwierdza gracz; strona i osobisty push FB są odłożone. Zapisane punkty weryfikacji społecznościowej/poleceń nie są prawdziwym potwierdzeniem publikacji.

Backend zawiera kod API kont, atomowych kodów i retencji, ale jego aktywacja wymaga routingu, uprawnień i konfiguracji. Gospodarka nadal jest wyliczana przez klienta. Po trzech miesiącach kalendarzowych bez rzeczywistej gry wyspa może zostać usunięta; konto i historie pozostają, admin1–3 PRE-PROD są wyłączeni. Automatyczne zwroty wycofane; [regulamin](TERMS-DRAFT.pl.md) to szkic do weryfikacji.

Na później pozostają: autorytatywna gospodarka/wyniki serwera, rzeczywiści dostawcy płatności i reklam, aktywacja OAuth, potwierdzanie publikacji/poleceń, osobna modlitwa, błogosławieństwa za wyzwania/social, AR/planszówka i dalszy balans. Wysokości lojalności i podstawowe reguły reklam nie są już otwartymi pytaniami.

## Historyczny odbiór wersji 9

Wydanie **frontend-v13 / Excel 9** zakończyło implementację, odbiór lokalny, publikację i odbiór publiczny: **388/388 testów modelu PASS**, pięć lokalnych zestawów przeglądarkowych i trzy zestawy rzeczywistego Pages PASS. Udane [Pages 40012462614](https://github.com/ksobczak321-oss/gra/actions/runs/40012462614); publiczny Excel i 17 plików gry zwracały HTTP 200 oraz zgadzały się z lokalnymi sumami kontrolnymi. Dowody zachowuje [dziennik](IMPLEMENTATION-LOG.md); ten wpis nie opisuje odbioru v17.
