import {advisorDevelopmentPlan} from './harborlight-v1-advisor-development-plan.js?v=frontend-v32-24';
// This worker can publish advice only; it has neither a world host nor commands.
self.onmessage=event=>{
 const data=event.data;
 if(data?.protocol!==1||data.type!=='plan')return;
 const envelope={protocol:1,id:data.id,contextKey:data.contextKey,requestRevision:data.requestRevision};
 try{self.postMessage({...envelope,type:'complete',plan:advisorDevelopmentPlan(data.snapshot,data.request)});}
 catch{self.postMessage({...envelope,type:'error',code:'advisor-planning-failed'});}
};
