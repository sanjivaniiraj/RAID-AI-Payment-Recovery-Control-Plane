import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '../../../../lib/razorpay';
import { audit, dbConfigured, supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature');
  const eventId = request.headers.get('x-razorpay-event-id');

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (dbConfigured() && eventId) {
    const existing = await supabase('webhook_events', { query: `?event_id=eq.${encodeURIComponent(eventId)}&select=id` });
    if (existing?.length) return NextResponse.json({ ok: true, duplicate: true });
  }

  const eventName = payload.event || 'unknown';
  const entity = payload.payload?.payment?.entity || payload.payload?.order?.entity || {};
  const paymentId = entity.id || null;
  const amount = entity.amount ? Number(entity.amount) / 100 : null;

  if (dbConfigured()) {
    await supabase('webhook_events', { method: 'POST', body: { event_id: eventId, event_name: eventName, payload } });
    if (paymentId) {
      await supabase('transactions', { method: 'POST', body: { payment_id: paymentId, amount, currency: entity.currency || 'INR', status: entity.status || eventName.replace('payment.',''), method: entity.method || null, raw_payload: payload } });
    }
  }
  await audit({ payment_id: paymentId, event_type: eventName, actor: 'razorpay-webhook', payload: { event_id: eventId, amount } });
  return NextResponse.json({ ok: true, event: eventName, payment_id: paymentId });
}
