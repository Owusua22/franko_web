import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input, Radio, Divider, message, Modal } from 'antd';
import { validateCart, checkOutOrder, updateOrderDelivery, saveCheckoutDetails, saveAddressDetails, FRIENDLY_PRICE_UPDATE_MSG } from '../Redux/Slice/orderSlice';
import { validateAccount, debitCustomer, checkTransactionStatus, resetPaymentState } from '../Redux/Slice/paymentSlice';
import { clearCart, getCartById } from '../Redux/Slice/cartSlice';
import CheckoutForm from '../Component/CheckoutForm';
import AuthModal from '../Component/AuthModal';
import locations from '../Component/Locations';
import {
  ShoppingBagIcon, LockClosedIcon, UserIcon, ExclamationTriangleIcon,
  PhoneIcon, ShieldCheckIcon, BriefcaseIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import frankoLogo from '../assets/frankoIcon-128.webp';
import mtnLogo from '../assets/momo.png';
import vodafoneLogo from '../assets/voda.png';
import airteltigoLogo from '../assets/AT.png';
import {
  paymentOutcome, generateOrderCode, buildOrderDetails,
  assertOrderDetails, completedOrderRoute, assertOrderAccepted,
  readJSON, removeDraft, detectMoMoNetwork
} from '../utils/checkoutFlow.mjs';

import { PRODUCT_IMAGE_BASE } from "../config/media";

const price = item => Number(item?.unitPrice ?? item?.UnitPrice ?? item?.price ?? item?.Price ?? 0);
const qty = item => Number(item?.quantity ?? item?.Quantity ?? 1);
const customerId = c => c?.customerAccountNumber ?? c?.CustomerAccountNumber ?? c?.customerId;
const customerNameOf = c => `${c?.firstName || ''} ${c?.lastName || ''}`.trim();
const msisdn = n => String(n).replace(/\D/g, '').replace(/^0/, '233').replace(/^2330/, '233');

/* A "guest" value is never a real recipient name or a real address. */
const isGuestValue = v => !v || /^\s*guest\b/i.test(String(v)) || /^\s*n\/?a\s*$/i.test(String(v));

const NETWORKS = { mtn: 'MTN', vodafone: 'VODAFONE', airteltigo: 'AIRTELTIGO' };

const checkoutStyles = `
:root{--co-green:#14532d;--co-green-mid:#166534;--co-green-600:#16a34a;--co-green-light:#dcfce7;--co-green-lighter:#f0fdf4;--co-dark:#1a1a1a;--co-mid:#555;--co-light:#888;--co-border:#e0e0e0;--co-bg:#f7f7f7;--co-red:#dc2626;--co-radius:6px;--co-radius-xl:14px}
.co-root,.co-root *{box-sizing:border-box;font-family:'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased}.co-root{min-height:100vh;background:#fff;color:var(--co-dark)}
.co-tel{--co-green:#BB1420;--co-green-mid:#A80F1B;--co-green-600:#BB1420;--co-green-lighter:#FDF0F0;--co-green-light:#F6E3E5}.co-tel .co-page-header{background:#BB1420;color:white;padding:18px;border-radius:8px}.co-tel .co-page-count{color:#ffeaea}.co-tel .co-page-header-accent{background:#FFD400}
.co-container{max-width:1780px;margin:0 auto;padding:24px 16px 100px}@media(min-width:1024px){.co-container{padding:32px 40px}}
.co-page-header{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--co-border)}.co-page-header-accent{width:4px;height:28px;border-radius:2px;background:var(--co-green)}.co-page-title{font-size:24px;font-weight:800;letter-spacing:-.02em;margin:0}.co-page-count{font-size:13px;color:var(--co-light);margin:4px 0 0}.co-page-header-line{display:none;flex:1;height:1px;background:var(--co-border)}@media(min-width:768px){.co-page-header-line{display:block}}
.co-layout{display:flex;flex-direction:column;gap:20px}@media(min-width:1024px){.co-layout{flex-direction:row;gap:24px}}.co-sidebar{flex-shrink:0}@media(min-width:1024px){.co-sidebar{width:420px}}.co-main{flex:1;min-width:0}
.co-card{background:#fff;border:1px solid var(--co-border);border-radius:var(--co-radius);overflow:hidden}.co-card-header{padding:16px 20px;border-bottom:1px solid #f0f0f0}.co-card-title{font-size:16px;font-weight:800;margin:0}.co-card-body{padding:16px 20px}.co-section-accent{display:flex;gap:4px;margin-top:8px}.co-section-accent-bar{height:2px;width:32px;background:var(--co-green-600)}.co-section-accent-line{height:2px;flex:1;background:#f0f0f0}
.co-auth-banner,.co-warning-banner,.co-lock-banner,.co-agent-banner{display:flex;gap:12px;padding:12px 14px;border-radius:10px;margin-bottom:16px}.co-auth-banner{background:#f0fdf4;border:1px solid #bbf7d0}.co-lock-banner{background:var(--co-green-lighter);border:1.5px solid var(--co-green-light);align-items:flex-start}.co-lock-banner p{font-size:12px;font-weight:600;color:var(--co-green);margin:0;line-height:1.5}.co-lock-banner strong{font-weight:900}
.co-agent-banner{background:#eff6ff;border:1.5px solid #bfdbfe;align-items:flex-start}.co-agent-banner p{font-size:12px;font-weight:600;color:#1e40af;margin:0;line-height:1.5}.co-agent-banner strong{font-weight:900}
.co-auth-banner-icon{width:36px;height:36px;border-radius:8px;background:#fff;border:1px solid #bbf7d0;display:grid;place-items:center;flex-shrink:0}.co-auth-banner-copy{flex:1}.co-auth-banner-title{font-size:13px;font-weight:800;color:var(--co-green);margin:0 0 3px}.co-auth-banner-desc{font-size:12px;color:#166534;margin:0;line-height:1.45}.co-auth-banner-btn{margin-top:8px;border:0;background:var(--co-green);color:#fff;border-radius:var(--co-radius);padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer}
.co-toggle-wrap{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--co-bg);border:1px solid var(--co-border);border-radius:10px;cursor:pointer;margin-bottom:16px}.co-toggle-left{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--co-mid)}.co-toggle-track{width:40px;height:22px;border-radius:11px;padding:2px;transition:background .2s;flex-shrink:0}.co-toggle-track-off{background:#d1d5db}.co-toggle-track-on{background:var(--co-green-600)}.co-toggle-knob{width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0002;transition:transform .2s}.co-toggle-knob-on{transform:translateX(18px)}.co-warning-banner{background:#fffbeb;border:1px solid #fde68a;align-items:flex-start}.co-warning-banner p{font-size:12px;font-weight:600;color:#92400e;margin:0;line-height:1.5}
.co-items-list{max-height:380px;overflow-y:auto;padding-right:4px}.co-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #f5f5f5}.co-item:last-child{border-bottom:0}.co-item-left{display:flex;gap:12px;flex:1;min-width:0}.co-item-img,.co-item-img-placeholder{width:56px;height:56px;border-radius:var(--co-radius);object-fit:cover;border:1px solid #f0f0f0;flex-shrink:0}.co-item-img-placeholder{display:flex;align-items:center;justify-content:center;background:var(--co-bg);font-size:10px;color:var(--co-light)}.co-item-info{flex:1;min-width:0}.co-item-name{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 0 2px}.co-item-unit{font-size:12px;color:var(--co-light);margin:0}.co-item-qty{display:inline-flex;margin-top:4px;padding:2px 8px;border-radius:100px;background:var(--co-green-lighter);font-size:11px;font-weight:700;color:var(--co-green)}.co-item-price{font-size:14px;font-weight:900;flex-shrink:0}
.co-totals{padding-top:16px;border-top:1px solid var(--co-border)}.co-total-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;font-size:14px}.co-total-row-label{color:var(--co-mid)}.co-total-row-value{font-weight:700}.co-total-row-free{font-weight:700;color:var(--co-green-600)}.co-total-row-warning{font-weight:600;color:#d97706}.co-service-charge{display:flex;justify-content:space-between;padding:8px 12px;background:#eff6ff;border-radius:var(--co-radius);margin:8px 0}.co-service-charge span{font-size:13px;font-weight:600;color:#1e40af}.co-grand-total{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:linear-gradient(135deg,#fef2f2,#fff7ed);border-radius:var(--co-radius);margin-top:8px;border:1px solid #fecaca}.co-grand-total-label,.co-grand-total-value{font-weight:900;color:var(--co-red)}.co-grand-total-value{font-size:18px}.co-charge-note{font-size:11px;color:var(--co-light);text-align:center;font-style:italic;margin-top:6px}
.co-payment-section{margin-top:20px}.co-payment-title{font-size:14px;font-weight:800;margin:0 0 12px}.co-payment-options{display:flex;flex-direction:column;gap:8px}.co-payment-option{display:flex;align-items:center;gap:12px;padding:12px 16px;border:2px solid var(--co-border);border-radius:10px;cursor:pointer;background:#fff}.co-payment-option-active{border-color:var(--co-green-600)!important;background:var(--co-green-lighter)!important}.co-payment-option-text{font-size:14px;font-weight:600;color:var(--co-mid)}
.co-btn-primary,.co-btn-danger,.co-btn-secondary{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;font-weight:700;cursor:pointer;transition:.15s;font-family:inherit}.co-btn-primary{padding:14px;background:var(--co-green);color:#fff;border:0;font-size:15px}.co-btn-primary:hover{background:var(--co-green-mid)}.co-btn-primary:disabled{background:#d1d5db;cursor:not-allowed}.co-btn-danger{padding:12px;background:#fff;color:var(--co-red);border:1px solid #fecaca;font-size:14px}.co-btn-danger:hover{background:#fef2f2}.co-btn-secondary{padding:9px 12px;background:#fff;color:var(--co-dark);border:1px solid var(--co-border);font-size:12px}.co-btn-secondary:hover{background:var(--co-bg)}.co-sticky-bottom{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--co-border);padding:12px 16px;z-index:40;box-shadow:0 -2px 12px #0001;display:block}@media(min-width:1024px){.co-sticky-bottom{display:none}}.co-desktop-btn{display:none;margin-top:20px}@media(min-width:1024px){.co-desktop-btn{display:block}}
.co-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:60px 24px;min-height:400px}.co-empty-icon{width:72px;height:72px;border-radius:50%;background:var(--co-bg);display:grid;place-items:center;margin-bottom:16px;border:1px solid var(--co-border)}.co-empty-title{font-size:22px;font-weight:800;margin-bottom:8px}.co-empty-desc{font-size:14px;color:var(--co-light);margin-bottom:24px}
.co-loading-overlay{position:fixed;inset:0;background:#0008;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:10000}.co-loading-card{background:#fff;border-radius:var(--co-radius-xl);padding:32px;display:flex;flex-direction:column;align-items:center;gap:16px;box-shadow:0 20px 60px #0003}.co-spinner{width:40px;height:40px;border:4px solid var(--co-green-light);border-top-color:var(--co-green-600);border-radius:50%;animation:co-spin .8s linear infinite}@keyframes co-spin{to{transform:rotate(360deg)}}.co-loading-text{font-size:15px;font-weight:700;color:var(--co-mid)}
.pm-modal-wrap{display:flex;flex-direction:column;max-height:calc(100vh - 32px)}.pm-header-compact{background:linear-gradient(135deg,#0d3d20,#14532d 50%,#166534);padding:16px 20px;display:flex;align-items:center;justify-content:space-between}.co-tel .pm-header-compact{background:linear-gradient(135deg,#8f0c16,#BB1420 55%,#A80F1B)}.pm-header-left{display:flex;align-items:center;gap:10px}.pm-logo-small{height:28px;object-fit:contain;filter:brightness(0) invert(1)}.pm-company-small{font-size:10px;font-weight:700;color:#ffffff80;text-transform:uppercase;margin:0}.pm-ref-small{font-size:10px;color:#ffffff99;margin:3px 0 0}.pm-header-right{text-align:right}.pm-amount-label-small{font-size:9px;font-weight:700;color:#ffffff80;text-transform:uppercase;margin:0}.pm-amount-value-small{font-size:24px;font-weight:900;color:#fff;margin:0}.pm-body{padding:16px;display:flex;flex-direction:column;gap:12px;background:#fff;overflow-y:auto}.pm-field{border:1.5px solid #e5e7eb;border-radius:10px;overflow:hidden}.pm-field-header{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#f9fafb;border-bottom:1px solid #f0f0f0}.pm-field-step-num{width:20px;height:20px;background:var(--co-green);color:#fff;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:900}.pm-field-label{font-size:12px;font-weight:800}.pm-field-body{padding:12px}.pm-account-status{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:8px;font-size:12px;font-weight:700}.pm-account-checking{background:#fffbeb;border:1px solid #fde68a;color:#d97706}.pm-networks{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.pm-network-tile{display:flex;flex-direction:column;align-items:center;text-align:center;padding:10px 6px;border:2px solid #e5e7eb;border-radius:8px;background:#fff;min-height:56px}.pm-network-logo{width:36px;height:36px;object-fit:contain;border-radius:6px}.pm-network-name{font-size:13px;font-weight:800;margin:0}.pm-network-sub{font-size:10px;color:var(--co-light);margin:2px 0 0}.pm-security{display:flex;align-items:center;justify-content:center;gap:5px;font-size:10px;font-weight:600;color:#6b7280;padding:7px;background:#f9fafb;border-radius:6px}
.pm-pending-anim{position:relative;width:78px;height:78px}.pm-pending-ring-outer,.pm-pending-ring-spin{position:absolute;inset:0;border-radius:50%}.pm-pending-ring-outer{border:3px solid #dcfce7}.pm-pending-ring-spin{border:3px solid transparent;border-top-color:var(--co-green-600);animation:co-spin 1s linear infinite}.pm-pending-ring-inner{position:absolute;inset:9px;border:2px solid #f0fdf4;border-radius:50%;display:grid;place-items:center;background:#dcfce7}.co-guide-steps-wrap{background:#fff;border:1px solid #f0f0f0;border-radius:var(--co-radius);overflow:hidden}.co-guide-steps-header{padding:10px 14px;border-bottom:1px solid #f5f5f5}.co-guide-steps-body{padding:14px;max-height:280px;overflow:auto}.co-guide-step{display:flex;gap:12px;align-items:flex-start;margin-bottom:10px}.co-guide-step-num{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:900;flex-shrink:0}.co-guide-step-text{font-size:13px;color:var(--co-mid);margin:3px 0 0;line-height:1.4}
`;

export default function CheckoutShared({ telecel = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const cartState = useSelector(s => s.cart || {});
  const customerState = useSelector(s => s.customer ?? s.customerReducer ?? s.customers ?? {});
  const customer = customerState.currentCustomer ?? customerState.customer ?? customerState.customerDetails ?? customerState.data ?? customerState.user ?? customerState.profile ?? customerState;
  const loggedIn = Boolean(customerId(customer));
  const stored = readJSON('checkoutDetails', {});
  const savedCustomer = readJSON('customer', {});

  // ═════════════════════════════════════════════════════════════════
  // ACCOUNT TYPE — resolved BEFORE any state initializer so the very
  // first render already knows whether this is an agent session.
  // ═════════════════════════════════════════════════════════════════
  const accountType = String(customer?.accountType ?? savedCustomer?.accountType ?? '').toLowerCase();
  const isAgent = accountType === 'agent';

  // ── Registered account defaults (customers only) ─────────────────
  const accountPhone = customer?.contactNumber || customer?.ContactNumber || customer?.phone || customer?.telephone || customer?.phoneNumber || savedCustomer?.contactNumber || savedCustomer?.ContactNumber || savedCustomer?.phone || '';
  const accountName = customerNameOf(customer) || customerNameOf(savedCustomer);

  const [items, setItems] = useState(() => telecel
    ? (location.state?.items?.length ? location.state.items : readJSON('telCheckoutCart', {})?.items || cartState.cart || [])
    : (cartState.cart?.length ? cartState.cart : readJSON('cart', []) || []));

  // ═════════════════════════════════════════════════════════════════
  // AGENT RULE
  // An agent is always ordering on behalf of a walk-in customer, so we
  // NEVER pre-populate the recipient name, the recipient contact or
  // the delivery address with the agent's own account details (nor
  // with anything left over from a previous order). Every agent order
  // starts from a blank recipient block.
  //
  // CUSTOMER RULE (unchanged)
  // Regular customers keep the existing convenience behaviour: their
  // registered name/phone and last-used address are pre-filled.
  // ═════════════════════════════════════════════════════════════════
  const [recipient, setRecipient] = useState(() => {
    if (isAgent) return '';
    const v = stored.recipientName || accountName || '';
    return isGuestValue(v) ? '' : v;
  });
  const [phone, setPhone] = useState(() => {
    if (isAgent) return '';
    return stored.recipientContactNumber || accountPhone || '';
  });
  const [different, setDifferent] = useState(() => {
    if (isAgent) return false; // toggle is not shown for agents
    const raw = readJSON('checkoutDifferentRecipient', false);
    return raw === true || raw === 'true';
  });
  const [note, setNote] = useState(stored.orderNote || '');

  // Address hydration:
  //  · agents  → always blank
  //  · guests  → always blank (never restore a guest address)
  //  · signed-in customers → restore profile / last-used address
  const initialDelivery = useMemo(() => {
    if (isAgent || !loggedIn) return { address: '', fee: 0, feeDisplay: '' };
    const savedDel = readJSON('deliveryInfo', {}) || {};
    const candidate = readJSON('orderAddressDetails', {})?.address || savedDel.address || customer?.address || savedCustomer?.address || '';
    if (isGuestValue(candidate)) return { address: '', fee: 0, feeDisplay: '' };
    return {
      address: String(candidate),
      fee: Number(savedDel.fee) || 0,
      feeDisplay: savedDel.feeDisplay || '',
      isManual: Boolean(savedDel.isManual),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAgent, loggedIn]);

  const [delivery, setDelivery] = useState(initialDelivery);
  const defaultDeliveryAddressRef = useRef(initialDelivery.address);

  useEffect(() => {
    if (isAgent || !loggedIn) return; // agents have no default address
    const fallback = customer?.address || savedCustomer?.address || delivery.address;
    if (!defaultDeliveryAddressRef.current && fallback && !isGuestValue(fallback)) {
      defaultDeliveryAddressRef.current = fallback;
    }
  }, [isAgent, loggedIn, customer, savedCustomer, delivery.address]);

  const [method, setMethod] = useState(telecel ? 'Mobile Money' : '');
  const [stage, setStage] = useState('form'); // form | payment | pending | review | posting | support
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState(false);
  const [error, setError] = useState('');
  const [subscriberName, setSubscriberName] = useState('');

  const isMoMoSelected = method === 'Mobile Money';

  // MOBILE MONEY LOCK: only the CONTACT NUMBER is locked, and never for
  // agents (agents don't pay by MoMo through this screen at all).
  const contactLocked = isMoMoSelected && loggedIn && !isAgent;

  const active = useRef(false);
  const finished = useRef(false);
  const submitting = useRef(false);
  const requestActive = useRef(false);
  const pollTimer = useRef(null);
  const pollDeadline = useRef(null);
  const currentRef = useRef(null);

  const cartId = String(cartState.cartId || readJSON('cartId', '') || '').replace(/^"|"$/g, '');
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + price(item) * qty(item), 0), [items]);
  const shipping = Number(delivery?.fee) || 0;
  const serviceCharge = Math.min(20, (subtotal + shipping) * .01);
  const amount = subtotal;

  const momoNumber = isAgent ? '' : accountPhone;
  const detectedNetworkInfo = useMemo(() => (isAgent ? null : detectMoMoNetwork(momoNumber)), [isAgent, momoNumber]);
  const network = telecel ? 'vodafone' : detectedNetworkInfo?.network || '';

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      clearTimeout(pollTimer.current);
      dispatch(resetPaymentState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!telecel && cartState.cart?.length && !finished.current) setItems(cartState.cart);
  }, [cartState.cart, telecel]);

  useEffect(() => {
    if (cartId && !items.length) dispatch(getCartById(cartId));
  }, [cartId, dispatch, items.length]);

  // ── Late sign-in hydration — CUSTOMERS ONLY ──────────────────────
  // Fills blank fields with the account defaults when the profile
  // resolves after mount. Skipped entirely for agents.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !loggedIn || isAgent) return;
    let filled = false;
    if (!recipient && accountName && !different) { setRecipient(accountName); filled = true; }
    if (!phone && accountPhone) { setPhone(accountPhone); filled = true; }
    if (!delivery.address && defaultDeliveryAddressRef.current) {
      setDelivery(prev => ({ ...prev, address: defaultDeliveryAddressRef.current }));
      filled = true;
    }
    if (filled) hydratedRef.current = true;
  }, [loggedIn, isAgent, different, recipient, phone, delivery.address, accountName, accountPhone]);

  // ── Agent safety net ─────────────────────────────────────────────
  // If the profile resolves to an AGENT after the first render (e.g. the
  // session hydrates late, or an agent signs in mid-session), wipe any
  // value that was auto-filled from the account. Anything the agent has
  // already typed is left untouched.
  const agentResetRef = useRef(false);
  useEffect(() => {
    if (!isAgent || agentResetRef.current) return;
    agentResetRef.current = true;

    if (different) {
      setDifferent(false);
      try { localStorage.setItem('checkoutDifferentRecipient', 'false'); } catch { /* best effort */ }
    }
    if (recipient && (recipient === accountName || isGuestValue(recipient))) setRecipient('');
    if (phone && phone === accountPhone) setPhone('');
    if (delivery.address && delivery.address === defaultDeliveryAddressRef.current) {
      setDelivery({ address: '', fee: 0, feeDisplay: '' });
    }
    defaultDeliveryAddressRef.current = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAgent]);

  // Mobile Money: keep ONLY the phone pinned to the registered line.
  useEffect(() => {
    if (!contactLocked) return;
    if (phone !== accountPhone) setPhone(accountPhone);
  }, [contactLocked, phone, accountPhone]);

  // Never let a "Guest" placeholder survive into the order.
  useEffect(() => {
    if (isGuestValue(recipient) && recipient) setRecipient('');
  }, [recipient]);

  const toggleRecipient = () => {
    if (busy || stage !== 'form' || isAgent) return; // agents have no toggle
    const next = !different;
    setError('');
    setDifferent(next);
    try { localStorage.setItem('checkoutDifferentRecipient', String(next)); } catch { /* best effort */ }

    if (next) {
      setRecipient('');
      if (contactLocked) {
        setPhone(accountPhone);
        message.info('You can enter a different recipient name. The contact number stays your registered MoMo line because the payment prompt is sent there.');
      } else {
        setPhone('');
      }
    } else {
      setRecipient(accountName);
      setPhone(accountPhone);
    }
  };

  const cancel = (reason = 'Payment was cancelled.') => {
    if (finished.current) return;
    finished.current = true;
    clearTimeout(pollTimer.current);
    navigate('/order-cancelled', { replace: true, state: { reason, orderId: currentRef.current?.orderId } });
    removeDraft();
  };

  const cleanSuccess = (current, paid) => {
    const destination = completedOrderRoute({
      orderId: current.orderId,
      paid,
      paymentMode: current.checkout.PaymentMode,
      accountType: current.checkout.customerAccountType,
      telecel,
    });

    const savedCust = readJSON('customer') || (customerId(customer) ? customer : null);

    navigate(destination, {
      replace: true,
      state: {
        placed: true,
        orderId: current.orderId,
        paymentMode: current.checkout.PaymentMode,
        paymentConfirmed: paid,
      },
    });

    dispatch(clearCart());
    try {
      ['cart', 'cartId', ...(telecel ? ['telCheckoutCart', 'selectedCart'] : [])]
        .forEach(k => localStorage.removeItem(k));
      // Agents must never leave a recipient/address behind for the next order.
      if (isAgent) ['deliveryInfo', 'recentDeliveryAddresses'].forEach(k => localStorage.removeItem(k));
      if (savedCust) localStorage.setItem('customer', JSON.stringify(savedCust));
      if (!isAgent) {
        localStorage.setItem('checkoutDetails', JSON.stringify(current.checkout));
        localStorage.setItem('orderAddressDetails', JSON.stringify(current.address));
      }
    } catch { /* storage is best effort */ }

    removeDraft();
  };

  const postOrder = async (current, paid) => {
    if (finished.current || current.posting) return;
    current.posting = true;
    current.paid = paid;
    setStage('posting');
    try {
      assertOrderDetails(current.checkout, current.address);
      const result = await dispatch(checkOutOrder({ cartId: current.checkout.Cartid, ...current.checkout })).unwrap();
      assertOrderAccepted(result);
      current.created = true;
      const addressResult = await dispatch(updateOrderDelivery(current.address)).unwrap();
      assertOrderAccepted(addressResult);
      if (!active.current || finished.current) return;
      finished.current = true;
      cleanSuccess(current, paid);
    } catch (e) {
      if (!active.current) return;
      setError(`${paid ? 'Payment succeeded, but your order needs assistance.' : 'Order could not be placed.'} Reference: ${current.orderId}. ${e?.message || e || ''}`);
      setStage('support');
      message.error('Please contact support with your reference. Do not pay again.');
    }
  };

  const poll = current => {
    if (finished.current || !active.current) return;
    pollTimer.current = setTimeout(async () => {
      if (requestActive.current || finished.current || !active.current) return;
      requestActive.current = true;
      try {
        const response = await dispatch(checkTransactionStatus({ refNo: current.orderId })).unwrap();
        if (finished.current || !active.current) return;
        const result = paymentOutcome(response);
        if (result === 'success') { await postOrder(current, true); return; }
        if (result === 'failed') { cancel(response?.responseMessage || 'Payment declined.'); return; }
      } catch { /* transient network errors do not cancel */ }
      finally { requestActive.current = false; }
      if (Date.now() < pollDeadline.current) poll(current);
      else setStage('review');
    }, 4000);
  };

  const checkAgain = async () => {
    const current = currentRef.current;
    if (!current || busy || finished.current) return;
    setBusy(true);
    try {
      const response = await dispatch(checkTransactionStatus({ refNo: current.orderId })).unwrap();
      const result = paymentOutcome(response);
      if (result === 'success') await postOrder(current, true);
      else if (result === 'failed') cancel(response?.responseMessage || 'Payment declined.');
      else setError('Still waiting for payment confirmation. Please approve on your phone and check again.');
    } catch {
      setError('Cannot check payment right now. Please try again; do not pay twice.');
    } finally {
      if (active.current && !finished.current) setBusy(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // CHECKOUT — the recipient name, contact and address are dispatched
  // EXACTLY as typed. For agents that is always the walk-in customer's
  // details; nothing is ever substituted with the agent's own account.
  // ═════════════════════════════════════════════════════════════════
  const begin = async override => {
    if (submitting.current || finished.current) return;
    const c = override && customerId(override) ? override : customer;
    if (!customerId(c)) { setAuth(true); return; }

    const name = String(recipient || '').trim();
    const contact = String(contactLocked ? accountPhone : phone || '').trim();
    const addressText = String(delivery?.address || '').trim();

    if (!items.length || !cartId || !name || isGuestValue(name) || !contact || !addressText || isGuestValue(addressText) || !method) {
      setError(isAgent
        ? "Enter your customer's name, contact number, delivery address and select a payment method."
        : 'Check your cart, recipient name, contact number, delivery address and payment method.');
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError('');

    const orderId = generateOrderCode(telecel);
    const { checkout, delivery: address } = buildOrderDetails({
      cartId, customerId: customerId(c), orderId, paymentMode: method,
      contact, accountType: c.accountType, subtotal,
      recipientName: name, recipientContactNumber: contact,
      orderNote: note, orderDate: new Date().toISOString(),
      address: addressText, paymentService: telecel ? NETWORKS.vodafone : 'N/A',
    });
    const current = { orderId, checkout, address, posting: false, created: false, paid: false };
    currentRef.current = current;

    dispatch(saveCheckoutDetails(checkout));
    dispatch(saveAddressDetails(address));

    try {
      await dispatch(validateCart({
        cartId,
        customerid: customerId(c),
        orderDate: checkout.orderDate,
        paymentMode: method,
        paymentService: checkout.paymentService,
        paymentAccountNumber: contact,
        customerAccountType: checkout.customerAccountType,
        items: items.map(i => ({ productId: String(i.productId ?? i.productID ?? i.ProductId ?? i.id ?? ''), price: price(i), quantity: qty(i) })),
      })).unwrap();

      if (!active.current) return;

      if ((!telecel && String(c.accountType || '').toLowerCase() === 'agent') || method !== 'Mobile Money') {
        await postOrder(current, false);
        return;
      }

      const detected = telecel ? { network: 'vodafone', service: 'VODAFONE', name: 'Telecel Cash' } : detectedNetworkInfo;

      if (!detected || !momoNumber) {
        setStage('form');
        const invalidMsg = 'The momo number is invalid so you should contact the customer service for further assistance.';
        setError(invalidMsg);
        Modal.error({ title: 'Invalid Mobile Money Number', content: invalidMsg, okText: 'Close', centered: true });
        return;
      }

      setStage('payment');
      current.checkout = {
        ...current.checkout,
        PaymentAccountNumber: msisdn(momoNumber),
        paymentService: detected.service,
      };
      dispatch(saveCheckoutDetails(current.checkout));

      let valResult;
      try {
        valResult = await dispatch(validateAccount({ msisdn: msisdn(momoNumber), network: detected.service })).unwrap();
      } catch {
        setStage('form');
        const invalidMsg = 'The momo number is invalid kindly contact the customer service for further assistance.';
        setError(invalidMsg);
        Modal.error({ title: 'Mobile Money Validation Failed', content: invalidMsg, okText: 'Close', centered: true });
        return;
      }

      const isValidCode = String(valResult?.responseCode ?? '') === '01';
      const returnedName = valResult?.name || valResult?.subscriberName || valResult?.accountName || '';

      if (!isValidCode) {
        setStage('form');
        const invalidMsg = 'The momo number is invalid so you should contact the customer service for further assistance.';
        setError(invalidMsg);
        Modal.error({ title: 'Invalid Mobile Money Account', content: invalidMsg, okText: 'Close', centered: true });
        return;
      }

      setSubscriberName(returnedName);

      const narration = items.map(i => i.productName || i.ProductName || 'Item').join(', ').slice(0, 120);
      message.loading({ content: `Account verified: ${returnedName || momoNumber}. Sending MoMo prompt to your phone…`, key: 'momo-init', duration: 3 });

      const debitRes = await dispatch(debitCustomer({
        refNo: current.orderId, msisdn: msisdn(momoNumber), amount,
        network: detected.service, narration,
      })).unwrap();

      if (!active.current || finished.current) return;

      const outcome = paymentOutcome(debitRes);
      if (outcome === 'success') await postOrder(current, true);
      else if (outcome === 'failed') cancel(debitRes?.responseMessage || 'Payment declined.');
      else {
        setStage('pending');
        pollDeadline.current = Date.now() + 65000;
        poll(current);
      }
    } catch (e) {
      if (e?.isPriceUpdate) {
        dispatch(clearCart());
        setItems([]);
        setError(FRIENDLY_PRICE_UPDATE_MSG);
      } else {
        setError(e?.message || String(e || 'Could not process order.'));
      }
      setStage('form');
    } finally {
      submitting.current = false;
      if (active.current && !finished.current) setBusy(false);
    }
  };

  const handleAuthSuccess = c => {
    setAuth(false);
    // Agents never get their own details copied into the recipient block.
    const signedInAsAgent = String(c?.accountType || '').toLowerCase() === 'agent';
    if (customerId(c) && !signedInAsAgent) {
      const newName = customerNameOf(c);
      const newPhone = c.contactNumber || c.ContactNumber || '';
      if (!recipient && newName) setRecipient(newName);
      if (!phone && newPhone) setPhone(newPhone);
    }
    message.info('Signed in. Review the order and proceed.');
  };

  const flow = {
    items, customer, loggedIn, different, toggleRecipient, recipient, setRecipient,
    phone, setPhone, note, setNote, delivery, setDelivery, method, setMethod,
    subtotal, shipping, serviceCharge, amount, error, stage, setStage, busy,
    begin, number: momoNumber, network, detectedNetworkInfo, subscriberName,
    checkAgain, cancel, auth, setAuth, handleAuthSuccess, currentRef,
    isAgent, isMoMoSelected, contactLocked, accountPhone, telecel,
  };

  return <CheckoutView flow={flow} />;
}

const netTiles = [
  { value: 'mtn', logo: mtnLogo, name: 'MTN MoMo', sub: '*170#', bg: '#fffbeb', border: '#fbbf24', color: '#d97706' },
  { value: 'vodafone', logo: vodafoneLogo, name: 'Telecel Cash', sub: '*110#', bg: '#fff1f2', border: '#fda4af', color: '#e11d48' },
  { value: 'airteltigo', logo: airteltigoLogo, name: 'AT Money', sub: '*110#', bg: '#eff6ff', border: '#93c5fd', color: '#2563eb' },
];

const money = n => `GH₵${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const unit = i => Number(i.unitPrice ?? i.UnitPrice ?? i.price ?? i.Price ?? 0);
const quantity = i => Number(i.quantity ?? i.Quantity ?? 1);
const productImage = i => i.imagePath && `${PRODUCT_IMAGE_BASE}${String(i.imagePath).split('\\').pop()}`;

function CheckoutView({ flow }) {
  const navigate = useNavigate();
  const [missing, setMissing] = useState(false);
  const {
    items, customer, loggedIn, different, toggleRecipient, recipient, setRecipient,
    phone, setPhone, note, setNote, delivery, setDelivery, method, setMethod,
    subtotal, shipping, serviceCharge, amount, error, stage, busy, begin,
    number, network, detectedNetworkInfo, subscriberName, checkAgain, cancel,
    auth, setAuth, handleAuthSuccess, currentRef, isAgent, contactLocked,
    accountPhone, telecel,
  } = flow;

  const freeDelivery = Number(delivery.fee) === 0 && String(delivery.feeDisplay || '').toLowerCase().includes('free');
  const naDelivery = Number(delivery.fee) === 0 && (!delivery.feeDisplay || String(delivery.feeDisplay).toLowerCase() === 'n/a');
  const displayTotal = subtotal + shipping + (method === 'Mobile Money' ? serviceCharge : 0);
  const paymentLabel = loggedIn ? 'Place Order' : 'Register & Place Order';
  const orderId = currentRef.current?.orderId;
  const postingPaid = currentRef.current?.paid === true;
  const currentNetwork = netTiles.find(n => n.value === network);

  const approval = {
    mtn: ['Dial *170# on your MTN phone', 'Select My Wallet, then My Approvals', 'Enter your MoMo PIN to load pending requests', 'Select the Franko Trading transaction', 'Approve the payment'],
    vodafone: ['Dial *110# on your Telecel / Vodafone phone', 'Open pending approvals', 'Enter your PIN and select the Franko Trading transaction', 'Approve the payment'],
    airteltigo: ['Dial *110# on your AT phone', 'Open pending approvals', 'Enter your PIN and select the Franko Trading transaction', 'Approve the payment'],
  };

  const checkout = () => {
    if (loggedIn && (!delivery.address?.trim() || !method || !recipient?.trim() || !phone?.trim())) {
      setMissing(true);
      return;
    }
    begin();
  };

  return (
    <>
      <style>{checkoutStyles}</style>
      <div className={`co-root ${telecel ? 'co-tel' : ''}`}>
        {busy && (
          <div className="co-loading-overlay">
            <div className="co-loading-card">
              <div className="co-spinner" role="status" aria-label="Processing your order" />
              <div className="co-loading-text">Processing your order…</div>
            </div>
          </div>
        )}

        <div className="co-container">
          <div className="co-page-header">
            <div className="co-page-header-accent" />
            <div>
              <h1 className="co-page-title">{telecel ? 'Speed Shopping Checkout' : isAgent ? 'Agent Checkout' : 'Checkout'}</h1>
              <p className="co-page-count">{items.length} item{items.length === 1 ? '' : 's'} in cart</p>
            </div>
            <div className="co-page-header-line" />
          </div>

          {error && (
            <div className="co-warning-banner" role="alert">
              <ExclamationTriangleIcon style={{ width: 18, height: 18, color: '#d97706' }} />
              <p>{error}</p>
            </div>
          )}

          {!items.length ? (
            <div className="co-empty">
              <div className="co-empty-icon"><ShoppingBagIcon style={{ width: 36, height: 36, color: '#888' }} /></div>
              <div className="co-empty-title">Your cart is empty</div>
              <div className="co-empty-desc">Add items to your cart to proceed with checkout.</div>
              <button className="co-btn-primary" style={{ maxWidth: 280 }} onClick={() => navigate('/')}>Continue Shopping</button>
            </div>
          ) : (
            <div className="co-layout">
              {/* SIDEBAR: RECIPIENT & DELIVERY */}
              <div className="co-sidebar">
                <div className="co-card">
                  <div className="co-card-header">
                    <h3 className="co-card-title">{isAgent ? "Customer's Delivery Details" : 'Delivery Details'}</h3>
                    <div className="co-section-accent"><div className="co-section-accent-bar" /><div className="co-section-accent-line" /></div>
                  </div>
                  <div className="co-card-body">
                    {!loggedIn && (
                      <div className="co-auth-banner">
                        <div className="co-auth-banner-icon"><LockClosedIcon style={{ width: 18, height: 18, color: '#14532d' }} /></div>
                        <div className="co-auth-banner-copy">
                          <p className="co-auth-banner-title">Register to place this order</p>
                          <p className="co-auth-banner-desc">No customer account is signed in. You’ll be asked to register or sign in before the order can be placed.</p>
                          <button className="co-auth-banner-btn" onClick={() => setAuth(true)}>Register now</button>
                        </div>
                      </div>
                    )}

                    {/* AGENT: explain why nothing is pre-filled */}
                    {isAgent && (
                      <div >
                       
                      </div>
                    )}

                    {/* CUSTOMER + Mobile Money: only the contact number is locked */}
                    {contactLocked && (
                      <div>
                       
                      </div>
                    )}

                    {/* Toggle is for customers only — an agent order is always for someone else */}
                    {!isAgent && (
                      <>
                        <div
                          className="co-toggle-wrap"
                          role="switch"
                          aria-checked={different}
                          tabIndex={0}
                          onClick={toggleRecipient}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRecipient(); } }}
                        >
                          <div className="co-toggle-left">
                            <UserIcon style={{ width: 16, height: 16, color: '#888' }} />
                            <span>Someone else is receiving this order?</span>
                          </div>
                          <div className={`co-toggle-track ${different ? 'co-toggle-track-on' : 'co-toggle-track-off'}`}>
                            <div className={`co-toggle-knob ${different ? 'co-toggle-knob-on' : ''}`} />
                          </div>
                        </div>

                        {different && (
                          <div className="co-warning-banner">
                            <ExclamationTriangleIcon style={{ width: 16, height: 16, color: '#d97706', flexShrink: 0 }} />
                            <p>
                              Enter the recipient’s name{contactLocked ? '' : ' and contact number'} below.
                              {contactLocked && ' The contact number remains your registered MoMo number for payment.'}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    <CheckoutForm
                      customerName={recipient}
                      setCustomerName={setRecipient}
                      customerNumber={phone}
                      setCustomerNumber={setPhone}
                      deliveryInfo={delivery}
                      setDeliveryInfo={setDelivery}
                      orderNote={note}
                      setOrderNote={setNote}
                      locations={locations}
                      customerAccountType={customer?.accountType}
                      isDifferentRecipient={different}
                      /* lock only the contact number, never the name/address */
                      lockContact={contactLocked}
                      contactHint={contactLocked ? 'Locked — the Mobile Money prompt is sent to this number.' : ''}
                      /* guests never see or store a saved address */
                      isGuest={!loggedIn}
                      onRequireSignIn={() => setAuth(true)}
                    />
                  </div>
                </div>
              </div>

              {/* MAIN: ORDER SUMMARY & PAYMENT METHOD */}
              <div className="co-main">
                <div className="co-card">
                  <div className="co-card-header">
                    <h3 className="co-card-title">Order Summary</h3>
                    <div className="co-section-accent"><div className="co-section-accent-bar" /><div className="co-section-accent-line" /></div>
                  </div>
                  <div className="co-card-body">
                    <div className="co-items-list">
                      {items.map((item, index) => (
                        <div key={item.productId || item.id || index} className="co-item">
                          <div className="co-item-left">
                            <div>
                              {productImage(item) ? (
                                <img src={productImage(item)} alt="Product" className="co-item-img" onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
                              ) : null}
                              <div className="co-item-img-placeholder" style={productImage(item) ? { display: 'none' } : {}}>No Image</div>
                            </div>
                            <div className="co-item-info">
                              <p className="co-item-name">{item.productName || item.ProductName || 'Product'}</p>
                              <p className="co-item-unit">Unit: {money(unit(item))}</p>
                              <span className="co-item-qty">Qty {quantity(item)}</span>
                            </div>
                          </div>
                          <span className="co-item-price">{money(unit(item) * quantity(item))}</span>
                        </div>
                      ))}
                    </div>

                    <div className="co-totals">
                      <div className="co-total-row">
                        <span className="co-total-row-label">Subtotal</span>
                        <span className="co-total-row-value">{money(subtotal)}</span>
                      </div>
                      <div className="co-total-row">
                        <span className="co-total-row-label">Shipping Fee</span>
                        {freeDelivery ? <span className="co-total-row-free">FREE DELIVERY</span>
                          : naDelivery ? <span className="co-total-row-warning">{isAgent ? 'Agent delivery' : 'Delivery charges apply'}</span>
                          : shipping > 0 ? <span className="co-total-row-value">{money(shipping)}</span>
                          : <span className="co-total-row-warning">Select location</span>}
                      </div>
                      {method === 'Mobile Money' && (
                        <div className="co-service-charge">
                          <span>{subtotal + shipping > 2000 ? 'MoMo Service Charge:' : 'MoMo Service Charge (1%):'}</span>
                          <span>{money(serviceCharge)}</span>
                        </div>
                      )}
                      <div className="co-grand-total">
                        <span className="co-grand-total-label">Total Amount</span>
                        <span className="co-grand-total-value">{money(displayTotal)}</span>
                      </div>
                      {method === 'Mobile Money' && (
                        <p className="co-charge-note">* You pay {money(amount)} for goods now; shipping and provider charges shown above are separate.</p>
                      )}
                    </div>

                    <Divider style={{ margin: '20px 0' }} />

                    <div className="co-payment-section">
                      <p className="co-payment-title">Payment Method</p>
                      <Radio.Group value={method} onChange={e => setMethod(e.target.value)} style={{ width: '100%' }}>
                        <div className="co-payment-options">
                          {!telecel && (isAgent || freeDelivery || (shipping > 0 && !naDelivery)) && (
                            <label className={`co-payment-option ${method === 'Cash on Delivery' ? 'co-payment-option-active' : ''}`}>
                              <Radio value="Cash on Delivery" />
                              <span className="co-payment-option-text">Cash on Delivery</span>
                            </label>
                          )}
                          {!isAgent && (
                            <label className={`co-payment-option ${method === 'Mobile Money' ? 'co-payment-option-active' : ''}`}>
                              <Radio value="Mobile Money" />
                              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="co-payment-option-text">{telecel ? 'Telecel Cash' : 'Mobile Money (MTN, Telecel, AT)'}</span>
                                {detectedNetworkInfo && (
                                  <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>
                                    {detectedNetworkInfo.name}
                                  </span>
                                )}
                              </div>
                            </label>
                          )}
                          {!telecel && isAgent && ['Pick Up', 'Paid Already'].map(m => (
                            <label className={`co-payment-option ${method === m ? 'co-payment-option-active' : ''}`} key={m}>
                              <Radio value={m} />
                              <span className="co-payment-option-text">{m}</span>
                            </label>
                          ))}
                        </div>
                      </Radio.Group>
                    </div>

                    <div className="co-desktop-btn">
                      <button className="co-btn-primary" onClick={checkout} disabled={busy || stage !== 'form'}>
                        <ShoppingBagIcon style={{ width: 20, height: 20 }} />
                        {paymentLabel}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!!items.length && (
          <div className="co-sticky-bottom">
            <button className="co-btn-primary" onClick={checkout} disabled={busy || stage !== 'form'}>
              <ShoppingBagIcon style={{ width: 20, height: 20 }} />
              {paymentLabel}
            </button>
          </div>
        )}

        <Modal open={missing} centered onCancel={() => setMissing(false)} title="Complete Required Fields" footer={<button className="co-btn-primary" onClick={() => setMissing(false)}>Got It</button>}>
          {isAgent
            ? "Please provide your customer's name, contact number, delivery address and a payment method."
            : 'Please provide the recipient name, contact number, delivery address and payment method.'}
        </Modal>

        {/* ── MOBILE MONEY VALIDATION & PROMPT INITIALIZATION ── */}
        <Modal
          open={stage === 'payment'}
          centered
          width={450}
          footer={null}
          onCancel={() => { if (!busy) flow.setStage('form'); }}
          closable={!busy}
          maskClosable={!busy}
          styles={{ body: { padding: 0 }, content: { borderRadius: 16, overflow: 'hidden' } }}
        >
          <div className="pm-modal-wrap">
            <div className="pm-header-compact">
              <div className="pm-header-left">
                <img src={frankoLogo} alt="Franko" className="pm-logo-small" />
                <div>
                  <p className="pm-company-small">Franko Trading</p>
                  <p className="pm-ref-small">{orderId}</p>
                </div>
              </div>
              <div className="pm-header-right">
                <p className="pm-amount-label-small">Charged now</p>
                <p className="pm-amount-value-small">{money(amount)}</p>
              </div>
            </div>

            <div className="pm-body">
              <div className="pm-field">
                <div className="pm-field-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="pm-field-step-num">1</span>
                    <span className="pm-field-label">Registered MoMo Number</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: 4 }}>Locked to account</span>
                </div>
                <div className="pm-field-body">
                  <Input value={number} disabled prefix={<LockClosedIcon style={{ width: 16, height: 16, color: '#14532d' }} />} size="large" style={{ fontWeight: 800, color: '#111827', background: '#f9fafb' }} />
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>* The payment prompt is always sent to your registered Franko number.</div>
                </div>
              </div>

              <div className="pm-field">
                <div className="pm-field-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="pm-field-step-num">2</span>
                    <span className="pm-field-label">Network Provider</span>
                  </div>
                  {detectedNetworkInfo && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: 4 }}>
                      Auto-detected ({detectedNetworkInfo.prefix})
                    </span>
                  )}
                </div>
                <div className="pm-field-body">
                  <div className="pm-networks">
                    {netTiles.map(n => {
                      const isSelected = network === n.value;
                      return (
                        <div key={n.value} className="pm-network-tile" style={{ background: isSelected ? n.bg : '#fafafa', borderColor: isSelected ? n.border : '#e5e7eb', opacity: isSelected ? 1 : 0.45 }}>
                          <img src={n.logo} alt={n.name} className="pm-network-logo" />
                          <div>
                            <p className="pm-network-name">{n.name}</p>
                            <p className="pm-network-sub">{isSelected ? 'Auto-selected' : n.sub}</p>
                          </div>
                          {isSelected && <CheckCircleSolid style={{ width: 20, height: 20, color: n.color }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pm-account-status pm-account-checking">
                <div className="co-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                <div>{subscriberName ? `Account Verified · ${subscriberName}` : `Validating account with ${currentNetwork?.name || 'network'}…`}</div>
              </div>

              <div className="pm-security">
                <ShieldCheckIcon style={{ width: 12, height: 12 }} />
                Secured by GhIPSS · Transflow Payment Gateway
              </div>
            </div>
          </div>
        </Modal>

        {/* ── AWAITING PROMPT APPROVAL ── */}
        <Modal open={['pending', 'posting', 'review', 'support'].includes(stage)} centered width={520} footer={null} closable={false} maskClosable={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
            {stage === 'posting' ? (
              <>
                <CheckCircleSolid style={{ width: 50, height: 50, color: '#16a34a', margin: 'auto' }} />
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#14532d' }}>{postingPaid ? 'Payment Confirmed!' : 'Order Placed!'}</h3>
                <p style={{ color: '#4b5563', margin: 0 }}>{postingPaid ? 'Creating your order and redirecting to confirmation…' : 'Finalizing your order and redirecting…'}</p>
              </>
            ) : stage === 'support' ? (
              <>
                <ExclamationTriangleIcon style={{ width: 50, height: 50, color: '#d97706', margin: 'auto' }} />
                <h3>Order needs assistance</h3>
                <p>{error}</p>
              </>
            ) : (
              <>
                <div className="pm-pending-anim" style={{ margin: 'auto' }}>
                  <div className="pm-pending-ring-outer" />
                  <div className="pm-pending-ring-spin" />
                  <div className="pm-pending-ring-inner"><PhoneIcon style={{ width: 28, height: 28, color: '#16a34a' }} /></div>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{stage === 'review' ? 'Approve Your MoMo Payment' : 'Check Your Phone'}</h3>
                <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                  We have sent an authorization prompt to <strong>{number}</strong> ({currentNetwork?.name || 'Mobile Money'}).
                </p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                  Reference: <strong>{orderId}</strong> · Amount: <strong>{money(amount)}</strong>
                </p>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534', fontWeight: 600 }}>
                  Enter your MoMo PIN on your phone to complete payment. We will confirm your order automatically as soon as you approve.
                </div>

                {stage === 'review' && (
                  <>
                    <div className="co-guide-steps-wrap">
                      <div className="co-guide-steps-header"><strong>Step-by-step approval</strong></div>
                      <div className="co-guide-steps-body" style={{ textAlign: 'left' }}>
                        {(approval[network] || []).map((step, i) => (
                          <div className="co-guide-step" key={step}>
                            <span className="co-guide-step-num" style={{ background: '#16a34a' }}>{i + 1}</span>
                            <p className="co-guide-step-text">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button className="co-btn-primary" onClick={checkAgain} disabled={busy}>I've Approved — Confirm Payment</button>
                    <button className="co-btn-danger" onClick={() => cancel('Customer cancelled before confirmation')} disabled={busy}>Cancel Order</button>
                  </>
                )}
              </>
            )}
          </div>
        </Modal>

        <AuthModal
          open={auth}
          onClose={() => setAuth(false)}
          onSuccess={handleAuthSuccess}
          currentCustomer={customer}
          initialMode="signup"
          autoLoginAfterSignup
          notice="Create an account or sign in before placing your order."
        />
      </div>
    </>
  );
}