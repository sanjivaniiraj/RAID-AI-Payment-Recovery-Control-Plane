import { NextResponse } from 'next/server';
import { generateBenchmark, evaluateBenchmark } from '../../../lib/evaluation';
import { audit } from '../../../lib/supabase';
export const dynamic='force-dynamic';
export async function POST(request){try{const body=await request.json().catch(()=>({}));const size=Math.min(Math.max(Number(body.size)||10000,100),20000);const seed=Number(body.seed)||42;const rows=generateBenchmark(size,seed);const metrics=evaluateBenchmark(rows);const run_id=`eval_${seed}_${Date.now()}`;await audit({payment_id:null,event_type:'BATCH_EVALUATION',actor:'synthetic-evaluation-engine',payload:{run_id,metrics}});return NextResponse.json({ok:true,run_id,metrics})}catch(e){return NextResponse.json({ok:false,error:e.message},{status:500})}}
