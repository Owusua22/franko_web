import { cartAddFeedback } from "../utils/cartItems.mjs";
import { getProductUrl } from "../utils/productSlug";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addToWishlist,
  removeFromWishlist,
} from "../Redux/Slice/wishlistSlice";
import { fetchProducts } from "../Redux/Slice/productSlice";
import Tooltip from "@material-tailwind/react/components/Tooltip";
import {
  HeartIcon as OutlineHeartIcon,
  HeartIcon as SolidHeartIcon,
  ShoppingCartIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";
import useAddToCart from "./Cart";
import { useNavigate, Link } from "react-router-dom";

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
  }, [isVisible, message, onClose]);

  if (!isVisible || !message) return null;

  const bgColor = type === "success" ? "bg-green-800" : type === "info" ? "bg-amber-700" : "bg-red-600";
  const Icon = type === "success" ? CheckCircleIcon : XCircleIcon;

  return (
    <div className="fixed top-4 right-4 z-50 na-animate-slide-in">
      <div
        className={`${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 min-w-[280px]`}
        style={{ fontFamily: "var(--na-font)" }}
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

// ==================== SKELETON ====================

const SkeletonCard = () => (
  <div className="na-skeleton">
    <div className="na-skeleton-img" />
    <div style={{ padding: "10px 12px" }}>
      <div
        className="na-skeleton-line"
        style={{ width: "80%", marginBottom: 8, marginLeft: "auto", marginRight: "auto" }}
      />
      <div
        className="na-skeleton-line"
        style={{ width: "50%", height: 8, marginLeft: "auto", marginRight: "auto" }}
      />
    </div>
  </div>
);

// ==================== MAIN COMPONENT ====================

const NewArrivals = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products } = useSelector((state) => state.products);
  const wishlist = useSelector((state) => state.wishlist.items || []);
  const { addProductToCart, loading: cartLoading } = useAddToCart();

  const [notification, setNotification] = useState({
    message: "",
    type: "success",
    isVisible: false,
  });

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  // Get the 10 most recent products based on creation date
  const recentProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    const sortedProducts = [...products].sort((a, b) => {
      const dateA = new Date(
        a.dateCreated || a.createdAt || a.created_at || a.date_created || a.creationDate || 0
      );
      const dateB = new Date(
        b.dateCreated || b.createdAt || b.created_at || b.date_created || b.creationDate || 0
      );
      return dateB - dateA;
    });

    return sortedProducts.slice(0, 10);
  }, [products]);

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message: "", type: "success", isVisible: false });
    requestAnimationFrame(() => {
      setNotification({ message, type, isVisible: true });
    });
  }, []);

  const isInWishlist = (id) =>
    Array.isArray(wishlist) && wishlist.some((item) => item.id === id);

  const handleWishlistToggle = (product) => {
    const id = product.productID;
    if (isInWishlist(id)) {
      dispatch(removeFromWishlist(id));
      showNotification("Removed from wishlist");
    } else {
      dispatch(addToWishlist({ ...product, id }));
      showNotification("Added to wishlist");
    }
  };

  const handleAddToCart = async (product) => {
    try {
      await addProductToCart(product);
      showNotification("Added to cart");
    } catch (error) {
      const feedback = cartAddFeedback(error);
      showNotification(feedback.message, feedback.type);
    }
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
          --na-font: 'Plus Jakarta Sans', sans-serif;
          --na-green: #14532d;
          --na-green-mid: #166534;
          --na-green-light: #dcfce7;
          --na-green-lighter: #f0fdf4;
          --na-green-accent: #22c55e;
          --na-dark: #1a1a1a;
          --na-mid: #555;
          --na-light: #888;
          --na-border: #e0e0e0;
          --na-bg-subtle: #f7f7f7;
          --na-red: #dc2626;
          --na-pink: #e11d48;
          --na-radius: 4px;
        }

        .na-root, .na-root * {
          font-family: var(--na-font);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        /* ==================== HEADER ==================== */

        .na-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .na-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .na-title-accent {
          width: 4px;
          height: 22px;
          border-radius: 2px;
          background: var(--na-green);
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .na-title-accent { height: 26px; }
        }

        .na-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--na-dark);
          letter-spacing: -0.02em;
          line-height: 1;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          .na-title { font-size: 20px; }
        }

        .na-header-line {
          flex: 1;
          height: 1px;
          background: var(--na-border);
          min-width: 20px;
        }

        .na-see-more {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          color: var(--na-green);
          text-decoration: none;
          transition: all 0.15s;
          white-space: nowrap;
          flex-shrink: 0;
          cursor: pointer;
          font-family: var(--na-font);
          background: none;
          border: none;
          padding: 0;
        }

        .na-see-more:hover {
          color: var(--na-green-mid);
        }

        .na-see-more-arrow {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--na-green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .na-see-more:hover .na-see-more-arrow {
          background: var(--na-green);
        }

        .na-see-more:hover .na-see-more-arrow svg {
          color: #fff !important;
        }

        /* ==================== GRID ==================== */

        .na-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 640px) {
          .na-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .na-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }

        @media (min-width: 1280px) {
          .na-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        /* ==================== CARDS ==================== */

        .na-card {
          border: 1px solid var(--na-border);
          border-radius: var(--na-radius);
          overflow: hidden;
          background: #fff;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .na-card:hover {
          border-color: var(--na-green-accent);
          box-shadow: 0 4px 16px rgba(20, 83, 45, 0.08);
        }

        .na-card-img {
          position: relative;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          overflow: hidden;
        }

        @media (min-width: 768px) {
          .na-card-img { height: 195px; }
        }

        .na-card-img img {
          height: 100%;
          width: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }

        .na-card:hover .na-card-img img {
          transform: scale(1.05);
        }

        .na-card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(20, 83, 45, 0.45);
          display: none;
          align-items: center;
          justify-content: center;
          gap: 8px;
          z-index: 2;
        }

        .na-card:hover .na-card-overlay {
          display: flex;
        }

        .na-card-action {
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

        .na-card-action:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .na-card-action:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .na-card-body {
          padding: 10px 12px;
          text-align: center;
        }

        .na-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--na-dark);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 35px;
        }

        .na-card-price {
          font-size: 14px;
          font-weight: 900;
          color: var(--na-red);
          margin-top: 2px;
        }

        .na-card-old-price {
          font-size: 12px;
          font-weight: 400;
          color: var(--na-light);
          text-decoration: line-through;
          margin-top: 2px;
        }

        .na-card-sold {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 100px;
          background: var(--na-dark);
          color: #fff;
          z-index: 3;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .na-card-discount {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 100px;
          background: var(--na-red);
          color: #fff;
          z-index: 3;
        }

        /* ==================== SKELETON ==================== */

        .na-skeleton {
          border: 1px solid #eee;
          border-radius: var(--na-radius);
          overflow: hidden;
          background: #fff;
        }

        .na-skeleton-img {
          height: 150px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: na-shimmer 1.5s infinite;
        }

        @media (min-width: 768px) {
          .na-skeleton-img { height: 195px; }
        }

        @keyframes na-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .na-skeleton-line {
          height: 10px;
          border-radius: 2px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: na-shimmer 1.5s infinite;
        }

        /* ==================== ANIMATIONS ==================== */

        @keyframes na-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .na-animate-slide-in {
          animation: na-slide-in 0.3s ease-out;
        }
      `}</style>

      <div className="na-root mx-auto px-4 md:px-16 py-6">
        {/* ==================== HEADER ==================== */}
        <div className="na-header">
          <div className="na-title-wrap">
            <div className="na-title-accent" />
            <h2 className="na-title">New Arrivals</h2>
          </div>

          <div className="na-header-line" />

          <Link to="/products" className="na-see-more">
            <span>Shop All Products</span>
            <span className="na-see-more-arrow">
              <ChevronRightIcon
                style={{ width: 10, height: 10, color: "var(--na-green)" }}
              />
            </span>
          </Link>
        </div>

        {/* ==================== GRID ==================== */}
        <div className="na-grid">
          {(recentProducts).map(
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
              const inWishlist = isInWishlist(productID);

              return (
                <div key={productID} className="na-card">
                  <div className="na-card-img">
                    {soldOut && <span className="na-card-sold">Sold Out</span>}
                    {isOnSale && !soldOut && (
                      <span className="na-card-discount">-{discountPercent}%</span>
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
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://via.placeholder.com/150";
                        }}
                      />
                    </div>

                    <div
                      className="na-card-overlay"
                      onClick={() => navigate(getProductUrl({ productName }))}
                    >
                      <Tooltip
                        content={
                          inWishlist ? "Remove from Wishlist" : "Add to Wishlist"
                        }
                      >
                        <button
                          className="na-card-action"
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
                                color: "var(--na-pink)",
                              }}
                            />
                          ) : (
                            <OutlineHeartIcon
                              style={{
                                width: 16,
                                height: 16,
                                color: "var(--na-mid)",
                              }}
                            />
                          )}
                        </button>
                      </Tooltip>

                      <Tooltip content="View Details">
                        <button
                          className="na-card-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(getProductUrl({ productName }));
                          }}
                        >
                          <EyeIcon
                            style={{
                              width: 16,
                              height: 16,
                              color: "var(--na-green)",
                            }}
                          />
                        </button>
                      </Tooltip>

                      <Tooltip content={soldOut ? "Out of Stock" : "Add to Cart"}>
                        <button
                          className="na-card-action"
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
                              color: "var(--na-green-mid)",
                            }}
                          />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="na-card-body">
                    <div className="na-card-name">{productName}</div>
                    <div className="na-card-price">{formatPrice(price)}</div>
                    {oldPrice > 0 && (
                      <div className="na-card-old-price">{formatPrice(oldPrice)}</div>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </>
  );
};

export default NewArrivals;