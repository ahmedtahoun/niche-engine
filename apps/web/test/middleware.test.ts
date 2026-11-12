// Each live domain shows only its own store; localhost still opens every store by path.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDomains, routeFor } from '../src/lib/routing.ts';

const ids = ['umrah', 'coffee'];
const domains = parseDomains('sakinaeg.com=umrah,www.sakinaeg.com=umrah,cairoroast.com=coffee,www.cairoroast.com=coffee');
const go = (host: string, pathname: string) => routeFor({ host, pathname, ids, domains });

test('sakinaeg.com/coffee and cairoroast.com/umrah are not found; each domain serves its own store', () => {
  assert.deepEqual(go('sakinaeg.com', '/coffee'), { kind: 'rewrite', path: '/umrah/not-found', dropQuery: true });
  assert.deepEqual(go('sakinaeg.com', '/coffee/p/bonds-amber'), { kind: 'rewrite', path: '/umrah/not-found', dropQuery: true });
  assert.deepEqual(go('www.cairoroast.com', '/umrah'), { kind: 'rewrite', path: '/coffee/not-found', dropQuery: true });
  assert.deepEqual(go('cairoroast.com', '/'), { kind: 'rewrite', path: '/coffee' });
  assert.deepEqual(go('cairoroast.com', '/p/bonds-amber'), { kind: 'rewrite', path: '/coffee/p/bonds-amber' });
  assert.deepEqual(go('cairoroast.com', '/coffee/p/bonds-amber'), { kind: 'redirect', path: '/p/bonds-amber' }, 'one address per page');
  assert.deepEqual(go('cairoroast.com', '/coffee'), { kind: 'redirect', path: '/' });
  assert.deepEqual(go('sakinaeg.com', '/'), { kind: 'rewrite', path: '/umrah' });
});

test('localhost still opens both stores by path (development)', () => {
  assert.deepEqual(go('localhost:3100', '/coffee'), { kind: 'next' });
  assert.deepEqual(go('localhost:3100', '/umrah/p/x'), { kind: 'next' });
  assert.deepEqual(go('localhost:3100', '/'), { kind: 'rewrite', path: '/umrah' });
});
