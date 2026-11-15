# HL-CHG-1153 — Reset admin1–3 po naprawie i bramkach API zachowuje loginy,hasła iUID

**Typ:** Ops · **Obszar:** Chroniony reset trzech kont PRE-PROD · **Epik:** `HL-EPIC-OPS`

Ta karta jest wersjonowanym wpisem w Git. **Nie została opublikowana jako natywne GitHub Issue** (`issue_url: null`).

## Status

| Warstwa | Stan |
|---|---|
| Implementacja | `authorized_guarded_operation_pending` |
| DEV | `factory32_verified_locally` |
| CI | `pending_own_run` |
| PRE-PROD | `reset_NOT_EXECUTED_pending_API_role_lock_wait_and_deploy` |
| PROD | `postponed_by_user` |
| Decyzja | `accepted` |

**Tagi:** `v32`, `preprod`, `release-0-15-0-1`.

Status kodu nie jest potwierdzeniem aktywacji usług, wykonania operacji chmurowej ani ręcznego testu.

## Zakres i odbiór

- Reset obejmuje tylko trzy istniejące kontaPRE-PROD z zachowaniemAuthentication,loginów,haseł iUID; istnieją trzy zapisy i trzy prywatne kopie.
- Przed resetem nowe odebrane wdrożenie i zgodnyreceipt,APIon oraz runtime roles/datastore.user; grant właściciel zgłosił jako zastosowany, niezależny odczytIAM pozostaje oczekujący.
- Zablokować bezpośrednie zapisy klienta i potwierdzić minimum10minut propagacji przed chronionymresetem.
- API ma pozostać włączone po resecie; GHenv403 nie jest dowodem ustawienia flagi.
- Odczytać trzy świeże zapisane wyspy z fabryki32/18osób przedintro oraz19po prezencie, zweryfikować własność i nowyUI.
- PROD i DNS odłożone; nie wolno oznaczyć resetu lub bramek jako zakończonych bez rzeczywistych dowodów.
- Reset usuwa tylko własne postępy i potomkówcommunity oraz kwalifikowanyzerowy mechanicznyportfel; zachowujeUID/handle/name/preferences/blocked/muted.
- Każde powiązanie sharedseason/alliance/team/score/globaldonation/financial/externaltrade blokuje reset; nie usuwa danych globalnych. CAS obejmuje community/wallet także przy braku korzenia, zwiększaepoch/mutationRevision i odrzuca spóźnione mutacje.
- DeployedAPI musi ogłaszać resetFence:community-profile-v1; ponowienie tego samego receipt kończy się przed dotknięciem nowego postępu.

## Źródło

Użytkownik polecił naprawić stare UI na PRE-PROD, a następnie zresetować wszystkie trzy konta z zachowaniem loginów, haseł iUID.

Odniesienie: `chat:GO:preprod-ruleset-fix-then-reset-three`.

Data pierwotnej wiadomości: 2026-11-15. Najnowsze GO po zgłoszeniu starego UI; PROD/domena jawnie odłożone.

## Dowody

- **Dokumenty:** [docs/v32/GO-PREPROD-RULESET-RESET.md](../../v32/GO-PREPROD-RULESET-RESET.md), [docs/v32/PREPROD-RULESET-RESET-EVIDENCE.json](../../v32/PREPROD-RULESET-RESET-EVIDENCE.json), [docs/PREPROD-V32-PROMOTION.md](../../PREPROD-V32-PROMOTION.md), [docs/PREPROD-V32-EVIDENCE.json](../../PREPROD-V32-EVIDENCE.json)
- **Kod:** [infra/google-cloud/reset-preprod-accounts.py](../../../infra/google-cloud/reset-preprod-accounts.py), [backend/starter-island.mjs](../../../backend/starter-island.mjs), [backend/server.mjs](../../../backend/server.mjs), [infra/google-cloud/reset-preprod-verified.sh](../../../infra/google-cloud/reset-preprod-verified.sh)
- **Scenariusze automatyczne:** [tests/harborlight-preprod-reset.test.py](../../../tests/harborlight-preprod-reset.test.py), [tests/harborlight-runtime-config.test.py](../../../tests/harborlight-runtime-config.test.py)
- **Kod dowodowy:** `27f3ea4f08474329108724c68c97c340ecaa1914`.
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

Końcowe źródło aplikacji27f3ea4/0.15.0.1/cache11:93/93kierunkowych(incl5nowychregresji),syntax/imports,Docker2+canonical3JSstagePASS. Dokładne zapisanefood/flour obietnice,historia i claim/shareonce bez reroll/requote; render rzeczywistych nagród,latefood,guide i pendingcashout zaimplementowane. Wymaganyklaster6cloudcallers odebranyPASS zgodnie z końcowym raportem; opcjonalnylatefood ma lukęUI. Excel413/6/Cpusta/96fingerprints źródło27f,SHAe9119fec… . WłasnyCI/publikacja/wdrożenie/resetPENDING; brak zaakceptowanego tagu. b268CI43763863333FAILURE iE0filedeployment/functionsREOPENED zachowane.1410/155/20 to wcześniejszecheckpointy. Aktualnyfrozen27f:109plików/30767904bajtów,archive59b75952…/manifest5b499046…; czteryścisłesuitev22/learning26/starter26/learning27 poPL/ENdesktop/mobilePASS,misje4/4+starter28przy niezmienionymzakresiepoprzednioPASS. OpcjonalnylatefoodUI INCOMPLETE: modelclaimfood25/flour0+receiptPASS, popupworkerów blokował pełnytile/reload; brak pełnego desktop/mobileUIproof, testpoza repo i bez bramkiCI. Launcherwłaścicielski ma30sodliczanie,pinnedsource+oryginalneZIPproof i retrychronionegoresetu po10min; błędneargumenty odrzucone przed siecią. Żadnego rzeczywistegoCI/deploy/resetu nie wykonano.

## Relacje

- **Zastępuje:** [HL-CHG-1151](HL-CHG-1151.md)
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-1150](HL-CHG-1150.md), [HL-CHG-1152](HL-CHG-1152.md)

## Uwagi

- Migracja przy odczycie zachowuje istniejący stan; osobny reset jest jawną autoryzowaną operacją po bramkach.
- TagiE0 pozostają historycznymi odniesieniami plików/artefaktów, nie ukończonym odbiorem funkcji starych zapisów.
- Właściciel zgłosiłSUCCESS minimalnego roles/datastore.user dla runtimePRE-PROD:OWNER_REPORTED_APPLIED. Nie wykonano niezależnego odczytuIAM; pozostałe bramkiAPI/deploy/lock/600s/reset pozostająPENDING.
- b268/cache10 własnyCI43763863333FAILURE8m54s:26pierwszychkrokówPASS,step27tutorial-v22reward_grid6oczekiwane/5widoczne,step28cloudSKIPPED; Pages43763863357SUCCESS. Beznowegodeploy/resetu, brak zaakceptowanego tagu. Następnycache11/0.15.0.1 potrzebuje własnegoCI;1410/155/20 są wcześniejszymi checkpointami.

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
