import React from 'react';
import { ShoppingCart, Star } from 'lucide-react';

const ProductCard = ({
  product,
  onAddToCart,
  onIncrement,
  onDecrement,
  loading = false,
  cartQuantity = 0,
}) => {
  const [quantity, setQuantity] = React.useState(1);

  const handleAddToCart = () => {
    onAddToCart({ product, quantity });
    setQuantity(1);
  };

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-sm hover:shadow-xl transition p-3 sm:p-4 flex flex-col h-full">
      {/* Product Image */}
      <div className="mb-3 sm:mb-4 h-36 sm:h-44 md:h-48 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="h-full w-full object-contain p-2 sm:p-3"
          loading="lazy"
        />
      </div>

      {/* Category Badge */}
      <span className="text-[11px] sm:text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full inline-block mb-2 w-fit capitalize">
        {product.category}
      </span>

      {/* Title */}
      <h3 className="font-semibold text-sm sm:text-base text-white line-clamp-2 min-h-[2.6rem] sm:min-h-[3rem] mb-2">
        {product.title}
      </h3>

      {/* Price & Rating */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-base sm:text-lg font-extrabold text-blue-700">
          ₹{product.price.toFixed(2)}
        </span>
        <div className="flex items-center gap-1">
          <Star size={14} className="fill-yellow-400 text-yellow-400 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm text-slate-600 font-medium">
            {(product.rating?.rate || 4.5).toFixed(1)}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mb-3 sm:mb-4 flex-grow">
        {product.description}
      </p>

      {/* Quantity Controls */}
      {cartQuantity > 0 ? (
        <div className="mt-auto flex items-center gap-2">
          <button
            onClick={() => onDecrement?.(product)}
            disabled={loading}
            className="h-11 w-11 sm:h-10 sm:w-10 rounded-xl border border-slate-700 bg-slate-900 text-white text-xl leading-none font-semibold hover:bg-slate-800 disabled:opacity-50"
          >
            -
          </button>
          <div className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-2 py-2.5 text-center">
            <p className="text-[11px] uppercase tracking-wide text-blue-700">In cart</p>
            <p className="text-sm sm:text-base font-bold text-blue-900">{cartQuantity}</p>
          </div>
          <button
            onClick={() => onIncrement?.(product)}
            disabled={loading}
            className="h-11 w-11 sm:h-10 sm:w-10 rounded-xl bg-blue-600 text-white text-xl leading-none font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            +
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-auto justify-center">
          <select
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
            className="w-20 sm:w-24 border border-slate-700 bg-slate-900 text-white rounded-xl px-2 py-2.5 text-sm font-medium"
            disabled={loading}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddToCart}
            disabled={loading}
            className="w-full sm:flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 py-2 flex items-center justify-center gap-2 text-sm font-semibold transition disabled:opacity-50"
          >
            <ShoppingCart size={16} />
            <span>Add to Cart</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProductCard);
