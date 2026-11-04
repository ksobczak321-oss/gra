// The first season is driven by real island state and completed puzzles.
// Reading a briefing never substitutes for solving a puzzle or delivering goods.
export const CAMPAIGN_VERSION = 1;
export const CAMPAIGN_FIRST_LEVEL = 2;
export const CAMPAIGN_LAST_LEVEL = 20;
export const CAMPAIGN_REWARD_WEIGHTS = Object.freeze([.1,.1,.1,.15,.15,.1,.1,.2]);
const title = (pl,en) => ({pl,en});
const review = (pl,en,building='lighthouse') => ({type:'review',title:title(pl,en),building});
const check = (key,pl,en,value=1,building) => ({type:'check',check:key,value,title:title(pl,en),...(building?{building}:{})});
const puzzle = (kind,pl,en) => ({type:'adventure',kind:'islandPuzzle',puzzleKind:kind,title:title(pl,en)});
const story = (storyId,pl,en,extra={}) => ({type:'adventure',kind:'escapeStory',storyId,title:title(pl,en),...extra});
const stock = (resource,pl,en,scale=5) => ({type:'stock',resource,scale,title:title(pl,en)});
const give = (resource,pl,en,scale=3) => ({type:'contribute',resource,scale,title:title(pl,en)});
const produce = (resource,pl,en,scale=3) => ({type:'production',resource,scale,title:title(pl,en)});
const delivered = (resource,pl,en,scale=3) => ({type:'delivered',resource,scale,title:title(pl,en)});
const build = (building,pl,en,target) => ({type:'building',building,title:title(pl,en),...(target?{target}:{})});
const light = (pl='Przywróć Latarni blask',en='Restore the Lighthouse light') => build('lighthouse',pl,en);
const lightStock = () => ({type:'stock',costBuilding:'lighthouse',title:title('Przygotuj pełny koszt Latarni','Prepare the full Lighthouse budget')});
const recruit = (pl,en,targetPopulation) => ({type:'recruitment',count:1,title:title(pl,en),...(targetPopulation?{targetPopulation}:{})});
const ship = (pl,en,count=1) => ({type:'shipping',count,direction:'buy',title:title(pl,en),building:'dock'});
const chapter = (level,pl,en,storyId,worldChange,steps) => Object.freeze({level,title:title(pl,en),storyId,worldChange:title(...worldChange),steps:Object.freeze(steps.map(Object.freeze))});

export const CAMPAIGN_CHAPTERS = Object.freeze([
  chapter(2,'Goście spod spadających gwiazd','Guests beneath the falling stars','star-guests',
    ['Pierwsza noc meteorów i bezpieczne przybycie gości.','The first meteor night and the guests’ safe arrival.'],[
      review('Poznaj plan nocy meteorów','Read the meteor-night plan'),
      check('housing','Sprawdź miejsca dla gości','Check the guests’ beds',1,'house'),
      give('wood','Dostarcz drewno ekipie widokowej','Deliver Wood to the lookout crew'),
      produce('planks','Przygotuj deski na punkt widokowy','Produce Planks for the viewpoint'),
      stock('food','Przygotuj poczęstunek bez naruszania rezerwy','Prepare refreshments without spending the meal reserve'),
      recruit('Powitaj nowego mieszkańca','Welcome a new resident'),
      lightStock(),light('Rozświetl noc meteorów','Light the meteor night')]),
  chapter(3,'Miejsce dla nowych sąsiadów','Room for new neighbors','captainless-ship',
    ['Osada jest przygotowana na nowych sąsiadów i awans Ratusza.','The settlement is ready for new neighbors and a Town Hall upgrade.'],[
      review('Poznaj próg 54 mieszkańców','Review the 54-resident requirement','townhall'),
      stock('food','Przygotuj jedzenie dla nowej załogi','Prepare meals for the new crew',8),
      build('house','Zapewnij co najmniej 54 łóżka','Provide at least 54 beds',3),
      story('captainless-ship','Sprowadź załogę statku bez kapitana','Bring the captainless ship’s crew ashore',{recruitmentTarget:54}),
      recruit('Przyjmij mieszkańców do progu 54','Welcome residents up to the 54-person threshold',54),
      check('food','Zabezpiecz posiłki przed awansem','Keep the meal reserve before upgrading',1,'warehouse'),
      build('townhall','Ukończ rozbudowę Ratusza na poziom 4','Finish Town Hall level 4',4),
      light('Zapal światło dla nowych sąsiadów','Light the way for the new neighbors')]),
  chapter(4,'Przystań otwarta','The harbor opens','harbor-opening',
    ['Pierwszy regularny rejs dotarł do osady.','The settlement has received its first regular voyage.'],[
      review('Poznaj trasę pierwszego rejsu','Read the first voyage route','dock'),
      check('dockCrew','Przygotuj gotową ekipę Portu','Prepare a ready Harbor crew',1,'dock'),
      stock('coins','Odłóż środki na mały zakup w Porcie','Set aside Coins for a small Harbor purchase',4),
      puzzle('packing','Spakuj wyposażenie rejsu','Pack the voyage equipment'),
      ship('Odbierz faktyczny zakup z Portu','Receive an actual Harbor purchase'),
      puzzle('untangle','Przygotuj bezpieczne cumowanie','Prepare safe mooring'),
      lightStock(),light('Zapal sygnał otwartej przystani','Light the open-harbor signal')]),
  chapter(5,'Sztorm, na który jesteśmy gotowi','Ready for the storm','storm-shelter',
    ['Sztorm minął, a przygotowana osada świętuje.','The storm has passed and the prepared settlement celebrates.'],[
      review('Odczytaj prognozę i plan osłon','Read the forecast and shelter plan'),
      stock('food','Zabezpiecz jedzenie przed sztormem','Secure Food before the storm',8),
      produce('planks','Przygotuj deski na osłony','Produce Planks for the shelters',4),
      delivered('stone','Dowieź kamień ekipom zabezpieczającym','Deliver Stone to the shelter crews'),
      check('warehouseCrew','Zapewnij odbiór żywności','Keep a crew available for Food collection',1,'warehouse'),
      puzzle('tides','Uruchom śluzy w bezpiecznej kolejności','Operate the locks in a safe order'),
      lightStock(),light('Uruchom światło awaryjne','Activate the emergency light')]),
  chapter(6,'Wiadomość w butelce','A message in a bottle','bottle-message',
    ['Wyspa znalazła swoje miejsce na szlaku sąsiadów.','The island has found its place on the neighbors’ route.'],[
      review('Odczytaj odnaleziony list','Read the recovered letter'),
      puzzle('parrot','Odtwórz wiadomość papugi','Reconstruct the parrot’s message'),
      puzzle('paperFold','Dopasuj złożoną mapę brzegu','Match the folded coast map'),
      review('Poznaj lokalnego adresata przesyłki','Meet the local recipient','dock'),
      stock('planks','Przygotuj mały zestaw pomocy','Prepare a small assistance kit'),
      give('planks','Nadaj paczkę dla sąsiedniej osady','Send the parcel to the neighboring settlement'),
      puzzle('deduction','Potwierdź drogę przesyłki','Confirm the parcel’s route'),
      light('Zapal nowy znak na szlaku','Light a new sign along the route')]),
  chapter(7,'Sygnały we mgle','Signals through fog','fog-convoy',
    ['Flota bezpiecznie odnalazła drogę do portu.','The fleet has safely found its way into the harbor.'],[
      review('Poznaj język błysków','Learn the language of flashes'),
      puzzle('signalsDecode','Odczytaj sygnał z boi','Decode the buoy’s signal'),
      puzzle('navigation','Wyznacz bezpieczny kurs','Plot a safe course'),
      stock('wood','Przygotuj nocny zapas','Prepare the night supplies'),
      check('warehouseCrew','Sprawdź gotowość ekipy dostaw','Check the delivery crew’s readiness',1,'warehouse'),
      puzzle('optics','Przeprowadź próbę soczewek','Test the lenses'),
      lightStock(),light('Doprowadź konwój przez mgłę','Guide the convoy through fog')]),
  chapter(8,'Zaginiona mapa latarnika','The keeper’s missing map','keeper-map',
    ['Zapomniana zatoczka wróciła na mapę wyspy.','The forgotten cove has returned to the island’s map.'],[
      review('Odbierz fragment dziennika','Read a journal fragment'),
      puzzle('memoryTriples','Odzyskaj fragmenty mapy','Recover the map fragments'),
      puzzle('paperFold','Połącz znaki starej mapy','Join the old map’s markings'),
      puzzle('photo','Odczytaj cień Latarni','Read the Lighthouse shadow'),
      puzzle('navigation','Wybierz bezpieczną zatoczkę','Choose the safe cove'),
      stock('food','Przygotuj zapas wyprawy','Prepare expedition provisions'),
      story('keeper-map','Odnajdź skrytkę latarnika','Find the keeper’s cache'),
      light('Odtwórz dawny znak Latarni','Restore the old Lighthouse sign')]),
  chapter(9,'Zapasy na dalszą drogę','Supplies for the journey','supply-voyage',
    ['Próbny rejs jest gotowy; dalszą drogę wybiera gracz.','The trial voyage is ready; the player chooses the next route.'],[
      review('Odczytaj mapę dalszego szlaku','Read the onward route map'),
      puzzle('navigation','Wybierz lokalną trasę rozpoznawczą','Choose a local reconnaissance route'),
      review('Poznaj koszt próbnej wyprawy','Review the trial-expedition cost','warehouse'),
      check('storageRoom','Sprawdź miejsce na małą dostawę','Check space for a small delivery',20,'warehouse'),
      stock('food','Przygotuj żywność na próbny rejs','Prepare Food for the trial voyage'),
      puzzle('packing','Przygotuj wyposażenie małej ekipy','Pack the small crew’s equipment'),
      give('wood','Przekaż próbny pakunek','Deliver the trial parcel'),
      light('Zapal znak dalekiego szlaku','Light the onward-route sign')]),
  chapter(10,'Światło na drugim brzegu','Light on the other shore','second-shore',
    ['Bezpieczny punkt sygnałowy połączył dwa brzegi.','A safe signal station has connected both shores.'],[
      review('Poznaj dwie drogi rozwoju','Explore the two development paths','townhall'),
      puzzle('navigation','Rozpoznaj drugi brzeg','Explore the far shore'),
      stock('wood','Przygotuj lokalny pakiet wyprawy','Prepare the local expedition kit'),
      puzzle('packing','Spakuj pierwszą pomoc','Pack the first-aid kit'),
      story('second-shore','Odnajdź dawny punkt sygnałowy','Find the old signal station'),
      check('food','Przygotuj bezpieczny rozruch','Prepare a safe start',1,'warehouse'),
      delivered('wood','Potwierdź prawdziwą dostawę','Confirm an actual delivery'),
      light('Rozświetl drugi brzeg','Light the far shore')]),
  chapter(11,'Tajemnica zamkniętej Latarni','The locked Lighthouse','closed-lighthouse',
    ['Historyczna część Latarni została otwarta.','The Lighthouse’s historical gallery has opened.'],[
      review('Otwórz dziennik latarnika','Open the keeper’s journal'),
      puzzle('deduction','Połącz daty i sygnały','Connect the dates and signals'),
      puzzle('hiddenObjects','Odnajdź opisany klucz','Find the described key'),
      puzzle('balance','Uruchom przeciwwagę','Operate the counterweight'),
      puzzle('optics','Ustaw soczewki','Adjust the lenses'),
      story('closed-lighthouse','Rozwiąż tajemnicę Latarni','Solve the Lighthouse mystery'),
      give('planks','Zabezpiecz odnalezione przedmioty','Secure the recovered objects'),
      light('Ukończ galerię dawnych świateł','Complete the gallery of old lights')]),
  chapter(12,'Teatr pod gwiazdami','Theater beneath the stars','lost-performance',
    ['Mieszkańcy obejrzeli pierwszy spektakl pod gwiazdami.','The residents enjoyed their first performance beneath the stars.'],[
      review('Poznaj temat przedstawienia','Discover the performance theme','theatre'),
      puzzle('photo','Wybierz bezpłatną oprawę sceny','Choose the scene’s free arrangement'),
      puzzle('hiddenObjects','Odszukaj rekwizyt','Find the prop'),
      puzzle('optics','Dopasuj światło do sceny','Match the lighting to the scene'),
      stock('food','Przygotuj poczęstunek dla widzów','Prepare refreshments for the audience'),
      story('lost-performance','Odtwórz zaginiony spektakl','Restore the lost performance'),
      puzzle('signalsDecode','Zgraj muzykę ze światłem','Synchronize the music and light'),
      light('Otwórz wieczór premiery','Open the premiere night')]),
  chapter(13,'Cisi goście oceanu','Quiet ocean visitors','ocean-visitors',
    ['Port działa obok bezpiecznej trasy morskich zwierząt.','The harbor operates beside a safe route for ocean wildlife.'],[
      review('Odczytaj dziennik obserwacji','Read the observation journal'),
      puzzle('photo','Odnajdź trasę wędrówki','Find the migration route'),
      puzzle('navigation','Wyznacz kurs omijający zwierzęta','Plot a route around the wildlife'),
      produce('planks','Przygotuj deski na punkt obserwacji','Produce Planks for the observation point'),
      give('planks','Ustaw znak obserwacyjny','Provide the observation marker'),
      story('ocean-visitors','Przeprowadź bezpieczny rejs','Complete the safe voyage'),
      lightStock(),light('Zapal światło spokojnej zatoki','Light the quiet bay')]),
  chapter(14,'Nic się nie marnuje','Nothing goes to waste','nothing-wasted',
    ['Potrzebne materiały płyną sprawnie między budynkami.','Useful supplies flow smoothly between the buildings.'],[
      review('Sprawdź rzeczywistą drożność odbioru','Inspect the actual collection route','warehouse'),
      check('warehouseCrew','Potwierdź gotowy odbiór','Confirm a ready collection crew',1,'warehouse'),
      puzzle('packing','Zaplanuj potrzebny kontrakt','Plan a useful contract'),
      delivered('wood','Odbierz potrzebną partię drewna','Collect a useful batch of Wood'),
      produce('planks','Przetwórz potrzebną partię materiału','Process a useful batch of material'),
      delivered('planks','Odbierz gotowy produkt','Collect the finished product'),
      give('planks','Dostarcz materiał ekipie Latarni','Deliver the material to the Lighthouse crew'),
      light('Pokaż sprawną osadę','Show the efficient settlement')]),
  chapter(15,'Święto ludzi morza','Festival of the sea','sea-festival',
    ['Parada osadników wpisała się do historii wyspy.','The residents’ parade became part of the island’s history.'],[
      review('Wybierz temat święta mieszkańców','Choose the residents’ festival theme','theatre'),
      stock('food','Sprawdź jedzenie na święto','Check the festival Food'),
      check('warehouseCrew','Przygotuj lokalną ekipę','Prepare the local crew',1,'warehouse'),
      give('food','Dostarcz poczęstunek','Deliver refreshments'),
      puzzle('photo','Ułóż oprawę sceny','Arrange the stage setting'),
      story('sea-festival','Przygotuj finał święta','Prepare the festival finale'),
      lightStock(),light('Otwórz paradę mieszkańców','Open the residents’ parade')]),
  chapter(16,'Szlak wielu świateł','A route of many lights','merchant-rescue',
    ['Dwa zakontraktowane rejsy domknęły nowy szlak.','Two contracted voyages completed a new route.'],[
      review('Odczytaj gwarantowane manifesty','Read the guaranteed manifests','dock'),
      puzzle('scheduling','Ustal kolejność rejsów','Schedule the voyages'),
      puzzle('packing','Sprawdź pojemność ładunku','Check the cargo capacity'),
      stock('coins','Przygotuj budżet małego kontraktu','Prepare a small contract budget',3),
      ship('Odbierz pierwszy rzeczywisty zakup','Receive the first actual purchase'),
      story('merchant-rescue','Uwolnij barkę kupca','Free the merchant’s barge'),
      ship('Odbierz drugi zakup na nowym szlaku','Receive the second purchase on the new route',2),
      light('Uruchom sygnał wielu świateł','Activate the signal of many lights')]),
  chapter(17,'Skarbiec pod klifem','The treasury beneath the cliff','cliff-treasury',
    ['Dawna skrytka jest bezpieczna, a droga powrotna otwarta.','The old cache is safe and the return route remains open.'],[
      review('Odszukaj wejście pod klifem','Find the entrance beneath the cliff'),
      puzzle('paperFold','Odczytaj plan przejścia','Decode the passage plan'),
      puzzle('tides','Przekieruj wodę bezpiecznie','Redirect the water safely'),
      puzzle('balance','Rozłóż ograniczone ciężarki','Place the limited weights'),
      puzzle('magnets','Otwórz drogę do zamka','Open the route to the lock'),
      story('cliff-treasury','Zachowaj drogę powrotną i odkryj skarb','Keep the return route and discover the treasury'),
      give('wood','Zabezpiecz odnalezioną pamiątkę','Secure the recovered keepsake'),
      light('Odtwórz podziemny znak Latarni','Restore the underground Lighthouse sign')]),
  chapter(18,'Światło ponad burzą','Light above the storm','above-storm',
    ['Sprawna zmiana ekip zapewniła wyspie bezpieczną noc.','A coordinated crew change kept the island safe overnight.'],[
      review('Odczytaj trzy potrzeby osady','Review the settlement’s three needs'),
      check('warehouseCrew','Sprawdź gotowe obsady','Check the ready crews',2,'warehouse'),
      stock('food','Zabezpiecz posiłki na zmianę','Secure meals for the shift',8),
      puzzle('scheduling','Ułóż kolejność pracy ekip','Schedule the crews’ work'),
      delivered('grain','Zrealizuj pierwszy ważny odbiór','Complete the first important collection'),
      story('above-storm','Skoordynuj niezależne źródła światła','Coordinate independent lights'),
      lightStock(),light('Zapal światło ponad burzą','Light the way above the storm')]),
  chapter(19,'Wielki zlot żagli','The gathering of sails','sail-gathering',
    ['Flotylla bezpiecznie dotarła na wielkie powitanie.','The flotilla arrived safely for the great welcome.'],[
      review('Poznaj gwarantowaną listę gości','Read the guaranteed guest list','dock'),
      puzzle('packing','Zaplanuj trzy różne ładunki','Plan three different cargoes'),
      give('wood','Przygotuj wyposażenie pierwszej ekipy','Prepare the first crew’s equipment'),
      delivered('food','Odbierz poczęstunek dla gości','Collect the guests’ refreshments'),
      puzzle('signalsDecode','Wyznacz znaki orientacyjne','Set the navigation signals'),
      story('sail-gathering','Skoordynuj wielkie powitanie','Coordinate the great welcome'),
      lightStock(),light('Otwórz zlot żagli','Open the gathering of sails')]),
  chapter(20,'Wyspa, do której się wraca','The island to come home to','homecoming',
    ['Pierwszy sezon zamyka wielkie rozświetlenie własnej wyspy.','The first season closes with the island’s great illumination.'],[
      review('Obejrzyj kronikę swojej wyspy','Read your island’s chronicle'),
      puzzle('photo','Wybierz własny akcent obchodów','Choose your own celebration theme'),
      check('food','Potwierdź sprawne żywienie','Confirm a working meal supply',1,'warehouse'),
      delivered('food','Potwierdź działający odbiór','Confirm a working collection route'),
      lightStock(),light('Ukończ docelową modernizację','Complete the planned modernization'),
      story('homecoming','Połącz odkrycia całego szlaku','Combine the route’s discoveries'),
      puzzle('optics','Uruchom wielkie rozświetlenie','Start the great illumination')])
]);

export const campaignChapter = level => CAMPAIGN_CHAPTERS.find(item => item.level === Math.floor(level)) || null;
export function campaignBudget(level) {
  const canonical = 500 * Math.max(2, Math.min(100, Math.floor(Number(level) || 2)));
  return {canonical,coins:Math.floor(canonical*.6),materials:canonical};
}
export function campaignStepReward(level,index) {
  const budget=campaignBudget(level), weights=CAMPAIGN_REWARD_WEIGHTS;
  const allocations=weights.map(w=>Math.floor(budget.coins*w));
  allocations[7]+=budget.coins-allocations.reduce((a,b)=>a+b,0);
  return {coins:allocations[Math.max(0,Math.min(7,index-1))]};
}
export function campaignChapterPreview(level) {
  const chapter=campaignChapter(level);
  return chapter ? {level:chapter.level,title:{...chapter.title},storyId:chapter.storyId,worldChange:{...chapter.worldChange},
    steps:chapter.steps.map((step,index)=>({...step,index:index+1,title:{...step.title}})),budget:campaignBudget(level)} : null;
}
// Reference pacing from the approved 50-day plan. No calendar gate or measured playtime.
// level is the first level in levelRange; minActiveMinutes is the indicative daily content budget.
export const CAMPAIGN_DAYS = Object.freeze([
  {
    "day": 1,
    "level": 1,
    "levelRange": "1–3",
    "titlePl": "Pierwsze światło",
    "titleEn": "First light",
    "focusPl": "Tutorial i 25 lekcji, działająca produkcja, pierwsza Latarnia. Wejście do pierwszej opowieści.",
    "focusEn": "Complete the tour and 25 practical lessons, start production and restore the first Lighthouse.",
    "storyId": "first-light",
    "puzzleKinds": [
      "hiddenObjects",
      "signalsDecode",
      "gears"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 2,
    "level": 3,
    "levelRange": "3",
    "titlePl": "Miejsce dla nowych sąsiadów",
    "titleEn": "Room for new neighbors",
    "focusPl": "Dom 3, jedzenie i plan dojścia do 54 osób. Aktualny brak pokazany od początku.",
    "focusEn": "Prepare House level 3, food and a clear route to 54 residents before the next population gate.",
    "storyId": "captainless-ship",
    "puzzleKinds": [
      "deduction",
      "packing",
      "hotel"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 3,
    "level": 4,
    "levelRange": "4",
    "titlePl": "Przystań otwarta: przygotowanie",
    "titleEn": "Opening the harbor: preparations",
    "focusPl": "Awans na 4 dopiero po gotowości; uruchomienie obsady portu.",
    "focusEn": "Reach level 4 when the island is ready, then assign a real harbor crew.",
    "storyId": "harbor-opening",
    "puzzleKinds": [
      "untangle",
      "packing"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 4,
    "level": 4,
    "levelRange": "4",
    "titlePl": "Przystań otwarta: pierwszy rejs",
    "titleEn": "Opening the harbor: the first voyage",
    "focusPl": "Pierwszy mały zakontraktowany zakup i faktyczne dowiezienie do magazynu centralnego.",
    "focusEn": "Complete a small guaranteed purchase and bring its goods into central storage.",
    "storyId": "harbor-opening",
    "puzzleKinds": [
      "navigation",
      "balance"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 5,
    "level": 5,
    "levelRange": "5",
    "titlePl": "Przed sztormem",
    "titleEn": "Before the storm",
    "focusPl": "Przygotuj rezerwy i osłony; oddziel żywność mieszkańców od materiałów budowy.",
    "focusEn": "Build reserves and shelters while keeping residents’ meals separate from construction supplies.",
    "storyId": "storm-shelter",
    "puzzleKinds": [
      "invention",
      "tides"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 6,
    "level": 5,
    "levelRange": "5",
    "titlePl": "Noc sztormowa",
    "titleEn": "Storm night",
    "focusPl": "Napraw mechanizm awaryjnego światła i zakończ modernizację Latarni.",
    "focusEn": "Repair the emergency light mechanism and finish the Lighthouse improvement.",
    "storyId": "storm-shelter",
    "puzzleKinds": [
      "gears",
      "optics"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 7,
    "level": 6,
    "levelRange": "6",
    "titlePl": "Wiadomość w butelce",
    "titleEn": "A message in a bottle",
    "focusPl": "Odczytaj list i ustal lokalnego adresata; handel graczy można poznać opcjonalnie.",
    "focusEn": "Read the message and identify its local recipient; player trading remains optional.",
    "storyId": "bottle-message",
    "puzzleKinds": [
      "paperFold",
      "parrot"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 8,
    "level": 6,
    "levelRange": "6",
    "titlePl": "Paczka dla sąsiedniej osady",
    "titleEn": "A parcel for the neighboring settlement",
    "focusPl": "Przygotuj i nadaj niewielki zestaw pomocy; odbierz potwierdzenie.",
    "focusEn": "Prepare a small aid parcel, send it and obtain its delivery confirmation.",
    "storyId": "bottle-message",
    "puzzleKinds": [
      "deduction",
      "packing",
      "navigation"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 9,
    "level": 7,
    "levelRange": "7",
    "titlePl": "Sygnały we mgle",
    "titleEn": "Signals in the fog",
    "focusPl": "Poznaj język błysków i przygotuj próbny sygnał.",
    "focusEn": "Learn the language of light and prepare your first test signal.",
    "storyId": "fog-convoy",
    "puzzleKinds": [
      "signalsDecode",
      "photo"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 10,
    "level": 7,
    "levelRange": "7",
    "titlePl": "Konwój przez mgłę",
    "titleEn": "A convoy through fog",
    "focusPl": "Zabezpiecz nocny zapas i przeprowadź mały konwój.",
    "focusEn": "Secure the overnight reserves and guide a small convoy to safety.",
    "storyId": "fog-convoy",
    "puzzleKinds": [
      "navigation",
      "scheduling"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 11,
    "level": 8,
    "levelRange": "8",
    "titlePl": "Zaginiona mapa latarnika",
    "titleEn": "The keeper’s lost map",
    "focusPl": "Zdobądź i zestaw gwarantowane fragmenty mapy.",
    "focusEn": "Recover the guaranteed map fragments and work out how they fit together.",
    "storyId": "keeper-map",
    "puzzleKinds": [
      "memoryTriples",
      "paperFold"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 12,
    "level": 8,
    "levelRange": "8",
    "titlePl": "Cień wskazuje zatoczkę",
    "titleEn": "A shadow points to the cove",
    "focusPl": "Połącz mapę, położenie Latarni i oznaczenia na skałach.",
    "focusEn": "Combine the map, Lighthouse position and marks on the rocks to find the hidden cove.",
    "storyId": "keeper-map",
    "puzzleKinds": [
      "photo",
      "navigation",
      "hiddenObjects"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 13,
    "level": 9,
    "levelRange": "9",
    "titlePl": "Zapasy na dalszą drogę",
    "titleEn": "Supplies for the journey",
    "focusPl": "Sprawdź pojemność i przygotuj mały lokalny ładunek wyprawy.",
    "focusEn": "Check cargo space and prepare a small local expedition load.",
    "storyId": "supply-voyage",
    "puzzleKinds": [
      "packing",
      "cooking"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 14,
    "level": 9,
    "levelRange": "9",
    "titlePl": "Rozpoznanie nowego brzegu",
    "titleEn": "Surveying the new shore",
    "focusPl": "Wyznacz trasę rozpoznawczą; obejrzyj warunki dobrowolnej kolonizacji.",
    "focusEn": "Plot a scouting route and review the requirements for optional colonization.",
    "storyId": "supply-voyage",
    "puzzleKinds": [
      "balance",
      "navigation"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 15,
    "level": 9,
    "levelRange": "9",
    "titlePl": "Próba generalna wyprawy",
    "titleEn": "A rehearsal for the expedition",
    "focusPl": "Zrealizuj próbny kontrakt i wyrównaj zaniedbaną część gospodarki.",
    "focusEn": "Fulfill a practice contract and strengthen an overlooked part of the economy.",
    "storyId": "supply-voyage",
    "puzzleKinds": [
      "scheduling",
      "packing"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 16,
    "level": 10,
    "levelRange": "10",
    "titlePl": "Światło na drugim brzegu",
    "titleEn": "Light on the other shore",
    "focusPl": "Wybierz główną drogę lokalną NPC albo opcjonalną własną kolonię.",
    "focusEn": "Choose the guaranteed local route or prepare an optional colony of your own.",
    "storyId": "second-shore",
    "puzzleKinds": [
      "navigation",
      "crabs"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 17,
    "level": 10,
    "levelRange": "10",
    "titlePl": "Dostawa pierwszej pomocy",
    "titleEn": "Delivering first aid",
    "focusPl": "Przygotuj i odbierz potrzebny pakiet; przy córce osobny plan startu 6 osób.",
    "focusEn": "Prepare and receive the needed supplies; a daughter island gets its own six-person startup plan.",
    "storyId": "second-shore",
    "puzzleKinds": [
      "invention",
      "gears"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 18,
    "level": 10,
    "levelRange": "10",
    "titlePl": "Dwa brzegi, jeden szlak",
    "titleEn": "Two shores, one route",
    "focusPl": "Potwierdź rzeczywistą dostawę i domknij rozdział.",
    "focusEn": "Confirm the actual delivery and bring the chapter to its conclusion.",
    "storyId": "second-shore",
    "puzzleKinds": [
      "navigation",
      "optics"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 19,
    "level": 11,
    "levelRange": "11",
    "titlePl": "Dziennik starego latarnika",
    "titleEn": "The old keeper’s journal",
    "focusPl": "Odczytaj zapiski i ustal, czego brakuje mechanizmowi.",
    "focusEn": "Read the notes and discover which pieces are missing from the mechanism.",
    "storyId": "closed-lighthouse",
    "puzzleKinds": [
      "deduction",
      "memoryTriples"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 20,
    "level": 11,
    "levelRange": "11",
    "titlePl": "Tajemnica zamkniętej Latarni",
    "titleEn": "The locked Lighthouse",
    "focusPl": "Uruchom przeciwwagę, napęd i soczewki.",
    "focusEn": "Bring the counterweight, drive and lenses into working order.",
    "storyId": "closed-lighthouse",
    "puzzleKinds": [
      "balance",
      "gears",
      "optics"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 21,
    "level": 11,
    "levelRange": "11",
    "titlePl": "Galeria dawnych świateł",
    "titleEn": "A gallery of earlier lights",
    "focusPl": "Zabezpiecz znaleziska i ukończ docelową modernizację.",
    "focusEn": "Protect the discoveries and complete the intended Lighthouse upgrade.",
    "storyId": "closed-lighthouse",
    "puzzleKinds": [
      "paperFold",
      "optics"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 22,
    "level": 12,
    "levelRange": "12",
    "titlePl": "Teatr pod gwiazdami",
    "titleEn": "Theatre beneath the stars",
    "focusPl": "Wybierz oprawę przedstawienia z udostępnionych rekwizytów misji.",
    "focusEn": "Choose a performance setting using the props supplied by the mission.",
    "storyId": "lost-performance",
    "puzzleKinds": [
      "hiddenObjects",
      "photo"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 23,
    "level": 12,
    "levelRange": "12",
    "titlePl": "Zaginiona część spektaklu",
    "titleEn": "The missing part of the play",
    "focusPl": "Odtwórz scenariusz i uruchom mechanizm sceny.",
    "focusEn": "Reconstruct the script and bring the stage mechanism to life.",
    "storyId": "lost-performance",
    "puzzleKinds": [
      "parrot",
      "gears",
      "optics"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 24,
    "level": 12,
    "levelRange": "12",
    "titlePl": "Wieczór premiery",
    "titleEn": "Opening night",
    "focusPl": "Zapewnij poczęstunek i zsynchronizuj muzykę ze światłem Latarni.",
    "focusEn": "Prepare refreshments and synchronize the music with the Lighthouse beam.",
    "storyId": "lost-performance",
    "puzzleKinds": [
      "signalsDecode",
      "optics"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 25,
    "level": 13,
    "levelRange": "13",
    "titlePl": "Cisi goście oceanu",
    "titleEn": "Quiet ocean visitors",
    "focusPl": "Rozpoznaj trasę morskich zwierząt.",
    "focusEn": "Identify the route taken by the migrating sea animals.",
    "storyId": "ocean-visitors",
    "puzzleKinds": [
      "photo",
      "deduction"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 26,
    "level": 13,
    "levelRange": "13",
    "titlePl": "Szlak omijający wędrówkę",
    "titleEn": "A route around the migration",
    "focusPl": "Zaplanuj dostawy z uwzględnieniem natury.",
    "focusEn": "Plan reliable deliveries while respecting the animals’ passage.",
    "storyId": "ocean-visitors",
    "puzzleKinds": [
      "navigation",
      "tides"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 27,
    "level": 13,
    "levelRange": "13",
    "titlePl": "Punkt obserwacyjny",
    "titleEn": "The observation point",
    "focusPl": "Przygotuj prostą konstrukcję i zakończ rozdział.",
    "focusEn": "Prepare a modest structure and complete the chapter.",
    "storyId": "ocean-visitors",
    "puzzleKinds": [
      "tides",
      "scheduling"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 28,
    "level": 14,
    "levelRange": "14",
    "titlePl": "Nic się nie marnuje",
    "titleEn": "Nothing goes to waste",
    "focusPl": "Sprawdź realne wąskie gardło. Sprawny system zalicza kontrolę bez wywoływania zastoju.",
    "focusEn": "Check a real bottleneck; a healthy system passes without deliberately creating a blockage.",
    "storyId": "nothing-wasted",
    "puzzleKinds": [
      "invention",
      "cooking"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 29,
    "level": 14,
    "levelRange": "14",
    "titlePl": "Port bez korków",
    "titleEn": "A harbor without queues",
    "focusPl": "Ułóż odbiór i wykorzystanie realnych partii materiałów.",
    "focusEn": "Arrange collection and useful processing of real batches of materials.",
    "storyId": "nothing-wasted",
    "puzzleKinds": [
      "packing",
      "scheduling"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 30,
    "level": 14,
    "levelRange": "14",
    "titlePl": "Pokaz sprawnej osady",
    "titleEn": "An island that works",
    "focusPl": "Dostarcz mały zestaw ekipie Latarni i zakończ modernizację.",
    "focusEn": "Deliver a small supply set to the Lighthouse crew and finish the upgrade.",
    "storyId": "nothing-wasted",
    "puzzleKinds": [
      "balance",
      "packing"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 31,
    "level": 15,
    "levelRange": "15",
    "titlePl": "Święto ludzi morza",
    "titleEn": "Festival of the sea",
    "focusPl": "Wybierz temat wydarzenia i przygotuj lokalne ekipy.",
    "focusEn": "Choose the festival theme and prepare the local teams.",
    "storyId": "sea-festival",
    "puzzleKinds": [
      "hotel",
      "photo"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 32,
    "level": 15,
    "levelRange": "15",
    "titlePl": "Miasto przygotowuje święto",
    "titleEn": "The town prepares its festival",
    "focusPl": "Zapewnij jedzenie, miejsca i transport.",
    "focusEn": "Arrange enough food, room and transport for the event.",
    "storyId": "sea-festival",
    "puzzleKinds": [
      "crabs",
      "cooking"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 33,
    "level": 15,
    "levelRange": "15",
    "titlePl": "Parada osadników",
    "titleEn": "The settlers’ parade",
    "focusPl": "Uruchom scenę i pokaz Latarni.",
    "focusEn": "Open the stage and launch the Lighthouse display.",
    "storyId": "sea-festival",
    "puzzleKinds": [
      "parrot",
      "optics"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 34,
    "level": 16,
    "levelRange": "16",
    "titlePl": "Szlak wielu świateł",
    "titleEn": "A route of many lights",
    "focusPl": "Poznaj manifesty i zaplanuj kolejność gwarantowanych zleceń NPC.",
    "focusEn": "Read the manifests and sequence the guaranteed local contracts.",
    "storyId": "merchant-rescue",
    "puzzleKinds": [
      "untangle",
      "scheduling"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 35,
    "level": 16,
    "levelRange": "16",
    "titlePl": "Kupiec w opałach",
    "titleEn": "The merchant in trouble",
    "focusPl": "Uwolnij ładunek potrzebny do umówionej dostawy.",
    "focusEn": "Recover the cargo needed for an agreed delivery.",
    "storyId": "merchant-rescue",
    "puzzleKinds": [
      "marbleMaze",
      "magnets",
      "balance"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 36,
    "level": 16,
    "levelRange": "16",
    "titlePl": "Dostawa na czas",
    "titleEn": "A delivery on time",
    "focusPl": "Zakończ oba rejsy we właściwej kolejności.",
    "focusEn": "Complete both voyages in the right order.",
    "storyId": "merchant-rescue",
    "puzzleKinds": [
      "navigation",
      "scheduling"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 37,
    "level": 17,
    "levelRange": "17",
    "titlePl": "Wejście pod klifem",
    "titleEn": "The entrance beneath the cliff",
    "focusPl": "Odczytaj ślady dawnego przejścia.",
    "focusEn": "Read the traces that reveal the old passage.",
    "storyId": "cliff-treasury",
    "puzzleKinds": [
      "paperFold",
      "optics"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 38,
    "level": 17,
    "levelRange": "17",
    "titlePl": "Skarbiec pod klifem",
    "titleEn": "The treasury beneath the cliff",
    "focusPl": "Otwórz mechanizm bez odcięcia drogi powrotnej.",
    "focusEn": "Open the mechanism without cutting off the route back.",
    "storyId": "cliff-treasury",
    "puzzleKinds": [
      "tides",
      "magnets",
      "balance"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 39,
    "level": 17,
    "levelRange": "17",
    "titlePl": "Historia znaleziska",
    "titleEn": "The story of the discovery",
    "focusPl": "Ustal pochodzenie pamiątki i ukończ rozdział.",
    "focusEn": "Identify the keepsake’s origin and complete the chapter.",
    "storyId": "cliff-treasury",
    "puzzleKinds": [
      "hiddenObjects",
      "optics"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 40,
    "level": 18,
    "levelRange": "18",
    "titlePl": "Światło ponad burzą",
    "titleEn": "Light above the storm",
    "focusPl": "Przygotuj zapasy i rzeczywiste obsady przed rozpoczęciem terminu.",
    "focusEn": "Prepare supplies and real crews before starting the timed challenge.",
    "storyId": "above-storm",
    "puzzleKinds": [
      "deduction",
      "scheduling"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 41,
    "level": 18,
    "levelRange": "18",
    "titlePl": "Zmiana ekip",
    "titleEn": "Changing crews",
    "focusPl": "Zrealizuj dwa ważne odbiory bez zaniedbania żywności.",
    "focusEn": "Complete two important collections without neglecting food deliveries.",
    "storyId": "above-storm",
    "puzzleKinds": [
      "gears",
      "tides"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 42,
    "level": 18,
    "levelRange": "18",
    "titlePl": "Bezpieczna noc",
    "titleEn": "A safe night",
    "focusPl": "Zakończ modernizację i przeprowadź statki.",
    "focusEn": "Finish the upgrade and guide the ships through safely.",
    "storyId": "above-storm",
    "puzzleKinds": [
      "signalsDecode",
      "optics"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 43,
    "level": 19,
    "levelRange": "19",
    "titlePl": "Wielki zlot żagli",
    "titleEn": "The gathering of sails",
    "focusPl": "Poznaj gwarantowane wizyty NPC i zaplanuj potrzebne ładunki.",
    "focusEn": "Review the guaranteed local visits and plan the cargo each one needs.",
    "storyId": "sail-gathering",
    "puzzleKinds": [
      "packing",
      "hotel"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 44,
    "level": 19,
    "levelRange": "19",
    "titlePl": "Port pełen życia",
    "titleEn": "A harbor full of life",
    "focusPl": "Wykonaj pierwsze dostawy i przygotuj znaki orientacyjne.",
    "focusEn": "Make the first deliveries and prepare the visitors’ navigation markers.",
    "storyId": "sail-gathering",
    "puzzleKinds": [
      "untangle",
      "navigation"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 45,
    "level": 19,
    "levelRange": "19",
    "titlePl": "Regaty po zmroku",
    "titleEn": "A regatta after dusk",
    "focusPl": "Przygotuj trasę oraz zabezpieczenie wydarzenia.",
    "focusEn": "Prepare the route and safeguards for the sailing event.",
    "storyId": "sail-gathering",
    "puzzleKinds": [
      "navigation",
      "scheduling"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 46,
    "level": 19,
    "levelRange": "19",
    "titlePl": "Przybycie flotylli",
    "titleEn": "The flotilla arrives",
    "focusPl": "Domknij ostatni kontrakt i sygnał powitalny.",
    "focusEn": "Complete the final contract and the welcoming light signal.",
    "storyId": "sail-gathering",
    "puzzleKinds": [
      "scheduling",
      "signalsDecode"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 47,
    "level": 20,
    "levelRange": "20",
    "titlePl": "Wyspa, do której się wraca",
    "titleEn": "The island to come home to",
    "focusPl": "Obejrzyj kronikę i wybierz temat finału: odkrywcy, gospodarze albo twórcy.",
    "focusEn": "Review your chronicle and choose a finale for explorers, caretakers or creators.",
    "storyId": "homecoming",
    "puzzleKinds": [
      "photo",
      "invention"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 48,
    "level": 20,
    "levelRange": "20",
    "titlePl": "Ostatnie przygotowania",
    "titleEn": "The final preparations",
    "focusPl": "Potwierdź sprawną gospodarkę i sfinansuj rzeczywisty docelowy projekt.",
    "focusEn": "Confirm a working economy and fund the actual project chosen for the finale.",
    "storyId": "homecoming",
    "puzzleKinds": [
      "hotel",
      "gears"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 49,
    "level": 20,
    "levelRange": "20",
    "titlePl": "Próba wielkiego pokazu",
    "titleEn": "Rehearsing the great display",
    "focusPl": "Połącz światło, muzykę i bezpieczny ruch gości.",
    "focusEn": "Combine light, music and the safe movement of guests.",
    "storyId": "homecoming",
    "puzzleKinds": [
      "gears",
      "signalsDecode",
      "optics"
    ],
    "minActiveMinutes": 180
  },
  {
    "day": 50,
    "level": 20,
    "levelRange": "20",
    "titlePl": "Wielkie rozświetlenie",
    "titleEn": "The great illumination",
    "focusPl": "Zakończ docelową modernizację i uruchom pokaz.",
    "focusEn": "Finish the chosen upgrade and launch the display that closes the season.",
    "storyId": "homecoming",
    "puzzleKinds": [
      "signalsDecode",
      "optics"
    ],
    "minActiveMinutes": 180
  }
].map(day => Object.freeze({ ...day, puzzleKinds: Object.freeze(day.puzzleKinds) })));

// Suggested windows never lock a faster/slower player's available content.
export const CAMPAIGN_LEVEL_WINDOWS=Object.freeze([
 [1,1,1],[2,1,1],[3,1,2],[4,3,4],[5,5,6],[6,7,8],[7,9,10],[8,11,12],[9,13,15],[10,16,18],
 [11,19,21],[12,22,24],[13,25,27],[14,28,30],[15,31,33],[16,34,36],[17,37,39],[18,40,42],[19,43,46],[20,47,50]
].map(([level,firstDay,lastDay])=>Object.freeze({level,firstDay,lastDay,indicative:true})));
export function campaignDayPlan(day=1){const entry=CAMPAIGN_DAYS[Math.max(0,Math.min(49,Math.floor(Number(day)||1)-1))];return{...entry,puzzleKinds:[...entry.puzzleKinds],levelRange:Array.isArray(entry.levelRange)?[...entry.levelRange]:entry.levelRange,indicative:true};}
