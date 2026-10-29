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
    <div className="fixed top-4 right-4 z-50 td-animate-slide-in">
      <div
        className={`${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 min-w-[280px]`}
        style={{ fontFamily: "var(--td-font)" }}
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

const TeleDeals = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const categoryId = "b51e02c2-540a-484a-9307-392fac7b50ed";

  const { productsByCategory = {} } = useSelector((state) => state.products);
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
          --td-font: 'Plus Jakarta Sans', sans-serif;
          --td-green: #14532d;
          --td-green-mid: #166534;
          --td-green-light: #dcfce7;
          --td-green-lighter: #f0fdf4;
          --td-green-accent: #22c55e;
          --td-dark: #1a1a1a;
          --td-mid: #555;
          --td-light: #888;
          --td-border: #e0e0e0;
          --td-bg-subtle: #f7f7f7;
          --td-red: #dc2626;
          --td-pink: #e11d48;
          --td-radius: 4px;
        }

        .td-root, .td-root * {
          font-family: var(--td-font);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        /* ==================== HEADER ==================== */

        .td-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .td-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .td-title-accent {
          width: 4px;
          height: 22px;
          border-radius: 2px;
          background: var(--td-green);
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .td-title-accent { height: 26px; }
        }

        .td-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--td-dark);
          letter-spacing: -0.02em;
          line-height: 1;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          .td-title { font-size: 20px; }
        }

        .td-header-line {
          flex: 1;
          height: 1px;
          background: var(--td-border);
          min-width: 20px;
        }

        .td-see-more {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          color: var(--td-green);
          text-decoration: none;
          transition: all 0.15s;
          white-space: nowrap;
          flex-shrink: 0;
          cursor: pointer;
          font-family: var(--td-font);
          background: none;
          border: none;
          padding: 0;
        }

        .td-see-more:hover {
          color: var(--td-green-mid);
        }

        .td-see-more-arrow {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--td-green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .td-see-more:hover .td-see-more-arrow {
          background: var(--td-green);
        }

        .td-see-more:hover .td-see-more-arrow svg {
          color: #fff !important;
        }

        /* ==================== CARDS ==================== */

        .td-card {
          min-width: 160px;
          width: 160px;
          border: 1px solid var(--td-border);
          border-radius: var(--td-radius);
          overflow: hidden;
          background: #fff;
          transition: all 0.2s ease;
          cursor: pointer;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .td-card { min-width: 220px; width: 220px; }
        }

        .td-card:hover {
          border-color: var(--td-green-accent);
          box-shadow: 0 4px 16px rgba(20, 83, 45, 0.08);
        }

        .td-card-img {
          position: relative;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          overflow: hidden;
        }

        @media (min-width: 768px) {
          .td-card-img { height: 195px; }
        }

        .td-card-img img {
          height: 100%;
          width: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }

        .td-card:hover .td-card-img img {
          transform: scale(1.05);
        }

        .td-card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(20, 83, 45, 0.45);
          display: none;
          align-items: center;
          justify-content: center;
          gap: 8px;
          z-index: 2;
        }

        .td-card:hover .td-card-overlay {
          display: flex;
        }

        .td-card-action {
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

        .td-card-action:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .td-card-action:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .td-card-body {
          padding: 10px 12px;
          text-align: center;
        }

        .td-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--td-dark);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 35px;
        }

        .td-card-price {
          font-size: 14px;
          font-weight: 900;
          color: var(--td-red);
          margin-top: 2px;
        }

        .td-card-old-price {
          font-size: 12px;
          font-weight: 400;
          color: var(--td-light);
          text-decoration: line-through;
          margin-top: 2px;
        }

        .td-card-sold {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 100px;
          background: var(--td-dark);
          color: #fff;
          z-index: 3;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .td-card-discount {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 100px;
          background: var(--td-red);
          color: #fff;
          z-index: 3;
        }

        /* ==================== SCROLL BUTTONS ==================== */

        .td-scroll-btn {
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
          border: 1px solid var(--td-border);
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          cursor: pointer;
          transition: all 0.15s;
        }

        .td-scroll-btn:hover {
          background: var(--td-green-light);
          border-color: var(--td-green-accent);
        }

        .td-scroll-btn:active {
          transform: translateY(-50%) scale(0.95);
        }

        .td-scroll-btn-left { left: -4px; }
        .td-scroll-btn-right { right: -4px; }

        @media (min-width: 768px) {
          .td-scroll-btn-left { left: -10px; }
          .td-scroll-btn-right { right: -10px; }
        }

        /* ==================== VIEW ALL ==================== */

        .td-view-all {
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
          .td-view-all { min-width: 140px; width: 140px; }
        }

        .td-view-all-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--td-green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .td-view-all:hover .td-view-all-circle {
          background: var(--td-green);
          border-color: var(--td-green);
        }

        .td-view-all:hover .td-view-all-circle svg {
          color: #fff !important;
        }

        .td-view-all-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--td-green);
        }

        /* ==================== SKELETON ==================== */

        .td-skeleton {
          min-width: 160px;
          width: 160px;
          border: 1px solid #eee;
          border-radius: var(--td-radius);
          overflow: hidden;
          background: #fff;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .td-skeleton { min-width: 220px; width: 220px; }
        }

        .td-skeleton-img {
          height: 150px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: td-shimmer 1.5s infinite;
        }

        @media (min-width: 768px) {
          .td-skeleton-img { height: 195px; }
        }

        @keyframes td-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .td-skeleton-line {
          height: 10px;
          border-radius: 2px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: td-shimmer 1.5s infinite;
        }

        /* ==================== ANIMATIONS ==================== */

        @keyframes td-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .td-animate-slide-in {
          animation: td-slide-in 0.3s ease-out;
        }

        .td-no-scrollbar::-webkit-scrollbar { display: none; }
        .td-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="td-root mx-auto px-4 md:px-16 py-6">
        {/* ==================== HEADER ==================== */}
        <div className="td-header">
          <div className="td-title-wrap">
            <div className="td-title-accent" />
            <h2 className="td-title">Television</h2>
          </div>

          <div className="td-header-line" />

          <Link to="/television" className="td-see-more">
            <span>View All</span>
            <span className="td-see-more-arrow">
              <ChevronRightIcon
                style={{ width: 10, height: 10, color: "var(--td-green)" }}
              />
            </span>
          </Link>
        </div>

        {/* ==================== CAROUSEL ==================== */}
        <div className="relative">
          {showLeftArrow && (
            <button
              onClick={() => scroll("left")}
              className="td-scroll-btn td-scroll-btn-left"
            >
              <ChevronLeftIcon
                style={{ width: 16, height: 16, color: "var(--td-green)" }}
              />
            </button>
          )}

          <div
            ref={scrollRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex gap-3 md:gap-4 overflow-x-auto td-no-scrollbar scroll-smooth"
            style={{ paddingBottom: 4, paddingLeft: 1, paddingRight: 1 }}
          >
            {(sortedProducts
            ).map((product) => {
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
                  className="td-card"
                  style={{ marginBottom: 4 }}
                >
                  <div className="td-card-img">
                    {soldOut && (
                      <span className="td-card-sold">Sold Out</span>
                    )}
                    {isOnSale && !soldOut && (
                      <span className="td-card-discount">
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
                      className="td-card-overlay"
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
                          className="td-card-action"
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
                                color: "var(--td-pink)",
                              }}
                            />
                          ) : (
                            <OutlineHeartIcon
                              style={{
                                width: 16,
                                height: 16,
                                color: "var(--td-mid)",
                              }}
                            />
                          )}
                        </button>
                      </Tooltip>

                      <Tooltip content="View Details">
                        <button
                          className="td-card-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(getProductUrl({ productName }));
                          }}
                        >
                          <EyeIcon
                            style={{
                              width: 16,
                              height: 16,
                              color: "var(--td-green)",
                            }}
                          />
                        </button>
                      </Tooltip>

                      <Tooltip
                        content={soldOut ? "Out of Stock" : "Add to Cart"}
                      >
                        <button
                          className="td-card-action"
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
                              color: "var(--td-green-mid)",
                            }}
                          />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="td-card-body">
                    <div className="td-card-name">{productName}</div>
                    <div className="td-card-price">{formatPrice(price)}</div>
                    {oldPrice > 0 && (
                      <div className="td-card-old-price">
                        {formatPrice(oldPrice)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sortedProducts.length > 0 && (
              <Link to="/television" className="td-view-all">
                <div className="td-view-all-circle">
                  <ArrowRightIcon
                    style={{
                      width: 20,
                      height: 20,
                      color: "var(--td-green)",
                      transition: "color 0.2s",
                    }}
                  />
                </div>
                <span className="td-view-all-label">View All</span>
              </Link>
            )}
          </div>

          {showRightArrow && (
            <button
              onClick={() => scroll("right")}
              className="td-scroll-btn td-scroll-btn-right"
            >
              <ChevronRightIcon
                style={{ width: 16, height: 16, color: "var(--td-green)" }}
              />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default TeleDeals;