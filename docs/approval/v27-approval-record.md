# DEV v27 — źródła akceptacji tekstów i nowego GO

Data użytkownika: **1 listopada 2026, Europe/Warsaw**. Wiadomość zatwierdzająca: **„tu masz z drobnymi poprawkami; GO”**. Dokument archiwizuje materiały wejściowe; nie dowodzi implementacji, testów ani publikacji.

| Źródło zapisane bez zmiany bajtów | Bajty | SHA-256 |
|---|---:|---|
| [v27-proposed-copy.pl.md](v27-proposed-copy.pl.md) | 37766 | `4f2c5aec3040227a660706217faa2ecc63ef21a87efcf648cb6e8e5a22314e2e` |
| [v27-user-edits.pl.md](v27-user-edits.pl.md) | 15335 | `5b4d4bf95226fbb154c62037b36d33ab7e4275c954207274e70b8a0c990ca572` |

Pełny projekt powstał przed GO. Poprawiona wklejka użytkownika nadpisuje odpowiednie fragmenty tego projektu i dodaje dwie reguły mechaniczne: mieszkania oraz rzeczywiste dane gracza w opisie zasobów. Oba pliki pozostają migawkami źródła — również ich historyczne zdania „przed GO” i „bez zmiany kodu” są treścią przesłanego dokumentu, a nie aktualnym statusem zadania.

## Złożenie wersji do wdrożenia

1. Obowiązują poprawione fragmenty N1–T33 z wklejki użytkownika. Wcześniejsze ustalenie „brak nowego tekstu oznacza akceptację dotychczasowego” zachowuje nieprzepisane S/K/M/P/R i pozostałe zaakceptowane wymagania z rozmowy.
2. Wklejka zawiera dwa nagłówki T10. Pierwszy ponownie przytacza zegar T9; drugi zawiera właściwy opis misji. Traktujemy pierwszy jako przypadkowe powtórzenie: T9 opisuje czas, T10 zadania. Tutorial ma 34 odrębne kroki.
3. Nagłówek T34 jest pusty. Zachowujemy opis Menu wyspy z pełnego projektu; pusty nagłówek nie jest poleceniem usunięcia kroku.
4. Dopiski w nawiasach kwadratowych są wymaganiami: nie stają się tekstem wyświetlanym graczowi. Dotyczy to reguły 48 mieszkańców/24 łóżek i rzeczywistych wartości zasobów.
5. Usunięcie liczby 100% z jednego zdania N2 nie wycofuje pozostałych przyjętych komunikatów o rzeczywistym efekcie Latarni. Sama redakcja nie zmienia czasu ani wartości jej premii.
6. Zmiana nazwy/tekstu nie resetuje UID, historii lekcji, nagród, aktywnych wysp, rozpoczętych rejsów i budów.

## Zakres i decyzje

Bieżące wymagania i rozdzielenie decyzji od parametrów wykonawczych: [FRONTEND-V27-REQUIREMENTS.md](../FRONTEND-V27-REQUIREMENTS.md). DEV oznacza 0.11.0.0/v27. GO obejmuje DEV i jego normalny Git/CI/Pages, bez promocji PRE-PROD/PROD lub resetu kont. Wcześniejsze wydanie 0.10.2.0 i jego testy pozostają historycznym punktem odniesienia, nie odbiorem tego zakresu.
