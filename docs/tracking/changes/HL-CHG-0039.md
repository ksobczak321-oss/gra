# HL-CHG-0039 — Kupno czasu potwierdza dodane sekundy zamiast nadpisywać sukces opisem wyceny

**Typ:** Bug · **Obszar:** Ekspedycje i kupno czasu · **Epik:** `HL-EPIC-MIN`

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

- Po dozwolonym kupnie dodatkowego czasu gracz otrzymuje potwierdzenie faktycznie dodanych sekund i pobranych monet.
- Opis wyceny lub dostępności nie nadpisuje komunikatu ukończonej operacji.
- Koszt, liczba sekund, limity, stan rundy i rzeczywiste obciążenie salda pozostają bez zmian.
- Odmowy przy limicie, końcu rundy lub trwającej reklamie nadal odpowiadają rzeczywistemu stanowi.

## Źródło

Wynik poprawnego zakupu czasu zawierał opis wyceny, który nadpisywał komunikat sukcesu; saldo i sekundy były naliczane poprawnie.

Odniesienie: `chat:GO-globalny-przeglad-polski; test:runtime-expedition-extra-time-message`.

Data pierwotnej wiadomości: 2026-10-31. Rzeczywista niezgodność wykryta przez test akcji podczas zatwierdzonego przeglądu polskich komunikatów.

## Dowody

- **Dokumenty:** [docs/POLISH-REVIEW-v25.md](../../POLISH-REVIEW-v25.md)
- **Kod:** [harborlight-v1-activities.js](../../../harborlight-v1-activities.js), [harborlight-v1-i18n.js](../../../harborlight-v1-i18n.js)
- **Scenariusze automatyczne:** [tests/harborlight-polish-copy-v25.test.mjs](../../../tests/harborlight-polish-copy-v25.test.mjs), [tests/harborlight-v18-activities.test.mjs](../../../tests/harborlight-v18-activities.test.mjs)
- **Kod dowodowy:** `353faad347262dce7c3632fdf7c71be124384ab1`.
- **CI tego wydania:** https://github.com/ksobczak321-oss/gra/actions/runs/41246449612.
- **Promocja kodu:** https://github.com/ksobczak321-oss/gra/actions/runs/41246771480.
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

Powiązane przypadki do ręcznego przeklikania:

- [HL-TC-0016 — Nagrody rund, dobrowolny czas i ryzyko utraty puli](../../testing/manual/HL-TC-0016.md) — `NOT RUN`.
- [HL-TC-0053 — Polska wersja całej gry: panele, błędy, akcje i powiadomienia](../../testing/manual/HL-TC-0053.md) — `NOT RUN`.

Poprawiono kolejność składania wyniku kupna czasu: komunikat potwierdza faktycznie dodane sekundy i pobrane monety, zamiast opisu wyceny. Jednowierszowa poprawka nie zmienia kosztu, czasu, limitów ani rzeczywistego obciążenia. Testy akcji i języka oraz pełne regresje przeszły; ręczne TC16 i TC53 nadal NOT RUN.

Historyczny podgląd b1cd650da1c9d669ebce4a77bee81ebfd87ccbc9 miał lokalnie 897 Node, 141 Python i 18 zestawów Chromium PASS. Pages 41244467250 zakończyło się SUCCESS (41 s), natomiast własne CI 41244467302 zakończyło się FAIL: historyczna podpowiedź z trzema przyciskami miała niepoprawną geometrię. Te dowody nie potwierdzają późniejszej poprawki układu ani dalszej redakcji polskich opisów. Nowy lokalny odbiór po późniejszych poprawkach opisano poniżej; nowe źródło, CI i promocja oczekują na potwierdzenie. Nie wykonano resetu kont ani promocji PROD.

Późniejsze GO użytkownika upoważnia do PRE-PROD po zielonym CI dokładnego nowego SHA i odbiorze wdrożenia, z zachowaniem kont i historii. Samo upoważnienie nie jest dowodem publikacji.

Końcowy lokalny odbiór NOWEGO pakietu po dalszej przyjaznej redakcji i poprawce geometrii: 898 testów Node PASS / 0 FAIL, 141 testów Python w 11 zestawach PASS i 18 zestawów Chromium PASS. Ponowny odczyt 112 widoków (56 komputer + 56 telefon) ma 0 wykrytych angielskich elementów i execution_error:null. Historyczny kurs v18 przeszedł 4 warianty, w tym rzeczywistą geometrię 360×640 odpowiadającą usterce z CI. Cache frontend-v25-2; źródło końcowego commitu, własne CI i publikacja pozostają odrębnie pending. Stary FAIL b1cd650 ani starsze receipt nie są zastępowane tym lokalnym wynikiem. Ręczne przypadki nadal NOT RUN; kont nie resetowano.

Końcowe źródło aplikacji 353faad347262dce7c3632fdf7c71be124384ab1 zostało wysłane do main. Własne CI 41246449612 zakończyło się SUCCESS (3 min 54 s), a Pages 41246449682 — SUCCESS (31 s) dla tego samego źródła. DEV jest odebrany; promocja PRE-PROD nadal oczekuje na osobne potwierdzenie. Znacznik [preprod:0.10.1.0] zleca bridge po zielonym CI tego samego źródła. Ostateczny pakiet ma 54 pliki z manifestem, 10 991 135 bajtów; 53 pliki treści są zgodne ze sprawdzonym pakietem. SHA-256 archiwum: 6c738006d57e115b3293a88460e9432ccb1fafb51e1eb9c08fdb116914e4c744; manifestu: 0010c121de03c64e157596d014d80eb04970e7f5d03e81350374b9ce1a6abd0d. To dowód przygotowania i synchronizacji kodu, nie wykonania wdrożenia ani resetu.

Potwierdzono osobno sukces CI i Pages końcowego źródła 353faad347262dce7c3632fdf7c71be124384ab1. Ten odbiór DEV nie jest potwierdzeniem konfiguracji API, wdrożenia GCP, autosave na prawdziwym koncie ani resetu. Wyniki ręczne pozostają NOT RUN.

PRE-PROD potwierdzone: google-cloud-dev.yml 41246771480, próba 1, SUCCESS (2 min 05 s), źródło 353faad347262dce7c3632fdf7c71be124384ab1. Bridge 41246756848 zakończył się SUCCESS (15 s). Gra: https://harborlight-dev.web.app. DEV tag dev-0.10.1.0-20261031 jest opublikowany. To dowód wdrożenia kodu tego samego źródła; nie oznacza ręcznego PASS przypadków, niezależnego odczytu ZIP receipt, odczytu flagi API ani potwierdzenia autosave po grze. Nie resetowano kont i nie promowano PROD. Wszystkie 53 ręczne scenariusze nadal NOT RUN.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-0038](HL-CHG-0038.md), [HL-CHG-0305](HL-CHG-0305.md)

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
