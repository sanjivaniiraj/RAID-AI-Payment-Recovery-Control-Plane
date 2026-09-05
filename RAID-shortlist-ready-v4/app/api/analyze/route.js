import { NextResponse } from 'next/server';
import { diagnose } from '../../../lib/ai';
import { evaluatePolicy } from '../../../lib/policy';
import { audit, dbConfigured, supabase } from '../../../lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const payment = body.payment || {};
    const events = body.events || [];
    const diagnosis = await diagnose({ payment, events });
    const policy = evaluatePolicy(diagnosis, payment);
    const result = { diagnosis, policy, audit_id: `raid_${payment.id || 'analysis'}_${Date.now()}` };

    await audit({ payment_id: payment.id || null, event_type: 'AI_ANALYSIS', actor: diagnosis.provider, payload: result });
    if (dbConfigured() && payment.id) {
      await supabase('transactions', { method: 'POST', body: {
        payment_id: payment.id, amount: Number(payment.amount || 0), currency: payment.currency || 'INR', status: payment.status || diagnosis.state.toLowerCase(), method: payment.method || null,
        ai_state: diagnosis.state, ai_confidence: diagnosis.confidence, duplicate_risk: diagnosis.duplicate_charge_risk,
        recommended_action: diagnosis.recommended_action, final_action: policy.action, raw_payload: { payment, events }
      }});
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
