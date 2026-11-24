import React, { useEffect } from "react";
import {
  Shield,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CreditCard,
  FileText,
  Info,
  ChevronRight,
  ArrowRight,
  Mail,
} from "lucide-react";
import logo from "../assets/frankoIcon-128.webp";
import { useNavigate } from "react-router-dom";

function Terms() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleContactSupport = () => {
    navigate("/contact");
  };

  const wrongItemRules = [
    "The seals on the box must not be broken/opened.",
    "There should be no dents and liquid intrusion on the item.",
    "Proof of Purchase/Receipt must be provided.",
  ];

  const defectRules = [
    "Within the 7 days, defective items would be replaced with the same piece/unit (depending on stock availability).",
    "All items shall go through inspection and diagnosis on return to verify the reason provided.",
    "Returns (defective items) after 7 days would be sent to the Brand's Service Centre for repairs under the Manufacturer Warranty.",
  ];

  const incompleteRules = [
    "Incomplete package or missing complementary items must be reported within 7 days for immediate redress.",
  ];

  const refundRules = [
    "Refund/charge back request for undelivered orders will go through vetting and approval, with refunds made within 30 days.",
    "Charge back requests must be initiated through customer's bank for payments made via credit card or other banking platforms.",
    "Refunds will be made by cheque for accounting purposes.",
  ];

  return (
    <>
      <style>{`
        .tm-root, .tm-root * {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          -webkit-font-smoothing: antialiased;
          box-sizing: border-box;
        }

        .tm-root {
          min-height: 100vh;
          background: #f8faf9;
        }

        /* ========== HERO ========== */
        .tm-hero {
          position: relative;
          background: linear-gradient(135deg, #166534 0%, #15803d 50%, #16a34a 100%);
          overflow: hidden;
        }

        .tm-hero-overlay {
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm-22 22v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
        }

        .tm-hero-inner {
          position: relative;
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 16px;
          text-align: center;
        }
        @media (min-width: 768px) {
          .tm-hero-inner { padding: 48px 40px; }
        }

        .tm-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.2);
          padding: 5px 14px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 14px;
          letter-spacing: 0.03em;
        }

        .tm-hero-logo {
          height: 48px;
          width: auto;
          object-fit: contain;
          margin-bottom: 12px;
          filter: brightness(1.1);
        }

        .tm-hero-title {
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 6px;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        @media (min-width: 768px) {
          .tm-hero-title { font-size: 38px; margin-bottom: 10px; }
        }

        .tm-hero-subtitle {
          font-size: 16px;
          font-weight: 700;
          color: rgba(255,255,255,0.95);
          margin: 0 0 6px;
          letter-spacing: 0.02em;
        }

        .tm-hero-desc {
          font-size: 14px;
          font-weight: 400;
          color: rgba(255,255,255,0.8);
          max-width: 520px;
          margin: 0 auto;
          line-height: 1.55;
        }
        @media (min-width: 768px) {
          .tm-hero-desc { font-size: 15px; }
        }

        .tm-hero-circle-1 {
          position: absolute;
          top: -40px;
          right: -40px;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .tm-hero-circle-2 {
          position: absolute;
          bottom: -30px;
          left: -30px;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }

        /* ========== BREADCRUMB ========== */
        .tm-breadcrumb {
          max-width: 1100px;
          margin: 0 auto;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
          color: #9ca3af;
        }
        @media (min-width: 768px) {
          .tm-breadcrumb { padding: 14px 40px; }
        }
        .tm-breadcrumb a {
          color: #166534;
          text-decoration: none;
          transition: color 0.15s;
        }
        .tm-breadcrumb a:hover { color: #14532d; }

        /* ========== MAIN ========== */
        .tm-main {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 16px 40px;
        }
        @media (min-width: 768px) {
          .tm-main { padding: 0 40px 56px; }
        }

        /* ========== CARD ========== */
        .tm-card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          transition: box-shadow 0.2s;
        }
        .tm-card:hover {
          box-shadow: 0 8px 30px rgba(0,0,0,0.06);
        }

        .tm-accent-top {
          height: 3px;
          background: linear-gradient(90deg, #166534, #22c55e, #166534);
        }

        /* ========== POLICY NOTICE ========== */
        .tm-notice {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px 18px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          margin-bottom: 28px;
        }

        .tm-notice-icon {
          width: 20px;
          height: 20px;
          color: #166534;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .tm-notice-text {
          font-size: 13.5px;
          font-weight: 500;
          color: #374151;
          line-height: 1.6;
          margin: 0;
        }

        .tm-notice-highlight {
          font-weight: 800;
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }

        /* ========== SECTION HEADER ========== */
        .tm-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #f3f4f6;
        }

        .tm-section-icon-wrap {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .tm-section-title {
          font-size: 16px;
          font-weight: 800;
          color: #111827;
          margin: 0;
          letter-spacing: -0.01em;
          text-transform: uppercase;
        }
        @media (min-width: 768px) {
          .tm-section-title { font-size: 18px; }
        }

        /* ========== POLICY BLOCK ========== */
        .tm-policy-block {
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          margin-bottom: 16px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .tm-policy-block:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.05);
          transform: translateY(-1px);
        }
        .tm-policy-block:last-child {
          margin-bottom: 0;
        }

        .tm-policy-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          color: #fff;
        }

        .tm-policy-header-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .tm-policy-header-title {
          font-size: 13px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        @media (min-width: 768px) {
          .tm-policy-header-title { font-size: 14px; }
        }

        .tm-policy-body {
          padding: 16px 18px;
        }

        .tm-rule-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tm-rule-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .tm-rule-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 7px;
        }

        .tm-rule-text {
          font-size: 13px;
          font-weight: 500;
          color: #4b5563;
          line-height: 1.55;
          margin: 0;
        }
        @media (min-width: 768px) {
          .tm-rule-text { font-size: 13.5px; }
        }

        /* ========== DIVIDER ========== */
        .tm-divider {
          height: 1px;
          background: #f3f4f6;
          margin: 28px 0;
        }

        /* ========== CONTACT CTA ========== */
        .tm-cta {
          background: #f8faf9;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 24px 20px;
          text-align: center;
          margin-top: 28px;
        }

        .tm-cta-title {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 4px;
        }

        .tm-cta-desc {
          font-size: 13px;
          font-weight: 400;
          color: #6b7280;
          margin: 0 0 16px;
          line-height: 1.5;
        }

        .tm-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          background: #166534;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.01em;
        }
        .tm-cta-btn:hover {
          background: #14532d;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(22,101,52,0.3);
        }

        /* ========== FOOTER NOTE ========== */
        .tm-footer-note {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 16px 32px;
          text-align: center;
        }
        @media (min-width: 768px) {
          .tm-footer-note { padding: 0 40px 40px; }
        }

        .tm-footer-text {
          font-size: 12px;
          font-weight: 500;
          color: #9ca3af;
          margin: 0;
        }

        /* ========== CARD INNER PADDING ========== */
        .tm-card-body {
          padding: 24px 20px;
        }
        @media (min-width: 768px) {
          .tm-card-body { padding: 28px 28px; }
        }
      `}</style>

      <div className="tm-root">
        {/* Hero */}
        <div className="tm-hero">
          <div className="tm-hero-overlay" />
          <div className="tm-hero-inner">
            <div className="tm-hero-badge">
              <FileText style={{ width: 12, height: 12 }} />
              Terms & Policies
            </div>
            <img src={logo} alt="Franko Trading" className="tm-hero-logo" />
            <h1 className="tm-hero-title">Franko Trading Limited</h1>
            <p className="tm-hero-desc">
              Your trusted partner in electronics. Review our terms and policies
              for a seamless shopping experience.
            </p>
          </div>
          <div className="tm-hero-circle-1" />
          <div className="tm-hero-circle-2" />
        </div>

        {/* Breadcrumb */}
        <div className="tm-breadcrumb">
          <a href="/">Home</a>
          <ChevronRight style={{ width: 12, height: 12, color: "#d1d5db" }} />
          <span>Terms & Conditions</span>
        </div>

        {/* Main Content */}
        <div className="tm-main">
          <div className="tm-card">
            <div className="tm-accent-top" />
            <div className="tm-card-body">
              {/* Policy Notice */}
              <div className="tm-notice">
                <Info className="tm-notice-icon" />
                <p className="tm-notice-text">
                  Subject to Terms and Conditions, Franko Trading Enterprise
                  offers returns and/or exchange or refund for items purchased
                  within{" "}
                  <span className="tm-notice-highlight">
                    7 DAYS OF PURCHASE
                  </span>
                  . We do not accept returns and/or exchange for any reason
                  whatsoever after the stated period has elapsed.
                </p>
              </div>

              {/* Eligibility Section */}
              <div className="tm-section-header">
                <div
                  className="tm-section-icon-wrap"
                  style={{ background: "#f0fdf4" }}
                >
                  <CheckCircle
                    style={{ width: 18, height: 18, color: "#166534" }}
                  />
                </div>
                <h3 className="tm-section-title">
                  Eligibility for Refund, Return, and/or Exchange
                </h3>
              </div>

              {/* Wrong Item */}
              <div
                className="tm-policy-block"
                style={{ borderColor: "#fecaca" }}
              >
                <div
                  className="tm-policy-header"
                  style={{ background: "#dc2626" }}
                >
                  <XCircle className="tm-policy-header-icon" />
                  <h4 className="tm-policy-header-title">
                    Wrong Item Delivered
                  </h4>
                </div>
                <div
                  className="tm-policy-body"
                  style={{ background: "#fef2f2" }}
                >
                  <ul className="tm-rule-list">
                    {wrongItemRules.map((rule, i) => (
                      <li className="tm-rule-item" key={i}>
                        <div
                          className="tm-rule-dot"
                          style={{ background: "#f87171" }}
                        />
                        <p className="tm-rule-text">{rule}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Manufacturing Defects */}
              <div
                className="tm-policy-block"
                style={{ borderColor: "#bbf7d0" }}
              >
                <div
                  className="tm-policy-header"
                  style={{ background: "#166534" }}
                >
                  <AlertTriangle className="tm-policy-header-icon" />
                  <h4 className="tm-policy-header-title">
                    Manufacturing Defects
                  </h4>
                </div>
                <div
                  className="tm-policy-body"
                  style={{ background: "#f0fdf4" }}
                >
                  <ul className="tm-rule-list">
                    {defectRules.map((rule, i) => (
                      <li className="tm-rule-item" key={i}>
                        <div
                          className="tm-rule-dot"
                          style={{ background: "#4ade80" }}
                        />
                        <p className="tm-rule-text">{rule}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Incomplete Package */}
              <div
                className="tm-policy-block"
                style={{ borderColor: "#fde68a" }}
              >
                <div
                  className="tm-policy-header"
                  style={{ background: "#a16207" }}
                >
                  <Package className="tm-policy-header-icon" />
                  <h4 className="tm-policy-header-title">
                    Incomplete Package
                  </h4>
                </div>
                <div
                  className="tm-policy-body"
                  style={{ background: "#fefce8" }}
                >
                  <ul className="tm-rule-list">
                    {incompleteRules.map((rule, i) => (
                      <li className="tm-rule-item" key={i}>
                        <div
                          className="tm-rule-dot"
                          style={{ background: "#fbbf24" }}
                        />
                        <p className="tm-rule-text">{rule}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Divider */}
              <div className="tm-divider" />

              {/* Refund Section */}
              <div className="tm-section-header">
                <div
                  className="tm-section-icon-wrap"
                  style={{ background: "#eff6ff" }}
                >
                  <CreditCard
                    style={{ width: 18, height: 18, color: "#2563eb" }}
                  />
                </div>
                <h3 className="tm-section-title">
                  Refund / Charge Back Policy
                </h3>
              </div>

              <div
                className="tm-policy-block"
                style={{ borderColor: "#bfdbfe" }}
              >
                <div
                  className="tm-policy-header"
                  style={{ background: "#2563eb" }}
                >
                  <Package className="tm-policy-header-icon" />
                  <h4 className="tm-policy-header-title">
                    Undelivered Order / Package
                  </h4>
                </div>
                <div
                  className="tm-policy-body"
                  style={{ background: "#eff6ff" }}
                >
                  <ul className="tm-rule-list">
                    {refundRules.map((rule, i) => (
                      <li className="tm-rule-item" key={i}>
                        <div
                          className="tm-rule-dot"
                          style={{ background: "#60a5fa" }}
                        />
                        <p className="tm-rule-text">{rule}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Contact CTA */}
              <div className="tm-cta">
                <h4 className="tm-cta-title">Questions about our policies?</h4>
                <p className="tm-cta-desc">
                  Our customer service team is here to help you understand our
                  terms and assist with your needs.
                </p>
                <button onClick={handleContactSupport} className="tm-cta-btn">
                  <Shield style={{ width: 16, height: 16 }} />
                  Contact Support
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="tm-footer-note">
          <p className="tm-footer-text">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </>
  );
}

export default Terms;