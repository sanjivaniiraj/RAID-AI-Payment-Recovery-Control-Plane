const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function dbConfigured() {
  return Boolean(url && key);
}

export async function supabase(table, { method = 'GET', query = '', body } = {}) {
  if (!dbConfigured()) throw new Error('Supabase is not configured');
  const response = await fetch(`${url}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : 'return=representation'
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store'
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.message || data?.hint || `Supabase ${response.status}`);
  return data;
}

export async function audit(event) {
  if (!dbConfigured()) return null;
  try {
    return await supabase('audit_logs', { method: 'POST', body: event });
  } catch (error) {
    console.error('audit write failed', error);
    return null;
  }
}
