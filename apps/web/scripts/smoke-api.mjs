import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

// Read-only smoke against the running local NestJS server. No auth or writes.
process.env.API_PROXY_TARGET = 'http://localhost:3000';
const server = await createServer({
  configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
  server: { host: '127.0.0.1', port: 0, hmr: false },
  logLevel: 'silent',
});
try {
  await server.listen();
  const port = server.httpServer.address().port;
  const base = `http://127.0.0.1:${port}/api`;
  const listResponse = await fetch(`${base}/jobs?page=2&limit=5`, {
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(listResponse.status, 200);
  const list = await listResponse.json();
  assert.ok(Array.isArray(list.data));
  assert.equal(list.meta.page, 2);
  assert.equal(list.meta.limit, 5);
  assert.equal(typeof list.meta.total, 'number');
  const detail = await fetch(`${base}/jobs/d19e9185-1715-46a2-94b2-e1e779a1d123`, {
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(detail.status, 200);
  assert.equal(typeof (await detail.json()).data.title, 'string');
  const invalid = await fetch(`${base}/jobs?page=0`, { signal: AbortSignal.timeout(15000) });
  assert.equal(invalid.status, 400);
  const error = await invalid.json();
  assert.equal(error.statusCode, 400);
  assert.ok(error.errors.some((message) => message.startsWith('page:')));
  console.log(
    'PASS: Vite /api -> local BE; jobs list + meta, detail envelope, validation 400 field errors.',
  );
} finally {
  await server.close();
}
