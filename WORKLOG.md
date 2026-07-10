# rbtc-schedule Worklog

## 2026-07-10 23:36 CST - Branded schedule domain and coach router

### Main changes
- Moved the GitHub Pages schedule site to the branded subdomain:
  - New canonical URL: `https://schedule.rbtctw.com`
  - GitHub Pages source remains `weida6610/rbtc-schedule`, branch `main`, path `/`.
- Added GitHub Pages custom-domain configuration:
  - Created root `CNAME` with `schedule.rbtctw.com`.
  - Pushed commit `caa0311 Add schedule custom domain and coach router`.
- Added a dedicated coach routing module:
  - `coach-router.js` centralizes coach config, aliases, canonical URLs, and URL parsing.
  - Existing URLs like `/?coach=Victor` remain supported.
  - Short URLs like `/victor` and `/coach/morgan` redirect through `404.html` to the canonical query format.
  - Added a horizontal coach switcher so users can change coaches without editing the URL manually.
- Updated Wix DNS for `rbtctw.com`:
  - Added CNAME record `schedule.rbtctw.com -> weida6610.github.io`.
  - Kept existing A, `www`, `coach-prep`, `nkt-refer`, TXT, MX, and NS records unchanged.
- Completed GitHub Pages HTTPS setup:
  - GitHub initially had no certificate after reading the CNAME.
  - Reset the Pages custom domain by temporarily removing and re-adding `schedule.rbtctw.com`.
  - Certificate then became `approved`.
  - Enabled `https_enforced`.

### Verification
- Local checks:
  - `coach-router.js` and `schedule.js` syntax checks passed.
  - `git diff --check` passed.
  - Simulated `404.html` route tests passed for `/victor`, `/coach/morgan`, and legacy GitHub Pages project paths.
  - Browser verification confirmed coach switcher updates URL, title, active chip, and canonical URL.
- DNS:
  - `dig CNAME schedule.rbtctw.com +short` returned `weida6610.github.io.`
- GitHub Pages API:
  - `status: built`
  - `cname: schedule.rbtctw.com`
  - `https_certificate.state: approved`
  - `https_enforced: true`
- HTTP/HTTPS:
  - `http://schedule.rbtctw.com/?coach=Victor` redirects to HTTPS.
  - `https://schedule.rbtctw.com/?coach=Victor` returns `HTTP 200`.
  - Chrome loaded `https://schedule.rbtctw.com/?coach=Rick` and showed Rick as the active coach.
  - Chrome loaded `https://schedule.rbtctw.com/victor` and redirected to `https://schedule.rbtctw.com/?coach=Victor`.

### Known issues or notes
- Local `curl` briefly kept an NXDOMAIN cache for `schedule.rbtctw.com` even after public DNS was correct. Browser and `dig` verified the live domain.
- Wix notes DNS changes can take up to 48 hours globally, but the public CNAME was visible immediately during verification.

## 2026-06-07 04:43 CST - Victor Sunday day-off rule

### Main changes
- Changed the GAS calendar rule only for Victor.
- When Victor has an all-day event whose title contains `休` on Sunday, the day
  now uses Victor's existing Sunday shift of `09:00-12:00` instead of being
  treated as a full day off.
- Victor's Monday-Saturday day-off behavior and every other coach's behavior
  remain unchanged.

### Checks run
- Compiled `gas_code.gs` with Node to verify JavaScript syntax.
- Tested three simulated cases:
  - Victor Sunday `休` returns shift `[9, 12]` and is not in `dayOffs`.
  - Victor weekday `休` remains a full day off.
  - Another coach's Sunday `休` remains a full day off.
- Ran `git diff --check`.
- Called the production GAS endpoint after deployment and confirmed Victor's
  Sunday shift is returned as `[9, 12]`.

### Git and deployment
- Implementation commit: `58cd7ee Handle Victor Sunday day-off hours`.
- Pushed to `origin/main`.
- Uploaded Apps Script source with `clasp push`.
- Updated the existing production Web App deployment to version `@10` with
  description `Victor Sunday day-off hours`.
- The production deployment URL did not change.

### Known issues or next steps
- No known issue from this change.
- Future coach-specific exceptions must be explicitly scoped so they do not
  alter other coaches' calendar rules.

## 2026-05-27 08:12 CST - RBTC shop GitHub Pages embed

### Main changes
- Added the RBTC shop / membership guide as a static GitHub Pages path under `shop/`.
- Published the page through the existing `weida6610/rbtc-schedule` repo instead of creating a separate repo.
- Added `shop/index.html`, `shop/style.css`, `shop/wix-embed.html`, and image assets.
- Added `.gitignore` to avoid committing macOS `.DS_Store` metadata.
- Confirmed the Wix `/shop` page can embed `https://weida6610.github.io/rbtc-schedule/shop`.

### Wix embed findings
- The existing `/coach` page uses a Wix `HtmlComponent` / iframe pattern, so `/shop` should follow the same approach.
- Fixed the first major issue by increasing the iframe height enough to avoid inner iframe scrolling.
- After further checks, the final practical approach is to set different iframe heights per breakpoint:
  - Desktop: about `7000px`.
  - Mobile: about `6550px`.
- This prioritizes smooth page scrolling. A small amount of bottom whitespace is acceptable and preferable to iframe scroll handoff.

### Checks run
- Verified local static page at `/shop/` with all 12 images loaded.
- Pushed GitHub Pages changes and confirmed the public URL returned `200`.
- Compared Wix `/shop` and `/coach` iframe structure.
- Measured iframe height versus embedded page height at multiple widths:
  - Mobile widths: `360`, `375`, `390`, `393`, `402`, `414`, `430`, `599`.
  - Desktop/tablet widths: `768`, `1024`, `1280`, `1366`, `1440`, `1512`, `1728`.
- Confirmed footer visibility was not the final root cause once hidden; fixed-height iframe behavior across responsive widths was the key factor.

### Known issues / next steps
- Fixed-height iframes cannot be perfectly flush at every viewport width.
- If exact no-scroll/no-blank behavior is ever required, implement dynamic iframe height with Wix Velo and `postMessage` from the GitHub Pages content.
- Current settings are considered good enough because scroll feel is the priority.
