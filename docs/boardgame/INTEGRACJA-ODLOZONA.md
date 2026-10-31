# Integracja z grą online — wyłączona z bieżącego GO

Ten dokument zachowuje wcześniejsze propozycje. Nie są zaimplementowane w pakiecie fizycznym. Żaden QR, punkt sesji ani plik telefonu nie przyznaje nagrody online.

## Zysk konta online: nowa kategoria aktywności, konkretna korzyść

Aktualna gra **nie ma uniwersalnego XP za wszystkie zadania**. Obecny ranking ma inną formułę, a zadania Latarni mają własne wymagania, wpłaty i nagrody. Nie wolno nazwać nowego pola istniejącymi „punktami zadań”, wypełnić 25 lekcji samouczka ani odebrać zaplanowanej nagrody Latarni samym kliknięciem z planszówki.

**Propozycja do zatwierdzenia:** powstaje kontowy dziennik **„Zadania przy stole”**. Za każdą zaliczoną scenę użytkownik otrzymuje 1 punkt wypraw, najwyżej osiem za jedną rozliczaną sesję tygodniowo. Punkty są trwałe i odblokowują kolejne kosmetyki: po 8 — proporzec „Pierwsza załoga”, po 24 — dekorację dzwonu przy Porcie, po 48 — skórkę znaków na własnym statku. To nie poziomy budynków, nie produkcja i nie nagrody ligi.

Dodatkowo proponujemy **50 monet za każdą z pierwszych pięciu zaliczonych scen**, najwyżej **250 monet na konto na tydzień ISO**. Dla K=6 przykład daje **6 punktów wypraw + 250 monet**. Przy K=3: 3 punkty + 150 monet. Ruch pionkiem, specjalność karty, zwycięstwo osobiste i liczba gości nie zwiększają pieniędzy. Nie ma nieograniczonej serii 50→100→200 znanej z ekspedycji.

Oba limity dotyczą **jednej rozliczonej sesji na konto w tygodniu Warszawy**, od poniedziałku 00:00 do kolejnego poniedziałku. Nie sumujemy scen z kilku partii ani kilku miejsc przy stole. Tydzień przypisuje się według rozpoczęcia sesji, a nie późniejszego odbioru kodu. Użytkownik przed odbiorem widzi, czy ma wolny limit; powtórna zabawa jest zawsze możliwa bez kolejnej nagrody. Dokładne progi i sposób informowania uczestnika bez własnego telefonu wymagają odbioru interfejsu.

Poprzedni wariant „tylko pamiątka i opcjonalne +2 szczęścia” jest **zastąpiony** tym projektem punktów, odblokowań i ograniczonych monet. Nie dokładamy obu wariantów do siebie. Wysokość 50/250 i progi kosmetyków pozostają propozycjami balansu, nie zatwierdzonymi cenami czy już istniejącą funkcją.

### Kto może odebrać wynik

Docelowo **każdy rzeczywisty uczestnik mający konto online może odebrać wynik**, w swoim własnym tygodniowym limicie. Konto gospodarza jest tylko jednym miejscem. Za gości gospodarz nie otrzymuje dodatkowych monet ani punktów. Osoby bez konta grają pełną grę bez nagrody online i bez przymusu rejestracji.

Wystarcza jeden telefon: przy starcie każde miejsce otrzymuje prosty kod uczestnictwa, który można zapisać na kartce; to nie nowa karta lub talia. Kod nie zawiera hasła i nie loguje do konta. Po zakończeniu uczestnik może we własnej zalogowanej grze wpisać kod i przypisać **jedno miejsce** do swojego konta. Proponowana ważność to 72 godziny od finału. Konto musi istnieć przed rozpoczęciem sesji, żeby nie dopisywać po wyniku nowych kont do pustych miejsc. Gospodarz nigdy nie dostaje cudzych danych logowania.

Serwer nie pozwala zrealizować tego samego miejsca drugi raz ani przypisać dwóch miejsc do jednego konta. Każdy odbiorca wybiera własną wyspę, a jego nagroda nie trafia do świata gospodarza. Wiele urządzeń, kodów i wysp nie odnawia limitu. Jedna osoba nie może pobierać kilku nagród przez multikonta; same konta i kody nie dowodzą jednak, ile osób siedziało przy stole. Kod potwierdza uprawnienie do wyniku zapisanej sesji, **nie fizyczną obecność**. Dokładniejsza ochrona przed nadużyciami jest etapem projektu serwera.

Najwcześniejszy test techniczny może zacząć od nagrody gospodarza, ale nie jest to docelowa zasada scenariusza. Korzyść dla pozostałych uczestników z kontem jest częścią projektu.

### Rozliczenie raz i powiązanie ze zwykłą grą

1. Serwer tworzy `sessionId`, wersję scenariusza, gospodarza i jego wyspę/generację, stałą liczbę miejsc, niepowtarzalne kody oraz tydzień wyniku. Konto gospodarza ma jedno miejsce; pozostałe kody można później odebrać wyłącznie we własnej sesji logowania.
2. Losowanie ośmiu scen, role, żądania i kolejność zapisywane są w chmurze. Po rozłączeniu wracamy do ostatniego potwierdzonego kroku. Nie powstaje lokalna wyspa lub ukryta kolejka wypłat; na papierze można dokończyć zabawę bez nowego dowodu online.
3. Rozliczenie nalicza K z zapisanych, odrębnych zdarzeń. Potwierdza zaangażowanie aplikacji, **nie udowadnia fizycznego odegrania sceny ani obecności sześciu osób**. Niskie limity ograniczają koszt; kod QR lub kamera nie rozwiązują tego zaufania. Dla prawdziwych nagród potrzebny jest serwerowy rejestr i kontrola nadużyć, nie klientowe `verified:true`.
4. Finał utrwala K i zamyka wynik. Odbiór kodu atomowo sprawdza konto, miejsce i wolny limit tygodniowy, zapisuje punkty, monety, odblokowania, wskazaną wyspę/generację oraz paragon. Ponowienie po utracie odpowiedzi zwraca ten sam wynik; równoległe odebranie przez dwie osoby ma jednego zwycięzcę, bez drugiej wypłaty.
5. Zmiana aktywnej wyspy nie tworzy drugiego limitu. Reset świata w trakcie odbioru wymaga zgodnej generacji; ponowienie nie przenosi już wypłaconej nagrody na nową wyspę. Reset i trzymiesięczna retencja nie odnawiają kontowego licznika. Odrębnie trzeba ustalić zachowanie niedokończonej sesji po resecie świata gospodarza i limit rozpoczynania/anulowania partii — nie są one przyjętymi parametrami.
6. Monety ze źródła `physical_session` są **niekwalifikowane do dobroczynności**, a punkty nie trafiają do ligi. Monetowy wpływ do zwykłego salda może pośrednio zmienić dotychczasowy ranking Ratusz×monety; nie twierdzimy, że nagroda jest pozbawiona wpływu na gospodarkę.

W trybie „Gra fizyczna” zwykłe jedzenie, budowy i zegar świata nadal biegną. Rzeczywiste odsłonięcie instrukcji, odpowiedź albo zatwierdzenie rundy jest aktywnością; sam ekran, heartbeat i minutnik nie odnawiają sesji w nieskończoność. Przy pięciominutowych rundach telefon jest normalnie obsługiwany częściej niż próg 30 minut. Powiadomienia i oferty minigier czekają do bezpiecznego końca sceny; ta integracja jeszcze nie istnieje. Wylogowanie lub brak chmury nie oznaczają przyznania nagrody, lecz nie zabraniają dokończyć gry na stole.

