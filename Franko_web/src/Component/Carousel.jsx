import { peekPublicRead } from "../utils/publicReadCache";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Splide, SplideSlide } from "@splidejs/react-splide";
import "@splidejs/react-splide/css";

import { getBannerPageAdvertisment } from "../Redux/Slice/advertismentSlice";
import { adImageUrl } from "../config/media";
import ban from "../assets/banner.webp";
import banSmall from "../assets/banner-800.webp";

/** Intrinsic size of every hero ad (the CMS exports them at 1600x645). */
const BANNER_WIDTH = 1600;
const BANNER_HEIGHT = 645;

export default function Carousel() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const splideRef = useRef(null);

  const cachedBanner = peekPublicRead({ endpoint: '/Advertisement/GetAdvertisment', AdsName: 'Banner' });
  const [loading, setLoading] = useState(() => !cachedBanner);
  const [ads, setAds] = useState(() => {
    const rows = Array.isArray(cachedBanner?.data) ? cachedBanner.data : cachedBanner?.data?.data;
    return Array.isArray(rows) ? rows.slice(1) : [];
  });
  const [heightRatio, setHeightRatio] = useState(0.0);

  /* One carousel, not two.
     The component used to mount a desktop Splide AND a mobile Splide at the
     same time (one of them merely `display:none`): two autoplay timers, two
     sets of slides, two LCP candidates and duplicate ids in the accessibility
     tree. We now pick the layout with a media query and render a single
     carousel, re-mounting it when the breakpoint changes. */
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );

  /* Autoplaying a fade carousel every 2.5 s on mobile kept re-laying-out the
     hero (Lighthouse: "Avoid non-composited animations", plus avoidable CLS
     whenever a slide swapped while text was being read). Visitors who ask for
     reduced motion get a static hero, and everyone else a calmer 5 s/6 s cycle
     that still rotates. */
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = (event) => setIsMobile(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReduceMotion(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = ban;
    img.onload = () => {
      const r = img.naturalHeight / img.naturalWidth;
      setHeightRatio(Number.isFinite(r) && r > 0 ? r : 0.5625);
    };
    img.onerror = () => setHeightRatio(0.5625);
  }, []);

  useEffect(() => {
    let mounted = true;
    dispatch(getBannerPageAdvertisment())
      .then((res) => {
        if (!mounted) return;
        setAds(Array.isArray(res?.payload) ? res.payload : []);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [dispatch]);

  const filteredAds = useMemo(
    () => (ads || []).filter((ad) => ad?.index !== 0),
    [ads]
  );

  const handleBannerClick = (adsNote) => {
    if (!adsNote || adsNote === "#") return;

    if (adsNote.startsWith("http")) {
      window.location.assign(adsNote);
      return;
    }

    navigate(adsNote);
  };

  const startAutoplay = () => {
    const splide = splideRef.current?.splide;
    const autoplay = splide?.Components?.Autoplay;
    if (autoplay && autoplay.isPaused()) autoplay.play();
  };

  /**
   * Splide gives every slide `role="tabpanel"`, which is not a role an <li>
   * may carry (axe: "uses ARIA roles only on compatible elements", also
   * reported under Agentic Browsing as an ill-formed accessibility tree).
   * `role="group"` is what the ARIA carousel pattern asks for.
   */
  const fixSlideRoles = () => {
    try {
      const splide = splideRef.current?.splide;
      const slides = splide?.Components?.Elements?.slides;
      const nodes = slides?.length
        ? Array.from(slides)
        : Array.from(document.querySelectorAll(".carousel-container .splide__slide"));
      nodes.forEach((slide) => slide.setAttribute("role", "group"));
    } catch {
      /* never let an a11y patch break the carousel */
    }
  };

  const renderSplide = () => {
    if (!heightRatio) {
      return (
        <img
          src={ban}
          srcSet={`${banSmall} 800w, ${ban} 1600w`}
          sizes="(max-width: 767px) 100vw, 1200px"
          alt="Franko Trading"
          width={BANNER_WIDTH}
          height={BANNER_HEIGHT}
          fetchPriority="high"
          decoding="async"
          className="w-full h-auto object-cover rounded-lg"
        />
      );
    }

    const options = {
      type: "fade",
      rewind: true,
      arrows: false,
      pagination: true,
      autoplay: !reduceMotion,
      interval: isMobile ? 5000 : 6000,
      speed: 800,
      pauseOnHover: true,
      pauseOnFocus: true,
      resetProgress: false,
      easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      heightRatio,
      autoHeight: false,
    };

    return (
      <>
        <style>{`
          .carousel-container * {
            font-family: 'Plus Jakarta Sans', sans-serif;
          }

          .carousel-container .splide,
          .carousel-container .splide__track,
          .carousel-container .splide__list,
          .carousel-container .splide__slide {
            height: 100%;
          }

          .banner-slide {
            position: relative;
            overflow: hidden;
          }

          .banner-media {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            border-radius: 0.5rem;
          }

          .carousel-shop-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 38px;
            padding: 0 14px;
            font-size: 13px;
            font-weight: 600;
            color: #fff;
            background: #dc2626;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
            box-shadow: 0 2px 10px rgba(220, 38, 38, 0.25);
            z-index: 12;
          }
          .carousel-shop-btn:hover { background: #b91c1c; }

          @media (max-width: 640px) {
            .carousel-shop-btn { height: 34px; padding: 0 12px; font-size: 12px; }
          }
        `}</style>

        <Splide
          ref={splideRef}
          options={options}
          onMounted={() => {
            startAutoplay();
            fixSlideRoles();
          }}
          onUpdated={fixSlideRoles}
          onMove={() => startAutoplay()}
        >
          {/* Fetched Ads Only */}
          {filteredAds.map((ad, index) => {
            const imageUrl = adImageUrl(ad?.fileName, {
              width: isMobile ? 800 : 1600,
              fallback: ban,
            });

            return (
              <SplideSlide key={ad?.id ?? index} className="banner-slide">
                <div
                  onClick={() => handleBannerClick(ad?.adsNote)}
                  className="w-full h-full cursor-pointer relative"
                >
                  <img
                    src={imageUrl}
                    /* Only the first slide is the LCP candidate. The remaining
                       hero ads were all `eager` before, so they competed with
                       the banner that is actually painted first. */
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "low"}
                    decoding="async"
                    width={BANNER_WIDTH}
                    height={BANNER_HEIGHT}
                    alt={ad?.altText || "Franko Trading promotion"}
                    className="banner-media shadow-lg"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = ban;
                    }}
                  />

                  {ad?.adsNote && (
                    <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-6 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBannerClick(ad?.adsNote);
                        }}
                        className="carousel-shop-btn"
                      >
                        Shop Now
                      </button>
                    </div>
                  )}
                </div>
              </SplideSlide>
            );
          })}
        </Splide>
      </>
    );
  };

  return (
    <div className="mx-auto p-1 md:p-2 carousel-container">
      <div className="relative bg-gray-30">
        <div className="w-full">
          {loading ? (
            <img
              src={ban}
              srcSet={`${banSmall} 800w, ${ban} 1600w`}
              sizes="(max-width: 767px) 100vw, 1200px"
              alt="Franko Trading"
              width={BANNER_WIDTH}
              height={BANNER_HEIGHT}
              fetchPriority="high"
              decoding="async"
              className="w-full h-auto object-cover rounded-lg"
            />
          ) : (
            <div key={isMobile ? "mobile" : "desktop"}>{renderSplide()}</div>
          )}
        </div>
      </div>
    </div>
  );
}