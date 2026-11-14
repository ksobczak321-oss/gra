# HARBORLIGHT DEV 0.15.0.0 / v32

GO DEV: 14 listopada 2026. Użytkownik polecił development najpierw na DEV i dostarczył referencje dwóch mechanik minigier: rysowanie jednym ruchem i usuwanie kierunkowych tras. Tworzymy własne układy, motyw portowy i własną oprawę.

Doprecyzowanie GO: użytkownik potwierdził wdrożenie całego uzgodnionego zakresu z obecną wersją tekstów. Redakcja tekstów będzie aktualizowana później na DEV. Nie wstrzymujemy wdrożenia DEV z powodu pustej kolumny C.

## Granice

- Tylko DEV w tej przestrzeni. Bez promocji PRE-PROD/PROD i bez operacji na istniejących kontach chmurowych.
- Trzy lokalne konta testowe DEV zaczynają od czystego stanu; to nie reset Firebase/PRE-PROD. Dane logowania i postęp chmurowy zachowane.
- Admin3 ma izolowane narzędzie przyspieszania czasu tylko w DEV.
- Excel ABC: kolumna B to aktualna redakcja uwzględniająca decyzje, kolumna C pozostaje pusta. Dotychczas nie dostarczono wypełnionej kolumny C.
- Parametry nieustalone oznaczamy jako propozycje balansu DEV, z konfiguracją i raportem, przed PRE-PROD wymagają przeglądu. Brakujące przyszłe przepisy i odkrycia są odłożone.
- Zachowuj niezmieniony stan źródła7e81a1a na tagu PRE-PROD. Nie przesuwaj tagów.

## Końcowe odpowiedzi użytkownika

### 1. Jak Targ powinien wymieniać nowe towary?

Według wartości towarów, z prowizją 10%.

### 2. Czy monety mogą mieć części ułamkowe?

tylko całe, w razie co zaokrąglenie w górę

### 3. Ustawiasz „wydaj 100 warzyw”. Co ma się stać, gdy mieszkańcy zużyją te 100?

To jedna partia. Limit nie odnawia się sam; ustawiam kolejną, kiedy chcę.

### 4. Limit 100 warzyw został wykorzystany, ale w Magazynie zostało jeszcze 500. Bez ich wydania mieszkańcy nie dostaną pełnej racji. Czy gra może przekroczyć limit?

jeżeli dostępne jest inne jedzenie to nie wydajesz jeżeli to jest jedyne jedzenie to tak wydajesz

Zachować własną odpowiedź dosłownie. Nie dopisywać szerszej zgody na przekraczanie limitu przy każdym częściowym niedoborze racji.

### 5. Jak wybieramy produkty do chronionej godzinnej rezerwy jedzenia?

Automatycznie według najtańszego wyżywienia.

### 6. Jak oceniamy dietę nowego mieszkańca i dietę po awansie Ratusza?

Po przybyciu i podniesieniu wymagań dajemy 24 godziny ochrony przed karą za różnorodność.

### 7. Ile ciasta trzeba zjeść, aby otrzymać premię szczęścia?

Porcję odpowiadającą godzinie wyżywienia danej osoby.

### 8. Budowa wymaga 36 punktów sytości. Można zużyć np. 36 zboża, 6 mąki albo 1 chleb — zawsze ponad rezerwę. Czy chcesz decydować, który zestaw zostanie pobrany?

Gra pokazuje proponowany zestaw, a ja mogę go zmienić przed potwierdzeniem.

### 9. Co robimy, gdy mleko kwaśnieje przy pełnym limicie kwaśnego mleka?

Nadmiar powstałego kwaśnego mleka przepada.

### 10. Jaką wartość nadajemy starym zapasom ogólnej „żywności”?

wszystkie zapasy są na nowo liczone, zresetuj wszystkie konta admin1, 2, 3 do stanu zerowego, na admin 3 daj dodatkowo (na potrzeby środowiska dev możliwosć przyspieszania czasu może być ordynarna strzałka gdzieś w rogu)

### 11. Kiedy odblokowujemy podstawowe ciasto?

Od razu w Piekarni; badania odblokowują dopiero kolejne wypieki.

### 12. Kiedy odblokowujemy szaty profesorskie?

Automatycznie po odblokowaniu Akademii.

### 13. Co robimy z niepełnymi recepturami i badaniami?

Najpierw wdrażamy kompletnie opisane; pozostałe czekają na dopracowanie.

### 14. Czy składniki i gotowe wyroby współdzielą magazyn lokalny producenta?

Tak: osobne limity towarów i jeden wspólny limit budynku.

### 15. Ile miejsc mieszkalnych ma Akademia?

3 + poziom Akademii, dla profesorów; adepci pozostają w Domu.

### 16. Jak działa połowa wydajności profesora poza Akademią?

Połowa bazowej wydajności niewykształconego mieszkańca.

### 17. Maria ukończyła 3 rundy Akademii. Przeprowadza się na wyspę, która prowadzi rundę 5. Jak ma tam kontynuować naukę?

Od razu może nadrabiać rundy 4 i 5. Jej ukończone rundy zostają; poprzednia wyspa usuwa ją ze swojej listy.

### 18. Profesor prowadzi badanie lub kurs i zostaje przymusowo usunięty z wyspy, np. przez dżumę. Co dzieje się z pozostawionym procesem?

Czeka na zastępcę; zachowuje dotychczasowy postęp i wniesioną opłatę.

### 19. Czy ręczne przerwanie kursu Akademii zwraca opłatę?

Nie; przepada opłata i postęp bieżącego kursu.

### 20. Twój mechanizm oczekiwania wojska i darmowej rozbudowy Koszar jest zapisany. Został jeden przypadek: Koszary mają wolne łóżka, ale Ratusz ma pełny limit ludności. Czy żołnierze mają czekać także wtedy?

Tak — czekają poza populacją, a na każdy konieczny poziom Ratusza jest 96 godzin. Gdy Koszary mają miejsce, nie trzeba ich dodatkowo rozbudowywać.

Obowiązuje treść nowego pytania 20: oczekiwanie poza populacją i 96 godzin na każdy konieczny poziom Ratusza. To NIE jest stare 20A o rezerwacji miejsc na czas wyprawy.

### 21. Wybrałeś A i dopisałeś „nie rozumiem”. Przykład: wszyscy Twoi profesorowie są w drodze na statku. Czy Królestwo ma już darować kolejnego?

Nie — profesorowie nadal istnieją na koncie, więc sam brak dostępnej osoby nie uruchamia daru.

### 22. Czy ratunkowego profesora można oddać Królestwu za nagrodę?

Nie; ratunkowi profesorowie nie zaliczają zadań wymagających oddania profesora.

### 23. Czy darmowa rozbudowa Koszar przy powrocie może powtarzać się bez ograniczeń?

Przy każdym kwalifikującym powrocie, jak w dotychczasowym projekcie.

### 24. Ratusz mieści 36 osób. Masz 30 mieszkańców i 10 uratowanych ludzi czekających na przyjęcie. Czy możesz zaczynać kolejne akcje ratunkowe?

Nie — już oczekujący wystarczą do zapełnienia obecnego Ratusza. Przyjmuję ich lub zwiększam limit; zdobytych osób nie tracę.

### 25. Jak sprawdzamy wykonalność zadań szkoleniowych?

Wystarczy dostępny budynek; zdobycie reszty pozostawiamy graczowi.

### 26. Jak umożliwiamy odejście z sojuszu podczas zadań?

Odejście dopiero gdy sojusz nie ma żadnych aktywnych zobowiązań.

### 27. Zadanie wymaga 100 drewna. Wpłaciłeś już 60, a w Magazynie zostało Ci 10. Czy możesz teraz zaprosić sojusz z progiem „mam najwyżej połowę wymagań”?

Nie — do progu liczymy już wpłacone 60 oraz posiadane 10; razem 70 przekracza połowę.

### 28. Co oznacza przynajmniej jedna prośba Królestwa dziennie?

Jedna w aktywnym dniu kalendarzowym Warszawy, bez zaległych ofert.

### 29. Czy pochodzenie pożyczonych pieniędzy przechodzi na zakupione towary?

nie przechodzi jak kupi, to móże to co kupi np kamien dać w misji królestwu

### 30. Przyjąłeś, że symboliczna pożyczka spłacona od razu nie usuwa blokady kolejnego umorzenia. Jak wyznaczyć minimalną kwotę i czas takiej „pomijanej” pożyczki?

Dobierz te dwa progi w analizie balansu i przedstaw je przed wdrożeniem; na razie nie zatwierdzam konkretnych liczb.

Użytkownik zlecił dobrać progi kwoty i czasu w analizie i przedstawić przed wdrożeniem. Nie zatwierdził konkretnych liczb.

### 31. Czy windykacja obejmuje towary poza centralnymi Magazynami?

Tylko centralne Magazyny, jak ustalono wcześniej.

### 32. Czy błogosławieństwo Latarni usuwa finansową karę szczęścia, czy ją odracza?

Odracza karę do wygaśnięcia ochrony; kara nie przepada.

### 33. Czy ograniczamy liczbę sfinansowanych pożyczek dla Królestwa oczekujących na zwrot?

Maksymalnie trzy oczekujące pożyczki na konto.

### 34. Czy widz Teatru produkuje podczas przedstawienia?

Przedstawienie nie zmniejsza produkcji.

### 35. Czy teatralny wybór „wszyscy” obejmuje osoby zajęte badaniami i szkoleniem?

Tak; uczestniczą bez zatrzymywania swoich procesów.

### 36. Jak rozliczamy zmienioną widownię między planowaniem a początkiem przedstawienia?

Lista i pełny koszt są zamrożone przy planowaniu.

### 37. Kiedy tutorial zatrzymuje czas?

Tylko pierwsze wprowadzenie zatrzymuje lokalną wyspę; późniejsze oprowadzanie nie zatrzymuje czasu.

### 38. Co dzieje się z zegarem minigry podczas wybranej reklamy lub płatności za czas?

Czeka na zakończenie operacji; bez wyboru rusza po 5 sekundach.

### 39. Czy propozycja dokupienia czasu wraca przy kolejnym zejściu do 30 sekund?

Tak, raz przy każdym nowym przekroczeniu progu 30 sekund.

### 40. Co zachowujemy po wyjściu z nieukończonej planszy?

Wyjście kończy bieżącą próbę jako przegraną; zostają wcześniejsze etapy i przedmioty.

### 41. Jak ograniczamy gromadzenie wielu przygód z zamrożoną łatwą trudnością?

Trudność ustalamy na początku etapu; jedna aktywna próba danej odmiany naraz.

### 42. Jak łatwiejsza wersja po trzech porażkach zmienia nagrodę?

Obniżamy nagrodę pozostałego etapu i odpowiednio finałową; wcześniejsze wypłaty zostają.

### 43. Za jaki czas płacimy przy natychmiastowym ukończeniu badania?

Za pozostałe minuty oczekiwania przy obecnej obsadzie.

### 44. Jak ustalamy tempo nowych procesów spożywczych?

Osobno dla receptur, zachowując ustalone składniki, sytość i ceny.

### 45. Jak traktujemy bardzo szybkie badania na późniejszych wyspach?

Zachowujemy mnożniki; równoważymy koszty, transport i magazyny przez symulację.

### 46. Jak przenosimy już opłacone budowy i rozpoczęte procesy na nowe zasady?

wyzej już napisałem graczy na pre prod jest 3 na potrzeby testów zresetuj grę wszystkich 3 kont

### 47. Co robimy ze starymi materiałami bonusowymi ponad pojemnością?

Stare bonusy pozostają dostępne; nowe niemieszczące się nagrody czekają na odbiór.

## Realizacja i odbiór

- Silniki i UI mają być zintegrowane z prawdziwą grą, nie wyłącznie demonstracją oddzielnego modułu.
- Testy przepływów nowych budynków, racji, nauki, wojska, Królestwa, sojuszu, zegara, minigier i odświeżenia stanu.
- Walidacja rzeczywistej strony desktop/mobile z zerową liczbą błędów JS. Testy muszą odróżniać lokalny DEV od rzeczywistego Firebase.
- Nie przypisywać historycznych1331testów ani43przeglądarek nowej wersji bez uruchomienia. Nie twierdzić o150godzinach ludzkiej zabawy ani pełnym50-dniowym odbiorze bez dowodów.
