import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  selectCartItems,
  updateItemQuantity,
  removeItemFromCart,
  selectCartSummary,
  selectCartVersion,
  initializeCart,
} from '../features/cartSlice';
import { initializeCheckout } from '../features/checkoutSlice';
import CartItem from '../components/CartItem';
import { ShoppingBag, ChevronLeft } from 'lucide-react';
import { ROUTES } from '../utils/constants';

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cartItems = useSelector(selectCartItems);
  const summary = useSelector(selectCartSummary);
  const cartVersion = useSelector(selectCartVersion);

  useEffect(() => {
    dispatch(initializeCart());
  }, [dispatch]);

  const handleUpdateQuantity = (itemId, quantity) => {
    if (quantity > 0) {
      dispatch(updateItemQuantity({ itemId, quantity }));
    }
  };

  const handleRemove = (itemId) => {
    dispatch(removeItemFromCart(itemId));
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      return;
    }
    dispatch(initializeCheckout());
    navigate(ROUTES.CHECKOUT);
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-white">
        <div className="text-center py-20">
          <ShoppingBag size={64} className="mx-auto mb-4 text-slate-400" />
          <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
          <p className="text-slate-300 mb-6">Add some products to get started!</p>
          <Link
            to={ROUTES.PRODUCTS}
            className="inline-block bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-lg font-semibold transition"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white">
      {/* Header */}
      <div className="mb-8">
        <Link
          to={ROUTES.PRODUCTS}
          className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 mb-4"
        >
          <ChevronLeft size={20} />
          Continue Shopping
        </Link>
        <h1 className="text-3xl font-bold text-white">Shopping Cart</h1>
        <p className="text-slate-300 mt-2">
          {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-green-400 mt-1">
          Cart version: v{cartVersion}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl p-6">
            {cartItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl p-6 sticky top-20">
            <h2 className="text-xl font-bold mb-6 text-green-400">Order Summary</h2>

            <div className="space-y-3 mb-6 pb-6 border-b border-slate-800">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal:</span>
                <span className="font-semibold">₹{summary.subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Tax (8%):</span>
                <span className="font-semibold">₹{summary.tax}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Shipping:</span>
                <span className="font-semibold">
                  {parseFloat(summary.shipping) === 0 ? 'FREE' : `₹${summary.shipping}`}
                </span>
              </div>
            </div>

            <div className="flex justify-between mb-6">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-2xl font-bold text-blue-300">₹{summary.total}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cartItems.length === 0}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-lg transition mb-3 disabled:opacity-50"
            >
              Proceed to Checkout
            </button>

            <button
              onClick={() => navigate(ROUTES.PRODUCTS)}
              className="w-full border-2 border-blue-400 text-blue-300 hover:bg-blue-900/30 font-bold py-3 rounded-lg transition"
            >
              Continue Shopping
            </button>

            {/* Free Shipping Info */}
            {parseFloat(summary.subtotal) < 50 && parseFloat(summary.subtotal) > 0 && (
              <p className="text-xs text-amber-200 mt-4 p-3 bg-amber-950/30 rounded border-l-4 border-amber-500">
                Free shipping on orders over ₹50! Add ₹{(50 - parseFloat(summary.subtotal)).toFixed(2)} more.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
