import { NextResponse } from 'next/server';
import { createRetryOrder, capturePayment, fetchPayment } from '../../../lib/razorpay';
import { evaluatePolicy } from '../../../lib/policy';
import { audit, dbConfigured, supabase } from '../../../lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const payment = body.payment || {};
    const diagnosis = body.diagnosis || {};
    const policy = evaluatePolicy(diagnosis, payment);
    if (!policy.allowed || policy.action !== 'RECOVER') {
      return NextResponse.json({ ok: false, blocked: true, policy }, { status: 403 });
    }

    let result;
    const simulation = body.simulation === true || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;
    if (simulation) {
      result = { id: `sim_order_${Date.now()}`, status: 'simulated', amount: Math.round(Number(payment.amount || 0) * 100), currency: payment.currency || 'INR', note: 'Synthetic execution only — no money moved.' };
    } else if (body.razorpay_payment_id) {
      const current = await fetchPayment(body.razorpay_payment_id);
      if (current.status === 'authorized') {
        result = await capturePayment(body.razorpay_payment_id, Number(payment.amount), current.currency || 'INR');
      } else if (current.status === 'failed') {
        result = await createRetryOrder(Number(payment.amount), `raid_retry_${payment.id || body.razorpay_payment_id}`);
      } else {
        return NextResponse.json({ ok: false, blocked: true, reason: `Payment is ${current.status}; recovery stopped.` }, { status: 409 });
      }
    } else {
      result = await createRetryOrder(Number(payment.amount), `raid_retry_${payment.id || Date.now()}`);
    }

    const auditId = `raid_recovery_${payment.id || Date.now()}`;
    const providerReference = result?.id || result?.order_id || result?.payment_id || null;
    if (dbConfigured()) {
      await supabase('recovery_attempts', { method: 'POST', body: { payment_id: payment.id || body.razorpay_payment_id || null, action: result?.status === 'captured' ? 'CAPTURE' : 'CREATE_RETRY_ORDER', status: result?.status || 'created', amount: Number(payment.amount || 0), provider_reference: providerReference, audit_id: auditId, metadata: { policy, result } } });
    }
    await audit({ payment_id: payment.id || body.razorpay_payment_id || null, event_type: 'RECOVERY_EXECUTED', actor: 'policy-approved-execution-adapter', payload: { audit_id: auditId, policy, result } });
    return NextResponse.json({ ok: true, audit_id: auditId, policy, result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
