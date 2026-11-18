# PRE-PROD 0.15.2.0 — GO 18 listopada 2026

Po przygotowaniu DEV użytkownik zlecił: „wrzuć na pre prod dla ścisłości wprowadzasz doradcę z królestwa, uproszczony tutorial i samouczek, zmieniające się budynki co drugi poziom wraz z rozwojem, żuraw konstrukcyjny na czas budowy”, a następnie doprecyzował: „+zmiany z excela”. To późniejsze GO rozszerza pierwotny zakres samego DEV.

Paczka 0.15.2.0 / cache17 obejmuje:

- Doradcę Królestwa: dobrowolne rady i rozmowę o dalszym rozwoju wyspy.
- Trzy kroki pierwszego wprowadzenia: górny pasek → dolne menu → Gospodarstwo. Pełny katalog i 25 dalszych lekcji pozostają dobrowolne w Pomocy, z zachowaniem historii i nagród.
- Wcześniejsze zaakceptowane zmiany z sześciu zakładek redakcyjnych oraz najnowszy import pięciu fioletowych zakładek, w tym jasnofioletowych „Odłożonych odkryć”: 175 wierszy, 34 niepuste C, 35 poprawionych tekstów i 10 dodanych rekordów katalogu. Siedem projektów nadal ma status odłożony; import ich opisów nie uruchamia nowych mechanik.
- Wszystkie 20 funkcji budynków, 200 wyglądów i dekoracyjną chatkę. Wygląd zmienia się dla par poziomów 1–2 do 19–20. Teatr zachowuje funkcjonalny poziom1 i wizualnie śledzi Ratusz; podobnie ozdobna chatka. Poziomy ponad20 korzystają z ostatniej grafiki.
- Średniowieczny żuraw przy rzeczywistym etapie budowy, także płatnej. Kolejka i transport materiałów nie pokazują żurawia.
- Zgodne obrazy mapy, nagłówków i menu oraz katalog `harborlight-building-gallery.html`. Istniejący statek pozostaje zachowany.

Promocja wymaga pełnego zielonego CI dokładnego końcowego SHA, odebranego DEV i standardowego workflow `google-cloud-dev.yml` z `main`. PRE-PROD oznacza istniejący projekt `harborlight-dev` i adres https://harborlight-dev.web.app. Nie przenosimy innej historycznej wersji ani nie zmieniamy main między dispatch i potwierdzeniem SHA przebiegu.

Odbiór obejmie dokładne publiczne pliki, konfigurację API, istniejącą zalogowaną wyspę i izolację kont. Konta, hasła, UID, generacje i postęp pozostają zachowane; test nie tworzy wyspy ani nie wysyła zapisów za użytkownika. PROD, domena i dawny zakończony reset nie są częścią tej operacji.

Pierwszy CI44279863651 dla9fc8cb1 zakończył się FAILURE na nieodświeżonych odciskach katalogu minigier po zmianie cache. Nie jest odbiorem tej paczki. Odświeżenie katalogu i55DOCX/55TXT zachowało wszystkie55 wpisów i treść instrukcji; zmieniły się wyłącznie odciski i źródłowySHA. Końcowy nowy SHA wymaga własnego CI, Pages i oddzielnego rzeczywistego wyniku PRE-PROD.

[Grafiki i zasady](GO-BUILDING-UPGRADE-ART.md) · [Dowody](BUILDING-UPGRADE-ART-EVIDENCE.json).
