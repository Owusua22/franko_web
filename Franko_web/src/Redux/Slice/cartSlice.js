import { appStorage as localStorage } from "../../utils/secureLocalStorageInit";
// src/Redux/Slice/cartSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "./AxiosInstance";
import {
  extractCartItems,
  normalizeCartItem,
  normalizeCartItems,
  dedupeCartItems,
  upsertCartItem,
  mergeCartItems,
  setCartItemQuantity,
  removeCartItem,
  cartTotals,
  resolveCartIdValue,
  getCartProductId,
  duplicateCartPayload,
  duplicateCartAdd,
  sameCartProduct,
} from "../../utils/cartItems.mjs";

/* ============================================================================
   CART SLICE — one cart, many products.

   THE BUG THIS REWRITE FIXES
   --------------------------
   Adding several products left only ONE visible in the cart. The old
   `getCartById` treated `/Cart/Cart-GetbyID/{cartId}` as if it returned the
   cart's full line list and REPLACED `state.cart` with the result:

       if (!Array.isArray(response.data)) return response.data;   // 1 record
       state.cart = Array.isArray(payload) ? payload : [];        // cart := that

   GetbyID looks a cart up BY its id and hands back a single cart record /
   enveloped payload, so every fetch (cart-page mount, Navbar login sync,
   sidebar open, checkout mount, and the refetch after every quantity
   change) collapsed the multi-product cart down to that one record.

   THE MODEL NOW
   -------------
   * Exactly ONE canonical cart id per customer session. It is minted once,
     kept in localStorage ("cartId") and NEVER re-derived from a fetched
     line (`cartData[0]`), never nulled when the cart empties, and only
     rotated by clearCart() after an order completes.
   * Redux + localStorage ("cart") are the source of truth for what the
     customer has added on this device. Server fetches MERGE into that list
     (see mergeCartItems) — a fetch can add or refresh lines, it can never
     silently delete a product. Lines leave only via the explicit
     delete / update-to-zero / clear actions.
   * Every line is stored in the canonical shape from cartItems.mjs:
     { productId, productName, imagePath, price, unitPrice, quantity,
       total, cartId, customerId } — one row per productId.
   ========================================================================== */

const CART_KEY = "cart";
const CART_ID_KEY = "cartId";

// Cart ids are shared with the Telecel Speed Shopping flow, which requires
// the "Tel" prefix — keep minting ids that satisfy both flows.
const CART_ID_PREFIX = "Tel";

const randomSuffix = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    }
  } catch {
    /* fall through to Math.random */
  }
  return Math.random().toString(36).slice(2, 10);
};

export const generateTelCartId = () =>
  `${CART_ID_PREFIX}-${Date.now().toString(36)}-${randomSuffix()}`;

export const isTelCartId = (cartId) =>
  typeof cartId === "string" && cartId.startsWith(CART_ID_PREFIX);

/* ===========================
   LOCAL STORAGE
   (the app monkey-patches localStorage so getItem may return an already
   parsed value — every reader below accepts string OR parsed data)
=========================== */

const readStoredCartId = () => {
  try {
    return resolveCartIdValue(localStorage.getItem(CART_ID_KEY));
  } catch {
    return null;
  }
};

const loadCartFromLocalStorage = () => {
  try {
    const savedCart = localStorage.getItem(CART_KEY);
    if (!savedCart) return [];
    const parsed = typeof savedCart === "string" ? JSON.parse(savedCart) : savedCart;
    return dedupeCartItems(normalizeCartItems(extractCartItems(parsed)));
  } catch {
    return [];
  }
};

const persistCart = (cart, cartId) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    if (cartId) localStorage.setItem(CART_ID_KEY, cartId);
  } catch {
    /* storage unavailable — Redux still holds the cart for this session */
  }
};

/**
 * The one canonical cart id. An explicit candidate (route param, caller
 * payload, Redux state) wins when supplied; otherwise the stored id is
 * reused; a new "Tel-…" id is minted only when none exists anywhere.
 */
export const getOrCreateCartId = (candidate) => {
  const explicit = resolveCartIdValue(candidate);
  if (explicit) {
    try {
      localStorage.setItem(CART_ID_KEY, explicit);
    } catch {
      /* ignore */
    }
    return explicit;
  }

  const stored = readStoredCartId();
  if (stored) return stored;

  const fresh = generateTelCartId();
  try {
    localStorage.setItem(CART_ID_KEY, fresh);
  } catch {
    /* ignore */
  }
  return fresh;
};

/* ===========================
   INITIAL STATE
=========================== */

const initialCart = loadCartFromLocalStorage();
const initialTotals = cartTotals(initialCart);

const initialState = {
  cart: initialCart,
  totalItems: initialTotals.totalItems,
  subtotal: initialTotals.subtotal,
  cartId: getOrCreateCartId(),
  loading: false,
  addingProductIds: [],
  error: null,
};

/* ===========================
   REDUCER HELPERS
=========================== */

const syncCart = (state) => {
  const totals = cartTotals(state.cart);
  state.totalItems = totals.totalItems;
  state.subtotal = totals.subtotal;
  persistCart(state.cart, state.cartId);
};

/* ===========================
   ASYNC THUNKS
=========================== */

/**
 * POST one line to /Cart/Add-To-Cart under the canonical cart id.
 * The fulfilled line is built from the REQUEST (the product the customer
 * actually picked) — the endpoint's acknowledgement body is only used to
 * fill fields the request somehow lacked, never to replace the product.
 */
const postCartItem = async (item, { rejectWithValue, getState }) => {
  try {
    const cartId = getOrCreateCartId(item?.CartId ?? item?.cartId);
    const requested = normalizeCartItem(item, { cartId });
    if (!requested) throw new Error("ProductId is required");

    // Enforce the rule at the shared boundary, including callers that dispatch
    // addToCart directly instead of using the useAddToCart hook.
    const state = getState().cart;
    const existing = state.cart.some((line) => sameCartProduct(line.productId, requested.productId));
    if (existing && sameCartProduct(cartId, state.cartId)) {
      return rejectWithValue(duplicateCartPayload(requested.productId));
    }

    const cartItem = {
      CartId: cartId,
      ProductId: requested.productId,
      ProductName: requested.productName,
      ImagePath: requested.imagePath,
      Price: requested.price,
      Quantity: requested.quantity,
      CustomerId: requested.customerId,
    };

    const response = await axiosInstance.post("/", cartItem, {
      params: { endpoint: "/Cart/Add-To-Cart" },
    });

    const serverLines = normalizeCartItems(extractCartItems(response.data));
    const serverLine = serverLines.find((line) => line.productId === requested.productId);
    return normalizeCartItem(serverLine || {}, requested) || requested;
  } catch (error) {
    return rejectWithValue(error.response?.data || { message: error.message });
  }
};

// Runs BEFORE pending: the first add reserves its id; a second click in the
// same tick is rejected without reaching the API or changing the quantity.
const rejectDuplicateAdd = (item, { getState, rejectWithValue }) => {
  const state = getState().cart;
  const requestedCartId = getOrCreateCartId(item?.CartId ?? item?.cartId ?? state.cartId);
  const duplicate = duplicateCartAdd(state, getCartProductId(item), requestedCartId);
  if (duplicate) return rejectWithValue(duplicate);
};

export const addToCart = createAsyncThunk("cart/addToCart", postCartItem, { condition: rejectDuplicateAdd });
// Backwards-compatible alias — same endpoint and duplicate protection.
export const createCartItem = createAsyncThunk("cart/createCartItem", postCartItem, { condition: rejectDuplicateAdd });

/**
 * Fetch the server's record(s) for ONE cart id and MERGE them into the
 * local cart. Accepts the cart id as a string, a `{ cartId }` payload, or
 * nothing (canonical stored id). Always fulfils with the full merged line
 * list — never with the raw single-record response — so `.unwrap()`
 * callers (cart pages, ProductDescription, checkout) all see every product.
 */
export const getCartById = createAsyncThunk(
  "cart/getCartById",
  async (arg, { rejectWithValue, getState }) => {
    try {
      const cartId = getOrCreateCartId(resolveCartIdValue(arg) || getState().cart?.cartId);
      const response = await axiosInstance.get("/", {
        params: { endpoint: `/Cart/Cart-GetbyID/${cartId}` },
      });

      const serverItems = normalizeCartItems(extractCartItems(response.data), {});

      // Read local lines AFTER the request resolves, so a product added
      // while the fetch was in flight is part of the merge and survives.
      // Redux state is primary (the slice initialises it from storage and
      // re-persists on every change, so it is the fresher copy — combining
      // both lists would count every stored line twice). Storage is only
      // a fallback for a store that has not been initialised yet.
      const stateItems = getState().cart?.cart;
      const localItems =
        Array.isArray(stateItems) && stateItems.length > 0
          ? stateItems
          : loadCartFromLocalStorage();

      // Fulfils with the full merged line list (an array, as callers using
      // .unwrap() have always expected) — never the raw GetbyID record.
      return mergeCartItems(localItems, serverItems);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to fetch cart");
    }
  }
);

export const updateCartItem = createAsyncThunk(
  "cart/updateCartItem",
  async (params, { rejectWithValue }) => {
    try {
      const cartId = getOrCreateCartId(params?.CartId ?? params?.cartId);
      const productId = resolveCartIdValue(getCartProductId(params)) || params?.ProductId || params?.productId;
      const quantity = parseInt(params?.Quantity ?? params?.quantity, 10);
      if (!productId) throw new Error("ProductId is required");
      if (Number.isNaN(quantity)) throw new Error("Quantity is required");

      await axiosInstance.post("/", null, {
        params: { endpoint: `/Cart/Cart-Update/${cartId}/${productId}/${quantity}` },
      });

      return { cartId, productId: String(productId), quantity };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

export const deleteCartItem = createAsyncThunk(
  "cart/deleteCartItem",
  async (params, { rejectWithValue }) => {
    try {
      const cartId = getOrCreateCartId(params?.CartId ?? params?.cartId);
      const productId = params?.ProductId ?? params?.productId ?? getCartProductId(params);
      if (!productId) throw new Error("ProductId is required");

      await axiosInstance.post("/", null, {
        params: { endpoint: `/Cart/Cart-Delete/${cartId}/${productId}` },
      });

      return { cartId, productId: String(productId) };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: error.message });
    }
  }
);

/* ===========================
   SLICE
=========================== */

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    /** Local-only add/upsert (offline adds, optimistic UI). */
    addCart: (state, action) => {
      state.cart = upsertCartItem(state.cart, { ...action.payload, cartId: state.cartId });
      syncCart(state);
    },

    /** Accepts a product id, a line object, or a `{ productId }` payload. */
    removeFromCart: (state, action) => {
      const productId =
        typeof action.payload === "object" ? getCartProductId(action.payload) : action.payload;
      state.cart = removeCartItem(state.cart, productId);
      syncCart(state);
    },

    /**
     * Empty the cart after a completed order. The id ROTATES to a fresh
     * one instead of being nulled: the ordered cart is abandoned on the
     * server under the old id, so its lines can never be merged back in,
     * and the next add starts a genuinely new cart.
     */
    clearCart: (state) => {
      state.cart = [];
      state.cartId = generateTelCartId();
      syncCart(state);
    },

    /** Replace the lines outright (explicit caller intent — imports, restores). */
    setCartItems: (state, action) => {
      state.cart = dedupeCartItems(normalizeCartItems(extractCartItems(action.payload)));
      syncCart(state);
    },

    setCartId: (state, action) => {
      state.cartId = getOrCreateCartId(resolveCartIdValue(action.payload));
      syncCart(state);
    },
  },

  extraReducers: (builder) => {
    const onPending = (state, action) => {
      // A full-cart fetch may make an empty cart wait, but adding product B
      // must never make product A disappear behind a loading screen.
      if (action.type.startsWith("cart/getCartById/") && state.cart.length === 0) state.loading = true;
      if (action.type.startsWith("cart/addToCart/") || action.type.startsWith("cart/createCartItem/")) {
        const id = String(getCartProductId(action.meta.arg) ?? "");
        if (id && !state.addingProductIds.includes(id)) state.addingProductIds.push(id);
      }
      state.error = null;
    };
    const stopAdding = (state, action) => {
      const id = String(getCartProductId(action.meta.arg) ?? "");
      state.addingProductIds = state.addingProductIds.filter((value) => value !== id);
    };
    const onRejected = (state, action) => {
      state.loading = false;
      state.error =
        typeof action.payload === "string"
          ? action.payload
          : action.payload?.message || action.error?.message || "Something went wrong";
    };

    builder
      .addCase(addToCart.pending, onPending)
      .addCase(addToCart.fulfilled, (state, action) => {
        stopAdding(state, action);
        state.loading = false;
        state.cartId = action.payload.cartId || state.cartId;
        state.cart = upsertCartItem(state.cart, action.payload);
        syncCart(state);
      })
      .addCase(addToCart.rejected, (state, action) => { stopAdding(state, action); onRejected(state, action); })

      .addCase(createCartItem.pending, onPending)
      .addCase(createCartItem.fulfilled, (state, action) => {
        stopAdding(state, action);
        state.loading = false;
        state.cartId = action.payload.cartId || state.cartId;
        state.cart = upsertCartItem(state.cart, action.payload);
        syncCart(state);
      })
      .addCase(createCartItem.rejected, (state, action) => { stopAdding(state, action); onRejected(state, action); })

      .addCase(getCartById.pending, onPending)
      .addCase(getCartById.fulfilled, (state, action) => {
        state.loading = false;
        // MERGED lines from the thunk — never the raw GetbyID record, and
        // the canonical id is the one we asked about, not cartData[0]'s.
        state.cartId = resolveCartIdValue(action.meta?.arg) || state.cartId;
        state.cart = dedupeCartItems(normalizeCartItems(action.payload));
        syncCart(state);
      })
      .addCase(getCartById.rejected, onRejected)

      .addCase(updateCartItem.pending, onPending)
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.loading = false;
        state.cart = setCartItemQuantity(
          state.cart,
          action.payload.productId,
          action.payload.quantity
        );
        syncCart(state);
      })
      .addCase(updateCartItem.rejected, onRejected)

      .addCase(deleteCartItem.pending, onPending)
      .addCase(deleteCartItem.fulfilled, (state, action) => {
        state.loading = false;
        state.cart = removeCartItem(state.cart, action.payload.productId);
        // The cart id stays put when the last line goes — emptying the
        // cart must not orphan the server cart behind a brand-new id.
        syncCart(state);
      })
      .addCase(deleteCartItem.rejected, onRejected);
  },
});

export const { clearCart, addCart, removeFromCart, setCartItems, setCartId } = cartSlice.actions;

/* ===========================
   SELECTORS
=========================== */

export const selectCartItems = (state) => (Array.isArray(state.cart?.cart) ? state.cart.cart : []);
export const selectCartId = (state) => state.cart?.cartId || null;
export const selectCartTotals = (state) => cartTotals(selectCartItems(state));
export const selectCartCount = (state) => state.cart?.totalItems || 0;

export default cartSlice.reducer;
