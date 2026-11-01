# PRE-PROD 0.11.0.0 — historia awarii i potwierdzone rozwiązanie

**Rozwiązanie potwierdzone 2 listopada2026, Europe/Warsaw:** [PRE-PROD 41362782175, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41362782175) dla `c7c39742594599c54ee8b074b5c313efd88af4cb` ma **SUCCESS,2 min17s**. Końcowa kontrola stałych kont i izolacji zapisu tym razem przeszła; receipt i artefakty opublikowano. To osobny, nowy przebieg; poprzednia awaria pozostaje FAILURE.

## Nieudana próba7d45290

Poprzednie źródło `7d45290b911e359a8940f28551df4692053cadb2` zachowuje [nieudany deploy 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479): **FAILURE** w kroku24 kontroli stałych kont po udanej publikacji Hostingu, kontroli dokładnego wydania i hostowanym Chromium. Jego CI41360046508 SUCCESS10m31s, Pages41360046453 SUCCESS47s i bridge41360957057 SUCCESS18s są odrębnymi dowodami. Nie utworzono receipt ani tagu tej nieudanej próby. Bazowe źródło `6ff5ae976e31add7fb93e3872e0d9046a25edd37` ma CI41359303259 **CANCELLED** i Pages41359303232 SUCCESS30s. Nie przepisujemy żadnego z tych wyników na sukces c7c3974.

| Warstwa tej próby | Potwierdzony stan |
|---|---|
| Źródło |7d45290b911e359a8940f28551df4692053cadb2. |
| Gate125011066732 |SUCCESS. |
| Hosting |Publikacja, dokładny manifest/publiczne pliki i hostowany Chromium przeszły. |
| Odbiór kont |Krok24 „Verify permanent DEV accounts and cloud save isolation” — FAILURE. |
| Receipt/artefakty/tagi |Kroki receipt/artefaktów pominięte; brak tagu tej nieudanej próby. |

Hosting nowego frontendu mógł już działać po niepowodzeniu. Nie traktowano starego pełnego odbioru0.10.1.0 jako dowodu, że nadal serwowano stare pliki. Nie resetowano kont ani nie przywracano świeżych światów.

## Odtworzony błąd i ścisła naprawa

Checker zakładał wyłącznie kopertę Firestore1, podczas gdy klient legalnie zapisywał także2. Poprawka c7c3974 obsługuje oba kontrakty z kontrolą generacji, ograniczonego indeksu wysp, poprawnego korzenia bez zagnieżdżonych córek i limitu700kB na świat. Uwodniony archipelag API może mieć do14MB; każdy świat nadal podlega własnemu limitowi. Przy tym samym revision porównanie projektuje korzeń API zgodnie z rzeczywistym adapterem dokumentów.

Regresje użyły rzeczywistego adaptera backendu, pustej listy córek i poprawnego wielowyspowego payloadu większego niż700kB. Uszkodzone/nieznane koperty pozostają odrzucane. Kontrole właściciela, sześciu obcych odczytów, anonimowych odczytów i brak żądań zapisu pozostały obowiązkowe. Bezpieczne adnotacje błędów nie zawierają tokenów, haseł ani surowych odpowiedzi. Checker26/26 i pełny lokalny Node1023/1023 PASS19,92s; publiczne pliki gry i dane bez zmian.

Pierwotny prywatny wierszERROR z nieudanego kroku nie został przekazany. Znany błąd kontraktu2 został odtworzony i naprawiony lokalnie; nie przedstawiamy nieotrzymanego logu jako odczytanego. Następny rzeczywisty deploy potwierdził rozwiązanie końcowej kontroli kont.

## Udana kolejna promocja

**DEV i PRE-PROD 0.11.0.0 odebrane — 2 listopada 2026, Europe/Warsaw.** Źródło [`c7c39742594599c54ee8b074b5c313efd88af4cb`](https://github.com/ksobczak321-oss/gra/commit/c7c39742594599c54ee8b074b5c313efd88af4cb): [CI 41361938909](https://github.com/ksobczak321-oss/gra/actions/runs/41361938909) **SUCCESS, 10 min 9 s**, [Pages 41361938868](https://github.com/ksobczak321-oss/gra/actions/runs/41361938868) **SUCCESS, 21 s**, [bridge 41362763426](https://github.com/ksobczak321-oss/gra/actions/runs/41362763426) **SUCCESS, 16 s**, [PRE-PROD 41362782175, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41362782175) **SUCCESS, 2 min 17 s**. Pełne źródło wdrożenia potwierdzono.

Nieprzesuwane tagi [`dev-0.11.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/dev-0.11.0.0-20261102) i [`preprod-0.11.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/preprod-0.11.0.0-20261102) są **opublikowane i potwierdzone zdalnie**; oba wskazują dokładnie `c7c39742594599c54ee8b074b5c313efd88af4cb`.

Kontrola stałych kont i izolacji zapisu **przeszła** w tym wdrożeniu, podobnie jak dokładny manifest/publiczne pliki oraz rzeczywisty hostowany Chromium. Odbiór kont zakończył się 1 listopada o23:36:47Z, czyli 2 listopada o00:36:47 w Warszawie; publikacja receipt i artefaktów zakończyła się sukcesem do23:36:50Z. Są to kontrole odczytowe, bez zapisu gry lub resetu. Ręczny test zapis→ponowne wczytanie nadal NOT RUN.

**61 plików z manifestem / 60 plików treści / 11 219 303 bajty**. Lokalny TAR SHA-256 `794d1e30f9af8d21d64caac2b073fbee17d4127566333de73f93393beb4d260b`; manifest SHA-256 `f83609519dd2becb96ea3532b1b746d63128f8631311720090c5c88e4e45c62e`. Archiwum zweryfikowano i rozpakowano; wszystkie 60 plików treści są identyczne bajtowo z testowanym final2, a 59 publicznych źródeł gry nie zmieniło się w poprawce checkera.

| Artefakt próby 1 | Publiczne ID GitHub | SHA-256 archiwum ZIP podany przez GitHub |
|---|---:|---|
| `harborlight-dev-frontend-41362782175-1` | 13106171196 | `308d5b66fab731689b7d2f67343936d3b1141ca9e986d300d5a25393daeb1840` |
| `harborlight-dev-release-41362782175-1` | 13105684537 | `546c85f8005efa6a9c6daf2dbc5394b54e214ec26e7ce2a59eb0ff2f3ed19252` |

Są to publiczne digests ZIP GitHub, odrębne od lokalnego TAR i manifestu aplikacji. Wewnętrznego ZIP receipt ani digestu obrazu backendu nie pobrano i nie odczytano niezależnie. Rzeczywista flaga API kont także pozostaje nieodczytana niezależnie.

Poprzedni lokalny pakiet7d45290 zachowuje TAR `d202c79783b1dc2787d3db2a859031a9dc03fb87a089b2e81a09c2d8d0253ff4` i manifest `0905956f17d0b249cf8faae7a3aed486e86e74d20b2a5145f72d6a9730792993`. Nie są to hashe receipt udanej promocji c7c3974.

Rejestr zawiera **297 kart zmian**, w tym HL-CHG-0951–0968 dla tego zakresu i poprawki checkera. Wszystkie **70 ręcznych wyników pozostają NOT RUN**. Nie resetowano kont, wysp, haseł ani historii; PROD bez zmian.
