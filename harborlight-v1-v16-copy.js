import { registerTranslations } from './harborlight-v1-i18n.js?v=frontend-v16';
import { TUTORIAL_LESSONS } from './harborlight-v1-progression.js?v=frontend-v16';

// Presentation copy for the current learning flow. Player-entered text never
// passes through this catalogue.
const LESSON_COPY = {
  'rules-read': ['Poznaj zasady swojej wyspy', 'Otwórz menu wyspy w lewym górnym rogu, wejdź w Zasady i potwierdź ich przeczytanie.'],
  'island-map': ['Obejrzyj mapę wyspy', 'Otwórz mapę i sprawdź, gdzie znajdują się budynki, miejsca produkcji i port.'],
  'first-job': ['Przydziel mieszkańcom pracę', 'Przydziel co najmniej jedną osobę do produkcji i jedną do Magazynu. Do pracy dotrą po pięciu minutach.'],
  'food-check': ['Sprawdź, czy nikt nie jest głodny', 'Otwórz Mieszkańców i sprawdź stan wyżywienia. Żywność musi być w magazynie centralnym albo w trwającym posiłku.'],
  'townhall-upgrade': ['Rozpocznij rozbudowę Ratusza', 'Odbierz tutaj jednorazowe materiały do budowy i zleć rozbudowę Ratusza. Transport oraz budowa będą trwały, gdy poznasz kolejne zasady.'],
  'happiness-action': ['Popraw szczęście mieszkańców', 'Rozdaj punkty szczęścia w Domu, udziel błogosławieństwa w Kaplicy albo uruchom atrakcję. Wykonaj jedno działanie poprawiające szczęście.'],
  'workplace-journey': ['Sprawdź drogę do pracy', 'Otwórz zarządzanie pracownikami i porównaj osoby pracujące, idące do pracy oraz wracające do domu.'],
  'resources-dock': ['Odczytaj oba magazyny zasobów', 'Wybierz Zasoby na dolnym pasku. Odczytaj zapas lokalny / centralny oraz ilość przewożoną w nawiasie.'],
  'transport-priority': ['Wybierz priorytet transportu', 'W Magazynie ustaw wybrany materiał albo Budowę jako numerowany priorytet transportu.'],
  'first-delivery': ['Odbierz prawdziwą dostawę', 'Poczekaj, aż tragarz z Magazynu przyniesie co najmniej jedną partię gotowych produktów do magazynu centralnego.'],
  'storage-limits': ['Porównaj limity magazynów', 'Otwórz Magazyn i porównaj łączną pojemność, limit jednego materiału oraz lokalne zapasy producentów.'],
  'food-chain': ['Poznaj produkcję żywności', 'Otwórz Młyn. Gospodarstwo produkuje zboże, a Młyn zużywa dwie sztuki zboża z centrali na jedną sztukę żywności w lokalnym magazynie.'],
  'house-points': ['Znajdź codzienne punkty Domu', 'Otwórz pulę szczęścia w Domu. Odnawia się o północy czasu polskiego, a niewykorzystane punkty są rozdawane tuż przed północą.'],
  'personal-happiness': ['Odczytaj szczęście każdej osoby', 'Otwórz Mieszkańców i porównaj indywidualne szczęście, potrzeby oraz aktywne efekty. Wartość wyspy jest średnią wszystkich osób.'],
  'upgrade-cost': ['Sprawdź koszt rozbudowy', 'Otwórz rozbudowę budynku i porównaj dostępne zasoby centralne z kosztem oraz ograniczeniem poziomu Ratusza.'],
  'construction-queue': ['Znajdź zarządzanie budową', 'Otwórz zarządzanie budową w Ratuszu. Najpierw docierają materiały, a dopiero potem zaczyna się osobna faza budowania.'],
  'path-upgrade': ['Ulepsz jeden odcinek ścieżki', 'Wydaj 100 kamienia z centrali na jeden odcinek. Wszystkie odcinki muszą osiągnąć dany poziom, zanim rozpocznie się kolejny.'],
  'daily-attractions': ['Poznaj codzienne atrakcje', 'Wybierz Dekoracje i porównaj pięć ofert. Jedna atrakcja działa przez sześć godzin, a jej zasięg i cena zależą od oferty.'],
  'chapel-blessing': ['Poznaj błogosławieństwa Kaplicy', 'Otwórz Kaplicę i przeczytaj zasady darmowych oraz płatnych błogosławieństw. Ręczne błogosławieństwo daje materiały i czasową premię szczęścia.'],
  'market-rules': ['Poznaj wymiany na Targu', 'Otwórz Targ. Jest dostępny od drugiego poziomu Ratusza i wymienia towary z tej samej grupy z opłatą dziesięciu procent.'],
  'lighthouse-visits': ['Poznaj wizyty w latarni', 'Otwórz Latarnię. Odbudowa daje czasowe premie całej wyspie, a wizyty poprawiają szczęście po powrocie mieszkańców.'],
  'lighthouse-task': ['Podejmij jedno zadanie', 'Przeczytaj koszt i termin, a następnie potwierdź zadanie. Jednocześnie aktywne jest jedno zadanie, a darowizn nie można wycofać.'],
  'expedition-rules': ['Spróbuj ekspedycji', 'Rozpocznij ekspedycję i spróbuj wylosowanej minigry. Możesz wypłacić wygraną albo zaryzykować całą niewypłaconą pulę serii.'],
  'returning-workers': ['Bezpiecznie odwołaj pracownika', 'Zakończ ekspedycję, a następnie odwołaj jednego pracownika. Tragarz z ładunkiem najpierw kończy dostawę, potem przez pięć minut wraca do domu.'],
  'island-review': ['Zrób przegląd swojej wyspy', 'Wróć do menu wyspy i sprawdź żywność, pracę, magazyny, szczęście i plany budowy. Możesz już samodzielnie zarządzać wyspą.']
};

export const V16_COPY = {
  'Automatic tutorial opening is disabled. You can resume it from Settings.': 'Samouczek nie będzie otwierał się automatycznie. Możesz go wznowić w Ustawieniach.',
  'Tutorial resumed. Your progress is preserved.': 'Samouczek wznowiony. Dotychczasowy postęp został zachowany.',
  'Choose a tutorial location.': 'Wybierz miejsce wskazane w samouczku.',
  'Tutorial location visited.': 'Odwiedzono miejsce wskazane w samouczku.',
  'Building supplies are available only before your tutorial Town Hall upgrade.': 'Materiały samouczka są dostępne tylko przed wskazaną rozbudową Ratusza.',
  'The tutorial building supplies were already received.': 'Materiały do budowy z samouczka zostały już odebrane.',
  'Tutorial building supplies': 'Materiały do budowy z samouczka',
  'One-time supplies bring your available building budget to 500 coins and each material, with 600 Food for construction and meals. Any overflow waits safely for warehouse space.': 'Jednorazowa pomoc uzupełnia dostępny zapas do 500 monet i każdego materiału oraz 600 żywności na budowę i posiłki. Nadwyżka bezpiecznie czeka na miejsce w magazynie.',
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
    const copy = LESSON_COPY[lesson.id];
    if (!copy) continue;
    V16_COPY[lesson.title] = copy[0];
    V16_COPY[lesson.description] = copy[1];
    V16_COPY[`${lesson.title}: a chest containing 100–300 of each material has been received.`] = `${copy[0]}: odebrano skrzynię zawierającą po 100–300 każdego materiału.`;
  }
  registerTranslations(V16_COPY);
}
registerTutorialCopy(TUTORIAL_LESSONS);

export function tutorialLessonText(row, language = 'en') {
  const copy = language === 'pl' ? LESSON_COPY[row.id] : null;
  return { title: copy?.[0] || row.title, description: copy?.[1] || row.description };
}
