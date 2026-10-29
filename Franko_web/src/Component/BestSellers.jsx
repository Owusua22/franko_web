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
} from "@heroicons/react/24/solid";
import { fetchProductByShowroomAndRecord } from "../Redux/Slice/productSlice";
import { fetchHomePageShowrooms } from "../Redux/Slice/showRoomSlice";
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
    <div className="fixed top-4 right-4 z-50 bs-animate-slide-in">
      <div
        className={`${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 min-w-[280px]`}
        style={{ fontFamily: "var(--bs-font)" }}
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

const BestSellers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const tabsRef = useRef(null);

  const { homePageShowrooms } = useSelector((state) => state.showrooms);
  const { productsByShowroom } = useSelector((state) => state.products);
  const { addProductToCart, loading: cartLoading } = useAddToCart();
  const wishlist = useSelector((state) => state.wishlist.items || []);

  const isInWishlist = (id) =>
    Array.isArray(wishlist) && wishlist.some((item) => item.id === id);

  const [activeShowroom, setActiveShowroom] = useState(() => homePageShowrooms?.[0]?.showRoomID || null);
  const [isHovered, setIsHovered] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

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

  // ==================== DATA FETCHING ====================

  useEffect(() => {
    dispatch(fetchHomePageShowrooms());
  }, [dispatch]);

  useEffect(() => {
    if (homePageShowrooms?.length > 0) {
      const first = homePageShowrooms[0];
      setActiveShowroom(first?.showRoomID);
      dispatch(
        fetchProductByShowroomAndRecord({
          showRoomCode: first?.showRoomID,
          recordNumber: 10,
        })
      );
    }
  }, [homePageShowrooms, dispatch]);

  const handleShowroomClick = (id) => {
    setActiveShowroom(id);
    dispatch(
      fetchProductByShowroomAndRecord({ showRoomCode: id, recordNumber: 10 })
    );
  };

  useEffect(() => {
    if (!activeShowroom) return undefined;
    const refresh = () => dispatch(fetchProductByShowroomAndRecord({
      showRoomCode: activeShowroom, recordNumber: 10, forceRefresh: true,
    }));
    window.addEventListener(CATALOGUE_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CATALOGUE_UPDATED_EVENT, refresh);
  }, [dispatch, activeShowroom]);

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
  }, [productsByShowroom, activeShowroom]);

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
    }, 5000);
    return () => clearInterval(interval);
  }, [isHovered, activeShowroom]);

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
    return `GH₵${Number(price).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

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
          --bs-font: 'Plus Jakarta Sans', sans-serif;
          --bs-green: #14532d;
          --bs-green-mid: #166534;
          --bs-green-light: #dcfce7;
          --bs-green-lighter: #f0fdf4;
          --bs-green-accent: #22c55e;
          --bs-dark: #1a1a1a;
          --bs-mid: #555;
          --bs-light: #888;
          --bs-border: #e0e0e0;
          --bs-bg-subtle: #f7f7f7;
          --bs-red: #dc2626;
          --bs-pink: #e11d48;
          --bs-radius: 4px;
        }

        .bs-root, .bs-root * {
          font-family: var(--bs-font);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        /* ==================== HEADER ==================== */

        .bs-header {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .bs-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .bs-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .bs-title-accent {
          width: 4px;
          height: 22px;
          border-radius: 2px;
          background: var(--bs-green);
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .bs-title-accent { height: 26px; }
        }

        .bs-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--bs-dark);
          letter-spacing: -0.02em;
          line-height: 1;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          .bs-title { font-size: 20px; }
        }

        .bs-header-line {
          flex: 1;
          height: 1px;
          background: var(--bs-border);
          min-width: 20px;
          display: none;
        }

        @media (min-width: 768px) {
          .bs-header-line { display: block; }
        }

        .bs-see-more {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          color: var(--bs-green);
          text-decoration: none;
          transition: all 0.15s;
          white-space: nowrap;
          flex-shrink: 0;
          cursor: pointer;
          font-family: var(--bs-font);
          background: none;
          border: none;
          padding: 0;
        }

        .bs-see-more:hover {
          color: var(--bs-green-mid);
        }

        .bs-see-more-arrow {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--bs-green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .bs-see-more:hover .bs-see-more-arrow {
          background: var(--bs-green);
        }

        .bs-see-more:hover .bs-see-more-arrow svg {
          color: #fff !important;
        }

        /* Tabs Row */
        .bs-tabs-row {
          display: flex;
          align-items: center;
          gap: 0;
          margin-top: 12px;
          border-bottom: 1px solid var(--bs-border);
          overflow-x: auto;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .bs-tabs-row::-webkit-scrollbar { display: none; }

        .bs-tab {
          position: relative;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--bs-light);
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          flex-shrink: 0;
          font-family: var(--bs-font);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }

        @media (min-width: 768px) {
          .bs-tab {
            font-size: 14px;
            padding: 10px 20px;
          }
        }

        .bs-tab:hover {
          color: var(--bs-mid);
        }

        .bs-tab-active {
          color: var(--bs-green) !important;
          font-weight: 700 !important;
          border-bottom-color: var(--bs-green) !important;
        }

        /* ==================== CARDS ==================== */

        .bs-card {
          min-width: 160px;
          width: 160px;
          border: 1px solid var(--bs-border);
          border-radius: var(--bs-radius);
          overflow: hidden;
          background: #fff;
          transition: all 0.2s ease;
          cursor: pointer;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .bs-card { min-width: 220px; width: 220px; }
        }

        .bs-card:hover {
          border-color: var(--bs-green-accent);
          box-shadow: 0 4px 16px rgba(20, 83, 45, 0.08);
        }

        .bs-card-img {
          position: relative;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;

          overflow: hidden;
        }

        @media (min-width: 768px) {
          .bs-card-img { height: 195px; }
        }

        .bs-card-img img {
          height: 100%;
          width: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }

        .bs-card:hover .bs-card-img img {
          transform: scale(1.05);
        }

        .bs-card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(20, 83, 45, 0.45);
          display: none;
          align-items: center;
          justify-content: center;
          gap: 8px;
          z-index: 2;
        }

        .bs-card:hover .bs-card-overlay {
          display: flex;
        }

        .bs-card-action {
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
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .bs-card-action:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .bs-card-action:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .bs-card-body {
          padding: 10px 12px;
          text-align: center;
        }

        .bs-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--bs-dark);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 35px;
        }

        .bs-card-price {
          font-size: 14px;
          font-weight: 900;
          color: var(--bs-red);
          margin-top: 6px;
        }

        .bs-card-old-price {
          font-size: 12px;
          font-weight: 400;
          color: var(--bs-light);
          text-decoration: line-through;
          margin-top: 2px;
        }

        .bs-card-sold {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 100px;
          background: var(--bs-dark);
          color: #fff;
          z-index: 3;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .bs-card-discount {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 100px;
          background: var(--bs-red);
          color: #fff;
          z-index: 3;
        }

        /* ==================== SCROLL BUTTONS ==================== */

        .bs-scroll-btn {
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
          border: 1px solid var(--bs-border);
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          cursor: pointer;
          transition: all 0.15s;
        }

        .bs-scroll-btn:hover {
          background: var(--bs-green-light);
          border-color: var(--bs-green-accent);
        }

        .bs-scroll-btn:active {
          transform: translateY(-50%) scale(0.95);
        }

        .bs-scroll-btn-left { left: -4px; }
        .bs-scroll-btn-right { right: -4px; }

        @media (min-width: 768px) {
          .bs-scroll-btn-left { left: -10px; }
          .bs-scroll-btn-right { right: -10px; }
        }

        /* ==================== VIEW ALL ==================== */

        .bs-view-all {
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
          .bs-view-all { min-width: 140px; width: 140px; }
        }

        .bs-view-all-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--bs-green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .bs-view-all:hover .bs-view-all-circle {
          background: var(--bs-green);
          border-color: var(--bs-green);
        }

        .bs-view-all:hover .bs-view-all-circle svg {
          color: #fff !important;
        }

        .bs-view-all-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--bs-green);
        }

        /* ==================== SKELETON ==================== */

        .bs-skeleton {
          min-width: 160px;
          width: 160px;
          border: 1px solid #eee;
          border-radius: var(--bs-radius);
          overflow: hidden;
          background: #fff;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .bs-skeleton { min-width: 220px; width: 220px; }
        }

        .bs-skeleton-img {
          height: 150px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: bs-shimmer 1.5s infinite;
        }

        @media (min-width: 768px) {
          .bs-skeleton-img { height: 195px; }
        }

        @keyframes bs-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .bs-skeleton-line {
          height: 10px;
          border-radius: 2px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: bs-shimmer 1.5s infinite;
        }

        /* ==================== ANIMATIONS ==================== */

        @keyframes bs-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .bs-animate-slide-in {
          animation: bs-slide-in 0.3s ease-out;
        }

        .bs-no-scrollbar::-webkit-scrollbar { display: none; }
        .bs-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="bs-root mx-auto px-4 md:px-16 py-6">
        {/* ==================== HEADER ==================== */}
        <div className="bs-header">
          {/* Top Row: Title + Line + See All */}
          <div className="bs-header-top">
            <div className="bs-title-wrap">
              <div className="bs-title-accent" />
              <h2 className="bs-title">Trending Products</h2>
            </div>

            <div className="bs-header-line" />

            {activeShowroom && (
              <button
                onClick={() => navigate(`/showroom/${activeShowroom}`)}
                className="bs-see-more"
              >
                <span>See All</span>
                <span className="bs-see-more-arrow">
                  <ChevronRightIcon
                    style={{ width: 10, height: 10, color: "var(--bs-green)" }}
                  />
                </span>
              </button>
            )}
          </div>

          {/* Tabs Row */}
          <div className="bs-tabs-row" ref={tabsRef}>
            {Array.isArray(homePageShowrooms) &&
              homePageShowrooms.map((showroom) => (
                <button
                  key={showroom.showRoomID}
                  onClick={() => handleShowroomClick(showroom.showRoomID)}
                  className={`bs-tab ${
                    activeShowroom === showroom.showRoomID ? "bs-tab-active" : ""
                  }`}
                >
                  {showroom.showRoomName}
                </button>
              ))}
          </div>
        </div>

        {/* ==================== CAROUSEL ==================== */}
        <div className="relative" style={{ marginTop: 16 }}>
          {showLeftArrow && (
            <button
              onClick={() => scroll("left")}
              className="bs-scroll-btn bs-scroll-btn-left"
            >
              <ChevronLeftIcon
                style={{ width: 16, height: 16, color: "var(--bs-green)" }}
              />
            </button>
          )}

          <div
            ref={scrollRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex gap-3 md:gap-4 overflow-x-auto bs-no-scrollbar scroll-smooth"
            style={{ paddingBottom: 4, paddingLeft: 1, paddingRight: 1 }}
          >
            {(productsByShowroom?.[activeShowroom]
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
                <div
                  key={productID}
                  className="bs-card"
                  style={{ marginBottom: 4 }}
                >
                  <div className="bs-card-img">
                    {stock === 0 && (
                      <span className="bs-card-sold">Sold Out</span>
                    )}
                    {isOnSale && stock !== 0 && (
                      <span className="bs-card-discount">
                        -{discountPercent}%
                      </span>
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
                      className="bs-card-overlay"
                      onClick={() => navigate(getProductUrl({ productName }))}
                    >
                      <Tooltip
                        content={
                          inWishlist
                            ? "Remove from Wishlist"
                            : "Add to Wishlist"
                        }
                      >
                        <button
                          className="bs-card-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWishlistToggle(product);
                          }}
                        >
                          {inWishlist ? (
                            <SolidHeartIcon
                              style={{
                                width: 16,
                                height: 16,
                                color: "var(--bs-pink)",
                              }}
                            />
                          ) : (
                            <OutlineHeartIcon
                              style={{
                                width: 16,
                                height: 16,
                                color: "var(--bs-mid)",
                              }}
                            />
                          )}
                        </button>
                      </Tooltip>

                      <Tooltip content="View Details">
                        <button
                          className="bs-card-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(getProductUrl({ productName }));
                          }}
                        >
                          <EyeIcon
                            style={{
                              width: 16,
                              height: 16,
                              color: "var(--bs-green)",
                            }}
                          />
                        </button>
                      </Tooltip>

                      <Tooltip
                        content={
                          stock === 0 ? "Out of Stock" : "Add to Cart"
                        }
                      >
                        <button
                          className="bs-card-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product);
                          }}
                          disabled={cartLoading || stock === 0}
                        >
                          <ShoppingCartIcon
                            style={{
                              width: 16,
                              height: 16,
                              color: "var(--bs-green-mid)",
                            }}
                          />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="bs-card-body">
                    <div className="bs-card-name">{productName}</div>
                    <div className="bs-card-price">{formatPrice(price)}</div>
                    {oldPrice > 0 && (
                      <div className="bs-card-old-price">
                        {formatPrice(oldPrice)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {productsByShowroom?.[activeShowroom]?.length > 0 && (
                <Link
                  to={`/showroom/${activeShowroom}`}
                  className="bs-view-all"
                >
                  <div className="bs-view-all-circle">
                    <ArrowRightIcon
                      style={{
                        width: 20,
                        height: 20,
                        color: "var(--bs-green)",
                        transition: "color 0.2s",
                      }}
                    />
                  </div>
                  <span className="bs-view-all-label">View All</span>
                </Link>
              )}
          </div>

          {showRightArrow && (
            <button
              onClick={() => scroll("right")}
              className="bs-scroll-btn bs-scroll-btn-right"
            >
              <ChevronRightIcon
                style={{ width: 16, height: 16, color: "var(--bs-green)" }}
              />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default BestSellers;