import { useLayoutEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { routeSeo } from "../utils/seoRoutes.mjs";
import { ResolvedSeoContext } from "./RouteSeoContext";

/**
 * Own the only robots/canonical tags. react-helmet 6 still owns titles/social
 * tags, but its legacy mount registry can lose an outer Helmet during React 19
 * Suspense/StrictMode transitions. These two tags must not depend on that registry.
 */
export function RouteSeoProvider({ children }) {
  const { pathname, search, key } = useLocation();
  const base = routeSeo(pathname, search);
  const [resolved, setResolved] = useState({ key: null, value: null });

  const controls = useMemo(() => ({
    publish(routeKey, value) {
      setResolved({ key: routeKey, value });
    },
    clear(routeKey) {
      // An old route's cleanup must not erase a newer route's metadata.
      setResolved((current) => current.key === routeKey ? { key: null, value: null } : current);
    },
  }), []);

  const override = resolved.key === key ? resolved.value : null;
  const robots = override?.robots ?? base.robots;
  const canonical = override ? override.canonical : base.canonical;

  useLayoutEffect(() => {
    const head = document.head;
    let meta = head.querySelector('meta[name="robots"][data-franko-seo]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      meta.setAttribute("data-franko-seo", "true");
      head.appendChild(meta);
    }
    meta.setAttribute("content", robots);

    let link = head.querySelector('link[rel="canonical"][data-franko-seo]');
    if (canonical) {
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        link.setAttribute("data-franko-seo", "true");
        head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    } else {
      link?.remove();
    }
  }, [pathname, search, robots, canonical]);

  return <ResolvedSeoContext.Provider value={controls}>{children}</ResolvedSeoContext.Provider>;
}
