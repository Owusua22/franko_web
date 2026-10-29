/* ============================================================================
   cartItems.mjs — pure cart-line helpers shared by cartSlice, the cart
   pages and the cart components (and unit-tested with node:test).

   WHY THIS FILE EXISTS
   --------------------
   `/Cart/Cart-GetbyID/{cartId}` does NOT return a bare array of line items.
   "Get by ID" returns whatever cart record(s) the backend finds for that one
   cart id — observed shapes include a single cart-line object, an enveloped
   payload (`{ data: [...] }`, `{ response: { data: [...] } }`, …) and a cart
   header object carrying its lines under `items` / `cartItems`.

   The old cartSlice assumed a bare array and REPLACED the whole Redux cart
   with whatever that one call returned. Every fetch (Cart page mount, Navbar
   login sync, sidebar open, checkout mount, every quantity-change refetch)
   therefore collapsed a multi-product cart down to the single record the
   endpoint handed back — "add three products, only one shows in the cart".

   The fix, implemented here and in cartSlice:
     1. `extractCartItems` unwraps ANY GetbyID response shape into lines.
     2. `mergeCartItems` UNIONs server lines with locally known lines — a
        fetch can update lines, but it can never silently delete a product
        the customer added on this device. Deletions only happen through the
        explicit delete/update actions.
   ========================================================================== */

const PRODUCT_ID_KEYS = ["productId", "ProductId", "productID", "ProductID", "id", "Id"];
const PRODUCT_NAME_KEYS = ["productName", "ProductName", "name", "Name"];
const IMAGE_KEYS = ["imagePath", "ImagePath", "productImage", "ProductImage", "image", "Image"];

/** Keys under which a response envelope may hide the actual line list. */
const LINE_ARRAY_KEYS = [
  "items",
  "cartItems",
  "cartItem",
  "lines",
  "lineItems",
  "products",
  "productList",
  "data",
  "result",
  "results",
  "cart",
  "carts",
  "response",
  "payload",
  "value",
];

const firstValue = (source, keys) => {
  if (!source || typeof source !== "object") return undefined;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

export const getCartProductId = (item) => firstValue(item, PRODUCT_ID_KEYS);
export const getCartProductName = (item) => firstValue(item, PRODUCT_NAME_KEYS) || "";
export const getCartImagePath = (item) => firstValue(item, IMAGE_KEYS) || "";

export const CART_ITEM_EXISTS = "CART_ITEM_EXISTS";
export const CART_ITEM_EXISTS_MESSAGE =
  "Item already added to the cart. Update quantity in the cart page.";

export const duplicateCartPayload = (productId) => ({
  code: CART_ITEM_EXISTS,
  productId: String(productId),
  message: CART_ITEM_EXISTS_MESSAGE,
});

/** Repeated Add-to-Cart is a notice, not a failed purchase or a quantity change. */
export const cartAddFeedback = (error) => ({
  message: error?.code === CART_ITEM_EXISTS
    ? CART_ITEM_EXISTS_MESSAGE
    : error?.message || "Failed to add to cart. Please try again.",
  type: error?.code === CART_ITEM_EXISTS ? "info" : "error",
});

export const sameCartProduct = (left, right) =>
  left !== undefined && left !== null && left !== "" &&
  right !== undefined && right !== null && right !== "" &&
  String(left) === String(right);

/** Shared duplicate guard for the thunk condition and the add-to-cart hook.
 * `addingProductIds` closes the same-tick race before the first POST fulfils.
 */
export function duplicateCartAdd(cartState, productId, cartId) {
  if (!sameCartProduct(cartId, cartState?.cartId)) return null;
  const id = String(productId ?? "");
  if (!id) return null;
  const pending = Array.isArray(cartState?.addingProductIds) && cartState.addingProductIds.includes(id);
  const existing = Array.isArray(cartState?.cart) &&
    cartState.cart.some((line) => sameCartProduct(line.productId, id));
  return pending || existing ? duplicateCartPayload(id) : null;
}

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** True when an object looks like one cart line (it carries a product id). */
export const isCartLine = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  getCartProductId(value) !== undefined;

/**
 * Unwrap any `/Cart/Cart-GetbyID/{cartId}` response body into raw line items.
 *
 *   [ {...}, {...} ]                    -> the array itself
 *   { productId: 7, ... }               -> [ that single line ]
 *   { cartId: "Tel-…", items: [...] }   -> the nested lines
 *   { data: [...] } / { response: { data: [...] } } / "{...}" (stringified)
 *                                       -> the nested lines
 *   null / {} / "no cart"               -> []
 */
export function extractCartItems(data, depth = 0) {
  if (data === null || data === undefined || depth > 6) return [];

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) return [];
    try {
      return extractCartItems(JSON.parse(trimmed), depth + 1);
    } catch {
      return [];
    }
  }

  if (Array.isArray(data)) {
    const lines = [];
    data.forEach((entry) => {
      if (isCartLine(entry)) lines.push(entry);
      else lines.push(...extractCartItems(entry, depth + 1));
    });
    return lines;
  }

  if (typeof data === "object") {
    if (isCartLine(data)) return [data];

    for (const key of LINE_ARRAY_KEYS) {
      if (key in data) {
        const found = extractCartItems(data[key], depth + 1);
        if (found.length > 0) return found;
      }
    }
    // Last resort: any array-valued property that contains lines.
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) {
        const found = extractCartItems(value, depth + 1);
        if (found.length > 0) return found;
      }
    }
  }

  return [];
}

/**
 * Canonical cart-line shape rendered by every cart page/component:
 *   { productId, productName, imagePath, price, unitPrice,
 *     quantity, total, cartId, customerId }
 *
 * `price` is the PER-UNIT price (the same value Add-To-Cart posts), and
 * `total` is always `price * quantity`. A stored/server `total` or
 * `lineTotal` is only used to back out a unit price when no price field
 * exists at all — it is never divided into a price that was actually given.
 */
export function normalizeCartItem(raw, fallback = {}) {
  if (!raw || typeof raw !== "object") return null;

  const productId = getCartProductId(raw) ?? getCartProductId(fallback);
  if (productId === undefined || productId === null || productId === "") return null;

  const quantity = Math.max(
    1,
    parseInt(raw.quantity ?? raw.Quantity ?? fallback.quantity ?? 1, 10) || 1
  );

  let unitPrice = parseFloat(
    firstValue(raw, ["unitPrice", "UnitPrice", "price", "Price"]) ??
      firstValue(fallback, ["unitPrice", "UnitPrice", "price", "Price"]) ??
      0
  ) || 0;

  if (!unitPrice) {
    const lineTotal = parseFloat(firstValue(raw, ["lineTotal", "LineTotal", "total", "Total"]) || 0);
    if (lineTotal > 0) unitPrice = round2(lineTotal / quantity);
  }

  return {
    productId: String(productId),
    productName: getCartProductName(raw) || getCartProductName(fallback),
    imagePath: getCartImagePath(raw) || getCartImagePath(fallback),
    price: unitPrice,
    unitPrice,
    quantity,
    total: round2(unitPrice * quantity),
    cartId: raw.cartId ?? raw.CartId ?? fallback.cartId ?? fallback.CartId ?? null,
    customerId:
      raw.customerId ?? raw.CustomerId ?? fallback.customerId ?? fallback.CustomerId ?? null,
  };
}

export const normalizeCartItems = (items, fallbackById = {}) =>
  (Array.isArray(items) ? items : [])
    .map((item) => normalizeCartItem(item, fallbackById[String(getCartProductId(item))] || {}))
    .filter(Boolean);

/**
 * Collapse duplicate rows for the same product into one line (quantities
 * add up) — the cart must show one row per product, never two.
 */
export function dedupeCartItems(items) {
  const byId = new Map();
  const ordered = [];

  (Array.isArray(items) ? items : []).forEach((item) => {
    if (!item?.productId) return;
    const existing = byId.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.total = round2(existing.price * existing.quantity);
      existing.productName = existing.productName || item.productName;
      existing.imagePath = existing.imagePath || item.imagePath;
    } else {
      const copy = { ...item };
      byId.set(item.productId, copy);
      ordered.push(copy);
    }
  });

  return ordered;
}

/**
 * Add (or top up) one line. Re-adding a product increases its quantity on
 * the SAME row instead of creating a duplicate row.
 */
export function upsertCartItem(items, rawIncoming) {
  const current = dedupeCartItems(normalizeCartItems(items));
  const incoming = normalizeCartItem(rawIncoming);
  if (!incoming) return current;

  const index = current.findIndex((item) => item.productId === incoming.productId);
  if (index === -1) return [...current, incoming];

  const next = [...current];
  const existing = next[index];
  const quantity = existing.quantity + incoming.quantity;
  const price = incoming.price > 0 ? incoming.price : existing.price;
  next[index] = {
    ...existing,
    productName: incoming.productName || existing.productName,
    imagePath: incoming.imagePath || existing.imagePath,
    price,
    unitPrice: price,
    quantity,
    total: round2(price * quantity),
    cartId: incoming.cartId || existing.cartId,
    customerId: incoming.customerId ?? existing.customerId,
  };
  return next;
}

/**
 * THE FIX for "only one product shows in the cart".
 *
 * Union of the lines the server returned for this cartId and the lines this
 * device already knows about:
 *   - product in both        -> server fields win for name/image/price, and
 *                               quantity is the LARGER of the two so an add
 *                               that landed locally while the fetch was in
 *                               flight is never lost (explicit quantity
 *                               changes are applied locally by the update
 *                               action before any refetch, and the refetch
 *                               that follows a server update returns the new
 *                               server quantity, which then matches).
 *   - product only on server -> added (e.g. cart opened on a second device).
 *   - product only local     -> KEPT. GetbyID returning one record for the
 *                               cart id can no longer wipe the other
 *                               products the customer added.
 *
 * A line only ever leaves the cart via deleteCartItem / removeFromCart /
 * clearCart — never as a side effect of a fetch.
 */
export function mergeCartItems(localItems, serverItems) {
  const local = dedupeCartItems(normalizeCartItems(localItems));
  const server = dedupeCartItems(normalizeCartItems(serverItems));

  const localById = new Map(local.map((item) => [item.productId, item]));
  const merged = server.map((serverItem) => {
    const localItem = localById.get(serverItem.productId);
    if (!localItem) return serverItem;

    const quantity = Math.max(localItem.quantity, serverItem.quantity);
    const price = serverItem.price > 0 ? serverItem.price : localItem.price;
    return {
      ...localItem,
      ...serverItem,
      productName: serverItem.productName || localItem.productName,
      imagePath: serverItem.imagePath || localItem.imagePath,
      price,
      unitPrice: price,
      quantity,
      total: round2(price * quantity),
    };
  });

  const serverIds = new Set(server.map((item) => item.productId));
  local.forEach((localItem) => {
    if (!serverIds.has(localItem.productId)) merged.push(localItem);
  });

  return merged;
}

/** Set an exact quantity; quantity <= 0 removes the line. */
export function setCartItemQuantity(items, productId, quantity) {
  const nextQuantity = parseInt(quantity, 10);
  return dedupeCartItems(normalizeCartItems(items))
    .map((item) =>
      sameCartProduct(item.productId, productId)
        ? { ...item, quantity: nextQuantity, total: round2(item.price * nextQuantity) }
        : item
    )
    .filter((item) => item.quantity > 0);
}

export function removeCartItem(items, productId) {
  return dedupeCartItems(normalizeCartItems(items)).filter(
    (item) => !sameCartProduct(item.productId, productId)
  );
}

export const cartTotals = (items) => {
  const lines = Array.isArray(items) ? items : [];
  return {
    // Distinct products (rows) — this is what "products in the cart" means.
    distinctItems: lines.length,
    // Sum of quantities — the navbar badge number.
    totalItems: lines.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0),
    subtotal: round2(
      lines.reduce(
        (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1),
        0
      )
    ),
  };
};

/** First usable cart id from any of the places callers pass one in. */
export function resolveCartIdValue(...candidates) {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate === "object") {
      const nested = resolveCartIdValue(
        candidate.cartId,
        candidate.CartId,
        candidate.id,
        candidate.cartID
      );
      if (nested) return nested;
      continue;
    }
    const cleaned = String(candidate).trim().replace(/^"+|"+$/g, "");
    if (cleaned && cleaned !== "null" && cleaned !== "undefined") return cleaned;
  }
  return null;
}
