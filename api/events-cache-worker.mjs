const GAS_EVENTS_URL = 'https://script.google.com/macros/s/AKfycbwLjltlY_ueiQqmix6CFMvsRhuKHLZqM1xk4jZMxvLQSDVb5QXe32Y1X2UBg5SzdskJ/exec';
const CACHE_SECONDS = 45;
const ALLOWED_COACHES = new Set(['Victor', 'Apo', 'Morgan', 'Adam', 'Rick', 'Verna']);
const ALLOWED_ORIGINS = new Set([
  'https://schedule.rbtctw.com',
  'https://weida6610.github.io'
]);

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, request, {
        status: 405,
        cacheStatus: 'BYPASS'
      });
    }

    const requestUrl = new URL(request.url);
    if (requestUrl.pathname !== '/events') {
      return jsonResponse({ error: 'Not found' }, request, {
        status: 404,
        cacheStatus: 'BYPASS'
      });
    }

    const coach = requestUrl.searchParams.get('coach') || '';
    const week = normalizeWeek(requestUrl.searchParams.get('week'));

    if (!ALLOWED_COACHES.has(coach)) {
      return jsonResponse({ error: `Unknown coach: ${coach}` }, request, {
        status: 400,
        cacheStatus: 'BYPASS'
      });
    }

    const cache = caches.default;
    const cacheKey = new Request(`https://rbtc-events-cache.internal/events?coach=${encodeURIComponent(coach)}&week=${week}`);
    const cached = await cache.match(cacheKey);
    if (cached) {
      return withCors(cached, request, 'HIT');
    }

    const startedAt = Date.now();
    const upstreamUrl = new URL(GAS_EVENTS_URL);
    upstreamUrl.searchParams.set('action', 'events');
    upstreamUrl.searchParams.set('coach', coach);
    upstreamUrl.searchParams.set('week', String(week));

    let upstream;
    try {
      upstream = await fetch(upstreamUrl.toString(), {
        cf: { cacheTtl: 0, cacheEverything: false }
      });
    } catch (err) {
      return jsonResponse({ error: 'Upstream unavailable' }, request, {
        status: 502,
        cacheStatus: 'MISS',
        upstreamMs: Date.now() - startedAt
      });
    }

    if (!upstream.ok) {
      return jsonResponse({ error: `Upstream ${upstream.status}` }, request, {
        status: 502,
        cacheStatus: 'MISS',
        upstreamMs: Date.now() - startedAt
      });
    }

    let data;
    try {
      data = await upstream.json();
    } catch (err) {
      return jsonResponse({ error: 'Invalid upstream JSON' }, request, {
        status: 502,
        cacheStatus: 'MISS',
        upstreamMs: Date.now() - startedAt
      });
    }

    if (data && data.error) {
      return jsonResponse(data, request, {
        status: 502,
        cacheStatus: 'MISS',
        upstreamMs: Date.now() - startedAt
      });
    }

    const response = jsonResponse(data, request, {
      status: 200,
      cacheStatus: 'MISS',
      upstreamMs: Date.now() - startedAt
    });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }
};

function normalizeWeek(value) {
  const week = Number.parseInt(value || '0', 10);
  if (Number.isNaN(week)) return 0;
  return Math.min(Math.max(week, 0), 3);
}

function jsonResponse(body, request, options = {}) {
  const headers = new Headers(corsHeaders(request));
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', `public, max-age=${CACHE_SECONDS}`);
  headers.set('x-rbtc-cache', options.cacheStatus || 'MISS');
  if (options.upstreamMs !== undefined) headers.set('x-rbtc-upstream-ms', String(options.upstreamMs));

  return new Response(JSON.stringify(body), {
    status: options.status || 200,
    headers
  });
}

function withCors(response, request, cacheStatus) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(request)).forEach(([key, value]) => headers.set(key, value));
  headers.set('x-rbtc-cache', cacheStatus);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://schedule.rbtctw.com';
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'vary': 'Origin'
  };
}
