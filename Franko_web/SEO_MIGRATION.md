# Storefront fixes and SEO migration

## What changed

- **Duplicate cart additions:** product surfaces add one unit only. If the product is already in the active cart, or the first add is still in flight, the customer sees:
  > Item already added to the cart. Update quantity in the cart page.
  Quantity controls on the cart page remain unchanged.
- **Orders:** `/order-history` shows a visible loader while the route or customer orders are loading, then shows orders, an empty state, a sign-in prompt, or a retryable error. Orders and session caches are scoped to the current customer.
- **Automatic product refresh:** the existing product API is refreshed every five minutes while the tab is visible, and on focus/online/visibility after a 60-second throttle. Category, brand, showroom, and homepage product surfaces subscribe to the refresh. Existing products stay visible during a temporary API failure.
- **Canonical/robots tags:** one route-aware controller owns the only `robots` and `canonical` tags. Public static routes are indexable; filtered/search/paginated variants are `noindex, follow` and canonicalize to the clean route; private transactional routes are `noindex, nofollow` with no public canonical; unknown/unresolved routes are `noindex` without a guessed canonical.
- **404s:** unknown routes render a helpful not-found page instead of redirecting home. Generated host artifacts map unknown non-catalogue paths to a real HTTP 404 where the host supports it.
- **Sitemap/redirects:** the default postbuild generator reads the live product and brand APIs. It refuses empty or ambiguous catalogues, emits name-only canonical URLs, retains rename aliases, and generates host redirect/404 artifacts.

## Local commands

Run from `Franko_web/`:

```bash
npm ci --legacy-peer-deps
npm test
npm run dev
```

Production build with the live API:

```bash
npm run build
```

Offline preview using the checked-in snapshot:

```bash
SEO_SOURCE=snapshot npm run build
```

`SEO_PRODUCTS_FILE` and `SEO_BRANDS_FILE` can point to complete JSON array exports. `SEO_STATIC_ONLY=1` is a static-route preview only and must not be deployed as the production migration.

## Scheduled sitemap refresh

A workflow template is included at `Franko_web/seo-refresh.yml`. Copy it to `.github/workflows/seo-refresh.yml` on the default branch to run every six hours and on demand. It restores the previous rename archive, tests the app, builds against the live API, saves the updated archive, and uploads `dist/` as an artifact.

To activate automatic publishing, configure these repository secrets:

- `VITE_LAMBDA_BASE_URL`
- `VITE_LAMBDA_HEADER_NAME` if different from the app default
- `VITE_LAMBDA_HEADER_VALUE` if different from the app default
- `VITE_SECRET_KEY` for the production frontend storage key
- `SEO_DEPLOY_COMMAND`: a command that publishes `Franko_web/dist` to the actual host

Examples for `SEO_DEPLOY_COMMAND` (choose the one matching the host, and install/configure its CLI in the workflow first):

```bash
# Netlify
npx netlify-cli deploy --prod --dir=dist

# A server reachable over SSH
rsync -az --delete dist/ user@server:/var/www/franko/dist/
```

Without `SEO_DEPLOY_COMMAND`, the workflow builds and uploads an artifact but does not publish it. The storefront product refresh works independently of this workflow; the sitemap only updates on a deployed rebuild.

## Generated artifacts

- `dist/sitemap.xml`: static routes plus active live products and brands.
- `dist/_redirects`: Netlify-compatible 301s, SPA fallbacks, and `/404.html 404`.
- `dist/_headers`: basic security/cache headers.
- `dist/404.html`: noindex not-found document.
- `dist/deployment/.htaccess`: Apache rewrite/404 rules.
- `dist/deployment/seo-redirects.nginx.conf`: exact Nginx 301 locations.
- `dist/deployment/nginx.conf`: complete Nginx HTTP server example with 301s, SPA fallbacks, cache rules, and a real 404. Adjust `server_name`, `root`, and TLS before use.
- `dist/seo-index.json` and `seo/previous-index.json`: public ID-to-slug rename archive. Retain across releases; the workflow caches/uploads it.

The Nginx example and Apache rules must be installed on the actual host. A React navigation or `<link rel="canonical">` is not an HTTP 301. Unknown `/product/...` and `/brand/...` paths still use SPA fallback so newly added API products work before the next sitemap rebuild; invalid dynamic slugs render noindex, but a host/API-aware rule is needed to return a hard 404 for those paths.

## Search Console follow-up

The supplied counts are symptoms, not a list of affected URLs. Export the affected URLs from Search Console and verify each group after deployment:

| Report | Implemented mitigation | Required live validation |
| --- | --- | --- |
| Page with redirect (507) | Exact 301 mappings for legacy IDs, trailing slashes, and retained renames | `curl -I` returns one 301 to the canonical URL, then 200; no chains/loops |
| Soft 404 (15) | Helpful noindex not-found UI; host artifacts return 404 for unknown non-catalogue paths | Unknown URLs return HTTP 404; review invalid product/brand slugs separately |
| Duplicate without user-selected canonical (14) | One route-owned canonical; query variants canonicalize to clean routes | Rendered HTML has exactly one expected canonical |
| Crawled – currently not indexed (42) | Cleaner catalogue discovery, canonicals, and internal links | Improve unique product content, availability, images, and crawl demand; no indexing guarantee |
| Google chose a different canonical (1) | Consistent canonical, sitemap, redirects, and internal links | Compare Google’s selected canonical with the emitted tag and server redirects |
| Alternate page with proper canonical | Expected consolidation for variants | Usually no action if the canonical target is correct |
| Excluded by `noindex` (1,076) | Removed blanket/conflicting metadata; private pages remain intentionally noindex | Confirm the affected URLs are not public pages that should index; check both meta robots and `X-Robots-Tag` headers |

After deployment:

1. Verify HTTPS/www canonicalization at the host/CDN.
2. Test legacy product/brand URLs, trailing slashes, query strings, deep-link refreshes, and unknown URLs.
3. Confirm `robots.txt` and `sitemap.xml` are reachable and contain only canonical public URLs.
4. Submit `https://www.frankotrading.com/sitemap.xml` in Search Console.
5. Use URL Inspection on representative affected URLs and request indexing only after the live response is correct.
6. Monitor the reports over subsequent crawls. Search engines decide whether and when to index; this change does not guarantee removal of every report entry.

## Verification completed in this workspace

- Node regression tests cover cart duplication/race guards, cart quantity updates, catalogue cache refresh, slug resolution, SEO route policy, and host artifact ordering.
- Mocked browser QA covers duplicate add messaging, Orders loader/order display, unknown-route UI, and query-route robots/canonical behavior.
- An offline snapshot build generates the sitemap and host artifacts successfully.

The live API, production hosting, deployed HTTP status codes, and Search Console recrawl were not available for validation here.
