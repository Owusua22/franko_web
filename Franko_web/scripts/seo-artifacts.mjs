import { getProductSlug, getBrandSlug } from '../src/utils/productSlug.js';
import { PUBLIC_PATHS, SITE_ORIGIN } from '../src/utils/seoRoutes.mjs';

export const staticPaths = [...PUBLIC_PATHS];
const escapeXml = value => String(value).replace(/[<>&"']/g, c => ({'<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;'}[c]));

/** Generate only real catalogue mappings. Ambiguous names are blockers, not
 * guessed redirects. Previous aliases are retained when an item is renamed. */
export function seoArtifacts(products, brands, previous = {}) {
  const redirects = new Map();
  const paths = [...staticPaths];
  const index = { products: {}, brands: {} };
  for (const [kind, items, slugOf, idOf] of [
    ['product', products.filter(p => Number(p.status) === 1), getProductSlug, p => p.productID || p.Productid],
    ['brand', brands, getBrandSlug, b => b.brandId],
  ]) {
    const seen = new Map();
    for (const item of items) {
      const id = String(idOf(item) || '');
      const slug = slugOf(item);
      if (!id || !slug) throw new Error(`Missing ID or name in ${kind} catalogue`);
      if (seen.has(slug) && seen.get(slug) !== id) {
        throw new Error(`Duplicate ${kind} slug "${slug}". Give variants distinct descriptive names before deployment; IDs will not be appended.`);
      }
      seen.set(slug, id);
      const path = `/${kind}/${slug}`;
      paths.push(path);
      redirects.set(`/${kind}/${id}`, path);
      const oldSlug = previous[`${kind}s`]?.[id];
      if (oldSlug && oldSlug !== slug) redirects.set(`/${kind}/${oldSlug}`, path);
      index[`${kind}s`][id] = slug;
    }
  }
  // A current canonical must never also be a redirect source (rename rollback).
  const canonicalPaths = new Set(paths);
  for (const from of redirects.keys()) if (canonicalPaths.has(from)) redirects.delete(from);
  const uniquePaths = [...canonicalPaths];
  for (const path of uniquePaths) if (path !== '/') redirects.set(`${path}/`, path);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${uniquePaths.map(path => `  <url><loc>${escapeXml(`${SITE_ORIGIN}${path}`)}</loc></url>`).join('\n')}\n</urlset>\n`;
  return { sitemap, index, redirects: [...redirects], paths: uniquePaths };
}

/** Netlify-compatible rules. Deploy BEFORE the SPA fallback. Unknown non-catalogue
 * paths get a real 404; catalogue prefixes retain SPA fallback for newly added API products. */
export function netlifyRedirects(redirects) {
  const rules = redirects.map(([from, to]) => `${from} ${to} 301!`);
  rules.push(
    '/product/* /index.html 200', '/brand/* /index.html 200',
    '/cart/* /index.html 200', '/order-success/* /index.html 200',
    '/agent/* /index.html 200', '/showroom/* /index.html 200',
    ...staticPaths.filter(p => p !== '/').map(p => `${p} /index.html 200`),
    ...['/checkout', '/account', '/order-history', '/wishlist', '/order-received', '/order-cancelled', '/tel-cart', '/tel-checkout'].map(p => `${p} /index.html 200`),
    '/* /404.html 404',
  );
  return rules.join('\n') + '\n';
}

export function nginxRedirects(redirects) {
  return redirects.map(([from, to]) => `location = ${from} { return 301 ${to}$is_args$args; }`).join('\n') + '\n';
}

export function apacheRedirects(redirects) {
  return [
    'RewriteEngine On',
    'ErrorDocument 404 /404.html',
    '# Host-level canonicalization; HTTPS must already be configured.',
    'RewriteCond %{HTTP_HOST} ^frankotrading\\.com$ [NC]',
    'RewriteRule ^ https://www.frankotrading.com%{REQUEST_URI} [R=301,L,NE]',
    ...redirects.map(([from, to]) => `RewriteRule ^${from.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$ ${to} [R=301,L,NE]`),
    'RewriteCond %{REQUEST_FILENAME} -f [OR]',
    'RewriteCond %{REQUEST_FILENAME} -d',
    'RewriteRule ^ - [L]',
    'RewriteRule ^(?:product|brand|cart|order-success|agent|showroom)(?:/|$) /index.html [L]',
    ...[...staticPaths.filter(p => p !== '/'), '/checkout', '/account', '/order-history', '/wishlist', '/order-received', '/order-cancelled', '/tel-cart', '/tel-checkout'].map(p => `RewriteRule ^${p.slice(1)}/?$ /index.html [L]`),
    'RewriteRule ^ - [R=404,L]',
  ].join('\n') + '\n';
}

/** Complete Nginx HTTP server example. The exact 301 locations are included
 * before SPA fallbacks; unknown non-catalogue paths return a real 404. Adjust
 * root/server_name/TLS for the actual host before enabling this config. */
export function nginxServer(redirects) {
  const exact = redirects.map(([from, to]) => `  location = ${from} { return 301 ${to}$is_args$args; }`).join('\n');
  const staticLocations = staticPaths.map(path => `  location = ${path} { try_files /index.html =404; }`).join('\n');
  const privateExact = ['/checkout', '/account', '/order-history', '/wishlist', '/order-received', '/order-cancelled', '/tel-cart', '/tel-checkout', '/promo-phones']
    .map(path => `  location = ${path} { try_files /index.html =404; }`).join('\n');
  return `server {
  listen 80;
  server_name www.frankotrading.com;
  root /var/www/franko/dist;
  index index.html;

${exact}

  location ^~ /assets/ { try_files $uri =404; expires 1y; add_header Cache-Control "public, immutable"; }
  location = /index.html { add_header Cache-Control "no-cache"; }
  location = /sitemap.xml { add_header Cache-Control "no-cache"; }
  location = /404.html { internal; }
  error_page 404 /404.html;

${staticLocations}
${privateExact}
  location ^~ /product/ { try_files $uri /index.html; }
  location ^~ /brand/ { try_files $uri /index.html; }
  location ^~ /cart/ { try_files $uri /index.html; }
  location ^~ /order-success/ { try_files $uri /index.html; }
  location ^~ /agent/ { try_files $uri /index.html; }
  location ^~ /showroom/ { try_files $uri /index.html; }
  location / { try_files $uri $uri/ =404; }
}
`;
}
