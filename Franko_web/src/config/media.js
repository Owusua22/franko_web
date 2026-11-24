/**
 * ============================================================================
 *  Media / CMS configuration
 * ============================================================================
 *  Every product image, advertisement banner and brand asset is served by the
 *  CMS. Before this module existed the same URL was rebuilt by hand in ~25
 *  files, always with the staging host hard-coded:
 *
 *      `https://testing.frankotrading.com/Media/Products_Images/${file}`
 *
 *  That single line caused three separate problems on the site:
 *    1. The production build shipped *staging* media URLs, so the CDN /
 *       caching rules of the real media host were never used.
 *    2. There was no way to point the storefront at an image CDN (or at an
 *       image-resizing endpoint) without editing 25 files.
 *    3. Every call site invented its own fallback - several of them used
 *       `https://via.placeholder.com/...`, a domain that no longer resolves,
 *       so broken products rendered a broken-image icon instead of a
 *       placeholder.
 *
 *  Now the host comes from the environment (VITE_CMS_BASE_URL, already used by
 *  the API slices) with the current staging host as the safe default, so a
 *  deploy can switch hosts without a code change.
 *
 *  Optional image CDN
 *  ------------------
 *  Set VITE_IMAGE_CDN_TEMPLATE to a template that receives {url}, {width} and
 *  {format}, for example:
 *
 *      VITE_IMAGE_CDN_TEMPLATE=https://cdn.frankotrading.com/resize?src={url}&w={width}&fm={format}
 *
 *  When it is set, product images are requested at the size they are actually
 *  displayed (300 px cards instead of 1080 px PNGs) and in WebP. When it is
 *  not set the code degrades gracefully to the plain CMS URL.
 */

const stripTrailingSlashes = (value) => String(value || "").replace(/\/+$/, "");

/** Base URL of the CMS (media host). */
export const CMS_BASE_URL = stripTrailingSlashes(
  import.meta.env.VITE_CMS_BASE_URL || "https://testing.frankotrading.com"
);

/** Media host - override with VITE_MEDIA_BASE_URL when media has its own CDN. */
export const MEDIA_BASE_URL = stripTrailingSlashes(
  import.meta.env.VITE_MEDIA_BASE_URL || CMS_BASE_URL
);

export const PRODUCT_IMAGE_PATH = "/Media/Products_Images";
export const AD_IMAGE_PATH = "/Media/Ads";

/** Ready-to-concatenate folder URLs (always end with "/"). */
export const PRODUCT_IMAGE_BASE = `${MEDIA_BASE_URL}${PRODUCT_IMAGE_PATH}/`;
export const AD_IMAGE_BASE = `${MEDIA_BASE_URL}${AD_IMAGE_PATH}/`;

const CDN_TEMPLATE = import.meta.env.VITE_IMAGE_CDN_TEMPLATE || "";

/** Internal placeholder - a tiny inline SVG, so it never costs a request. */
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
      '<rect width="300" height="300" fill="#f3f4f6"/>' +
      '<g fill="none" stroke="#c3c9d0" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M104 118h92l-9 96H113z"/><path d="M128 118a22 22 0 0 1 44 0"/>' +
      "</g></svg>"
  );

/** The CMS stores Windows-style paths ("Images\\file.png"); keep only the file. */
export const mediaFileName = (path) => {
  if (!path) return "";
  const raw = String(path).trim();
  if (!raw) return "";
  return raw.split(/[\\/]/).pop();
};

const isAbsoluteUrl = (value) => /^(https?:)?\/\//i.test(value);
const isInlineAsset = (value) => /^(data:|blob:)/i.test(value);

const withTransform = (url, width, format) => {
  if (!CDN_TEMPLATE || !width) return url;
  return CDN_TEMPLATE.replace("{url}", encodeURIComponent(url))
    .replace("{width}", String(width))
    .replace("{format}", format || "webp");
};

/**
 * Build a CMS media URL.
 *
 * @param {string} path      file name or CMS-relative path
 * @param {object} [options]
 * @param {string} [options.dir]     "/Media/Products_Images" (default) or "/Media/Ads"
 * @param {number} [options.width]   displayed width in CSS pixels (CDN only)
 * @param {string} [options.format]  "webp" | "avif" | "auto" (CDN only)
 * @param {string} [options.fallback] URL returned when `path` is empty
 */
export const mediaUrl = (path, options = {}) => {
  const { dir = PRODUCT_IMAGE_PATH, width, format, fallback = PLACEHOLDER_IMAGE } = options;

  if (!path) return fallback;
  const raw = String(path).trim();

  if (isInlineAsset(raw)) return raw;

  // Absolute URLs are already complete. We still push them through the CDN
  // template when one is configured, because they usually point at the CMS.
  if (isAbsoluteUrl(raw)) return withTransform(raw, width, format);

  const file = mediaFileName(raw);
  if (!file) return fallback;

  const url = `${MEDIA_BASE_URL}${dir}/${file}`;
  return withTransform(url, width, format);
};

/** Product photo (cards, detail page, cart, wishlist...). */
export const productImageUrl = (path, options = {}) =>
  mediaUrl(path, { dir: PRODUCT_IMAGE_PATH, ...options });

/** Advertisement banner (hero carousel, in-page banners). */
export const adImageUrl = (path, options = {}) =>
  mediaUrl(path, { dir: AD_IMAGE_PATH, ...options });

export default {
  CMS_BASE_URL,
  MEDIA_BASE_URL,
  PRODUCT_IMAGE_PATH,
  AD_IMAGE_PATH,
  PLACEHOLDER_IMAGE,
  mediaFileName,
  mediaUrl,
  productImageUrl,
  adImageUrl,
};
