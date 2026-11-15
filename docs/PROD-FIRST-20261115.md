# Najpierw obecny PRE-PROD doPROD, potem DEV doPRE-PROD

Status: **pierwsza promocjaBLOCKED konfiguracją i dostępem właścicielskim; nowej publikacjiPROD nie potwierdzono**. Użytkownik ustalił kolejność: obecnyPRE-PROD → PROD, a dopiero po potwierdzeniuPROD aktualnyDEV → PRE-PROD. KartaOpsHL-CHG-1151, [zapis dowodów](PROD-FIRST-20261115-EVIDENCE.json). To kolejność operacji, nie zgoda na pominięcie istniejących bramek.

## Źródła i stwierdzone fakty

ObecnyPRE-PROD to0.14.0.0/`7e81a1a436770f57fd8abf390b6af8022e3300f6`, oryginalny deploy41909268052. Jego potwierdzenie ma `account_api:false`. Świeży odczyt bezpośredniegoCloudRunhealth zwrócił200 i dokładne źródło7e; readiness podał `accounts:false`, `persistence:false`; `/api/v1/config` zwrócił503/`account_api_disabled`. Frontend tej wersji wymaga włączonegoAPI kont przy publikacjiPROD. Promocja z obecnymreceipt i wyłączonymAPI nie przejdzie prawidłowej bramki i nie powinna jej omijać.

| Obserwacja | Co z niej wynika |
|---|---|
| Brak skonfigurowanej tożsamościGCP, manifestu dostępuGCP iADC w tej sesji | Nie można teraz wykonać wymaganej zmiany konfiguracji właścicielskiej i jej odbioru. |
| Metadata środowiskaGitHub zwraca404 | Nie wiadomo, czy zasób jest niedostępny, czy nie istnieje; nie deklarujemy braku środowiska. |
| harborlight.pl: A85.128.245.188, istniejąca obsługa w nazwa.pl, legacyHTTP404 | Domena nadal wskazuje dotychczasową usługę; to nie potwierdza nowej gryPROD. |
| Odczyt version/config na FirebasePROD zwraca404 | Konfiguracja pozostaje nieustalona; sam404 nie dowodzi nieistnienia projektu lub witryny. |
| Historyczny pakiet ma85plików, obecny kontrakt weryfikatora108 | Potrzebny jest jawny, ściśle ograniczony profil starego wydania, z zachowaniem bramekAPI. |

Root zapytał użytkownika, gdzie jest już skonfigurowany dostęp właścicielskiGCP i domeny. To brakująca informacja techniczna; nie potrzeba sekretów wczacie ani ponownej zgody na ustaloną kolejność promocji.

## Zgodność starego pakietu

Lokalnie przygotowana poprawka w `/workspace/gra-promotion-compat` ma3pliki i26testówPASS. Root integruje ją w aktywnym drzewie. Profil `preprod-0.14.0.0-20261104` dopuszcza wyłącznie:

- źródło `7e81a1a436770f57fd8abf390b6af8022e3300f6`;
- SHA256archiwum `b43a736f4c30e8db9d2704b50219e0e6c1cf06c32660640ef66f1861cc412196`;
- SHA256manifestu `2dea4d8563fadaf38dcd8103dc9ee66088e69e34ba8cc74b544aaea4bf3bc54e`;
- 85plików/19682273bajty.

To poprawia wyłącznie zgodność historycznej zawartości. Domyślny kontrakt108plików i wymógAPI kont pozostają. Nie wolno przepisać `account_api:false` na true w starymreceipt ani użyć profilu do dowolnego źródła lub archiwum. Pełna integracja i własnyCI mają odrębny odbiór.

## Konkretna kolejność dalszych operacji

1. Ustalić miejsce skonfigurowanego dostępuGCP i domeny oraz odczytać rzeczywiste projekty, witryny, konfigurację i uprawnienia. Nie wnioskować nieistnienia zasobów z odpowiedzi404.
2. Na **obecnymPRE-PROD i tym samym niezmiennym obrazie7e** włączyć wymaganą konfiguracjęAPI kont i trwałości, bez wgrywania nowszegoDEV i bez resetu. Zweryfikowaćhealth/readiness/config oraz rzeczywisty odczyt po uwierzytelnieniu.
3. Uzyskać nowy, zweryfikowanyreceipt tego samego źródła i obrazu z faktycznie włączonymAPI oraz zgodnym85plikowym pakietem. Oryginalnyreceipt41909268052 pozostaje nienaruszony. Bez pozytywnego odbioru konfiguracji promocjaPROD pozostajeBLOCKED.
4. Standardowym procesem promować dokładnie odebrane stare źródło7e/obraz/pakiet doPROD, zachowując bramki i odczytowe kontrole. Nie kopiować testowych kontPRE-PROD naPROD ani nie resetować istniejącego postępu.
5. Potwierdzić rzeczywiste działaniePROD,API i właściwych plików. Wymagane dane domeny/DNS brać z rzeczywistej konfiguracji dostawcy; zmiana obecnegoA nie może opierać się na zgadywanych rekordach lub nieustalonym stanie Firebase. OdebranyPROD musi zostać jawnie zapisany z właściwymSHA i dowodami.
6. **Dopiero po potwierdzeniuPROD** przenieść aktualnyDEV doPRE-PROD jako osobną promocję dokładnego źródła z własnym zielonymCI. Nie przenosić na nią sukcesu wcześniejszej wersji, nie przesuwać historycznych tagów ani nie resetować kont.

Powyższy plan jest przygotowany do przeglądu, ale kroki konfiguracji i publikacji nie zostały uznane za wykonane przez samo sporządzenie tego dokumentu.

## Bieżący DEV i odrębne wynikiCI

Cache9 ma zmienione copy według sześciu wybranych arkuszy, bez zmiany106publicznychplików pomiędzy korektami testów. PierwszyCIb1a929d zakończył sięFAILURE starego oczekiwania „przy przypłynięciu” zamiast jawnegoC „po przypłynięciu”. Drugi kandydat `cd61dae9a1485dbae1a085c4ae65e7e048a62571` także zakończyłCI wynikiemFAILURE: kolejne stare oczekiwanie opisu odblokowania budynku nie odpowiadało zatwierdzonej redakcjiC.1402testyNode, backend, Python, Excel i nowy odbiór sześciu arkuszy przeszły w tym drugim przebiegu; lokalny rzeczywisty odbiórUI pozostaje osobnymPASS.

Korekty dotyczą oczekiwań starych testów, nie kodu gry. Dopóki kolejny własny pełnyCI nie zakończy sięSUCCESS, cache9 nie otrzymuje zaakceptowanego tagu. ZakończenieCI pracDEV może przebiegać równolegle z ustalaniem dostępu; nie oznacza promocji nowszegoDEV naPRE-PROD przedPROD.

Opcjonalne modele sera i reklam nadal oczekują odpowiedzi. NowegoPROD, aktywacji dostawców ani resetu kont nie zadeklarowano. Oryginalne potwierdzenia i wcześniejszeFAILURE zachowują swoje źródła i wyniki.

Właściciel potwierdził w otwartym Cloud Shell projekt `harborlight-prod`, numer `992911312434`, stan `ACTIVE`. Odzyskana historia wskazuje setup bez kluczy przez Cloud Shell i GitHub WIF oraz historyczne22/22 kontroli bootstrapu; dodatkowy23. odczyt obrazów do promocji nie miał potwierdzonego wyniku. Zlecono wyłącznie odczyt `verify.py --environment both --promotion` w istniejącym `~/harborlight-infra`. Nie uruchomiono nowego bootstrapu ani resetu.
