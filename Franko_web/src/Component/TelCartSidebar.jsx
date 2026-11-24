import { appStorage as localStorage } from "../utils/secureLocalStorageInit";
// src/Component/TelCartSidebar.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  XMarkIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  ShoppingBagIcon,
  ArrowRightIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { ShoppingCartIcon } from "@heroicons/react/24/solid";

import {
  updateCartItem,
  deleteCartItem,
  getCartById,
  selectCartItems,
  selectCartId,
} from "../Redux/Slice/cartSlice";
import { cartTotals } from "../utils/cartItems.mjs";
import useCustomer, { persistCustomer, getCustomerId } from "../hooks/useCustomer";
import AuthModal from "./AuthModal";
import telecelWhite from "../assets/Telecel White.png";
import speedLogo from "../assets/speed-logo.png";

import { CMS_BASE_URL } from "../config/media";

/* ============================================================================
   Telecel cart drawer. It renders the SAME Redux cart as the cart pages
   (state.cart via cartSlice) — every product line, keyed by productId.

   Like CartView, it owns no cart data: opening the drawer fires ONE
   merge-fetch for the canonical cart id, and quantity/remove go through
   the slice thunks, which update the store directly. The previous version
   rewrote localStorage by hand and refetched after every click; because
   getCartById replaced the cart with the single record it returned, that
   refetch is what made all-but-one product disappear from the drawer too.
   ========================================================================== */

const TEL_CHECKOUT_ROUTE = "/tel-checkout";
const BACKEND_BASE_URL = CMS_BASE_URL;

const formatCurrency = (amount, decimals = 2) => {
  const number = parseFloat(amount) || 0;
  return number.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatGHS = (amount) => `GH₵${formatCurrency(amount, 2)}`;

const CartProductImage = ({ imagePath, productName }) => {
  const [failed, setFailed] = useState(false);
  const fileName = imagePath ? String(imagePath).split("\\").pop().split("/").pop() : "";
  const imageUrl = fileName ? `${BACKEND_BASE_URL}/Media/Products_Images/${fileName}` : "";

  if (!imageUrl || failed) {
    return (
      <div className="telcart-item-no-image" role="img" aria-label={`No image available for ${productName || "this product"}`}>
        <span aria-hidden="true">No Image</span>
      </div>
    );
  }
  return <img src={imageUrl} alt={productName || "Product"} loading="lazy" onError={() => setFailed(true)} />;
};

/* Provider lets any page open the same Telecel cart drawer. */
const TelCartSidebarContext = createContext(null);

export const TelCartSidebarProvider = ({
  children,
  checkoutPath = TEL_CHECKOUT_ROUTE,
  checkoutDisabled = false,
  checkoutDisabledMessage = "Ordering isn't open yet — browse for now.",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);
  const toggleSidebar = useCallback(() => setIsOpen((previous) => !previous), []);

  const value = useMemo(
    () => ({ isOpen, openSidebar, closeSidebar, toggleSidebar }),
    [isOpen, openSidebar, closeSidebar, toggleSidebar]
  );

  return (
    <TelCartSidebarContext.Provider value={value}>
      {children}
      <TelCartSidebar
        open={isOpen}
        onClose={closeSidebar}
        checkoutPath={checkoutPath}
        checkoutDisabled={checkoutDisabled}
        checkoutDisabledMessage={checkoutDisabledMessage}
      />
    </TelCartSidebarContext.Provider>
  );
};

export const useTelCartSidebar = () => {
  const context = useContext(TelCartSidebarContext);
  if (!context) throw new Error("useTelCartSidebar must be used inside <TelCartSidebarProvider>");
  return context;
};

const TelCartSidebar = ({
  open = false,
  onClose,
  checkoutPath = TEL_CHECKOUT_ROUTE,
  checkoutDisabled = false,
  checkoutDisabledMessage = "Ordering isn't open yet — browse for now.",
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector(selectCartItems);
  const cartId = useSelector(selectCartId);
  const loading = useSelector((state) => Boolean(state.cart?.loading));
  const { isLoggedIn, customer: sessionCustomer } = useCustomer();

  const [authOpen, setAuthOpen] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [busyProductId, setBusyProductId] = useState(null);
  const [networkError, setNetworkError] = useState({ show: false, message: "" });
  const wasLoggedIn = useRef(isLoggedIn);
  const checkoutStartedRef = useRef(false);
  const errorTimeoutRef = useRef(null);
  const fetchedForRef = useRef(null);

  const totals = useMemo(() => cartTotals(items), [items]);

  const flashError = useCallback((message) => {
    setNetworkError({ show: true, message });
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setNetworkError({ show: false, message: "" }), 5000);
  }, []);

  useEffect(() => () => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (open) checkoutStartedRef.current = false;
  }, [open]);

  /* Opening the drawer loads the cart ONCE per cart id (merge-fetch). */
  useEffect(() => {
    if (!open || !cartId || fetchedForRef.current === cartId) return;
    fetchedForRef.current = cartId;
    dispatch(getCartById(cartId));
  }, [dispatch, open, cartId]);

  /* Escape closes the drawer and prevents the page behind it from scrolling. */
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const reconcileAfterError = useCallback(() => {
    if (cartId) dispatch(getCartById(cartId));
  }, [cartId, dispatch]);

  const handleQuantityChange = useCallback(
    async (productId, quantity) => {
      if (quantity < 1 || !cartId || busyProductId) return;
      setBusyProductId(productId);
      try {
        await dispatch(
          updateCartItem({ CartId: cartId, ProductId: String(productId), Quantity: quantity })
        ).unwrap();
      } catch (error) {
        console.error("Error updating quantity:", error);
        flashError("Failed to update cart. Please check your connection and try again.");
        reconcileAfterError();
      } finally {
        setBusyProductId(null);
      }
    },
    [cartId, dispatch, flashError, busyProductId, reconcileAfterError]
  );

  const handleRemoveItem = useCallback(
    async (productId) => {
      if (!cartId || busyProductId) return;
      setBusyProductId(productId);
      try {
        await dispatch(
          deleteCartItem({ CartId: cartId, ProductId: String(productId) })
        ).unwrap();
      } catch (error) {
        console.error("Error removing item:", error);
        flashError("Failed to remove item. Please check your connection and try again.");
        reconcileAfterError();
      } finally {
        setBusyProductId(null);
      }
    },
    [cartId, dispatch, flashError, busyProductId, reconcileAfterError]
  );

  const completeCheckout = useCallback(
    ({ customerId: overrideCustomerId } = {}) => {
      if (checkoutStartedRef.current) return;
      checkoutStartedRef.current = true;
      setPendingCheckout(false);

      const lines = items.map((item) => ({
        ...item,
        total: (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1),
      }));

      try {
        localStorage.setItem("selectedCart", JSON.stringify(lines));
      } catch {
        /* Checkout can read Redux */
      }
      onClose?.();
      navigate(checkoutPath, {
        state: {
          cartId,
          customerId: overrideCustomerId || getCustomerId(sessionCustomer) || null,
          items: lines,
        },
      });
    },
    [cartId, checkoutPath, items, navigate, onClose, sessionCustomer]
  );

  const handleCheckout = useCallback(() => {
    if (!items.length || checkoutDisabled) return;
    if (isLoggedIn) {
      completeCheckout();
      return;
    }
    checkoutStartedRef.current = false;
    setPendingCheckout(true);
    setAuthOpen(true);
  }, [checkoutDisabled, completeCheckout, isLoggedIn, items.length]);

  useEffect(() => {
    const justLoggedIn = isLoggedIn && !wasLoggedIn.current;
    wasLoggedIn.current = isLoggedIn;
    if (!justLoggedIn || !pendingCheckout || checkoutStartedRef.current) return;
    setAuthOpen(false);
    completeCheckout();
  }, [completeCheckout, isLoggedIn, pendingCheckout]);

  const handleAuthClose = () => {
    setAuthOpen(false);
    setPendingCheckout(false);
    checkoutStartedRef.current = false;
  };

  const handleAuthSuccess = useCallback(
    (authenticatedCustomer) => {
      const resolved =
        authenticatedCustomer && typeof authenticatedCustomer === "object"
          ? authenticatedCustomer
          : sessionCustomer;
      if (resolved) persistCustomer(resolved);
      setAuthOpen(false);
      completeCheckout({ customerId: getCustomerId(resolved) });
    },
    [completeCheckout, sessionCustomer]
  );

  return (
    <>
      <style>{sidebarStyles}</style>
      <button
        type="button"
        className={`telcart-backdrop ${open ? "is-open" : ""}`}
        onClick={onClose}
        aria-label="Close cart sidebar"
        tabIndex={open ? 0 : -1}
      />

      <aside
        className={`telcart-drawer ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Telecel shopping cart"
        aria-hidden={!open}
      >
        <header className="telcart-header">
          <div className="telcart-brand-row">
            <div className="telcart-brand">
              <img src={telecelWhite} alt="Telecel" className="telcart-brand-logo telcart-telecel-logo" />
              <span className="telcart-brand-divider" aria-hidden="true" />
              <img src={speedLogo} alt="Speed Shopping" className="telcart-brand-logo telcart-speed-logo" />
            </div>
            <button type="button" className="telcart-close" onClick={onClose} aria-label="Close cart">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="telcart-title-row">
            <span className="telcart-header-icon"><ShoppingCartIcon className="h-5 w-5" /></span>
            <div className="telcart-header-text">
              <h2 className="telcart-title">Your Cart</h2>
              <p className="telcart-cartid" title={cartId || ""}>{cartId || "Tel cart"}</p>
            </div>
            <span className="telcart-count-badge">{totals.totalItems} {totals.totalItems === 1 ? "item" : "items"}</span>
          </div>
        </header>

        {!isLoggedIn && items.length > 0 && (
          <div className="telcart-auth-strip">
            <LockClosedIcon className="h-4 w-4 flex-shrink-0" />
            <p><strong>Register to check out.</strong> Sign in or register when you tap Checkout to complete your order.</p>
          </div>
        )}
        {networkError.show && (
          <div className="telcart-notice telcart-notice-error">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
            <span>{networkError.message}</span>
          </div>
        )}

        <div className="telcart-body">
          {loading && items.length === 0 ? (
            <div className="telcart-loading">
              <div className="telcart-spinner" />
              <p></p>
            </div>
          ) : items.length === 0 ? (
            <div className="telcart-empty">
              <span className="telcart-empty-icon"><ShoppingBagIcon className="h-7 w-7" /></span>
              <h3>Your cart is empty</h3>
              <p>Add a Speed Shopping deal and it will show up here.</p>
              <button type="button" className="telcart-btn telcart-btn-primary" onClick={onClose}>
                Continue shopping
              </button>
            </div>
          ) : (
            <ul className="telcart-list">
              {items.map((item) => {
                const unitPrice = parseFloat(item.price) || 0;
                const quantity = parseInt(item.quantity, 10) || 1;
                const busy = busyProductId === item.productId;

                return (
                  <li key={item.productId} className="telcart-item">
                    <div className="telcart-item-left">
                      <div className="telcart-item-image">
                        <CartProductImage imagePath={item.imagePath} productName={item.productName} />
                      </div>
                      <div className="telcart-item-main">
                        <h3 className="telcart-item-name">{item.productName}</h3>
                        <p className="telcart-item-price">{formatGHS(unitPrice)}</p>
                      </div>
                    </div>

                    <div className="telcart-item-row">
                      <div className="telcart-qty">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.productId, quantity - 1)}
                          disabled={quantity <= 1 || busy}
                          aria-label="Decrease quantity"
                        >
                          <MinusIcon className="h-3.5 w-3.5" />
                        </button>
                        <span>{quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.productId, quantity + 1)}
                          disabled={busy}
                          aria-label="Increase quantity"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="telcart-line-total">{formatGHS(unitPrice * quantity)}</p>
                      <button
                        type="button"
                        className="telcart-remove"
                        onClick={() => handleRemoveItem(item.productId)}
                        disabled={busy}
                        aria-label={`Remove ${item.productName}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="telcart-footer">
            <div className="telcart-total-card">
              <div className="telcart-total-row">
                <span>Subtotal ({totals.totalItems} items)</span>
                <strong>{formatGHS(totals.subtotal)}</strong>
              </div>
              <p className="telcart-note">Taxes, discounts &amp; delivery calculated at checkout.</p>
            </div>
            <button
              type="button"
              className="telcart-btn telcart-btn-primary telcart-btn-block"
              onClick={handleCheckout}
              disabled={checkoutDisabled}
            >
              {isLoggedIn ? "Checkout" : "Register & Checkout"}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            {checkoutDisabled && (
              <p className="telcart-note telcart-note-warning">{checkoutDisabledMessage}</p>
            )}
            <button
              type="button"
              className="telcart-btn telcart-btn-ghost telcart-btn-block"
              onClick={onClose}
            >
              Continue shopping
            </button>
          </footer>
        )}
      </aside>

      <AuthModal
        open={authOpen}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
        currentCustomer={sessionCustomer}
        initialMode="signup"
        allowGuest={false}
        autoLoginAfterSignup
        notice="Create an account or sign in to complete your Speed Shopping order."
      />
    </>
  );
};

const sidebarStyles = `
  .telcart-backdrop { position: fixed; inset: 0; border: 0; padding: 0; background: rgba(20,26,22,.45); opacity: 0; pointer-events: none; transition: opacity .25s ease; z-index: 9000; }
  .telcart-backdrop.is-open { opacity: 1; pointer-events: auto; }
  .telcart-drawer { position: fixed; top: 0; right: 0; height: 100%; width: 100%; max-width: 420px; background: #fff; box-shadow: -8px 0 30px rgba(0,0,0,.18); display: flex; flex-direction: column; transform: translateX(100%); transition: transform .28s cubic-bezier(.32,.72,0,1); z-index: 9001; }
  .telcart-drawer, .telcart-drawer * { font-family: 'Plus Jakarta Sans',sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; box-sizing: border-box; }
  .telcart-drawer.is-open { transform: translateX(0); }
  .telcart-header { padding: 14px 18px 16px; border-bottom: 1px solid #eee6e7; background: linear-gradient(90deg,#A80F1B 0%,#BB1420 50%,#A80F1B 100%); color: #fff; }
  .telcart-brand-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .telcart-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .telcart-brand-logo { width: auto; object-fit: contain; }
  .telcart-telecel-logo { height: 22px; max-width: 108px; }
  .telcart-speed-logo { height: 32px; max-width: 135px; }
  .telcart-brand-divider { width: 1px; height: 22px; background: rgba(255,255,255,.28); flex-shrink: 0; }
  .telcart-title-row { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
  .telcart-header-text { min-width: 0; flex: 1; }
  .telcart-header-icon { width: 36px; height: 36px; border-radius: 12px; background: rgba(255,255,255,.16); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #FFD400; }
  .telcart-title { margin: 0; font-size: 16px; font-weight: 800; letter-spacing: -.01em; }
  .telcart-cartid { margin: 2px 0 0; font: 10px ui-monospace,SFMono-Regular,Menlo,monospace; color: rgba(255,255,255,.75); max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .telcart-count-badge { margin-left: 4px; padding: 3px 10px; border-radius: 100px; background: #FFD400; color: #7A0B13; font-size: 11px; font-weight: 800; white-space: nowrap; }
  .telcart-close { background: rgba(255,255,255,.14); border: 0; color: #fff; width: 34px; height: 34px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s ease; flex-shrink: 0; }
  .telcart-close:hover { background: rgba(255,255,255,.24); }
  .telcart-auth-strip { display: flex; align-items: flex-start; gap: 8px; padding: 10px 18px; background: #FFF8DB; border-bottom: 1px solid #E5CD75; color: #6f5410; font-size: 12px; line-height: 1.45; }
  .telcart-auth-strip p { margin: 0; }
  .telcart-auth-strip svg { color: #A87D00; margin-top: 1px; }
  .telcart-notice { display: flex; align-items: center; gap: 8px; padding: 10px 18px; font-size: 12px; font-weight: 600; }
  .telcart-notice-error { background: #F6EEEE; color: #8C3D45; }
  .telcart-body { flex: 1; overflow-y: auto; padding: 14px 18px; background: #fcfbfa; }
  .telcart-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; }
  .telcart-item { display: flex; flex-direction: column; align-items: stretch; gap: 16px; padding: 16px; background: #fff; border-bottom: 1px solid #e0e0e0; transition: background .2s ease; }
  .telcart-item:last-child { border-bottom: 0; }
  .telcart-item:hover { background: #f0fdf4; }
  .telcart-item-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
  .telcart-item-image { width: 72px; height: 72px; border-radius: 4px; background: #f7f7f7; flex-shrink: 0; overflow: hidden; }
  .telcart-item-image img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .telcart-item-no-image { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f7f7f7; }
  .telcart-item-no-image span { color: #888; font-size: 11px; }
  .telcart-item-main { flex: 1; min-width: 0; }
  .telcart-item-name { margin: 0 0 4px; color: #1a1a1a; font-size: 15px; font-weight: 600; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .telcart-item-price { margin: 0; color: #dc2626; font-size: 15px; font-weight: 900; }
  .telcart-item-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .telcart-qty { display: flex; align-items: center; background: #f7f7f7; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; }
  .telcart-qty button { width: 28px; height: 28px; border: 0; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #555; }
  .telcart-qty button:hover:not(:disabled) { background: #dcfce7; color: #14532d; }
  .telcart-qty button:disabled { opacity: .35; cursor: not-allowed; }
  .telcart-qty span { min-width: 30px; text-align: center; font-size: 12px; font-weight: 700; color: #1a1a1a; }
  .telcart-line-total { margin: 0; min-width: 84px; text-align: right; font-size: 14px; font-weight: 800; color: #1a1a1a; }
  .telcart-remove { width: 30px; height: 30px; border: 0; border-radius: 4px; cursor: pointer; background: #fef2f2; color: #dc2626; display: flex; align-items: center; justify-content: center; }
  .telcart-remove:hover:not(:disabled) { background: #fecaca; }
  .telcart-remove:disabled { opacity: .4; cursor: not-allowed; }
  .telcart-loading,.telcart-empty { min-height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 16px; gap: 6px; background: #fff; border: 1px solid #e0e0e0; border-radius: 4px; }
  .telcart-loading p { margin: 0; font-size: 13px; color: #6d7a74; }
  .telcart-spinner { width: 34px; height: 34px; border: 3px solid #FDF0F0; border-top-color: #BB1420; border-radius: 50%; animation: telcart-spin .8s linear infinite; margin-bottom: 10px; }
  @keyframes telcart-spin { to { transform: rotate(360deg); } }
  .telcart-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: #FDF0F0; color: #BB1420; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
  .telcart-empty h3 { margin: 0; font-size: 17px; font-weight: 800; color: #2c3330; }
  .telcart-empty p { margin: 0 0 14px; font-size: 13px; color: #6d7a74; line-height: 1.5; }
  .telcart-footer { border-top: 1px solid #eee6e7; padding: 14px 18px 18px; display: flex; flex-direction: column; gap: 10px; background: #fff; }
  .telcart-total-card { border-radius: 10px; padding: 12px 14px 10px; background: linear-gradient(135deg,#FDF0F0 0%,#FBF7F5 100%); border: 1px solid #F0DCDC; }
  .telcart-total-row { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: #555; }
  .telcart-total-row strong { font-size: 20px; font-weight: 900; color: #BB1420; }
  .telcart-note { margin: 4px 0 0; font-size: 11px; color: #8a928e; }
  .telcart-note-warning { color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 10px; font-weight: 600; text-align: center; }
  .telcart-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; border: 2px solid transparent; transition: all .2s ease; font-family: inherit; }
  .telcart-btn-block { width: 100%; }
  .telcart-btn-primary { background: #BB1420; border-color: #BB1420; color: #fff; }
  .telcart-btn-primary:hover:not(:disabled) { background: #A80F1B; border-color: #A80F1B; }
  .telcart-btn:disabled { opacity: .5; cursor: not-allowed; }
  .telcart-btn-ghost { background: #fff; border-color: #e3ded9; color: #5c6661; }
  .telcart-btn-ghost:hover { background: #f7f5f3; border-color: #E4CFD1; }
  @media (max-width: 360px) { .telcart-body { padding: 10px; } }
  @media (prefers-reduced-motion: reduce) { .telcart-drawer,.telcart-backdrop { transition: none !important; } }
`;

export default TelCartSidebar;
