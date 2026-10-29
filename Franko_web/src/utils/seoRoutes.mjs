export const SITE_ORIGIN = "https://www.frankotrading.com";
export const PUBLIC_PATHS = new Set([
  "/", "/about", "/products", "/contact", "/accessories", "/speakers", "/television",
  "/appliances", "/refrigerator", "/air-condition", "/phones", "/computers",
  "/washing-machine", "/shops", "/terms",
]);
const PRIVATE_PREFIXES = [
  "/cart", "/checkout", "/account", "/order-history", "/wishlist", "/order-received",
  "/order-success", "/order-cancelled", "/agent", "/tel-cart", "/tel-checkout",
  "/showroom", "/promo-phones",
];
const VARIANT_PARAMS = new Set(["page", "sort", "brand", "minprice", "maxprice", "search", "q", "filter", "category", "price", "availability"]);

/** A private transactional page must not acquire a public canonical or lose noindex. */
export function routeSeo(pathname = "/", search = "") {
  const path = pathname.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(search);
  const isPrivate = PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
  if (isPrivate) return { robots: "noindex, nofollow", canonical: null };
  if (!PUBLIC_PATHS.has(path)) return { robots: "noindex, follow", canonical: null };
  const variant = [...params.keys()].some((key) => VARIANT_PARAMS.has(key.toLowerCase()));
  // Tracking parameters share the clean page canonical; actual filtered views
  // are not submitted as separate indexable pages.
  return { robots: variant ? "noindex, follow" : "index, follow", canonical: `${SITE_ORIGIN}${path === "/" ? "/" : path}` };
}
