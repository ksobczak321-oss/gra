# Doradca Królestwa — GO development, 17 listopada 2026

Użytkownik zatwierdził wdrożenie na DEV doradcy w lewym dolnym rogu i rozmowy o celach rozwoju wyspy. Doprecyzował uproszczenie pierwszego tutoriala: **górny pasek → dolne menu → jeden budynek produkcyjny (Gospodarstwo)**.

Wersja aplikacji 0.15.1.0. Nowe wejście gry i moduły doradcy mają cache `frontend-v32-14`; niezmienione współdzielone moduły zachowują cache13, aby korzystać z jednego runtime modeli. Schemat świata9 i ruleset32 pozostają bez zmiany.

Doradca wyświetla pojedynczą wskazówkę o jedzeniu, obsadzie, produkcji lub transporcie. Rozmowę i wskazówki można zamknąć albo wyciszyć. Pole tekstowe rozpoznaje polskie nazwy budynków, towarów oraz pytania o pracowników, wyżywienie i priorytety. Planer działa lokalnie według zasad gry; przy nierozpoznanym pytaniu prosi o konkretny cel. Nie wymaga usług AI lub kluczy.

Plan rozbudowy korzysta z rzeczywistych kosztów, rezerw, lokalnych zapasów, transportu, odblokowań i obsady. Wspólna księga zapasów zapobiega podwójnemu wykorzystaniu materiału na budowę i produkcję. Proponowane przydziały nie przekraczają wolnych osób i miejsc pracy. Czas jest szacunkiem istniejącego modelu dopiero przy spełnionych warunkach; doradca nie obiecuje matematycznie najkrótszej drogi. Opcjonalna usługa za monety ma oddzielną rzeczywistą wycenę.

„Pokaż, gdzie” otwiera istniejący ekran, rozwija właściwą sekcję i podświetla miejsce. Doradca nie zatrudnia, nie zmienia priorytetów i nie zleca budowy za gracza. Wpisy, cel i wyciszenie żyją w pamięci bieżącej karty; brak zapisu wyspy lub rozmów do pamięci przeglądarki.

Pierwsze oprowadzanie jest skrócone do trzech przystanków. Adapter zapisuje dotychczasowe stabilne pozycje, zachowując zatrzymanie zegara, potwierdzenia chmurowe i możliwość wznowienia. Pełny katalog 56 opisów i 25 lekcji pozostaje w Pomocy. Kurs praktyczny uruchamia się świadomie; nie otwiera się automatycznie po krótkim wprowadzeniu. Zachowano historię działań i nagród.

Ta publikacja obejmuje DEV, Git i podgląd Pages. **Nie autoryzuje promocji doradcy na PRE-PROD lub PROD.** Nie resetuje kont, nie zmienia haseł ani DNS. Wcześniejsza naprawa bootstrapu minigier08e ma własne zielone CI44096593096; pierwszy nieudany PRE-PROD44093734171 pozostaje w historii i nie jest odbiorem doradcy.

Dowody: [raport](KINGDOM-ADVISOR-EVIDENCE.json), [HL-CHG-1159](../tracking/changes/HL-CHG-1159.md). Status przygotowanego kodu, CI i publicznego DEV należy czytać osobno.
