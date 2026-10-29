import { appStorage as localStorage } from "../utils/secureLocalStorageInit";
// src/Component/Cart.jsx
//
// NOTE: despite the file name, this module's default export is the
// useAddToCart hook (every product card / deal rail imports it from here).
// The cart PAGE lives in Pages/Cart.jsx and renders Component/CartView.jsx.

import { useCallback, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { addToCart, getOrCreateCartId, selectCartItems } from "../Redux/Slice/cartSlice";
import { getCartProductId, getCartProductName, getCartImagePath, duplicateCartAdd, CART_ITEM_EXISTS } from "../utils/cartItems.mjs";

const getErrorMessage = (error) => {
  if (typeof error === "string" && error.trim()) return error;
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  if (typeof error?.data?.message === "string") return error.data.message;
  if (typeof error?.response?.data?.message === "string") return error.response.data.message;
  return "Failed to add product to cart";
};

const readCustomer = () => {
  try {
    const raw = localStorage.getItem("customer");
    if (!raw) return null;
    // localStorage is patched app-wide: getItem may already return an object.
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
};

/**
 * Adds a product to the ONE canonical cart. Every add posts under the same
 * cart id (getOrCreateCartId), and the slice upserts the returned line into
 * state.cart — so adding product B never replaces product A, and adding A
 * twice shows the cart-page quantity notice without another POST.
 */
const useAddToCart = () => {
  const dispatch = useDispatch();
  const store = useStore();
  const cartItems = useSelector(selectCartItems);
  const cartId = useSelector((state) => state.cart?.cartId || null);
  const [loading, setLoading] = useState(false);

  const addProductToCart = useCallback(
    async (product) => {
      const productId = getCartProductId(product);
      if (productId === undefined || productId === null || productId === "") {
        throw new Error("ProductId is required");
      }

      const currentCart = store.getState().cart;
      const duplicate = duplicateCartAdd(currentCart, productId, currentCart.cartId);
      if (duplicate) {
        throw Object.assign(new Error(duplicate.message), { code: duplicate.code });
      }

      setLoading(true);
      try {
        const customer = readCustomer();
        const cartData = {
          CartId: getOrCreateCartId(cartId),
          ProductId: String(productId),
          ProductName: getCartProductName(product),
          ImagePath: getCartImagePath(product),
          Price: Number.parseFloat(product?.price ?? product?.Price ?? 0) || 0,
          // Product surfaces add one unit. Only the cart page can change quantity.
          Quantity: 1,
          CustomerId:
            customer?.customerAccountNumber ??
            customer?.CustomerAccountNumber ??
            customer?.customerId ??
            null,
        };

        await dispatch(addToCart(cartData)).unwrap();

        if (typeof window !== "undefined") {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: "add_to_cart",
            ecommerce: {
              items: [
                {
                  item_name: cartData.ProductName,
                  item_id: cartData.ProductId,
                  price: cartData.Price,
                  quantity: cartData.Quantity,
                },
              ],
            },
          });
        }

        return true;
      } catch (error) {
        throw Object.assign(new Error(getErrorMessage(error)), { code: error?.code });
      } finally {
        setLoading(false);
      }
    },
    [cartId, dispatch, store]
  );

  return { addProductToCart, loading, cartItems, cartId };
};

export default useAddToCart;
