import { replayStartupPacket } from './harborlight-v1-startup-replay-model.js?v=frontend-v32-19';
const PROTOCOL = 1;
self.onmessage = event => {
  const data = event.data;
  if (data?.protocol!==PROTOCOL || data.type!=='replay') return;
  const reply = {protocol:PROTOCOL,id:data.id,targetNow:data.targetNow,identityKey:data.identityKey};
  try {
    const packet = replayStartupPacket(data);
    self.postMessage({...reply,type:'complete',packet});
  } catch {
    // Never send a partially advanced world, private state, or model exception
    // details to a caller that might accidentally adopt/save an incomplete run.
    self.postMessage({...reply,type:'error'});
  }
};
