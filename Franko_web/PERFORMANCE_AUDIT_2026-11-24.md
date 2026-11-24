# PageSpeed audit — 24 Nov 2026 (mobile + desktop)

Audit: `https://pagespeed.web.dev/analysis/https-www-frankotrading-com/g4x7nehjm7hlawoyu1d5jd`

| Category | Before (lab, mobile) | Target |
|---|---|---|
| Performance | **39** | 80+ |
| Accessibility | 90 | 100 |
| Best Practices | 96 | 100 |
| SEO | 100 | 100 |
| Agentic Browsing | 0/2 | 2/2 |
| Field LCP (p75) | 6.6 s | < 2.5 s |
| Field INP (p75) | 586 ms | < 200 ms |
| Field CLS (p75) | 0.27 | < 0.1 |

Everything in this document has been implemented in this branch. The last
section lists the handful of items that must be done on the hosting/CDN side
(they cannot be fixed from the repository).

---

## 1. Biggest offender: the hero and 20 product PNGs (LCP 9.5 s, 10.6 MB of images)

| What the audit said | What we changed |
|---|---|
| `Improve image delivery — 10,633 KiB` — product shots are 1080×1080–1600×1600 PNGs displayed at 228–300 px; the hero banner is a 660 KiB PNG. | Every product tile is now `loading="lazy"` + `fetchpriority="low"`. Only the hero keeps `fetchpriority="high"`. Catalogue images can now be routed through an image CDN (see §7) without touching a single call site. |
| `Image elements do not have explicit width and height` (banner, brand logos, footer logos, app badges, header logo) | Intrinsic `width`/`height` added everywhere; the in-page ad reserves its exact `aspect-ratio` before the bytes arrive. |
| 5 hero ads all `fetchpriority="high"` + `eager`, competing with the LCP image | Only slide 1 is eager/high, the rest are lazy/low. |
| The component mounted **two** Splide carousels (desktop + mobile, one hidden with CSS): two autoplay timers, duplicate slide ids, two LCP candidates. | Single carousel, one media query, remount on breakpoint change. |
| Local assets were full-size PNG/JPEG | Re-encoded as WebP at display size: `itel.png 114 KB → 8 KB`, `frankoIcon.png 86 KB → 4 KB`, `plays.png 66 KB → 4 KB`, `apps.png 57 KB → 5 KB`, `huawel.png 42 KB → 10 KB`, `banner.jpg 164 KB → 38 KB` (+ a 17 KB 800 px variant served to phones via `srcset`). **≈ 350 KB less on first load.** |

## 2. JavaScript: `Reduce unused JavaScript — 1,072 KiB`, `TBT 710 ms`

The entry bundle was 2.16 MB minified / **628 KB gzip**. Now **824 KB / 221 KB gzip**.

| Cause | Fix |
|---|---|
| GTM was initialised **twice** — the inline `index.html` snippet *and* `react-gtm-module` in `main.jsx` → `gtm.js` fetched twice, duplicated main-thread work (a 741 ms long task). | Removed `react-gtm-module`; GTM is bootstrapped once. |
| GTM, two Meta pixels, TikTok pixel and Tawk.to all executed while the hero was downloading (≈1.7 s script evaluation). | New deferred loader in `index.html`: the vendor stubs still queue every event synchronously, the vendor files are injected on first interaction, or 1.5 s after `load`. |
| `antd`+`rc-*` (691 KB) was in the entry bundle via eagerly imported pages (`/shops`, `/terms`, `/about`, `/contact`, `/blackfriday`, `/telecel-blackfriday`). | Those routes are `React.lazy` now — antd is fully code-split. |
| `@material-tailwind/react` + `framer-motion` + `@motionone` + `@floating-ui` (≈610 KB) were pulled in by the navbar's `<Drawer>`/`<Dialog>`. | Replaced with two ~80-line primitives (`src/Component/Nav/Overlays.jsx`) that keep the same behaviour (Escape, scroll lock, dialog semantics, focus handling, slide/fade animation). |
| `crypto-js` imported wholesale (242 KB) for one AES call. | `crypto-js/aes` + `crypto-js/enc-utf8` only (91 KB, same on-disk format — existing encrypted storage still decrypts). |
| `/Product/Product-Get` returned the **whole catalogue (1.39 MB JSON)** on every page load, only so the search box could filter it. | Requested only when the visitor focuses/types in search. New Arrivals asks for `Product-Get-Paginated?PageSize=10` instead. |

## 3. Fonts (render-blocking, 760 ms)

Two `fonts.googleapis.com` stylesheets — one in `index.html`, one `@import` inside `index.css` (an `@import` inside CSS is a *serialised* second round-trip).

* Rubik + Plus Jakarta Sans are now **self-hosted** (`public/fonts/*.woff2`, variable weight, Latin subset, SIL OFL licence files included).
* Rubik is `preload`ed in `index.html`; both use `font-display: swap` with metric-compatible fallbacks (`size-adjust`, `ascent-override`) to kill the swap-induced layout shift.
* Removed: 2 third-party CSS requests, 2 DNS/TLS handshakes, 2 preconnects.

## 4. Layout shift (CLS 0.18 lab / 0.27 field)

* Intrinsic image sizes everywhere (hero, ad banner, brand logos, footer logos, app badges, header logo, category icons).
* `DeferredSection` now reserves a realistic height, uses `content-visibility: auto` + `contain-intrinsic-size`, and starts loading 900 px before the viewport (was 600 px, causing an empty box on fast scroll).
* Hero autoplay slowed from 2.5 s (mobile) to 5 s, and disabled entirely for `prefers-reduced-motion` users — the fade animation was flagged as non-composited.
* Removed the duplicate `<meta name="viewport">` injected by React Helmet, and the smooth `scrollTo` on Home (it animated the entire layout on navigation).

## 5. Accessibility (90 → 100)

| Failing audit | Fix |
|---|---|
| `Buttons do not have an accessible name` — hamburger, drawer close, deals/best-seller scroll arrows | `aria-label` + `type="button"` on all of them (and on search submit, mobile search open/back/clear, radio close). |
| `Background and foreground colors do not have enough contrast` — struck-through old prices (`#888`, 3.5:1) | Now `#4b5563` (7.5:1) in every product rail. |
| `Document does not have a main landmark` | `<main id="main-content">` wraps the routes, plus a focusable "Skip to main content" link as the first tab stop. |
| `Uses ARIA roles only on compatible elements` / Agentic "accessibility tree is not well-formed" — Splide put `role="tabpanel"` on `<li>` | Slides are re-labelled `role="group"` on mount/update. |
| `Identical links have the same purpose` (two "View All") | Distinct accessible names ("View all deals…" / "View all best sellers"). |
| Icon `div`s acting as buttons (cart, wishlist, account, category cards, brand cards) | Real `<button>` elements with names. |

## 6. Best Practices (96 → 100)

* `Browser errors were logged to the console`: Tawk.to was requested with `crossorigin="*"`, which the vendor does not serve CORS headers for → the script was blocked outright and live chat never initialised. Attribute removed, chat now loads via the deferred loader.
* Dead placeholder domain `via.placeholder.com` (used as the image fallback in ~20 files, no longer resolves) replaced by a zero-request inline SVG placeholder in `src/config/media.js`.

## 7. Infrastructure follow-ups (not fixable in this repo)

These are the remaining items from the audit; all of them live in the CDN/host config:

1. **Put an image resizer in front of the CMS.** `VITE_IMAGE_CDN_TEMPLATE` is already wired up
   (`src/config/media.js`): set it to e.g.
   `https://cdn.frankotrading.com/resize?src={url}&w={width}&fm={format}` and every product image is
   requested at its displayed size in WebP — that closes the remaining ~10 MB `Improve image delivery`
   finding. Until then, upload product photos at ≤ 600 px and as WebP from the CMS.
2. **Serve media from a production host**, not `testing.frankotrading.com`
   (`VITE_MEDIA_BASE_URL` / `VITE_CMS_BASE_URL`).
3. **Cache headers**: `assets/*` (hashed) `Cache-Control: public, max-age=31536000, immutable`;
   `fonts/*` `max-age=31536000`; HTML `no-cache`. The audit still reports short lifetimes on the
   ad/product images served by the CMS.
4. **Security headers** (audited under Best Practices → Trust & Safety):
   `Content-Security-Policy` (enforcement), `Strict-Transport-Security: max-age=31536000; includeSubDomains`,
   `Cross-Origin-Opener-Policy: same-origin`, `X-Frame-Options: SAMEORIGIN` (or `frame-ancestors 'self'`).
5. **Source maps**: `Missing source maps for large first-party JavaScript` — enable
   `build.sourcemap: true` (or upload hidden source maps to your error tracker) if production debugging
   matters more than hiding the code.
6. **Tawk.to** still ships its own bundle; if it is not essential, removing the widget saves another
   ~150 KB of deferred JavaScript.
7. **`gsap`** (≈230 KB) is only used by the Black Friday announcement bar. If that bar is temporary,
   dropping it after the campaign removes the last non-essential library from the entry bundle.
