# Dziennik implementacji

Każdy wpis powinien podawać wynik zmiany, sposób sprawdzenia oraz stan publikacji. Prace lokalne, wysłanie commita i udana publikacja GitHub Pages są osobnymi zdarzeniami.

## 2026-10-21 — przywrócenie ekranu v1

- Zdiagnozowano `assets/harborlight-v1-approved.jpg`: plik zawierał uszkodzony tekst Base64 zamiast poprawnego obrazu JPEG. Próba dekodowania nie przywracała kompletnego obrazu.
- Użytkownik dostarczył oryginalny PNG 1672×941 przez GitHub. Przeniesiono go do `assets/harborlight-v1-approved.png` bez zmiany zawartości.
- Podłączono poprawny PNG do widoku referencyjnego i warstwowego. Oba obrazy porównano z oryginałem piksel w piksel przy 1672×941; sprawdzono też układy 390×844 i 844×390, bez błędów JavaScript i HTTP.
- Commit `234a0ac` został wysłany do `main`. Workflow GitHub Pages [39647578062](https://github.com/ksobczak321-oss/gra/actions/runs/39647578062) zakończył się statusem Success. Bezpośrednie sprawdzenie hosta Pages ze środowiska było ograniczone przez proxy; sukces publikacji potwierdzono na stronie workflow.

## 2026-10-21 — klikalna wyspa i gospodarka

Status: implementacja, weryfikacja i publikacja interaktywnej piaskownicy zakończone.

- Dodano warstwę przycisków nad zaakceptowanym ekranem, dialogi i aktualizowane liczniki HUD. Obsłużono menu, nawigację, zasoby, mieszkańców, zegar, cel latarni, dzielnice i dolny dok.
- Oddzielono reguły gry do `harborlight-v1-state.js`: produkcja, pracownicy, ulepszenia, przetwarzanie, handel, zadania, dostawy, naprawa latarni, dekoracje i ścieżki.
- Dodano trzy plansze ekspedycji z narzędziami, skrzyniami i jednorazowymi nagrodami. Skrzynie dają bonus monet przy pierwszym ukończeniu.
- Dodano zapis `harborlight-v1-interactive-save`, normalizację danych, ograniczenia gospodarki oraz potwierdzenie resetu.
- Sprawdzenia: 9 testów silnika zaliczonych; 51 środków obszarów kliknięć trafia w odpowiadające przyciski; 29 przejść do paneli sprawdzono przy 1672×941, 390×844 i 844×390. Dialogi mieszczą się w ekranie, bez poziomego przepełnienia i bez błędów JavaScript.
- W przeglądarce zaliczono przebieg: odbiór produkcji → rozbudowa domu → nagroda za zadanie → handel → naprawa latarni → pierwsza ekspedycja → odświeżenie i zachowany zapis.
- Dodano i wykonano `tests/harborlight-browser-smoke.py`: zaliczono wszystkie trzy ekspedycje przez rzeczywiste ruchy z narzędziami i premiami za skrzynie, aktualizację produkcji bez ponownego otwierania panelu, 29 tras dialogów w trzech rozmiarach ekranu, menu mobilne oraz brak błędów JavaScript i HTTP. Test używa świeżej sesji i nie wywołuje wewnętrznych akcji gry zamiast kliknięć.
- Po przeglądzie poprawiono odświeżanie liczników produkcji i zachowanie fokusu oraz dodano niepomniejszane menu na telefonie. Ograniczenie ruchu respektuje ustawienie użytkownika.
- Dodano widoczne oznaczenia nowych poziomów budynków, dekoracje SVG, ulepszone ścieżki i światło naprawionej latarni. Bazowa grafika wyspy pozostaje zaakceptowanym obrazem.
- Commit [`3da64c8`](https://github.com/ksobczak321-oss/gra/commit/3da64c87f2810f804da0f054f18731b73de43b6a) wysłano do `main`. Publikacja [39650146663](https://github.com/ksobczak321-oss/gra/actions/runs/39650146663) zakończyła się statusem Success.
- [Publiczną piaskownicę](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?v=3da64c8) sprawdzono po publikacji w Chromium: HTTP 200, załadowany PNG, 51 kontrolek, działające menu i lista trzech ekspedycji, bez błędów JavaScript ani HTTP. Postęp pozostaje lokalny w przeglądarce; reset jest dostępny w ustawieniach.

## 2026-10-21 — dokumentacja i plan Frontend / Backend

- Zaktualizowano README z kierunku BLACKOUT na aktywny projekt HARBORLIGHT, dodając sposób uruchamiania, testy i dokumentację.
- Dodano [opis interaktywnej wyspy](INTERACTIVE-ISLAND.md), ten dziennik i [backlog](BACKLOG.md) z zadaniami oraz kryteriami odbioru dla milestone’ów Frontend i Backend.
- Potwierdzono istniejące milestone’y: [frontend #3](https://github.com/ksobczak321-oss/gra/milestone/3) i [backend #4](https://github.com/ksobczak321-oss/gra/milestone/4). Przygotowano po cztery zadania z kryteriami odbioru.
- Początkowa próba dostępu do API GitHub w sandboxie otrzymała proxy 403. Obsługiwane rozszerzenie uprawnień narzędzia pozwoliło odczytać API z istniejącym uwierzytelnianiem, bez nowego tokenu. Dodatki domen `api.github.com` i `ksobczak321-oss.github.io` zapisano również w szkicu konfiguracji środowiska; szkic nie jest równoznaczny z aktywacją sieci ani publikacją środowiska.

- Potwierdzono utworzenie i przypisanie zgłoszeń: Frontend [#7](https://github.com/ksobczak321-oss/gra/issues/7), [#8](https://github.com/ksobczak321-oss/gra/issues/8), [#9](https://github.com/ksobczak321-oss/gra/issues/9), [#10](https://github.com/ksobczak321-oss/gra/issues/10) w milestone `frontend #3`; Backend [#11](https://github.com/ksobczak321-oss/gra/issues/11), [#12](https://github.com/ksobczak321-oss/gra/issues/12), [#13](https://github.com/ksobczak321-oss/gra/issues/13), [#14](https://github.com/ksobczak321-oss/gra/issues/14) w `backend #4`.
- Zgłoszenie FE-01 / #7 zamknięto jako completed z [dowodami testów i publikacji](https://github.com/ksobczak321-oss/gra/issues/7#issuecomment-6323171303). Pozostałe siedem zgłoszeń pozostaje otwartych. Backend jest planem prac, nie działającą usługą tej wersji.
