import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

import phone from "../assets/phone.jpg";
import laptop from "../assets/lap.jpg";
import fridge from "../assets/fridge.jpg";
import tv from "../assets/tv.jpg";
import speaker from "../assets/speaker.jpg";
import blender from "../assets/blender.jpg";
import ac from "../assets/ac.jpg";
import accessories from "../assets/acce.png";
import machine from "../assets/machine.jpg";

const categories = [
  { name: "Phones", img: phone, route: "/phones" },
  { name: "Laptops", img: laptop, route: "/computers" },
  { name: "Refrigerator", img: fridge, route: "/refrigerator" },
  { name: "Television", img: tv, route: "/television" },
  { name: "Speakers", img: speaker, route: "/speakers" },
  { name: "Appliances", img: blender, route: "/appliances" },
  { name: "Air-conditioners", img: ac, route: "/air-condition" },
  { name: "Accessories", img: accessories, route: "/accessories" },
  { name: "Washing Machine", img: machine, route: "/washing-machine" },
];

const CategoryComponent = () => {
  const scrollRef = useRef(null);
  const autoScrollInterval = useRef(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [autoScrollDir, setAutoScrollDir] = useState("right");
  const [isHovered, setIsHovered] = useState(false);

  const navigate = useNavigate();

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  // FIX: your className had "overflow-x-aut" (typo) so mobile couldn't scroll/slide.
  // We also ensure we always scroll even if the element is at the end (wrap around).
  const scroll = useCallback(
    (direction) => {
      const el = scrollRef.current;
      if (!el) return;

      const isMobile = window.innerWidth < 768;
      const scrollAmount = isMobile ? 220 : 340;

      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    },
    []
  );

  const scrollNextAuto = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const atEnd = scrollLeft + clientWidth >= scrollWidth - 5;
    const atStart = scrollLeft <= 0;

    if (autoScrollDir === "right" && atEnd) {
      setAutoScrollDir("left");
      el.scrollBy({ left: -clientWidth, behavior: "smooth" });
      return;
    }

    if (autoScrollDir === "left" && atStart) {
      setAutoScrollDir("right");
      el.scrollBy({ left: clientWidth, behavior: "smooth" });
      return;
    }

    scroll(autoScrollDir);
  }, [autoScrollDir, scroll]);

  const handleCategoryClick = (category) => {
    navigate(category.route);
  };

  // Attach scroll + resize listeners
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      updateScrollButtons();

      const { scrollLeft, scrollWidth, clientWidth } = el;
      if (scrollLeft + clientWidth >= scrollWidth - 5) setAutoScrollDir("left");
      else if (scrollLeft <= 0) setAutoScrollDir("right");
    };

    updateScrollButtons();
    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateScrollButtons);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [updateScrollButtons]);

  // Auto scroll (works on mobile too)
  useEffect(() => {
    // clear any old interval
    if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);

    if (!isHovered) {
      autoScrollInterval.current = setInterval(() => {
        scrollNextAuto();
      }, 3000);
    }

    return () => {
      if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
    };
  }, [isHovered, scrollNextAuto]);

  return (
    <>
      <style>{`
        .category-section * {
          font-family: 'Plus Jakarta Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .category-scroll::-webkit-scrollbar { display: none; }
        .category-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        .nav-button {
          background: white;
          border: 1.5px solid #e5e7eb;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .nav-button:hover {
          background: #14532d;
          border-color: #14532d;
          box-shadow: 0 4px 12px rgba(20, 83, 45, 0.25);
        }

        .nav-button:hover svg { color: white; }
        .nav-button:active { transform: scale(0.95); }

        .nav-button.disabled {
          opacity: 0;
          pointer-events: none;
          transform: scale(0.9);
        }

        .category-card {
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 1px 4px;
          border-radius: 12px;
          position: relative;
        }

        .category-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #dcfce7 0%, #fff 100%);
          border-radius: 12px;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: -1;
        }

        .category-card:hover::before { opacity: 1; }
        .category-card:hover { transform: translateY(-4px); }

        .category-icon-wrapper {
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px;
          position: relative;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          border: 2px solid #f3f4f6;
        }

        @media (min-width: 768px) {
          .category-icon-wrapper { width: 96px; height: 96px; }
        }
        @media (min-width: 1024px) {
          .category-icon-wrapper { width: 108px; height: 108px; }
        }

        .category-card:hover .category-icon-wrapper {
          border-color: #14532d;
          box-shadow: 0 6px 20px rgba(20, 83, 45, 0.15);
        }

        .category-icon { width: 60%; height: 60%; object-fit: contain; transition: transform 0.3s ease; }
        .category-card:hover .category-icon { transform: scale(1.1) rotate(5deg); }

        .category-name {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          text-align: center;
          transition: color 0.3s ease;
          letter-spacing: -0.01em;
        }

        @media (min-width: 768px) { .category-name { font-size: 14px; } }
        .category-card:hover .category-name { color: #14532d; }

        .section-title {
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, #1a1a1a 0%, #374151 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }

        @media (max-width: 768px) { .section-title { font-size: 22px; } }
      `}</style>

      <section className="category-section bg-gradient-to-b from-gray-50/50 to-white">
        <div className="mx-auto px-1 md:px-8 lg:px-16 py-2 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
            <div>
              <h2 className="section-title">Shop by Category</h2>
              <p className="text-sm md:text-base text-gray-600 font-medium">
                Discover premium electronics & home appliances
              </p>
            </div>
          </div>

          <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <button
              onClick={() => scroll("left")}
              className={`nav-button absolute left-0 z-20 ${!canScrollLeft ? "disabled" : ""}`}
              style={{ top: "50%", transform: "translateY(-50%)" }}
              aria-label="Scroll left"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>

            <div
              ref={scrollRef}
              className="category-scroll flex gap-2 md:gap-8 lg:gap-10 overflow-x-auto md:px-4 lg:px-10"
            >
              {categories.map((cat, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleCategoryClick(cat)}
                  className="category-card flex-shrink-0 w-[100px] md:w-[120px] lg:w-[140px]"
                >
                  <div className="category-icon-wrapper">
                    <img
                      src={cat.img}
                      alt=""
                      width={96}
                      height={96}
                      className="category-icon"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="category-name">{cat.name}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => scroll("right")}
              className={`nav-button absolute right-0 z-20 ${!canScrollRight ? "disabled" : ""}`}
              style={{ top: "50%", transform: "translateY(-50%)" }}
              aria-label="Scroll right"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default CategoryComponent;