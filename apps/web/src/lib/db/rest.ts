// Minimal Supabase (PostgREST) client over fetch: no extra dependency.
// Server-only: uses the service-role key, which must never reach the browser.

const url = () => process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export const dbEnabled = () => Boolean(url() && key());

async function req<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  const res = await fetch(`${url()}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key()!,
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`supabase ${init.method ?? 'GET'} ${path.split('?')[0]} → ${res.status}: ${await res.text()}`);
  return (res.status === 204 || res.status === 201 ? null : await res.json()) as T;
}

/** Reads every row of a table (paged by 1000). */
export async function selectAll<T>(table: string, select = '*'): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const page = await req<T[]>(`${table}?select=${encodeURIComponent(select)}&limit=1000&offset=${from}`);
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

export function upsert(table: string, rows: object[], onConflict: string) {
  if (!rows.length) return Promise.resolve(null);
  return req(`${table}?on_conflict=${onConflict}`, { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: JSON.stringify(rows) });
}

export function remove(table: string, column: string, values: string[]) {
  if (!values.length) return Promise.resolve(null);
  const list = values.map((v) => `"${v.replace(/"/g, '')}"`).join(',');
  return req(`${table}?${column}=in.(${encodeURIComponent(list)})`, { method: 'DELETE', prefer: 'return=minimal' });
}
