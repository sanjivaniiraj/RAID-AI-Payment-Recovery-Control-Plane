import crypto from 'node:crypto';

const API = 'https://api.razorpay.com/v1';

function auth() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error('Razorpay test credentials are not configured');
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
}

export async function razorpay(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store'
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.error?.description || `Razorpay ${response.status}`);
  return data;
}

export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function fetchPayment(paymentId) {
  return razorpay(`/payments/${encodeURIComponent(paymentId)}`);
}

export async function capturePayment(paymentId, amount, currency = 'INR') {
  return razorpay(`/payments/${encodeURIComponent(paymentId)}/capture`, { method: 'POST', body: { amount: Math.round(amount * 100), currency } });
}

export async function createRetryOrder(amount, receipt) {
  return razorpay('/orders', { method: 'POST', body: { amount: Math.round(amount * 100), currency: 'INR', receipt, payment_capture: 1 } });
}
