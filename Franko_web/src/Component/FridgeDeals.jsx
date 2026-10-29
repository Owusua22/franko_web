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
import { fetchProductsByCategory } from "../Redux/Slice/productSlice";
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

  const bgColor = type === "success" ? "bg-green-800" : "bg-red-600";
  const Icon = type === "success" ? CheckCircleIcon : XCircleIcon;

  return (
    <div className="fixed top-4 right-4 z-50 fd-animate-slide-in">
      <div
        className={`${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 min-w-[280px]`}
        style={{ fontFamily: "var(--fd-font)" }}
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

const FridgeDeals = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const categoryId = "4f5076f8-34b6-42b8-a9c5-a1e92e3d08fb";

  const { productsByCategory = {} } = useSelector(
    (state) => state.products
  );
  const { addProductToCart, loading: cartLoading } = useAddToCart();
  const wishlist = useSelector((state) => state.wishlist.items || []);

  const isInWishlist = (id) =>
    Array.isArray(wishlist) && wishlist.some((item) => item.id === id);

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

  // ==================== DATA ====================

  const sortedProducts = (
    Array.isArray(productsByCategory[categoryId])
      ? productsByCategory[categoryId]
      : []
  )
    .filter(
      (product) =>
        product.productID !== "9d88a301-e4ff-42a2-957a-9c611d4cce12"
    )
    .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
    .slice(0, 10);

  const hasEnoughProducts = sortedProducts.length >= 8;

  useEffect(() => {
    dispatch(fetchProductsByCategory(categoryId));
  }, [dispatch, categoryId]);

  useEffect(() => {
    const refresh = () => dispatch(fetchProductsByCategory({ id: categoryId, forceRefresh: true }));
    window.addEventListener(CATALOGUE_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CATALOGUE_UPDATED_EVENT, refresh);
  }, [dispatch, categoryId]);

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
  }, [sortedProducts]);

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
  }, [sortedProducts, isHovered]);

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
          --fd-font: 'Plus Jakarta Sans', sans-serif;
          --fd-green: #14532d;
          --fd-green-mid: #166534;
          --fd-green-light: #dcfce7;
          --fd-green-lighter: #f0fdf4;
          --fd-green-accent: #22c55e;
          --fd-dark: #1a1a1a;
          --fd-mid: #555;
          --fd-light: #888;
          --fd-border: #e0e0e0;
          --fd-bg-subtle: #f7f7f7;
          --fd-red: #dc2626;
          --fd-pink: #e11d48;
          --fd-radius: 4px;
        }

        .fd-root, .fd-root * {
          font-family: var(--fd-font);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        /* ==================== HEADER ==================== */

        .fd-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .fd-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .fd-title-accent {
          width: 4px;
          height: 22px;
          border-radius: 2px;
          background: var(--fd-green);
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .fd-title-accent { height: 26px; }
        }

        .fd-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--fd-dark);
          letter-spacing: -0.02em;
          line-height: 1;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          .fd-title { font-size: 20px; }
        }

        .fd-header-line {
          flex: 1;
          height: 1px;
          background: var(--fd-border);
          min-width: 20px;
        }

        .fd-see-more {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          color: var(--fd-green);
          text-decoration: none;
          transition: all 0.15s;
          white-space: nowrap;
          flex-shrink: 0;
          cursor: pointer;
          font-family: var(--fd-font);
          background: none;
          border: none;
          padding: 0;
        }

        .fd-see-more:hover {
          color: var(--fd-green-mid);
        }

        .fd-see-more-arrow {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--fd-green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .fd-see-more:hover .fd-see-more-arrow {
          background: var(--fd-green);
        }

        .fd-see-more:hover .fd-see-more-arrow svg {
          color: #fff !important;
        }

        /* ==================== CARDS ==================== */

        .fd-card {
          min-width: 160px;
          width: 160px;
          border: 1px solid var(--fd-border);
          border-radius: var(--fd-radius);
          overflow: hidden;
          background: #fff;
          transition: all 0.2s ease;
          cursor: pointer;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .fd-card { min-width: 220px; width: 220px; }
        }

        .fd-card:hover {
          border-color: var(--fd-green-accent);
          box-shadow: 0 4px 16px rgba(20, 83, 45, 0.08);
        }

        .fd-card-img {
          position: relative;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;

          overflow: hidden;
        }

        @media (min-width: 768px) {
          .fd-card-img { height: 195px; }
        }

        .fd-card-img img {
          height: 100%;
          width: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }

        .fd-card:hover .fd-card-img img {
          transform: scale(1.05);
        }

        .fd-card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(20, 83, 45, 0.45);
          display: none;
          align-items: center;
          justify-content: center;
          gap: 8px;
          z-index: 2;
        }

        .fd-card:hover .fd-card-overlay {
          display: flex;
        }

        .fd-card-action {
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

        .fd-card-action:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .fd-card-action:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .fd-card-body {
          padding: 10px 12px;
          text-align: center;
        }

        .fd-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--fd-dark);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 35px;
        }

        .fd-card-price {
          font-size: 14px;
          font-weight: 900;
          color: var(--fd-red);
          margin-top: 2px;
        }

        .fd-card-old-price {
          font-size: 12px;
          font-weight: 400;
          color: var(--fd-light);
          text-decoration: line-through;
          margin-top: 2px;
        }

        .fd-card-sold {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 100px;
          background: var(--fd-dark);
          color: #fff;
          z-index: 3;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .fd-card-discount {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 100px;
          background: var(--fd-red);
          color: #fff;
          z-index: 3;
        }

        /* ==================== SCROLL BUTTONS ==================== */

        .fd-scroll-btn {
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
          border: 1px solid var(--fd-border);
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          cursor: pointer;
          transition: all 0.15s;
        }

        .fd-scroll-btn:hover {
          background: var(--fd-green-light);
          border-color: var(--fd-green-accent);
        }

        .fd-scroll-btn:active {
          transform: translateY(-50%) scale(0.95);
        }

        .fd-scroll-btn-left { left: -4px; }
        .fd-scroll-btn-right { right: -4px; }

        @media (min-width: 768px) {
          .fd-scroll-btn-left { left: -10px; }
          .fd-scroll-btn-right { right: -10px; }
        }

        /* ==================== VIEW ALL ==================== */

        .fd-view-all {
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
          .fd-view-all { min-width: 140px; width: 140px; }
        }

        .fd-view-all-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--fd-green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .fd-view-all:hover .fd-view-all-circle {
          background: var(--fd-green);
          border-color: var(--fd-green);
        }

        .fd-view-all:hover .fd-view-all-circle svg {
          color: #fff !important;
        }

        .fd-view-all-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--fd-green);
        }

        /* ==================== SKELETON ==================== */

        .fd-skeleton {
          min-width: 160px;
          width: 160px;
          border: 1px solid #eee;
          border-radius: var(--fd-radius);
          overflow: hidden;
          background: #fff;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .fd-skeleton { min-width: 220px; width: 220px; }
        }

        .fd-skeleton-img {
          height: 150px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: fd-shimmer 1.5s infinite;
        }

        @media (min-width: 768px) {
          .fd-skeleton-img { height: 195px; }
        }

        @keyframes fd-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .fd-skeleton-line {
          height: 10px;
          border-radius: 2px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: fd-shimmer 1.5s infinite;
        }

        /* ==================== ANIMATIONS ==================== */

        @keyframes fd-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .fd-animate-slide-in {
          animation: fd-slide-in 0.3s ease-out;
        }

        .fd-no-scrollbar::-webkit-scrollbar { display: none; }
        .fd-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="fd-root mx-auto px-4 md:px-16 py-6">
        {/* ==================== HEADER ==================== */}
        <div className="fd-header">
          <div className="fd-title-wrap">
            <div className="fd-title-accent" />
            <h2 className="fd-title">Refrigerators</h2>
          </div>

          <div className="fd-header-line" />

          {hasEnoughProducts && (
            <Link to="/refrigerator" className="fd-see-more">
              <span>View All</span>
              <span className="fd-see-more-arrow">
                <ChevronRightIcon
                  style={{ width: 10, height: 10, color: "var(--fd-green)" }}
                />
              </span>
            </Link>
          )}
        </div>

        {/* ==================== CAROUSEL ==================== */}
        <div className="relative">
          {showLeftArrow && (
            <button
              onClick={() => scroll("left")}
              className="fd-scroll-btn fd-scroll-btn-left"
            >
              <ChevronLeftIcon
                style={{ width: 16, height: 16, color: "var(--fd-green)" }}
              />
            </button>
          )}

          <div
            ref={scrollRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex gap-3 md:gap-4 overflow-x-auto fd-no-scrollbar scroll-smooth"
            style={{ paddingBottom: 4, paddingLeft: 1, paddingRight: 1 }}
          >
            {(sortedProducts).map(
              (product) => {
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
                const soldOut = stock === 0;
                const inWishlist = isInWishlist(product.id || productID);

                return (
                  <div
                    key={productID}
                    className="fd-card"
                    style={{ marginBottom: 4 }}
                  >
                    <div className="fd-card-img">
                      {soldOut && (
                        <span className="fd-card-sold">Sold Out</span>
                      )}
                      {isOnSale && !soldOut && (
                        <span className="fd-card-discount">
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
                        className="fd-card-overlay"
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
                            className="fd-card-action"
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
                                  color: "var(--fd-pink)",
                                }}
                              />
                            ) : (
                              <OutlineHeartIcon
                                style={{
                                  width: 16,
                                  height: 16,
                                  color: "var(--fd-mid)",
                                }}
                              />
                            )}
                          </button>
                        </Tooltip>

                        <Tooltip content="View Details">
                          <button
                            className="fd-card-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(getProductUrl({ productName }));
                            }}
                          >
                            <EyeIcon
                              style={{
                                width: 16,
                                height: 16,
                                color: "var(--fd-green)",
                              }}
                            />
                          </button>
                        </Tooltip>

                        <Tooltip
                          content={soldOut ? "Out of Stock" : "Add to Cart"}
                        >
                          <button
                            className="fd-card-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                            disabled={cartLoading || soldOut}
                          >
                            <ShoppingCartIcon
                              style={{
                                width: 16,
                                height: 16,
                                color: "var(--fd-green-mid)",
                              }}
                            />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="fd-card-body">
                      <div className="fd-card-name">{productName}</div>
                      <div className="fd-card-price">
                        {formatPrice(price)}
                      </div>
                      {oldPrice > 0 && (
                        <div className="fd-card-old-price">
                          {formatPrice(oldPrice)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}

            {/* View All card only if 8 or more products */}
            {hasEnoughProducts && (
              <Link to="/refrigerator" className="fd-view-all">
                <div className="fd-view-all-circle">
                  <ArrowRightIcon
                    style={{
                      width: 20,
                      height: 20,
                      color: "var(--fd-green)",
                      transition: "color 0.2s",
                    }}
                  />
                </div>
                <span className="fd-view-all-label">View All</span>
              </Link>
            )}
          </div>

          {showRightArrow && (
            <button
              onClick={() => scroll("right")}
              className="fd-scroll-btn fd-scroll-btn-right"
            >
              <ChevronRightIcon
                style={{ width: 16, height: 16, color: "var(--fd-green)" }}
              />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default FridgeDeals;