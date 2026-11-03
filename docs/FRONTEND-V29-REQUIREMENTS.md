# DEV 0.13.0.0 — zakres po GO z 3 listopada 2026

Użytkownik zatwierdził zebraną paczkę poleceniem „GO”. Implementacja, Git, własne CI i podgląd DEV są autoryzowane. PRE-PROD pozostaje 0.12.0.0; nowa promocja, PROD, reset kont i aktywacja rzeczywistych operatorów nie należą do tego GO. Zachowujemy dane, historię nagród, rozpoczęte budowy i dostawy. Integracja fizycznej gry pozostaje wyłączona.

## Budowa i gospodarka

- Najdłuższy łączny czas transportu materiałów i budowy zależy od ukończonego poziomu Ratusza: 45 s na poziomie 1; kolejne mnożniki ×3 na 2–5, ×2 na 6–8, ×1,2 na 9–11, ×1,1 na 12–14, ×1,05 na 15–17, ×1,02 na 18–22. Poziom 23: 23 godz. 55 min; od 24: maksymalnie 24 godziny, bez dalszego wzrostu. Inne budynki proporcjonalnie krócej.
- To bazowy czas wykonania finansowanego zamówienia z trzema gotowymi tragarzami, a nie obietnica zebrania materiałów lub dojścia pracowników w 45 s. Jedna lub dwie osoby nadal dostarczają towary, wykonując więcej kolejnych kursów. Dojście i powrót pozostają 120 s. Brak obsady nie kończy dostawy automatycznie. Aktywność i ścieżki mogą skrócić transport, a głód lub brak łóżka go wydłużyć; rozpoczęte historyczne turbo zachowuje własne zapisane zasady.
- Nowe zamówienia zapisują własne parametry czasu. Już rozpoczęte projekty zachowują zapisane zasady i ETA, również historyczny tryb turbo. Rabat materiałowy pierwszego Ratusza jest osobny od wycofanego turbo.
- Statyczna pojemność Magazynu ma pomieścić rozbudowę, aktywną misję, rezerwę żywności i bufor. Limit łączny obejmuje jednocześnie pięć limitów materiałowych. Koszt rozbudowy Magazynu musi mieścić się w jego poprzednim poziomie. Monety nie zajmują miejsca; zasoby z nagród nadal mają osobny techniczny zapas.
- Wydobycie dostosowujemy do tempa, bez przyznawania fikcyjnych zysków i bez utraty wcześniejszych zapasów. Cena zaproszenia mieszkańca pozostaje 500 × ukończony poziom Ratusza każdego z sześciu zasobów. Konkretne wagi budynków i wartości wydobycia są parametrami DEV, a nie nową decyzją użytkownika.

## Tutorial i samouczek

- Tutorial: oprowadzanie po ekranie; samouczek: 25 praktycznych lekcji. W Pomocy oba zestawy przycisków mają równe szerokości i krawędzie. Znak „?” w komunikacie zamknięcia tutoriala ma wysokość trzykrotnie większą od sąsiedniego tekstu.
- Wznowiony przez Pomoc tutorial wraca do zapisanego kroku; po jego ukończeniu automatycznie otwiera niedokończony samouczek. Zachowujemy postęp i odebrane nagrody.
- Krótkie opisy pięciu producentów. Bezpośrednio po Gospodarstwie jeden wspólny opis pełnego magazynu i pokaz smutnej buźki; nie powtarzamy go przy kolejnych producentach. Odsyłacz do lekcji 11 i natychmiastowego transportu za monety.
- Teatr po Domu; Port i statek w jednym kroku. Ramka Portu kończy się nad nawigacją „Administracja”. Łącznie 34 kroki; migracja według stabilnych identyfikatorów, bez zgubienia miejsca w starych trasach.
- Redakcja: „o północy”, „magazynu centralnego”, opis premii za wszystkie odcinki ścieżek, przewodnik „po wyspie”, automatyczny zapis bez technicznego interwału. Ustawienia nadal zachowują faktyczny zapis chmurowy co 30 s.
- Jedna budowa uczy przyspieszania za monety; inna czekania na naturalny koniec. Trzech tragarzy; nie wracamy do sześciu. Usuwamy zdanie o nieistniejącej dodatkowej skrzyni.
- Dodatkowy mieszkaniec za pierwsze logowanie każdego z pierwszych siedmiu dni kalendarzowych od rozpoczęcia gry, do limitu Ratusza, bez nadrabiania dni nieobecności. Osobno od 72-godzinnej ochrony szczęścia. Wyraźna wiadomość o maksymalnie siedmiu dodatkowych osobach.

## Misje i poprawki ekranów

- Po samouczku pokazujemy fabularne wejście i tylko bieżące zadanie 1/8; ukończenie odblokowuje następne. Istniejące ścieżki pomocy 5 i ratunku 3 pozostają. „Aktualne Misje”, bardziej widoczne „Otwórz”.
- Wszystkie warianty udostępniania mają „Wróć na wyspę”, również ekran po podniesieniu poziomu.
- Informacja o wycofywaniu tragarzy najwyżej raz na dzień i tylko na poziomach 1–5, przy pierwszej odpowiedniej czynności po zalogowaniu. Kolejne zmiany obsady nie otwierają jej ponownie. Dane o dostawach i powrocie pozostają prawdziwe.

## Teatr i dekoracje

- Stały budynek obok Domu, bez zwykłej rozbudowy. Duży osobny widok Teatru i dziedzińca, widoczny również na mapie.
- Dziesięć rodzajów dekoracji, dwadzieścia miejsc, każda posiadana sztuka ma własne poziomy 1–20 i zmienia wygląd przy ulepszaniu. Fontanny, kolumny, rzeźby, kwietniki, drzewa ozdobne, żywopłoty, ławki, latarnie ogrodowe, bramy i mozaiki.
- Przestawianie, zamiana miejsc i zdejmowanie do kolekcji są bezpłatne; zachowują poziom i nie powielają własności. Style można mieszać, wygląd obejrzeć przed zakupem.
- Zakup i ulepszenia za monety; progi 5/10/15/20 dodatkowo wymagają ukończonej reklamy z nagrodą. Aktywne uprawnienie bez reklam pomija film. Anulowanie nie pobiera monet. DEV pokazuje oznaczoną symulację; brak zweryfikowanego dostawcy nie może udawać prawdziwej reklamy na PROD.
- Ceny i kosmetyczne nagrody kolekcji są jawnymi parametrami DEV. Produkcja i terminy misji biegną podczas aranżowania.

## Aktywności podczas oczekiwania

Trzy równoległe cele: misja na godziny, przygoda na kilka minut i zdarzenie na kilkadziesiąt sekund. Panel „Co możesz zrobić teraz?”; gracz sam rozpoczyna aktywność, bez serii wymuszonych popupów.

1. Awaria samolotu: spadające po całym ekranie monety lub materiały. Nagroda odpowiada dokładnie złapanym przedmiotom.
2. Dopasowane trójki odsłaniają cztery fragmenty mapy; ułożenie mapy prowadzi do skarbu na wyspie.
3. Wygrane labirynty dają kule; celowanie i strzelanie do piratów ratuje kupca.
4. Most z ograniczonej liczby elementów i próba przejścia mieszkańców. Podstawowy zestaw wystarcza; dodatkowe elementy za monety lub reklamę.
5. Nocne sygnały Latarni: pamięć i bezpieczne wejście statku do portu.
6. Przemoczone listy: wskazówki na wyspie i dostarczenie trzech przesyłek.
7. Portowa orkiestra: instrumenty i rytm prowadzą do koncertu.
8. Ogród przypływu: obracane kanały doprowadzają wodę do sadzawek.
9. Załadunek: rozmieszczenie skrzyń, równowaga statku i wybór rejsu.

Postęp przygód jest zapisywany. Nagrody i przejścia etapów są jednokrotne; limity i czasy odnowienia to parametry DEV. Dotychczasowe minigry przekazują faktyczne wyniki, bez przycisku udającego wygraną. Nowe źródła monet nie stają się automatycznie kwalifikowane do „Pomagam”.

## Społeczność i odbiór

Trzy konta testowe mają móc odnaleźć się w rzeczywistym katalogu API, rozmawiać prywatnie, zakładać sojusz, dołączać, odchodzić i pisać na czacie sojuszu. Katalog nie ujawnia haseł, e-maili ani prywatnych wysp. Pozostają przyjęte limity i zasady ligi. Testy lokalnego prawdziwego HTTP nie są dowodem nowego wdrożenia API w GCP.

Każda zmiana otrzyma kartę rejestru, a ręczne scenariusze osobne pozycje listy kontrolnej. Testy automatyczne, ręczne, pakiet, Git/CI/Pages i faktyczne środowiska raportujemy oddzielnie. Nie oznaczamy nieprzeprowadzonych prób ręcznych jako zaliczonych.
