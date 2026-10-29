// Session-memory cache: navigation does not repeat identical public catalogue reads.
// Never use this for customer/account/cart/payment/order endpoints.
export function createReadCache({ ttl = 300_000, now = Date.now } = {}) {
  const entries = new Map();
  const pending = new Map();
  let version = 0;
  return {
    peek(key) {
      const entry = entries.get(key);
      if (entry && now() - entry.time < ttl) return entry.value;
      entries.delete(key);
      return undefined;
    },
    read(key, fetcher, { refresh = false } = {}) {
      const cached = refresh ? undefined : this.peek(key);
      if (cached !== undefined) return Promise.resolve(cached);
      if (pending.has(key)) return pending.get(key);
      const generation = version;
      const promise = Promise.resolve().then(fetcher).then(value => {
        if (generation === version) entries.set(key, { value, time: now() });
        if (entries.size > 256) entries.delete(entries.keys().next().value);
        return value;
      }).finally(() => { if (pending.get(key) === promise) pending.delete(key); });
      pending.set(key, promise);
      return promise;
    },
    clear() { version++; entries.clear(); pending.clear(); },
  };
}
