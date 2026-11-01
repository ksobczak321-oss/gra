# HARBORLIGHT — rejestr zmian

Stan ewidencji: **2026-11-02**. **297 osobnych kart**, pogrupowanych w 11 epików. Każda karta ma stabilny identyfikator i odrębne statusy implementacji, DEV, CI, PRE-PROD, PROD oraz decyzji.

Źródło danych: [changes.json](changes.json). Karty odtwarza `python3 scripts/build_change_register.py`; `--check` sprawdza zgodność bez zapisów. Nie edytuj wygenerowanych kart zamiast źródła JSON.

## Zakres i granice

Widoczna historia rozmowy, trzy pełne wklejki użytkownika i zatwierdzone zakresy v17–v22.1. Historyczne materiały v1–v16 są kontekstem, nie nowymi domyślnie otwieranymi zadaniami. Nowe GO z 31 października po pilnej poprawce obejmuje wcześniej uzgodnione nowe mechaniki wyłącznie DEV, oddzielne powroty w Pomocy i materiały planszówki do wydruku; integracja planszówki online jest jawnie wyłączona. GO z 1 listopada 2026 rozszerza DEV o pakiet0.10.2.0 / v26: czytelny Magazyn i Dom, osobne sekcje społeczności i oznaczone symulacje, ręczną redakcję opisów, nazwę3–40 znaków, wznawianie obu narzędzi nauki, ochronę od reklam, nowy kurs25 lekcji, turbo poziomów 1–2 i blokadę niedostępnych budynków. Ten zakres nie promuje PRE-PROD; ostatni potwierdzony PRE-PROD to0.10.1.0 / 353faad. Baselinev22.1 poniżej jest historycznym punktem ewidencji, nie najnowszym stanem chmury. GO z 1 listopada po akceptacji opisów rozszerza DEV do0.11.0.0/v27:34 kroki tutoriala, Pomoc pod?, informacja o skutkach, stabilne ETA, globalne dojście/powrót2 min, mieszkania niezależne od limitu Ratusza, dzienna pula tylko zakwaterowanych, praca bez mieszkania×0,5 i jedzenie×2 zamiast dawnej globalnej kary szczęścia oraz misje Latarni 8/5/3 z wykonalnymi wymaganiami. Parametry integracji misji są jawnie opisane. Nowe GO nie promuje chmury i nie resetuje kont.

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

**Tag `pilne`:** [HL-CHG-0031 — Wybór języka PL/EN przy pierwszym wprowadzeniu i nazwie wyspy](changes/HL-CHG-0031.md), [HL-CHG-0624 — Ścisła kontrola gotowości manifestu po publikacji Hostingu](changes/HL-CHG-0624.md).

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
| [HL-CHG-0031 — Wybór języka PL/EN przy pierwszym wprowadzeniu i nazwie wyspy](changes/HL-CHG-0031.md) | Story | `accepted` | `verified` | `code_deployed_0_9_1_2` |
| [HL-CHG-0032 — Pomoc: Wróć do tutoriala ponownie pokazuje objaśnienia gry](changes/HL-CHG-0032.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0034 — Nowe odmowy kolonizacji i rejsów są po polsku przy języku PL](changes/HL-CHG-0034.md) | Bug | `accepted_scope_bugfix` | `targeted_packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0038 — Naturalna i kompletna polszczyzna całej gry, także komunikatów dynamicznych](changes/HL-CHG-0038.md) | Story | `accepted` | `verified_own_ci_and_pages` | `deployed_source_353faad` |
| [HL-CHG-0935 — Magazyn pokazuje łączny zapas, a rozbicie i zasady pod ikoną informacji](changes/HL-CHG-0935.md) | Story | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0939 — Punkty otwierają Ranking; Sojusz i liga oraz Pomagam mają osobne wejścia](changes/HL-CHG-0939.md) | Bug | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0941 — Tutorial przyjmuje ręczną redakcję W1 i opisów mieszkańców, zasobów oraz budynków](changes/HL-CHG-0941.md) | Story | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0951 — Poprawiona wersja opisów ma archiwum źródeł i spójną redakcję PL/EN](changes/HL-CHG-0951.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |
| [HL-CHG-0952 — Znak zapytania otwiera dwa powroty, a podsumowanie wyspy nie dubluje Pomocy i Samouczka](changes/HL-CHG-0952.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |
| [HL-CHG-0953 — Tutorial ma 34 kroki, Czat przed dzwonkiem i rzeczywisty przykład zasobów](changes/HL-CHG-0953.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |

<a id="hl-epic-tut"></a>

### HL-EPIC-TUT — Samouczek i nagrody

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0033 — Pomoc: Wróć do samouczka wznawia praktyczne lekcje](changes/HL-CHG-0033.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0036 — Samouczek najpierw wskazuje budynek na mapie i czeka na kliknięcie gracza](changes/HL-CHG-0036.md) | Story | `accepted` | `verified_own_ci_and_pages` | `deployed_source_353faad` |
| [HL-CHG-0037 — Naturalny i poprawny polski w tytułach i instrukcjach 25 lekcji](changes/HL-CHG-0037.md) | Story | `accepted` | `verified_own_ci_and_pages` | `deployed_source_353faad` |
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
| [HL-CHG-0933 — Podpowiedź z trzema przyciskami zachowuje czytelny opis i mieści się na ekranie](changes/HL-CHG-0933.md) | Bug | `accepted` | `verified_own_ci_and_pages` | `deployed_source_353faad` |
| [HL-CHG-0943 — Tutorial i samouczek mają zamknięcie, wznowienie oraz powtórkę od początku](changes/HL-CHG-0943.md) | Story | `accepted_with_documented_order_assumption` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0946 — Kurs zaczyna się od 6 tragarzy i priorytetu Budowa; zadanie i minigra zastępują Ratusz 3](changes/HL-CHG-0946.md) | Story | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0954 — Zamknięcie tutoriala wyjaśnia powrót przez ? i zachowuje właściwy zegar](changes/HL-CHG-0954.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |
| [HL-CHG-0961 — Samouczek wskazuje strzałką faktycznie zmieniony poziom i szczęście](changes/HL-CHG-0961.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |
| [HL-CHG-0962 — Nagroda ma prosty opis bez dodatkowej skrzyni, a koniec kursu oddaje inicjatywę graczowi](changes/HL-CHG-0962.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |
| [HL-CHG-0963 — Osiem zadań na poziom prowadzi do kolejnej rzeczywistej rozbudowy Latarni](changes/HL-CHG-0963.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |
| [HL-CHG-0964 — Niepowodzenia otwierają pięć pomocniczych i trzy ratunkowe z prawidłowym powrotem](changes/HL-CHG-0964.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |

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
| [HL-CHG-0113 — Wymiany materiałów między graczami z własnym przelicznikiem](changes/HL-CHG-0113.md) | Story | `superseded` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0114 — Serwerowa rezerwacja i atomowe przyjęcie jednej oferty](changes/HL-CHG-0114.md) | Bug | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0115 — Zwroty anulowanych i wygasłych ofert nie znikają przy pełnym magazynie](changes/HL-CHG-0115.md) | Bug | `accepted` | `verified_with_isolated_services` | `activation_unconfirmed` |
| [HL-CHG-0116 — Ścieżki jako rzeczywisty wydatek kamienia i premia przewozu](changes/HL-CHG-0116.md) | Story | `accepted` | `verified` | `code_deployed_v22_1` |
| [HL-CHG-0947 — Transport i budowa pierwszych dwóch poziomów przyspieszają bez zmiany poziomów 3+](changes/HL-CHG-0947.md) | Story | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0948 — Każda ścieżka rozbudowy respektuje dostępność budynku na danym poziomie](changes/HL-CHG-0948.md) | Bug | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0955 — Każdy pracownik idzie z Domu do pracy i wraca po 2 minuty](changes/HL-CHG-0955.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |
| [HL-CHG-0958 — Osoba bez miejsca w Domu je dwa razy więcej i pracuje z połową wydajności](changes/HL-CHG-0958.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |
| [HL-CHG-0960 — Chmurka budowy nie przełącza poprawnego ETA na Niedostępne co kilka sekund](changes/HL-CHG-0960.md) | Bug | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |
| [HL-CHG-0965 — Każde nowe zadanie ma osiągalny koszt, ilość i termin w realnej gospodarce](changes/HL-CHG-0965.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |

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
| [HL-CHG-0214 — Wycofany tragarz kończy niesiony ładunek i wraca pełne pięć minut](changes/HL-CHG-0214.md) | Bug | `superseded` | `verified` | `code_deployed_v22_1` |
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
| [HL-CHG-0936 — Dom otwiera wszystkie przydziały dopiero przez Zarządzaj pracownikami](changes/HL-CHG-0936.md) | Story | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0937 — Pozostałe punkty szczęścia są wydawalne, a niedozwolone przekazanie zablokowane](changes/HL-CHG-0937.md) | Decision | `implementation_assumption_open_for_correction` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0949 — Pięciu producentów opisuje smutną buźkę przy pełnym lokalnym magazynie](changes/HL-CHG-0949.md) | Story | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0956 — Ratusz wyznacza limit ludności niezależnie od liczby łóżek](changes/HL-CHG-0956.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |
| [HL-CHG-0957 — Pula szczęścia Domu i odbiorcy obejmują tylko zakwaterowanych mieszkańców](changes/HL-CHG-0957.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |
| [HL-CHG-0959 — Nowe konsekwencje braku miejsca zastępują dotychczasową globalną karę szczęścia](changes/HL-CHG-0959.md) | Decision | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |

<a id="hl-epic-min"></a>

### HL-EPIC-MIN — Ekspedycje i nagradzane reklamy

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0039 — Kupno czasu potwierdza dodane sekundy zamiast nadpisywać sukces opisem wyceny](changes/HL-CHG-0039.md) | Bug | `accepted` | `verified_own_ci_and_pages` | `deployed_source_353faad` |
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
| [HL-CHG-0938 — Okno reklamy oddziela przyciski i objaśnia nagrodę przed wyborem](changes/HL-CHG-0938.md) | Story | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0944 — Automatyczne reklamy czekają na koniec nauki i 60 aktywnych minut po jej przerwaniu](changes/HL-CHG-0944.md) | Story | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |

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
| [HL-CHG-0942 — Większe pole nazwy przyjmuje 3–40 znaków i odrzuca wulgaryzmy PL/EN](changes/HL-CHG-0942.md) | Story | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0966 — Nowe reguły zachowują starsze wyspy, aktywne zadania i jednokrotne rozliczenie](changes/HL-CHG-0966.md) | Story | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |

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
| [HL-CHG-0945 — Chmurka czatu przed dzwonkiem prowadzi do rozmów sojuszu i 1:1](changes/HL-CHG-0945.md) | Story | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |

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
| [HL-CHG-0623 — Automatyczna promocja wyłącznie autoryzowanej pilnej wersji 0.9.1.2 po CI](changes/HL-CHG-0623.md) | Ops | `accepted` | `verified` | `dispatch_and_deploy_success` |
| [HL-CHG-0624 — Ścisła kontrola gotowości manifestu po publikacji Hostingu](changes/HL-CHG-0624.md) | Ops | `accepted` | `verified` | `code_deployed_0_9_1_2` |
| [HL-CHG-0934 — Jawna promocja 0.10.1.0 po zielonym CI, bez resetu kont](changes/HL-CHG-0934.md) | Ops | `accepted` | `verified_own_ci_and_pages` | `deployed_source_353faad` |
| [HL-CHG-0968 — Kontroler kont obsługuje rzeczywiste koperty1/2 i uwodniony archipelag bez zmiany danych](changes/HL-CHG-0968.md) | Bug | `accepted` | `verified_locally` | `awaiting_checker_fix_candidate` |

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
| [HL-CHG-0713 — Tag pilne w rejestrze oraz oznaczanie pilnych wydań Git](changes/HL-CHG-0713.md) | Story | `accepted` | `verified` | `not_applicable` |
| [HL-CHG-0714 — Osobna lista ręcznego odbioru z wynikami, notatkami i eksportem](changes/HL-CHG-0714.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0715 — Dokumenty draft3 opisują archipelag i społeczność oraz wymagają aktualnych potwierdzeń](changes/HL-CHG-0715.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0950 — Zakres v26 ma nowe karty i testy, bez promocji GCP i resetu historii](changes/HL-CHG-0950.md) | Ops | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |
| [HL-CHG-0967 — Zakres v27 ma osobne źródła, karty, ręczne scenariusze i autoryzowaną promocję PRE-PROD](changes/HL-CHG-0967.md) | Ops | `accepted` | `verified_own_ci_and_pages` | `awaiting_checker_fix_candidate` |

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
| [HL-CHG-0810 — Nazwa wyspy córki ma wymuszony przedrostek nazwy matki](changes/HL-CHG-0810.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0811 — Zasada nazw po późniejszej zmianie nazwy matki](changes/HL-CHG-0811.md) | Decision | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0812 — Założenie nowej wyspy odbiera sześć osób z domu matki](changes/HL-CHG-0812.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0813 — Matka ma ochronę minimum 12 mieszkańców także przed dżumą i odejściami](changes/HL-CHG-0813.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0814 — Statek pasażerski mieści do 100 osób](changes/HL-CHG-0814.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0815 — Przewóz ludzi trwa 30 minut](changes/HL-CHG-0815.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0816 — Rejs jest albo pasażerski, albo towarowy](changes/HL-CHG-0816.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0817 — Przewóz osób musi określić pojemność celu, jedzenie i zachowanie tożsamości](changes/HL-CHG-0817.md) | Decision | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0818 — Kolejne wyspy od Ratusza matki 10, 13, 16, 19 i dalej co trzy poziomy](changes/HL-CHG-0818.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0819 — Koszt wyspy jako suma kosztów Ratusza i Domu do poziomu 7, 8, 9…](changes/HL-CHG-0819.md) | Decision | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0820 — Dostęp do zakupu wyspy tylko w Ratuszu i powiadomieniu po odblokowaniu](changes/HL-CHG-0820.md) | Story | `accepted_parameters_with_open_details` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0821 — Rozszerzenie obecnego limitu dwóch wysp na wiele córek](changes/HL-CHG-0821.md) | Decision | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0822 — Powrót NPC obok handlu między graczami](changes/HL-CHG-0822.md) | Decision | `accepted_parameters_with_open_details` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0823 — Maksymalną cenę oferty wyznacza gra, gracz może zejść niżej](changes/HL-CHG-0823.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0824 — Materiały między graczami są sprzedawane za monety](changes/HL-CHG-0824.md) | Decision | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0825 — Startowe budynki i skopiowane poziomy po wprowadzeniu płatnych kolonii](changes/HL-CHG-0825.md) | Decision | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0826 — Limit archipelagu: 20 wysp łącznie na konto](changes/HL-CHG-0826.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0827 — Kolonizacja teleportuje sześć osób bezpośrednio z Domu matki](changes/HL-CHG-0827.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |

<a id="hl-epic-soc"></a>

### HL-EPIC-SOC — Liga, dobroczynność i planszówka

| Zmiana | Typ | Decyzja | DEV | PRE-PROD |
|---|---|---|---|---|
| [HL-CHG-0901 — Miesięczna liga w trzecim tygodniu i przewaga sojuszu nad solo](changes/HL-CHG-0901.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0902 — Na cele dobroczynne tylko monety zarobione w grze](changes/HL-CHG-0902.md) | Story | `accepted` | `packaged_browser_pass_real_program_disabled` | `not_deployed` |
| [HL-CHG-0903 — Serwerowa księga pochodzenia i jednokrotnego zużycia monet charytatywnych](changes/HL-CHG-0903.md) | Story | `accepted` | `packaged_browser_pass_real_program_disabled` | `not_deployed` |
| [HL-CHG-0904 — Przelicznik 1000 monet na 1 zł właściciela z ograniczonym budżetem](changes/HL-CHG-0904.md) | Decision | `accepted` | `packaged_browser_pass_real_program_disabled` | `not_deployed` |
| [HL-CHG-0905 — Limity darowizn i kontrolowane skutki bonusu szczęścia](changes/HL-CHG-0905.md) | Decision | `accepted_parameters_with_open_details` | `packaged_browser_pass_real_program_disabled` | `not_deployed` |
| [HL-CHG-0906 — Planszowa sesja 2–6 osób 45–60 minut z lekkim RPG](changes/HL-CHG-0906.md) | Story | `accepted` | `print_artifacts_and_phone_verified` | `not_applicable_print_artifact` |
| [HL-CHG-0907 — Plansza budynków, Latarnia w środku i dwa rodzaje kart](changes/HL-CHG-0907.md) | Story | `superseded` | `analysis_only` | `not_deployed` |
| [HL-CHG-0908 — Fizyczne zadania z efektami online, QR lub telefon jako companion](changes/HL-CHG-0908.md) | Decision | `deferred_by_user` | `deferred` | `not_deployed` |
| [HL-CHG-0909 — Społeczność wokół współpracy i rywalizacji](changes/HL-CHG-0909.md) | Story | `accepted_parameters_with_open_details` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0910 — Proponowana polityka kolejnych podbić czterech segmentów wersji](changes/HL-CHG-0910.md) | Decision | `open` | `analysis_only` | `not_deployed` |
| [HL-CHG-0911 — Historyczna odłożona planszówka/AR dla 2–4 osób](changes/HL-CHG-0911.md) | Decision | `superseded` | `not_applicable` | `not_applicable` |
| [HL-CHG-0912 — Warstwa AR planszówki pozostawiona na później](changes/HL-CHG-0912.md) | Decision | `deferred` | `not_applicable` | `not_active` |
| [HL-CHG-0913 — Pierwsza publikacja gry w Google Play otrzyma wersję 1.0.0.0](changes/HL-CHG-0913.md) | Decision | `accepted` | `documented` | `not_applicable` |
| [HL-CHG-0914 — Punktacja ligi: średnia wyników i premia rosnąca ze współpracą](changes/HL-CHG-0914.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0915 — Zakładanie sojuszu, dołączanie i swobodne odchodzenie](changes/HL-CHG-0915.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0916 — Czat gry i uprawnienia członków sojuszu](changes/HL-CHG-0916.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0917 — Pole Sojusz obok Rankingu](changes/HL-CHG-0917.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0918 — Proponowane zadania ligowe, mierzalna punktacja i nagrody](changes/HL-CHG-0918.md) | Story | `accepted_scope_with_dev_parameters` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0919 — Widoczny przycisk udziału w dobroczynności](changes/HL-CHG-0919.md) | Story | `accepted` | `packaged_browser_pass_real_program_disabled` | `not_deployed` |
| [HL-CHG-0920 — Dobroczynność daje rozświetlenie portu i rzeczywiste szczęście](changes/HL-CHG-0920.md) | Story | `accepted` | `packaged_browser_pass_real_program_disabled` | `not_deployed` |
| [HL-CHG-0921 — Planszówka: jedna talia fizyczna i treści na telefonie](changes/HL-CHG-0921.md) | Story | `accepted` | `print_artifacts_and_phone_verified` | `not_applicable_print_artifact` |
| [HL-CHG-0922 — Własne pionki i ruch graczy po planszy](changes/HL-CHG-0922.md) | Story | `accepted` | `print_artifacts_and_phone_verified` | `not_applicable_print_artifact` |
| [HL-CHG-0923 — Trzy warstwy planszówki: ruch, kreatywne zadania i skutki online](changes/HL-CHG-0923.md) | Story | `accepted_scope_limited_by_user` | `standalone_prototype_online_excluded` | `not_deployed` |
| [HL-CHG-0924 — Zaliczone zadania przy stole przynoszą punkty i korzyści online](changes/HL-CHG-0924.md) | Story | `deferred_by_user` | `deferred` | `not_deployed` |
| [HL-CHG-0925 — Przycisk Gra fizyczna uruchamia sesję przy stole](changes/HL-CHG-0925.md) | Story | `deferred_by_user` | `deferred` | `not_deployed` |
| [HL-CHG-0926 — Liga ma jawny harmonogram i sloty czasowe zadań](changes/HL-CHG-0926.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0927 — Każdy dzień ligi ma zadanie podstawowe i zręcznościowe](changes/HL-CHG-0927.md) | Story | `accepted_scope_with_dev_parameters` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0928 — Planszówka: nieme pokazywanie przedmiotów i słowa czytane wspak](changes/HL-CHG-0928.md) | Story | `accepted` | `print_artifacts_and_phone_verified` | `not_applicable_print_artifact` |
| [HL-CHG-0929 — Projekt planszy, kart i pionków do wydruku](changes/HL-CHG-0929.md) | Story | `accepted` | `print_artifacts_and_phone_verified` | `not_applicable_print_artifact` |
| [HL-CHG-0930 — Pudełko, opakowanie, instrukcja i kody QR planszówki](changes/HL-CHG-0930.md) | Story | `accepted` | `print_artifacts_and_phone_verified` | `not_applicable_print_artifact` |
| [HL-CHG-0931 — Osobny czat sojuszu i prywatne rozmowy jeden na jeden](changes/HL-CHG-0931.md) | Story | `accepted` | `packaged_browser_pass` | `not_deployed` |
| [HL-CHG-0932 — Oba zadania ligi mają wspólne okno 19:00–21:00 Warszawy](changes/HL-CHG-0932.md) | Story | `accepted` | `verified_own_ci_and_pages` | `deployed_source_353faad` |
| [HL-CHG-0940 — DEV prezentuje ligę i Pomagam z fikcyjnymi beneficjentami, bez realnych przelewów](changes/HL-CHG-0940.md) | Story | `accepted` | `verified_own_ci_and_pages` | `not_deployed` |

## Utrzymanie

Nowe ID dodajemy bez zmieniania dotychczasowych numerów; luki między obszarami są celowe. Nowa decyzja otrzymuje odrębny rekord i relację, zamiast nadpisania starej. Dowód CI/promocji musi odnosić się do właściwego pełnego SHA. Ręczny wynik zmieniamy dopiero po wykonaniu przypadku i zapisaniu dowodu.

Osobne ręczne przypadki i ich powiązania prowadzi [plan ręcznych testów](../testing/MANUAL-TEST-PLAN.md). Założenie nazwy testu, istnienie pliku lub wynik automatyczny nie oznacza ręcznego PASS.

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
