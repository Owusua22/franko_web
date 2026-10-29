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
    <div className="fixed top-4 right-4 z-50 pd-animate-slide-in">
      <div
        className={`${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 min-w-[280px]`}
        style={{ fontFamily: "var(--pd-font)" }}
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

const PhoneDeals = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const categoryId = "51d1fff2-7b71-46aa-9b34-2e553a40e921";

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
          --pd-font: 'Plus Jakarta Sans', sans-serif;
          --pd-green: #14532d;
          --pd-green-mid: #166534;
          --pd-green-light: #dcfce7;
          --pd-green-lighter: #f0fdf4;
          --pd-green-accent: #22c55e;
          --pd-dark: #1a1a1a;
          --pd-mid: #555;
          --pd-light: #888;
          --pd-border: #e0e0e0;
          --pd-bg-subtle: #f7f7f7;
          --pd-red: #dc2626;
          --pd-pink: #e11d48;
          --pd-radius: 4px;
        }

        .pd-root, .pd-root * {
          font-family: var(--pd-font);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        /* ==================== HEADER ==================== */

        .pd-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .pd-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .pd-title-accent {
          width: 4px;
          height: 22px;
          border-radius: 2px;
          background: var(--pd-green);
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .pd-title-accent { height: 26px; }
        }

        .pd-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--pd-dark);
          letter-spacing: -0.02em;
          line-height: 1;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          .pd-title { font-size: 20px; }
        }

        .pd-header-line {
          flex: 1;
          height: 1px;
          background: var(--pd-border);
          min-width: 20px;
        }

        .pd-see-more {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          color: var(--pd-green);
          text-decoration: none;
          transition: all 0.15s;
          white-space: nowrap;
          flex-shrink: 0;
          cursor: pointer;
          font-family: var(--pd-font);
          background: none;
          border: none;
          padding: 0;
        }

        .pd-see-more:hover {
          color: var(--pd-green-mid);
        }

        .pd-see-more-arrow {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--pd-green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .pd-see-more:hover .pd-see-more-arrow {
          background: var(--pd-green);
        }

        .pd-see-more:hover .pd-see-more-arrow svg {
          color: #fff !important;
        }

        /* ==================== CARDS ==================== */

        .pd-card {
          min-width: 160px;
          width: 160px;
          border: 1px solid var(--pd-border);
          border-radius: var(--pd-radius);
          overflow: hidden;
          background: #fff;
          transition: all 0.2s ease;
          cursor: pointer;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .pd-card { min-width: 220px; width: 220px; }
        }

        .pd-card:hover {
          border-color: var(--pd-green-accent);
          box-shadow: 0 4px 16px rgba(20, 83, 45, 0.08);
        }

        .pd-card-img {
          position: relative;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;

          overflow: hidden;
        }

        @media (min-width: 768px) {
          .pd-card-img { height: 195px; }
        }

        .pd-card-img img {
          height: 100%;
          width: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }

        .pd-card:hover .pd-card-img img {
          transform: scale(1.05);
        }

        .pd-card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(20, 83, 45, 0.45);
          display: none;
          align-items: center;
          justify-content: center;
          gap: 8px;
          z-index: 2;
        }

        .pd-card:hover .pd-card-overlay {
          display: flex;
        }

        .pd-card-action {
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

        .pd-card-action:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .pd-card-action:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .pd-card-body {
          padding: 10px 12px;
          text-align: center;
        }

        .pd-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--pd-dark);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 35px;
        }

        .pd-card-price {
          font-size: 14px;
          font-weight: 900;
          color: var(--pd-red);
          margin-top: 2px;
        }

        .pd-card-old-price {
          font-size: 12px;
          font-weight: 400;
          color: var(--pd-light);
          text-decoration: line-through;
          margin-top: 2px;
        }

        .pd-card-sold {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 100px;
          background: var(--pd-dark);
          color: #fff;
          z-index: 3;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .pd-card-discount {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 100px;
          background: var(--pd-red);
          color: #fff;
          z-index: 3;
        }

        /* ==================== SCROLL BUTTONS ==================== */

        .pd-scroll-btn {
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
          border: 1px solid var(--pd-border);
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          cursor: pointer;
          transition: all 0.15s;
        }

        .pd-scroll-btn:hover {
          background: var(--pd-green-light);
          border-color: var(--pd-green-accent);
        }

        .pd-scroll-btn:active {
          transform: translateY(-50%) scale(0.95);
        }

        .pd-scroll-btn-left { left: -4px; }
        .pd-scroll-btn-right { right: -4px; }

        @media (min-width: 768px) {
          .pd-scroll-btn-left { left: -10px; }
          .pd-scroll-btn-right { right: -10px; }
        }

        /* ==================== VIEW ALL ==================== */

        .pd-view-all {
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
          .pd-view-all { min-width: 140px; width: 140px; }
        }

        .pd-view-all-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--pd-green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .pd-view-all:hover .pd-view-all-circle {
          background: var(--pd-green);
          border-color: var(--pd-green);
        }

        .pd-view-all:hover .pd-view-all-circle svg {
          color: #fff !important;
        }

        .pd-view-all-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--pd-green);
        }

        /* ==================== SKELETON ==================== */

        .pd-skeleton {
          min-width: 160px;
          width: 160px;
          border: 1px solid #eee;
          border-radius: var(--pd-radius);
          overflow: hidden;
          background: #fff;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .pd-skeleton { min-width: 220px; width: 220px; }
        }

        .pd-skeleton-img {
          height: 150px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: pd-shimmer 1.5s infinite;
        }

        @media (min-width: 768px) {
          .pd-skeleton-img { height: 195px; }
        }

        @keyframes pd-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .pd-skeleton-line {
          height: 10px;
          border-radius: 2px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: pd-shimmer 1.5s infinite;
        }

        /* ==================== ANIMATIONS ==================== */

        @keyframes pd-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .pd-animate-slide-in {
          animation: pd-slide-in 0.3s ease-out;
        }

        .pd-no-scrollbar::-webkit-scrollbar { display: none; }
        .pd-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="pd-root mx-auto px-4 md:px-16 py-6">
        {/* ==================== HEADER ==================== */}
        <div className="pd-header">
          <div className="pd-title-wrap">
            <div className="pd-title-accent" />
            <h2 className="pd-title">Mobile Phones</h2>
          </div>

          <div className="pd-header-line" />

          <Link to="/phones" className="pd-see-more">
            <span>View All</span>
            <span className="pd-see-more-arrow">
              <ChevronRightIcon
                style={{ width: 10, height: 10, color: "var(--pd-green)" }}
              />
            </span>
          </Link>
        </div>

        {/* ==================== CAROUSEL ==================== */}
        <div className="relative">
          {showLeftArrow && (
            <button
              onClick={() => scroll("left")}
              className="pd-scroll-btn pd-scroll-btn-left"
            >
              <ChevronLeftIcon
                style={{ width: 16, height: 16, color: "var(--pd-green)" }}
              />
            </button>
          )}

          <div
            ref={scrollRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex gap-3 md:gap-4 overflow-x-auto pd-no-scrollbar scroll-smooth"
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
                  className="pd-card"
                  style={{ marginBottom: 4 }}
                >
                  <div className="pd-card-img">
                    {soldOut && (
                      <span className="pd-card-sold">Sold Out</span>
                    )}
                    {isOnSale && !soldOut && (
                      <span className="pd-card-discount">
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
                      className="pd-card-overlay"
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
                          className="pd-card-action"
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
                                color: "var(--pd-pink)",
                              }}
                            />
                          ) : (
                            <OutlineHeartIcon
                              style={{
                                width: 16,
                                height: 16,
                                color: "var(--pd-mid)",
                              }}
                            />
                          )}
                        </button>
                      </Tooltip>

                      <Tooltip content="View Details">
                        <button
                          className="pd-card-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(getProductUrl({ productName }));
                          }}
                        >
                          <EyeIcon
                            style={{
                              width: 16,
                              height: 16,
                              color: "var(--pd-green)",
                            }}
                          />
                        </button>
                      </Tooltip>

                      <Tooltip
                        content={soldOut ? "Out of Stock" : "Add to Cart"}
                      >
                        <button
                          className="pd-card-action"
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
                              color: "var(--pd-green-mid)",
                            }}
                          />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="pd-card-body">
                    <div className="pd-card-name">{productName}</div>
                    <div className="pd-card-price">{formatPrice(price)}</div>
                    {oldPrice > 0 && (
                      <div className="pd-card-old-price">
                        {formatPrice(oldPrice)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sortedProducts.length > 0 && (
              <Link to="/phones" className="pd-view-all">
                <div className="pd-view-all-circle">
                  <ArrowRightIcon
                    style={{
                      width: 20,
                      height: 20,
                      color: "var(--pd-green)",
                      transition: "color 0.2s",
                    }}
                  />
                </div>
                <span className="pd-view-all-label">View All</span>
              </Link>
            )}
          </div>

          {showRightArrow && (
            <button
              onClick={() => scroll("right")}
              className="pd-scroll-btn pd-scroll-btn-right"
            >
              <ChevronRightIcon
                style={{ width: 16, height: 16, color: "var(--pd-green)" }}
              />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default PhoneDeals;