// Lambda: index.mjs
import axios from "axios";
import { createHmac, randomInt } from "crypto";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// ═══════════════════════════════════════════════════════════════════
// IN-MEMORY STORAGE
// ═══════════════════════════════════════════════════════════════════
const rateLimitMap = new Map();
const validatedAccessCodes = new Map();
const paymentVerificationStore = new Map();

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
const CONFIG = {
  RATE_LIMIT: {
    MAX_ATTEMPTS: 10,
    WINDOW_MS: 15 * 60 * 1000,
  },
  CLEANUP: {
    MAX_VALIDATED_CODES: 10000,
    KEEP_RECENT_CODES: 5000,
    MAX_PAYMENT_VERIFICATIONS: 10000,
    KEEP_RECENT_PAYMENTS: 5000,
  },
  TOKEN: {
    ACCESS_EXPIRY: 60 * 60,        // 1 hour
    REFRESH_EXPIRY: 30 * 24 * 60 * 60, // 30 days
  },
  PAYMENT_VERIFICATION: {
    CODE_EXPIRY_MS: 10 * 60 * 1000, // 10 minutes code validity
    MAX_VERIFY_ATTEMPTS: 5,        // max invalid code attempts before invalidation
  },
};

// ═══════════════════════════════════════════════════════════════════
// JWT HELPERS (Pure crypto - no external dependency)
// ═══════════════════════════════════════════════════════════════════
const base64UrlEncode = (data) => {
  return Buffer.from(JSON.stringify(data))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

const base64UrlDecode = (str) => {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return JSON.parse(Buffer.from(str, "base64").toString());
};

const createJWT = (payload, secret, expiresInSec) => {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSec,
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(fullPayload);

  const signature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const verifyJWT = (token, secret) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;

    const expectedSignature = createHmac("sha256", secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (signature !== expectedSignature) return null;

    const payload = base64UrlDecode(encodedPayload);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.warn("⚠️ JWT expired");
      return null;
    }

    return payload;
  } catch (error) {
    console.error("❌ JWT verification error:", error);
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════
const getClientIP = (event, headersLower) => {
  return (
    event.requestContext?.identity?.sourceIp ||
    headersLower["x-forwarded-for"]?.split(",")[0]?.trim() ||
    headersLower["x-real-ip"] ||
    "unknown"
  );
};

const createResponse = (statusCode, body, allowedOrigin = "*") => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

// ═══════════════════════════════════════════════════════════════════
// PHONE & SMS HELPERS
// ═══════════════════════════════════════════════════════════════════
const formatGhanaMSISDN = (phone) => {
  let clean = String(phone || "").replace(/\D/g, "");
  if (clean.startsWith("0")) clean = `233${clean.slice(1)}`;
  if (!clean.startsWith("233")) clean = `233${clean}`;
  return clean;
};

const maskPhoneNumber = (phone) => {
  const str = String(phone || "").trim();
  if (str.length < 7) return str;
  const start = str.slice(0, str.startsWith("233") ? 5 : 3);
  const end = str.slice(-2);
  return `${start} ••• ••${end}`;
};

const sendSMS = async ({ msisdn, code, amount, refNo }) => {
  const formattedPhone = formatGhanaMSISDN(msisdn);
  const rawSenderId = process.env.AWS_SNS_SENDER_ID || process.env.SMS_SENDER_ID || "Franko";
  const awsSenderId = rawSenderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 11) || "Franko";
  const senderId = process.env.SMS_SENDER_ID || "Franko";
  const messageText = `Your Franko Trading payment verification code is ${code}. Amount: GH₵${Number(amount || 0).toFixed(2)}. Valid for 10 minutes. Do not share this code.`;

  console.log(`📱 [SMS DISPATCH] To: +${formattedPhone} (refNo: ${refNo}): "${messageText}"`);

  // 1. AWS SMS SENDER (AWS SNS) - Preferred / Primary SMS Provider
  const isAwsExplicit = process.env.USE_AWS_SNS === "true" || process.env.SMS_PROVIDER === "aws";
  const isAwsLambdaEnv = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV);
  const hasAwsCreds = Boolean(
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
    (process.env.AWS_SNS_ACCESS_KEY_ID && process.env.AWS_SNS_SECRET_ACCESS_KEY)
  );

  if (process.env.USE_AWS_SNS !== "false" && (isAwsExplicit || isAwsLambdaEnv || hasAwsCreds)) {
    try {
      const region =
        process.env.AWS_SNS_REGION ||
        process.env.AWS_REGION ||
        process.env.AWS_DEFAULT_REGION ||
        "us-east-1";

      const clientConfig = { region };
      if (process.env.AWS_SNS_ACCESS_KEY_ID && process.env.AWS_SNS_SECRET_ACCESS_KEY) {
        clientConfig.credentials = {
          accessKeyId: process.env.AWS_SNS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY,
        };
      }

      const snsClient = new SNSClient(clientConfig);

      const messageAttributes = {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
        "AWS.SNS.SMS.SenderID": {
          DataType: "String",
          StringValue: awsSenderId,
        },
      };

      if (process.env.AWS_SNS_ORIGINATION_IDENTITY) {
        messageAttributes["AWS.SNS.SMS.OriginationIdentity"] = {
          DataType: "String",
          StringValue: process.env.AWS_SNS_ORIGINATION_IDENTITY,
        };
      }

      if (process.env.AWS_SNS_ENTITY_ID) {
        messageAttributes["AWS.SNS.SMS.EntityId"] = {
          DataType: "String",
          StringValue: process.env.AWS_SNS_ENTITY_ID,
        };
      }

      if (process.env.AWS_SNS_TEMPLATE_ID) {
        messageAttributes["AWS.SNS.SMS.TemplateId"] = {
          DataType: "String",
          StringValue: process.env.AWS_SNS_TEMPLATE_ID,
        };
      }

      const publishParams = {
        PhoneNumber: `+${formattedPhone}`,
        Message: messageText,
        MessageAttributes: messageAttributes,
      };

      const snsResponse = await snsClient.send(new PublishCommand(publishParams));
      console.log(`✅ SMS sent via AWS SNS to +${formattedPhone}: MessageId ${snsResponse.MessageId}`);
      return {
        success: true,
        provider: "aws-sns",
        messageId: snsResponse.MessageId,
        data: snsResponse,
      };
    } catch (err) {
      console.error(`❌ AWS SNS SMS failed:`, err.message);
    }
  }

  // 2. ARKESEL (Ghana SMS Gateway - Fallback)
  if (process.env.ARKESEL_API_KEY) {
    try {
      const res = await axios.post(
        "https://sms.arkesel.com/api/v2/sms/send",
        {
          sender: senderId,
          message: messageText,
          recipients: [formattedPhone],
        },
        {
          headers: {
            "api-key": process.env.ARKESEL_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      console.log(`✅ SMS sent via Arkesel to +${formattedPhone}:`, res.data);
      return { success: true, provider: "arkesel", data: res.data };
    } catch (err) {
      console.error(`❌ Arkesel SMS failed:`, err.message, err.response?.data);
    }
  }

  // 3. HUBTEL (Ghana SMS Gateway)
  if (process.env.HUBTEL_CLIENT_ID && process.env.HUBTEL_CLIENT_SECRET) {
    try {
      const auth = Buffer.from(
        `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`
      ).toString("base64");
      const res = await axios.get("https://smsc.hubtel.com/v1/messages/send", {
        params: {
          From: senderId,
          To: formattedPhone,
          Content: messageText,
        },
        headers: {
          Authorization: `Basic ${auth}`,
        },
        timeout: 10000,
      });
      console.log(`✅ SMS sent via Hubtel to +${formattedPhone}:`, res.data);
      return { success: true, provider: "hubtel", data: res.data };
    } catch (err) {
      console.error(`❌ Hubtel SMS failed:`, err.message, err.response?.data);
    }
  }

  // 4. MNOTIFY (Ghana SMS Gateway)
  if (process.env.MNOTIFY_API_KEY) {
    try {
      const res = await axios.post(
        "https://api.mnotify.com/api/sms/quick",
        {
          recipient: [formattedPhone],
          sender: senderId,
          message: messageText,
        },
        {
          headers: {
            key: process.env.MNOTIFY_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      console.log(`✅ SMS sent via mNotify to +${formattedPhone}:`, res.data);
      return { success: true, provider: "mnotify", data: res.data };
    } catch (err) {
      console.error(`❌ mNotify SMS failed:`, err.message, err.response?.data);
    }
  }

  // 5. TWILIO
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    try {
      const auth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString("base64");
      const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const params = new URLSearchParams();
      params.append("To", `+${formattedPhone}`);
      params.append("From", process.env.TWILIO_FROM_NUMBER);
      params.append("Body", messageText);

      const res = await axios.post(url, params.toString(), {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      });
      console.log(`✅ SMS sent via Twilio to +${formattedPhone}:`, res.data?.sid);
      return { success: true, provider: "twilio", data: res.data };
    } catch (err) {
      console.error(`❌ Twilio SMS failed:`, err.message, err.response?.data);
    }
  }

  // 6. CUSTOM SMS GATEWAY
  if (process.env.SMS_API_URL) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (process.env.SMS_API_KEY) {
        headers["Authorization"] = `Bearer ${process.env.SMS_API_KEY}`;
        headers["X-Api-Key"] = process.env.SMS_API_KEY;
      }
      const res = await axios.post(
        process.env.SMS_API_URL,
        {
          to: formattedPhone,
          phone: formattedPhone,
          msisdn: formattedPhone,
          message: messageText,
          code,
          amount,
          refNo,
          sender: senderId,
        },
        { headers, timeout: 10000 }
      );
      console.log(`✅ SMS sent via custom gateway to +${formattedPhone}:`, res.data);
      return { success: true, provider: "custom", data: res.data };
    } catch (err) {
      console.error(`❌ Custom gateway SMS failed:`, err.message);
    }
  }

  // 7. DEFAULT SIMULATION LOG
  console.log(`📱 [SMS SIMULATION] To: +${formattedPhone} | Code: ${code} | Message: "${messageText}"`);
  return {
    success: true,
    provider: "simulation",
    message: "SMS simulated in dev mode",
  };
};

// ═══════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════
const checkRateLimit = (
  ipAddress,
  maxAttempts = 10,
  windowMs = 15 * 60 * 1000
) => {
  const now = Date.now();

  if (!rateLimitMap.has(ipAddress)) {
    rateLimitMap.set(ipAddress, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  const record = rateLimitMap.get(ipAddress);

  if (now > record.resetTime) {
    rateLimitMap.set(ipAddress, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: maxAttempts - record.count };
};

const cleanupRateLimitMap = () => {
  const now = Date.now();
  let cleanedCount = 0;
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned ${cleanedCount} expired rate limit records`);
  }
};

// ═══════════════════════════════════════════════════════════════════
// VALIDATED CODES MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
const cleanupValidatedCodes = () => {
  const { MAX_VALIDATED_CODES, KEEP_RECENT_CODES } = CONFIG.CLEANUP;
  if (validatedAccessCodes.size > MAX_VALIDATED_CODES) {
    const entries = Array.from(validatedAccessCodes.entries());
    entries.sort((a, b) => b[1].validatedAt - a[1].validatedAt);
    validatedAccessCodes.clear();
    entries.slice(0, KEEP_RECENT_CODES).forEach(([code, data]) => {
      validatedAccessCodes.set(code, data);
    });
    console.log(`✅ Kept ${KEEP_RECENT_CODES} most recent codes`);
  }
};

// ═══════════════════════════════════════════════════════════════════
// PAYMENT VERIFICATION STORE CLEANUP
// ═══════════════════════════════════════════════════════════════════
const cleanupPaymentVerificationStore = () => {
  const now = Date.now();
  let expiredCount = 0;
  for (const [key, value] of paymentVerificationStore.entries()) {
    if (now > value.expiresAt) {
      paymentVerificationStore.delete(key);
      expiredCount++;
    }
  }
  if (expiredCount > 0) {
    console.log(`🧹 Cleaned ${expiredCount} expired payment verification records`);
  }

  const { MAX_PAYMENT_VERIFICATIONS, KEEP_RECENT_PAYMENTS } = CONFIG.CLEANUP;
  if (paymentVerificationStore.size > MAX_PAYMENT_VERIFICATIONS) {
    const entries = Array.from(paymentVerificationStore.entries());
    entries.sort((a, b) => b[1].createdAt - a[1].createdAt);
    paymentVerificationStore.clear();
    entries.slice(0, KEEP_RECENT_PAYMENTS).forEach(([key, data]) => {
      paymentVerificationStore.set(key, data);
    });
    console.log(`✅ Kept ${KEEP_RECENT_PAYMENTS} most recent payment verification records`);
  }
};

// ═══════════════════════════════════════════════════════════════════
// PAYMENT STATUS EVALUATION (Transflow response helper)
// ═══════════════════════════════════════════════════════════════════
const evaluatePaymentOutcome = (raw) => {
  let value = raw;
  for (let i = 0; i < 5; i += 1) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
        continue;
      } catch {
        return "pending";
      }
    }
    if (Array.isArray(value)) {
      value = value[0];
      continue;
    }
    if (!value || typeof value !== "object") return "pending";
    if (
      "responseMessage" in value ||
      "ResponseMessage" in value ||
      "responseCode" in value ||
      "ResponseCode" in value
    ) {
      break;
    }
    value = value.payload ?? value.data ?? value.response ?? value.result;
  }
  if (!value || typeof value !== "object") return "pending";
  const text = String(
    value.responseMessage ?? value.ResponseMessage ?? ""
  )
    .trim()
    .toLowerCase();
  const code = String(value.responseCode ?? value.ResponseCode ?? "").trim();
  if (text === "target_authorization_error") return "failed";
  if (
    text === "successfully processed transaction" &&
    (code === "" || code === "01" || code === "1")
  ) {
    return "success";
  }
  if (
    /fail(?:ed|ure)?|declin(?:ed|e)?|reject(?:ed)?|cancel(?:led|ed)?|revers(?:ed|al)?|unsuccessful|insufficient funds|expired/.test(
      text
    )
  ) {
    return "failed";
  }
  if (
    /process(?:ing)?|pending|await|initiated|prompt|approval|in progress|queued/.test(
      text
    )
  ) {
    return "pending";
  }
  return "pending";
};

// ═══════════════════════════════════════════════════════════════════
// ACCESS CODE VERIFICATION
// ═══════════════════════════════════════════════════════════════════
const handleAccessCodeVerification = async (
  event,
  headersLower,
  allowedOrigin
) => {
  const ACCESS_CODE = process.env.ACCESS_CODE;

  if (!ACCESS_CODE) {
    return createResponse(
      500,
      { success: false, message: "Server configuration error" },
      allowedOrigin
    );
  }

  if (event.httpMethod !== "POST") {
    return createResponse(
      405,
      { success: false, message: "Method Not Allowed. Use POST." },
      allowedOrigin
    );
  }

  const ipAddress = getClientIP(event, headersLower);
  const rateCheck = checkRateLimit(ipAddress);

  if (!rateCheck.allowed) {
    const resetMinutes = Math.ceil(
      (rateCheck.resetTime - Date.now()) / (60 * 1000)
    );
    return createResponse(
      429,
      {
        success: false,
        message: `Too many attempts. Try again in ${resetMinutes} minute(s).`,
      },
      allowedOrigin
    );
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return createResponse(
      400,
      { success: false, message: "Invalid JSON body" },
      allowedOrigin
    );
  }

  const { accessCode } = body;

  if (!accessCode || typeof accessCode !== "string") {
    return createResponse(
      400,
      { success: false, message: "Access code is required" },
      allowedOrigin
    );
  }

  const isValid =
    accessCode.trim().toUpperCase() === ACCESS_CODE.trim().toUpperCase();

  if (isValid) {
    validatedAccessCodes.set(accessCode.trim().toUpperCase(), {
      validatedAt: Date.now(),
      ipAddress,
    });
    console.log(`✅ Access code validated for IP: ${ipAddress}`);
    return createResponse(
      200,
      { success: true, message: "Access code verified successfully" },
      allowedOrigin
    );
  }

  return createResponse(
    401,
    {
      success: false,
      message: "Invalid access code",
      attemptsRemaining: rateCheck.remaining,
    },
    allowedOrigin
  );
};

// ═══════════════════════════════════════════════════════════════════
// TOKEN REFRESH (Lambda-handled, no backend call needed)
// ═══════════════════════════════════════════════════════════════════
const handleTokenRefresh = async (
  event,
  headersLower,
  allowedOrigin,
  userType
) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    console.error("❌ Missing JWT secrets");
    return createResponse(
      500,
      {
        response: {
          responseCode: "0",
          responseMessage: "Server configuration error",
        },
      },
      allowedOrigin
    );
  }

  if (event.httpMethod !== "POST") {
    return createResponse(
      405,
      {
        response: {
          responseCode: "0",
          responseMessage: "Method Not Allowed",
        },
      },
      allowedOrigin
    );
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return createResponse(
      400,
      {
        response: {
          responseCode: "0",
          responseMessage: "Invalid request body",
        },
      },
      allowedOrigin
    );
  }

  const { refreshToken } = body;

  if (!refreshToken) {
    return createResponse(
      400,
      {
        response: {
          responseCode: "0",
          responseMessage: "Refresh token is required",
        },
      },
      allowedOrigin
    );
  }

  try {
    const payload = verifyJWT(refreshToken, JWT_REFRESH_SECRET);

    if (!payload) {
      console.warn(`❌ Invalid/expired refresh token for ${userType}`);
      return createResponse(
        401,
        {
          response: {
            responseCode: "0",
            responseMessage: "Invalid or expired refresh token. Please log in again.",
          },
        },
        allowedOrigin
      );
    }

    if (payload.type && payload.type !== userType) {
      console.warn(`❌ Token type mismatch: expected ${userType}, got ${payload.type}`);
      return createResponse(
        401,
        {
          response: {
            responseCode: "0",
            responseMessage: "Token type mismatch. Please log in again.",
          },
        },
        allowedOrigin
      );
    }

    const { contactNumber } = payload;

    if (!contactNumber) {
      return createResponse(
        401,
        {
          response: {
            responseCode: "0",
            responseMessage: "Invalid token payload",
          },
        },
        allowedOrigin
      );
    }

    const newAccessToken = createJWT(
      {
        contactNumber,
        type: userType,
        refreshed: true,
        generatedAt: Date.now(),
      },
      JWT_SECRET,
      CONFIG.TOKEN.ACCESS_EXPIRY
    );

    const newRefreshToken = createJWT(
      {
        contactNumber,
        type: userType,
        tokenType: "refresh",
      },
      JWT_REFRESH_SECRET,
      CONFIG.TOKEN.REFRESH_EXPIRY
    );

    console.log(`✅ ${userType} token refreshed for: ${contactNumber}`);

    return createResponse(
      200,
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        response: {
          responseCode: "1",
          responseMessage: "Token refreshed successfully",
        },
      },
      allowedOrigin
    );
  } catch (error) {
    console.error(`❌ Token refresh error for ${userType}:`, error.message);
    return createResponse(
      401,
      {
        response: {
          responseCode: "0",
          responseMessage: "Token refresh failed. Please log in again.",
        },
      },
      allowedOrigin
    );
  }
};

// ═══════════════════════════════════════════════════════════════════
// PAYMENT CODE GENERATION (Step 3: Lambda generates random 6-digit code)
// ═══════════════════════════════════════════════════════════════════
const handleGeneratePaymentCode = async (
  event,
  headersLower,
  allowedOrigin
) => {
  if (event.httpMethod !== "POST") {
    return createResponse(
      405,
      { success: false, message: "Method Not Allowed. Use POST." },
      allowedOrigin
    );
  }

  const ipAddress = getClientIP(event, headersLower);
  const rateCheck = checkRateLimit(ipAddress, 25, 15 * 60 * 1000);

  if (!rateCheck.allowed) {
    return createResponse(
      429,
      {
        success: false,
        message: "Too many verification code requests. Please try again later.",
      },
      allowedOrigin
    );
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return createResponse(
      400,
      { success: false, message: "Invalid JSON body" },
      allowedOrigin
    );
  }

  const { refNo, msisdn, amount, network, narration } = body;

  if (!refNo || !msisdn) {
    return createResponse(
      400,
      {
        success: false,
        message: "Order reference (refNo) and customer phone number (msisdn) are required",
      },
      allowedOrigin
    );
  }

  // Generate cryptographically secure random 6-digit code
  const code = String(randomInt(100000, 1000000));
  const now = Date.now();
  const expiresAt = now + CONFIG.PAYMENT_VERIFICATION.CODE_EXPIRY_MS;
  const cleanRef = String(refNo).trim();

  paymentVerificationStore.set(cleanRef, {
    code,
    refNo: cleanRef,
    msisdn: String(msisdn).trim(),
    amount: Number(amount) || 0,
    network: network || "MTN",
    narration: narration || "Franko Order Payment",
    attempts: 0,
    createdAt: now,
    expiresAt,
    verified: false,
    ipAddress,
  });

  console.log(`🔐 Generated 6-digit payment code for refNo: ${cleanRef}, phone: ${msisdn}`);

  // Send the OTP directly to customer's phone number via SMS (AWS SNS as primary)
  const smsResult = await sendSMS({
    msisdn,
    code,
    amount,
    refNo: cleanRef,
  });

  const maskedPhone = maskPhoneNumber(msisdn);
  const showDevCode = process.env.SHOW_OTP_IN_RESPONSE === "true" || process.env.NODE_ENV !== "production";

  return createResponse(
    200,
    {
      success: true,
      message: `Verification code sent via SMS to ${maskedPhone}`,
      refNo: cleanRef,
      maskedPhone,
      smsSent: smsResult.success,
      smsStatus: smsResult.success ? "sent" : "failed",
      smsProvider: smsResult.provider,
      ...(showDevCode ? { code, devCode: code } : {}),
      expiresAt,
      expiresInSeconds: Math.floor(CONFIG.PAYMENT_VERIFICATION.CODE_EXPIRY_MS / 1000),
    },
    allowedOrigin
  );
};

// ═══════════════════════════════════════════════════════════════════
// PAYMENT CODE VERIFICATION & TRANSFLOW INITIATION (Steps 5, 6, 7)
// ═══════════════════════════════════════════════════════════════════
const handleVerifyPaymentCode = async (
  event,
  headersLower,
  allowedOrigin,
  queryParams
) => {
  if (event.httpMethod !== "POST") {
    return createResponse(
      405,
      { success: false, message: "Method Not Allowed. Use POST." },
      allowedOrigin
    );
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return createResponse(
      400,
      { success: false, message: "Invalid JSON body" },
      allowedOrigin
    );
  }

  const { refNo, code, msisdn, amount, network, narration } = body;

  if (!refNo || !code) {
    return createResponse(
      400,
      {
        success: false,
        message: "Order reference (refNo) and verification code are required",
      },
      allowedOrigin
    );
  }

  const cleanRef = String(refNo).trim();
  const record = paymentVerificationStore.get(cleanRef);

  if (!record) {
    return createResponse(
      404,
      {
        success: false,
        message: "No verification session found for this transaction reference. Please request a new code.",
      },
      allowedOrigin
    );
  }

  // Step 6: Lambda checks whether the entered code has expired
  if (Date.now() > record.expiresAt) {
    paymentVerificationStore.delete(cleanRef);
    return createResponse(
      400,
      {
        success: false,
        message: "Verification code has expired. Please request a new code.",
        expired: true,
      },
      allowedOrigin
    );
  }

  // Check brute force attempts
  if (record.attempts >= CONFIG.PAYMENT_VERIFICATION.MAX_VERIFY_ATTEMPTS) {
    paymentVerificationStore.delete(cleanRef);
    return createResponse(
      429,
      {
        success: false,
        message: "Too many failed attempts. Please request a new verification code.",
      },
      allowedOrigin
    );
  }

  // Step 6: Lambda checks whether the entered code matches the generated code
  const enteredCode = String(code).trim();
  if (enteredCode !== record.code) {
    record.attempts += 1;
    const remaining = CONFIG.PAYMENT_VERIFICATION.MAX_VERIFY_ATTEMPTS - record.attempts;
    console.warn(`❌ Verification code mismatch for refNo: ${cleanRef}. Attempts remaining: ${remaining}`);
    return createResponse(
      400,
      {
        success: false,
        message: `Invalid verification code. ${remaining} attempt(s) remaining.`,
        attemptsRemaining: remaining,
      },
      allowedOrigin
    );
  }

  // Code is verified!
  record.verified = true;
  console.log(`✅ Verification code matched for refNo: ${cleanRef}. Initiating Transflow payment...`);

  // Step 7: If correct, Lambda initiates the payment through Transflow
  const PAYMENT_API_BASE_URL = process.env.PAYMENT_API_BASE_URL;
  const PSP = queryParams?.PSP || process.env.PSP || "fte";

  const paymentPayload = {
    refNo: record.refNo,
    msisdn: msisdn ? String(msisdn).trim() : record.msisdn,
    amount: amount !== undefined ? Number(amount) : record.amount,
    network: network || record.network,
    narration: narration || record.narration,
  };

  if (!PAYMENT_API_BASE_URL) {
    console.warn("⚠️ PAYMENT_API_BASE_URL not configured. Simulating Transflow payment initiation.");
    record.status = "prompt_initiated";
    return createResponse(
      200,
      {
        success: true,
        verified: true,
        message: "Verification code confirmed. Transflow payment prompt initiated.",
        refNo: record.refNo,
        data: {
          responseCode: "01",
          responseMessage: "Successfully Processed Transaction",
          refNo: record.refNo,
        },
        responseCode: "01",
        responseMessage: "Successfully Processed Transaction",
      },
      allowedOrigin
    );
  }

  const transflowUrl = `${PAYMENT_API_BASE_URL}/PaymentPrompt/DebitCustomer?PSP=${encodeURIComponent(PSP)}`;
  console.log(`🚀 Proxying payment to Transflow: ${transflowUrl}`, paymentPayload);

  try {
    const transflowRes = await axios({
      method: "POST",
      url: transflowUrl,
      data: paymentPayload,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    console.log(`✅ Transflow responded (${transflowRes.status}):`, transflowRes.data);
    record.transflowData = transflowRes.data;
    record.status = "prompt_initiated";

    return createResponse(
      200,
      {
        success: true,
        verified: true,
        message: "Verification code confirmed and payment initiated through Transflow",
        refNo: record.refNo,
        data: transflowRes.data,
        responseCode: transflowRes.data?.responseCode ?? "01",
        responseMessage: transflowRes.data?.responseMessage ?? "Successfully Processed Transaction",
      },
      allowedOrigin
    );
  } catch (error) {
    console.error("❌ Transflow initiation error:", error.message, error.response?.data);
    return createResponse(
      error.response?.status || 502,
      {
        success: false,
        verified: true, // Code was valid, but gateway failed
        message: "Verification code accepted, but Transflow payment initiation failed",
        error: error.response?.data || error.message,
      },
      allowedOrigin
    );
  }
};

// ═══════════════════════════════════════════════════════════════════
// TRANSACTION RESULT VERIFICATION (Step 9: Lambda verifies transaction result)
// ═══════════════════════════════════════════════════════════════════
const handleVerifyTransactionResult = async (
  event,
  headersLower,
  allowedOrigin,
  queryParams
) => {
  let refNo = queryParams?.refNo;
  if (!refNo && event.body) {
    try {
      const parsed = JSON.parse(event.body);
      refNo = parsed.refNo;
    } catch {
      // ignore
    }
  }

  if (!refNo) {
    return createResponse(
      400,
      { success: false, message: "Missing transaction reference (refNo)" },
      allowedOrigin
    );
  }

  const cleanRef = String(refNo).trim();
  const PAYMENT_API_BASE_URL = process.env.PAYMENT_API_BASE_URL;
  const PSP = queryParams?.PSP || process.env.PSP || "fte";

  if (!PAYMENT_API_BASE_URL) {
    console.warn("⚠️ PAYMENT_API_BASE_URL not configured. Simulating confirmed status.");
    const record = paymentVerificationStore.get(cleanRef);
    if (record) {
      record.status = "success";
      record.confirmed = true;
    }
    return createResponse(
      200,
      {
        success: true,
        refNo: cleanRef,
        status: "success",
        verified: true,
        isConfirmed: true,
        data: {
          responseCode: "01",
          responseMessage: "Successfully Processed Transaction",
          refNo: cleanRef,
        },
        responseCode: "01",
        responseMessage: "Successfully Processed Transaction",
      },
      allowedOrigin
    );
  }

  const transflowUrl = `${PAYMENT_API_BASE_URL}/PaymentPrompt/CheckTransactionStatus?PSP=${encodeURIComponent(PSP)}`;
  console.log(`🔍 Checking status with Transflow: ${transflowUrl} for refNo: ${cleanRef}`);

  try {
    const transflowRes = await axios({
      method: "POST",
      url: transflowUrl,
      data: { refNo: cleanRef },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });

    const rawData = transflowRes.data;
    console.log(`✅ Transflow status result:`, rawData);
    const outcome = evaluatePaymentOutcome(rawData);
    const isConfirmed = outcome === "success";

    const record = paymentVerificationStore.get(cleanRef);
    if (record) {
      record.status = outcome;
      record.confirmed = isConfirmed;
    }

    return createResponse(
      200,
      {
        success: true,
        refNo: cleanRef,
        status: outcome, // "success" | "pending" | "failed"
        verified: isConfirmed,
        isConfirmed,
        data: rawData,
        responseCode: rawData?.responseCode,
        responseMessage: rawData?.responseMessage,
      },
      allowedOrigin
    );
  } catch (error) {
    console.error("❌ Transflow status check error:", error.message, error.response?.data);
    return createResponse(
      error.response?.status || 500,
      {
        success: false,
        refNo: cleanRef,
        status: "pending",
        verified: false,
        message: "Failed to verify transaction status with Transflow",
        error: error.response?.data || error.message,
      },
      allowedOrigin
    );
  }
};

// ═══════════════════════════════════════════════════════════════════
// RESOLVE API BASE URL
// ═══════════════════════════════════════════════════════════════════
const resolveMainApiBaseUrl = (client) => {
  const WEBSITE_API_BASE_URL = process.env.WEBSITE_API_BASE_URL;
  const APP_API_BASE_URL = process.env.APP_API_BASE_URL;
  const normalizedClient = (client || "").toLowerCase();
  return normalizedClient === "website" ? WEBSITE_API_BASE_URL : APP_API_BASE_URL;
};

// ═══════════════════════════════════════════════════════════════════
// MAIN BACKEND PROXY
// ═══════════════════════════════════════════════════════════════════
const proxyToBackend = async (
  event,
  endpoint,
  queryParams,
  rawHeaders,
  allowedOrigin,
  client
) => {
  const API_KEY = process.env.SALES_API_KEY;
  const API_KEY_NAME = process.env.API_KEY_NAME || "X-Api-Key";
  const API_BASE_URL = resolveMainApiBaseUrl(client);

  if (!API_KEY || !API_BASE_URL) {
    console.error("❌ Missing required env vars for backend proxy");
    return createResponse(
      500,
      { message: "Server configuration error" },
      allowedOrigin
    );
  }

  const API_URL = `${API_BASE_URL}${endpoint}`;
  const method = event.httpMethod;
  const normalizedClient = (client || "").toLowerCase();

  console.log(`📨 Proxying ${method} → ${normalizedClient || "app"}: ${API_URL}`);

  const backendHeaders = {
    Accept: "application/json",
    [API_KEY_NAME]: API_KEY,
  };

  const incomingAuth =
    rawHeaders.Authorization ||
    rawHeaders.authorization ||
    rawHeaders["Authorization"] ||
    rawHeaders["authorization"];

  if (incomingAuth) {
    backendHeaders.Authorization = incomingAuth;
    console.log(`🔐 Forwarding Authorization to backend (client=${normalizedClient || "app"})`);
  } else {
    console.log(`⚠️ No Authorization header on incoming request (client=${normalizedClient || "app"})`);
  }

  const axiosConfig = {
    method,
    url: API_URL,
    params: queryParams,
    headers: backendHeaders,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  };

  if (["POST", "PUT", "PATCH"].includes(method)) {
    const contentType = (
      rawHeaders["content-type"] ||
      rawHeaders["Content-Type"] ||
      ""
    ).toLowerCase();

    if (contentType.startsWith("multipart/form-data")) {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body || "", "base64")
        : Buffer.from(event.body || "", "binary");

      axiosConfig.data = rawBody;
      axiosConfig.headers["Content-Type"] =
        rawHeaders["content-type"] || rawHeaders["Content-Type"];
      console.log("📎 Handling multipart/form-data");
    } else if (event.body) {
      try {
        axiosConfig.data = JSON.parse(event.body);
      } catch {
        axiosConfig.data = event.body;
      }
      axiosConfig.headers["Content-Type"] = "application/json";
    }
  }

  try {
    const response = await axios(axiosConfig);
    console.log(`✅ Backend responded: ${response.status}`);
    return createResponse(response.status, response.data, allowedOrigin);
  } catch (error) {
    console.error("❌ Backend request failed:", error.message, error.response?.status);
    return createResponse(
      error.response?.status || 500,
      error.response?.data || {
        message: "Backend request failed",
        error: error.message,
      },
      allowedOrigin
    );
  }
};

// ═══════════════════════════════════════════════════════════════════
// PAYMENT BACKEND PROXY
// ═══════════════════════════════════════════════════════════════════
const proxyToPaymentBackend = async (
  event,
  endpoint,
  queryParams,
  rawHeaders,
  allowedOrigin
) => {
  const PAYMENT_API_BASE_URL = process.env.PAYMENT_API_BASE_URL;

  if (!PAYMENT_API_BASE_URL) {
    return createResponse(
      500,
      { message: "Server configuration error" },
      allowedOrigin
    );
  }

  const API_URL = `${PAYMENT_API_BASE_URL}${endpoint}`;
  const method = event.httpMethod;

  console.log(`📨 Proxying ${method} → PAYMENT: ${API_URL}`);

  const axiosConfig = {
    method,
    url: API_URL,
    params: queryParams,
    headers: { Accept: "application/json" },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  };

  if (["POST", "PUT", "PATCH"].includes(method)) {
    const contentType = (
      rawHeaders["content-type"] ||
      rawHeaders["Content-Type"] ||
      ""
    ).toLowerCase();

    if (contentType.startsWith("multipart/form-data")) {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body || "", "base64")
        : Buffer.from(event.body || "", "binary");

      axiosConfig.data = rawBody;
      axiosConfig.headers["Content-Type"] =
        rawHeaders["content-type"] || rawHeaders["Content-Type"];
    } else if (event.body) {
      try {
        axiosConfig.data = JSON.parse(event.body);
      } catch {
        axiosConfig.data = event.body;
      }
      axiosConfig.headers["Content-Type"] = "application/json";
    }
  }

  try {
    const response = await axios(axiosConfig);
    console.log(`✅ Payment responded: ${response.status}`);
    return createResponse(response.status, response.data, allowedOrigin);
  } catch (error) {
    console.error("❌ Payment request failed:", error.message);
    return createResponse(
      error.response?.status || 500,
      error.response?.data || {
        message: "Payment request failed",
        error: error.message,
      },
      allowedOrigin
    );
  }
};

// ═══════════════════════════════════════════════════════════════════
// TOKEN REFRESH ENDPOINT MAP
// ═══════════════════════════════════════════════════════════════════
const TOKEN_REFRESH_ENDPOINTS = {
  "/Users/CustomerRefreshToken": "customer",
  "/Users/UserRefreshToken": "user",
};

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════
export const handler = async (event) => {
  cleanupRateLimitMap();
  cleanupValidatedCodes();
  cleanupPaymentVerificationStore();

  const CUSTOM_HEADER_NAME = process.env.CUSTOM_HEADER_NAME || "Identifier";
  const CUSTOM_HEADER_VALUE = process.env.CUSTOM_HEADER_VALUE || "Franko";
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
  const API_KEY_NAME = process.env.API_KEY_NAME || "X-Api-Key";

  console.log(`📥 Incoming ${event.httpMethod} request`);

  // CORS Preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": `Content-Type, ${API_KEY_NAME}, Authorization, ${CUSTOM_HEADER_NAME}`,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  const rawHeaders = event.headers || {};
  const headersLower = Object.fromEntries(
    Object.entries(rawHeaders).map(([k, v]) => [k.toLowerCase(), v])
  );

  const {
    endpoint,
    target,
    client,
    ...otherQueryParams
  } = event.queryStringParameters || {};

  if (!endpoint) {
    return createResponse(
      400,
      { message: "Missing 'endpoint' query parameter" },
      ALLOWED_ORIGIN
    );
  }

  console.log(`🎯 Endpoint: ${endpoint}`);

  // 1. ACCESS CODE VERIFICATION
  if (endpoint === "/Auth/Verify-Access-Code") {
    return await handleAccessCodeVerification(
      event,
      headersLower,
      ALLOWED_ORIGIN
    );
  }

  // 2. TOKEN REFRESH (Lambda-handled, no custom header required)
  if (TOKEN_REFRESH_ENDPOINTS[endpoint]) {
    return await handleTokenRefresh(
      event,
      headersLower,
      ALLOWED_ORIGIN,
      TOKEN_REFRESH_ENDPOINTS[endpoint]
    );
  }

  // 3. SECURITY HEADER VALIDATION for all other requests
  const incomingCustomHeader =
    headersLower[CUSTOM_HEADER_NAME.toLowerCase()];
  if (incomingCustomHeader !== CUSTOM_HEADER_VALUE) {
    console.warn(`⚠️ Unauthorized: Invalid/missing custom header`);
    return createResponse(
      401,
      { message: "Unauthorized: Invalid security header" },
      ALLOWED_ORIGIN
    );
  }

  console.log("✅ Security header validated");

  // 4. PAYMENT CODE GENERATION (Step 3: Lambda generates 6-digit code)
  if (
    endpoint === "/Payment/Generate-Verification-Code" ||
    endpoint === "/PaymentPrompt/GeneratePaymentCode" ||
    endpoint === "/Payment/GeneratePaymentCode"
  ) {
    return await handleGeneratePaymentCode(
      event,
      headersLower,
      ALLOWED_ORIGIN
    );
  }

  // 5. PAYMENT CODE VERIFICATION & TRANSFLOW INITIATION (Steps 5, 6, 7)
  if (
    endpoint === "/Payment/Verify-Payment-Code" ||
    endpoint === "/PaymentPrompt/VerifyPaymentCode" ||
    endpoint === "/Payment/VerifyPaymentCode"
  ) {
    return await handleVerifyPaymentCode(
      event,
      headersLower,
      ALLOWED_ORIGIN,
      otherQueryParams
    );
  }

  // 6. TRANSACTION RESULT VERIFICATION (Step 9: Lambda verifies transaction result)
  if (
    endpoint === "/Payment/Verify-Transaction-Status" ||
    endpoint === "/PaymentPrompt/VerifyTransactionResult" ||
    endpoint === "/Payment/VerifyTransactionResult"
  ) {
    return await handleVerifyTransactionResult(
      event,
      headersLower,
      ALLOWED_ORIGIN,
      otherQueryParams
    );
  }

  // 7. ROUTE TO APPROPRIATE BACKEND PROXY
  const targetService = (target || "").toLowerCase();

  if (targetService === "payment") {
    return await proxyToPaymentBackend(
      event,
      endpoint,
      otherQueryParams,
      rawHeaders,
      ALLOWED_ORIGIN
    );
  }

  return await proxyToBackend(
    event,
    endpoint,
    otherQueryParams,
    rawHeaders,
    ALLOWED_ORIGIN,
    client
  );
};
