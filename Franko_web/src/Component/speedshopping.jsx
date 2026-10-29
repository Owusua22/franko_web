import { cartAddFeedback } from "../utils/cartItems.mjs";
import { getProductUrl } from "../utils/productSlug";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  HeartIcon as OutlineHeartIcon,
  HeartIcon as SolidHeartIcon,
  ShoppingCartIcon,
  SparklesIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import Tooltip from "@material-tailwind/react/components/Tooltip";

import { fetchProductByShowroomAndRecord } from "../Redux/Slice/productSlice";
import {
  addToWishlist,
  removeFromWishlist,
} from "../Redux/Slice/wishlistSlice";
import useAddToCart from "./Cart";
import { CATALOGUE_UPDATED_EVENT } from "./CatalogueSync";

const SHOWROOM_ID = "a0631779-0be9-4cc3-825d-5b381343859c";
const INITIAL_FETCH_COUNT = 60;
const PAGE_SIZE = 10;

/* Sale window — Ghana runs on GMT year-round, so "Z" = Accra local time.
   Keep this in sync with the announcement bar's PROMO_START. */
const PROMO_START = Date.parse("2026-10-02T00:00:00Z");
const PROMO_END = PROMO_START + 24 * 60 * 60 * 1000; // 24 hours only

// =====================================================
// NOTIFICATION
// =====================================================

const Notification = ({ message, type, visible, onClose }) => {
  const timerRef = useRef(null);
  const isSuccess = type === "success";
  const isInfo = type === "info";
  const Icon = isSuccess || isInfo ? CheckCircleIcon : XCircleIcon;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (visible && message) timerRef.current = setTimeout(onClose, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, message, onClose]);

  if (!visible || !message) return null;

  return (
    <div className="shp-notification">
      <div className={`shp-notification-content ${isSuccess ? "success" : "error"}`}>
        <Icon className="shp-notification-icon" />
        <span>{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="shp-notification-close"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// =====================================================
// HELPERS
// =====================================================

const pad = (value) => String(value ?? 0).padStart(2, "0");

const getPhase = (now) =>
  now < PROMO_START ? "before" : now < PROMO_END ? "live" : "ended";

const getImageUrl = (imagePath) => {
  if (!imagePath) return "https://via.placeholder.com/300x300?text=Product";
  if (imagePath.includes("\\")) {
    return `https://testing.frankotrading.com/Media/Products_Images/${imagePath
      .split("\\")
      .pop()}`;
  }
  return imagePath;
};

const formatPrice = (price) => {
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice)) return "GH₵0.00";
  return `GH₵${numericPrice.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/* Live countdown to PROMO_START, then to PROMO_END, then stops. Only one
   interval for the whole page — every consumer reads from this hook. */
const useCountdown = () => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const phase = getPhase(now);
  const target = phase === "before" ? PROMO_START : PROMO_END;
  const diff = phase === "ended" ? 0 : Math.max(0, target - now);

  return {
    phase,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
};

// =====================================================
// SPEED SHOPPING PAGE
// =====================================================

const SpeedShoppingPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const countdown = useCountdown();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [notification, setNotification] = useState({
    message: "",
    type: "success",
    visible: false,
  });

  const { addProductToCart, loading: cartLoading } = useAddToCart();

  const { productsByShowroom, loading } = useSelector((state) => state.products);
  const wishlist = useSelector((state) => state.wishlist.items || []);

  const products = useMemo(() => productsByShowroom?.[SHOWROOM_ID] || [], [productsByShowroom]);
  const visibleProducts = useMemo(
    () => products.slice(0, visibleCount),
    [products, visibleCount]
  );
  const hasMore = visibleCount < products.length;

  // -----------------------------------------------------
  // Notifications
  // -----------------------------------------------------

  const closeNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, visible: false }));
  }, []);

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type, visible: true });
  }, []);

  // -----------------------------------------------------
  // Fetch products
  // -----------------------------------------------------

  useEffect(() => {
    dispatch(
      fetchProductByShowroomAndRecord({
        showRoomCode: SHOWROOM_ID,
        recordNumber: INITIAL_FETCH_COUNT,
      })
    );
  }, [dispatch]);

  useEffect(() => {
    const refresh = () => dispatch(fetchProductByShowroomAndRecord({
      showRoomCode: SHOWROOM_ID, recordNumber: INITIAL_FETCH_COUNT, forceRefresh: true,
    }));
    window.addEventListener(CATALOGUE_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CATALOGUE_UPDATED_EVENT, refresh);
  }, [dispatch]);

  // -----------------------------------------------------
  // Wishlist / cart actions
  // -----------------------------------------------------

  const isInWishlist = useCallback(
    (productId) =>
      wishlist.some((item) => item.id === productId || item.productID === productId),
    [wishlist]
  );

  const handleWishlistToggle = (product) => {
    const productId = product.productID || product.id;
    try {
      if (isInWishlist(productId)) {
        dispatch(removeFromWishlist(productId));
        showNotification("Removed from wishlist");
      } else {
        dispatch(addToWishlist({ ...product, id: productId }));
        showNotification("Added to wishlist");
      }
    } catch {
      showNotification("Unable to update wishlist", "error");
    }
  };

  const handleAddToCart = async (product) => {
    try {
      await addProductToCart(product);
      showNotification("Added to cart successfully");
    } catch (error) {
      const feedback = cartAddFeedback(error);
      showNotification(feedback.message, feedback.type);
    }
  };

  const handleLoadMore = () => setVisibleCount((count) => count + PAGE_SIZE);

  // -----------------------------------------------------
  // Hero copy per phase
  // -----------------------------------------------------

  const heroCopy = {
    before: { eyebrow: "Coming soon", label: "Starts in" },
    live: { eyebrow: "Live now", label: "Ends in" },
    ended: { eyebrow: "Sale ended", label: null },
  }[countdown.phase];

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      <Notification
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onClose={closeNotification}
      />

      <style>{`
        :root {
          --shp-font: 'Plus Jakarta Sans', sans-serif;

          --shp-purple-dark: #1e0a36;
          --shp-purple: #4d1070;
          --shp-pink: #b90f67;
          --shp-orange: #ff8a00;
          --shp-yellow: #ffd500;

          --shp-text: #24152f;
          --shp-muted: #77717d;
          --shp-border: #e9e1ec;
          --shp-white: #ffffff;
          --shp-danger: #c62852;
        }

        .shp-root, .shp-root * {
          box-sizing: border-box;
          font-family: var(--shp-font);
          -webkit-font-smoothing: antialiased;
        }

        .shp-root {
          width: 100%;
          color: var(--shp-text);
        }

        /* ============ NOTIFICATION ============ */

        .shp-notification {
          position: fixed;
          top: max(16px, env(safe-area-inset-top, 0px));
          right: 16px;
          left: 16px;
          z-index: 9999;
          display: flex;
          justify-content: flex-end;
          animation: shp-slide-in 0.25s ease-out;
        }

        .shp-notification-content {
          width: 100%;
          max-width: 320px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 12px 15px;
          border-radius: 7px;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(30, 10, 54, 0.18);
        }

        .shp-notification-content.success { background: var(--shp-purple); }
        .shp-notification-content.error { background: var(--shp-danger); }

        .shp-notification-icon { width: 19px; height: 19px; flex-shrink: 0; }

        .shp-notification-close {
          margin-left: auto;
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
        }

        @keyframes shp-slide-in {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ============ HERO ============ */

        .shp-hero {
          position: relative;
          overflow: hidden;
          padding: clamp(20px, 5vw, 44px) clamp(16px, 5vw, 48px);
          border-radius: clamp(10px, 2vw, 18px);
          background: radial-gradient(120% 160% at 0% 0%, #3a0f5c 0%, #1e0a36 55%, #12071f 100%);
          color: #fff;
        }

        .shp-hero::before {
          content: "";
          position: absolute;
          inset: -40% -10% auto auto;
          width: 60%;
          aspect-ratio: 1;
          border-radius: 50%;
          background: radial-gradient(closest-side, rgba(255, 213, 0, 0.25), transparent);
          pointer-events: none;
        }

        .shp-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: clamp(16px, 4vw, 28px);
        }

        .shp-hero-copy { min-width: 0; flex: 1 1 260px; }

        .shp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 11px;
          border-radius: 999px;
          background: rgba(255, 213, 0, 0.14);
          color: var(--shp-yellow);
          font-size: clamp(10px, 2.4vw, 11px);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .shp-hero-title {
          margin-top: 10px;
          font-size: clamp(24px, 6vw, 42px);
          font-weight: 900;
          line-height: 1.08;
        }

        .shp-hero-sub {
          margin-top: 8px;
          max-width: 46ch;
          color: rgba(255, 255, 255, 0.72);
          font-size: clamp(12.5px, 2.6vw, 15px);
          line-height: 1.5;
        }

        .shp-hero-date {
          margin-top: 6px;
          color: var(--shp-yellow);
          font-size: clamp(11px, 2.4vw, 13px);
          font-weight: 700;
        }

        .shp-timer-card {
          flex: 0 0 auto;
          padding: clamp(14px, 3vw, 20px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(6px);
        }

        .shp-timer-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.85);
          font-size: clamp(10.5px, 2.4vw, 12px);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .shp-live-dot {
          position: relative;
          width: 7px;
          height: 7px;
          flex-shrink: 0;
        }

        .shp-live-dot::before, .shp-live-dot::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #34d399;
        }

        .shp-live-dot::before {
          animation: shp-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
          opacity: 0.6;
        }

        @keyframes shp-ping {
          75%, 100% { transform: scale(2.4); opacity: 0; }
        }

        .shp-timer {
          display: grid;
          grid-auto-flow: column;
          gap: clamp(6px, 1.6vw, 10px);
        }

        .shp-timer-block {
          min-width: clamp(42px, 11vw, 56px);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: clamp(6px, 1.6vw, 9px) 4px;
          border-radius: 9px;
          background: #fff;
          color: var(--shp-purple-dark);
        }

        .shp-timer-value {
          font-size: clamp(16px, 4.2vw, 22px);
          font-weight: 900;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }

        .shp-timer-unit {
          margin-top: 3px;
          color: var(--shp-muted);
          font-size: clamp(7.5px, 1.8vw, 9px);
          font-weight: 700;
          text-transform: uppercase;
        }

        .shp-ended-note {
          max-width: 220px;
          text-align: center;
          color: rgba(255, 255, 255, 0.85);
          font-size: 13px;
          font-weight: 600;
          line-height: 1.5;
        }

        /* ============ GRID ============ */

        .shp-grid-section { margin-top: clamp(18px, 4vw, 28px); }

        .shp-grid-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .shp-grid-title {
          font-size: clamp(16px, 3.6vw, 20px);
          font-weight: 800;
          color: var(--shp-purple-dark);
        }

        .shp-grid-count {
          color: var(--shp-muted);
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .shp-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        @media (min-width: 420px) {
          .shp-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }

        @media (min-width: 700px) {
          .shp-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
        }

        @media (min-width: 1024px) {
          .shp-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
        }

        @media (min-width: 1380px) {
          .shp-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
        }

        /* ============ PRODUCT CARD ============ */

        .shp-card {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--shp-border);
          border-radius: 10px;
          background: var(--shp-white);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .shp-card:hover {
          border-color: #d9b8df;
          box-shadow: 0 10px 24px rgba(77, 16, 112, 0.12);
          transform: translateY(-3px);
        }

        .shp-card-image {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: clamp(8px, 2vw, 14px);
          background: #fff;
        }

        .shp-card-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.25s ease;
        }

        .shp-card:hover .shp-card-image img { transform: scale(1.06); }

        .shp-card-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 6px;
          padding-bottom: 8px;
          opacity: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(30, 10, 54, 0.55) 100%);
          transition: opacity 0.2s ease;
        }

        .shp-card:hover .shp-card-overlay,
        .shp-card:focus-within .shp-card-overlay {
          opacity: 1;
        }

        @media (hover: none) {
          .shp-card-overlay { opacity: 1; background: linear-gradient(180deg, transparent 55%, rgba(30, 10, 54, 0.45) 100%); }
        }

        .shp-action-button {
          width: clamp(28px, 7vw, 34px);
          height: clamp(28px, 7vw, 34px);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .shp-action-button:hover { background: #fff4c5; transform: scale(1.08); }
        .shp-action-button:disabled { opacity: 0.45; cursor: not-allowed; }

        .shp-card-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: clamp(8px, 2vw, 12px);
          text-align: center;
        }

        .shp-card-name {
          min-height: 2.6em;
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          color: var(--shp-text);
          font-size: clamp(11.5px, 2.8vw, 14px);
          font-weight: 600;
          line-height: 1.3;
        }

        .shp-card-price {
          margin-top: 6px;
          color: var(--shp-pink);
          font-size: clamp(12px, 3vw, 14px);
          font-weight: 900;
        }

        .shp-card-old-price {
          margin-top: 2px;
          color: #99919d;
          font-size: clamp(10px, 2.4vw, 12px);
          text-decoration: line-through;
        }

        .shp-badge {
          position: absolute;
          top: 8px;
          z-index: 3;
          padding: 3px 7px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          line-height: 1;
          text-transform: uppercase;
        }

        .shp-badge.sold { left: 8px; color: #fff; background: var(--shp-purple-dark); }
        .shp-badge.discount { right: 8px; color: var(--shp-purple-dark); background: var(--shp-yellow); }

        /* ============ LOAD MORE ============ */

        .shp-load-more {
          display: flex;
          justify-content: center;
          margin-top: clamp(16px, 4vw, 26px);
        }

        .shp-load-more-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 22px;
          border: 1px solid var(--shp-border);
          border-radius: 999px;
          background: #fff;
          color: var(--shp-purple);
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .shp-load-more-button:hover {
          border-color: #d9b8df;
          background: #fbf3ff;
        }

        /* ============ SKELETON ============ */

        .shp-skeleton {
          overflow: hidden;
          border: 1px solid var(--shp-border);
          border-radius: 10px;
          background: #fff;
        }

        .shp-skeleton-image {
          width: 100%;
          aspect-ratio: 1 / 1;
          background: linear-gradient(90deg, #f4f0f5 25%, #eae2ed 50%, #f4f0f5 75%);
          background-size: 200% 100%;
          animation: shp-shimmer 1.4s infinite;
        }

        .shp-skeleton-content { padding: 12px; }

        .shp-skeleton-line {
          width: 80%;
          height: 10px;
          margin-bottom: 8px;
          border-radius: 3px;
          background: linear-gradient(90deg, #f4f0f5 25%, #eae2ed 50%, #f4f0f5 75%);
          background-size: 200% 100%;
          animation: shp-shimmer 1.4s infinite;
        }

        .shp-skeleton-line.short { width: 50%; height: 8px; margin-bottom: 0; }

        @keyframes shp-shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }

        /* ============ EMPTY STATE ============ */

        .shp-empty {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 40px 16px;
          color: var(--shp-muted);
          text-align: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .shp-root *, .shp-root *::before, .shp-root *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <section className="shp-root mx-auto px-4 py-4 md:px-10 lg:px-16">
        {/* HERO */}
        <div className="shp-hero">
          <div className="shp-hero-inner">
            <div className="shp-hero-copy">
              <span className="shp-eyebrow">
                <BoltIcon style={{ width: 12, height: 12 }} />
                {heroCopy.eyebrow}
              </span>

              <h1 className="shp-hero-title">Franko Speed Shopping</h1>

              <p className="shp-hero-sub">
                Deep discounts across every category, for 24 hours only. Grab
                what you need before the clock runs out.
              </p>

              <div className="shp-hero-date">Friday, 2nd October 2026</div>
            </div>

            <div className="shp-timer-card">
              {countdown.phase === "ended" ? (
                <div className="shp-ended-note">
                  <SparklesIcon style={{ width: 22, height: 22, margin: "0 auto 6px" }} />
                  This sale has ended — check back for the next drop.
                </div>
              ) : (
                <>
                  <div className="shp-timer-label">
                    {countdown.phase === "live" ? (
                      <span className="shp-live-dot" />
                    ) : (
                      <ClockIcon style={{ width: 13, height: 13 }} />
                    )}
                    <span>{heroCopy.label}</span>
                  </div>

                  <div className="shp-timer">
                    <div className="shp-timer-block">
                      <span className="shp-timer-value">{pad(countdown.days)}</span>
                      <span className="shp-timer-unit">Days</span>
                    </div>
                    <div className="shp-timer-block">
                      <span className="shp-timer-value">{pad(countdown.hours)}</span>
                      <span className="shp-timer-unit">Hrs</span>
                    </div>
                    <div className="shp-timer-block">
                      <span className="shp-timer-value">{pad(countdown.minutes)}</span>
                      <span className="shp-timer-unit">Min</span>
                    </div>
                    <div className="shp-timer-block">
                      <span className="shp-timer-value">{pad(countdown.seconds)}</span>
                      <span className="shp-timer-unit">Sec</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* PRODUCT GRID */}
        <div className="shp-grid-section">
          <div className="shp-grid-heading">
            <span className="shp-grid-title">
              {countdown.phase === "before" ? "Preview the lineup" : "Deals for you"}
            </span>
            {!loading && products.length > 0 && (
              <span className="shp-grid-count">
                {visibleProducts.length} of {products.length}
              </span>
            )}
          </div>

          <div className="shp-grid">
            {loading
              ? Array.from({ length: PAGE_SIZE }).map((_, index) => (
                  <div className="shp-skeleton" key={index}>
                    <div className="shp-skeleton-image" />
                    <div className="shp-skeleton-content">
                      <div className="shp-skeleton-line" />
                      <div className="shp-skeleton-line short" />
                    </div>
                  </div>
                ))
              : visibleProducts.length === 0
              ? (
                  <div className="shp-empty">
                    <SparklesIcon style={{ width: 26, height: 26 }} />
                    <span>No Speed Shopping deals available right now.</span>
                  </div>
                )
              : visibleProducts.map((product) => {
                  const {
                    productID,
                    productName,
                    productImage,
                    price,
                    oldPrice,
                    stock,
                  } = product;

                  const numericPrice = Number(price);
                  const numericOldPrice = Number(oldPrice);
                  const numericStock = Number(stock);

                  const isOnSale = numericOldPrice > 0 && numericOldPrice > numericPrice;
                  const discount = isOnSale
                    ? Math.round(((numericOldPrice - numericPrice) / numericOldPrice) * 100)
                    : 0;

                  const inWishlist = isInWishlist(productID);

                  return (
                    <article
                      key={productID}
                      className="shp-card"
                      onClick={() => navigate(getProductUrl({ productName }))}
                    >
                      <div className="shp-card-image">
                        {numericStock === 0 && <span className="shp-badge sold">Sold Out</span>}
                        {isOnSale && numericStock !== 0 && (
                          <span className="shp-badge discount">-{discount}%</span>
                        )}

                        <img
                          src={getImageUrl(productImage)}
                          alt={productName || "Product"}
                          loading="lazy"
                        />

                        <div
                          className="shp-card-overlay"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Tooltip content={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}>
                            <button
                              type="button"
                              className="shp-action-button"
                              onClick={() => handleWishlistToggle(product)}
                              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                            >
                              {inWishlist ? (
                                <SolidHeartIcon style={{ width: 16, height: 16, color: "var(--shp-pink)" }} />
                              ) : (
                                <OutlineHeartIcon style={{ width: 16, height: 16, color: "#716a76" }} />
                              )}
                            </button>
                          </Tooltip>

                          <Tooltip content="View Details">
                            <button
                              type="button"
                              className="shp-action-button"
                              onClick={() => navigate(getProductUrl({ productName }))}
                              aria-label="View product details"
                            >
                              <EyeIcon style={{ width: 16, height: 16, color: "var(--shp-purple)" }} />
                            </button>
                          </Tooltip>

                          <Tooltip content={numericStock === 0 ? "Out of Stock" : "Add to Cart"}>
                            <button
                              type="button"
                              className="shp-action-button"
                              disabled={cartLoading || numericStock === 0}
                              onClick={() => handleAddToCart(product)}
                              aria-label="Add product to cart"
                            >
                              <ShoppingCartIcon style={{ width: 16, height: 16, color: "var(--shp-purple)" }} />
                            </button>
                          </Tooltip>
                        </div>
                      </div>

                      <div className="shp-card-body">
                        <div className="shp-card-name">{productName || "Unnamed product"}</div>
                        <div className="shp-card-price">{formatPrice(price)}</div>
                        {numericOldPrice > 0 && (
                          <div className="shp-card-old-price">{formatPrice(oldPrice)}</div>
                        )}
                      </div>
                    </article>
                  );
                })}
          </div>

          {!loading && hasMore && (
            <div className="shp-load-more">
              <button type="button" className="shp-load-more-button" onClick={handleLoadMore}>
                <ArrowPathIcon style={{ width: 14, height: 14 }} />
                Load more deals
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default SpeedShoppingPage;