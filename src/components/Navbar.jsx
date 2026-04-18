import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCartItemCount } from '../features/cartSlice';
import { ShoppingCart, Menu, X, Home, Package, Clock } from 'lucide-react';
import { ROUTES } from '../utils/constants';

const Navbar = () => {
  const location = useLocation();
  const cartItemCount = useSelector(selectCartItemCount);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { label: 'Home', path: ROUTES.HOME, icon: Home },
    { label: 'Products', path: ROUTES.PRODUCTS, icon: Package },
    { label: 'Orders', path: ROUTES.ORDER_HISTORY, icon: Clock },
  ];

  return (
    <nav className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 text-white shadow-lg sticky top-0 z-40 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to={ROUTES.HOME} className="flex items-center gap-2 font-bold text-2xl">
            <Package size={28} />
            <span className="hidden sm:inline">eShop</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex gap-8 items-center">
            {navLinks.map(({ label, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1 transition px-3 py-2 rounded ${
                  isActive(path)
                    ? 'bg-green-500 text-black font-semibold'
                    : 'text-slate-200 hover:bg-blue-900 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            ))}
          </div>

          {/* Cart & Mobile Menu */}
          <div className="flex items-center gap-4">
            <Link
              to={ROUTES.CART}
              className={`relative p-2 rounded transition ${
                isActive(ROUTES.CART)
                  ? 'bg-green-500 text-black'
                  : 'text-slate-100 hover:bg-blue-900 hover:text-white'
              }`}
            >
              <ShoppingCart size={24} />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 hover:bg-blue-900 rounded transition"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-slate-950 border-t border-slate-800 py-4 space-y-2">
            {navLinks.map(({ label, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded transition ${
                  isActive(path)
                    ? 'bg-green-500 text-black font-semibold'
                    : 'text-slate-200 hover:bg-blue-900 hover:text-white'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={20} />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
