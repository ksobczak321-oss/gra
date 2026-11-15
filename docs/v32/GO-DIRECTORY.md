# GO DEV — nazwy i grupy mieszkańców

Status: **odebrane wyłącznie naDEV; własny pełnyCI i PagesSUCCESS, zweryfikowane plikiHTTPS i ich lokalny render**. Gra0.15.0.0, cache `frontend-v32-8`. Aplikacja `fa34c9e379b2425529ef96552d43e66568f14b2c`, publikacja `06db93ada1c5cbd3071709ab84fc959f9674e5a1`, Pages43740930892SUCCESS i CI43740930893SUCCESS dokładnie tegoSHA. [Dowody](DIRECTORY-EVIDENCE.json), [zanonimizowane dane odbioru publicznych plików](DIRECTORY-PUBLIC-RECEIPTS.json), karty HL-CHG-1147–1149. Zatwierdzony i opublikowany front [cache7](GO-ACCEPTED-FRONT.md) pozostaje zachowany.

Użytkownik zgłosił, że Akademia nadal pokazuje „Mieszkaniec1…X”, przypomniał grupowanie według zajęcia, wskazał także Koszary i polecił: „jak poprawisz wdrażaj naDEV”. To rozszerza bieżącą publikację o wcześniej przygotowywaną warstwę nazw mieszkańców. Zakres nie włącza modeli przeniesienia sera ani otrębów/paszy.

## Jeden sposób prezentacji mieszkańców

Listy i pola wyboru pokazują czytelną rolę oraz numer w obrębie tej roli, zamiast globalnego numeru mieszkańca. Przykłady: Profesor 1, Profesor 2, Kamieniarz 1, Piekarz 1, Żołnierz 1 i Oficer 1. Trwała kariera profesora ma pierwszeństwo przed tymczasowym zajęciem. Role wojskowe mają osobne nazwy i numerację; numer nie oznacza UID ani zmiany postaci.

Wybory są grupowane logicznie: Wolni w Domu, pracownicy odpowiednich budynków, profesorowie, żołnierze i oficerowie. Numeracja powstaje na podstawie pełnej wyspy, aby ta sama osoba nie zmieniała nazwy między dwiema listami o różnym filtrze. Własne imiona gracza pozostają rozpoznawalne. Etykieta i grupa są prezentacją, a wartość opcji i akcja nadal używają kanonicznego UID osoby.

## Ekrany objęte poprawką

Akademia obejmuje wybór uczestników nauki i kursów, profesorów, nauczycieli, badania oraz widoczne listy zatrudnionych i aktywnych uczestników. Koszary obejmują szkolenia, rekrutację i wybór wojskowych, trasy oraz wyprawy. Z tej samej prezentacji korzystają spisy i wybory w Teatrze, Królestwie oraz klasycznych panelach mieszkańców, modlitwy, Latarni i przydziałów pracy.

Istniejące warunki dostępności pozostają zachowane. Zmiana etykiety lub kolejności grup nie może wybrać innego mieszkańca, utracić roboczego wyboru podczas zwykłego odświeżenia ani ominąć limitu lub warunku gry. Grupa nie przyznaje nowej profesji i nie zmienia miejsca pracy.

## Zachowany front i granice publikacji

Cache8 zachowuje zaakceptowane grafiki,20przypisań funkcji, dekoracyjny dawny Zakład skórzany, miniatury i wspólną prawą krawędź dolnego menu1664. Nie zmienia receptur, towarów, odkryć, kosztów, kwalifikacji do kursów, formatu zapisów, UID ani postępu kont. Osobny roboczy pakiet sera i otrębów/paszy pozostaje wyłączony.

Zakres obejmuje również konieczną naprawę responsywnego układu minigry pamięci120kart. CIcache7 odtworzył przypadek opóźnionego resize, w którym karty miały16.328px szerokości wobec wymaganego minimum20px. Minimalna poprawka prezentacji w `harborlight-v1-minigame-ui.js` utrzymuje poprawny kompaktowy układ przy opóźnionym ResizeObserver. Próg testu20px i reguły modelu pozostają bez zmiany; nie obniżono kryterium odbioru.

Docelowy [DEV poziom5](https://ksobczak321-oss.github.io/gra/harborlight-v1-layered.html?profile=new-player&preview=admin1-level5&v=frontend-v32-8) nadal jest oznaczonym, nietrwałym podglądem bez uwierzytelnionego konta. PRE-PROD pozostaje0.14.0.0/`7e81a1a436770f57fd8abf390b6af8022e3300f6`; bez nowej promocji PRE-PROD/PROD, resetu lub mutacji Authentication/Firebase.

## Kryteria odbioru i dowody

Odbiór ma potwierdzić role, osobną numerację, grupy we wszystkich objętych listach, to samo UID przed i po zmianie etykiety, rzeczywiste akcje z wybraną osobą oraz zachowanie wyboru przy odświeżeniu. Potrzebne są komputer i telefon, profesor przy tymczasowym zajęciu, żołnierz i oficer oraz różne filtry tej samej wyspy. Regresja sprawdza także zachowany front cache7.

Cache8 ma własne źródło, publikacjęPages, pełnyCISUCCESS i odbiór publicznych plików opisane poniżej. Nie przypisujemy mu wyników poprzedniego wydania. Cache7: źródło aplikacji `0bc7af0cad1acdc0e541ef9bd5e3a633a87655b3`, publikacja `d2af52a9f7d6a8221d888ca47c5c014727993e23`, Pages43738724545SUCCESS i17zgodnychhashyHTTPS z normalną weryfikacjąTLS. CI43738724605 zakończył sięFAILURE w v17/120kart/opóźnionyresize po zaliczonych etapach modelu/backendu/Excela; wynik pozostajeFAILURE po nowej poprawce. Bezpośredni publiczny render Chromium był zablokowany przez zarządzaneTLS pomimo próby poprawnego zaufania certyfikatowi; nie jest oznaczony jako PASS. Ręczny odbiór użytkownika nowej poprawki pozostaje NOT_RUN.

## Potwierdzone lokalnie dla cache8

- Wspólny katalog mieszkańców:11testówNodePASS.
- Akademia/Koszary/badania/Teatr:100osób na1440/390, grupy i nazwy oraz cztery rzeczywiste akcje z zachowanymiUID — PASS.
- Regresja Teatru100osób na1440/390 — PASS.
- Królestwo na1440/390: robocze wybory, rzeczywiste akcje i przełączenie wysp z zachowaniemUID — PASS.
- Angielski: jeden ukierunkowany test helpera i rzeczywista Akademia z Professor 1/2 oraz grupami Professors/Free at Home — PASS.
- Pełny ścisły v17 i wymuszony opóźniony ResizeObserver dla120kart po poprawce układu — PASS; minimum20px niezmienione.

Końcowy pakiet publikacji przeszedł lokalnie trzy zestawy: roleUI, klasyczne listy mieszkańców i zaakceptowaną mapę. Pakiet108plików/30742668bajtów zweryfikowano dla publikacji06db93a. Excel ma5677wierszy/17arkuszy, dokładnieABC i pustąC, ze źródłemfa34c9e — PASS. Lokalny odbiór pakietu i opisany niżej własny pełnyCI są odrębnymi dowodami.

## Opublikowany DEV i sposób odbioru

Pages43740930892 zakończył sięSUCCESS dla `06db93ada1c5cbd3071709ab84fc959f9674e5a1`.18ukierunkowanychhashyHTTPS oraz wszystkie106PUBLIC_FILES o łącznym rozmiarze30728747bajtów odpowiadają źródłuSHA256. WeryfikacjaTLS była włączona. Te106plików nie obejmuje generowanych `index.html` i `release.json`; liczba108 dotyczy odrębnego pełnego pakietu.

Render1672/390 wykonał **pobrane publiczne pliki, zweryfikowane przezTLS, lokalnie** z ich rzeczywistymiContent-Type. Nie wstrzyknięto fikcyjnego świata,API ani konta. Akademia pokazała19wolnych wDomu iProfesorów1–4, Koszary19wolnych wDomu iŻołnierzy1–4; spis27osób miał grupy ról bez ogólnegoMieszkaniec1…X. Zachowano20celówmapy,4zaakceptowanenakładki,5zakładek,19miniatur i prawąkrawędź1664 z odsłoniętymstatkiem. Jest toPASS dla tego sposobu wykonania publicznych bajtów, **nie** bezpośrednia nawigacjaHTTPS wChromium. Natywna nawigacja nadal maBLOCKED_CERT_AUTHORITY; nie wyłączano weryfikacjiTLS.

WłasnyCI43740930893 zakończył sięSUCCESS dokładnie dla06db93a. Job132893708888:17:24:32–17:42:30UTC,17m58s,31krokówSUCCESS i0failed, w tymNode,backend,infrastruktura,rejestry,dwaExcel oraz pełneChromium aplikacji i logowań/zapisówDEV. Pages43740930892 maSUCCESS tego samegoSHA. WynikCIcache7 pozostajeFAILURE. Porównanie dziesięciu modułów modelu po normalizacji samego namespacequery potwierdza zachowanie modeli; wcześniejsze wstrzymane drzewo `/workspace/gra` pozostaje zachowane. PRE-PROD/PROD i konta bez nowej mutacji.

Adnotowany tag `dev-0.15.0.0-cache8-20261115` jest opublikowany i potwierdzony zdalnie: obiekt `d9455d2657c523fc505b26d973311744ff56f11e` wskazuje niezmiennie odebrane `06db93ada1c5cbd3071709ab84fc959f9674e5a1`. Następny commit dokumentacji/metadanych nie zmienia106publicznychplików, źródłafa34c9e ani odebranej publikacji06db93a. Nie przesuwa tagu ani nie przejmuje sukcesu staregoCI dla nowegoSHA.
