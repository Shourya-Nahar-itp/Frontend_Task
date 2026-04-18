import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { StateMachine, ORDER_STATES } from '../services/stateMachine';
import { cartValidator } from '../services/cartValidator';
import { checkoutToken } from '../services/checkoutToken';
import { orderAPI, catalogSnapshotAPI } from '../services/api';
import { storageService } from '../services/storageService';
import { auditLog } from '../services/auditLog';
import { generateOrderId } from '../utils/helpers';

// Create state machine instance
const stateMachine = new StateMachine();
const SUBMISSION_DELAY_MS = 2500;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Async thunks
export const validateCheckout = createAsyncThunk(
  'checkout/validateCheckout',
  async (
    { cart },
    { rejectWithValue }
  ) => {
    try {
      auditLog('CHECKOUT_VALIDATION_START', { itemCount: cart.length });

      // Detect same-tab localStorage tampering where Redux state can be stale.
      const persistedCart = storageService.getCart();
      const stateVsStorageDiff = findCartStateStorageDiff(cart, persistedCart);
      if (stateVsStorageDiff.length > 0) {
        const validation = {
          valid: false,
          reason: 'Cart state mismatch detected (possible localStorage tampering)',
          differences: stateVsStorageDiff,
        };
        auditLog('CART_STATE_STORAGE_MISMATCH', validation);
        return rejectWithValue(validation);
      }

      // Validate cart is not empty
      let validation = cartValidator.validateCartNotEmpty(cart);
      if (!validation.valid) {
        auditLog('CHECKOUT_VALIDATION_FAILED', validation);
        return rejectWithValue(validation);
      }

      // Validate cart items
      validation = cartValidator.validateCartItems(cart);
      if (!validation.valid) {
        auditLog('CHECKOUT_VALIDATION_FAILED', validation);
        return rejectWithValue(validation);
      }

      // Check for tampering against the stored baseline snapshot
      validation = cartValidator.verifyPriceIntegrity(cart);
      if (!validation.valid) {
        auditLog('TAMPERING_DETECTED_AT_CHECKOUT', validation);
        return rejectWithValue(validation);
      }

      // Compare stale cart metadata with a fresh catalog snapshot.
      const freshSnapshot = await catalogSnapshotAPI.getFreshSnapshotForCart(cart);
      validation = cartValidator.verifyFreshCatalogConsistency(cart, freshSnapshot);
      if (!validation.valid) {
        auditLog('STALE_CART_DETECTED_AT_CHECKOUT', validation);
        return rejectWithValue(validation);
      }

      auditLog('CHECKOUT_VALIDATION_SUCCESS', { itemCount: cart.length });

      return {
        validatedAt: new Date().toISOString(),
        itemCount: cart.length,
        freshSnapshotCheckedAt: new Date().toISOString(),
      };
    } catch (error) {
      return rejectWithValue({
        valid: false,
        reason: error.message,
      });
    }
  }
);

export const submitOrder = createAsyncThunk(
  'checkout/submitOrder',
  async (
    { cart, checkoutTokenId, orderId, forceFailure = false, forceInconsistent = false },
    { rejectWithValue }
  ) => {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        auditLog('ORDER_SUBMISSION_BLOCKED_OFFLINE', { orderId, itemCount: cart.length });
        return rejectWithValue({
          reason: 'You are offline. Connect to the internet to place the order.',
          code: 'OFFLINE_ORDER_BLOCKED',
        });
      }

      if (forceInconsistent) {
        auditLog('ORDER_SUBMISSION_SIMULATED_INCONSISTENCY', { orderId, itemCount: cart.length });
        return rejectWithValue({
          reason: 'Simulated order inconsistency for testing retry and rollback flow',
          code: 'SIMULATED_INCONSISTENCY',
          inconsistent: true,
        });
      }

      if (forceFailure) {
        auditLog('ORDER_SUBMISSION_SIMULATED_FAILURE', { orderId, itemCount: cart.length });
        return rejectWithValue({
          reason: 'Simulated order failure for testing retry and rollback flow',
          code: 'SIMULATED_FAILURE',
        });
      }

      // Verify token.
      let tokenToUse = checkoutTokenId;
      let tokenValidation = checkoutToken.isTokenValid(tokenToUse);

      if (!tokenValidation.valid) {
        const isRecoverable =
          tokenValidation.reason === 'Token not found' ||
          tokenValidation.reason === 'Token expired' ||
          !tokenToUse;

        if (isRecoverable) {
          tokenToUse = checkoutToken.generateToken();
          tokenValidation = checkoutToken.isTokenValid(tokenToUse);
          auditLog('TOKEN_AUTO_REFRESHED', {
            previousToken: checkoutTokenId || null,
            refreshedToken: tokenToUse,
            reason: tokenValidation.reason || 'Recovered from stale token',
          });
        }
      }

      if (!tokenValidation.valid) {
        auditLog('TOKEN_VALIDATION_FAILED', tokenValidation);
        return rejectWithValue(tokenValidation);
      }

      auditLog('ORDER_SUBMISSION_START', { orderId, itemCount: cart.length });

      await delay(SUBMISSION_DELAY_MS);

      const subtotal = cart.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
        0
      );
      const shipping = subtotal >= 100 ? 0 : 9.99;
      const tax = subtotal * 0.08;
      const grandTotal = subtotal + shipping + tax;

      // Prepare order data
      const orderData = {
        id: orderId,
        items: cart,
        subtotal,
        shipping,
        tax,
        total: grandTotal,
        grandTotal,
        submittedAt: new Date().toISOString(),
      };

      // Submit to API
      const response = await orderAPI.submitOrder(orderData);

      if (!response || !response.id) {
        auditLog('ORDER_API_RESPONSE_INVALID', { response });
        return rejectWithValue({
          reason: 'Invalid or partial API response received from order service',
          code: 'INVALID_API_RESPONSE',
        });
      }

      // Mark token as used
      checkoutToken.useToken(tokenToUse, { orderId, status: 'submitted' });

      // Persistence mismatch protection: API accepted order but local persistence failed.
      const persisted = storageService.addOrderToHistory({
        orderId,
        apiOrderId: response.id,
        status: 'submitted',
        tokenUsed: tokenToUse,
        timestamp: new Date().toISOString(),
        items: cart,
        subtotal,
        shipping,
        tax,
        total: grandTotal,
        grandTotal,
        submittedAt: new Date().toISOString(),
      });

     

      auditLog('ORDER_SUBMITTED', { orderId, apiResponse: response.id });

      return {
        orderId,
        apiOrderId: response.id,
        status: 'submitted',
        tokenUsed: tokenToUse,
        timestamp: new Date().toISOString(),
        items: cart,
        subtotal,
        shipping,
        tax,
        total: grandTotal,
        grandTotal,
        submittedAt: new Date().toISOString(),
      };
    } catch (error) {
      auditLog('ORDER_SUBMISSION_FAILED', { error: error.message });
      return rejectWithValue({
        reason: error.message,
      });
    }
  }
);

const initialState = {
  currentState: ORDER_STATES.CART_READY,
  stateHistory: [],
  orderId: null,
  checkoutToken: null,
  validationResult: null,
  loading: false,
  error: null,
  submitting: false,
  retryCount: 0,
  maxRetries: 3,
  lastCheckoutAttempt: null,
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    // Initialize checkout
    initializeCheckout: (state) => {
      state.checkoutToken = checkoutToken.generateToken();
      state.orderId = generateOrderId();
      state.currentState = ORDER_STATES.CART_READY;
      state.stateHistory = [];
      state.error = null;
      state.validationResult = null;
      state.loading = false;
      state.submitting = false;
      state.retryCount = 0;
      auditLog('CHECKOUT_INITIALIZED', { orderId: state.orderId });
      persistCheckoutState(state);
    },

    // Restore checkout from persisted local storage during refresh
    restoreCheckoutState: (state, action) => {
      const persisted = action.payload;

      if (!persisted || !persisted.currentState) {
        return;
      }

      state.currentState = persisted.currentState;
      state.stateHistory = Array.isArray(persisted.stateHistory) ? persisted.stateHistory : [];
      state.orderId = persisted.orderId || generateOrderId();
      state.checkoutToken = persisted.checkoutToken || null;
      state.validationResult = persisted.validationResult || null;
      state.loading = false;
      state.error = persisted.error || null;
      state.submitting = false;
      state.retryCount = Number(persisted.retryCount) || 0;
      state.lastCheckoutAttempt = persisted.lastCheckoutAttempt || null;

      auditLog('CHECKOUT_RESTORED_FROM_STORAGE', {
        orderId: state.orderId,
        restoredState: state.currentState,
      });
    },

    // Transition to next state
    transitionState: (state, action) => {
      const { toState, reason } = action.payload;

      try {
        const transition = stateMachine.transition(toState, reason);
        state.currentState = toState;
        state.stateHistory.push(transition);
        storageService.saveOrderState(state);
        auditLog('STATE_TRANSITION', {
          from: transition.from,
          to: transition.to,
          reason,
        });
        persistCheckoutState(state);
      } catch (error) {
        state.error = {
          type: 'INVALID_TRANSITION',
          message: error.message,
        };
        auditLog('INVALID_STATE_TRANSITION', {
          attempted: toState,
          current: state.currentState,
          error: error.message,
        });
      }
    },

    // Handle validation result
    setValidationResult: (state, action) => {
      state.validationResult = action.payload;
      persistCheckoutState(state);
    },

    // Handle order inconsistency
    markOrderInconsistent: (state, action) => {
      state.currentState = ORDER_STATES.ORDER_INCONSISTENT;
      state.error = action.payload;
      auditLog('ORDER_MARKED_INCONSISTENT', action.payload);
      persistCheckoutState(state);
    },

    // Rollback order
    rollbackOrder: (state, action) => {
      state.currentState = ORDER_STATES.ROLLED_BACK;
      state.stateHistory.push({
        from: ORDER_STATES.ORDER_FAILED,
        to: ORDER_STATES.ROLLED_BACK,
        timestamp: new Date().toISOString(),
        reason: 'User initiated rollback',
      });
      auditLog('ORDER_ROLLED_BACK', { orderId: state.orderId });
      persistCheckoutState(state);
    },

    rollbackToCartReady: (state, action) => {
      const fromState = state.currentState;

      state.stateHistory.push({
        from: fromState,
        to: ORDER_STATES.ROLLED_BACK,
        timestamp: new Date().toISOString(),
        reason: 'User selected rollback',
      });

      state.currentState = ORDER_STATES.CART_READY;
      state.stateHistory.push({
        from: ORDER_STATES.ROLLED_BACK,
        to: ORDER_STATES.CART_READY,
        timestamp: new Date().toISOString(),
        reason: 'Rollback completed, returned to cart ready state',
      });

      state.error = null;
      state.loading = false;
      state.submitting = false;
      auditLog('ROLLBACK_TO_CART_READY', { orderId: state.orderId, fromState });
      persistCheckoutState(state);
    },

    // Reset checkout
    resetCheckout: (state) => {
      state.currentState = ORDER_STATES.CART_READY;
      state.stateHistory = [];
      state.error = null;
      state.validationResult = null;
      state.checkoutToken = null;
      state.orderId = null;
      state.retryCount = 0;
      auditLog('CHECKOUT_RESET');
      persistCheckoutState(state);
    },

    // Increment retry count
    incrementRetryCount: (state) => {
      state.retryCount += 1;
      persistCheckoutState(state);
    },

    // Clear error
    clearCheckoutError: (state) => {
      state.error = null;
      persistCheckoutState(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateCheckout.pending, (state) => {
        state.loading = true;
        state.error = null;
        persistCheckoutState(state);
      })
      .addCase(validateCheckout.fulfilled, (state, action) => {
        state.loading = false;
        state.validationResult = action.payload;
        state.currentState = ORDER_STATES.CHECKOUT_VALIDATED;
        state.stateHistory.push({
          from: ORDER_STATES.CART_READY,
          to: ORDER_STATES.CHECKOUT_VALIDATED,
          timestamp: new Date().toISOString(),
          reason: 'Validation successful',
        });
        persistCheckoutState(state);
      })
      .addCase(validateCheckout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        persistCheckoutState(state);
      })
      .addCase(submitOrder.pending, (state) => {
        const fromState = state.currentState;
        state.currentState = ORDER_STATES.ORDER_SUBMITTED;
        state.stateHistory.push({
          from: fromState,
          to: ORDER_STATES.ORDER_SUBMITTED,
          timestamp: new Date().toISOString(),
          reason: 'Order submission started',
        });
        state.submitting = true;
        state.loading = true;
        state.error = null;
        state.lastCheckoutAttempt = new Date().toISOString();
        persistCheckoutState(state);
      })
      .addCase(submitOrder.fulfilled, (state, action) => {
        state.submitting = false;
        state.loading = false;
        state.currentState = ORDER_STATES.ORDER_SUCCESS;
        state.retryCount = 0;
        state.stateHistory.push({
          from: ORDER_STATES.ORDER_SUBMITTED,
          to: ORDER_STATES.ORDER_SUCCESS,
          timestamp: new Date().toISOString(),
          reason: 'Order successfully submitted',
        });
        state.orderId = action.payload.orderId;
        persistCheckoutState(state);
      })
      .addCase(submitOrder.rejected, (state, action) => {
        state.submitting = false;
        state.loading = false;
        state.retryCount = Number(state.retryCount) + 1;
        const inconsistent = Boolean(action.payload?.inconsistent);
        state.currentState = inconsistent
          ? ORDER_STATES.ORDER_INCONSISTENT
          : ORDER_STATES.ORDER_FAILED;
        state.error = action.payload;
        state.stateHistory.push({
          from: ORDER_STATES.ORDER_SUBMITTED,
          to: state.currentState,
          timestamp: new Date().toISOString(),
          reason: action.payload?.reason || 'Order submission failed',
        });
        auditLog('ORDER_SUBMISSION_FAILED', action.payload);

        if (state.retryCount >= state.maxRetries) {
          state.stateHistory.push({
            from: state.currentState,
            to: ORDER_STATES.CART_READY,
            timestamp: new Date().toISOString(),
            reason: 'Retry limit reached, auto rollback to cart',
          });
          state.currentState = ORDER_STATES.CART_READY;
          state.error = {
            reason: 'Retry limit reached. Returning to cart.',
          };
          state.retryCount = 0;
          state.loading = false;
          state.submitting = false;
        }

        persistCheckoutState(state);
      });
  },
});

export const {
  initializeCheckout,
  restoreCheckoutState,
  transitionState,
  setValidationResult,
  markOrderInconsistent,
  rollbackOrder,
  rollbackToCartReady,
  resetCheckout,
  incrementRetryCount,
  clearCheckoutError,
} = checkoutSlice.actions;

// Selectors
export const selectCheckoutState = (state) => state.checkout.currentState;
export const selectCheckoutError = (state) => state.checkout.error;
export const selectOrderId = (state) => state.checkout.orderId;
export const selectCheckoutToken = (state) => state.checkout.checkoutToken;
export const selectValidationResult = (state) => state.checkout.validationResult;
export const selectCheckoutLoading = (state) => state.checkout.loading;
export const selectCheckoutSubmitting = (state) => state.checkout.submitting;
export const selectRetryCount = (state) => state.checkout.retryCount;
export const selectStateHistory = (state) => state.checkout.stateHistory;
export const selectMaxRetries = (state) => state.checkout.maxRetries;

export default checkoutSlice.reducer;

function findCartStateStorageDiff(stateCart, storageCart) {
  const diffs = [];

  const normalizedState = new Map(
    (stateCart || []).map((item) => [String(item.id), item])
  );
  const normalizedStorage = new Map(
    (storageCart || []).map((item) => [String(item.id), item])
  );

  normalizedState.forEach((stateItem, id) => {
    const storageItem = normalizedStorage.get(id);
    if (!storageItem) {
      diffs.push({ id, reason: 'missing_in_storage' });
      return;
    }

    if ((Number(stateItem.price) || 0) !== (Number(storageItem.price) || 0)) {
      diffs.push({
        id,
        reason: 'price_mismatch',
        statePrice: Number(stateItem.price) || 0,
        storagePrice: Number(storageItem.price) || 0,
      });
    }

    if ((Number(stateItem.quantity) || 0) !== (Number(storageItem.quantity) || 0)) {
      diffs.push({
        id,
        reason: 'quantity_mismatch',
        stateQuantity: Number(stateItem.quantity) || 0,
        storageQuantity: Number(storageItem.quantity) || 0,
      });
    }

    const stateBaseline = Number(stateItem.baselineSnapshot?.baselinePrice);
    const storageBaseline = Number(storageItem.baselineSnapshot?.baselinePrice);
    if (Number.isFinite(stateBaseline) && Number.isFinite(storageBaseline) && stateBaseline !== storageBaseline) {
      diffs.push({
        id,
        reason: 'baseline_mismatch',
        stateBaseline,
        storageBaseline,
      });
    }
  });

  normalizedStorage.forEach((_, id) => {
    if (!normalizedState.has(id)) {
      diffs.push({ id, reason: 'missing_in_state' });
    }
  });

  return diffs;
}

function persistCheckoutState(state) {
  storageService.saveOrderState({
    currentState: state.currentState,
    stateHistory: state.stateHistory,
    orderId: state.orderId,
    checkoutToken: state.checkoutToken,
    validationResult: state.validationResult,
    error: state.error,
    retryCount: state.retryCount,
    lastCheckoutAttempt: state.lastCheckoutAttempt,
  });
}
