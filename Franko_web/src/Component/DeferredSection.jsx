import { Suspense, useEffect, useRef, useState } from 'react';

/**
 * DeferredSection
 * ---------------
 * Mounts a below-the-fold module only when it gets close to the viewport, so
 * the Home page does not fetch/render six product rails before the hero has
 * even painted.
 *
 * Two additions after the PageSpeed run:
 *  - `content-visibility: auto` (via .deferred-section) so the browser skips
 *    style/layout/paint work for these sections while they are offscreen -
 *    the main-thread "Style & Layout" bucket was 201 ms on a Moto G Power.
 *  - a skeleton with the *same* reserved height as the loaded rail, so the
 *    footer does not jump when the real content replaces the placeholder
 *    (the 400px placeholder was the wrong shape and produced several of the
 *    layout-shift entries Lighthouse reported).
 */
export default function DeferredSection({ children, minHeight = 520 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // Start a little earlier than the old 600px so the section is painted
      // by the time the visitor scrolls to it (no empty box on fast scroll).
      { rootMargin: '900px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="deferred-section"
      style={{ minHeight: visible ? undefined : minHeight }}
      aria-busy={visible ? undefined : 'true'}
    >
      {visible ? (
        <Suspense fallback={null}>{children}</Suspense>
      ) : (
        <div className="deferred-placeholder" aria-hidden="true" />
      )}
    </section>
  );
}
