import { appStorage as localStorage } from "../utils/secureLocalStorageInit";
import { getProductUrl } from "../utils/productSlug";
import { useEffect, useState } from "react";
import { message } from "antd";
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  IdentificationIcon,
  ShoppingBagIcon,
  HeartIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon,
  ChevronRightIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon as CheckCircleSolid,
  XCircleIcon as XCircleSolid,
  HeartIcon as HeartSolid,
  UserCircleIcon,
} from "@heroicons/react/24/solid";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  updateAccountStatus,
  logoutCustomer,
} from "../Redux/Slice/customerSlice";
import AuthModal from "../Component/AuthModal";

import { CMS_BASE_URL } from "../config/media";

const backendBaseURL = CMS_BASE_URL;

// ==================== CONFIRM DIALOG ====================
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  warning,
  details,
  confirmText,
  cancelText,
  variant = "danger",
  loading = false,
}) => {
  if (!open) return null;

  const variantStyles = {
    danger: {
      bar: "linear-gradient(90deg, #f87171, #ef4444)",
      iconBg: "#fef2f2",
      iconColor: "#ef4444",
      btnBg: "#dc2626",
      btnHover: "#b91c1c",
    },
    warning: {
      bar: "linear-gradient(90deg, #fbbf24, #f59e0b)",
      iconBg: "#fffbeb",
      iconColor: "#f59e0b",
      btnBg: "#d97706",
      btnHover: "#b45309",
    },
  };

  const vs = variantStyles[variant];

  return (
    <div className="ac-dialog-overlay">
      <div className="ac-dialog-backdrop" onClick={() => !loading && onClose()} />
      <div className="ac-dialog-card">
        <div className="ac-dialog-bar" style={{ background: vs.bar }} />
        <div className="ac-dialog-body">
          <div className="ac-dialog-icon" style={{ background: vs.iconBg }}>
            <ExclamationTriangleIcon style={{ width: 28, height: 28, color: vs.iconColor }} />
          </div>
          <div className="ac-dialog-title">{title}</div>
          <div className="ac-dialog-desc">{description}</div>
          {warning && <div className="ac-dialog-warning">{warning}</div>}
          {details && (
            <div className="ac-dialog-details">
              {details.map((d, i) => (
                <div key={i} className="ac-dialog-detail-item">
                  <span className="ac-dialog-detail-dot" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
          )}
          <div className="ac-dialog-actions">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="ac-dialog-btn-confirm"
              style={{ background: vs.btnBg }}
            >
              {loading ? (
                <>
                  <div className="ac-spinner-sm" />
                  Processing…
                </>
              ) : (
                confirmText || "Confirm"
              )}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="ac-dialog-btn-cancel"
            >
              {cancelText || "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
const Account = () => {
  const [customer, setCustomer] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [activeTab, setActiveTab] = useState("profile");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("customer");
      if (stored) {
        const parsed = typeof stored === "string" ? JSON.parse(stored) : stored;
        setCustomer(parsed);
      }
    } catch (e) {
      console.error("Failed to load customer:", e);
      setCustomer(null);
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wishlist");
      if (!stored) {
        setWishlist([]);
      } else if (typeof stored === "string") {
        setWishlist(JSON.parse(stored));
      } else {
        setWishlist(stored);
      }
    } catch (e) {
      console.error("Failed to load wishlist:", e);
      setWishlist([]);
    }
  }, []);

  const confirmLogout = () => {
    dispatch(logoutCustomer());
    localStorage.removeItem("wishlist");
    localStorage.removeItem("authToken");
    message.success("Logged out successfully.");
    setShowLogoutModal(false);
    navigate("/");
  };

  const confirmDeleteAccount = async () => {
    if (!customer?.customerAccountNumber) {
      message.error("No customer account found.");
      return;
    }
    try {
      setDeleting(true);
      await dispatch(
        updateAccountStatus({ accountNumber: customer.customerAccountNumber })
      ).unwrap();
      dispatch(logoutCustomer());
      localStorage.removeItem("wishlist");
      localStorage.removeItem("authToken");
      message.success("Account deleted successfully.");
      setShowDeleteModal(false);
      navigate("/");
    } catch (error) {
      console.error("Delete account error:", error);
      message.error(
        (typeof error === "string" && error) ||
          error?.message ||
          "Failed to delete account."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleOrderHistoryClick = () => {
    if (customer?.accountType === "agent" || customer?.isAgent) {
      navigate("/agent/dashboard");
    } else {
      navigate("/order-history");
    }
  };

  // Loading
  if (customerLoading) {
    return (
      <>
        <style>{accountStyles}</style>
        <div className="ac-root">
          <div className="ac-loading">
            <div className="ac-spinner" />
            <p className="ac-loading-text"></p>
          </div>
        </div>
      </>
    );
  }

  // Not signed in
  if (!customer) {
    return (
      <>
        <style>{accountStyles}</style>
        <div className="ac-root">
          <div className="ac-container">
            <div className="ac-page-header">
              <div className="ac-page-header-accent" />
              <div>
                <h1 className="ac-page-title">My Account</h1>
                <p className="ac-page-count">Manage your profile and preferences</p>
              </div>
              <div className="ac-page-header-line" />
            </div>
            <div className="ac-empty-state">
              <div className="ac-empty-icon-wrap">
                <UserIcon style={{ width: 30, height: 30, color: "#888" }} />
              </div>
              <div className="ac-empty-title">Sign In Required</div>
              <div className="ac-empty-desc">
                Please log in to view your account details and manage your profile.
              </div>
              <button
                className="ac-btn-outline"
                onClick={() => setShowAuthModal(true)}
              >
                Sign In
              </button>
            </div>
          </div>
          <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
      </>
    );
  }

  const {
    firstName,
    lastName,
    email,
    contactNumber,
    address,
    customerAccountNumber,
    isGuest,
    isAgent,
    accountType,
  } = customer;

  const isUserAgent = accountType === "agent" || isAgent;
  const initials = `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();

  const getAccountBadge = () => {
    if (isUserAgent) return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", text: "Agent" };
    if (isGuest) return { bg: "#fffbeb", color: "#d97706", border: "#fde68a", text: "Guest" };
    return { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", text: "Verified" };
  };

  const badge = getAccountBadge();

  const profileFields = [
    { icon: EnvelopeIcon, label: "Email Address", value: email || "Not provided", iconColor: "#14532d" },
    { icon: PhoneIcon, label: "Phone Number", value: contactNumber || "Not provided", iconColor: "#14532d" },
    { icon: MapPinIcon, label: "Address", value: address || "Not provided", iconColor: "#dc2626" },
    {
      icon: IdentificationIcon,
      label: "Account Type",
      value: isUserAgent ? "Agent Account" : isGuest ? "Guest Account" : "Registered Member",
      iconColor: "#2563eb",
    },
  ];

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    return `${backendBaseURL}/Media/Products_Images/${imagePath.split("\\").pop()}`;
  };

  return (
    <>
      <style>{accountStyles}</style>

      <div className="ac-root">
        <div className="ac-container">
          {/* Page Header */}
          <div className="ac-page-header">
            <div className="ac-page-header-accent" />
            <div>
              <h1 className="ac-page-title">My Account</h1>
              <p className="ac-page-subtitle">Manage your profile and preferences</p>
            </div>
            <div className="ac-page-header-line" />
          </div>

          {/* ══════ PROFILE CARD ══════ */}
          <div className="ac-profile-card">
            <div className="ac-profile-top">
              <div className="ac-avatar">
                <span className="ac-avatar-text">{initials}</span>
              </div>
              <div className="ac-profile-info">
                <div className="ac-profile-name-row">
                  <h2 className="ac-profile-name">{firstName} {lastName}</h2>
                  <span className="ac-badge" style={{ background: badge.bg, color: badge.color, borderColor: badge.border }}>
                    <ShieldCheckIcon style={{ width: 12, height: 12 }} />
                    {badge.text}
                  </span>
                </div>
                <p className="ac-profile-account">Account #{customerAccountNumber}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="ac-stats-row">
            {!isUserAgent && (
  <div
    className="ac-stat"
    onClick={handleOrderHistoryClick}
    style={{ cursor: "pointer" }}
  >
    <div className="ac-stat-icon ac-stat-icon-green">
      <ShoppingBagIcon style={{ width: 18, height: 18 }} />
    </div>
    <div className="ac-stat-info">
      <span className="ac-stat-label">Orders</span>
      <span className="ac-stat-value">View History</span>
    </div>
    <ChevronRightIcon style={{ width: 14, height: 14, color: "#ccc" }} />
  </div>
)}
              <div className="ac-stat" onClick={() => setActiveTab("wishlist")} style={{ cursor: "pointer" }}>
                <div className="ac-stat-icon ac-stat-icon-red">
                  <HeartIcon style={{ width: 18, height: 18 }} />
                </div>
                <div className="ac-stat-info">
                  <span className="ac-stat-label">Wishlist</span>
                  <span className="ac-stat-value">{wishlist.length} items</span>
                </div>
                <ChevronRightIcon style={{ width: 14, height: 14, color: "#ccc" }} />
              </div>
            </div>
          </div>

          {/* ══════ TAB NAVIGATION ══════ */}
          <div className="ac-tabs">
            {[
              { key: "profile", label: "Profile", icon: UserIcon },
              { key: "wishlist", label: "Wishlist", icon: HeartIcon },
              { key: "actions", label: "Settings", icon: IdentificationIcon },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`ac-tab ${activeTab === tab.key ? "ac-tab-active" : ""}`}
              >
                <tab.icon style={{ width: 16, height: 16 }} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ══════ TAB CONTENT ══════ */}

          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="ac-section">
              <div className="ac-section-header">
                <div className="ac-section-header-left">
                  <UserIcon style={{ width: 18, height: 18, color: "#14532d" }} />
                  <h3 className="ac-section-title">Personal Information</h3>
                </div>
              </div>
              <div className="ac-fields-grid">
                {profileFields.map((field, i) => (
                  <div key={i} className="ac-field-card">
                    <div className="ac-field-icon-wrap" style={{ color: field.iconColor }}>
                      <field.icon style={{ width: 18, height: 18 }} />
                    </div>
                    <div className="ac-field-content">
                      <span className="ac-field-label">{field.label}</span>
                      <span className="ac-field-value">{field.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WISHLIST TAB */}
          {activeTab === "wishlist" && (
            <div className="ac-section">
              <div className="ac-section-header">
                <div className="ac-section-header-left">
                  <HeartSolid style={{ width: 18, height: 18, color: "#dc2626" }} />
                  <h3 className="ac-section-title">My Wishlist</h3>
                </div>
                {wishlist.length > 0 && (
                  <span className="ac-section-count">{wishlist.length} item{wishlist.length !== 1 ? "s" : ""}</span>
                )}
              </div>

              {wishlist.length === 0 ? (
                <div className="ac-empty-state">
                  <div className="ac-empty-icon-wrap">
                    <HeartIcon style={{ width: 32, height: 32, color: "#ccc" }} />
                  </div>
                  <p className="ac-empty-title">Your wishlist is empty</p>
                  <p className="ac-empty-desc">Items you save will appear here</p>
                  <button onClick={() => navigate("/")} className="ac-btn-outline">
                    Browse Products
                  </button>
                </div>
              ) : (
                <div className="ac-wishlist-list">
                  {wishlist.map((item, index) => {
                    const imgUrl = getImageUrl(item.productImage);
                    return (
                      <div key={index} className="ac-wishlist-item" onClick={() => navigate(getProductUrl(item))}>
                        <div className="ac-wishlist-img-wrap">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={item.productName}
                              className="ac-wishlist-img"
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          ) : (
                            <ShoppingBagIcon style={{ width: 24, height: 24, color: "#ccc" }} />
                          )}
                        </div>
                        <div className="ac-wishlist-info">
                          <p className="ac-wishlist-name">{item.productName}</p>
                          <p className="ac-wishlist-meta">
                            {item.brandName || "N/A"} • {item.categoryName || "N/A"}
                          </p>
                          <p className="ac-wishlist-price">
                            GH₵{item.price?.toLocaleString() || "0.00"}
                          </p>
                        </div>
                        <ChevronRightIcon style={{ width: 16, height: 16, color: "#ccc", flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ACTIONS/SETTINGS TAB */}
          {activeTab === "actions" && (
            <div className="ac-section">
              <div className="ac-section-header">
                <div className="ac-section-header-left">
                  <IdentificationIcon style={{ width: 18, height: 18, color: "#14532d" }} />
                  <h3 className="ac-section-title">Account Settings</h3>
                </div>
              </div>

              <div className="ac-actions-list">
               {!isUserAgent && (
  <button className="ac-action-item" onClick={handleOrderHistoryClick}>
    <div className="ac-action-icon ac-action-icon-green">
      <ShoppingBagIcon style={{ width: 18, height: 18 }} />
    </div>

    <div className="ac-action-text">
      <span className="ac-action-label">Order History</span>
      <span className="ac-action-desc">View and track your orders</span>
    </div>

    <ChevronRightIcon
      style={{ width: 16, height: 16, color: "#ccc" }}
    />
  </button>
)}

                <button className="ac-action-item" onClick={() => setShowLogoutModal(true)}>
                  <div className="ac-action-icon ac-action-icon-amber">
                    <ArrowRightOnRectangleIcon style={{ width: 18, height: 18 }} />
                  </div>
                  <div className="ac-action-text">
                    <span className="ac-action-label">Sign Out</span>
                    <span className="ac-action-desc">Log out of your account</span>
                  </div>
                  <ChevronRightIcon style={{ width: 16, height: 16, color: "#ccc" }} />
                </button>

                <div className="ac-actions-divider" />

                <button className="ac-action-item ac-action-item-danger" onClick={() => setShowDeleteModal(true)}>
                  <div className="ac-action-icon ac-action-icon-red">
                    <TrashIcon style={{ width: 18, height: 18 }} />
                  </div>
                  <div className="ac-action-text">
                    <span className="ac-action-label ac-action-label-danger">Delete Account</span>
                    <span className="ac-action-desc">Permanently remove your account and data</span>
                  </div>
                  <ChevronRightIcon style={{ width: 16, height: 16, color: "#fca5a5" }} />
                </button>
              </div>

              {/* Help Card */}
              <div className="ac-help-card">
                <div className="ac-help-icon">
                  <QuestionMarkCircleIcon style={{ width: 20, height: 20, color: "#fff" }} />
                </div>
                <div className="ac-help-text">
                  <p className="ac-help-title">Need help?</p>
                  <p className="ac-help-desc">Our support team is available 24/7</p>
                </div>
                <button className="ac-help-btn" onClick={() => navigate("/contact")}>
                  Contact Us
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════ LOGOUT DIALOG ══════ */}
      <ConfirmDialog
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Sign out?"
        description="Are you sure you want to sign out of your account?"
        warning="You will need to sign in again to access your account."
        confirmText="Yes, Sign Out"
        cancelText="Stay Signed In"
        variant="warning"
      />

      {/* ══════ DELETE DIALOG ══════ */}
      <ConfirmDialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteAccount}
        title="Delete your account?"
        description="This action is permanent and cannot be undone."
        details={[
          "All your personal data will be removed",
          "Active orders will be cancelled",
          "Your purchase history will be deleted",
        ]}
        confirmText="Yes, Delete My Account"
        cancelText="Keep My Account"
        variant="danger"
        loading={deleting}
      />
    </>
  );
};

// ==================== STYLES ====================
const accountStyles = `
.ac-root, .ac-root * {
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    box-sizing: border-box;
  }

  .ac-root {
    min-height: 100vh;
    background: #fff;
  }

  .ac-container {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 16px 80px;
  }
  @media (min-width: 768px) {
    .ac-container { padding: 32px 24px 48px; }
  }

  /* ==================== LOADING ==================== */
  .ac-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
  }
  .ac-spinner {
    width: 36px; height: 36px;
    border: 3px solid #dcfce7;
    border-top-color: #16a34a;
    border-radius: 50%;
    animation: ac-spin 0.8s linear infinite;
  }
  @keyframes ac-spin { to { transform: rotate(360deg); } }
  .ac-spinner-sm {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: ac-spin 0.7s linear infinite;
  }
  .ac-loading-text {
    font-size: 15px; font-weight: 600; color: #888;
  }

  /* ==================== PAGE HEADER ==================== */
  .ac-page-header {
    display: flex; align-items: center; gap: 16px;
    margin-bottom: 24px; padding-bottom: 16px;
    border-bottom: 1px solid #e0e0e0;
  }
  .ac-page-header-accent {
    width: 4px; height: 28px; border-radius: 2px;
    background: #14532d; flex-shrink: 0;
  }
  .ac-page-title {
    font-size: 22px; font-weight: 800; color: #1a1a1a;
    letter-spacing: -0.02em; margin: 0; line-height: 1.2;
  }
  @media (min-width: 768px) { .ac-page-title { font-size: 26px; } }
  .ac-page-subtitle {
    font-size: 13px; font-weight: 500; color: #888; margin-top: 2px;
  }
  .ac-page-header-line {
    flex: 1; height: 1px; background: #e0e0e0; display: none;
  }
  @media (min-width: 768px) { .ac-page-header-line { display: block; } }

  /* ==================== PROFILE CARD ==================== */
  .ac-profile-card {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
  }
  .ac-profile-top {
    display: flex; align-items: center; gap: 16px;
    margin-bottom: 20px;
  }
  .ac-avatar {
    width: 56px; height: 56px; border-radius: 50%;
    background: linear-gradient(135deg, #14532d, #16a34a);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(20, 83, 45, 0.2);
  }
  @media (min-width: 768px) {
    .ac-avatar { width: 64px; height: 64px; }
  }
  .ac-avatar-text {
    font-size: 20px; font-weight: 800; color: #fff;
    letter-spacing: 0.02em;
  }
  @media (min-width: 768px) { .ac-avatar-text { font-size: 22px; } }

  .ac-profile-info { flex: 1; min-width: 0; }
  .ac-profile-name-row {
    display: flex; align-items: center; gap: 8px;
    flex-wrap: wrap; margin-bottom: 2px;
  }
  .ac-profile-name {
    font-size: 20px; font-weight: 800; color: #1a1a1a;
    letter-spacing: -0.02em; margin: 0;
  }
  @media (min-width: 768px) { .ac-profile-name { font-size: 22px; } }

  .ac-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 10px; border-radius: 100px;
    font-size: 11px; font-weight: 700;
    border: 1px solid;
    letter-spacing: 0.02em;
  }

  .ac-profile-account {
    font-size: 13px; font-weight: 500; color: #888; margin: 0;
  }

  /* Stats */
  .ac-stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .ac-stat {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px;
    background: #f7f7f7;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    transition: all 0.15s;
  }
  .ac-stat:hover {
    border-color: #d1d5db;
    background: #fafafa;
  }
  .ac-stat-icon {
    width: 36px; height: 36px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: #fff;
  }
  .ac-stat-icon-green { background: #14532d; }
  .ac-stat-icon-red { background: #dc2626; }
  .ac-stat-info { flex: 1; min-width: 0; }
  .ac-stat-label {
    display: block; font-size: 11px; font-weight: 600;
    color: #888; text-transform: uppercase; letter-spacing: 0.03em;
  }
  .ac-stat-value {
    display: block; font-size: 14px; font-weight: 800;
    color: #1a1a1a; margin-top: 1px;
  }

  /* ==================== TABS ==================== */
  .ac-tabs {
    display: flex; gap: 4px;
    padding: 4px;
    background: #f7f7f7;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    margin-bottom: 20px;
  }
  .ac-tab {
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    gap: 6px; padding: 10px 12px;
    border: none; border-radius: 4px;
    font-size: 13px; font-weight: 700;
    color: #888; background: transparent;
    cursor: pointer; transition: all 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
  }
  .ac-tab:hover { color: #555; background: rgba(255,255,255,0.6); }
  .ac-tab-active {
    color: #fff !important;
    background: #14532d !important;
    box-shadow: 0 1px 4px rgba(20, 83, 45, 0.2);
  }

  /* ==================== SECTIONS ==================== */
  .ac-section {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }
  .ac-section-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
  }
  .ac-section-header-left {
    display: flex; align-items: center; gap: 10px;
  }
  .ac-section-title {
    font-size: 16px; font-weight: 800; color: #1a1a1a;
    letter-spacing: -0.01em; margin: 0;
  }
  .ac-section-count {
    font-size: 12px; font-weight: 700; color: #888;
    background: #f7f7f7; padding: 3px 10px;
    border-radius: 100px; border: 1px solid #e0e0e0;
  }

  /* ==================== PROFILE FIELDS ==================== */
  .ac-fields-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
  }
  @media (min-width: 640px) {
    .ac-fields-grid { grid-template-columns: 1fr 1fr; }
  }
  .ac-field-card {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.1s;
  }
  .ac-field-card:hover { background: #fafafa; }
  @media (min-width: 640px) {
    .ac-field-card { border-right: 1px solid #f5f5f5; }
    .ac-field-card:nth-child(2n) { border-right: none; }
    .ac-field-card:nth-last-child(-n+2) { border-bottom: none; }
  }
  @media (max-width: 639px) {
    .ac-field-card:last-child { border-bottom: none; }
  }
  .ac-field-icon-wrap {
    width: 36px; height: 36px; border-radius: 8px;
    background: #f0fdf4; display: flex;
    align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ac-field-content { flex: 1; min-width: 0; }
  .ac-field-label {
    display: block; font-size: 11px; font-weight: 600;
    color: #888; text-transform: uppercase;
    letter-spacing: 0.04em; margin-bottom: 3px;
  }
  .ac-field-value {
    display: block; font-size: 15px; font-weight: 700;
    color: #1a1a1a; word-break: break-word;
  }

  /* ==================== WISHLIST ==================== */
  .ac-wishlist-list {
    padding: 4px 0;
  }
  .ac-wishlist-item {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 20px;
    border-bottom: 1px solid #f5f5f5;
    cursor: pointer;
    transition: background 0.12s;
  }
  .ac-wishlist-item:last-child { border-bottom: none; }
  .ac-wishlist-item:hover { background: #fafafa; }

  .ac-wishlist-img-wrap {
    width: 52px; height: 52px; border-radius: 6px;
    border: 1px solid #f0f0f0; background: #fafafa;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; flex-shrink: 0;
  }
  .ac-wishlist-img {
    width: 100%; height: 100%; object-fit: contain;
  }
  .ac-wishlist-info { flex: 1; min-width: 0; }
  .ac-wishlist-name {
    font-size: 14px; font-weight: 700; color: #1a1a1a;
    margin: 0 0 2px; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .ac-wishlist-meta {
    font-size: 12px; font-weight: 500; color: #888;
    margin: 0 0 3px;
  }
  .ac-wishlist-price {
    font-size: 14px; font-weight: 900; color: #dc2626;
    margin: 0;
  }

  /* ==================== EMPTY STATE ==================== */
  .ac-empty-state {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; padding: 48px 24px;
  }
  .ac-empty-icon-wrap {
    width: 64px; height: 64px; border-radius: 50%;
    background: #f7f7f7; border: 1px solid #e0e0e0;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 14px;
  }
  .ac-empty-title {
    font-size: 16px; font-weight: 800; color: #1a1a1a;
    margin-bottom: 4px;
  }
  .ac-empty-desc {
    font-size: 13px; color: #888; margin-bottom: 20px;
  }
  .ac-btn-outline {
    padding: 10px 24px; background: #fff; color: #14532d;
    border: 1px solid #14532d; border-radius: 4px;
    font-size: 13px; font-weight: 700; cursor: pointer;
    transition: all 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
  }
  .ac-btn-outline:hover {
    background: #f0fdf4;
  }

  /* ==================== ACTIONS LIST ==================== */
  .ac-actions-list {
    padding: 4px 0;
  }
  .ac-action-item {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 20px; width: 100%;
    border: none; background: transparent;
    cursor: pointer; transition: background 0.12s;
    text-align: left;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
  }
  .ac-action-item:hover { background: #fafafa; }
  .ac-action-item-danger:hover { background: #fef2f2; }

  .ac-action-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: #fff;
  }
  .ac-action-icon-green { background: #14532d; }
  .ac-action-icon-amber { background: #d97706; }
  .ac-action-icon-red { background: #dc2626; }

  .ac-action-text { flex: 1; min-width: 0; }
  .ac-action-label {
    display: block; font-size: 15px; font-weight: 700; color: #1a1a1a;
  }
  .ac-action-label-danger { color: #dc2626 !important; }
  .ac-action-desc {
    display: block; font-size: 12px; font-weight: 500; color: #888;
    margin-top: 1px;
  }
  .ac-actions-divider {
    height: 1px; background: #f0f0f0; margin: 4px 20px;
  }

  /* ==================== HELP CARD ==================== */
  .ac-help-card {
    display: flex; align-items: center; gap: 14px;
    margin: 20px;
    padding: 16px 18px;
    background: linear-gradient(135deg, #14532d, #166534);
    border-radius: 8px;
    color: #fff;
  }
  .ac-help-icon {
    width: 40px; height: 40px; border-radius: 10px;
    background: rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ac-help-text { flex: 1; min-width: 0; }
  .ac-help-title {
    font-size: 14px; font-weight: 800; color: #fff; margin: 0;
  }
  .ac-help-desc {
    font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.7);
    margin: 0;
  }
  .ac-help-btn {
    padding: 8px 16px; background: #fff; color: #14532d;
    border: none; border-radius: 4px;
    font-size: 12px; font-weight: 700; cursor: pointer;
    transition: all 0.15s; flex-shrink: 0;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
  }
  .ac-help-btn:hover { background: #f0fdf4; }

  /* ==================== CONFIRM DIALOG ==================== */
  .ac-dialog-overlay {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
  }
  .ac-dialog-backdrop {
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
  }
  .ac-dialog-card {
    position: relative; background: #fff;
    border-radius: 12px; width: 100%;
    max-width: 400px; overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: ac-dialog-pop 0.2s ease-out;
  }
  @keyframes ac-dialog-pop {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .ac-dialog-bar { height: 4px; width: 100%; }
  .ac-dialog-body { padding: 24px; }
  .ac-dialog-icon {
    width: 56px; height: 56px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
  }
  .ac-dialog-title {
    font-size: 18px; font-weight: 900; color: #1a1a1a;
    text-align: center; margin-bottom: 6px;
  }
  .ac-dialog-desc {
    font-size: 13px; color: #888; text-align: center;
    line-height: 1.5; margin-bottom: 12px;
  }
  .ac-dialog-warning {
    font-size: 12px; font-weight: 600; color: #d97706;
    text-align: center; padding: 8px 14px;
    background: #fffbeb; border: 1px solid #fde68a;
    border-radius: 4px; margin-bottom: 12px;
  }
  .ac-dialog-details {
    display: flex; flex-direction: column; gap: 6px;
    padding: 12px 14px; background: #fef2f2;
    border: 1px solid #fecaca; border-radius: 4px;
    margin-bottom: 16px;
  }
  .ac-dialog-detail-item {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; font-weight: 600; color: #991b1b;
  }
  .ac-dialog-detail-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: #ef4444; flex-shrink: 0;
  }
  .ac-dialog-actions {
    display: flex; flex-direction: column; gap: 8px;
  }
  .ac-dialog-btn-confirm {
    width: 100%; padding: 13px; color: #fff;
    border: none; border-radius: 6px;
    font-size: 14px; font-weight: 700;
    cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
  }
  .ac-dialog-btn-confirm:hover { filter: brightness(0.9); }
  .ac-dialog-btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
  .ac-dialog-btn-cancel {
    width: 100%; padding: 12px; background: #fff;
    color: #555; border: 1px solid #e0e0e0;
    border-radius: 6px; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif !important;
  }
  .ac-dialog-btn-cancel:hover { background: #f7f7f7; border-color: #ccc; }
  .ac-dialog-btn-cancel:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export default Account;