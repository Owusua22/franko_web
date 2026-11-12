import React, { useEffect, useRef, useState } from "react";
import { Modal } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { fetchProductById } from "../Redux/Slice/productSlice";
import {
  CheckCircleIcon,
  ShoppingCartIcon,
  HeartIcon,
  ShareIcon,
  XMarkIcon,
  TruckIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import { Helmet } from "react-helmet";
// Import the actual hook, not the shopping-cart page or a separate ./Cart module.
import useAddToCart from "../Component/Cart";
import AuthModal from "../Component/AuthModal";

const formatPrice = (price) =>
  price?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const ProductDetailModal = ({ productID, isModalVisible, onClose }) => {
  const dispatch = useDispatch();
  const { addProductToCart, loading: cartLoading } = useAddToCart();
  const product = useSelector((state) => state.products.currentProduct?.[0]);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [addError, setAddError] = useState("");
  const [shareSuccess, setShareSuccess] = useState(false);
  const closeTimeoutRef = useRef(null);
  const modalSessionRef = useRef(0);

  useEffect(() => {
    modalSessionRef.current += 1;
    setAdding(false);
    setAddedSuccess(false);
    setAddError("");

    if (productID && isModalVisible) {
      dispatch(fetchProductById(productID));
    }

    return () => {
      // Do not let an old add request or success timer close a different product.
      modalSessionRef.current += 1;
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [dispatch, productID, isModalVisible]);

  const handleAddToCart = async () => {
    if (!product || adding || cartLoading || addedSuccess) return;
    if (Number(product.stock) === 0) {
      setAddError("This product is out of stock");
      return;
    }

    const id = product.productId ?? product.productID ?? product.ProductId ??
      product.ProductID ?? product.id ?? productID;
    const session = modalSessionRef.current;

    // Check if already in cart to prevent duplicate additions from non-cart pages
    const existingItem = cartItems?.find(
      (item) =>
        String(item.ProductId) === String(id)
    );

    if (existingItem) {
      setAddError("Item already in cart. Please update quantity from the Cart Page.");
      return;
    }

    setAddError("");
    setAdding(true);

    try {
      await addProductToCart({
        ...product,
        productID: id,
        productName: product.productName || product.ProductName || product.name || "",
        imagePath: product.imagePath || product.ImagePath ||
          product.productImage || product.ProductImage || "",
      });

      // The hook awaits the backend add and handles the cart refresh itself.
      // No local-storage polling or second getCartById request is needed here.
      if (modalSessionRef.current !== session) return;
      setAddedSuccess(true);
      closeTimeoutRef.current = setTimeout(() => {
        if (modalSessionRef.current !== session) return;
        setAddedSuccess(false);
        onClose?.();
      }, 1200);
    } catch (error) {
      if (modalSessionRef.current === session) {
        setAddError(error?.message || "Couldn't add this item to your cart. Please try again.");
      }
    } finally {
      if (modalSessionRef.current === session) setAdding(false);
    }
  };

  const handleShare = async () => {
    const productUrl = window.location.href;
    const shareData = {
      title: product.productName,
      text: `Check out this product: ${product.productName} - GH₵${formatPrice(product.price)}.00`,
      url: productUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (error) {
      console.error("Error sharing:", error);
      const shareText = `${product.productName} - GH₵${formatPrice(product.price)}.00\n${window.location.href}`;
      prompt("Copy this link to share:", shareText);
    }
  };

  if (!product) {
    return (
      <Modal
        open={isModalVisible}
        onCancel={onClose}
        footer={null}
        centered
        width="95%"
        style={{ maxWidth: "1100px" }}
        className="pdm-modal-wrap"
        closable={false}
      >
        <style>{modalStyles}</style>
        <div className="pdm-root">
          <div className="pdm-loading">
            {/* Franko Logo Animation / Skeleton Loader */}
            <div className="pdm-spinner" />
            <p className="pdm-loading-text">Loading product details from database...</p>
            {/* Optional skeleton lines for text */}
            <div style={{ width: '80%', height: '10px', background: '#eee', marginTop: '16px', borderRadius: '4px', animation: 'pdm-shimmer 1.5s infinite' }} />
            <div style={{ width: '60%', height: '10px', background: '#eee', marginTop: '8px', borderRadius: '4px', animation: 'pdm-shimmer 1.5s infinite' }} />
          </div>
        </div>
      </Modal>
    );
  }

  const imagePath = product.productImage || product.imagePath || product.ImagePath || product.ProductImage;
  const imageUrl = `https://testing.frankotrading.com/Media/Products_Images/${imagePath?.split("\\").pop()}`;
  const hasDiscount = product.oldPrice > 0 && product.oldPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;
  const soldOut = Number(product.stock) === 0;
  const busy = cartLoading || adding;

  return (
    <>
      <style>{modalStyles}</style>

      <Modal
        open={isModalVisible}
        onCancel={onClose}
        footer={null}
        centered
        width="95%"
        style={{ maxWidth: "1100px" }}
        bodyStyle={{
          padding: 0,
          maxHeight: "92vh",
          overflow: "hidden",
          borderRadius: "6px",
        }}
        className="pdm-modal-wrap"
        destroyOnClose
        closable={false}
      >
        <Helmet>
          <title>{product.productName} - GH₵{formatPrice(product.price)}</title>
          <meta
            name="description"
            content={`Buy ${product.productName} for GH₵${formatPrice(product.price)}.`}
          />
        </Helmet>

        <div className="pdm-root">
          <button onClick={onClose} className="pdm-close-btn" title="Close">
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>

          <div className="pdm-container">
            <div className="pdm-image-section">
              {hasDiscount && <span className="pdm-discount-badge">-{discountPercent}%</span>}

              <div className="pdm-image-actions">
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`pdm-icon-btn ${isFavorite ? "pdm-icon-btn-active" : ""}`}
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  {isFavorite ? (
                    <HeartSolidIcon style={{ width: 18, height: 18, color: "#e11d48" }} />
                  ) : (
                    <HeartIcon style={{ width: 18, height: 18 }} />
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className={`pdm-icon-btn ${shareSuccess ? "pdm-icon-btn-success" : ""}`}
                  title="Share product"
                >
                  {shareSuccess ? (
                    <CheckCircleIcon style={{ width: 18, height: 18, color: "#16a34a" }} />
                  ) : (
                    <ShareIcon style={{ width: 18, height: 18 }} />
                  )}
                </button>
              </div>

              <div className="pdm-image-wrapper">
                <img
                  src={imageUrl}
                  alt={product.productName}
                  className="pdm-product-image"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/400";
                  }}
                />
              </div>
            </div>

            <div className="pdm-details-section">
              <div className="pdm-details-scroll">
                <div className="pdm-details-inner">
                  <h1 className="pdm-product-name">{product.productName}</h1>

                  {product.brandName && (
                    <div className="pdm-brand">
                      <span className="pdm-brand-label">Brand:</span>
                      <span className="pdm-brand-value">{product.brandName}</span>
                    </div>
                  )}

                  <div className="pdm-price-block">
                    <div className="pdm-price-row">
                      <span className="pdm-price-current">GH₵{formatPrice(product.price)}.00</span>
                      {hasDiscount && (
                        <span className="pdm-price-old">GH₵{formatPrice(product.oldPrice)}.00</span>
                      )}
                    </div>
                    {hasDiscount && (
                      <div className="pdm-savings">
                        You save GH₵{formatPrice(product.oldPrice - product.price)}.00
                      </div>
                    )}
                  </div>

                  <div className="pdm-status-tags">
                    <div className="pdm-tag pdm-tag-green">
                      <CheckCircleIcon style={{ width: 14, height: 14 }} />
                      <span>In Stock</span>
                    </div>
                    <div className="pdm-tag pdm-tag-blue">
                      <TruckIcon style={{ width: 14, height: 14 }} />
                      <span>Fast Delivery</span>
                    </div>
                    <div className="pdm-tag pdm-tag-purple">
                      <ShieldCheckIcon style={{ width: 14, height: 14 }} />
                      <span>Warranty</span>
                    </div>
                  </div>

                  <div className="pdm-description-section">
                    <h3 className="pdm-section-title">Product Details</h3>
                    <div className="pdm-description-content">
                      {product.description || "No description available for this product."}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pdm-cart-bar">
                <div className="pdm-cart-bar-price">
                  <span className="pdm-cart-bar-total-label">Total</span>
                  <span className="pdm-cart-bar-total-value">GH₵{formatPrice(product.price)}.00</span>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={busy || addedSuccess || soldOut}
                  className={`pdm-cart-btn ${addedSuccess ? "pdm-cart-btn-success" : ""}`}
                >
                  {adding ? (
                    <>
                      <div className="pdm-btn-spinner" />
                      <span>Adding...</span>
                    </>
                  ) : addedSuccess ? (
                    <>
                      <CheckCircleIcon style={{ width: 20, height: 20 }} />
                      <span>Added!</span>
                    </>
                  ) : soldOut ? (
                    <span>Sold Out</span>
                  ) : (
                    <>
                      <ShoppingCartIcon style={{ width: 20, height: 20 }} />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>
                {addError && <div className="pdm-cart-error" role="alert">{addError}</div>}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

const modalStyles = `
  .pdm-modal-wrap .ant-modal-content {
    border-radius: 6px !important;
    overflow: hidden !important;
    padding: 0 !important;
    box-shadow: 0 25px 60px rgba(0,0,0,0.2) !important;
  }
  .pdm-modal-wrap .ant-modal-body { padding: 0 !important; }
  .pdm-modal-wrap .ant-modal-close { display: none !important; }

  .pdm-root, .pdm-root * {
    font-family: 'Plus Jakarta Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    box-sizing: border-box;
  }
  .pdm-root { position: relative; background: #fff; }

  /* ==================== CLOSE BUTTON ==================== */
  .pdm-close-btn {
    position: absolute; top: 12px; right: 12px; z-index: 20;
    width: 36px; height: 36px; border-radius: 50%;
    background: #fff; border: 1px solid #e0e0e0;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s; color: #555;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .pdm-close-btn:hover { background: #f5f5f5; border-color: #ccc; color: #1a1a1a; transform: scale(1.05); }

  /* ==================== LOADING ==================== */
  .pdm-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 24px; }
  .pdm-spinner {
    width: 40px; height: 40px; border: 3px solid #e0e0e0; border-top-color: #14532d;
    border-radius: 50%; animation: pdm-spin 0.8s linear infinite; margin-bottom: 16px;
  }
  @keyframes pdm-spin { to { transform: rotate(360deg); } }
  @keyframes pdm-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  .pdm-loading-text { font-size: 15px; font-weight: 500; color: #888; }

  /* ==================== CONTAINER ==================== */
  .pdm-container { display: flex; flex-direction: column; max-height: 92vh; }
  @media (min-width: 1024px) {
    .pdm-container { flex-direction: row; height: 85vh; max-height: 85vh; }
  }

  /* ==================== IMAGE SECTION ==================== */
  .pdm-image-section {
    position: relative; background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
    display: flex; align-items: center; justify-content: center;
    padding: 32px 24px; min-height: 280px;
  }
  @media (min-width: 1024px) {
    .pdm-image-section { width: 50%; min-height: unset; padding: 40px; }
  }
  .pdm-discount-badge {
    position: absolute; top: 16px; left: 16px; background: #dc2626; color: #fff;
    font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 100px;
    letter-spacing: 0.02em; z-index: 5;
  }
  .pdm-image-actions {
    position: absolute; top: 16px; right: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 5;
  }
  @media (min-width: 1024px) { .pdm-image-actions { top: 20px; right: 20px; } }
  .pdm-icon-btn {
    width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.9);
    backdrop-filter: blur(8px); border: 1px solid rgba(0,0,0,0.06);
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: all 0.2s; color: #555; box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }
  .pdm-icon-btn:hover { background: #fff; transform: scale(1.08); box-shadow: 0 4px 14px rgba(0,0,0,0.1); }
  .pdm-icon-btn-active { background: #fff0f3 !important; border-color: #fecdd3 !important; }
  .pdm-icon-btn-success { background: #f0fdf4 !important; border-color: #bbf7d0 !important; }
  .pdm-image-wrapper { display: flex; align-items: center; justify-content: center; width: 100%; max-width: 400px; }
  .pdm-product-image {
    width: 100%; height: auto; max-height: 260px; object-fit: contain;
    transition: transform 0.4s ease; filter: drop-shadow(0 8px 24px rgba(0,0,0,0.08));
  }
  .pdm-image-wrapper:hover .pdm-product-image { transform: scale(1.04); }
  @media (min-width: 1024px) { .pdm-product-image { max-height: 420px; } }

  /* ==================== DETAILS SECTION ==================== */
  .pdm-details-section { display: flex; flex-direction: column; position: relative; overflow: hidden; flex: 1; }
  @media (min-width: 1024px) { .pdm-details-section { width: 50%; } }
  .pdm-details-scroll { flex: 1; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
  .pdm-details-scroll::-webkit-scrollbar { width: 4px; }
  .pdm-details-scroll::-webkit-scrollbar-track { background: transparent; }
  .pdm-details-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
  .pdm-details-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
  .pdm-details-inner { padding: 24px 20px 120px 20px; }
  @media (min-width: 1024px) { .pdm-details-inner { padding: 32px 32px 130px 32px; } }

  /* ==================== PRODUCT NAME / BRAND ==================== */
  .pdm-product-name { font-size: 20px; font-weight: 800; color: #1a1a1a; line-height: 1.3; letter-spacing: -0.02em; margin: 0 0 8px 0; }
  @media (min-width: 1024px) { .pdm-product-name { font-size: 24px; } }
  .pdm-brand { display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
  .pdm-brand-label { font-size: 13px; font-weight: 500; color: #888; }
  .pdm-brand-value {
    font-size: 13px; font-weight: 700; color: #14532d; background: #f0fdf4;
    padding: 2px 10px; border-radius: 100px; border: 1px solid #bbf7d0;
  }

  /* ==================== PRICE BLOCK ==================== */
  .pdm-price-block {
    background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%);
    border: 1px solid #fecaca; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;
  }
  .pdm-price-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .pdm-price-current { font-size: 26px; font-weight: 900; color: #dc2626; letter-spacing: -0.02em; line-height: 1; }
  @media (min-width: 1024px) { .pdm-price-current { font-size: 30px; } }
  .pdm-price-old { font-size: 15px; font-weight: 400; color: #9ca3af; text-decoration: line-through; }
  .pdm-savings {
    margin-top: 6px; font-size: 12px; font-weight: 600; color: #16a34a; background: #dcfce7;
    display: inline-block; padding: 2px 8px; border-radius: 4px;
  }

  /* ==================== STATUS TAGS ==================== */
  .pdm-status-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
  .pdm-tag {
    display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px;
    border-radius: 100px; font-size: 12px; font-weight: 600; border: 1px solid;
  }
  .pdm-tag-green { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
  .pdm-tag-blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
  .pdm-tag-purple { background: #faf5ff; color: #7e22ce; border-color: #e9d5ff; }

  /* ==================== DESCRIPTION ==================== */
  .pdm-description-section { margin-bottom: 16px; }
  .pdm-section-title {
    font-size: 16px; font-weight: 800; color: #1a1a1a; margin: 0 0 10px 0;
    display: flex; align-items: center; gap: 8px; letter-spacing: -0.01em;
  }
  .pdm-section-title::before { content: ''; width: 3px; height: 16px; background: #14532d; border-radius: 2px; flex-shrink: 0; }
  .pdm-description-content {
    font-size: 14px; font-weight: 400; color: #555; line-height: 1.7; white-space: pre-line;
    background: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px; padding: 14px 16px;
  }
  @media (min-width: 1024px) { .pdm-description-content { font-size: 15px; } }

  /* ==================== STICKY CART BAR ==================== */
  .pdm-cart-bar {
    position: absolute; bottom: 0; left: 0; right: 0; background: #fff;
    border-top: 1px solid #e0e0e0; padding: 12px 20px;
    display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; z-index: 10;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
  }
  @media (min-width: 1024px) { .pdm-cart-bar { padding: 16px 32px; } }
  .pdm-cart-bar-price { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex-shrink: 0; }
  .pdm-cart-bar-total-label { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.04em; }
  .pdm-cart-bar-total-value { font-size: 20px; font-weight: 900; color: #1a1a1a; letter-spacing: -0.02em; line-height: 1.1; }
  @media (min-width: 1024px) { .pdm-cart-bar-total-value { font-size: 22px; } }
  .pdm-cart-btn {
    flex: 1; height: 48px; background: #14532d; color: #fff; border: none; border-radius: 6px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s;
    font-family: 'Plus Jakarta Sans', sans-serif; box-shadow: 0 2px 8px rgba(20, 83, 45, 0.2);
  }
  .pdm-cart-btn:hover:not(:disabled) { background: #166534; box-shadow: 0 4px 14px rgba(20, 83, 45, 0.3); transform: translateY(-1px); }
  .pdm-cart-btn:active:not(:disabled) { transform: translateY(0); }
  .pdm-cart-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
  .pdm-cart-btn-success { background: #16a34a !important; box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3) !important; }
  @media (min-width: 1024px) { .pdm-cart-btn { height: 52px; font-size: 16px; } }
  .pdm-cart-error { flex-basis: 100%; font-size: 12px; font-weight: 600; color: #b91c1c; }
  .pdm-btn-spinner {
    width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
    border-radius: 50%; animation: pdm-spin 0.7s linear infinite;
  }
`;

export default ProductDetailModal;
