import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createReadCache } from './readCache.mjs';
import { rememberProducts, rememberedProduct, freshProductDetails } from './productMemory.mjs';

test('home -> detail -> home reuses fresh catalogue responses with zero additional fetches', async () => {
  const cache = createReadCache();
  let calls = 0;
  const get = () => { calls++; return [{ productID: 'nav-test' }]; };
  const home = await cache.read('category:phones', get);
  assert.equal(await cache.read('category:phones', get), home);
  assert.equal(calls, 1);
});

test('simultaneous sections and StrictMode share an in-flight read', async () => {
  const cache = createReadCache();let calls = 0;
  const get = async () => { calls++; return []; };
  const a = cache.read('showroom:best', get);
  const b = cache.read('showroom:best', get);
  assert.equal(a, b);
  await Promise.all([a, b]);assert.equal(calls, 1);
});

test('separate category/record/ad keys do not leak each other’s responses', async () => {
  const cache = createReadCache();
  await cache.read('ads:home', () => ['home']);
  assert.deepEqual(await cache.read('ads:banner', () => ['banner']), ['banner']);
  assert.deepEqual(cache.peek('ads:home'), ['home']);
});

test('empty successful lists are cached, failures retry and TTL eventually refreshes', async () => {
  let clock = 0;const cache = createReadCache({ ttl: 50, now: () => clock });let calls = 0;
  const get = () => { calls++; return []; };
  await cache.read('one', get);await cache.read('one', get);assert.equal(calls, 1);
  clock = 51;await cache.read('one', get);assert.equal(calls, 2);
  await assert.rejects(cache.read('two', () => Promise.reject(new Error('offline'))));
  assert.equal(await cache.read('two', () => 'recovered'), 'recovered');
});

test('mutation invalidation prevents old in-flight data repopulating the cache', async () => {
  const cache = createReadCache();let finish;
  const old = cache.read('one', () => new Promise(resolve => { finish = resolve; }));
  await Promise.resolve();cache.clear();
  assert.equal(await cache.read('one', () => 'new'), 'new');
  finish('old');await old;assert.equal(cache.peek('one'), 'new');
});

test('real clicked product is available immediately, before detail API completes', () => {
  const product = { productID: 'navigation-case-1', productName: 'Instant Test Phone', price: 99, brandName: 'Test', description: 'Real card description' };
  rememberProducts({ categoryId: 'one', products: [product] });
  assert.equal(rememberedProduct('instant-test-phone').price, 99);
  assert.equal(freshProductDetails(product.productID), null);
  rememberProducts([{ ...product, description: 'Full API detail' }], true);
  assert.equal(rememberedProduct(product.productID).description, 'Full API detail');
  assert.equal(freshProductDetails(product.productID).price, 99);
});

test('product data never substitutes another product during rapid navigation', () => {
  rememberProducts([{ productID: 'nav-a', productName: 'Nav A', price: 10 }, { productID: 'nav-b', productName: 'Nav B', price: 20 }]);
  assert.equal(rememberedProduct('nav-b').price, 20);
  assert.equal(rememberedProduct('unknown-nav-id'), null);
});

test('product navigation resets Suspense and displays a destination skeleton until full details are ready', () => {
  const page = readFileSync(new URL('../Pages/ProductDescription.jsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
  assert.ok(page.includes('<ProductDetailSkeleton />'));
  assert.ok(page.includes('() => freshProductDetails(resolvedProductId || rawParam)'));
  assert.ok(!page.includes('fetchedProduct || rememberedProduct(rawParam)'));
  assert.ok(app.includes('key={pathname}'));
  assert.ok(app.includes('fallback={<ProductDetailSkeleton />}'));
  assert.ok(app.includes('pathname.startsWith("/product/") ? <ProductDetailSkeleton /> : <LoadingCircle />'));
});

test('forced catalogue refresh bypasses a fresh cached list but still coalesces concurrent readers', async () => {
  const cache = createReadCache();
  let calls = 0;
  const fetcher = () => { calls++; return calls === 1 ? ['old'] : ['new']; };
  assert.deepEqual(await cache.read('products', fetcher), ['old']);
  assert.deepEqual(await cache.read('products', fetcher), ['old']);
  const a = cache.read('products', fetcher, { refresh: true });
  const b = cache.read('products', fetcher, { refresh: true });
  assert.equal(a, b);
  assert.deepEqual(await a, ['new']);
  assert.equal(calls, 2);
  assert.deepEqual(cache.peek('products'), ['new']);
});
