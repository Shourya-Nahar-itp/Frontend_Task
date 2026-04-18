import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  clearCheckoutError,
  initializeCheckout,
  rollbackToCartReady,
  restoreCheckoutState,
  selectCheckoutError,
  selectCheckoutLoading,
  selectCheckoutState,
  selectMaxRetries,
  selectCheckoutToken,
  selectOrderId,
  selectRetryCount,
  submitOrder,
  validateCheckout,
} from '../features/checkoutSlice';
import { clearCart, initializeCart, selectCartItems } from '../features/cartSlice';
import { useNotification } from '../hooks/useNotification';
import { storageService } from '../services/storageService';
import { ORDER_STATES, ROUTES, NOTIFICATION_TYPES } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';

const CHECKOUT_INITIALIZED_NOTIFICATION_KEY = 'eshop_checkout_initialized_notification';

const CHECKOUT_STAGES = [
  {
    state: ORDER_STATES.CART_READY,
    title: 'Cart ready',
    description: 'Review the cart before validation.',
  },
  {
    state: ORDER_STATES.CHECKOUT_VALIDATED,
    title: 'Validated',
    description: 'Cart integrity and product snapshot checks passed.',
  },
  {
    state: ORDER_STATES.ORDER_SUBMITTED,
    title: 'Submitted',
    description: 'Checkout request is being processed.',
  },
  {
    state: ORDER_STATES.ORDER_SUCCESS,
    title: 'Success',
    description: 'Order was confirmed and stored.',
  },
  {
    state: ORDER_STATES.ORDER_FAILED,
    title: 'Failed',
    description: 'Submission failed and needs a retry.',
  },
  {
    state: ORDER_STATES.ORDER_INCONSISTENT,
    title: 'Inconsistent',
    description: 'Local and remote order data do not match.',
  },
  {
    state: ORDER_STATES.ROLLED_BACK,
    title: 'Rolled back',
    description: 'The checkout attempt was rolled back safely.',
  },
];

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notify } = useNotification();

  const cartItems = useSelector(selectCartItems);
  const checkoutState = useSelector(selectCheckoutState);
  const error = useSelector(selectCheckoutError);
  const checkoutToken = useSelector(selectCheckoutToken);
  const orderId = useSelector(selectOrderId);
  const loading = useSelector(selectCheckoutLoading);
  const retryCount = useSelector(selectRetryCount);
  const maxRetries = useSelector(selectMaxRetries);
  const isFailureState =
    checkoutState === ORDER_STATES.ORDER_FAILED || checkoutState === ORDER_STATES.ORDER_INCONSISTENT;
  const isSuccessState = checkoutState === ORDER_STATES.ORDER_SUCCESS;

  const [cartHydrated, setCartHydrated] = useState(false);
  const [resumePendingSubmission, setResumePendingSubmission] = useState(false);
  const resumeInFlightRef = React.useRef(false);

  // Restore persisted checkout state on mount, or initialize fresh checkout
  useEffect(() => {
    dispatch(initializeCart());

    const persisted = storageService.getOrderState();

    if (persisted) {
      // current state match with persisted state.
      
      dispatch(restoreCheckoutState(persisted));
      if (persisted.currentState === ORDER_STATES.ORDER_SUBMITTED) {
        // Resume in-flight submission if order was being submitted before refresh
        setResumePendingSubmission(true);
        notify(
          'Resuming your in-progress order submission after refresh.',
          NOTIFICATION_TYPES.INFO
        );
      } else {
        notify('Checkout session restored', NOTIFICATION_TYPES.INFO);
      }
    } else {
      dispatch(initializeCheckout());

      const alreadyNotified = sessionStorage.getItem(CHECKOUT_INITIALIZED_NOTIFICATION_KEY);
      if (!alreadyNotified) {
        notify('Checkout session initialized', NOTIFICATION_TYPES.INFO);
        sessionStorage.setItem(CHECKOUT_INITIALIZED_NOTIFICATION_KEY, 'true');
      }
    }

    setCartHydrated(true);
  }, [dispatch, notify]);

  useEffect(() => {
    if (
      cartHydrated &&
      cartItems.length === 0 &&
      checkoutState !== ORDER_STATES.ORDER_SUCCESS &&
      checkoutState !== ORDER_STATES.ORDER_SUBMITTED &&
      !resumePendingSubmission
    ) {
      navigate(ROUTES.CART);
    }
  }, [cartHydrated, cartItems.length, checkoutState, navigate, resumePendingSubmission]);

  useEffect(() => {
    if (!resumePendingSubmission || !cartHydrated || resumeInFlightRef.current) {
      return;
    }

    if (!checkoutToken || !orderId) {
      setResumePendingSubmission(false);
      notify('Unable to resume order safely. Please retry placing the order.', NOTIFICATION_TYPES.ERROR);
      return;
    }

    // Wait for cart rehydration before replaying submission.
    if (cartItems.length === 0) {
      return;
    }

    if (checkoutState !== ORDER_STATES.ORDER_SUBMITTED) {
      setResumePendingSubmission(false);
      return;
    }

    resumeInFlightRef.current = true;

    const resumeSubmission = async () => {
      const resultAction = await dispatch(
        submitOrder({
          cart: cartItems,
          checkoutTokenId: checkoutToken,
          orderId,
        })
      );

      if (submitOrder.fulfilled.match(resultAction)) {
        dispatch(clearCart());
        notify('Order process was resumed and placed successfully', NOTIFICATION_TYPES.SUCCESS);
      } else {
        const reason = resultAction.payload?.reason || 'Order resume failed';
        notify(reason, NOTIFICATION_TYPES.ERROR);
      }

      setResumePendingSubmission(false);
      resumeInFlightRef.current = false;
    };

    resumeSubmission();
  }, [
    resumePendingSubmission,
    cartHydrated,
    checkoutToken,
    orderId,
    cartItems,
    dispatch,
    notify,
  ]);

  const handleValidateCheckout = async () => {
    const resultAction = await dispatch(
      validateCheckout({
        cart: cartItems,
      })
    );

    //redux toolkit createAsyncThunk generates pending, fulfilled and rejected action types 
    // automatically based on the base action type you provide.
    //   The .match method is a type guard that checks if the dispatched action matches the specified action type, 
    // allowing you to handle the result accordingly.
    if (validateCheckout.fulfilled.match(resultAction)) {
      notify('Checkout validation passed', NOTIFICATION_TYPES.SUCCESS);
      return;
    }

    const reason = resultAction.payload?.reason || '';

    if (reason.includes('Price mismatch detected against trusted baseline snapshot')) {
      notify('Cart tampering detected. Please review your cart and try again.', NOTIFICATION_TYPES.ERROR);
    } else if (reason.includes('Cart no longer matches refreshed product snapshot')) {
      notify('Cart conflict detected. Product data changed, please refresh cart before validating again.', NOTIFICATION_TYPES.WARNING);
    } else {
      notify(reason || 'Checkout validation failed', NOTIFICATION_TYPES.ERROR);
    }
  };

  const handlePlaceOrder = async ({ forceFailure = false, forceInconsistent = false } = {}) => {
    if (!navigator.onLine) {
      notify('You are offline. Connect to the internet to place the order.', NOTIFICATION_TYPES.ERROR);
      return;
    }

    const canSubmitFromState =
      checkoutState === ORDER_STATES.CHECKOUT_VALIDATED ||
      checkoutState === ORDER_STATES.ORDER_FAILED ||
      checkoutState === ORDER_STATES.ORDER_INCONSISTENT;

    const isRetryFlow =
      checkoutState === ORDER_STATES.ORDER_FAILED || checkoutState === ORDER_STATES.ORDER_INCONSISTENT;
    const willHitRetryLimit = isRetryFlow && retryCount + 1 >= maxRetries;

    if (!canSubmitFromState) {
      notify('Please validate checkout before placing the order.', NOTIFICATION_TYPES.WARNING);
      return;
    }

    if (isRetryFlow && retryCount >= maxRetries) {
      dispatch(rollbackToCartReady());
      dispatch(clearCheckoutError());
      notify('Retry limit reached. Returning to cart.', NOTIFICATION_TYPES.WARNING);
      navigate(ROUTES.CART);
      return;
    }

    const resultAction = await dispatch(
      submitOrder({
        cart: cartItems,
        checkoutTokenId: checkoutToken,
        orderId,
        forceFailure,
        forceInconsistent,
      })
    );

    if (submitOrder.fulfilled.match(resultAction)) {
      dispatch(clearCart());
      notify('Order placed successfully', NOTIFICATION_TYPES.SUCCESS);
     
      setTimeout(() => {
    storageService.removeOrderState();
    sessionStorage.setItem(CHECKOUT_INITIALIZED_NOTIFICATION_KEY, 'false');
      
    },20000);
      
      setTimeout(() => {
    navigate(ROUTES.CART);
    },20000);
      return;
    }

    if (willHitRetryLimit) {
      dispatch(rollbackToCartReady());
      dispatch(clearCheckoutError());
      notify('Retry limit reached. Returning to cart.', NOTIFICATION_TYPES.WARNING);
      navigate(ROUTES.CART);
      return;
    }

    const reason = resultAction.payload?.reason || 'Order placement failed';
    notify(reason, NOTIFICATION_TYPES.ERROR);
  };

  const handleRollback = () => {
    dispatch(rollbackToCartReady());
    dispatch(clearCheckoutError());
    notify('Order flow rolled back. You are back to cart-ready state.', NOTIFICATION_TYPES.INFO);
    setTimeout(() => {
    navigate(ROUTES.CART);
    },2000);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  const tax = subtotal * 0.08;
  const shipping = subtotal >= 50 ? 0 : 5;
  const total = subtotal + tax + shipping;
  const disableAllActions = isSuccessState;
  const disablePrimaryActions = isFailureState || isSuccessState;
  const getReachedStates = () => {
    switch (checkoutState) {
      case ORDER_STATES.CHECKOUT_VALIDATED:
        return new Set([ORDER_STATES.CART_READY, ORDER_STATES.CHECKOUT_VALIDATED]);
      case ORDER_STATES.ORDER_SUBMITTED:
        return new Set([
          ORDER_STATES.CART_READY,
          ORDER_STATES.CHECKOUT_VALIDATED,
          ORDER_STATES.ORDER_SUBMITTED,
        ]);
      case ORDER_STATES.ORDER_SUCCESS:
        return new Set([
          ORDER_STATES.CART_READY,
          ORDER_STATES.CHECKOUT_VALIDATED,
          ORDER_STATES.ORDER_SUBMITTED,
          ORDER_STATES.ORDER_SUCCESS,
        ]);
      case ORDER_STATES.ORDER_FAILED:
        return new Set([
          ORDER_STATES.CART_READY,
          ORDER_STATES.CHECKOUT_VALIDATED,
          ORDER_STATES.ORDER_SUBMITTED,
          ORDER_STATES.ORDER_FAILED,
        ]);
      case ORDER_STATES.ORDER_INCONSISTENT:
        return new Set([
          ORDER_STATES.CART_READY,
          ORDER_STATES.CHECKOUT_VALIDATED,
          ORDER_STATES.ORDER_SUBMITTED,
          ORDER_STATES.ORDER_INCONSISTENT,
        ]);
      case ORDER_STATES.ROLLED_BACK:
        return new Set([
          ORDER_STATES.CART_READY,
          ORDER_STATES.CHECKOUT_VALIDATED,
          ORDER_STATES.ORDER_SUBMITTED,
          ORDER_STATES.ORDER_FAILED,
          ORDER_STATES.ROLLED_BACK,
        ]);
      case ORDER_STATES.CART_READY:
      default:
        return new Set([ORDER_STATES.CART_READY]);
    }
  };

  const reachedStates = getReachedStates();

  const getStageStatus = (stageState) => {
    const isCurrentFailure =
    // only for current state this is not for all.
      stageState === checkoutState &&
      (checkoutState === ORDER_STATES.ORDER_FAILED || checkoutState === ORDER_STATES.ORDER_INCONSISTENT);

    if (isCurrentFailure) {
      return 'failed';
    }

    if (reachedStates.has(stageState)) {
      return 'reached';
    }

    return 'pending';
  };

  const getStageClasses = (status) => {
    if (status === 'failed') {
      return 'border-red-500 bg-red-950/40 text-red-200';
    }

    if (status === 'reached') {
      return 'border-green-500 bg-green-950/40 text-green-200';
    }

    return 'border-slate-700 bg-slate-900 text-slate-300';
  };

  if (cartItems.length === 0 && checkoutState !== ORDER_STATES.ORDER_SUCCESS) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white">
      <button
        onClick={() => navigate(ROUTES.CART)}
        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Cart
      </button>

      <div className="mb-8 rounded-3xl border border-slate-800 bg-gradient-to-br from-black via-slate-950 to-slate-900 p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.4em] text-green-400 mb-3">Checkout</p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white">Validate your cart</h1>
          </div>
          <div className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 w-fit">
            Current state: {checkoutState}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-green-400">Cart Summary</h2>
              <p className="text-sm text-slate-400">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
            </div>

            {cartItems.length !== 0 && (
              <div className="space-y-3">
                {cartItems.map((item) => {
                const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-100 line-clamp-2">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-1 capitalize">{item.category || 'Uncategorized'} · Qty {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{formatCurrency(item.price)} each</p>
                      <p className="font-bold text-blue-300">{formatCurrency(lineTotal)}</p>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </div>

          <div className="hidden lg:block bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-blue-400">State Machine</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHECKOUT_STAGES.map((stage) => {
                const status = getStageStatus(stage.state);
                return (
                  <div
                    key={stage.state}
                    className={`rounded-2xl border p-4 transition ${getStageClasses(status)}`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="font-semibold">{stage.title}</h3>
                      <span className="text-[11px] uppercase tracking-[0.2em] opacity-80">{status}</span>
                    </div>
                    <p className="text-sm opacity-80 leading-6">{stage.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4" />
          </div>

        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-6 sticky top-20">
            <h2 className="text-xl font-bold mb-4 text-green-400">Order Summary</h2>
            <div className="space-y-2 mb-4 pb-4 border-b border-slate-800">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-300">
                <span>Tax:</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-300">
                <span>Shipping:</span>
                <span>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span>
              </div>
            </div>
            <div className="flex justify-between font-bold text-lg text-white mb-6">
              <span>Total:</span>
              <span className="text-blue-400">{formatCurrency(total)}</span>
            </div>

{/* // when redux func is called it goes into pending state which 
// makes the loading true and make it false on error/success. */}
            <button
              onClick={handleValidateCheckout}
              disabled={loading || disableAllActions}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Validating...' : 'Validate Cart'}
            </button>

            <button
              onClick={() => handlePlaceOrder()}
              disabled={
                loading ||
                disablePrimaryActions ||
                cartItems.length === 0 ||
                !(
                  checkoutState === ORDER_STATES.CHECKOUT_VALIDATED ||
                  checkoutState === ORDER_STATES.ORDER_SUCCESS
                )
              }
              className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : isFailureState ? 'Retry Place Order (Success Path)' : 'Place Order (Success Path)'}
            </button>

            <button
              onClick={() => handlePlaceOrder({ forceFailure: true })}
              disabled={
                loading ||
                disablePrimaryActions ||
                cartItems.length === 0 ||
                !(
                  checkoutState === ORDER_STATES.CHECKOUT_VALIDATED ||
                  checkoutState === ORDER_STATES.ORDER_FAILED ||
                  checkoutState === ORDER_STATES.ORDER_INCONSISTENT
                )
              }
              className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
            >
              Simulate Failed Order
            </button>

            <button
              onClick={() => handlePlaceOrder({ forceInconsistent: true })}
              disabled={
                loading ||
                disablePrimaryActions ||
                cartItems.length === 0 ||
                !(
                  checkoutState === ORDER_STATES.CHECKOUT_VALIDATED ||
                  checkoutState === ORDER_STATES.ORDER_FAILED ||
                  checkoutState === ORDER_STATES.ORDER_INCONSISTENT
                )
              }
              className="w-full mt-3 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
            >
              Simulate Inconsistent Order
            </button>

            {isFailureState && (
              <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4">
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handlePlaceOrder()}
                    disabled={loading || disableAllActions || cartItems.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
                  >
                    Retry Order
                  </button>
                  <button
                    onClick={handleRollback}
                    disabled={loading || disableAllActions}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
                  >
                    Rollback to Cart
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-300 mt-3">Last error: {error.reason || error.message}</p>
            )}

            <div className="lg:hidden mt-6 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-6">
              <h2 className="text-xl font-bold mb-4 text-blue-400">State Machine</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CHECKOUT_STAGES.map((stage) => {
                  const status = getStageStatus(stage.state);
                  return (
                    <div
                      key={stage.state}
                      className={`rounded-2xl border p-4 transition ${getStageClasses(status)}`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="font-semibold">{stage.title}</h3>
                        <span className="text-[11px] uppercase tracking-[0.2em] opacity-80">{status}</span>
                      </div>
                      <p className="text-sm opacity-80 leading-6">{stage.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return `₹${amount.toFixed(2)}`;
}

export default Checkout;
