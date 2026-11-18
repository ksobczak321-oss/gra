# Wygląd rozbudowy wszystkich budynków — GO DEV, 18 listopada 2026

Użytkownik zamówił dziesięć wersji każdego budynku i średniowieczny żuraw widoczny w czasie budowy. Po pierwszych planszach zatwierdził implementację słowami „wrzuć na deva”, a następnie doprecyzował: **„zasada ma dotyczyć wszystkich budynków na wyspie”**. Zakres obejmuje wszystkie 20 istniejących funkcji budynków, również Ratusz, Dom, Port, Latarnię i Kamieniołom.

Przygotowywany kandydat ma wersję **0.15.2.0** i cache modułów **`frontend-v32-16`**. To publikacja wyłącznie DEV, Git i podglądu Pages. PRE-PROD, PROD, DNS, reset, hasła oraz dane kont pozostają poza tą operacją. Własne CI, Pages, odbiór opublikowanych bajtów i niezmienny tag nowego źródła są **PENDING**; wyniki wcześniejszej wersji 0.15.1.0 ich nie zastępują.

## Dziesięć wyglądów

Każda rodzina ma dziesięć odrębnych grafik, przypisanych do par poziomów:

| Wygląd | Poziomy |
|---|---|
| 1 | 1–2 |
| 2 | 3–4 |
| 3 | 5–6 |
| 4 | 7–8 |
| 5 | 9–10 |
| 6 | 11–12 |
| 7 | 13–14 |
| 8 | 15–16 |
| 9 | 17–18 |
| 10 | 19–20 |

Przypisanie parami jest przyjętym sposobem realizacji dziesięciu wersji w zakresie 1–20. Dla budynków rozwijanych powyżej 20 poziomy 21–100 zachowują ostatni wygląd, a nie blokują dalszej rozbudowy. Poziom 0 nadal oznacza istniejący podgląd zablokowanego budynku i zachowuje jego dotychczasowe warunki odblokowania. To techniczne zasady prezentacji; nie są zmianą limitów ekonomii.

Rozbudowa zachowuje rozpoznawalną rodzinę budynku, perspektywę i światło wyspy. Kolejne wersje stopniowo dodają detale i zabudowę. Nie wolno zastępować aktualnie zaakceptowanych tożsamości stereotypowymi budynkami o tej samej nazwie.

| Funkcja | ID modelu | Obecna tożsamość wizualna do zachowania |
|---|---|---|
| Ratusz | `townhall` | Centralny jasny budynek z wysoką niebieską iglicą, dawniej Kaplica. |
| Dom | `house` | Jasny dom z niebieskim dachem w górnej części osady. |
| Gospodarstwo | `farm` | Wkomponowany mały budynek gospodarczy przy polach; bydło odpowiada istniejącej produkcji. |
| Drwale | `lumber` | Mały drewniany budynek przy lesie w dotychczasowym miejscu. |
| Kamieniołom | `quarry` | Skaliste tarasy i drewniane konstrukcje wydobywcze. |
| Młyn | `windmill` | Obecny młyn z czterema skrzydłami. |
| Tartak | `sawmill` | Duży niebieskodachy budynek na górnym tarasie, dawniej Ratusz. |
| Magazyn | `warehouse` | Otwarta wiata z niebieskim płóciennym zadaszeniem na nabrzeżu. |
| Piekarnia | `bakery` | Istniejący jasny dom z czerwonym dachem przy centrum. |
| Mleczarnia | `dairy` | Istniejący jasny dom z czerwonym dachem obok pól. |
| Rzeźnia | `slaughterhouse` | Dodana mała drewniana chatka z niebieskim dachem w zaakceptowanym miejscu. |
| Rybak | `fisher` | Pomniejszony dawny tartak w porcie: jasne ściany, drewniany szkielet, niebieski dach i pasiasta markiza. |
| Zakład skórzany | `leatherworks` | Mały warsztat z czerwonym dachem przy Kamieniołomie, w dawnym miejscu Rybaka. |
| Akademia | `academy` | Jasny dom z czerwonym dachem i wysokim kominem za Rybakiem. |
| Koszary | `barracks` | Jasny obszerny budynek z niebieskim dachem i lukarnami, dawniej Magazyn. |
| Kaplica | `chapel` | Mały jasny budynek z czerwonym dachem u stóp Latarni. |
| Latarnia | `lighthouse` | Dotychczasowa jasna smukła wieża z galerią i latarnią na szczycie. |
| Teatr | `theatre` | Istniejący centralny dom z czerwonym dachem, dawniej Targ. |
| Targ | `market` | Sąsiedni otwarty stragan z czerwono-kremowym pasiastym zadaszeniem. |
| Port | `dock` | Nabrzeże i pomosty przy zachowanym istniejącym żaglowcu. Ulepszana jest infrastruktura, bez zmiany statku lub floty. |

Dawny, nieużywany budynek Zakładu skórzanego pozostaje dekoracją: nie otrzymuje drugiej funkcji, własnego poziomu ani obszaru kliknięcia. Jego wygląd ma odpowiadać etapowi Ratusza, aby również ten domek uczestniczył w rozwoju wizualnym wyspy. Jest to jawny wybór wykonawczy po doprecyzowaniu zakresu wszystkich budynków.

Teatr jest wyjątkiem wynikającym z istniejącego modelu: ma `maxLevel: 1`, a normalizacja zawsze zachowuje jego rzeczywisty poziom 1. Aby objąć go dziesięcioma wyglądami bez zmiany zasad gry, **wyłącznie etap grafiki Teatru podąża za poziomem Ratusza** według tej samej tabeli par. Nie powstają nowe poziomy, koszty ani czasy rozbudowy Teatru. Jest to jawny techniczny wybór integracji po sprawdzeniu kodu, a nie odtworzona wcześniejsza decyzja użytkownika.

## Żuraw podczas rzeczywistej budowy

Średniowieczny drewniany żuraw kołowrotowy jest warstwą grafiki, bez przechwytywania kliknięć. Pojawia się przy budynku tylko wtedy, gdy istniejące zwykłe lub płatne zlecenie faktycznie jest w etapie `building` i ma dodatni pozostały czas `buildRemaining`.

Kolejka, kompletowanie materiałów i transport nie wystarczają do pokazania żurawia. W trakcie budowy pozostaje aktualny wygląd budynku; docelowy etap pojawia się dopiero po zakończeniu rozbudowy przez istniejący model. Anulowanie, dokończenie po nieobecności, ponowne wejście i krótka usługa płatna muszą usuwać lub odtwarzać nakładkę zgodnie z rzeczywistym stanem. Renderer nie przyspiesza zegara i nie zapisuje nowego postępu.

## Wspólny obraz mapy i menu

Mapa, dolne menu na komputerze i telefonie oraz grafika nagłówka budynku korzystają z tej samej rodziny i bieżącego etapu. Miniatury zachowują proporcje i pełną sylwetkę; nie mogą prezentować starego budynku po zmianie poziomu. Identyfikatory, przypisane funkcje, obszary kliknięcia, ramki najechania i blokady pozostają zgodne z istniejącą mapą.

Zakres publikacji obejmuje też osobny katalog [wszystkich budynków i ich 200 wariantów](../../harborlight-building-gallery.html), plik `harborlight-building-gallery.html`. Katalog służy do przeglądu grafiki, bez zmiany stanu gry. Dla Teatru pary poziomów oznaczają wizualny etap zależny od Ratusza, nie rzeczywisty poziom Teatru.

Stare budynki są wrysowane w bazowe tło. Ich usunięcie wymaga czystych fragmentów terenu przed nałożeniem nowych sylwetek; sama przezroczysta naklejka pozostawiłaby dawne dachy. Kompozycja ma zachować wodę, mieszkańców, statek i pozostałe działające animacje. Stare rysowanie Młyna i kominy bez poprawnej nowej kotwicy nie mogą tworzyć podwójnych budynków ani dymu wiszącego w pustym miejscu.

Wybór atlasów z przezroczystością, wspólnej skali rodziny, kotwicy przy podstawie i czyszczenia terenu jest rozwiązaniem technicznym tej paczki. Nie zmienia produkcji, receptur, transportu, kosztów, odblokowań, schematu świata 9 ani rulesetu 32. Oczekujące decyzje o serze, otrębach lub paszy nie są częścią tego wdrożenia.

## Odbiór wymagany przed uznaniem DEV za gotowy

- Wszystkie 20 rodzin ma dziesięć kompletnych klatek, poprawne pliki i jawny manifest; kontrola obejmuje 200 wariantów.
- Granice 0, 1, 2→3, 18→19, 20, 21 i 100 wybierają prawidłowy wygląd bez zmiany modelu; Teatr zachowuje rzeczywisty poziom 1 i wizualnie śledzi Ratusz, podobnie jak dekoracyjna chatka.
- Rzeczywiste kliknięcia wszystkich funkcji, blokady, ramki najechania i dostęp do statku działają na komputerze oraz telefonach 320 i 390 px.
- Każdy etap ma właściwą skalę i podstawę; brak podwójnych dachów, białych prostokątów, szwów terenu, obciętych miniatur i przypadkowego zasłaniania sąsiadów.
- Zwykła i płatna budowa pokazują żuraw wyłącznie w rzeczywistym etapie budowy; dostawa, kolejka, anulowanie, zakończenie i powrót po nieobecności zachowują prawdziwy stan.
- Start czeka na komplet nowej sceny. Opóźnienie lub błąd zasobu nie pokazuje mieszanki starej i nowej grafiki; błąd ma czytelną obsługę i możliwość ponowienia.
- Woda, mieszkańcy, ograniczenie ruchu i odzyskiwanie renderowania zachowują dotychczasowe działanie i limity pamięci; nie wolno uznać statycznego screena za dowód wszystkich animacji.
- Zamknięty pakiet, aktualne odciski arkuszy, pełny CI dokładnego źródła, publikacja Pages i odczyt publicznych plików mają własne wyniki. Tag powstaje dopiero po potwierdzeniu właściwych sukcesów.

Dowody bieżącego zakresu: [raport](BUILDING-UPGRADE-ART-EVIDENCE.json), [HL-CHG-1164](../tracking/changes/HL-CHG-1164.md), [HL-CHG-1165](../tracking/changes/HL-CHG-1165.md). Ręczny odbiór użytkownika pozostaje **NOT_RUN**.
