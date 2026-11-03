#!/usr/bin/env python3
"""Append current v29 rules to immutable Excel 11, preserving historical OOXML.

Historical worksheets, comments, styles and formula caches are copied byte for
byte. New values come from the actual game exports; new formula caches are
evaluated independently. No LibreOffice, live player, cloud billing or deployed
v29 verification is claimed by generating this workbook.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
from zipfile import ZipFile, ZIP_DEFLATED

from lxml import etree as E
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter

import build_workbook_v11 as old

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs/arkusze/HARBORLIGHT11-zasady.xlsx'
OUTPUT = ROOT / 'docs/arkusze/HARBORLIGHT12-zasady.xlsx'
REPORT = ROOT / 'docs/arkusze/HARBORLIGHT12-walidacja.json'
CASES = ROOT / 'docs/testing/manual-test-cases.json'
SOURCE_SHA256 = '6526a742ec73fa6bbc1faff87dc8a086b9c4f9f3d6e54ff6a3f8238555c6e6ce'
VISIBLE = ['Przeczytaj v12', 'Gospodarka v12', 'Budynki v12', 'Nauka v12', 'Testy v12',
           'Teatr v12', 'Przygody v12', 'Zasady v12', 'Kalkulator v12']
HIDDEN = ['Kontrole v12', 'Źródła v12']
PREPROD = {'version': '0.12.0.0', 'source': 'd9e2940b9a00755d979c159ec0fb62e290dd7ff1',
           'ci': '41480146644', 'deployment': '41482455135', 'attempt': 1,
           'url': 'https://harborlight-dev.web.app', 'verified': '2026-11-02'}
M, R, P, C = old.M, old.R, old.P, old.C
Formula, Sheet = old.Formula, old.Sheet
# The shared writer uses the first and fifth visible names for freeze panes and
# editable result cells. All other historical generator behavior stays intact.
old.VISIBLE = VISIBLE


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def game_facts():
    source = r"""
      import * as S from './harborlight-v1-state.js';
      import * as E from './harborlight-v1-economy.js';
      import * as L from './harborlight-v1-logistics.js';
      import * as P from './harborlight-v1-progression.js';
      import * as Copy from './harborlight-v1-approved-copy.js';
      import * as T from './harborlight-v1-theatre.js';
      import * as A from './harborlight-v1-adventures.js';
      import * as W from './harborlight-v1-welcome.js';
      import * as R from './harborlight-v1-residents.js';
      import * as C from './harborlight-v1-commerce.js';
      import * as Arch from './harborlight-v1-archipelago.js';
      import * as Mission from './harborlight-v1-missions.js';
      import * as Games from './harborlight-v1-minigames.js';
      import { LEAGUE_RULES } from './backend/league-rules.mjs';
      import { CHARITY_RULES } from './backend/charity-service.mjs';
      import { GAME_VERSION } from './harborlight-version.js';
      const at=Date.parse('2026-11-03T12:00:00Z'), state=S.createState(at);
      const start={population:state.population,happiness:state.happiness,resources:{...state.resources}};
      const levels=Array.from({length:100},(_,i)=>i+1).map(level=>{
        state.buildings.townhall.level=level;state.buildings.warehouse.level=level;state.buildings.farm.level=level;
        return {level,seconds:E.longestConstructionSeconds(level),production:L.productionRate(state,'farm'),
          warehouse:L.warehouseLimits(state),warehousePlan:E.warehouseCapacityPlan(level),reserve:L.foodReserve(state),
          carrierCapacity:L.haulCapacity(state),carrierLimit:S.workerLimit(state,'warehouse')};
      });
      const buildingNames={townhall:'Ratusz',house:'Dom',farm:'Gospodarstwo',lumber:'Drwale',windmill:'Młyn',quarry:'Kamieniołom',sawmill:'Tartak',warehouse:'Magazyn',dock:'Port',market:'Targ',chapel:'Kaplica',lighthouse:'Latarnia',theatre:'Teatr'};
      const buildings=Object.entries(S.BUILDINGS).map(([id,definition])=>{
        const sample=S.createState(at);sample.buildings.townhall.level=2;
        return {id,namePl:buildingNames[id]||id,name:definition.name,maxLevel:definition.maxLevel,
          output:definition.resource||'',cost:id==='theatre'?null:S.buildingCost(sample,id,{queued:false,starterDiscount:false}),
          weight:E.BUILDING_TIME_WEIGHTS[id]||0,workerLimit:S.WORKPLACE_IDS.includes(id)?S.workerLimit(sample,id):0};
      });
      const levelsTheatre=T.THEATRE_DECORATIONS.flatMap(kind=>Array.from({length:20},(_,index)=>{
        const own={worldTimeMs:at,resources:{coins:1e9}};T.normalizeTheatre(own);
        const result=T.theatreAction(own,{type:'theatreBuy',decoration:kind.id});own.theatre.collection[0].level=Math.max(1,index);
        const quote=index===0?T.theatreQuote(own,{type:'theatreBuy',decoration:kind.id}):T.theatreQuote(own,{id:result.item.id});
        return {type:kind.id,namePl:kind.namePl,level:index+1,coins:quote.coins,requiresAd:quote.requiresAd};
      }));
      console.log(JSON.stringify({version:GAME_VERSION,start,levels,buildings,economy:E.ECONOMY_RULES,weights:E.BUILDING_TIME_WEIGHTS,
        tourVersion:Copy.APPROVED_TOUR_VERSION,tour:Copy.APPROVED_TOUR_IDS.map(id=>({id,...Copy.getTourCopy(id,'pl',{cloudAccount:true})})),
        curriculum:P.TUTORIAL_VERSION,lessons:P.TUTORIAL_LESSONS.map(row=>({...row,...Copy.lessonCopy(row.id,'pl',{curriculum:P.TUTORIAL_VERSION})})),
        welcomeDays:W.WELCOME_WORKER_DAYS,welcomeCopy:W.welcomeWorkerCopy('pl'),theatre:T.THEATRE_RULES,theatreStyles:T.THEATRE_STYLES,theatreLevels:levelsTheatre,
        adventures:A.ADVENTURE_CATALOG,adventureRules:A.ADVENTURE_RULES,prayer:R.PRAYER_RULES,workerWalk:R.WALK_SECONDS,
        houseRules:S.HOUSE_HAPPINESS_RULES,commerce:C.COMMERCE_RULES,packages:C.COIN_PACKAGES,
        archipelago:Arch.ARCHIPELAGO_RULES,missions:Mission.MISSION_RULES,miniGames:Games.MINI_GAME_RULES,
        league:LEAGUE_RULES,charity:CHARITY_RULES,
        loyalty:{minimum:P.LOYALTY_REWARD_MIN,maximum:P.LOYALTY_REWARD_MAX,active:P.ACTIVE_PLAY_SECONDS,abandoned:P.ABANDONED_PLAY_SECONDS}}));
    """
    process = subprocess.run(['node', '--input-type=module', '-e', source], cwd=ROOT, text=True,
                             capture_output=True, check=True, timeout=40)
    facts = json.loads(process.stdout)
    assert facts['version'] == '0.13.0.0'
    assert len(facts['tour']) == 34 and len(facts['lessons']) == 25
    assert len(facts['adventures']) == 9 and len(facts['theatreLevels']) == 200
    assert facts['levels'][0]['seconds'] == 45 and all(item['seconds'] == 86400 for item in facts['levels'][23:])
    assert all(item['warehouse']['total'] == 5 * item['warehouse']['perResource'] for item in facts['levels'])
    assert facts['workerWalk'] == 120 and facts['welcomeDays'] == 7
    return facts


def manual_cases():
    cases = json.loads(CASES.read_text())['cases']
    assert len({case['id'] for case in cases}) == len(cases)
    assert all(case['manual_result'] == 'NOT RUN' for case in cases), 'Do not turn real test results back into NOT RUN'
    return cases


def summary(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def duration(seconds):
    seconds = math.ceil(seconds)
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)
    return ' '.join(part for part in [f'{hours} godz.' if hours else '', f'{minutes} min' if minutes else '', f'{seconds} s' if seconds or not hours and not minutes else ''] if part)


def sheet(name, title, note, columns, widths, hidden=False):
    return Sheet(name, title, note, columns, widths, hidden=hidden)


def prepare(facts, cases):
    intro = sheet(VISIBLE[0], 'HARBORLIGHT12 — zasady DEV 0.13.0.0 / v29',
      'Aktualne tabele odczytano z eksportów kodu. Odebrany PRE-PROD 0.12.0.0 jest osobnym stanem; tego arkusza nie traktuj jako dowodu deployu v29. 66 wcześniejszych zakładek jest ukrytym, niezmienionym archiwum.',
      ['Obszar', 'Bieżąca informacja', 'Źródło / stan'], [31, 130, 78])
    for row in [
      ['DEV', f"Kod {facts['version']}; GO z 3 listopada. Własne testy, Git/CI/Pages są rozliczane w rejestrze środowisk, nie przez datę wygenerowania Excela.", 'docs/ENVIRONMENT-STATUS.md; docs/FRONTEND-V29-REQUIREMENTS.md'],
      ['PRE-PROD', f"Odebrane {PREPROD['version']}, źródło {PREPROD['source']}; CI {PREPROD['ci']}, deploy {PREPROD['deployment']} / próba 1 SUCCESS 2 listopada. Bez nowej promocji v29.", PREPROD['url']],
      ['PROD', 'Brak nowego zlecenia promocji. Realne płatności, reklamy, przelewy dobroczynne i integracja gry fizycznej nie zostały uruchomione przez ten generator.', 'AGENTS.md; docs/RELEASE-PROCESS.md'],
      ['Które zakładki czytać?', 'Dziewięć widocznych zakładek v12 ma pierwszeństwo dla obecnego DEV. Archiwalne 66 kart pokazuje wcześniejsze reguły i ich formuły; można je odkryć w Excelu.', 'Źródłowe OOXML z Excela 11 pozostaje identyczne.'],
      ['Najkrótsza droga do odbioru', 'Otwórz Testy v12 albo docs/testing/START-HERE.md. Każdy przypadek ma osobną kartę w Git i zaczyna ze statusem NOT RUN; automatyczny PASS nie jest ręcznym przeklikaniem.', 'https://github.com/ksobczak321-oss/gra/blob/main/docs/testing/START-HERE.md'],
      ['Budowa i transport', 'Najdłuższy wspólny budżet 45 s na Ratuszu 1, następnie krzywa do 24 h na Ratuszu 24. Dalej czas nie rośnie. Inne budynki mają stałe proporcje.', 'Gospodarka v12 / Budynki v12'],
      ['Warunki pomiaru czasu', 'Budżet dotyczy gotowych materiałów i trzech gotowych tragarzy. Zbieranie zapasów, dojście 120 s, kolejka i niedostępni pracownicy mogą wydłużyć oczekiwanie. Zapisane wcześniejsze projekty zachowują swój plan.', 'harborlight-v1-economy.js; logistics.js'],
      ['Dwie drogi w samouczku', '25 lekcji uczy zarówno rzeczywistego skracania czasu za monety, jak i czekania na zwykłe zakończenie budowy. Nie ma ukrytych darmowych przyspieszeń.', 'Nauka v12; curriculum 7'],
      ['Co robić podczas oczekiwania?', 'Trwa aktualna misja, a obok można układać własny ogród Teatru, przejść krótką przygodę albo złapać spadające towary. Zegary wyspy działają dalej.', 'Teatr v12; Przygody v12'],
      ['Pierwszy tydzień', f"{facts['welcomeCopy']['title']} {facts['welcomeCopy']['text']}", 'welcome.js; 7 dat kalendarza Warszawy, bez nadrabiania nieobecnych dni'],
      ['Historia kont', 'Zwykłe wdrożenie nie resetuje kont, haseł, mieszkańców, nagród ani rozpoczętych budów. Arkusz nie odczytuje prywatnych kont ani naliczeń GCP.', 'AGENTS.md; stan środowisk']
    ]: intro.add(row, 90)

    economy = sheet(VISIBLE[1], 'GOSPODARKA V12 — od poziomu 1 do 100',
      'Poziom oznacza aktualny ukończony Ratusz dla budżetu najdłuższej budowy; dla pojemności oznacza poziom Magazynu, a dla wydobycia poziom producenta. Budżet obejmuje transport 40% i budowę 60%; dojście i zbieranie zasobów są osobno.',
      ['Poziom', 'Czas czytelny', 'Transport + budowa [s]', 'Transport [s]', 'Budowa [s]', 'Razem [godz.]', 'Pojemność / zasób', 'Pojemność razem', 'Rezerwa żywności', 'Ładunek / tragarz', 'Limit tragarzy', 'Produkcja / pracownik / godz.', 'Plan pojemności'],
      [13, 28, 28, 22, 22, 22, 25, 25, 23, 23, 20, 32, 100])
    for item in facts['levels']:
        row = max([5, *economy.rows]) + 1
        economy.add([item['level'], duration(item['seconds']), item['seconds'], Formula(f'=C{row}*0.4'), Formula(f'=C{row}*0.6'),
          Formula(f'=C{row}/3600'), item['warehouse']['perResource'], item['warehouse']['total'], item['reserve'], item['carrierCapacity'], item['carrierLimit'], item['production'],
          f"Największa rozbudowa {item['warehousePlan']['largestUpgrade']} + misja {item['warehousePlan']['mission']} + żywność {item['warehousePlan']['foodReserve']}; bufor ×{item['warehousePlan']['buffer']}. Stały limit na poziom, nie na wybrane zadanie."], 53)

    buildings = sheet(VISIBLE[2], 'BUDYNKI V12 — rola i proporcje czasu',
      'Cena przykładu pochodzi z buildingCost przy Ratuszu 2, bez kolejki i rabatu startowego. Koszty własnego poziomu rosną według kodu. Teatr jest stałym miejscem poziomu 1 i nie ma zwykłej rozbudowy.',
      ['Budynek', 'ID', 'Maks. poziom', 'Udział czasu względem najdłuższego', 'Budżet na Ratuszu 1 [s]', 'Koszt przykładowej następnej rozbudowy', 'Limit pracowników przykładu', 'Rola / reguła'],
      [27, 19, 18, 30, 28, 95, 28, 105])
    roles = {'townhall': 'Wyznacza poziom wyspy, limit innych budynków i 24 mieszkańców na poziom.',
      'house': '24 łóżka na poziom; brak łóżka: praca ×0,5, jedzenie ×2, bez punktów Domu.',
      'farm': 'Produkuje zboże. Młyn zużywa 2 zboża na 1 żywność.', 'windmill': 'Żywność dla mieszkańców; wymaga zboża z magazynu centralnego.',
      'lumber': 'Produkuje drewno. Tartak zużywa 2 drewna na 1 deskę.', 'sawmill': 'Deski z drewna; zapasy odbierają tragarze.',
      'quarry': 'Kamień do rozbudowy i ścieżek.', 'warehouse': 'Tragarze obsługują budowy i odbiór zapasów. Pojemność jest stała na poziom; nagrody są poza limitem zwykłych dostaw.',
      'dock': 'NPC od Ratusza 4, handel graczy od 6; towary i pasażerowie płyną osobno.', 'market': 'Wymiana materiałów w tej samej kategorii; prowizja 10%.',
      'chapel': 'Błogosławieństwa i modlitwa. Premia rozbudowy: szczęście oraz podatki ×2 przez 10 godzin.',
      'lighthouse': 'Główny motyw rozwoju, rozdziały 8/5/3. Ukończenie rozbudowy: szczęście 100 i produkcja ×2 przez 24 h × nowy poziom.',
      'theatre': '20 miejsc, 10 rodzajów dekoracji, indywidualne poziomy 1–20. Bez rozbudowy samego budynku.'}
    for item in facts['buildings']:
        buildings.add([item['namePl'], item['id'], item['maxLevel'], item['weight'], item['weight'] * 45,
          summary(item['cost']) if item['cost'] is not None else 'Nie dotyczy — budynek stały', item['workerLimit'], roles.get(item['id'], '')], 82)

    learning = sheet(VISIBLE[3], 'NAUKA V12 — tutorial i praktyczny samouczek',
      'Tutorial: 34 opisy ekranu i zasad; samouczek: 25 rzeczywistych lekcji. Można wznowić od przerwanego miejsca lub od początku bez powtórnej nagrody. Zakończenie wznowionego tutoriala wraca do nieukończonego samouczka.',
      ['Rodzaj', 'Numer', 'Stabilny ID', 'Tytuł', 'Treść / wymagania', 'Program / źródło'], [22, 12, 33, 57, 155, 52])
    for index, item in enumerate(facts['tour'], 1): learning.add(['Tutorial', index, item['id'], item['title'], item['text'], f"routeVersion {facts['tourVersion']} · approved-copy.js"], 92)
    for index, item in enumerate(facts['lessons'], 1): learning.add(['Samouczek', index, item['id'], item.get('title', ''), item.get('description', ''), f"curriculum {facts['curriculum']} · {item.get('kind','')} · {item.get('route','')}"], 87)

    tests = sheet(VISIBLE[4], 'TESTY V12 — po jednym przypadku do przeklikania',
      'NOT RUN oznacza brak ręcznego odbioru. Otwórz podlinkowaną kartę: zawiera warunki, czynności i oczekiwany wynik. Wpisz własny wynik po wykonaniu; automatyczne testy nie zmieniają tych statusów. Bez resetowania stałych kont.',
      ['ID', 'Obszar', 'Scenariusz', 'Priorytet', 'Stan definicji', 'Karta w Git', 'Powiązane zmiany', 'Warunki / kroki i wynik', 'Tryb', 'Wersja zakresu', 'Dowód testera', 'Wynik ręczny'],
      [20, 33, 75, 15, 22, 125, 70, 165, 25, 27, 65, 24])
    for case in cases:
        path = ROOT / 'docs/testing' / case['file']
        text = path.read_text() if path.is_file() else 'Brak pliku definicji — traktuj jako BLOCKED.'
        detail = text.split('## Dane i warunki', 1)[-1].split('## Raport wykonania', 1)[0].strip()
        if len(detail) > 22000: detail = detail[:22000] + '\nPełny opis w karcie Git.'
        tests.add([case['id'], case['area'], case['title'], case['priority'], case['definition_status'],
          f"https://github.com/ksobczak321-oss/gra/blob/main/docs/testing/{case['file']}", ', '.join(case.get('changes', [])),
          detail, 'Ręczne', 'Patrz karta Git', '', case['manual_result']], 180)
    tests.validations.append({'type': 'list', 'sqref': f'L6:L{max(tests.rows)}', 'formula1': '"NOT RUN,PASS,FAIL,BLOCKED"'})

    theatre = sheet(VISIBLE[5], 'TEATR V12 — kolekcja, ceny i widoczne poziomy',
      '20 miejsc na wyspie, 10 rodzajów dekoracji i 5 dowolnie mieszanych stylów. Każdy egzemplarz ma własny poziom. Zakup i ulepszenie kosztują monety; poziomy 5/10/15/20 także ukończoną reklamę. Uprawnienie bez reklam pomija film, ale nie cenę.',
      ['Dekoracja', 'ID', 'Poziom po zakupie / ulepszeniu', 'Monety', 'Ukończona reklama', 'Reguły'], [30, 22, 35, 20, 30, 145])
    for item in facts['theatreLevels']:
        theatre.add([item['namePl'], item['type'], item['level'], item['coins'], 'TAK; wyjątek: aktywne uprawnienie bez reklam' if item['requiresAd'] else 'Nie',
          'Przestawianie, zamiana, odłożenie do kolekcji i zmiana stylu są bezpłatne. Poziom pozostaje zachowany. Anulowana lub niepotwierdzona reklama nie pobiera monet i nie daje ulepszenia. Wszystkie 10 rodzajów daje kosmetyczny proporzec.'], 55)

    adventures = sheet(VISIBLE[6], 'PRZYGODY V12 — cel podczas oczekiwania',
      'Równolegle: główna misja, kilkuminutowa przygoda i krótkie zdarzenie. Jedna aktywna przygoda naraz; wybór należy do gracza. Świat nie jest zatrzymywany. To jawne parametry balansu DEV, bez uruchomienia dostawców reklam.',
      ['Przygoda', 'ID', 'Orientacyjny czas [s]', 'Co robi gracz', 'Nagroda / rezultat', 'Dodatkowe zasady'], [36, 25, 27, 115, 80, 115])
    for item in facts['adventures']:
        kind = item['kind']
        reward = facts['adventureRules']['rewards'].get(kind)
        detail = {'cargoRain': 'Spada 30 monet/materialów na całym ekranie; złapane dobra trafiają do gracza, niezłapane nie są przyznawane. Odnowienie 30 min.',
          'treasureMap': 'Zweryfikowane trafienia trójek dają 4 fragmenty; następnie układanka 2×2 i poszukiwanie skarbu na wyspie.',
          'pirateCannon': 'Wygrana runda z kulką daje 1 kulę; maksimum 12. Prawdziwe celowanie i trafienia w poruszające się statki.',
          'bridge': 'Początkowe 13 belek wystarcza. Dodatkowa belka kosztuje 5 monet lub ukończoną reklamę; najwyżej 3 dodatkowe.',
          'signals': 'Zapamiętaj sekwencję i odtwórz sygnał prowadzący statek.', 'letters': 'Przeczytaj wskazówki i znajdź trzech odbiorców na mapie.',
          'rhythm': 'Odszukaj instrumenty, odsłuchaj i wystukaj rytm.', 'garden': 'Obróć kanały i doprowadź wodę do trzech sadzawek.',
          'cargoBalance': 'Rozłóż skrzynie zgodnie z obciążeniem i wybierz bezpieczną trasę.'}.get(kind, '')
        adventures.add([item['title']['pl'], kind, item['durationSeconds'], item['description']['pl'], summary(reward) if reward else 'Dokładnie tyle, ile złapiesz — według widocznego licznika.', detail], 110)

    rules = sheet(VISIBLE[7], 'ZASADY V12 — zachowane decyzje i nagrody',
      'Reguły z poprzednich wydań obowiązują razem z nową paczką v29. Wartości konfiguracji odczytano z eksportów. Kod lub mock nie oznacza aktywowania prawdziwego operatora ani przelewu.',
      ['Mechanika', 'Reguła', 'Parametry z kodu / źródło'], [34, 150, 105])
    for row in [
      ['Szczęście i praca', 'Praca daje +1 punkt na godzinę, jedzenie kolejne +1. Bilans zmienia się płynnie. O północy mieszkaniec traci 1 punkt; istniejące wymuszone ochrony zachowują działanie. Pokazujemy punkty szczęścia, bez p.p. i procentów.', 'residents.js; state.js'],
      ['Pełny lokalny magazyn', 'Produkcja staje. Przypisani pracownicy są nieszczęśliwi; podstawowa kara to 10 punktów na osobę. Opróżnij lokalny zapas przez tragarzy/natychmiastowy transport albo wycofaj ludzi do Domu.', 'logistics.js; effects.js; zatwierdzona narracja'],
      ['Dom i łóżka', 'Każdy poziom Domu daje 24 łóżka. Bez łóżka wydajność ×0,5, jedzenie ×2 i brak przydziału punktów Domu. Stara kara wszystkim −1/h za bezdomnego została zastąpiona.', 'housing.js'],
      ['Bank szczęścia', 'Wyłącznie zbiorowe przekazanie punktów. Codzienna porcja według populacji na końcu doby; bank mieści do 7 porcji, bez ósmego dnia ponad limit.', summary(facts['houseRules'])],
      ['Wizyta / modlitwa', 'Modlitwa indywidualnie z Domu: czas 10 min × poziom Ratusza obejmuje dojście i powrót. Koszt 10 monet × poziom Ratusza na osobę. Po powrocie +50 szczęścia przez 6 godzin.', summary(facts['prayer'])],
      ['Pracownicy', 'Dojście i powrót trwają po 2 minuty. Tragarz z ładunkiem kończy bieżącą dostawę, potem wraca. Gotowość tragarzy i pracowników handlu jest pracą.', f"WALK_SECONDS={facts['workerWalk']}"],
      ['Powitanie', 'Pierwsze 7 dat od rozpoczęcia gry: +1 mieszkaniec przy pierwszym logowaniu danego dnia, maks. 7, bez nadrabiania pominiętych dni. Przyjęcie tylko do limitu Ratusza. Osobno minimum szczęścia 20 przez 72 h.', 'welcome.js; state.js; claim account shared'],
      ['Codzienne logowanie', 'Nagroda lojalności jest dostępna w wiadomościach i wyskakującym oknie przy pierwszym logowaniu nowego dnia. Nie mylić z powitalnym mieszkańcem.', summary(facts['loyalty'])],
      ['Aktualne Misje', 'Misja główna ma 8 kolejnych etapów. Widać tylko aktualny aktywny etap; zaliczenie odblokowuje następny. Trudność otwiera pomocnicze 5 etapów, a ich niepowodzenie 3 ratunkowe. Po ratunkowych wracasz do pomocniczych.', summary(facts['missions'])],
      ['Wykonalność misji', 'Wymagania uwzględniają prawdziwy zapas, produkcję, transport, pojemność i czas. Nagrody dopasowane do końcowych wymagań. Termin zwykłej misji ma co najmniej 30 min.', 'missions.js; activities.js'],
      ['Różne nagrody', 'Materiały, monety, rozbitkowie lub czasowa produkcja ×2 pasują do fabuły. Rozbitków przyjmujemy tylko do wolnego limitu Ratusza; reszta nie czeka. Dodatkowa premia producenta ×2 z Latarnią ×2 daje ×4.', 'missions.js; zatwierdzone reguły'],
      ['Kolonie i transport', 'Kolejne wyspy od Ratusza 10, 13, 16 i dalej co 3; do 20 łącznie. Nazwa córki ma prefiks matki. Założenie teleportuje 6 ludzi z Domu; na matce pozostaje co najmniej 12. Statek płynie towarowo albo pasażersko.', summary(facts['archipelago'])],
      ['Ceny usług / doładowania', 'Wszystkie usługi za te same monety od Ratusza 1. Realne pieniądze mogą tylko dokupić monety od Ratusza 3. Przelicznik 10 monet = 1 zł. Materiały nadal służą zwykłej gospodarce.', summary(facts['commerce'])],
      ['Pakiety monet', 'Kwoty brutto wyrażone w groszach; to parametry sklepu. DEV/PRE-PROD pozostają symulacją bez pobrania pieniędzy.', summary(facts['packages'])],
      ['Pomagam', 'Od 100 monet co 100: 100 monet = 10 gr, 1000 = 1 zł. Raz na 30 dni; konto >14 dni, 5 dni aktywności, Ratusz ≥4. Pula ≤50 zł i później ≤5% faktycznej marży. Kupione/handlowe/nieznane monety są wykluczone. PRE-PROD ma jawny mock przelewu, fanfary i +20 szczęścia przez 6 godzin.', summary(facts['charity'])],
      ['Sojusze i czat', 'Do 5 osób. Czat sojuszu i osobne rozmowy prywatne; limit 1000 znaków, 20 wiadomości/20 s, zwykła historia 30 dni. Trzy testowe konta używają wspólnego API; lokalna demonstracja jest osobno oznaczona.', summary(facts['league'])],
      ['Liga', '15–21 każdego miesiąca, wspólne okno 19–21 dla dwóch zadań dziennie. Średnia wyników i premia współpracy. Wszystkie 7 dni punktuje. TOP4 gra playoff, bez spadków i kar; nagrody za udział, komplet, TOP4 i puchar mistrza. Remis wymaga dogrywki.', 'league-rules.mjs; community-service.mjs'],
      ['Minigry i reklamy', 'Ekspedycje mają rzeczywiste rundy i nagrody. Dokupienie czasu jest opcjonalne; reklama wymaga potwierdzenia. Żadne klientowe verified:true nie daje nagrody produkcyjnej.', summary(facts['miniGames'])]
    ]: rules.add(row, 106)

    calculator = sheet(VISIBLE[8], 'KALKULATOR V12 — jawne wejścia, zapisane wyniki',
      'Niebieskie pola są edytowalne. Budżet czasu zakłada gotowe materiały i 3 tragarzy; nie jest prognozą terminu przy niedoborach. Wyliczenia początkowe porównano z modułami Node. Po zmianie wejść Excel przelicza formuły automatycznie.',
      ['Obszar', 'Parametr', 'Wartość', 'Jednostka', 'Wyjaśnienie'], [28, 62, 30, 28, 115])
    for row, name, value, unit, note in [
      (6, 'Aktualny ukończony Ratusz', 1, 'poziom', '1–100; od 24 czas jest stały.'),
      (7, 'Magazyn', 1, 'poziom', 'Pojemność, ładunek i rezerwa mają istniejący pułap L24.'),
      (8, 'Producent', 1, 'poziom', 'Stawka bazowa 40 + 4 × (poziom − 1).'),
      (9, 'Pracownicy na miejscu', 3, 'osoby', 'Bez kar, pełny zapas wejścia i łóżka; nie zastępuje pełnego symulatora.'),
      (10, 'Mnożnik aktywności', 1, '×', '1 zwykle, 2 podczas aktywnej gry; inne premie są osobno.'),
      (11, 'Waga czasu budynku', 1, '×', 'Ratusz/Latarnia 1; szczegóły w Budynki v12.')
    ]: calculator.calc(row, 'WEJŚCIE', name, value, unit, note, editable=True)
    curve = '=IF(C6>=24,86400,IF(C6=23,86100,45*3^(MIN(C6,5)-1)*2^MAX(0,MIN(C6,8)-5)*1.2^MAX(0,MIN(C6,11)-8)*1.1^MAX(0,MIN(C6,14)-11)*1.05^MAX(0,MIN(C6,17)-14)*1.02^MAX(0,MIN(C6,22)-17)))'
    outputs = [
      (13, 'Najdłuższy budżet poziomu', curve, 's', 'Dokładna krzywa zatwierdzona przez właściciela.'),
      (14, 'Budżet wybranego budynku', '=C13*C11', 's', 'Transport + fizyczna budowa.'),
      (15, 'Transport budowlany', '=C14*0.4', 's', 'Zakłada gotowe 3 osoby.'),
      (16, 'Sama budowa', '=C14*0.6', 's', 'Zwykły czas albo opcjonalne przyspieszenie za monety.'),
      (18, 'Pojemność na zasób', '=MIN(10000000,MAX(ROUND((550*(MIN(C7,24)+1)+500*(MIN(C7,24)+1)+50*MIN(C7,24))*1.25+0.499999999,0),ROUNDDOWN(1000*1.5^(MIN(C7,24)-1),0)))', 'szt.', 'Stały plan + zachowanie wcześniejszej większej pojemności; zaokrąglenie planu w górę.'),
      (19, 'Łączna pojemność', '=C18*5', 'szt.', 'Pięć limitów zasobów może być wykorzystanych równocześnie.'),
      (20, 'Rezerwa żywności', '=50*MIN(C7,24)', 'szt.', 'Osobno chroniona dla posiłków.'),
      (22, 'Produkcja bazowa / osoba', '=40+4*(C8-1)', 'szt./godz.', 'Poziom producenta, nie Ratusza.'),
      (23, 'Produkcja obsady', '=C22*C9*C10', 'szt./godz.', 'Bez kary braku łóżka/przestoju; Młyn/Tartak wymagają receptury 2:1.'),
      (25, 'Modlitwa / osoba', f"=C6*{facts['prayer']['coinsPerTownHallLevel']}", 'monety', 'Cena usługi od Ratusza 1; dostępność wymaga Kaplicy.'),
      (26, 'Modlitwa z dojściem/powrotem', f"=C6*{facts['prayer']['secondsPerTownHallLevel']}/60", 'min', 'Po powrocie +50 szczęścia przez 6 godzin.')
    ]
    for row, name, formula, unit, note in outputs: calculator.calc(row, 'WYNIK', name, Formula(formula), unit, note)
    for row in [6, 7, 8]: calculator.validations.append({'type': 'whole', 'sqref': f'C{row}', 'operator': 'between', 'formula1': '1', 'formula2': '100'})
    calculator.validations.append({'type': 'whole', 'sqref': 'C9', 'operator': 'between', 'formula1': '1', 'formula2': '10000'})
    calculator.validations.append({'type': 'decimal', 'sqref': 'C10:C11', 'operator': 'between', 'formula1': '0.01', 'formula2': '2'})
    sheets = [intro, economy, buildings, learning, tests, theatre, adventures, rules, calculator]
    checks = sheet(HIDDEN[0], 'KONTROLE V12 — reguły, formuły i rzeczywiste eksporty',
      'TRUE potwierdza zgodność arkusza z kodem, nie wykonanie ręcznych przypadków ani faktyczne wdrożenie GCP.',
      ['Kontrola', 'Odczyt / formuła', 'Oczekiwane', 'Zgodność', 'Źródło'], [70, 38, 38, 22, 100], hidden=True)
    for title, actual, expected in [('Tutorial', len(facts['tour']), 34), ('Samouczek', len(facts['lessons']), 25),
      ('Przygody', len(facts['adventures']), 9), ('Pozycje dekoracji i poziomów', len(facts['theatreLevels']), 200),
      ('Okno powitalne', facts['welcomeDays'], 7), ('Dojście pracownika', facts['workerWalk'], 120),
      ('Pierwszy budżet', facts['levels'][0]['seconds'], 45), ('Budżet poziomu 24', facts['levels'][23]['seconds'], 86400),
      ('Budżet poziomu 100', facts['levels'][99]['seconds'], 86400), ('Scenariusze ręczne', len(cases), len(cases))]:
        checks.add([title, actual, expected, actual == expected, 'Eksport modułów gry / manual-test-cases.json'], 42)
    for row, expected in {13: 45, 14: 45, 15: 18, 16: 27, 18: facts['levels'][0]['warehouse']['perResource'],
      19: facts['levels'][0]['warehouse']['total'], 20: 50, 22: facts['levels'][0]['production'], 23: facts['levels'][0]['production'] * 3,
      25: facts['prayer']['coinsPerTownHallLevel'], 26: facts['prayer']['secondsPerTownHallLevel'] / 60}.items():
        index = max([5, *checks.rows]) + 1
        checks.add([f'Kalkulator C{row}', Formula(f"='Kalkulator v12'!C{row}"), expected,
          Formula(f'=ABS(B{index}-C{index})<0.000001'), 'Niezależny odczyt kodu Node'], 42)
    sources = sheet(HIDDEN[1], 'ŹRÓDŁA V12 — snapshot eksportów',
      'Odczyt kodu lokalnego, nie kont graczy. Historia i dowody wydania pozostają w Git oraz docs/ENVIRONMENT-STATUS.md.',
      ['Klucz', 'Wartość / JSON', 'Źródło'], [42, 170, 80], hidden=True)
    sources.add(['PRE-PROD odebrane', summary(PREPROD), 'Odrębne od bieżącego DEV v29'], 85)
    sources.add(['Excel 11 SHA-256', SOURCE_SHA256, 'Niezmieniony bazowy plik'], 42)
    for key, value in facts.items():
        # Individual rows keep even the source snapshot below Excel's 32767-char
        # cell limit. The full lesson/tour text also has its own visible sheet.
        if isinstance(value, list):
            for index, entry in enumerate(value, 1): sources.add([f'{key}/{index}', summary(entry), 'Rzeczywiste eksporty Node'], 65)
        else: sources.add([key, summary(value), 'Rzeczywiste eksporty Node'], 80)
    sheets += [checks, sources]
    for item in sheets:
        for row, values in item.rows.items():
            for col, value in enumerate(values, 1):
                if isinstance(value, Formula): value.cached = old.evaluate(value.text, sheets, item.name, ((item.name, f'{get_column_letter(col)}{row}'),))
    return sheets


def build(facts, cases):
    assert digest(BASE) == SOURCE_SHA256, 'Historical Excel 11 bytes changed'
    sheets = prepare(facts, cases)
    with ZipFile(BASE) as source: entries = {name: source.read(name) for name in source.namelist()}
    workbook = E.fromstring(entries['xl/workbook.xml'])
    nodes = workbook.find(f'{{{M}}}sheets')
    historical_count = len(nodes)
    assert historical_count == 66
    for node in nodes: node.set('state', 'hidden')
    for view in workbook.findall(f'{{{M}}}bookViews/{{{M}}}workbookView'):
        view.set('activeTab', str(historical_count)); view.set('firstSheet', str(historical_count))
    calc = workbook.find(f'{{{M}}}calcPr')
    if calc is None: calc = E.SubElement(workbook, f'{{{M}}}calcPr')
    calc.set('calcMode', 'auto'); calc.set('fullCalcOnLoad', '1'); calc.set('forceFullCalc', '1')
    rels = E.fromstring(entries['xl/_rels/workbook.xml.rels'])
    types = E.fromstring(entries['[Content_Types].xml'])
    next_rid = max(int(node.get('Id')[3:]) for node in rels if node.get('Id', '').startswith('rId')) + 1
    next_id = max(int(node.get('sheetId')) for node in nodes) + 1
    for index, item in enumerate(sheets):
        number, rid = historical_count + index + 1, f'rId{next_rid + index}'
        name = f'xl/worksheets/sheet{number}.xml'
        E.SubElement(nodes, f'{{{M}}}sheet', name=item.name, sheetId=str(next_id + index),
          state='hidden' if item.hidden else 'visible', **{f'{{{R}}}id': rid})
        E.SubElement(rels, f'{{{P}}}Relationship', Id=rid, Type=f'{R}/worksheet', Target=f'worksheets/sheet{number}.xml')
        E.SubElement(types, f'{{{C}}}Override', PartName='/' + name, ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml')
        entries[name] = old.sheet_xml(item, number)
    changed = {'xl/workbook.xml': workbook, 'xl/_rels/workbook.xml.rels': rels, '[Content_Types].xml': types}
    core = E.fromstring(entries['docProps/core.xml']); dc = 'http://purl.org/dc/elements/1.1/'
    for name, value in [('title', 'HARBORLIGHT12 — zasady DEV 0.13.0.0 i scenariusze'),
      ('subject', 'DEV v29; odebrany PRE-PROD 0.12 osobno; niezmienione archiwum Excel 11'),
      ('description', 'Dziewięć aktualnych zakładek. Zachowane 66 historycznych arkuszy, komentarze i cache formuł. Dane z rzeczywistych eksportów kodu.')]:
        node = core.find(f'{{{dc}}}{name}')
        if node is None: node = E.SubElement(core, f'{{{dc}}}{name}')
        node.text = value
    changed['docProps/core.xml'] = core
    for name, node in changed.items(): entries[name] = E.tostring(node, xml_declaration=True, encoding='UTF-8', standalone=True)
    with ZipFile(OUTPUT, 'w', compression=ZIP_DEFLATED, compresslevel=9) as target:
        for name, value in entries.items(): target.writestr(name, value)


def validate(facts, cases):
    assert digest(BASE) == SOURCE_SHA256
    sheets = prepare(facts, cases)
    mutable = {'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', '[Content_Types].xml', 'docProps/core.xml'}
    parts = 0
    with ZipFile(BASE) as source, ZipFile(OUTPUT) as target:
        assert target.testzip() is None
        for name in source.namelist():
            if name not in mutable:
                assert source.read(name) == target.read(name), f'Historical ZIP part changed: {name}'
                parts += 1
    previous, previous_values = load_workbook(BASE, data_only=False), load_workbook(BASE, data_only=True)
    book, cached = load_workbook(OUTPUT, data_only=False), load_workbook(OUTPUT, data_only=True)
    assert len(previous.sheetnames) == 66 and len(book.sheetnames) == 66 + len(sheets)
    assert [item.title for item in book if item.sheet_state == 'visible'] == VISIBLE
    assert book.active.title == VISIBLE[0]
    comments = historical_formulas = formulas = 0
    for item in previous:
        assert book[item.title].sheet_state == 'hidden'
        for row in item:
            for cell in row:
                restored = book[item.title][cell.coordinate]
                assert restored.value == cell.value, (item.title, cell.coordinate)
                assert cached[item.title][cell.coordinate].value == previous_values[item.title][cell.coordinate].value, (item.title, cell.coordinate, 'cache')
                if cell.data_type == 'f': historical_formulas += 1
                if cell.comment:
                    comments += 1
                    assert restored.comment and restored.comment.text == cell.comment.text and restored.comment.author == cell.comment.author
    for item in sheets:
        assert book[item.name]['A1'].value == item.title
        for row, values in item.rows.items():
            for col, value in enumerate(values, 1):
                cell, cache = book[item.name].cell(row, col), cached[item.name].cell(row, col)
                if isinstance(value, Formula):
                    formulas += 1
                    assert cell.value == value.text and cache.data_type != 'e' and cache.value is not None
                    if isinstance(value.cached, (int, float)) and not isinstance(value.cached, bool):
                        assert math.isclose(cache.value, value.cached, rel_tol=1e-12, abs_tol=1e-8), (item.name, row, col)
                    else: assert cache.value == value.cached
                elif isinstance(value, (int, float)) and not isinstance(value, bool): assert math.isclose(cell.value, value, rel_tol=1e-12, abs_tol=1e-8)
                elif value == '': assert cell.value in ['', None], (item.name, row, col, cell.value, value)
                else: assert cell.value == value, (item.name, row, col, cell.value, value)
    assert comments == 48
    assert all(row[3] is True for row in cached[HIDDEN[0]].iter_rows(min_row=6, values_only=True))
    assert book[VISIBLE[4]].max_row - 5 == len(cases)
    assert all(book[VISIBLE[4]].cell(row, 12).value == 'NOT RUN' for row in range(6, book[VISIBLE[4]].max_row + 1))
    calc = next(item for item in sheets if item.name == VISIBLE[8])
    samples = 0
    for entry in facts['levels']:
        for input_row, outputs in [(6, {13: entry['seconds']}), (7, {18: entry['warehouse']['perResource'], 19: entry['warehouse']['total'], 20: entry['reserve']}),
          (8, {22: entry['production']})]:
            saved = calc.rows[input_row][2]; calc.rows[input_row][2] = entry['level']
            for result_row, expected in outputs.items():
                actual = old.evaluate(calc.rows[result_row][2].text, sheets, calc.name)
                assert math.isclose(actual, expected, rel_tol=1e-12, abs_tol=1e-7), (entry['level'], input_row, result_row, actual, expected)
                samples += 1
            calc.rows[input_row][2] = saved
    report = {'version': 12, 'as_of': '2026-11-03', 'current_code': facts['version'], 'new_scope': 'DEV v29; own Git/CI/Pages and deployment evidence remain in ENVIRONMENT-STATUS.md',
      'published_preprod': PREPROD, 'source_file': BASE.name, 'source_sha256': SOURCE_SHA256,
      'output': OUTPUT.name, 'sha256': digest(OUTPUT), 'bytes': OUTPUT.stat().st_size, 'sheets': len(book.sheetnames),
      'visible': VISIBLE, 'historical_sheets_unchanged': 66, 'historical_zip_parts_unchanged': parts,
      'source_comments_unchanged': comments, 'historical_cached_formulas_unchanged': historical_formulas,
      'new_cached_formulas_checked': formulas, 'runtime_formula_samples': samples,
      'tour_steps': len(facts['tour']), 'practical_lessons': len(facts['lessons']), 'decoration_level_rows': len(facts['theatreLevels']),
      'adventure_types': len(facts['adventures']), 'manual_scenarios': len(cases), 'manual_results': 'NOT RUN',
      'cache_method': 'Historical OOXML copied byte-for-byte; new formula caches independently evaluated; no LibreOffice recalculation claimed',
      'validation': 'PASS'}
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--validate-only', action='store_true')
    args = parser.parse_args()
    facts, cases = game_facts(), manual_cases()
    if not args.validate_only: build(facts, cases)
    validate(facts, cases)


if __name__ == '__main__':
    main()
