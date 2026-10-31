# Polityka prywatności HARBORLIGHT

Wersja: 2026-10-31-draft2. Data projektu: 31 października 2026 r.

DOKUMENT ROBOCZY DO PRZEGLĄDU WŁAŚCICIELA. Pola „Lorem ipsum” są demonstracyjne. Przed publicznym uruchomieniem wymagają rzeczywistych danych administratora, działającego kontaktu i sprawdzenia konfiguracji dostawców oraz okresów przechowywania.

## 1. Administrator danych

Administratorem danych jest: Lorem ipsum — nazwa albo imię i nazwisko do uzupełnienia. Adres: Lorem ipsum — do uzupełnienia. Publiczny e-mail do spraw konta i ochrony danych: Lorem ipsum — do uzupełnienia. Dane działalności i ewentualnego inspektora ochrony danych: do uzupełnienia, jeżeli mają zastosowanie.

Polityka opisuje dane potrzebne do konta i rozgrywki HARBORLIGHT. Potwierdzenie zapoznania się z nią nie jest zgodą na marketing lub wszystkie operacje na danych. Podstawą koniecznych operacji jest zwykle realizacja usługi, a nie dobrowolna zgoda.

## 2. Jakie dane są przetwarzane

Dane konta obejmują identyfikator Firebase UID, adres e-mail lub identyfikator dostawcy logowania, wybraną nazwę wyspy oraz techniczne informacje o metodzie logowania i sesji. Nie należy wpisywać danych wrażliwych ani cudzych danych w nazwie wyspy.

Dane gry obejmują stan wyspy, zasoby, budynki, mieszkańców, zadania, zdarzenia i statystyki, ustawienia, historię powiadomień, wersję i generację zapisu, czasy działań oraz ostatnią rzeczywistą aktywność. Dla realizacji korzyści mogą być zapisywane historie nagród jednorazowych, kodów, poleceń i potwierdzonych uprawnień.

Konto może obejmować dwie wyspy, wybór aktywnej wyspy, historię przewozów i pojemność wspólnego statku. Handel między graczami obejmuje wystawione oferty, rezerwacje materiałów, przyjęcia, anulowania, zwroty, czasy i identyfikatory służące zapobieganiu wielokrotnej realizacji tej samej operacji.

Potwierdzenie dokumentów obejmuje UID, zaakceptowane wersje Regulaminu i Polityki prywatności oraz czas serwera. Nie zbieramy dodatkowo numeru PESEL, dokumentu tożsamości czy daty urodzenia tylko w celu zwykłego utworzenia konta.

Dane techniczne i bezpieczeństwa mogą obejmować adres IP, typ przeglądarki i urządzenia, czas żądania, informacje o błędach, nadużyciach i logowaniach. Zakres zależy także od niezbędnych logów infrastruktury Google. Hasło do konta e-mail/hasło jest przekazywane do Firebase Authentication; gra nie zapisuje go jako jawnego tekstu w zapisie wyspy ani pamięci przeglądarki.

## 3. Cele i podstawy prawne

Utworzenie konta, logowanie, udostępnienie wyspy, synchronizacja między urządzeniami i obsługa zgłoszeń służą zawarciu i wykonaniu umowy o usługę — art. 6 ust. 1 lit. b RODO. Podanie danych koniecznych do tej usługi jest dobrowolne, ale bez nich konto i trwały postęp nie mogą działać.

Bezpieczeństwo, zapobieganie nadużyciom, zapewnienie spójności zapisu, ustalenie i obrona roszczeń oraz niezbędna diagnostyka mogą opierać się na prawnie uzasadnionym interesie administratora — art. 6 ust. 1 lit. f RODO, z uwzględnieniem praw i interesów użytkownika.

Obowiązki podatkowe, rachunkowe, prawnie wymagane odpowiedzi i dokumentacja mogą opierać się na art. 6 ust. 1 lit. c RODO, jeśli dana czynność jest objęta takim obowiązkiem. Rzeczywiste płatności nie są obecnie uruchomione.

Opcjonalny marketing, analityka niewymagana do usługi lub profilowane reklamy, jeśli zostaną włączone, wymagają odrębnego ustalenia podstawy prawnej i odpowiednich informacji oraz zgód, gdy są wymagane. Samo zaakceptowanie Regulaminu nie włącza takich funkcji. Nie dodano obowiązkowej zgody marketingowej.

## 4. Google, Facebook i udostępnianie osiągnięć

Po wyborze aktywnego logowania Google lub Facebook dostawca uwierzytelnia użytkownika według własnych zasad. Firebase może otrzymać identyfikator, e-mail i podstawowe dane profilu udostępnione w tym procesie. Gra wykorzystuje identyfikację potrzebną do konta; nie otrzymuje hasła do Google lub Facebooka i nie wymaga importowania listy znajomych.

Te metody działają dopiero po konfiguracji dostawcy przez właściciela. PRE-PROD dopuszcza trzy stałe UID; powiązanie dostawcy z kontem testowym nie resetuje jego tożsamości ani wyspy. Produkcyjne konta są odrębne.

Gracz sam wybiera i zatwierdza udostępnienie osiągnięcia. Otwarty formularz Facebooka lub funkcja systemowego udostępniania przekazuje wskazany link i treść do wybranego serwisu według jego zasad. Nie oznacza automatycznej publikacji. Gra nie uruchamia automatycznych postów na prywatnym profilu, osobistych powiadomień Facebooka ani publikacji na stronie gry bez odrębnego wdrożenia i uprawnienia.

Wystawienie oferty wymiany udostępnia innym zalogowanym graczom nazwę wyspy, oferowany i oczekiwany materiał z ilościami, identyfikator i termin oferty. Adres e-mail, hasło i pełny zapis wyspy nie są częścią publicznej oferty. Techniczny UID właściciela służy serwerowi do kontroli uprawnień; inni gracze nie potrzebują go w odpowiedzi listy ofert. Własne oferty i prywatna skrzynka zwrotów są dostępne po uwierzytelnieniu. Publikacja oferty jest działaniem gracza w ramach usługi, nie zgodą na marketing.

## 5. Dostawcy i odbiorcy danych

Google Firebase i Google Cloud obsługują uwierzytelnianie, przechowywanie wysp i hosting oraz techniczne logi. Właściciel musi utrzymywać właściwe warunki i umowy powierzenia z dostawcami. Dostawcy logowania mogą działać także jako odrębni administratorzy w zakresie własnych usług.

Paynow jest planowany dla płatności przeglądarkowych. Obecnie działa tylko symulacja w DEV/PRE-PROD: nie pobiera pieniędzy i nie przekazuje danych do rozliczenia rzeczywistego zakupu. Przed uruchomieniem sprzedaży podamy właściwe dane operatora i zakres informacji przekazywanych do realizacji płatności. Gra nie powinna otrzymywać pełnych danych karty płatniczej.

Rzeczywisty dostawca reklam nie jest jeszcze podłączony. Testowy film i bonus nie oznaczają wysłania danych do komercyjnej sieci reklamowej. Włączenie takiej sieci wymaga aktualizacji informacji o odbiorcach, identyfikatorach i ustawieniach prywatności oraz odpowiednich zgód, jeśli są potrzebne.

Dane mogą otrzymać uprawnione osoby obsługujące usługę oraz doradcy, organy publiczne lub inne podmioty wyłącznie w niezbędnym zakresie i przy właściwej podstawie prawnej. Nie sprzedajemy danych użytkowników.

## 6. Lokalizacja i przekazanie poza EOG

Baza Firestore gry jest skonfigurowana w Warszawie. Nie oznacza to, że wszystkie operacje wszystkich produktów Firebase, logowania, hostingu i wsparcia odbywają się wyłącznie w Polsce lub EOG. Dostawcy mogą korzystać z infrastruktury globalnej.

Jeśli dane są przekazywane poza EOG, wymagane są właściwe podstawy i zabezpieczenia, takie jak aktualna decyzja stwierdzająca odpowiedni stopień ochrony lub standardowe klauzule umowne i inne wymagane środki. Przed uruchomieniem finalnej usługi operator zweryfikuje rzeczywiste regiony, warunki i mechanizmy transferu używanych produktów. Użytkownik może zwrócić się o informacje o odpowiednich zabezpieczeniach.

## 7. Przechowywanie i nieaktywność

Dane bieżącego konta i wyspy są przechowywane w okresie utrzymywania usługi dla użytkownika. Po trzech miesiącach kalendarzowych bez rzeczywistego grania wyspa i jej zasoby mogą wygasnąć zgodnie z Regulaminem. Wygaśnięcie świata nie jest automatycznym usunięciem całego konta, historii płatności lub wymaganych dowodów. Stałe konta PRE-PROD są wyłączone z tego mechanizmu.

Po zamknięciu konta dane niepotrzebne do dalszych zgodnych z prawem celów powinny zostać usunięte lub zanonimizowane. Historię niezbędną do rozliczeń, bezpieczeństwa, dochodzenia roszczeń lub obowiązku prawnego można zachować przez właściwy, uzasadniony okres. Dane rozliczeniowe — po uruchomieniu sprzedaży — mogą podlegać ustawowym okresom podatkowym, co do zasady liczonym przez pięć lat od końca roku, w którym upłynął termin płatności podatku.

Dokładna tabela retencji logów, kopii infrastrukturalnych, kont i dowodów potwierdzeń wymaga uzupełnienia przed finalną publikacją. Nie deklarujemy bezterminowego przechowywania każdej historii. Żądanie usunięcia danych rozpatrujemy także pod kątem ustawowych wyjątków i praw innych osób.

## 8. Pamięć przeglądarki i podobne technologie

Techniczna sesja logowania jest przechowywana w pamięci lokalnej przeglądarki, aby utrzymać dostęp do konta. Przechowujemy też wybór języka. Wylogowanie usuwa techniczną sesję aplikacji; nie usuwa zapisanej w chmurze wyspy. Użytkownik może zmienić ustawienia lub wyczyścić dane przeglądarki, co może wymagać ponownego logowania.

Wyspa, jej kopia odzyskiwania i kolejka trwałego zapisu nie są przechowywane w localStorage ani sessionStorage. Lokalny DEV może mieć wyraźnie oznaczony, nietrwały podgląd w pamięci procesu. Odrębne techniczne mechanizmy własnych domen Google/Meta podlegają także informacjom tych dostawców.

Nie uruchomiono w tym wdrożeniu dodatkowych marketingowych plików cookie, komercyjnej sieci reklamowej ani opcjonalnej analityki odwiedzin. Jeżeli zostaną dodane, informacje i mechanizm wyboru zostaną zaktualizowane przed ich użyciem. Konieczne technologie sesji nie wymagają wymuszonej zgody na marketing.

## 9. Prawa użytkownika i kontakt

W granicach RODO użytkownik ma prawo dostępu do danych i kopii, sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych, a także sprzeciwu wobec operacji opartych na prawnie uzasadnionym interesie. Jeżeli podstawą jest zgoda, można ją wycofać bez wpływu na zgodność wcześniejszych działań z prawem.

Żądania kieruje się na uzupełniony publiczny kontakt administratora. Dla ochrony konta możemy poprosić o proporcjonalne potwierdzenie tożsamości; nie należy przesyłać hasła. Odpowiedzi udzielamy zgodnie z terminami RODO, co do zasady w ciągu miesiąca, z możliwością uzasadnionego przedłużenia zgodnie z przepisami.

Można wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych: https://uodo.gov.pl/. Podstawowy tekst RODO jest dostępny pod adresem https://eur-lex.europa.eu/eli/reg/2016/679/oj.

## 10. Bezpieczeństwo, decyzje i zmiany

Stosujemy uwierzytelnianie i przypisanie zapisu do konta, kontrolę wersji/generacji, ograniczenie dostępu do środowisk oraz szyfrowane połączenia HTTPS tam, gdzie usługa jest hostowana. Nie oznacza to gwarancji braku błędów lub incydentów. Użytkownik powinien chronić urządzenie i dane logowania.

Automatyczne reguły gry naliczają zasoby, czasy, kary i nagrody. Nie są oceną zdolności kredytowej ani inną decyzją o podobnym istotnym skutku prawnym wobec osoby. Nie prowadzimy na tej podstawie marketingowego profilowania użytkowników.

Istotne zmiany celów, odbiorców lub zasad będą opisane w nowej wersji polityki. Nowe obowiązkowe potwierdzenie, jeśli jest potrzebne, nie może zastąpić odrębnej dobrowolnej zgody na nowy cel. Numery wersji pomagają wykazać, z jakimi informacjami zapoznał się gracz.
