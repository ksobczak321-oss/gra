# Przegląd polszczyzny — zakres i dowody DEV 0.10.1.0

Użytkownik rozszerzył uwagę o naturalnym języku samouczka na **całą grę**. Dokument opisuje zakres przeglądu i konkretne dowody. Nie stwierdza, że każda możliwa treść jest językowo bezbłędna. Ręczną ocenę prowadzą [TC52 — 25 lekcji](testing/manual/HL-TC-0052.md) i [TC53 — cała gra](testing/manual/HL-TC-0053.md); oba wyniki nadal są **NOT RUN**.

**Bieżący stan:** nowy pakiet po dalszej redakcji przyjaznego stylu i poprawce podpowiedzi przeszedł **898 testów Node, 141 testów Python i 18 zestawów Chromium**. Ponowny przegląd obejmuje **112 rzeczywistych widoków**, bez wykrytych angielskich elementów i błędu wykonania. Cache: `frontend-v25-2`. Końcowe źródło `353faad347262dce7c3632fdf7c71be124384ab1` ma własne **CI SUCCESS (3 min 54 s)**, **Pages SUCCESS (31 s)** oraz **promocję PRE-PROD SUCCESS (2 min 05 s)**. Pierwszy podgląd `b1cd650…` i jego nieudane CI zachowujemy poniżej jako historię.

## Dalsza redakcja po doprecyzowaniu użytkownika

Przyjazny polski to również sposób wyjaśniania gry. Ponownie zredagowano 12 krótkich opisów celu, 12 pełnych opisów budynków oraz główne akapity o mieszkańcach, magazynie, produkcji, szczęściu, żywieniu i ochronie powitalnej. Opis mówi, co zrobić i jaki to daje rezultat, np. „Przydziel tu tragarzy…” albo „Rozbudowuj dom, gdy potrzebujesz więcej łóżek”, zamiast urzędowego „określa/umożliwia/przyznaje”.

Zachowano liczby, warunki, angielskie źródła i nazwy przycisków. Kierunkowy zestaw po tej redakcji ma 25/25 PASS, a ponowny przegląd rzeczywistych ekranów nowego pakietu również zakończył się sukcesem lokalnym. Własne CI końcowego commitu potwierdzono osobno jako SUCCESS. To dalszy zakres [HL-CHG-0038](tracking/changes/HL-CHG-0038.md), nie nowa reguła gospodarki.

## Zakres prac i lokalne kontrole

| Obszar | Zakres | Potwierdzony stan |
|---|---|---|
| 25 bieżących i 25 historycznych lekcji | Naturalne tytuły, opisy i wskazówki, prowadzenie od mapy oraz konsekwentne nazwy budynków i czynności. | Porównanie eksportowanych danych zachowuje ID, kolejność, warunki, nagrody, trasy i selektory. Końcowy wspólny odbiór aktualnego wydania zakończył się sukcesem; wyniki poniżej. |
| Interfejs i opisy budynków | 12 opisów budynków i 12 krótkich opisów celu, produkcja i receptury, magazyn, mieszkańcy, głód, zatrudnienie, szczęście, transport, NPC, ekspedycje i 100 etapów Latarni. | [Nowe testy tekstów i stanów](../tests/harborlight-polish-copy-v25.test.mjs) oraz [wcześniejsze i18n](../tests/harborlight-v15-i18n.test.mjs): po ostatnich poprawkach z przeglądarki **25 PASS (13 + 12)**. |
| Statyczne zdania modeli | Przejrzano 313 pełnych zdań z dziewięciu modułów: state, activities, logistics, leisure, effects, events, profile, commerce i engagement. | Diagnostyka wykazała 0 reszt w tym zbiorze. Nie jest to dowód wszystkich dynamicznych stanów. |
| Zdarzenia i efekty | Przejrzano osiem modułów: events, effects, activities, commerce, engagement, leisure, residents i logistics. Poprawiono polskie nazwy i odmianę zdarzeń oraz wyjaśnienia efektów. | [Zdarzenia](../tests/harborlight-world-events-v18.test.mjs) i [efekty](../tests/harborlight-effects-v8.test.mjs): **32 PASS**. |
| Logowanie, chmura i sesja | Formularze, dostawcy logowania, odmowy dostępu i zapisu w auth, auth-providers i dev-cloud. | Teksty poprawione; końcowy wspólny odbiór aktualnego kodu PASS lokalnie. Nie potwierdza to aktywacji dostawców ani zapisu GCP. |
| Sojusze, liga, wiadomości, Pomagam | Nazwy akcji i stanów, polski zapis kwot PLN, wyraźna symulacja oraz wspólne okno obu zadań 19:00–21:00. | Teksty i wspólne okno obu zadań przeszły aktualne testy; nie przypisujemy im dawnego odbioru rozdzielonych godzin. |
| Prowadzenie 25 lekcji | Najpierw rzeczywisty budynek na mapie, potem widoczna czynność; bez automatycznego otwarcia i bez nagrody za oglądanie. | Test mapy: **5 wariantów PASS**. Regresje: priorytety 4, kurs zrównoważony 3 i historyczny 4 — PASS. Historyczny kurs obejmuje teraz geometrię podpowiedzi na ekranie 360×640. |
| Pierwsze i ponowne oprowadzanie | Odróżniono zatrzymany czas pierwszego wejścia, działającą wyspę podczas powrotu oraz ulotny podgląd DEV. | Opisy poprawione; końcowe testy Pomocy i wprowadzenia dla aktualnego wydania PASS. |

Zestawy kierunkowe częściowo się nakładają. Nie sumujemy ich jako niezależnego pełnego wyniku wydania i nie przypisujemy im sukcesu CI przed jego odczytem.

## Konkretne znalezione problemy

- Poprawiono odmianę ilości: „8 Żywność” → „8 jedn. żywności” oraz „Kupiono 1 Deski za 1 monet” → „Kupiono 1 deskę za 1 monetę”. Testy obejmują także 1, 2, 5, 12 i 22 monety, sekundy oraz punkty szczęścia.
- Receptury wskazują konkretne wejście: 2 drewna → 1 deska i 2 zboża → 1 żywność. Zastąpiło to niejasne „dwie sztuki surowca”, bez zmiany wartości modelu.
- Opis Portu rozróżnia NPC od poziomu 4 i PvP od 6. Opis mieszkańców wyjaśnia minimum 12 na matce i 6 na córce. „Latarniane 100%” zastąpiono nazwą premii Latarni.
- Doprecyzowano błogosławieństwo wobec nowych mieszkańców oraz nazwę przyzwyczajenia po wygaśnięciu atrakcji, zachowując rzeczywisty modyfikator.
- Test wykonywanej akcji znalazł błąd kupna czasu: treść wyceny nadpisywała potwierdzenie dodania sekund, mimo poprawnego pobrania monet i wydłużenia rundy. Poprawiono kolejność składania odpowiedzi, bez zmiany kosztu, sekund lub limitów. Kierunkowy zestaw aktywności i tekstu: **15 PASS**. Osobna karta: [HL-CHG-0039](tracking/changes/HL-CHG-0039.md).
- Rzeczywisty panel wykazał mieszany komunikat „The Ratusz upgrade…”. Regułę pełnego zdania umieszczono przed podmianą fragmentów. Nowy test sprawdza prawdziwe warunki awansu 3→4 (54 mieszkańców) i 13→14 (234), bez zmiany stanu. To ustalenie z pierwszego przeglądu; nowy pakiet wymaga ponownego odbioru.
- Kolejny przebieg rzeczywistych ekranów ujawnił brak obsługi pełnego opisu pakietu Premium z ceną „13 000” oraz powiadomienie „Kamieniołom: level 4”. Dodano właściwe reguły; liczby obsługują także spację niełamliwą i wąską spację niełamliwą. Testy obejmują formy dla 1, 2, 5, 22 i 13 002 monet.
- Po rozwinięciu pomocy znaleziono nietłumaczony opis tragarza z ograniczeniem do poziomu 24. Test porównuje rzeczywistą rezerwę żywności: 50 na poziomie 1 oraz 1200 na poziomach 24 i 25.
- Uzupełniono pełny opis czasu przybycia/odejścia mieszkańca, również przy przeludnieniu, jednostki żywności i etykietę ARIA kwoty płatności. Usunięto podwójną kropkę przy skrócie godziny.
- Dalszy odczyt wykrył nagłówek kolejki „→ level4”, tytuł wyceny pakietu budowy oraz niepełny opis +10% szybkości/ładowności. Test obejmuje 12 nazw budynków w obu wariantach źródła i rzeczywistą wycenę pakietu.
- Rozwinięcie listy mieszkańców nie uruchamiało lokalizacji nowej treści; dodano właściwy krok lokalizacji i kontekstowe „Przydzielony”. Etykieta ARIA kwoty wewnątrz obszaru pomijającego automatyczny tłumacz otrzymała bezpośredni tekst PL.
- Zabezpieczono własną nazwę wyspy w opcji celu transportu: nazwa pozostaje dokładnie taka, jaką podał gracz, zamiast tłumaczyć jej fragment. Test sprawdza rzeczywisty tekst opcji, nie tylko niezmieniony zapis modelu.
- Poprawiono znaczenie błogosławieństwa: +20 p.p. szczęścia **przez godzinę**, a nie przyrost +20 p.p. **na godzinę**. Kontrola czyta wariant krótki i rozwinięty oraz opis budynku, porównując je z rzeczywistym efektem 20 p.p. przez 3600 s. To korekta opisu, nie zmiana bonusu.

## Zachowanie zasad i danych

Przegląd tekstów nie zmienia cen, receptur, produkcji, czasu, limitów, warunków zaliczenia ani nagród. Testy sprawdzają wartości i odpowiedzi rzeczywistych modeli, zamiast wyłącznie szukać wpisu w katalogu tłumaczeń.

Historyczne teksty zapisanych powiadomień **nie są przepisywane w danych konta**. Rozpoznane komunikaty można tłumaczyć przy wyświetlaniu, zachowując oryginalną historię. Starszy format bez właściwego tłumaczenia wymaga dodania obsługi odczytu lub aliasu, a nie resetowania wyspy i zmiany dawnych zdarzeń.

Własne nazwy wysp, pseudonimy i wiadomości graczy nie są automatycznie tłumaczone. Google, Facebook i Paynow pozostają nazwami własnymi. Techniczne identyfikatory kodu, plików i żądań nie są tekstami produktu do tłumaczenia; nie mogą jednak zastępować zrozumiałego komunikatu dla gracza.

## Końcowa kontrola rzeczywistych ekranów nowego pakietu

[harborlight-polish-panels-smoke.py](../tests/harborlight-polish-panels-smoke.py) odczytuje wyrenderowane panele i etykiety ARIA na komputerze i telefonie. Izolowany fixture ma 50 mieszkańców — 44 na matce i 6 na córce — oraz 9 powiadomień wytworzonych przez model. Nie używa prawdziwego konta ani dokumentów Firebase.

Zakres obejmuje menu, budynki i ich szczegóły, transport, rynek, efekty, społeczność, ligę i dobroczynność. Skrypt zapisuje odczytane treści i wykryte angielskie elementy do JSON, domyślnie `/tmp/harborlight-polish-panels-audit.json`. Miejsce raportu określa `HARBORLIGHT_POLISH_AUDIT_REPORT`, a `HARBORLIGHT_FRONTEND_ROOT` pozwala wskazać zbudowany pakiet.

**Wynik nowego pakietu: PASS lokalnie.** Po dalszej redakcji i poprawkach ponownie odczytano **112 widoków: 56 na komputerze i 56 na telefonie**. Raport ma `english_ui_findings: []` oraz `execution_error: null`; czas modyfikacji bieżącego raportu wynosi `1793484066.0457401`. Jest to nowy przebieg dla cache `frontend-v25-2`, a nie ponowne użycie wyniku pierwszego podglądu. Nie stwierdzono błędów JavaScript/sieci, rozlewania układu ani zmiany monet i własnych nazw, w tym nazw w opcjach transportu. Sprawdzono też odczytane zdania i etykiety ARIA; nie znaleziono kolejnej usterki w objętym zakresie.

Wcześniejsze przebiegi diagnostyczne wykryły opisane wyżej problemy i nie były sukcesem polszczyzny. Wynik końcowy pochodzi z ponownego wykonania po ich poprawieniu. Użyte reguły, scenariusze i przegląd treści nie gwarantują poprawności każdego przyszłego wariantu. Ręczne TC52 i TC53 pozostają **NOT RUN**.

## Końcowy lokalny odbiór po dalszej redakcji

Nowy zamrożony pakiet z cache `frontend-v25-2` ma **898 testów Node PASS / 0 FAIL**, **141 testów Python w 11 zestawach PASS** oraz **18 zestawów Chromium PASS**. Historyczny kurs v18 przeszedł cztery warianty, w tym test rzeczywistych wymiarów podpowiedzi z trzema przyciskami na ekranie 360×640, odpowiadający usterce wykrytej w CI pierwszego podglądu.

Lokalny odbiór nowego kodu uzupełniono odrębnymi wynikami końcowego źródła `353faad347262dce7c3632fdf7c71be124384ab1`: [CI 41246449612](https://github.com/ksobczak321-oss/gra/actions/runs/41246449612) ma **SUCCESS (3 min 54 s)**, a [Pages 41246449682](https://github.com/ksobczak321-oss/gra/actions/runs/41246449682) — **SUCCESS (31 s)**. DEV jest odebrany. Znacznik `[preprod:0.10.1.0]` upoważnia bridge do promocji po zielonym CI tego samego źródła; nie jest dowodem jej wykonania. Nie przesuwamy starych receipt ani nie zamieniamy nieudanego CI `b1cd650…` w sukces. [Potwierdzenie przygotowania reguł i kont przez właściciela](PREPROD-V25-PREPARATION.md) jest oddzielną czynnością, bez resetu wysp i bez publikacji gry.

Pakiet końcowego źródła ma **54 pliki z manifestem, 10 991 135 bajtów**; wszystkie 53 pliki treści są zgodne ze sprawdzonym pakietem. SHA-256 archiwum: `6c738006d57e115b3293a88460e9432ccb1fafb51e1eb9c08fdb116914e4c744`. SHA-256 manifestu: `0010c121de03c64e157596d014d80eb04970e7f5d03e81350374b9ce1a6abd0d`.

## Potwierdzone wdrożenie PRE-PROD

[Promocja 41246771480](https://github.com/ksobczak321-oss/gra/actions/runs/41246771480), workflow `google-cloud-dev.yml`, próba 1, zakończyła się **SUCCESS (2 min 05 s)** dla tego samego źródła `353faad347262dce7c3632fdf7c71be124384ab1`. Poprzedzający [bridge 41246756848](https://github.com/ksobczak321-oss/gra/actions/runs/41246756848) ma **SUCCESS (15 s)**. Gra PRE-PROD: https://harborlight-dev.web.app. Tag DEV `dev-0.10.1.0-20261031` został opublikowany.

Potwierdzono przebieg i źródło publikacji. Wewnętrznego ZIP receipt ani wartości aktywacji API nie odczytano niezależnie; nie wywodzimy ich z samego sukcesu deployu. Odczytowy odbiór hostingu nie zastępuje osobnego potwierdzenia autosave po rzeczywistej grze. Wszystkie 53 przypadki ręczne pozostają **NOT RUN**. Nie resetowano kont ani historii i nie promowano PROD.

## Historyczny wspólny odbiór pierwszego podglądu

Po ostatecznym zamrożeniu kodu potwierdzono lokalnie **897 testów Node PASS / 0 FAIL**, **141 testów Python w 11 zestawach PASS** i **18 zestawów Chromium PASS**. Kontrole pakowania obejmują 12 testów. Sprawdzony pakiet ma 53 pliki treści i manifest; nie traktujemy technicznego SHA preflightu jako SHA wydania.

To odbiór lokalny kodu aplikacji `b1cd650da1c9d669ebce4a77bee81ebfd87ccbc9`, wysłanego do main. Własny przebieg [Pages 41244467250](https://github.com/ksobczak321-oss/gra/actions/runs/41244467250) ma SUCCESS (41 s); ten podgląd DEV jest opublikowany. [CI 41244467302](https://github.com/ksobczak321-oss/gra/actions/runs/41244467302) zakończyło się **FAIL**: starsza podpowiedź z trzema przyciskami miała niepoprawną geometrię. Poprawkę opisuje [HL-CHG-0933](tracking/changes/HL-CHG-0933.md). Dalsza redakcja oraz poprawka układu otrzymają nowe źródło i własne CI. Nie promowano nowego zakresu do GCP i nie resetowano kont.

## Pozostałe źródła dowodów

- [Mapa samouczka](../tests/harborlight-tutorial-map-v25-smoke.py): 5 wariantów PASS; [priorytety](../tests/harborlight-tutorial-priority-v22-smoke.py): 4 PASS; [kurs zrównoważony](../tests/harborlight-tutorial-v21-smoke.py): 3 PASS; [kurs historyczny](../tests/harborlight-tutorial-v18-smoke.py): 4 PASS, w tym geometria 360×640. Dotyczy rzeczywistego kliknięcia, widocznej kontrolki i zachowania nagród.
- [Pomoc](../tests/harborlight-help-v24-smoke.py) i [wprowadzenie](../tests/harborlight-onboarding-v20-smoke.py): pierwsze wejście i powrót bez utraty historii.
- [Rejestracja i dostawcy](../tests/harborlight-v18-auth-smoke.py) oraz [wylogowanie](../tests/harborlight-settings-signout-smoke.py): formularze i sesja.
- [Społeczność](../tests/harborlight-community-v24-smoke.py) i [Pomagam](../tests/harborlight-charity-v24-smoke.py): warunki widoczne w działających panelach. Realna dobroczynność pozostaje wyłączona.

Odsyłacze określają zakres. Nowy odbiór lokalny po dalszej redakcji, własne CI, Pages i promocja PRE-PROD mają odrębne potwierdzone dowody. Bieżący stan podaje [rejestr zmian](tracking/CHANGE-REGISTER.md) oraz [rejestr środowisk](ENVIRONMENT-STATUS.md). Wynik wdrożenia nie zastępuje ręcznego odbioru gry. Kont nie resetowano.
