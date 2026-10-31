import { registerTranslations } from './harborlight-v1-i18n.js?v=frontend-v22-1';
import { TUTORIAL_LESSONS } from './harborlight-v1-progression.js?v=frontend-v22-1';

// Presentation copy for the current learning flow. Player-entered text never
// passes through this catalogue.
const LESSON_COPY = {
  "rules-read": [
    "Wyślij mieszkańca do Gospodarstwa",
    "Otwórz Gospodarstwo i naciśnij +1, aby przydzielić rolnika. Wskazany strzałką przycisk rozpoczyna prawdziwą pracę."
  ],
  "island-map": [
    "Przydziel tragarza do Magazynu",
    "Otwórz Magazyn i przydziel jednego tragarza. Tragarze przynoszą gotowe produkty do centrali."
  ],
  "first-job": [
    "Uruchom obsadę Młyna",
    "Przydziel mieszkańca do Młyna. Jedna żywność wymaga dwóch sztuk dostępnego zboża z centrali."
  ],
  "food-check": [
    "Rozpocznij pozyskiwanie drewna",
    "Przydziel mieszkańca do Obozu drwali, aby zapewnić stałe dostawy drewna na rozbudowę."
  ],
  "townhall-upgrade": [
    "Rozpocznij rozbudowę Ratusza",
    "Odbierz jednorazowe materiały i zleć rozbudowę Ratusza. Materiały bonusowe można wydawać także przy pełnym zwykłym magazynie."
  ],
  "happiness-action": [
    "Popraw szczęście mieszkańców",
    "Rozdaj punkty Domu, udziel błogosławieństwa albo kup atrakcję. Wykonaj prawdziwe działanie poprawiające szczęście."
  ],
  "workplace-journey": [
    "Rozpocznij pozyskiwanie kamienia",
    "Przydziel mieszkańca do Kamieniołomu. W drodze do pracy nie ma kary bezrobocia, a podatek zaczyna płacić po dojściu."
  ],
  "resources-dock": [
    "Rozpocznij produkcję desek",
    "Przydziel mieszkańca do Tartaku. Dwie sztuki drewna schodzą z centrali dopiero po ukończeniu deski."
  ],
  "transport-priority": [
    "Wybierz priorytet transportu",
    "Otwórz szczegóły budynku Magazynu, a następnie ustaw numerowany priorytet materiału lub Budowy."
  ],
  "first-delivery": [
    "Odbierz prawdziwą dostawę",
    "Poczekaj, aż tragarz zakończy dostawę do centrali. Samo otwarcie okna nie zalicza tego kroku."
  ],
  "storage-limits": [
    "Dodaj kolejnego tragarza",
    "Przydziel jeszcze jedną osobę do Magazynu. To osobny przydział: jeśli zrobiłeś go wcześniej samodzielnie, lekcja zniknie bez nagrody."
  ],
  "food-chain": [
    "Ukończ przetworzony produkt",
    "Poczekaj na ukończenie produktu w Młynie lub Tartaku. Krok zalicza prawdziwa produkcja."
  ],
  "house-points": [
    "Wykorzystaj punkty Domu",
    "Przekaż punkty szczęścia jednemu mieszkańcowi albo wszystkim. Pula odnawia się o północy Warszawy."
  ],
  "personal-happiness": [
    "Wybierz swoje powiadomienia",
    "Zmień jedną kategorię powiadomień w Ustawieniach. Wybór dotyczy także licznika dzwonka."
  ],
  "upgrade-cost": [
    "Rozbuduj Gospodarstwo",
    "Gdy pozwoli na to poziom Ratusza, zleć rozbudowę Gospodarstwa z dostępnych materiałów."
  ],
  "construction-queue": [
    "Zleć większy Dom",
    "Zleć rozbudowę Domu. Aktywne budowy i kolejka mają osobne limity."
  ],
  "path-upgrade": [
    "Ulepsz odcinek ścieżki",
    "Wydaj 100 kamienia na odcinek. Ukończ poziom wszystkich ścieżek przed rozpoczęciem następnego."
  ],
  "daily-attractions": [
    "Kup jedną atrakcję",
    "Wybierz atrakcję, na którą Cię stać. Jednocześnie może działać jedna nowa atrakcja."
  ],
  "chapel-blessing": [
    "Uruchom błogosławieństwo",
    "Użyj dostępnego darmowego lub płatnego błogosławieństwa. Jedno darmowe użycie odnawia się każdego dnia Warszawy i nie kumuluje się."
  ],
  "market-rules": [
    "Wyślij towar na Targ",
    "Od drugiego poziomu Ratusza zleć prawdziwą dostawę na Targ. Towar przenosi jego obsada."
  ],
  "lighthouse-visits": [
    "Rozpocznij odbudowę Latarni",
    "Zleć kolejny poziom Latarni. Ukończenie rozbudowy przyzna czasową premię całej wyspie."
  ],
  "lighthouse-task": [
    "Podejmij zadanie",
    "Sprawdź koszt i termin, a następnie potwierdź zadanie. Jednocześnie aktywne jest jedno."
  ],
  "expedition-rules": [
    "Spróbuj ekspedycji",
    "Rozpocznij wybraną minigrę. Skrzynia samouczka poczeka do zakończenia ekspedycji."
  ],
  "returning-workers": [
    "Bezpiecznie odwołaj pracownika",
    "Po ekspedycji odwołaj jednego pracownika. Tragarz z ładunkiem najpierw dokończy kurs, potem wróci do Domu."
  ],
  "island-review": [
    "Przekaż darowiznę na zadanie",
    "Przekaż dostępny materiał na przyjęte zadanie. Ta prawdziwa darowizna kończy Twoje wprowadzenie."
  ]
};

export const V16_COPY = {
  "Spend stored materials before opening or doubling another tutorial chest.": "Wydaj zgromadzone materiały przed otwarciem lub podwojeniem kolejnej skrzyni samouczka.",
  "Referral activity cannot precede the first login.": "Aktywność poleconego gracza nie może poprzedzać jego pierwszego logowania.",
  "The daily loyalty reward is not available or has already been received.": "Dzisiejsza nagroda lojalnościowa nie jest dostępna albo została już odebrana.",
  "Daily loyalty reward received.": "Odebrano dzienną nagrodę lojalnościową.",
  "Daily loyalty reward received": "Odebrano dzienną nagrodę lojalnościową",
  "Receive 50–200 of each resource once per Warsaw day, including Coins. The stored draw does not change when you reload.": "Odbierz raz na dzień Warszawy po 50–200 każdego zasobu, także monet. Zapisane losowanie nie zmienia się po ponownym wczytaniu.",
  "Granted the saved daily draw: 50–200 of each resource, including Coins.": "Przyznano zapisaną dzienną nagrodę: po 50–200 każdego zasobu, także monet.",

  'Automatic tutorial opening is disabled. You can resume it from Settings.': 'Samouczek nie będzie otwierał się automatycznie. Możesz go wznowić w Ustawieniach.',
  'Tutorial resumed. Your progress is preserved.': 'Samouczek wznowiony. Dotychczasowy postęp został zachowany.',
  'Choose a tutorial location.': 'Wybierz miejsce wskazane w samouczku.',
  'Tutorial location visited.': 'Odwiedzono miejsce wskazane w samouczku.',
  'Building supplies are available only before your tutorial Town Hall upgrade.': 'Materiały samouczka są dostępne tylko przed wskazaną rozbudową Ratusza.',
  'The tutorial building supplies were already received.': 'Materiały do budowy z samouczka zostały już odebrane.',
  'Tutorial building supplies': 'Materiały do budowy z samouczka',
  'One-time supplies bring your available building budget to 500 coins and each material, with 600 Food for construction and meals. Bonus materials are immediately available without taking ordinary delivery space.': 'Jednorazowa pomoc uzupełnia dostępny zapas do 500 monet i każdego materiału oraz 600 żywności na budowę i posiłki. Materiały bonusowe są od razu dostępne i nie zajmują miejsca zwykłym dostawom.',
  'Tutorial building supplies received. You can now order the Town Hall upgrade.': 'Odebrano materiały samouczka. Możesz teraz zlecić rozbudowę Ratusza.',
  'This tutorial lesson does not exist.': 'Ta lekcja samouczka nie istnieje.',
  'Complete this lesson through its gameplay action.': 'Ukończ tę lekcję, wykonując wskazane działanie w grze.',
  'This lesson has already been completed.': 'Ta lekcja została już ukończona.',
  'Open this lesson’s location and read its information first.': 'Najpierw odwiedź wskazane miejsce i przeczytaj wyświetlone informacje.',
  'Lesson completed. Your reward chest is ready.': 'Lekcja ukończona. Twoja skrzynia z nagrodą jest gotowa.',
  'This tutorial reward was already claimed.': 'Ta nagroda samouczka została już odebrana.',
  'Complete this lesson before opening its reward chest.': 'Ukończ lekcję, zanim otworzysz jej skrzynię z nagrodą.',
  'Tutorial success viewed.': 'Wyświetlono sukces w samouczku.',
  'Complete this lesson before claiming its reward.': 'Ukończ lekcję, zanim odbierzesz nagrodę.',
  'Tutorial chest opened': 'Skrzynia samouczka otwarta',
  'Tutorial chest received. Share to receive the same resources once more.': 'Odebrano skrzynię samouczka. Wybierz Udostępnij, aby otrzymać te same zasoby jeszcze raz.',
  'This tutorial sharing decision has already been resolved or its chest has not been opened.': 'Ta decyzja o udostępnieniu została już podjęta albo skrzynia nie została jeszcze otwarta.',
  'Tutorial chest doubled': 'Podwojona skrzynia samouczka',
  'The same chest resources were granted once more for choosing to share. Facebook publishing is not connected yet.': 'Za wybór Udostępnij przyznano jeszcze raz te same zasoby ze skrzyni. Publikowanie na Facebooku nie jest jeszcze podłączone.',
  'Tutorial chest doubled.': 'Zasoby ze skrzyni samouczka zostały podwojone.',
  'Sharing skipped. Your tutorial chest remains yours.': 'Pominięto udostępnianie. Twoja skrzynia samouczka pozostaje odebrana.',
  'Complete the previous lesson first.': 'Najpierw ukończ poprzednią lekcję.',
  'Material reward delivery is not available.': 'Przekazanie nagrody w materiałach nie jest dostępne.',
  'Time ran out. The whole unclaimed expedition pot was lost.': 'Czas minął. Cała niewypłacona pula ekspedycji przepadła.',
  'This mini-game round is no longer active.': 'Ta runda minigry nie jest już aktywna.',
  'Move the board with a valid tilt input.': 'Przechyl planszę za pomocą dostępnego sterowania.',
  'Board tilt updated.': 'Zmieniono przechylenie planszy.',
  'Choose a covered card that has not been matched.': 'Wybierz zakryty obrazek, który nie został jeszcze dopasowany.',
  'Card revealed.': 'Odkryto obrazek.',
  'Complete the current mini-game to win this round.': 'Ukończ aktualną minigrę, aby wygrać tę rundę.',
  'Time cannot be bought. Complete the mini-game before its deadline. Rewarded ads remain a future feature.': 'Nie można kupić czasu. Ukończ minigrę przed jego upływem. Reklamy z nagrodami pozostają funkcją na później.',
};

export function registerTutorialCopy(lessons = []) {
  for (const lesson of lessons) {
    const copy = lesson.titlePl && lesson.descriptionPl ? [lesson.titlePl, lesson.descriptionPl] : LESSON_COPY[lesson.id];
    if (!copy) continue;
    V16_COPY[lesson.title] = copy[0];
    V16_COPY[lesson.description] = copy[1];
    V16_COPY[`${lesson.title}: a chest containing 100–300 of each material has been received.`] = `${copy[0]}: odebrano skrzynię zawierającą po 100–300 każdego materiału.`;
  }
  registerTranslations(V16_COPY);
}
registerTutorialCopy(TUTORIAL_LESSONS);

export function tutorialLessonText(row, language = 'en') {
  const copy = language === 'pl' ? row.balanced && row.titlePl && row.descriptionPl ? [row.titlePl, row.descriptionPl] : LESSON_COPY[row.id] : null;
  return { title: copy?.[0] || row.title, description: copy?.[1] || row.description };
}
