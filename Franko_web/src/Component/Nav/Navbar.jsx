import PendingPlaceholder from "../PendingPlaceholder";
import { appStorage as localStorage } from "../../utils/secureLocalStorageInit";
import { getBrandUrl, getProductUrl } from "../../utils/productSlug";
import { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import { SidePanel, Modal, OverlayStyles } from "./Overlays";
import {
  ShoppingBagIcon,
  UserCircleIcon,
  XMarkIcon,
  HomeIcon,
  DevicePhoneMobileIcon,
  Squares2X2Icon,
  ChevronRightIcon,
  ChevronDownIcon,
  TagIcon,
  PhoneArrowDownLeftIcon,
  TruckIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import {
  Heart,
  User,
  Store,
  Headphones,
  Radio,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";

import AnnouncementBar from "./AnnouncentBar";
import logo from "../../assets/frankoIcon-128.webp";

import { fetchCategories } from "../../Redux/Slice/categorySlice";
import { fetchBrands } from "../../Redux/Slice/brandSlice";
import { fetchProducts } from "../../Redux/Slice/productSlice";
import { getCartById } from "../../Redux/Slice/cartSlice";
import {
  logoutCustomer,
  syncWithStorage,
  validateSession,
} from "../../Redux/Slice/customerSlice";

const AuthModal = lazy(() => import("../AuthModal"));

const EMPTY_LIST = [];

const backendBaseURL = "https://ct002.frankotrading.com:444";

const Nav = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const [isRadioOpen, setIsRadioOpen] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState("categories");
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMobileProfileDropdown, setShowMobileProfileDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const searchRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const mobileProfileDropdownRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const totalItems = useSelector((s) => s.cart.totalItems);
  const categories = useSelector((s) => Array.isArray(s.categories?.categories) ? s.categories.categories : EMPTY_LIST);
  const brands = useSelector((s) => Array.isArray(s.brands?.brands) ? s.brands.brands : EMPTY_LIST);
  const { loading } = useSelector((s) => s.products);
  const products = useSelector((s) => Array.isArray(s.products?.products) ? s.products.products : EMPTY_LIST);
  const { currentCustomer, isAuthenticated } = useSelector((s) => s.customer);

  /* ── Toggle helpers ── */
  const toggleDrawer = () => {
    setOpenDrawer((p) => {
      if (!p) setActiveSidebar("categories");
      return !p;
    });
  };
  const toggleRadio = () => setIsRadioOpen((p) => !p);
  const openMobileSearch = () => {
    setMobileSearchOpen(true);
    setTimeout(() => mobileSearchInputRef.current?.focus(), 80);
  };
  const closeMobileSearch = () => {
    setMobileSearchOpen(false);
    setInputValue("");
    setSearchQuery("");
    setShowSearchResults(false);
  };
  const closeDrawerAndNavigate = (path) => {
    setOpenDrawer(false);
    navigate(path);
  };
  const isActive = (path) => location.pathname === path;

  const getWishlistCount = () => {
    try {
      const stored = localStorage.getItem("wishlist");
      if (!stored) return 0;
      const w = typeof stored === "string" ? JSON.parse(stored) : stored;
      return Array.isArray(w) ? w.length : 0;
    } catch { return 0; }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ── Handlers ── */
  const handleWishlistClick = () => navigate("/wishlist");
  const handleMyOrdersClick = () => navigate("/order-history");
  const closeDrawerAndNavigateToOrders = () => {
    setOpenDrawer(false);
    handleMyOrdersClick();
  };

  const handleLogout = () => {
    dispatch(logoutCustomer());
    localStorage.removeItem("cartId");
    setShowLogoutModal(false);
    setShowProfileDropdown(false);
    setShowMobileProfileDropdown(false);
    navigate("/");
  };

  const handleProfileClick = () => {
    setShowProfileDropdown(false);
    setShowMobileProfileDropdown(false);
    navigate("/account");
  };

  const handleAccountClick = () => {
    if (!isAuthenticated || !currentCustomer) {
      setShowAuthModal(true);
    } else {
      setShowProfileDropdown((p) => !p);
    }
  };

  const handleMobileAccountClick = () => {
    if (!isAuthenticated || !currentCustomer) {
      setShowAuthModal(true);
    } else {
      setShowMobileProfileDropdown((p) => !p);
    }
  };

  /* ── Data fetching ── */
  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchBrands());
    // NOTE: the full catalogue (`/Product/Product-Get`, ~1.4 MB of JSON) used
    // to be fetched on every single page load just so the search box had
    // something to filter. It is now requested at the moment the visitor shows
    // intent to search (focus / first keystroke) - see `ensureProducts`.
  }, [dispatch]);

  // `products` may already hold a short page of products (New Arrivals asks
  // for 10), so it cannot be used as "the catalogue is loaded" signal.
  const catalogueRequested = useRef(false);
  const ensureProducts = useCallback(() => {
    if (catalogueRequested.current) return;
    catalogueRequested.current = true;
    dispatch(fetchProducts());
  }, [dispatch]);

  /* ✅ Auth sync on mount — validates and cleans up */
  useEffect(() => {
    dispatch(syncWithStorage());
  }, [dispatch]);

  /* ✅ Session validation — verifies token with server on mount */
  useEffect(() => {
    if (isAuthenticated && currentCustomer?.contactNumber) {
      dispatch(validateSession());
    }
  }, []); // Only on mount - intentional sparse deps

  /* ✅ Force cleanup — if isAuthenticated is false, wipe localStorage */
  useEffect(() => {
    if (!isAuthenticated) {
      try {
        localStorage.removeItem("customer");
        localStorage.removeItem("user");
        localStorage.removeItem("loginTime");
        localStorage.removeItem("lastActivityTimestamp");
      } catch {
        // Ignore storage errors
      }
    }
  }, [isAuthenticated]);

  /* ── Load cart only when authenticated ── */
  useEffect(() => {
    if (isAuthenticated && currentCustomer?.customerAccountNumber) {
      const cartId = localStorage.getItem("cartId");
      if (cartId) dispatch(getCartById());
    }
  }, [isAuthenticated, currentCustomer, dispatch]);

  /* ── Wishlist count ── */
  useEffect(() => {
    setWishlistCount(getWishlistCount());
    const onStorage = (e) => {
      if (e.key === "wishlist") setWishlistCount(getWishlistCount());
    };
    const onWishlist = () => setWishlistCount(getWishlistCount());
    window.addEventListener("storage", onStorage);
    window.addEventListener("wishlistUpdated", onWishlist);
    const iv = setInterval(() => {
      const c = getWishlistCount();
      setWishlistCount((p) => (p !== c ? c : p));
    }, 1000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("wishlistUpdated", onWishlist);
      clearInterval(iv);
    };
  }, []);

  /* ── Search ── */
  useEffect(() => {
    debounceRef.current = debounce((v) => setSearchQuery(v), 300);
    return () => debounceRef.current?.cancel();
  }, []);
  useEffect(() => { setShowSearchResults(!!searchQuery.trim()); }, [searchQuery]);

  const handleSearchChange = (e) => {
    ensureProducts();
    setInputValue(e.target.value);
    debounceRef.current(e.target.value);
  };
  const handleProductClick = (product) => {
    setShowSearchResults(false);
    setInputValue("");
    setSearchQuery("");
    setMobileSearchOpen(false);
    navigate(getProductUrl(product));
  };
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    ensureProducts();
    if (inputValue.trim()) setShowSearchResults(true);
  };

  /* ── Click-outside handlers ── */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        if (e.target !== document.documentElement && e.target !== document.body)
          setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        setHoveredCategory(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    const handler = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target))
        setShowProfileDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    const handler = (e) => {
      if (mobileProfileDropdownRef.current && !mobileProfileDropdownRef.current.contains(e.target))
        setShowMobileProfileDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    closeMobileSearch();
    setShowMobileProfileDropdown(false);
  }, [location.pathname]);

  /* ── Helpers ── */
  const formatPrice = (p) => `₵${p?.toLocaleString?.() || "N/A"}`;
  const highlightText = (text = "") => {
    if (!searchQuery) return text;
    const r = new RegExp(`(${searchQuery})`, "gi");
    return text.replace(r, '<mark style="background:#fef9c3;color:#92400e;padding:0 1px;border-radius:1px;">$1</mark>');
  };
  const getImageURL = (img) => {
    if (!img) return null;
    return `${backendBaseURL}/Media/Products_Images/${img.split("\\").pop()}`;
  };

  const filteredProducts = searchQuery
    ? products.filter((p) => p.productName?.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  const filteredCategories = categories.filter(
    (c) => c.stockStatus !== "Products out of stock" && c.categoryName !== "Products out of stock"
  );

  /* ✅ Derived flag — single source of truth for "show user info" */
  const showUser = isAuthenticated && currentCustomer;

  /* ── Search Results ── */
  const SearchResults = ({ maxH = 360, mobile = false }) => (
    <div className="nr" style={{ maxHeight: maxH }} onMouseDown={(e) => e.stopPropagation()}>
      {loading ? (
        <div style={{ padding: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 p-2 animate-pulse">
              <div style={{ width: mobile ? 36 : 40, height: mobile ? 36 : 40, borderRadius: 4, background: "#f0f0f0" }} />
              <div className="flex-1">
                <div style={{ height: 10, borderRadius: 2, background: "#f0f0f0", width: "70%", marginBottom: 5 }} />
                <div style={{ height: 8, borderRadius: 2, background: "#f0f0f0", width: "35%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : inputValue.trim() === "" ? (
        <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: "#aaa" }}>Type to search…</div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: "#aaa" }}>
          No results for &ldquo;{inputValue}&rdquo;
        </div>
      ) : (
        <>
          <div style={{ padding: "6px 12px", borderBottom: "1px solid #f0f0f0", fontSize: 11, fontWeight: 600, color: "#aaa", background: "#fafafa" }}>
            {filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""}
          </div>
          {filteredProducts.map((product) => {
            const imgURL = getImageURL(product.productImage);
            const sz = mobile ? 36 : 40;
            return (
              <div key={product.productID} onClick={() => handleProductClick(product)} className="nr-item" style={mobile ? { padding: "7px 10px" } : undefined}>
                {imgURL ? (
                  <img src={imgURL} alt={product.productName} width={sz} height={sz} loading="lazy" decoding="async" style={{ width: sz, height: sz, objectFit: "cover", borderRadius: 4, border: "1px solid #eee", background: "#f9f9f9" }} onError={(e) => (e.target.style.display = "none")} />
                ) : (
                  <div style={{ width: sz, height: sz, borderRadius: 4, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#ccc", flexShrink: 0 }}>—</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dangerouslySetInnerHTML={{ __html: highlightText(product.productName || "") }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nav-green)", marginTop: 1 }}>{formatPrice(product.price)}</div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );

  return (
    <>
      <style>{`
      :root {
          --nav-font: 'Plus Jakarta Sans', sans-serif;
          --nav-dark: #1a1a1a; --nav-mid: #555; --nav-light: #888;
          --nav-border: #e0e0e0; --nav-bg-subtle: #f7f7f7;
          --nav-green: #14532d; --nav-green-mid: #166534;
          --nav-green-light: #dcfce7; --nav-green-accent: #22c55e;
          --nav-pink: #e11d48; --nav-radius: 4px; --nav-radius-sm: 4px;
        }
        .nav-classic, .nav-classic *, .drawer-classic, .drawer-classic * {
          font-family: var(--nav-font); -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale; box-sizing: border-box;
        }
        .nav-bar { background: #fff; border-bottom: 1px solid var(--nav-border); }
        .nav-inner { max-width: 1750px; margin: auto; }
        @media (min-width: 1024px) { .nav-inner { padding: 4px 8px; } }
        .nav-row { display: flex; align-items: center; justify-content: space-between; height: 50px; }
        @media (max-width: 1023px) { .nav-row { height: 48px; gap: 6px; } }
        .nav-logo-container { flex-shrink: 0; cursor: pointer; }
        @media (max-width: 1023px) { .nav-logo-container { flex: 1; } }
        .nl { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; color: var(--nav-mid); padding: 5px 8px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; border: none; background: none; border-radius: var(--nav-radius-sm); transition: all 0.15s; white-space: nowrap; }
        .nl:hover { color: var(--nav-dark); background: var(--nav-bg-subtle); }
        .nl-active { color: var(--nav-green) !important; font-weight: 600; background: var(--nav-green-light) !important; }
        .ns-wrap { position: relative; flex: 1; max-width: 768px; }
        .ns { width: 100%; display: flex; align-items: center; border: 1px solid var(--nav-border); border-radius: var(--nav-radius); background: #fff; height: 38px; overflow: hidden; transition: all 0.2s; }
        .ns:focus-within { border-color: var(--nav-green-accent); box-shadow: 0 0 0 2px rgba(34,197,94,0.12); }
        .ns input { flex: 1; border: none; outline: none; padding: 0 12px; font-size: 13.5px; font-weight: 450; color: var(--nav-dark); background: transparent; height: 100%; font-family: var(--nav-font); }
        .ns input::placeholder { color: #b0b0b0; }
        .ns-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 100%; border: none; border-left: 1px solid var(--nav-border); background: var(--nav-bg-subtle); color: var(--nav-mid); cursor: pointer; transition: background 0.15s, color 0.15s; }
        .ns-btn:hover { background: var(--nav-green); color: #fff; }
        .nc-btn { display: flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px; font-size: 13px; font-weight: 600; color: #fff; background: var(--nav-green); border: none; border-radius: var(--nav-radius); cursor: pointer; transition: background 0.15s; white-space: nowrap; font-family: var(--nav-font); }
        .nc-btn:hover { background: var(--nav-green-mid); }
        .nc-drop { position: absolute; top: calc(100% + 4px); left: 0; display: flex; background: #fff; border: 1px solid var(--nav-border); border-radius: var(--nav-radius); box-shadow: 0 8px 30px rgba(0,0,0,0.08); z-index: 50; animation: n-fade 0.15s ease; }
        @keyframes n-fade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .nc-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; font-size: 13px; font-weight: 500; color: var(--nav-mid); cursor: pointer; transition: all 0.12s; border-radius: var(--nav-radius-sm); margin: 2px 4px; }
        .nc-item:hover, .nc-item-on { background: var(--nav-green-light); color: var(--nav-green); }
        .nb-item { padding: 7px 12px; font-size: 13px; font-weight: 500; color: var(--nav-mid); cursor: pointer; transition: all 0.12s; border-radius: var(--nav-radius-sm); margin: 2px 4px; }
        .nb-item:hover { background: var(--nav-bg-subtle); color: var(--nav-dark); }
        .ni { position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: none; background: none; cursor: pointer; border-radius: var(--nav-radius-sm); transition: background 0.15s; }
        .ni:hover { background: var(--nav-bg-subtle); }
        .ni:active { transform: scale(0.95); }
        .ni-badge { position: absolute; top: -1px; right: -1px; min-width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; border-radius: 100px; padding: 0 4px; border: 2px solid #fff; line-height: 1; font-family: var(--nav-font); }
        .ni-badge-g { background: var(--nav-green); color: #fff; }
        .ni-badge-p { background: var(--nav-pink); color: #fff; }
        .n-action { display: flex; align-items: center; gap: 15px; height: 32px; padding: 0 12px; font-size: 12px; font-weight: 600; border: none; border-radius: var(--nav-radius-sm); cursor: pointer; transition: opacity 0.15s; white-space: nowrap; font-family: var(--nav-font); }
        .n-action:hover { opacity: 0.88; }
        .n-action-green { background: var(--nav-green); color: #fff; }
        .n-action-radio { background: #dc2626; color: #fff; }
        .n-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; background: linear-gradient(135deg, var(--nav-green) 0%, var(--nav-green-mid) 100%); cursor: pointer; transition: all 0.15s; margin-left: 12px; border: none; font-family: var(--nav-font); box-shadow: 0 2px 8px rgba(5,150,105,0.3); }
        .n-avatar:hover { transform: scale(1.05); }
        .n-avatar-sm { width: 28px; height: 28px; font-size: 12px; }
        .n-profile-drop { position: absolute; top: calc(100% + 6px); right: 0; min-width: 180px; background: #fff; border: 1px solid var(--nav-border); border-radius: var(--nav-radius); box-shadow: 0 10px 40px rgba(0,0,0,0.12); z-index: 50; animation: n-fade 0.18s ease; overflow: hidden; padding: 4px; }
        .n-profile-header { padding: 12px 14px; border-bottom: 1px solid #eee; background: var(--nav-bg-subtle); }
        .n-profile-name { font-size: 14px; font-weight: 700; color: var(--nav-dark); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .n-profile-email { font-size: 12px; color: var(--nav-light); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .n-profile-item { display: flex; align-items: center; gap: 8px; padding: 9px 12px; font-size: 13px; font-weight: 500; color: var(--nav-mid); cursor: pointer; transition: all 0.1s; border: none; background: none; width: 100%; text-align: left; border-radius: var(--nav-radius-sm); }
        .n-profile-item:hover { background: var(--nav-bg-subtle); color: var(--nav-dark); }
        .n-profile-sep { height: 1px; background: var(--nav-border); margin: 4px 0; }
        .n-sep { width: 1px; height: 22px; background: var(--nav-border); flex-shrink: 0; }
        .nr { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1px solid var(--nav-border); border-radius: var(--nav-radius); box-shadow: 0 8px 30px rgba(0,0,0,0.08); z-index: 50; max-height: 360px; overflow-y: auto; animation: n-fade 0.12s ease; }
        .nr::-webkit-scrollbar { width: 4px; }
        .nr::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
        .nr-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; cursor: pointer; border-bottom: 1px solid #f5f5f5; transition: background 0.12s; }
        .nr-item:last-child { border-bottom: none; }
        .nr-item:hover { background: #fafafa; }
        .n-ham { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: 1px solid var(--nav-border); border-radius: var(--nav-radius-sm); background: #fff; cursor: pointer; transition: all 0.15s; }
        .n-ham:hover { background: var(--nav-bg-subtle); }
        .n-ham:active { background: #e5e5e5; transform: scale(0.96); }
        .ms-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 100; display: flex; flex-direction: column; animation: ms-in 0.2s ease; }
        @keyframes ms-in { from { opacity: 0; } to { opacity: 1; } }
        .ms-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.4); }
        .ms-panel { position: relative; background: #fff; z-index: 1; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .ms-header { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #eee; }
        .ms-back { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: none; background: none; cursor: pointer; border-radius: var(--nav-radius-sm); flex-shrink: 0; transition: background 0.12s; }
        .ms-back:active { background: #f0f0f0; }
        .ms-input-wrap { flex: 1; display: flex; align-items: center; border: 1px solid var(--nav-border); border-radius: var(--nav-radius); background: #fff; height: 38px; padding: 0 10px; transition: border-color 0.2s; }
        .ms-input-wrap:focus-within { border-color: var(--nav-green-accent); }
        .ms-input-wrap input { flex: 1; border: none; outline: none; font-size: 15px; font-weight: 450; color: var(--nav-dark); background: transparent; margin-left: 8px; font-family: var(--nav-font); }
        .ms-input-wrap input::placeholder { color: #b0b0b0; }
        .ms-clear { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: none; background: #e5e7eb; border-radius: 50%; cursor: pointer; flex-shrink: 0; transition: background 0.12s; }
        .ms-clear:active { background: #d1d5db; }
        .ms-results { flex: 1; overflow-y: auto; background: #fff; }
        .ms-results .nr { position: static; border: none; border-radius: 0; box-shadow: none; max-height: none; animation: none; }
        .d-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #eee; }
        .d-close { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 1px solid #eee; border-radius: var(--nav-radius-sm); background: #fff; cursor: pointer; transition: background 0.12s; }
        .d-close:active { background: #f5f5f5; }
        .d-tabs { display: flex; border-bottom: 1px solid #eee; background: #fafafa; }
        .d-tab { flex: 1; text-align: center; padding: 12px 0; font-size: 11px; font-weight: 700; color: var(--nav-light); border: none; background: none; cursor: pointer; position: relative; transition: color 0.2s; font-family: var(--nav-font); letter-spacing: 0.5px; text-transform: uppercase; }
        .d-tab::after { content: ''; position: absolute; bottom: -1px; left: 20%; width: 60%; height: 2px; background: var(--nav-green); transform: scaleX(0); transition: transform 0.2s ease; }
        .d-tab-on { color: var(--nav-green); }
        .d-tab-on::after { transform: scaleX(1); }
        .d-body { flex: 1; overflow-y: auto; padding: 8px 0; }
        .d-body::-webkit-scrollbar { width: 3px; }
        .d-body::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 2px; }
        .d-label { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--nav-light); padding: 12px 14px 6px; }
        .d-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; font-size: 14px; font-weight: 500; color: var(--nav-mid); cursor: pointer; transition: all 0.1s; border-left: 3px solid transparent; }
        .d-item:active { background: #f5f5f5; }
        .d-item-on { background: var(--nav-green-light) !important; color: var(--nav-green) !important; font-weight: 600 !important; border-left-color: var(--nav-green) !important; }
        .d-cat { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; font-size: 14px; font-weight: 500; color: var(--nav-mid); cursor: pointer; transition: all 0.1s; border-left: 3px solid transparent; }
        .d-cat:active { background: #f5f5f5; }
        .d-cat-on { background: var(--nav-green-light); color: var(--nav-green); font-weight: 600; border-left-color: var(--nav-green); }
        .d-brands { border-left: 2px solid #e5e5e5; margin: 2px 0 6px 28px; animation: n-fade 0.15s ease; }
        .d-brand { padding: 8px 14px; font-size: 13px; font-weight: 450; color: var(--nav-mid); cursor: pointer; transition: all 0.1s; display: flex; align-items: center; justify-content: space-between; }
        .d-brand:active { background: #f5f5f5; color: var(--nav-dark); }
        .d-user { margin: 8px 14px; padding: 12px; border: 1px solid #eee; border-radius: var(--nav-radius); display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); }
        .d-welcome { margin: 8px 14px; padding: 14px; border: 1px solid #eee; border-radius: var(--nav-radius); background: #fafafa; }
        .d-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; line-height: 1.3; font-family: var(--nav-font); }
        .d-radio { margin: 8px 14px; padding: 12px 14px; border: 1px solid #eee; border-radius: var(--nav-radius); display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.15s; background: linear-gradient(135deg, #fef2f2 0%, #fff 100%); }
        .d-radio:active { background: #fef2f2; border-color: #fca5a5; }
        .d-sep { height: 1px; background: #eee; margin: 6px 14px; }
        .d-user-actions { margin: 8px 14px; display: flex; gap: 8px; }
        .d-user-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 12px; font-size: 12px; font-weight: 600; border: 1.5px solid var(--nav-border); border-radius: var(--nav-radius-sm); background: #fff; cursor: pointer; transition: all 0.15s; font-family: var(--nav-font); }
        .d-user-btn:active { transform: scale(0.98); }
        .d-user-btn-danger { color: #dc2626; border-color: #fecaca; }
        .d-user-btn-danger:hover { background: #fef2f2; }
        .logout-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fade-in 0.2s ease; padding: 16px; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .logout-modal { background: #fff; border-radius: var(--nav-radius); max-width: 360px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: modal-in 0.2s ease; }
        @keyframes modal-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .logout-modal-header { padding: 16px 20px; border-bottom: 1px solid #eee; }
        .logout-modal-title { font-size: 16px; font-weight: 700; color: var(--nav-dark); margin: 0; font-family: var(--nav-font); }
        .logout-modal-body { padding: 20px; font-size: 14px; color: var(--nav-mid); line-height: 1.5; font-family: var(--nav-font); }
        .logout-modal-footer { padding: 12px 20px 16px; display: flex; gap: 8px; justify-content: flex-end; }
        .logout-btn { padding: 9px 18px; border-radius: var(--nav-radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: none; font-family: var(--nav-font); }
        .logout-btn-cancel { background: #f3f4f6; color: var(--nav-mid); }
        .logout-btn-cancel:hover { background: #e5e7eb; }
        .logout-btn-confirm { background: #dc2626; color: #fff; }
        .logout-btn-confirm:hover { background: #b91c1c; }
        .logout-btn:active { transform: scale(0.97); }
      `}</style>

      <div className="sticky top-0 z-50">
        <AnnouncementBar />
        <div className="nav-classic nav-bar">
          <div className="nav-inner">
            <div className="nav-row">

              {/* Mobile: Logo on LEFT */}
              <div className="nav-logo-container lg:hidden ml-2" onClick={() => navigate("/")}>
                <img src={logo} alt="Franko Trading" width={40} height={28} style={{ height: 28, width: "auto" }} />
              </div>

              {/* Desktop */}
              <div className="hidden lg:flex items-center justify-between w-full" style={{ gap: 16 }}>
                <div className="nav-logo-container" onClick={() => navigate("/")}>
                  <img src={logo} alt="Franko Trading" width={58} height={40} style={{ height: 40, width: "auto" }} />
                </div>

                {/* Search Section */}
                <div className="flex-1" style={{ maxWidth: 768 }}>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <div className="relative" ref={dropdownRef}>
                      <button onClick={() => setShowDropdown((p) => !p)} className="nc-btn" style={{ borderRadius: `var(--nav-radius) 0 0 var(--nav-radius)` }}>
                        <Squares2X2Icon style={{ width: 15, height: 15 }} />
                        Categories
                        <ChevronDownIcon style={{ width: 12, height: 12, transition: "transform 0.2s", transform: showDropdown ? "rotate(180deg)" : "none" }} />
                      </button>
                      {showDropdown && (
                        <div className="nc-drop">
                          <div style={{ width: 220, maxHeight: 380, overflowY: "auto", padding: 4, borderRight: "1px solid #eee" }}>
                            {filteredCategories.map((cat) => (
                              <div key={cat.categoryId} className={`nc-item ${hoveredCategory === cat.categoryId ? "nc-item-on" : ""}`} onMouseEnter={() => setHoveredCategory(cat.categoryId)}>
                                <span>{cat.categoryName}</span>
                                <ChevronRightIcon style={{ width: 12, height: 12, opacity: 0.4 }} />
                              </div>
                            ))}
                          </div>
                          {hoveredCategory && (
                            <div style={{ width: 200, maxHeight: 380, overflowY: "auto", padding: 4, background: "#fafafa" }}>
                              <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#aaa" }}>Brands</div>
                              {brands.filter((b) => b.categoryId === hoveredCategory).map((brand) => (
                                <div key={brand.brandId} className="nb-item" onClick={() => { navigate(getBrandUrl(brand)); setShowDropdown(false); setHoveredCategory(null); }}>
                                  {brand.brandName}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="ns-wrap" ref={searchRef}>
                      <form onSubmit={handleSearchSubmit} className="ns" style={{ borderRadius: `0 var(--nav-radius) var(--nav-radius) 0`, borderLeft: "none" }}>
                        <input type="search" value={inputValue} onChange={handleSearchChange} onFocus={ensureProducts} placeholder="Search products..." aria-label="Search products" />
                        <button type="submit" className="ns-btn" aria-label="Search products"><MagnifyingGlassIcon aria-hidden="true" style={{ width: 16, height: 16 }} /></button>
                      </form>
                      {showSearchResults && <SearchResults />}
                    </div>
                  </div>
                </div>

                {/* Right Navigation Links */}
                <div className="flex items-center" style={{ gap: 2 }}>
                  <button onClick={() => navigate("/")} className={`nl ${isActive("/") ? "nl-active" : ""}`}>Home</button>
                  <button onClick={() => navigate("/about")} className={`nl ${isActive("/about") ? "nl-active" : ""}`}>About</button>

                  {/* ✅ Auth-gated */}
                  {showUser && (
                    <button onClick={handleMyOrdersClick} className={`nl ${isActive("/order-history") ? "nl-active" : ""}`}>Orders</button>
                  )}

                  <button onClick={() => navigate("/shops")} className={`nl ${isActive("/shops") ? "nl-active" : ""}`}>Shops</button>
                  <button onClick={toggleRadio} className="n-action n-action-radio mr-5"><Radio style={{ width: 13, height: 13 }} /> Live</button>

                  {/* ✅ Auth-gated: avatar or sign-up */}
                  {showUser ? (
                    <div className="relative" ref={profileDropdownRef}>
                      <button onClick={handleAccountClick} className="n-avatar" title={`${currentCustomer.firstName || ""} ${currentCustomer.lastName || ""}`.trim()}>
                        {currentCustomer.firstName?.[0]?.toUpperCase() || "U"}
                      </button>
                      {showProfileDropdown && (
                        <div className="n-profile-drop">
                          <div className="n-profile-header">
                            <div className="n-profile-name">{currentCustomer.firstName || ""} {currentCustomer.lastName || ""}</div>
                            <div className="n-profile-email">{currentCustomer.email || currentCustomer.accountType || "Customer"}</div>
                          </div>
                          <button onClick={handleProfileClick} className="n-profile-item">
                            <UserCircleIcon style={{ width: 16, height: 16 }} /> My Account
                          </button>
                          <div className="n-profile-sep" />
                          <button onClick={() => { setShowProfileDropdown(false); setShowLogoutModal(true); }} className="n-profile-item" style={{ color: "#dc2626" }}>
                            <LogOut style={{ width: 16, height: 16 }} /> Logout
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={handleAccountClick} className="n-action n-action-green">
                      <User style={{ width: 13, height: 13 }} /> Sign up
                    </button>
                  )}

                  <div className="n-sep" />
                  <button type="button" onClick={handleWishlistClick} className="ni" aria-label="Wishlist">
                    <Heart style={{ width: 18, height: 18, color: "var(--nav-pink)" }} />
                    {wishlistCount > 0 && <span className="ni-badge ni-badge-p">{wishlistCount > 99 ? "99+" : wishlistCount}</span>}
                  </button>
                  <button type="button" onClick={() => navigate(`/cart/${localStorage.getItem("cartId")}`)} className="ni" aria-label="Shopping cart">
                    <ShoppingBagIcon style={{ width: 18, height: 18, color: "var(--nav-mid)" }} />
                    {totalItems > 0 && <span className="ni-badge ni-badge-g">{totalItems > 99 ? "99+" : totalItems}</span>}
                  </button>
                </div>
              </div>

              {/* Mobile: Right side */}
              <div className="lg:hidden flex items-center" style={{ gap: 2 }}>
                <button type="button" onClick={openMobileSearch} className="ni" aria-label="Search products">
                  <MagnifyingGlassIcon style={{ width: 18, height: 18, color: "var(--nav-mid)" }} />
                </button>

                {/* ✅ Mobile avatar — auth-gated */}
                <div className="relative" ref={mobileProfileDropdownRef}>
                  <button type="button" onClick={handleMobileAccountClick} className="ni" aria-label="Your account">
                    {showUser ? (
                      <div className="n-avatar n-avatar-sm">{currentCustomer.firstName?.[0]?.toUpperCase() || "U"}</div>
                    ) : (
                      <User style={{ width: 18, height: 18, color: "var(--nav-mid)" }} />
                    )}
                  </button>
                  {showMobileProfileDropdown && showUser && (
                    <div className="n-profile-drop" style={{ right: 0, minWidth: 200 }}>
                      <div className="n-profile-header">
                        <div className="n-profile-name">{currentCustomer.firstName || ""} {currentCustomer.lastName || ""}</div>
                        <div className="n-profile-email">{currentCustomer.email || currentCustomer.accountType || "Customer"}</div>
                      </div>
                      <button onClick={handleProfileClick} className="n-profile-item">
                        <UserCircleIcon style={{ width: 16, height: 16 }} /> My Account
                      </button>
                      <button onClick={() => { setShowMobileProfileDropdown(false); navigate("/wishlist"); }} className="n-profile-item">
                        <Heart style={{ width: 16, height: 16, color: "var(--nav-pink)" }} /> Wishlist
                        {wishlistCount > 0 && (
                          <span style={{ marginLeft: "auto", background: "#fef2f2", color: "var(--nav-pink)", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>{wishlistCount}</span>
                        )}
                      </button>
                      <div className="n-profile-sep" />
                      <button onClick={() => { setShowMobileProfileDropdown(false); setShowLogoutModal(true); }} className="n-profile-item" style={{ color: "#dc2626" }}>
                        <LogOut style={{ width: 16, height: 16 }} /> Logout
                      </button>
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => navigate(`/cart/${localStorage.getItem("cartId")}`)} className="ni" aria-label="Shopping cart">
                  <ShoppingBagIcon style={{ width: 18, height: 18, color: "var(--nav-mid)" }} />
                  {totalItems > 0 && <span className="ni-badge ni-badge-g" style={{ fontSize: 9, minWidth: 14, height: 14 }}>{totalItems > 99 ? "99+" : totalItems}</span>}
                </button>

                <button onClick={toggleDrawer} className="n-ham ml-4 mr-1" aria-label="Open menu" aria-expanded={openDrawer}>
                  <Menu style={{ width: 18, height: 18, color: "var(--nav-mid)" }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {showAuthModal && <Suspense fallback={<PendingPlaceholder compact />}><AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} /></Suspense>}
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logout-modal-header"><h3 className="logout-modal-title">Confirm Logout</h3></div>
            <div className="logout-modal-body">Are you sure you want to logout? You&apos;ll need to sign in again to access your account.</div>
            <div className="logout-modal-footer">
              <button onClick={() => setShowLogoutModal(false)} className="logout-btn logout-btn-cancel">Cancel</button>
              <button onClick={handleLogout} className="logout-btn logout-btn-confirm">Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Search */}
      {mobileSearchOpen && (
        <div className="ms-overlay nav-classic">
          <div className="ms-backdrop" onClick={closeMobileSearch} />
          <div className="ms-panel">
            <div className="ms-header">
              <button onClick={closeMobileSearch} className="ms-back" aria-label="Close search"><ArrowLeftIcon style={{ width: 18, height: 18, color: "var(--nav-mid)" }} /></button>
              <div className="ms-input-wrap">
                <MagnifyingGlassIcon style={{ width: 16, height: 16, color: "var(--nav-light)", flexShrink: 0 }} />
                <input ref={mobileSearchInputRef} type="search" value={inputValue} onChange={handleSearchChange} onFocus={ensureProducts} aria-label="Search products" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (inputValue.trim()) setShowSearchResults(true); } }} placeholder="Search products..." autoComplete="off" />
                {inputValue && (
                  <button className="ms-clear" aria-label="Clear search" onClick={() => { setInputValue(""); setSearchQuery(""); setShowSearchResults(false); mobileSearchInputRef.current?.focus(); }}>
                    <XMarkIcon style={{ width: 12, height: 12, color: "#666" }} />
                  </button>
                )}
              </div>
            </div>
            <div className="ms-results">
              {showSearchResults ? (
                <SearchResults maxH={9999} mobile />
              ) : (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <MagnifyingGlassIcon style={{ width: 32, height: 32, color: "#ddd", margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 14, color: "#999", fontWeight: 500 }}>Search for products</div>
                  <div style={{ fontSize: 12, color: "#ccc", marginTop: 4 }}>Phones, laptops, appliances & more</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <OverlayStyles />

      {/* Mobile menu */}
      <SidePanel open={openDrawer} onClose={toggleDrawer} label="Main menu" className="drawer-classic" style={{ fontFamily: "var(--nav-font)" }}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#fff" }}>
          <div className="d-head">
            <span onClick={() => closeDrawerAndNavigate("/")} style={{ cursor: "pointer" }}><img src={logo} alt="Franko" width={35} height={24} style={{ height: 24, width: "auto" }} /></span>
            <button onClick={toggleDrawer} className="d-close" aria-label="Close menu"><XMarkIcon style={{ width: 14, height: 14, color: "#888" }} /></button>
          </div>
          <div className="d-tabs">
            <button onClick={() => setActiveSidebar("categories")} className={`d-tab ${activeSidebar === "categories" ? "d-tab-on" : ""}`}>Categories</button>
            <button onClick={() => setActiveSidebar("menu")} className={`d-tab ${activeSidebar === "menu" ? "d-tab-on" : ""}`}>Menu</button>
          </div>
          <div className="d-body">
            {activeSidebar === "categories" ? (
              <>
                <div className="d-label">Shop by Category</div>
                {filteredCategories.map((cat) => (
                  <div key={cat.categoryId}>
                    <div onClick={() => setSelectedBrandId((p) => (p === cat.categoryId ? null : cat.categoryId))} className={`d-cat ${selectedBrandId === cat.categoryId ? "d-cat-on" : ""}`}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <TagIcon style={{ width: 15, height: 15, color: selectedBrandId === cat.categoryId ? "var(--nav-green)" : "#bbb" }} />
                        <span>{cat.categoryName}</span>
                      </div>
                      <ChevronRightIcon style={{ width: 14, height: 14, color: "#bbb", transition: "transform 0.2s", transform: selectedBrandId === cat.categoryId ? "rotate(90deg)" : "none" }} />
                    </div>
                    {selectedBrandId === cat.categoryId && (
                      <div className="d-brands">
                        {brands.filter((b) => b.categoryId === cat.categoryId).map((brand) => (
                          <div key={brand.brandId} onClick={() => closeDrawerAndNavigate(getBrandUrl(brand))} className="d-brand">
                            <span>{brand.brandName}</span>
                            <ChevronRightIcon style={{ width: 11, height: 11, color: "#ccc" }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <>
                {/* ✅ Auth-gated drawer user section */}
                {showUser ? (
                  <>
                    <div className="d-user">
                      <div className="n-avatar" style={{ width: 40, height: 40, fontSize: 14, flexShrink: 0 }}>
                        {currentCustomer.firstName?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {currentCustomer.firstName || ""} {currentCustomer.lastName || ""}
                        </div>
                        <div style={{ fontSize: 12, color: "#999", textTransform: "capitalize", marginTop: 1 }}>
                          {currentCustomer.accountType || "Customer"}
                        </div>
                      </div>
                    </div>
                    <div className="d-user-actions">
                      <button onClick={() => closeDrawerAndNavigate("/account")} className="d-user-btn">
                        <Settings style={{ width: 14, height: 14 }} /> Profile
                      </button>
                      <button onClick={() => { setOpenDrawer(false); setShowLogoutModal(true); }} className="d-user-btn d-user-btn-danger">
                        <LogOut style={{ width: 14, height: 14 }} /> Logout
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="d-welcome">
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#333", marginBottom: 10 }}>Welcome to Franko</div>
                    <button onClick={() => { setOpenDrawer(false); setShowAuthModal(true); }} className="n-action n-action-green" style={{ width: "100%", justifyContent: "center", height: 38, fontSize: 13, borderRadius: "var(--nav-radius)" }}>
                      <User style={{ width: 14, height: 14 }} /> Sign In / Register
                    </button>
                  </div>
                )}

                <div className="d-label">Navigate</div>
                {[
                  { label: "Home", icon: HomeIcon, path: "/" },
                  { label: "About Us", icon: DevicePhoneMobileIcon, path: "/about" },
                  // ✅ Auth-gated
                  ...(showUser ? [{ label: "My Orders", icon: TruckIcon, path: "/order-history", customAction: closeDrawerAndNavigateToOrders }] : []),
                  { label: "Shops", icon: Store, path: "/shops" },
                  { label: "Contact", icon: PhoneArrowDownLeftIcon, path: "/contact" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} onClick={() => { if (item.customAction) item.customAction(); else closeDrawerAndNavigate(item.path); }} className={`d-item ${isActive(item.path) ? "d-item-on" : ""}`}>
                      <Icon style={{ width: 17, height: 17, color: isActive(item.path) ? "var(--nav-green)" : "#bbb", flexShrink: 0 }} />
                      <span>{item.label}</span>
                    </div>
                  );
                })}

                <div className="d-sep" />
                <div onClick={() => closeDrawerAndNavigate("/wishlist")} className={`d-item ${isActive("/wishlist") ? "d-item-on" : ""}`}>
                  <Heart style={{ width: 17, height: 17, color: "var(--nav-pink)", flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>Wishlist</span>
                  {wishlistCount > 0 && <span className="d-badge" style={{ background: "#fef2f2", color: "var(--nav-pink)" }}>{wishlistCount}</span>}
                </div>
                <div onClick={() => closeDrawerAndNavigate(`/cart/${localStorage.getItem("cartId")}`)} className={`d-item ${location.pathname.includes("/cart") ? "d-item-on" : ""}`}>
                  <ShoppingBagIcon style={{ width: 17, height: 17, color: location.pathname.includes("/cart") ? "var(--nav-green)" : "#bbb", flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>Cart</span>
                  {totalItems > 0 && <span className="d-badge" style={{ background: "var(--nav-green-light)", color: "var(--nav-green)" }}>{totalItems}</span>}
                </div>
                <div onClick={() => { setOpenDrawer(false); toggleRadio(); }} className="d-radio">
                  <div style={{ width: 36, height: 36, borderRadius: "var(--nav-radius)", background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Headphones style={{ width: 16, height: 16, color: "#fff" }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>Franko Radio</div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>Listen live</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </SidePanel>

      {/* Radio Dialog */}
      <Modal open={isRadioOpen} onClose={toggleRadio} label="Franko Radio Live">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--nav-font)", fontSize: 15, fontWeight: 700, color: "#333", padding: "14px 18px", borderBottom: "1px solid #eee" }}>
          Franko Radio Live 🎙️
          <button onClick={toggleRadio} className="d-close" aria-label="Close radio player"><XMarkIcon style={{ width: 14, height: 14, color: "#888" }} /></button>
        </div>
        <div style={{ padding: 20 }}>
          <div className="flex flex-col items-center gap-4">
            <audio controls autoPlay className="w-full" style={{ borderRadius: 6 }}>
              <source src="https://s48.myradiostream.com/:13420/listen.mp3" type="audio/mpeg" />
            </audio>
            <p style={{ fontFamily: "var(--nav-font)", fontSize: 13, color: "#999", textAlign: "center" }}>Streaming live</p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Nav;