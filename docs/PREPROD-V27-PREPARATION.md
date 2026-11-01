# PRE-PROD 0.11.0.0 — autoryzacja, zgodność i wynik

**DEV i PRE-PROD 0.11.0.0 odebrane — 2 listopada 2026, Europe/Warsaw.** Źródło [`c7c39742594599c54ee8b074b5c313efd88af4cb`](https://github.com/ksobczak321-oss/gra/commit/c7c39742594599c54ee8b074b5c313efd88af4cb): [CI 41361938909](https://github.com/ksobczak321-oss/gra/actions/runs/41361938909) **SUCCESS, 10 min 9 s**, [Pages 41361938868](https://github.com/ksobczak321-oss/gra/actions/runs/41361938868) **SUCCESS, 21 s**, [bridge 41362763426](https://github.com/ksobczak321-oss/gra/actions/runs/41362763426) **SUCCESS, 16 s**, [PRE-PROD 41362782175, próba 1](https://github.com/ksobczak321-oss/gra/actions/runs/41362782175) **SUCCESS, 2 min 17 s**. Pełne źródło wdrożenia potwierdzono.

Nieprzesuwane tagi [`dev-0.11.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/dev-0.11.0.0-20261102) i [`preprod-0.11.0.0-20261102`](https://github.com/ksobczak321-oss/gra/tree/preprod-0.11.0.0-20261102) są **opublikowane i potwierdzone zdalnie**; oba wskazują dokładnie `c7c39742594599c54ee8b074b5c313efd88af4cb`.

## Autoryzacja i standardowa droga wydania

Po lokalnym odbiorze użytkownik wydał **„promuj na pre prod”**. Polecenie rozszerzyło pierwotny zakres DEV o standardowe wdrożenie do `harborlight-dev`, zachowując konta, hasła i postęp. Nie objęło resetu ani PROD.

Marker `[preprod:0.11.0.0]` uruchomił istniejący `promote-urgent-preprod.yml` po własnym CI dokładnego SHA. Dispatcher zachował sprawdzenie repozytorium, świeżego CI, próby, aktywnego workflow i niezmienionego main. Standardowy `google-cloud-dev.yml` zachował WIF i wymóg dokładnego źródła. Nie zmieniono uprawnień. Skupione testy dispatchera/promocji28/28 PASS były lokalnym sprawdzeniem mechanizmu; rzeczywiste CI/bridge/deploy mają osobne sukcesy wymienione wyżej.

## Zapis i istniejące konta

- Schemat świata9, archipelagu2 i format payloadu JSON pozostają zgodne. Opcjonalne pola misji i gospodarki nie tworzą nowej wyspy ani nie resetują historii.
- Reguły Firestore są bajtowo identyczne z przygotowaniem v25: SHA-256 `88427f35c169d5f7882708345055b0f8cf42535dfd9a197e75b3e67bede5eb8f`. Nie wymagano ponownego uruchomienia skryptu kont.
- Poprawiony checker ściśle obsługuje koperty1/2 i korzeń API, limity poszczególnych światów, generację, indeks wysp oraz izolację właściciela. Zachowuje odczyty obcych/anonimowych i zakaz zapisów testu. Ma26/26 regresji PASS; pełny lokalny Node1023/1023 PASS19,92s.
- Nazwy, UID, hasła, lekcje, nagrody, budowy i rejsy zachowano. Nie wykonano resetu, a stare rejsy nie pobierają ponownie posiłków.

Kontrola stałych kont i izolacji zapisu **przeszła** w tym wdrożeniu, podobnie jak dokładny manifest/publiczne pliki oraz rzeczywisty hostowany Chromium. Odbiór kont zakończył się 1 listopada o23:36:47Z, czyli 2 listopada o00:36:47 w Warszawie; publikacja receipt i artefaktów zakończyła się sukcesem do23:36:50Z. Są to kontrole odczytowe, bez zapisu gry lub resetu. Ręczny test zapis→ponowne wczytanie nadal NOT RUN.

## Pakiet i publiczne artefakty

**61 plików z manifestem / 60 plików treści / 11 219 303 bajty**. Lokalny TAR SHA-256 `794d1e30f9af8d21d64caac2b073fbee17d4127566333de73f93393beb4d260b`; manifest SHA-256 `f83609519dd2becb96ea3532b1b746d63128f8631311720090c5c88e4e45c62e`. Archiwum zweryfikowano i rozpakowano; wszystkie 60 plików treści są identyczne bajtowo z testowanym final2, a 59 publicznych źródeł gry nie zmieniło się w poprawce checkera.

| Artefakt próby 1 | Publiczne ID GitHub | SHA-256 archiwum ZIP podany przez GitHub |
|---|---:|---|
| `harborlight-dev-frontend-41362782175-1` | 13106171196 | `308d5b66fab731689b7d2f67343936d3b1141ca9e986d300d5a25393daeb1840` |
| `harborlight-dev-release-41362782175-1` | 13105684537 | `546c85f8005efa6a9c6daf2dbc5394b54e214ec26e7ce2a59eb0ff2f3ed19252` |

Są to publiczne digests ZIP GitHub, odrębne od lokalnego TAR i manifestu aplikacji. Wewnętrznego ZIP receipt ani digestu obrazu backendu nie pobrano i nie odczytano niezależnie. Rzeczywista flaga API kont także pozostaje nieodczytana niezależnie.

## Poprzednia niepełna próba

Poprzednie źródło `7d45290b911e359a8940f28551df4692053cadb2` zachowuje [nieudany deploy 41360977479](https://github.com/ksobczak321-oss/gra/actions/runs/41360977479): **FAILURE** w kroku24 kontroli stałych kont po udanej publikacji Hostingu, kontroli dokładnego wydania i hostowanym Chromium. Jego CI41360046508 SUCCESS10m31s, Pages41360046453 SUCCESS47s i bridge41360957057 SUCCESS18s są odrębnymi dowodami. Nie utworzono receipt ani tagu tej nieudanej próby. Bazowe źródło `6ff5ae976e31add7fb93e3872e0d9046a25edd37` ma CI41359303259 **CANCELLED** i Pages41359303232 SUCCESS30s. Nie przepisujemy żadnego z tych wyników na sukces c7c3974.

[Incydent](PREPROD-V27-INCIDENT-20261102.md) nie został przepisany na sukces. Dopiero kolejny deploy41362782175 zweryfikował naprawę w rzeczywistym środowisku. Prywatna pierwotna liniaERROR nie została przekazana, mimo odtworzenia konkretnego błędu w testach.

Rejestr zawiera **297 kart zmian**, w tym HL-CHG-0951–0968 dla tego zakresu i poprawki checkera. Wszystkie **70 ręcznych wyników pozostają NOT RUN**. Nie resetowano kont, wysp, haseł ani historii; PROD bez zmian.
