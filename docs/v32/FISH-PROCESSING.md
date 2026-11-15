# Ryby wędzone i przetwory rybne — DEV

Użytkownik zatwierdził dodanie dwóch produktów III kategorii, wytwarzanych u Rybaka ze świeżych ryb na miejscu. Jedno odkrycie „Wędzenie i przetwory rybne” jest dostępne w Akademii od 5. poziomu Rybaka i odblokowuje oba przepisy. Wystarcza Akademia na poziomie 1. Ukończone odkrycie pozostaje w zapisie.

Parametry ilościowe nie zostały podane przez użytkownika. Poniższy startowy balans DEV korzysta z istniejącego wzorca receptur; wymaga oceny w grze przed promocją PRE-PROD.

| Parametr | Wersja DEV |
| --- | --- |
| Odkrycie | `fishProcessing` |
| Koszt odkrycia | 24 ryby i 4 deski |
| Bazowa praca badawcza | 1800 sekund; rzeczywisty czas zależy od kadry i pozostałych istniejących mnożników |
| Ryba wędzona | `smokedFish`: 4 świeże ryby → 1 porcja; III kategoria, 12 punktów sytości, cena bazowa 10 |
| Przetwory rybne | `fishPreserves`: 6 świeżych ryb → 1 porcja; III kategoria, 18 punktów sytości, cena bazowa 15 |
| Tempo każdego przepisu | 40 partii na pracownika i godzinę przed mnożnikiem poziomu i pozostałymi premiami |

Pracownicy są przydzielani osobno do połowu, wędzenia i przetworów. Oba przepisy wymagają Rybaka na poziomie 5 oraz ukończonego odkrycia. Zużywają ryby z jego lokalnego magazynu. Ryby z Magazynu centralnego nie zastępują brakującego miejscowego połowu i nie są dowożone na te przepisy. Podstawowy połów działa od początku tak jak wcześniej.

Przy aktywnym przetwarzaniu tragarze pozostawiają przy Rybaku zapas na cztery cykle obecnie przydzielonych pracowników, maksymalnie do lokalnego limitu jednego produktu. Nadwyżkę połowu i gotowe wyroby odbierają normalnie. Po usunięciu przydziału do przetwarzania rezerwa znika. Przetwory korzystają ze wspólnych limitów lokalnych; zużyte składniki zwalniają miejsce przed odłożeniem wyrobu.

Nowe produkty wchodzą do normalnego wyżywienia, historii diety, ochrony rezerwy, wymiany i zapisu. Liczba rodzajów towaru rośnie z 20 do 22. Wspólna pojemność Magazynu nadal wynika z koszyka potrzeb +40%, zaokrąglonego w dół do 10 000; poziom 1 pozostaje 40 000.

Sześć regresji nowej funkcji oraz dotychczasowe testy zapasów, kadr, logistyki i pojemności: 76/76 PASS lokalnie. Dowód roboczy: `/workspace/work/fish-processing-go/tests.log`. Wynik CI i publikacja bieżącego źródła pozostają oddzielnymi potwierdzeniami. Zakres wyłącznie DEV, bez zmiany PRE-PROD/PROD lub resetu kont.
