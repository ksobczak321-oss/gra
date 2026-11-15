# GO DEV — spójne menu, przetwory rybne i poziom5

Status: wdrożone wyłącznie na DEV i publicznym cache6. Pages43725299560SUCCESS;15zgodnychSHA256 i poziom5/9dostępnychbudynków na1440/390PASS. Źródło aplikacji8a30d70, commit publikacji739b5dd. [Dowody](MENU-FISH-LEVEL5-EVIDENCE.json). Własny pełny CI końcowego commitu pozostaje osobnym wynikiem. Aplikacja0.15.0.0; PRE-PROD0.14/7e81a1a bez nowej promocji.

## Spójność menu

Przegląd objął20menu budynków i28pozostałych paneli na1440/390, razem96widoków głównych oraz24widoki szczegółów. Dotychczasowe kolumny starych budynków miały równe szerokości, lecz nierówną zawartość. Do wspólnego wzorca należą logiczne grupy funkcji, równomierne wykorzystanie obu kolumn, równe krawędzie, odstępy, nagłówki, pola i przyciski. W Domu „Indywidualna modlitwa” przechodzi na prawo pod premium. Nowe budynki otrzymują układ kart zgodny ze starymi; Akademia rozdziela naukę i badania, a Koszary szkolenie i wyprawy. Na telefonie pozostaje jedna logiczna kolejność bez poziomego przewijania.

Przyciski i pola używają wspólnej wysokości44px oraz równych linii podstawowych. Układ menu głównego, Ustawień, Premium, Królestwa i długich ekranów mieszkańców/zasobów jest porządkowany bez rozdzielania powiązanych funkcji. Dobrze wyrównane karty Pomocy, katalogu minigier i Przygód są wzorcami.

Komunikat o pracownikach docierających do pracy pozostaje widoczny, ale ma stałe miejsce przy nazwie budynku. Pojawienie lub aktualizacja nie może przesuwać przycisków+/−, zawartości ani przewinięcia. Trzy szybkie kliknięcia muszą trafić w ten sam przycisk.

Zbędny przycisk „Więcej o budynku” znika tam, gdzie powtarza bieżący widok, w tym z Magazynu. Rzeczywiste funkcje szczegółów Domu, Targu, Latarni i Ratusza zachowują dostęp z nazwanych wejść lub głównego widoku.

## Rybak — nowe odkrycie

Jedno badanie `fishProcessing` od5poziomu Rybaka odblokowuje dwa produkty IIIkategorii: **rybę wędzoną** (`smokedFish`) i **przetwory rybne** (`fishPreserves`). Produkcja odbywa się lokalnie u Rybaka ze świeżych ryb. Nie wymaga kursu tragarza ze świeżymi rybami do innego budynku ani pobrania tych ryb z centralnego magazynu. Gotowe produkty mogą być odbierane zwykłym transportem.

Użytkownik nie podał ilości receptur, sytości ani ceny. Bieżąca kalibracja DEV wzoruje się na istniejącym serze IIIkategorii:4świeże ryby →1ryba wędzona,12pkt sytości/cena10;6świeżych ryb →1przetwory rybne,18pkt sytości/cena15. Badanie:24ryby+4deski, bazowo1800s. To jawne wartości DEV do oceny, nie nowa szczegółowa odpowiedź użytkownika ani odbiór balansu PRE-PROD.

## Dostęp na poziomie5

[Docelowy podgląd poziomu5](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?preview=admin1-level5&v=frontend-v32-6) otwiera wyraźnie oznaczony scenariusz DEV bez konta, w pamięci karty. Nie udaje logowania jakoadmin1 i nie modyfikuje stanu konta. Ratusz, Dom, Magazyn i Rybak mają poziom5, a zwykłe odblokowania udostępniają pozostałe budynki. Odkrycie rybne nie jest z góry ukończone. [Zwykły nowy gracz](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&v=frontend-v32-6) nadal zaczyna na poziomie1.

Lokalny serwer ma autentyczne konto testowe `admin1/admin1` z Ratuszem5, bez resetu istniejącego postępu. Konta admin2/admin3 oraz wszystkie konta chmurowe pozostają poza zakresem awansu.

## Magazyn i dowody

Każdy kolejny poziom Magazynu korzysta z tego samego wzoru: koszyk potrzeb poziomu +40%, następnie zaokrąglenie w dół do pełnych10000; poziom1=40000. Nowe towary nie mnożą wspólnej pojemności. Stare zapasy ponad limit nie są usuwane.

Przegląd sprzed implementacji jest dowodem wykrycia problemów, nie potwierdzeniem naprawy. Testy tej paczki muszą sprawdzić układ komputer/telefon, nieruchome trzy szybkie kliknięcia, lokalne przetwarzanie ryb, progi badania4/5, zachowanie zapisów oraz faktycznie hostowany poziom5. Ręczny odbiór użytkownika pozostaje NOT_RUN.
