const fallback = ({ payment = {}, events = [] }) => {
  const amount = Number(payment.amount || 0);
  const eventNames = events.map(e => String(e.event || e.type || '')).join(' ').toLowerCase();
  if (eventNames.includes('authorized') && eventNames.includes('failed')) {
    return { state: 'LATE_AUTHORIZATION', confidence: 0.92, duplicate_charge_risk: 0.86, recommended_action: 'VERIFY', reason: 'Authorization evidence exists alongside a failure/timeout signal.' };
  }
  if (payment.status === 'authorized') {
    return { state: 'LATE_AUTHORIZATION', confidence: 0.94, duplicate_charge_risk: 0.88, recommended_action: 'VERIFY', reason: 'Payment is authorized; verification should precede any retry.' };
  }
  if (payment.status === 'failed') {
    return { state: 'CONFIRMED_FAILURE', confidence: 0.97, duplicate_charge_risk: 0.03, recommended_action: amount <= 10000 ? 'RECOVER' : 'ESCALATE', reason: 'Payment is marked failed and no authorization evidence was supplied.' };
  }
  return { state: 'UNKNOWN', confidence: 0.70, duplicate_charge_risk: 0.40, recommended_action: 'ESCALATE', reason: 'Insufficient payment evidence for safe automation.' };
};

export async function diagnose(input) {
  if (!process.env.OPENAI_API_KEY) return { ...fallback(input), provider: 'deterministic-fallback' };

  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  const system = `You are RAID, a payment recovery risk engine. Analyze payment events. Never invent facts. Return ONLY JSON with keys: state, confidence (0..1), duplicate_charge_risk (0..1), recommended_action (VERIFY|RECOVER|ESCALATE|DO NOT RETRY), reason. Favor safety over recovery. AI recommends; a separate policy engine has final authority.`;
  const user = JSON.stringify(input);
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0, text: { format: { type: 'json_object' } } })
  });
  if (!response.ok) throw new Error(`AI provider error ${response.status}`);
  const data = await response.json();
  const text = data.output_text || data.output?.flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text;
  if (!text) throw new Error('AI provider returned no structured output');
  return { ...JSON.parse(text), provider: 'openai' };
}
