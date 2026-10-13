# Franko AWS Lambda API Gateway with MoMo Payment Verification

This AWS Lambda function provides secure routing, authentication, and an end-to-end Mobile Money (MoMo) payment verification flow integrated with the **Transflow** payment gateway for Franko Trading.

---

## 1. Complete MoMo Payment Verification Workflow

The implementation adheres to the 10-step payment verification protocol:

1. **Customer selects MoMo and enters phone number:**
   - In Franko Checkout (`CheckoutShared.jsx`), the customer selects Mobile Money / Telecel Cash, chooses network provider (MTN MoMo, Vodafone Cash, AirtelTigo), enters their phone number, and clicks "Pay".
2. **Franko sends request to AWS Lambda:**
   - Franko dispatches `generatePaymentCode` to AWS Lambda: `POST /?endpoint=/Payment/Generate-Verification-Code` with `{ refNo, msisdn, amount, network, narration }`.
3. **Lambda generates a random 6-digit code:**
   - Lambda uses `crypto.randomInt(100000, 1000000)` to generate a cryptographically secure 6-digit code.
   - It stores the code with an expiration timestamp (10 minutes) and rate limit tracker.
   - It returns the verification code and session metadata.
4. **The app displays a modal: “Verify Your Payment”:**
   - The app transitions to the `verify` stage and displays the modal **“Verify Your Payment”**.
   - The modal asks the customer to enter the 6-digit code, provides the code preview with one-tap Auto-fill, and includes a countdown and error handler.
5. **Customer enters the code and taps Verify:**
   - Customer enters the 6-digit code and clicks the "Verify" button.
6. **Lambda checks whether the entered code matches and has not expired:**
   - Franko posts to `/?endpoint=/Payment/Verify-Payment-Code` with `{ refNo, code, msisdn, amount, network, narration }`.
   - Lambda verifies:
     - The transaction reference exists.
     - The code has not expired (`Date.now() <= record.expiresAt`).
     - Max attempts (5) have not been exceeded.
     - The entered code strictly matches the generated code.
7. **If correct, Lambda initiates payment through Transflow:**
   - Lambda connects to Transflow (`${PAYMENT_API_BASE_URL}/PaymentPrompt/DebitCustomer?PSP=${PSP}`).
   - Lambda posts the debit payload and receives the Transflow initiation response.
8. **Customer receives actual MoMo prompt and approves with PIN:**
   - Franko transitions to the `pending` approval screen.
   - Customer receives the USSD payment authorization prompt on their mobile handset and authorizes the charge with their MoMo PIN.
9. **Lambda verifies transaction result:**
   - Franko polls Lambda (`/?endpoint=/Payment/Verify-Transaction-Status`).
   - Lambda checks the status directly with Transflow (`${PAYMENT_API_BASE_URL}/PaymentPrompt/CheckTransactionStatus?PSP=${PSP}`).
   - Lambda evaluates the outcome (`success`, `pending`, or `failed`) and returns the verified status.
10. **Franko marks the order as paid only after payment is confirmed:**
    - Only upon receiving verified `success` does Franko create the order in the database via `checkOutOrder` and `updateOrderDelivery`.
    - The customer is redirected to `/order-success/:orderId` with `paymentConfirmed: true`.
    - If payment is declined or cancelled, Franko safely routes to `/order-cancelled`.

---

## 2. API Endpoints

### `POST /?endpoint=/Payment/Generate-Verification-Code`
- **Headers:** `Identifier: Franko`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "refNo": "ORD-1234-567",
    "msisdn": "233241234567",
    "amount": 150.00,
    "network": "MTN",
    "narration": "Franko Order Payment"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Verification code generated successfully",
    "refNo": "ORD-1234-567",
    "code": "847291",
    "verificationCode": "847291",
    "expiresAt": 1728825600000,
    "expiresInSeconds": 600
  }
  ```

### `POST /?endpoint=/Payment/Verify-Payment-Code`
- **Headers:** `Identifier: Franko`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "refNo": "ORD-1234-567",
    "code": "847291",
    "msisdn": "233241234567",
    "amount": 150.00,
    "network": "MTN",
    "narration": "Franko Order Payment"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "verified": true,
    "message": "Verification code confirmed and payment initiated through Transflow",
    "refNo": "ORD-1234-567",
    "data": {
      "responseCode": "01",
      "responseMessage": "Successfully Processed Transaction"
    },
    "responseCode": "01",
    "responseMessage": "Successfully Processed Transaction"
  }
  ```

### `POST /?endpoint=/Payment/Verify-Transaction-Status`
- **Headers:** `Identifier: Franko`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "refNo": "ORD-1234-567"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "refNo": "ORD-1234-567",
    "status": "success",
    "verified": true,
    "isConfirmed": true,
    "data": {
      "responseCode": "01",
      "responseMessage": "Successfully Processed Transaction"
    }
  }
  ```

---

## 3. Environment Variables

| Variable | Description | Default |
|---|---|---|
| `CUSTOM_HEADER_NAME` | Security identifier header | `Identifier` |
| `CUSTOM_HEADER_VALUE` | Security identifier value | `Franko` |
| `ALLOWED_ORIGIN` | CORS allowed origin | `*` |
| `PAYMENT_API_BASE_URL` | Transflow payment gateway base URL | (e.g. `https://transflow.frankotrading.com`) |
| `PSP` | Payment Service Provider code for Transflow | `fte` |
| `SALES_API_KEY` | Backend API key | — |
| `WEBSITE_API_BASE_URL` | Website CMS backend URL | — |
| `APP_API_BASE_URL` | Mobile app backend URL | — |
| `JWT_SECRET` | Secret key for JWT access tokens | — |
| `JWT_REFRESH_SECRET` | Secret key for JWT refresh tokens | — |
| `ACCESS_CODE` | Admin access code | — |

---

## 4. Deployment Instructions

### AWS Lambda Console:
1. Open the AWS Lambda console.
2. Select your Lambda function (e.g., `FrankoAPI`).
3. Under the **Code** tab, select **Upload from** -> **.zip file**.
4. Select `lambda.zip`.
5. Ensure the Runtime is **Node.js 18.x** or **Node.js 20.x** or higher, and the Handler is set to `index.handler`.

### AWS CLI:
```bash
aws lambda update-function-code \
  --function-name FrankoAPI \
  --zip-file fileb://lambda.zip
```
