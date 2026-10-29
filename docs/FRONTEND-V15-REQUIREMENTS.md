# Pakiet GO — frontend v15

Status: implementacja i odbiór lokalny ukończone — 440/440 testów modelu oraz siedem grup Chromium PASS. Publicznego odbioru v15 nie potwierdzono, ponieważ proxy środowiska zwraca HTTP 403 dla Pages i API GitHuba. Poniższe 17 wymagań zbiera uwagi użytkownika od wydania v14 do ostatniego „GO”; powtórzone zrzuty tłumaczeń i miniatur dotyczą tych samych wymagań. Wyników i publikacji v13/v14 nie traktujemy jako potwierdzenia tego pakietu.

## Uzgodnione zmiany

| ID | Wymaganie | Kryterium odbioru |
|---|---|---|
| V15-01 | Jednakowe miniatury | Wszystkie budynki w Administracji i Gospodarce mają jednakowe pole miniatury oraz proporcje, również szeroki Port i Farma. Obraz jest dopasowany do wspólnej ramki, a nazwy i liczniki mają spójne położenie. |
| V15-02 | Podpis liczby pracowników | Zamiast samotnego zera kafelek miejsca pracy pokazuje „Pracuje: 0” i właściwą liczbę. Zachowuje informacje o idących `(+n)` i odwołanych `(−n)` osobach, także na telefonie. |
| V15-03 | Budynek na jednym ekranie | Na komputerze karta każdego budynku mieści podstawowe informacje i dostępne działania w jednym ekranie bez przewijania. Dodatkowe objaśnienia są pod i lub w zwijanych szczegółach; na telefonie układ pozostaje czytelny. |
| V15-04 | Powrót do menu | Przejście z menu wyspy do Ratusza lub innego widoku daje strzałkę powrotu do poprzedniego menu. Zamknięcie okna i powrót to różne czynności, a nawigacja nie tworzy nieskończonej pętli. |
| V15-05 | Własna nazwa wyspy | Rejestracja zawiera pole „Nazwa wyspy”; po poprawnym zatwierdzeniu nazwa zastępuje „Twoja wyspa” w nagłówku i menu. Nazwa jest przypisana do właściwego lokalnego profilu, pozostaje dosłowna w EN/PL i nie wymaga udawania połączenia z usługą kont. |
| V15-06 | Pełny polski interfejs | Polska wersja nie miesza języków w opisach, przyciskach, podpowiedziach, powiadomieniach i błędach. Audyt obejmuje m.in. estymatę budowy, „Pozostałe użycia” Kaplicy, zadania i pulę ekspedycji; angielski pozostaje osobnym wyborem w ustawieniach. |
| V15-07 | Ruiny latarni | Usuwamy cały blok „Nie zbudowano / Zbuduj ten budynek, aby rozpocząć”. Poziom 0 latarni przedstawia stan „Ruiny” bez powtarzania drugiego komunikatu o braku budynku. |
| V15-08 | Nazwy poziomów latarni | Każdy osiągany poziom 1–100 ma własną nazwę etapu odbudowy i rozwoju, w obu językach. Nazwy są warstwą opowieści i nie dodają kosztów, warunków ani nowych efektów. |
| V15-09 | Cel całej gry | Celem jest rozwój całej wyspy i szczęście jej mieszkańców. Opisy celu, strony startowej i powiązanych podpowiedzi uwzględniają osadę, produkcję, handel, transport i wszystkie budynki; latarnia jest częścią rozwoju. |
| V15-10 | Opisy w menu budynków | Każdy kafelek w menu „Budynki” ma krótki, jednozdaniowy opis funkcji budynku obok poziomu i wejścia w szczegóły. Opis odpowiada rzeczywistej logice. |
| V15-11 | Jasny opis zadań | Opis wyjaśnia jedno aktywne zadanie, bezpośrednie darowizny z centrali również w ratach, brak zwrotu i utratę wpłat po wygaśnięciu. Wyjaśnia własny zegar zadania i ochronę rezerwy żywności, naturalną polszczyzną. |
| V15-12 | Mieszkańcy: opis i ramki | Teksty, liczby i jednostki mieszczą się w kartach. Krótki opis wyjaśnia rolę mieszkańców, pracę i potrzeby oraz przybywanie przy dodatnim szczęściu i odejścia przy ujemnym, z limitami Ratusza, Domu i minimum sześciu osób. |
| V15-13 | Opis magazynu | Nad sekcją Magazynu centralnego znajduje się krótki opis jego roli, limitu łącznego i limitów materiałów oraz pracy tragarzy. Opis uwzględnia nową bazową ładowność. |
| V15-14 | Atrakcje: zasięg, cena i wyłączność | Oferta losuje udział od 1% do 50% populacji i kieruje bonus do tylu uprawnionych osób, ile wynika z tego udziału. Cena rośnie z sumą przyznawanych pp; na całej wyspie trwa jedna nowa atrakcja przez 6 h, a następną wolno rozpocząć od razu po końcu efektu. |
| V15-15 | Produkcja ×2 | Bazowa produkcja wszystkich pięciu materiałów na osobę jest podwojona: 20/24/26/28… zamiast 10/12/13/14…. Głód i istniejące premie działają nadal, bez podwajania podatku lub zużycia żywności przez samo wprowadzenie nowej bazy. |
| V15-16 | Ładowność transportu ×2 | Bazowy ładunek każdego tragarza wynosi 120 zamiast 60 sztuk na poziomie 1; bazowy pełny kurs nadal trwa 5 min. Poziom miejsca pracy i drogi skalują nową bazę, a estymaty i kursy Premium korzystają z tej samej ładowności. |
| V15-17 | Bez logowania w menu gracza | Z menu wyspy usuwamy przycisk „Zaloguj się lub załóż konto”, ponieważ jest to widok osoby już grającej. Oddzielne formularze rejestracji i logowania zachowują swoje przeznaczenie. |

## Doprecyzowania przyjęte podczas wdrożenia

- Użytkownik wybrał **jedną aktywną atrakcję przez całe 6 h**. Wymóg nieczęściej niż co 30 min jest przez to spełniony; nie dodajemy kolejnych 30 min oczekiwania po końcu sześciu godzin.
- Procent zasięgu losuje się raz dla oferty i zapisuje wraz z nią. Liczba odbiorców to `min(uprawnieni, max(1, floor(populacja × procent / 100)))`; przy dodatniej populacji mały procent daje co najmniej jedną osobę, a brak uprawnionych blokuje zakup.
- Zachowujemy wcześniejsze kryteria odbiorców: najniższe efektywne szczęście, losowanie remisów, pominięcie nowych osób z zamrożonym 0% i osób już na 100%. Cena to `ceil(pp po przyzwyczajeniu × faktyczna liczba odbiorców)` monet, minimum jedna przy dodatnim efekcie.
- Pięć ofert odnawia się o północy czasu polskiego. Przyzwyczajenie danego rodzaju nadal wraca do pełnej skuteczności po 24 h przerwy; wyłączność nie usuwa Kaplicy, latarni ani innych niezależnych premii.
- Już opłacone, nakładające się efekty ze starego zapisu zachowują swoich odbiorców i pozostałe czasy. Nowy zakup czeka do zakończenia ostatniego takiego efektu.
- Ładunek kursu już będącego w drodze nie jest powiększany przy wczytaniu. Nowa ładowność obowiązuje kolejne odbiory; zapisana część wyprodukowanej sztuki zachowuje postęp przy nowej szybkości.
- Nazwa wyspy ma 2–40 znaków po uporządkowaniu odstępów i jest wyświetlana jako tekst, bez tłumaczenia własnej treści. Błędny formularz niczego nie zapisuje; poprawne zatwierdzenie zapisuje tylko nazwę i jej czas, bez hasła ani adresu e-mail.
- Samodzielnie otwarty formularz konta kieruje domyślnie do zwykłego profilu nowego gracza, bez grantu testowego. Wejście z istniejącej wyspy zachowuje jej profil i slot; starszy profil testowy jest przekazywany jawnie jako `profile=preview`.

## Weryfikacja i zakres

Końcowe liczby testów i stan publikacji zawiera [dziennik implementacji](IMPLEMENTATION-LOG.md). Bieżące scenariusze obejmują [profil](../tests/harborlight-v15-profile.test.mjs), [gospodarkę](../tests/harborlight-v15-economy.test.mjs) i [atrakcje](../tests/harborlight-v15-attractions.test.mjs); testy przeglądarkowe kontrolują rzeczywiste widoki, języki i mobilne ramki.

To nie jest wdrożenie prawdziwych kont/OAuth, płatności, reklam ani serwerowego potwierdzania publikacji i poleceń. Te integracje oraz nieustalone wcześniej kwoty lojalności pozostają odłożone. [Excel 9](arkusze/HARBORLIGHT9-zasady.xlsx) pozostaje niezmienionym archiwum poprzedniego wydania; w tym pakiecie nie generujemy nowego arkusza.
