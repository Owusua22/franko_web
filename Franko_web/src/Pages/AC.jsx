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
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import {
  ShoppingCartIcon,
  CheckIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

import { fetchProductsByCategory } from "../Redux/Slice/productSlice";
import { CircularPagination } from "../Component/CircularPagination";
import useAddToCart from "../Component/Cart";
import { CATALOGUE_UPDATED_EVENT } from "../Component/CatalogueSync";

/* ============================ CONFIG ============================ */

const CATEGORY_ID = "db54033b-e95d-4a6c-8744-45e4d462c19e";
const PRODUCTS_PER_PAGE = 10;
const MAX_PRICE = 200000;

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

/* ============================ HELPERS ============================ */

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

/* ============================ PRODUCT CARD ============================ */
// Defined at module level (exact match to Speed page card UI).

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
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://via.placeholder.com/500";
          }}
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

const Airconditioners = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { productsByCategory = {}, loading } = useSelector((s) => s.products);
  const { addProductToCart, loading: cartLoading } = useAddToCart();

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

  const products = useMemo(
    () => productsByCategory?.[CATEGORY_ID] || [],
    [productsByCategory]
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

  useEffect(() => {
    window.scrollTo?.({ top: 0, behavior: "smooth" });
    const request = dispatch(fetchProductsByCategory(CATEGORY_ID));
    if (request?.then) request.then(() => setHasLoadedOnce(true));
    else setHasLoadedOnce(true);
  }, [dispatch]);

  useEffect(() => {
    const refresh = () => dispatch(fetchProductsByCategory({ id: CATEGORY_ID, forceRefresh: true }));
    window.addEventListener(CATALOGUE_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CATALOGUE_UPDATED_EVENT, refresh);
  }, [dispatch]);

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
  const countLabel = isInitialLoading
    ? ""
    : `${filteredProducts.length} ${
        filteredProducts.length === 1 ? "air conditioner" : "air conditioners"
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

  const openProduct = useCallback((product) => navigate(getProductUrl(product)), [navigate]);

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

  /* ---------- filters panel (sidebar + sheet — exact Speed page UI) ---------- */

  const panel = "bg-white border border-[#e6e1dc] rounded-lg p-4";
  const priceInput =
    "w-full pl-6 pr-2 py-2.5 border border-[#e6e1dc] rounded-lg text-sm outline-none focus:border-[#2C5E48] focus:ring-2 focus:ring-[#2C5E48]/15";

  const renderFilters = () => (
    <div className="flex flex-col gap-3">
      <div className={panel}>
        <h3 className="text-sm font-semibold mb-3">Sort by</h3>
        <SortSelect
          id="ac-sort-drawer"
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
            <label
              key={key}
              className="text-[10px] font-semibold uppercase tracking-wide text-[#6d7a74]"
            >
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
        <title>Buy Air Conditioners Online - Best Prices in Ghana | Franko Trading</title>
        <meta
          name="description"
          content="Explore the best air conditioners in Ghana. Find top brands at affordable prices and enjoy fast delivery."
        />
        <meta
          name="keywords"
          content="Air Conditioners, Buy AC Online, Best AC Brands in Ghana, Affordable Air Conditioners"
        />
        <meta
          property="og:title"
          content="Buy Air Conditioners Online - Best Prices in Ghana"
        />
        <meta
          property="og:description"
          content="Find top air conditioner brands at unbeatable prices. Shop now for fast delivery in Ghana."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.frankotrading.com/air-condition" />
        <meta
          property="og:image"
          content={
            filteredProducts.length > 0
              ? getImageUrl(filteredProducts[0].productImage)
              : "default-image-url"
          }
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Buy Air Conditioners Online - Best Prices in Ghana"
        />
        <meta
          name="twitter:description"
          content="Shop the best air conditioners at unbeatable prices with fast delivery in Ghana."
        />
        <meta
          name="twitter:image"
          content={
            filteredProducts.length > 0
              ? getImageUrl(filteredProducts[0].productImage)
              : "default-image-url"
          }
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Air Conditioners",
            description: "Shop high-quality air conditioners from top brands.",
            url: "https://www.frankotrading.com/air-condition",
            itemListElement: filteredProducts.map((item, index) => ({
              "@type": "Product",
              position: index + 1,
              name: item.productName,
              description: item.description,
              sku: item.productID,
              image: getImageUrl(item.productImage),
              brand: {
                "@type": "Brand",
                name: item.brandName,
              },
              offers: {
                "@type": "Offer",
                priceCurrency: "GHS",
                price: item.price,
                priceValidUntil: "2026-12-31",
                itemCondition: "https://schema.org/NewCondition",
                availability: "https://schema.org/InStock",
                url: `https://www.frankotrading.com${getProductUrl(item)}`,
                seller: {
                  "@type": "Organization",
                  name: "Franko Trading",
                },
                shippingDetails: {
                  "@type": "OfferShippingDetails",
                  shippingRate: {
                    "@type": "MonetaryAmount",
                    currency: "GHS",
                    value: "30.00",
                  },
                  shippingDestination: {
                    "@type": "DefinedRegion",
                    addressCountry: "GH",
                  },
                  deliveryTime: {
                    "@type": "ShippingDeliveryTime",
                    handlingTime: {
                      "@type": "QuantitativeValue",
                      minValue: 1,
                      maxValue: 2,
                      unitCode: "DAY",
                    },
                    transitTime: {
                      "@type": "QuantitativeValue",
                      minValue: 3,
                      maxValue: 5,
                      unitCode: "DAY",
                    },
                  },
                },
                hasMerchantReturnPolicy: {
                  "@type": "MerchantReturnPolicy",
                  returnPolicyCategory:
                    "https://schema.org/MerchantReturnFiniteReturnWindow",
                  merchantReturnDays: 14,
                  returnMethod: "https://schema.org/ReturnByMail",
                  returnFees: "https://schema.org/FreeReturn",
                  applicableCountry: "GH",
                },
              },
            })),
          })}
        </script>
      </Helmet>

      <style>{`
        @keyframes speedSlideIn { from { transform: translateY(-12px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes speedPop { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes speedSheetUp { from { transform: translateY(100%); } to { transform: none; } }
        @keyframes speedDrawerIn { from { transform: translateX(-100%); } to { transform: none; } }
        @keyframes speedSpin { to { transform: rotate(360deg); } }
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
          {/* ---------- Page Header ---------- */}
          <header className="flex items-center justify-between gap-3 bg-white border border-[#e6e1dc] rounded-xl px-4 py-3.5 md:px-5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-1.5 h-8 rounded-full bg-[#2C5E48] flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[#2c3330] leading-tight truncate">
                  {brand ? `${brand} Air Conditioners` : "Air Conditioners"}
                </h1>
                <p className="mt-0.5 text-xs text-[#6d7a74]">
                  {isInitialLoading
                    ? ""
                    : `${filteredProducts.length} ${
                        filteredProducts.length === 1 ? "product" : "products"
                      } available`}
                </p>
              </div>
            </div>
          </header>

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
                id="ac-sort-toolbar"
                value={sortBy}
                onChange={handleSortChange}
                className="flex-1 min-w-0"
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#6d7a74]">
              <span>{countLabel}</span>
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
            <div
              className="fixed inset-0 z-50 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
            >
              <div
                className="absolute inset-0 bg-black/45"
                onClick={() => setDrawerOpen(false)}
              />
              <div className="speed-sheet absolute inset-x-0 bottom-0 sm:right-auto sm:top-0 sm:w-[340px] sm:max-w-[88vw] max-h-[86vh] sm:max-h-full bg-[#f7f5f3] rounded-t-2xl sm:rounded-none overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 bg-white border-b border-[#f1eeea]">
                  <span className="text-base sm:text-lg font-semibold">
                    Filters &amp; sort
                  </span>
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
                      <span className="font-semibold text-[#2c3330]">
                        {filteredProducts.length}
                      </span>{" "}
                      {filteredProducts.length === 1
                        ? "air conditioner"
                        : "air conditioners"}{" "}
                      found
                      {totalPages > 1 && (
                        <span className="text-[#8a928e]">
                          {" "}
                          · page {safePage} of {totalPages}
                        </span>
                      )}
                    </>
                  )}
                </p>
                <SortSelect
                  id="ac-sort-desktop"
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
                    <FilterChip
                      label="Discounted only"
                      onRemove={() => setDiscountedOnly(false)}
                    />
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
                </>
              )}

              {hasNoResults && (
                <div className="bg-white border border-[#e6e1dc] rounded-xl p-8 sm:p-12 text-center">
                  <h2 className="text-xl sm:text-2xl font-semibold text-[#2C5E48] mb-2">
                    {filtersActive
                      ? "No matches for these filters"
                      : "No air conditioners available"}
                  </h2>
                  <p className="text-[#6d7a74] text-sm max-w-md mx-auto mb-6">
                    {filtersActive
                      ? "Try widening your price range or clearing a filter to see more air conditioners."
                      : "We don't have any air conditioners available at the moment. Please check back later."}
                  </p>
                  {filtersActive && (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="min-h-[46px] px-6 rounded-lg bg-[#2C5E48] text-white text-sm font-semibold hover:bg-[#234A39] active:scale-[0.98] transition"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default Airconditioners;
