# HL-CHG-0038 — Naturalna i kompletna polszczyzna całej gry, także komunikatów dynamicznych

**Typ:** Story · **Obszar:** Polski język całej gry · **Epik:** `HL-EPIC-UI`

Ta karta jest wersjonowanym wpisem w Git. **Nie została opublikowana jako natywne GitHub Issue** (`issue_url: null`).

## Status

| Warstwa | Stan |
|---|---|
| Implementacja | `implemented` |
| DEV | `verified_own_ci_and_pages` |
| CI | `passed_source_353faad` |
| PRE-PROD | `deployed_source_353faad` |
| PROD | `not_deployed` |
| Decyzja | `accepted` |

Status kodu nie jest potwierdzeniem aktywacji usług, wykonania operacji chmurowej ani ręcznego testu.

## Zakres i odbiór

- Przegląd PL obejmuje całą grę: wejście/logowanie, HUD, mapę, budynki, gospodarkę, mieszkańców, zdarzenia, zadania, minigry, monetyzację DEV, archipelag/handel, Pomoc/Ustawienia i społeczność.
- Teksty stałe i dynamiczne, w tym odmowy, potwierdzenia i powiadomienia, są naturalne, poprawnie odmienione i zgodne z nazwami faktycznych elementów.
- Opisy mówią prostym językiem, co gracz może zrobić i po co. Przegląd nie ogranicza się do usunięcia angielskich zdań: obejmuje ponowną redakcję 12 krótkich opisów celu, 12 pełnych opisów budynków oraz głównych instrukcji mieszkańców, magazynu, produkcji, szczęścia, żywienia i ochrony powitalnej.
- Wybór PL nie pozostawia angielskiego zdania lub technicznego klucza w miejscu komunikatu gracza; treści użytkowników i nazwy własne nie podlegają automatycznemu tłumaczeniu.
- Zmiana tekstu nie zmienia zasad gospodarki, czasów, nagród, limitów, historii ani kontroli dostępu.
- Ręczny przegląd całej gry i 25 lekcji pozostaje osobnym NOT RUN do wykonania przez człowieka.

## Źródło

Uwaga dotycząca tłumaczeń polskich dotyczy nie tylko samouczka — wszystko trzeba przejrzeć.

Odniesienie: `chat:rozszerzenie-human-polski-na-cala-gre`.

Data pierwotnej wiadomości: 2026-10-31. Późniejsza adnotacja rozszerza wcześniej zatwierdzony przegląd tekstów samouczka na cały interfejs.

## Dowody

- **Dokumenty:** [docs/FRONTEND-V25-REQUIREMENTS.md](../../FRONTEND-V25-REQUIREMENTS.md), [docs/testing/manual/HL-TC-0053.md](../../testing/manual/HL-TC-0053.md), [docs/POLISH-REVIEW-v25.md](../../POLISH-REVIEW-v25.md)
- **Kod:** [harborlight-v1-i18n.js](../../../harborlight-v1-i18n.js), [harborlight-v1-copy.js](../../../harborlight-v1-copy.js), [harborlight-v1-play.js](../../../harborlight-v1-play.js), [harborlight-auth.js](../../../harborlight-auth.js), [harborlight-v1-community-ui.js](../../../harborlight-v1-community-ui.js), [harborlight-v1-charity.js](../../../harborlight-v1-charity.js)
- **Scenariusze automatyczne:** [tests/harborlight-polish-copy-v25.test.mjs](../../../tests/harborlight-polish-copy-v25.test.mjs), [tests/harborlight-polish-panels-smoke.py](../../../tests/harborlight-polish-panels-smoke.py), [tests/harborlight-world-events-v18.test.mjs](../../../tests/harborlight-world-events-v18.test.mjs), [tests/harborlight-effects-v8.test.mjs](../../../tests/harborlight-effects-v8.test.mjs)
- **Kod dowodowy:** `353faad347262dce7c3632fdf7c71be124384ab1`.
- **CI tego wydania:** https://github.com/ksobczak321-oss/gra/actions/runs/41246449612.
- **Promocja kodu:** https://github.com/ksobczak321-oss/gra/actions/runs/41246771480.
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

Powiązane przypadki do ręcznego przeklikania:

- [HL-TC-0053 — Polska wersja całej gry: panele, błędy, akcje i powiadomienia](../../testing/manual/HL-TC-0053.md) — `NOT RUN`.

Przejrzano całą grę: interfejs, budynki, modele rozgrywki, logowanie i chmurę, oprowadzanie, społeczność, ligę oraz Pomagam. Kierunkowy zestaw i18n/tekstów ma 25 PASS; skan 313 pełnych zdań z 9 modeli nie wykrył reszt w swoim zakresie. Końcowy rzeczywisty odczyt 112 widoków (56 komputer + 56 telefon), wraz z treścią i ARIA: PASS, 0 wykrytych angielskich elementów, execution_error:null. Nie zmieniono monet ani własnych nazw. Historia zapisanych powiadomień i treści użytkowników nie została przepisana; ręczny przegląd całej gry nadal NOT RUN.

Historyczny podgląd b1cd650da1c9d669ebce4a77bee81ebfd87ccbc9 miał lokalnie 897 Node, 141 Python i 18 zestawów Chromium PASS. Pages 41244467250 zakończyło się SUCCESS (41 s), natomiast własne CI 41244467302 zakończyło się FAIL: historyczna podpowiedź z trzema przyciskami miała niepoprawną geometrię. Te dowody nie potwierdzają późniejszej poprawki układu ani dalszej redakcji polskich opisów. Nowy lokalny odbiór po późniejszych poprawkach opisano poniżej; nowe źródło, CI i promocja oczekują na potwierdzenie. Nie wykonano resetu kont ani promocji PROD.

Późniejsze GO użytkownika upoważnia do PRE-PROD po zielonym CI dokładnego nowego SHA i odbiorze wdrożenia, z zachowaniem kont i historii. Samo upoważnienie nie jest dowodem publikacji.

Po doprecyzowaniu użytkownika wykonano dalszą redakcję stylu: 12 krótkich opisów i 12 pełnych opisów budynków oraz główne instrukcje opisują działanie i jego cel wprost. Zachowano liczby, warunki, źródła EN i etykiety przycisków. Kierunkowe testy po tej redakcji: 25/25 PASS; ponowny pełny odbiór nowego pakietu zakończył się sukcesem lokalnym, jak opisano poniżej.

Końcowy lokalny odbiór NOWEGO pakietu po dalszej przyjaznej redakcji i poprawce geometrii: 898 testów Node PASS / 0 FAIL, 141 testów Python w 11 zestawach PASS i 18 zestawów Chromium PASS. Ponowny odczyt 112 widoków (56 komputer + 56 telefon) ma 0 wykrytych angielskich elementów i execution_error:null. Historyczny kurs v18 przeszedł 4 warianty, w tym rzeczywistą geometrię 360×640 odpowiadającą usterce z CI. Cache frontend-v25-2; źródło końcowego commitu, własne CI i publikacja pozostają odrębnie pending. Stary FAIL b1cd650 ani starsze receipt nie są zastępowane tym lokalnym wynikiem. Ręczne przypadki nadal NOT RUN; kont nie resetowano.

Końcowe źródło aplikacji 353faad347262dce7c3632fdf7c71be124384ab1 zostało wysłane do main. Własne CI 41246449612 zakończyło się SUCCESS (3 min 54 s), a Pages 41246449682 — SUCCESS (31 s) dla tego samego źródła. DEV jest odebrany; promocja PRE-PROD nadal oczekuje na osobne potwierdzenie. Znacznik [preprod:0.10.1.0] zleca bridge po zielonym CI tego samego źródła. Ostateczny pakiet ma 54 pliki z manifestem, 10 991 135 bajtów; 53 pliki treści są zgodne ze sprawdzonym pakietem. SHA-256 archiwum: 6c738006d57e115b3293a88460e9432ccb1fafb51e1eb9c08fdb116914e4c744; manifestu: 0010c121de03c64e157596d014d80eb04970e7f5d03e81350374b9ce1a6abd0d. To dowód przygotowania i synchronizacji kodu, nie wykonania wdrożenia ani resetu.

Potwierdzono osobno sukces CI i Pages końcowego źródła 353faad347262dce7c3632fdf7c71be124384ab1. Ten odbiór DEV nie jest potwierdzeniem konfiguracji API, wdrożenia GCP, autosave na prawdziwym koncie ani resetu. Wyniki ręczne pozostają NOT RUN.

PRE-PROD potwierdzone: google-cloud-dev.yml 41246771480, próba 1, SUCCESS (2 min 05 s), źródło 353faad347262dce7c3632fdf7c71be124384ab1. Bridge 41246756848 zakończył się SUCCESS (15 s). Gra: https://harborlight-dev.web.app. DEV tag dev-0.10.1.0-20261031 jest opublikowany. To dowód wdrożenia kodu tego samego źródła; nie oznacza ręcznego PASS przypadków, niezależnego odczytu ZIP receipt, odczytu flagi API ani potwierdzenia autosave po grze. Nie resetowano kont i nie promowano PROD. Wszystkie 53 ręczne scenariusze nadal NOT RUN.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-0034](HL-CHG-0034.md), [HL-CHG-0036](HL-CHG-0036.md), [HL-CHG-0037](HL-CHG-0037.md)

## Uwagi

- Wcześniejsze diagnostyczne ekrany wykryły mieszane zdania, liczbę z NBSP, nagłówek kolejki, rozwinięty opis tragarza/roster, wycenę, ARIA kwoty i tłumaczenie własnej nazwy opcji transportu. Poprawki sprawdzono ponownie na końcowym pakiecie; wcześniejszy sam odczyt ekranów nie był PASS języka.
- Błogosławieństwo opisano jako +20 p.p. przez godzinę, zgodnie z rzeczywistym efektem 20 p.p./3600 s, zamiast sugerować przyrost 20 p.p. na każdą godzinę. To korekta opisu, nie zmiana zasad.
- Ręczna ocena polszczyzny TC52/TC53 nadal NOT_RUN. Statyczny skan i 112 wybranych stanów nie są obietnicą poprawności każdej przyszłej treści.

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
