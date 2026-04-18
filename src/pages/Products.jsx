import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FixedSizeGrid as Grid } from 'react-window';
import {
  fetchProducts,
  selectFilteredProducts,
  selectLoading,
  selectFilters,
  setSearchFilter,
  setSortBy,
  selectCategories,
  fetchCategories, 
} from '../features/productSlice';
import { addItemToCart, selectCartItems, updateItemQuantity } from '../features/cartSlice';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNotification } from '../hooks/useNotification';
import { useDebouncedValue } from '../utils/performanceUtils';
import { Search, Filter } from 'lucide-react';
import { NOTIFICATION_TYPES } from '../utils/constants';
import { setCategory, setPriceRange, resetFilters } from '../features/productSlice';

const GRID_GAP = 16;
const PRODUCT_CARD_MIN_WIDTH = 250;
const DEFAULT_GRID_HEIGHT = 640;
const MAX_GRID_HEIGHT = 980;

const toNumber = (value) => {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};


// when props r not changed it will not re render the component.
const VirtualizedProductCell = React.memo(({ columnIndex, rowIndex, style, data }) => {
  const {
    items,
    columnCount,
    onAddToCart,
    onIncrement,
    onDecrement,
    cartQuantityById,
  } = data;
  const itemIndex = rowIndex * columnCount + columnIndex;

  if (itemIndex >= items.length) {
    return null;
  }

  const product = items[itemIndex];
  const cartQuantity = cartQuantityById[product.id] || 0;
  const offset = GRID_GAP / 2;
  const cellStyle = {
    ...style,
    left: toNumber(style.left) + offset,
    top: toNumber(style.top) + offset,
    width: Math.max(0, toNumber(style.width) - GRID_GAP),
    height: Math.max(0, toNumber(style.height) - GRID_GAP),
  };

  return (
    <div style={cellStyle}>
      <ProductCard
        product={product}
        onAddToCart={onAddToCart}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        loading={false}
        cartQuantity={cartQuantity}
      />
    </div>
  );
});

const Products = () => {
  const dispatch = useDispatch();
  const [showFilters, setShowFilters] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState('');
  const [priceDraft, setPriceDraft] = React.useState({ min: 0, max: 1000 });
  const gridContainerRef = React.useRef(null);
  const [gridWidth, setGridWidth] = React.useState(0);
  const [gridHeight, setGridHeight] = React.useState(DEFAULT_GRID_HEIGHT);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const filteredProducts = useSelector(selectFilteredProducts);
  const loading = useSelector(selectLoading);
  const filters = useSelector(selectFilters);
  const categories = useSelector(selectCategories);
  const cartItems = useSelector(selectCartItems);
  const { notify } = useNotification();

  // Fetch products and categories on mount
  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCategories());
  }, [dispatch]);

  // Apply search filter with debouncing
  useEffect(() => {
    dispatch(setSearchFilter(debouncedSearch));
  }, [debouncedSearch, dispatch]);

  const handleAddToCart = React.useCallback(({ product, quantity }) => {
    dispatch(
      addItemToCart({
        product,
        quantity,
      })
    );
    notify(
      `Added ${product.title} to cart`,
      NOTIFICATION_TYPES.SUCCESS,
      undefined,
      { dedupKey: `cart-up-${product.id}` }
    );
  }, [dispatch, notify]);

  // reference for this function will remain same 
  // until the dependencies change, so it will not cause unnecessary re-renders of child components that use this function.
  const handleIncrement = React.useCallback((product) => {
    dispatch(
      addItemToCart({
        product,
        quantity: 1,
      })
    );
    notify(
      `Increased ${product.title} quantity`,
      NOTIFICATION_TYPES.SUCCESS,
      undefined,
      { dedupKey: `cart-up-${product.id}` }
    );
  }, [dispatch, notify]);

  const handleDecrement = React.useCallback((product) => {
    const item = cartItems.find((cartItem) => cartItem.id === product.id);
    if (!item) {
      return;
    }

    dispatch(
      updateItemQuantity({
        itemId: product.id,
        quantity: item.quantity - 1,
      })
    );

    if (item.quantity - 1 <= 0) {
      notify(
        `Removed ${product.title} from cart`,
        NOTIFICATION_TYPES.WARNING,
        undefined,
        { dedupKey: `cart-remove-${product.id}` }
      );
    } else {
      notify(
        `Decreased ${product.title} quantity`,
        NOTIFICATION_TYPES.SUCCESS,
        undefined,
        { dedupKey: `cart-down-${product.id}` }
      );
    }
  }, [dispatch, cartItems, notify]);

  const handleSortChange = (sortBy) => {
    dispatch(
      setSortBy({
        sortBy,
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
      })
    );
  };

  const handleCategoryToggle = (category) => {
    dispatch(setCategory(filters.selectedCategory === category ? null : category));
  };

  const applyPriceRange = () => {
    const min = Number(priceDraft.min) || 0;
    const max = Number(priceDraft.max) || 1000;
    dispatch(setPriceRange([Math.min(min, max), Math.max(min, max)]));
  };

  const productCount = useMemo(() => {
    return filteredProducts.length;
  }, [filteredProducts.length]);

  useLayoutEffect(() => {
    const updateGridViewport = () => {
      if (!gridContainerRef.current) {
        return;
      }

      const rect = gridContainerRef.current.getBoundingClientRect();
      setGridWidth(Math.max(0, Math.floor(rect.width)));

      const availableHeight = Math.floor(window.innerHeight - rect.top - 24);
      setGridHeight(
        Math.max(420, Math.min(MAX_GRID_HEIGHT, availableHeight || DEFAULT_GRID_HEIGHT))
      );
    };

    updateGridViewport();

    const observer = new ResizeObserver(() => {
      updateGridViewport();
    });

    if (gridContainerRef.current) {
      observer.observe(gridContainerRef.current);
    }

    window.addEventListener('resize', updateGridViewport);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateGridViewport);
    };
  }, [productCount]);

  const columnCount = useMemo(() => {
    if (!gridWidth) {
      return 1;
    }

    return Math.max(
      1,
      Math.floor((gridWidth + GRID_GAP) / (PRODUCT_CARD_MIN_WIDTH + GRID_GAP))
    );
  }, [gridWidth]);

  const rowCount = useMemo(() => {
    return Math.ceil(productCount / columnCount);
  }, [productCount, columnCount]);

  const itemWidth = useMemo(() => {
    if (!gridWidth) {
      return PRODUCT_CARD_MIN_WIDTH;
    }

    const totalGapWidth = GRID_GAP * (columnCount - 1);
    return Math.max(
      200,
      Math.floor((gridWidth - totalGapWidth) / columnCount)
    );
  }, [gridWidth, columnCount]);

  const itemHeight = useMemo(() => {
    return columnCount === 1 ? 280 : 440;
  }, [columnCount]);


  const gridItemData = useMemo(() => {
    // cartquantityById is a map of productId to quantity in cart,
    //  used to display the correct quantity for each product card 
    // without needing to search the cart array repeatedly.
    const cartQuantityById = cartItems.reduce((acc, item) => {
      acc[item.id] = Number(item.quantity) || 0;
      return acc;
    }, {});

    return {
      items: filteredProducts,
      columnCount,
      onAddToCart: handleAddToCart,
      onIncrement: handleIncrement,
      onDecrement: handleDecrement,
      cartQuantityById,
    };
  }, [filteredProducts, columnCount, handleAddToCart, handleIncrement, handleDecrement, cartItems]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white">
      {/* Search & Filter Header */}
      <div className="mb-8">
        <div className="rounded-3xl border border-slate-800 bg-black p-6 md:p-8 shadow-2xl shadow-green-950/20">
          <p className="text-xs uppercase tracking-[0.4em] text-green-400 mb-3">Direct products</p>
          <h1 className="text-3xl md:text-4xl font-black mb-3 text-white">Browse products</h1>
          <p className="text-slate-300 max-w-2xl">
            Search, filter, and sort the catalog directly.
          </p>
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-3 md:gap-4 mb-6">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-green-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Sort Dropdown */}
          <select
            value={filters.sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full md:w-auto px-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="random">Random order</option>
            <option value="title">Sort by Title</option>
            <option value="price">Sort by Price</option>
            <option value="rating">Sort by Rating</option>
          </select>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 border border-green-500 text-green-300 bg-slate-950 rounded-xl hover:bg-slate-900 transition"
          >
            <Filter size={20} />
            <span>Filters</span>
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="w-full overflow-hidden bg-slate-950 border border-slate-800 rounded-3xl p-5 mb-6 text-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-lg">Categories</h3>
              <button
                onClick={() => {
                  dispatch(resetFilters());
                  setSearchInput('');
                  setPriceDraft({ min: 0, max: 1000 });
                }}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Reset all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {categories.map((category) => {
                const active = filters.selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    className={`w-full min-w-0 rounded-full px-4 py-2 text-sm font-medium border transition capitalize truncate ${active ? 'bg-green-500 text-black border-green-400' : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-blue-400'}`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-4">Price Range</h3>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceDraft.min}
                  onChange={(e) => setPriceDraft((prev) => ({ ...prev, min: e.target.value }))}
                  className="flex-1 px-3 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={priceDraft.max}
                  onChange={(e) => setPriceDraft((prev) => ({ ...prev, max: e.target.value }))}
                  className="flex-1 px-3 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white"
                />
              </div>
              <button
                onClick={applyPriceRange}
                className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition"
              >
                Apply price filter
              </button>
            </div>
          </div>
        )}

        {/* Results Count */}
        <p className="text-sm text-slate-400 mt-3">
          Showing {productCount} products
          {searchInput && ` for "${searchInput}"`}
        </p>
      </div>

      {/* Products Grid */}
      {loading ? (
        <LoadingSpinner message="Loading products..." />
      ) : productCount === 0 ? (
        <LoadingSpinner message="Loading products..." />
      ) : (
        <div ref={gridContainerRef} className="w-full">
          <Grid
            key={`${columnCount}-${productCount}-${itemHeight}`}
            columnCount={columnCount}
            columnWidth={itemWidth + GRID_GAP}
            height={Math.max(420, gridHeight)}
            rowCount={rowCount}
            rowHeight={itemHeight + GRID_GAP}
            width={Math.max(1, gridWidth)}
            itemData={gridItemData}
            overscanRowCount={2}
            overscanColumnCount={1}
          >
            {VirtualizedProductCell}
          </Grid>
        </div>
      )}
    </div>
  );
};

export default Products;
