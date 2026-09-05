import { NextResponse } from 'next/server';
import { counterfactual } from '../../../lib/counterfactual';
import { audit } from '../../../lib/supabase';
export async function POST(request){try{const body=await request.json();const result=counterfactual(body.payment||{},body.diagnosis||{});await audit({payment_id:body.payment?.id||null,event_type:'COUNTERFACTUAL_ANALYSIS',actor:'raid-decision-engine',payload:result});return NextResponse.json({ok:true,...result})}catch(e){return NextResponse.json({ok:false,error:e.message},{status:500})}}
