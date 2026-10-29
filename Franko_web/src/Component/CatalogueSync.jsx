import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchProducts } from "../Redux/Slice/productSlice";
import { clearPublicReads } from "../utils/publicReadCache";

export const CATALOGUE_UPDATED_EVENT = "franko:catalogue-updated";
export const CATALOGUE_REFRESH_MS = 5 * 60 * 1000;

/** Pull newly published API products into the storefront without a rebuild.
 * Existing products stay visible during a refresh or a temporary API outage.
 * Hidden/background tabs do not poll. SEO files are generated separately at deployment.
 */
export default function CatalogueSync() {
  const dispatch = useDispatch();
  useEffect(() => {
    let active = true;
    let pending = false;
    let lastRefresh = Date.now();
    const refresh = async (forceRefresh = false) => {
      if (!active || pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        if (forceRefresh) clearPublicReads();
        const result = await dispatch(fetchProducts({ forceRefresh }));
        if (active && result.meta.requestStatus === "fulfilled") {
          lastRefresh = Date.now();
          window.dispatchEvent(new Event(CATALOGUE_UPDATED_EVENT));
        }
      } finally {
        pending = false;
      }
    };
    // The first read is coalesced with Navbar/NewArrivals by the public cache.
    void refresh();
    const timer = window.setInterval(() => void refresh(true), CATALOGUE_REFRESH_MS);
    const onFocus = () => {
      if (Date.now() - lastRefresh >= 60_000) void refresh(true);
    };
    const onVisibility = () => { if (document.visibilityState === "visible") onFocus(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dispatch]);
  return null;
}
