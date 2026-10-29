import { cartAddFeedback } from "../utils/cartItems.mjs";
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToWishlist, removeFromWishlist } from '../Redux/Slice/wishlistSlice';
import { Empty } from 'antd';
import { Helmet } from 'react-helmet';
import ProductDetailModal from '../Component/ProductDetailModal';
import useAddToCart from '../Component/Cart';
import {
  HeartIcon as OutlineHeartIcon,
  HeartIcon as SolidHeartIcon,
  ShoppingCartIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon
} from "@heroicons/react/24/solid";
import Tooltip from "@material-tailwind/react/components/Tooltip";

// ==================== NOTIFICATION COMPONENT ====================

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

  const bgColor = type === 'success' ? 'pp-notification-success' : 'pp-notification-error';
  const Icon = type === 'success' ? CheckCircleIcon : XCircleIcon;

  return (
    <div className="fixed top-4 right-4 z-50 pp-animate-slide-in">
      <div className={`pp-notification ${bgColor}`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="pp-notification-text">{message}</span>
        <button onClick={onClose} className="pp-notification-close">×</button>
      </div>
    </div>
  );
};

// ==================== SKELETON COMPONENT ====================

const SkeletonCard = () => (
  <div className="pp-skeleton">
    <div className="pp-skeleton-img" />
    <div style={{ padding: '10px 12px' }}>
      <div className="pp-skeleton-line" style={{ width: '80%', marginBottom: 8, marginLeft: 'auto', marginRight: 'auto' }} />
      <div className="pp-skeleton-line" style={{ width: '50%', height: 8, marginLeft: 'auto', marginRight: 'auto' }} />
    </div>
  </div>
);

// ==================== MAIN COMPONENT ====================

const ProductsPage = () => {
  const dispatch = useDispatch();
  const { products = [], loading } = useSelector((state) => state.products || {});
  const wishlist = useSelector((state) => state.wishlist.items);
  const { addProductToCart, loading: cartLoading } = useAddToCart();

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [notification, setNotification] = useState({
    message: '',
    type: 'success',
    isVisible: false
  });

  const itemsPerPage = 10;
  const observerRef = useRef(null);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  }, []);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message: '', type: 'success', isVisible: false });
    requestAnimationFrame(() => {
      setNotification({ message, type, isVisible: true });
    });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // CatalogueSync owns the live read. Slice the shared catalogue locally so a
  // refresh can add new products without appending duplicate paginated rows.
  const filteredProducts = useMemo(
    () => products.filter((product) => Number(product.status) === 1).slice(0, currentPage * itemsPerPage),
    [products, currentPage, itemsPerPage]
  );
  const hasMore = products.length > filteredProducts.length;
  const loadingMore = false;

  const handleProductClick = (productId) => {
    setSelectedProductId(productId);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setSelectedProductId(null);
    setIsModalVisible(false);
  };

  useEffect(() => {
    if (loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );

    if (observerRef.current) observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [loadingMore, hasMore]);

  // ==================== HELPERS ====================

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return "₵0.00";
    return `GH₵${Number(price).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getValidImageUrl = (imagePath) => {
    if (!imagePath) return "https://via.placeholder.com/150";
    return imagePath.includes("\\")
      ? `https://testing.frankotrading.com/Media/Products_Images/${imagePath.split("\\").pop()}`
      : imagePath;
  };

  const isInWishlist = (id) => wishlist.some((item) => item.id === id);

  const handleWishlistToggle = async (product) => {
    try {
      const id = product.productID;
      if (isInWishlist(id)) {
        dispatch(removeFromWishlist(id));
        showNotification("Removed from wishlist");
      } else {
        dispatch(addToWishlist({ ...product, id }));
        showNotification("Added to wishlist");
      }
    } catch {
      showNotification("Failed to update wishlist", "error");
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

  // ==================== RENDER ====================

  return (
    <>
      <style>{`
        :root {
          --pp-font: 'Plus Jakarta Sans', sans-serif;
          --pp-green: #14532d;
          --pp-green-mid: #166534;
          --pp-green-light: #dcfce7;
          --pp-green-lighter: #f0fdf4;
          --pp-green-accent: #22c55e;
          --pp-dark: #1a1a1a;
          --pp-mid: #555;
          --pp-light: #888;
          --pp-border: #e0e0e0;
          --pp-bg-subtle: #f7f7f7;
          --pp-red: #dc2626;
          --pp-pink: #e11d48;
          --pp-radius: 4px;
        }

        .pp-root, .pp-root * {
          font-family: var(--pp-font);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        /* ==================== PAGE BACKGROUND ==================== */

        .pp-page {
          min-height: 100vh;
          background: var(--pp-bg-subtle);
        }

        /* ==================== HEADER ==================== */

        .pp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .pp-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .pp-title-accent {
          width: 4px;
          height: 22px;
          border-radius: 2px;
          background: var(--pp-green);
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .pp-title-accent { height: 26px; }
        }

        .pp-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--pp-dark);
          letter-spacing: -0.02em;
          line-height: 1;
          white-space: nowrap;
          margin: 0;
        }

        @media (min-width: 768px) {
          .pp-title { font-size: 22px; }
        }

        .pp-header-line {
          flex: 1;
          height: 1px;
          background: var(--pp-border);
          min-width: 20px;
        }

        .pp-header-tagline {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--pp-light);
          font-size: 13px;
          flex-shrink: 0;
        }

        /* ==================== NOTIFICATION ==================== */

        .pp-notification {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--pp-radius);
          min-width: 300px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        .pp-notification-success {
          background: var(--pp-green);
          color: #fff;
        }

        .pp-notification-error {
          background: var(--pp-red);
          color: #fff;
        }

        .pp-notification-text {
          font-size: 14px;
          font-weight: 500;
          flex: 1;
        }

        .pp-notification-close {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.8);
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .pp-notification-close:hover {
          color: #fff;
        }

        /* ==================== GRID ==================== */

        .pp-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 640px) {
          .pp-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media (min-width: 1024px) {
          .pp-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
        }

        @media (min-width: 1280px) {
          .pp-grid { grid-template-columns: repeat(5, 1fr); }
        }

        /* ==================== CARDS ==================== */

        .pp-card {
          border: 1px solid var(--pp-border);
          border-radius: var(--pp-radius);
          overflow: hidden;
          background: #fff;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .pp-card:hover {
          border-color: var(--pp-green-accent);
          box-shadow: 0 4px 16px rgba(20, 83, 45, 0.08);
        }

        .pp-card-img {
          position: relative;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          overflow: hidden;
        }

        @media (min-width: 768px) {
          .pp-card-img { height: 195px; }
        }

        .pp-card-img img {
          height: 100%;
          width: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }

        .pp-card:hover .pp-card-img img {
          transform: scale(1.05);
        }

        .pp-card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(20, 83, 45, 0.45);
          display: none;
          align-items: center;
          justify-content: center;
          gap: 8px;
          z-index: 2;
        }

        .pp-card:hover .pp-card-overlay {
          display: flex;
        }

        .pp-card-action {
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

        .pp-card-action:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .pp-card-action:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .pp-card-body {
          padding: 10px 12px;
          text-align: center;
        }

        .pp-card-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--pp-dark);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 35px;
        }

        .pp-card-price {
          font-size: 15px;
          font-weight: 900;
          color: var(--pp-red);
          margin-top: 6px;
        }

        .pp-card-old-price {
          font-size: 12px;
          font-weight: 400;
          color: var(--pp-light);
          text-decoration: line-through;
          margin-top: 2px;
        }

        .pp-card-badge {
          position: absolute;
          top: 8px;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 100px;
          z-index: 3;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .pp-card-badge-sold {
          left: 8px;
          background: var(--pp-dark);
          color: #fff;
        }

        .pp-card-badge-discount {
          right: 8px;
          background: var(--pp-red);
          color: #fff;
          font-size: 10px;
          padding: 3px 7px;
        }

        /* ==================== SKELETON ==================== */

        .pp-skeleton {
          border: 1px solid #eee;
          border-radius: var(--pp-radius);
          overflow: hidden;
          background: #fff;
        }

        .pp-skeleton-img {
          height: 150px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: pp-shimmer 1.5s infinite;
        }

        @media (min-width: 768px) {
          .pp-skeleton-img { height: 195px; }
        }

        @keyframes pp-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .pp-skeleton-line {
          height: 10px;
          border-radius: 2px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: pp-shimmer 1.5s infinite;
        }

        /* ==================== EMPTY STATE ==================== */

        .pp-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
        }

        .pp-empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .pp-empty-text {
          font-size: 16px;
          color: var(--pp-light);
        }

        /* ==================== ANIMATIONS ==================== */

        @keyframes pp-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .pp-animate-slide-in {
          animation: pp-slide-in 0.3s ease-out;
        }

        /* ==================== LOADING MORE ==================== */

        .pp-observer {
          height: 40px;
        }
      `}</style>

      <div className="pp-root pp-page">
        <Helmet>
          <title>Shop Phones & Gadgets | Best Prices at Franko Trading</title>
          <meta name="description" content="Explore the latest smartphones, laptops, and accessories at unbeatable prices. Shop online at Franko Trading today!" />
          <meta property="og:title" content="Shop Phones & Gadgets | Best Prices at Franko Trading" />
        </Helmet>

        {/* Notification Component */}
        <Notification
          message={notification.message}
          type={notification.type}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />

        <div className="max-w-7xl mx-auto px-4 md:px-16 py-6">
          {/* Header */}
          <div className="pp-header">
            <div className="pp-title-wrap">
              <div className="pp-title-accent" />
              <h1 className="pp-title">All Products</h1>
            </div>
            <div className="pp-header-line" />
            <div className="pp-header-tagline">
              <SparklesIcon className="w-4 h-4" style={{ color: 'var(--pp-green-accent)' }} />
              <span>Discover amazing deals</span>
            </div>
          </div>

          {/* Products Grid */}
          {loading && products.length === 0 ? (
            <div className="pp-grid">
              {Array.from({ length: 15 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="pp-grid">
              {filteredProducts.map((product) => {
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
                  <div key={productID} className="pp-card">
                    <div className="pp-card-img">
                      {soldOut && (
                        <span className="pp-card-badge pp-card-badge-sold">Sold Out</span>
                      )}
                      {isOnSale && !soldOut && (
                        <span className="pp-card-badge pp-card-badge-discount">-{discountPercent}%</span>
                      )}

                      <div
                        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleProductClick(productID)}
                      >
                        <img
                          src={getValidImageUrl(productImage)}
                          alt={productName}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/150";
                          }}
                        />
                      </div>

                      <div
                        className="pp-card-overlay"
                        onClick={() => handleProductClick(productID)}
                      >
                        <Tooltip content={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}>
                          <button
                            className="pp-card-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWishlistToggle(product);
                            }}
                          >
                            {inWishlist ? (
                              <SolidHeartIcon style={{ width: 16, height: 16, color: 'var(--pp-pink)' }} />
                            ) : (
                              <OutlineHeartIcon style={{ width: 16, height: 16, color: 'var(--pp-mid)' }} />
                            )}
                          </button>
                        </Tooltip>

                        <Tooltip content="View Details">
                          <button
                            className="pp-card-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductClick(productID);
                            }}
                          >
                            <EyeIcon style={{ width: 16, height: 16, color: 'var(--pp-green)' }} />
                          </button>
                        </Tooltip>

                        <Tooltip content={soldOut ? "Out of Stock" : "Add to Cart"}>
                          <button
                            className="pp-card-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                            disabled={cartLoading || soldOut}
                          >
                            <ShoppingCartIcon style={{ width: 16, height: 16, color: 'var(--pp-green-mid)' }} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="pp-card-body">
                      <div className="pp-card-name">{productName || "Unnamed Product"}</div>
                      <div className="pp-card-price">{formatPrice(price)}</div>
                      {oldPrice > 0 && (
                        <div className="pp-card-old-price">{formatPrice(oldPrice)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="pp-empty">
              <div className="pp-empty-icon">🛍️</div>
              <Empty
                description={
                  <span className="pp-empty-text">
                    No products found. Check back later for amazing deals!
                  </span>
                }
              />
            </div>
          )}

          {/* Observer Element */}
          <div ref={observerRef} className="pp-observer" />

          {/* Loading More Products */}
          {loadingMore && (
            <div className="pp-grid" style={{ marginTop: '24px' }}>
              {Array.from({ length: 10 }).map((_, index) => (
                <SkeletonCard key={`loading-${index}`} />
              ))}
            </div>
          )}
        </div>

        {/* Product Detail Modal */}
        {selectedProductId && (
          <ProductDetailModal
            productID={selectedProductId}
            isModalVisible={isModalVisible}
            onClose={closeModal}
          />
        )}
      </div>
    </>
  );
};

export default ProductsPage;