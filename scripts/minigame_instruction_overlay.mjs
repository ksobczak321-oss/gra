// Pure catalogue shaping: the player reads the same core instructions in the
// game and in Word/TXT. No timers, attempts, accounts or files are created here.
import { getMiniGameInstructionContent, miniGameInstructionSubjects } from '../harborlight-v1-minigame-instructions.js';

export const MINIGAME_READING_NOTE='Przed rozpoczęciem przeczytaj instrukcję i wybierz „Zaczynam”, gdy będziesz gotowy. Zegar próby pozostaje zatrzymany podczas tego pierwszego czytania.';

// Old catalogue examples described mechanics replaced by the reviewed packet.
// Avoid fixed board counts: the actual generated difficulty owns those values.
const revised={
 'harbor-routes':{
  setup:['Plansza przedstawia konwoje i kierunki ich wypłynięcia. Układ oraz liczba konwojów zależą od trudności.'],
  examples:['Jeżeli przed konwojem płynącym w prawo stoi drugi konwój, najpierw zwolnij jego drogę. Po każdym wypłynięciu ponownie sprawdź strzałki pozostałych jednostek.']
 },
 crabs:{
  setup:['Jeden krab czeka na początku drogi do muszli. Obejrzyj bezpieczną trasę przed ukryciem podpowiedzi.'],
  win:['Krab dociera do muszli po zapamiętanej trasie.'],
  fail:['Błędny krok cofa kraba na początek. Zacznij ponownie od pierwszego pola bezpiecznej trasy.'],
  examples:['Zapamiętaj kolejność pierwszych zakrętów. Jeżeli krab wróci na początek, odtwórz te same pierwsze kroki i popraw miejsce pomyłki.']
 },
 hiddenObjects:{
  setup:['Przeczytaj wskazówkę opisującą kolor i symbol właściwego miejsca. Oglądaj pola i porównuj obie cechy.'],
  examples:['Jeżeli wskazówka wymaga określonego koloru i symbolu, zgodność samego koloru nie wystarcza do wskazania okularów.']
 },
 parrot:{
  setup:['Odczytaj wskazówkę do bieżącego słowa. Dostępne przyciski przedstawiają pojedyncze litery rozsypanki.'],
  win:['Wszystkie słowa wiadomości zostały poprawnie ułożone i potwierdzone.'],
  fail:['Błędne ułożenie nie zalicza słowa. Wyczyść odpowiedź, ułóż ją ponownie i sprawdź.'],
  examples:['Najpierw ustal słowo pasujące do wskazówki, a potem wybieraj jego kolejne litery. Potwierdź dopiero kompletną odpowiedź.']
 },
 packing:{
  setup:['Przyjrzyj się kształtom sprzętu i miejscom, w które można je wpasować. Obracanie zmienia położenie zajmowanych pól elementu.'],
  examples:['Obróć wybrany element, jeżeli jego wcięcie pasuje do sąsiedniego sprzętu dopiero po zmianie ułożenia. Następnie wskaż jego lewy górny róg.']
 },
 untangle:{
  setup:['Punkty mocowania łączy sieć lin. Zamiana dwóch punktów przenosi także wszystkie przyczepione do nich liny.'],
  win:['Żadna para lin nie przecina się.'],
  fail:['Usunięcie tylko części przecięć nie kończy zadania. Sprawdź całą sieć po każdej zamianie.'],
  examples:['Po zamianie punktu z kilkoma linami obejrzyj każdą z nich: poprawienie jednego przecięcia może zmienić również inne połączenia.']
 },
 navigation:{
  setup:['Mgła zasłania rafy na drodze łodzi do portu. Bieżący licznik pokazuje dostępny zapas kroków.'],
  win:['Łódź dociera do portu.'],
  fail:['Wpłynięcie na rafę odkrywa ją i cofa łódź na początek. Zapamiętaj odkryte przeszkody podczas kolejnej próby.'],
  examples:['Gdy odkryjesz rafę, zapamiętaj jej pole i po powrocie na początek wybierz inną drogę. Kieruj się również wskazówkami kursu.']
 },
 hotel:{
  setup:['Każda grupa ma własną kartę potrzeb, a każdy pokój określone cechy. Porównaj wszystkie wymagania przed przydziałem.'],
  win:['Wszystkie grupy mają pokoje spełniające ich wymagania.'],
  fail:['Nawet jedna niezgodna cecha oznacza błędny przydział. Po zamianie zajętego pokoju sprawdź również grupę, która musiała go opuścić.'],
  examples:['Jeżeli wybierasz zajęty pokój, dotychczasowi goście przejdą do poprzedniego pokoju wybranej grupy albo wrócą do oczekujących, gdy ta grupa nie miała przydziału.']
 },
 invention:{
  setup:['Przeczytaj wymagane funkcje oraz ograniczenia. Porównaj je z cechami dostępnych części.'],
  win:['Sprawdzony wynalazek spełnia wszystkie wymagane funkcje i ograniczenia.'],
  fail:['Niekompletny lub niezgodny zestaw nie kończy zadania. Zmień części i sprawdź ponownie.'],
  examples:['Część pasująca do jednej funkcji nadal musi spełniać pozostałe ograniczenia. Oceniaj cały komplet, a nie tylko liczbę zaznaczonych części.']
 },
 cooking:{
  setup:['Bieżący przepis i karta gościa wskazują skład dania oraz wymaganą temperaturę. Liczniki pokazują dodawane ilości.'],
  win:['Wszystkie wymagane porcje zostały poprawnie przygotowane.'],
  fail:['Błędny skład lub temperatura nie zaliczają porcji. Popraw bieżące danie zgodnie z przepisem.'],
  examples:['Właściwe składniki przy złej temperaturze nie zaliczą porcji. Przed przygotowaniem sprawdź oba warunki.']
 }
};

export function synchronizeMiniGameInstructions(entries){
 if(!Array.isArray(entries))throw new TypeError('Expected the complete mini-game entry list');
 const expected=new Set(miniGameInstructionSubjects().map(row=>`${row.type}:${row.id}`)),seen=new Set();
 if(entries.length!==expected.size)throw new TypeError('Instruction catalogue must cover every active mini-game exactly once');
 return entries.map(entry=>{
  const key=`${entry.engine?.type}:${entry.engine?.id}`;
  if(!expected.has(key)||seen.has(key)||entry.family!==entry.engine?.type)throw new TypeError('Unknown, duplicate or mismatched mini-game subject: '+key);
  seen.add(key);
  const content=getMiniGameInstructionContent(entry.engine,'pl');
  if(!content.objective||!content.scenario||!content.steps.length||!content.rules.length)throw new TypeError('Incomplete shared instructions: '+key);
  const auxiliary=entry.family==='puzzle'?revised[entry.engine.id]||{}:{};
  return {...entry,...auxiliary,
   objective:content.objective,scenario:content.scenario,rules:[...content.rules],controls:[...content.steps],
   setup:[MINIGAME_READING_NOTE,...(auxiliary.setup||entry.setup).filter(text=>text!==MINIGAME_READING_NOTE)],
   timing:[MINIGAME_READING_NOTE,...entry.timing.filter(text=>text!==MINIGAME_READING_NOTE)],
   instructionSource:{id:content.id,path:'harborlight-v1-minigame-instructions.js',sharedWithRuntime:true,readingStartsTimer:false}
  };
 });
}
