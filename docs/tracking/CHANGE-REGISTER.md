# HARBORLIGHT — rejestr zmian

Stan ewidencji: **2026-10-31**. **229 osobnych kart**, pogrupowanych w 11 epików. Każda karta ma stabilny identyfikator i odrębne statusy implementacji, DEV, CI, PRE-PROD, PROD oraz decyzji.

Źródło danych: [changes.json](changes.json). Karty odtwarza `python3 scripts/build_change_register.py`; `--check` sprawdza zgodność bez zapisów. Nie edytuj wygenerowanych kart zamiast źródła JSON.

## Zakres i granice

Widoczna historia rozmowy, trzy pełne wklejki użytkownika i zatwierdzone zakresy v17–v22.1. Historyczne materiały v1–v16 są kontekstem, nie nowymi domyślnie otwieranymi zadaniami.

Rejestr nie publikuje prywatnych kwot Billing ani danych osobistych związanych z JDG.

**To są wpisy repozytorium, nie opublikowane GitHub Issues.** Dostęp do API GitHub nie jest uwierzytelniony w tej sesji. Każdy rekord ma `issue_url: null` i `published_to_github_issues: false`; istniejące numery Issues są wyłącznie historycznymi powiązaniami. Nie utworzono fikcyjnych numerów ani nie zamknięto zdalnych zgłoszeń.

## Potwierdzony punkt odniesienia

- Kod aplikacji PRE-PROD: `092e75226fbb14cab09826f313e11d10891966d8` (**v22.1**).
- CI: [41221965032 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41221965032).
- PRE-PROD: [41222765705, próba 1 — SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41222765705).
- Aktywacja API kont/rynku: **niepotwierdzona**. Pełny reset admin1–3: **niewykonany**.
- PROD: **brak potwierdzonej publikacji**. Bieżący [rejestr środowisk](../ENVIRONMENT-STATUS.md) rozstrzyga późniejsze promocje.

Sukces wspólnego CI dowodzi testów wydania, a `code_deployed_v22_1` obecności kodu w opublikowanym pakiecie. Nie oznacza, że każdy przypadek został ręcznie przeklikany ani że włączono OAuth, płatności, reklamy czy nowe API. Nowe propozycje mają własne statusy; nie dziedziczą sukcesu CI v22.1.

## Znaczenie statusów

| Pole | Interpretacja |
|---|---|
| `implementation` | Czy istnieje implementacja, gotowy skrypt, wyłącznie dokumentacja lub propozycja. |
| `dev` | Zweryfikowany lokalnie kod, test z izolowaną usługą, analiza lub brak odczytu. |
| `ci` | Wynik CI właściwego zakresu; `not_run_for_change` nie jest PASS poprzedniej wersji. |
| `preprod` | Kod opublikowany, usługa faktycznie potwierdzona, nieustalona aktywacja albo niewykonana operacja. |
| `prod` | W tej ewidencji brak publikacji i aktywacji produkcyjnej. |
| `decision` | Przyjęte, otwarte, odłożone, zastąpione, wycofane lub tylko częściowo rozstrzygnięte. |

Powiązanie `superseded_by` nie usuwa historii. Przykłady: PayU → Paynow; automatyczne refundacje → brak automatycznych zwrotów; wyłączny PvP → nowa dyspozycja NPC+PvP. Ostatnia zmiana kierunku nie aktualizuje wstecz opublikowanego kodu. Zwykłe zachowanie historii admin1 nadal obowiązuje przy deployu; późniejszy pełny reset jest osobnym wyjątkiem.

## Epiki i karty

<a id="hl-epic-ui"></a>

### HL-EPIC-UI — Interfejs i wprowadzenie

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0001 — Smutna buźka nad budynkiem z rzeczywistą karą przestoju](changes/HL-CHG-0001.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0002 — Usunięcie logowania i zakładania konta z Ustawień gry](changes/HL-CHG-0002.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0003 — Usunięcie strzałki powrotu z ekranu minigry](changes/HL-CHG-0003.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0004 — Cała plansza trójek mieści się bez suwaków i obciętych kart](changes/HL-CHG-0004.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0005 — Wyrównane górne krawędzie kolumn panelu budynku](changes/HL-CHG-0005.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0006 — Menu wyspy pozostaje wewnątrz ramki](changes/HL-CHG-0006.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0007 — Popup rzeczywistego skrócenia budowy o minuty i sekundy](changes/HL-CHG-0007.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0008 — Lekcja priorytetów wskazuje najpierw Szczegóły budynku](changes/HL-CHG-0008.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0009 — Kolejność oprowadzania: szczęście, monety, mieszkańcy](changes/HL-CHG-0009.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0010 — Sześć kafelków premii w dwóch rzędach po trzy](changes/HL-CHG-0010.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0011 — Usunięcie zduplikowanej płatności premium budynku](changes/HL-CHG-0011.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0012 — Pierwsze wejście zaczyna kilkuzdaniowe wyjaśnienie celu gry](changes/HL-CHG-0012.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0013 — Nazwa wyspy po pierwszym opisie gry](changes/HL-CHG-0013.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0014 — Oprowadzanie po nagłówku, wszystkich budynkach i dolnym menu](changes/HL-CHG-0014.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0015 — Strzałki wstecz i dalej oraz zamknięcie oprowadzania](changes/HL-CHG-0015.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0016 — Zegar nowego świata rusza dopiero po oprowadzaniu lub wyjściu](changes/HL-CHG-0016.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0017 — Wznowienie zapisanego etapu wprowadzenia po ponownym wejściu](changes/HL-CHG-0017.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0018 — Praktyczny samouczek zaczyna się po oprowadzaniu](changes/HL-CHG-0018.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0019 — Usunięcie karty konta oraz ręcznego Zapisz i Wczytaj z chmury](changes/HL-CHG-0019.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0020 — Wyraźny przycisk Wyloguj się w Ustawieniach](changes/HL-CHG-0020.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0021 — Widoczna wersja aplikacji 0.9.1.1 w Ustawieniach](changes/HL-CHG-0021.md) | Story | `accepted` | `verified_local` | `not_deployed` |
| [HL-CHG-0022 — Wyjaśnienie zasobów lokalny / centralny (w transporcie) i bilansu godzinowego](changes/HL-CHG-0022.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0023 — Menu Monet wyjaśnia podatników, reklamy i minigry](changes/HL-CHG-0023.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0024 — Dom pokazuje przydziały, dzienne punkty szczęścia i demografię](changes/HL-CHG-0024.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0025 — Kaplica wyjaśnia błogosławieństwa oraz łaskę i gniew zgodnie z logiką](changes/HL-CHG-0025.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0026 — Wskazany priorytet Budowa musi być rzeczywiście widoczny i spełniony](changes/HL-CHG-0026.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0027 — Konfiguracja kategorii powiadomień obejmuje dzwonek](changes/HL-CHG-0027.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0028 — Usunięcie słowa Wyrusz z wejścia do ekspedycji](changes/HL-CHG-0028.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0029 — Usunięcie przycisku Latarni spod ekspedycji](changes/HL-CHG-0029.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0030 — Wycofana uwaga o Porcie ze starego zrzutu ekranu](changes/HL-CHG-0030.md) | Decision | `withdrawn` | `not_applicable` | `not_applicable` |

<a id="hl-epic-tut"></a>

### HL-EPIC-TUT — Samouczek i nagrody

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0040 — 25 lekcji wymaga rzeczywistych działań zamiast odczytania opisu](changes/HL-CHG-0040.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0041 — Migracja zachowuje stare ukończenia i odebrane nagrody](changes/HL-CHG-0041.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0042 — Przepełnienie blokuje następne skrzynie, pozostawiając działania zużywające zasoby](changes/HL-CHG-0042.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0043 — Zbilansowanie 25 zadań: nagrody przeplatane realnymi wydatkami](changes/HL-CHG-0043.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0044 — Końcowe rozliczenie z pełnym magazynem bez oczekujących skrzyń](changes/HL-CHG-0044.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0045 — Samodzielnie wykonana wcześniej lekcja znika bez kufra i premii](changes/HL-CHG-0045.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0046 — Powtórzone lekcje wymagają odrębnych faktycznych działań](changes/HL-CHG-0046.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0047 — Odtwarzanie wcześniejszych czynności ze starych wiarygodnych dowodów](changes/HL-CHG-0047.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0048 — Trwająca minigra ma pierwszeństwo przed samouczkiem i skrzynią](changes/HL-CHG-0048.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0049 — Starszy program skrzyń i podwajania zachowuje rozliczone decyzje](changes/HL-CHG-0049.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |

<a id="hl-epic-eco"></a>

### HL-EPIC-ECO — Gospodarka i logistyka

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0101 — Nagrody są wydawalnym bonusem poza limitem zwykłych dostaw](changes/HL-CHG-0101.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0102 — Przy wydawaniu zasobów najpierw zużywany jest bonus](changes/HL-CHG-0102.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0103 — Nagroda zadania nie ginie przez już nadchodzący ładunek i rezerwacje](changes/HL-CHG-0103.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0104 — Natychmiastowy przewóz uwzględnia wcześniejsze zwykłe dostawy](changes/HL-CHG-0104.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0105 — Premium odbiór z Targu nie kasuje wcześniejszego zwykłego zlecenia](changes/HL-CHG-0105.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0106 — Towar podjęty przed wygaśnięciem jest chroniony na obu odcinkach Portu](changes/HL-CHG-0106.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0107 — Kolejne poziomy budynku nie przekraczają limitu kolejki Ratusza](changes/HL-CHG-0107.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0108 — Po maksymalnej pojemności Magazynu rośnie wyłącznie obsada](changes/HL-CHG-0108.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0109 — Rzeczywisty czas dostaw pozostaje podstawą czasu budowania](changes/HL-CHG-0109.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0110 — Port i Targ odświeżają rzeczywiste etapy przewozu w otwartym panelu](changes/HL-CHG-0110.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0111 — Próg 75% ludności dla Ratusza od awansu 3→4](changes/HL-CHG-0111.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0112 — Historyczna decyzja: od TH6 tylko handel graczy zamiast NPC](changes/HL-CHG-0112.md) | Decision | `superseded` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0113 — Wymiany materiałów między graczami z własnym przelicznikiem](changes/HL-CHG-0113.md) | Story | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0114 — Serwerowa rezerwacja i atomowe przyjęcie jednej oferty](changes/HL-CHG-0114.md) | Bug | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0115 — Zwroty anulowanych i wygasłych ofert nie znikają przy pełnym magazynie](changes/HL-CHG-0115.md) | Bug | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0116 — Ścieżki jako rzeczywisty wydatek kamienia i premia przewozu](changes/HL-CHG-0116.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |

<a id="hl-epic-peo"></a>

### HL-EPIC-PEO — Mieszkańcy, szczęście i wydarzenia

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0201 — Powitalne szczęście co najmniej 20% przez 72 godziny](changes/HL-CHG-0201.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0202 — Powitalne minimum obejmuje także nowo przybyłych](changes/HL-CHG-0202.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0203 — Wymuszone 100% Latarni obejmuje każdego do wspólnego końca efektu](changes/HL-CHG-0203.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0204 — Początkowe 0% nowych mieszkańców pozostaje poza ochroną powitalną i Latarnią](changes/HL-CHG-0204.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0205 — Nowi mieszkańcy przybywają dwukrotnie częściej](changes/HL-CHG-0205.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0206 — Kara bezrobocia nie działa podczas dojścia do przydzielonej pracy](changes/HL-CHG-0206.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0207 — Podatek zaczyna się po dotarciu do pracy](changes/HL-CHG-0207.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0208 — Aktywność daje produkcję, podatki i szybkość przewozu ×2 przez pięć minut](changes/HL-CHG-0208.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0209 — Po 48 godzinach bez gry produkcja, podatki i transport ×0,5](changes/HL-CHG-0209.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0210 — Rozliczenie 60 godzin nieobecności ma 48 godzin normalnych i 12 spowolnionych](changes/HL-CHG-0210.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0211 — Jedzenie, efekty i kalendarz nadal biegną w czasie rzeczywistym](changes/HL-CHG-0211.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0212 — Dzienna pula szczęścia Domu odnawia się o północy Warszawy](changes/HL-CHG-0212.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0213 — Opis głodu odróżnia posiłek od pełnej godziny zerującej licznik](changes/HL-CHG-0213.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0214 — Wycofany tragarz kończy niesiony ładunek i wraca pełne pięć minut](changes/HL-CHG-0214.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0215 — Jedno darmowe błogosławieństwo na dzień Warszawy bez kumulowania](changes/HL-CHG-0215.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0216 — Od Kaplicy 3 monitorowanie regularności co 3 + poziom Kaplicy dni](changes/HL-CHG-0216.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0217 — Ryzyko plagi dopiero 6–15 dni po przekroczeniu dozwolonego odstępu](changes/HL-CHG-0217.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0218 — Latarnia podczas plagi wymusza 100%, nie zwraca strat](changes/HL-CHG-0218.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0219 — Dobre wraki czekają na koniec Latarni, złe terminy są losowane od nowa](changes/HL-CHG-0219.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0220 — Rozbitek bez miejsca daje monety zamiast nadmiarowej osoby](changes/HL-CHG-0220.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0221 — Katastrofy chronią rezerwacje i niesione ładunki oraz minimum sześć osób](changes/HL-CHG-0221.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0222 — Dobre i złe scenariusze wraku z przewagą dobrych wydarzeń](changes/HL-CHG-0222.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0223 — Historia powiadomień do 100 i kasowanie tylko przeczytanych](changes/HL-CHG-0223.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0224 — Licznik bezrobocia zeruje się dopiero po dotarciu, nie po samym przydziale](changes/HL-CHG-0224.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0225 — Nowy kalendarz zaczyna 1 stycznia przy rzeczywistej godzinie Warszawy](changes/HL-CHG-0225.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0226 — Podkład muzyczny i jego licencja odłożone do późniejszej integracji](changes/HL-CHG-0226.md) | Decision | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0227 — Wynik godzinowy to Ratusz × monety zapisywany po pełnej godzinie](changes/HL-CHG-0227.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0228 — Remis w rankingu oznacza to samo miejsce ex aequo](changes/HL-CHG-0228.md) | Decision | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0229 — Osobna modlitwa w Kaplicy — liczba miejsc, czas i efekt pozostawione do decyzji](changes/HL-CHG-0229.md) | Decision | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0230 — Dodatkowe błogosławieństwa za wyzwanie lub udostępnienie — odłożone](changes/HL-CHG-0230.md) | Decision | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0231 — Dawny wyjątek 0% nowych mieszkańców także podczas Latarni](changes/HL-CHG-0231.md) | Decision | `superseded` | `not_applicable` | `not_applicable` |
| [HL-CHG-0232 — Opis wydajności producenta uwzględnia rzeczywisty poziom zamiast stałych 20 szt./h](changes/HL-CHG-0232.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0233 — Przestój Młyna i Tartaku wskazuje brak materiału zamiast pełnego magazynu](changes/HL-CHG-0233.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0234 — Pomoc pokazuje karę przestoju konkretnego mieszkańca](changes/HL-CHG-0234.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0235 — Pasek szczęścia oznacza wymuszone 100% z Latarni](changes/HL-CHG-0235.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0236 — Długa nieobecność uruchamia najwyżej jedno zaległe złe wydarzenie](changes/HL-CHG-0236.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |

<a id="hl-epic-min"></a>

### HL-EPIC-MIN — Ekspedycje i nagradzane reklamy

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0301 — Wybór kulek lub trójek zamiast nieczytelnych serii losowania](changes/HL-CHG-0301.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0302 — Przycisk reklamy w obu minigrach](changes/HL-CHG-0302.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0303 — Dawny niezdefiniowany bonus przycisku reklamy zastąpiony konkretnym czasem](changes/HL-CHG-0303.md) | Decision | `superseded` | `not_applicable` | `not_applicable` |
| [HL-CHG-0304 — Nagrody rund 50, 100, 200, 400 i pula 50, 150, 350, 750](changes/HL-CHG-0304.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0305 — Dobrowolny zakup dodatkowych sekund za monety albo reklamę](changes/HL-CHG-0305.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0306 — Błogosławieństwo za reklamę współdzieli czterogodzinną blokadę płatnego](changes/HL-CHG-0306.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0307 — Pierwsza reklama raz między 4. a 8. aktywną minutą konta](changes/HL-CHG-0307.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0308 — Pierwszy wybór ekspedycja albo reklama po 5–15 aktywnych minutach od pierwszej reklamy](changes/HL-CHG-0308.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0309 — Drugi wybór po 43–62 aktywnych minutach od końca pierwszej aktywności](changes/HL-CHG-0309.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0310 — Kolejne wybory co losowe 60–100 aktywnych minut](changes/HL-CHG-0310.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0311 — Wycofana propozycja automatycznej reklamy co pięć minut](changes/HL-CHG-0311.md) | Decision | `superseded` | `not_applicable` | `not_applicable` |
| [HL-CHG-0312 — Obniżenie nagrody materiałowej reklamy do 10–30 każdego z pięciu materiałów](changes/HL-CHG-0312.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0313 — Automatyczne propozycje reklam i minigier czekają na bezpieczny moment](changes/HL-CHG-0313.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0314 — Reklama czasu zatrzymuje rundę, ale świat działa dalej](changes/HL-CHG-0314.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0315 — Lojalność losuje 50–200 każdego z sześciu zasobów](changes/HL-CHG-0315.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0316 — Dawna reklama Kaplicy 60 s skracająca oczekiwanie o połowę maks. 2 razy/h](changes/HL-CHG-0316.md) | Decision | `superseded` | `not_applicable` | `not_applicable` |
| [HL-CHG-0317 — Dalsze strojenie minigier po obserwacji graczy](changes/HL-CHG-0317.md) | Decision | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0318 — Dawna nagroda reklamowa 50–150 każdego materiału](changes/HL-CHG-0318.md) | Decision | `superseded` | `not_applicable` | `not_applicable` |
| [HL-CHG-0319 — Dobrowolne nagrody reklamowe mogą powiększać bonus mimo blokady kolejnych skrzyń](changes/HL-CHG-0319.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0320 — Gracz bez standardowych reklam zachowuje punkt startu harmonogramu 4–8 minut](changes/HL-CHG-0320.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |

<a id="hl-epic-acc"></a>

### HL-EPIC-ACC — Konta, zapis i retencja

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0401 — Trzy stałe tożsamości PRE-PROD admin1, admin2, admin3](changes/HL-CHG-0401.md) | Story | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0402 — Stałe loginy i hasła testowe odpowiadają nazwom kont](changes/HL-CHG-0402.md) | Decision | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0403 — Postęp trzech kont w chmurze i dostęp z innych urządzeń](changes/HL-CHG-0403.md) | Story | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0404 — Pakiet startowy nowej wyspy powstaje raz przy pierwszym wejściu](changes/HL-CHG-0404.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0405 — Uruchomienie Firebase Authentication przed przygotowaniem stałych kont](changes/HL-CHG-0405.md) | Bug | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0406 — Obowiązkowa akceptacja Regulaminu i odrębne potwierdzenie Polityki prywatności](changes/HL-CHG-0406.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0407 — Rejestracja i logowanie rzeczywistych kont e-mail na PROD](changes/HL-CHG-0407.md) | Story | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0408 — Utworzenie pierwszej wyspy po przyjęciu dokumentów także dla OAuth](changes/HL-CHG-0408.md) | Story | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0409 — Automatyczny zapis co 30 sekund bez ręcznego zapisywania](changes/HL-CHG-0409.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0410 — CAS, konflikt urządzeń i bezpieczne odzyskanie po utracie potwierdzenia zapisu](changes/HL-CHG-0410.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0411 — Awaria chmury blokuje dalsze zatwierdzanie bez lokalnego zapisu lub startera](changes/HL-CHG-0411.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0412 — Po 30 min bezczynności ostrzeżenie, po kolejnych 30 s wylogowanie](changes/HL-CHG-0412.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0413 — Przycisk Zacznij na nowo resetuje pojedynczą wyspę z zachowaniem historii konta](changes/HL-CHG-0413.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0414 — Pełny reset postępu wszystkich trzech kont po udanej promocji](changes/HL-CHG-0414.md) | Ops | `accepted` | `verified` | `not_applied` |
| [HL-CHG-0415 — Retencja po trzech miesiącach kalendarzowych bez rzeczywistej gry](changes/HL-CHG-0415.md) | Story | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0416 — Zakupy, kody, polecenia i jednorazowe nagrody pozostają po wygaśnięciu świata](changes/HL-CHG-0416.md) | Story | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0417 — Wycofanie automatycznych zwrotów po trzech miesiącach nieobecności](changes/HL-CHG-0417.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0418 — Dawna propozycja zwrotu zakupów po potrąceniu prowizji](changes/HL-CHG-0418.md) | Decision | `superseded` | `not_applicable` | `not_applicable` |
| [HL-CHG-0419 — Zapamiętana sesja nie przetrwa bezczynnie do następnego dnia](changes/HL-CHG-0419.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0420 — Czytelny błąd SERVICE_DISABLED Identity Toolkit przed aktywacją Authentication](changes/HL-CHG-0420.md) | Bug | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0421 — Obsługa nieprzezroczystych identyfikatorów operacji Google przy przygotowaniu kont](changes/HL-CHG-0421.md) | Bug | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0422 — Powrót do gry nie wymusza samouczka od początku ani nie kasuje historii](changes/HL-CHG-0422.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0423 — Wcześniejsze zachowanie historii admin1 przy zwykłej promocji](changes/HL-CHG-0423.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0424 — Pierwotne uruchamianie zegara wyspy przy pierwszym zalogowaniu](changes/HL-CHG-0424.md) | Decision | `superseded` | `not_applicable` | `not_applicable` |

<a id="hl-epic-com"></a>

### HL-EPIC-COM — Płatności, logowanie i społeczność

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0501 — Pierwotny wybór PayU dla wersji przeglądarkowej](changes/HL-CHG-0501.md) | Decision | `superseded` | `not_applicable` | `not_applicable` |
| [HL-CHG-0502 — Wybór Paynow zamiast PayU](changes/HL-CHG-0502.md) | Decision | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0503 — Wyraźny link do płatności i miejsce na kod przy premium](changes/HL-CHG-0503.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0504 — Własne monety od TH4, zakup za pieniądze od TH1](changes/HL-CHG-0504.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0505 — Standardowe bez reklam po 19,99 zł brutto w ostatnich ruchomych 30 dniach](changes/HL-CHG-0505.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0506 — Rzeczywiste płatności Paynow po założeniu konta operatora i firmy](changes/HL-CHG-0506.md) | Story | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0507 — Rzeczywisty dostawca nagradzanych reklam Google](changes/HL-CHG-0507.md) | Story | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0508 — Rejestracja i logowanie przez Google](changes/HL-CHG-0508.md) | Story | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0509 — Rejestracja i logowanie przez Facebook](changes/HL-CHG-0509.md) | Story | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0510 — Automatyczny post na stronie gry i profilu gracza po osiągnięciu](changes/HL-CHG-0510.md) | Decision | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0511 — Gracz sam inicjuje i zatwierdza pochwalenie się osiągnięciem](changes/HL-CHG-0511.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0512 — Utworzenie strony Facebook gry i przygotowanie jej na dzień zero](changes/HL-CHG-0512.md) | Story | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0513 — Kody promocyjne z nagrodą i globalnym limitem pierwszych użytkowników](changes/HL-CHG-0513.md) | Story | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0514 — Aktywność poleconego nie może poprzedzać jego pierwszego logowania](changes/HL-CHG-0514.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0515 — Weryfikowane nagrody publikacji i poleceń](changes/HL-CHG-0515.md) | Story | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0516 — Dzwonek Facebooka nie jest uprawnieniem wynikającym z e-maila i zakupu premium](changes/HL-CHG-0516.md) | Decision | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0517 — Logo Paynow i jawna symulacja bez pobierania prawdziwych pieniędzy](changes/HL-CHG-0517.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0518 — Kanały rzeczywistych płatności w wydaniach Google Play i Apple](changes/HL-CHG-0518.md) | Decision | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0519 — Dawne bez reklam at all obejmujące także czas w ekspedycjach](changes/HL-CHG-0519.md) | Decision | `superseded` | `not_applicable` | `not_applicable` |

<a id="hl-epic-inf"></a>

### HL-EPIC-INF — Infrastruktura i wydania

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0601 — Google Cloud wybrane dla małego startu i późniejszej skali](changes/HL-CHG-0601.md) | Decision | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0602 — Oddzielne projekty PRE-PROD i PROD](changes/HL-CHG-0602.md) | Ops | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0603 — Powiązanie właściwego rozliczenia z projektami](changes/HL-CHG-0603.md) | Ops | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0604 — Nazwy środowisk: DEV tutaj, PRE-PROD na harborlight-dev, PROD na harborlight-prod](changes/HL-CHG-0604.md) | Decision | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0605 — Promocja DEV→Git/CI→PRE-PROD→PROD bez pomijania etapów](changes/HL-CHG-0605.md) | Story | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0606 — Bootstrap API, repozytorium obrazów, kont usługowych i WIF](changes/HL-CHG-0606.md) | Ops | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0607 — Odczytowa weryfikacja konfiguracji obu projektów](changes/HL-CHG-0607.md) | Ops | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0608 — Firebase dodawane do istniejącego projektu po błędzie 403 i warunkach usługi](changes/HL-CHG-0608.md) | Bug | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0609 — Publiczna kontrola Cloud Run używa działających tras health i ready](changes/HL-CHG-0609.md) | Bug | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0610 — Uprawnienia Service Usage i Firebase Hosting dla deployera](changes/HL-CHG-0610.md) | Bug | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0611 — Rzeczywiste koszty GCP za ostatnią dobę](changes/HL-CHG-0611.md) | Ops | `requested` | `no_billing_credentials` | `not_read` |
| [HL-CHG-0612 — Pierwotny limit miesięczny 200 PLN](changes/HL-CHG-0612.md) | Decision | `superseded` | `not_applicable` | `not_applicable` |
| [HL-CHG-0613 — Budżet alertowy 100 USD miesięcznie łącznie dla obu projektów](changes/HL-CHG-0613.md) | Ops | `accepted` | `verified` | `not_applied` |
| [HL-CHG-0614 — Próg planowania pojemności oznacza 100 graczy jednocześnie](changes/HL-CHG-0614.md) | Decision | `accepted` | `documented` | `not_applicable` |
| [HL-CHG-0615 — Domena harborlight.pl dla PROD](changes/HL-CHG-0615.md) | Ops | `accepted` | `verified` | `not_applied` |
| [HL-CHG-0616 — Bezpłatne pobranie ze sklepu nie jest samo w sobie wynagrodzeniem Google](changes/HL-CHG-0616.md) | Decision | `answered_or_documented` | `documentation_available` | `not_applicable` |
| [HL-CHG-0617 — Naprawa przepełnienia poziomego panelu wykrytego przez Chromium CI](changes/HL-CHG-0617.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0618 — Ostrzeżenia Node 20 odróżnione od właściwej przyczyny awarii CI](changes/HL-CHG-0618.md) | Ops | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0619 — Deterministyczny publiczny pakiet i potwierdzenie wydania v2](changes/HL-CHG-0619.md) | Story | `accepted` | `verified` | `live_confirmed` |
| [HL-CHG-0620 — Aktywacja API kont i rynku wymaga osobnego potwierdzenia konfiguracji](changes/HL-CHG-0620.md) | Ops | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0621 — Pomiar przepustowości i polityka skali dla kolejnych 100 graczy jednocześnie](changes/HL-CHG-0621.md) | Ops | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0622 — Cloud Run: minimum 0, maksimum 2 instancje i współbieżność 20](changes/HL-CHG-0622.md) | Ops | `accepted` | `verified` | `code_deployed_v22_1` |

<a id="hl-epic-ops"></a>

### HL-EPIC-OPS — Dokumentacja i operacje

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0701 — Roboczy Regulamin gry z danymi operatora Lorem ipsum](changes/HL-CHG-0701.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0702 — Robocza Polityka prywatności z danymi Lorem ipsum](changes/HL-CHG-0702.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0703 — Nowa wersja Excela HARBORLIGHT 11 z zasadami i scenariuszami](changes/HL-CHG-0703.md) | Story | `answered_or_documented` | `documentation_available` | `not_applicable` |
| [HL-CHG-0704 — Scenariusze testów w Excelu, Markdown, JSON i CSV](changes/HL-CHG-0704.md) | Story | `answered_or_documented` | `documentation_available` | `not_applicable` |
| [HL-CHG-0705 — Poradnik zakupu muzyki i licencji web/Android/iOS](changes/HL-CHG-0705.md) | Story | `answered_or_documented` | `documentation_available` | `not_applicable` |
| [HL-CHG-0706 — Analiza możliwości dofinansowania JDG](changes/HL-CHG-0706.md) | Story | `answered_or_documented` | `documentation_available` | `not_applicable` |
| [HL-CHG-0707 — Logo na koszulki do zamówienia](changes/HL-CHG-0707.md) | Story | `needs_evidence` | `not_verified` | `not_applicable` |
| [HL-CHG-0708 — Każda zmiana ma osobny wpis Git ze statusem i dowodami](changes/HL-CHG-0708.md) | Story | `accepted` | `verified_documentation` | `not_applicable` |
| [HL-CHG-0709 — Osobne zdarzenia do ręcznego przeklikania scenariuszy testowych](changes/HL-CHG-0709.md) | Story | `accepted` | `verified_documentation` | `not_applicable` |
| [HL-CHG-0710 — Uzupełnienie prawdziwych danych operatora przed uruchomieniem sprzedaży](changes/HL-CHG-0710.md) | Ops | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0711 — Przegląd prawny Regulaminu i Polityki prywatności](changes/HL-CHG-0711.md) | Ops | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0712 — Porównanie prowizji operatorów i przykładów płatności 1–500 zł](changes/HL-CHG-0712.md) | Story | `answered_or_documented` | `documentation_available` | `not_applicable` |

<a id="hl-epic-arc"></a>

### HL-EPIC-ARC — Archipelag i handel v23

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0801 — Druga wyspa dostępna od Ratusza 10](changes/HL-CHG-0801.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0802 — Odmienna paleta drugiej wyspy i jednorazowe skopiowanie TH oraz Magazynu](changes/HL-CHG-0802.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0803 — Dwa światy i aktywna wyspa w jednym trwałym zapisie chmurowym](changes/HL-CHG-0803.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0804 — Własny statek 1000 sztuk i 10 minut bez opłaty za rejs](changes/HL-CHG-0804.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0805 — Pełny cel nie usuwa ładunku; bonus zachowuje pochodzenie](changes/HL-CHG-0805.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0806 — Zwiększanie pojemności towarowej za prawdziwe pieniądze jako symulacja Paynow](changes/HL-CHG-0806.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0807 — Druga wyspa nie dubluje nagród raz na konto i ochrony powitalnej](changes/HL-CHG-0807.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0808 — Restart jednej wyspy blokowany przy drugim świecie, rejsie lub nierozliczonym handlu](changes/HL-CHG-0808.md) | Bug | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0809 — Migracja pojedynczego świata do zapisu archipelagu zachowuje historię](changes/HL-CHG-0809.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0810 — Nazwa wyspy córki ma wymuszony przedrostek nazwy matki](changes/HL-CHG-0810.md) | Story | `accepted` | `analysis_only` | `not_deployed` |
| [HL-CHG-0811 — Zasada nazw po późniejszej zmianie nazwy matki](changes/HL-CHG-0811.md) | Decision | `accepted` | `analysis_only` | `not_deployed` |
| [HL-CHG-0812 — Założenie nowej wyspy odbiera sześć osób z domu matki](changes/HL-CHG-0812.md) | Story | `accepted` | `analysis_only` | `not_deployed` |
| [HL-CHG-0813 — Matka ma ochronę minimum 12 mieszkańców także przed dżumą i odejściami](changes/HL-CHG-0813.md) | Story | `accepted` | `analysis_only` | `not_deployed` |
| [HL-CHG-0814 — Statek pasażerski mieści do 100 osób](changes/HL-CHG-0814.md) | Story | `accepted_parameters_with_open_details` | `analysis_only` | `not_deployed` |
| [HL-CHG-0815 — Przewóz ludzi trwa 30 minut](changes/HL-CHG-0815.md) | Story | `accepted_parameters_with_open_details` | `analysis_only` | `not_deployed` |
| [HL-CHG-0816 — Rejs jest albo pasażerski, albo towarowy](changes/HL-CHG-0816.md) | Story | `accepted_parameters_with_open_details` | `analysis_only` | `not_deployed` |
| [HL-CHG-0817 — Przewóz osób musi określić pojemność celu, jedzenie i zachowanie tożsamości](changes/HL-CHG-0817.md) | Decision | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0818 — Kolejne wyspy od Ratusza matki 10, 13, 16, 19 i dalej co trzy poziomy](changes/HL-CHG-0818.md) | Story | `accepted` | `analysis_only` | `not_deployed` |
| [HL-CHG-0819 — Koszt wyspy jako suma kosztów Ratusza i Domu do poziomu 7, 8, 9…](changes/HL-CHG-0819.md) | Decision | `accepted` | `analysis_only` | `not_deployed` |
| [HL-CHG-0820 — Dostęp do zakupu wyspy tylko w Ratuszu i powiadomieniu po odblokowaniu](changes/HL-CHG-0820.md) | Story | `accepted_parameters_with_open_details` | `analysis_only` | `not_deployed` |
| [HL-CHG-0821 — Rozszerzenie obecnego limitu dwóch wysp na wiele córek](changes/HL-CHG-0821.md) | Decision | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0822 — Powrót NPC obok handlu między graczami](changes/HL-CHG-0822.md) | Decision | `accepted_parameters_with_open_details` | `analysis_only` | `not_deployed` |
| [HL-CHG-0823 — Maksymalną cenę oferty wyznacza gra, gracz może zejść niżej](changes/HL-CHG-0823.md) | Story | `accepted` | `analysis_only` | `not_deployed` |
| [HL-CHG-0824 — Materiały między graczami są sprzedawane za monety](changes/HL-CHG-0824.md) | Decision | `accepted` | `analysis_only` | `not_deployed` |
| [HL-CHG-0825 — Startowe budynki i skopiowane poziomy po wprowadzeniu płatnych kolonii](changes/HL-CHG-0825.md) | Decision | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0826 — Limit archipelagu: 20 wysp łącznie na konto](changes/HL-CHG-0826.md) | Story | `accepted` | `analysis_only` | `not_deployed` |
| [HL-CHG-0827 — Kolonizacja teleportuje sześć osób bezpośrednio z Domu matki](changes/HL-CHG-0827.md) | Story | `accepted` | `analysis_only` | `not_deployed` |

<a id="hl-epic-soc"></a>

### HL-EPIC-SOC — Liga, dobroczynność i planszówka

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0901 — Miesięczna liga w trzecim tygodniu i przewaga sojuszu nad solo](changes/HL-CHG-0901.md) | Story | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0902 — Na cele dobroczynne tylko monety zarobione w grze](changes/HL-CHG-0902.md) | Story | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0903 — Serwerowa księga pochodzenia i jednokrotnego zużycia monet charytatywnych](changes/HL-CHG-0903.md) | Story | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0904 — Przelicznik 1000 monet na 1 zł właściciela z ograniczonym budżetem](changes/HL-CHG-0904.md) | Decision | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0905 — Limity darowizn i kontrolowane skutki bonusu szczęścia](changes/HL-CHG-0905.md) | Decision | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0906 — Planszowa sesja 2–6 osób 45–60 minut z lekkim RPG](changes/HL-CHG-0906.md) | Story | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0907 — Plansza budynków, Latarnia w środku i dwa rodzaje kart](changes/HL-CHG-0907.md) | Story | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0908 — Fizyczne zadania z efektami online, QR lub telefon jako companion](changes/HL-CHG-0908.md) | Decision | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0909 — Społeczność wokół współpracy i rywalizacji](changes/HL-CHG-0909.md) | Story | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0910 — Proponowana polityka kolejnych podbić czterech segmentów wersji](changes/HL-CHG-0910.md) | Decision | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0911 — Historyczna odłożona planszówka/AR dla 2–4 osób](changes/HL-CHG-0911.md) | Decision | `superseded` | `not_applicable` | `not_applicable` |
| [HL-CHG-0912 — Warstwa AR planszówki pozostawiona na później](changes/HL-CHG-0912.md) | Decision | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0913 — Pierwsza publikacja gry w Google Play otrzyma wersję 1.0.0.0](changes/HL-CHG-0913.md) | Decision | `accepted` | `documented` | `not_applicable` |

## Utrzymanie

Nowe ID dodajemy bez zmieniania dotychczasowych numerów; luki między obszarami są celowe. Nowa decyzja otrzymuje odrębny rekord i relację, zamiast nadpisania starej. Dowód CI/promocji musi odnosić się do właściwego pełnego SHA. Ręczny wynik zmieniamy dopiero po wykonaniu przypadku i zapisaniu dowodu.

Osobne ręczne przypadki i ich powiązania prowadzi [plan ręcznych testów](../testing/MANUAL-TEST-PLAN.md). Założenie nazwy testu, istnienie pliku lub wynik automatyczny nie oznacza ręcznego PASS.

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
