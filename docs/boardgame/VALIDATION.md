# Odbiór automatyczny prototypu fizycznego

Data: 31 października 2026. Zakres dotyczy wyłącznie materiałów pod `docs/boardgame`, bez API, kont i nagród gry online.

| Kontrola | Wynik |
|---|---|
| `node docs/boardgame/session.test.mjs` | **7 PASS**: dobór różnych scen/aktów, pełne partie 2/4/6 osób, brak drugiego naliczenia ruchu/sceny, limity podpowiedzi i naprawy, pomoc przy wejściu, prawdziwe odwrócenia słów, brak integracji sieciowej w HTML |
| `python3 docs/boardgame/verify_print.py` | **PASS**: rozmiary PDF, liczba stron, osadzone fonty polskie, treść stron, SHA-256 manifestu, zawartość i CRC ZIP |
| `python3 docs/boardgame/verify_phone.py` | **2 PASS scenariusze Chromium**: po 8 rund dla 2 i 6 osób, maskowanie sekretu, podpowiedź, wznowienie po odświeżeniu, punktacja/finał, szerokość telefonu 390 px, brak zewnętrznych żądań sieciowych |
| Podgląd planszy, kart, pionków, wieczka i okładki instrukcji po renderowaniu PDF | **Obejrzany**; poprawiono geometrię narożnych zakładek pudełka, aby były połączone pełnym zgięciem ze ścianką |

Przeglądarka w środowisku wykonawczym blokuje adresy `file://` polityką administratora. Test podaje ten sam samodzielny HTML przez przechwyconą lokalną atrapę HTTPS; nie łączy się z publicznym hostem. Pakiet zawiera cały kod i dane inline. Zgodność otwierania pobranego HTML z konkretną przeglądarką telefonu pozostaje elementem odbioru ręcznego.

QR wygenerowano z jawnym adresem instrukcji oraz czteromodułową białą strefą. **Nie wykonano jeszcze fizycznego skanowania wydruku**. Dostępność adresu GitHub Pages wymaga osobnego sukcesu publikacji Git/Pages; plik i QR nie są dowodem tego wdrożenia.

**Nadal NOT RUN:** rzeczywista partia przy stole dla 2/4/6 osób; pomiar czasu i przyjemności gry; rejestr dupleksu na drukarce; linijka 50 mm; dopasowanie wyciętych kart; składanie i trwałość pudełka; odczyt QR aparatem. Odpowiada im osobny ręczny scenariusz TC50. Automatyczne wyniki nie zamieniają tych prób w PASS.
