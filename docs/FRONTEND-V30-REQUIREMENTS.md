# DEV 0.13.1.0 — nowe otoczenie Teatru

Użytkownik zaakceptował koncepcję Teatru, ale odrzucił jego dotychczasowy wygląd: budynek i plac sprawiały wrażenie elementów z innej gry. Poleceniem „jedziesz GO” z 3 listopada 2026 zlecił dopasowanie Teatru do miasta i zdecydowanie ładniejsze otoczenie. Aranżowanie ma być przyjemną grą w grze, w której gracz sam określa, co uważa za piękne.

Zakres obejmuje DEV, Git, własne CI i podgląd Pages. Odebrany DEV 0.13.0.0 pozostaje osobnym źródłem `cf6739a081d89bb5b2c6773a04a34f3fe2a8a8da` z własnym zielonym CI, Pages i tagiem. PRE-PROD pozostaje 0.12.0.0 / `d9e2940b9a00755d979c159ec0fb62e290dd7ff1`. Nowe GO nie obejmuje promocji GCP, resetu kont, PROD ani uruchomienia rzeczywistych płatności, reklam i przelewów.

## Teatr na mapie wyspy

- Na głównej mapie widoczny jest sam budynek, pasujący do istniejącej zabudowy: perspektywa, materiały, światło, skala i miękki kontakt z podłożem odpowiadają grafice wyspy.
- Plac, paleta i ustawione dekoracje są dostępne po kliknięciu Teatru. Usuwamy z mapy miniaturowy prostokątny obraz całego dziedzińca.
- Nowa pozycja jest w rzeczywistej części zabudowanej, przy małym domku na lewo od Kaplicy. Współrzędne są parametrem wdrożenia, nie regułą gospodarki. Kliknięcie i wskazanie w tutorialu nadal prowadzą do Teatru.
- Ta decyzja zastępuje wyłącznie mapową prezentację aranżacji z HL-CHG-1044. Stały budynek, wejście do dużego widoku i zachowanie zapisów pozostają.

## Studio aranżowania

- Duża, bogatsza sceneria Teatru i ogrodu korzysta z grafiki spójnej z wyspą. Oddzielne dekoracje mają szczegółowe materiały, roślinność, wodę i delikatne oświetlenie. Płaskie symbole nie są główną warstwą wizualną sceny.
- Zachowujemy istniejący plac z 20 miejscami, 10 rodzajami dekoracji i pięcioma stylami. Późniejszy steering użytkownika usuwa dotychczasowy twardy koniec na poziomie 20: rozwój ma być kontynuowany, jeśli gracz dysponuje wymaganymi środkami. Poziomy 1–20 pozostają punktami odniesienia grafiki, nie limitem rozgrywki. Podgląd pokazuje wygląd przed wydaniem monet.
- Gracz wybiera ozdobę, ustawia ją, przenosi, zamienia miejscami albo odkłada do kolekcji. Przestawianie i przechowywanie są bezpłatne i zachowują tożsamość oraz poziom przedmiotu.
- W trybie „Podziwiaj ogród” sceneria pozostaje widoczna bez siatki, zaznaczeń i narzędzi edytora. Powrót do aranżowania nie zmienia zapisanej kompozycji.
- Telefon otrzymuje czytelną scenę, poziomą paletę, krótki inspektor i powiększanie placu. Wskazane miejsce można zmieniać klawiaturą. Aktualizacje salda lub zegara nie zabierają fokusu i nie zamykają kontrolki używanej przez gracza.

## Parametry studia przyjęte w DEV

Poniższe narzędzia są sposobem realizacji zatwierdzonej swobody twórczej. Nie były osobnymi liczbowymi decyzjami użytkownika i nie wprowadzają dodatkowych opłat ani bonusów gospodarczych.

- Trzy warianty światła: słoneczny dzień, zachód słońca i wieczór przy latarniach.
- Trzy nawierzchnie: piaskowiec, kamienne płyty i ceglana mozaika.
- Trzy miejsca na zapamiętane układy: „Pomysł 1”, „Pomysł 2” i „Pomysł 3”. Zapis obejmuje rozmieszczenie posiadanych dekoracji, ich style i atmosferę. Odtworzenie nie przywraca starego poziomu, monet, nagrody ani nie tworzy kopii przedmiotu. Ozdoby spoza zapamiętanego układu wracają do kolekcji.
- Opcjonalne inspiracje, np. zielona oaza, wieczór nad morzem, śródziemnomorska elegancja i piracka przystań. Podpowiadają materiały, typy i nastrój; nie oceniają urody, nie wymagają konkretnej kompozycji i nie kupują dekoracji za gracza.

## Ekonomia i ciągłość

Dotychczasowe ceny poziomów 1–20 w monetach pozostają; dalsze rosną tą samą formułą. Reklama jest wymagana co 5 poziomów, także po 20. Uprawnienie bez reklam i potwierdzanie ukończonego filmu działają jak wcześniej. Anulowanie reklamy nie pobiera ceny i nie odblokowuje poziomu. DEV korzysta z jawnej symulacji, a PROD nie przyjmuje fikcyjnego potwierdzenia.

Istniejące kolekcje, poziomy, rozmieszczenie i oczekujące operacje są zachowywane. Nowe pola atmosfery i układów mają bezpieczne wartości domyślne przy odczycie starego zapisu. Produkcja, transport, budowy i terminy misji biegną podczas aranżowania. Nie dodajemy rankingu piękna, kar za aranżację ani źródła nieograniczonych monet lub szczęścia.

## Trwały plac i dalszy rozwój — dodatkowy steering

Bieżąca kompozycja jest częścią automatycznie zapisywanej wyspy. Nie trzeba zapisywać jej jako jednego z trzech „Pomysłów”. Po ponownym zalogowaniu na to samo konto gracz ma kontynuować ten sam ogród: przykładowo w poniedziałek kupuje fontannę, we wtorek ją ulepsza, a w środę przenosi albo odkłada do kolekcji. Zachowane są tożsamość, poziom, styl, miejsce i własność; zdjęcie z placu nie usuwa przedmiotu z kolekcji.

Wymaganie trwałości wymaga roundtripu przez potwierdzony zapis konta i odtworzenia po przerwie. Nietrwały podgląd Pages ani samo działanie dodatkowych „Pomysłów” nie stanowią takiego dowodu. W przypadku braku wymaganej usługi ręczny test otrzymuje BLOCKED.

Ostateczna odpowiedź użytkownika zachowuje **20 miejsc i brak nowych sektorów**, a pozwala dalej ulepszać posiadane dekoracje bez fabularnego końca na poziomie 20. Ceny do 20 pozostają takie jak wcześniej, dalsze rosną według tej samej formuły z kontrolą bezpiecznych liczb. Reklama jest wymagana przy każdym kolejnym poziomie podzielnym przez 5, również 25, 30 i dalej; uprawnienie bez reklam działa jak wcześniej. Zapisy nie mogą obcinać legalnego wyższego poziomu do 20.

Po 20 dekoracja zachowuje mistrzowską bazę, a dalszy rozwój dopracowuje detale, światło i cokół zamiast zmieniać ozdobę w ogromną bryłę zasłaniającą plac. Brak fabularnego końca nie oznacza zapisywania wartości Infinity, niebezpiecznych liczb lub bezpłatnego obchodzenia kosztów.

## Dokumentacja i odbiór

Każda część ma kartę zmian i osobny ręczny przypadek. Nowe scenariusze HL-TC-0135–0147 zaczynają z wynikiem NOT RUN. Test automatyczny nie zalicza próby ręcznej. Ocena dopasowania grafiki wymaga obejrzenia rzeczywistej wyspy i studia na komputerze oraz telefonie.

Excel 13 pobiera bieżące parametry z kodu i zachowuje cały Excel 12 wraz z wcześniejszymi arkuszami, komentarzami i wynikami formuł. Nie nadpisujemy pliku 12. Końcowe źródło, własne CI, Pages, pakiet i tag wymagają nowych dowodów; nie dziedziczą odbioru poprzedniej wersji.
