import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSalesOrderById,
  fetchOrderDeliveryAddress,
  cancelOrder,
} from "../Redux/Slice/orderSlice";
import {
  Modal,
  Spin,
  Typography,
  Image,
  Card,
  Button,
  Badge,
  Tag,
  Empty,
  Tooltip,
  message,
  Result,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  HomeOutlined,
  DownloadOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  StopOutlined,
  WarningOutlined,
  EyeOutlined,
} from "@ant-design/icons";

import { CMS_BASE_URL } from "../config/media";

const { Title, Text } = Typography;

// ==================== CONSTANTS ====================
const COMPANY_INFO = {
  name: "Franko Trading Ltd.",
  tagline: "home of quality phones and electronics",
  phone: "030 222 5651",
  email: "it@frankotrading.com",
  address: "Accra, Ghana",
  website: "www.frankotrading.com",
  logoPath: "/frankoIcon.png", // public folder
};

const isOrderCancellable = (status) => {
  if (!status) return false;
  return String(status).trim() === "Order Placement";
};

const getStatusConfig = (status) => {
  const s = String(status || "N/A").trim();
  const map = {
    Pending: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Pending", icon: ClockCircleOutlined },
    Processing: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "Processing", icon: ClockCircleOutlined },
    "Order Placement": { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe", label: "Order Placement", icon: FileTextOutlined },
    "Wrong Number": { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", label: "Wrong Number", icon: ExclamationCircleOutlined },
    Delivery: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", label: "Delivered", icon: CheckCircleOutlined },
    Completed: { color: "#14532d", bg: "#f0fdf4", border: "#bbf7d0", label: "Completed", icon: CheckCircleOutlined },
    Cancelled: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Cancelled", icon: StopOutlined },
    Unreachable: { color: "#4b5563", bg: "#f9fafb", border: "#e5e7eb", label: "Unreachable", icon: ExclamationCircleOutlined },
    "Not Answered": { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", label: "Not Answered", icon: ExclamationCircleOutlined },
    "Multiple order": { color: "#0e7490", bg: "#ecfeff", border: "#a5f3fc", label: "Multiple Order", icon: ShoppingOutlined },
  };
  return map[s] || { color: "#4b5563", bg: "#f9fafb", border: "#e5e7eb", label: s, icon: ExclamationCircleOutlined };
};

// ==================== COMPONENT ====================
const OrderModal = ({ orderId, orderCode, isModalVisible, onClose, onCancelled }) => {
  const dispatch = useDispatch();
  const ordersState = useSelector((state) => state.orders || {});
  const salesOrderRaw = ordersState.salesOrder || [];
  const deliveryAddressRaw = ordersState.deliveryAddress || null;

  const loading = useMemo(() => {
    const s = ordersState.loadingStatus?.salesOrder;
    if (typeof s === "boolean") return s;
    return typeof ordersState.loading === "boolean" ? ordersState.loading : false;
  }, [ordersState.loading, ordersState.loadingStatus]);

  const error = useMemo(() => {
    const raw = ordersState.errorStatus?.salesOrder ?? ordersState.error?.salesOrder ?? null;
    if (typeof raw === "string" && raw.trim()) return raw;
    if (raw && typeof raw === "object" && typeof raw.message === "string") return raw.message;
    if (typeof ordersState.error === "string" && ordersState.error.trim()) return ordersState.error;
    if (ordersState.error && typeof ordersState.error === "object") {
      const first = Object.values(ordersState.error).find((v) => typeof v === "string" && v.trim());
      if (first) return first;
    }
    if (ordersState.errorStatus && typeof ordersState.errorStatus === "object") {
      const first = Object.values(ordersState.errorStatus).find((v) => typeof v === "string" && v.trim());
      if (first) return first;
    }
    return null;
  }, [ordersState.error, ordersState.errorStatus]);

  const [imagePreview, setImagePreview] = useState({ visible: false, url: null });
  const [isDownloading, setIsDownloading] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState({ visible: false, orderCode: null });

  const activeCode = orderCode || orderId;

  useEffect(() => {
    if (activeCode && isModalVisible) {
      dispatch(fetchSalesOrderById(activeCode));
      dispatch(fetchOrderDeliveryAddress(activeCode));
      setCancelSuccess({ visible: false, orderCode: null });
    }
  }, [dispatch, activeCode, isModalVisible]);

  const orderItems = useMemo(() => {
    if (!salesOrderRaw) return [];
    if (Array.isArray(salesOrderRaw)) return salesOrderRaw;
    if (salesOrderRaw.data && Array.isArray(salesOrderRaw.data)) return salesOrderRaw.data;
    if (salesOrderRaw.result && Array.isArray(salesOrderRaw.result)) return salesOrderRaw.result;
    return [];
  }, [salesOrderRaw]);

  const addressInfo = useMemo(() => {
    if (!deliveryAddressRaw) return {};
    if (Array.isArray(deliveryAddressRaw) && deliveryAddressRaw.length > 0) return deliveryAddressRaw[0];
    if (typeof deliveryAddressRaw === "object") return deliveryAddressRaw;
    return {};
  }, [deliveryAddressRaw]);

  const firstItem = orderItems[0] || {};
  const orderStatus = firstItem.orderCycle || firstItem.OrderCycle || firstItem.status || addressInfo.orderCycle || "Pending";
  const statusCfg = getStatusConfig(orderStatus);
  const StatusIcon = statusCfg.icon;
  const cancellable = isOrderCancellable(orderStatus);

  const totalAmount = orderItems.reduce((acc, item) => acc + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0);
  const totalItems = orderItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0);
  const totalUnique = orderItems.length;

  const formatPrice = (amount) => {
    const n = parseFloat(amount || 0);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return String(dateString);
  }
};
// Example output: "22 September 2026, 13:43:52"

  // ==================== INVOICE GENERATOR WITH FRANKO LOGO ====================
  const generateInvoiceHTML = () => {
    if (!orderItems || orderItems.length === 0) return null;
    const order = firstItem;
    const addr = addressInfo;
    const currentDate = new Date();

    const itemsRows = orderItems
      .map(
        (item, index) => `
        <tr>
          <td style="text-align:center;font-weight:700;padding:12px;border-bottom:1px solid #f3f4f6;">${index + 1}</td>
          <td style="padding:12px;border-bottom:1px solid #f3f4f6;">
            <div style="font-weight:700;font-size:13px;color:#111827;">${item.productName || "Product"}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">SKU: ${(item.productCode || `PRD${String(index + 1).padStart(4, "0")}`).toString().substring(0, 40)}</div>
          </td>
          <td style="text-align:center;padding:12px;border-bottom:1px solid #f3f4f6;"><span style="display:inline-flex;min-width:28px;height:22px;padding:0 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:100px;font-size:11px;font-weight:800;color:#14532d;align-items:center;justify-content:center;">${item.quantity || 0}</span></td>
          <td style="text-align:right;padding:12px;border-bottom:1px solid #f3f4f6;font-size:12px;">GH₵ ${formatPrice(item.price)}</td>
          <td style="text-align:right;padding:12px;border-bottom:1px solid #f3f4f6;font-weight:700;font-size:12px;">GH₵ ${formatPrice((item.price || 0) * (item.quantity || 0))}</td>
        </tr>
      `
      )
      .join("");

    // Use public folder logo - will work in production. Fallback to text if not found.
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice - ${order?.orderCode || activeCode}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:'Plus Jakarta Sans',sans-serif;color:#111827;background:#fff;line-height:1.6;padding:0}
          .page{max-width:850px;margin:0 auto;background:#fff;box-shadow:0 0 0 1px #f3f4f6}
          .top-bar{height:6px;background:linear-gradient(90deg,#14532d,#16a34a,#22c55e)}
          .header{padding:28px 32px 22px;display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #f3f4f6;align-items:flex-start;flex-wrap:wrap}
          .brand{display:flex;gap:14px;align-items:center}
          .brand-logo-wrap{width:64px;height:64px;border-radius:14px;overflow:hidden;background:#fff;border:2px solid #f0fdf4;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(20,83,45,0.08)}
          .brand-logo-wrap img{width:100%;height:100%;object-fit:contain;padding:4px}
          .brand-text{}
          .brand-name{font-size:20px;font-weight:900;letter-spacing:-0.02em;color:#14532d;line-height:1.1}
          .brand-tagline{font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.06em;margin-top:3px}
          .brand-contacts{margin-top:10px;font-size:11px;color:#4b5563;line-height:1.6}
          .brand-contacts strong{color:#111827}
          .invoice-meta{text-align:right;min-width:220px}
          .invoice-type{font-size:32px;font-weight:900;color:#14532d;letter-spacing:-0.02em;line-height:1}
          .invoice-id{font-family:'SF Mono',monospace;font-size:12px;font-weight:700;background:#f3f4f6;border:1px solid #e5e7eb;padding:5px 12px;border-radius:8px;display:inline-block;margin-top:10px;color:#111827}
          .meta-details{margin-top:14px;font-size:11px;color:#6b7280;line-height:1.7;text-align:right}
          .meta-details strong{color:#374151}
          .content{padding:26px 32px}
          .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px}
          .info-card{background:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;padding:16px}
          .info-card.highlight{border-left:4px solid #14532d;background:linear-gradient(135deg,#f9fafb,#f0fdf4)}
          .info-title{font-size:11px;font-weight:800;color:#14532d;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;display:flex;align-items:center;gap:6px}
          .info-row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px dashed #f3f4f6}
          .info-row:last-child{border-bottom:none}
          .info-label{color:#6b7280;font-weight:500}.info-value{font-weight:700;text-align:right;max-width:65%;color:#111827}
          .section-title{font-size:13px;font-weight:800;margin:20px 0 12px;display:flex;align-items:center;gap:8px;color:#111827}
          .section-title::before{content:'';width:4px;height:16px;background:#14532d;border-radius:2px;display:inline-block}
          table{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:12px 0 18px}
          thead{background:#f9fafb}th{padding:12px;font-size:10px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:1px solid #e5e7eb}
          .totals{margin-left:auto;max-width:320px;margin-top:10px;background:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;padding:14px}
          .total-row{display:flex;justify-content:space-between;padding:7px 0;font-size:12px}
          .total-row.grand{font-size:16px;font-weight:900;border-top:2px solid #111827;margin-top:8px;padding-top:12px}
          .total-row.grand span:last-child{color:#14532d}
          .payment-box{margin-top:20px;padding:14px 16px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1px solid #bbf7d0;border-radius:10px;font-size:11px;color:#166534;line-height:1.6}
          .footer{margin-top:30px;padding:20px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center}
          .footer .thank{font-size:14px;font-weight:800;color:#14532d;margin-bottom:6px}
          .footer p{font-size:11px;color:#6b7280;margin:3px 0}
          .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:110px;font-weight:900;color:rgba(20,83,45,0.035);z-index:-1;white-space:nowrap;pointer-events:none}
          @media print{body{padding:0}.page{box-shadow:none;border:none}.top-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
        </style>
      </head>
      <body>
        <div class="watermark">FRANKO TRADING</div>
        <div class="page">
          <div class="top-bar"></div>
          <div class="header">
            <div class="brand">
              <div class="brand-logo-wrap">
                <img src="${COMPANY_INFO.logoPath}" alt="Franko Trading Logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'" />
                <div style="display:none;width:100%;height:100%;background:linear-gradient(135deg,#14532d,#16a34a);color:#fff;font-weight:900;font-size:28px;align-items:center;justify-content:center;">F</div>
              </div>
              <div class="brand-text">
                <div class="brand-name">${COMPANY_INFO.name}</div>
                <div class="brand-tagline">${COMPANY_INFO.tagline}</div>
                <div class="brand-contacts">
                  <div><strong>Phone:</strong> ${COMPANY_INFO.phone}</div>
                  <div><strong>Email:</strong> ${COMPANY_INFO.email}</div>
                  <div><strong>Address:</strong> ${COMPANY_INFO.address} | ${COMPANY_INFO.website}</div>
                </div>
              </div>
            </div>
            <div class="invoice-meta">
              <div class="invoice-type">INVOICE</div>
              <div class="invoice-id">#${order?.orderCode || activeCode}</div>
              <div class="meta-details">
                <div><strong>Order Date:</strong> ${formatDateTime(order?.orderDate)}</div>
<div><strong>Invoice Date:</strong> ${formatDateTime(currentDate)}</div>
                <div><strong>Payment:</strong> ${order?.paymentMode || "N/A"}</div>
                <div><strong>Status:</strong> ${orderStatus}</div>
              </div>
            </div>
          </div>

          <div class="content">
            <div class="grid-2">
              <div class="info-card highlight">
                <div class="info-title">👤 Bill To / Delivery Details</div>
                <div class="info-row"><span class="info-label">Recipient</span><span class="info-value">${addr?.recipientName || "N/A"}</span></div>
                <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${addr?.recipientContactNumber || "N/A"}</span></div>
                <div class="info-row"><span class="info-label">Address</span><span class="info-value">${addr?.address || "N/A"}</span></div>
                ${addr?.orderNote && addr.orderNote !== "N/A" ? `<div class="info-row"><span class="info-label">Order Note</span><span class="info-value" style="font-style:italic;">${addr.orderNote}</span></div>` : ""}
              </div>
              <div class="info-card">
                <div class="info-title">📦 Order Summary</div>
                <div class="info-row"><span class="info-label">Order Code</span><span class="info-value" style="font-family:monospace;">${order?.orderCode || activeCode}</span></div>
                <div class="info-row"><span class="info-label">Total Items</span><span class="info-value">${totalItems} items (${totalUnique} types)</span></div>
                <div class="info-row"><span class="info-label">Delivery Fee</span><span class="info-value">GH₵ 0.00</span></div>
                <div class="info-row"><span class="info-label">Total Amount</span><span class="info-value" style="font-weight:900;color:#14532d;font-size:13px;">GH₵ ${formatPrice(totalAmount)}</span></div>
              </div>
            </div>

            <div class="section-title">Order Items</div>
            <table>
              <thead><tr><th style="width:50px;text-align:center;">#</th><th>Product Details</th><th style="width:70px;text-align:center;">Qty</th><th style="width:110px;text-align:right;">Unit Price</th><th style="width:120px;text-align:right;">Amount</th></tr></thead>
              <tbody>${itemsRows}</tbody>
            </table>

            <div class="totals">
              <div class="total-row"><span>Subtotal</span><span>GH₵ ${formatPrice(totalAmount)}</span></div>
              <div class="total-row"><span>Delivery Fee</span><span>GH₵ 0.00</span></div>
              <div class="total-row"><span>Tax</span><span>GH₵ 0.00</span></div>
              <div class="total-row grand"><span>Total Paid</span><span>GH₵ ${formatPrice(totalAmount)}</span></div>
            </div>



          <div class="footer">
            <div class="thank">Thank you for shopping with Franko Trading! 🎉</div>
            <p>This is a computer-generated invoice • No signature required • Valid as original</p>

          </div>
        </div>
      </body>
      </html>
    `;
  };

  const openPrintWindow = (html) => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      message.error("Please allow pop-ups to view invoice");
      return null;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    return w;
  };

  const handleViewInvoice = () => {
    try {
      setIsDownloading(true);
      if (!orderItems.length) {
        message.error("No order data to generate invoice");
        return;
      }
      const html = generateInvoiceHTML();
      if (!html) return;
      const win = openPrintWindow(html);
      if (!win) return;
      win.onload = () => setTimeout(() => win.focus(), 300);
      message.success("Invoice opened - Use browser Print to save as PDF");
    } catch (e) {
      console.error(e);
      message.error("Failed to generate invoice");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadInvoice = () => {
    try {
      const html = generateInvoiceHTML();
      if (!html) {
        message.error("No invoice data");
        return;
      }
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${activeCode}-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success("Invoice downloaded to your device");
    } catch (e) {
      console.error(e);
      message.error("Download failed");
    }
  };

  const handleCancelOrder = async () => {
    if (!activeCode) return;
    setIsCancelling(true);
    try {
      const result = await dispatch(cancelOrder(activeCode)).unwrap();
      console.log("Cancel success:", result);
      setCancelConfirmVisible(false);

      // Show success message - prominent success modal
      setCancelSuccess({ visible: true, orderCode: activeCode });
      message.success({
        content: `Order #${activeCode} cancelled successfully! Refund will be processed within 24-48 hours.`,
        duration: 5,
        style: { fontWeight: 600 },
      });

      // Callback to refresh parent
      setTimeout(() => {
        onCancelled?.();
      }, 500);
    } catch (err) {
      const raw = err?.message || err?.responseMessage || err?.rawMessage || "Failed to cancel order. Please try again.";
      const lower = String(raw).toLowerCase();
      const friendly =
        lower.includes("datareader") || lower.includes("transaction failed")
          ? "Unable to cancel at the moment. Please try again later or contact support at 030 222 5651."
          : raw;
      message.error(friendly);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelSuccessClose = () => {
    setCancelSuccess({ visible: false, orderCode: null });
    onClose?.();
    onCancelled?.();
  };

  const backendBaseURL = CMS_BASE_URL;
  const handleImageError = (e) => {
    e.target.style.display = "none";
    if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
  };

  const renderProductImage = (item) => {
    const imagePath = item?.imagePath;
    const imageUrl = imagePath ? `${backendBaseURL}/Media/Products_Images/${imagePath.split("\\").pop()}` : null;
    return (
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", background: "#f9fafb", border: "1px solid #f3f4f6" }}>
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={item?.productName || "Product"}
                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                onError={handleImageError}
                onClick={() => setImagePreview({ visible: true, url: imageUrl })}
              />
              <div style={{ width: "100%", height: "100%", display: "none", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
                <ShoppingOutlined style={{ color: "#9ca3af" }} />
              </div>
            </>
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShoppingOutlined style={{ color: "#9ca3af" }} />
            </div>
          )}
        </div>
        <Badge count={item?.quantity || 0} size="small" style={{ position: "absolute", top: -6, right: -6, backgroundColor: "#14532d", fontSize: 10, height: 18, minWidth: 18, lineHeight: 18 }} />
      </div>
    );
  };

  return (
    <>
      <style>{`
        .order-modal-pro .ant-modal-content{border-radius:16px;overflow:hidden;padding:0;box-shadow:0 20px 60px rgba(0,0,0,0.12)}
        .order-modal-pro .ant-modal-header{padding:0;border-bottom:none;background:#fff}
        .order-modal-pro .ant-modal-body{padding:0}
        .order-modal-pro .ant-modal-footer{padding:0;border:none}
        .custom-scrollbar::-webkit-scrollbar{width:4px}
        .custom-scrollbar::-webkit-scrollbar-track{background:#f9fafb}
        .custom-scrollbar::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:2px}
        @media (max-width:768px){.order-modal-pro .ant-modal{max-width:calc(100vw - 16px) !important;margin:8px !important}}
        .cancel-success-modal .ant-modal-content{border-radius:20px;overflow:hidden;padding:0}
        .cancel-success-modal .ant-result-icon .anticon{font-size:64px}
      `}</style>

      <Modal
        open={isModalVisible}
        onCancel={onClose}
        width="100%"
        centered
        className="order-modal-pro"
        style={{ maxWidth: 820, margin: "0 auto" }}
        closeIcon={null}
        footer={null}
        title={
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", background: "#fff", border: "1px solid #f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={COMPANY_INFO.logoPath} alt="Franko" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div style="width:100%;height:100%;background:linear-gradient(135deg,#14532d,#16a34a);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;">F</div>' }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>Order Details</span>
                  <Tag style={{ margin: 0, borderRadius: 100, fontSize: 11, fontWeight: 700, background: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border }}>
                    <StatusIcon style={{ fontSize: 10 }} /> {statusCfg.label}
                  </Tag>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace", fontWeight: 600 }}>#{activeCode} • {firstItem.orderDate ? new Date(firstItem.orderDate).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {cancellable && (
                <Tooltip title="Cancel Order Placement">
                  <Button danger size="small" icon={<StopOutlined />} onClick={() => setCancelConfirmVisible(true)} style={{ borderRadius: 8, fontWeight: 600, fontSize: 12, height: 30 }}>
                    Cancel Order
                  </Button>
                </Tooltip>
              )}
              <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: "#f9fafb", border: "1px solid #f3f4f6" }} />
            </div>
          </div>
        }
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 64 }}>
            <Spin size="large" />
            <div style={{ marginTop: 12, color: "#6b7280", fontSize: 13 }}></div>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ width: 56, height: 56, background: "#fef2f2", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", border: "1px solid #fecaca" }}>
              <ExclamationCircleOutlined style={{ color: "#ef4444", fontSize: 26 }} />
            </div>
            <Title level={5} style={{ fontSize: 15, color: "#991b1b" }}>Unable to load order</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>{typeof error === "string" && error.toLowerCase().includes("datareader") ? "Something went wrong. Please try again." : typeof error === "string" ? error : "Failed to load order details."}</Text>
            <div style={{ marginTop: 16 }}><Button onClick={onClose} style={{ borderRadius: 8 }}>Close</Button></div>
          </div>
        ) : orderItems.length === 0 ? (
          <div style={{ padding: 40 }}><Empty description={`No details for #${activeCode}`} /></div>
        ) : (
          <>
            <div style={{ maxHeight: "62vh", overflowY: "auto", padding: 14, background: "#fcfcfd" }} className="custom-scrollbar">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
                <Card bodyStyle={{ padding: "10px 12px", textAlign: "center" }} style={{ borderRadius: 12, background: "linear-gradient(135deg,#eff6ff,#dbeafe)", border: "1px solid #bfdbfe" }}>
                  <CalendarOutlined style={{ color: "#2563eb", fontSize: 16, marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Order Date</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginTop: 2 }}>{firstItem.orderDate ? new Date(firstItem.orderDate).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}</div>
                </Card>
                <Card bodyStyle={{ padding: "10px 12px", textAlign: "center" }} style={{ borderRadius: 12, background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #bbf7d0" }}>
                  <ShoppingOutlined style={{ color: "#16a34a", fontSize: 16, marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Total Items</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#14532d", marginTop: 2 }}>{totalItems}</div>
                </Card>
                <Card bodyStyle={{ padding: "10px 12px", textAlign: "center" }} style={{ borderRadius: 12, background: "linear-gradient(135deg,#fef3c7,#fde68a)", border: "1px solid #fcd34d" }}>
                  <DollarOutlined style={{ color: "#d97706", fontSize: 16, marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Total</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e", marginTop: 2 }}>GH₵ {formatPrice(totalAmount)}</div>
                </Card>
              </div>

              <Card
                style={{ marginBottom: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}
                bodyStyle={{ padding: 12 }}
                title={
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
                    <div style={{ width: 26, height: 26, background: "#14532d", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <EnvironmentOutlined style={{ color: "#fff", fontSize: 13 }} />
                    </div>
                    Delivery Information
                  </div>
                }
                headStyle={{ padding: "8px 12px", minHeight: "auto", borderBottom: "1px solid #f3f4f6" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, padding: "8px 10px", background: "#f9fafb", borderRadius: 8 }}>
                    <UserOutlined style={{ color: "#14532d" }} />
                    <div><div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>Recipient</div><div style={{ fontSize: 12, fontWeight: 700 }}>{addressInfo.recipientName || "N/A"}</div></div>
                  </div>
                  <div style={{ display: "flex", gap: 8, padding: "8px 10px", background: "#f9fafb", borderRadius: 8 }}>
                    <PhoneOutlined style={{ color: "#059669" }} />
                    <div><div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>Contact</div><div style={{ fontSize: 12, fontWeight: 700 }}>{addressInfo.recipientContactNumber || "N/A"}</div></div>
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, padding: "8px 10px", background: "#f9fafb", borderRadius: 8 }}>
                    <HomeOutlined style={{ color: "#2563eb", marginTop: 2 }} />
                    <div style={{ flex: 1 }}><div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>Address</div><div style={{ fontSize: 12, color: "#374151", lineHeight: 1.4 }}>{addressInfo.address || "N/A"}</div></div>
                  </div>
                  {addressInfo.orderNote && addressInfo.orderNote !== "N/A" && (
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, padding: "8px 10px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                      <FileTextOutlined style={{ color: "#d97706", marginTop: 2 }} />
                      <div style={{ flex: 1 }}><div style={{ fontSize: 9, color: "#92400e", fontWeight: 700, textTransform: "uppercase" }}>Note</div><div style={{ fontSize: 11, color: "#78350f", fontStyle: "italic" }}>{addressInfo.orderNote}</div></div>
                    </div>
                  )}
                </div>
              </Card>

              <Card
                title={<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}><div style={{ width: 26, height: 26, background: "#16a34a", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}><ShoppingOutlined style={{ color: "#fff", fontSize: 13 }} /></div>Order Items</div><Badge count={totalUnique} style={{ backgroundColor: "#14532d" }} /></div>}
                style={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                bodyStyle={{ padding: 10 }}
                headStyle={{ padding: "8px 12px", minHeight: "auto" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {orderItems.map((item, index) => (
                    <div key={index} style={{ display: "flex", gap: 10, padding: 10, background: "#fff", border: "1px solid #f3f4f6", borderRadius: 10 }}>
                      {renderProductImage(item)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item?.productName || "Product"}</div>
                        <div style={{ fontSize: 10, color: "#9ca3af" }}>SKU: {item?.productCode || `ITEM-${index + 1}`}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 8 }}>
                          <div style={{ textAlign: "center", padding: "5px 4px", background: "#eff6ff", borderRadius: 6 }}><div style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>QTY</div><div style={{ fontSize: 12, fontWeight: 800, color: "#1e40af" }}>{item?.quantity || 0}</div></div>
                          <div style={{ textAlign: "center", padding: "5px 4px", background: "#f0fdf4", borderRadius: 6 }}><div style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>PRICE</div><div style={{ fontSize: 11, fontWeight: 800, color: "#14532d" }}>GH₵ {formatPrice(item?.price)}</div></div>
                          <div style={{ textAlign: "center", padding: "5px 4px", background: "#fffbeb", borderRadius: 6 }}><div style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>TOTAL</div><div style={{ fontSize: 11, fontWeight: 800, color: "#92400e" }}>GH₵ {formatPrice((item?.price || 0) * (item?.quantity || 0))}</div></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {cancellable && (
                <div style={{ marginTop: 14, borderRadius: 12, overflow: "hidden", border: "2px solid #fecaca", background: "#fff", boxShadow: "0 4px 16px rgba(220,38,38,0.08)" }}>
                  <div style={{ padding: "10px 14px", background: "linear-gradient(90deg,#fef2f2,#fff1f2)", borderBottom: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><StopOutlined style={{ fontSize: 14 }} /></div>
                      <div><div style={{ fontSize: 12, fontWeight: 900, color: "#991b1b" }}>Danger Zone • Cancel Order</div><div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>Only Order Placement can be cancelled</div></div>
                    </div>
                    <Tag color="red" style={{ margin: 0, borderRadius: 100, fontWeight: 700, fontSize: 10 }}>CANCELLABLE</Tag>
                  </div>
                  <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}><SafetyCertificateOutlined /></div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 800, color: "#991b1b" }}>Cancel Order #{activeCode}?</div><div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5, marginTop: 3 }}>This order is at <strong>Order Placement</strong> stage and can be cancelled. Refund 24-48h for MoMo. Cannot be undone.</div></div>
                    </div>
                    <Button danger type="primary" icon={<StopOutlined />} onClick={() => setCancelConfirmVisible(true)} loading={isCancelling} block style={{ height: 44, borderRadius: 10, fontWeight: 800, fontSize: 13, background: "#dc2626", borderColor: "#dc2626", boxShadow: "0 6px 16px rgba(220,38,38,0.25)" }}>
                      {isCancelling ? "Cancelling..." : `Cancel Order #${activeCode}`}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER - ONLY VIEW INVOICE AND DOWNLOAD INVOICE */}
            <div style={{ padding: 14, background: "linear-gradient(135deg,#f8fafc,#f1f5f9)", borderTop: "1px solid #e5e7eb", borderRadius: "0 0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Items</div><div style={{ fontSize: 14, fontWeight: 800 }}>{totalItems}</div></div>
                  <div style={{ width: 1, background: "#e5e7eb" }} />
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Total</div><div style={{ fontSize: 16, fontWeight: 900, color: "#14532d" }}>GH₵ {formatPrice(totalAmount)}</div></div>
                </div>
                <Tag color={orderStatus === "Cancelled" ? "red" : "green"} style={{ margin: 0, borderRadius: 100, fontWeight: 700, fontSize: 11 }}>{statusCfg.label}</Tag>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Button icon={<EyeOutlined />} onClick={handleViewInvoice} loading={isDownloading} style={{ height: 44, borderRadius: 10, fontWeight: 700, fontSize: 13, background: "#fff", border: "1px solid #e5e7eb" }}>
                  View Invoice
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadInvoice} loading={isDownloading} type="primary" style={{ height: 44, borderRadius: 10, fontWeight: 700, fontSize: 13, background: "linear-gradient(135deg,#14532d,#16a34a)", border: "none" }}>
                  Download Invoice
                </Button>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 10, color: "#9ca3af" }}>
                <img src={COMPANY_INFO.logoPath} alt="logo" style={{ width: 14, height: 14, objectFit: "contain" }} onError={(e) => (e.target.style.display = "none")} />
                <span>{COMPANY_INFO.name} • {COMPANY_INFO.tagline} • {COMPANY_INFO.phone} • {COMPANY_INFO.email}</span>
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal open={imagePreview.visible} onCancel={() => setImagePreview({ visible: false, url: null })} footer={null} width="90%" style={{ maxWidth: 560 }} centered className="order-modal-pro">
        <div style={{ textAlign: "center", padding: 16 }}><Image src={imagePreview.url} alt="Product" style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 12 }} preview={false} /></div>
      </Modal>

      {/* Cancel Confirmation */}
      <Modal open={cancelConfirmVisible} onCancel={() => !isCancelling && setCancelConfirmVisible(false)} footer={null} centered width={420} closeIcon={null} className="order-modal-pro" styles={{ content: { borderRadius: 16, padding: 0, overflow: "hidden" } }}>
        <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center" }}><WarningOutlined style={{ fontSize: 24, color: "#dc2626" }} /></div>
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => !isCancelling && setCancelConfirmVisible(false)} style={{ width: 32, height: 32, borderRadius: 8, background: "#f9fafb", border: "1px solid #f3f4f6" }} />
        </div>
        <div style={{ padding: "16px 20px" }}>
          <Title level={5} style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>Cancel Order #{activeCode}?</Title>
          <Text style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>This will cancel your order. <Text strong style={{ color: "#dc2626" }}>Cannot be undone</Text>. MoMo refund takes 24-48h.</Text>
          <div style={{ marginTop: 16, background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed #f3f4f6", fontSize: 12 }}><span style={{ color: "#9ca3af", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Order ID</span><span style={{ fontWeight: 700, fontFamily: "monospace" }}>#{activeCode}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed #f3f4f6", fontSize: 12 }}><span style={{ color: "#9ca3af", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Amount</span><span style={{ fontWeight: 800, color: "#14532d" }}>GH₵ {formatPrice(totalAmount)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}><span style={{ color: "#9ca3af", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>Status</span><Tag style={{ margin: 0, fontSize: 11, borderRadius: 100, background: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border }}>{statusCfg.label}</Tag></div>
          </div>
        </div>
        <div style={{ padding: "0 20px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Button onClick={() => setCancelConfirmVisible(false)} disabled={isCancelling} style={{ height: 42, borderRadius: 10, fontWeight: 600 }}>Keep Order</Button>
          <Button type="primary" danger onClick={handleCancelOrder} loading={isCancelling} icon={!isCancelling ? <StopOutlined /> : null} style={{ height: 42, borderRadius: 10, fontWeight: 700 }}>Yes, Cancel</Button>
        </div>
      </Modal>

      {/* SUCCESS MESSAGE AFTER CANCELLATION */}
      <Modal open={cancelSuccess.visible} onCancel={handleCancelSuccessClose} footer={null} centered width={440} closeIcon={null} className="cancel-success-modal" maskClosable={false}>
        <div style={{ padding: "24px 24px 20px", textAlign: "center" }}>
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: "#16a34a" }} />}
            title={<span style={{ fontWeight: 900, fontSize: 20, color: "#14532d" }}>Order Cancelled Successfully!</span>}
            subTitle={
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>
                  Order <span style={{ fontFamily: "monospace", background: "#f3f4f6", padding: "2px 8px", borderRadius: 6, border: "1px solid #e5e7eb" }}>#{cancelSuccess.orderCode}</span> has been cancelled.
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 10, lineHeight: 1.6, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 12px" }}>
                  ✅ Your order has been cancelled successfully.<br />
                  💰 Refund will be processed within <strong>24-48 hours</strong> for Mobile Money payments.<br />
                  📞 Need help? Contact us at <strong>{COMPANY_INFO.phone}</strong> or <strong>{COMPANY_INFO.email}</strong>
                </div>
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 11, color: "#9ca3af" }}>
                  <img src={COMPANY_INFO.logoPath} alt="logo" style={{ width: 20, height: 20, objectFit: "contain" }} onError={(e) => (e.target.style.display = "none")} />
                  <span>{COMPANY_INFO.name} • {COMPANY_INFO.tagline}</span>
                </div>
              </div>
            }
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <Button onClick={handleCancelSuccessClose} style={{ height: 44, borderRadius: 10, fontWeight: 600 }}>Close</Button>
            <Button type="primary" onClick={handleCancelSuccessClose} style={{ height: 44, borderRadius: 10, fontWeight: 700, background: "#14532d", borderColor: "#14532d" }}>
              Continue Shopping
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default OrderModal;