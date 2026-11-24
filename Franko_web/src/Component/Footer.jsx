import { Link } from "react-router-dom";
import { FaTiktok, FaWhatsapp, FaFacebookF, FaXTwitter } from "react-icons/fa6";
import { Phone, MapPin, ChevronRight } from "lucide-react";
import app from "../assets/apps.webp";
import play from "../assets/plays.webp";
import logo from "../assets/frankoIcon-128.webp";

const Footer = () => {
  const companyLinks = [
    { to: "/about", label: "About Us" },
    { to: "/shops", label: "Our Shops" },
    { to: "/contact", label: "Contact Us" },
    { to: "/terms", label: "Terms" },
  ];

  const accountLinks = [
    { to: "/account", label: "My Account" },
    { to: "/wishlist", label: "Wishlist" },
    { to: "/order-history", label: "Orders" },
  ];

  const socials = [
    { href: "https://www.facebook.com/frankotradingenterprise", icon: FaFacebookF, label: "Facebook" },
    { href: "https://x.com/frankotrading1", icon: FaXTwitter, label: "X" },
    { href: "https://www.tiktok.com/@frankotrading", icon: FaTiktok, label: "TikTok" },
  ];

  return (
    <>
      <style>{`
       .ft-root, .ft-root * {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          -webkit-font-smoothing: antialiased;
          box-sizing: border-box;
        }

        .ft-root {
          background: #111827;
          color: #d1d5db;
        }

        .ft-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px 16px 0;
        }
        @media (min-width: 768px) {
          .ft-inner { padding: 36px 40px 0; }
        }

        /* ==================== MOBILE: BRAND ROW ==================== */

        .ft-brand-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid #1f2937;
          margin-bottom: 14px;
        }
        @media (min-width: 768px) {
          .ft-brand-row { display: none; }
        }

        .ft-brand-logo-sm {
          height: 32px;
          object-fit: contain;
          filter: brightness(1.1);
        }

        .ft-brand-contact-sm {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ft-wa-btn-sm {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          background: #166534;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s;
        }
        .ft-wa-btn-sm:hover { background: #14532d; color: #fff; }

        .ft-call-btn-sm {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px; height: 32px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 4px;
          color: #22c55e;
          text-decoration: none;
          transition: all 0.15s;
        }
        .ft-call-btn-sm:hover { background: #166534; color: #fff; border-color: #166534; }

        /* ==================== MOBILE: COMPACT LINKS ==================== */

        .ft-mobile-links {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          border-bottom: 1px solid #1f2937;
          margin-bottom: 14px;
        }
        @media (min-width: 768px) {
          .ft-mobile-links { display: none; }
        }

        .ft-mobile-col {
          padding: 10px 0;
        }
        .ft-mobile-col:first-child {
          padding-right: 16px;
          border-right: 1px solid #1f2937;
        }
        .ft-mobile-col:last-child {
          padding-left: 16px;
        }

        .ft-mobile-col-title {
          font-size: 10px;
          font-weight: 800;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0 0 8px;
        }

        .ft-mobile-link-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .ft-mobile-link {
          font-size: 13px;
          font-weight: 500;
          color: #9ca3af;
          text-decoration: none;
          transition: color 0.15s;
          display: block;
          padding: 1px 0;
        }
        .ft-mobile-link:hover { color: #22c55e; }

        /* ==================== MOBILE: APP ROW ==================== */

        .ft-mobile-app-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid #1f2937;
          margin-bottom: 0;
        }
        @media (min-width: 768px) {
          .ft-mobile-app-row { display: none; }
        }

        .ft-mobile-app-label {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
        }

        .ft-mobile-app-buttons {
          display: flex;
          gap: 6px;
        }

        .ft-mobile-app-img {
          height: 28px;
          width: auto;
          object-fit: contain;
          transition: opacity 0.15s;
        }
        .ft-mobile-app-img:hover { opacity: 0.85; }

        /* ==================== DESKTOP: FULL GRID ==================== */

        .ft-desktop-grid {
          display: none;
          grid-template-columns: 1.4fr 1fr 1fr 1.2fr;
          gap: 32px;
          padding-bottom: 28px;
          border-bottom: 1px solid #1f2937;
        }
        @media (min-width: 768px) {
          .ft-desktop-grid { display: grid; }
        }

        .ft-brand-logo {
          height: 36px;
          object-fit: contain;
          filter: brightness(1.1);
          margin-bottom: 8px;
        }

        .ft-brand-desc {
          font-size: 13px;
          font-weight: 400;
          color: #9ca3af;
          line-height: 1.55;
          margin: 0 0 12px;
        }

        .ft-contact-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .ft-contact-icon {
          width: 13px; height: 13px;
          color: #22c55e;
          flex-shrink: 0;
        }

        .ft-contact-text {
          font-size: 12px;
          color: #9ca3af;
        }

        .ft-contact-link {
          font-size: 13px;
          font-weight: 600;
          color: #e5e7eb;
          text-decoration: none;
          transition: color 0.15s;
        }
        .ft-contact-link:hover { color: #22c55e; }

        .ft-wa-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 6px 14px;
          background: #166534;
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s;
        }
        .ft-wa-btn:hover { background: #14532d; color: #fff; }

        .ft-col-title {
          font-size: 11px;
          font-weight: 800;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin: 0 0 12px;
          padding-bottom: 6px;
          border-bottom: 2px solid #166534;
          display: inline-block;
        }

        .ft-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ft-link {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 13px;
          font-weight: 500;
          color: #9ca3af;
          text-decoration: none;
          transition: all 0.15s;
        }
        .ft-link:hover {
          color: #22c55e;
          transform: translateX(2px);
        }

        .ft-link-chevron {
          width: 11px; height: 11px;
          color: #4b5563;
          flex-shrink: 0;
          transition: color 0.15s;
        }
        .ft-link:hover .ft-link-chevron { color: #22c55e; }

        .ft-app-title {
          font-size: 11px;
          font-weight: 800;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin: 0 0 6px;
        }

        .ft-app-desc {
          font-size: 12px;
          color: #9ca3af;
          margin: 0 0 10px;
          line-height: 1.5;
        }

        .ft-app-buttons {
          display: flex;
          gap: 8px;
        }

        .ft-app-link {
          display: block;
          transition: transform 0.15s;
        }
        .ft-app-link:hover { transform: scale(1.03); }

        .ft-app-img {
          height: 34px;
          width: auto;
          object-fit: contain;
        }

        /* ==================== BOTTOM BAR ==================== */

        .ft-bottom-bar {
          border-top: 1px solid #1f2937;
        }

        .ft-bottom-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        @media (min-width: 768px) {
          .ft-bottom-inner { padding: 12px 40px; }
        }

        .ft-copyright {
          font-size: 11px;
          font-weight: 500;
          color: #6b7280;
          margin: 0;
        }

        .ft-socials {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ft-social-label {
          font-size: 10px;
          font-weight: 600;
          color: #6b7280;
          margin-right: 2px;
          display: none;
        }
        @media (min-width: 768px) {
          .ft-social-label { display: inline; }
        }

        .ft-social-link {
          width: 28px; height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          background: #1f2937;
          color: #9ca3af;
          text-decoration: none;
          transition: all 0.15s;
          border: 1px solid #374151;
        }
        .ft-social-link:hover {
          background: #166534;
          color: #fff;
          border-color: #166534;
        }
      `}</style>

      <footer className="ft-root">
        <div className="ft-inner">

          {/* ==================== MOBILE: Brand + Contact ==================== */}
          <div className="ft-brand-row">
            <img src={logo} alt="Franko Trading" className="ft-brand-logo-sm" width={81} height={56} loading="lazy" decoding="async" />
            <div className="ft-brand-contact-sm">
              <a href="tel:+233503607980" className="ft-call-btn-sm" title="Call us">
                <Phone style={{ width: 14, height: 14 }} />
              </a>
              <a
                href="https://wa.me/233503607980"
                target="_blank"
                rel="noopener noreferrer"
                className="ft-wa-btn-sm"
              >
                <FaWhatsapp style={{ fontSize: 13 }} />
                WhatsApp
              </a>
            </div>
          </div>

          {/* ==================== MOBILE: Compact Links ==================== */}
          <div className="ft-mobile-links">
            <div className="ft-mobile-col">
              <p className="ft-mobile-col-title">Company</p>
              <ul className="ft-mobile-link-list">
                {companyLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="ft-mobile-link">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="ft-mobile-col">
              <p className="ft-mobile-col-title">Account</p>
              <ul className="ft-mobile-link-list">
                {accountLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="ft-mobile-link">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ==================== MOBILE: App Download ==================== */}
          <div className="ft-mobile-app-row">
            <span className="ft-mobile-app-label">Get our app</span>
            <div className="ft-mobile-app-buttons">
              <a
                href="https://apps.apple.com/us/app/franko-trading/id6741319907"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={app} alt="Download on the App Store" className="ft-mobile-app-img" width={136} height={49} loading="lazy" decoding="async" />
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.poldark.mrfranky2"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={play} alt="Get it on Google Play" className="ft-mobile-app-img" width={137} height={49} loading="lazy" decoding="async" />
              </a>
            </div>
          </div>

          {/* ==================== DESKTOP: Full Grid ==================== */}
          <div className="ft-desktop-grid">
            {/* Brand */}
            <div>
              <img src={logo} alt="Franko Trading" className="ft-brand-logo" width={120} height={83} loading="lazy" decoding="async" />
              <p className="ft-brand-desc">
                Ghana's premier destination for phones, electronics, and accessories at unbeatable prices.
              </p>
              <div className="ft-contact-row">
                <Phone className="ft-contact-icon" />
                <a href="tel:+233503607980" className="ft-contact-link">+233 50 360 7980</a>
              </div>
              <div className="ft-contact-row">
                <MapPin className="ft-contact-icon" />
                <span className="ft-contact-text">Kingsway, Accra – Opposite GCB (Former UT Bank Building)</span>
              </div>
              <a
                href="https://wa.me/233503607980"
                target="_blank"
                rel="noopener noreferrer"
                className="ft-wa-btn"
              >
                <FaWhatsapp style={{ fontSize: 14 }} />
                Chat on WhatsApp
              </a>
            </div>

            {/* Company */}
            <div>
              <h4 className="ft-col-title">Company</h4>
              <ul className="ft-links">
                {companyLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="ft-link">
                      <ChevronRight className="ft-link-chevron" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="ft-col-title">Account</h4>
              <ul className="ft-links">
                {accountLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="ft-link">
                      <ChevronRight className="ft-link-chevron" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* App */}
            <div>
              <h4 className="ft-app-title">Download Our App</h4>
              <p className="ft-app-desc">Shop faster with exclusive deals and real-time tracking.</p>
              <div className="ft-app-buttons">
                <a
                  href="https://apps.apple.com/us/app/franko-trading/id6741319907"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ft-app-link"
                >
                  <img src={app} alt="Download on the App Store" className="ft-app-img" width={136} height={49} loading="lazy" decoding="async" />
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.poldark.mrfranky2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ft-app-link"
                >
                  <img src={play} alt="Get it on Google Play" className="ft-app-img" width={137} height={49} loading="lazy" decoding="async" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== BOTTOM BAR ==================== */}
        <div className="ft-bottom-bar">
          <div className="ft-bottom-inner">
            <p className="ft-copyright">
              © {new Date().getFullYear()} Franko Trading Ltd.
            </p>
            <div className="ft-socials">
              <span className="ft-social-label">Follow us</span>
              {socials.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ft-social-link"
                    title={s.label}
                  >
                    <Icon style={{ fontSize: 12 }} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;