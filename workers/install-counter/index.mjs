const siteOrigin = 'https://maydaycom.github.io';
const readCount = 'SELECT count, since FROM install_count WHERE id = 1';
const eventIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowedOrigin = origin === siteOrigin;
    const headers = new Headers({'Cache-Control': 'no-store', Vary: 'Origin'});
    if (allowedOrigin) headers.set('Access-Control-Allow-Origin', siteOrigin);
    const reply = (data, status = 200) => Response.json(data, {status, headers});

    if (new URL(request.url).pathname !== '/install-count') return reply({error: 'not_found'}, 404);
    if (request.method === 'OPTIONS' && allowedOrigin) {
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return new Response(null, {status: 204, headers});
    }
    if (request.method !== 'GET' && request.method !== 'POST') return reply({error: 'method_not_allowed'}, 405);

    try {
      if (request.method === 'GET') return reply(await env.INSTALL_COUNTS.prepare(readCount).first());
      if (!allowedOrigin) return reply({error: 'origin_not_allowed'}, 403);
      if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') ?? '')) {
        return reply({error: 'invalid_content_type'}, 415);
      }
      const body = await request.text();
      if (body.length > 160) return reply({error: 'invalid_event'}, 400);
      const event = (() => {
        try { return JSON.parse(body); } catch { return null; }
      })();
      if (typeof event?.id !== 'string' || !eventIdPattern.test(event.id) ||
          !['factory', 'update'].includes(event.type)) return reply({error: 'invalid_event'}, 400);

      const ip = request.headers.get('CF-Connecting-IP');
      if (ip && env.INSTALL_RATE_LIMIT) {
        const {success} = await env.INSTALL_RATE_LIMIT.limit({key: ip});
        if (!success) return reply({error: 'rate_limited'}, 429);
      }

      const [, snapshot] = await env.INSTALL_COUNTS.batch([
        env.INSTALL_COUNTS.prepare(
          'INSERT INTO install_events (id, type) VALUES (?, ?) ON CONFLICT(id) DO NOTHING',
        ).bind(event.id, event.type),
        env.INSTALL_COUNTS.prepare(readCount),
      ]);
      return reply(snapshot.results[0]);
    } catch (error) {
      console.error('Install count request failed', error);
      return reply({error: 'count_unavailable'}, 503);
    }
  },
};
