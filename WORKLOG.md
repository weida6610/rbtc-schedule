# rbtc-schedule Worklog

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
