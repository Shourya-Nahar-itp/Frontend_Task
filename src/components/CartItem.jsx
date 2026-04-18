
import React from 'react';
import { X, Minus, Plus } from 'lucide-react';

const CartItem = ({ item, onUpdateQuantity, onRemove, loading = false }) => {
  return (
    <div className="py-4 border-b border-slate-800 last:border-b-0">
      <div className="flex flex-col sm:flex-row gap-4">
      {/* Image */}
      <div className="w-full sm:w-24 h-44 sm:h-24 bg-slate-900 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-800">
        <img
          src={item.image}
          alt={item.title}
          className="h-full w-full object-contain p-3 sm:p-2"
        />
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base sm:text-base line-clamp-2 text-white">
          {item.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 mb-1 capitalize">{item.category}</p>
        <p className="text-xl sm:text-lg font-black text-blue-300">
          ₹{(item.price * item.quantity).toFixed(2)}
        </p>
        <p className="text-xs text-slate-400 mb-3 sm:mb-0">
          ₹{item.price.toFixed(2)} each {' '}
          {item.baselineSnapshot && item.baselineSnapshot.baselinePrice !== item.price && (
            <span className="text-red-400 font-semibold">
              (Original: ₹{item.baselineSnapshot.baselinePrice.toFixed(2)})
            </span>
          )}
        </p>

        <div className="sm:hidden flex items-center justify-between gap-3 mt-2">
          <div className="flex items-center border border-slate-700 rounded-xl bg-slate-900 text-white">
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
              disabled={loading || item.quantity <= 1}
              className="h-10 w-10 flex items-center justify-center hover:bg-slate-800 disabled:opacity-50 transition"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="px-3 py-2 text-base font-bold w-12 text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              disabled={loading || item.quantity >= 999}
              className="h-10 w-10 flex items-center justify-center hover:bg-slate-800 disabled:opacity-50 transition"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            onClick={() => onRemove(item.id)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-red-300 hover:text-red-200 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2 transition disabled:opacity-50"
            aria-label="Remove item"
          >
            <X size={16} />
            Remove
          </button>
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="hidden sm:flex flex-col items-center justify-between">
        <div className="flex items-center border border-slate-700 rounded-lg bg-slate-900 text-white">
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            disabled={loading || item.quantity <= 1}
            className="p-1 hover:bg-slate-800 disabled:opacity-50 transition"
            aria-label="Decrease quantity"
          >
            <Minus size={16} />
          </button>
          <span className="px-3 py-1 text-sm font-semibold w-12 text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            disabled={loading || item.quantity >= 999}
            className="p-1 hover:bg-slate-800 disabled:opacity-50 transition"
            aria-label="Increase quantity"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Remove Button */}
        <button
          onClick={() => onRemove(item.id)}
          disabled={loading}
          className="text-red-400 hover:text-red-300 p-1 transition disabled:opacity-50 mt-2"
          aria-label="Remove item"
        >
          <X size={20} />
        </button>
      </div>
      </div>
    </div>
  );
};

export default React.memo(CartItem);
