import { createContext, useContext, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export const ResolvedSeoContext = createContext(null);

/** Dynamic pages publish metadata only after resolving a real catalogue record.
 * Keying by navigation prevents a previous product's canonical leaking forward.
 */
export function useResolvedSeo({ canonical = null, robots = "noindex, follow" }) {
  const { key } = useLocation();
  const controls = useContext(ResolvedSeoContext);
  useLayoutEffect(() => {
    if (!controls) return undefined;
    controls.publish(key, { canonical, robots });
    return () => controls.clear(key);
  }, [controls, key, canonical, robots]);
}
