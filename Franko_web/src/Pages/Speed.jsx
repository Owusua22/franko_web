import { cartAddFeedback } from "../utils/cartItems.mjs";
import { getProductUrl } from "../utils/productSlug";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  FunnelIcon,
  XMarkIcon,
  TagIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BellIcon,
  BellAlertIcon,
  SparklesIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import {
  ShoppingCartIcon,
  CheckIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

import { fetchProductsByShowroom } from "../Redux/Slice/productSlice";
import { CircularPagination } from "../Component/CircularPagination";
import useAddToCart from "../Component/Cart";
import { CATALOGUE_UPDATED_EVENT } from "../Component/CatalogueSync";
import speedLogo from "../assets/speed-logo.png";

/* ============================ CONFIG ============================ */

const SHOWROOM_ID = "a0631779-0be9-4cc3-825d-5b381343859c";
const PRODUCTS_PER_PAGE = 10;
const MAX_PRICE = 200000;
const BROWSE_ALL_URL = "/";

// Promotion started Friday 2 Oct 2026 at 9:00 AM GMT (Accra)
// and has been extended until today, Saturday 3 Oct 2026 at 6:00 PM GMT.
const PROMO_START = Date.parse("2026-10-02T09:00:00Z");
const PROMO_END = Date.parse("2026-10-03T18:00:00Z");
const LAUNCH_LABEL = "Friday 2 October 2026, 9:00 AM";
const EXTENSION_BADGE = "Extended Today Until 6:00 PM";

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
  before: ["Limited-time flash sale"],
  live: [
    "Promotion extended! Shop exclusive deals until 6:00 PM today.",
    "Extended by popular demand — final hours close at 6:00 PM today.",
    "Limited-time prices. Find it. Love it. Add it to your cart.",
  ],
  ended: ["This extended flash sale has ended — thanks for shopping with us."],
};

/* ============================ HELPERS ============================ */

const pad = (n) => String(n ?? 0).padStart(2, "0");

// The sale is live straight away; only the end time matters.
const getPhase = (now) => (now < PROMO_END ? "live" : "ended");

const formatPrice = (price) => {
  const value = Number(price);
  if (!Number.isFinite(value)) return "GH₵0.00";
  return `GH₵${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getImageUrl = (path) => {
  if (!path) return "https://via.placeholder.com/500";
  if (path.includes("\\")) {
    return `https://testing.frankotrading.com/Media/Products_Images/${path
      .split("\\")
      .pop()}`;
  }
  return path;
};

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

  const phase = getPhase(now);
  const target = PROMO_END;
  const diff = phase === "ended" ? 0 : Math.max(0, target - now);

  return {
    phase,
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
      className="fixed top-2 left-2 right-2 sm:left-auto sm:right-4 sm:top-4 z-[9999] sm:max-w-sm animate-[speedSlideIn_0.3s_ease-out]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-white text-xs sm:text-sm font-semibold ${
          type === "success" ? "bg-[#2C5E48]" : type === "info" ? "bg-amber-700" : "bg-[#BB1420]"
        }`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="min-w-0">{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto -mr-1 p-1 text-xl leading-none hover:opacity-70"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white border border-[#e6e1dc] rounded-xl overflow-hidden">
    <div className="aspect-[4/3] bg-gradient-to-r from-[#e7f0eb] via-[#f7faf8] to-[#e7f0eb] animate-pulse" />
    <div className="p-2.5 space-y-2">
      <div className="h-3 w-4/5 rounded bg-[#d7e6de] animate-pulse" />
      <div className="h-4 w-2/5 rounded bg-[#d7e6de] animate-pulse" />
      <div className="h-9 w-full rounded-lg bg-[#d7e6de] animate-pulse" />
    </div>
  </div>
);

const FilterChip = ({ label, onRemove }) => (
  <button
    type="button"
    onClick={onRemove}
    className="group inline-flex items-center gap-1.5 pl-3 pr-2 py-2 sm:py-1.5 rounded-full bg-[#e7f0eb] border border-[#c9d9cf] text-xs font-semibold text-[#2C5E48] hover:bg-[#dce8e1] active:scale-[0.97] transition"
  >
    <span className="max-w-[45vw] truncate">{label}</span>
    <XMarkIcon className="w-3.5 h-3.5 text-[#6e947e] group-hover:text-[#2C5E48]" />
  </button>
);

const TimeUnit = ({ value, label, size = "sm" }) => {
  const lg = size === "lg";
  return (
    <div
      className={
        lg
          ? "min-w-[56px] xs:min-w-[66px] sm:min-w-[84px] bg-white/95 rounded-xl py-2.5 sm:py-3 px-2 text-center"
          : "min-w-[34px] bg-white/95 rounded-md py-1 px-1.5 text-center"
      }
    >
      <span
        className={`block font-semibold leading-none tabular-nums text-[#2C5E48] ${
          lg ? "text-2xl sm:text-4xl" : "text-sm"
        }`}
      >
        {pad(value)}
      </span>
      <span
        className={`block font-medium text-[#6d7a74] ${
          lg ? "text-[9px] sm:text-[10px] mt-1.5 sm:mt-2" : "text-[7px] mt-1"
        }`}
      >
        {label}
      </span>
    </div>
  );
};

const CountdownRow = ({ countdown, size }) => (
  <>
    {countdown.days > 0 && (
      <>
        <TimeUnit value={countdown.days} label="DAYS" size={size} />
        {size === "sm" && <span className="text-white/35">:</span>}
      </>
    )}
    <TimeUnit value={countdown.hours} label="HRS" size={size} />
    {size === "sm" && <span className="text-white/35">:</span>}
    <TimeUnit value={countdown.minutes} label="MIN" size={size} />
    {size === "sm" && <span className="text-white/35">:</span>}
    <TimeUnit value={countdown.seconds} label="SEC" size={size} />
  </>
);

const SortSelect = ({ value, onChange, id, className = "" }) => (
  <div className={`relative ${className}`}>
    <label htmlFor={id} className="sr-only">
      Sort products
    </label>
    <ArrowsUpDownIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C5E48]" />
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none pl-8 pr-8 py-2.5 rounded-lg bg-white border border-[#c9d9cf] text-xs sm:text-sm font-semibold text-[#2C5E48] outline-none focus:border-[#2C5E48] focus:ring-2 focus:ring-[#2C5E48]/15 cursor-pointer"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2C5E48]" />
  </div>
);

const BrowseButton = ({ onClick, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-1.5 font-semibold transition active:scale-[0.98] ${className}`}
  >
    Browse Other Products
    <ChevronRightIcon className="w-4 h-4" />
  </button>
);

/* ============================ PRODUCT CARD ============================ */
// Defined at module level (not inside Speed) so cards aren't remounted on every render.

const ProductCard = memo(function ProductCard({
  product,
  disabled,
  loading,
  justAdded,
  onAdd,
  onOpen,
}) {
  const price = Number(product.price) || 0;
  const oldPrice = Number(product.oldPrice) || 0;
  const soldOut = Number(product.stock) === 0;
  const discount = getDiscount(product);
  const name = product.productName || "Unnamed product";

  return (
    <article className="group flex flex-col bg-white border border-[#e6e1dc] rounded-xl overflow-hidden transition hover:border-[#c9d9cf] hover:shadow-sm">
      <div
        className="relative aspect-[4/3] flex items-center justify-center p-2 cursor-pointer"
        onClick={() => onOpen(product)}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(product);
          }
        }}
        aria-label={`View ${name}`}
      >
        {discount > 0 && !soldOut && (
          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#BB1420] text-white">
            -{discount}%
          </span>
        )}
        {soldOut && (
          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-[#234A39] text-white">
            Sold out
          </span>
        )}
        <img
          src={getImageUrl(product.productImage)}
          alt={name}
          loading="lazy"
          className={`h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03] ${
            soldOut ? "opacity-60" : ""
          }`}
        />
      </div>

      <div className="flex flex-col flex-1 gap-1.5 px-2.5 pb-2.5 pt-2 border-t border-[#f1eeea]">
        <h3 className="text-[13px] sm:text-sm font-medium text-[#2c3330] leading-snug line-clamp-2 min-h-[2.5em]">
          {name}
        </h3>

        <div className="flex items-baseline flex-wrap gap-x-2">
          <span className="text-[15px] sm:text-base font-semibold text-[#2C5E48]">
            {formatPrice(price)}
          </span>
          {discount > 0 && (
            <span className="text-[11px] text-[#8a928e] line-through">
              {formatPrice(oldPrice)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onAdd(product)}
          disabled={disabled || soldOut}
          aria-label={soldOut ? `${name} is sold out` : `Add ${name} to cart`}
          className={`mt-auto min-h-[38px] w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-2 text-xs sm:text-[13px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${
            soldOut
              ? "bg-[#f1eeea] text-[#9aa29d] border border-[#e6e1dc]"
              : justAdded
              ? "bg-[#2C5E48] text-white"
              : "bg-[#BB1420] text-white hover:bg-[#A80F1B]"
          }`}
        >
          {soldOut ? (
            "Sold out"
          ) : justAdded ? (
            <>
              <CheckIcon className="w-4 h-4 speed-pop" /> Added
            </>
          ) : loading ? (
            <>
              <span className="speed-spinner" aria-hidden="true" /> Adding…
            </>
          ) : (
            <>
              <ShoppingCartIcon className="w-4 h-4" /> Add to cart
            </>
          )}
        </button>
      </div>
    </article>
  );
});

/* ============================ MAIN COMPONENT ============================ */

const Speed = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { productsByShowroom = {}, loading } = useSelector((s) => s.products);
  const { addProductToCart, loading: cartLoading } = useAddToCart();

  const countdown = useCountdown();
  const { phase } = countdown;
  const isTeaser = phase === "before";

  const [teaserIndex, setTeaserIndex] = useState(0);
  const [teaserVisible, setTeaserVisible] = useState(true);
  const [notifyMeOn, setNotifyMeOn] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState(() => new Set());
  const [addingIds, setAddingIds] = useState(() => new Set());

  const [inputPrice, setInputPrice] = useState({ min: 0, max: MAX_PRICE });
  const [priceRange, setPriceRange] = useState([0, MAX_PRICE]);
  const [discountedOnly, setDiscountedOnly] = useState(false);
  const [brand, setBrand] = useState("");
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [notice, setNotice] = useState({ message: "", type: "success", visible: false });

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

  /* ---------- effects ---------- */

  // Rotate banner lines (a single line stays still).
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

  // Nothing is fetched while the page is still a teaser.
  useEffect(() => {
    if (isTeaser) return;
    const request = dispatch(fetchProductsByShowroom(SHOWROOM_ID));
    if (request?.then) request.then(() => setHasLoadedOnce(true));
    else setHasLoadedOnce(true);
  }, [dispatch, isTeaser]);

  useEffect(() => {
    if (isTeaser) return undefined;
    const refresh = () => dispatch(fetchProductsByShowroom({ id: SHOWROOM_ID, forceRefresh: true }));
    window.addEventListener(CATALOGUE_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CATALOGUE_UPDATED_EVENT, refresh);
  }, [dispatch, isTeaser]);

  // Lock scroll + Escape to close while the filter sheet is open.
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
  const hasNoResults = hasLoadedOnce && !loading && filteredProducts.length === 0;
  const dealsLabel = isInitialLoading
    ? ""
    : `${filteredProducts.length} ${filteredProducts.length === 1 ? "deal" : "deals"}`;

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

  const goBrowse = useCallback(() => navigate(BROWSE_ALL_URL), [navigate]);
  const openProduct = useCallback((product) => navigate(getProductUrl(product)), [navigate]);

  // Same flow as Deals: await addProductToCart, then notify.
  // The extra state only drives the per-card cart icon (spinner -> check).
  const handleAddToCart = useCallback(
    async (product) => {
      const id = product.productID || product.id;
      setAddingIds((prev) => new Set(prev).add(id));
      try {
        await addProductToCart(product);
        showNotice("Added to cart successfully", "success");
        setRecentlyAdded((prev) => new Set(prev).add(id));
        setTimeout(() => {
          setRecentlyAdded((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 1600);
      } catch (error) {
        const feedback = cartAddFeedback(error);
        showNotice(feedback.message, feedback.type);
      } finally {
        setAddingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [addProductToCart, showNotice]
  );

  const handleNotifyMe = () => {
    setNotifyMeOn(true);
    showNotice("Reminder set — we'll flash it here the moment the sale opens");
  };

  /* ---------- filters panel (sidebar + sheet) ---------- */

  const panel = "bg-white border border-[#e6e1dc] rounded-lg p-4";
  const priceInput =
    "w-full pl-6 pr-2 py-2.5 border border-[#e6e1dc] rounded-lg text-sm outline-none focus:border-[#2C5E48] focus:ring-2 focus:ring-[#2C5E48]/15";

  const renderFilters = () => (
    <div className="flex flex-col gap-3">
      <div className={panel}>
        <h3 className="text-sm font-semibold mb-3">Sort by</h3>
        <SortSelect
          id="speed-sort-drawer"
          value={sortBy}
          onChange={(v) => {
            setSortBy(v);
            setPage(1);
          }}
        />
      </div>

      <div className={panel}>
        <h3 className="text-sm font-semibold mb-3">Price range</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {["min", "max"].map((key) => (
            <label key={key} className="text-[10px] font-semibold uppercase tracking-wide text-[#6d7a74]">
              {key}
              <div className="relative mt-1">
                <span className="absolute left-2 top-2.5 text-xs text-[#8a928e]">₵</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={inputPrice[key]}
                  onChange={(e) => setInputPrice((p) => ({ ...p, [key]: e.target.value }))}
                  className={priceInput}
                />
              </div>
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={applyPriceFilter}
          className="w-full min-h-[44px] bg-[#2C5E48] text-white text-sm font-semibold rounded-lg hover:bg-[#234A39] active:scale-[0.98] transition"
        >
          Apply price
        </button>
      </div>

      <div className={`${panel} flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2 text-sm font-semibold min-w-0">
          <span className="w-7 h-7 rounded-lg bg-[#e7f0eb] flex items-center justify-center text-[#2C5E48] flex-shrink-0">
            <TagIcon className="h-4 w-4" />
          </span>
          <span className="truncate">Discounted only</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={discountedOnly}
          aria-label="Show discounted products only"
          onClick={() => {
            setDiscountedOnly((v) => !v);
            setPage(1);
          }}
          className={`relative w-11 h-6 rounded-full p-0.5 transition-colors flex-shrink-0 ${
            discountedOnly ? "bg-[#2C5E48]" : "bg-[#ddd8d2]"
          }`}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              discountedOnly ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      {brands.length > 0 && (
        <div className={panel}>
          <h3 className="text-sm font-semibold mb-3">Brands</h3>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <button
                type="button"
                key={b}
                aria-pressed={brand === b}
                onClick={() => {
                  setBrand(brand === b ? "" : b);
                  setPage(1);
                }}
                className={`px-3 py-2 min-h-[38px] text-xs rounded-full border font-medium transition active:scale-[0.97] ${
                  brand === b
                    ? "bg-[#2C5E48] text-white border-[#2C5E48]"
                    : "bg-white text-[#5c6661] border-[#e6e1dc] hover:border-[#8aaf98]"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      <BrowseButton
        onClick={goBrowse}
        className="w-full min-h-[44px] bg-white border border-[#c9d9cf] text-[#2C5E48] rounded-lg text-sm hover:bg-[#e7f0eb]"
      />

      {filtersActive && (
        <button
          type="button"
          onClick={resetFilters}
          className="w-full min-h-[44px] bg-white text-[#8C3D45] border border-[#e4cfd1] rounded-lg text-sm font-semibold hover:bg-[#f6eeee] active:scale-[0.98] transition"
        >
          Reset all filters
        </button>
      )}
    </div>
  );

  const gridClass =
    "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-4";

  /* ============================ RENDER ============================ */

  return (
    <>
      <Helmet>
        <title>
          {isTeaser
            ? "Speed Shopping drops 2 October | Franko Trading"
            : "Speed Shopping – Extended Until 6:00 PM Today | Franko Trading"}
        </title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </Helmet>

      <style>{`
        @keyframes speedSlideIn { from { transform: translateY(-12px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes speedLivePing { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes speedPop { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes speedSheetUp { from { transform: translateY(100%); } to { transform: none; } }
        @keyframes speedDrawerIn { from { transform: translateX(-100%); } to { transform: none; } }
        @keyframes speedSpin { to { transform: rotate(360deg); } }
        .speed-banner { background: linear-gradient(90deg, #A80F1B 0%, #BB1420 50%, #A80F1B 100%); }
        .speed-green { background: #2A5644; }
        .speed-pop { animation: speedPop 0.28s ease-out; }
        .speed-sheet { animation: speedSheetUp 0.26s cubic-bezier(0.22,1,0.36,1); }
        @media (min-width: 640px) { .speed-sheet { animation: speedDrawerIn 0.25s ease-out; } }
        .speed-spinner { width: 14px; height: 14px; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 9999px; animation: speedSpin 0.7s linear infinite; }
        .speed-sticky { position: sticky; top: 0; z-index: 30; }
        /* Inputs under 16px make iOS zoom in */
        .speed-scroll input, .speed-scroll select { font-size: 16px; }
        @media (min-width: 640px) { .speed-scroll input, .speed-scroll select { font-size: inherit; } }
        @media (prefers-reduced-motion: reduce) {
          .speed-pop, .speed-sheet, .speed-spinner { animation: none !important; }
          article, article * { transition: none !important; }
        }
      `}</style>

      <Notification
        message={notice.message}
        type={notice.type}
        visible={notice.visible}
        onClose={hideNotice}
      />

      <div className="speed-scroll min-h-screen bg-[#f7f5f3] text-[#2c3330]">
        <div className="mx-auto w-full max-w-[1800px] px-2.5 sm:px-5 lg:px-8 py-3">
          {/* ---------- Banner ---------- */}
          <header className="speed-banner flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 md:px-5 rounded-xl border border-[#A80F1B]">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={speedLogo}
                alt="Franko Speed Shopping"
                className="h-12 sm:h-16 w-auto flex-shrink-0 object-contain"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-lg lg:text-2xl font-semibold text-white leading-tight">
                    Franko <span className="text-[#FFD400]">Speed Shopping</span>
                  </h1>
                  {phase === "live" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFD400] text-[#234A39] text-[10px] sm:text-[11px] font-bold uppercase tracking-wide shadow-sm">
                      <SparklesIcon className="w-3.5 h-3.5" />
                      {EXTENSION_BADGE}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-0.5 text-[12px] lg:text-[13px] text-white/90 transition-opacity duration-200 ${
                    teaserVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {activeLine}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
              {phase !== "ended" ? (
                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto bg-black/10 md:bg-transparent px-3 md:px-0 py-2 md:py-0 rounded-lg">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-1.5 text-white text-[10px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap">
                      {phase === "live" && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span
                            className="absolute inline-flex h-full w-full rounded-full bg-[#FFD400] opacity-70"
                            style={{ animation: "speedLivePing 1.8s cubic-bezier(0,0,0.2,1) infinite" }}
                          />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FFD400]" />
                        </span>
                      )}
                      {phase === "live" ? "Extended · Ends 6 PM" : "Drops in"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CountdownRow countdown={countdown} size="sm" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg">
                  <SparklesIcon className="w-4 h-4 text-[#FFD400]" />
                  <span className="text-xs font-medium text-[#F0E2C4]">Sale ended</span>
                </div>
              )}

              {isTeaser && (
                <button
                  type="button"
                  onClick={handleNotifyMe}
                  disabled={notifyMeOn}
                  className={`w-full sm:w-auto min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 rounded-lg text-xs font-semibold whitespace-nowrap transition active:scale-[0.98] ${
                    notifyMeOn
                      ? "bg-white/10 text-[#F0E2C4] cursor-default"
                      : "bg-[#FFD400] text-[#234A39] hover:bg-[#e6bf00]"
                  }`}
                >
                  {notifyMeOn ? <BellAlertIcon className="w-4 h-4 speed-pop" /> : <BellIcon className="w-4 h-4" />}
                  {notifyMeOn ? "Reminder set" : "Remind me"}
                </button>
              )}

              <BrowseButton
                onClick={goBrowse}
                className="hidden md:inline-flex px-4 py-2 rounded-lg bg-white/10 text-white text-xs hover:bg-white/15 whitespace-nowrap"
              />
            </div>

            {!isTeaser && (
              <BrowseButton
                onClick={goBrowse}
                className="md:hidden w-full min-h-[40px] px-3 rounded-lg bg-white/10 text-white text-xs hover:bg-white/15"
              />
            )}
          </header>

          {/* ---------- Teaser ---------- */}
          {isTeaser ? (
            <section className="mt-4 sm:mt-5">
              <div className="speed-green rounded-2xl border border-[#234A39] px-5 py-12 sm:py-16 text-center">
                <div className="max-w-lg mx-auto flex flex-col items-center">
                  <img
                    src={speedLogo}
                    alt="Franko Speed Shopping"
                    className="h-24 sm:h-32 w-auto object-contain"
                  />
                  <h2 className="mt-6 text-3xl font-semibold text-white tracking-tight">
                    Coming soon
                  </h2>
                  <p className="mt-2 text-sm text-[#d5e4db]">
                    Speed Shopping starts on {LAUNCH_LABEL}
                  </p>

                  <div className="mt-7 flex items-center justify-center gap-2 sm:gap-3">
                    <CountdownRow countdown={countdown} size="lg" />
                  </div>

                  <div className="mt-7 flex flex-col xs:flex-row items-stretch justify-center gap-3 w-full xs:w-auto">
                    <button
                      type="button"
                      onClick={handleNotifyMe}
                      disabled={notifyMeOn}
                      className={`min-h-[46px] inline-flex items-center justify-center gap-2 px-5 rounded-lg text-sm font-semibold transition active:scale-[0.98] ${
                        notifyMeOn
                          ? "bg-white/10 text-white cursor-default"
                          : "bg-[#FFD400] text-[#234A39] hover:bg-[#e6bf00]"
                      }`}
                    >
                      {notifyMeOn ? <BellAlertIcon className="w-4 h-4 speed-pop" /> : <BellIcon className="w-4 h-4" />}
                      {notifyMeOn ? "Reminder set" : "Remind me"}
                    </button>
                    <BrowseButton
                      onClick={goBrowse}
                      className="min-h-[46px] px-5 rounded-lg bg-white/10 border border-white/20 text-white text-sm hover:bg-white/15"
                    />
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* ---------- Sticky toolbar (mobile + tablet) ---------- */}
              <div className="speed-sticky lg:hidden -mx-2.5 sm:-mx-5 px-2.5 sm:px-5 pt-3 pb-2.5 bg-[#f7f5f3]/95 backdrop-blur-sm border-b border-[#e6e1dc]">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Open filters"
                    className="relative flex-shrink-0 min-h-[44px] inline-flex items-center gap-1.5 px-3 sm:px-4 rounded-lg bg-[#2C5E48] text-white text-xs sm:text-sm font-semibold active:scale-[0.98] transition"
                  >
                    <FunnelIcon className="w-4 h-4" />
                    <span className="hidden xs:inline">Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FFD400] text-[10px] font-bold text-[#234A39] flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                  <SortSelect
                    id="speed-sort-toolbar"
                    value={sortBy}
                    onChange={handleSortChange}
                    className="flex-1 min-w-0"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#6d7a74]">
                  <span>{dealsLabel}</span>
                  {sortBy !== DEFAULT_SORT && (
                    <button
                      type="button"
                      onClick={() => handleSortChange(DEFAULT_SORT)}
                      className="font-semibold text-[#8C3D45] hover:underline"
                    >
                      Reset sort
                    </button>
                  )}
                </div>
              </div>

              {/* ---------- Filter sheet ---------- */}
              {drawerOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
                  <div className="absolute inset-0 bg-black/45" onClick={() => setDrawerOpen(false)} />
                  <div className="speed-sheet absolute inset-x-0 bottom-0 sm:right-auto sm:top-0 sm:w-[340px] sm:max-w-[88vw] max-h-[86vh] sm:max-h-full bg-[#f7f5f3] rounded-t-2xl sm:rounded-none overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 bg-white border-b border-[#f1eeea]">
                      <span className="text-base sm:text-lg font-semibold">Filters &amp; sort</span>
                      <button
                        type="button"
                        onClick={() => setDrawerOpen(false)}
                        className="p-2 -mr-2 rounded-lg hover:bg-[#f7f5f3] active:scale-95 transition"
                        aria-label="Close filters"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4">
                      {renderFilters()}
                    </div>
                    <div
                      className="grid grid-cols-2 gap-2.5 px-4 sm:px-5 py-3 bg-white border-t border-[#f1eeea]"
                      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
                    >
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="min-h-[46px] rounded-lg border border-[#e4cfd1] text-[#8C3D45] text-sm font-semibold hover:bg-[#f6eeee] active:scale-[0.98] transition"
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
                        className="min-h-[46px] rounded-lg bg-[#2C5E48] text-white text-sm font-semibold hover:bg-[#234A39] active:scale-[0.98] transition"
                      >
                        Show {filteredProducts.length} results
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------- Main layout ---------- */}
              <div className="flex gap-5 mt-3 sm:mt-5">
                <aside className="hidden lg:block w-60 xl:w-64 flex-shrink-0">
                  <div className="sticky top-5">{renderFilters()}</div>
                </aside>

                <main className="flex-1 min-w-0">
                  <div ref={gridTopRef} className="scroll-mt-24" />

                  <div className="hidden lg:flex items-center justify-between gap-4 mb-4">
                    <p className="text-sm text-[#6d7a74]">
                      {isInitialLoading ? (
                        ""
                      ) : (
                        <>
                          <span className="font-semibold text-[#2c3330]">{filteredProducts.length}</span>{" "}
                          {filteredProducts.length === 1 ? "deal" : "deals"} found
                          {totalPages > 1 && (
                            <span className="text-[#8a928e]"> · page {safePage} of {totalPages}</span>
                          )}
                        </>
                      )}
                    </p>
                    <SortSelect
                      id="speed-sort-desktop"
                      value={sortBy}
                      onChange={handleSortChange}
                      className="w-56"
                    />
                  </div>

                  {filtersActive && !isInitialLoading && (
                    <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
                      {!priceIsDefault && (
                        <FilterChip
                          label={`${formatPrice(priceRange[0])} – ${formatPrice(priceRange[1])}`}
                          onRemove={removePrice}
                        />
                      )}
                      {discountedOnly && (
                        <FilterChip label="Discounted only" onRemove={() => setDiscountedOnly(false)} />
                      )}
                      {brand && <FilterChip label={brand} onRemove={() => setBrand("")} />}
                      {sortBy !== DEFAULT_SORT && (
                        <FilterChip
                          label={SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                          onRemove={() => setSortBy(DEFAULT_SORT)}
                        />
                      )}
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="text-xs font-semibold text-[#8C3D45] hover:underline ml-1 py-1"
                      >
                        Clear all
                      </button>
                    </div>
                  )}

                  {isInitialLoading && (
                    <div className={gridClass}>
                      {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, i) => (
                        <SkeletonCard key={i} />
                      ))}
                    </div>
                  )}

                  {!isInitialLoading && currentProducts.length > 0 && (
                    <>
                      <div className={gridClass}>
                        {currentProducts.map((product) => {
                          const id = product.productID || product.id;
                          return (
                            <ProductCard
                              key={id}
                              product={product}
                              disabled={cartLoading || addingIds.has(id)}
                              loading={addingIds.has(id)}
                              justAdded={recentlyAdded.has(id)}
                              onAdd={handleAddToCart}
                              onOpen={openProduct}
                            />
                          );
                        })}
                      </div>

                      {totalPages > 1 && (
                        <div className="flex justify-center mt-6 sm:mt-8">
                          <CircularPagination
                            currentPage={safePage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                          />
                        </div>
                      )}

                      <div className="flex justify-center mt-6 sm:mt-8">
                        <BrowseButton
                          onClick={goBrowse}
                          className="w-full xs:w-auto min-h-[46px] px-5 rounded-full border border-[#c9d9cf] bg-white text-[#2C5E48] text-sm hover:bg-[#e7f0eb]"
                        />
                      </div>
                    </>
                  )}

                  {hasNoResults && (
                    <div className="bg-white border border-[#e6e1dc] rounded-xl p-8 sm:p-12 text-center">
                      <h2 className="text-xl sm:text-2xl font-semibold text-[#2C5E48] mb-2">
                        {filtersActive
                          ? "No matches for these filters"
                          : phase === "ended"
                          ? "Speed Shopping is closed"
                          : "Browse our latest deals"}
                      </h2>
                      <p className="text-[#6d7a74] text-sm max-w-md mx-auto mb-6">
                        {filtersActive
                          ? "Try widening your price range or clearing a filter to see more deals."
                          : phase === "ended"
                          ? "The extended promotion window has closed. The rest of the store is open as usual."
                          : "The first batch is being uploaded now. Refresh in a moment, or explore the rest of the store."}
                      </p>
                      <div className="flex flex-col xs:flex-row items-stretch justify-center gap-3">
                        {filtersActive && (
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="min-h-[46px] px-6 rounded-lg bg-[#2C5E48] text-white text-sm font-semibold hover:bg-[#234A39] active:scale-[0.98] transition"
                          >
                            Clear all filters
                          </button>
                        )}
                        <BrowseButton
                          onClick={goBrowse}
                          className={`min-h-[46px] px-6 rounded-lg text-sm ${
                            filtersActive
                              ? "border border-[#c9d9cf] text-[#2C5E48] hover:bg-[#e7f0eb]"
                              : "bg-[#2C5E48] text-white hover:bg-[#234A39]"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </main>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Speed;