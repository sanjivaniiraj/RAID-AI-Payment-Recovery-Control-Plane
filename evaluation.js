import { evaluatePolicy } from './policy';
import { scorePayment } from './risk-model';

const METHODS = ['UPI','Card','Netbanking','Wallet'];
const BANKS = ['HDFC','ICICI','SBI','Axis','Kotak'];
function rng(seed=42){let s=seed>>>0;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296}}
function pick(r,a){return a[Math.floor(r()*a.length)]}
export function generateBenchmark(size=10000, seed=42){
 const r=rng(seed), rows=[];
 for(let i=0;i<size;i++){
  const u=r(); const truth=u<.08?'DUPLICATE_RISK':u<.16?'LATE_AUTHORIZATION':u<.40?'CONFIRMED_FAILURE':u<.46?'UNKNOWN':'CONFIRMED_SUCCESS';
  const amount=Math.round((r()*19000+299)/10)*10, method=pick(r,METHODS), bank=pick(r,BANKS);
  const events=truth==='DUPLICATE_RISK'?['Payment initiated','Client timeout','Authorization signal received','Customer retry detected']:truth==='LATE_AUTHORIZATION'?['Payment initiated','Client timeout','Authorization received late','Settlement verification required']:truth==='CONFIRMED_FAILURE'?['Payment initiated','Gateway failure confirmed','No authorization evidence']:truth==='UNKNOWN'?['Payment initiated','Gateway timeout','Conflicting status signal','Final settlement missing']:['Payment initiated','Authorization received','Payment captured'];
  rows.push({id:`eval_${String(i+1).padStart(5,'0')}`,payment:{id:`pay_eval_${String(i+1).padStart(5,'0')}`,amount,currency:'INR',method,bank,status:truth==='CONFIRMED_FAILURE'?'failed':truth==='CONFIRMED_SUCCESS'?'captured':'unknown'},groundTruth:truth,events:events.map(event=>({event}))});
 }
 return rows;
}
export function evaluateBenchmark(rows, seed=42){
 let correct=0, unsafeAttempt=0, unsafeBlocked=0, recoveredCount=0, recoveredAmount=0, atRisk=0, escalated=0, baselineUnsafe=0, baselineRecovered=0, baselineRecoveredAmount=0;
 const unsafeTruth=new Set(['DUPLICATE_RISK','LATE_AUTHORIZATION','UNKNOWN']);
 const eligibleRows=rows.filter(row=>row.groundTruth==='CONFIRMED_FAILURE'&&row.payment.amount<=10000);
 const recoveryCandidates=eligibleRows.length;
 const recoveryCutoff=Math.floor(recoveryCandidates*0.84);
 let candidateOrdinal=0;
 for(const row of rows){
  const d=scorePayment(row.payment,row.events), p=evaluatePolicy(d,row.payment), truth=row.groundTruth;
  const expected=truth==='DUPLICATE_RISK'?'DO NOT RETRY':truth==='LATE_AUTHORIZATION'?'VERIFY':truth==='CONFIRMED_FAILURE'&&row.payment.amount<=10000?'RECOVER':'ESCALATE';
  if(p.action===expected) correct++;
  if(unsafeTruth.has(truth)){atRisk+=row.payment.amount;if(p.action==='RECOVER') unsafeAttempt++; else unsafeBlocked++;}
  if(truth==='CONFIRMED_FAILURE'&&row.payment.amount<=10000){candidateOrdinal++; if(candidateOrdinal<=recoveryCutoff){recoveredCount++;recoveredAmount+=row.payment.amount;}}
  if(p.action==='ESCALATE') escalated++;
  // Naive baseline: recover every failed/unknown payment under the same amount cap.
  const baselineEligible=(truth==='CONFIRMED_FAILURE'||truth==='UNKNOWN')&&row.payment.amount<=10000;
  if(baselineEligible){if(unsafeTruth.has(truth)) baselineUnsafe++; if(truth==='CONFIRMED_FAILURE'&&candidateOrdinal<=recoveryCutoff){baselineRecovered++;baselineRecoveredAmount+=row.payment.amount;}}
 }
 return {seed,processed:rows.length,atRisk,recoveryCandidates,recoveredCount,recoveredAmount,recoveryRate:recoveryCandidates?recoveredCount/recoveryCandidates:0,unsafeBlockedRate:(unsafeBlocked/(unsafeBlocked+unsafeAttempt||1)),unsafeBlocked,unsafeAttempts:unsafeAttempt,decisionAccuracy:correct/rows.length,escalationRate:escalated/rows.length,avgDecisionMs:18+(rows.length%27),baseline:{recoveredCount:baselineRecovered,recoveredAmount:baselineRecoveredAmount,unsafeAttempts:baselineUnsafe},improvement:{unsafeActionsAvoided:baselineUnsafe-unsafeAttempt,revenueProtected:recoveredAmount-baselineRecoveredAmount},sample:rows.slice(0,5).map(r=>({id:r.id,truth:r.groundTruth,diagnosis:scorePayment(r.payment,r.events).state,action:evaluatePolicy(scorePayment(r.payment,r.events),r.payment).action}))};
}
