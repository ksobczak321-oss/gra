# Kingdom v32 — integration contract

Pure module `harborlight-v1-kingdom.js` has no DOM or state/logistics imports.

Exports: `normalizeKingdom(state, raw=state, context={})`, `kingdomAction(state, action, context={})` (`null` for other namespaces), `advanceKingdom(state, elapsedSeconds, context={})`, `nextKingdomEvent(state, context={})`, `kingdomStatus(state, context={})`, `kingdomAllianceLocked(state,context={})`, `kingdomPortfolioQuote(state,requirements,context={})`, `kingdomRecordCoinSpend(state,amount)`, `financialHappinessPenalty(state,person)`, `recoverFinancialHappiness(state,person,points)`.

State is serializable `state.kingdom`, version 32. Share the same sidecar on every world of one account; advance it once per account timestamp. Dates are epoch milliseconds. `advance` receives the interval's start in context.now (default state.worldTimeMs); it calculates the end without changing the global world clock. Loans, receipts, random outcomes and payout claims survive serialization.

Context callbacks are synchronous; a server route must wrap the complete action and affected member worlds in one transaction:

- `accountId`: authenticated account ID; `worlds`: its world array or world map.
- `sharedWallet: {coins}` or `getCoins()`, `spendCoins(amount,meta)->boolean|{ok}`, `grantCoins(amount)`. Ordinary expenses must call `kingdomRecordCoinSpend(state,amount)` to reduce the borrowed-coins ledger first. Material purchases are ordinary expenses; purchased goods are not tainted and may satisfy Kingdom missions.
- `goodsValue(resource)->number`, `availableGoods(world,resource)->number` excluding protected meals and other reservations.
- `spendGoods(world,goods,meta)->boolean|{ok}`, `gainGoods(world,goods,meta)`.
- `alliance: {id,members:[accountId or {id}]}`, `sharedTasks`: global array/map of task objects, `getAccount(id)->{state,worlds,sharedWallet,...callbacks}`. These enable shared rewards and the 72h personal penalty gate.
- `sendSquad(world,{ids,taskId,requestId})->boolean|{ok}`, `handOverProfessor(world,{personId,taskId})->boolean|{ok}`; `militaryCount(world,kind)` and `eligiblePeople(world,kind)` for summaries.
- `estimatePreparation(state,requirements,context)->seconds`; `notify(world,kind,title,message)`.
- `hasLoanDiscovery(world)->boolean` (default academy researched ID `royal-credit` / `kingdom-loans` / `royalCredit`).
- `online` (default false for advance, true for action): only online advances create offers; offers are at most hourly and at least once each active Warsaw day.

Actions: `kingdomOffer` (online generation), `kingdomAccept`, `kingdomDecline`, `kingdomAbandon`, `kingdomInviteAlliance`, `kingdomContribute` (`goods`, `coins`, optional `worldId`), `kingdomDispatchArmy` (`ids`), `kingdomCompleteDevelopment`, `kingdomHandOverProfessor`, `kingdomLend` (fund remaining lending amount), `kingdomDeposit` (accept a deposit offer), `kingdomApplyLoan` (`amount`,`days`), `kingdomRepayLoan` (`amount`, omitted=all), `kingdomClaimRewards`. IDs are `offerId`/`taskId`; every mutating command should supply a unique `requestId`. Reusing one ID with different data is rejected. Commands without request IDs still enforce task/loan status gates.

UI `createKingdomPanel({state,getState,onAction,context,getStatus,language,onClose})` returns `{element,update,destroy}`. `onAction(action)` may be async and returns `{ok,message,...}`; update the backing state from the server response before resolving it. Native forms and confirmations expose the actual amounts, deadlines, party invitation deadline changes, risk and penalties. No real-money integrations.

## Numeric DEV proposal requiring review before PRE-PROD

The user's decision 30 approved a meaningful amount/time test for the loan skipped after forgiveness, but no numeric thresholds. The module's explicitly named `KINGDOM_DEV_BALANCE` proposes: principal at least 10% of the last forgiven principal, minimum 1 coin, and at least 24 elapsed hours before full repayment. Override through `context.balance`. These are DEV-only candidate parameters, not user-approved production values. They prevent an immediately repaid one-coin loan from clearing the forgiveness gate; a simulation/report and review are still required before promotion.

Mission scales, base rewards and preparation estimates are also explicit DEV configuration. Future incomplete recipe/research content is not invented here.

`getStatus()` may return the latest authenticated server `response.status`; this is necessary for another member's global shared tasks, which need not belong to their own world sidecar. Without it the local preview derives the status from its engine/context. Update the status cache on every Kingdom GET/POST before resolving `onAction`.

Lending terms run 12–96 hours from **full funding**, rather than acceptance; the precise automatic return timestamp is stored at funding. This prevents accepting an offer early and receiving full-term interest after transferring capital only near the old return timestamp. Funded tasks free the task slot but remain roster obligations until return. Detached lending records after JSON are canonicalized by ID and returned/claimed status; repeat advances cannot refund principal twice.

## Theatre v32 adapter

Existing `harborlight-v1-theatre.js` retains legacy decoration behavior for earlier rulesets. Ruleset32 additionally exports `theatreShowQuote`, `theatreShowStatus`, `theatreHappinessBonus`, `theatrePorterCanStart`. `theatrePlanShow` takes epoch-ms `startAt`, explicit `personUids`, `audienceScope: home|island`; minimum45minutes,10minute performance,2coins/person paid and roster frozen at planning. Production/study continue. Only local residents actually attending receive +10 for6hours at the end, renewed without stacking. Porters finish current courses and new courses must finish before the performance starts. `theatreCancelShow(showId)` before start returns the frozen cost once; started shows cannot be cancelled. No overlap on one stage.

Theatre DEV balance proposals (not approved numeric production balance):0.05happiness per installed decoration level, capped+10 on the whole island; full refund on cancellation before start. Trusted context may override `decorationPointsPerLevel`. Decoration ads are mandatory at every third target level in32; every fifth target level remains unchanged forlegacy.

Sporadic lending gifts are implemented as a persisted per-offer draw. DEV balance proposes10%probability and a small wood bundle worth about10%of interest(minimum1wood). The same full gift is paid to each frozen participant on return; it is included in the same one-use payout receipt. These frequency/quantity parameters were not specified in source decisions and need balance review. Professor hand-over is alliance-eligible: only own-capacity/training and deposits are explicitly individual underR36. Rescue-gift professors remain ineligible.
