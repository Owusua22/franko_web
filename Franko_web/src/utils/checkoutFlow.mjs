// Gateway status is determined by the BODY, not HTTP 200 or responseCode alone.
export function paymentOutcome(raw) {
  let value = raw;
  for (let i = 0; i < 5; i += 1) {
    if (typeof value === 'string') {
      try { value = JSON.parse(value); continue; } catch { return 'pending'; }
    }
    if (Array.isArray(value)) { value = value[0]; continue; }
    if (!value || typeof value !== 'object') return 'pending';
    if ('responseMessage' in value || 'ResponseMessage' in value || 'responseCode' in value || 'ResponseCode' in value) break;
    value = value.payload ?? value.data ?? value.response ?? value.result;
  }
  if (!value || typeof value !== 'object') return 'pending';
  const text = String(value.responseMessage ?? value.ResponseMessage ?? '').trim().toLowerCase();
  const code = String(value.responseCode ?? value.ResponseCode ?? '').trim();
  if (text === 'target_authorization_error') return 'failed';
  if (text === 'successfully processed transaction' && (code === '' || code === '01' || code === '1')) return 'success';
  // A gateway can send a provisional responseCode (including 0/02) while
  // processing the prompt. Only an explicit terminal *message* may cancel.
  if (/fail(?:ed|ure)?|declin(?:ed|e)?|reject(?:ed)?|cancel(?:led|ed)?|revers(?:ed|al)?|unsuccessful|insufficient funds|expired/.test(text)) return 'failed';
  if (/process(?:ing)?|pending|await|initiated|prompt|approval|in progress|queued/.test(text)) return 'pending';
  return 'pending';
}

// Keep Checkout's existing ORD-<time % 10000>-<random % 1000> format.
// Telecel uses exactly the same suffixes with a TEL prefix.
export function generateOrderCode(telecel = false, now = Date.now(), random = Math.random()) {
  return `${telecel ? 'TEL' : 'ORD'}-${now % 10000}-${Math.floor(random * 1000)}`;
}

// Preserve the CheckOutDbCart / OrderDeliveryUpdate payload shape from Checkout.jsx.
export function buildOrderDetails({ cartId, customerId, orderId, paymentMode, contact, accountType, subtotal, recipientName, recipientContactNumber, orderNote, orderDate, address, paymentService = 'N/A' }) {
  const checkout = {
    Cartid: cartId, customerId, orderCode: orderId,
    PaymentMode: paymentMode, PaymentAccountNumber: contact,
    customerAccountType: accountType, paymentService,
    totalAmount: subtotal, recipientName, recipientContactNumber,
    orderNote: orderNote || 'N/A', orderDate,
  };
  const delivery = {
    orderCode: orderId, OrderCode: orderId, address,
    Customerid: customerId, recipientName, recipientContactNumber,
    orderNote: orderNote || 'N/A', geoLocation: 'N/A',
  };
  return { checkout, delivery };
}

export function assertOrderDetails(checkout, delivery) {
  if (!checkout?.Cartid || !checkout?.customerId || !checkout?.orderCode ||
      !checkout?.PaymentMode || !checkout?.PaymentAccountNumber ||
      !checkout?.recipientName || !checkout?.recipientContactNumber ||
      !Number.isFinite(Number(checkout?.totalAmount)) ||
      !checkout?.orderDate || !delivery?.address ||
      String(delivery?.OrderCode) !== String(checkout.orderCode) ||
      String(delivery?.Customerid) !== String(checkout.customerId)) {
    throw new Error('Order details are incomplete; the order was not dispatched.');
  }
  return true;
}

// Only a confirmed online payment can use the payment-success page.
// All offline methods and standard agent orders use the received page.
export function completedOrderRoute({ orderId, paid, paymentMode, accountType, telecel = false }) {
  // Never infer that an order has been paid merely because CheckOutDbCart
  // succeeded: COD and agent orders also return a successful order response.
  const mobileMoney = String(paymentMode ?? '').trim().toLowerCase() === 'mobile money';
  const agent = !telecel && String(accountType ?? '').trim().toLowerCase() === 'agent';
  return paid === true && mobileMoney && !agent
    ? `/order-success/${encodeURIComponent(orderId)}`
    : '/order-received';
}

export function assertOrderAccepted(raw) {
  let value = raw;
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { throw new Error('Invalid order response'); } }
  if (Array.isArray(value)) value = value[0];
  if (!value || typeof value !== 'object') throw new Error('Empty order response');
  const code = String(value.responseCode ?? value.ResponseCode ?? '').trim();
  const text = String(value.responseMessage ?? value.ResponseMessage ?? value.message ?? '').toLowerCase();
  if (value.status === false || value.success === false || (code && !['1','01'].includes(code)) || /fail|reject|cancel|error/.test(text)) {
    throw new Error(value.responseMessage || value.message || 'Order was not accepted');
  }
  return value;
}

/** Validates whether a payment verification code is a valid 6-digit numeric string */
export function isValidVerificationCode(code) {
  if (typeof code !== 'string') return false;
  return /^\d{6}$/.test(code.trim());
}

/** Checks whether a verification session has expired */
export function isVerificationExpired(createdAt, expiryMs = 10 * 60 * 1000, now = Date.now()) {
  return now - Number(createdAt || 0) > expiryMs;
}

export const readJSON = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (typeof raw !== 'string') return raw ?? fallback;
    try { return JSON.parse(raw); } catch { return raw; }
  } catch { return fallback; }
};
export const removeDraft = () => {
  try { ['checkoutDetails','orderAddressDetails','checkoutDifferentRecipient'].forEach(k => localStorage.removeItem(k)); } catch { /* best effort */ }
};
