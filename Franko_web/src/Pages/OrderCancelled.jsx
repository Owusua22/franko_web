import React, { useEffect } from "react";
import { XCircle, AlertTriangle, ShoppingCart, RefreshCw, HelpCircle, ArrowLeft } from "lucide-react";

function Cancellation() {
  const isVisible = true;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleTryAgain = () => {
    window.location.href = "/checkout";
  };

  const handleContinueShopping = () => {
    window.location.href = "/";
  };

  const handleContactSupport = () => {
    window.location.href = "/contact";
  };

  const reasons = [
    "Payment was not approved on your mobile device",
    "Insufficient balance or incorrect PIN entered",
    "Network connectivity or timeout issues",
    "Transaction was manually cancelled",
  ];

  return (
    <>
      <style>{`
        :root {
          --cn-font: 'Plus Jakarta Sans', sans-serif;
          --cn-green: #14532d;
          --cn-green-mid: #166534;
          --cn-green-600: #16a34a;
          --cn-green-light: #dcfce7;
          --cn-green-lighter: #f0fdf4;
          --cn-dark: #1a1a1a;
          --cn-mid: #555;
          --cn-light: #888;
          --cn-border: #e0e0e0;
          --cn-bg: #f7f7f7;
          --cn-red: #dc2626;
          --cn-red-dark: #991b1b;
          --cn-radius: 4px;
          --cn-radius-lg: 8px;
        }

        .cn-root, .cn-root * {
          font-family: var(--cn-font) !important;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }

        .cn-root {
          min-height: 100vh;
          background: #fff;
          display: flex;
          flex-direction: column;
        }

        .cn-container {
          max-width: 560px;
          margin: 0 auto;
          padding: 32px 16px;
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        @media (min-width: 768px) {
          .cn-container { padding: 48px 24px; }
        }

        /* ==================== PAGE HEADER ==================== */

        .cn-page-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--cn-border);
        }

        .cn-page-header-accent {
          width: 4px; height: 28px; border-radius: 2px;
          background: var(--cn-red); flex-shrink: 0;
        }

        .cn-page-title {
          font-size: 22px; font-weight: 800; color: var(--cn-dark);
          letter-spacing: -0.02em; margin: 0; line-height: 1.2;
        }
        @media (min-width: 768px) { .cn-page-title { font-size: 26px; } }

        .cn-page-count {
          font-size: 13px; font-weight: 500; color: var(--cn-light); margin-top: 2px;
        }

        .cn-page-header-line {
          flex: 1; height: 1px; background: var(--cn-border); display: none;
        }
        @media (min-width: 768px) { .cn-page-header-line { display: block; } }

        /* ==================== MAIN CARD ==================== */

        .cn-card {
          background: #fff;
          border: 1px solid var(--cn-border);
          border-radius: var(--cn-radius);
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px);
          transition: all 0.5s ease;
        }

        .cn-card-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ==================== STATUS BANNER ==================== */

        .cn-status-banner {
          background: var(--cn-red);
          padding: 28px 24px;
          text-align: center;
          position: relative;
        }

        .cn-status-icon-wrap {
          width: 64px; height: 64px; border-radius: 50%;
          background: #fff; display: flex; align-items: center;
          justify-content: center; margin: 0 auto 14px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .cn-status-title {
          font-size: 22px; font-weight: 900; color: #fff;
          letter-spacing: -0.02em; margin: 0 0 4px;
        }
        @media (min-width: 768px) { .cn-status-title { font-size: 24px; } }

        .cn-status-subtitle {
          font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.8);
          margin: 0;
        }

        /* ==================== BODY ==================== */

        .cn-body { padding: 24px; }

        /* ==================== REASONS ==================== */

        .cn-reasons {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: var(--cn-radius);
          padding: 16px;
          margin-bottom: 24px;
        }

        .cn-reasons-header {
          display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
        }

        .cn-reasons-title {
          font-size: 13px; font-weight: 800; color: #92400e;
          text-transform: uppercase; letter-spacing: 0.03em;
        }

        .cn-reasons-list {
          display: flex; flex-direction: column; gap: 8px;
          margin: 0; padding: 0; list-style: none;
        }

        .cn-reason-item {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 13px; font-weight: 500; color: #78350f;
          line-height: 1.5;
        }

        .cn-reason-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #f59e0b; flex-shrink: 0; margin-top: 6px;
        }

        /* ==================== ACTIONS ==================== */

        .cn-actions {
          display: flex; flex-direction: column; gap: 10px;
          margin-bottom: 24px;
        }

        .cn-btn {
          width: 100%; padding: 14px 20px; border: none;
          border-radius: var(--cn-radius); font-size: 14px;
          font-weight: 700; cursor: pointer; transition: all 0.15s;
          font-family: var(--cn-font); display: flex;
          align-items: center; justify-content: center; gap: 8px;
        }
        .cn-btn:active { transform: scale(0.98); }

        .cn-btn-retry {
          background: var(--cn-red); color: #fff;
        }
        .cn-btn-retry:hover {
          background: var(--cn-red-dark);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
        }

        .cn-btn-shop {
          background: var(--cn-green); color: #fff;
        }
        .cn-btn-shop:hover {
          background: var(--cn-green-mid);
          box-shadow: 0 4px 12px rgba(20, 83, 45, 0.2);
        }

        .cn-btn-back {
          background: #fff; color: var(--cn-mid);
          border: 1px solid var(--cn-border);
        }
        .cn-btn-back:hover {
          border-color: var(--cn-green-600); color: var(--cn-green);
          background: var(--cn-green-lighter);
        }

        /* ==================== DIVIDER ==================== */

        .cn-divider {
          height: 1px; background: var(--cn-border);
          margin-bottom: 20px;
        }

        /* ==================== SUPPORT ==================== */

        .cn-support {
          text-align: center;
        }

        .cn-support-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600; color: var(--cn-light);
          text-decoration: none; cursor: pointer;
          border: none; background: none; padding: 0;
          font-family: var(--cn-font); transition: color 0.15s;
        }
        .cn-support-link:hover { color: var(--cn-green); }

        .cn-support-text {
          text-decoration: underline; text-underline-offset: 2px;
        }

        /* ==================== HELP NOTE ==================== */

        .cn-help-note {
          margin-top: 24px; padding: 16px;
          background: var(--cn-bg); border: 1px solid var(--cn-border);
          border-radius: var(--cn-radius); text-align: center;
        }

        .cn-help-note-text {
          font-size: 12px; font-weight: 500; color: var(--cn-light);
          line-height: 1.6; margin: 0;
        }

        .cn-help-note-text strong {
          font-weight: 700; color: var(--cn-mid);
        }
      `}</style>

      <div className="cn-root">
        <div className="cn-container">
          {/* Page Header */}
          <div className="cn-page-header">
            <div className="cn-page-header-accent" />
            <div>
              <h1 className="cn-page-title">Order Cancelled</h1>
              <p className="cn-page-count">Your payment could not be processed</p>
            </div>
            <div className="cn-page-header-line" />
          </div>

          {/* Main Card */}
          <div className={`cn-card ${isVisible ? "cn-card-visible" : ""}`}>
            {/* Status Banner */}
            <div className="cn-status-banner">
              <div className="cn-status-icon-wrap">
                <XCircle style={{ width: 36, height: 36, color: "#dc2626" }} />
              </div>
              <h2 className="cn-status-title">Payment Unsuccessful</h2>
              <p className="cn-status-subtitle">
                Your order was not completed
              </p>
            </div>

            {/* Body */}
            <div className="cn-body">
              {/* Possible Reasons */}
              <div className="cn-reasons">
                <div className="cn-reasons-header">
                  <AlertTriangle style={{ width: 16, height: 16, color: "#d97706", flexShrink: 0 }} />
                  <span className="cn-reasons-title">Possible Reasons</span>
                </div>
                <ul className="cn-reasons-list">
                  {reasons.map((reason, idx) => (
                    <li key={idx} className="cn-reason-item">
                      <span className="cn-reason-dot" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="cn-actions">
                <button onClick={handleTryAgain} className="cn-btn cn-btn-retry">
                  <RefreshCw style={{ width: 18, height: 18 }} />
                  Try Payment Again
                </button>

                <button onClick={handleContinueShopping} className="cn-btn cn-btn-shop">
                  <ShoppingCart style={{ width: 18, height: 18 }} />
                  Continue Shopping
                </button>

                <button onClick={() => window.history.back()} className="cn-btn cn-btn-back">
                  <ArrowLeft style={{ width: 16, height: 16 }} />
                  Go Back
                </button>
              </div>

              {/* Divider */}
              <div className="cn-divider" />

              {/* Support Link */}
              <div className="cn-support">
                <button onClick={handleContactSupport} className="cn-support-link">
                  <HelpCircle style={{ width: 15, height: 15 }} />
                  <span className="cn-support-text">Need help? Contact Support</span>
                </button>
              </div>
            </div>
          </div>

          {/* Help Note */}
          <div className={`cn-help-note ${isVisible ? "cn-card-visible" : ""}`} style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0)" : "translateY(12px)", transition: "all 0.5s ease 0.2s" }}>
            <p className="cn-help-note-text">
              <strong>No charges were made.</strong> If you believe this is an error,
              please check your mobile money balance or contact our support team.
              Your cart items have been saved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Cancellation;