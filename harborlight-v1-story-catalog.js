// Fifty-day island adventure library. Entries describe real connected puzzles;
// they never grant a reward or assert that an input was solved.
const t=(pl,en)=>Object.freeze({pl,en});
export const ISLAND_PUZZLE_CATALOG=Object.freeze([
 ['gull','Mewa-złodziejka','The thieving gull','Odwróć uwagę mewy i odzyskaj klucz.','Distract the gull and recover the key.',60,'short'],
 ['crabs','Parada krabów','Crab parade','Poprowadź rodzinę krabów do bezpiecznych muszli.','Guide the crab family to safe shells.',90,'short'],
 ['hiddenObjects','Okulary latarnika','The keeper’s glasses','Obejrzyj przedmioty i znajdź zgubę według wskazówki.','Inspect the scene and follow the clue to the lost item.',75,'short'],
 ['parrot','Papuga kapitana','The captain’s parrot','Rozpoznaj słowa papugi i odtwórz ich prawdziwą kolejność.','Decode the parrot’s words and reconstruct their order.',90,'short'],
 ['packing','Skrzynka ratunkowa','Rescue kit','Spakuj cały sprzęt, obracając elementy i wykorzystując miejsce.','Pack all the equipment, rotating pieces to use the space.',420,'medium'],
 ['untangle','Rozplącz cumy','Untangle the moorings','Zamień miejsca mocowań tak, by liny się nie przecinały.','Move the moorings until the ropes no longer cross.',240,'medium'],
 ['navigation','Rejs we mgle','Voyage through fog','Wyznacz bezpieczny kurs przez boje i prądy.','Find a safe course through buoys and currents.',480,'medium'],
 ['scheduling','Port bez korków','Harbor without queues','Przydziel statkom nabrzeża i czasy rozładunku.','Assign ships to quays and unloading times.',600,'medium'],
 ['gears','Mechanizm Latarni','The Lighthouse mechanism','Połącz napęd i ustaw właściwy kierunek oraz prędkość.','Connect the drive and set its direction and speed.',600,'medium'],
 ['optics','Światło przez soczewki','Light through lenses','Obracaj zwierciadła, aby światło dotarło do odbiornika.','Rotate mirrors to guide the light to its receiver.',600,'medium'],
 ['tides','Brama przypływu','The tidal gate','Przepuść wodę przez śluzy w bezpiecznej kolejności.','Move water through the locks in a safe order.',600,'medium'],
 ['hotel','Hotel dla rozbitków','Castaways’ hotel','Dopasuj pokoje do potrzeb wszystkich gości.','Match rooms to every guest’s needs.',600,'medium'],
 ['magnets','Magnetyczny wrak','The magnetic wreck','Ustaw bieguny i przeprowadź kapsułę do zamka.','Set the poles and move the capsule to the lock.',600,'medium'],
 ['paperFold','Testament szkutnika','The shipwright’s will','Złóż plan według znaków, aby odczytać wiadomość.','Fold the plan along its markings to reveal the message.',600,'medium'],
 ['invention','Pracownia wynalazków','Workshop of inventions','Dobierz części, które wspólnie rozwiążą problem.','Choose parts that solve the problem together.',480,'medium'],
 ['photo','Fotograf wyspy','Island photographer','Znajdź perspektywę, z której znaki tworzą wspólny obraz.','Find the viewpoint where the landmarks form one image.',420,'medium'],
 ['deduction','Plotka w porcie','A harbor rumor','Porównaj dowody i odtwórz losy przesyłek.','Compare the evidence and reconstruct the deliveries.',600,'medium'],
 ['cooking','Kuchnia na święto','A feast for the island','Przygotuj posiłki według przepisów i potrzeb gości.','Prepare meals using the recipes and the guests’ needs.',480,'medium'],
 ['signalsDecode','Język boi','The language of buoys','Użyj legendy, by odczytać komunikat i odpowiedzieć.','Use the legend to decode the message and answer it.',300,'medium'],
 ['balance','Wagi skarbca','The treasury scales','Rozłóż ciężarki, by uruchomić zapadnie jednocześnie.','Place the weights to activate all the catches together.',480,'medium'],
 ['memoryTriples','Fragmenty dziennika','Pieces of the journal','Odkrywaj trójki, aby odzyskać wskazówki tej przygody.','Match triples to recover clues for this adventure.',420,'medium'],
 ['marbleMaze','Kula mechanizmu','The mechanism’s marble','Przechylaj planszę, aby doprowadzić kulę do celu.','Tilt the board to guide the marble to its goal.',420,'medium']
].map(([id,pl,en,ip,ie,durationSeconds,tier])=>Object.freeze({id,title:t(pl,en),description:t(ip,ie),durationSeconds,tier})));
const stories=[
 ['first-light','Pierwszy blask','The first glow',1,['hiddenObjects','signalsDecode','gears','optics'],'Odnajdź zapiski latarnika i przywróć światło.','Find the keeper’s notes and restore the light.'],
 ['star-guests','Goście spod gwiazd','Guests beneath the stars',2,['gull','packing','cooking','hotel','optics'],'Przygotuj nocleg dla pierwszych gości obserwujących meteory.','Prepare a welcome for the first meteor-watchers.'],
 ['captainless-ship','Statek bez kapitana','The captainless ship',2,['deduction','hiddenObjects','signalsDecode','packing','navigation','hotel'],'Odtwórz zdarzenia na dryfującym statku i sprowadź załogę na wyspę.','Reconstruct what happened aboard the drifting ship and bring the crew ashore.'],
 ['harbor-opening','Przystań otwarta','The harbor opens',4,['untangle','packing','scheduling','navigation','balance'],'Poprowadź pierwszy konwój od przygotowania do bezpiecznej dostawy.','Lead the first convoy from preparation to safe delivery.'],
 ['storm-shelter','Noc sztormowa','Storm night',5,['invention','tides','gears','optics','scheduling'],'Uruchom awaryjne światło i zabezpiecz drogę do schronienia.','Restore the emergency light and secure the route to shelter.'],
 ['bottle-message','Wiadomość w butelce','A message in a bottle',6,['paperFold','parrot','deduction','navigation','packing'],'Złożona mapa i słowa papugi wyjaśnią, dokąd wysłać przesyłkę.','A folded map and a parrot’s words reveal where to send the parcel.'],
 ['fog-convoy','Konwój przez mgłę','Convoy through fog',7,['signalsDecode','photo','optics','navigation','scheduling'],'Połącz światło, pomiary i rozkład rejsów.','Combine light, observations and the sailing schedule.'],
 ['keeper-map','Mapa starego latarnika','The old keeper’s map',8,['memoryTriples','paperFold','photo','navigation','hiddenObjects'],'Fragmenty dziennika prowadzą do zapomnianej zatoczki.','Journal fragments lead to a forgotten cove.'],
 ['supply-voyage','Zapasy na dalszą drogę','Supplies for the journey',9,['packing','cooking','balance','scheduling','navigation'],'Przygotuj samodzielną wyprawę bez kupowania nowej wyspy.','Prepare an independent voyage without buying another island.'],
 ['second-shore','Światło na drugim brzegu','Light on the other shore',10,['navigation','crabs','invention','gears','optics'],'Odkryj dawny punkt sygnałowy na drugim brzegu.','Discover an old signal station on the far shore.'],
 ['closed-lighthouse','Tajemnica zamkniętej Latarni','The locked Lighthouse',11,['deduction','memoryTriples','balance','gears','paperFold','optics'],'Dziennik, przeciwwaga i soczewki tworzą jeden zamknięty mechanizm.','The journal, counterweight and lenses form one connected mechanism.'],
 ['lost-performance','Zaginiony spektakl','The lost performance',12,['hiddenObjects','parrot','photo','gears','signalsDecode','optics'],'Odzyskaj scenariusz i uruchom ukryty mechanizm sceny.','Recover the script and activate the stage’s hidden mechanism.'],
 ['ocean-visitors','Cisi goście oceanu','Quiet ocean visitors',13,['photo','deduction','navigation','tides','scheduling'],'Znajdź bezpieczną drogę obok wędrujących zwierząt.','Find a safe route past the migrating animals.'],
 ['nothing-wasted','Nic się nie marnuje','Nothing goes to waste',14,['invention','packing','cooking','balance','scheduling'],'Połącz odzyskane przedmioty w sprawny łańcuch dostaw.','Turn recovered objects into an efficient supply chain.'],
 ['sea-festival','Święto ludzi morza','Festival of the sea',15,['crabs','hotel','cooking','parrot','photo','optics'],'Przygotuj przestrzeń, gości i finał święta mieszkańców.','Prepare the setting, guests and finale of the island festival.'],
 ['merchant-rescue','Kupiec w opałach','The merchant in trouble',16,['marbleMaze','magnets','untangle','balance','navigation','scheduling'],'Odzyskana kula otwiera drogę do uwięzionej barki.','A recovered marble opens the way to the stranded barge.'],
 ['cliff-treasury','Skarbiec pod klifem','The treasury beneath the cliff',17,['paperFold','tides','magnets','balance','optics','hiddenObjects'],'Przeprowadź wodę i ciężarki tak, aby zachować drogę powrotną.','Move water and weights without losing the way back.'],
 ['above-storm','Światło ponad burzą','Light above the storm',18,['deduction','scheduling','gears','tides','signalsDecode','optics'],'Skoordynuj zmianę ekip i niezależne źródła światła.','Coordinate the crew changes and independent lights.'],
 ['sail-gathering','Wielki zlot żagli','The gathering of sails',19,['untangle','packing','hotel','navigation','scheduling','signalsDecode'],'Każdy statek ma własne potrzeby i miejsce w wielkim powitaniu.','Every ship has its needs and a place in the great welcome.'],
 ['homecoming','Wyspa, do której się wraca','The island to come home to',20,['photo','invention','hotel','gears','signalsDecode','optics'],'Wybierz własny finał i połącz odkrycia z całego szlaku.','Choose your own finale and combine discoveries from the whole journey.']
];
export const STORY_VARIANT_COUNT=5;
export const STORY_CATALOG=Object.freeze(stories.map(([id,pl,en,unlockLevel,mechanics,introPl,introEn],index)=>Object.freeze({id,title:t(pl,en),intro:t(introPl,introEn),unlockLevel,index,mechanics:Object.freeze(mechanics),variants:5,durationSeconds:mechanics.length*210,recruitment:id==='captainless-ship'})));
export const storyById=id=>STORY_CATALOG.find(s=>s.id===id)||null;
export const puzzleById=id=>ISLAND_PUZZLE_CATALOG.find(p=>p.id===id)||null;
export function storyRoomKinds(story,variant=1){
 const list=[...story.mechanics];
 // Five solutions change both the physical layouts and causal room order.
 // The final mechanism remains the finale; earlier rooms may be explored in a
 // different order, with knowledge from each changing the next room's seed.
 if(variant===2&&list.length>3)[list[0],list[1]]=[list[1],list[0]];
 if(variant===3&&list.length>4)[list[1],list[3]]=[list[3],list[1]];
 if(variant===4)list.splice(1,0,list.splice(list.length-2,1)[0]);
 if(variant===5&&list.length>3)[list[1],list[2]]=[list[2],list[1]];
 return list;
}
export function getStoryCatalog(language='pl'){return STORY_CATALOG.map(s=>({...s,title:s.title[language]||s.title.pl,intro:s.intro[language]||s.intro.pl}));}
