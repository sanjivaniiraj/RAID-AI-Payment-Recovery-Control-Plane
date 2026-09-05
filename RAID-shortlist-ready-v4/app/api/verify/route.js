import { NextResponse } from 'next/server';
import { fetchPayment } from '../../../lib/razorpay';
import { audit } from '../../../lib/supabase';

export async function POST(request) {
  try {
    const { payment_id } = await request.json();
    if (!payment_id) return NextResponse.json({ error: 'payment_id is required' }, { status: 400 });
    const payment = await fetchPayment(payment_id);
    await audit({ payment_id, event_type: 'VERIFICATION', actor: 'razorpay-api', payload: { status: payment.status } });
    return NextResponse.json({ ok: true, status: payment.status, payment });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
