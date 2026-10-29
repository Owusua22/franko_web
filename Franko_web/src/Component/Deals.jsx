import { cartAddFeedback } from "../utils/cartItems.mjs";
import { getProductUrl } from "../utils/productSlug";
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import {
  HeartIcon as OutlineHeartIcon,
  HeartIcon as SolidHeartIcon,
  ShoppingCartIcon,
  EyeIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FireIcon,
} from "@heroicons/react/24/solid";
import { fetchProductByShowroomAndRecord } from "../Redux/Slice/productSlice";
import {
  addToWishlist,
  removeFromWishlist,
} from "../Redux/Slice/wishlistSlice";
import Tooltip from "@material-tailwind/react/components/Tooltip";
import useAddToCart from "./Cart";
import { CATALOGUE_UPDATED_EVENT } from "./CatalogueSync";

// ==================== NOTIFICATION ====================

const Notification = ({ message, type, isVisible, onClose }) => {
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isVisible && message) {
      timeoutRef.current = setTimeout(() => onClose(), 3000);
    }
  }, [isVisible, message]);

  if (!isVisible || !message) return null;

  const bgColor = type === "success" ? "bg-green-800" : type === "info" ? "bg-amber-700" : "bg-red-600";
  const Icon = type === "success" ? CheckCircleIcon : type === "info" ? CheckCircleIcon : XCircleIcon;

  return (
    <div className="fixed top-4 right-4 z-50 deals-animate-slide-in">
      <div
        className={`${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 min-w-[280px]`}
        style={{ fontFamily: "var(--deals-font)" }}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-auto text-white/80 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const Deals = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const showroomID = "1e93aeb7-bba7-4bd4-b017-ea3267047d46";

  const [timeLeft, setTimeLeft] = useState({});
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const [notification, setNotification] = useState({
    message: "",
    type: "success",
    isVisible: false,
  });

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message: "", type: "success", isVisible: false });
    requestAnimationFrame(() => {
      setNotification({ message, type, isVisible: true });
    });
  }, []);

  const { addProductToCart, loading: cartLoading } = useAddToCart();
  const { productsByShowroom } = useSelector((state) => state.products);
  const wishlist = useSelector((state) => state.wishlist.items);

  const isInWishlist = (id) => (wishlist || []).some((item) => item.id === id);

  const handleWishlistToggle = async (product) => {
    try {
      const id = product.id || product.productID;
      if (isInWishlist(id)) {
        dispatch(removeFromWishlist(id));
        showNotification("Removed from wishlist", "success");
      } else {
        dispatch(addToWishlist({ ...product, id }));
        showNotification("Added to wishlist", "success");
      }
    } catch {
      showNotification("Failed to update wishlist", "error");
    }
  };

  const handleAddToCart = async (product) => {
    try {
      await addProductToCart(product);
      showNotification("Added to cart successfully", "success");
    } catch (error) {
      const feedback = cartAddFeedback(error);
      showNotification(feedback.message, feedback.type);
    }
  };

  useEffect(() => {
    dispatch(
      fetchProductByShowroomAndRecord({
        showRoomCode: showroomID,
        recordNumber: 10,
      })
    );
  }, [dispatch]);

  useEffect(() => {
    const refresh = () => dispatch(fetchProductByShowroomAndRecord({
      showRoomCode: showroomID, recordNumber: 10, forceRefresh: true,
    }));
    window.addEventListener(CATALOGUE_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CATALOGUE_UPDATED_EVENT, refresh);
  }, [dispatch]);

  // ==================== SUNDAY → SATURDAY COUNTDOWN ====================

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const daysUntilEndOfSaturday = 6 - dayOfWeek;

      const endOfSaturday = new Date(now);
      endOfSaturday.setDate(now.getDate() + daysUntilEndOfSaturday);
      endOfSaturday.setHours(23, 59, 59, 999);

      const diff = endOfSaturday - now;

      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / (1000 * 60)) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    const interval = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();
    return () => clearInterval(interval);
  }, []);

  // ==================== SCROLL ARROWS ====================

  useEffect(() => {
    const updateArrows = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
      }
    };
    updateArrows();
    const el = scrollRef.current;
    el?.addEventListener("scroll", updateArrows);
    return () => el?.removeEventListener("scroll", updateArrows);
  }, [productsByShowroom]);

  // ==================== AUTO-SCROLL ====================

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 5) {
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          scroll("right");
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [productsByShowroom, isHovered]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  // ==================== HELPERS ====================

  const getValidImageUrl = (imagePath) => {
    if (!imagePath) return "https://via.placeholder.com/150";
    return imagePath.includes("\\")
      ? `https://testing.frankotrading.com/Media/Products_Images/${imagePath.split("\\").pop()}`
      : imagePath;
  };

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return "₵0.00";
    return `₵${Number(price).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const pad = (n) => String(n).padStart(2, "0");

  // ==================== RENDER ====================

  return (
    <>
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      <style>{`
       :root {
          --deals-font: 'Plus Jakarta Sans', sans-serif;
          --deals-green: #14532d;
          --deals-green-mid: #166534;
          --deals-green-light: #dcfce7;
          --deals-green-lighter: #f0fdf4;
          --deals-green-accent: #22c55e;
          --deals-dark: #1a1a1a;
          --deals-mid: #555;
          --deals-light: #888;
          --deals-border: #e0e0e0;
          --deals-bg-subtle: #f7f7f7;
          --deals-red: #dc2626;
          --deals-red-dark: #b91c1c;
          --deals-pink: #e11d48;
          --deals-radius: 4px;
        }

        .deals-root, .deals-root * {
          font-family: var(--deals-font);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        /* ==================== HEADER ==================== */

        .deals-header {
          background: var(--deals-green-lighter);
          border: 1px solid #bbf7d0;
          border-left: 4px solid var(--deals-green);
          border-radius: var(--deals-radius);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (min-width: 768px) {
          .deals-header {
            padding: 14px 20px;
            flex-wrap: nowrap;
          }
        }

        /* Left group: icon + title/badge + separator + timer */
        .deals-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
          flex-wrap: wrap;
        }

        @media (min-width: 768px) {
          .deals-header-left {
            flex-wrap: nowrap;
            gap: 14px;
          }
        }

        .deals-header-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--deals-green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid #bbf7d0;
        }

        @media (max-width: 480px) {
          .deals-header-icon {
            width: 30px;
            height: 30px;
          }
        }

        .deals-header-title-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex-shrink: 0;
        }

        .deals-title {
          font-size: 16px;
          font-weight: 800;
          color: var(--deals-green);
          letter-spacing: -0.02em;
          line-height: 1.2;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          .deals-title { font-size: 18px; }
        }

        .deals-subtitle {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .deals-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--deals-green-light);
          color: var(--deals-green);
          font-size: 9px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 100px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          line-height: 1.4;
          border: 1px solid #86efac;
        }

        .deals-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--deals-green-accent);
          animation: deals-dot-pulse 1.5s infinite;
        }

        @keyframes deals-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }

        .deals-ends-text {
          font-size: 10px;
          font-weight: 500;
          color: var(--deals-green-mid);
          opacity: 0.7;
        }

        /* Separator between title and timer */
        .deals-header-sep {
          width: 1px;
          height: 28px;
          background: #86efac;
          flex-shrink: 0;
          display: none;
        }

        @media (min-width: 768px) {
          .deals-header-sep { display: block; }
        }

        /* Timer cluster */
        .deals-timer-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .deals-timer-label {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 11px;
          font-weight: 600;
          color: var(--deals-green-mid);
          white-space: nowrap;
          flex-shrink: 0;
        }

        @media (max-width: 480px) {
          .deals-timer-label { display: none; }
        }

        .deals-timer {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .deals-timer-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--deals-green);
          color: #fff;
          border-radius: 3px;
          min-width: 28px;
          padding: 3px 4px;
        }

        @media (min-width: 768px) {
          .deals-timer-block {
            min-width: 34px;
            padding: 4px 6px;
          }
        }

        .deals-timer-value {
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }

        @media (min-width: 768px) {
          .deals-timer-value { font-size: 14px; }
        }

        .deals-timer-unit {
          font-size: 7px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          opacity: 0.75;
          margin-top: 1px;
        }

        @media (min-width: 768px) {
          .deals-timer-unit { font-size: 8px; }
        }

        .deals-timer-sep {
          font-size: 12px;
          font-weight: 800;
          color: var(--deals-green);
          line-height: 1;
          margin-bottom: 8px;
        }

        /* See All button */
        .deals-see-more {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          color: var(--deals-green);
          background: #fff;
          padding: 6px 12px;
          border-radius: var(--deals-radius);
          text-decoration: none;
          transition: all 0.15s;
          white-space: nowrap;
          border: 1px solid #bbf7d0;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .deals-see-more {
            font-size: 13px;
            padding: 7px 14px;
          }
        }

        .deals-see-more:hover {
          background: var(--deals-green);
          color: #fff;
          border-color: var(--deals-green);
        }

        /* ==================== CARDS ==================== */

        .deals-card {
          min-width: 160px;
          width: 160px;
          border: 1px solid var(--deals-border);
          border-radius: var(--deals-radius);
          overflow: hidden;
          background: #fff;
          transition: all 0.2s ease;
          cursor: pointer;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .deals-card { min-width: 220px; width: 220px; }
        }

        .deals-card:hover {
          border-color: var(--deals-green-accent);
          box-shadow: 0 4px 16px rgba(20, 83, 45, 0.08);
        }

        .deals-card-img {
          position: relative;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;

          overflow: hidden;
        }

        @media (min-width: 768px) {
          .deals-card-img { height: 195px; }
        }

        .deals-card-img img {
          height: 100%;
          width: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }

        .deals-card:hover .deals-card-img img {
          transform: scale(1.05);
        }

        .deals-card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(20, 83, 45, 0.45);
          display: none;
          align-items: center;
          justify-content: center;
          gap: 8px;
          z-index: 2;
        }

        .deals-card:hover .deals-card-overlay {
          display: flex;
        }

        .deals-card-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #fff;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 12px 10px rgba(0,0,0,0.1);
        }

        .deals-card-action:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .deals-card-action:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .deals-card-body {
          padding: 10px 12px;
          text-align: center;
        }

        .deals-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--deals-dark);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 35px;
        }

        .deals-card-price {
          font-size: 14px;
          font-weight: 900;
          color: var(--deals-red);
          margin-top: 6px;
        }

        .deals-card-old-price {
          font-size: 12px;
          font-weight: 400;
          color: var(--deals-light);
          text-decoration: line-through;
          margin-top: 2px;
        }

        .deals-card-sold {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 100px;
          background: var(--deals-dark);
          color: #fff;
          z-index: 3;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .deals-card-discount {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 100px;
          background: var(--deals-red);
          color: #fff;
          z-index: 3;
        }

        /* ==================== SCROLL BUTTONS ==================== */

        .deals-scroll-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #fff;
          border: 1px solid var(--deals-border);
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          cursor: pointer;
          transition: all 0.15s;
        }

        .deals-scroll-btn:hover {
          background: var(--deals-green-light);
          border-color: var(--deals-green-accent);
        }

        .deals-scroll-btn:active {
          transform: translateY(-50%) scale(0.95);
        }

        .deals-scroll-btn-left { left: -4px; }
        .deals-scroll-btn-right { right: -4px; }

        @media (min-width: 768px) {
          .deals-scroll-btn-left { left: -10px; }
          .deals-scroll-btn-right { right: -10px; }
        }

        /* ==================== VIEW ALL ==================== */

        .deals-view-all {
          min-width: 110px;
          width: 110px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          text-decoration: none;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .deals-view-all { min-width: 140px; width: 140px; }
        }

        .deals-view-all-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--deals-green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .deals-view-all:hover .deals-view-all-circle {
          background: var(--deals-green);
          border-color: var(--deals-green);
        }

        .deals-view-all:hover .deals-view-all-circle svg {
          color: #fff !important;
        }

        .deals-view-all-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--deals-green);
        }

        /* ==================== SKELETON ==================== */

        .deals-skeleton {
          min-width: 160px;
          width: 160px;
          border: 1px solid #eee;
          border-radius: var(--deals-radius);
          overflow: hidden;
          background: #fff;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .deals-skeleton { min-width: 220px; width: 220px; }
        }

        .deals-skeleton-img {
          height: 130px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: deals-shimmer 1.5s infinite;
        }

        @media (min-width: 768px) {
          .deals-skeleton-img { height: 165px; }
        }

        @keyframes deals-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .deals-skeleton-line {
          height: 10px;
          border-radius: 2px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: deals-shimmer 1.5s infinite;
        }

        /* ==================== ANIMATIONS ==================== */

        @keyframes deals-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .deals-animate-slide-in {
          animation: deals-slide-in 0.3s ease-out;
        }

        .deals-no-scrollbar::-webkit-scrollbar { display: none; }
        .deals-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="deals-root mx-auto px-4 md:px-16 py-6">
        {/* ==================== HEADER (single row) ==================== */}
        <div className="deals-header">
          {/* Left: Icon + Title/Badge + Separator + Timer */}
          <div className="deals-header-left">
            {/* Icon */}
            <div className="deals-header-icon">
              <FireIcon style={{ width: 16, height: 16, color: "var(--deals-green)" }} />
            </div>

            {/* Title + Badge */}
            <div className="deals-header-title-group">
              <div className="deals-title">Deals of the Week</div>
              <div className="deals-subtitle">

              </div>
            </div>

            {/* Vertical separator (desktop only) */}
            <div className="deals-header-sep" />

            {/* Timer */}
            <div className="deals-timer-group">
              <div className="deals-timer-label">
                <ClockIcon style={{ width: 12, height: 12, color: "var(--deals-green)" }} />
                <span>Ends in</span>
              </div>
              <div className="deals-timer">
                <div className="deals-timer-block">
                  <span className="deals-timer-value">{pad(timeLeft.days || 0)}</span>
                  <span className="deals-timer-unit">Days</span>
                </div>
                <span className="deals-timer-sep">:</span>
                <div className="deals-timer-block">
                  <span className="deals-timer-value">{pad(timeLeft.hours || 0)}</span>
                  <span className="deals-timer-unit">Hrs</span>
                </div>
                <span className="deals-timer-sep">:</span>
                <div className="deals-timer-block">
                  <span className="deals-timer-value">{pad(timeLeft.minutes || 0)}</span>
                  <span className="deals-timer-unit">Min</span>
                </div>
                <span className="deals-timer-sep">:</span>
                <div className="deals-timer-block">
                  <span className="deals-timer-value">{pad(timeLeft.seconds || 0)}</span>
                  <span className="deals-timer-unit">Sec</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: See All */}
          <Link to={`/showroom/${showroomID}`} className="deals-see-more">
            <span>See All</span>
            <ChevronRightIcon style={{ width: 13, height: 13 }} />
          </Link>
        </div>

        {/* ==================== CAROUSEL ==================== */}
        <div className="relative" style={{ marginTop: 16 }}>
          {showLeftArrow && (
            <button
              onClick={() => scroll("left")}
              className="deals-scroll-btn deals-scroll-btn-left"
            >
              <ChevronLeftIcon style={{ width: 16, height: 16, color: "var(--deals-green)" }} />
            </button>
          )}

          <div
            ref={scrollRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex gap-3 md:gap-4 overflow-x-auto deals-no-scrollbar scroll-smooth"
            style={{ paddingBottom: 4, paddingLeft: 1, paddingRight: 1 }}
          >
            {(productsByShowroom?.[showroomID]
            )?.map((product) => {
              if (!product) return null;

              const {
                productID,
                productName,
                productImage,
                price,
                oldPrice,
                stock,
              } = product;

              const isOnSale = oldPrice > 0 && oldPrice > price;
              const discountPercent = isOnSale
                ? Math.round(((oldPrice - price) / oldPrice) * 100)
                : 0;
              const inWishlist = isInWishlist(productID);

              return (
                <div key={productID} className="deals-card" style={{ marginBottom: 4 }}>
                  <div className="deals-card-img">
                    {stock === 0 && (
                      <span className="deals-card-sold">Sold Out</span>
                    )}
                    {isOnSale && stock !== 0 && (
                      <span className="deals-card-discount">-{discountPercent}%</span>
                    )}

                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onClick={() => navigate(getProductUrl({ productName }))}
                    >
                      <img loading="lazy" decoding="async"
                        src={getValidImageUrl(productImage)}
                        alt={productName}
                      />
                    </div>

                    <div
                      className="deals-card-overlay"
                      onClick={() => navigate(getProductUrl({ productName }))}
                    >
                      <Tooltip content={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}>
                        <button
                          className="deals-card-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWishlistToggle(product);
                          }}
                        >
                          {inWishlist ? (
                            <SolidHeartIcon style={{ width: 16, height: 16, color: "var(--deals-pink)" }} />
                          ) : (
                            <OutlineHeartIcon style={{ width: 16, height: 16, color: "var(--deals-mid)" }} />
                          )}
                        </button>
                      </Tooltip>

                      <Tooltip content="View Details">
                        <button
                          className="deals-card-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(getProductUrl({ productName }));
                          }}
                        >
                          <EyeIcon style={{ width: 16, height: 16, color: "var(--deals-green)" }} />
                        </button>
                      </Tooltip>

                      <Tooltip content={stock === 0 ? "Out of Stock" : "Add to Cart"}>
                        <button
                          className="deals-card-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product);
                          }}
                          disabled={cartLoading || stock === 0}
                        >
                          <ShoppingCartIcon style={{ width: 16, height: 16, color: "var(--deals-green-mid)" }} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="deals-card-body">
                    <div className="deals-card-name">{productName}</div>
                    <div className="deals-card-price">GH{formatPrice(price)}</div>
                    {oldPrice > 0 && (
                      <div className="deals-card-old-price">{formatPrice(oldPrice)}</div>
                    )}
                  </div>
                </div>
              );
            })}

            {(
              <Link to={`/showroom/${showroomID}`} className="deals-view-all">
                <div className="deals-view-all-circle">
                  <ArrowRightIcon style={{ width: 20, height: 20, color: "var(--deals-green)", transition: "color 0.2s" }} />
                </div>
                <span className="deals-view-all-label">View All</span>
              </Link>
            )}
          </div>

          {showRightArrow && (
            <button
              onClick={() => scroll("right")}
              className="deals-scroll-btn deals-scroll-btn-right"
            >
              <ChevronRightIcon style={{ width: 16, height: 16, color: "var(--deals-green)" }} />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Deals;