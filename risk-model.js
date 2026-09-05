// Lightweight, deterministic risk model used by the synthetic benchmark.
// It is intentionally explainable: every score is derived from observable payment evidence.
export function scorePayment(payment = {}, events = []) {
  const text = events.map(e => String(e.event || e.type || '')).join(' ').toLowerCase();
  const amount = Number(payment.amount || 0);
  let duplicate = 0.02;
  let confidence = 0.78;
  let state = 'UNKNOWN';
  let evidence = [];

  if (text.includes('authorization') || text.includes('authorized')) {
    duplicate += 0.72; evidence.push('authorization evidence');
  }
  if (text.includes('retry')) { duplicate += 0.12; evidence.push('customer retry'); }
  if (text.includes('timeout')) { confidence -= 0.05; evidence.push('timeout signal'); }
  if (text.includes('failure') || payment.status === 'failed') { state = 'CONFIRMED_FAILURE'; confidence += 0.17; evidence.push('failure evidence'); }
  if (text.includes('late authorization') || (text.includes('authorization') && text.includes('timeout'))) { state = 'LATE_AUTHORIZATION'; confidence = Math.max(confidence, 0.91); }
  if (duplicate >= 0.75) { state = 'DUPLICATE_RISK'; confidence = Math.max(confidence, 0.94); }
  if (text.includes('conflicting') || text.includes('missing final settlement')) { state = 'UNKNOWN'; confidence = 0.70; }
  if (payment.status === 'captured') { state = 'CONFIRMED_SUCCESS'; confidence = 0.99; duplicate = 0.01; }

  duplicate = Math.min(0.99, duplicate);
  confidence = Math.min(0.99, Math.max(0.50, confidence));
  let recommended_action = 'ESCALATE';
  if (state === 'DUPLICATE_RISK') recommended_action = 'DO NOT RETRY';
  else if (state === 'LATE_AUTHORIZATION') recommended_action = 'VERIFY';
  else if (state === 'CONFIRMED_FAILURE' && amount <= 10000) recommended_action = 'RECOVER';
  return { state, confidence, duplicate_charge_risk: duplicate, recommended_action, reason: `Explainable risk score from ${evidence.join(', ') || 'insufficient payment evidence'}.`, evidence };
}
