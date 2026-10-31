# Końcowy odbiór DEV 0.10.0.0, PL

Źródło:`1b3de32869c8164ed8d0b85df7ea743ca76a3719`. [CI41238818669 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41238818669) (5min15s), [Pages41238818743 SUCCESS](https://github.com/ksobczak321-oss/gra/actions/runs/41238818743) (24s). Adnotowany tag `dev-0.10.0.0-pl-20261031` wskazuje ten kod; wcześniejszego tagu nie przesuwano. Cache frontend-v24-2. Bez promocji GCP lub resetu.

Po uzupełnieniu odmów i polskich etykiet ponownie878testów Node PASS,12pakowania PASS; pełne CI wykonuje141kontroliPython i16zestawówChromium. Rzeczywisty scenariusz archipelagu obejmuje odmowy przy12osobach, braku drewna i polskie etykiety kosztów.Wszystkie16końcowych zestawów Chromium ponowiono także lokalnie na identycznym pakiecie:PASS. Ten wynik jest odrębny od potwierdzonego CI.

Pakiet dokładnego SHA:54pliki/10 955 440bajtów. SHA-256archiwum:`78d62aee489b7f8ea529b4a7e7435a430f463dd5fa9b7201e5c2fbe55925d51b`, manifestu:`8c1a4fa8f4c20d94037f647e19009bbe2e8376b406f6e7fb7de1f193cab93174`. Weryfikacja archiwum PASS;53pliki zawartości zgodne bajtowo z końcowym pakietem przeglądarkowym. Techniczny zerowy SHA preflight nie jest źródłem wydania.

Rejestr256zmian/50ręcznych scenariuszy NOT RUN. Native Issues nie publikowano. Realne przelewy, integracja fizyczna online, migracja GCP i reset nie były wykonywane. Poniższy wcześniejszy odbiór351baaf… jest zachowaną historią.

---

# Pierwszy odebrany kandydat DEV 0.10.0.0

Źródło aplikacji: `351baaf6b21386b2f2641875269e6f7d9c2d44fd`. [Commit w Git](https://github.com/ksobczak321-oss/gra/commit/351baaf6b21386b2f2641875269e6f7d9c2d44fd).

| Dowód | Stan |
|---|---|
| Lokalny Node: gra, API, zapis, transakcje i model planszówki | 878 PASS, 0 FAIL |
| Python: infrastruktura, pakowanie, konta i importer | 141 PASS w 11 zestawach |
| Chromium: spakowana gra, logowanie, oba tutoriale, archipelag, pasażerowie, Pomoc, społeczność, dobroczynność i lista QA | 16 zestawów PASS |
| Generatory: zmiany, checklista, dokumenty prawne | wszystkie --check PASS |
| [CI 41237587670](https://github.com/ksobczak321-oss/gra/actions/runs/41237587670) tego SHA | SUCCESS, 4 min 46 s |
| [Pages 41237587641](https://github.com/ksobczak321-oss/gra/actions/runs/41237587641) tego SHA | SUCCESS, 23 s |
| PRE-PROD / PROD / operacje na danych | bez promocji, migracji lub resetu w tym zleceniu |
| Ręczne scenariusze | 50 NOT RUN; TC41 integracji fizycznej BLOCKED |

## Spójny pakiet

Lokalny pakiet dokładnego SHA ma 54 pliki z manifestem, 10 951 651 bajtów. SHA-256 archiwum: `e2d681a91e27266272483254bc43881c1bc4e0ff9cbec892ed9ca72ff711b0eb`; manifestu: `591f68a03550a6aed69374dbe3dd584c8da6d45d6cccb9732d7ac2e2541b102f`. Weryfikacja i ekstrakcja archiwum zakończone sukcesem. Wszystkie 53 pliki zawartości są bajtowo identyczne z pakietem odebranym przez Chromium. Techniczny zerowy SHA użyty przed commitem nie jest dowodem wydania; powyższy pakiet używa już rzeczywistego źródła.

To artefakt odbioru DEV, a nie potwierdzenie GCP ani para artefaktów wymagana do PROD. PRE-PROD nadal ma 0.9.1.2 / `3be1f9d2094f1432acacbb782eed1665fd00e6e1`. Bezpośrednie odczyty `github.io` z tej sesji blokuje brama CONNECT 403; publikację potwierdza ukończony workflow Pages, nie udawany odczyt witryny.

## Materiały fizyczne

[Komplet planszówki](boardgame/README.md): ZIP, plansza A3/A4, 24 karty, pionki, pudełko, instrukcja, QR i przewodnik telefonu. Bez integracji nagród online. [Odbiór plików i scenariusza](boardgame/VALIDATION.md) rozróżnia testy modelu, PDF i przeglądarki od niewykonanego fizycznego testu zabawy, drukarki i składania.

SHA-256 ZIP do wydruku: `d550c63051251afb79abcc4bcb6916b11cc3d08759ec86b5843b910c1c019a0e`.

## Granice i ustawienia

Parametry niepotwierdzone odpowiedzią użytkownika są jawnie oznaczonymi założeniami DEV w [wymaganiach](FRONTEND-V24-REQUIREMENTS.md). Nowe reguły Firestore i schemat archipelagu przygotowano w Git; nie stosowano ich w GCP. Rzeczywista dobroczynność pozostaje wyłączona do autorytatywnej gospodarki, API jako jedynej drogi zapisu oraz faktycznej organizacji, środków i potwierdzeń. Symulacja DEV jest oddzielna i nie przelewa pieniędzy. Uprawnienia ligi są kosmetyczne; proporzec nie jest jeszcze rysowany na mapie. Fizyczne usuwanie danych czatu wymaga konfiguracji TTL; obecne odczyty filtrują historię po jej okresie.

Nieprzesuwany adnotowany tag `dev-0.10.0.0-20261031` wskazuje powyższy kod aplikacji i wiąże źródło, CI/Pages oraz hashe archiwum. Późniejszy commit samych metadanych nie jest nowym kodem gry.
