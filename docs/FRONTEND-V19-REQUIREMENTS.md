# HARBORLIGHT — uzupełnienie v19

Zlecenie użytkownika z 30 października 2026 r., po udanym PRE-PROD v18 (`6ec3c6d`, przebieg `41112673285`). Reguły gospodarki i rozstrzygnięcia v18 pozostają zgodne z [kanonicznym zakresem](FRONTEND-V18-REQUIREMENTS.md).

- Bezpośredni, wyraźny przycisk wylogowania w Ustawieniach, PL/EN, z użyciem istniejącego zapisu chmurowego i bez resetowania wyspy. Dokumenty gry dostępne również z Ustawień.
- Roboczy regulamin i polityka prywatności odpowiadają rzeczywistym funkcjom. Użytkownik polecił wpisać „Lorem ipsum” w dane operatora i uzupełnić je później. Dokumenty pozostają oznaczone jako wersje robocze, bez twierdzenia o gotowości do komercyjnej publikacji.
- Podczas rejestracji obowiązkowe są dwa osobne, niezaznaczone domyślnie potwierdzenia: akceptacja regulaminu oraz zapoznanie się z polityką prywatności. Drugie nie jest wymuszoną zgodą na marketing ani na przetwarzanie niezbędne do realizacji usługi.
- Wersje dokumentów, UID i czas potwierdzenia są zapisywane przez uwierzytelniony serwer. Utworzenie nowej wyspy produkcyjnej wymaga potwierdzenia; dotyczy to także nowej tożsamości przez Google/Facebook. Istniejąca wyspa i konta PRE-PROD nie są resetowane ani poddane ponownej rejestracji. Pierwszą wyspę tworzy wyłącznie serwer, nie klient przez PUT.
- Kolejna wersja arkusza to HARBORLIGHT11; obejmuje aktualne zasady, jawne parametry, statusy i scenariusze testowe. Nie nadpisujemy starszych plików.
- Budżet chmury: końcowa dyspozycja to **100 USD miesięcznie**, alertowo łącznie dla projektów PRE-PROD i PROD. Kwota odpowiada walucie konta i nie jest automatycznie przeliczana na PLN. Progi 50/75/90/100 USD. Standardowy budżet alertowy nie jest twardym limitem całej faktury; ograniczone Spend Cap wymaga osobnej weryfikacji zakresu usług. Skrypt właściciela jest odczytowy domyślnie, uzgadnia konfigurację tylko przy --apply i potwierdza ją odczytem z Google. Nie wyłącza rozliczeń, nie zatrzymuje gry i nie kasuje danych. Nie potwierdzono wykonania tej konfiguracji w chmurze.
- Muzyka: przygotować poradnik zakupu licencji do gry; bez zakupu i bez dodawania nagrań na tym etapie. Informacje o finansowaniu działalności są osobną notatką, nie zmianą mechaniki gry.

Dostarczenie nadal przebiega DEV → Git/CI → PRE-PROD → PROD. Opublikowanie dokumentów w repozytorium nie jest wdrożeniem gry ani aktywacją dostawców logowania/płatności/reklam.
