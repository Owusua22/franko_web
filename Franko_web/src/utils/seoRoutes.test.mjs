import test from 'node:test';
import assert from 'node:assert/strict';
import { routeSeo, SITE_ORIGIN } from './seoRoutes.mjs';
import { netlifyRedirects, nginxServer, apacheRedirects } from '../../scripts/seo-artifacts.mjs';

test('public static routes are indexable with clean canonicals', () => {
  assert.deepEqual(routeSeo('/phones', ''), { robots: 'index, follow', canonical: `${SITE_ORIGIN}/phones` });
  assert.deepEqual(routeSeo('/', ''), { robots: 'index, follow', canonical: `${SITE_ORIGIN}/` });
});

test('filtered/search/paginated variants are noindex and canonicalize to the clean route', () => {
  for (const search of ['?sort=price-low', '?page=2', '?brand=samsung', '?q=phone']) {
    assert.deepEqual(routeSeo('/phones', search), { robots: 'noindex, follow', canonical: `${SITE_ORIGIN}/phones` });
  }
});

test('private transactional routes never acquire a public canonical', () => {
  for (const path of ['/cart/Tel-1', '/checkout', '/order-history', '/order-success/ORD-1', '/agent/dashboard', '/showroom/room-1']) {
    assert.deepEqual(routeSeo(path, ''), { robots: 'noindex, nofollow', canonical: null });
  }
});

test('unknown and unresolved dynamic routes are noindex without a guessed canonical', () => {
  assert.deepEqual(routeSeo('/does-not-exist', ''), { robots: 'noindex, follow', canonical: null });
  assert.deepEqual(routeSeo('/product/not-loaded-yet', ''), { robots: 'noindex, follow', canonical: null });
});

test('host artifacts put permanent redirects before SPA fallback and return real 404s', () => {
  const redirects = [['/product/old-name', '/product/new-name'], ['/phones/', '/phones']];
  const netlify = netlifyRedirects(redirects);
  assert.ok(netlify.indexOf('/product/old-name /product/new-name 301!') < netlify.indexOf('/product/* /index.html 200'));
  assert.ok(netlify.endsWith('/* /404.html 404\n'));
  const nginx = nginxServer(redirects);
  assert.ok(nginx.indexOf('location = /product/old-name') < nginx.indexOf('location ^~ /product/'));
  assert.ok(nginx.includes('error_page 404 /404.html;'));
  assert.ok(nginx.includes('location / { try_files $uri $uri/ =404; }'));
  const apache = apacheRedirects(redirects);
  assert.ok(apache.includes('ErrorDocument 404 /404.html'));
  assert.ok(apache.indexOf('RewriteRule ^product/old-name/?$') < apache.indexOf('RewriteRule ^(?:product|brand'));
});
