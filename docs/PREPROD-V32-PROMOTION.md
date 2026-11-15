# PRE-PROD 0.15.0.0/E0 — wdrożone pliki, ponownie otwarty odbiór funkcji

Status: **wdrożenie plików, obrazu i artefaktówSUCCESS; odbiór działaniaREOPENED_USER_REPORT**. [Dowody](PREPROD-V32-EVIDENCE.json), [nowa naprawa i reset](v32/GO-PREPROD-RULESET-RESET.md).

Źródło `e0aa2ff3f60edeb6a55190ea8b16f0329692b303`: własnyCI43755386000SUCCESS18m30s/31kroków, Pages43755385998SUCCESS19s. StandardowyPRE-PROD43757897657/próba1SUCCESS; gate7s, deployjob132945967090 od20:24:42 do20:27:06UTC,2m24s,31krokówSUCCESS/0fail. To faktycznie wykonana promocjaDEV → PRE-PROD po odłożeniu przez użytkownikaPROD i domeny.

Kontroler sprawdził rzeczywistą zalogowaną istniejącą wyspę z blokadą zapisów, trzy konta/trzy zapisane niepuste światy, sześć odmów obcych i trzy anonimowe403, bez zapisów gry. Niezależny odczytHTTPS potwierdził107plików treści/30742948bajtów i manifest13174bajty; wszystkie106PUBLIC_FILES odpowiadająDEV/E0. Odczytane wnętrze nowegoreceipt, obaZIPy i bieżący weryfikator108plików wiążą dokładny obraz oraz archiwum z publicznymi bajtami. Starsze historyczne niepotwierdzone odczytyreceipt nie są tym samym dowodem.

Te kontrole nie sprawdziły aktywacji nowych funkcji dla starego zapisu. Po zgłoszeniu użytkownika root odtworzył warunekruleset<=31, który pozostawiał staryUI. Powyższe wyniki zachowują autentyczność w swoim zakresie, ale nie oznaczają kompletnego odbioruv32. Nowy odbiór chmurowy musi objąć wszystkie20funkcji,19kart,Teatr i markery przy wznowieniu istniejącego zapisu. Nie deklarujemy, że trzy konta były puste.

APIflag w tymE0receipt jestfalse, tak jak wcześniej. Był to dopuszczony tryb tegoPRE-PROD; nie jest wystarczający do późniejszej promocjiPROD ani żądanego resetu. Nowa naprawa0.15.0.1/cache10 ma własne oczekująceCI, wdrożenie,API i chroniony reset.

Tagi `dev-0.15.0.0-cache9-20261115` oraz `preprod-0.15.0.0-20261115` są niezmiennymi, opublikowanymi i zdalnie potwierdzonymi odniesieniami doE0. Nie przesuwamy ich na poprawkę i nie przepisujemy ich historii jako pełnego odbioru nowych funkcji. PoprzedniePRE-PROD0.14/7e81a1a, jego artefakty i tag pozostają historycznie zachowane. PROD/domena są odłożone; DNSniezmieniony, gryPROD nie opublikowano w tej operacji.
