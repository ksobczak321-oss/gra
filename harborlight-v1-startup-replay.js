// A startup-only coordinator. It never advances a model, saves, or adopts a
// result itself; the caller must recheck its account/version before adoption.
export const STARTUP_REPLAY_PROTOCOL = 1;
export const STARTUP_REPLAY_MIN_GAP_MS = 300_000;
export const STARTUP_REPLAY_RESIDUAL_MS = 5_000;
export const STARTUP_REPLAY_WORKER_URL = new URL('./harborlight-v1-startup-replay-worker.js?v=frontend-v32-20', import.meta.url);

export function startupReplayGap(bundle, targetNow, eligible = () => true) {
  if (!Number.isFinite(targetNow)) return 0;
  return Math.max(0, ...Object.values(bundle?.worlds || {}).filter(eligible).map(world =>
    Number.isFinite(world?.lastSimulatedAt) ? Math.max(0, targetNow - world.lastSimulatedAt) : 0));
}

export function startupReplayIdentityKey(identity) {
  return JSON.stringify(['uid','generation','revision','updateTime','adoptionEpoch','activeIslandId','clockGeneration','clockRevision','clockRate'].map(key => identity?.[key] ?? null));
}

function replayError(code, message = 'Nie udało się rozliczyć nieobecności.') {
  return Object.assign(new Error(message), {code});
}

export function createStartupReplayClient({
  workerFactory = () => new Worker(STARTUP_REPLAY_WORKER_URL, {type:'module',name:'harborlight-startup-replay',credentials:'same-origin'}),
  isCurrent,
} = {}) {
  if (typeof isCurrent !== 'function') throw new TypeError('A live account/version guard is required.');
  let active = null, sequence = 0, disposed = false;
  function finish(job, error, value) {
    if (active !== job) return;
    active = null;
    job.worker.terminate();
    if (error) job.reject(error); else job.resolve(value);
  }
  function cancel(code = 'startup-replay-cancelled') {
    if (active) finish(active, replayError(code));
  }
  function run({packet,targetNow,realNow,identity,context={},recoverInterruptions=true}) {
    if (disposed || active) return Promise.reject(replayError('startup-replay-unavailable'));
    if (!Number.isSafeInteger(targetNow) || targetNow < 0 || !Number.isSafeInteger(realNow) || realNow < 0 || !packet?.bundle || !isCurrent(identity)) {
      return Promise.reject(replayError('startup-state-changed'));
    }
    return new Promise((resolve,reject) => {
      let worker;
      try { worker = workerFactory(); }
      catch { reject(replayError('startup-worker-unavailable')); return; }
      const job = {worker,resolve,reject,id:++sequence,targetNow,identityKey:startupReplayIdentityKey(identity),identity};
      active = job;
      worker.onmessage = event => {
        const data = event.data;
        if (active !== job || data?.id !== job.id) return;
        if (data.protocol !== STARTUP_REPLAY_PROTOCOL || data.targetNow !== job.targetNow || data.identityKey !== job.identityKey) {
          finish(job,replayError('startup-worker-invalid-response')); return;
        }
        if (!isCurrent(identity)) { finish(job,replayError('startup-state-changed')); return; }
        if (data.type === 'error') { finish(job,replayError('startup-worker-failed')); return; }
        if (data.type !== 'complete' || !data.packet?.bundle || !Array.isArray(data.packet.hiddenProperties)) {
          finish(job,replayError('startup-worker-invalid-response')); return;
        }
        finish(job,null,{packet:data.packet,targetNow:job.targetNow});
      };
      worker.onerror = event => { event.preventDefault?.(); finish(job,replayError('startup-worker-failed')); };
      worker.onmessageerror = () => finish(job,replayError('startup-worker-invalid-response'));
      try {
        worker.postMessage({protocol:STARTUP_REPLAY_PROTOCOL,type:'replay',id:job.id,identityKey:job.identityKey,
          packet,targetNow,realNow,context,recoverInterruptions});
      } catch { finish(job,replayError('startup-worker-unavailable')); }
    });
  }
  return {run,cancel,get pending(){return active!==null;},dispose(){disposed=true;cancel();}};
}
