// src/Redux/Slice/paymentSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "./AxiosInstance";

const PSP = "fte";
const COMPANY_CODE = "fte";
const LAMBDA_TARGET = "payment";

// Helper: map error
const toErrorPayload = (error, fallback) => {
  const server =
    error.response?.data?.message ??
    error.response?.data?.responseMessage ??
    (typeof error.response?.data === "string"
      ? error.response.data
      : null);
  return server || error.message || fallback;
};

// ==================== ASYNC THUNKS ====================

// 1️⃣ Generate Payment Code (Lambda generates 6-digit random code)
export const generatePaymentCode = createAsyncThunk(
  "payment/generatePaymentCode",
  async ({ refNo, msisdn, amount, network, narration }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "",
        { refNo, msisdn, amount, network, narration },
        {
          params: {
            endpoint: "/Payment/Generate-Verification-Code",
            target: LAMBDA_TARGET,
            PSP,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to generate payment verification code")
      );
    }
  }
);

// 2️⃣ Verify Payment Code & Initiate Transflow Payment
export const verifyPaymentCodeAndInitiateDebit = createAsyncThunk(
  "payment/verifyPaymentCodeAndInitiateDebit",
  async (
    { refNo, code, msisdn, amount, network, narration },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(
        "",
        { refNo, code, msisdn, amount, network, narration },
        {
          params: {
            endpoint: "/Payment/Verify-Payment-Code",
            target: LAMBDA_TARGET,
            PSP,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Payment code verification failed")
      );
    }
  }
);

// 3️⃣ Verify Transaction Result (Lambda queries Transflow & verifies confirmation)
export const verifyTransactionResult = createAsyncThunk(
  "payment/verifyTransactionResult",
  async ({ refNo }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "",
        { refNo },
        {
          params: {
            endpoint: "/Payment/Verify-Transaction-Status",
            target: LAMBDA_TARGET,
            PSP,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to verify transaction status")
      );
    }
  }
);

// 4️⃣ Debit Customer (Original proxy thunk preserved for full compatibility)
export const debitCustomer = createAsyncThunk(
  "payment/debitCustomer",
  async ({ refNo, msisdn, amount, network, narration }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "",
        { refNo, msisdn, amount, network, narration },
        {
          params: {
            endpoint: "/PaymentPrompt/DebitCustomer",
            target: LAMBDA_TARGET,
            PSP,
          },
        }
      );

      // Return raw gateway response: { responseCode, responseMessage, ... }
      return response.data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Payment request failed"));
    }
  }
);

// 5️⃣ Validate Account
export const validateAccount = createAsyncThunk(
  "payment/validateAccount",
  async ({ msisdn, network }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "",
        { msisdn, network },
        {
          params: {
            endpoint: "/PaymentPrompt/ValidateAccount",
            target: LAMBDA_TARGET,
            PSP,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to validate account"));
    }
  }
);

// 6️⃣ Check Transaction Status (Original proxy thunk preserved)
export const checkTransactionStatus = createAsyncThunk(
  "payment/checkTransactionStatus",
  async ({ refNo }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "",
        { refNo },
        {
          params: {
            endpoint: "/PaymentPrompt/CheckTransactionStatus",
            target: LAMBDA_TARGET,
            PSP,
          },
        }
      );
      return response.data; // raw gateway response
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to check transaction status"));
    }
  }
);

// 7️⃣ Debit by Customer Network Provider ID
export const debitByCustomerNetworkProviderId = createAsyncThunk(
  "payment/debitByCustomerNetworkProviderId",
  async (
    { transactionNumber, contactNumber, customerNetworkProviderId, amount },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosInstance.post(
        "",
        {
          transactionNumber,
          contactNumber,
          customerNetworkProviderId,
          amountPaid: amount,
        },
        {
          params: {
            endpoint: "/PaymentPrompt/DebitbyCustomerNetworkProviderId",
            target: LAMBDA_TARGET,
            PSP,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to debit by customer network provider")
      );
    }
  }
);

// 8️⃣ Get Account Hold Name
export const getAccountHoldName = createAsyncThunk(
  "payment/getAccountHoldName",
  async ({ msisdn, network }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "",
        { msisdn, network },
        {
          params: {
            endpoint: "/PaymentPrompt/AccountHoldName",
            target: LAMBDA_TARGET,
            PSP,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to get account hold name"));
    }
  }
);

// 9️⃣ Get PSP Transactions By Company
export const getPSPTransactionsByCompany = createAsyncThunk(
  "payment/getPSPTransactionsByCompany",
  async ({ from, to }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("", {
        params: {
          endpoint: "/PSP/GetPSPTransactionsByCompany",
          target: LAMBDA_TARGET,
          from,
          to,
          CompanyCode: COMPANY_CODE,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to fetch PSP transactions report")
      );
    }
  }
);

// ==================== SLICE ====================
const initialState = {
  debitCustomerData: null,
  validateAccountData: null,
  transactionStatus: null,
  debitNetworkData: null,
  accountHoldName: null,
  pspTransactionsReport: null,
  verificationCodeData: null,
  verifiedPaymentData: null,
  verifiedTransactionStatus: null,

  loading: false,
  validating: false,
  checkingStatus: false,
  generatingCode: false,
  verifyingCode: false,
  error: null,
};

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    resetPaymentState: (state) => {
      state.debitCustomerData = null;
      state.validateAccountData = null;
      state.transactionStatus = null;
      state.debitNetworkData = null;
      state.accountHoldName = null;
      state.pspTransactionsReport = null;
      state.verificationCodeData = null;
      state.verifiedPaymentData = null;
      state.verifiedTransactionStatus = null;

      state.loading = false;
      state.validating = false;
      state.checkingStatus = false;
      state.generatingCode = false;
      state.verifyingCode = false;
      state.error = null;
    },
    resetPSPTransactionsReport: (state) => {
      state.pspTransactionsReport = null;
      state.error = null;
    },
    resetValidateAccountData: (state) => {
      state.validateAccountData = null;
      state.validating = false;
    },
    resetTransactionStatus: (state) => {
      state.transactionStatus = null;
      state.checkingStatus = false;
    },
    resetVerificationCodeData: (state) => {
      state.verificationCodeData = null;
      state.generatingCode = false;
      state.verifyingCode = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate Payment Code
      .addCase(generatePaymentCode.pending, (state) => {
        state.generatingCode = true;
        state.error = null;
      })
      .addCase(generatePaymentCode.fulfilled, (state, action) => {
        state.generatingCode = false;
        state.verificationCodeData = action.payload;
      })
      .addCase(generatePaymentCode.rejected, (state, action) => {
        state.generatingCode = false;
        state.error = action.payload || action.error?.message;
      })

      // Verify Payment Code & Initiate Debit
      .addCase(verifyPaymentCodeAndInitiateDebit.pending, (state) => {
        state.verifyingCode = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyPaymentCodeAndInitiateDebit.fulfilled, (state, action) => {
        state.verifyingCode = false;
        state.loading = false;
        state.verifiedPaymentData = action.payload;
        state.debitCustomerData = action.payload?.data || action.payload;
      })
      .addCase(verifyPaymentCodeAndInitiateDebit.rejected, (state, action) => {
        state.verifyingCode = false;
        state.loading = false;
        state.error = action.payload || action.error?.message || "Payment verification failed";
      })

      // Verify Transaction Result
      .addCase(verifyTransactionResult.pending, (state) => {
        state.checkingStatus = true;
        state.error = null;
      })
      .addCase(verifyTransactionResult.fulfilled, (state, action) => {
        state.checkingStatus = false;
        state.verifiedTransactionStatus = action.payload;
        state.transactionStatus = action.payload?.data || action.payload;
      })
      .addCase(verifyTransactionResult.rejected, (state, action) => {
        state.checkingStatus = false;
        state.error = action.payload || action.error?.message;
      })

      // Debit Customer
      .addCase(debitCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(debitCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.debitCustomerData = action.payload;
      })
      .addCase(debitCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || "Payment failed";
      })

      // Validate Account
      .addCase(validateAccount.pending, (state) => {
        state.validating = true;
        state.error = null;
      })
      .addCase(validateAccount.fulfilled, (state, action) => {
        state.validating = false;
        state.validateAccountData = action.payload;
      })
      .addCase(validateAccount.rejected, (state, action) => {
        state.validating = false;
        state.error = action.payload || action.error?.message;
      })

      // Check Transaction Status
      .addCase(checkTransactionStatus.pending, (state) => {
        state.checkingStatus = true;
        state.error = null;
      })
      .addCase(checkTransactionStatus.fulfilled, (state, action) => {
        state.checkingStatus = false;
        state.transactionStatus = action.payload;
      })
      .addCase(checkTransactionStatus.rejected, (state, action) => {
        state.checkingStatus = false;
        state.error = action.payload || action.error?.message;
      })

      // Debit by Customer Network Provider ID
      .addCase(debitByCustomerNetworkProviderId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(debitByCustomerNetworkProviderId.fulfilled, (state, action) => {
        state.loading = false;
        state.debitNetworkData = action.payload;
      })
      .addCase(debitByCustomerNetworkProviderId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      })

      // Account Hold Name
      .addCase(getAccountHoldName.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAccountHoldName.fulfilled, (state, action) => {
        state.loading = false;
        state.accountHoldName = action.payload;
      })
      .addCase(getAccountHoldName.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      })

      // Get PSP Transactions By Company
      .addCase(getPSPTransactionsByCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPSPTransactionsByCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.pspTransactionsReport = action.payload;
      })
      .addCase(getPSPTransactionsByCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      });
  },
});

export const {
  resetPaymentState,
  resetPSPTransactionsReport,
  resetValidateAccountData,
  resetTransactionStatus,
  resetVerificationCodeData,
} = paymentSlice.actions;

export default paymentSlice.reducer;
