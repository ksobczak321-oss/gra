# PRE-PROD 0.15.2.0 — GO 18 listopada 2026

Po przygotowaniu DEV użytkownik zlecił: „wrzuć na pre prod dla ścisłości wprowadzasz doradcę z królestwa, uproszczony tutorial i samouczek, zmieniające się budynki co drugi poziom wraz z rozwojem, żuraw konstrukcyjny na czas budowy”, a następnie doprecyzował: „+zmiany z excela”. To późniejsze GO rozszerza pierwotny zakres samego DEV.

## Końcowy odbiór

DEV **0.15.2.0 / cache `frontend-v32-17`** jest odebrany dla źródła `dda2fa1793e49ec23811ccffb147a7e56a366692`. [CI44287093749](https://github.com/ksobczak321-oss/gra/actions/runs/44287093749) zakończył się **SUCCESS 35 min 15 s** (job 34 min 54 s): 1492 testy frontend, 170 backend i 7 planszówki, łącznie 1669 Node, 167 Python i wszystkie 70 programów Chromium (1 osobnych minigier + 51 głównych + 18 chmurowych). [Pages44287093698](https://github.com/ksobczak321-oss/gra/actions/runs/44287093698) ma **SUCCESS 41 s**. Niezmienny tag `dev-0.15.2.0-20261118`, obiekt `8e896679845498da472156697c1a412635cf8443`, jest zdalnie potwierdzony na tym samym źródle.

Pakiet ma 255 plików / 69 289 150 bajtów, w tym generowany manifest wydania. Normalny HTTPS/TLS potwierdził wszystkie 254 publiczne pliki Pages / 69 262 846 bajtów zgodne z Git; obu publicznych arkuszom również sprawdzono pełne SHA-256. Odtworzenie pobranych publicznych bajtów lokalnie przeszło program budynków, cztery szerokości mapy oraz pełny start. Natywna przeglądarka HTTPS w tej infrastrukturze pozostaje **BLOCKED: ERR_CERT_AUTHORITY_INVALID**; nie obchodzono TLS i nie deklaruje się jej PASS.

Standardowa promocja [PRE-PROD44292700743/próba1](https://github.com/ksobczak321-oss/gra/actions/runs/44292700743) dla dokładnie tego samego źródła zakończyła się **SUCCESS 6 min 51 s**, 18 listopada **12:13:25–12:20:16 czasu Warszawy (11:13:25–11:20:16 UTC)**. Gate: 7 s / 7 kroków SUCCESS; deploy: 6 min 35 s / 32 kroki SUCCESS i 1 pominięta diagnostyka. Natywny odbiór hostowanych minigier przeszedł 110 plansz, 100 wariantów opowieści i 110 dokumentów. Natywny test istniejącej zalogowanej wyspy potwierdził 254 dokładne hashe zasobów, z zablokowanymi wszystkimi zapisami przeglądarki. Kontrola kont potwierdziła 3 logowania, 3 istniejące zapisy, 0 pustych wysp i izolację dostępu: odmowy 6 obcych i 3 anonimowych odczytów Firestore, 3 własnych bezpośrednich oraz 3 anonimowych API; 3 własne odczyty API PASS. Niezależne porównanie przed/po potwierdziło niezmienione UID, generacje 2/2/2, rewizje 54/9/591 i pełne ładunki wszystkich trzech zapisów. Nie zmieniono kont ani postępu. Niezależnie pobrano i sprawdzono oba oryginalne ZIP-y GitHub po rozmiarze i SHA-256; standardowa walidacja receipt potwierdziła wszystkie 4 kontrole, obraz API po digest oraz identyczne archiwum i manifest frontendu. Normalny TLS potwierdził wszystkie **255 plików PRE-PROD / 69 289 150 bajtów** identyczne z oryginalnym archiwum. Tag `preprod-0.15.2.0-20261118`, obiekt `99899f7585b0fd9adb4686b5dfd0c331a19ca089`, jest zdalnie potwierdzony na tym samym źródle. **DEV i PRE-PROD są odebrane.** PROD, DNS i reset poza zakresem. Ręczny odbiór użytkownika **NOT_RUN**.

[Pełny odbiór DEV i PRE-PROD](BUILDING-UPGRADE-ART-PREPROD-ACCEPTANCE.json) · [Gra PRE-PROD](https://harborlight-dev.web.app/harborlight-v1-layered.html?v=frontend-v32-17) · [Galeria PRE-PROD](https://harborlight-dev.web.app/harborlight-building-gallery.html?v=frontend-v32-17).

## Zakres

Paczka 0.15.2.0 / cache17 obejmuje:

- Doradcę Królestwa: dobrowolne rady i rozmowę o dalszym rozwoju wyspy.
- Trzy kroki pierwszego wprowadzenia: górny pasek → dolne menu → Gospodarstwo. Pełny katalog i 25 dalszych lekcji pozostają dobrowolne w Pomocy, z zachowaniem historii i nagród.
- Wcześniejsze zaakceptowane zmiany z sześciu zakładek redakcyjnych oraz najnowszy import pięciu fioletowych zakładek, w tym jasnofioletowych „Odłożonych odkryć”: 175 wierszy, 34 niepuste C, 35 poprawionych tekstów i 10 dodanych rekordów katalogu. Siedem projektów nadal ma status odłożony; import ich opisów nie uruchamia nowych mechanik.
- Wszystkie 20 funkcji budynków, 200 wyglądów i dekoracyjną chatkę. Wygląd zmienia się dla par poziomów 1–2 do 19–20. Teatr zachowuje funkcjonalny poziom1 i wizualnie śledzi Ratusz; podobnie ozdobna chatka. Poziomy ponad20 korzystają z ostatniej grafiki.
- Średniowieczny żuraw przy rzeczywistym etapie budowy, także płatnej. Kolejka i transport materiałów nie pokazują żurawia.
- Zgodne obrazy mapy, nagłówków i menu oraz katalog `harborlight-building-gallery.html`. Istniejący statek pozostaje zachowany.

Promocja wymaga pełnego zielonego CI dokładnego końcowego SHA, odebranego DEV i standardowego workflow `google-cloud-dev.yml` z `main`. PRE-PROD oznacza istniejący projekt `harborlight-dev` i adres https://harborlight-dev.web.app. Nie przenosimy innej historycznej wersji ani nie zmieniamy main między dispatch i potwierdzeniem SHA przebiegu.

Odbiór obejmie dokładne publiczne pliki, konfigurację API, istniejącą zalogowaną wyspę i izolację kont. Konta, hasła, UID, generacje i postęp pozostają zachowane; test nie tworzy wyspy ani nie wysyła zapisów za użytkownika. PROD, domena i dawny zakończony reset nie są częścią tej operacji.

Pierwszy CI44279863651 dla9fc8cb1 zakończył się FAILURE na nieodświeżonych odciskach katalogu minigier po zmianie cache. Nie jest odbiorem tej paczki. Odświeżenie katalogu i55DOCX/55TXT zachowało wszystkie55 wpisów i treść instrukcji; zmieniły się wyłącznie odciski i źródłowySHA. W chwili tej nieudanej próby końcowy nowy SHA wymagał własnego CI, Pages i oddzielnego rzeczywistego wyniku PRE-PROD; późniejszy pełny odbiór źródła DDA podano powyżej.

[Grafiki i zasady](GO-BUILDING-UPGRADE-ART.md) · [Dowody](BUILDING-UPGRADE-ART-EVIDENCE.json).
