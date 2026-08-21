# RBTC Events Cache API

This is an optional Cloudflare Worker cache layer for the schedule frontend.
It does not replace GAS booking yet. It only proxies and caches `action=events`.

## Safety Model

- The production frontend keeps `EVENTS_CACHE_API_URL = ''` until the Worker is deployed and verified.
- If `EVENTS_CACHE_API_URL` is later enabled and the Worker fails, times out, or returns a non-200 response, the frontend falls back to the existing GAS JSONP endpoint.
- If session cache data is already visible, a failed refresh will not replace the visible calendar with an error.

## Deploy

1. Copy the example config:

   ```sh
   cp api/wrangler.toml.example api/wrangler.toml
   ```

2. Deploy from the `api` directory:

   ```sh
   cd api
   wrangler deploy
   ```

3. Verify the Worker directly:

   ```sh
   curl -i 'https://<worker-url>/events?coach=Victor&week=0'
   curl -i 'https://<worker-url>/events?coach=Victor&week=0'
   ```

   The second request should include `x-rbtc-cache: HIT` when Cloudflare cache is active.

4. Only after verification, set `EVENTS_CACHE_API_URL` in `schedule.js`:

   ```js
   const EVENTS_CACHE_API_URL = 'https://<worker-url>/events';
   ```

5. Push GitHub Pages. The GAS fallback remains active.
