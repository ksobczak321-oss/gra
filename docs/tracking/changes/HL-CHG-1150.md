# HL-CHG-1150 — Import zatwierdzonej redakcjiPL z sześciu arkuszy z pierwszeństwemC i zachowaniem prawdziwej logiki

**Typ:** Story · **Obszar:** Redakcja polskich tekstów z sześciu arkuszy · **Epik:** `HL-EPIC-UI`

Ta karta jest wersjonowanym wpisem w Git. **Nie została opublikowana jako natywne GitHub Issue** (`issue_url: null`).

## Status

| Warstwa | Stan |
|---|---|
| Implementacja | `implemented` |
| DEV | `first_cache9_published_b1_hashes_and_local_public_render_verified` |
| CI | `failed_stale_copy_43752880913_new_candidate_pending` |
| PRE-PROD | `not_deployed` |
| PROD | `not_deployed` |
| Decyzja | `accepted` |

**Tagi:** `v32`, `dev-only`, `copy`, `release-0-15-0-0`.

Status kodu nie jest potwierdzeniem aktywacji usług, wykonania operacji chmurowej ani ręcznego testu.

## Zakres i odbiór

- Dozwolony zakres obejmuje dokładnie6arkuszy:Tutorial55wierszy,Budynki—opisy24,Budynki—informacje30,Dolnypasek24,Komunikaty215,Przyciski65; razem413. Treść pozostałych arkuszy nie jest odczytywana ani importowana.
- NiepustaC ma pierwszeństwo, a pustaC oznaczaB.87niepustychC obejmuje85różniących się odB i2bez zmiany.
- Instrukcje redakcyjne są rozstrzygane we właściwym kontekście; polecenia robocze nie są dosłownymi komunikatamiUI. Parametry dynamiczne, polskie znaki i sens opisu zostają zachowane.
- Oczekujące decyzje ser→Mleczarnia oraz reklamy na każdym poziomie nie są automatycznymi zmianami modelu. Do odpowiedzi teksty pozostają zgodne z faktyczną logiką i dostępnościąAPI/usług.
- Zaakceptowany front i grupy mieszkańców cache8,UID,zapisy,przydziały i postęp pozostają zachowane; zakres publikacji toDEV/cache9.
- Historyczny pełnyHARBORLIGHT15-teksty-DEV.xlsx pozostaje bez zmiany; nowyHARBORLIGHT15-redakcja-6-zakladek.xlsx obejmuje tylko6arkuszy/413ABC, B=scalonytekstUI,C=pusta,A=kontekst+rozstrzygnięcie. Raportwalidacji wskazuje nowy plik i odciski źródeł.
- Mapowanie413wierszy, testy kontekstowe komputer/telefon, eksport/walidacja, własnySHA/CI/Pages i hostowane teksty mają odrębny odbiór. Oddzielna zablokowana promocjaPROD i workflowPROD nie są zmieniane przez import.

## Źródło

Użytkownik polecił połączyć Tutorial, opisy i informacje budynków, dolny pasek, komunikaty i przyciski: niepustaC obowiązuje, przy pustejC zachowujemyB. Wiele komórek zawiera instrukcje redakcyjne zamiast gotowego tekstuUI.

Odniesienie: `user-upload:HARBORLIGHT_teksty_do_redakcji_ABC.xlsx:selected-six-tabs`.

Data pierwotnej wiadomości: 2026-11-15. Bieżące polecenie użytkownika dotyczące sześciu wybranych zakładek; dane wyłącznie z dozwolonego wyciągu.

## Dowody

- **Dokumenty:** [docs/v32/GO-EDITORIAL-SIX-TABS.md](../../v32/GO-EDITORIAL-SIX-TABS.md), [docs/v32/EDITORIAL-SIX-TABS-EVIDENCE.json](../../v32/EDITORIAL-SIX-TABS-EVIDENCE.json), [docs/v32/EDITORIAL-SIX-TABS-PUBLIC-RECEIPTS.json](../../v32/EDITORIAL-SIX-TABS-PUBLIC-RECEIPTS.json)
- **Kod:** [harborlight-v1-approved-copy.js](../../../harborlight-v1-approved-copy.js), [harborlight-v1-copy.js](../../../harborlight-v1-copy.js), [harborlight-v1-development-copy.js](../../../harborlight-v1-development-copy.js), [harborlight-v1-play.js](../../../harborlight-v1-play.js)
- **Scenariusze automatyczne:** nie przypisano.
- **Kod dowodowy:** `0b41a9b819127416d92836f42ccc812c2bec960d`.
- **CI tego wydania:** https://github.com/ksobczak321-oss/gra/actions/runs/43752880913.
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

Pierwsza publikacjab1a929d aplikacji0b41a9b: Pages43752880924SUCCESS20s,106publicznychplików/30742201bajtów zgodneHTTPS/TLS/SHA; renderpublicznychbajtówlokalnie1672/390PASS, bez fikcyjnegoświata/API/konta. NatywneHTTPS nadalBLOCKEDmanagedTLS, bez ignorowania. NowyExcel413/6/ABC/Cpusta/źródło0b41a9bPASS; historyczny pełnyExcel zachowany.186testówkierunkowych,56kroków1440/390,menu/Magazyn1440/390 i20info×1672/1366/390PASS lokalnie. CI43752880913FAILURE:1401/1402PASS, stare „przy przypłynięciu” zamiast jawnegoC „po przypłynięciu”; browserCI_SKIPPED. Wąska poprawka testu zachowuje4/6,ładunek i czas,106plików bez zmian; nowySHA/CI/PagesPENDING. Dwie decyzje modelowe nadal oczekują. Poprawka learning-v29 lokalnie13/13PASS, zachowane4/6,ładunek,czas; selektor staregoUI testu wskazuje submit własnegoformularza zamiast nazwyPrzydziel. PublicznyExcel i raportwalidacjiHTTP200/TLS/SHAzgodne, bez zmiany runtime.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-1142](HL-CHG-1142.md), [HL-CHG-1146](HL-CHG-1146.md), [HL-CHG-1147](HL-CHG-1147.md), [HL-CHG-1148](HL-CHG-1148.md)

## Uwagi

- Bez odczytu treści niewybranych arkuszy przesłanego pliku i bez modyfikowania źródłowego lub historycznego pełnego Excela przez tę dokumentację.
- Ser doMleczarni i reklamy na każdympoziomie mają oczekujące odpowiedzi; modele otrębów/paszy nie są automatycznie włączane.
- Odrębna promocjaPROD pozostaje zablokowana receiptaccount_api:false i kontraktem108vs85plików według stanu przy przyjęciu zadania; bieżący import jest wyłącznieDEV.

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
