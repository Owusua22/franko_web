import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, getOrCreateCartId } from "../Redux/Slice/cartSlice";

const getProductId = (product) =>
  product?.productId ?? product?.productID ?? product?.ProductId ?? product?.id;

const getErrorMessage = (error) => {
  if (typeof error === "string" && error.trim()) return error;
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  if (typeof error?.data?.message === "string") return error.data.message;
  if (typeof error?.response?.data?.message === "string") return error.response.data.message;
  return "Failed to add product to cart";
};

const useAddToCart = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) =>
    Array.isArray(state.cart?.cart) ? state.cart.cart : [],
  );
  const cartId = useSelector((state) => state.cart?.cartId || null);
  const [loading, setLoading] = useState(false);

  const addProductToCart = useCallback(
    async (product) => {
      const productId = getProductId(product);
      if (productId === undefined || productId === null || productId === "") {
        throw new Error("ProductId is required");
      }

      setLoading(true);

      try {
        // Do not use a stale/non-Tel Redux value directly. The slice and all
        // cart endpoints use this same canonical cart-ID resolver.
        const activeCartId = getOrCreateCartId(cartId);
        const customer = (() => {
          try {
            const raw = localStorage.getItem("customer");
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })();

        const cartData = {
          CartId: activeCartId,
          ProductId: String(productId),
          ProductName: product?.productName ?? product?.ProductName ?? product?.name ?? "",
          ImagePath:
            product?.productImage ??
            product?.imagePath ??
            product?.ProductImage ??
            product?.image ??
            "",
          Price: Number.parseFloat(product?.price ?? product?.Price ?? 0) || 0,
          Quantity: 1,
          CustomerId:
            customer?.customerAccountNumber ??
            customer?.CustomerAccountNumber ??
            customer?.customerId ??
            null,
        };

        // Duplicate products are intentionally allowed. cartSlice merges the
        // line and increases its quantity instead of creating a second row.
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
        throw new Error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [cartId, dispatch],
  );

  return { addProductToCart, loading, cartItems };
};

export default useAddToCart;
