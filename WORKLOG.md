# rbtc-schedule Worklog

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
