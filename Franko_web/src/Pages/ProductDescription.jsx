import ProductDetailSkeleton from "../Component/ProductDetailSkeleton";
import { rememberedProduct, freshProductDetails } from "../utils/productMemory.mjs";
import { displayProductTag } from "../utils/productPresentation.mjs";
import { indexedProduct } from "../utils/productRouteIndex.mjs";
import { appStorage as localStorage } from "../utils/secureLocalStorageInit";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { Image, Divider } from "antd";
import { fetchProductById, fetchProducts } from "../Redux/Slice/productSlice";
import {
  updateCartItem,
  deleteCartItem,
  getCartById,
  addToCart,
  getOrCreateCartId,
} from "../Redux/Slice/cartSlice";
import Tooltip from "@material-tailwind/react/components/Tooltip";
import Drawer from "@material-tailwind/react/components/Drawer";
import {
  ShoppingCartIcon,
  CheckCircleIcon,
  HeartIcon as SolidHeartIcon,
  EyeIcon,
  TruckIcon,
  ShieldCheckIcon,
  PhoneIcon,
  CreditCardIcon,
  TrashIcon,
  MinusIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import AuthModal from "../Component/AuthModal";
import { Helmet } from "react-helmet";
import { useResolvedSeo } from "../Component/RouteSeoContext";
import {
  slugify,
  isUUID,
  getProductSlug,
  findProductBySlug,
  findProductById,
} from "../utils/productSlug";

// ==================== UTILITY FUNCTIONS ====================

const formatPrice = (price) => {
  if (!price || isNaN(price)) return "0.00";
  return Number(price).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getValidImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") {
    return "https://via.placeholder.com/150";
  }
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const base = "https://testing.frankotrading.com/Media/Products_Images/";
  if (imagePath.includes("\\")) return base + imagePath.split("\\").pop();
  if (imagePath.includes("/")) return base + imagePath.split("/").pop();
  return base + imagePath;
};

const getItemLineTotal = (item) => {
  const price = parseFloat(item.price) || 0;
  const quantity = parseInt(item.quantity, 10) || 1;
  return price * quantity;
};

const normalizeCartItem = (item) => {
  if (!item || typeof item !== "object") return null;
  const price =
    parseFloat(
      item.price ?? item.Price ?? item.unitPrice ?? item.UnitPrice ?? 0
    ) || 0;
  const quantity = parseInt(item.quantity ?? item.Quantity ?? 1, 10) || 1;
  const productId =
    item.productId ??
    item.ProductId ??
    item.productID ??
    item.ProductID ??
    item.id ??
    item.Id;
  if (productId === undefined || productId === null || productId === "") {
    return null;
  }
  return {
    productId: String(productId),
    productName:
      item.productName ??
      item.ProductName ??
      item.name ??
      item.Name ??
      "Product",
    imagePath:
      item.imagePath ??
      item.ImagePath ??
      item.productImage ??
      item.ProductImage ??
      item.image ??
      item.Image ??
      "",
    price,
    quantity,
    total: price * quantity,
    cartId: item.cartId ?? item.CartId ?? null,
    customerId: item.customerId ?? item.CustomerId ?? null,
  };
};

const normalizeCartItems = (items) =>
  (Array.isArray(items) ? items : []).map(normalizeCartItem).filter(Boolean);

const upsertCartItem = (items, itemToAdd) => {
  const incoming = normalizeCartItem(itemToAdd);
  if (!incoming) return normalizeCartItems(items);
  const current = normalizeCartItems(items);
  const existingIndex = current.findIndex(
    (item) => String(item.productId) === String(incoming.productId)
  );
  if (existingIndex === -1) return [...current, incoming];
  const next = [...current];
  const existing = next[existingIndex];
  const quantity = existing.quantity + incoming.quantity;
  next[existingIndex] = {
    ...existing,
    ...incoming,
    quantity,
    total: existing.price * quantity,
  };
  return next;
};

const mergeCartItemsKeepingAddedItem = (serverItems, preservedItems = []) => {
  const merged = normalizeCartItems(serverItems);
  normalizeCartItems(preservedItems).forEach((preservedItem) => {
    const alreadyReturnedByServer = merged.some(
      (item) => String(item.productId) === String(preservedItem.productId)
    );
    if (!alreadyReturnedByServer) merged.push(preservedItem);
  });
  return merged;
};

// ==================== SAFE LOCALSTORAGE ====================

const safeLocalStorage = {
  getItem: (key, defaultValue = null) => {
    try {
      if (typeof window === "undefined" || !localStorage) {
        return defaultValue;
      }
      const item = localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      if (typeof item === "object") return item;
      if (typeof item === "string") {
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof window === "undefined" || !localStorage) return false;
      localStorage.setItem(
        key,
        typeof value === "string" ? value : JSON.stringify(value)
      );
      return true;
    } catch {
      return false;
    }
  },
};

// ==================== MAIN COMPONENT ====================

const ProductDescription = () => {
  // NEW: slug-based routing. Supports both /product/:slug and legacy /product/:productID (UUID)
  // Raw param can be either a UUID or a human-readable slug like "samsung-galaxy-a56-5g"
  const params = useParams();
  const rawParam = params.slug || params.productID || params.productId || "";

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showStickyCart, setShowStickyCart] = useState(false);
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [updatingQuantity, setUpdatingQuantity] = useState({});
  const [removingItem, setRemovingItem] = useState({});
  const [_flixMediaLoaded, setFlixMediaLoaded] = useState(false);
  const [flixMediaError, setFlixMediaError] = useState(false);
  const [cartSyncError, setCartSyncError] = useState(null);
  const [networkStatus, setNetworkStatus] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [_pendingCheckout, setPendingCheckout] = useState(false);
  const [viewedProducts, setViewedProducts] = useState([]);
  const [localCart, setLocalCart] = useState(() =>
    normalizeCartItems(safeLocalStorage.getItem("cart", []))
  );
  const [cartLoading, setCartLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [slugResolveError, setSlugResolveError] = useState(null);

  const productDetailsRef = useRef(null);
  const flixMediaSectionRef = useRef(null);
  const localCartRef = useRef(localCart);
  const networkStatusRef = useRef(networkStatus);
  const cartSyncRequestRef = useRef(0);
  const hasHydratedReduxCartRef = useRef(false);

  const { currentProduct: storedProduct, products, productDetailLoading, productDetailError, error: catalogueError } = useSelector(
    (state) => state.products
  );
  const { cart, cartId } = useSelector((state) => state.cart);

  // Derived: does rawParam look like a legacy UUID?
  const paramIsUUID = useMemo(() => isUUID(rawParam), [rawParam]);

  // Derived: resolve rawParam -> product object -> UUID
  // For slug: lookup via productName slugify. For UUID: direct lookup.
  const resolvedProduct = useMemo(() => {
    if (!rawParam) return null;
    const available = rememberedProduct(rawParam);
    if (available) return available;
    const indexed = indexedProduct(rawParam);
    if (indexed) return indexed;
    if (!Array.isArray(products) || products.length === 0) return null;
    if (paramIsUUID) {
      return findProductById(products, rawParam);
    }
    return findProductBySlug(products, rawParam);
  }, [rawParam, paramIsUUID, products]);

  const resolvedProductId = useMemo(() => {
    if (!resolvedProduct) return null;
    return String(resolvedProduct.productID || resolvedProduct.Productid || "");
  }, [resolvedProduct]);

  // Card data resolves identity immediately, but only successful full detail
  // responses render the page. Until then the destination shows its skeleton.
  const product = useMemo(
    () => freshProductDetails(resolvedProductId || rawParam),
    // storedProduct is the Redux signal that productMemory received fresh detail data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storedProduct, resolvedProductId, rawParam]
  );
  const currentProduct = useMemo(() => product ? [product] : [], [product]);

  // Canonical slug for the loaded product (for SEO)
  const canonicalSlug = useMemo(() => {
    if (product) return getProductSlug(product, products);
    if (resolvedProduct) return getProductSlug(resolvedProduct, products);
    if (!paramIsUUID && rawParam) return slugify(rawParam);
    return "";
  }, [product, resolvedProduct, products, paramIsUUID, rawParam]);

  const canonicalUrl = product && canonicalSlug
    ? `https://www.frankotrading.com/product/${canonicalSlug}`
    : "";

  useResolvedSeo({ canonical: canonicalUrl || null, robots: product && Number(product.status) === 1 ? "index, follow" : "noindex, follow" });

  // Build combined list of main productImage + otherImages
  const allProductImages = useMemo(() => {
    if (!currentProduct?.length) return [];
    const prod = currentProduct[0];
    const rawImages = [
      prod.productImage,
      ...(Array.isArray(prod.otherImages) ? prod.otherImages : []),
    ].filter((img) => typeof img === "string" && img.trim() !== "");
    const resolvedUrls = rawImages.map((img) => getValidImageUrl(img));
    const uniqueUrls = [...new Set(resolvedUrls)];
    return uniqueUrls.length > 0
      ? uniqueUrls
      : ["https://via.placeholder.com/150"];
  }, [currentProduct]);

  // Reset selected image index when navigating to a new product
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [rawParam, currentProduct]);

  const commitLocalCart = useCallback((items) => {
    const normalizedCart = normalizeCartItems(items);
    localCartRef.current = normalizedCart;
    setLocalCart(normalizedCart);
    safeLocalStorage.setItem("cart", normalizedCart);
  }, []);

  const getActiveCartId = useCallback(() => {
    const activeId = getOrCreateCartId();
    safeLocalStorage.setItem("cartId", activeId);
    return activeId;
  }, []);

  // ==================== NETWORK STATUS ====================

  useEffect(() => {
    networkStatusRef.current = networkStatus;
  }, [networkStatus]);

  useEffect(() => {
    const handleOnline = () => {
      networkStatusRef.current = true;
      setNetworkStatus(true);
      setCartSyncError(null);
    };
    const handleOffline = () => {
      networkStatusRef.current = false;
      setNetworkStatus(false);
      setCartSyncError(
        "You're offline. Changes will sync when connection is restored."
      );
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ==================== CART SYNC ====================

  const refreshCartFromDatabase = useCallback(
    async ({ preserveItems = [], silent = false } = {}) => {
      if (!networkStatusRef.current) {
        return { ok: false, reason: "offline", items: localCartRef.current };
      }
      getActiveCartId();
      const requestId = ++cartSyncRequestRef.current;
      try {
        const result = await dispatch(getCartById()).unwrap();
        if (requestId !== cartSyncRequestRef.current) {
          return { ok: true, ignored: true, items: localCartRef.current };
        }
        if (!Array.isArray(result)) {
          if (!silent) {
            setCartSyncError(
              "Your cart could not be refreshed. Please try again."
            );
          }
          return {
            ok: false,
            reason: "invalid-response",
            items: localCartRef.current,
          };
        }
        const serverItems = normalizeCartItems(result);
        const nextCart = mergeCartItemsKeepingAddedItem(
          serverItems,
          preserveItems
        );
        commitLocalCart(nextCart);
        setCartSyncError(null);
        return { ok: true, items: nextCart };
      } catch (error) {
        console.error("Cart sync failed:", error);
        if (!silent) {
          setCartSyncError(
            "Your cart is still available on this page. We will retry syncing it when the connection is restored."
          );
        }
        return {
          ok: false,
          reason: "request-failed",
          error,
          items: localCartRef.current,
        };
      }
    },
    [commitLocalCart, dispatch, getActiveCartId]
  );

  useEffect(() => {
    if (networkStatus) {
      void refreshCartFromDatabase({ silent: true });
    }
  }, [cartId, networkStatus, refreshCartFromDatabase]);

  useEffect(() => {
    if (hasHydratedReduxCartRef.current || !Array.isArray(cart)) return;
    hasHydratedReduxCartRef.current = true;
    if (localCartRef.current.length === 0 && cart.length > 0) {
      commitLocalCart(cart);
    }
  }, [cart, commitLocalCart]);

  // ==================== SAMSUNG / FLIX MEDIA ====================

  const isValidSamsungProduct = () => {
    if (!currentProduct?.length) return false;
    const p = currentProduct[0];
    return (
      p.productId3 &&
      typeof p.productId3 === "string" &&
      p.productId3.trim().toUpperCase().startsWith("SM")
    );
  };
  const showFlixMedia = isValidSamsungProduct();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [rawParam]);

  // ==================== PRODUCT DATA - SLUG RESOLUTION ====================
  // Local approved slug index / current catalogue -> UUID -> unchanged live API.
  // Snapshot records supply identity only, never prices or availability.

  const requestedDetailRef = useRef(null);
  // Known sheet slugs and UUID links start the detail API immediately; no
  // catalogue waterfall. The catalogue is only needed for newly added slugs.
  useEffect(() => {
    if (!paramIsUUID && !resolvedProductId && !products?.length) dispatch(fetchProducts());
  }, [dispatch, paramIsUUID, resolvedProductId, products?.length]);

  useEffect(() => {
    const id = paramIsUUID ? rawParam : resolvedProductId;
    if (!id) {
      requestedDetailRef.current = null;
      if (products?.length) setSlugResolveError(`Product not found for "${rawParam}"`);
      return;
    }
    setSlugResolveError(null);
    if (requestedDetailRef.current === id) return;
    requestedDetailRef.current = id;
    if (!freshProductDetails(id)) dispatch(fetchProductById(id));
  }, [dispatch, rawParam, paramIsUUID, resolvedProductId, products?.length]);

  // Post-fetch redirect for legacy UUIDs that weren't in catalogue
  // Once fetchProductById returns a product, we can compute its slug and redirect
  useEffect(() => {
    if (product && rawParam) {
      const expectedSlug = getProductSlug(product, products);
      if (expectedSlug && expectedSlug !== rawParam) {
        navigate(`/product/${expectedSlug}`, { replace: true });
      }
    }
  }, [paramIsUUID, product, rawParam, products, navigate]);

  // ==================== RECENTLY VIEWED - now stores slug ====================
  useEffect(() => {
    if (currentProduct?.length > 0) {
      const prod = currentProduct[0];
      const image = getValidImageUrl(prod.productImage);
      const slug = getProductSlug(prod, products);
      const viewedItem = {
        id: prod.productID,
        slug: slug,
        name: prod.productName,
        price: prod.price,
        oldPrice: prod.oldPrice || 0,
        image,
        brandName: prod.brandName,
        categoryName: prod.categoryName,
        showRoomName: prod.showRoomName,
        stockStatus: prod.stockStatus,
        quantity: prod.quantity,
        viewedAt: new Date().toISOString(),
      };
      const parsed = safeLocalStorage.getItem("viewedProducts", []);
      const existingProducts = Array.isArray(parsed) ? parsed : [];
      const filtered = existingProducts.filter((item) => item?.id !== viewedItem.id);
      const updated = [viewedItem, ...filtered].slice(0, 4);
      safeLocalStorage.setItem("viewedProducts", updated);
      setViewedProducts(updated);
    }
  }, [currentProduct, products]);

  useEffect(() => {
    const stored = safeLocalStorage.getItem("viewedProducts", []);
    const validProducts = Array.isArray(stored) ? stored : [];
    setViewedProducts(validProducts.slice(0, 4));
  }, []);

  // ==================== FLIX MEDIA INTEGRATION ====================

  useEffect(() => {
    if (!showFlixMedia || !currentProduct?.length) return;
    const prod = currentProduct[0];
    const mpn = prod.productId3?.trim().toUpperCase();
    if (!mpn || !mpn.startsWith("SM")) {
      setFlixMediaError(true);
      setFlixMediaLoaded(true);
      return;
    }
    setFlixMediaLoaded(false);
    setFlixMediaError(false);
    const distributorId = "17909";
    const language = "gh";
    const productMpn = prod.productId3 || "";
    const productEan = prod.productId2 || "";
    const productBrand = "Samsung";
    const cleanupFlixMedia = () => {
      document
        .querySelectorAll('script[src*="flixfacts.com"]')
        .forEach((s) => s.remove());
      document
        .querySelectorAll('link[href*="flixfacts.com"], style[data-flix]')
        .forEach((s) => s.remove());
      document
        .querySelectorAll(
          "#flix-inpage, #flix-minisite, .flix-inpage, .flix-minisite"
        )
        .forEach((s) => s.remove());
      if (window.flixJsCallbacks) delete window.flixJsCallbacks;
      if (window.flixJs) delete window.flixJs;
    };
    cleanupFlixMedia();
    const initFlixMedia = () => {
      const flixSection = flixMediaSectionRef.current;
      if (!flixSection) return;
      flixSection.innerHTML = "";
      const loadingDiv = document.createElement("div");
      loadingDiv.className = "flex items-center justify-center py-12";
      loadingDiv.innerHTML = `
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mb-4"></div>
          <div class="text-gray-600" style="font-family: var(--pd-font)"></div>
        </div>
      `;
      flixSection.appendChild(loadingDiv);
      const container = document.createElement("div");
      container.id = "flix-media-isolated-container";
      container.className = "flix-media-isolated w-full overflow-hidden";
      container.style.cssText =
        "position: relative; width: 100%; min-height: 400px; border: none; overflow: hidden;";
      const iframe = document.createElement("iframe");
      iframe.id = "flix-media-iframe";
      iframe.style.cssText =
        "width: 100%; height: 800px; border: none; overflow: hidden;";
      iframe.onload = () => {
        setFlixMediaLoaded(true);
        loadingDiv.remove();
      };
      iframe.onerror = () => {
        setFlixMediaError(true);
        setFlixMediaLoaded(true);
        loadingDiv.remove();
      };
      iframe.srcdoc = `
        <!DOCTYPE html>
        <html>
          <head>
            <base target="_parent">
            <style>
              body { margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
              #flix-container { width: 100%; max-width: 100%; overflow: hidden; }
              .flix-inpage, .flix-minisite { width: 100% !important; max-width: 100% !important; }
              iframe { max-width: 100% !important; }
            </style>
          </head>
          <body>
            <div id="flix-container">
              <div id="flix-inpage"></div>
              <div id="flix-minisite"></div>
            </div>
            <script>
              (function() {
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.async = true;
                script.setAttribute('data-flix-distributor', '${distributorId}');
                script.setAttribute('data-flix-language', '${language}');
                script.setAttribute('data-flix-mpn', '${productMpn}');
                script.setAttribute('data-flix-ean', '${productEan}');
                script.setAttribute('data-flix-brand', '${productBrand}');
                script.setAttribute('data-flix-inpage', 'flix-inpage');
                script.setAttribute('data-flix-button', 'flix-minisite');
                script.src = 'https://media.flixfacts.com/js/loader.js';
                script.onload = function() { window.parent.postMessage({ type: 'FLIX_MEDIA_LOADED' }, '*'); };
                script.onerror = function() { window.parent.postMessage({ type: 'FLIX_MEDIA_ERROR' }, '*'); };
                document.head.appendChild(script);
              })();
            </script>
          </body>
        </html>
      `;
      container.appendChild(iframe);
      flixSection.appendChild(container);
      const messageHandler = (event) => {
        if (event.data.type === "FLIX_MEDIA_LOADED") setFlixMediaLoaded(true);
        else if (event.data.type === "FLIX_MEDIA_ERROR") {
          setFlixMediaError(true);
          setFlixMediaLoaded(true);
        }
      };
      window.addEventListener("message", messageHandler);
      return () => {
        window.removeEventListener("message", messageHandler);
        cleanupFlixMedia();
      };
    };
    const style = document.createElement("style");
    style.id = "flix-media-containment";
    style.textContent = `
      #flix-media-section { isolation: isolate; contain: layout style paint; position: relative; z-index: 1; }
      #flix-media-section * { box-sizing: border-box; max-width: 100%; }
      .flix-media-isolated { position: relative !important; overflow: hidden !important; z-index: 1; }
      #flix-media-iframe { position: relative !important; z-index: 1; }
    `;
    document.head.appendChild(style);
    const cleanup = initFlixMedia();
    return () => {
      cleanup?.();
      document.getElementById("flix-media-containment")?.remove();
      cleanupFlixMedia();
    };
  }, [currentProduct, showFlixMedia]);

  // ==================== STICKY CART ====================

  useEffect(() => {
    const handleScroll = () => {
      if (productDetailsRef.current) {
        setShowStickyCart(
          productDetailsRef.current.getBoundingClientRect().bottom < 0
        );
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ==================== STOCK CHECK ====================

  const isOutOfStock = (productToCheck) => {
    if (!productToCheck) return false;
    const indicators = [
      "All brands",
      "Products out of stock",
      "out of stock",
      "unavailable",
      "not available",
    ];
    const matchesAny = (field) =>
      field &&
      indicators.some((i) => field.toLowerCase().includes(i.toLowerCase()));
    return (
      matchesAny(productToCheck.brandName) ||
      matchesAny(productToCheck.categoryName) ||
      matchesAny(productToCheck.showRoomName) ||
      productToCheck.stockStatus?.toLowerCase() === "out of stock" ||
      (productToCheck.quantity !== undefined && productToCheck.quantity <= 0)
    );
  };

  // ==================== CART ACTIONS ====================

  const handleOpenCart = () => {
    setCartSidebarOpen(true);
    if (!networkStatusRef.current) return;
    if (localCartRef.current.length === 0) setCartLoading(true);
    void refreshCartFromDatabase({ silent: true }).finally(() => {
      setCartLoading(false);
    });
  };

  const handleAddToCartAndOpenSidebar = async (productToAdd) => {
    if (isOutOfStock(productToAdd)) return;
    if (!networkStatusRef.current) {
      setCartSyncError("No internet connection. Please check your network.");
      return;
    }
    setIsAddingToCart(true);
    setCartSyncError(null);
    try {
      const storedCartId = getActiveCartId();
      const customer = safeLocalStorage.getItem("customer", null);
      const customerId = customer?.customerAccountNumber || null;
      const productId =
        productToAdd.productID || productToAdd.productId || productToAdd.id;
      if (!productId) throw new Error("Product ID is missing");
      const cartItemPayload = {
        CartId: storedCartId,
        ProductId: String(productId),
        ProductName: productToAdd.productName || productToAdd.name,
        ImagePath: productToAdd.productImage || productToAdd.imagePath,
        Price: parseFloat(productToAdd.price),
        Quantity: 1,
        CustomerId: customerId,
      };
      const addResult = await dispatch(addToCart(cartItemPayload)).unwrap();
      const addedItem = normalizeCartItem({
        ...cartItemPayload,
        ...(addResult && typeof addResult === "object" ? addResult : {}),
      });
      const optimisticCart = upsertCartItem(localCartRef.current, addedItem);
      commitLocalCart(optimisticCart);
      setCartSidebarOpen(true);
      setCartLoading(false);
      setIsAddingToCart(false);
      const preservedItem = optimisticCart.find(
        (item) => String(item.productId) === String(productId)
      );
      void refreshCartFromDatabase({
        preserveItems: preservedItem ? [preservedItem] : [],
        silent: true,
      }).then((result) => {
        if (!result.ok && result.reason !== "offline") {
          setCartSyncError(
            "Added to cart successfully. We will finish syncing your cart shortly."
          );
        }
      });
    } catch (error) {
      if (error?.code === "CART_ITEM_EXISTS") {
        setCartSyncError(error.message);
      } else if (!navigator.onLine) {
        setCartSyncError("No internet connection. Please check your network.");
      } else {
        setCartSyncError(
          error.message
            ? `Failed to add to cart: ${error.message}`
            : "Failed to add product to cart. Please try again."
        );
      }
      setCartLoading(false);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    const activeCartId = getActiveCartId();
    if (!activeCartId) {
      setCartSyncError("Cart ID not found. Please refresh the page.");
      return;
    }
    const previousLocalCart = [...localCartRef.current];
    const productKey = String(productId);
    setUpdatingQuantity((prev) => ({ ...prev, [productKey]: true }));
    setCartSyncError(null);
    try {
      const optimisticCart = previousLocalCart.map((item) =>
        String(item.productId) === productKey
          ? {
              ...item,
              quantity: newQuantity,
              total: parseFloat(item.price) * newQuantity,
            }
          : item
      );
      commitLocalCart(optimisticCart);
      await dispatch(
        updateCartItem({
          CartId: activeCartId,
          ProductId: productKey,
          Quantity: newQuantity,
        })
      ).unwrap();
      const refreshed = await refreshCartFromDatabase({ silent: true });
      if (!refreshed.ok && refreshed.reason !== "offline") {
        setCartSyncError(
          "Quantity updated. We will finish syncing your cart shortly."
        );
      }
    } catch (error) {
      commitLocalCart(previousLocalCart);
      setCartSyncError(
        `Failed to update quantity: ${error?.message || "Unknown error"}`
      );
      void refreshCartFromDatabase({ silent: true });
    } finally {
      setUpdatingQuantity((prev) => ({ ...prev, [productKey]: false }));
    }
  };

  const handleRemoveItem = async (productId) => {
    const activeCartId = getActiveCartId();
    if (!activeCartId) {
      setCartSyncError("Cart ID not found. Please refresh the page.");
      return;
    }
    const previousLocalCart = [...localCartRef.current];
    const productKey = String(productId);
    setRemovingItem((prev) => ({ ...prev, [productKey]: true }));
    setCartSyncError(null);
    try {
      const optimisticCart = previousLocalCart.filter(
        (item) => String(item.productId) !== productKey
      );
      commitLocalCart(optimisticCart);
      await dispatch(
        deleteCartItem({
          CartId: activeCartId,
          ProductId: productKey,
        })
      ).unwrap();
      const refreshed = await refreshCartFromDatabase({ silent: true });
      if (!refreshed.ok && refreshed.reason !== "offline") {
        setCartSyncError(
          "Item removed. We will finish syncing your cart shortly."
        );
      }
    } catch (error) {
      commitLocalCart(previousLocalCart);
      setCartSyncError(
        `Failed to remove item: ${error?.message || "Unknown error"}`
      );
      void refreshCartFromDatabase({ silent: true });
    } finally {
      setRemovingItem((prev) => ({ ...prev, [productKey]: false }));
    }
  };

  const handleCheckout = () => {
    const storedCustomer = safeLocalStorage.getItem("customer");
    if (!storedCustomer) {
      setPendingCheckout(true);
      setCartSidebarOpen(false);
      setTimeout(() => setAuthModalOpen(true), 300);
      return;
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "proceed_to_checkout",
      cartValue: cartTotal.toFixed(2),
      cartItems: localCart.map((item) => ({
        productId: item.productId,
        name: item.productName,
        price: item.price,
        quantity: item.quantity,
      })),
    });
    safeLocalStorage.setItem("selectedCart", localCart);
    navigate("/checkout");
  };

  const renderImage = (imagePath) => {
    const imageUrl = getValidImageUrl(imagePath);
    return (
      <img
        src={imageUrl}
        alt="Product"
        className="w-full h-full object-cover rounded"
        onError={(e) => {
          e.target.src = "https://via.placeholder.com/150";
        }}
      />
    );
  };

  // ==================== GALLERY NAVIGATION ====================

  const handlePrevImage = () => {
    if (allProductImages.length <= 1) return;
    setSelectedImageIndex((prev) =>
      prev === 0 ? allProductImages.length - 1 : prev - 1
    );
  };
  const handleNextImage = () => {
    if (allProductImages.length <= 1) return;
    setSelectedImageIndex((prev) =>
      prev === allProductImages.length - 1 ? 0 : prev + 1
    );
  };

  // ==================== TOTALS ====================

  const cartTotal = Array.isArray(localCart)
    ? localCart.reduce((acc, item) => acc + getItemLineTotal(item), 0)
    : 0;
  const totalCartItems = Array.isArray(localCart)
    ? localCart.reduce(
        (acc, item) => acc + (parseInt(item.quantity, 10) || 0),
        0
      )
    : 0;

  const handleAuthModalClose = () => {
    setAuthModalOpen(false);
    setPendingCheckout(false);
  };
  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    if (localCart && localCart.length > 0) {
      safeLocalStorage.setItem("selectedCart", localCart);
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "authenticated_checkout",
      cartValue: cartTotal.toFixed(2),
      cartItems: localCart.map((item) => ({
        productId: item.productId,
        name: item.productName,
        price: item.price,
        quantity: item.quantity,
      })),
    });
    setTimeout(() => navigate("/checkout"), 100);
  };
  const handleContinueShopping = () => setCartSidebarOpen(false);

  // ==================== LOADING & NOT FOUND ====================

  // While catalogue is loading or product details are loading, show skeleton
  // This covers: initial load, slug->ID resolution, and direct API fetch
  if (!product) {
    // If we have determined the slug is invalid after catalogue loaded, show 404-style message
    if ((slugResolveError || productDetailError || catalogueError) && !productDetailLoading) {
      return (
        <div className="pd-root max-w-7xl mx-auto px-4 py-12 text-center">

          <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4" style={{ color: "#dc2626" }} />
          <h1 className="text-2xl font-bold mb-2">Product not found</h1>
          <p className="text-gray-500 mb-6">
            Please check the product link or try again. <code className="bg-gray-100 px-2 py-1 rounded">{rawParam}</code>
          </p>
          <button
            onClick={() => navigate("/")}
            className="pd-btn pd-btn-primary"
            style={{ width: "auto", padding: "10px 24px" }}
          >
            Back to Home
          </button>
        </div>
      );
    }
    return <><ProductDetailSkeleton /></>;
  }

  const outOfStock = isOutOfStock(product);
  const activeImageUrl =
    allProductImages[selectedImageIndex] || allProductImages[0];
  const primaryImageUrl = allProductImages[0];
  const descriptionLines = String(product.description || "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line, i) => (
      <p key={i} className="pd-description-line">
        {line}
      </p>
    ));
  const productUrl = canonicalUrl;
  const related = products.slice(-12);

  // ==================== RENDER ====================

  return (
    <>
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
        .pd-section-header {
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
        .pd-section-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--pd-dark);
          letter-spacing: -0.02em;
          line-height: 1;
          white-space: nowrap;
          margin: 0;
        }
        @media (min-width: 768px) {
          .pd-section-title { font-size: 20px; }
        }
        .pd-header-line {
          flex: 1;
          height: 1px;
          background: var(--pd-border);
          min-width: 20px;
        }
        .pd-product-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--pd-dark);
          letter-spacing: -0.02em;
          line-height: 1.3;
          margin-bottom: 16px;
        }
        @media (min-width: 768px) {
          .pd-product-title { font-size: 24px; }
        }
        .pd-price-container {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--pd-green-lighter);
          border: 1px solid var(--pd-green-light);
          border-radius: var(--pd-radius);
          padding: 12px 16px;
          margin-bottom: 16px;
        }
        .pd-price {
          font-size: 22px;
          font-weight: 900;
          color: var(--pd-red);
        }
        @media (min-width: 768px) {
          .pd-price { font-size: 26px; }
        }
        .pd-old-price {
          font-size: 14px;
          font-weight: 400;
          color: var(--pd-light);
          text-decoration: line-through;
        }
        .pd-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .pd-badge-tag {
          background: linear-gradient(135deg, var(--pd-green) 0%, var(--pd-green-mid) 100%);
          color: #fff;
        }
        .pd-stock {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--pd-radius);
          font-size: 13px;
          font-weight: 600;
          border: 1px solid;
        }
        .pd-stock-in {
          background: var(--pd-green-lighter);
          color: var(--pd-green);
          border-color: var(--pd-green-light);
        }
        .pd-stock-out {
          background: #fef2f2;
          color: var(--pd-red);
          border-color: #fecaca;
        }
        .pd-description-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .pd-description-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--pd-dark);
        }
        @media (min-width: 768px) {
          .pd-description-title { font-size: 16px; }
        }
        .pd-description-box {
          background: #fff;
          border: 1px solid var(--pd-border);
          border-radius: var(--pd-radius);
          padding: 16px;
          max-height: 280px;
          overflow-y: auto;
        }
        .pd-description-line {
          font-size: 14px;
          color: var(--pd-mid);
          line-height: 1.6;
          margin-bottom: 8px;
        }
        .pd-description-line:last-child { margin-bottom: 0; }
        .pd-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 24px;
          border-radius: var(--pd-radius);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
          width: 100%;
        }
        .pd-btn-primary {
          background: var(--pd-green);
          color: #fff;
          border-color: var(--pd-green);
        }
        .pd-btn-primary:hover:not(:disabled) {
          background: var(--pd-green-mid);
          border-color: var(--pd-green-mid);
          box-shadow: 0 4px 16px rgba(20, 83, 45, 0.2);
        }
        .pd-btn-primary:disabled {
          background: var(--pd-border);
          border-color: var(--pd-border);
          color: var(--pd-light);
          cursor: not-allowed;
        }
        .pd-gallery-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
        }
        @media (min-width: 768px) {
          .pd-gallery-container {
            flex-direction: row;
            align-items: flex-start;
            gap: 16px;
          }
        }
        .pd-image-container {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
          flex: 1;
          order: 1;
        }
        @media (min-width: 768px) {
          .pd-image-container { order: 2; }
        }
        .pd-main-image {
          border-radius: var(--pd-radius);
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          max-width: 100%;
          transition: transform 0.3s ease;
        }
        .pd-main-image:hover { transform: scale(1.02); }
        .pd-gallery-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid var(--pd-border);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          color: var(--pd-dark);
        }
        .pd-gallery-nav-btn:hover {
          background: var(--pd-green);
          border-color: var(--pd-green);
          color: #fff;
        }
        .pd-gallery-nav-prev { left: 12px; }
        .pd-gallery-nav-next { right: 12px; }
        .pd-gallery-counter {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: rgba(26, 26, 26, 0.7);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 100px;
          z-index: 10;
          letter-spacing: 0.04em;
        }
        .pd-thumbnails-strip {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 4px 2px;
          scrollbar-width: thin;
          order: 2;
        }
        @media (min-width: 768px) {
          .pd-thumbnails-strip {
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 2px 4px;
            flex-shrink: 0;
            order: 1;
          }
        }
        .pd-thumbnail-btn {
          width: 70px;
          height: 70px;
          border-radius: var(--pd-radius);
          border: 2px solid var(--pd-border);
          background: #fff;
          padding: 4px;
          cursor: pointer;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: all 0.2s ease;
          opacity: 0.7;
        }
        @media (min-width: 768px) {
          .pd-thumbnail-btn { width: 80px; height: 80px; }
        }
        .pd-thumbnail-btn:hover {
          opacity: 1;
          border-color: var(--pd-green-accent);
        }
        .pd-thumbnail-btn.pd-thumbnail-active {
          opacity: 1;
          border-color: var(--pd-green);
          box-shadow: 0 0 0 2px var(--pd-green-light);
        }
        .pd-thumbnail-btn img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 2px;
        }
        .pd-card {
          border: 1px solid var(--pd-border);
          border-radius: var(--pd-radius);
          overflow: hidden;
          background: #fff;
          transition: all 0.2s ease;
          cursor: pointer;
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
        .pd-card:hover .pd-card-img img { transform: scale(1.05); }
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
        .pd-card:hover .pd-card-overlay { display: flex; }
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
        .pd-card-action:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .pd-card-body { padding: 10px 12px; text-align: center; }
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
          font-size: 15px;
          font-weight: 900;
          color: var(--pd-red);
          margin-top: 6px;
        }
        .pd-card-old-price {
          font-size: 12px;
          font-weight: 400;
          color: var(--pd-light);
          text-decoration: line-through;
          margin-top: 2px;
        }
        .pd-card-badge {
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
        .pd-card-badge-sold { left: 8px; background: var(--pd-dark); color: #fff; }
        .pd-card-badge-discount { right: 8px; background: var(--pd-red); color: #fff; font-size: 10px; padding: 3px 7px; }
        .pd-features {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-top: 32px;
        }
        @media (min-width: 640px) {
          .pd-features { grid-template-columns: repeat(4, 1fr); }
        }
        .pd-feature {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--pd-border);
          border-radius: var(--pd-radius);
          transition: all 0.2s ease;
        }
        .pd-feature:hover {
          border-color: var(--pd-green-accent);
          background: var(--pd-green-lighter);
        }
        .pd-feature-icon { width: 20px; height: 20px; flex-shrink: 0; }
        .pd-feature-title { font-size: 13px; font-weight: 700; color: var(--pd-dark); margin-bottom: 2px; }
        .pd-feature-subtitle { font-size: 11px; color: var(--pd-light); }
        .pd-sticky-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          background: #fff;
          border-bottom: 1px solid var(--pd-border);
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
        }
        .pd-sticky-bar.pd-hidden { transform: translateY(-100%); opacity: 0; }
        .pd-sticky-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .pd-sticky-inner { padding: 12px 24px; }
        }
        .pd-sticky-product { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .pd-sticky-img {
          width: 48px;
          height: 48px;
          border: 1px solid var(--pd-border);
          border-radius: var(--pd-radius);
          object-fit: contain;
          flex-shrink: 0;
        }
        .pd-sticky-info { min-width: 0; }
        .pd-sticky-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--pd-dark);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }
        .pd-sticky-price { font-size: 16px; font-weight: 900; color: var(--pd-red); }
        .pd-sticky-old-price { font-size: 12px; color: var(--pd-light); text-decoration: line-through; margin-left: 8px; }
        .pd-sticky-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .pd-sticky-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 20px;
          border-radius: var(--pd-radius);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        .pd-sticky-btn-cart { background: var(--pd-green); color: #fff; }
        .pd-sticky-btn-cart:hover:not(:disabled) { background: var(--pd-green-mid); }
        .pd-sticky-btn-cart:disabled { background: var(--pd-border); color: var(--pd-light); cursor: not-allowed; }
        .pd-sticky-cart-icon {
          position: relative;
          width: 40px;
          height: 40px;
          background: var(--pd-bg-subtle);
          border-radius: var(--pd-radius);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pd-sticky-cart-icon:hover { background: var(--pd-green-light); }
        .pd-sticky-cart-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 18px;
          height: 18px;
          background: var(--pd-red);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pd-cart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--pd-border);
          background: #fff;
        }
        .pd-cart-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 800; color: var(--pd-dark); }
        .pd-cart-count { background: var(--pd-green-light); color: var(--pd-green); padding: 2px 8px; border-radius: 100px; font-size: 11px; font-weight: 700; }
        .pd-cart-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--pd-bg-subtle);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .pd-cart-close:hover { background: var(--pd-border); }
        .pd-cart-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 32px;
          text-align: center;
        }
        .pd-cart-empty-icon { width: 64px; height: 64px; color: var(--pd-border); margin-bottom: 16px; }
        .pd-cart-empty-title { font-size: 16px; font-weight: 700; color: var(--pd-mid); margin-bottom: 4px; }
        .pd-cart-empty-text { font-size: 13px; color: var(--pd-light); }
        .pd-cart-item {
          position: relative;
          background: #fff;
          border: 1px solid var(--pd-border);
          border-radius: var(--pd-radius);
          padding: 12px;
          transition: all 0.2s ease;
        }
        .pd-cart-item:hover { border-color: var(--pd-green-accent); }
        .pd-cart-item-inner { display: flex; gap: 12px; }
        .pd-cart-item-img { width: 60px; height: 60px; background: var(--pd-bg-subtle); border-radius: var(--pd-radius); overflow: hidden; flex-shrink: 0; }
        .pd-cart-item-info { flex: 1; min-width: 0; }
        .pd-cart-item-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--pd-dark);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-bottom: 4px;
        }
        .pd-cart-item-price { font-size: 14px; font-weight: 900; color: var(--pd-red); }
        .pd-cart-item-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
        .pd-qty-control { display: flex; align-items: center; background: var(--pd-bg-subtle); border: 1px solid var(--pd-border); border-radius: var(--pd-radius); }
        .pd-qty-btn {
          width: 28px;
          height: 28px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .pd-qty-btn:hover:not(:disabled) { background: var(--pd-green-light); }
        .pd-qty-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pd-qty-value { width: 32px; text-align: center; font-size: 12px; font-weight: 700; color: var(--pd-dark); }
        .pd-cart-item-total { font-size: 14px; font-weight: 800; color: var(--pd-dark); }
        .pd-cart-item-remove {
          width: 28px;
          height: 28px;
          background: #fef2f2;
          border: none;
          border-radius: var(--pd-radius);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          margin-left: 8px;
        }
        .pd-cart-item-remove:hover { background: #fecaca; }
        .pd-cart-footer { border-top: 1px solid var(--pd-border); background: #fff; padding: 16px; }
        .pd-cart-total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .pd-cart-total-label { font-size: 14px; font-weight: 600; color: var(--pd-mid); }
        .pd-cart-total-value { font-size: 20px; font-weight: 900; color: var(--pd-red); }
        .pd-cart-note { font-size: 11px; color: var(--pd-light); text-align: center; margin-bottom: 12px; }
        .pd-cart-checkout {
          width: 100%;
          padding: 14px;
          background: var(--pd-green);
          color: #fff;
          border: none;
          border-radius: var(--pd-radius);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 8px;
        }
        .pd-cart-checkout:hover { background: var(--pd-green-mid); }
        .pd-cart-continue {
          width: 100%;
          padding: 12px;
          background: #fff;
          color: var(--pd-mid);
          border: 1px solid var(--pd-border);
          border-radius: var(--pd-radius);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pd-cart-continue:hover { background: var(--pd-bg-subtle); border-color: var(--pd-green-accent); }
        .pd-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: var(--pd-radius);
          border-left: 4px solid;
          margin-bottom: 16px;
        }
        .pd-alert-warning { background: #fffbeb; border-left-color: #f59e0b; }
        .pd-alert-success { background: var(--pd-green-lighter); border-left-color: var(--pd-green-accent); }
        .pd-alert-text { font-size: 13px; font-weight: 500; }
        .pd-alert-warning .pd-alert-text { color: #92400e; }
        .pd-alert-success .pd-alert-text { color: var(--pd-green); }
        .pd-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 640px) { .pd-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1024px) { .pd-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; } }
        .pd-grid-related { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (min-width: 640px) { .pd-grid-related { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 768px) { .pd-grid-related { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1024px) { .pd-grid-related { grid-template-columns: repeat(5, 1fr); gap: 16px; } }
        @media (min-width: 1280px) { .pd-grid-related { grid-template-columns: repeat(6, 1fr); } }
        .pd-mobile-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fff;
          border-top: 1px solid var(--pd-border);
          padding: 12px 16px;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.08);
          z-index: 40;
        }
        @media (min-width: 768px) { .pd-mobile-bar { display: none; } }
        .pd-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #fff;
          border-top-color: transparent;
          border-radius: 50%;
          animation: pd-spin 0.8s linear infinite;
        }
        @keyframes pd-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="pd-root max-w-7xl mx-auto px-4 py-2">
        <Helmet>
          <title>{`${product?.productName || "Product"} - Best Price in Ghana | Franko Trading`}</title>
          <meta
            name="description"
            content={`Buy ${product?.productName || "this product"} for GH₵${formatPrice(product?.price) || "0.00"} at Franko Trading Ghana. Best prices, fast delivery nationwide.`}
          />
          <meta property="og:title" content={product?.productName || "Product"} />
          <meta
            property="og:description"
            content={`Buy ${product?.productName || "this product"} for GH₵${formatPrice(product?.price) || "0.00"} at Franko Trading.`}
          />
          <meta property="og:image" content={primaryImageUrl || "default-image-url.jpg"} />
          <meta property="og:url" content={productUrl} />
          <meta property="og:type" content="product" />
          <meta name="twitter:card" content="summary_large_image" />
          {/* Canonical now points to slug URL - core SEO change */}
        </Helmet>

        {/* JSON-LD with slug URL */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            name: product.productName,
            image: allProductImages,
            description: product.description,
            sku: product.productID,
            brand: {
              "@type": "Brand",
              name: product.brandName,
            },
            offers: {
              "@type": "Offer",
              priceCurrency: "GHS",
              price: product.price,
              priceValidUntil: "2026-12-31",
              itemCondition: "https://schema.org/NewCondition",
              availability: outOfStock
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
              url: canonicalUrl,
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
          })}
        </script>

        {/* Sticky Add to Cart Bar */}
        <div className={`pd-sticky-bar ${showStickyCart ? "" : "pd-hidden"}`}>
          <div className="pd-sticky-inner">
            <div className="pd-sticky-product">
              <img
                src={primaryImageUrl}
                alt={product.productName}
                className="pd-sticky-img"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/150";
                }}
              />
              <div className="pd-sticky-info">
                <h3 className="pd-sticky-name">{product.productName}</h3>
                <div>
                  <span className="pd-sticky-price">
                    GH₵{formatPrice(product.price)}
                  </span>
                  {product.oldPrice > 0 && (
                    <span className="pd-sticky-old-price">
                      GH₵{formatPrice(product.oldPrice)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="pd-sticky-actions">
              <button
                className="pd-sticky-btn pd-sticky-btn-cart"
                onClick={() => handleAddToCartAndOpenSidebar(product)}
                disabled={isAddingToCart || outOfStock}
              >
                {isAddingToCart ? (
                  <>
                    <div className="pd-spinner" />
                    <span>Adding...</span>
                  </>
                ) : outOfStock ? (
                  <>
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span>Out of Stock</span>
                  </>
                ) : (
                  <>
                    <ShoppingCartIcon className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
              <div
                className="pd-sticky-cart-icon"
                onClick={handleOpenCart}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") handleOpenCart();
                }}
              >
                <ShoppingCartIcon className="w-5 h-5" style={{ color: "var(--pd-mid)" }} />
                {totalCartItems > 0 && (
                  <span className="pd-sticky-cart-badge">{totalCartItems}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {cartSyncError && (
          <div
            className={`pd-alert ${
              cartSyncError.includes("successfully")
                ? "pd-alert-success"
                : "pd-alert-warning"
            }`}
          >
            <ExclamationTriangleIcon
              className="w-5 h-5"
              style={{
                color: cartSyncError.includes("successfully")
                  ? "var(--pd-green)"
                  : "#f59e0b",
              }}
            />
            <p className="pd-alert-text">{cartSyncError}</p>
          </div>
        )}

        {/* Main Product Details */}
        <div
          id="product-details-section"
          ref={productDetailsRef}
          className="grid lg:grid-cols-2 gap-12 pt-4"
        >
          {/* Product Image & Other Images Gallery */}
          <div className="pd-gallery-container">
            <div className="pd-image-container">
              {allProductImages.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="pd-gallery-nav-btn pd-gallery-nav-prev"
                  aria-label="Previous image"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
              )}
              <Image.PreviewGroup>
                {allProductImages.map((imgSrc, idx) => (
                  <div
                    key={`preview-${idx}`}
                    style={{ display: idx === selectedImageIndex ? "block" : "none" }}
                  >
                    <Image
                      src={idx === selectedImageIndex ? (imgSrc || activeImageUrl) : undefined}
                      loading={idx === selectedImageIndex ? "eager" : "lazy"}
                      fetchPriority={idx === selectedImageIndex ? "high" : "auto"}
                      decoding="async"
                      className="pd-main-image"
                      alt={`${product.productName} - View ${idx + 1}`}
                      fallback="https://via.placeholder.com/400?text=No+Image"
                      style={{ maxWidth: "100%", borderRadius: "var(--pd-radius)" }}
                    />
                  </div>
                ))}
              </Image.PreviewGroup>
              {allProductImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="pd-gallery-nav-btn pd-gallery-nav-next"
                    aria-label="Next image"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                  <span className="pd-gallery-counter">
                    {selectedImageIndex + 1} / {allProductImages.length}
                  </span>
                </>
              )}
            </div>
            {allProductImages.length > 1 && (
              <div className="pd-thumbnails-strip">
                {allProductImages.map((imgSrc, index) => (
                  <button
                    key={`thumb-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`pd-thumbnail-btn ${selectedImageIndex === index ? "pd-thumbnail-active" : ""}`}
                    aria-label={`View product image ${index + 1}`}
                  >
                    <img
                      src={imgSrc}
                      alt={`${product.productName} thumbnail ${index + 1}`}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/150";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Information Column */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {typeof product.brandName === "string" && product.brandName.trim() && (
                <span className="text-sm font-semibold text-green-800">{product.brandName.trim()}</span>
              )}
              {displayProductTag(product.tag) && (
                <span className="rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">{displayProductTag(product.tag)}</span>
              )}
            </div>
            <h1 className="pd-product-title">{product.productName}</h1>
            <div className="pd-price-container">
              <span className="pd-price">GH₵{formatPrice(product.price)}</span>
              {product.oldPrice > 0 && (
                <span className="pd-old-price">GH₵{formatPrice(product.oldPrice)}</span>
              )}
            </div>
            <div className={`pd-stock ${outOfStock ? "pd-stock-out" : "pd-stock-in"}`}>
              {outOfStock ? (
                <>
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span>Out of Stock</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>In Stock</span>
                </>
              )}
            </div>
            <div className="mt-4">
              <div className="pd-description-header">
                <div className="pd-title-accent" style={{ height: "20px" }} />
                <h2 className="pd-description-title">Product Description</h2>
              </div>
              <div className="pd-description-box">{descriptionLines}</div>
            </div>
            <div className="pt-4 hidden md:block">
              <button
                className="pd-btn pd-btn-primary"
                onClick={() => handleAddToCartAndOpenSidebar(product)}
                disabled={isAddingToCart || outOfStock}
              >
                {isAddingToCart ? (
                  <>
                    <div className="pd-spinner" />
                    <span>Adding to Cart...</span>
                  </>
                ) : outOfStock ? (
                  <>
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span>Out of Stock</span>
                  </>
                ) : (
                  <>
                    <ShoppingCartIcon className="w-5 h-5" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            </div>
            <div className="pd-mobile-bar">
              <button
                className="pd-btn pd-btn-primary"
                onClick={() => handleAddToCartAndOpenSidebar(product)}
                disabled={isAddingToCart || outOfStock}
              >
                {isAddingToCart ? (
                  <>
                    <div className="pd-spinner" />
                    <span>Adding...</span>
                  </>
                ) : outOfStock ? (
                  <>
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span>Out of Stock</span>
                  </>
                ) : (
                  <>
                    <ShoppingCartIcon className="w-5 h-5" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* FLIX MEDIA SECTION */}
        {showFlixMedia && (
          <div
            id="flix-media-section"
            ref={flixMediaSectionRef}
            className="mt-8 bg-white border border-gray-200 overflow-hidden p-6"
            style={{ borderRadius: "var(--pd-radius)", contain: "layout style paint" }}
          >
            <div className="pd-section-header" style={{ marginBottom: "24px" }}>
              <div className="pd-title-wrap">
                <div className="pd-title-accent" />
                <h2 className="pd-section-title">More Product Details</h2>
              </div>
              <div className="pd-header-line" />
            </div>
            {flixMediaError && (
              <div className="text-center py-8" style={{ color: "var(--pd-light)" }}>
                <p>Unable to load additional product details at this time.</p>
              </div>
            )}
          </div>
        )}

        {/* SERVICE FEATURES */}
        <div className="pd-features">
          {[
            {
              title: "Fast Shipping",
              subtitle: "All over Ghana",
              icon: <TruckIcon className="pd-feature-icon" style={{ color: "var(--pd-green)" }} />,
            },
            {
              title: "Quality Assurance",
              subtitle: "Certified products",
              icon: <ShieldCheckIcon className="pd-feature-icon" style={{ color: "var(--pd-green-accent)" }} />,
            },
            {
              title: "Customer Support",
              subtitle: "Dedicated support team",
              icon: <PhoneIcon className="pd-feature-icon" style={{ color: "var(--pd-green-mid)" }} />,
            },
            {
              title: "Secure Payment",
              subtitle: "Safe Payment Processing",
              icon: <CreditCardIcon className="pd-feature-icon" style={{ color: "var(--pd-green)" }} />,
            },
          ].map((item, idx) => (
            <div key={idx} className="pd-feature">
              {item.icon}
              <div>
                <p className="pd-feature-title">{item.title}</p>
                <p className="pd-feature-subtitle">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* RECENTLY VIEWED */}
        {viewedProducts.length > 0 && (
          <section className="mt-16">
            <div className="pd-section-header">
              <div className="pd-title-wrap">
                <div className="pd-title-accent" />
                <h2 className="pd-section-title">Recently Viewed Products</h2>
              </div>
              <div className="pd-header-line" />
            </div>
            <div className="pd-grid">
              {viewedProducts.map((viewedProduct, index) => {
                if (!viewedProduct || !viewedProduct.id) return null;
                const productOutOfStock = isOutOfStock(viewedProduct);
                const discount =
                  viewedProduct.oldPrice > 0
                    ? Math.round(((viewedProduct.oldPrice - viewedProduct.price) / viewedProduct.oldPrice) * 100)
                    : 0;
                const imgUrl = getValidImageUrl(viewedProduct.image);
                // NEW: navigate via slug, not UUID
                const viewedSlug = slugify(viewedProduct.name || "") || viewedProduct.slug;
                return (
                  <div
                    key={`viewed-${viewedProduct.id}-${index}`}
                    className="pd-card"
                    style={{ opacity: productOutOfStock ? 0.75 : 1 }}
                  >
                    <div className="pd-card-img">
                      {productOutOfStock && <span className="pd-card-badge pd-card-badge-sold">Sold Out</span>}
                      {discount > 0 && !productOutOfStock && (
                        <span className="pd-card-badge pd-card-badge-discount">-{discount}%</span>
                      )}
                      <div
                        style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={() => navigate(`/product/${viewedSlug}`)}
                      >
                        <img
                          src={imgUrl}
                          alt={viewedProduct.name}
                          onError={(e) => { e.target.src = "https://via.placeholder.com/150"; }}
                        />
                      </div>
                      <div className="pd-card-overlay" onClick={() => navigate(`/product/${viewedSlug}`)}>
                        <Tooltip content="Add to Wishlist" placement="top">
                          <button className="pd-card-action" onClick={(e) => e.stopPropagation()}>
                            <SolidHeartIcon className="w-4 h-4" style={{ color: "var(--pd-mid)" }} />
                          </button>
                        </Tooltip>
                        <Tooltip content="View Details" placement="top">
                          <button
                            className="pd-card-action"
                            onClick={(e) => { e.stopPropagation(); navigate(`/product/${viewedSlug}`); }}
                          >
                            <EyeIcon className="w-4 h-4" style={{ color: "var(--pd-green)" }} />
                          </button>
                        </Tooltip>
                        <Tooltip content={productOutOfStock ? "Out of Stock" : "Add to Cart"} placement="top">
                          <button
                            className="pd-card-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!productOutOfStock) handleAddToCartAndOpenSidebar(viewedProduct);
                            }}
                            disabled={productOutOfStock}
                          >
                            <ShoppingCartIcon className="w-4 h-4" style={{ color: "var(--pd-green-mid)" }} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="pd-card-body">
                      <h3 className="pd-card-name">{viewedProduct.name || "Unnamed Product"}</h3>
                      <div className="pd-card-price">GH₵{formatPrice(viewedProduct.price)}</div>
                      {viewedProduct.oldPrice > 0 && (
                        <div className="pd-card-old-price">GH₵{formatPrice(viewedProduct.oldPrice)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* YOU MAY ALSO LIKE */}
        {related.length > 0 && (
          <section className="mt-10 mb-24 md:mb-1">
            <div className="pd-section-header">
              <div className="pd-title-wrap">
                <div className="pd-title-accent" />
                <h2 className="pd-section-title">You May Also Like</h2>
              </div>
              <div className="pd-header-line" />
            </div>
            <div className="pd-grid-related">
              {related.slice(0, 12).map((relatedProduct, index) => {
                if (!relatedProduct || !relatedProduct.productID) return null;
                const productOutOfStock = isOutOfStock(relatedProduct);
                const discount =
                  relatedProduct.oldPrice > 0
                    ? Math.round(((relatedProduct.oldPrice - relatedProduct.price) / relatedProduct.oldPrice) * 100)
                    : 0;
                const imgUrl = getValidImageUrl(relatedProduct.productImage);
                // NEW: slug-based navigation
                const relatedSlug = getProductSlug(relatedProduct, products);
                return (
                  <div
                    key={`related-${relatedProduct.productID}-${index}`}
                    className="pd-card"
                    style={{ opacity: productOutOfStock ? 0.75 : 1 }}
                  >
                    <div className="pd-card-img">
                      {productOutOfStock && <span className="pd-card-badge pd-card-badge-sold">Sold Out</span>}
                      {discount > 0 && !productOutOfStock && (
                        <span className="pd-card-badge pd-card-badge-discount">-{discount}%</span>
                      )}
                      <div
                        style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={() => navigate(`/product/${relatedSlug}`)}
                      >
                        <img
                          src={imgUrl}
                          alt={relatedProduct.productName}
                          onError={(e) => { e.target.src = "https://via.placeholder.com/150"; }}
                        />
                      </div>
                      <div className="pd-card-overlay" onClick={() => navigate(`/product/${relatedSlug}`)}>
                        <Tooltip content="Add to Wishlist" placement="top">
                          <button className="pd-card-action" onClick={(e) => e.stopPropagation()}>
                            <SolidHeartIcon className="w-4 h-4" style={{ color: "var(--pd-mid)" }} />
                          </button>
                        </Tooltip>
                        <Tooltip content="View Details" placement="top">
                          <button
                            className="pd-card-action"
                            onClick={(e) => { e.stopPropagation(); navigate(`/product/${relatedSlug}`); }}
                          >
                            <EyeIcon className="w-4 h-4" style={{ color: "var(--pd-green)" }} />
                          </button>
                        </Tooltip>
                        <Tooltip content={productOutOfStock ? "Out of Stock" : "Add to Cart"} placement="top">
                          <button
                            className="pd-card-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!productOutOfStock) handleAddToCartAndOpenSidebar(relatedProduct);
                            }}
                            disabled={productOutOfStock}
                          >
                            <ShoppingCartIcon className="w-4 h-4" style={{ color: "var(--pd-green-mid)" }} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="pd-card-body">
                      <h3 className="pd-card-name">{relatedProduct.productName || "Unnamed Product"}</h3>
                      <div className="pd-card-price">GH₵{formatPrice(relatedProduct.price)}</div>
                      {relatedProduct.oldPrice > 0 && (
                        <div className="pd-card-old-price">GH₵{formatPrice(relatedProduct.oldPrice)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CART SIDEBAR */}
        <Drawer placement="right" open={cartSidebarOpen} onClose={() => setCartSidebarOpen(false)} className="p-0" size={400}>
          <div className="flex flex-col h-full" style={{ fontFamily: "var(--pd-font)" }}>
            <div className="pd-cart-header">
              <div className="pd-cart-title">
                <ShoppingCartIcon className="w-5 h-5" style={{ color: "var(--pd-green)" }} />
                <span>Shopping Cart</span>
                {localCart.length > 0 && (
                  <span className="pd-cart-count">
                    {totalCartItems} Item{totalCartItems !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button className="pd-cart-close" onClick={() => setCartSidebarOpen(false)}>
                <XMarkIcon className="w-4 h-4" style={{ color: "var(--pd-mid)" }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {cartLoading ? (
                <div className="pd-cart-empty">
                  <div style={{ position: "relative" }}>
                    <div
                      className="w-16 h-16 border-4 rounded-full animate-spin mb-4"
                      style={{ borderColor: "var(--pd-green-light)", borderTopColor: "var(--pd-green)" }}
                    />
                    <ArrowPathIcon
                      className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                      style={{ color: "var(--pd-green)" }}
                    />
                  </div>
                  <p style={{ color: "var(--pd-mid)", fontWeight: 600 }}>Updating your cart...</p>
                </div>
              ) : !Array.isArray(localCart) || localCart.length === 0 ? (
                <div className="pd-cart-empty">
                  <ShoppingCartIcon className="pd-cart-empty-icon" />
                  <h3 className="pd-cart-empty-title">Your cart is empty</h3>
                  <p className="pd-cart-empty-text">Start shopping to fill it up!</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {localCart.map((item, index) => {
                    const itemKey = String(item.productId);
                    const isUpdating = updatingQuantity[itemKey];
                    const isRemoving = removingItem[itemKey];
                    const lineTotal = getItemLineTotal(item);
                    return (
                      <div
                        key={`${item.productId}-${index}`}
                        className="pd-cart-item"
                        style={{ opacity: isUpdating || isRemoving ? 0.5 : 1, pointerEvents: isUpdating || isRemoving ? "none" : "auto" }}
                      >
                        <div className="pd-cart-item-inner">
                          <div className="pd-cart-item-img">{renderImage(item.imagePath)}</div>
                          <div className="pd-cart-item-info">
                            <h4 className="pd-cart-item-name">{item.productName || "Product Name"}</h4>
                            <p className="pd-cart-item-price">GH₵{formatPrice(item.price || 0)}</p>
                            <div className="pd-cart-item-actions">
                              <div className="pd-qty-control">
                                <button
                                  className="pd-qty-btn"
                                  onClick={() => handleQuantityChange(item.productId, (item.quantity || 1) - 1)}
                                  disabled={isUpdating || isRemoving || (item.quantity || 1) <= 1}
                                >
                                  <MinusIcon className="w-3 h-3" />
                                </button>
                                <span className="pd-qty-value">{item.quantity || 1}</span>
                                <button
                                  className="pd-qty-btn"
                                  onClick={() => handleQuantityChange(item.productId, (item.quantity || 1) + 1)}
                                  disabled={isUpdating || isRemoving}
                                >
                                  <PlusIcon className="w-3 h-3" />
                                </button>
                              </div>
                              <div style={{ display: "flex", alignItems: "center" }}>
                                <span className="pd-cart-item-total">GH₵{formatPrice(lineTotal)}</span>
                                <button
                                  className="pd-cart-item-remove"
                                  onClick={() => handleRemoveItem(item.productId)}
                                  disabled={isUpdating || isRemoving}
                                >
                                  <TrashIcon className="w-3 h-3" style={{ color: "var(--pd-red)" }} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {Array.isArray(localCart) && localCart.length > 0 && !cartLoading && (
              <div className="pd-cart-footer">
                <div className="pd-cart-total-row">
                  <span className="pd-cart-total-label">Total:</span>
                  <span className="pd-cart-total-value">GH₵{formatPrice(cartTotal)}</span>
                </div>
                <p className="pd-cart-note">* Taxes & shipping calculated at checkout</p>
                <Divider style={{ margin: "12px 0" }} />
                <button className="pd-cart-checkout" onClick={handleCheckout}>
                  Proceed to Checkout
                </button>
                <button className="pd-cart-continue" onClick={handleContinueShopping}>
                  Continue Shopping
                </button>
              </div>
            )}
          </div>
        </Drawer>

        <AuthModal open={authModalOpen} onClose={handleAuthModalClose} onSuccess={handleAuthSuccess} />
      </div>
    </>
  );
};

export default ProductDescription;
