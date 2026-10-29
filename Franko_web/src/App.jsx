import ProductDetailSkeleton from "./Component/ProductDetailSkeleton";
import LoadingCircle from "./Component/LoadingCircle";
import { RouteSeoProvider } from "./Component/RouteSeo";
import CatalogueSync from "./Component/CatalogueSync";
import NotFound from "./Pages/NotFound";
import { productPageModule } from "./utils/productPageModule";
import { appStorage as localStorage } from "./utils/secureLocalStorageInit";
import { lazy, Suspense, useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutCustomer } from "./Redux/Slice/customerSlice";

/* ==================== COMPONENTS ==================== */
import Nav from "./Component/Nav/Navbar";
import NoInternetPage from "./Component/NoInternet";
import ScrollToTop from "./Pages/ScrollToTop";

/* ==================== PUBLIC PAGES (CUSTOMER) ==================== */
const Home = lazy(() => import("./Pages/Home"));
const About = lazy(() => import("./Pages/About"));
const Contact = lazy(() => import("./Pages/Contact"));
const BrandsPage = lazy(() => import("./Pages/Brands"));
const ShowroomProductsPage = lazy(() => import("./Pages/ShowRooomProducts"));
const Phones = lazy(() => import("./Pages/Phones"));
const ProductDescription = lazy(productPageModule);
const Cart = lazy(() => import("./Pages/Cart"));
const Laptops = lazy(() => import("./Pages/Laptops"));
const Fridge = lazy(() => import("./Pages/Fridge"));
const Television = lazy(() => import("./Pages/Television"));
const Speakers = lazy(() => import("./Pages/Speaker"));
const Accessories = lazy(() => import("./Pages/Accessories"));
const Appliances = lazy(() => import("./Pages/Appliances"));
const Combo = lazy(() => import("./Pages/Combo"));
const Airconditioners = lazy(() => import("./Pages/AC"));
const Checkout = lazy(() => import("./Pages/Checkout"));
const OrderReceived = lazy(() => import("./Pages/OrderReceived"));
const Locations = lazy(() => import("./Pages/Locations"));
const Cancellation = lazy(() => import("./Pages/OrderCancelled"));
const Account = lazy(() => import("./Pages/Account"));
const Products = lazy(() => import("./Pages/Products"));
const Terms = lazy(() => import("./Pages/Terms"));
const OrderHistory = lazy(() => import("./Pages/OrderHistory"));
const Wishlist = lazy(() => import("./Pages/Wishlist"));
const OrderSuccess = lazy(() => import("./Pages/OrderSucess"));

/* ==================== AGENT PAGES ==================== */
const AgentPage = lazy(() => import("./Pages/Agents/AgentPage/AgentPage"));
const AgentDashboard = lazy(() => import("./Pages/Agents/AgentPage/AgentDashboard"));
const AgentOrders = lazy(() => import("./Pages/Agents/AgentPage/AgentOrders"));
const CTP001ProductsPage = lazy(() => import("./Pages/Agents/AgentPage/CTP001ProductsPage"));

/* ═══════════════════════════════════════════════════════════════
   ROUTES THAT RENDER WITHOUT THE MAIN NAVBAR
═══════════════════════════════════════════════════════════════ */
const NAVBAR_HIDDEN_PREFIXES = ["/promo-phones", "/tel-cart", "/tel-checkout"];

const shouldHideNavbar = (pathname) =>
  NAVBAR_HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

/* ═══════════════════════════════════════════════════════════════
   SAFE STORAGE HELPERS
═══════════════════════════════════════════════════════════════ */
const safeGetFromStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    if (typeof data === "object" && data !== null) return data;
    if (typeof data === "string" && data === "[object Object]") {
      localStorage.removeItem(key);
      return null;
    }
    if (typeof data === "string") {
      try { return JSON.parse(data); } catch { return null; }
    }
    return data;
  } catch {
    return null;
  }
};

const safeSetToStorage = (key, value) => {
  try {
    if (!value) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (e) { console.error(`Error setting ${key} to storage:`, e); }
};

const cleanupCorruptedEntries = () => {
  try {
    ["customer", "user", "loginTime", "lastActivity"].forEach((key) => {
      const data = safeGetFromStorage(key);
      if (typeof data === "string" && data === "[object Object]") {
        localStorage.removeItem(key);
      }
    });
  } catch (e) { console.error("Error cleaning up entries:", e); }
};

cleanupCorruptedEntries();

const getUserRole = () => {
  try {
    const customer = safeGetFromStorage("customer");
    const user = safeGetFromStorage("user");
    if (!customer && !user) return null;
    if (user?.position === "agent") return "agent";
    if (customer?.isAgent === true) return "agent";
    return customer?.accountType || null;
  } catch { return null; }
};

/* ═══════════════════════════════════════════════════════════════
   AUTHENTICATION CHECKER COMPONENT
═══════════════════════════════════════════════════════════════ */
const AuthenticationChecker = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const customer = useSelector((state) => state.customer.currentCustomer);

  useEffect(() => {
    const checkAuthState = () => {
      try {
        if (customer && (!customer.accessToken || customer.accessToken === "")) {
          dispatch(logoutCustomer());
          safeSetToStorage("customer", null);
          navigate("/", { replace: true });
          return;
        }
        const storedCustomer = safeGetFromStorage("customer");
        if (customer && !storedCustomer) {
          safeSetToStorage("customer", customer);
        }
      } catch {
        cleanupCorruptedEntries();
      }
    };
    checkAuthState();
    const interval = setInterval(checkAuthState, 30000);
    return () => clearInterval(interval);
  }, [customer, dispatch, navigate]);

  return null;
};

/* ═══════════════════════════════════════════════════════════════
   PROTECTED ROUTE COMPONENT
═══════════════════════════════════════════════════════════════ */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const userRole = getUserRole();
  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

/* ═══════════════════════════════════════════════════════════════
   STORAGE & ACTIVITY MANAGER COMPONENT
═══════════════════════════════════════════════════════════════ */
const StorageManager = () => {
  useEffect(() => {
    cleanupCorruptedEntries();
    const updateActivity = () => {
      localStorage.setItem("lastActivityTimestamp", Date.now().toString());
    };
    updateActivity();
    let throttleTimer;
    const handleActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        updateActivity();
        throttleTimer = null;
      }, 3000);
    };
    const activeEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    activeEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
    const cleanupInterval = setInterval(() => {
      cleanupCorruptedEntries();
    }, 10 * 60 * 1000);
    const handleBeforeUnload = () => {
      try {
        const customer = safeGetFromStorage("customer");
        const user = safeGetFromStorage("user");
        if (customer && (!customer.accessToken || customer.accessToken === "")) safeSetToStorage("customer", null);
        if (user && (!user.accessToken || user.accessToken === "")) {
          safeSetToStorage("user", null);
          safeSetToStorage("loginTime", null);
          safeSetToStorage("lastActivity", null);
        }
      } catch (e) { console.error("Cleanup error:", e); }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      activeEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
      if (throttleTimer) clearTimeout(throttleTimer);
      clearInterval(cleanupInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
  return null;
};

/* ═══════════════════════════════════════════════════════════════
   MAIN APP COMPONENT
   KEY CHANGE: Product route is now slug-based
   - New URL: /product/samsung-galaxy-a56-5g
   - Old UUID URLs automatically redirect via ProductDescription
   - No backend change required
═══════════════════════════════════════════════════════════════ */
function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { pathname } = useLocation();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return <NoInternetPage />;
  }

  return (
    <RouteSeoProvider>
      <StorageManager />
      <AuthenticationChecker />
      {!shouldHideNavbar(pathname) && <Nav />}
      <ScrollToTop />
      <CatalogueSync />

      <Suspense key={pathname} fallback={pathname.startsWith("/product/") ? <ProductDetailSkeleton /> : <LoadingCircle />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/phones" element={<Phones />} />
        <Route path="/computers" element={<Laptops />} />
        <Route path="/refrigerator" element={<Fridge />} />
        <Route path="/television" element={<Television />} />
        <Route path="/speakers" element={<Speakers />} />
        <Route path="/accessories" element={<Accessories />} />
        <Route path="/appliances" element={<Appliances />} />
        <Route path="/washing-machine" element={<Combo />} />
        <Route path="/air-condition" element={<Airconditioners />} />
        <Route path="/cart/:cartId" element={<Cart />} />

        {/* ═══════════════════════════════════════════════════
            PRODUCT ROUTE - SLUG MIGRATION
            New canonical path uses product-name slug:
              /product/samsung-galaxy-a56-5g

            Legacy UUID path continues to work and is handled
            inside ProductDescription with a client-side redirect
            + server 301 (see SEO_MIGRATION_GUIDE.md).
            Keep the single route below - it matches BOTH
            slugs and UUIDs (UUID = just another string).
        ═══════════════════════════════════════════════════ */}
        <Route path="/product/:slug" element={<Suspense key={pathname} fallback={<ProductDetailSkeleton />}><ProductDescription /></Suspense>} />

        <Route path="showroom/:showRoomID" element={<ShowroomProductsPage />} />
        <Route path="/order-history" element={<Suspense fallback={<LoadingCircle label="Preparing your orders…" />}><OrderHistory /></Suspense>} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/brand/:brandId" element={<BrandsPage />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/products" element={<Products />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-received" element={<OrderReceived />} />
        <Route path="/order-success/:orderId" element={<OrderSuccess />} />
        <Route path="/account" element={<Account />} />
        <Route path="/shops" element={<Locations />} />
        <Route path="/order-cancelled" element={<Cancellation />} />

        <Route path="/agent/*" element={<ProtectedRoute allowedRoles={["agent"]}><AgentPage /></ProtectedRoute>} />
        <Route path="/agent/dashboard" element={<ProtectedRoute allowedRoles={["agent"]}><AgentPage><AgentDashboard /></AgentPage></ProtectedRoute>} />
        <Route path="/agent/orders" element={<ProtectedRoute allowedRoles={["agent"]}><AgentPage><AgentOrders /></AgentPage></ProtectedRoute>} />
        <Route path="/agent/order-placement" element={<ProtectedRoute allowedRoles={["agent"]}><AgentPage><CTP001ProductsPage /></AgentPage></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </RouteSeoProvider>
  );
}

export default App;
