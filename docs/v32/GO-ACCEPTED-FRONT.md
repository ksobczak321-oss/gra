# GO DEV — zaakceptowany front wyspy

Status: **front opublikowany na Pages, zgodność17hostowanychplików potwierdzona; pełny CI zakończył sięFAILURE w responsywnym v17/120kartach**. Wersja0.15.0.0, cache `frontend-v32-7`; źródło aplikacji `0bc7af0cad1acdc0e541ef9bd5e3a633a87655b3`, publikacja `d2af52a9f7d6a8221d888ca47c5c014727993e23`, Pages43738724545SUCCESS, CI43738724605FAILURE. [Maszynowy zapis dowodów](ACCEPTED-FRONT-EVIDENCE.json). Karty zakresu: HL-CHG-1144–1146. Późniejszy zakres nazw mieszkańców i poprawki responsywnej [cache8](GO-DIRECTORY.md) zachowuje ten front i wymaga własnegoCI.

Użytkownik zaakceptował podglądy Gospodarstwa, chaty leśnika/Drwali, Rzeźni i pomniejszonego, przesuniętego Tartaku. Następnie wskazał zmianę funkcji istniejących budynków przy zachowaniu ich grafik, zatwierdził dawny Zakład skórzany jako dekorację i poprosił o miniatury zgodne z obecnym wyglądem. Końcowe polecenie: „prawa krawędz dolnego menu musi być w lini z menu po prawej wiec ciut jeszcze przesuń, wrzuć na DEV”.

## Grafiki i miejsca

Zaakceptowane grafiki są kopiowane bez przerysowania. Bazowy `assets/harborlight-v1-approved.png` zachowuje swoje bajty. Cztery dopasowane nakładki pokazują Gospodarstwo, chatę leśnika, Rzeźnię oraz mały budynek dawnego Tartaku; podłożem i maską są zaakceptowane kadry. Uzupełnienie pustego oceanu poniżej statku usuwa odsłonięty dawny panel z tła, nie zmienia grafiki statku i budynków.

| Dotychczasowe miejsce | Funkcja po zmianie |
|---|---|
| Ratusz | Tartak |
| Tartak, pomniejszony i przesunięty | Rybak |
| Magazyn | Koszary |
| Rybak | Zakład skórzany |
| Koszary | Kaplica |
| Kaplica | Ratusz |
| Niebieskie zadaszenie nabrzeża | Magazyn |
| Dawny Zakład skórzany | Dekoracja bez osobnego menu |

Dom, Gospodarstwo, Drwale, Kamieniołom, Młyn, Piekarnia, Mleczarnia, Rzeźnia, Akademia, Latarnia, Teatr, Targ i Port pozostają w swoich miejscach. Każda z20funkcji ma jedno przypisanie. To zmiana położenia prezentacji i celu kliknięcia, bez zamiany identyfikatorów zapisów, pracowników, poziomów, produkcji lub badań między budynkami. Nowe ramki hover oraz podpowiedzi i cele oprowadzania wskazują aktualny budynek; grafika dawnego Zakładu skórzanego nie otwiera menu.

## Dolne menu

Wszystkie19miniatur Administracji i Gospodarki odpowiada aktualnej funkcji i zaakceptowanemu wyglądowi budynku. Gospodarstwo, Drwale i Rzeźnia korzystają z nowych zaakceptowanych chatek, Tartak z dawnego Ratusza, Rybak z małego dawnego Tartaku, a Zakład skórzany z dawnego Rybaka. Poziomy, nazwy i liczniki mają wspólne ramki i linie wyrównania.

Pięć zakładek i odpowiadające im panele przesuwają się razem w prawo. Na planszy1672×941 dolne menu ma `left474`, `width1190`, `right1664`, równo z prawą krawędzią panelu misji `left1401 + width263`. Względem zaakceptowanego statycznego podglądu `left450` jest to dalsze24piksele w prawo. Statek pozostaje widoczny. Telefon zachowuje układ mieszczący się w ekranie i dostęp do wszystkich zakładek.

Zasoby otrzymują zaakceptowany, spójny atlas grafik produktów: moduł `harborlight-v1-goods-art.js` i `assets/harborlight-goods-v32.png`. Front pokazuje21aktywnych towarów istniejącego modelu:19bazowych i2wcześniejsze przetwory rybne. Niewykorzystane kafelki otrębów i paszy w atlasie nie aktywują nowych produktów ani badań. Publiczny podgląd Pages ma osłonę bezczynności `PAGES_PREVIEW && !devAccount`, aby scenariusz bez konta nie przechodził do błędnego formularza logowania po czasie.

## Granice publikacji

Wdrażamy wyłącznie ten front na DEV i dotychczasowy GitHub Pages. Docelowy [link testowy poziomu5](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5&v=frontend-v32-7) pozostaje jawnie oznaczonym podglądem w pamięci karty, bez konta i trwałego zapisu. Parametr nie przenosi ani nie awansuje rzeczywistych kont. Zwykły nowy gracz zachowuje dotychczasowy start.

Osobny roboczy pakiet przeniesienia sera, otrębów i paszy oraz nazw mieszkańców pozostaje zachowany w innym drzewie roboczym i nie należy do tej publikacji frontu. PRE-PROD pozostaje0.14.0.0/`7e81a1a436770f57fd8abf390b6af8022e3300f6`; nie wykonujemy resetu, operacji Authentication/Firebase, nowej promocji PRE-PROD/PROD ani aktywacji usług.

## Kryteria odbioru

Odbiór sprawdza rzeczywisty kod gry oraz zbudowany pakiet: jednoznaczne20przypisań i dekorację, zgodność19miniatur, ramki hover i kliknięcia, rozdzielenie Rybaka/Akademii oraz Magazynu/Portu, cele oprowadzania, równe krawędzie menu na komputerze, dostępność wszystkich pięciu zakładek i granice na telefonie. Po publikacji potrzebny jest odczyt hostowanych bajtów oraz test tego samego publicznego widoku.

Pełny CI i Pages nowego SHA mają własny wynik. Dotychczasowy Pages43725629445/e3affdc ma SUCCESS, a CI43725629409/e3affdc zachowuje FAILURE; żaden z tych wyników nie jest odbiorem cache7. Ręczny odbiór użytkownika pozostaje NOT_RUN do jego testu opublikowanego DEV.

## Potwierdzone lokalnie

`tests/harborlight-accepted-front-v32-smoke.py` przeszedł na1672/1440/390:20funkcji,8fizycznych kliknięć w każdym wariancie,19zgodnych kadrów miniatur,5zakładek, prawe krawędzie1664, odsłonięty statek i zachowany postęp. Zaktualizowany `tests/harborlight-native-map-v32-smoke.py` przeszedł na1440/390. Testy pakietu frontendowego:12PASS. Preflight potwierdził107plików o łącznym rozmiarze30727097bajtów, poniżej32MiB; zaakceptowane PNG zachowują identyczne bajty.

Publikacja cache7: Pages43738724545SUCCESS,17hostowanychhashyHTTPS zgodnych przy normalnej weryfikacjiTLS. CI43738724605 zakończył sięFAILURE po zaliczonych kontrolach modelu, backendu i Excela: opóźniony resize planszy pamięci120kart w v17 dał16.328px zamiast wymaganych20px. Cache8 zawiera minimalną poprawkęUI z lokalnym pełnym v17 i wymuszonym opóźnionym ResizeObserverPASS przy niezmienionym progu20px; ten wynik nie zmieniaCIcache7. Próba bezpośredniego publicznego renderu Chromium pozostała zablokowana przez zarządzaneTLS mimo próby poprawnego zaufania certyfikatowi; nie oznaczono jej jakoPASS. Zgodne hashe nie zastępują takiego renderu. PRE-PROD/PROD pozostają bez nowej promocji.

Kontrola regresji wykryła dwa błędy prezentacji. Przegląd wyspy na ekranie laptopa mieści teraz pełną nawigację bez przewijania, zachowując przyciski minimum44px; ścisły test v17 przeszedł. Oprowadzanie ponownie odnajduje przycisk, gdy mobilny pasek wymieni jego element DOM; pełna trasa56kroków i deterministyczna wymiana oraz ponowna zmiana rozmiaru elementu przeszły na komputerze i telefonie. To poprawki frontu bez zmiany mechanik i stanu gry.

Dalsze wyniki lokalne: ikony21produktów na1440/390PASS,16widoków spójności menuPASS i14widoków nowych budynkówPASS. Pełny zestaw Node zakończył się1390PASS i jednym przekroczeniem ścisłego limitu10s przy równoległym obciążeniu przeglądarką. Ten sam przypadek96godzin offline przeszedł osobno bez zmiany limitu:1PASS,9354ms. Pierwszy timeout pozostaje w dowodach; własny CI nowego źródła nadal ma odrębny wynik.
