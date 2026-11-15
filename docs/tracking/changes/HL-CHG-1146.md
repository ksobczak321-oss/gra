# HL-CHG-1146 — Miniatury zgodne z wyglądem oraz wspólna prawa krawędź dolnego menu i panelu misji

**Typ:** Story · **Obszar:** Dolne menu i miniatury · **Epik:** `HL-EPIC-UI`

Ta karta jest wersjonowanym wpisem w Git. **Nie została opublikowana jako natywne GitHub Issue** (`issue_url: null`).

## Status

| Warstwa | Stan |
|---|---|
| Implementacja | `implemented` |
| DEV | `published_source_86eb8d9` |
| CI | `passed_source_86eb8d9` |
| PRE-PROD | `deployed_source_86eb8d9` |
| PROD | `not_deployed` |
| Decyzja | `accepted` |

**Tagi:** `v32`, `dev-only`, `frontend`, `release-0-15-0-0`.

Status kodu nie jest potwierdzeniem aktywacji usług, wykonania operacji chmurowej ani ręcznego testu.

## Zakres i odbiór

- DziesięćminiaturGospodarki i dziewięćAdministracji odpowiada aktualnej funkcji i zaakceptowanemu wyglądowi budynków.
- Poziom, nazwa i licznik każdej karty mają wspólne ramki i linie wyrównania, bez wystawania poza kartę.
- Wszystkie pięć zakładek i odpowiadające panele przesuwają się razem: logicalleft474,width1190,right1664, równo z panelem misji left1401,width263,right1664.
- Statek jest odsłonięty, menu pozostaje w granicach planszy i nie ucina zakładek lub kart.
- Telefon zachowuje działające przełączanie pięciu zakładek i miniatury w granicach ekranu.
- Nowy publikowany link DEV zachowuje jawny scenariusz poziomu5; wynik potwierdza kod lokalny, pakiet oraz faktycznie hostowany widok.
- Zasoby używają zaakceptowanego atlasu21aktywnych istniejących towarów; kafelki otrębów i paszy nie uruchamiają nowych modeli lub badań.
- Osłona bezczynności PAGES_PREVIEW&&!devAccount chroni publiczny scenariusz bez konta przed przejściem do błędnego formularza logowania.

## Źródło

Użytkownik zaakceptował grafiki i nowy układ funkcji bez przerysowania budynków, następnie polecił wyrównać prawą krawędź dolnego menu z panelem po prawej i wrzucić front na DEV.

Odniesienie: `chat:GO:accepted-island-front-dock-right-edge`.

Data pierwotnej wiadomości: 2026-11-15. Bieżące GO użytkownika po akceptacji statycznego pełnego frontu; data sesji UTC.

## Dowody

- **Dokumenty:** [docs/v32/GO-ACCEPTED-FRONT.md](../../v32/GO-ACCEPTED-FRONT.md), [docs/v32/ACCEPTED-FRONT-EVIDENCE.json](../../v32/ACCEPTED-FRONT-EVIDENCE.json), [docs/v32/DIRECTORY-EVIDENCE.json](../../v32/DIRECTORY-EVIDENCE.json), [docs/v32/DIRECTORY-PUBLIC-RECEIPTS.json](../../v32/DIRECTORY-PUBLIC-RECEIPTS.json), [docs/v32/PREPROD-RULESET-RESET-EVIDENCE.json](../../v32/PREPROD-RULESET-RESET-EVIDENCE.json), [docs/v32/PREPROD-CACHE11-ARTIFACT-AUDIT.json](../../v32/PREPROD-CACHE11-ARTIFACT-AUDIT.json)
- **Kod:** [harborlight-v1-play.js](../../../harborlight-v1-play.js), [harborlight-v1-play.css](../../../harborlight-v1-play.css), [harborlight-v1-development-ui.js](../../../harborlight-v1-development-ui.js), [harborlight-v1-map-art.js](../../../harborlight-v1-map-art.js), [harborlight-v1-goods-art.js](../../../harborlight-v1-goods-art.js), [assets/harborlight-goods-v32.png](../../../assets/harborlight-goods-v32.png), [harborlight-v1-onboarding-ui.js](../../../harborlight-v1-onboarding-ui.js)
- **Scenariusze automatyczne:** [tests/harborlight-native-map-v32-smoke.py](../../../tests/harborlight-native-map-v32-smoke.py), [tests/harborlight-tour-route-v5-smoke.py](../../../tests/harborlight-tour-route-v5-smoke.py), [tests/harborlight-accepted-front-v32-smoke.py](../../../tests/harborlight-accepted-front-v32-smoke.py), [tests/harborlight-resource-icons-v32-smoke.py](../../../tests/harborlight-resource-icons-v32-smoke.py), [tests/harborlight-onboarding-target-replacement-v32-smoke.py](../../../tests/harborlight-onboarding-target-replacement-v32-smoke.py), [tests/harborlight-frontend-v17-smoke.py](../../../tests/harborlight-frontend-v17-smoke.py)
- **Kod dowodowy:** `86eb8d9a40dab073c17a1b0f96dca38f1a15e24c`.
- **CI tego wydania:** https://github.com/ksobczak321-oss/gra/actions/runs/43766275390.
- **Promocja kodu:** https://github.com/ksobczak321-oss/gra/actions/runs/43768861718.
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

PRE-PROD86/0.15.0.1/cache11: własnyCI43766275390 SUCCESS26m17s, Pages43766275430 SUCCESS18s, standardowydeploy43768861718/1 SUCCESS2m12s. Natywna zalogowana gra32 PASS26s:108hashy,20funkcji,7markerów,4nakładki,19kart(9+10),21ikon,natywnyTeatr,ciemne wyrównaneUI,statek odsłonięty.3istniejące konta/3niepuste zapisy,0pustych;6obcych+3anon odmowy,3APIreads+3anonAPI401,0islandwrites. OryginalneZIP-y/innerreceiptv2/strict109verifierPASS;accountAPI=true/resetFence potwierdzone. Reset NOT_EXECUTED; wymagany CloudShell właściciela. PełnyTLS108plików+manifest/109archiwalnych PASS; tagpreprod-0.15.0.1-20261115 obiekt446347dab79ebc3e8c088d6d257adbdcd0f5f6e4→86 opublikowany/zdalniepotwierdzony. E0REOPENED,b268FAILURE i opcjonalnylatefoodINCOMPLETE pozostają historią; manualNOT_RUN,PROD/DNSodłożone.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-1144](HL-CHG-1144.md), [HL-CHG-1145](HL-CHG-1145.md), [HL-CHG-1142](HL-CHG-1142.md)

## Uwagi

- Wyłącznie publikacja zatwierdzonego frontu na DEV/GitHub Pages; bez nowej promocji PRE-PROD/PROD, operacji kont lub resetu.
- Roboczy pakiet sera, otrębów/paszy i nazw mieszkańców jest zachowany w osobnym drzewie i wyłączony z tej publikacji.
- Publiczny scenariusz preview=admin1-level5 pozostaje oznaczonym podglądem w pamięci karty, bez uwierzytelnienia lub trwałego zapisu.
- Późniejsze GOcache8 autoryzuje prezentację nazw i grup mieszkańców, która była wyłączona z historycznej publikacji cache7; modele sera i otrębów/paszy pozostają wyłączone.
- Zaakceptowany front cache7 przeniesiono bez zmiany grafik i przypisań do opublikowanego cache8; historycznyCIcache7 pozostajeFAILURE.

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
