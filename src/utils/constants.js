// Application constants

export const APP_NAME = 'EcommerceCheckout';
export const APP_VERSION = '1.0.0';

// Breakpoints for responsive design
export const BREAKPOINTS = {
  MOBILE: '640px',
  TABLET: '768px',
  DESKTOP: '1024px',
  WIDE: '1280px',
};

// Item limits for performance
export const PERFORMANCE = {
  ITEMS_PER_PAGE: 20,
  VIRTUALIZATION_THRESHOLD: 50, // Start virtualizing after this many items
  DEBOUNCE_DELAY: 300, // milliseconds
  SEARCH_MIN_CHARS: 2,
};

// Notification timeout
export const NOTIFICATION_DURATION = {
  SUCCESS: 4000,
  ERROR: 6000,
  WARNING: 5000,
  INFO: 3000,
};

// API timeouts
export const API_TIMEOUTS = {
  DEFAULT: 10000,
  CHECKOUT: 15000,
  UPLOAD: 30000,
};

// Price formatting
export const CURRENCY = {
  SYMBOL: '₹',
  DECIMAL_PLACES: 2,
};

// Local storage keys
export const STORAGE_KEYS = {
  CART: 'app_cart',
  ORDER_STATE: 'app_order_state',
  ORDER_HISTORY: 'app_order_history',
  PRODUCTS_CACHE: 'app_products_cache',
  USER_PREFERENCES: 'app_user_preferences',
};

// Order states
export const ORDER_STATES = {
  CART_READY: 'CART_READY',
  CHECKOUT_VALIDATED: 'CHECKOUT_VALIDATED',
  ORDER_SUBMITTED: 'ORDER_SUBMITTED',
  ORDER_SUCCESS: 'ORDER_SUCCESS',
  ORDER_FAILED: 'ORDER_FAILED',
  ORDER_INCONSISTENT: 'ORDER_INCONSISTENT',
  ROLLED_BACK: 'ROLLED_BACK',
};

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Routes
export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDER_HISTORY: '/orders',
};

// Product categories (fallback)
export const DEFAULT_CATEGORIES = [
  'electronics',
  'jewelery',
  'men\'s clothing',
  'women\'s clothing',
];

export default {
  APP_NAME,
  APP_VERSION,
  BREAKPOINTS,
  PERFORMANCE,
  NOTIFICATION_DURATION,
  API_TIMEOUTS,
  CURRENCY,
  STORAGE_KEYS,
  ORDER_STATES,
  NOTIFICATION_TYPES,
  ROUTES,
  DEFAULT_CATEGORIES,
};
