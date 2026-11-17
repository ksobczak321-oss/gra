# Doradca Królestwa — GO development, 17 listopada 2026

Użytkownik zatwierdził wdrożenie na DEV doradcy w lewym dolnym rogu i rozmowy o celach rozwoju wyspy. Doprecyzował uproszczenie pierwszego tutoriala: **górny pasek → dolne menu → jeden budynek produkcyjny (Gospodarstwo)**.

Wersja aplikacji 0.15.1.0. Cały graf modułów ma cache `frontend-v32-14`, aby przeglądarka pobrała również nowe zatwierdzone teksty i zachowała jeden runtime modeli. Schemat świata9 i ruleset32 pozostają bez zmiany.

Doradca wyświetla pojedynczą wskazówkę o jedzeniu, obsadzie, produkcji lub transporcie. Rozmowę i wskazówki można zamknąć albo wyciszyć. Pole tekstowe rozpoznaje polskie nazwy budynków, towarów oraz pytania o pracowników, wyżywienie i priorytety. Planer działa lokalnie według zasad gry; przy nierozpoznanym pytaniu prosi o konkretny cel. Nie wymaga usług AI lub kluczy.

Plan rozbudowy korzysta z rzeczywistych kosztów, rezerw, lokalnych zapasów, transportu, odblokowań i obsady. Wspólna księga zapasów zapobiega podwójnemu wykorzystaniu materiału na budowę i produkcję. Proponowane przydziały nie przekraczają wolnych osób i miejsc pracy. Czas jest szacunkiem istniejącego modelu dopiero przy spełnionych warunkach; doradca nie obiecuje matematycznie najkrótszej drogi. Opcjonalna usługa za monety ma oddzielną rzeczywistą wycenę.

„Pokaż, gdzie” otwiera istniejący ekran, rozwija właściwą sekcję i podświetla miejsce. Doradca nie zatrudnia, nie zmienia priorytetów i nie zleca budowy za gracza. Wpisy, cel i wyciszenie żyją w pamięci bieżącej karty; brak zapisu wyspy lub rozmów do pamięci przeglądarki.

Pierwsze oprowadzanie jest skrócone do trzech przystanków. Adapter zapisuje dotychczasowe stabilne pozycje, zachowując zatrzymanie zegara, potwierdzenia chmurowe i możliwość wznowienia. Pełny katalog 56 opisów i 25 lekcji pozostaje w Pomocy. Kurs praktyczny uruchamia się świadomie; nie otwiera się automatycznie po krótkim wprowadzeniu. Zachowano historię działań i nagród.

Ta publikacja obejmuje DEV, Git i podgląd Pages. **Nie autoryzuje promocji doradcy na PRE-PROD lub PROD.** Nie resetuje kont, nie zmienia haseł ani DNS. Wcześniejsza naprawa bootstrapu minigier08e ma własne zielone CI44096593096; pierwszy nieudany PRE-PROD44093734171 pozostaje w historii i nie jest odbiorem doradcy.

Dowody: [raport](KINGDOM-ADVISOR-EVIDENCE.json), [HL-CHG-1159](../tracking/changes/HL-CHG-1159.md). Status przygotowanego kodu, CI i publicznego DEV należy czytać osobno.

## Uzupełnienie: cztery fioletowe zakładki

Kolejny upload ABC(1), SHA2560253226de2712d22d5ab28098a40931f02e8be652089b0c3fcbd343b459037a7, wskazuje cztery fioletowe zakładki: Samouczek33, Produkty i receptury16, Badania16 i Nazwy poziomów Latarni100. Odczytano165wierszy;31ma niepusteC. Łącznie35tekstów zmienia się względem działającego kodu. Nie analizowano treści innych zakładek tego uploadu.

C zastępujeB, a pusteC zatwierdzaB. Komentarze redakcyjne rozwiązano jawnie w [MERGE](EDITORIAL-PURPLE-TABS-MERGE.json): konkretne produkty Gospodarstwa zamiast „kierunków”, dokładny wybór adepta i nauczyciela, wolne miejsce w magazynie lokalnym, poziom badania zamiast poziomu budynku. Ukośniki i znaki zapytania nie są tekstem interfejsu. Nazwy Latarni16/18/19/46 to teraz: Dzwon przeciwmgłowy, Wieża nad wybrzeżem, Promień dalekiego zasięgu, Strażnica na każdą pogodę. Wzmianka o niewdrożonych otrębach nie tworzy nowej receptury. Usunięte „Więcej o budynku” zastąpiono istniejącym przyciskiem „Priorytety transportu”, a „Kup rozbudowę” — „Kup pakiet budynku”.

Zmiany dotyczą prezentacji: receptury, poziomy, koszty, warunki i nagrody pozostają zachowane. Opisy produktów są rzeczywiście rozwijane w ekranach produkcji i wyżywienia; opisy badań są w katalogu i komunikacie zakończenia. Osiem instrukcji uzupełniających podłączono do właściwych ekranów. Cały graf modułów otrzymuje cache14, a dokumentacja minigier jest odtworzona z tych samych reguł dla nowego odcisku źródła. To nadal jedna publikacja wyłącznieDEV. [HL-CHG-1160](../tracking/changes/HL-CHG-1160.md).
