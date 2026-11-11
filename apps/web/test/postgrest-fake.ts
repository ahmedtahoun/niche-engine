// A small stand-in for Supabase's REST API (PostgREST) on top of PGlite, a real
// Postgres running inside Node. It understands exactly the requests SupabaseStore
// sends, so the production store, the migrations and the SQL functions are tested
// together without a network or an account.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Row = Record<string, unknown>;

export async function startFakeSupabase(): Promise<{ db: PGlite; fetch: typeof fetch }> {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role;');
  const dir = join(import.meta.dirname, '..', '..', '..', 'supabase', 'migrations');
  for (const f of ['0001_init.sql', '0002_database_first.sql', '0003_product_photos.sql']) await db.exec(readFileSync(join(dir, f), 'utf8'));

  const types = new Map<string, Map<string, string>>();
  async function columns(table: string) {
    if (!types.has(table)) {
      const r = await db.query<{ column_name: string; data_type: string }>(`select column_name, data_type from information_schema.columns where table_name = $1`, [table]);
      types.set(table, new Map(r.rows.map((c) => [c.column_name, c.data_type])));
    }
    return types.get(table)!;
  }
  const ident = (s: string) => {
    if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error(`bad identifier ${s}`);
    return `"${s}"`;
  };

  /** Turns PostgREST filters (col=op.value) into SQL. */
  function where(params: URLSearchParams, args: unknown[]) {
    const out: string[] = [];
    for (const [k, raw] of params) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
      const [op, ...rest] = raw.split('.');
      const val = rest.join('.');
      const col = ident(k);
      const p = () => `$${args.length}`;
      if (op === 'eq') { args.push(val); out.push(`${col} = ${p()}`); }
      else if (op === 'gte') { args.push(val); out.push(`${col} >= ${p()}`); }
      else if (op === 'lt') { args.push(val); out.push(`${col} < ${p()}`); }
      else if (op === 'in') { args.push(val.slice(1, -1).split(',').map((x) => x.replace(/^"|"$/g, ''))); out.push(`${col}::text = any(${p()}::text[])`); }
      else if (op === 'cs') { args.push(val.slice(1, -1).split(',').map((x) => x.replace(/^"|"$/g, ''))); out.push(`${col} @> ${p()}::text[]`); }
      else if (op === 'not' && val === 'is.null') out.push(`${col} is not null`);
      else if (op === 'is' && val === 'null') out.push(`${col} is null`);
      else throw new Error(`fake PostgREST: unsupported filter ${k}=${raw}`);
    }
    return out.length ? ` where ${out.join(' and ')}` : '';
  }

  async function values(table: string, row: Row, args: unknown[]) {
    const cols = await columns(table);
    return Object.entries(row).map(([c, v]) => {
      const t = cols.get(c);
      args.push(t === 'jsonb' && v !== null ? JSON.stringify(v) : v);
      return { col: ident(c), ref: `$${args.length}${t === 'jsonb' ? '::jsonb' : ''}` };
    });
  }

  const json = (body: unknown, status = 200) => new Response(body === undefined ? '' : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  const fake = (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/rest\/v1\//, '');
    const method = init?.method ?? 'GET';
    const prefer = (init?.headers as Record<string, string>)?.Prefer ?? '';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const params = url.searchParams;
    try {
      if (path.startsWith('rpc/')) {
        const fn = ident(path.slice(4));
        const args: unknown[] = [];
        const named = Object.entries(body as Row).map(([k, v]) => { args.push(v !== null && typeof v === 'object' ? JSON.stringify(v) : v); return `${ident(k)} => $${args.length}`; });
        const r = await db.query<{ r: unknown }>(`select ${fn}(${named.join(', ')}) as r`, args);
        return json(r.rows[0].r);
      }
      const table = ident(path);
      const args: unknown[] = [];
      if (method === 'GET') {
        let sql = `select * from ${table}${where(params, args)}`;
        const order = params.get('order');
        if (order) sql += ` order by ${order.split(',').map((o) => { const [c, d] = o.split('.'); return `${ident(c)} ${d === 'desc' ? 'desc' : 'asc'}`; }).join(', ')}`;
        if (params.get('limit')) sql += ` limit ${Number(params.get('limit'))}`;
        if (params.get('offset')) sql += ` offset ${Number(params.get('offset'))}`;
        return json((await db.query(sql, args)).rows);
      }
      const returning = prefer.includes('return=representation') ? ' returning *' : '';
      if (method === 'POST') {
        const rows = (Array.isArray(body) ? body : [body]) as Row[];
        const out: Row[] = [];
        for (const row of rows) {
          const a: unknown[] = [];
          const vals = await values(path, row, a);
          let sql = `insert into ${table} (${vals.map((v) => v.col).join(', ')}) values (${vals.map((v) => v.ref).join(', ')})`;
          const conflict = params.get('on_conflict');
          if (conflict && prefer.includes('resolution=merge-duplicates')) sql += ` on conflict (${conflict.split(',').map(ident).join(', ')}) do update set ${vals.map((v) => `${v.col} = excluded.${v.col}`).join(', ')}`;
          if (conflict && prefer.includes('resolution=ignore-duplicates')) sql += ` on conflict (${conflict.split(',').map(ident).join(', ')}) do nothing`;
          out.push(...(await db.query<Row>(sql + returning, a)).rows);
        }
        return returning ? json(out, 201) : new Response('', { status: 201 });
      }
      if (method === 'PATCH') {
        const vals = await values(path, body as Row, args);
        const sql = `update ${table} set ${vals.map((v) => `${v.col} = ${v.ref}`).join(', ')}${where(params, args)}${returning}`;
        const r = await db.query(sql, args);
        return returning ? json(r.rows) : new Response(null, { status: 204 });
      }
      if (method === 'DELETE') {
        await db.query(`delete from ${table}${where(params, args)}`, args);
        return new Response(null, { status: 204 });
      }
      throw new Error(`unsupported method ${method}`);
    } catch (e) {
      const err = e as { code?: string; message: string };
      return json({ code: err.code, message: err.message }, err.code === '23505' ? 409 : 400);
    }
  }) as typeof fetch;

  return { db, fetch: fake };
}
