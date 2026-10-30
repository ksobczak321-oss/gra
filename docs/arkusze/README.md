# Arkusz zasad HARBORLIGHT

Bieżący plik: **[HARBORLIGHT11-zasady.xlsx](HARBORLIGHT11-zasady.xlsx)**. Obejmuje zatwierdzone reguły **v18**, stan potwierdzonego PRE-PROD oraz osobno oznaczony nowy zakres DEV: bezpośrednie wylogowanie i robocze dokumenty rejestracji.

[Pobierz Excel 11 z repozytorium](https://github.com/ksobczak321-oss/gra/raw/refs/heads/main/docs/arkusze/HARBORLIGHT11-zasady.xlsx) — po synchronizacji zmian z Gitem. Jeżeli GitHub pokazuje stronę pliku, wybierz **Download raw file**. Plik można otworzyć w Excelu lub LibreOffice Calc i zaimportować do Arkuszy Google.

## Pięć widocznych zakładek

| Zakładka | Zawartość |
|---|---|
| Jak działa gra v11 | Aktualne zasady v18, granice integracji, nowy zakres DEV i wszystkie 25 rzeczywistych działań samouczka |
| Budynki v11 | 12 budynków: cel, obsada, korzyść, koszt, osobny czas transportu/budowania i ważne wyjątki |
| Do decyzji v11 | Stan publikacji, jawne parametry projektu i rzeczy wymagające konfiguracji; bez ponownego otwierania ustalonych kwot lojalności |
| Kalkulator v11 | Niebieskie wejścia: produkcja, transport, ograniczenie Magazynu L24, bonusowy zapas, demografia, minigry, uprawnienie bez reklam, Kaplica i czas nieobecności |
| Testy v11 | 155 filtrowalnych scenariuszy ręcznych z warunkami, krokami, oczekiwanym wynikiem i polem wyniku |

Wszystkie **59 zakładek Excela 10**, ich formuły, zapisane wyniki i **48 komentarzy źródłowych** pozostały nienaruszonym ukrytym archiwum. Ich dawne zasady nie mają pierwszeństwa przed v11. Ukryte zakładki można wyświetlić przez **Odkryj arkusz / Unhide**. Nowe ukryte `Kontrole v11` i `Źródła v11` dokumentują wartości odczytane z eksportów kodu oraz kontrolę kalkulatora.

## Najważniejsze różnice wobec Excela 10

- Nowa wyspa ma bazowe 20% szczęścia i minimum 20% przez 72 h dla wszystkich; wymuszone 100% ma pierwszeństwo. Dodatni przyrost populacji jest dwukrotnie szybszy, odejścia pozostają bez przyspieszenia.
- Produkcja, podatki i szybkość przewozu mają ×2 przez pięć minut od rzeczywistego działania, następnie ×1 i dopiero po 48 h bez grania ×0,5. Nieobecność rozliczamy przedziałami; jedzenie i zegary świata biegną normalnie.
- Nagrody materiałowe są od razu wydawalne i nie zajmują limitu zwykłych dostaw. Przepełnienie blokuje kolejne skrzynie/podwojenia, a nie pomoc do Ratusza ani zarządzanie wyspą. Po L24 Magazyn zwiększa tylko obsadę.
- 25 kroków wymaga prawdziwych działań. Materiały do piątego kroku oraz skrzynie 100–300 pięciu materiałów nie są lojalnością; ta daje teraz 50–200 każdego z sześciu zasobów raz na dzień Warszawy.
- Gracz wybiera minigrę; rundy nominalnie dodają 50, 100, 200, 400…, czyli pula wynosi 50, 150, 350, 750…. Dodatkowy czas kupuje się dobrowolnie przed końcem; obecne ceny i limity są jawną konfiguracją.
- Darmowe błogosławieństwo odnawia się o północy Warszawy, bez kumulowania. Od Kaplicy 3 okres opieki to `3 + poziom`, a zagrożenie losujemy po dalszych 6–15 dniach; wraki respektują ochronę Latarni.
- Zapis konta jest wyłącznie w chmurze; brak internetu lub konflikt nie tworzy lokalnej wyspy. Wdrożenie zachowuje konta i wyspy `admin1`–`admin3`; testy destrukcyjne dotyczą jedynie fikstur lub wydzielonych kont.
- Paynow i reklamy w DEV/PRE-PROD są oznaczoną symulacją. OAuth, rzeczywiste potwierdzenia płatności/reklam, globalne kody i retencja wymagają rzeczywistej konfiguracji, nie samej obecności kodu.

## Scenariusze testów

Ten sam zestaw jest dostępny jako [Markdown](../TEST-SCENARIOS-v18.md), [CSV dla polskiego Excela](../TEST-SCENARIOS-v18.csv) i [JSON](../test-scenarios-v18.json). CSV ma UTF-8 z BOM, separator średnikowy i wielowierszowe kroki.

**155 scenariuszy to plan testów, nie raport ich wykonania.** Wszystkie zaczynają ze stanem `Nie wykonano`; nie przypisano im historycznych wyników testów automatycznych. W arkuszu można wybrać `PASS`, `FAIL` lub `Zablokowany` dopiero po rzeczywistym odbiorze. Nowe rejestracje i wylogowanie są oznaczone jako zakres do osobnego odbioru.

`admin1` sprawdzamy odczytowo. `admin2` i `admin3` również są trwałymi kontami i nie są przeznaczone do kasowania danych. Scenariusze zmieniające czas, zasoby, retencję, płatności lub reguły bezpieczeństwa wymagają lokalnej fikstury albo wyraźnie wydzielonego środowiska testowego.

## Co jest faktycznie opublikowane

Potwierdzony PRE-PROD to **v18 / `6ec3c6d`**, [udane wdrożenie 41112673285](https://github.com/ksobczak321-oss/gra/actions/runs/41112673285), gra **https://harborlight-dev.web.app**. Kolejna partia zmian w tej przestrzeni nie jest automatycznie częścią tamtej publikacji. Arkusz nie oznacza opublikowania PROD, aktywacji wszystkich dostawców ani pobierania prawdziwych opłat.

Końcowe żądanie właściciela to miesięczny budżet alertowy **100 USD**, łącznie dla `harborlight-dev` i `harborlight-prod`. Przygotowanie planu w DEV nie potwierdza zastosowania konfiguracji GCP. Kalkulator pokazuje jedynie przykład przeliczenia 100 USD × 4 PLN/USD = około 400 PLN, bez gwarantowanego kursu i bez odczytu faktycznych kosztów. Standardowy budżet GCP sam w sobie nie odcina usług ani nie ogranicza faktury; bieżące naliczenia właściciel sprawdza prywatnie.

Regulamin i polityka prywatności są robocze, z placeholderem operatora `Loremipsum`, do uzupełnienia i przeglądu. Wymagane potwierdzenie zapoznania się z polityką prywatności nie jest wymuszoną zgodą RODO na konieczne przetwarzanie.

## Odtworzenie i walidacja

Skrypt: [scripts/build_workbook_v11.py](../../scripts/build_workbook_v11.py). Wymaga `openpyxl`, `lxml` i Node.js.

```sh
python3 scripts/build_workbook_v11.py
python3 scripts/build_workbook_v11.py --validate-only
```

Generator czyta parametry i lekcje z eksportów modułów gry. Nowe formuły mają sprawdzone zapisane wyniki początkowe; Excel przelicza je po zmianie wejść. **Nie uruchamiano LibreOffice ani nie przypisano mu przeliczenia nowej wersji.** Generator kopiuje historyczne części OOXML bajt w bajt, dlatego nie usuwa 3866 starych wyników formuł ani komentarzy przy zapisie nowego pliku.

Szczegółowy wynik: [HARBORLIGHT11-walidacja.json](HARBORLIGHT11-walidacja.json). Walidacja sprawdza integralność ZIP, wszystkie stare zakładki i komentarze, stare cache formuł, nowe cache i kontrole TRUE, próbki wzorów wobec rzeczywistych eksportów kodu, 25 lekcji i komplet scenariuszy. Wynik lokalny nie jest potwierdzeniem publicznego pobrania pliku.

Archiwa pozostają bez nadpisywania: [Excel 10](HARBORLIGHT10-zasady.xlsx), [Excel 9](HARBORLIGHT9-zasady.xlsx), [Excel 8](HARBORLIGHT8-zasady.xlsx), [Excel 7](HARBORLIGHT7-zasady.xlsx). Historia i dowody wdrożeń są w [dzienniku](../IMPLEMENTATION-LOG.md).
