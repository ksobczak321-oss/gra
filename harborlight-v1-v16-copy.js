import { registerTranslations } from './harborlight-v1-i18n.js?v=frontend-v27';
import { TUTORIAL_LESSONS } from './harborlight-v1-progression.js?v=frontend-v27';

// Presentation copy for the current learning flow. Player-entered text never
// passes through this catalogue.
const LESSON_COPY = {
  "rules-read": [
    "Znajdź gospodarstwo i przydziel rolnika",
    "Znajdź gospodarstwo na mapie i otwórz je. Przyciskiem „+” przydziel jednego rolnika — od tego zaczyna się produkcja zboża."
  ],
  "island-map": [
    "Znajdź magazyn i przydziel tragarza",
    "Znajdź magazyn na mapie, otwórz go i przydziel jednego tragarza. Będzie przynosił gotowe produkty do magazynu centralnego."
  ],
  "first-job": [
    "Znajdź młyn i przydziel młynarza",
    "Znajdź młyn na mapie i przydziel jednego pracownika. Z dwóch jednostek zboża z magazynu centralnego wyprodukuje jedną jednostkę żywności."
  ],
  "food-check": [
    "Znajdź budynek drwali i przydziel pracownika",
    "Na mapie znajdź budynek oznaczony „Drwale”. Otwórz go i przydziel jednego pracownika, aby zapewnić dostawy drewna na rozbudowę."
  ],
  "townhall-upgrade": [
    "Znajdź ratusz i zleć jego rozbudowę",
    "Odbierz jednorazową pomoc w materiałach. Następnie znajdź ratusz na mapie i zleć rozbudowę. Materiały z premii możesz wykorzystać także wtedy, gdy zwykłe zapasy wypełniają magazyn."
  ],
  "happiness-action": [
    "Popraw szczęście mieszkańców",
    "Znajdź dom na mapie i rozdaj mieszkańcom punkty szczęścia. Lekcję zaliczysz również, korzystając z błogosławieństwa lub kupując atrakcję."
  ],
  "workplace-journey": [
    "Znajdź kamieniołom i przydziel kamieniarza",
    "Znajdź kamieniołom na mapie i przydziel jednego pracownika. Najpierw dotrze do pracy, a potem zacznie produkować kamień i płacić podatki."
  ],
  "resources-dock": [
    "Znajdź tartak i przydziel pracownika",
    "Znajdź tartak na mapie i przydziel jednego pracownika. Każda ukończona deska zużywa dwie jednostki drewna z magazynu centralnego."
  ],
  "transport-priority": [
    "Znajdź magazyn i ustaw priorytet transportu",
    "Znajdź magazyn na mapie i wybierz „Więcej o budynku”. W priorytetach transportu zaznacz materiał lub „Budowę”. Wybrana pozycja otrzyma numer."
  ],
  "first-delivery": [
    "Poczekaj na dostawę do magazynu",
    "Poczekaj, aż tragarz dostarczy gotowe produkty do magazynu centralnego. Samo otwarcie okna magazynu nie zalicza tej lekcji."
  ],
  "storage-limits": [
    "Znajdź magazyn i dodaj kolejnego tragarza",
    "Znajdź magazyn na mapie i przydziel jeszcze jednego tragarza. Jeśli zrobiłeś to wcześniej samodzielnie, lekcja zniknie bez dodatkowej nagrody."
  ],
  "food-chain": [
    "Poczekaj na gotowy produkt",
    "Poczekaj, aż pracownik młyna lub tartaku ukończy produkcję. Gotowa żywność lub deska zaliczy lekcję automatycznie."
  ],
  "house-points": [
    "Znajdź dom i rozdaj punkty szczęścia",
    "Znajdź dom na mapie i rozdaj dostępne punkty szczęścia jednemu mieszkańcowi lub wszystkim. Pula odnawia się o północy według czasu w Warszawie."
  ],
  "personal-happiness": [
    "Wybierz interesujące Cię powiadomienia",
    "Otwórz ustawienia i zmień jedną kategorię powiadomień. Twój wybór wpłynie również na liczbę wiadomości przy dzwonku."
  ],
  "upgrade-cost": [
    "Znajdź gospodarstwo i zleć jego rozbudowę",
    "Znajdź gospodarstwo na mapie i zleć rozbudowę, gdy pozwala na nią poziom ratusza. Wykorzystaj dostępne materiały z magazynu centralnego."
  ],
  "construction-queue": [
    "Znajdź dom i zleć jego rozbudowę",
    "Znajdź dom na mapie i zleć rozbudowę. Sprawdź przy tym dostępne miejsca budowy i kolejkę — mają osobne limity."
  ],
  "path-upgrade": [
    "Znajdź odcinek ścieżki i ulepsz go",
    "Na dolnym pasku wybierz „Ścieżki”, a potem wskazany odcinek. Ulepszenie kosztuje 100 jednostek kamienia. Zanim zaczniesz kolejny poziom, ukończ bieżący na wszystkich odcinkach."
  ],
  "daily-attractions": [
    "Kup atrakcję dla mieszkańców",
    "Na dolnym pasku wybierz „Dekoracje” i kup atrakcję, na którą Cię stać. W danej chwili może działać tylko jedna nowa atrakcja."
  ],
  "chapel-blessing": [
    "Znajdź kaplicę i poproś o błogosławieństwo",
    "Znajdź kaplicę na mapie i skorzystaj z dostępnego bezpłatnego lub płatnego błogosławieństwa. Darmowe użycie odnawia się o północy czasu w Warszawie; niewykorzystane nie przechodzi na następny dzień."
  ],
  "market-rules": [
    "Znajdź targ i zamów dostawę",
    "Gdy ratusz ma co najmniej 2. poziom, znajdź targ na mapie i zamów dostawę towaru. Przeniosą go pracownicy targu."
  ],
  "lighthouse-visits": [
    "Znajdź latarnię i rozpocznij odbudowę",
    "Znajdź latarnię na mapie i zleć jej odbudowę lub kolejny poziom rozbudowy. Po zakończeniu budowy cała wyspa otrzyma czasową premię."
  ],
  "lighthouse-task": [
    "Wybierz i zaakceptuj zadanie",
    "Otwórz zadania, sprawdź potrzebne zasoby i termin, a następnie potwierdź wybrane zlecenie. Możesz wykonywać tylko jedno zadanie naraz."
  ],
  "expedition-rules": [
    "Wyrusz na ekspedycję",
    "Otwórz ekspedycje i rozpocznij wybraną minigrę. Nagroda samouczka poczeka, aż zakończysz ekspedycję."
  ],
  "returning-workers": [
    "Bezpiecznie odwołaj pracownika",
    "Po zakończeniu ekspedycji odwołaj jednego pracownika. Jeśli tragarz niesie towar, najpierw dokończy dostawę, a potem wróci do domu."
  ],
  "island-review": [
    "Dostarcz materiały do przyjętego zadania",
    "Otwórz przyjęte zadanie i przekaż na nie dostępny materiał. Ta dostawa zakończy samouczek."
  ]
};

// Translation aliases keep captions from earlier saved lessons readable.
const PREVIOUS_BALANCED_TEXT = {
  "rules-read": [
    "Assign a farmer and read the resource cards",
    "Assign one farmer. A resource card such as Stone 0 / 537 (0), +0/h means 0 local, 537 central, 0 in transit and a current net balance of 0 per hour."
  ],
  "island-map": [
    "Assign a Warehouse carrier",
    "Assign one carrier to collect production and deliver building supplies. Your previous reward is already in central storage."
  ],
  "first-job": [
    "Assign a lumber worker",
    "Assign one Lumber Camp worker. Actions performed when taught grant a small immediate reward or funds for the next real upgrade. Actions already performed independently remove their step without a reward."
  ],
  "food-check": [
    "Assign a Windmill worker",
    "A Windmill worker turns two central Grain into one Food. Residents consume Food, so production and delivery both matter."
  ],
  "townhall-upgrade": [
    "Order Town Hall level 2",
    "Collect the one-time building budget, then order the Town Hall upgrade. Resources are reserved now and physically leave storage when carriers pick them up."
  ],
  "happiness-action": [
    "Prioritize construction transport",
    "Open Warehouse building details, then choose Construction as a priority so carriers supply the Town Hall instead of continually collecting production."
  ],
  "workplace-journey": [
    "Assign a Quarry worker",
    "Assign a Quarry worker while the Town Hall is being built. After walking to work, fed workers produce and pay tax."
  ],
  "resources-dock": [
    "Finish Town Hall level 2",
    "Wait for actual delivery and construction. The reward supplies only the missing budget for the Quarry upgrade."
  ],
  "transport-priority": [
    "Upgrade the Quarry",
    "Spend the supplied Wood and Stone on a real Quarry upgrade. The following reward is Coins rather than another large material chest."
  ],
  "first-delivery": [
    "Assign a Sawmill worker",
    "Assign a Sawmill worker. Two central Wood become one Plank; the resource card shows the product waiting locally until a carrier collects it."
  ],
  "storage-limits": [
    "Assign a second carrier",
    "Assign one more Warehouse carrier so building deliveries and production collection can progress together."
  ],
  "food-chain": [
    "Finish the Quarry upgrade",
    "Finish the actual Quarry construction. This releases the previous budget before a reward funds a larger Warehouse."
  ],
  "house-points": [
    "Upgrade the Warehouse",
    "Order Warehouse level 2. Its ordinary capacity increases from 4,000 to 6,000 materials, with a separate limit for each resource."
  ],
  "personal-happiness": [
    "Use daily House happiness",
    "Give House happiness points to residents. The pool renews at Warsaw midnight; happiness determines arrivals or departures."
  ],
  "upgrade-cost": [
    "Finish the Warehouse upgrade",
    "Let the Warehouse construction finish. Your next reward covers the missing Farm upgrade budget."
  ],
  "construction-queue": [
    "Upgrade the Farm",
    "Spend Wood, Stone and Grain on a real Farm upgrade. The reward reserves the next 100 Stone for a path section."
  ],
  "path-upgrade": [
    "Improve a path section",
    "Spend 100 Stone to improve one path section. Paths independently improve transport speed."
  ],
  "daily-attractions": [
    "Buy an attraction",
    "Spend Coins on an affordable happiness attraction. Its price, audience and duration are shown before purchase."
  ],
  "chapel-blessing": [
    "Receive a Chapel blessing",
    "Activate a free or paid blessing. Its bonus materials remain spendable, and the next Town Hall upgrade will use them."
  ],
  "market-rules": [
    "Finish the Farm upgrade",
    "After the Farm finishes, the reward supplies only what is missing for Town Hall level 3."
  ],
  "lighthouse-visits": [
    "Order Town Hall level 3",
    "Spend your stored materials, including blessing bonuses, on Town Hall level 3. The population prerequisite starts with the later upgrade from 3 to 4."
  ],
  "lighthouse-task": [
    "Finish Town Hall level 3",
    "Wait for the Town Hall upgrade. Its reward covers only missing Lighthouse construction supplies."
  ],
  "expedition-rules": [
    "Start rebuilding the Lighthouse",
    "Commit the supplied materials to Lighthouse level 1. This large construction spends the last building budget."
  ],
  "returning-workers": [
    "Finish the Lighthouse",
    "Finish delivery and construction. Receive the remaining tutorial rewards before final storage settlement; independently completed steps need no reward."
  ],
  "island-review": [
    "Finish with a full Warehouse",
    "Review the final reward, then finish the tutorial. Free ordinary capacity is filled immediately; external bonus stock must first be spent on real island actions."
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

  'Automatic tutorial opening is disabled. You can resume it from Settings.': 'Samouczek nie będzie się już otwierał automatycznie. Wrócisz do niego z Pomocy.',
  'Automatic tutorial opening is disabled. You can resume it from Help.': 'Samouczek nie będzie się już otwierał automatycznie. Wrócisz do niego z Pomocy.',
  'Tutorial rewards belong to the first island and cannot be repeated here.': 'Nagrody samouczka dotyczą pierwszej wyspy. Na kolejnych wyspach nie można odbierać ich ponownie.',
  'The final Warehouse reward could not be received.': 'Nie udało się odebrać końcowej nagrody do magazynu.',
  'The final reward filled free ordinary Warehouse capacity. No material was removed, and no tutorial reward is waiting.': 'Nagroda końcowa uzupełniła wolne miejsce w magazynie. Żadne materiały nie przepadły i wszystkie nagrody samouczka zostały odebrane.',
  'Tutorial complete. Your ordinary Warehouse is full and no tutorial rewards are waiting.': 'Samouczek ukończony. Magazyn jest pełny i wszystkie nagrody samouczka zostały odebrane.',
  'One-time supplies fill the missing first Town Hall budget directly in ordinary storage, including food for construction and meals.': 'Jednorazowa pomoc uzupełnia brakujące materiały na pierwszą rozbudowę ratusza, z zapasem żywności na budowę i posiłki.',
  'Reward confirmed. Continue to the next tutorial action.': 'Nagroda potwierdzona. Przejdź do kolejnego zadania samouczka.',
  'Tutorial complete: Warehouse full': 'Samouczek ukończony: magazyn pełny',
  'Tutorial resumed. Your progress is preserved.': 'Wracamy do samouczka. Twój dotychczasowy postęp został zachowany.',
  'Choose a tutorial location.': 'Znajdź miejsce wskazane w tej lekcji.',
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
  'Tutorial success viewed.': 'Wyświetlono podsumowanie ukończonej lekcji.',
  'Complete this lesson before claiming its reward.': 'Ukończ lekcję, zanim odbierzesz nagrodę.',
  'Tutorial chest opened': 'Skrzynia samouczka otwarta',
  'Tutorial chest received. Share to receive the same resources once more.': 'Nagroda ze skrzyni jest już Twoja. Wybierz „Udostępnij”, aby otrzymać te same zasoby jeszcze raz.',
  'This tutorial sharing decision has already been resolved or its chest has not been opened.': 'Ta decyzja o udostępnieniu została już podjęta albo skrzynia nie została jeszcze otwarta.',
  'Tutorial chest doubled': 'Podwojona skrzynia samouczka',
  'The same chest resources were granted once more for choosing to share. Facebook publishing is not connected yet.': 'Za wybór Udostępnij przyznano jeszcze raz te same zasoby ze skrzyni. Publikowanie na Facebooku nie jest jeszcze podłączone.',
  'Tutorial chest doubled.': 'Zasoby ze skrzyni samouczka zostały podwojone.',
  'Sharing skipped. Your tutorial chest remains yours.': 'Pominięto udostępnianie. Nagroda ze skrzyni nadal jest Twoja.',
  'Complete the previous lesson first.': 'Najpierw ukończ poprzednią lekcję.',
  'Material reward delivery is not available.': 'Nie można teraz dostarczyć materiałów z nagrody.',
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
    const previous = lesson.titlePl ? PREVIOUS_BALANCED_TEXT[lesson.id] : null;
    for (const title of [lesson.title, previous?.[0]].filter(Boolean)) {
      V16_COPY[title] = copy[0];
      V16_COPY[`${title}: a chest containing 100–300 of each material has been received.`] = `${copy[0]}: odebrano skrzynię zawierającą po 100–300 sztuk każdego materiału.`;
    }
    for (const description of [lesson.description, previous?.[1]].filter(Boolean)) V16_COPY[description] = copy[1];
  }
  registerTranslations(V16_COPY);
}
registerTutorialCopy(TUTORIAL_LESSONS);

export function tutorialLessonText(row, language = 'en') {
  const copy = language === 'pl' ? row.balanced && row.titlePl && row.descriptionPl ? [row.titlePl, row.descriptionPl] : LESSON_COPY[row.id] : null;
  return { title: copy?.[0] || row.title, description: copy?.[1] || row.description };
}
