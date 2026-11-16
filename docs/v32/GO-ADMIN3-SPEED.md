# Sterowanie tempem gry dla admin3

## Końcowe źródło96c — lokalne dowody, publikacje oczekują

Końcowe źródło aplikacji **`96c211fd39826cf804ff286faeff219ac846827c`** jest zacommitowane: **0.15.0.2 / frontend-v32-12**. Publikacja, własny CI i nowe wdrożenie PRE-PROD nadal **PENDING**. Checkpoint9ee zachowano w dowodach i historii; po nim zmieniono wyłącznie kontroler zegara, koordynator i opcję beforeRecover wplay.

Końcowy odbiór startu **20/20 PASS** na1440/390 obejmuje6 opóźnianych barier,5 awarii zasobów na szerokość, utratę kontekstu przed gotowością grafiki, czytelny błąd i odzyskanie po ponowieniu, wprowadzenie oraz prawdziwe przekierowanie logowania. BajtyHTML iambient odpowiadają źródłu96c, ostatnia poprawka zegara nie zmienia startu. Nowe testy zegara/focus/koordynatora **51/51 PASS**, w tym4 przypadki healthyfocus; adaptery lokalnej chmury **58/58 PASS**. Końcowe powtórzenia **speed6/6 i LiveCAS dla96c PASS**; sprawdzenie tempa nadal dotyczy rzeczywistego lokalnego runtime i izolowanego trybu PRE-PROD/API, nie publicznej usługi.

Wcześniejszy checkpoint9ee zachowuje backend170, clock/frontend66, coordinator57,payload2,bundle26,pakiet2 i sześć rzeczywistych lokalnych/izolowanych zakresów speedPASS. Nie jest to publiczny odbiór PRE-PROD. Pierwszy pełny frontend miał **1425/1426**, timeout10s starego96-godzinnego watchdog przy obciążeniuCPU; dokładny retry1/1 PASS8.8s nie zastępuje pełnego zielonegoCI.

Arkusz6/413/ABC/pustaC ze źródła96c ma walidacjęPASS, SHA256 `90943adac77e35ee97899165dfa4e4ae541074b62258323fae27ffab2a158e60`, fingerprint `f7d82a10f46673098129486a911132ae30e0739e0fc27e4a5d64aa9669589771`. Tylko sześć wybranych zakładek; dokumentacja nie zmienia arkusza ani raportu odcisków.

Reset jest niezależnie potwierdzony i nie jest ponawiany. Właściciel utworzył grę admin1; niezależny odczyt16listopada10:21:40UTC PASS z normalnymTLS potwierdził właściweUID, generację2, rewizję12, schema9/rules32,19osób, ukończonewprowadzenie i zegar niezatrzymany. Warunek istnienia świata jest spełniony; dawnyisland=null10:07:30 jest historycznym checkpointem. **Nowy PRE-PROD wymaga jeszcze odebranego nowegoDEV, standardowego wdrożenia i natywnego odbioru tej istniejącej wyspy. QA nie tworzył ani nie zapisywał świata.** PROD/domena bez działań.

[Dowody lokalne](CACHE12-LOCAL-VALIDATION.json).

Status: **źródło96c zamrożone, lokalny odbiór sześciu zakresówAPI PASS; własnyCI i nowe publikacje PENDING**. Planowana0.15.0.2/cache `frontend-v32-12`; kartaHL-CHG-1155, [dowody](ADMIN3-SPEED-EVIDENCE.json).

Użytkownik zatwierdził sterowanie prędkością **wyłącznie dla admin3** na **DEV i PRE-PROD**: przycisk **▶ =1×**, pierwsze naciśnięcie **⏩ =2×**, drugie **⏩ =6×**. To odrębna funkcja testowa w planowanej0.15.0.2/cache12, kartaHL-CHG-1155. Widoczność i uprawnienie zmiany tempa mają być związane z właściwym uwierzytelnionym kontem, a rzeczywisty zegar gry ma odpowiadać wybranej wartości; samo przyspieszenie wyświetlanego licznika nie wystarcza. Lokalną implementację i testy podano poniżej; własnyCI i oba nowe wdrożenia pozostająPENDING. Nie przypisywać kontroli admin1/admin2 ani kontom produkcyjnym.

Reset właścicielski dla run43768861718/źródła **86eb8d9** jest **RESET_SUCCESS_INDEPENDENTLY_VERIFIED**. Niezależny odczyt16listopada09:41:42UTC z normalną weryfikacjąTLS potwierdził3 logowania z właściwymi UID, generację2 każdego konta, expired=false i island=null; trzy bezpośrednie odczyty własnegoFirestore odmówione403. ConfigAPI200 potwierdza accountAPI=true, projectharborlight-dev, environmentpreprod i resetFencecommunity-profile-v1. Audyt nie zapisał danych ani nie tworzył wysp. Nie powtarzać resetu. Przeszkoda trwającego resetu jest zamknięta; nowy PRE-PROD nadal wymaga odebranego nowegoDEV i własnych dowodów. Bezpośrednio po resecie3wyspy były puste; obecnie admin1 ma grę utworzoną przez właściciela i niezależnie potwierdzoną10:21:40UTC. Warunek istnienia świata jest spełniony, nowy natywny odbiór wdrożonegoUI pozostaje oczekujący, bez tworzenia świata przezQA.

Zakres testów powinien obejmować właściwe konto i odmowę dla pozostałych kont, sekwencję1×→2×→6×→1× oraz rzeczywiste tempo czasu po stronieAPI. Nie są to jeszcze wykonane testy. Zmiana nie wymaga nowego resetu; PROD i domena pozostają odłożone.
