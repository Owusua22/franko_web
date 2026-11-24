
import { appStorage as localStorage } from "../utils/secureLocalStorageInit";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet";
import {
  FunnelIcon,
  XMarkIcon,
  TagIcon,
  ChevronDownIcon,
  ArrowsUpDownIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import {
  ShoppingCartIcon,
  CheckIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

import { fetchProductsByShowroom } from "../Redux/Slice/productSlice";
import { getCartById } from "../Redux/Slice/cartSlice";
import { CircularPagination } from "../Component/CircularPagination";
import ProductDetailModal from "../Component/ProductDetailModal";
import TelCartSidebar from "../Component/TelCartSidebar";
import useAddToCart from "../Component/Cart";
import speedLogo from "../assets/frankoIcon-128.webp";
import telecelWhite from "../assets/Telecel White.png";

import { PLACEHOLDER_IMAGE, PRODUCT_IMAGE_BASE, productImageUrl } from "../config/media";

/* ============================ CONFIG ============================ */

const SHOWROOM_ID = "1eb2a7fe-7c6d-4b98-b806-3e9a82164f1f";
const PRODUCTS_PER_PAGE = 10;
const MAX_PRICE = 200000;

// Black Friday is on Friday, 27th November 2026 (GMT / Accra time)
const BLACK_FRIDAY_START = Date.parse("2026-11-27T00:00:00Z");
const PROMO_END = Date.parse("2026-11-27T23:59:59Z");
const LAUNCH_LABEL = "Friday, 27th November 2026";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "discount", label: "Biggest Discount" },
  { value: "name-az", label: "Name: A to Z" },
  { value: "name-za", label: "Name: Z to A" },
];
const DEFAULT_SORT = "newest";

const TEASERS = {
  live: [
    "Telecel | Franko · Exclusive smartphone deals up to 40% OFF.",
    "Free delivery within Accra & Kumasi for online phone purchases.",
    "Available across all Franko branches nationwide — 27th Nov 2026.",
  ],
  ended: ["Black Friday 2026 has ended — thank you for shopping with us."],
};

/* ============================ HELPERS ============================ */

const pad = (n) => String(n ?? 0).padStart(2, "0");

const formatPrice = (price) => {
  const value = Number(price);
  if (!Number.isFinite(value)) return "GH₵0.00";
  return `GH₵${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getImageUrl = (path) => productImageUrl(path, { width: 300 });

const getDiscount = (product) => {
  const price = Number(product.price) || 0;
  const oldPrice = Number(product.oldPrice) || 0;
  return oldPrice > price && oldPrice > 0
    ? Math.round(((oldPrice - price) / oldPrice) * 100)
    : 0;
};

const sortProducts = (list, sortBy) => {
  const byDate = (p) => new Date(p.dateCreated || 0).getTime();
  const byPrice = (p) => Number(p.price) || 0;
  const byName = (p) => p.productName || "";
  const sorters = {
    newest: (a, b) => byDate(b) - byDate(a),
    oldest: (a, b) => byDate(a) - byDate(b),
    "price-low": (a, b) => byPrice(a) - byPrice(b),
    "price-high": (a, b) => byPrice(b) - byPrice(a),
    discount: (a, b) => getDiscount(b) - getDiscount(a),
    "name-az": (a, b) => byName(a).localeCompare(byName(b)),
    "name-za": (a, b) => byName(b).localeCompare(byName(a)),
  };
  return [...list].sort(sorters[sortBy] || sorters.newest);
};

const useCountdown = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const phase = now < PROMO_END ? "live" : "ended";
  const isEventDay = now >= BLACK_FRIDAY_START && now < PROMO_END;
  const target = now < BLACK_FRIDAY_START ? BLACK_FRIDAY_START : PROMO_END;
  const diff = phase === "ended" ? 0 : Math.max(0, target - now);

  return {
    phase,
    isEventDay,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
};

/* ============================ SMALL PIECES ============================ */

const Notification = ({ message, type, visible, onClose }) => {
  useEffect(() => {
    if (!visible || !message) return undefined;
    const id = setTimeout(onClose, 3000);
    return () => clearTimeout(id);
  }, [visible, message, onClose]);

  if (!visible || !message) return null;
  const Icon = type === "success" ? CheckCircleIcon : XCircleIcon;

  return (
    <div
      className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 z-[9999] sm:max-w-sm animate-[bfSlideIn_0.25s_ease-out]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-xs sm:text-sm font-medium ${
          type === "success"
            ? "bg-[#080808] text-[#FFD400]"
            : "bg-[#E50914] text-white"
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="min-w-0 text-white">{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto -mr-1 p-1 text-lg leading-none text-white/70 hover:text-white"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

/* Animated Shopping Cart Filled with Smartphones Only */
const AnimatedPhonesCart = () => (
  <div className="relative inline-flex items-center justify-center mb-5">
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#080808] border-2 border-[#FFD400]/80 flex items-center justify-center shadow-md overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, #FFD400 0%, transparent 70%)",
        }}
      />

      <svg
        viewBox="0 0 120 110"
        fill="none"
        className="w-20 h-20 sm:w-24 sm:h-24 relative z-10"
        aria-hidden="true"
      >
        {/* Speed lines */}
        <line
          x1="8"
          y1="48"
          x2="22"
          y2="48"
          stroke="#FF9F0F"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="bf-speed-1"
        />
        <line
          x1="4"
          y1="62"
          x2="20"
          y2="62"
          stroke="#FFD400"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="bf-speed-2"
        />
        <line
          x1="10"
          y1="76"
          x2="24"
          y2="76"
          stroke="#E50914"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="bf-speed-1"
        />

        {/* Cart & Smartphones Group */}
        <g className="bf-cart-drive">
          {/* Phone 1 (Left, tilted left) */}
          <g className="bf-item-float-1">
            <rect
              x="36"
              y="20"
              width="16"
              height="28"
              rx="3"
              transform="rotate(-12 36 20)"
              fill="#171717"
              stroke="#FFD400"
              strokeWidth="2"
            />
            <rect
              x="38.5"
              y="23"
              width="11"
              height="21"
              rx="1.5"
              transform="rotate(-12 38.5 23)"
              fill="#262626"
            />
            <line
              x1="41"
              y1="22"
              x2="45"
              y2="21.2"
              stroke="#FFD400"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>

          {/* Phone 2 (Center, upright flagship phone) */}
          <g className="bf-item-float-2">
            <rect
              x="55"
              y="15"
              width="17"
              height="30"
              rx="3"
              fill="#171717"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <rect
              x="57.5"
              y="18"
              width="12"
              height="23"
              rx="1.5"
              fill="#E50914"
            />
            <line
              x1="61.5"
              y1="17"
              x2="65.5"
              y2="17"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="63.5" cy="38.5" r="1" fill="#FFD400" />
          </g>

          {/* Phone 3 (Right, tilted right) */}
          <g className="bf-item-float-3">
            <rect
              x="75"
              y="21"
              width="16"
              height="27"
              rx="3"
              transform="rotate(12 75 21)"
              fill="#171717"
              stroke="#FF9F0F"
              strokeWidth="2"
            />
            <rect
              x="77.5"
              y="24"
              width="11"
              height="20"
              rx="1.5"
              transform="rotate(12 77.5 24)"
              fill="#FFD400"
            />
            <line
              x1="81.5"
              y1="23.5"
              x2="85.5"
              y2="24.2"
              stroke="#080808"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>

          {/* --- SHOPPING CART BODY --- */}
          <path
            d="M18 32 H27 L36 70 H88"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M30 40 H96 L89 64 H35 Z"
            fill="#171717"
            fillOpacity="0.9"
            stroke="#FFD400"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <line
            x1="48"
            y1="41"
            x2="46"
            y2="63"
            stroke="#FFD400"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          <line
            x1="64"
            y1="41"
            x2="63"
            y2="63"
            stroke="#FFD400"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          <line
            x1="80"
            y1="41"
            x2="77"
            y2="63"
            stroke="#FFD400"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          <line
            x1="33"
            y1="52"
            x2="92"
            y2="52"
            stroke="#FFD400"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />

          {/* Wheels */}
          <g>
            <circle
              cx="43"
              cy="80"
              r="7"
              fill="#080808"
              stroke="#FFFFFF"
              strokeWidth="3"
            />
            <circle cx="43" cy="80" r="2.5" fill="#FFD400" />
          </g>
          <g>
            <circle
              cx="81"
              cy="80"
              r="7"
              fill="#080808"
              stroke="#FFFFFF"
              strokeWidth="3"
            />
            <circle cx="81" cy="80" r="2.5" fill="#FFD400" />
          </g>
        </g>
      </svg>
    </div>

    {/* Black Friday Badge */}
    <span className="absolute -bottom-1 -right-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E50914] text-white text-[10px] font-extrabold tracking-wider uppercase ring-2 ring-white shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-[#FFD400] animate-ping" />
      -40%
    </span>
  </div>
);

const SkeletonCard = () => (
  <div className="bg-white border border-neutral-200/80 rounded-xl overflow-hidden">
    <div className="aspect-[4/3] bg-neutral-100 animate-pulse" />
    <div className="p-3 space-y-2">
      <div className="h-3 w-3/4 rounded bg-neutral-100 animate-pulse" />
      <div className="h-4 w-1/3 rounded bg-neutral-100 animate-pulse" />
      <div className="h-9 w-full rounded-lg bg-neutral-100 animate-pulse" />
    </div>
  </div>
);

const FilterChip = ({ label, onRemove }) => (
  <button
    type="button"
    onClick={onRemove}
    className="group inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-[#080808] text-xs font-medium text-[#FFD400] hover:bg-[#171717] transition"
  >
    <span className="max-w-[45vw] truncate">{label}</span>
    <XMarkIcon className="w-3.5 h-3.5 text-white/70 group-hover:text-white" />
  </button>
);

const TimeUnit = ({ value, label }) => (
  <div className="min-w-[32px] sm:min-w-[36px] bg-[#171717] border border-white/10 rounded-md py-1 px-1 text-center">
    <span className="block text-[11px] sm:text-xs font-bold leading-none tabular-nums text-[#FFD400]">
      {pad(value)}
    </span>
    <span className="block text-[6px] sm:text-[7px] mt-0.5 font-medium uppercase tracking-wider text-white/55">
      {label}
    </span>
  </div>
);

const CountdownRow = ({ countdown }) => (
  <>
    {countdown.days > 0 && (
      <>
        <TimeUnit value={countdown.days} label="DAYS" />
        <span className="text-white/30 text-[10px]">:</span>
      </>
    )}
    <TimeUnit value={countdown.hours} label="HRS" />
    <span className="text-white/30 text-[10px]">:</span>
    <TimeUnit value={countdown.minutes} label="MIN" />
    <span className="text-white/30 text-[10px]">:</span>
    <TimeUnit value={countdown.seconds} label="SEC" />
  </>
);

const SortSelect = ({ value, onChange, id, className = "" }) => (
  <div className={`relative ${className}`}>
    <label htmlFor={id} className="sr-only">
      Sort phones
    </label>
    <ArrowsUpDownIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none pl-8 pr-8 py-2 rounded-lg bg-white border border-neutral-200 text-xs sm:text-sm font-medium text-[#080808] outline-none focus:border-[#080808] cursor-pointer"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
  </div>
);

/* ============================ PRODUCT CARD ============================ */

const ProductCard = memo(function ProductCard({
  product,
  disabled,
  loading,
  justAdded,
  onAdd,
  onOpen,
}) {
  const id = product.productID || product.id;
  const price = Number(product.price) || 0;
  const oldPrice = Number(product.oldPrice) || 0;
  const soldOut = Number(product.stock) === 0;
  const discount = getDiscount(product);
  const name = product.productName || "Unnamed phone";

  return (
    <article className="group flex flex-col bg-white border border-neutral-200/80 rounded-xl overflow-hidden transition hover:border-[#080808]">
      <div
        className="relative aspect-[4/3] flex items-center justify-center p-3 cursor-pointer bg-white"
        onClick={() => onOpen(id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(id);
          }
        }}
        aria-label={`View details for ${name}`}
      >
        {discount > 0 && !soldOut && (
          <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 text-[10px] font-bold rounded bg-[#E50914] text-white">
            -{discount}%
          </span>
        )}
        {soldOut && (
          <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 text-[10px] font-semibold rounded bg-[#080808] text-white">
            Sold out
          </span>
        )}
        <img
          src={getImageUrl(product.productImage)}
          alt={name}
          loading="lazy"
          className={`h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03] ${
            soldOut ? "opacity-50 grayscale" : ""
          }`}
        />
      </div>

      <div className="flex flex-col flex-1 gap-1.5 p-3 border-t border-neutral-100">
        <h3
          className="text-[13px] font-medium text-[#171717] leading-snug line-clamp-2 min-h-[2.5em] cursor-pointer"
          onClick={() => onOpen(id)}
        >
          {name}
        </h3>

        <div className="flex items-baseline flex-wrap gap-x-2">
          <span className="text-sm sm:text-base font-bold text-[#E50914]">
            {formatPrice(price)}
          </span>
          {discount > 0 && (
            <span className="text-[11px] text-neutral-400 line-through">
              {formatPrice(oldPrice)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onAdd(product)}
          disabled={disabled || soldOut}
          aria-label={soldOut ? `${name} is sold out` : `Add ${name} to cart`}
          className={`mt-auto min-h-[36px] w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${
            soldOut
              ? "bg-neutral-100 text-neutral-400"
              : justAdded
              ? "bg-[#FFD400] text-[#080808]"
              : "bg-[#080808] text-white hover:bg-[#171717]"
          }`}
        >
          {soldOut ? (
            "Sold out"
          ) : justAdded ? (
            <>
              <CheckIcon className="w-4 h-4 bf-pop" /> Added
            </>
          ) : loading ? (
            <>
              <span className="bf-spinner" aria-hidden="true" /> Adding…
            </>
          ) : (
            <>
              <ShoppingCartIcon className="w-3.5 h-3.5 text-[#FFD400]" /> Add to cart
            </>
          )}
        </button>
      </div>
    </article>
  );
});

/* ============================ MAIN COMPONENT ============================ */

const PhoneSpeed = () => {
  const dispatch = useDispatch();

  const { productsByShowroom = {}, loading } = useSelector((s) => s.products);
  const { cart: reduxCart = [], cartId: reduxCartId } = useSelector((s) => s.cart);
  const { addProductToCart, loading: cartLoading } = useAddToCart();

  const countdown = useCountdown();
  const { phase, isEventDay } = countdown;

  const [teaserIndex, setTeaserIndex] = useState(0);
  const [teaserVisible, setTeaserVisible] = useState(true);
  const [recentlyAdded, setRecentlyAdded] = useState(() => new Set());
  const [addingProductId, setAddingProductId] = useState(null);

  const [inputPrice, setInputPrice] = useState({ min: 0, max: MAX_PRICE });
  const [priceRange, setPriceRange] = useState([0, MAX_PRICE]);
  const [discountedOnly, setDiscountedOnly] = useState(false);
  const [brand, setBrand] = useState("");
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [notice, setNotice] = useState({ message: "", type: "success", visible: false });

  const [selectedProductId, setSelectedProductId] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const gridTopRef = useRef(null);

  const teaserLines = TEASERS[phase];
  const activeLine = teaserLines[teaserIndex] || teaserLines[0];

  const products = useMemo(
    () => productsByShowroom?.[SHOWROOM_ID] || [],
    [productsByShowroom]
  );

  const brands = useMemo(
    () =>
      [...new Set(products.map((p) => p.brandName).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [products]
  );

  const showNotice = useCallback((message, type = "success") => {
    setNotice({ message, type, visible: true });
  }, []);
  const hideNotice = useCallback(
    () => setNotice((prev) => ({ ...prev, visible: false })),
    []
  );

  /* ---------- product modal ---------- */

  const openProductModal = useCallback((id) => {
    setSelectedProductId(id);
    setIsModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedProductId(null);
    setIsModalVisible(false);
  }, []);

  /* ---------- cart ---------- */

  const cartItemCount = useMemo(
    () => (reduxCart || []).reduce((sum, it) => sum + (it.quantity || 1), 0),
    [reduxCart]
  );
  const cartBusy = cartLoading || addingProductId !== null;

  const cartRef = useRef(reduxCart);
  cartRef.current = reduxCart;

  const readStoredCart = useCallback(() => {
    try {
      const raw = localStorage.getItem("cart");
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (typeof raw === "string") {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  const getCartLineQty = useCallback(
    (id) => {
      const matches = (item) =>
        String(
          item?.productId ??
            item?.productID ??
            item?.ProductId ??
            item?.ProductID ??
            item?.id ??
            ""
        ) === String(id);
      const sum = (list) =>
        (list || []).reduce(
          (total, item) =>
            matches(item) ? total + (Number(item.quantity) || 1) : total,
          0
        );
      return Math.max(sum(cartRef.current), sum(readStoredCart()));
    },
    [readStoredCart]
  );

  useEffect(() => {
    const storedId = reduxCartId || localStorage.getItem("cartId");
    if (storedId) dispatch(getCartById(storedId));
  }, [dispatch, reduxCartId]);

  const flashAdded = useCallback((id) => {
    setRecentlyAdded((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1600);
  }, []);

  const handleAddToCart = useCallback(
    async (product) => {
      const id = product.productID || product.id;
      if (Number(product.stock) === 0) {
        showNotice("This phone is out of stock", "error");
        return;
      }
      const qtyBefore = getCartLineQty(id);

      setAddingProductId(id);
      try {
        await addProductToCart({ ...product, quantity: 1 });
      } catch {
        /* Handled by cart verification below */
      } finally {
        setAddingProductId(null);
      }

      const landed = await new Promise((resolve) => {
        let tries = 0;
        const check = () => {
          tries += 1;
          if (getCartLineQty(id) > qtyBefore) return resolve(true);
          if (tries >= 6) return resolve(false);
          return setTimeout(check, 120);
        };
        check();
      });

      if (landed) {
        showNotice("Phone added to cart");
        flashAdded(id);
      } else {
        showNotice("Couldn't add this phone to your cart. Please try again.", "error");
      }
    },
    [addProductToCart, flashAdded, getCartLineQty, showNotice]
  );

  /* ---------- effects ---------- */

  useEffect(() => {
    if (teaserLines.length < 2) return undefined;
    let swap;
    const id = setInterval(() => {
      setTeaserVisible(false);
      swap = setTimeout(() => {
        setTeaserIndex((i) => (i + 1) % teaserLines.length);
        setTeaserVisible(true);
      }, 220);
    }, 3500);
    return () => {
      clearInterval(id);
      clearTimeout(swap);
    };
  }, [teaserLines.length]);

  useEffect(() => {
    setTeaserIndex(0);
    setTeaserVisible(true);
  }, [phase]);

  const loadProducts = useCallback(() => {
    const request = dispatch(fetchProductsByShowroom(SHOWROOM_ID));
    if (request?.then) request.then(() => setHasLoadedOnce(true));
    else setHasLoadedOnce(true);
  }, [dispatch]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  const scrollToGrid = useCallback(() => {
    const node = gridTopRef.current;
    if (!node) return;
    const top = node.getBoundingClientRect().top + window.pageYOffset - 84;
    window.scrollTo?.({ top: Math.max(0, top), behavior: "smooth" });
  }, []);

  /* ---------- derived data ---------- */

  const filteredProducts = useMemo(() => {
    const result = products.filter((p) => {
      const price = Number(p.price) || 0;
      return (
        price >= priceRange[0] &&
        price <= priceRange[1] &&
        (!discountedOnly || getDiscount(p) > 0) &&
        (!brand || p.brandName === brand)
      );
    });
    return sortProducts(result, sortBy);
  }, [products, priceRange, discountedOnly, brand, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const safePage = Math.min(Math.max(1, page), Math.max(1, totalPages));
  const currentProducts = filteredProducts.slice(
    (safePage - 1) * PRODUCTS_PER_PAGE,
    safePage * PRODUCTS_PER_PAGE
  );

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const priceIsDefault = priceRange[0] === 0 && priceRange[1] === MAX_PRICE;
  const filtersActive =
    !priceIsDefault || discountedOnly || Boolean(brand) || sortBy !== DEFAULT_SORT;
  const activeFilterCount = [!priceIsDefault, discountedOnly, Boolean(brand)].filter(
    Boolean
  ).length;

  const isInitialLoading = loading && !hasLoadedOnce;
  // Only show the sidebar & filter controls when products are actually available
  const hasProducts = !isInitialLoading && products.length > 0;
  const hasNoResults = hasLoadedOnce && !loading && filteredProducts.length === 0;
  const dealsLabel = isInitialLoading
    ? ""
    : `${filteredProducts.length} ${
        filteredProducts.length === 1 ? "phone deal" : "phone deals"
      }`;

  /* ---------- handlers ---------- */

  const handleSortChange = useCallback(
    (value) => {
      setSortBy(value);
      setPage(1);
      scrollToGrid();
    },
    [scrollToGrid]
  );

  const handlePageChange = useCallback(
    (p) => {
      setPage(p);
      scrollToGrid();
    },
    [scrollToGrid]
  );

  const applyPriceFilter = () => {
    const min = Math.max(0, Number(inputPrice.min) || 0);
    const max = Math.min(MAX_PRICE, Number(inputPrice.max) || MAX_PRICE);
    setPriceRange([Math.min(min, max), Math.max(min, max)]);
    setPage(1);
    setDrawerOpen(false);
    scrollToGrid();
  };

  const removePrice = () => {
    setInputPrice({ min: 0, max: MAX_PRICE });
    setPriceRange([0, MAX_PRICE]);
    setPage(1);
  };

  const resetFilters = () => {
    removePrice();
    setDiscountedOnly(false);
    setBrand("");
    setSortBy(DEFAULT_SORT);
    setDrawerOpen(false);
  };

  /* ---------- filters panel (sidebar + sheet) ---------- */

  const panel = "bg-white border border-neutral-200/80 rounded-xl p-4";
  const priceInputClass =
    "w-full pl-6 pr-2 py-2 border border-neutral-200 rounded-lg text-sm outline-none focus:border-[#080808]";

  const renderFilters = () => (
    <div className="flex flex-col gap-3">
      <div className={panel}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
          Sort by
        </h3>
        <SortSelect
          id="bf-sort-drawer"
          value={sortBy}
          onChange={(v) => {
            setSortBy(v);
            setPage(1);
          }}
        />
      </div>

      <div className={panel}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
          Price range
        </h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {["min", "max"].map((key) => (
            <label
              key={key}
              className="text-[10px] font-semibold uppercase text-neutral-400"
            >
              {key}
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-2 text-xs text-neutral-400">
                  ₵
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={inputPrice[key]}
                  onChange={(e) =>
                    setInputPrice((p) => ({ ...p, [key]: e.target.value }))
                  }
                  className={priceInputClass}
                />
              </div>
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={applyPriceFilter}
          className="w-full min-h-[40px] bg-[#080808] text-[#FFD400] text-xs font-bold rounded-lg hover:bg-[#171717] transition"
        >
          Apply
        </button>
      </div>

      <div className={`${panel} flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#080808]">
          <TagIcon className="h-4 w-4 text-[#E50914]" />
          <span>Discounted only</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={discountedOnly}
          onClick={() => {
            setDiscountedOnly((v) => !v);
            setPage(1);
          }}
          className={`relative w-10 h-5 rounded-full p-0.5 transition-colors ${
            discountedOnly ? "bg-[#E50914]" : "bg-neutral-200"
          }`}
        >
          <span
            className={`block w-4 h-4 rounded-full bg-white transition-transform ${
              discountedOnly ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      {brands.length > 0 && (
        <div className={panel}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
            Phone Brands
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {brands.map((b) => (
              <button
                type="button"
                key={b}
                onClick={() => {
                  setBrand(brand === b ? "" : b);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium transition ${
                  brand === b
                    ? "bg-[#080808] text-[#FFD400] border-[#080808]"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtersActive && (
        <button
          type="button"
          onClick={resetFilters}
          className="w-full min-h-[40px] text-[#E50914] text-xs font-semibold hover:underline"
        >
          Reset all filters
        </button>
      )}
    </div>
  );

  const gridClass =
    "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-4";

  /* ============================ RENDER ============================ */

  return (
    <>
      <Helmet>
        <title>Telecel | Franko Black Friday Phones – 27th November 2026</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </Helmet>

      <style>{`
        @keyframes bfSlideIn { from { transform: translateY(-10px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes bfPop { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes bfSheetUp { from { transform: translateY(100%); } to { transform: none; } }
        @keyframes bfSpin { to { transform: rotate(360deg); } }
        @keyframes cartBounce { 0% { transform: scale(0); } 50% { transform: scale(1.25); } 100% { transform: scale(1); } }
        @keyframes bfCartDrive {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          50% { transform: translateX(3px) translateY(-2px); }
        }
        @keyframes bfItemFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3.5px); }
        }
        @keyframes bfSpeedLine {
          0%, 100% { opacity: 0.25; transform: translateX(0); }
          50% { opacity: 0.9; transform: translateX(-4px); }
        }
        .bf-pop { animation: bfPop 0.25s ease-out; }
        .cart-bounce { animation: cartBounce 0.35s ease-out; }
        .bf-sheet { animation: bfSheetUp 0.25s cubic-bezier(0.22,1,0.36,1); }
        .bf-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,212,0,0.3); border-top-color: #FFD400; border-radius: 9999px; animation: bfSpin 0.7s linear infinite; }
        .bf-cart-drive { animation: bfCartDrive 2s ease-in-out infinite; }
        .bf-item-float-1 { animation: bfItemFloat 2.2s ease-in-out infinite; }
        .bf-item-float-2 { animation: bfItemFloat 2.2s ease-in-out 0.3s infinite; }
        .bf-item-float-3 { animation: bfItemFloat 2.2s ease-in-out 0.6s infinite; }
        .bf-speed-1 { animation: bfSpeedLine 1.4s ease-in-out infinite; }
        .bf-speed-2 { animation: bfSpeedLine 1.4s ease-in-out 0.4s infinite; }
        .bf-cart-btn { transition: transform 0.18s ease, background 0.18s ease; -webkit-tap-highlight-color: transparent; }
        .bf-cart-btn:hover { background: rgba(255,255,255,0.14); transform: translateY(-1px); }
        .bf-cart-btn:active { transform: scale(0.94); }
        .bf-scroll input, .bf-scroll select { font-size: 16px; }
        @media (min-width: 640px) { .bf-scroll input, .bf-scroll select { font-size: inherit; } }
        @media (prefers-reduced-motion: reduce) {
          .bf-pop, .cart-bounce, .bf-sheet, .bf-spinner, .bf-cart-drive, .bf-item-float-1, .bf-item-float-2, .bf-item-float-3, .bf-speed-1, .bf-speed-2 { animation: none !important; }
        }
      `}</style>

      <Notification
        message={notice.message}
        type={notice.type}
        visible={notice.visible}
        onClose={hideNotice}
      />

      <div className="bf-scroll min-h-screen bg-[#fafafa] text-[#171717]">
        <div className="mx-auto w-full max-w-[1600px] px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6">
          {/* ---------- Minimal Black Friday Header (Telecel | Franko) ---------- */}
          <header className="relative overflow-hidden bg-[#080808] text-white rounded-2xl p-3.5 sm:px-6 sm:py-5 border border-neutral-800">
            <div
              className="pointer-events-none absolute top-0 inset-x-0 h-[3px]"
              style={{
                background: "linear-gradient(90deg, #FFD400, #FF9F0F, #E50914)",
              }}
            />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
              {/* Top Row on Mobile: High-Visibility Partner Logos + Mobile Cart Button */}
              <div className="flex items-center justify-between md:justify-start gap-3">
                <div className="inline-flex items-center gap-3 sm:gap-3.5 flex-shrink-0 bg-white/[0.06] border border-white/15 rounded-xl px-3 py-2">
                  <img
                    src={telecelWhite}
                    alt="Telecel"
                    className="h-8 sm:h-11 md:h-12 w-auto object-contain"
                  />

                  {/* Vertical Line Separator (|) */}
                  <span
                    className="h-7 sm:h-9 w-[1.5px] bg-white/40 rounded-full"
                    aria-hidden="true"
                  />

                  {/* Franko Logo with High-Contrast White Background */}
                  <div className="bg-white rounded-lg px-2.5 py-1.5 flex items-center justify-center shadow-sm">
                    <img
                      src={speedLogo}
                      alt="Franko Trading"
                      className="h-7 sm:h-9 md:h-10 w-auto object-contain"
                    />
                  </div>
                </div>

                {/* Mobile Cart Icon */}
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  aria-label={`Open cart, ${cartItemCount} item${
                    cartItemCount === 1 ? "" : "s"
                  }`}
                  className="bf-cart-btn md:hidden relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white flex-shrink-0"
                >
                  {cartBusy ? (
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-[#FFD400] animate-spin"
                    />
                  ) : (
                    <ShoppingCartIcon className="w-5 h-5 text-[#FFD400]" />
                  )}
                  {cartItemCount > 0 && !cartBusy && (
                    <span
                      key={cartItemCount}
                      className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 text-[9px] font-black rounded-full flex items-center justify-center cart-bounce ring-2 ring-[#080808] bg-[#E50914] text-white"
                    >
                      {cartItemCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Center/Left Title & Rotating Copy */}
              <div className="min-w-0 flex-1 md:pl-2">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-[#E50914] text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                    27 Nov 2026
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#FFD400]/15 text-[#FFD400] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                    Phones · Up to 40% Off
                  </span>
                </div>
                <h1 className="mt-1 text-base sm:text-xl lg:text-2xl font-extrabold tracking-tight text-white leading-snug">
                  Telecel <span className="text-white/40 font-light">|</span> Franko{" "}
                  <span className="text-[#FFD400]">Black Friday</span>
                </h1>
                <p
                  className={`mt-0.5 text-[11px] sm:text-xs text-white/70 truncate transition-opacity duration-200 ${
                    teaserVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {activeLine}
                </p>
              </div>

              {/* Right: Countdown + Desktop Cart Button */}
              <div className="flex items-center justify-between md:justify-end gap-3 pt-2.5 md:pt-0 border-t border-white/10 md:border-0">
                {phase !== "ended" && (
                  <div className="flex items-center justify-between w-full md:w-auto gap-2">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/55">
                      {isEventDay ? "Ends in" : "Starts in"}
                    </span>
                    <div className="flex items-center gap-1">
                      <CountdownRow countdown={countdown} />
                    </div>
                  </div>
                )}

                {/* Desktop Cart Icon */}
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  aria-label={`Open cart, ${cartItemCount} item${
                    cartItemCount === 1 ? "" : "s"
                  }`}
                  className="bf-cart-btn hidden md:inline-flex relative h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white flex-shrink-0"
                >
                  {cartBusy ? (
                    <span
                      aria-hidden="true"
                      className="h-5 w-5 rounded-full border-2 border-white/30 border-t-[#FFD400] animate-spin"
                    />
                  ) : (
                    <ShoppingCartIcon className="w-5 h-5 text-[#FFD400]" />
                  )}
                  {cartItemCount > 0 && !cartBusy && (
                    <span
                      key={cartItemCount}
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full flex items-center justify-center cart-bounce ring-2 ring-[#080808] bg-[#E50914] text-white"
                    >
                      {cartItemCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Minimal Perks Strip */}
            <div className="hidden sm:flex mt-3.5 pt-3 border-t border-white/10 flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDaysIcon className="w-3.5 h-3.5 text-[#FFD400]" />
                {LAUNCH_LABEL}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <TruckIcon className="w-3.5 h-3.5 text-[#FF9F0F]" />
                Free Delivery in Accra &amp; Kumasi (Online Purchases)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BuildingStorefrontIcon className="w-3.5 h-3.5 text-[#E50914]" />
                Promotion Across All Branches
              </span>
            </div>
          </header>

          {/* ---------- Mobile Sticky Toolbar (Only shown when products exist) ---------- */}
          {hasProducts && (
            <div className="sticky top-0 z-30 lg:hidden -mx-2.5 sm:-mx-6 px-2.5 sm:px-6 py-2 mt-2.5 bg-[#fafafa]/95 backdrop-blur-sm border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#080808] text-[#FFD400] text-xs font-semibold"
                >
                  <FunnelIcon className="w-4 h-4" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#E50914] text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <SortSelect
                  id="bf-sort-toolbar"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="flex-1 min-w-0"
                />
              </div>
            </div>
          )}

          {/* ---------- Mobile Filter Drawer (Only when products exist) ---------- */}
          {hasProducts && drawerOpen && (
            <div
              className="fixed inset-0 z-50 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
            >
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setDrawerOpen(false)}
              />
              <div className="bf-sheet absolute inset-x-0 bottom-0 max-h-[82vh] bg-[#fafafa] rounded-t-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-neutral-200">
                  <span className="text-sm font-bold text-[#080808]">
                    Filters &amp; Sort
                  </span>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="p-1 text-neutral-500 hover:text-[#080808]"
                    aria-label="Close filters"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">{renderFilters()}</div>
                <div className="grid grid-cols-2 gap-2.5 p-4 bg-white border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="min-h-[42px] rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setDrawerOpen(false);
                      scrollToGrid();
                    }}
                    className="min-h-[42px] rounded-lg bg-[#080808] text-[#FFD400] text-xs font-bold"
                  >
                    Show {filteredProducts.length} phones
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---------- Main Content Area ---------- */}
          <div className="flex gap-6 mt-4 sm:mt-5">
            {/* Sidebar is ONLY rendered when products are being displayed */}
            {hasProducts && (
              <aside className="hidden lg:block w-60 flex-shrink-0">
                <div className="sticky top-5">{renderFilters()}</div>
              </aside>
            )}

            <main className="flex-1 min-w-0">
              <div ref={gridTopRef} className="scroll-mt-20" />

              {/* Desktop Sort Bar (Only when products exist) */}
              {hasProducts && (
                <div className="hidden lg:flex items-center justify-between gap-4 mb-4">
                  <p className="text-xs text-neutral-500">
                    <span className="font-bold text-[#080808]">{dealsLabel}</span>
                    {totalPages > 1 && ` · Page ${safePage} of ${totalPages}`}
                  </p>
                  <SortSelect
                    id="bf-sort-desktop"
                    value={sortBy}
                    onChange={handleSortChange}
                    className="w-52"
                  />
                </div>
              )}

              {/* Active Filter Chips */}
              {hasProducts && filtersActive && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {!priceIsDefault && (
                    <FilterChip
                      label={`${formatPrice(priceRange[0])} – ${formatPrice(
                        priceRange[1]
                      )}`}
                      onRemove={removePrice}
                    />
                  )}
                  {discountedOnly && (
                    <FilterChip
                      label="Discounted only"
                      onRemove={() => setDiscountedOnly(false)}
                    />
                  )}
                  {brand && (
                    <FilterChip label={brand} onRemove={() => setBrand("")} />
                  )}
                  {sortBy !== DEFAULT_SORT && (
                    <FilterChip
                      label={SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                      onRemove={() => setSortBy(DEFAULT_SORT)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-semibold text-[#E50914] hover:underline ml-1"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Initial Loading Skeletons */}
              {isInitialLoading && (
                <div className={gridClass}>
                  {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              )}

              {/* Products Grid */}
              {!isInitialLoading && currentProducts.length > 0 && (
                <>
                  <div className={gridClass}>
                    {currentProducts.map((product) => {
                      const id = product.productID || product.id;
                      const isAddingThis = String(addingProductId) === String(id);
                      return (
                        <ProductCard
                          key={id}
                          product={product}
                          disabled={cartLoading || isAddingThis}
                          loading={isAddingThis}
                          justAdded={recentlyAdded.has(id)}
                          onAdd={handleAddToCart}
                          onOpen={openProductModal}
                        />
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center mt-8">
                      <CircularPagination
                        currentPage={safePage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Empty State / "Black Friday deals loading soon" with Animated Phones Cart */}
              {hasNoResults && (
                <div className="bg-white border border-neutral-200/80 rounded-2xl px-5 py-12 sm:py-16 text-center max-w-lg mx-auto my-3">
                  <AnimatedPhonesCart />

                  <h2 className="text-base sm:text-xl font-extrabold text-[#080808]">
                    {filtersActive && hasProducts
                      ? "No phones match these filters"
                      : phase === "ended"
                      ? "Black Friday 2026 has ended"
                      : "Black Friday deals loading soon"}
                  </h2>

                  <p className="text-neutral-500 text-xs sm:text-sm max-w-sm mx-auto mt-1.5 mb-5 leading-relaxed">
                    {filtersActive && hasProducts
                      ? "Try adjusting your price range or clearing a filter to see available phone deals."
                      : phase === "ended"
                      ? "Thank you for being part of the Telecel | Franko Black Friday promotion."
                      : "Telecel in collaboration with Franko is preparing exclusive Black Friday smartphone deals up to 40% OFF for Friday, 27th November 2026."}
                  </p>

                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={filtersActive && hasProducts ? resetFilters : loadProducts}
                      className="min-h-[38px] px-5 rounded-lg bg-[#080808] text-[#FFD400] text-xs font-bold hover:bg-[#171717] transition"
                    >
                      {filtersActive && hasProducts ? "Clear filters" : "Dropping Soon"}
                    </button>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* ---------- Product detail modal ---------- */}
      {selectedProductId && (
        <ProductDetailModal
          productID={selectedProductId}
          isModalVisible={isModalVisible}
          onClose={closeModal}
        />
      )}

      {/* ---------- Cart sidebar (shared with /tel-cart) ---------- */}
      <TelCartSidebar
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        checkoutPath="/tel-checkout"
      />
    </>
  );
};

export default PhoneSpeed;
