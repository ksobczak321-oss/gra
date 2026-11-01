// Approved presentation copy only. No world state, timers or rewards are mutated.
// User revision: 2026-11-01. Native PL/EN share stable game IDs.
export const APPROVED_TOUR_IDS = Object.freeze(["home", "level", "happiness", "coins", "working", "arrival", "points", "population", "clock", "tasks", "expeditions", "building-townhall", "building-house", "building-farm", "building-windmill", "building-quarry", "building-lumber", "building-sawmill", "building-warehouse", "building-market", "building-dock", "building-chapel", "building-lighthouse", "ship", "category-administration", "category-economy", "category-resources", "category-decorations", "category-paths", "tutorial", "chat", "notifications", "settings", "menu"]);
export const TOUR_COPY = Object.freeze({
  "home": {
    "pl": {
      "title": "Twoja wyspa",
      "text": "Tu widzisz nazwę swojej wyspy. Kliknij ją, aby otworzyć podsumowanie osady oraz przejść do celów, budynków, mieszkańców, zadań i handlu."
    },
    "en": {
      "title": "Your island",
      "text": "This is your island’s name. Select it for an overview and access to goals, buildings, residents, tasks and trade."
    }
  },
  "level": {
    "pl": {
      "title": "Poziom wyspy",
      "text": "To poziom Ratusza. Wyznacza limit mieszkańców i najwyższy dostępny poziom rozbudowy budynków. Kliknij go, aby sprawdzić koszt i kolejkę rozbudowy Ratusza."
    },
    "en": {
      "title": "Island level",
      "text": "This is the Town Hall level. It sets the population limit and the highest available building level. Select it to check the Town Hall upgrade cost and queue."
    }
  },
  "happiness": {
    "pl": {
      "title": "Szczęście mieszkańców",
      "text": "Dbaj o pracę i jedzenie mieszkańców. Atrakcje i błogosławieństwa dodatkowo zwiększają ich szczęście. Od szczęścia populacji zależy tempo przybywania nowych osadników. Nieszczęśliwi mieszkańcy opuszczają wyspę.\n\nPraca i jedzenie dają mieszkańcowi łącznie +2 punkty procentowe szczęścia na godzinę. Brak pracy i jedzenia z czasem obniża jego szczęście."
    },
    "en": {
      "title": "Residents’ happiness",
      "text": "Provide work and food. Attractions and blessings add happiness. Population happiness controls how quickly settlers arrive; unhappy residents leave. Work and food together add 2 percentage points of happiness per resident per hour. Unemployment and hunger lower happiness over time."
    }
  },
  "coins": {
    "pl": {
      "title": "Monety",
      "text": "Monety służą do handlu oraz rozbudowy budynków. Każdy pracujący mieszkaniec płaci podatki. Dodatkowo możesz je zdobyć w zadaniach i ekspedycjach."
    },
    "en": {
      "title": "Coins",
      "text": "Use coins for trade and building upgrades. Every working resident pays taxes. Tasks and expeditions can also earn coins."
    }
  },
  "working": {
    "pl": {
      "title": "Pracujący mieszkańcy",
      "text": "Ta liczba pokazuje mieszkańców, którzy dotarli do miejsca pracy i obecnie pracują. Nowo przydzielony pracownik najpierw idzie do budynku. Dojście do pracy i powrót do Domu trwają po 2 minuty. Kliknij, aby zarządzać obsadą."
    },
    "en": {
      "title": "Working residents",
      "text": "This count shows residents who have reached their workplace and are currently working. Newly assigned workers must walk there first. Walking to work and returning Home each take 2 minutes. Select this control to manage your teams."
    }
  },
  "arrival": {
    "pl": {
      "title": "Następny mieszkaniec",
      "text": "Tu zobaczysz przewidywany czas przybycia lub odejścia mieszkańca przy obecnym szczęściu. Dla nowych osób potrzebujesz wolnych miejsc w limicie Ratusza. Zadbaj także o łóżka w Domu. Zmiana szczęścia wpływa na tempo przyrostu populacji."
    },
    "en": {
      "title": "Next resident",
      "text": "This estimates the next arrival or departure at the current happiness. New residents need space within the Town Hall population limit. Provide beds in the House too. Happiness changes the rate of population growth."
    }
  },
  "points": {
    "pl": {
      "title": "Punkty",
      "text": "To Twoja aktualna pozycja w rankingu graczy. Aktualizacja następuje co pełną godzinę. Tutaj też możesz zawiązywać sojusze."
    },
    "en": {
      "title": "Points",
      "text": "This is your current position in the player ranking, updated on each full hour. You can also form alliances here."
    }
  },
  "population": {
    "pl": {
      "title": "Mieszkańcy i miejsca",
      "text": "Tutaj sprawdzisz aktualną liczbę mieszkańców wyspy, limit ludności zależny od poziomu Ratusza oraz liczbę dostępnych łóżek zależną od poziomu Domu."
    },
    "en": {
      "title": "Residents and places",
      "text": "Check the current population, the population limit set by the Town Hall and the beds provided by the House."
    }
  },
  "clock": {
    "pl": {
      "title": "Czas wyspy",
      "text": ""
    },
    "en": {
      "title": "Island time",
      "text": ""
    }
  },
  "tasks": {
    "pl": {
      "title": "Bieżące zadania",
      "text": "Misje Latarni wyznaczają kolejne cele rozwoju wyspy. Główna ścieżka obejmuje osiem zadań na poziom. Jeśli potrzebujesz dodatkowego wsparcia, przejdziesz przez pięć etapów pomocniczych, a w razie potrzeby — trzy ratunkowe. Po ich ukończeniu wrócisz do kolejnego etapu przerwanej ścieżki. Przed przyjęciem zadania sprawdź wymagania, nagrodę i termin."
    },
    "en": {
      "title": "Current tasks",
      "text": "Lighthouse missions guide the island’s development. The main path contains eight tasks per level. If you need extra support, five supporting stages help you return to the main path; three rescue stages are available when needed. Completing them returns you to the next stage of the interrupted path. Check each task’s requirements, reward and deadline before accepting."
    }
  },
  "expeditions": {
    "pl": {
      "title": "Ekspedycje i minigry",
      "text": "Sposób na zarabianie dodatkowych monet."
    },
    "en": {
      "title": "Expeditions and minigames",
      "text": "A way to earn extra coins."
    }
  },
  "building-townhall": {
    "pl": {
      "title": "Ratusz",
      "text": "Rozbudowuj Ratusz, aby pomieścić więcej mieszkańców i podnosić poziomy pozostałych budynków. Jego poziom jest też poziomem Twojej wyspy."
    },
    "en": {
      "title": "Town Hall",
      "text": "Upgrade the Town Hall to make room for more residents and allow higher building levels. Its level is also your island’s level."
    }
  },
  "building-house": {
    "pl": {
      "title": "Dom",
      "text": "Dom zapewnia mieszkańcom własny kąt i miejsce odpoczynku po pracy. Ratusz wyznacza maksymalną liczbę mieszkańców wyspy, a Dom liczbę miejsc do zamieszkania. Codzienne punkty szczęścia otrzymują mieszkańcy mający miejsce w Domu. Osoby bez swojego kąta pracują dwa razy wolniej i jedzą dwa razy więcej. Przyciskiem „Zarządzaj pracownikami” otworzysz przydziały do wszystkich miejsc pracy."
    },
    "en": {
      "title": "House",
      "text": "The House gives residents a place of their own and somewhere to rest after work. The Town Hall sets the island’s population limit; the House determines how many residents have housing. Daily House happiness points are available to housed residents. Residents without housing work at half speed and eat twice as much. Select Manage workers to see assignments for every workplace."
    }
  },
  "building-farm": {
    "pl": {
      "title": "Gospodarstwo",
      "text": "Zatrudnij rolników, by zbierali zboże. Młyn przerobi je później na jedzenie dla mieszkańców. Jeśli magazyn przy budynku jest pełny, nad budynkiem pojawia się smutna buźka."
    },
    "en": {
      "title": "Farm",
      "text": "Assign farmers to grow Grain. The Windmill can turn it into Food for residents. A sad face appears above the building when its local store is full."
    }
  },
  "building-windmill": {
    "pl": {
      "title": "Młyn",
      "text": "Przydziel młynarzy i zadbaj o zapas zboża w magazynie centralnym. Z dwóch jednostek zboża powstaje jedna jednostka żywności. Jeśli magazyn przy budynku jest pełny, nad budynkiem pojawia się smutna buźka."
    },
    "en": {
      "title": "Windmill",
      "text": "Assign millers and keep Grain in the central warehouse. Two units of Grain make one unit of Food. A sad face appears above the building when its local store is full."
    }
  },
  "building-quarry": {
    "pl": {
      "title": "Kamieniołom",
      "text": "Przydziel tu mieszkańców, aby wydobywali kamień. Przyda Ci się do rozbudowy budynków i ulepszania ścieżek. Jeśli magazyn przy budynku jest pełny, nad budynkiem pojawia się smutna buźka."
    },
    "en": {
      "title": "Quarry",
      "text": "Assign workers to extract Stone for building upgrades and paths. A sad face appears above the building when its local store is full."
    }
  },
  "building-lumber": {
    "pl": {
      "title": "Drwale",
      "text": "Zatrudnij drwali, by zbierali drewno. Wykorzystasz je do budowy albo przerobisz w Tartaku. Jeśli magazyn przy budynku jest pełny, nad budynkiem pojawia się smutna buźka."
    },
    "en": {
      "title": "Lumber Camp",
      "text": "Assign lumberjacks to gather Wood for construction and processing at the Sawmill. A sad face appears above the building when its local store is full."
    }
  },
  "building-sawmill": {
    "pl": {
      "title": "Tartak",
      "text": "Przydziel pracowników i zapewnij im drewno w magazynie centralnym. Z dwóch jednostek drewna wyprodukują jedną deskę do budowy. Jeśli magazyn przy budynku jest pełny, nad budynkiem pojawia się smutna buźka."
    },
    "en": {
      "title": "Sawmill",
      "text": "Assign workers and keep Wood in the central warehouse. Two units of Wood make one Plank for construction. A sad face appears above the building when its local store is full."
    }
  },
  "building-warehouse": {
    "pl": {
      "title": "Magazyn",
      "text": "Przydziel tu tragarzy. Odbiorą towary od producentów i dowiozą materiały na budowę. Rozbudowuj Magazyn, gdy brakuje miejsca na zasoby. Zasady magazynowania i szczegóły dostępnych zapasów znajdziesz pod symbolem „i”."
    },
    "en": {
      "title": "Warehouse",
      "text": "Assign carriers to collect finished goods and deliver construction materials. Upgrade the Warehouse when you need more storage. Open the i symbol for storage rules and stock details."
    }
  },
  "building-market": {
    "pl": {
      "title": "Targ",
      "text": "Wymieniaj towary z grą w obrębie tej samej kategorii. Prowizja wynosi 10%. Od 6. poziomu Ratusza możesz też sprzedawać materiały innym graczom za monety. Możesz ustawić niższą cenę, ale nie wyższą niż podstawowa cena zakupu tych towarów od gry."
    },
    "en": {
      "title": "Market",
      "text": "Exchange goods with the game within the same category for a 10% margin. From Town Hall level 6, you can also sell materials to other players for coins. Your price may be lower than the game’s base selling price, but cannot exceed it."
    }
  },
  "building-dock": {
    "pl": {
      "title": "Port",
      "text": "Od 4. poziomu Ratusza kupujesz i sprzedajesz materiały za monety. Od 6. poziomu możesz też korzystać z ofert innych graczy. Rozbudowuj Ratusz na wyspie macierzystej, by zakładać kolejne wyspy: na poziomach 10, 13, 16 i dalej co trzy poziomy, do 20 wysp łącznie. Statkiem przewozisz towary albo pasażerów."
    },
    "en": {
      "title": "Harbor",
      "text": "From Town Hall level 4, buy and sell materials for coins. Other players’ offers are also available from level 6. Upgrade the mother island’s Town Hall to found more islands at levels 10, 13, 16 and every three levels afterwards, up to 20 islands in total. Your ship carries goods or passengers."
    }
  },
  "building-chapel": {
    "pl": {
      "title": "Kaplica",
      "text": "W Kaplicy zdobywasz błogosławieństwa, które zapewniają szczęście mieszkańców. Częstotliwość modlitw wpływa na przychylność Stwórcy."
    },
    "en": {
      "title": "Chapel",
      "text": "Receive blessings at the Chapel to make residents happier. How often you pray affects the Creator’s favour."
    }
  },
  "building-lighthouse": {
    "pl": {
      "title": "Latarnia",
      "text": "Odbudowa i rozbudowa Latarni to jeden z głównych celów gry. Jej misje inspirują do rozwijania produkcji, budynków i całej osady. Kolejne etapy odbudowy przynoszą czasowe premie do szczęścia i produkcji. Mieszkańców możesz też wysyłać na zwiedzanie, aby po powrocie byli szczęśliwsi."
    },
    "en": {
      "title": "Lighthouse",
      "text": "Restoring and developing the Lighthouse is one of the game’s main goals. Its missions encourage growth in production, buildings and the whole settlement. Each completed upgrade grants temporary happiness and production benefits. You can also send residents on visits so they return happier."
    }
  },
  "ship": {
    "pl": {
      "title": "Statek i handel",
      "text": "Kliknij statek, aby otworzyć handel w Porcie."
    },
    "en": {
      "title": "Ship and trade",
      "text": "Select the ship to open Harbor trade."
    }
  },
  "category-administration": {
    "pl": {
      "title": "Administracja",
      "text": "Tutaj znajdziesz Ratusz, Dom, Magazyn, Targ, Port, Kaplicę i Latarnię. Wybierz budynek, aby sprawdzić jego działanie, obsadę, koszty i możliwości rozbudowy."
    },
    "en": {
      "title": "Administration",
      "text": "Find the Town Hall, House, Warehouse, Market, Harbor, Chapel and Lighthouse here. Select a building to check its purpose, workers, costs and upgrades."
    }
  },
  "category-economy": {
    "pl": {
      "title": "Gospodarka",
      "text": "Tutaj wybierasz budynki produkujące i przetwarzające zasoby. Przydzieleni mieszkańcy wytwarzają towary, a tragarze Magazynu odbierają gotowe zapasy i dostarczają je do centrali."
    },
    "en": {
      "title": "Economy",
      "text": "Find the buildings that produce and process resources. Assigned residents make goods, and Warehouse carriers collect the finished stock for central storage."
    }
  },
  "category-resources": {
    "pl": {
      "title": "Zasoby",
      "text": "To karty zasobów wyspy — szybko sprawdzisz tu, ile masz surowców. Pierwsza wartość pokazuje zapas u producenta, druga w magazynie centralnym, a trzecia, w nawiasie, ilość w transporcie. Ostatnia linia pokazuje, ile zasobu przybywa lub ubywa na godzinę."
    },
    "en": {
      "title": "Resources",
      "text": "These cards show your island’s resources. The first value is stock at the producer, the second is central stock and the value in brackets is in transit. The last line shows the amount gained or spent per hour."
    }
  },
  "category-decorations": {
    "pl": {
      "title": "Dekoracje i atrakcje",
      "text": "To pojedyncze zdarzenia — dają czasowe premie do szczęścia za monety. Przed zakupem sprawdź cenę, objętych premią mieszkańców i czas trwania efektu."
    },
    "en": {
      "title": "Decorations and attractions",
      "text": "These individual events grant temporary happiness benefits for coins. Check the price, affected residents and effect duration before buying."
    }
  },
  "category-paths": {
    "pl": {
      "title": "Ścieżki",
      "text": "Ulepszanie ścieżek kosztuje kamień i usprawnia przewóz towarów. Ukończ wszystkie odcinki bieżącego poziomu, aby otrzymać premię i przejść do następnego poziomu ścieżek."
    },
    "en": {
      "title": "Paths",
      "text": "Path upgrades cost Stone and improve goods transport. Complete every section of the current level to receive its benefit and unlock the next path level."
    }
  },
  "tutorial": {
    "pl": {
      "title": "Pomoc",
      "text": "Pod znakiem zapytania znajdziesz dwie opcje: „Wznów samouczek” i „Wznów tutorial”. Samouczek prowadzi przez 25 praktycznych lekcji, a tutorial objaśnia ekran gry. Po przerwaniu wrócisz do zapamiętanego miejsca; Twój postęp i odebrane nagrody pozostają zachowane."
    },
    "en": {
      "title": "Help",
      "text": "The question mark contains two options: Resume practical tutorial and Resume tutorial. The practical tutorial teaches 25 lessons through real actions; the tutorial explains the game screen. Resume either from where you stopped, keeping your progress and collected rewards."
    }
  },
  "chat": {
    "pl": {
      "title": "Czat",
      "text": "Tu możesz rozmawiać online z innymi graczami — prywatnie lub na czacie swojego sojuszu."
    },
    "en": {
      "title": "Chat",
      "text": "Here you can chat online with other players, privately or with your alliance."
    }
  },
  "notifications": {
    "pl": {
      "title": "Powiadomienia",
      "text": "Tutaj sprawdzisz informacje o budowach, dostawach, zadaniach, premiach i wydarzeniach na wyspie. W Ustawieniach wybierzesz kategorie, które chcesz widzieć."
    },
    "en": {
      "title": "Notifications",
      "text": "Check messages about construction, deliveries, tasks, benefits and island events. Choose which categories to display in Settings."
    }
  },
  "settings": {
    "pl": {
      "title": "Ustawienia i wylogowanie",
      "text": ""
    },
    "en": {
      "title": "Settings and sign-out",
      "text": ""
    }
  },
  "menu": {
    "pl": {
      "title": "Menu wyspy",
      "text": "Menu daje dostęp do zasad, celu głównego, budynków, mieszkańców, magazynu, handlu, ekspedycji oraz Twoich wysp. Znajdziesz tu także Ranking, Sojusz i ligę oraz Pomagam. Do tutoriala i samouczka wrócisz przez znak zapytania na górnym pasku."
    },
    "en": {
      "title": "Island menu",
      "text": "The menu gives access to rules, the main goal, buildings, residents, storage, trade, expeditions and your islands. Ranking, Alliance and league, and I help also have their own entries. Use the question mark in the top bar to return to the tutorial or practical tutorial."
    }
  }
});
export const APPROVED_LESSON_IDS = Object.freeze(["island-map", "happiness-action", "rules-read", "first-job", "townhall-upgrade", "food-check", "workplace-journey", "resources-dock", "transport-priority", "first-delivery", "storage-limits", "food-chain", "house-points", "personal-happiness", "upgrade-cost", "construction-queue", "path-upgrade", "daily-attractions", "chapel-blessing", "market-rules", "lighthouse-visits", "lighthouse-task", "expedition-rules", "returning-workers", "island-review"]);
export const LESSON_COPY = Object.freeze({
  "island-map": {
    "pl": {
      "title": "Znajdź Magazyn i przydziel sześciu tragarzy",
      "description": "Znajdź Magazyn na mapie i przyciskiem „+” przydziel sześciu tragarzy. Otrzymasz nagrodę po przydzieleniu szóstej osoby. Tragarze dotrą do pracy w ciągu 2 minut i zadbają o sprawne dostawy materiałów na budowę."
    },
    "en": {
      "title": "Find the Warehouse and assign six carriers",
      "description": "Find the Warehouse on the map and use + to assign six carriers. You receive the reward after assigning the sixth resident. The carriers reach work within 2 minutes and help construction deliveries run smoothly."
    }
  },
  "happiness-action": {
    "pl": {
      "title": "Ustaw priorytet dostaw na budowę",
      "description": "Otwórz Magazyn i wybierz „Więcej o budynku”. W priorytetach transportu zaznacz „Budowa”, aby tragarze w pierwszej kolejności dostarczali materiały na rozbudowę. Jeśli jeszcze nie dotarli do pracy, zobaczysz ich pozostały czas dojścia."
    },
    "en": {
      "title": "Prioritize construction deliveries",
      "description": "Open the Warehouse and select More about this building. Choose Construction in transport priorities so carriers deliver building supplies first. If they are still walking to work, you can check their remaining journey time."
    }
  },
  "rules-read": {
    "pl": {
      "title": "Znajdź Gospodarstwo i przydziel rolnika",
      "description": "Znajdź Gospodarstwo na mapie i przyciskiem „+” przydziel jednego rolnika. Będzie zbierać zboże potrzebne do przygotowania żywności dla mieszkańców. Pracę rozpocznie po dotarciu do budynku."
    },
    "en": {
      "title": "Find the Farm and assign a farmer",
      "description": "Find the Farm on the map and use + to assign one farmer. Grain is needed to make Food for residents. Work begins after the farmer reaches the building."
    }
  },
  "first-job": {
    "pl": {
      "title": "Znajdź budynek drwali i przydziel pracownika",
      "description": "Znajdź na mapie budynek „Drwale” i przydziel jednego pracownika. Drewno przyda się do rozbudowy osady, produkcji desek i odbudowy Latarni."
    },
    "en": {
      "title": "Find the Lumber Camp and assign a worker",
      "description": "Find the Lumber Camp on the map and assign one worker. Wood supports building upgrades, Plank production and Lighthouse restoration."
    }
  },
  "townhall-upgrade": {
    "pl": {
      "title": "Zleć rozbudowę Ratusza do poziomu 2",
      "description": "Odbierz dostępną pomoc w materiałach, a następnie znajdź Ratusz i zleć jego rozbudowę. Najpierw tragarze dostarczą zasoby, a potem rozpocznie się budowa. Po jej rozpoczęciu możesz sprawdzić cenę dobrowolnego skrócenia czasu za monety."
    },
    "en": {
      "title": "Order Town Hall level 2",
      "description": "Collect the available building assistance, then find the Town Hall and order its upgrade. Carriers deliver the materials first; construction follows. Once building work begins, you may check the coin price of an optional speed-up."
    }
  },
  "food-check": {
    "pl": {
      "title": "Znajdź Młyn i przydziel młynarza",
      "description": "Znajdź Młyn na mapie i przydziel jednego pracownika. Z dwóch jednostek zboża dostępnych w magazynie centralnym powstaje jedna jednostka żywności. Gotową żywność odbiorą tragarze."
    },
    "en": {
      "title": "Find the Windmill and assign a miller",
      "description": "Find the Windmill on the map and assign one worker. Two units of central Grain make one unit of Food. Carriers collect the finished Food."
    }
  },
  "workplace-journey": {
    "pl": {
      "title": "Znajdź Kamieniołom i przydziel kamieniarza",
      "description": "Znajdź Kamieniołom i przydziel jednego pracownika. Pozyskiwany kamień będzie potrzebny przy kolejnych rozbudowach oraz odbudowie Latarni. Pracownik rozpocznie pracę po dotarciu na miejsce."
    },
    "en": {
      "title": "Find the Quarry and assign a worker",
      "description": "Find the Quarry and assign one worker. Stone is needed for further building upgrades and Lighthouse restoration. The worker starts after reaching the workplace."
    }
  },
  "resources-dock": {
    "pl": {
      "title": "Sprawdź ukończenie rozbudowy Ratusza",
      "description": "Poczekaj, aż zakończą się dostawy i budowa Ratusza. W jego oknie sprawdzisz rzeczywisty pozostały czas. Po ukończeniu rozbudowy strzałka wskaże nowy poziom wyspy na górnym pasku."
    },
    "en": {
      "title": "Check the completed Town Hall upgrade",
      "description": "Wait for the Town Hall deliveries and construction to finish. Its window shows the actual remaining time. When the work is complete, an arrow points to the new island level in the top bar."
    }
  },
  "transport-priority": {
    "pl": {
      "title": "Zleć rozbudowę Kamieniołomu",
      "description": "Znajdź Kamieniołom i zleć rozbudowę do poziomu 2. Wykorzystaj materiały przygotowane w poprzedniej lekcji. Większy Kamieniołom pomoże zapewnić kamień na dalszy rozwój wyspy."
    },
    "en": {
      "title": "Order the Quarry upgrade",
      "description": "Find the Quarry and order level 2 using materials prepared by the previous lesson. A larger Quarry helps supply Stone for the island’s growth."
    }
  },
  "first-delivery": {
    "pl": {
      "title": "Znajdź Tartak i przydziel pracownika",
      "description": "Znajdź Tartak i przydziel jednego pracownika. Do wyprodukowania jednej deski potrzebuje dwóch jednostek drewna z magazynu centralnego. Gotowe deski czekają przy Tartaku na odbiór przez tragarzy."
    },
    "en": {
      "title": "Find the Sawmill and assign a worker",
      "description": "Find the Sawmill and assign one worker. Each Plank needs two Wood from central storage. Finished Planks wait at the Sawmill for carriers."
    }
  },
  "storage-limits": {
    "pl": {
      "title": "Przydziel kolejnego tragarza",
      "description": "Wróć do Magazynu i przyciskiem „+” przydziel jeszcze jednego tragarza. Większa obsada pomoże jednocześnie odbierać produkty i obsługiwać budowy."
    },
    "en": {
      "title": "Assign another carrier",
      "description": "Return to the Warehouse and use + to assign another carrier. A larger team can collect products and serve construction at the same time."
    }
  },
  "food-chain": {
    "pl": {
      "title": "Sprawdź ukończenie rozbudowy Kamieniołomu",
      "description": "Poczekaj na zakończenie rozbudowy Kamieniołomu. Pozostały czas sprawdzisz w jego oknie. Nagroda za tę lekcję uzupełni brakujące materiały na powiększenie Magazynu."
    },
    "en": {
      "title": "Check the completed Quarry upgrade",
      "description": "Wait for the Quarry upgrade to finish. Its window shows the remaining time. This lesson’s reward supplies missing materials for the Warehouse upgrade."
    }
  },
  "house-points": {
    "pl": {
      "title": "Powiększ Magazyn",
      "description": "Znajdź Dom i przekaż dostępne punkty szczęścia mieszkańcom mającym w nim miejsce. Możesz wybrać konkretną osobę albo skorzystać z rozdania wszystkim uprawnionym. Pula odnawia się o północy czasu warszawskiego, a po wykonaniu działania pokażemy jego wpływ na szczęście."
    },
    "en": {
      "title": "Expand the Warehouse",
      "description": "Find the Warehouse and order level 2. Total ordinary delivery capacity rises from 4,000 to 6,000 units. Each material has a separate limit; open i for details."
    }
  },
  "personal-happiness": {
    "pl": {
      "title": "Znajdź Dom i rozdaj punkty szczęścia",
      "description": "Znajdź Dom i przekaż mieszkańcom dostępne punkty szczęścia. Możesz wybrać konkretną osobę albo skorzystać z rozdania wszystkim. Pula odnawia się o północy czasu warszawskiego, a po wykonaniu działania pokażemy jego wpływ na szczęście."
    },
    "en": {
      "title": "Find the House and share happiness points",
      "description": "Find the House and allocate its available happiness points. Choose an eligible housed resident or share with everyone eligible. The pool renews at Warsaw midnight. After the action, we will show its effect on happiness."
    }
  },
  "upgrade-cost": {
    "pl": {
      "title": "Sprawdź ukończenie rozbudowy Magazynu",
      "description": "Poczekaj na zakończenie rozbudowy Magazynu. Nagroda za tę lekcję uzupełni brakujące materiały potrzebne do rozbudowy Gospodarstwa."
    },
    "en": {
      "title": "Check the completed Warehouse upgrade",
      "description": "Wait for the Warehouse upgrade to finish. This lesson’s reward provides missing materials for the Farm upgrade."
    }
  },
  "construction-queue": {
    "pl": {
      "title": "Rozbuduj Gospodarstwo",
      "description": "Znajdź Gospodarstwo i zleć rozbudowę do poziomu 2. Większe zbiory zboża pomogą utrzymać produkcję żywności i przygotować wyspę do dalszego rozwoju."
    },
    "en": {
      "title": "Upgrade the Farm",
      "description": "Find the Farm and order level 2. A larger Grain harvest supports Food production and further island growth."
    }
  },
  "path-upgrade": {
    "pl": {
      "title": "Ulepsz odcinek ścieżki",
      "description": "Na dolnym pasku wybierz „Ścieżki”, a następnie wskazany odcinek. Ulepszenie kosztuje 100 jednostek kamienia. Ukończenie wszystkich odcinków bieżącego poziomu zapewni premię do transportu."
    },
    "en": {
      "title": "Improve a path section",
      "description": "Choose Paths in the bottom bar, then the highlighted section. An upgrade costs 100 Stone. Completing all sections of the current level grants its transport benefit."
    }
  },
  "daily-attractions": {
    "pl": {
      "title": "Zorganizuj atrakcję dla mieszkańców",
      "description": "Na dolnym pasku wybierz „Dekoracje”. Sprawdź cenę atrakcji, czas jej działania oraz objętych nią mieszkańców, a następnie kup jedną z dostępnych. Po zakupie wskażemy otrzymaną premię do szczęścia."
    },
    "en": {
      "title": "Arrange an attraction for residents",
      "description": "Choose Decorations in the bottom bar. Check an attraction’s price, duration and affected residents, then buy an available offer. We will point to its happiness benefit."
    }
  },
  "chapel-blessing": {
    "pl": {
      "title": "Znajdź Kaplicę i poproś o błogosławieństwo",
      "description": "Znajdź Kaplicę i wybierz dostępne błogosławieństwo. Otrzymasz materiały oraz czasową premię do szczęścia. Przed potwierdzeniem sprawdź warunki i ewentualny koszt; po otrzymaniu błogosławieństwa wskażemy jego działanie."
    },
    "en": {
      "title": "Find the Chapel and receive a blessing",
      "description": "Find the Chapel and choose an available blessing. You receive materials and a temporary happiness benefit. Check the conditions and any cost before confirming; afterwards we will point to its effect."
    }
  },
  "market-rules": {
    "pl": {
      "title": "Sprawdź ukończenie rozbudowy Gospodarstwa",
      "description": "Poczekaj na zakończenie rozbudowy Gospodarstwa. Nagroda pomoże przygotować materiały do pierwszego zadania związanego z Latarnią."
    },
    "en": {
      "title": "Check the completed Farm upgrade",
      "description": "Wait for the Farm upgrade to finish. The reward helps prepare materials for your first Lighthouse task."
    }
  },
  "lighthouse-visits": {
    "pl": {
      "title": "Wykonaj zadanie Latarni",
      "description": "Otwórz „Zadania”, sprawdź cel bieżącego etapu misji Latarni i potwierdź jego przyjęcie. Wykonaj wskazane działanie. Jeśli zadanie dotyczy dostaw, przekaż wszystkie wymagane towary. Nagroda za tę lekcję uzupełni brakujące materiały i monety na pierwszą odbudowę Latarni."
    },
    "en": {
      "title": "Complete a Lighthouse task",
      "description": "Open Tasks, check the goal of the current Lighthouse stage and confirm it. Perform the required action; delivery tasks require all listed goods. This lesson’s reward supplies missing materials and coins for the first Lighthouse restoration."
    }
  },
  "lighthouse-task": {
    "pl": {
      "title": "Wygraj rundę minigry i odbierz monety",
      "description": "Otwórz „Ekspedycje” i wybierz minigrę. Wygraj jedną rundę, a następnie wypłać zgromadzone monety. Wygrana i odebranie puli kończą tę lekcję."
    },
    "en": {
      "title": "Win a minigame round and collect the coins",
      "description": "Open Expeditions and choose a minigame. Win one round, then cash out the accumulated coins. Winning and collecting the pot complete this lesson."
    }
  },
  "expedition-rules": {
    "pl": {
      "title": "Rozpocznij odbudowę Latarni",
      "description": "Znajdź Latarnię na mapie i otwórz jej okno. Sprawdź postęp misji, wymagania i koszt odbudowy. Dokończ wskazane przygotowania, a następnie wykorzystaj materiały, aby rozpocząć odbudowę. To jeden z głównych celów rozwoju Twojej wyspy."
    },
    "en": {
      "title": "Start restoring the Lighthouse",
      "description": "Find the Lighthouse on the map and open it. Check mission progress, requirements and restoration cost. Finish the indicated preparations, then use the materials to begin restoring it. This is one of your island’s main development goals."
    }
  },
  "returning-workers": {
    "pl": {
      "title": "Zobacz, jak Latarnia znów rozświetla wyspę",
      "description": "Poczekaj na zakończenie dostaw i odbudowy Latarni. Po ukończeniu prac wskażemy jej nowy poziom oraz premię: szczęście wszystkich mieszkańców wyniesie 100% przez pokazany czas. Sprawdź, jak wspólny wysiłek zmienił Twoją wyspę."
    },
    "en": {
      "title": "See the Lighthouse illuminate the island again",
      "description": "Wait for Lighthouse deliveries and restoration to finish. We will point to its new level and benefit: every resident has 100% happiness for the displayed duration. See how your joint effort has changed the island."
    }
  },
  "island-review": {
    "pl": {
      "title": "Zakończ samouczek i odbierz zapas na dalszy rozwój",
      "description": "Sprawdź końcową nagrodę i zakończ samouczek. Otrzymasz monety oraz uzupełnienie wolnego miejsca w Magazynie. Znasz już podstawy — teraz Ty wyznaczasz kierunek rozwoju wyspy."
    },
    "en": {
      "title": "Finish the practical tutorial and receive supplies",
      "description": "Review the final reward and finish the practical tutorial. You receive coins and supplies to fill free Warehouse space. You know the basics: now choose how your island develops."
    }
  }
});
const INTRO_COPY = {
  "pl": {
    "title": "Twoja wyspa, Twoje decyzje",
    "paragraphs": [
      "Obejmujesz opiekę nad małą osadą na wyspie. Zapewnij mieszkańcom domy, żywność i pracę, a z czasem rozbuduj ją w tętniący życiem port.",
      "Rozwijaj osadę i dbaj o dobrostan mieszkańców. Jednym z Twoich głównych celów jest odbudowa i rozbudowa Latarni. Kolejne etapy jej odbudowy wyznaczą cele rozwoju całej wyspy. Usprawniaj produkcję, organizuj dostawy i dbaj o szczęście mieszkańców — to oni przywrócą Latarni dawny blask."
    ]
  },
  "en": {
    "title": "Your island, your decisions",
    "paragraphs": [
      "Take care of a small island settlement. Provide homes, food and work, and grow it into a lively port.",
      "Develop the settlement and look after its residents. Restoring and developing the Lighthouse is one of your main goals. Each restoration stage gives the whole island new goals. Improve production, arrange deliveries and care for residents’ happiness: together, they will bring the Lighthouse back to life."
    ]
  }
};
export const UI_COPY = Object.freeze({
  "goalTitle": {
    "pl": "Rozwijaj wyspę. Przywróć Latarni blask.",
    "en": "Grow your island. Restore the Lighthouse’s light."
  },
  "goalDescription": {
    "pl": "Rozbudowuj osadę, dbaj o mieszkańców i przywracaj Latarni dawny blask. Kolejne etapy jej odbudowy wyznaczą Ci nowe cele: sprawniejszą produkcję, większą osadę i lepsze warunki życia. Każde wykonane zadanie przybliża Twoją wyspę do następnego wielkiego kroku.",
    "en": "Develop the settlement, care for its residents and restore the Lighthouse’s light. Each restoration stage brings new goals: stronger production, a larger settlement and better living conditions. Every completed task brings the whole island closer to its next achievement."
  },
  "lighthouseDescription": {
    "pl": "Latarnia jest sercem wyspy i jednym z głównych celów jej rozwoju. Rozwijaj produkcję, przygotowuj zapasy i angażuj mieszkańców w kolejne misje, aby przywracać jej dawny blask. Ukończona rozbudowa na pewien czas zwiększa szczęście wszystkich mieszkańców i podwaja produkcję materiałów. Mieszkańcy też chętnie ją zwiedzają — po powrocie otrzymają premię szczęścia.",
    "en": "The Lighthouse is the heart of the island and one of its main development goals. Grow production, prepare supplies and involve residents in new missions to restore its light. A completed upgrade improves every resident’s happiness for a while and doubles material production. Residents also enjoy visiting it and return with a happiness benefit."
  },
  "houseDescription": {
    "pl": "Dom zapewnia mieszkańcom własny kąt i miejsce odpoczynku po pracy. Wypoczęci pracownicy są szczęśliwsi. Rozbudowuj go, gdy osada potrzebuje więcej miejsc do zamieszkania. Przyciskiem „Zarządzaj pracownikami” sprawdzisz przydziały do wszystkich miejsc pracy. Mieszkańcy bez miejsca w Domu pracują dwa razy wolniej i jedzą dwa razy więcej. Codzienna pula szczęścia z Domu obejmuje tylko mieszkańców mających w nim miejsce.",
    "en": "The House gives residents a place of their own and somewhere to rest after work. Rested workers are happier. Expand it when the settlement needs more housing. Manage workers opens assignments for every workplace. Residents without housing work at half speed and eat twice as much. The House’s daily happiness pool is available only to housed residents."
  },
  "workersDescription": {
    "pl": "Wybierz miejsce pracy i zmieniaj obsadę przyciskami „+” i „−”. Mieszkaniec potrzebuje 2 minut, aby dojść z Domu do pracy. Po odwołaniu powrót do Domu również trwa 2 minuty. Do kolejnego zadania możesz go przydzielić, gdy wróci na miejsce.\n\nTragarz z ładunkiem najpierw kończy rozpoczętą dostawę. Dopiero potem rozpoczyna powrót do Domu.",
    "en": "Choose a workplace and use + or − to change its team. A resident takes 2 minutes to walk from Home to work. Returning Home after release also takes 2 minutes. They become available for a new assignment after returning. A loaded carrier finishes the current delivery before starting the journey Home."
  },
  "warehouseRules": {
    "pl": "W głównym widoku widzisz całą dostępną ilość każdego materiału. Możesz ją wydać na budowę, handel lub zadania.\n\nZwykłe dostawy zajmują miejsce w Magazynie. Materiały otrzymane jako nagrody są dostępne od razu i nie zajmują tego limitu. Dlatego łączny zapas może być większy niż podana pojemność. Szczegółowy podział znajdziesz poniżej. Monety są przechowywane osobno.\n\nMagazyn ma limit łączny i osobny limit dla każdego materiału. Tragarze odbierają towary od producentów i dowożą materiały na budowę zgodnie z ustawionymi priorytetami.",
    "en": "The main view shows all available stock for each material, ready for construction, trade or tasks. Ordinary deliveries use storage capacity. Reward materials are available immediately without using that capacity, so available stock may exceed the stated limit. The breakdown is shown below; coins are stored separately. The Warehouse has a total limit and a separate limit per material. Carriers collect products and supply construction according to your priorities."
  },
  "helpTitle": {
    "pl": "Pomoc",
    "en": "Help"
  },
  "helpDescription": {
    "pl": "Samouczek prowadzi przez praktyczne działania, a tutorial objaśnia ekran gry. Wybierz, do czego chcesz wrócić.",
    "en": "The practical tutorial teaches you through actions; the tutorial explains the game screen. Choose which one to resume."
  },
  "resumePractical": {
    "pl": "Wznów samouczek",
    "en": "Resume practical tutorial"
  },
  "resumeTour": {
    "pl": "Wznów tutorial",
    "en": "Resume tutorial"
  },
  "restartTour": {
    "pl": "Od początku",
    "en": "From the beginning"
  },
  "reviewPractical": {
    "pl": "Przejrzyj od początku",
    "en": "Review from the beginning"
  },
  "exitTourTitle": {
    "pl": "Tutorial został zamknięty",
    "en": "Tutorial closed"
  },
  "exitTourBody": {
    "pl": "Aby wrócić do przerwanego miejsca, kliknij ? → Wznów tutorial.",
    "en": "To return to where you stopped, select ? → Resume tutorial."
  },
  "firstTourClosed": {
    "pl": "Czas na wyspie zaczyna teraz biec.",
    "en": "Island time starts running now."
  },
  "replayTourClosed": {
    "pl": "Twoja wyspa działa dalej.",
    "en": "Your island keeps running."
  },
  "understood": {
    "pl": "Rozumiem",
    "en": "Understood"
  },
  "rewardTitle": {
    "pl": "Lekcja ukończona",
    "en": "Lesson complete"
  },
  "rewardWellDone": {
    "pl": "Brawo!",
    "en": "Well done!"
  },
  "rewardOwned": {
    "pl": "Nagroda jest już Twoja.",
    "en": "The reward is already yours."
  },
  "rewardFooter": {
    "pl": "Nagroda została dodana do Twoich zasobów. Kliknij „Dalej”, aby przejść do kolejnej lekcji.",
    "en": "The reward has been added to your resources. Select Next to continue to the next lesson."
  },
  "workersRecall": {
    "pl": "Tragarze są w trakcie transportu towarów. Muszą zakończyć dostawę, która już jest rozpoczęta. Następnie wrócą do Domu. Czas powrotu do domu to 2 min.",
    "en": "The carriers are transporting goods. They must finish the delivery already in progress, then return Home. The journey Home takes 2 minutes."
  },
  "workerAssigned": {
    "pl": "Mieszkaniec wyruszył do pracy. Dotrze na miejsce za 2 minuty.",
    "en": "The resident has set off for work and will arrive in 2 minutes."
  },
  "workerReturning": {
    "pl": "Pracownik wraca do Domu. Pozostały czas powrotu: {time}.",
    "en": "The worker is returning Home. Time remaining: {time}."
  },
  "constructionTitle": {
    "pl": "Trwa rozbudowa {building}",
    "en": "{building} upgrade in progress"
  },
  "constructionWaiting": {
    "pl": "Rozbudowa zakończy się za {time}. Zaczekaj na ukończenie prac. W tym czasie możesz dalej zajmować się wyspą.",
    "en": "The upgrade will finish in {time}. Wait for the work to complete; you can keep managing the island in the meantime."
  },
  "constructionHauling": {
    "pl": "Pozostały czas obejmuje dostarczenie materiałów i budowę.",
    "en": "The remaining time includes material deliveries and construction."
  },
  "constructionBuilding": {
    "pl": "Materiały są już na miejscu. Trwają prace budowlane.",
    "en": "The materials have arrived. Building work is under way."
  },
  "constructionDeliveryLine": {
    "pl": "Transport: {time}",
    "en": "Transport: {time}"
  },
  "constructionBuildAfterDelivery": {
    "pl": "Budowa po dostawie: {time}",
    "en": "Building after delivery: {time}"
  },
  "constructionCompleteLine": {
    "pl": "Do ukończenia: {time}",
    "en": "Until completion: {time}"
  },
  "constructionMaterialsDelivered": {
    "pl": "Materiały dostarczone.",
    "en": "Materials delivered."
  },
  "constructionFinishes": {
    "pl": "Koniec budowy za {time}.",
    "en": "Construction finishes in {time}."
  },
  "carriersWalking": {
    "pl": "Tragarze są w drodze do Magazynu. Dotarcie za {time}.",
    "en": "Carriers are walking to the Warehouse. Arrival in {time}."
  },
  "carriersRequired": {
    "pl": "Materiały czekają na tragarzy. Przydziel pracowników w Magazynie.",
    "en": "Materials are waiting for carriers. Assign workers at the Warehouse."
  },
  "levelChanged": {
    "pl": "Ratusz osiągnął poziom {level}. Wzrósł limit mieszkańców Twojej wyspy. Nowy poziom zobaczysz tutaj.",
    "en": "The Town Hall has reached level {level}, increasing the island’s population limit. Its new level is shown here."
  },
  "lighthouseChanged": {
    "pl": "Latarnia znów świeci! Szczęście wszystkich mieszkańców wynosi teraz 100% przez {time}, a produkcja materiałów jest dwukrotnie większa.",
    "en": "The Lighthouse shines again! Every resident has 100% happiness for {time}, and material production is doubled."
  },
  "happinessChanged": {
    "pl": "Punkty szczęścia przekazane. Szczęście mieszkańców: {before}% → {after}%.",
    "en": "Happiness points allocated. Residents’ happiness: {before}% → {after}%."
  },
  "happinessAllocated": {
    "pl": "Wybrani mieszkańcy otrzymali punkty szczęścia. Szczegóły znajdziesz w Domu.",
    "en": "The selected residents received happiness points. Check the House for details."
  },
  "effectActive": {
    "pl": "{effect} działa. Premia: {value}. Pozostały czas: {time}.",
    "en": "{effect} is active. Benefit: {value}. Time remaining: {time}."
  },
  "happinessAlreadyMaximum": {
    "pl": "Mieszkańcy korzystają już ze szczęścia 100%. Nową premię zobaczysz na liście aktywnych efektów.",
    "en": "Residents already have 100% happiness. The new benefit is shown in active effects."
  },
  "constructionShortened": {
    "pl": "Budowa została skrócona o {minutes} min {seconds} s. Do ukończenia pozostało {time}.",
    "en": "Construction shortened by {minutes} min {seconds} s. Time remaining: {time}."
  },
  "practicalCompleteTitle": {
    "pl": "Samouczek ukończony!",
    "en": "Practical tutorial complete!"
  },
  "practicalComplete": {
    "pl": "Znasz już podstawy. Teraz Ty wyznaczasz kierunek rozwoju wyspy — rozbudowuj osadę, dbaj o mieszkańców i realizuj kolejne misje Latarni.",
    "en": "You know the basics. Now choose how your island grows: develop the settlement, care for residents and pursue the next Lighthouse missions."
  },
  "alreadyCompleted": {
    "pl": "To zadanie zostało już wykonane samodzielnie. Przechodzisz do następnej lekcji bez powtarzania działania.",
    "en": "You have already completed this task independently. Continue to the next lesson without repeating the action."
  },
  "missionAccepted": {
    "pl": "Zadanie rozpoczęte. Sprawdź wymagania i pozostały czas. Każdy ukończony krok przybliża wyspę do wspólnego celu.",
    "en": "Task started. Check its requirements and time remaining. Each completed step brings the island closer to its shared goal."
  },
  "missionComplete": {
    "pl": "Gotowe! Ten etap jest ukończony. Nagroda została dodana do Twoich zasobów. Przejdź do kolejnego zadania.",
    "en": "Done! This stage is complete and its reward has been added to your resources. Continue to the next task."
  },
  "missionTimeout": {
    "pl": "Tego etapu nie udało się ukończyć w terminie. Przygotujmy dodatkowe wsparcie dla osady. Wcześniej wykonane zadania pozostają zaliczone.",
    "en": "This stage was not finished before its deadline. Let’s arrange extra support for the settlement. Earlier completed tasks remain recorded."
  },
  "supportBegin": {
    "pl": "Misja pomocnicza: etap 1 z 5. Zorganizujmy wsparcie i wróćmy do głównego celu.",
    "en": "Supporting mission: stage 1 of 5. Arrange support and return to the main goal."
  },
  "supportComplete": {
    "pl": "Wsparcie zakończone. Wracasz do misji głównej: zadanie {step} z 8.",
    "en": "Support complete. Return to the main mission: task {step} of 8."
  },
  "rescueBegin": {
    "pl": "Misja ratunkowa: etap 1 z 3. Zajmijmy się najpilniejszymi sprawami.",
    "en": "Rescue mission: stage 1 of 3. Deal with the most urgent needs."
  },
  "rescueComplete": {
    "pl": "Plan ratunkowy zakończony. Wracasz do misji pomocniczej: zadanie {step} z 5.",
    "en": "Rescue plan complete. Return to the supporting mission: task {step} of 5."
  },
  "rescueRetry": {
    "pl": "Ten etap wymaga jeszcze jednej próby. Przygotuj osadę i spróbuj ponownie. Wcześniejszy postęp pozostaje zachowany.",
    "en": "This stage needs another attempt. Prepare the settlement and try again. Earlier progress remains recorded."
  },
  "chapterComplete": {
    "pl": "Wspólny cel osiągnięty! Latarnia znów świeci, a Twoja osada jest gotowa na dalszy rozwój. Skorzystaj z premii i przygotuj wyspę do kolejnych wyzwań.",
    "en": "A shared goal achieved! The Lighthouse shines again and the settlement is ready to grow. Enjoy its benefits and prepare the island for new challenges."
  },
  "chatDemo": {
    "pl": "Demonstracja DEV. Ta rozmowa służy do sprawdzenia działania czatu. Wiadomości nie trafiają do innych prawdziwych graczy.",
    "en": "DEV demonstration. This conversation tests the chat interface. Messages do not reach other real players."
  },
  "chatUnavailable": {
    "pl": "Czat jest jeszcze niedostępny w tym środowisku. Gdy usługa zostanie uruchomiona, porozmawiasz tutaj prywatnie lub na czacie sojuszu.",
    "en": "Chat is not available in this environment yet. Once the service is enabled, you can talk privately or with your alliance here."
  }
});

const lang = value => value === 'pl' ? 'pl' : 'en';
export function introCopy(language = 'pl') {
  const copy = INTRO_COPY[lang(language)];
  return { title: copy.title, paragraphs: [...copy.paragraphs] };
}
export const approvedIntroText = introCopy;
export function lessonCopy(id, language = 'pl', { curriculum = 5 } = {}) {
  if (curriculum !== 5 || !Object.hasOwn(LESSON_COPY, id)) return null;
  return { ...LESSON_COPY[id][lang(language)] };
}
export function uiCopy(key, language = 'pl', variables = {}) {
  const copy = UI_COPY[key]?.[lang(language)] || '';
  return copy.replace(/\{([a-zA-Z0-9_]+)\}/g, (original, field) => Object.hasOwn(variables, field) ? String(variables[field]) : original);
}
const resourceNames = {
  stone: { pl: 'Kamień', en: 'Stone' }, wood: { pl: 'Drewno', en: 'Wood' },
  grain: { pl: 'Zboże', en: 'Grain' }, food: { pl: 'Żywność', en: 'Food' },
  planks: { pl: 'Deski', en: 'Planks' }
};
const numeric = value => typeof value === 'number' && Number.isFinite(value);
function resourceExampleText(example, language) {
  if (!example || !Object.hasOwn(resourceNames, example.resource || 'stone')) return '';
  const local = example.local, central = example.central, transit = example.inTransit ?? example.transit;
  const balance = example.hourlyBalance ?? example.balance ?? example.rate;
  if (![local, central, transit, balance].every(numeric)) return '';
  const number = value => new Intl.NumberFormat(language === 'pl' ? 'pl-PL' : 'en-US', { maximumFractionDigits: 2 }).format(value);
  const resource = resourceNames[example.resource || 'stone'][language];
  const rate = `${balance > 0 ? '+' : ''}${number(balance)}`;
  return language === 'pl'
    ? `Na Twojej wyspie: ${resource} ${number(local)} / ${number(central)} (${number(transit)}), → ${rate} szt./h. To ${number(local)} u producenta, ${number(central)} w magazynie centralnym, ${number(transit)} w transporcie oraz bilans ${rate} sztuk na godzinę.`
    : `On your island: ${resource} ${number(local)} / ${number(central)} (${number(transit)}), → ${rate} units/h. That is ${number(local)} at the producer, ${number(central)} in central storage, ${number(transit)} in transit and a net balance of ${rate} units per hour.`;
}
export function getTourCopy(id, language = 'pl', options = {}) {
  const languageId = lang(language), selected = TOUR_COPY[id]?.[languageId];
  if (!selected) return { title: '', text: '' };
  const copy = { ...selected };
  if (id === 'clock') copy.text = languageId === 'pl'
    ? options.firstIntroduction ? 'Wyspa ma własny kalendarz. Po ukończeniu lub zamknięciu tutoriala produkcja, transport, posiłki i budowa zaczną biec w czasie rzeczywistym, również podczas Twojej nieobecności. Teraz czas pozostaje zatrzymany.' : 'To ponowne oprowadzanie po rozpoczętej wyspie. Jej zegar biegnie dalej: produkcja, transport, posiłki i budowa trwają podczas oglądania podpowiedzi. Twój postęp pozostaje zachowany.'
    : options.firstIntroduction ? 'The island has its own calendar. Once you finish or close the tutorial, production, transport, meals and construction run in real time, including while you are away. Time is paused for now.' : 'This is another tour of your started island. Production, transport, meals and construction keep running while you read. Your progress is preserved.';
  if (id === 'settings') {
    copy.title = languageId === 'pl' ? options.cloudAccount ? 'Ustawienia i wylogowanie' : 'Ustawienia' : options.cloudAccount ? 'Settings and sign-out' : 'Settings';
    copy.text = languageId === 'pl'
      ? options.cloudAccount ? 'Tutaj zmienisz język, animacje i powiadomienia oraz wylogujesz się z konta. Postęp zapisuje się automatycznie co 30 sekund w chmurze.' : 'Tutaj zmienisz język, animacje i powiadomienia. Ten podgląd działa w pamięci i znika po odświeżeniu strony.'
      : options.cloudAccount ? 'Change language, animations and notifications here, or sign out. Progress saves automatically to the cloud every 30 seconds.' : 'Change language, animations and notifications here. This preview runs in memory and disappears when you reload.';
  }
  if (id === 'category-resources') {
    const example = resourceExampleText(typeof options.resourceExample === 'function' ? options.resourceExample() : options.resourceExample, languageId);
    copy.text += `${example ? `\n\n${example}` : ''}\n\n${languageId === 'pl' ? 'Kliknięcie zasobu otwiera jego budynek produkcyjny.' : 'Select a resource to open its production building.'}`;
  }
  return copy;
}
export const APPROVED_TRANSLATIONS = Object.freeze(Object.fromEntries([
  ...Object.entries(TOUR_COPY).flatMap(([id, copy]) => [...(id === 'building-lighthouse' ? [] : [[copy.en.title, copy.pl.title]]), ...(copy.en.text ? [[copy.en.text, copy.pl.text]] : [])]),
  ...Object.values(LESSON_COPY).flatMap(copy => [[copy.en.title, copy.pl.title], [copy.en.description, copy.pl.description]]),
  ...Object.values(UI_COPY).map(copy => [copy.en, copy.pl])
]));
