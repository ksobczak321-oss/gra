# DEV 0.12.0.0 / v28 — uzgodniona paczka po przeglądzie i redakcji gry

GO użytkownika z **2 listopada 2026, Europe/Warsaw** uruchamia implementację zebranych zmian w DEV. Baza: aplikacja 0.11.0.0 / `c7c39742594599c54ee8b074b5c313efd88af4cb`, metadane `aae61ec38b61b0e4f96f4fb0378dacd88a37d836`. Nowe GO nie jest promocją PRE-PROD/PROD ani zleceniem resetu. Zachowujemy konta, hasła, historię nagród i rozpoczęte projekty. Bieżące wyniki weryfikacji będą odrębne od odbioru v27.

## Zatwierdzone reguły i redakcja

- Pierwsza lekcja nowego programu samouczka wymaga **3 tragarzy**, nie 6. Nadal 25 lekcji, z dodatkowymi rzeczywistymi podkrokami. Starsze programy zachowują zaliczenia i warunki.
- Wycofane specjalne czasy turbo dla nowych budów/dostaw. Zachowany rabat pierwszego Ratusza 1→2 po 100 każdego zasobu. Stare rozpoczęte projekty zachowują zapisane czasy.
- Ratusz: zwykłe zlecenie → objaśnienie osobnych faz i aktualnych estymat → natychmiastowy transport → skrócenie budowy o 100% → wskazanie zmiany poziomu. Gospodarstwo: wybór pełnego zakupu rozbudowy bez wcześniejszego opłacania zwykłej. Wcześniejsze nagrody zapewniają faktyczne koszty i niewielki bufor; brak prawdziwej płatności w lekcji.
- Lekcja 11 obejmuje dodatkowego tragarza i priorytet odbioru produktów. Instrukcje producentów prowadzą do tej lekcji i uwzględniają miejsce w centrali oraz możliwość natychmiastowego transportu za monety.
- Tutorial ma **33 opisy**: usunięta ikona czasu świata i odpowiadający jej opis. Sam czas świata nadal biegnie. W Pomocy dwie wyraźne ramki: tutorial (przewodnik po grze) i samouczek (25 praktycznych lekcji). Zamknięcie oprowadzania pokazuje informację o powrocie i podświetla `?`.
- Nowe PL opisy: Szczęście, Następny mieszkaniec, producenci, Statek i handel (zakup nie zastępuje dostawy), Gospodarka (możesz zobaczyć), Dekoracje i atrakcje (możesz kupić za monety), Ścieżki. Nazwa wyspy ma rozmiar czcionki jak HARBORLIGHT. PL szczęście wszędzie w **punktach**, bez procentów i skrótu p.p.; jednostki innych mechanik pozostają właściwe.
- Powiadomienia przestoju wskazują powód, rzeczywistą wielkość kary i liczbę osób. Koniec odróżnia wznowienie pracy od odwołania pracowników i informuje o pozostałym lokalnym towarze. Zakończona kara nie wygląda jak nowa strata punktów.
- Codzienna lojalność: wiadomość i popup pierwszego wejścia nowego dnia Warszawy, tylko przy dostępnej nagrodzie; bez duplikowania odebranej premii.
- Po ukończeniu praktycznego samouczka i końcowej nagrodzie popup otwiera narracyjny rozdział **8 zadań** Latarni. Historie (np. sztorm lub turyści oglądający deszcz meteorów) nadają sens działaniom, opisom i nagrodom. Ścieżki 5 pomocniczych / 3 ratunkowych zachowane. Termin zaczyna się przy przyjęciu etapu, nie otwarciu popupu.
- Nagrody narracyjne: materiały/monety, rzeczywiści mieszkańcy oraz czasowe premie producentów ×2. Liczby ludzi nie są zawsze równe 5. Przyjmujemy wyłącznie do limitu Ratusza; nadwyżka nie czeka w kolejce. Produkcja ×2 łączy się z Latarnianą ×2. Identyczna premia wydłuża czas, nie tworzy kolejnego mnożnika.
- Dom: brak indywidualnego przydziału szczęścia; zbiorowa dystrybucja i bank najwyżej 7 niewydanych porcji dobowych. Porcja na koniec dnia bazuje na rzeczywistych mieszkańcach mających łóżko. Bez automatu 23:58, kasowania reszty lub ponownego grantu przy wczytaniu.
- Każdy mieszkaniec traci **1 punkt o północy Warszawy**, także offline. Wymuszenia i ochrona powitalna zachowują pierwszeństwo.
- Indywidualna modlitwa z Domu: **10 minut × ukończony poziom Ratusza**, razem z dojściem/powrotem, +50 punktów dla uczestnika po powrocie. Normalne żywienie; bez produkcji, podatku i kary bezrobocia podczas legalnej modlitwy. Cena 10 × TH monet/osobę jest jawnym parametrem propozycji do integracji, nie historycznym cennikiem.
- Wszystkie usługi za monety od TH1, niezależnie od ich pochodzenia. Prawdziwe PLN kupują wyłącznie monety (10 monet/zł), dopiero od TH3. Zwykła gospodarka nadal zużywa materiały. Statek: +1000 towarów za 50 monet. Extra czas rundy: +30 s/10 monet, maks. 2, lub reklama +60 s, maks. 1.
- Potwierdzenie/rezygnacja mają 24 px odstępu; wąskie ekrany używają osobnych wierszy. Poprawka „Wstecz to island” → „Wróć na wyspę”. Samo rozwijanie udostępniania pozostaje odłożone.

## D12 — zaakceptowane poprawki z przeglądu Excel 12

1. Wczytanie nie zabiera już przyznanych punktów Domu (nowszy bank 7 porcji zastępuje dawny pojedynczy dzień).
2. Zaproszenie mieszkańca i misja mają wspólną cenę 500 × ukończony TH każdego zasobu, bez turbo i przyszłych poziomów.
3. Zwykłe nowe zadanie ma co najmniej 30 min; oferta utworzona później niż 23:30 kończy się dopiero o następnej północy Warszawy.
4. Obniżenie wymagań obniża nagrodę według rzeczywistej wartości/trudności.
5. Rozdziały Latarni nie pomijają zaległych poziomów Ratusza.
6. Wszystkie 7 dni ligi wpływa na wynik niezależnie od liczby zespołów.
7. Zamrożony skład może dokończyć sezon po wyjściu/usunięciu z sojuszu, bez punktowania dla drugiego zespołu. Czat respektuje bieżące członkostwo.
8. Unikalność nazw córek także przy zmianie nazwy.
9. Dobroczynność kwalifikuje wyłącznie zaufane podatki, darmowe zadania i wygrane ekspedycji. Lojalność, błogosławieństwa, reklamy, polecenia, zakupy i handel wyłączone.
10. Gotowość pracowników transportu/handlu liczy się jako praca; producent z blokadą nie ma premii za pracę. Opisy mają rozróżniać te sytuacje.
11. Przy tej samej cenie pokazujemy tylko największe skrócenie budowy.
12. Premia rozbudowy Kaplicy wyjaśnia szczęście i podatki ×2 przez 10 h.

## Społeczność i dobroczynność

- Liga: faza zasadnicza 15–21, oba zadania 19–21 Warszawy. Najlepsza czwórka walczy w playoffach, remis wymaga dogrywki. Mała nagroda za udział, większa za wszystkie 14 konkurencji, nagroda top4 i puchar z największą nagrodą zwycięzcy; brak spadków i kar dla wyspy. Dokładny kalendarz playoffów i kwoty nagród są jawnymi parametrami DEV, nie wcześniejszymi decyzjami liczbowymi.
- Czat: 1000 znaków, 20 wiadomości / 20 s / konto, zwykła historia 30 dni. Dwa rodzaje: sojusz i rozmowy prywatne.
- Pomagam: jeden portfel o jednakowej sile nabywczej; pochodzenie tylko do kwalifikacji. Zwykłe wydatki najpierw zużywają monety niekwalifikowane. Wiek konta >14 dni, 5 aktywnych dni, Ratusz matki ≥4; dotychczasowe limity miesięczne/funduszu zachowane. PRE-PROD ma oznaczony mock przelewu, fanfary i +20 punktów/6 h; brak prawdziwych przelewów lub zobowiązań. Umowy beneficjentów poza zakresem.

## Doprecyzowania użytkownika podczas implementacji

Użytkownik odpowiedział na trzy pytania: **zostają stałe +2 punkty/h za pracę i jedzenie oraz −1 o północy** (proponowana krzywa przy 30 punktach jest odrzucona); **modlitwa daje +50 na sześć godzin**; **darowizny od 100 monet, czyli 10 groszy**, w wielokrotnościach 100 monet. Wcześniejsze liczby 1000 monet → 1 zł pozostają przelicznikiem, nie minimum jednej operacji. Nie opisuj tej wersji jako stabilizującej zwykłe szczęście przy 30 punktach.

## Odbiór i publikacja

Wymagane: model, migracje starszych programów i zapisów, pełna regresja, deterministyczny pakiet, rzeczywiste renderowanie PL/EN desktop/mobile oraz ręczne przypadki do odhaczania. Zmiany statusów mają własne dowody, SHA i wyniki. Nie odznaczamy testów ręcznych automatyzacją. Wymagane osobne potwierdzenie przed promocją PRE-PROD; w tym GO nie ma resetów, realnych płatności, przelewów, automatycznej publikacji FB ani integracji planszówki.
