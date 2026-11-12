// @vitest-environment node
import { createServer as createHttpServer } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { writeFile, unlink } from 'node:fs/promises';
import { createServer } from 'vite';
import { expect, it, vi } from 'vitest';

it('loads unprefixed env from apps/web and keeps the upstream mock prefix plus /api and query params', async () => {
  const upstream = createHttpServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify({ data: [], meta: { page: 2, limit: 10, total: 0 }, path: request.url }),
    );
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const port = (upstream.address() as AddressInfo).port;
  const mode = `proxy-test-${Date.now()}`;
  const envFile = fileURLToPath(new URL(`../../.env.${mode}`, import.meta.url));
  const configFile = fileURLToPath(new URL('../../vite.config.ts', import.meta.url));
  vi.stubEnv('API_PROXY_TARGET', undefined);
  await writeFile(envFile, `API_PROXY_TARGET=http://127.0.0.1:${port}/mock-project\n`, {
    flag: 'wx',
  });
  const vite = await createServer({
    configFile,
    mode,
    server: { host: '127.0.0.1', port: 0, hmr: false },
    logLevel: 'silent',
  });
  try {
    await vite.listen();
    const address = vite.httpServer?.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/jobs?page=2&search=SQL`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      meta: { page: 2, limit: 10, total: 0 },
      path: '/mock-project/api/jobs?page=2&search=SQL',
    });
    expect(vite.config.server.proxy?.['/socket.io']).toMatchObject({
      target: 'http://localhost:3000',
      ws: true,
    });
  } finally {
    await vite.close();
    upstream.close();
    await unlink(envFile);
    vi.unstubAllEnvs();
  }
}, 15000);
