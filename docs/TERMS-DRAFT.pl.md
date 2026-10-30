# HARBORLIGHT — szkic zasad korzystania i zakupów

**SZKIC DO WERYFIKACJI. Nie jest opublikowanym regulaminem sprzedaży ani potwierdzeniem zgodności prawnej.** GO użytkownika obejmuje implementację założeń gry, nie zastępuje przygotowania danych sprzedawcy, obowiązkowych informacji i sprawdzenia praw konsumenta przed uruchomieniem płatności.

## Dane i dokumenty do uzupełnienia przed publikacją

- Nazwa i forma prawna operatora, adres, dane rejestrowe oraz kontakt do reklamacji.
- Warunki świadczenia usług/treści cyfrowych, ceny brutto, potwierdzenie zakupu i wymagane zgody.
- Polityka prywatności, podstawy i terminy przechowywania danych, sposób realizacji praw użytkownika.
- Zasady reklamacji, ustawowych uprawnień i ewentualnych zwrotów; warunki właściwego operatora/sklepu.
- Zasady korzystania przez osoby niepełnoletnie oraz ograniczenia kanałów web/Android/iOS.

Poniższe punkty są projektem funkcjonalnym. Nie wyłączają praw wynikających z obowiązujących przepisów.

## Konto i świat gry

Konto służy do dostępu do własnej wyspy i historii uprawnień. Postęp przechowywany jest w chmurze; gra wymaga połączenia do pobrania i zatwierdzenia stanu. Lokalny podgląd deweloperski nie tworzy konta i nie daje trwałego postępu.

Nowa wyspa rozpoczyna się raz przy pierwszym wejściu. Kolejne logowania nie przyznają ponownie pakietu startowego ani nagród „raz na konto”. Wylogowanie lub zamknięcie strony nie zatrzymuje upływu czasu świata.

## Wirtualne zasoby i zakup

Ceny i zawartość pakietu muszą być pokazane przed potwierdzeniem. Zakup jest przyznawany po zweryfikowanym potwierdzeniu operatora lub sklepu, nie na podstawie komunikatu samej przeglądarki. Nieudana albo anulowana płatność nie przyznaje zakupu.

Projekt przewiduje płatności Paynow w wersji przeglądarkowej. Kanały mobilne wymagają właściwego wdrożenia sklepowego. W DEV/PRE-PROD działa oznaczona symulacja, która nie pobiera prawdziwych pieniędzy i nie jest ofertą produkcyjnej sprzedaży.

Monety oraz materiały służą do działań w grze. Efekty, budowy, transport i wydarzenia mają opisane czasy, limity oraz ryzyka, w tym utratę niewypłaconej puli ekspedycji i możliwe ubytki wolnych zasobów w zdarzeniach świata. Zasady nie mogą sugerować gwarantowanej nagrody, gdy wymagane warunki nie są spełnione.

## Uprawnienie bez reklam

Projektowe kryterium: suma potwierdzonych zakupów brutto co najmniej 19,99 zł w poprzednich ruchomych 30 dniach. Nie jest to gwarancja 30 dni od ostatniej wpłaty: uprawnienie wygasa, gdy starsze zakupy wypadają z okna i suma spadnie poniżej progu. Anulowane/zwrócone zakupy nie tworzą trwałego uprawnienia.

Uprawnienie dotyczy standardowej gry. Standardowe bonusy są dostępne bez filmu przy zachowaniu limitów; reklamy za dobrowolny dodatkowy czas wewnątrz ekspedycji pozostają dostępne. Pakiet budowlany 24 h za monety jest oddzielnym produktem i nie dziedziczy tego zegara.

## Reklamy i kody

Nagroda za prawdziwą reklamę wymaga potwierdzenia dostawcy. Nie obiecujemy, że każda reklama trwa dokładnie 10 sekund. Symulacja deweloperska jest odrębna i nie może działać jako potwierdzenie produkcyjne.

Kody mają określoną nagrodę, okres dostępności i limit realizacji. Globalną kolejność oraz jednokrotny odbiór rozlicza serwer. Publikacja kodu na Facebooku nie gwarantuje osobistego powiadomienia od Facebooka. Udostępnienie osiągnięcia inicjuje i zatwierdza gracz.

## Nieaktywność i wygaśnięcie wyspy — do weryfikacji prawnej

Założenie projektowe: po trzech miesiącach kalendarzowych bez rzeczywistej gry wyspa oraz związane z nią niewykorzystane dobra mogą zostać usunięte. Pozostają konto oraz historie płatności, kodów, poleceń i jednorazowych nagród. Reset nie umożliwia ponownego odebrania korzyści „raz na konto”.

Rzeczywistą aktywnością jest działanie gracza, także dotyk, klawiatura i sterowanie minigrą. Automatyczne odnowienie sesji, pobranie danych lub pozostawiona karta nie odnawiają okresu nieaktywności. Termin jest liczony według prawdziwego czasu Warszawy, nie fikcyjnej daty świata.

**Automatyczne zwroty niewykorzystanego salda po trzech miesiącach zostały wycofane z projektu.** Dopuszczalność wygaszania płatnych dóbr, sposób poinformowania użytkownika i wyjątki wynikające z prawa wymagają weryfikacji przed uruchomieniem sprzedaży. Sam ten szkic nie przesądza skuteczności postanowienia i nie wyłącza ustawowych uprawnień.

Stałe konta testowe PRE-PROD są wyłączone z tej retencji. Stara karta przeglądarki nie może odtworzyć skasowanej generacji wyspy.

## Stan publikacji

Dokument nie jest dołączony jako zatwierdzony regulamin oferty. Rzeczywista sprzedaż, operator, konfiguracja produkcyjna i końcowa treść regulaminu wymagają osobnego uruchomienia i sprawdzenia. Dowody publikacji gry zapisuje [dziennik](IMPLEMENTATION-LOG.md), a zakres implementacji [wymagania v18](FRONTEND-V18-REQUIREMENTS.md).
