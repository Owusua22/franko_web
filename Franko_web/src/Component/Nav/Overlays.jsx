import { useEffect, useRef } from "react";

/**
 * Lightweight overlay primitives for the navigation.
 *
 * The navbar used to render its mobile menu and the "Franko Radio" player with
 * `@material-tailwind/react`'s <Drawer> and <Dialog>. Those two components
 * pulled the whole Material-Tailwind component layer *and* framer-motion into
 * the entry bundle (~610 KiB of minified JavaScript parsed, compiled and
 * executed before the hero banner could paint - the single largest remaining
 * item in Lighthouse's "Reduce unused JavaScript" audit).
 *
 * These primitives keep the exact same look and behaviour (backdrop, slide /
 * fade animation, Escape to close, scroll lock, dialog semantics, focus moved
 * into the panel and restored on close) with ~80 lines of plain React.
 */

const useOverlayBehaviour = (open, onClose, panelRef) => {
  // Escape closes; body scroll is locked while the overlay is open.
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // Move focus into the overlay, and give it back to the trigger afterwards.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const timer = window.setTimeout(() => panelRef.current?.focus?.(), 20);
    return () => {
      window.clearTimeout(timer);
      if (previous instanceof HTMLElement) previous.focus?.();
    };
  }, [open, panelRef]);
};

export function SidePanel({ open, onClose, label = "Menu", className = "", style, children }) {
  const panelRef = useRef(null);
  useOverlayBehaviour(open, onClose, panelRef);

  if (!open) return null;

  return (
    <div className={`ft-overlay ft-overlay-panel ${className}`} style={style}>
      <div className="ft-overlay-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="ft-panel"
      >
        {children}
      </aside>
    </div>
  );
}

export function Modal({ open, onClose, label, className = "", style, children }) {
  const panelRef = useRef(null);
  useOverlayBehaviour(open, onClose, panelRef);

  if (!open) return null;

  return (
    <div className="ft-overlay ft-overlay-modal">
      <div className="ft-overlay-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`ft-modal ${className}`}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}

/** Shared styles - injected once, scoped to the overlay classes. */
export function OverlayStyles() {
  return (
    <style>{`
      .ft-overlay {
        position: fixed;
        inset: 0;
        z-index: 9998;
        display: flex;
      }
      .ft-overlay-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        animation: ft-fade-in 0.18s ease;
      }
      .ft-overlay-panel { justify-content: flex-end; }
      .ft-panel {
        position: relative;
        width: 100%;
        max-width: 290px;
        height: 100%;
        background: #fff;
        overflow-y: auto;
        box-shadow: -8px 0 30px rgba(0, 0, 0, 0.18);
        animation: ft-slide-in 0.22s cubic-bezier(0.32, 0.72, 0, 1);
        outline: none;
      }
      .ft-overlay-modal { align-items: center; justify-content: center; padding: 16px; }
      .ft-modal {
        position: relative;
        width: 100%;
        max-width: 400px;
        background: #fff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        animation: ft-pop-in 0.18s ease;
        outline: none;
      }
      @keyframes ft-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes ft-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
      @keyframes ft-pop-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      @media (prefers-reduced-motion: reduce) {
        .ft-panel, .ft-modal, .ft-overlay-backdrop { animation: none; }
      }
    `}</style>
  );
}

export default SidePanel;
