const MAX_RETRY_AMOUNT = Number(process.env.MAX_RETRY_AMOUNT_INR || 10000);
const MIN_CONFIDENCE = Number(process.env.MIN_RECOVERY_CONFIDENCE || 0.85);
const MAX_DUPLICATE_RISK = Number(process.env.MAX_DUPLICATE_RISK || 0.20);

export function evaluatePolicy(diagnosis, payment = {}) {
  const confidence = Number(diagnosis.confidence || 0);
  const duplicateRisk = Number(diagnosis.duplicate_charge_risk || 0);
  const amount = Number(payment.amount || 0);

  if (duplicateRisk > 0.80 || diagnosis.state === 'DUPLICATE_RISK') {
    return { allowed: false, action: 'DO NOT RETRY', reason: 'Authorization or duplicate-charge evidence makes retry unsafe.' };
  }
  if (diagnosis.state === 'UNKNOWN' || confidence < MIN_CONFIDENCE) {
    return { allowed: false, action: 'ESCALATE', reason: 'Evidence/confidence is insufficient for autonomous money movement.' };
  }
  if (diagnosis.state === 'LATE_AUTHORIZATION' || diagnosis.recommended_action === 'VERIFY') {
    return { allowed: false, action: 'VERIFY', reason: 'Payment state must be verified before any recovery action.' };
  }
  if (diagnosis.recommended_action === 'RECOVER') {
    if (amount > MAX_RETRY_AMOUNT) {
      return { allowed: false, action: 'ESCALATE', reason: `Amount exceeds bounded recovery limit of ₹${MAX_RETRY_AMOUNT.toLocaleString('en-IN')}.` };
    }
    if (duplicateRisk > MAX_DUPLICATE_RISK) {
      return { allowed: false, action: 'ESCALATE', reason: 'Duplicate-charge risk exceeds the recovery threshold.' };
    }
    if (confidence < MIN_CONFIDENCE) {
      return { allowed: false, action: 'ESCALATE', reason: 'Recovery confidence is below the configured threshold.' };
    }
    return { allowed: true, action: 'RECOVER', reason: 'Confirmed failure meets all bounded recovery conditions.' };
  }
  return { allowed: false, action: 'ESCALATE', reason: 'No safe autonomous action matched the policy.' };
}
