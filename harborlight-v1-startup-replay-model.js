// Pure worker-side counterpart of the first beginWorldExperience settlement.
// No normalization, save compaction, network request or UI action is performed.
import * as Archipelago from './harborlight-v1-archipelago.js?v=frontend-v32-22';
import * as State from './harborlight-v1-state.js?v=frontend-v32-22';
import * as Development from './harborlight-v1-development.js?v=frontend-v32-22';

function actionContext(bundle, world, context, standardAdvertisement = false) {
  const caps = context.capabilities || {};
  const extra = standardAdvertisement ? {...caps,devSimulation:caps.simulatedPayments===true || caps.simulatedAds===true} : {};
  if (!Development.isDevelopment(world)) return extra;
  const worlds = Object.values(bundle.worlds);
  return Development.developmentContext(world,{worlds,
    highestTownhall:Math.max(...worlds.map(item=>item.buildings?.townhall?.level||1)),
    highestAcademyLevel:Math.max(...worlds.map(item=>item.buildings?.academy?.level||0)),
    accountId:context.accountId || 'preview',serverKingdom:world.runtimeKingdomServer===true,
    online:context.online===true,allowAdSimulation:caps.simulatedAds===true,...extra});
}

export function replayStartupPacket({packet,targetNow,realNow,context={},recoverInterruptions=true}) {
  if (!Number.isSafeInteger(targetNow) || targetNow<0 || !Number.isSafeInteger(realNow) || realNow<0) throw new TypeError('A fixed startup clock is required.');
  const bundle = Archipelago.restoreSimulationBundle(packet,{advanceTo:State.advanceTo});
  const world = Archipelago.activeIsland(bundle);
  if (recoverInterruptions) {
    const actionNow = context.simulatedActionClock===true ? targetNow : realNow;
    // Same order as beginWorldExperience: unfinished standard ad, unfinished
    // Theatre ad, then exactly one unchanged archipelago advancement.
    const interrupted = world.commerce?.ad;
    if (interrupted) State.act(world,{type:'cancelRewardedAd',nonce:interrupted.nonce},actionNow,actionContext(bundle,world,context,true));
    if (world.theatre?.pendingUpgrade) State.act(world,{type:'theatreCancelUpgradeAd',nonce:world.theatre.pendingUpgrade.nonce},actionNow,actionContext(bundle,world,context));
  }
  for (const item of Object.values(bundle.worlds)) if (Development.isDevelopment(item)) item.runtimeOnline=item===world && context.online===true;
  Archipelago.advanceArchipelago(bundle,targetNow);
  return Archipelago.captureSimulationBundle(bundle);
}
