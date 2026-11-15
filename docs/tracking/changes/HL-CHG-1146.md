# HL-CHG-1146 — Miniatury zgodne z wyglądem oraz wspólna prawa krawędź dolnego menu i panelu misji

**Typ:** Story · **Obszar:** Dolne menu i miniatury · **Epik:** `HL-EPIC-UI`

Ta karta jest wersjonowanym wpisem w Git. **Nie została opublikowana jako natywne GitHub Issue** (`issue_url: null`).

## Status

| Warstwa | Stan |
|---|---|
| Implementacja | `implemented` |
| DEV | `deployed_source_06db93a` |
| CI | `success_source_06db93a` |
| PRE-PROD | `e0_files_deployed_functional_acceptance_reopened` |
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

- **Dokumenty:** [docs/v32/GO-ACCEPTED-FRONT.md](../../v32/GO-ACCEPTED-FRONT.md), [docs/v32/ACCEPTED-FRONT-EVIDENCE.json](../../v32/ACCEPTED-FRONT-EVIDENCE.json), [docs/v32/DIRECTORY-EVIDENCE.json](../../v32/DIRECTORY-EVIDENCE.json), [docs/v32/DIRECTORY-PUBLIC-RECEIPTS.json](../../v32/DIRECTORY-PUBLIC-RECEIPTS.json)
- **Kod:** [harborlight-v1-play.js](../../../harborlight-v1-play.js), [harborlight-v1-play.css](../../../harborlight-v1-play.css), [harborlight-v1-development-ui.js](../../../harborlight-v1-development-ui.js), [harborlight-v1-map-art.js](../../../harborlight-v1-map-art.js), [harborlight-v1-goods-art.js](../../../harborlight-v1-goods-art.js), [assets/harborlight-goods-v32.png](../../../assets/harborlight-goods-v32.png), [harborlight-v1-onboarding-ui.js](../../../harborlight-v1-onboarding-ui.js)
- **Scenariusze automatyczne:** [tests/harborlight-native-map-v32-smoke.py](../../../tests/harborlight-native-map-v32-smoke.py), [tests/harborlight-tour-route-v5-smoke.py](../../../tests/harborlight-tour-route-v5-smoke.py), [tests/harborlight-accepted-front-v32-smoke.py](../../../tests/harborlight-accepted-front-v32-smoke.py), [tests/harborlight-resource-icons-v32-smoke.py](../../../tests/harborlight-resource-icons-v32-smoke.py), [tests/harborlight-onboarding-target-replacement-v32-smoke.py](../../../tests/harborlight-onboarding-target-replacement-v32-smoke.py), [tests/harborlight-frontend-v17-smoke.py](../../../tests/harborlight-frontend-v17-smoke.py)
- **Kod dowodowy:** `06db93ada1c5cbd3071709ab84fc959f9674e5a1`.
- **CI tego wydania:** https://github.com/ksobczak321-oss/gra/actions/runs/43740930893.
- **Promocja kodu:** https://github.com/ksobczak321-oss/gra/actions/runs/43757897657.
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

Cache8 odebranywyłącznieDEV: aplikacjafa34c9e, publikacja06db93a, własnyCI43740930893SUCCESS iPages43740930892SUCCESS dokładnie tegoSHA. Job132893708888:17m58s,31krokówSUCCESS/0failed, pełneChromium aplikacji i logowań/zapisówDEV.18ukierunkowanychhashyHTTPS i106PUBLIC_FILES/30728747bajtów zgodneSHA256/TLS; render1672/390PASS oznacza publiczne bajty wykonane lokalnie z rzeczywistymContent-Type, bez fikcyjnegoświata/API/konta. NatywneHTTPSChromiumBLOCKED_CERT_AUTHORITY bez ignorowaniaTLS. Adnotowanytagdev-0.15.0.0-cache8-20261115 opublikowany i potwierdzonyzdalnie na06db93a. StaryCIcache7FAILURE zachowany; ręcznyodbiórNOT_RUN. Późniejszycommitmetadanych nie zmienia106publicznychplików ani tagu.

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
