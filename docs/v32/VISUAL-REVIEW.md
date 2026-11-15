# Przegląd interfejsu DEV v32

Po uwadze użytkownika poprawiono wyrównanie pól „Osoby” i przycisków „Przydziel”. W przeglądarce pola i przyciski mają te same górne i dolne krawędzie:40px wysokości na komputerze i44px na telefonie. Pomiary obejmują rzeczywisty panel, nie ukryte kopie elementów.

Przejrzano52 warianty głównych paneli przy1440px i390px, dodatkowe formularze nowych budynków oraz uwierzytelnione widoki Królestwa, darów, ratunku i ustawień. Poprawki obejmują formularze, kontrolki obsady, osie pól finansowych, odstępy narzędzia czasu, układy Teatru, kontrast sekcji na jasnym tle i czytelność pól. Usunięto przypadkowe `nullnull` w darach. Przegląd działania handlu skorygował widoczne instrukcje, katalog19 bieżących produktów, podgląd wymiany według wartości oraz ceny i limity ofert. Menu produkcji korzysta z nowych receptur.

Po korekcie użytkownika z15listopada pierwsza propozycja osobnych ilustracji została wycofana. Nowe funkcje wykorzystują nieużywane budynki już namalowane na bazowej planszy: M/Mleczarnia, P/Piekarnia, R/Rybak, A/Akademia, K/Koszary zgodnie ze screenem; Rzeźnia używa małej obory przy polach, a Zakład skórzany małego warsztatu za Akademią. Mapa ma wyłącznie przezroczyste obszary kliknięcia, bez dodatkowych domków. Miniatury są wycinkami tej samej planszy. Atlas pierwszej propozycji usunięto z bieżącego pakietu; historia pozostaje w Git.

Ostateczny układ: Teatr w dawnym budynku Targu, Targ na pasiastym straganie po prawej; Piekarnia nad nimi pozostaje. Dawny Teatr spod Kamieniołomu zniknął w v32. Usunięto stałe nazwy i plakietki poziomów z planszy. Nazwa i poziom pokazują się po najechaniu lub fokusie klawiatury. Oryginalny PNG ma ten sam SHA2564063f003002f95dd7b00f77a8d6d610b04f134766e52afc97e8a10712fd6d823.

Rzeczywisty test `tests/harborlight-native-map-v32-smoke.py`:1440/390,po9kliknięć do właściwych paneli, pozycje zgodne z grafiką, hover-only, brak staregoTeatru i dodatkowych grafik, miniatury z bazowegoPNG,zeroJS/overflow. Zdjęcia: `/workspace/work/native-map-v32-review`.

W minigrach sprawdzono48 widoków komponentów oraz22 okna działającej aplikacji na komputerze i telefonie. Poprawiono10 zbyt małych przycisków i4 okna czasu wychodzące poza ekran. Przyciski mają co najmniej44px, okna mieszczą się w obszarze ekranu i przewijają zawartość. Kontrast przycisków okna czasu wynosi7,46:1. Zweryfikowano też wybór następnej gry po wygranej oraz sterowanie planszami pamięci24/42/120 kart na360px i390px. Nowa scena przygody otwiera się od góry; rysowanie i zwykłe ruchy nie resetują przewijania.

Kontrole odtwarzalne: `tests/harborlight-v32-ui-smoke.py`, `tests/harborlight-v32-live-cas-smoke.py`, `tests/harborlight-original-puzzles-v32-smoke.py` i nowe testy geometrii minigier w katalogu `tests`. Lokalna dokumentacja pomiarów i zdjęcia przed/po: `/workspace/work/v32-visual-audit`, `/workspace/work/v32-form-audit`, `/workspace/work/dev-v32-minigame-layout`. Raport do pobrania: `/workspace/output/HARBORLIGHT_audyt_UI_DEV_v32.md`.

Przegląd dotyczy DEV. Roboczy podgląd jest publikowany wyłącznie na DEV Pages. Nie wykonano zmian PRE-PROD/PROD. Bieżące teksty pozostają do jutrzejszej redakcji użytkownika w Excelu ABC.
