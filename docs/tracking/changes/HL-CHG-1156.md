# HL-CHG-1156 — Pełny MASTER 15 łączy bieżące zasady, teksty, produkcję, minigry i symulacje z archiwum 14

**Typ:** Ops · **Obszar:** MASTER Excel zasad i źródeł · **Epik:** `HL-EPIC-OPS`

Ta karta jest wersjonowanym wpisem w Git. **Nie została opublikowana jako natywne GitHub Issue** (`issue_url: null`).

## Status

| Warstwa | Stan |
|---|---|
| Implementacja | `implemented` |
| DEV | `artifact_ready_local_build_and_fresh_validation_PASS` |
| CI | `local_validation_PASS_new_publication_CI_not_yet_run` |
| PRE-PROD | `not_applicable_document_only_game_unchanged` |
| PROD | `postponed_by_user` |
| Decyzja | `accepted` |

**Tagi:** `v32`, `master-workbook15`, `documentation-only`.

Status kodu nie jest potwierdzeniem aktywacji usług, wykonania operacji chmurowej ani ręcznego testu.

## Zakres i odbiór

- HARBORLIGHT15-zasady.xlsx i osobny raport odpowiadają zamrożonym źródłom v32 z pełnym pochodzeniem danych. Gotowy plik ma 156 arkuszy, 61 262 bieżące wiersze i potwierdzony SHA-256.
- Niezmieniony HARBORLIGHT14-zasady.xlsx jest archiwum. Nowy plik zachowuje jego 100 arkuszy, 220 części ZIP, 48 komentarzy i 4982 wcześniejsze wyniki formuł.
- Bieżące tabele obejmują logikę, teksty warunkowe, 56 kroków oprowadzania, 25 lekcji, produkcję i czasy, budynki, minigry oraz kalkulator z 12 nowymi formułami i zapisanymi wynikami.
- Raport rozróżnia rzeczywiste 24 h bezczynności, 24 h produkcji i 72 h rozwoju od referencyjnego planu 50 dni. Nie deklaruje pomiaru 150 h ludzkiej zabawy lub optymalnego gracza. W 72 h osiągnięto 64 osoby przy 36 łóżkach; 22 ze 143 prób punktów Domu prawidłowo odrzucono.
- Katalog 120 układów zawiera 115 sprawdzonych solverem i 5 układów kulki sprawdzonych strukturalnie. Zakres weryfikacji i ograniczenia dowodów historycznych są jawne.
- Ser nadal powstaje w Gospodarstwie od poziomu 6; otręby i pasza nie są zaimplementowane. Arkusz opisuje te luki i nie wdraża modeli.
- Gra, zaakceptowane źródła i tagi, konta, runtime, wdrożenia oraz redakcyjny Excel z sześcioma zakładkami, MERGE i jego odciski pozostają bez zmian. Niewybrane zakładki oryginalnego uploadu nie są czytane.
- Budowa i świeże --validate-only przeszły PASS po ponownym wykonaniu rzeczywistych eksportów modeli i tekstów. Sprawdzono 114 źródeł, odciski eksporterów i generatora, ślad AST, limity UTF-16 oraz 160 próbek formuł wobec kodu. Artefakt gotowy do publikacji w Git; wynik nowego CI należy sprawdzić w Actions.

## Źródło

Użytkownik chce pełny Excel logiki gry, tekstów i tutoriali, czasów produkcji, minigier oraz symulacji rozwoju. Autoryzuje odczyt repozytoryjnych źródeł i mastera. Niewybrane zakładki oryginalnego uploadu redakcyjnego pozostają poza zakresem.

Odniesienie: `chat:GO:full-master-rules-workbook15`.

Data pierwotnej wiadomości: 2026-11-16. Aktualizacja pełnego mastera bez zmiany gry.

## Dowody

- **Dokumenty:** [docs/v32/GO-MASTER-WORKBOOK15.md](../../v32/GO-MASTER-WORKBOOK15.md), [docs/v32/MASTER-WORKBOOK15-EVIDENCE.json](../../v32/MASTER-WORKBOOK15-EVIDENCE.json), [docs/arkusze/README.md](../../arkusze/README.md), [docs/arkusze/HARBORLIGHT15-zasady-walidacja.json](../../arkusze/HARBORLIGHT15-zasady-walidacja.json), [docs/design/WORKBOOK-V32-SIMULATION.json](../../design/WORKBOOK-V32-SIMULATION.json)
- **Kod:** [scripts/build_workbook_v15.py](../../../scripts/build_workbook_v15.py), [scripts/export_workbook_v15_facts.mjs](../../../scripts/export_workbook_v15_facts.mjs), [scripts/export_workbook_v15_texts.mjs](../../../scripts/export_workbook_v15_texts.mjs), [scripts/export_workbook_v15_scenarios.mjs](../../../scripts/export_workbook_v15_scenarios.mjs)
- **Scenariusze automatyczne:** nie przypisano.
- **Kod dowodowy:** `e23b713ddbaef3ea6b0507c56a466f23c1f0aa92`.
- **Ręczne wykonanie przypadku:** `NOT_RUN`.

MASTER 15 ze źródła e23b ma 156 arkuszy: 100 archiwalnych i 56 bieżących (51 widocznych, 5 ukrytych), 61 262 bieżące wiersze oraz 7 581 368 bajtów. SHA-256: b45a9f67ebcc1653ce2fc5413e5dbd9a42b32c103a52b4eda06db647b5dd1f11. Budowa i świeża walidacja PASS ponownie wykonały eksporty modeli i tekstów; 114 źródeł, odciski trzech eksporterów i generatora, AST oraz limity UTF-16 są sprawdzone. Zachowano 100 arkuszy, 220 części ZIP, 48 komentarzy i 4982 wcześniejsze wyniki formuł; dodano 12 formuł i 160 porównań do kodu. Symulacje obejmują 24/24/72 h. W 72 h: Ratusz 2, Magazyn 2, 64 osoby, 55 pracowników, 2371 monet, 6 rozbudów i 36 łóżek; 22 prawidłowe odmowy punktów Domu w 143 próbach. Bez twierdzenia o symulacji 50 dni, pomiarze 150 h lub optymalnym graczu. Niedokończona próba 7 dni wyłączona. Artefakt gotowy do publikacji w Git; wynik nowego CI należy sprawdzić w Actions. Gra 37061c/c4, konta, wdrożenia, redakcyjny Excel/MERGE/odciski i archiwum 14 pozostają bez zmian.

## Relacje

- **Zastępuje:** Brak.
- **Zastąpione lub ograniczone przez:** Brak.
- **Powiązane:** [HL-CHG-1142](HL-CHG-1142.md), [HL-CHG-1150](HL-CHG-1150.md)

## Uwagi

- Źródło eksportu e23b jest repozytoryjnym punktem odniesienia, a nie nową publikacją gry. Dokumentacja nie edytuje skoroszytów, raportów ani oryginalnego uploadu.
- Końcowe liczby i SHA-256 pochodzą z raportu PASS. Świeża walidacja ponawia rzeczywiste eksporty modeli i tekstów. Nowy CI należy sprawdzić w Actions po publikacji w Git. Zadanie nie wdraża gry.

[Wróć do rejestru](../CHANGE-REGISTER.md).

<!-- Generated by scripts/build_change_register.py from docs/tracking/changes.json. -->
