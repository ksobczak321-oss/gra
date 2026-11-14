# V32 people engine contract

Pure modules; no browser globals or imports of state/play/logistics. Canonical goods: militaryClothes and professorRobes.

Each hook accepts `context = { now, endAt, worlds, highestAcademyLevel, islandIndex, buildSeconds, hasHousing, feedingMultiplier, spendGoods, grantPerson, recallPerson, notify, random }`.
`now` is the START of an interval in milliseconds. `advance*(state, elapsedSeconds, context)` never advances `state.worldTimeMs`; it settles at `endAt ?? now + elapsedSeconds*1000`.

## Education exports

- `normalizeEducation(state, raw=state, context={})`
- `educationAction(state, action, context={})`: null for unknown action, otherwise `{ok,message,...}`
- `advanceEducation`, `nextEducationEvent`, `educationStatus`, `educationBusy`
- `personKey`, `educationRecord`, `isGraduate`, `professionStatus`, `educationWorkMultiplier`, `educationHappiness`, `educationHousingAssignment`, `educationTaxable`, `hasDiscovery`, `researchEffect`, `ensureFoundingProfessors`

Actions:
- `educationEnroll {studentUid, teacherUid}`
- `educationCancelCourse {courseId}`
- `educationReplaceTeacher {courseId, teacherUid}`
- `educationAppoint {personUid}`
- `educationReturnProfessor {personUid}`
- `educationResearchStart {topic, professorUids:[...]}`
- `educationResearchAssign {researchId, professorUids:[...]}`
- `educationResearchCancel {researchId}`
- `educationStartRound {}`

`educationStatus(state,context)` returns `{unlocked, level, professorLimit, professorBeds, professors, candidates, courses, researches, researchCatalog, researchLevels, discoveries, round}`. Each professor/candidate includes personUid/id/name. Courses contain id/studentUid/teacherUid/round/remainingWork/initialWork/cost/paused and calculated remainingSeconds. Researches likewise plus topic/professorUids/level/cost.

`state.education = {version:1, people:{[personUid]:{profession, rounds, protectedUntil, rescueGift}}, courses:[], researches:[], researchLevels:{}, discoveries:{cheese:true,...}, round:{number,members:[]}, foundingGranted, sequence}`.

## Military exports

- `normalizeMilitary`, `militaryAction`, `advanceMilitary`, `nextMilitaryEvent`, `militaryStatus`, `militaryBusy`
- `militaryRecord`, `militaryHousingAssignment`, `militaryWorkMultiplier`, `militaryHappiness`, `militaryTaxable`, `canAssignSpecialist`, `ensureFoundingSoldiers`, `ensureFoundingSpecialists`, `ensureRescueSpecialist`

Actions:
- `militaryRecruit {recruitUid,instructorUid}`
- `militaryOfficerTrain {soldierUid,officerUid}`
- `militaryCancelCourse {courseId}`
- `militaryReplaceInstructor {courseId,instructorUid}`
- `militaryRecall {personUid}`
- `militaryDispatch {personUids:[...]}`
- `militaryClaimReturn {squadId}`
- `militaryFreeBarracksUpgrade {squadId}`

`militaryStatus` returns `{unlocked,level,beds,soldiers,candidates,courses,squads,waiting,festiveUntil}`. Soldiers include `{personUid,id,name,rank,ready,restUntil,housed,busy}`. Squad public status intentionally omits return time and probabilities. Engine's saved state contains full snapshots for soldiers away/waiting outside local population.

Local specialists are regular `state.residents`; away soldiers are removed from local list but retained as immutable-person snapshots in squads. Root must call these hooks after base resident normalization, preserve sidecars and integrate housing, happiness, taxes and work helpers. Never serialize only the local population count and lose away snapshots.

## Integrated resident and housing behavior

For ruleset 32, `residentWorkMultiplier(state, person, context={})` is the complete product of per-person food, housing, profession, graduate rounds and applicable research. Do not apply feeding, graduate or research multipliers twice. Legacy saves retain the old housing-only result. Nonenumerable `state.highestAcademyLevel` or `state.runtimeContext` supplies archipelago context.

`residentTaxable(state, person)` distinguishes learners (no tax) from arrived workers and present specialists. `residentAvailableForAssignment` excludes courses, rest and the last research professor. `recallSpecialistResident(state, person)` preserves loaded carrier delivery and two-minute return.

Transport adapters use `exportPersonEducation`, `detachPersonEducation`, `importPersonEducation`, and the equivalent Military functions; the records belong to UID, not island resident index. `canHandOverProfessor` rejects rescue gifts and active teaching/research. `canDelegateProfessor` / `releaseProfessorResearch` allow removing excess researchers while retaining at least one assignment.

Acceleration actions: `educationAccelerate {id|courseId|researchId,method:'ad'|'coins'}` and `militaryAccelerate {id|courseId,method}`. Quote exports return `{ok,cost,remainingSeconds,advertSeconds}`. Research instant price is ceil(current staffed calendar wait / 60), minimum one coin, as decision 43 confirms. Course/training instant price is ceil(remaining instructor-work seconds / 60); an advert removes min(10% calendar wait,600s) at the current rate.

`RESEARCH_CATALOG` marks two DEV balance proposals (`cheese`, `royalCredit`) with `devBalanceProposal:true`. Their unconfirmed costs are reviewable before promotion. Incomplete future cake recipes remain absent; basic cake never requires discovery.
