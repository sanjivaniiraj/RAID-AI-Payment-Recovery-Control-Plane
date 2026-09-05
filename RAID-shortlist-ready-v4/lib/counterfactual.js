export function counterfactual(payment = {}, diagnosis = {}) {
  const amount = Number(payment.amount || 0);
  const risk = Number(diagnosis.duplicate_charge_risk || 0);
  const confidence = Number(diagnosis.confidence || 0);
  const recoverProbability = diagnosis.state === 'CONFIRMED_FAILURE' ? Math.min(0.92, 0.55 + confidence * 0.35) : 0.12;
  const retryLoss = amount * risk * 0.72;
  const recoverValue = amount * recoverProbability;
  const waitValue = amount * Math.max(0.15, recoverProbability - 0.08);
  const options = [
    { action: 'RECOVER NOW', expected_value: recoverValue - retryLoss, risk_cost: retryLoss, explanation: 'Immediate recovery maximizes speed but pays a duplicate-risk cost.' },
    { action: 'VERIFY FIRST', expected_value: waitValue - retryLoss * 0.15, risk_cost: retryLoss * 0.15, explanation: 'Verification sacrifices some speed to reduce duplicate-charge exposure.' },
    { action: 'ESCALATE', expected_value: amount * 0.05, risk_cost: 0, explanation: 'Human review minimizes autonomous financial risk.' }
  ].map(x => ({ ...x, expected_value: Math.round(x.expected_value), risk_cost: Math.round(x.risk_cost) }));
  options.sort((a,b) => b.expected_value - a.expected_value);
  return { recommended: options[0], options, assumptions: 'Counterfactual values are estimates for decision support; no money is moved.' };
}
