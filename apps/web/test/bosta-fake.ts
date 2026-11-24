// A fake Bosta API for tests: the few endpoints we call, with the reply shapes of Bosta's live API
// (the same ones shop.wheretospot.com reads). It records every request so tests can check payloads.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface FakeBosta {
  base: string;
  requests: { method: string; path: string; auth: string; body: unknown }[];
  /** tracking → current state code (GET /deliveries/business/:tracking); missing = 404 (deleted). */
  states: Map<string, number>;
  close: () => Promise<void>;
}

const d = (zoneId: string, zoneName: string, zoneOtherName: string, districtId: string, districtName: string, districtOtherName: string) =>
  ({ zoneId, zoneName, zoneOtherName, districtId, districtName, districtOtherName, pickupAvailability: true, dropOffAvailability: true });

/** A slice of Bosta's real /cities/getAllDistricts reply. */
export const AREAS = {
  success: true,
  message: 'Districts fetched successfully',
  data: [
    {
      cityId: 'FceDyHXwpSYYF9zGW', cityName: 'Cairo', cityOtherName: 'القاهره', cityCode: 'EG-01', pickupAvailability: true, dropOffAvailability: true,
      districts: [
        d('zNasr', 'Nasr City', 'مدينه نصر', 'dNasr', 'Nasr City', 'مدينه نصر'),
        d('zNasr', 'Nasr City', 'مدينه نصر', 'dTawfiq', 'El-Tawfiq', 'التوفيق'),
        d('zMaadi', 'Maadi', 'المعادي', 'dMaadi', 'Maadi', 'المعادي'),
        d('zMaadi', 'Maadi', 'المعادي', 'dNewMaadi', 'New Maadi', 'المعادي الجديده'),
        d('zZam', 'Zamalek', 'الزمالك', 'dZam', 'Zamalek', 'الزمالك'),
        { ...d('zX', 'Closed', 'مقفول', 'dClosed', 'Closed Area', 'منطقه مقفوله'), dropOffAvailability: false },
      ],
    },
    {
      cityId: '0064Qb0OgcA', cityName: 'Giza', cityOtherName: 'الجيزه', cityCode: 'EG-02', pickupAvailability: true, dropOffAvailability: true,
      districts: [d('zZayed', 'Sheikh Zayed', 'الشيخ زايد', 'dZayed', 'Sheikh Zayed', 'الشيخ زايد')],
    },
  ],
};

export const PDF = Buffer.from('%PDF-1.4 fake waybill').toString('base64');

export async function startFakeBosta(port = 0): Promise<FakeBosta> {
  const requests: FakeBosta['requests'] = [];
  const states = new Map<string, number>();
  let n = 7000000;
  const server: Server = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : undefined;
    const url = new URL(req.url ?? '/', 'http://x');
    requests.push({ method: req.method ?? '', path: url.pathname + url.search, auth: String(req.headers.authorization ?? ''), body });
    const send = (status: number, json: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(json)); };
    if (req.method === 'GET' && url.pathname === '/cities/getAllDistricts') return send(200, AREAS);
    if (req.headers.authorization !== 'key-sakina' && req.headers.authorization !== 'key-shared') return send(401, { success: false, message: 'Unauthorized' });
    if (req.method === 'POST' && url.pathname === '/deliveries' && url.searchParams.get('apiVersion') === '1') {
      const tracking = String(++n);
      states.set(tracking, 10);
      return send(200, { success: true, message: 'Delivery created', data: { _id: `id${tracking}`, trackingNumber: tracking, state: { code: 10, value: 'Pickup requested' } } });
    }
    const view = url.pathname.match(/^\/deliveries\/business\/([^/]+)$/);
    if (req.method === 'GET' && view) {
      const code = states.get(decodeURIComponent(view[1]));
      if (code === undefined) return send(404, { success: false, message: 'Delivery not found' });
      return send(200, { success: true, data: { trackingNumber: view[1], state: { code, ...(code === 47 ? { exception: { reason: 'Customer not answering' } } : {}) } } });
    }
    if (req.method === 'POST' && url.pathname === '/deliveries/mass-awb') return send(200, { success: true, data: PDF });
    send(404, { success: false, message: 'no such endpoint in the fake' });
  });
  await new Promise<void>((r) => server.listen(port, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, requests, states, close: () => new Promise((r) => server.close(() => r())) };
}
