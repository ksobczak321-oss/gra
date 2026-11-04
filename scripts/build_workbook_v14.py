#!/usr/bin/env python3
"""Append v31 campaign/rules to immutable Excel 13, keeping88 historical sheets.

Reads actual JavaScript exports. Formula values are independently cached; raw
historical OOXML, comments, styles and previous caches are copied unchanged.
This is rule/catalog validation, not a50-day playthrough or measured150h test.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
from zipfile import ZipFile, ZIP_DEFLATED
from lxml import etree as E
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter
import build_workbook_v11 as old

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/arkusze/HARBORLIGHT13-zasady.xlsx'
OUTPUT = ROOT / 'docs/arkusze/HARBORLIGHT14-zasady.xlsx'
REPORT = ROOT / 'docs/arkusze/HARBORLIGHT14-walidacja.json'
CASES = ROOT / 'docs/testing/manual-test-cases.json'
SOURCE_SHA256 = '016baa56460f1cc6d5bff50863d496c4eec6a40190e36445a3434bb394a30be1'
VISIBLE = ['Przeczytaj v14', '50 dni v14', 'Misje v14', 'Zagadki v14', 'Testy v14',
           'Gospodarka v14', 'Transport v14', 'Nagrody v14', 'Teatr v14', 'Kalkulator v14']
HIDDEN = ['Kontrole v14', 'Źródła v14']
M, R, P, C = old.M, old.R, old.P, old.C
Formula, Sheet = old.Formula, old.Sheet
old.VISIBLE = VISIBLE
PREPROD = {'version': '0.13.1.0', 'source': '68e9bcd6adf22ab98f963688726a71d4d8a66c6b',
           'ci': '41671140612', 'deployment': '41673824262', 'attempt': 1,
           'url': 'https://harborlight-dev.web.app', 'verified': '2026-11-03'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def summary(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def sheet(name, title, note, columns, widths, hidden=False):
    return Sheet(name, title, note, columns, widths, hidden=hidden)


def game_facts():
    source = r"""
      import * as S from './harborlight-v1-state.js';
      import * as E from './harborlight-v1-economy.js';
      import * as L from './harborlight-v1-logistics.js';
      import * as Campaign from './harborlight-v1-campaign.js';
      import * as Catalog from './harborlight-v1-story-catalog.js';
      import * as Puzzle from './harborlight-v1-island-puzzles.js';
      import * as Hour from './harborlight-v1-expedition-hour.js';
      import * as T from './harborlight-v1-theatre.js';
      import * as P from './harborlight-v1-progression.js';
      import * as Copy from './harborlight-v1-approved-copy.js';
      import * as Missions from './harborlight-v1-missions.js';
      import * as A from './harborlight-v1-adventures.js';
      import * as Budget from './harborlight-v1-adventure-budget.js';
      import { GAME_VERSION } from './harborlight-version.js';
      const at=Date.parse('2026-11-04T12:00:00Z');
      const levels=Array.from({length:100},(_,index)=>index+1).map(level=>{
        const state=S.createState(at);state.buildings.townhall.level=level;state.buildings.warehouse.level=level;
        const cost=S.buildingCost(state,'townhall',{queued:false,starterDiscount:false});
        return{level,seconds:E.longestConstructionSeconds(level),production:E.productionPerWorkerHour(level),
          warehouse:L.warehouseLimits(state),reserve:L.foodReserve(state),carrierCapacity:L.haulCapacity(state),
          populationRequired:L.townhallPopulationRequirement(state,Math.min(100,level+1)).populationRequired,
          cost};
      });
      const chapters=Campaign.CAMPAIGN_CHAPTERS.map(ch=>({...Campaign.campaignChapterPreview(ch.level),
        rewards:ch.steps.map((_,index)=>Campaign.campaignStepReward(ch.level,index+1))}));
      const puzzleVariants=Catalog.ISLAND_PUZZLE_CATALOG.flatMap(item=>Array.from({length:Catalog.STORY_VARIANT_COUNT},(_,index)=>{
        const variant=index+1,seed=1000+variant,level=Math.min(20,variant*4),p=Puzzle.createIslandPuzzle(item.id,{seed,variant,level});
        const view=Puzzle.getIslandPuzzleView(p,'pl'),structural=Puzzle.validateIslandPuzzle(p);
        return{kind:item.id,title:item.title.pl,variant,seed,level,initiallySolved:p.solved,
          controls:(view.controls||[]).length,solutionMoves:Puzzle.islandPuzzleSolution(p).length,
          structural,method:item.id==='marbleMaze'?'Sprawdzenie struktury fizyki; nie rozegranie kulki':'Odtworzenie rozwiązania silnika'};
      }));
      const stories=Catalog.STORY_CATALOG.map(story=>({...story,
        roomVariants:Array.from({length:story.variants},(_,index)=>({variant:index+1,kinds:Catalog.storyRoomKinds(story,index+1)}))}));
      const hourState={worldTimeMs:at};Hour.normalizeExpeditionHour(hourState);
      for(let index=0;index<7;index++)Hour.reserveExpeditionDifficulty(hourState,'workbook-round-'+index);
      const before=Hour.expeditionHourStatus(hourState),saved=JSON.parse(JSON.stringify(hourState));
      const loaded={worldTimeMs:at+10000};Hour.normalizeExpeditionHour(loaded,saved);
      const afterReload=Hour.expeditionHourStatus(loaded);loaded.worldTimeMs=at+3600000;
      const afterHour=Hour.expeditionHourStatus(loaded);
      const theatreState={worldTimeMs:at,resources:{coins:100000}};T.normalizeTheatre(theatreState);
      T.theatreAction(theatreState,{type:'theatreWelcomeGarden'});
      const welcomeCount=theatreState.theatre.collection.length;
      const ornament=T.theatreAction(theatreState,{type:'theatreBuy',decoration:'fountain',x:421,y:468});
      if(!ornament.ok)throw Error('Missing free-position Theatre purchase');
      T.theatreAction(theatreState,{type:'theatreSaveLayout',slot:0});
      T.theatreAction(theatreState,{type:'theatreUpgrade',id:ornament.item.id});
      const coinsBeforeRestore=theatreState.resources.coins;
      T.theatreAction(theatreState,{type:'theatreMove',id:ornament.item.id,x:650,y:520});
      T.theatreAction(theatreState,{type:'theatreRestoreLayout',slot:0});
      const reloaded={worldTimeMs:at,resources:{coins:theatreState.resources.coins}};
      T.normalizeTheatre(reloaded,JSON.parse(JSON.stringify(theatreState)));
      const theatreProof={welcomeCount,position:T.theatrePosition(reloaded,reloaded.theatre.collection.find(item=>item.id===ornament.item.id)),
        level:reloaded.theatre.collection.find(item=>item.id===ornament.item.id).level,
        coinsBeforeRestore,coinsAfterRestore:reloaded.resources.coins,owned:reloaded.theatre.collection.length};
      const theatreQuotes=T.THEATRE_DECORATIONS.flatMap(kind=>[1,2,5,20,21,25,100,1000].map(level=>{
        const own={worldTimeMs:at,resources:{coins:1e9}};T.normalizeTheatre(own);
        const bought=T.theatreAction(own,{type:'theatreBuy',decoration:kind.id});
        own.theatre.collection.find(item=>item.id===bought.item.id).level=Math.max(1,level-1);
        const quote=level===1?T.theatreQuote(own,{type:'theatreBuy',decoration:kind.id}):T.theatreQuote(own,{id:bought.item.id});
        if(!quote.ok)throw Error('Missing Theatre quote');return{type:kind.id,title:kind.namePl,level,coins:quote.coins,requiresAd:quote.requiresAd};
      }));
      const budgetSamples=[2,4,10,20].map(level=>{
        const state={worldTimeMs:at,buildings:{townhall:{level}},lighthouseMissions:{chapter:{level}}};
        Budget.normalizeAdventureBudget(state);
        const before=Budget.adventureRewardStatus(state),first=Budget.claimAdventureBudget(state,{receiptId:'excel-'+level,reward:{coins:100000}});
        const copy={worldTimeMs:at,buildings:{townhall:{level}},lighthouseMissions:{chapter:{level}}};Budget.normalizeAdventureBudget(copy,JSON.parse(JSON.stringify(state)));
        const reloaded=Budget.adventureRewardStatus(copy),duplicate=Budget.claimAdventureBudget(copy,{receiptId:'excel-'+level,reward:{coins:100000}});
        copy.worldTimeMs+=86400000;const nextDay=Budget.claimAdventureBudget(copy,{receiptId:'excel-next-'+level,reward:{coins:100000}});
        return{level,before,first,reloaded,duplicate,nextDay};
      });
      console.log(JSON.stringify({version:GAME_VERSION,levels,chapters,
        days:Campaign.CAMPAIGN_DAYS||null,levelWindows:Campaign.CAMPAIGN_LEVEL_WINDOWS||null,
        campaignVersion:Campaign.CAMPAIGN_VERSION,campaignWeights:Campaign.CAMPAIGN_REWARD_WEIGHTS,
        puzzles:Catalog.ISLAND_PUZZLE_CATALOG,puzzleKinds:Puzzle.ISLAND_PUZZLE_KINDS,puzzleVariants,stories,
        storyVariants:Catalog.STORY_VARIANT_COUNT,hourRules:Hour.EXPEDITION_HOUR_RULES,
        hourProof:{before,afterReload,afterHour},roundRewards:Array.from({length:30},(_,index)=>({stage:index+1,reward:Hour.cappedExpeditionReward(index+1)})),
        theatre:T.THEATRE_RULES,theatreBounds:T.THEATRE_GARDEN_BOUNDS,theatreProof,theatreQuotes,
        diagnostic:L.warehouseDispatchStatus(S.createState(at)),missionRules:Missions.MISSION_RULES,
        activityRules:A.ADVENTURE_RULES,budgetRules:Budget.ADVENTURE_BUDGET_RULES,budgetSamples,tour:Copy.APPROVED_TOUR_IDS.map(id=>({id,...Copy.getTourCopy(id,'pl',{cloudAccount:true})})),
        lessons:P.TUTORIAL_LESSONS.map(row=>({id:row.id,...Copy.lessonCopy(row.id,'pl',{curriculum:P.TUTORIAL_VERSION})}))}));
    """
    process = subprocess.run(['node', '--input-type=module', '-e', source], cwd=ROOT,
                             capture_output=True, text=True, check=True, timeout=90)
    facts = json.loads(process.stdout)
    assert facts['version'] == '0.14.0.0', 'Finalize version before creating or validating release Excel 14'
    assert len(facts['chapters']) == 19 and sum(len(ch['steps']) for ch in facts['chapters']) == 152
    assert isinstance(facts['days'], list) and len(facts['days']) == 50, 'Read the50-day runtime catalog; do not fabricate a playthrough'
    assert [day['day'] for day in facts['days']] == list(range(1,51))
    assert len(facts['levelWindows']) == 20 and all(day['minActiveMinutes'] == 180 for day in facts['days'])
    assert len(facts['stories']) == 20 and facts['storyVariants'] == 5
    assert set(facts['puzzleKinds']) == {p['id'] for p in facts['puzzles']}
    assert all(p['structural'] and not p['initiallySolved'] for p in facts['puzzleVariants'])
    assert len(facts['puzzleVariants']) == len(facts['puzzles']) * 5
    assert facts['hourRules']['maximumRoundReward'] == 800
    assert [r['reward'] for r in facts['roundRewards'][:6]] == [50,100,200,400,800,800]
    assert facts['hourProof']['before']['nextDifficulty'] == facts['hourProof']['afterReload']['nextDifficulty'] == 8
    assert facts['hourProof']['afterHour']['nextDifficulty'] == 1
    assert facts['theatreProof']['position'] == {'x':421,'y':468}
    assert facts['theatreProof']['level'] == 2 and facts['theatreProof']['coinsBeforeRestore'] == facts['theatreProof']['coinsAfterRestore']
    assert facts['theatre']['slots'] == 20 and facts['theatre']['maxLevel'] is None
    assert facts['levels'][0]['seconds'] == 45 and facts['levels'][23]['seconds'] == 86400
    assert len(facts['lessons']) == 25
    for chapter in facts['chapters']:
        assert sum(reward.get('coins',0) for reward in chapter['rewards']) == chapter['budget']['coins']
    assert facts['budgetRules']['dailyFraction'] == .2 and facts['budgetRules']['chapterFraction'] == .3
    for entry in facts['budgetSamples']:
        assert entry['before']['dailyLimit'] == entry['level'] * 100
        assert entry['before']['chapterLimit'] == entry['level'] * 150
        assert entry['first']['reward']['coins'] == entry['level'] * 100
        assert entry['reloaded']['dailyRemaining'] == 0 and entry['duplicate']['duplicate']
        assert entry['nextDay']['reward']['coins'] == entry['level'] * 50
    return facts


def manual_cases():
    cases = json.loads(CASES.read_text())['cases']
    assert len({case['id'] for case in cases}) == len(cases)
    assert all(case['manual_result'] == 'NOT RUN' for case in cases), 'Do not rewrite real manual outcomes'
    return cases


def prepare(facts, cases):
    intro = sheet(VISIBLE[0], 'HARBORLIGHT14 — zasady DEV 0.14.0.0 / v31',
      'Nowe zakładki opisują kod i katalog.88 historycznych arkuszy Excela13 pozostaje ukrytym, niezmienionym archiwum. Plan50 dni nie jest gwarancją awansu ani wynikiem symulacji lub testów czasu zabawy.',
      ['Obszar','Stan / wyjaśnienie','Źródło'],[35,145,95])
    for row in [
      ['DEV v31',facts['version']+' — nowe misje, zagadki, zapisy, transport i Teatr. Własne testy/CI/Pages podaje rejestr środowisk; generator nie publikuje gry.','docs/ENVIRONMENT-STATUS.md'],
      ['PRE-PROD',summary(PREPROD),'Odrębny odebrany stan0.13.1.0; bez promocji nowegoDEV przez generator.'],
      ['50 dni i20 poziomów','Dni są planem tempa i scenariuszy. Otwieranie rozdziałów zależy od postępu, nie daty telefonu. Spóźnienie nie usuwa fabuły; wcześniejsze wykonanie warunku jest rozpoznawane.','50 dni v14 / Misje v14'],
      ['152 etapy',str(sum(len(ch['steps']) for ch in facts['chapters']))+' celów, osiem na rozdział2–20. Widać jeden bieżący cel; dalsze są zapowiedzią.','harborlight-v1-campaign.js'],
      ['Biblioteka przygód',f"{len(facts['stories'])} dłuższych fabuł, po{facts['storyVariants']} wariantów; {len(facts['puzzles'])} mechanik. Zagadki wymagają rzeczywistych ruchów, nie kliknięcia przycisku odbioru.",'harborlight-v1-story-catalog.js / island-puzzles.js'],
      ['Czego nie udowadnia Excel','Odczyt katalogu i solver modelu nie dowodzą150 godzin atrakcyjnej zabawy ani bezpłatnegoTH20 w dniu 50. Takie oceny wymagają pełnej symulacji ekonomicznej i testów graczy.','Jawne ograniczenie wyników'],
      ['Ratusz 3→4','Przed wydaniem materiałów sprawdź54mieszkańców, gotowość transportu i pełny koszt. Ścieżka pomocy ma uzupełniać rzeczywisty brak; zaliczone wpłaty nie przepadają.','Misje v14 / Transport v14'],
      ['Nagrody i pochodzenie monet','Nagroda i limit należą do konta i konkretnego zdarzenia. Sam odczyt instrukcji, odświeżenie czy zmiana wyspy nie są kolejnym ukończeniem. Kwalifikację do Pomagam potwierdza serwer.','Nagrody v14'],
      ['Magazyn i Młyn','Miejsce dla żywności i gotowi tragarze są odrębnymi warunkami. Podczas budowy część ekipy odbiera zapasy; pojedynczy tragarz dzieli czas między obie trasy.','Transport v14'],
      ['Teatr','Limit20 dekoracji na placu; swobodne współrzędne w obrębie ogrodu, zapis między sesjami, kolekcja i dalsze poziomy. Przestawienie nie kupuje ani nie niszczy ozdoby.','Teatr v14'],
      ['Ręczne testy',f"{len(cases)} osobnych prób nadalNOT RUN. Automatyczne kontrole nie odznaczają wyników użytkownika.",'Testy v14 / docs/testing/START-HERE.md'],
      ['Historia i chmura','Zwykłe wdrożenie zachowuje konta, hasła, postęp i rozpoczęte budowy. PRE-PROD/PROD oraz prawdziwi operatorzy mają osobne odbiory.','AGENTS.md; docs/RELEASE-PROCESS.md']
    ]: intro.add(row,90)

    days = sheet(VISIBLE[1], 'PLAN50DNI — tempo referencyjne i kolejne zajęcia',
      'Odczyt CAMPAIGN_DAYS z kodu. To katalog planowania: dzień nie jest blokadą kalendarza ani obietnicą ukończenia poziomu. Rzeczywiste koszty, obsada, zapasy i tempo gracza pozostają nadrzędne.',
      ['Dzień','Zakres poziomów','Temat','Główne cele dnia','Przygoda','Zagadki','Założenie aktywności [min]'],[13,25,60,130,65,115,34])
    puzzle_names = {entry['id']:entry['title']['pl'] for entry in facts['puzzles']}
    story_names = {entry['id']:entry['title']['pl'] for entry in facts['stories']}
    for index, entry in enumerate(facts['days'],1):
        level = entry.get('level',entry.get('targetLevel',''))
        chapter = next((ch for ch in facts['chapters'] if ch['level'] == level),None)
        title = entry.get('titlePl',entry.get('title',chapter['title'] if chapter else ''))
        if isinstance(title,dict): title = title.get('pl','')
        days.add([entry.get('day',index),entry.get('levelRange',level),title,entry['focusPl'],
          story_names.get(entry['storyId'],entry['storyId']),' → '.join(puzzle_names.get(kind,kind) for kind in entry['puzzleKinds']),entry['minActiveMinutes']],130)

    missions = sheet(VISIBLE[2], 'MISJE —19 rozdziałów i152 rzeczywiste cele',
      'Cel jest wykonywany przez stan wyspy, dostawę lub rozwiązaną zagadkę. Opis lub instrukcja nie zastępują działania. Budżety i nagrody pochodzą z campaignBudget / campaignStepReward.',
      ['Poziom','Rozdział','Etap','Cel','Typ','Budynek / zasób / zagadka','Warunki źródłowe','Nagroda etapu','Budżet rozdziału','Zmiana w świecie'],
      [13,65,14,90,25,42,110,60,65,110])
    for chapter in facts['chapters']:
        for index, step in enumerate(chapter['steps'],1):
            missions.add([chapter['level'],chapter['title']['pl'],index,step['title']['pl'],step['type'],
              step.get('building',step.get('resource',step.get('puzzleKind',step.get('storyId','')))),
              summary({k:v for k,v in step.items() if k not in ['title','index']}),summary(chapter['rewards'][index-1]),
              summary(chapter['budget']),chapter['worldChange']['pl']],100)

    puzzles = sheet(VISIBLE[3], 'ZAGADKI — mechaniki, fabuły i warianty',
      'Czasy katalogowe są orientacyjnymi założeniami, nie zmierzonym czasem zabawy. Walidacja solvera sprawdza ruchy modeli; kulka ma osobną fizykę.100 wariantów fabuł to różne układy/kolejności, nie100osobno testowanych scenariuszy przy stole.',
      ['Rodzaj','Nazwa','ID','Wariant','Poziom odblokowania','Czas orientacyjny [min]','Instrukcja / fabuła','Mechaniki / próba modelu','Zakres dowodu'],[25,55,35,17,27,28,125,110,110])
    for item in facts['puzzles']:
        for v in [row for row in facts['puzzleVariants'] if row['kind']==item['id']]:
            puzzles.add(['Mechanika',item['title']['pl'],item['id'],v['variant'],v['level'],item['durationSeconds']/60,
              item['description']['pl'],f"Seed{v['seed']}; ruchy rozwiązania:{v['solutionMoves']}; struktura:{v['structural']}",v['method']],85)
    names = {item['id']:item['title']['pl'] for item in facts['puzzles']}
    for item in facts['stories']:
        for v in item['roomVariants']:
            puzzles.add(['Fabuła',item['title']['pl'],item['id'],v['variant'],item['unlockLevel'],item['durationSeconds']/60,
              item['intro']['pl'],' → '.join(names.get(kind,kind) for kind in v['kinds']),
              'Kolejność pobrana z katalogu. Nie jest testem całej przygody ani pomiarem satysfakcji gracza.'],105)

    tests = sheet(VISIBLE[4], 'TESTY — osobne ręczne zdarzenia do odhaczania',
      'Wyniki ręczne pozostająNOT RUN, dopóki tester nie wykona kroków i nie zapisze dowodu. Sprawdzenie generatora, kodu i solverów nie zastępuje testu użytkownika.',
      ['ID','Obszar','Nazwa','Priorytet','Gotowość','Karta w Git','Zmiany','Warunki i kroki','Rodzaj','Oczekiwany wynik','Dowód / uwagi','Wynik ręczny'],
      [22,35,65,16,20,100,70,145,18,55,70,24])
    for case in cases:
        text = (ROOT/'docs/testing'/case['file']).read_text()
        detail = text.split('## Dane i warunki',1)[-1].split('## Raport wykonania',1)[0].strip()[:22000]
        tests.add([case['id'],case['area'],case['title'],case['priority'],case['definition_status'],
          'https://github.com/ksobczak321-oss/gra/blob/main/docs/testing/'+case['file'],', '.join(case.get('changes',[])),
          detail,'Ręczny','Patrz osobna karta','',case['manual_result']],180)
    tests.validations.append({'type':'list','sqref':f'L6:L{max(tests.rows)}','formula1':'"NOT RUN,PASS,FAIL,BLOCKED"'})

    economy = sheet(VISIBLE[5], 'GOSPODARKA — aktualne koszty i granice1–100',
      'Poziom producenta i Magazynu utożsamiono z wierszem tylko na potrzeby porównania. Czasy są budżetem referencyjnym; produkcja wymaga rzeczywistej obsady, posiłków i odbioru. Kolejka ma własny narzut.',
      ['Poziom','Budżet bazowy [s]','Transport [s]','Budowa [s]','Razem [h]','Produkcja/os./h','Magazyn/zasób','Magazyn razem','Rezerwa żywności','Ładunek/tragarz','Koszt następnegoTH/zasób','Ludność do kolejnegoTH','Plan: od dnia','Plan: do dnia'],
      [14,27,25,25,22,27,27,27,28,28,32,34,23,23])
    for entry in facts['levels']:
        row = max([5,*economy.rows])+1
        window = next((item for item in facts['levelWindows'] if item['level']==entry['level']),None)
        economy.add([entry['level'],entry['seconds'],Formula(f'=B{row}*0.4'),Formula(f'=B{row}*0.6'),Formula(f'=B{row}/3600'),
          entry['production'],entry['warehouse']['perResource'],entry['warehouse']['total'],entry['reserve'],entry['carrierCapacity'],
          entry['cost']['wood'] if entry['level']<100 else 'Maksymalny poziom',entry['populationRequired'] if entry['level']<100 else 'Maksymalny poziom',
          window['firstDay'] if window else '',window['lastDay'] if window else ''],48)

    transport = sheet(VISIBLE[6], 'TRANSPORT I POMOC — warunek, powód i droga wyjścia',
      'Podane reguły odpowiadają poprawkomv31. Liczby gotowych/przypisanych osób, kursów i miejsca na dany zasób są różnymi wartościami. Nie przypisujemy zgłoszeniu gracza przyczyny bez odczytu jego stanu.',
      ['Sytuacja','Sprawdzenie / komunikat','Droga wyjścia','Źródło'],[42,145,145,95])
    for row in [
      ['Ratusz 3→4','54osoby to75%limitu72. Materiały nie zastępują progu ludności.','Wcześniejsza kontrola, rozbudowa Domu i rzeczywista akcja rekrutacji; zaliczone wpłaty pozostają.','missions.js; campaign.js'],
      ['Młyn pełny, trwa budowa','Przy3 gotowych osobach jedna obsługuje odbiór żywności, dwie budowę. Z jednym tragarzem kursy są przeplatane.','Sprawdź gotowych tragarzy, ich ładunek, zajęcie ekip i centralFoodRoom; priorytet nie przerywa już załadowanego kursu.','warehouseDispatchStatus; dispatchTrips'],
      ['Wielu dodatkowych tragarzy','Zarezerwowaną budowę wyklucza się przed wyborem ich pracy.','Nie blokuj wszystkich dodatkowych osób na niedostępnym zleceniu; mogą odbierać produkcję.','logistics.js'],
      ['Starszy zapis turbo6','Dawny plan zachowuje koszt, zegar i towary. Mniejsza rzeczywista ekipa wykonuje więcej kursów.','Nie wymagamy szóstego pracownika tylko po to, aby ruszyli pozostali. Brak jakiegokolwiek gotowego tragarza nadal wymaga obsady.','normalizeLogisticsState; constructionEstimate'],
      ['Pakiet wygasł po przyjęciu planu','Już zaakceptowany plan może ruszyć po zgromadzeniu materiałów mimo końca pakietu.','Nowe plany wymagają uprawnienia. Przyjęte zachowują normalną kolejkę i nie płacą drugi raz.','promoteConstructionQueue'],
      ['Wolne miejsce łącznie, brak na żywność','Każdy materiał ma własny limit, uwzględniający już płynący ładunek; nagrody są osobną pulą.','Pokaż nazwę blokującego zasobu. Opróżnij jego limit lub zwiększ poziom Magazynu.','centralRoom; inventory.js'],
      ['Potwierdzanie zapisu','Odpowiedź chmury jest warunkiem kolejnej zatwierdzanej operacji.','Wyraźny stan zapisu, obsługa błędu i ponowienie; brak potwierdzenia nie może udawać sukcesu.','dev-sync / play; osobne testy'],
      ['Pomoc8/5/3','Misja pomocnicza ma pięćetapów, ratunkowa trzy. Przyczyna pierwotnej blokady musi zostać uzupełniona.','Nie żądamy na końcu tej samej niemożliwej czynności bez przygotowania zasobów, obsady, łóżek i ludności.','missionAssistanceOffer; prepareMissionAssistance']
    ]: transport.add(row,110)
    transport.add(['Przykładowy odczyt nowej wyspy',summary(facts['diagnostic']),'To fikstura runtime, nie prywatny stanadmin1–admin3.','warehouseDispatchStatus(createState)'],100)

    rewards = sheet(VISIBLE[7], 'NAGRODY — budżety rozdziałów i licznik godzinowy',
      'Nie sumuj obietnic z instrukcji jako odebranych monet. Monety i materiały są przyznawane przez zakończone etapy z trwałym potwierdzeniem. Zmiana wyspy ani odświeżenie nie tworzą nowej wypłaty.',
      ['Mechanika / poziom','Parametr','Wartość','Jednostka','Reguła / źródło'],[38,65,40,25,150])
    for chapter in facts['chapters']:
        row = max([5,*rewards.rows])+1
        rewards.add([chapter['level'],'Budżet kanoniczny',chapter['budget']['canonical'],'każdego zasobu','500×poziom ukończonego Ratusza; nie jest darmową wypłatą pełnego kosztu.'],55)
        row = max([5,*rewards.rows])+1
        rewards.add([chapter['level'],'Budżet monet rozdziału',chapter['budget']['coins'],'monety',f"Osiem rzeczywistych nagród: {summary(chapter['rewards'])}"],80)
    rewards.add(['Rundy ekspedycji','Reset licznika',facts['hourRules']['seconds'],'s','Kolejna pełna godzina. Ponowne otwarcie gry i nowa seria nie resetują trudności.'],70)
    rewards.add(['Rundy ekspedycji','Maks. nagroda rundy',facts['hourRules']['maximumRoundReward'],'monety','Nowa polityka31:50,100,200,400,800, następnie800. Rozpoczęte starsze gry zachowują swoją politykę.'],75)
    for entry in facts['roundRewards']: rewards.add(['Runda'+str(entry['stage']),'Nowa polityka nagrody',entry['reward'],'monety','Runda i pula serii są różnymi wielkościami; tabela pokazuje samą nagrodę rundy.'],42)
    rewards.add(['Próba zapisu licznika','Po7rozpoczętych rundach',facts['hourProof']['before']['nextDifficulty'],'następna trudność','Po odczycie tego samego konta nadal8; po granicy godziny1. Modelowa kontrola, nie logowanie do chmury.'],80)
    rewards.add(['Pomagam','Źródła kwalifikowane','tax-base / free-task / expedition','zweryfikowane zdarzenie','Kupione, handlowe, reklamowe i nieznane monety pozostają niekwalifikowane. Sam klient nie wybiera swojego pochodzenia.'],85)
    rewards.add(['Nowe zagadki i opowieści','Wspólny limit dzienny',facts['budgetRules']['dailyFraction'],'część500×TH','Jedna pula wartości na konto dla nowych zagadek i opowieści na wszystkich wyspach. Dziewięć wcześniejszych przygód zachowuje swoje nagrody, w tym dokładny złapany ładunek. Zmiana celu lub wyspy nie odnawia puli.'],105)
    rewards.add(['Nowe zagadki i opowieści','Wspólny limit rozdziału',facts['budgetRules']['chapterFraction'],'część500×poziom rozdziału','Drugi limit dotyczy nowej biblioteki zagadek i opowieści. Po wykorzystaniu budżetu pozostaje ćwiczenie bez kolejnej wypłaty.'],90)
    rewards.add(['Przygody poboczne','Przeliczanie wartości','moneta1 / surowiec0,5 / żywność i deski1,5','jednostka wartości','Limity dotyczą wartości całej nagrody, a nie oddzielnej pełnej puli dla każdego zasobu.'],80)
    for entry in facts['budgetSamples']:
        rewards.add([entry['level'],'Limit doby / rozdziału',f"{entry['before']['dailyLimit']} / {entry['before']['chapterLimit']}",'jednostki wartości',
          f"Model: pierwsza wypłata{entry['first']['reward']['coins']}monet; po odczycie pozostało{entry['reloaded']['dailyRemaining']}w dobie. Następna doba daje tylko pozostałe{entry['nextDay']['reward']['coins']}z rozdziału."],95)
    rewards.add(['Premie produkcji','Łączenie z Latarnią','×2 ×2 = ×4','mnożnik','Rzeczywista wartość zależy od gotowej obsady, poziomu, wejścia i transportu. Krótka premia nie jest zawsze tą samą liczbą surowców.'],85)

    theatre = sheet(VISIBLE[8], 'TEATR — swobodny ogród, kolekcja i ceny',
      'Na mapie widać budynek, a ogród po wejściu.20 to limit ustawionych dekoracji, nie obowiązek skakania po sztywnej siatce. Przeciąganie, dotyk i pozycje są zapisywane z wyspą.',
      ['Element','ID / poziom','Monety','Reklama','Reguła / wynik modelu'],[38,34,28,35,160])
    theatre.add(['Ogród powitalny','własne dekoracje',0,'Nie',summary(facts['theatreProof'])],100)
    theatre.add(['Obszar ustawiania','współrzędne',0,'Nie',summary(facts['theatreBounds'])+'; przykład421,468zachowany po Pomysł/przeniesienie/odczyt, poziom2i monety bez cofnięcia.'],85)
    theatre.add(['Dalsze poziomy','bez końca20',0,'Co5poziomów','Przestawienie i zdjęcie nie niszczy ani nie kupuje ozdoby. Reklama jest wymagana także przy 25/30, z wyjątkiem aktywnego uprawnienia bez reklam.'],85)
    for entry in facts['theatreQuotes']:
        theatre.add([entry['title'],entry['type']+'/'+str(entry['level']),entry['coins'],'TAK' if entry['requiresAd'] else 'Nie','Cena pobrana z theatreQuote; wyższe poziomy zachowują własność i zapisane położenie.'],52)

    calc = sheet(VISIBLE[9], 'KALKULATOR — tempo, zasoby i jawne założenia',
      'Pola niebieskie są edytowalne. Wynik to model prostych zależności, nie50-dniowa symulacja. Nie uwzględnia kolejek, przestoju, głodu, zmiennej populacji ani ryzyka nieukończonych zadań.',
      ['Obszar','Parametr','Wartość','Jednostka','Wyjaśnienie'],[27,65,32,29,145])
    for row,name,value,unit,note in [(6,'Ukończony Ratusz',2,'poziom','1–100; koszt referencyjny500×poziom.'),
      (7,'Poziom producenta',2,'poziom','Producent jest odrębny odRatusza.'),(8,'Gotowi pracownicy',3,'osoby','Z łóżkami i posiłkami.'),
      (9,'Dodatkowy mnożnik produkcji',1,'×','Nie należy wliczać tej samej premii dwukrotnie.'),
      (10,'Początkowi mieszkańcy',12,'osoby','Przykład do personogodzin, nie prognoza przyrostu.'),
      (11,'Końcowi mieszkańcy',342,'osoby','Przykład liniowego wzrostu, nie gwarancja50 dni.'),
      (12,'Długość okresu',50,'dni','Dni referencyjne; nie liczba obowiązkowych logowań.')]: calc.calc(row,'WEJŚCIE',name,value,unit,note,editable=True)
    for row,name,formula,unit,note in [(14,'Koszt kolejnegoRatusza / zasób','=500*C6','szt.','Bez kolejki, bez dodatkowych potrzeb żywności.'),
      (15,'Produkcja / osoba / godz.','=40+4*(C7-1)','szt./godz.','Dokładna bazowa reguła runtime.'),
      (16,'Produkcja obsady','=C15*C8*C9','szt./godz.','Młyn iTartak wymagają2 wejścia na1 produkt.'),
      (17,'Godziny na jeden materiał','=C14/C16','godz.','Nie obejmuje dostawy ani zużycia przez inne procesy.'),
      (19,'Referencyjny budżet monet rozdziału','=500*MAX(2,MIN(100,C6))*0.6','monety','campaignBudget; nie wypłata za samo otwarcie instrukcji.'),
      (21,'Średnia ludność w modelu liniowym','=(C10+C11)/2','osoby','Hipotetyczna krzywa, a nie symulacja gry.'),
      (22,'Podatki przy całej ludności pracującej24 h','=C21*C12*24','monety','1 moneta/os./h. W grze część mieszkańców może nie pracować.'),
      (23,'Podatki przy3 h/dobę×2 i21 h×1','=C21*C12*27','monety','Warunkowy przykład; inne premie i koszty są osobno.')]: calc.calc(row,'WYNIK',name,Formula(formula),unit,note)
    for row in [6,7]: calc.validations.append({'type':'whole','sqref':f'C{row}','operator':'between','formula1':'1','formula2':'100'})
    calc.validations.append({'type':'whole','sqref':'C8','operator':'between','formula1':'1','formula2':'1200'})
    sheets = [intro,days,missions,puzzles,tests,economy,transport,rewards,theatre,calc]
    checks = sheet(HIDDEN[0], 'KONTROLE — dane kodu, warianty i formuły',
      'TRUE oznacza sprawdzenie danych lub formuły. Nie oznacza ręcznego testu, udanego wdrożenia, zmierzonego czasu zabawy ani symulacji50 dni.',
      ['Kontrola','Odczyt / formuła','Oczekiwane','Zgodność','Źródło'],[72,38,38,22,115],hidden=True)
    for name,actual,expected in [('Rozdziały',len(facts['chapters']),19),('Etapy',sum(len(ch['steps']) for ch in facts['chapters']),152),
      ('Dni planu',len(facts['days']),50),('Okna poziomów',len(facts['levelWindows']),20),('Fabuły',len(facts['stories']),20),('Warianty fabuły',facts['storyVariants'],5),
      ('Odczyt licznika nie zeruje trudności',facts['hourProof']['afterReload']['nextDifficulty'],8),
      ('Budżet doby TH10',facts['budgetSamples'][2]['before']['dailyLimit'],1000),('Budżet rozdziału 10',facts['budgetSamples'][2]['before']['chapterLimit'],1500),
      ('Następna doba nie odtwarza budżetu rozdziału',facts['budgetSamples'][2]['nextDay']['reward']['coins'],500),
      ('Nowa godzina',facts['hourProof']['afterHour']['nextDifficulty'],1),('Pułap nowej rundy',facts['hourRules']['maximumRoundReward'],800),
      ('X położenia Teatru',facts['theatreProof']['position']['x'],421),('Y położenia Teatru',facts['theatreProof']['position']['y'],468),
      ('Poziom ozdoby po przywróceniu',facts['theatreProof']['level'],2),('Monety po przywróceniu',facts['theatreProof']['coinsAfterRestore'],facts['theatreProof']['coinsBeforeRestore']),
      ('Scenariusze ręczne',len(cases),len(cases))]: checks.add([name,actual,expected,actual==expected,'Rzeczywiste eksporty i modelowe operacjeNode'],48)
    for row,expected in [(14,1000),(15,44),(16,132),(17,1000/132),(19,600),(21,177),(22,212400),(23,238950)]:
        n=max([5,*checks.rows])+1;checks.add([f'Kalkulator C{row}',Formula(f"='Kalkulator v14'!C{row}"),expected,Formula(f'=ABS(B{n}-C{n})<0.000001'),'Niezależne wyliczenie warunkowego przykładu'],48)
    sources = sheet(HIDDEN[1], 'ŹRÓDŁA — snapshot eksportówv31',
      'Bez prywatnych kont, Billing i poświadczeń. Pełne dane pochodzą z modułów kodu. Odbiór chmury i ręczne wyniki mają osobne dowody.',
      ['Klucz','Wartość /JSON','Źródło'],[50,180,95],hidden=True)
    sources.add(['Excel 13SHA-256',SOURCE_SHA256,'Niezmieniony bazowy plik'],42)
    sources.add(['OdebranePRE-PROD',summary(PREPROD),'docs/PREPROD-V30-PROMOTION.md'],90)
    for key,value in facts.items():
        entries = list(enumerate(value,1)) if isinstance(value,list) else [(None,value)]
        for index,entry in entries: sources.add([key+(f'/{index}' if index is not None else ''),summary(entry),'Rzeczywisty eksportNode'],90)
    sheets += [checks,sources]
    for item in sheets:
        for row,values in item.rows.items():
            for col,value in enumerate(values,1):
                if isinstance(value,Formula): value.cached=old.evaluate(value.text,sheets,item.name,((item.name,f'{get_column_letter(col)}{row}'),))
    return sheets


def build(facts,cases):
    assert digest(BASE)==SOURCE_SHA256, 'Historical Excel 13 bytes changed'
    sheets=prepare(facts,cases)
    with ZipFile(BASE) as source: entries={name:source.read(name) for name in source.namelist()}
    workbook=E.fromstring(entries['xl/workbook.xml']);nodes=workbook.find(f'{{{M}}}sheets');historical_count=len(nodes)
    assert historical_count==88
    for node in nodes: node.set('state','hidden')
    for view in workbook.findall(f'{{{M}}}bookViews/{{{M}}}workbookView'):
        view.set('activeTab',str(historical_count));view.set('firstSheet',str(historical_count))
    calc=workbook.find(f'{{{M}}}calcPr')
    if calc is None: calc=E.SubElement(workbook,f'{{{M}}}calcPr')
    calc.set('calcMode','auto');calc.set('fullCalcOnLoad','1');calc.set('forceFullCalc','1')
    rels=E.fromstring(entries['xl/_rels/workbook.xml.rels']);types=E.fromstring(entries['[Content_Types].xml'])
    next_rid=max(int(node.get('Id')[3:]) for node in rels if node.get('Id','').startswith('rId'))+1
    next_id=max(int(node.get('sheetId')) for node in nodes)+1
    for index,item in enumerate(sheets):
        number=historical_count+index+1;rid=f'rId{next_rid+index}';name=f'xl/worksheets/sheet{number}.xml'
        E.SubElement(nodes,f'{{{M}}}sheet',name=item.name,sheetId=str(next_id+index),state='hidden' if item.hidden else 'visible',**{f'{{{R}}}id':rid})
        E.SubElement(rels,f'{{{P}}}Relationship',Id=rid,Type=f'{R}/worksheet',Target=f'worksheets/sheet{number}.xml')
        E.SubElement(types,f'{{{C}}}Override',PartName='/'+name,ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml')
        entries[name]=old.sheet_xml(item,number)
    changed={'xl/workbook.xml':workbook,'xl/_rels/workbook.xml.rels':rels,'[Content_Types].xml':types}
    core=E.fromstring(entries['docProps/core.xml']);dc='http://purl.org/dc/elements/1.1/'
    for name,value in [('title','HARBORLIGHT14 — kampania i zasadyDEV 0.14.0.0'),('subject','Katalog50 dni/152 etapów, zasadyv31 i niezmienione88 historycznych arkuszy'),
      ('description','Dane z eksportów kodu; plan nie jest gwarancjąTH20 w dniu 50 ani pomiarem150 godzin zabawy. Zachowane komentarze i historyczne cache.')]:
        node=core.find(f'{{{dc}}}{name}')
        if node is None: node=E.SubElement(core,f'{{{dc}}}{name}')
        node.text=value
    changed['docProps/core.xml']=core
    for name,node in changed.items(): entries[name]=E.tostring(node,xml_declaration=True,encoding='UTF-8',standalone=True)
    with ZipFile(OUTPUT,'w',compression=ZIP_DEFLATED,compresslevel=9) as target:
        for name,value in entries.items(): target.writestr(name,value)


def validate(facts,cases):
    assert digest(BASE)==SOURCE_SHA256
    sheets=prepare(facts,cases);mutable={'xl/workbook.xml','xl/_rels/workbook.xml.rels','[Content_Types].xml','docProps/core.xml'};parts=0
    with ZipFile(BASE) as source,ZipFile(OUTPUT) as target:
        assert target.testzip() is None
        for name in source.namelist():
            if name not in mutable:
                assert source.read(name)==target.read(name),f'Historical ZIP part changed:{name}'
                parts+=1
    previous,previous_values=load_workbook(BASE,data_only=False),load_workbook(BASE,data_only=True)
    book,cached=load_workbook(OUTPUT,data_only=False),load_workbook(OUTPUT,data_only=True)
    assert len(previous.sheetnames)==88 and len(book.sheetnames)==88+len(sheets)
    assert [item.title for item in book if item.sheet_state=='visible']==VISIBLE and book.active.title==VISIBLE[0]
    comments=historical_formulas=formulas=0
    for item in previous:
        assert book[item.title].sheet_state=='hidden'
        for row in item:
            for cell in row:
                restored=book[item.title][cell.coordinate]
                assert restored.value==cell.value,(item.title,cell.coordinate)
                assert cached[item.title][cell.coordinate].value==previous_values[item.title][cell.coordinate].value,(item.title,cell.coordinate,'cache')
                if cell.data_type=='f':historical_formulas+=1
                if cell.comment:
                    comments+=1;assert restored.comment and restored.comment.text==cell.comment.text and restored.comment.author==cell.comment.author
    for item in sheets:
        assert book[item.name]['A1'].value==item.title
        for row,values in item.rows.items():
            for col,value in enumerate(values,1):
                cell,cache=book[item.name].cell(row,col),cached[item.name].cell(row,col)
                if isinstance(value,Formula):
                    formulas+=1;assert cell.value==value.text and cache.data_type!='e' and cache.value is not None
                    if isinstance(value.cached,(int,float)) and not isinstance(value.cached,bool): assert math.isclose(cache.value,value.cached,rel_tol=1e-12,abs_tol=1e-8),(item.name,row,col)
                    else:assert cache.value==value.cached
                elif isinstance(value,(int,float)) and not isinstance(value,bool):assert math.isclose(cell.value,value,rel_tol=1e-12,abs_tol=1e-8)
                elif value=='':assert cell.value in ['',None],(item.name,row,col)
                else:assert cell.value==value,(item.name,row,col)
    assert comments==48
    assert all(row[3] is True for row in cached[HIDDEN[0]].iter_rows(min_row=6,values_only=True))
    assert book[VISIBLE[4]].max_row-5==len(cases)
    assert all(book[VISIBLE[4]].cell(row,12).value=='NOT RUN' for row in range(6,book[VISIBLE[4]].max_row+1))
    calc=next(item for item in sheets if item.name==VISIBLE[9]);samples=0
    for entry in facts['levels']:
        for input_row,result_row,expected in [(6,14,500*entry['level']),(7,15,entry['production'])]:
            saved=calc.rows[input_row][2];calc.rows[input_row][2]=entry['level']
            actual=old.evaluate(calc.rows[result_row][2].text,sheets,calc.name)
            assert math.isclose(actual,expected,rel_tol=1e-12,abs_tol=1e-8);samples+=1;calc.rows[input_row][2]=saved
    report={'version':14,'as_of':'2026-11-04','current_code':facts['version'],'scope':'DEVv31; catalog/rules only, no50-day or150-hour validation',
      'published_preprod':PREPROD,'source_file':BASE.name,'source_sha256':SOURCE_SHA256,'output':OUTPUT.name,'sha256':digest(OUTPUT),'bytes':OUTPUT.stat().st_size,
      'sheets':len(book.sheetnames),'visible':VISIBLE,'historical_sheets_unchanged':88,'historical_zip_parts_unchanged':parts,
      'source_comments_unchanged':comments,'historical_cached_formulas_unchanged':historical_formulas,'new_cached_formulas_checked':formulas,
      'runtime_formula_samples':samples,'campaign_days':len(facts['days']),'campaign_chapters':len(facts['chapters']),
      'campaign_goals':sum(len(ch['steps']) for ch in facts['chapters']),'story_count':len(facts['stories']),'story_variants_each':facts['storyVariants'],
      'puzzle_mechanics':len(facts['puzzles']),'puzzle_variant_structure_checks':len(facts['puzzleVariants']),
      'hour_counter_survives_reload':True,'new_round_reward_cap':facts['hourRules']['maximumRoundReward'],'theatre_free_position_and_save_proof':facts['theatreProof'],
      'manual_scenarios':len(cases),'manual_results':'NOT RUN','full_50_day_simulation':False,'measured_150_hours_play':False,
      'cache_method':'Historical OOXML byte-for-byte; new formulas independently evaluated; noLibreOffice recalculation claimed','validation':'PASS'}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2));return report


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--validate-only',action='store_true');args=parser.parse_args()
    facts,cases=game_facts(),manual_cases()
    if not args.validate_only:build(facts,cases)
    validate(facts,cases)


if __name__=='__main__':main()
