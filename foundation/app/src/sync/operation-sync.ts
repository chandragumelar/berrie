import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessGrant } from '../auth/contracts';
import { canonical, type AtomicChange } from '../storage/commit';
import type { BerrieDatabase } from '../storage/database';

export interface SyncStatus { pending:number; acknowledged:number; needsReview:number; lastAcknowledgedAt:string|null; checkpointHash:string|null }
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),byte=>byte.toString(16).padStart(2,'0')).join('');
const retryable=new Set(['network_error','service_unavailable']);

/**
 * Sends one immutable receipt at a time.  No business table is changed by an
 * ACK: the sidecar merely records server evidence and leaves receipt/outbox
 * available for audit, recovery and idempotent resend.
 */
export class OperationSync {
 private active=true;
 constructor(private db:BerrieDatabase,private grant:AccessGrant,private token:string,private client:SupabaseClient,private url:string,private key:string) {}
 stop(){this.active=false;}
 private identity(change:AtomicChange){const i=this.grant.identity;return change.storeId===i.storeId&&change.deviceId===i.deviceId&&change.deviceEpoch===i.epoch&&change.actorId===i.actorId;}
 async status():Promise<SyncStatus>{
  const all=await this.db.receipts.toArray(),acks=await this.db.syncAcks.toArray(),issues=await this.db.syncIssues.toArray();
  const ours=all.map(row=>JSON.parse(row.payload) as AtomicChange).filter(change=>this.identity(change));const acknowledged=new Set(acks.map(row=>row.operationId));const blocked=new Set(issues.filter(row=>row.blocked).map(row=>row.operationId));
  const latest=acks.sort((a,b)=>a.sequence-b.sequence).at(-1)??null;
  return {pending:ours.filter(change=>!acknowledged.has(change.operationId)&&!blocked.has(change.operationId)).length,acknowledged:ours.filter(change=>acknowledged.has(change.operationId)).length,needsReview:blocked.size,lastAcknowledgedAt:latest?.committedAt??null,checkpointHash:latest?.checkpointHash??null};
 }
 async flush():Promise<SyncStatus>{
  if(!this.active)throw new Error('Sinkronisasi dihentikan');
  return navigator.locks.request(`berrie-sync:${this.db.name}`,async()=>{
   const receipts=await this.db.receipts.toArray(),acks=new Set((await this.db.syncAcks.toArray()).map(row=>row.operationId)),issues=new Map((await this.db.syncIssues.toArray()).map(row=>[row.operationId,row]));
   const queue=receipts.map(row=>({row,change:JSON.parse(row.payload) as AtomicChange})).filter(({change})=>this.identity(change)&&!acks.has(change.operationId)&&!issues.get(change.operationId)?.blocked).sort((a,b)=>a.change.localSequence-b.change.localSequence);
   for(const item of queue){if(!this.active)break;const outcome=await this.push(item.change).catch(error=>({kind:'retry' as const,code:error instanceof Error?error.message:'network_error'}));
    if(outcome.kind==='ack'){await this.db.transaction('rw',[this.db.syncAcks,this.db.syncIssues],async()=>{await this.db.syncAcks.put(outcome.ack);await this.db.syncIssues.delete(item.change.operationId);});continue;}
    if(outcome.kind==='review'){await this.db.syncIssues.put({operationId:item.change.operationId,code:outcome.code,blocked:true,updatedAt:new Date().toISOString()});break;}
    // Sequence predecessor or transient failure keeps descendants ordered.
    await this.db.syncIssues.put({operationId:item.change.operationId,code:outcome.code,blocked:false,updatedAt:new Date().toISOString()});break;
   }
   return this.status();
  });
 }
 private async push(change:AtomicChange):Promise<{kind:'ack';ack:{operationId:string;hash:string;sequence:number;committedAt:string;checkpointHash:string;acknowledgedAt:string}}|{kind:'retry'|'review';code:string}>{
  const payload=canonical(change),hash=await digest(`berrie-sync-v1:${payload}`);const session=await this.client.auth.getSession();if(!session.data.session?.access_token)return {kind:'retry',code:'auth_pause'};
  let response:Response;try{response=await fetch(`${this.url.replace(/\/$/,'')}/functions/v1/berrie-sync`,{method:'POST',headers:{'Content-Type':'application/json',apikey:this.key,Authorization:`Bearer ${session.data.session.access_token}`,'X-Berrie-Device-Token':this.token},body:JSON.stringify({change,hash,provenance:{grantId:this.grant.grantId,permitSequence:this.grant.permit.payload.sequence,policyVersion:this.grant.permit.payload.policyVersion}})});}catch{return {kind:'retry',code:'network_error'};}
  const body=await response.json().catch(()=>null) as Record<string,unknown>|null;if(response.ok&&body?.status==='ack'&&body.operationId===change.operationId&&body.sequence===change.localSequence&&typeof body.committedAt==='string'&&typeof body.checkpointHash==='string')return {kind:'ack',ack:{operationId:change.operationId,hash,sequence:change.localSequence,committedAt:body.committedAt,checkpointHash:body.checkpointHash,acknowledgedAt:new Date().toISOString()}};
  const code=typeof body?.code==='string'?body.code:`http_${response.status}`;return {kind:response.status>=500||retryable.has(code)||code==='sequence_wait'?'retry':'review',code};
 }
}
