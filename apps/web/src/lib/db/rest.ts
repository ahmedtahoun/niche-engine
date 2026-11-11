// Minimal Supabase (PostgREST) client over fetch: no extra dependency, and it only
// needs outbound HTTPS (shared hosting often blocks the Postgres ports).
// Server-only: uses the service-role key, which must never reach the browser.

const url = () => process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export const dbEnabled = () => Boolean(url() && key());

export class DbError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(message: string, status: number, body: string) { super(message); this.status = status; this.body = body; }
}

interface Req extends Omit<RequestInit, 'body'> { prefer?: string; body?: unknown }

export async function req<T>(path: string, init: Req = {}): Promise<T> {
  const { prefer, body, ...rest } = init;
  const res = await fetch(`${url()}/rest/v1/${path}`, {
    ...rest,
    headers: {
      apikey: key()!,
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  if (!res.ok) throw new DbError(`supabase ${init.method ?? 'GET'} ${path.split('?')[0]} → ${res.status}: ${text.slice(0, 300)}`, res.status, text);
  return (text ? JSON.parse(text) : null) as T;
}

/** PostgREST filter value for eq/gte/...: encoded so commas and Arabic text are safe. */
export const v = (x: string | number) => encodeURIComponent(String(x));
/** PostgREST array literal for `cs` (contains): {"a"} */
export const arr = (x: string) => encodeURIComponent(`{"${x.replace(/["\\]/g, '')}"}`);
/** PostgREST list for `in`: ("a","b") */
export const list = (xs: string[]) => encodeURIComponent(`(${xs.map((x) => `"${x.replace(/["\\]/g, '')}"`).join(',')})`);

/** Reads every matching row (paged by 1000). */
export async function selectAll<T>(table: string, query = ''): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const page = await req<T[]>(`${table}?select=*${query ? `&${query}` : ''}&limit=1000&offset=${from}`);
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

export function upsert(table: string, rows: object[], onConflict: string) {
  if (!rows.length) return Promise.resolve(null);
  return req(`${table}?on_conflict=${onConflict}`, { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: rows });
}

/** Plain insert. Returns false when a unique key already exists (HTTP 409). */
export async function insertOnce(table: string, row: object): Promise<boolean> {
  try {
    await req(table, { method: 'POST', prefer: 'return=minimal', body: row });
    return true;
  } catch (e) {
    if (e instanceof DbError && e.status === 409) return false;
    throw e;
  }
}

export const rpc = <T>(fn: string, args: object) => req<T>(`rpc/${fn}`, { method: 'POST', body: args });
