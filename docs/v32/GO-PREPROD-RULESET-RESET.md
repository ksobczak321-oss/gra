# Naprawa UI starych wysp i reset trzech kont PRE-PROD

Status: **DEV i PRE-PROD0.15.0.1 odebrane; reset RESET_SUCCESS_INDEPENDENTLY_VERIFIED**. Cache `frontend-v32-11`. BugHL-CHG-1152 i OpsHL-CHG-1153; [dowody](PREPROD-RULESET-RESET-EVIDENCE.json).

PRE-PROD **0.15.0.1 / frontend-v32-11** jest wdrożony i przeszedł rzeczywisty odbiór zalogowanej gry. Aplikacja `27f3ea4f08474329108724c68c97c340ecaa1914`, publikacja `86eb8d9a40dab073c17a1b0f96dca38f1a15e24c`. Własny CI43766275390 SUCCESS26m17s (32 kroki SUCCESS, 0 failed, 2 pominięte diagnostyki) i Pages43766275430 SUCCESS18s. Standardowy PRE-PROD43768861718/próba1 SUCCESS: gate8s, deploy22:21:58–22:24:10UTC, 2m12s, 31 kroków SUCCESS/0 failed/1 pominięta diagnostyka.

Natywny odbiór hostowanej gry z rzeczywistym logowaniem PASS26s: 108 dokładnych hashy zasobów, reguły32, 20 funkcji mapy, 7 markerów nowych budynków, 4 nakładki grafiki, 19 kart (Administracja9/Gospodarka10), 21 ikon produktów, natywny Teatr, ciemne wyrównane menu i odsłonięty statek. Potwierdzono3 istniejące konta i3 niepuste zapisy, 0 pustych; 6 obcych i3 anonimowe odczyty odrzucone, 3 odczyty API zalogowanych kont PASS i3 anonimowe API401. Testy nie zapisywały wysp. Niezależny HTTPS potwierdził źródło86, wersję0.15.0.1 i config200 z accountAPI=true oraz `resetFence: community-profile-v1`.

Oba oryginalne ZIP-y pobrano i sprawdzono względem rozmiaru/SHA256 GitHub. Rzeczywisty wewnętrzny receiptv2 odczytano i zwalidowano: wszystkie4 checks=true; rygorystyczny weryfikator archiwum109 plików PASS. Pełny niezależny audyt HTTPS/TLS PASS: 108 plików treści/30 754 604 bajty oraz manifest, łącznie109 plików, są identyczne z niezmiennym archiwum; treść odpowiada źródłu86 i aplikacji27f. Tag `preprod-0.15.0.1-20261115` jest opublikowany i zdalnie potwierdzony: obiekt `446347dab79ebc3e8c088d6d257adbdcd0f5f6e4` →86. Bezpieczny raport: [audyt artefaktów i hostingu](PREPROD-CACHE11-ARTIFACT-AUDIT.json). TagDEV `dev-0.15.0.1-20261115` jest opublikowany i zdalnie potwierdzony: obiekt `1d7997a0074f0f34229807f0092aec808e716783` →86.

**Reset admin1–3 pozostaje NOT_EXECUTED.** Zachowano loginy, hasła, UID i dotychczasowy postęp. W tej sesji brak właścicielskiego GCPADC; chroniony reset wymaga zalogowanego CloudShell właściciela, blokady bezpośrednich zapisów i minimum10min propagacji. Dokładne polecenie z pięcioma zweryfikowanymi argumentami jest w [procedurze resetu](../PREPROD-RESET.md). Grant runtime ma status OWNER_REPORTED_APPLIED bez niezależnego odczytu IAM; skuteczne odczyty API potwierdzono osobno. PROD i domena pozostają odłożone. Historyczne E0 REOPENED_USER_REPORT, nieudany b268 oraz opcjonalny late-food UI INCOMPLETE pozostają zapisane; ręczny odbiór użytkownika NOT_RUN.

## Wynik resetu16listopada — niezależny odczyt PASS

Reset właścicielski dla run43768861718/źródła **86eb8d9** jest **RESET_SUCCESS_INDEPENDENTLY_VERIFIED**. Niezależny odczyt16listopada09:41:42UTC z normalną weryfikacjąTLS potwierdził3 logowania z właściwymi UID, generację2 każdego konta, expired=false i island=null; trzy bezpośrednie odczyty własnegoFirestore odmówione403. ConfigAPI200 potwierdza accountAPI=true, projectharborlight-dev, environmentpreprod i resetFencecommunity-profile-v1. Audyt nie zapisał danych ani nie tworzył wysp. Nie powtarzać resetu. Przeszkoda trwającego resetu jest zamknięta; nowy PRE-PROD nadal wymaga odebranego nowegoDEV i własnych dowodów. Bezpośrednio po resecie3wyspy były puste; obecnie admin1 ma grę utworzoną przez właściciela i niezależnie potwierdzoną10:21:40UTC. Warunek istnienia świata jest spełniony, nowy natywny odbiór wdrożonegoUI pozostaje oczekujący, bez tworzenia świata przezQA.

[Dowód odczytu](PREPROD-RESET-INDEPENDENT-READ.json). Starsze statusy NOT_EXECUTED lub OWNER_REPORTED opisują checkpointy przed tym audytem.

## Zakres i historia przygotowania

Poniższe checkpointy zachowują stan w chwili ich zapisu; bieżący status podano powyżej.

Użytkownik odłożyłPROD oraz domenę i zlecił bezpośrednieDEV → PRE-PROD. Po zauważeniu staregoUI zażądał naprawy i resetu wszystkich trzech kontPRE-PROD, z zachowaniem loginów, haseł iUID. Zastępuje to wcześniejszy warunek „PROD najpierw”. Nowy reset jest osobną jawną operacją; naprawa odczytu lub migracja nie może samoczynnie zerować postępu.

## Co wykryto po wdrożeniu E0

E0/0.15.0.0 ma potwierdzone rzeczywiste wdrożenie plików i obrazu oraz niezmienne tagi, ale jego odbiór działania został ponownie otwarty. Użytkownik widział stary układ wyspy, dawnyTeatr, brak siedmiu nowych budynków i siedem zamiast dziewięciu kartAdministracji. Źródłem był warunekreguł: istniejący lub świeży świat chmurowy zruleset<=31 pozostawał w starymUI mimo nowych plików. Dotychczasowy smoke logowania sprawdzał podstawy i nie obejmował tych wymagań.

Lokalny odbiór starego31 odtworzył błądRED wFirestoreCAS iAPI. Po poprawce oba wejścia dałyGREEN:20funkcji mapy,19kart, natywnyTeatr oraz wszystkie markery. Oba wejścia chmurowe mają stosować aktualne reguły prezentacji bez zmiany UID, zasobów, poziomów i istniejącego postępu. Oddzielny autoryzowany reset nastąpi dopiero później.

## Fabryka nowej wyspy

Nowy start serwera jest zgodny z frontendem: schema9/ruleset32,18osób przedintro, pojemność36 i szczęście20; po100monet/drewna/kamienia/zboża/desek/warzyw, legacyfood0, bankDomu18 i dwa zapasowe ubrania cywilne. Jednorazowa nagroda nazwanego oprowadzania zgodnie z istniejącym działaniem daje19.osobę. Specjaliści nie powstają przed swoim odblokowaniem. Próba utworzenia jużistniejącej wyspy nadal daje409, bez nadpisania.

Fabryka jest ograniczona do oficjalnych projektów. Zablokowany producent poziomu0 nie jest pokazywany jako pełny magazyn0/0 i nie emitujeundefined; rzeczywiste zapełnienie działającego budynku nadal daje właściwy komunikat. Lokalne wyniki: backend138/138, pakietDocker2/2 i testy migracji/logistyki/świata50/50PASS. Nie są to dowody nowegoCI ani zastosowania zmian w chmurze.

## Warunki i kolejność resetu

1. Odebrać nowe0.15.0.1: własny pełnyCI, standardowe wdrożeniePRE-PROD i zgodne źródło/obraz/manifest/receipt. Sprawdzić rzeczywiste wznowienie starego zapisu i nowyUI, nie tylko gościnny świeżyfixture.
2. Potwierdzić aktywneAPI kont i trwałość oraz wymagane `roles/datastore.user` tożsamości runtime w technicznym projekciePRE-PROD `harborlight-dev`. Właściciel zgłosiłSUCCESS minimalnego grantu roles/datastore.user:OWNER_REPORTED_APPLIED. Nie wykonano niezależnego odczytuIAM; nie jest to dowód działaniaAPI lub gotowości resetu. Następnyworkflow ma utrzymywaćAPI włączone także po resecie. GHenv403 nie jest dowodem ustawienia flagi.
3. Zachować prywatne kopie trzech istniejących zapisów. Są trzy konta i trzy niepuste wyspy; nie ma podstaw do stwierdzenia, że kont lub zapisów było zero. Kopie przed resetem są już zabezpieczone.
4. Zablokować bezpośrednie zapisy klienta, potwierdzić reguły i odczekać co najmniej10minut propagacji. Zapisać rzeczywiste dowody czasu; nie uznawać samego uruchomienia polecenia za spełnienie warunku.
5. Wykonać chroniony reset wyłącznie trzech kontPRE-PROD zgodnie z narzędziem i nowym, zgodnymreceipt zAPIwłączonym. Zachować użytkownikówAuthentication,UID,loginy ihasła. Źródłem świeżych wysp ma być bieżąca fabryka32, nie historyczny start12osób.
6. Odczytać wszystkie trzy zapisane wyniki i sprawdzić nowyUI,18osób przedintro oraz19po jednorazowym prezencie, rzeczywistą trwałość, własność zapisów i odmowy dostępu obcym/anonimowym. Dopiero wtedy oznaczyć reset i odbiór jako wykonane.

AktualnieAPI/grant/lock/propagacja/reset i noweCI/wdrożenie pozostająPENDING. DotychczasowyE0receipt zAPIfalse nie wystarcza do tej operacji. Żadnego dodatkowego potwierdzenia zamiaru resetu nie wymaga się poza jużudzielonymGO; wymagane są faktyczne warunki techniczne.

## Granice

PROD i domena są odłożone. Nie publikujemy gryPROD ani nie zmieniamyDNS. Niezmienne tagiE0 i historycznyPRE-PROD0.14 zostają zachowane; poprawka wymaga nowego własnego źródła i odbioru. Opcjonalne modele sera, otrębów/paszy i reklam pozostają poza nieuzgodnionymi zmianami. Dokumentacja nie zmienia MERGE, arkuszy ani raportów ich fingerprintów.

Dalsza konieczna zgodnośćAPI obejmuje istniejący wspólny portfelmatki: statek,kupony,Pomagam i nagrody ligi oraz odmowę zakupu statku przez córkę i trwałość po przeładowaniu. Poprawiane są też etykiety pojemności32=36 i limituobsady zależnego od produktów. c6c4f40 oraz jego arkusz są lokalnym checkpointem; końcowy kandydat, testy i odciski źródeł wymagają nowego potwierdzenia. Te dodatkowe sprawdzenia nie są jeszcze oznaczonePASS.

## Końcowe źródło lokalne — 1f19045

Aplikacja `1f1904587608f87ffbd2c7eed20d7749106dfc1f` jest zaimplementowana, lecz nie ma jeszcze własnej publikacji/CI/wdrożenia/resetu. Backend149/149 obejmuje3rzeczywiste przypadki handlu32:jednorazową sprzedaż ubrań,obciążenie portfelamatki dla córki oraz zachowanie wieku mleka86400. PakietDocker2/2 i stagingtrzech kanonicznychJS,PASS; walletcheckpoint146 i4przypadkibrowserastatku,PASS. Clouddev-game18→19,legacysettingsfixture12→21 z zachowaniem fundatorów,onboarding/zasoby/zera/ziarno oraz9housingPASS. v21browser nadaloczekuje.

NowyExcel6/413/Cpusta odświeżono zeźródła1f; SHA256 `b9d6e1d308bea38f30750c8a86300584c706e944fe5ebbd0b5ea12fcaa0b21ea`, zgłoszony odcisk źródłowy zaczyna się1cc30fff. To aktualizacja metadanych dowodów; dokumentacja nie zmienia arkusza ani raportu. Pozostałe bramki chmurowe i reset nadalPENDING.

Końcowycore/reset `af8989f21598ee9df98bcc46e391132ecf22b12b` ma lokalniefrontend1410/1410,backend155/155,resetPython20/20,pakietDocker2 i wszystkiecloudbrowser wtym v21PASS. Frontend iExcel pozostajązeźródła1f. Reset obejmuje tylko perUIDcommunity/mechanicalzero-wallet z zachowaniem tożsamości/blocked/muted; każdy shared/global/financial/externaltrade link blokuje operację. Epoch/mutationRevision/CAS oraz deployed `resetFence:community-profile-v1` są wymagane; idempotentny ten sam receipt nie dotyka nowego postępu. RzeczywistyCI/deploy/reset nadalPENDING,0resetwrites.

Bieżący końcowy kandydat to `27f3ea4f08474329108724c68c97c340ecaa1914`,0.15.0.1/cachefrontend-v32-11.93/93kierunkowych(incl5nowychregresji),syntax/imports,Docker2+canonical3JSstagePASS. Wymaganyklaster6cloudcallers maPASS na zamrożonym27f we właściwych zakresach. OpcjonalnylatefoodUI pozostałINCOMPLETE: modelclaimfood25/flour0+receiptPASS, popupworkerów zablokował pełnytile/reload; brak pełnego desktop/mobileUIproof, testpoza repo i bez wpisuCI. Arkusz6/413/Cpusta z96odciskami ma źródło27f,SHAe9119fec20af9ec6a4de5b6bea2cc4a099bb5eb12eb054118a61feba98a30d03,odcisk23b3b855… . Żadnego nowegoCI,wdrożenia lub resetu jeszcze nie wykonano; b268FAILURE pozostaje historią.

DEV poprawki jest opublikowany: aplikacja27f, publikacja `86eb8d9a40dab073c17a1b0f96dca38f1a15e24c`, własnyCI43766275390SUCCESS26m17s (32SUCCESS/0FAIL/2pominiętediagnostyki), Pages43766275430SUCCESS18s.46programówfrontendbrowser18m17s iDEVcloud4m17sPASS. Tag `dev-0.15.0.1-20261115` opublikowany i zdalniepotwierdzony: obiekt1d7997a0074f0f34229807f0092aec808e716783→86. JednorazowyPREPRODdispatch43768861718 o22:21:43UTC jest w toku i ma źródło86; nie ma jeszcze dowodu nowego wdrożenia/receiptu/hostingu. Reset **NOT_EXECUTED**: właścicielskiCloudShell nadal wymagany, lokalnegoADC brak; konkretne5argumentowe polecenie można związać dopiero z nowymi sprawdzonymi artefaktami. PROD/domena odłożone, stareFAILURE iE0REOPENED zachowane.
