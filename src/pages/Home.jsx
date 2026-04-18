import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { initializeCart } from '../features/cartSlice';
import { loadOrderHistory } from '../features/orderSlice';
import { ROUTES } from '../utils/constants';
import { ShoppingBag, ArrowRight, Sparkles, Truck, ShieldCheck } from 'lucide-react';

const Home = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize app on first load 
    // runs only once.
    dispatch(initializeCart());
    dispatch(loadOrderHistory());
  }, [dispatch]);

  return (
    <div className="bg-gradient-to-br from-black via-slate-950 to-slate-900 text-white min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-green-400 mb-4">Welcome</p>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-5">
              Find what you need,
              <span className="block text-blue-400">checkout in minutes.</span>
            </h1>
            <p className="text-slate-300 text-lg md:text-xl max-w-2xl">
              Explore products, filter by category and price, and place your order with a smooth, secure checkout flow.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <Link
                to={ROUTES.PRODUCTS}
                className="inline-flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 font-semibold text-black hover:bg-green-400 transition"
              >
                Start Shopping
                <ArrowRight size={18} />
              </Link>
              <Link
                to={ROUTES.CART}
                className="inline-flex items-center gap-2 rounded-full border border-blue-500 px-6 py-3 font-semibold text-blue-300 hover:bg-blue-500/10 transition"
              >
                Go to Cart
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-slate-200">New arrivals</span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-slate-200">Top rated</span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-slate-200">Fast delivery</span>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
              <div className="flex items-center gap-3 mb-3 text-green-400">
                <Sparkles size={24} />
                <h2 className="text-lg font-semibold">Personalized Picks</h2>
              </div>
              <p className="text-slate-300 text-sm leading-6">
                Browse across categories and discover products curated for quick decision-making.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
              <div className="flex items-center gap-3 mb-3 text-blue-400">
                <Truck size={24} />
                <h2 className="text-lg font-semibold">Fast Order Flow</h2>
              </div>
              <p className="text-slate-300 text-sm leading-6">
                Add items, review totals, and place orders without unnecessary steps.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
              <div className="flex items-center gap-3 mb-3 text-green-400">
                <ShieldCheck size={24} />
                <h2 className="text-lg font-semibold">Protected Checkout</h2>
              </div>
              <p className="text-slate-300 text-sm leading-6">
                Built-in checks help keep your cart and order steps consistent during checkout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
