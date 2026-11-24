// Only AES + UTF-8 are used, so we import those two modules instead of the
// whole crypto-js bundle. The full build shipped ~242 KiB of unused ciphers
// (MD5/SHA*/Rabbit/RC4/TripleDES) to every visitor of every page.
// The on-disk format is unchanged: CryptoJS' OpenSSL-compatible
// "Salted__" + base64 payload, so existing stored values keep decrypting.
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

// Explicit app adapter: never modify Storage.prototype or third-party keys.
// Object returns intentionally preserve the application's existing storage API.
export function createAppStorage(storage, secret) {
  return {
    getItem(key) {
      const raw = storage.getItem(key);
      if (raw == null) return null;
      let value = raw;
      try {
        // Recover legacy encrypted values (including accidentally nested writes).
        for (let depth = 0; typeof value === 'string' && value.startsWith('U2FsdGVkX1'); depth++) {
          if (depth >= 3) throw new Error('Invalid storage encoding');
          value = AES.decrypt(value, secret).toString(Utf8);
          if (!value) throw new Error('Unreadable storage value');
        }
        try { return JSON.parse(value); } catch { return value; }
      } catch {
        // Only discard this unreadable app entry. Never clear the entire store.
        storage.removeItem(key);
        return null;
      }
    },
    setItem(key, value) {
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      // Activity is interoperable with tabs and existing timestamp readers.
      storage.setItem(key, key === 'lastActivityTimestamp'
        ? text : AES.encrypt(text, secret).toString());
    },
    removeItem(key) { storage.removeItem(key); },
  };
}
