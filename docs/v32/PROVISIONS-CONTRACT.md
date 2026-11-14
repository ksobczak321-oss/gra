# DEV v32 provisions integration contract

Module: `harborlight-v1-provisions.js`. It imports no other engine and never advances the global world clock.

## IDs

Goods retain `wood`, `stone`, `grain`, legacy `food`, `planks` and add `vegetables`, `livestock`, `rawMilk`, `sourMilk`, `fish`, `flour`, `pasteurizedMilk`, `meat`, `leather`, `bread`, `cake`, `cheese`, `civilianClothes`, `militaryClothes`, `professorRobes`.

New buildings: `bakery`, `dairy`, `slaughterhouse`, `fisher`, `leatherworks`, `academy`, `barracks`. `NEW_BUILDINGS` supplies names and unlock levels; root supplies prices and building-state registration.

Recipes: `farmGrain`, `farmVegetables`, `farmLivestock`, `farmMilk`, `farmCheese`, `flour`, `bread`, `cake`, `pasteurizedMilk`, `meat`, `leather`, `fish`, `civilianClothes`, `militaryClothes`, `professorRobes`, `wood`, `stone`, `planks`.

## Storage and serialization

`state.provisions` is a version1 sidecar. `normalizeProvisions(state, raw=state, context)` preserves people by `personUid`, one-off meal limits, research-independent production allocations, milk batches, diet histories, clothing and cake clocks. It does not remove sidecar records for people temporarily away, nor mint new starting clothes on an ordinary reload.

Resources are always `state.resources[resourceId]`. The host must expand the material lists in state, inventory, logistics, cargo, saves and rendering; retaining only legacy five materials would silently discard new goods.

`state.education.discoveries.cheese` unlocks cheese at Farm6. A `context.hasResearch(id)` callback is also accepted. Basic cake has no discovery requirement. Robes require Academy unlocked at TownHall4.

## Interval order

- `feedResidents(state, seconds, context)` consumes meals for an interval, proportionally divides sytość among residents and records coverage/history. To influence the interval's work rate, call before capturing the work segment. `advanceProvisions` feeds by default for standalone use; if host feeds separately, call `advanceProvisions(state, seconds, {...context,feed:false})` for milk/clothing clocks.
- `context.now` is the interval **start** time in milliseconds. Without it, advances use the sidecar clock; reads use the sidecar's last completed clock.
- `nextProvisionsEvent(state, context)` returns positive seconds, at most60. Merge it into the host chronological event boundary. No offline event lottery is performed.
- `feedingMultiplier(state, person?)` gives0.5..1; multiply it once, not both in a global multiplier and again personally.
- `dietPenalty`, `hungerPenalty`, `cakeHappinessBonus`, `clothingPenalty` return individual offsets/rates for host happiness integration. Diet penalty is a current offset; hunger penalty is a per-hour rate after12equivalent hours, proportional to shortage. Cake bonus is an offset, never a balance mutation.
- New people receive24hours of diet grace; crossing TownHall3 or8 renews that grace. Initial personal two outfits are granted only for an actual new sidecar resident while TownHall<=3.
- `shiftProvisionsTime(state, deltaMs)` moves absolute sidecar anchors when the first onboarding freezes the new world's start. It does not consume clothing or milk freshness.

## Context callbacks

`{now, hasHousing(person), hasResearch(id), available(resource), consume(resource,amount), stockRoom(resource), perResourceLimit, notify(kind,message)}`.

`available` must be central stock **after existing project/market/port reservations but before protected meal reserve**. Passing `logistics.availableGoods` would subtract the meal reserve twice. If absent, the module derives current project/market/port reservations itself. Protected meal stock may be consumed by feeding, but `availableForSpending`/construction/exchange subtract it.

`consume` should call the host's normal material primitive so its bonus ledger remains synchronized. Raw milk is consumed through the module's batch-aware primitive.

## Milk in transport

`withdrawMilk(state, amount)` subtracts central milk and returns `[{amount,centralSeconds}]`. Store this metadata on outbound cargo or local stock. `depositMilk(state, amount, metadata)` adds central milk with those same accumulated freshness ages. A fresh new producer delivery has no metadata. Transit/local storage never calls `advanceMilk`; central residence is accumulated. An external decrease of rawMilk without the batch hook is reconciled FIFO; external increases are treated as new fresh supply. Therefore returning old cargo **must** carry its metadata.

At expiry3×24h central residence, raw milk becomes sour. `context.stockRoom('sourMilk')` limits admission; excess is destroyed, as selected by user9B. The quote does not sell excess or charge a disposal fee.

## Production and local capacity

The module does not increment producer output or send carriers. `productionAssignments(state, building)` returns `[{recipeId,building,workers,inputs,outputs,ratePerWorkerHour}]`. The host owns production progress, input protection, consumption and local pickup. `crewCapacity` returns `{perProduct,total,products}` and `localStorageStatus`/`localStockRoom` calculate200×level per good and300×level shared, including ingredients. `state.provisions.localStock[building]` is available for the host's new multi-good buffers.

Explicit `DEV_RECIPE_RATES` counts **recipe batches**, not every output item; meat batches2→2 run20/h while most initial recipes run40/h. This calibration is a DEV proposal requiring the broad economy simulation before PRE-PROD; it is not a claim of completed50-day balance. Building level currently scales these by1+0.1×(level−1), retaining40,+4 for one-output recipes. Multipliers from residents/Academy/research/Lighthouse remain the host's responsibility.

## Commands

`provisionsAction` returns `null` for another module's command, otherwise `{ok,message,...}`.

- `provisionsFoodSettings {priorities:[id...], enabled:{id:boolean}, limits:{id:quantity|null}}`; limits are remaining quantities, never reset by day/login. `null` means unlimited.
- `provisionsSetWorkers {building,recipeId,workers}` redistributes the already assigned building crew. Reduce a previous allocation before increasing another; one worker is never fractional.
- `provisionsConstructionQuote {foodUnits,mix?}` / `provisionsConstructionSpend`: old foodUnits×6sytość; whole-good editable mix above the protected reserve; return `{materials,satietyRequired,satietyProvided,missingSatiety}`.
- `provisionsExchange {from,to,amount,confirm?}`: same category, value×0.9, floor received goods; `confirm:true` spends and admits the quoted output.

`quoteGoods(resource,quantity,direction)` uses an internal exact base price and rounds the whole monetary quote up, not each unit/tick. `quoteExchange` never converts a small low-value input into an expensive whole good by upward rounding.

## Data scope

This engine doesn't reset any user or cloud save. Legacy food remains readable for compatibility; it has no new production recipe. The root's isolated DEV reset chooses the actual starting stock of the new three test accounts.

## Host integration implemented in v32

`harborlight-v1-development-logistics.js` is a second pure leaf used by the existing logistics event loop. It produces complete recipe batches from **local** inputs, stores recipe progress as a0..1 fraction per recipe/personUID, and never advances a duplicate timer. `developmentProductionJobs`, `progressDevelopmentJob`, `completeDevelopmentJob` are the three host hooks. Fractions survive save/reload and level changes; withdrawing a resident discards that person's unfinished fractions through the residents hook.

`takeLocalGoods`/`putLocalGoods` and `localReceivingRoom` preserve per-good200L/shared300L limits including ingredients and reserve incoming cargo places. The host's real warehouse carriers execute `producerInput` courses from central stock, `producer` courses back to central, and researched `directRoute` courses between producers. Raw-milk local lots and each loaded course keep `centralSeconds`; market lock, port legs and instant collection retain the metadata too. Source stock is removed on pickup, destination receives only on arrival. `building.ready` is a compatibility display mirror of local outputs, never an additional physical stock.

Direct-route discoveries are `state.education.routes[topic]={source,target,product}` plus `state.education.discoveries[topic]===true`. `directRouteCatalog(state)` exposes these exact routes. `developmentRoute {routeId,workers}` and alias `directRoute` require Warehouse5, cap each route at half the full warehouse crew and preserve at least one general carrier. A blocked direct-route carrier waits; general carriers can collect excess output to central. Settings persist in `state.provisions.routeAssignments`.

`logistics.materialIds(state)` returns the20good IDs only for ruleset32; exported legacy `MATERIAL_IDS` remains the original five. Every central/market/port capacity, reservation and saved physical cargo uses the dynamic set. Old bonus stock remains; new v32 reward overflow is pending admission rather than bypassing warehouse capacity. The proposed new warehouse capacity table comes from economy's `warehouseCapacityForLevel(level,{ruleset:32})` and still needs economy review.

Inventory `centralUnreserved` is physical stock minus existing obligations; feeding may use it. `centralAvailable` additionally protects the cheapest one-hour diverse ration in32. `logistics.availableGoods(state,'food')` is a **virtual compatibility budget** in oldFood units (available satiety/6), solely for old mission requirements. Inventory `spendMaterials` converts that legacy cost to a real edible mix; `consumeMaterial` always consumes the named physical resource. Construction, market and harbor use physical quantities and do not sell or reserve virtual Food. New backend helpers `availableGoods`, `spendGoods`, `goodsValue` in the provisions leaf use physical resource IDs; they never expose the virtual mission alias.

Whole transaction prices apply to ordinary harbor quotes and exceptional partial sale loading. Market exchange uses economic value with10%margin. `discardQuote {resource,amount}` is read-only; `discardGoods`/`discard` charge `max(1,ceil(totalValue×10%))` and remove physical goods above reserve. Instant producer collection supports every unlocked output and never collects processor ingredients as finished output. A theatre-audience porter cannot pick up a new course that would finish after the show's start; existing loaded courses finish.

`estimateMaterialsSeconds` has a conservative v32 chain estimate rather than the legacy single-output lookup. It counts input preparation before final crafting and carrier waves, shares the available material pool, and returns infinity for an unavailable chain. It is an estimate rather than a proof that a future staffing/food plan remains feasible.

Behavior checks: `tests/harborlight-v32-provisions.test.mjs` and `tests/harborlight-v32-logistics.test.mjs`, plus the legacy inventory and logistics suites. No claim of browser acceptance, PRE-PROD promotion or a completed50-day balance experiment follows from these Node tests.

`quoteMaterialSpend(state,cost,{physicalFood?})` in inventory validates the complete material/coin operation and chooses legacy mission food only after explicit ingredients. `spendMaterials` uses that same atomic quote; the root must not deduct coins first. Already converted construction can pass `{physicalFood:true}` or retain nonenumerable `cost.foodQuote`. The virtualFood budget counts whole available goods, matching the whole-item payment contract. Warehouse research scales both real capacity limits by1+0.05level; construction research scales actual building work progress and corresponding ETAs, while base snapshots remain unchanged.

## Bounded save representation

Runtime people remain ordinary independent objects. `compactDietHistories(saveClone)` is called only on the serialization clone. It interns shared history suffix nodes in `dietHistories`/`dietHistoryFormat:2`, then writes `peopleFormat:2` tuples with trailing defaults removed and repeated tails in `personProfiles`. Tuple fields are joinedAt, grace delta from joinedAt+24h, equivalent hunger seconds, full-fed seconds capped3600, coverage, cake credit, cake bonus expiry, personal spare clothes, clothing seconds, clothing penalty, history/ref, starter grant. `normalizeProvisions` and every `ensure` path hydrate the tuples before use. Histories have separate mutable rows after hydration; shared save records never share live mutation. Old object records, point histories and array history dictionaries remain readable. History satiety canonicalization is at1e-12 precision and never changes physical stocks.

The full-core24h physical-production/feeding/depletion test and real3600-person clothed/fed/hungry snapshots fit the700000-byte world boundary. Combined maximum population plus proof-rich adventures is a separate whole-world check. Backend mutations that hydrate this representation must compact a clone again before persisting the world.

## No new legacy Food in v32

Legacy `food` remains a readable edible stock and can be transported, consumed or sold. NPC buying and any exchange targeting this legacy resource are rejected in32. New windmills produce `flour`; no recipe produces legacy Food. Old reward definitions `{food:n}` admit `flour:n` instead, preserving6satiety/categoryII, only on reward/bonus paths. `receiveMaterials(...,{bonus:false})` always moves the named physical resource and never performs that conversion.

`inventory.materialReward` applies the typed reward mapping. `grantBonusMaterials` on32 converts and queues all new reward goods in pending admission; it creates no new bonus ledger and cannot bypass capacity. Existing historical bonus cargo/migration alone passes `{preserveLegacyFood:true}` to retain physical legacy Food and its old origin ledger. Host storage settlement admits fitting pending goods. Legacy non32 rewards and NPC rules retain their previous behavior. Regression tests cover these distinctions and protected existing old stock.
