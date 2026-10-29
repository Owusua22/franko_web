import { appStorage as localStorage } from "../utils/secureLocalStorageInit";
// src/Component/CartView.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Checkbox from "@material-tailwind/react/components/Checkbox";
import Dialog from "@material-tailwind/react/components/Dialog";
import DialogHeader from "@material-tailwind/react/components/Dialog/DialogHeader";
import DialogBody from "@material-tailwind/react/components/Dialog/DialogBody";
import DialogFooter from "@material-tailwind/react/components/Dialog/DialogFooter";
import {
  TrashIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import {
  updateCartItem,
  deleteCartItem,
  getCartById,
  selectCartItems,
  selectCartId,
} from "../Redux/Slice/cartSlice";
import { cartTotals } from "../utils/cartItems.mjs";
import AuthModal from "./AuthModal";
import useCustomer, { persistCustomer, getCustomerId } from "../hooks/useCustomer";

/* ============================================================================
   CartView — the ONE cart page body, shared by Pages/Cart.jsx (standard,
   green, /cart/:cartId -> /checkout) and Pages/TelCart.jsx (Telecel Speed
   Shopping, red, /tel-cart -> /tel-checkout).
   ========================================================================== */

const BACKEND_BASE_URL = "https://testing.frankotrading.com";
export const TEL_CHECKOUT_ROUTE = "/tel-checkout";

const formatCurrency = (amount, decimals = 2) => {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatGHS = (amount) => `GH₵${formatCurrency(amount, 2)}`;

/* Reusable full-page spinner (also used from Checkout). */
export function FullPageSpinner({ telecel = false, message = "Preparing your cart…" }) {
  return (
    <>
      <style>{cartStyles}</style>
      <div
        className={`cart-root flex items-center justify-center min-h-screen ${telecel ? "cart-root--telecel" : ""}`}
        style={{ background: "var(--cart-bg-subtle)" }}
      >
        <div className="text-center">
          <div className="cart-spinner-large mx-auto mb-4" aria-label="Please wait" role="status"></div>
          <p style={{ color: "var(--cart-mid)", fontWeight: 600, margin: 0 }}>{message}</p>
        </div>
      </div>
    </>
  );
}

const CartProductImage = ({ imagePath, productName }) => {
  const [failed, setFailed] = useState(false);
  const fileName = imagePath ? String(imagePath).split("\\").pop().split("/").pop() : "";
  const imageUrl = fileName ? `${BACKEND_BASE_URL}/Media/Products_Images/${fileName}` : "";

  if (!imageUrl || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--cart-bg-subtle)" }}>
        <span style={{ color: "var(--cart-light)", fontSize: "11px" }}>No Image</span>
      </div>
    );
  }
  return (
    <img
      src={imageUrl}
      alt={productName || "Product"}
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

const CartView = ({ telecel = false, onOpenSidebar = null }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cartId: routeCartId } = useParams();

  const cart = useSelector(selectCartItems);
  const reduxCartId = useSelector(selectCartId);
  const { loading, error } = useSelector((state) => state.cart || {});
  const { isLoggedIn, customer: sessionCustomer } = useCustomer();

  // The route's :cartId (shared/bookmarked cart links) wins; otherwise the
  // canonical session cart id from the slice.
  const cartId = routeCartId || reduxCartId;

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, productId: null, productName: "" });
  const [busyProductId, setBusyProductId] = useState(null);
  const [copiedCartId, setCopiedCartId] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  const fetchedForRef = useRef(null);
  const pendingCheckoutRef = useRef(false);
  const wasLoggedInRef = useRef(isLoggedIn);
  const toastTimerRef = useRef(null);

  const totals = useMemo(() => cartTotals(cart), [cart]);
  const selectAll = cart.length > 0 && selectedItems.length === cart.length;

  const flashToast = useCallback((message) => {
    setToast({ show: true, message });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast({ show: false, message: "" }), 5000);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  /* ---------------- Fetch: once per cart id, merge-only ---------------- */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    // No cart id yet → wait (don't flash empty state). When id arrives
    // we'll fetch; fetchedForRef guards against duplicate dispatches.
    if (!cartId) return;
    if (fetchedForRef.current === cartId) return;
    fetchedForRef.current = cartId;
    dispatch(getCartById(cartId));
  }, [dispatch, cartId]);

  const handleRetryFetch = useCallback(() => {
    if (!cartId) return;
    fetchedForRef.current = null; // allow refetch for the same id
    dispatch(getCartById(cartId));
  }, [dispatch, cartId]);

  /* ------- Selection: prune ids that no longer exist ------- */
  useEffect(() => {
    setSelectedItems((prev) => {
      const pruned = prev.filter((id) => cart.some((item) => item.productId === id));
      return pruned.length === prev.length ? prev : pruned;
    });
  }, [cart]);

  const toggleSelectAll = () => {
    setSelectedItems(selectAll ? [] : cart.map((item) => item.productId));
  };

  const toggleItemSelection = (productId) => {
    setSelectedItems((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  /* ---------------- Checkout hand-off ---------------- */

  const goToCheckout = useCallback(
    (customerOverride) => {
      if (!cart.length) return;

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "proceed_to_checkout",
        cartValue: totals.subtotal.toFixed(2),
        cartItems: cart.map((item) => ({
          productId: item.productId,
          name: item.productName,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      try {
        localStorage.setItem("selectedCart", JSON.stringify(cart));
      } catch {
        /* checkout can fall back to Redux */
      }

      if (telecel) {
        const customer = customerOverride || sessionCustomer || null;
        navigate(TEL_CHECKOUT_ROUTE, {
          state: { cartId, customerId: getCustomerId(customer), items: cart },
        });
      } else {
        navigate("/checkout");
      }
    },
    [cart, cartId, navigate, sessionCustomer, telecel, totals.subtotal]
  );

  const goToCheckoutRef = useRef(goToCheckout);
  goToCheckoutRef.current = goToCheckout;

  const handleCheckout = () => {
    if (!cart.length) return;

    if (telecel) {
      if (!isLoggedIn || !sessionCustomer) {
        pendingCheckoutRef.current = true;
        setAuthModalOpen(true);
        return;
      }
      goToCheckout();
      return;
    }

    let storedCustomer = null;
    try {
      storedCustomer = localStorage.getItem("customer");
    } catch {
      storedCustomer = null;
    }
    if (!storedCustomer && !isLoggedIn) {
      pendingCheckoutRef.current = true;
      setAuthModalOpen(true);
      return;
    }
    goToCheckout();
  };

  /* Auth success (or a fresh login while checkout is pending) -> checkout. */
  useEffect(() => {
    const justLoggedIn = isLoggedIn && !wasLoggedInRef.current;
    wasLoggedInRef.current = isLoggedIn;
    if (justLoggedIn && pendingCheckoutRef.current) {
      pendingCheckoutRef.current = false;
      setAuthModalOpen(false);
      goToCheckoutRef.current();
    }
  }, [isLoggedIn]);

  const handleAuthClose = () => {
    pendingCheckoutRef.current = false;
    setAuthModalOpen(false);
  };

  const handleAuthSuccess = (authedCustomer) => {
    const resolved =
      authedCustomer && typeof authedCustomer === "object" ? authedCustomer : sessionCustomer;
    if (resolved) persistCustomer(resolved);
    pendingCheckoutRef.current = false;
    setAuthModalOpen(false);
    goToCheckoutRef.current(resolved || undefined);
  };

  /* ---------------- Quantity / delete (slice applies them locally) ---------------- */

  const reconcileAfterError = useCallback(() => {
    if (cartId) dispatch(getCartById(cartId));
  }, [cartId, dispatch]);

  const handleQuantityChange = async (productId, quantity) => {
    if (quantity < 1 || busyProductId) return;
    setBusyProductId(productId);
    try {
      await dispatch(updateCartItem({ CartId: cartId, ProductId: String(productId), Quantity: quantity })).unwrap();
    } catch (err) {
      console.error("Error updating quantity:", err);
      flashToast("Failed to update cart. Please check your connection and try again.");
      reconcileAfterError();
    } finally {
      setBusyProductId(null);
    }
  };

  const handleConfirmRemoveItem = async () => {
    const productIdToDelete = deleteModal.productId;
    setDeleteModal({ open: false, productId: null, productName: "" });
    if (!productIdToDelete || busyProductId) return;
    setBusyProductId(productIdToDelete);
    try {
      await dispatch(deleteCartItem({ CartId: cartId, ProductId: String(productIdToDelete) })).unwrap();
      setSelectedItems((prev) => prev.filter((id) => id !== productIdToDelete));
    } catch (err) {
      console.error("Error removing item:", err);
      flashToast("Failed to remove item. Please check your connection and try again.");
      reconcileAfterError();
    } finally {
      setBusyProductId(null);
    }
  };

  const handleBatchDelete = async () => {
    const itemsToDelete = [...selectedItems];
    setBatchDeleteOpen(false);
    if (!itemsToDelete.length) return;
    try {
      await Promise.all(
        itemsToDelete.map((id) =>
          dispatch(deleteCartItem({ CartId: cartId, ProductId: String(id) })).unwrap()
        )
      );
      setSelectedItems([]);
    } catch (err) {
      console.error("Error removing items:", err);
      flashToast("Failed to remove items. Please check your connection and try again.");
      reconcileAfterError();
    }
  };

  const copyCartId = async () => {
    try {
      await navigator.clipboard.writeText(cartId || "");
      setCopiedCartId(true);
      setTimeout(() => setCopiedCartId(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  /* ---------------- Loading / error / empty ----------------
   *
   * Show the spinner, not a blank/empty flash, whenever:
   *   - we don't yet know the cart id (waiting for route/slice), or
   *   - Redux is loading and we have nothing in memory, or
   *   - we've dispatched the initial fetch for a cart id and nothing
   *     has come back yet.
   * Show the error card only when the fetch failed AND nothing is in
   * memory (so a slow network after navigation never replaces the
   * spinner with an error prematurely).
   */

  const initialLoadDone = fetchedForRef.current === cartId && Boolean(cartId);
  const isInitialLoading =
    !cartId || (loading && cart.length === 0) || (!initialLoadDone && cart.length === 0 && !error);

  if (isInitialLoading) {
    return <FullPageSpinner telecel={telecel} message="Preparing your cart…" />;
  }

  if (error && cart.length === 0) {
    return (
      <>
        <style>{cartStyles}</style>
        <div className={`cart-root flex items-center justify-center min-h-screen ${telecel ? "cart-root--telecel" : ""}`} style={{ background: "var(--cart-bg-subtle)" }}>
          <div className="cart-empty-card">
            <div className="cart-empty-icon-wrap" style={{ background: "#fef2f2" }}>
              <ExclamationTriangleIcon className="w-10 h-10" style={{ color: "var(--cart-red)" }} />
            </div>
            <h3 className="cart-empty-title">Oops! Something went wrong</h3>
            <p className="cart-empty-text">We couldn't load your cart. Please try again.</p>
            <button onClick={handleRetryFetch} className="cart-btn cart-btn-primary" style={{ marginTop: "24px" }}>
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ---------------- Main render ---------------- */

  return (
    <>
      <style>{cartStyles}</style>
      <div className={`cart-root min-h-screen ${telecel ? "cart-root--telecel" : ""}`} style={{ background: "var(--cart-bg-subtle)" }}>
        {toast.show && (
          <div className="cart-notification cart-notification-error">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" style={{ color: "var(--cart-red)" }} />
            <p className="cart-notification-text">{toast.message}</p>
            <button onClick={() => setToast({ show: false, message: "" })} className="cart-notification-close">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="cart-header">
          <div className="cart-header-inner">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="cart-back-btn" aria-label="Go back">
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="cart-header-icon">
                  <ShoppingBagIcon className="w-5 h-5" style={{ color: "var(--cart-green)" }} />
                </div>
                <div>
                  <h1 className="cart-header-title">Shopping Cart</h1>
                  {telecel && cartId && (
                    <button type="button" className="cart-id-pill" onClick={copyCartId} title="Copy cart ID">
                      <span>ID {cartId}</span>
                      {copiedCartId ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <ClipboardDocumentIcon className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {telecel && onOpenSidebar && (
                <button type="button" className="cart-quickview-btn" onClick={onOpenSidebar}>
                  <Squares2X2Icon className="w-4 h-4" />
                  <span>Quick view</span>
                </button>
              )}
              {cart.length > 0 && (
                <div className="cart-header-badge">
                  {totals.totalItems} Item{totals.totalItems !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="cart-empty-card">
                <div className="cart-empty-icon-wrap">
                  <ShoppingBagIcon className="w-12 h-12" style={{ color: "var(--cart-border)" }} />
                </div>
                <h3 className="cart-empty-title">Your cart is empty</h3>
                <p className="cart-empty-text">
                  Looks like you haven't added anything to your cart yet. Start shopping to fill it up!
                </p>
                <div className="space-y-3" style={{ marginTop: "32px" }}>
                  <button onClick={() => navigate("/products")} className="cart-btn cart-btn-primary w-full">
                    Continue Shopping
                  </button>
                  <button onClick={() => navigate("/")} className="cart-btn cart-btn-outline w-full">
                    Back to Home
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="cart-controls">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    label={<span className="cart-select-label">Select All ({cart.length} items)</span>}
                    ripple={false}
                    className="hover:before:opacity-10"
                    color={telecel ? "red" : "green"}
                  />
                </div>
                {selectedItems.length > 0 && (
                  <button onClick={() => setBatchDeleteOpen(true)} className="cart-delete-selected-btn">
                    <TrashIcon className="w-4 h-4" />
                    Delete Selected ({selectedItems.length})
                  </button>
                )}
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="cart-items-container">
                    {cart.map((item, index) => {
                      const lineTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1);
                      const busy = busyProductId === item.productId;
                      return (
                        <div key={item.productId}>
                          <div className="cart-item">
                            <div className="cart-item-inner">
                              <div className="cart-item-left">
                                <Checkbox
                                  checked={selectedItems.includes(item.productId)}
                                  onChange={() => toggleItemSelection(item.productId)}
                                  ripple={false}
                                  className="hover:before:opacity-10"
                                  color={telecel ? "red" : "green"}
                                />
                                <div className="cart-item-image">
                                  <CartProductImage imagePath={item.imagePath} productName={item.productName} />
                                </div>
                                <div className="cart-item-info">
                                  <h4 className="cart-item-name">{item.productName}</h4>
                                  <p className="cart-item-price">{formatGHS(item.price)}</p>
                                </div>
                              </div>

                              <div className="cart-item-right">
                                <div className="cart-qty-control">
                                  <button
                                    className="cart-qty-btn"
                                    onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                                    disabled={item.quantity <= 1 || busy}
                                    aria-label="Decrease quantity"
                                  >
                                    <MinusIcon className="w-4 h-4" />
                                  </button>
                                  <span className="cart-qty-value">{item.quantity}</span>
                                  <button
                                    className="cart-qty-btn"
                                    onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                                    disabled={busy}
                                    aria-label="Increase quantity"
                                  >
                                    <PlusIcon className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="cart-item-total">{formatGHS(lineTotal)}</div>

                                <button
                                  className="cart-remove-btn"
                                  onClick={() => setDeleteModal({ open: true, productId: item.productId, productName: item.productName })}
                                  disabled={busy}
                                  aria-label={`Remove ${item.productName}`}
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          {index < cart.length - 1 && <div className="cart-divider" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="hidden lg:block w-96">
                  <div className="cart-summary">
                    <div className="cart-summary-header">
                      <div className="cart-summary-icon">
                        <ShoppingBagIcon className="w-4 h-4" style={{ color: "var(--cart-green)" }} />
                      </div>
                      <h2 className="cart-summary-title">Order Summary</h2>
                    </div>
                    <div className="cart-summary-body">
                      <div className="cart-summary-row">
                        <span className="cart-summary-label">Subtotal ({totals.totalItems} items):</span>
                        <span className="cart-summary-value">{formatGHS(totals.subtotal)}</span>
                      </div>
                      <div className="cart-divider" style={{ margin: "16px 0" }} />
                      <div className="cart-summary-row">
                        <span className="cart-summary-total-label">Total:</span>
                        <span className="cart-summary-total-value">{formatGHS(totals.subtotal)}</span>
                      </div>
                    </div>
                    <p className="cart-summary-note">* Taxes, discounts & shipping calculated at checkout</p>
                    <div className="cart-summary-actions">
                      <button onClick={handleCheckout} className="cart-btn cart-btn-primary w-full">
                        Proceed to Checkout
                      </button>
                      <button onClick={() => navigate("/products")} className="cart-btn cart-btn-outline w-full">
                        Continue Shopping
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Order summary — mobile fixed bottom */}
        {cart.length > 0 && (
          <div className="cart-mobile-summary">
            <div className="cart-mobile-summary-inner">
              <div className="cart-mobile-summary-row">
                <span className="cart-mobile-summary-label">Cart Total:</span>
                <span className="cart-mobile-summary-value">{formatGHS(totals.subtotal)}</span>
              </div>
              <button onClick={handleCheckout} className="cart-btn cart-btn-primary w-full">
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}

        <Dialog open={batchDeleteOpen} handler={setBatchDeleteOpen} className="cart-dialog">
          <DialogHeader className="cart-dialog-header">
            <div className="flex items-center gap-2">
              <TrashIcon className="w-5 h-5" style={{ color: "var(--cart-red)" }} />
              <span>Confirm Deletion</span>
            </div>
          </DialogHeader>
          <DialogBody className="cart-dialog-body">
            Are you sure you want to remove {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} from your cart? This action cannot be undone.
          </DialogBody>
          <DialogFooter className="cart-dialog-footer">
            <button onClick={() => setBatchDeleteOpen(false)} className="cart-btn cart-btn-outline">Cancel</button>
            <button onClick={handleBatchDelete} className="cart-btn cart-btn-danger">Remove Items</button>
          </DialogFooter>
        </Dialog>

        <Dialog
          open={deleteModal.open}
          handler={() => setDeleteModal({ open: false, productId: null, productName: "" })}
          className="cart-dialog"
        >
          <DialogHeader className="cart-dialog-header">
            <div className="flex items-center gap-2">
              <TrashIcon className="w-5 h-5" style={{ color: "var(--cart-red)" }} />
              <span>Remove Item</span>
            </div>
          </DialogHeader>
          <DialogBody className="cart-dialog-body">
            Are you sure you want to remove "<strong style={{ color: "var(--cart-dark)" }}>{deleteModal.productName}</strong>" from your cart? This action cannot be undone.
          </DialogBody>
          <DialogFooter className="cart-dialog-footer">
            <button onClick={() => setDeleteModal({ open: false, productId: null, productName: "" })} className="cart-btn cart-btn-outline">Cancel</button>
            <button onClick={handleConfirmRemoveItem} className="cart-btn cart-btn-danger">Remove Item</button>
          </DialogFooter>
        </Dialog>

        {telecel ? (
          <AuthModal
            open={authModalOpen}
            onClose={handleAuthClose}
            onSuccess={handleAuthSuccess}
            currentCustomer={sessionCustomer}
            initialMode="signup"
            allowGuest={false}
            autoLoginAfterSignup
            notice="Create an account or sign in to complete your Speed Shopping order."
          />
        ) : (
          <AuthModal open={authModalOpen} onClose={handleAuthClose} onSuccess={handleAuthSuccess} />
        )}
      </div>
    </>
  );
};

/* ==================== STYLES ==================== */

const cartStyles = `
  :root {
    --cart-font: 'Plus Jakarta Sans', sans-serif;
    --cart-green: #14532d;
    --cart-green-mid: #166534;
    --cart-green-light: #dcfce7;
    --cart-green-lighter: #f0fdf4;
    --cart-green-accent: #22c55e;
    --cart-dark: #1a1a1a;
    --cart-mid: #555;
    --cart-light: #888;
    --cart-border: #e0e0e0;
    --cart-bg-subtle: #f7f7f7;
    --cart-red: #dc2626;
    --cart-radius: 4px;
  }

  .cart-root--telecel {
    --cart-green: #A80F1B;
    --cart-green-mid: #BB1420;
    --cart-green-light: #FDF0F0;
    --cart-green-lighter: #fdf6f6;
    --cart-green-accent: #BB1420;
  }

  .cart-root, .cart-root * {
    font-family: var(--cart-font);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    box-sizing: border-box;
  }

  .cart-header { background: #fff; border-bottom: 1px solid var(--cart-border); position: sticky; top: 0; z-index: 40; }
  .cart-header-inner { max-width: 1280px; margin: 0 auto; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; }
  .cart-back-btn { width: 40px; height: 40px; border-radius: 50%; background: var(--cart-bg-subtle); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; color: var(--cart-mid); }
  .cart-back-btn:hover { background: var(--cart-green-light); color: var(--cart-green); }
  .cart-header-icon { width: 36px; height: 36px; background: var(--cart-green-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .cart-header-title { font-size: 20px; font-weight: 800; color: var(--cart-dark); letter-spacing: -0.02em; margin: 0; }
  @media (min-width: 768px) { .cart-header-title { font-size: 24px; } }
  .cart-header-badge { background: var(--cart-green-light); color: var(--cart-green); padding: 4px 12px; border-radius: 100px; font-size: 13px; font-weight: 700; }
  .cart-id-pill { display: inline-flex; align-items: center; gap: 5px; margin-top: 3px; padding: 2px 8px; border-radius: 100px; background: var(--cart-green-light); color: var(--cart-green); border: none; cursor: pointer; font: 600 10px ui-monospace, SFMono-Regular, Menlo, monospace; max-width: 210px; }
  .cart-id-pill span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cart-quickview-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 100px; background: var(--cart-bg-subtle); color: var(--cart-mid); border: 1px solid var(--cart-border); cursor: pointer; font-size: 12px; font-weight: 700; }
  .cart-quickview-btn:hover { background: var(--cart-green-light); color: var(--cart-green); }

  .cart-notification { position: fixed; top: 16px; right: 16px; z-index: 50; max-width: 400px; padding: 12px 16px; border-radius: var(--cart-radius); border-left: 4px solid; display: flex; align-items: center; gap: 10px; animation: cart-slide-in 0.3s ease-out; }
  .cart-notification-error { background: #fef2f2; border-left-color: var(--cart-red); }
  .cart-notification-text { font-size: 13px; font-weight: 500; color: #991b1b; flex: 1; margin: 0; }
  .cart-notification-close { background: transparent; border: none; cursor: pointer; padding: 4px; color: var(--cart-red); transition: opacity 0.2s; }
  .cart-notification-close:hover { opacity: 0.7; }
  @keyframes cart-slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

  .cart-empty-card { background: #fff; padding: 48px 32px; border-radius: var(--cart-radius); border: 1px solid var(--cart-border); max-width: 400px; text-align: center; }
  .cart-empty-icon-wrap { width: 96px; height: 96px; background: var(--cart-bg-subtle); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
  .cart-empty-title { font-size: 22px; font-weight: 800; color: var(--cart-dark); margin: 0 0 8px; letter-spacing: -0.02em; }
  .cart-empty-text { font-size: 14px; color: var(--cart-light); line-height: 1.6; margin: 0; }

  .cart-controls { background: #fff; border: 1px solid var(--cart-border); border-radius: var(--cart-radius); padding: 12px 16px; margin-bottom: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
  .cart-select-label { font-size: 14px; font-weight: 600; color: var(--cart-mid); }
  .cart-delete-selected-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--cart-radius); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; background: #fef2f2; color: var(--cart-red); border: 1px solid #fecaca; }
  .cart-delete-selected-btn:hover { background: #fecaca; }

  .cart-items-container { background: #fff; border: 1px solid var(--cart-border); border-radius: var(--cart-radius); overflow: hidden; }
  .cart-item { padding: 16px; transition: background 0.2s ease; }
  .cart-item:hover { background: var(--cart-green-lighter); }
  .cart-item-inner { display: flex; flex-direction: column; gap: 16px; }
  @media (min-width: 640px) { .cart-item-inner { flex-direction: row; align-items: center; justify-content: space-between; } }
  .cart-item-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
  .cart-item-image { width: 72px; height: 72px; background: var(--cart-bg-subtle); border-radius: var(--cart-radius); overflow: hidden; flex-shrink: 0; }
  .cart-item-info { flex: 1; min-width: 0; }
  .cart-item-name { font-size: 15px; font-weight: 600; color: var(--cart-dark); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0 0 4px; }
  .cart-item-price { font-size: 15px; font-weight: 900; color: var(--cart-red); margin: 0; }
  .cart-item-right { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  @media (min-width: 640px) { .cart-item-right { justify-content: flex-end; gap: 24px; } }
  .cart-item-total { font-size: 15px; font-weight: 800; color: var(--cart-dark); min-width: 80px; text-align: right; }
  .cart-remove-btn { width: 36px; height: 36px; background: #fef2f2; border: none; border-radius: var(--cart-radius); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; color: var(--cart-red); }
  .cart-remove-btn:hover:not(:disabled) { background: #fecaca; }
  .cart-remove-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .cart-divider { height: 1px; background: var(--cart-border); }

  .cart-qty-control { display: flex; align-items: center; background: var(--cart-bg-subtle); border: 1px solid var(--cart-border); border-radius: var(--cart-radius); }
  .cart-qty-btn { width: 36px; height: 36px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; color: var(--cart-mid); }
  .cart-qty-btn:hover:not(:disabled) { background: var(--cart-green-light); color: var(--cart-green); }
  .cart-qty-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .cart-qty-value { width: 40px; text-align: center; font-size: 14px; font-weight: 700; color: var(--cart-dark); }

  .cart-summary { background: #fff; border: 1px solid var(--cart-border); border-radius: var(--cart-radius); padding: 24px; position: sticky; top: 80px; }
  .cart-summary-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
  .cart-summary-icon { width: 28px; height: 28px; background: var(--cart-green-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .cart-summary-title { font-size: 18px; font-weight: 800; color: var(--cart-dark); margin: 0; letter-spacing: -0.02em; }
  .cart-summary-body { margin-bottom: 16px; }
  .cart-summary-row { display: flex; justify-content: space-between; align-items: center; }
  .cart-summary-label { font-size: 14px; color: var(--cart-mid); }
  .cart-summary-value { font-size: 14px; font-weight: 600; color: var(--cart-dark); }
  .cart-summary-total-label { font-size: 16px; font-weight: 700; color: var(--cart-dark); }
  .cart-summary-total-value { font-size: 20px; font-weight: 900; color: var(--cart-red); }
  .cart-summary-note { font-size: 11px; color: var(--cart-light); text-align: center; margin: 0 0 20px; }
  .cart-summary-actions { display: flex; flex-direction: column; gap: 10px; }

  .cart-mobile-summary { display: block; position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid var(--cart-border); box-shadow: 0 -4px 20px rgba(0,0,0,0.08); z-index: 50; }
  @media (min-width: 1024px) { .cart-mobile-summary { display: none; } }
  .cart-mobile-summary-inner { max-width: 100%; padding: 16px; }
  .cart-mobile-summary-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .cart-mobile-summary-label { font-size: 14px; font-weight: 600; color: var(--cart-mid); }
  .cart-mobile-summary-value { font-size: 18px; font-weight: 900; color: var(--cart-red); }

  .cart-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 24px; border-radius: var(--cart-radius); font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; border: 2px solid transparent; }
  .cart-btn-primary { background: var(--cart-green); color: #fff; border-color: var(--cart-green); }
  .cart-btn-primary:hover { background: var(--cart-green-mid); border-color: var(--cart-green-mid); box-shadow: 0 4px 16px rgba(20, 83, 45, 0.2); }
  .cart-btn-outline { background: #fff; color: var(--cart-mid); border-color: var(--cart-border); }
  .cart-btn-outline:hover { background: var(--cart-bg-subtle); border-color: var(--cart-green-accent); }
  .cart-btn-danger { background: var(--cart-red); color: #fff; border-color: var(--cart-red); }
  .cart-btn-danger:hover { background: #b91c1c; border-color: #b91c1c; }

  .cart-dialog { border-radius: var(--cart-radius) !important; font-family: var(--cart-font) !important; }
  .cart-dialog-header { font-size: 18px; font-weight: 800; color: var(--cart-dark); padding: 20px 24px; border-bottom: 1px solid var(--cart-border); }
  .cart-dialog-body { font-size: 14px; color: var(--cart-mid); line-height: 1.6; padding: 20px 24px; }
  .cart-dialog-footer { padding: 16px 24px; border-top: 1px solid var(--cart-border); display: flex; justify-content: flex-end; gap: 10px; }

  .cart-spinner-large { width: 40px; height: 40px; border: 3px solid var(--cart-green-light); border-top-color: var(--cart-green); border-radius: 50%; animation: cart-spin 0.8s linear infinite; }
  @keyframes cart-spin { to { transform: rotate(360deg); } }
`;

export default CartView;
