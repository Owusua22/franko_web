// Generate SEO artifacts from the live catalogue by default. A failed API read
// fails the build instead of silently replacing the catalogue with an old sheet.
import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { seoArtifacts, netlifyRedirects, nginxRedirects, nginxServer, apacheRedirects } from './scripts/seo-artifacts.mjs';
import { catalogueRows } from './src/utils/catalogueShape.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
async function catalogue(endpoint, snapshot, key) {
  if (snapshot) return JSON.parse(readFileSync(snapshot, 'utf8'));
  if (!process.env.VITE_LAMBDA_BASE_URL) throw new Error('Configure VITE_LAMBDA_BASE_URL, or explicitly use SEO_SOURCE=snapshot for an offline preview.');
  const url = new URL(process.env.VITE_LAMBDA_BASE_URL);
  url.searchParams.set('endpoint', endpoint);
  url.searchParams.set('client', 'website');
  const response = await fetch(url, {
    headers: { [process.env.VITE_LAMBDA_HEADER_NAME || 'Identifier']: process.env.VITE_LAMBDA_HEADER_VALUE || 'Franko' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Catalogue request failed (${response.status})`);
  const rows = catalogueRows(await response.json(), key);
  if (!Array.isArray(rows)) throw new Error(`${key} catalogue must be a complete JSON array`);
  return rows;
}

let products, brands;
const explicitSnapshot = process.env.SEO_SOURCE === 'snapshot' || Boolean(process.env.SEO_PRODUCTS_FILE);
if (process.env.SEO_STATIC_ONLY === '1') {
  console.warn('STATIC-ONLY PREVIEW: no product/brand sitemap entries or redirects. Never deploy this mode.');
  products = []; brands = [];
} else if (explicitSnapshot) {
  products = JSON.parse(readFileSync(process.env.SEO_PRODUCTS_FILE || `${root}seo/data/products.json`, 'utf8'));
  brands = process.env.SEO_BRANDS_FILE ? JSON.parse(readFileSync(process.env.SEO_BRANDS_FILE, 'utf8')) : [];
  console.warn('OFFLINE SNAPSHOT: not a live catalogue refresh. Use the default live mode for production.');
} else {
  [products, brands] = await Promise.all([
    catalogue('/Product/Product-Get', null, 'products'),
    catalogue('/Brand/Get-Brand', process.env.SEO_BRANDS_FILE, 'brands'),
  ]);
  if (!products.length) throw new Error('Refusing to publish an empty product catalogue');
  if (!brands.length) throw new Error('Refusing to publish an empty brand catalogue');
}

// Retain the last generated index alongside the source so normal local builds
// keep rename aliases. CI can supply an archived index with SEO_PREVIOUS_INDEX.
const previousPath = process.env.SEO_PREVIOUS_INDEX || `${root}seo/previous-index.json`;
const previous = existsSync(previousPath) ? JSON.parse(readFileSync(previousPath, 'utf8')) : {};
const { sitemap, redirects, index, paths } = seoArtifacts(products, brands, previous);
const nextIndex = {
  products: { ...previous.products, ...index.products },
  brands: { ...previous.brands, ...index.brands },
};
const headers = `/*\n  X-Content-Type-Options: nosniff\n/index.html\n  Cache-Control: no-cache\n/sitemap.xml\n  Cache-Control: no-cache\n`;

for (const folder of ['public', ...(existsSync(`${root}dist`) ? ['dist'] : [])]) {
  writeFileSync(`${root}${folder}/sitemap.xml`, sitemap);
  writeFileSync(`${root}${folder}/_redirects`, netlifyRedirects(redirects));
  writeFileSync(`${root}${folder}/_headers`, headers);
  writeFileSync(`${root}${folder}/seo-index.json`, JSON.stringify(nextIndex));
}
if (existsSync(`${root}dist`)) {
  // Static hosting serves this document with a genuine 404 status. React still
  // renders the helpful not-found page; unknown URLs no longer redirect home.
  const noindex = '<meta name="robots" content="noindex, follow" data-franko-seo="true" />';
  let html = readFileSync(`${root}dist/index.html`, 'utf8')
    .replace(/<title>[\s\S]*?<\/title>/, '<title>Page not found | Franko Trading</title>');
  html = /<meta name="robots"[^>]*>/.test(html)
    ? html.replace(/<meta name="robots"[^>]*>/, noindex)
    : html.replace('</head>', `    ${noindex}\n  </head>`);
  writeFileSync(`${root}dist/404.html`, html);
  mkdirSync(`${root}dist/deployment`, { recursive: true });
  writeFileSync(`${root}dist/deployment/.htaccess`, apacheRedirects(redirects));
  writeFileSync(`${root}dist/deployment/seo-redirects.nginx.conf`, nginxRedirects(redirects));
  writeFileSync(`${root}dist/deployment/nginx.conf`, nginxServer(redirects));
}
// Do not replace an archive with empty preview output.
if (process.env.SEO_STATIC_ONLY !== '1' && products.length) {
  writeFileSync(`${root}seo/previous-index.json`, JSON.stringify(nextIndex, null, 2) + '\n');
}
writeFileSync(`${root}seo-redirects.nginx.conf`, nginxRedirects(redirects));
writeFileSync(`${root}seo-nginx.conf`, nginxServer(redirects));
writeFileSync(`${root}seo-htaccess.txt`, apacheRedirects(redirects));
console.log(`Generated ${paths.length} sitemap URLs and ${redirects.length} permanent redirects (${explicitSnapshot ? 'snapshot' : process.env.SEO_STATIC_ONLY ? 'static preview' : 'live API'}).`);
