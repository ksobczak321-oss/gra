# Usunięcie starej mapy i HUD podczas uruchamiania

## Odebrane DEV i PRE-PROD0.15.0.2 — 16listopada2026

**DEV i PRE-PROD0.15.0.2/cache `frontend-v32-13` są odebrane.** Aplikacja `37061c43139f32dfba61e4d837b133ed9d2d7da8`, źródło publikacji i wdrożenia `c4f752142c0421aad1dc0490a2f5139c277e6ee5`. Usunięto przebłysk starej mapy/HUD przy starcie oraz wdrożono tempo1×/2×/6× wyłącznie dlaadmin3. Własny CI43850690541 **SUCCESS24m31s**:1437frontend+170backend+7physical=1614Node,166Python oraz **66 programówChromium (48+18)**, obie grupyPASS. Liczba65 pomijała osobnyLiveCAS i nie jest końcowym wynikiem.

Pages43850690456 SUCCESS22s/job17s;108plików wejścia/źródeł i30 774 724bajty zgodne przezHTTPS/TLS. Pobrane publiczne bajty uruchomiono lokalnie wChrome1440/390 PASS jako odtworzenie transportu; nie deklarujemy natywnego odbioruHTTPS wprzeglądarceDEV. StandardowyPRE-PROD43854387444/próba1 **SUCCESS2m22s**: gate12s/7kroków, deploy2m03s/31SUCCESS+1pominięta diagnostyka. Natywny odbiór rzeczywistej zalogowanej istniejącej wyspy PASS108dokładnychhashy; wszystkie zapisy przeglądarkowe zablokowane.

Odczyt kont:3Auth/3API,1istniejąca wyspa i2puste,6obcych+3anonimoweFirestore odmowy,3własne bezpośrednieFirestore403 i3anonimoweAPI odmowy. Niezależny audyt zegara11:07UTC z normalnymTLS potwierdził admin1/admin2 GETclock403 oraz admin3 GET200/rate1/generation2/canSetRate=true/canAdvance=false. Zachowano generacje2 i świat schema9/rules32; nie zmieniano tempa lub gry i nie inicjalizowano pustych wysp. Sekwencję1×/2×/6× sprawdzono wcześniej na rzeczywistym lokalnym runtime i izolowanymAPI; audyt publiczny był wyłącznie odczytowy.

Oba oryginalneZIP-y zweryfikowano po rozmiarze/SHA256. Rzeczywisty receiptv2 ma walidacjęPASS i wszystkie4checks=true; rygorystyczne archiwum109PASS. NiezależnyTLS o11:09UTC potwierdził wszystkie109plików/30 781 978bajtów identyczne z oryginalnym archiwum i źródłem. Oba niezmienne tagi są opublikowane i zdalnie potwierdzone na c4: DEV `dev-0.15.0.2-20261116`, obiekt `9b07b4dd74f2e4dabda6e4eaf361832f411cb506`; PRE-PROD `preprod-0.15.0.2-20261116`, obiekt `9ff02b5d158485dfb955572e6a7d8b6e29d34cf2`.

**To wdrożenie nie resetowało kont.** Wcześniejszy reset pozostaje zakończony i niezależnie potwierdzony; nie wolno go powtarzać. Historyczny8087/cache12/CI43848428119FAILURE pozostaje w dowodach. Excel6/413/ABC/pustaC zachowuje źródło37061c iSHA256 `95f415d0748d5b5e389f92e28df2aef18e71b13968c74ac5a0e54835c7d4be8d`; pliki publiczne, wejściowy zakres sześciu arkuszy, MERGE i fingerprinty bez zmiany tą aktualizacją. **Ręczny odbiór użytkownika NOT_RUN. PROD/DNS odłożone.** Kolejny commit samych metadanych nie zastępuje aplikacji37061c, publikacji c4 ani tych tagów.

[Pełne dowody odbioru](CACHE13-ACCEPTANCE.json).

## Historia przygotowania i wcześniejszych statusów

## Końcowe źródłocache13 — noweCI i publikacje oczekują

Bieżący kandydat **0.15.0.2 / frontend-v32-13** ma zacommitowane źródło **`37061c43139f32dfba61e4d837b133ed9d2d7da8`**. Zmiana względem nieudanegocache12 obejmuje wyłącznie bramkę inicjalizacji zegara klienta dlaUIDdev-admin3 i56publicznych ciągówcache13; serwer pozostaje bez zmiany.

Kierunkowy cloud-rules naFirestore iAccountAPI **PASS134.56s**, bez zmiany testu lub asercji. Speed **6/6 PASS** na rzeczywistym lokalnym runtime i izolowanym lokalnie trybie PRE-PROD/API: admin1/admin2 w obu środowiskach mają **0 automatycznych żądań zegara**, bez przycisków i bez uprawnieniaAPI; admin3 zachowuje pełną sekwencję1×/2×/6×/1×, tempo zapisanej gry, trwałość i ponowne wejście. Pakiet2/2 i stagingtrzechJS PASS po zmianiecache13. To dowody lokalne, nie odbiór opublikowanego PRE-PROD.

Arkusz6/413/ABC/pustaC ma walidacjęPASS ze źródła37061c, SHA256 `95f415d0748d5b5e389f92e28df2aef18e71b13968c74ac5a0e54835c7d4be8d`, fingerprint `7e9f4bf97b7f0d22674bd1eef8832dd44e23142997f4a3082b1bf17c7d160310`. Odczyt/scalenie nadal ograniczone do sześciu wybranych zakładek; dokumentacja nie zmienia pliku lub raportu odcisków.

**Nowy własnyCI, nowePages, promocja i natywny odbiór PRE-PROD pozostająPENDING.** Historyczny8087/cache12 zachowujeCIFAILURE43848428119 i PagesSUCCESS43848428111, bez zaakceptowanego tagu lub promocji. PRE-PROD nadal86/cache11; reset i istniejąca graadmin1 są niezależnie potwierdzone, bez ich ponawiania lub tworzenia świata przezQA. PROD/domena odłożone.

[Dowody lokalnecache13](CACHE13-LOCAL-VALIDATION.json).

## Historia cache12 i przygotowania

## Cache12 opublikowany, własnyCI nieudany; kandydatcache13 oczekuje

Pierwsza publikacja **0.15.0.2/cache12**, aplikacja96c, źródło `8087dc826cb10ee391619d88d9f99fe696f7d036`, ma **CI43848428119 FAILURE450s** (job133234457802). Krok27 cloud-rules-v32 odrzucił zbędnyGET/dev-time wysłany przez admin1. Przed awarią przeszły frontend1437/1437, backend170/170, Python166 oraz startup20/20 i speed6/6; pozostałe późniejsze przeglądarki nie zostały wykonane. Serwer odmawiał niedozwolonej roli403; poprawka ogranicza także inicjalizację klienta do właściwegoUIDdev-admin3. Nowy wynik wymaga własnego źródła i pełnegoCI.

**Pages43848428111 SUCCESS**: job17s, cały przebieg23s. NiezależnyHTTPS/TLS potwierdził108plików/30 774 686bajtów identycznych ze źródłem8087. Te rzeczywiste publiczne bajty pobrano i uruchomiono lokalnie wChrome1440/390 PASS; nie deklarujemy natywnego odbioru HTTPS wprzeglądarceDEV. Nie utworzono zaakceptowanego tagu8087 i nie wdrożono go naPRE-PROD. PRE-PROD pozostaje86/0.15.0.1/cache11, reset niezależnie potwierdzony, istniejąca graadmin1 odczytowo potwierdzona.

Bieżący następny kandydat: **0.15.0.2 / frontend-v32-13**, źródło jeszczePENDING. Poprawka bramkiUID klienta jest przygotowywana; kierunkowe cloud-rules i sześć zakresówUI są w toku. WłasnyCI, nowePages, publikacja/PRE-PROD i natywny odbiór nowej gry pozostająPENDING. Sukcesy częściowe8087 ani jego Pages nie oznaczają pełnego zielonegoCI nowego źródła. PROD i domena pozostają odłożone.

[Dokładne dowody pierwszej publikacji](CACHE12-PUBLICATION-EVIDENCE.json).

## Historia lokalnego odbioru i poprzedniego kandydata

## Końcowe źródło96c — lokalne dowody, publikacje oczekują

Końcowe źródło aplikacji **`96c211fd39826cf804ff286faeff219ac846827c`** jest zacommitowane: **0.15.0.2 / frontend-v32-12**. Publikacja, własny CI i nowe wdrożenie PRE-PROD nadal **PENDING**. Checkpoint9ee zachowano w dowodach i historii; po nim zmieniono wyłącznie kontroler zegara, koordynator i opcję beforeRecover wplay.

Końcowy odbiór startu **20/20 PASS** na1440/390 obejmuje6 opóźnianych barier,5 awarii zasobów na szerokość, utratę kontekstu przed gotowością grafiki, czytelny błąd i odzyskanie po ponowieniu, wprowadzenie oraz prawdziwe przekierowanie logowania. BajtyHTML iambient odpowiadają źródłu96c, ostatnia poprawka zegara nie zmienia startu. Nowe testy zegara/focus/koordynatora **51/51 PASS**, w tym4 przypadki healthyfocus; adaptery lokalnej chmury **58/58 PASS**. Końcowe powtórzenia **speed6/6 i LiveCAS dla96c PASS**; sprawdzenie tempa nadal dotyczy rzeczywistego lokalnego runtime i izolowanego trybu PRE-PROD/API, nie publicznej usługi.

Wcześniejszy checkpoint9ee zachowuje backend170, clock/frontend66, coordinator57,payload2,bundle26,pakiet2 i sześć rzeczywistych lokalnych/izolowanych zakresów speedPASS. Nie jest to publiczny odbiór PRE-PROD. Pierwszy pełny frontend miał **1425/1426**, timeout10s starego96-godzinnego watchdog przy obciążeniuCPU; dokładny retry1/1 PASS8.8s nie zastępuje pełnego zielonegoCI.

Arkusz6/413/ABC/pustaC ze źródła96c ma walidacjęPASS, SHA256 `90943adac77e35ee97899165dfa4e4ae541074b62258323fae27ffab2a158e60`, fingerprint `f7d82a10f46673098129486a911132ae30e0739e0fc27e4a5d64aa9669589771`. Tylko sześć wybranych zakładek; dokumentacja nie zmienia arkusza ani raportu odcisków.

Reset jest niezależnie potwierdzony i nie jest ponawiany. Właściciel utworzył grę admin1; niezależny odczyt16listopada10:21:40UTC PASS z normalnymTLS potwierdził właściweUID, generację2, rewizję12, schema9/rules32,19osób, ukończonewprowadzenie i zegar niezatrzymany. Warunek istnienia świata jest spełniony; dawnyisland=null10:07:30 jest historycznym checkpointem. **Nowy PRE-PROD wymaga jeszcze odebranego nowegoDEV, standardowego wdrożenia i natywnego odbioru tej istniejącej wyspy. QA nie tworzył ani nie zapisywał świata.** PROD/domena bez działań.

[Dowody lokalne](CACHE12-LOCAL-VALIDATION.json).

Status: **źródło96c zamrożone; lokalne checkpointy przyjęte, start20/20PASS,CI i publikacja PENDING**. BugHL-CHG-1154; [dowody](STARTUP-LOADING-EVIDENCE.json).

Użytkownik zgłosił, że podczas uruchamiania przez chwilę widać stary obraz referencyjny wyspy i dawny HUD, zanim pojawi się właściwa gra. GO z16listopada2026 obejmuje usunięcie tego przebłysku: najpierw DEV, następnie PRE-PROD. Poprawka **0.15.0.2 / frontend-v32-12** ma zamrożone źródło96c211f i poniższe lokalne wyniki; własnyCI i publikacja pozostająPENDING, wcześniejsze sukcesy86 nie są jej odbiorem.

Przed gotowością właściwej sceny ma być widoczny spójny ekran ładowania. Referencyjna mapa, stary HUD i niegotowe elementy gry nie mogą pojawiać się ani przyjmować kliknięć w pierwszych klatkach. Odbiór powinien objąć pierwsze renderowanie oraz opóźnione ładowanie, a następnie zachowanie właściwej wyspy i działającego interfejsu po zakończeniu startu. Bieżący lokalny odbiór i pozostałe bramki podano poniżej.

Reset właścicielski dla run43768861718/źródła **86eb8d9** jest **RESET_SUCCESS_INDEPENDENTLY_VERIFIED**. Niezależny odczyt16listopada09:41:42UTC z normalną weryfikacjąTLS potwierdził3 logowania z właściwymi UID, generację2 każdego konta, expired=false i island=null; trzy bezpośrednie odczyty własnegoFirestore odmówione403. ConfigAPI200 potwierdza accountAPI=true, projectharborlight-dev, environmentpreprod i resetFencecommunity-profile-v1. Audyt nie zapisał danych ani nie tworzył wysp. Nie powtarzać resetu. Przeszkoda trwającego resetu jest zamknięta; nowy PRE-PROD nadal wymaga odebranego nowegoDEV i własnych dowodów. Bezpośrednio po resecie3wyspy były puste; obecnie admin1 ma grę utworzoną przez właściciela i niezależnie potwierdzoną10:21:40UTC. Warunek istnienia świata jest spełniony, nowy natywny odbiór wdrożonegoUI pozostaje oczekujący, bez tworzenia świata przezQA.

PROD i domena pozostają odłożone. Ten zakres nie zmienia reguł gry, kont ani zapisanego postępu i nie obejmuje oczekujących modeli sera, otrębów/paszy lub zmian reklam. Zawartość wejściowych arkuszy i ustalony zakres sześciu zakładek pozostają bez zmiany. Ręczny odbiór użytkownika nowej poprawki NOT_RUN.
