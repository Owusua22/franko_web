import { getBrandUrl } from "../utils/productSlug";
import React from "react";
import { useNavigate } from "react-router-dom";

// Importing image assets directly
import Samsung from "../assets/samsung.webp";
import infinix from "../assets/infinix.webp";
import tecno from "../assets/tec.webp";
import Hmd from "../assets/hmd.webp";
import itelImg from "../assets/itel.webp";
import Huawei from "../assets/huawel.webp";

// Brand data with unique UUIDs
const brands = [
  { id: "760af684-7a19-46ab-acc5-7445ef32073a", name: "Samsung", src: Samsung },
  { id: "c163ee86-1d24-4c97-943b-1f82a09c6066", name: "Infinix", src: infinix },
  { id: "86cca959-70a4-448e-86f1-3601309f49a6", name: "Tecno", src: tecno },
  { id: "fb694e59-77be-455f-9573-acf917ffb39d", name: "HMD", src: Hmd },
  { id: "4c1dba1d-61b2-4ec3-9c03-38036dd02c89", name: "Itel", src: itelImg },
  { id: "d643698d-f794-4d33-9237-4a913aa463a2", name: "Huawei", src: Huawei },
];

const BrandsBanner = () => {
  const navigate = useNavigate();

  const handleBrandClick = (brandId) => {
    navigate(getBrandUrl(brands.find(b => b.id === brandId)));
  };

  return (
    <>
      <style>{`
        :root {
          --bb-font: 'Plus Jakarta Sans', sans-serif;
          --bb-green: #14532d;
          --bb-green-mid: #166534;
          --bb-green-light: #dcfce7;
          --bb-green-lighter: #f0fdf4;
          --bb-green-accent: #22c55e;
          --bb-dark: #1a1a1a;
          --bb-mid: #555;
          --bb-light: #888;
          --bb-border: #e0e0e0;
          --bb-bg-subtle: #f7f7f7;
          --bb-radius: 4px;
        }

        .bb-root, .bb-root * {
          font-family: var(--bb-font);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        /* ==================== HEADER ==================== */

        .bb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .bb-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .bb-title-accent {
          width: 4px;
          height: 22px;
          border-radius: 2px;
          background: var(--bb-green);
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .bb-title-accent { height: 26px; }
        }

        .bb-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--bb-dark);
          letter-spacing: -0.02em;
          line-height: 1;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          .bb-title { font-size: 20px; }
        }

        .bb-header-line {
          flex: 1;
          height: 1px;
          background: var(--bb-border);
          min-width: 20px;
        }

        /* ==================== BRAND CARDS ==================== */

        .bb-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (min-width: 640px) {
          .bb-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 768px) {
          .bb-grid {
            grid-template-columns: repeat(6, 1fr);
            gap: 16px;
          }
        }

        .bb-card {
          border: 1px solid var(--bb-border);
          border-radius: var(--bb-radius);
          background: #fff;
          padding: 20px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 80px;
        }

        @media (min-width: 768px) {
          .bb-card {
            padding: 24px 20px;
            min-height: 90px;
          }
        }

        .bb-card:hover {
          border-color: var(--bb-green-accent);
          box-shadow: 0 4px 16px rgba(20, 83, 45, 0.08);
        }

        .bb-card img {
          max-height: 40px;
          width: auto;
          object-fit: contain;
          transition: transform 0.3s ease;
        }

        @media (min-width: 768px) {
          .bb-card img {
            max-height: 48px;
          }
        }

        .bb-card:hover img {
          transform: scale(1.05);
        }
      `}</style>

      <section className="bb-root py-6 bg-white">
        <div className="mx-auto px-4 md:px-16">
          {/* Header section */}
          <div className="bb-header">
            <div className="bb-title-wrap">
              <div className="bb-title-accent" />
              <h2 className="bb-title">Shop by Brand</h2>
            </div>
            <div className="bb-header-line" />
          </div>

          {/* Brand cards */}
          <div className="bb-grid">
            {brands.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => handleBrandClick(brand.id)}
                className="bb-card"
                aria-label={`Shop ${brand.name} products`}
              >
                {/* Explicit dimensions: these PNGs used to decode with no
                    reserved space and nudged the whole section down. */}
                <img
                  src={brand.src}
                  alt={brand.name}
                  width={120}
                  height={48}
                  loading="lazy"
                  decoding="async"
                  style={{ height: 40, width: "auto" }}
                />
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default BrandsBanner;