// Storage service for cart, state persistence, and offline support

const STORAGE_KEYS = {
  CART: 'app_cart',
  ORDER_STATE: 'app_order_state',
  ORDER_HISTORY: 'app_order_history',
  PRODUCTS_CACHE: 'app_products_cache',
  USER_PREFERENCES: 'app_user_preferences',
};

export const storageService = {
  // Cart operations
  saveCart: (cartItems, metadata = {}) => {
    try {
      const payload = {
        items: Array.isArray(cartItems) ? cartItems : [],
        version: Number(metadata.version) || 1,
        lastModified: metadata.lastModified || new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('Error saving cart:', error);
      return false;
    }
  },

  getCart: () => {
    try {
      const cart = localStorage.getItem(STORAGE_KEYS.CART);
      if (!cart) {
        return [];
      }

      const parsed = JSON.parse(cart);
      // Backward compatibility for legacy array-only cart shape.
      if (Array.isArray(parsed)) {
        return parsed;
      }

      return Array.isArray(parsed.items) ? parsed.items : [];
    } catch (error) {
      console.error('Error retrieving cart:', error);
      return [];
    }
  },

  getCartPayload: () => {
    try {
      const cart = localStorage.getItem(STORAGE_KEYS.CART);
      if (!cart) {
        return {
          items: [],
          version: 1,
          lastModified: null,
        };
      }

      const parsed = JSON.parse(cart);
// if the cart is just array not object 
      if (Array.isArray(parsed)) {
        return {
          items: parsed,
          version: 1,
          lastModified: null,
        };
      }
// if the cart is in the new format with metadata
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        version: Number(parsed.version) || 1,
        lastModified: parsed.lastModified || null,
      };
    } catch (error) {
      console.error('Error retrieving cart payload:', error);
      return {
        items: [],
        version: 1,
        lastModified: null,
      };
    }
  },

  // Order state persistence
  saveOrderState: (state) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDER_STATE, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error('Error saving order state:', error);
      return false;
    }
  },

  getOrderState: () => {
    try {
      const state = localStorage.getItem(STORAGE_KEYS.ORDER_STATE);
      return state ? JSON.parse(state) : null;
    } catch (error) {
      console.error('Error retrieving order state:', error);
      return null;
    }
  },

  removeOrderState: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.ORDER_STATE);
      return true;
    } catch (error) {
      console.error('Error removing order state:', error);
      return false;
    }
  },

  // Order history
  saveOrderHistory: (orders) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDER_HISTORY, JSON.stringify(orders));
      return true;
    } catch (error) {
      console.error('Error saving order history:', error);
      return false;
    }
  },

  getOrderHistory: () => {
    try {
      const orders = localStorage.getItem(STORAGE_KEYS.ORDER_HISTORY);
      return orders ? JSON.parse(orders) : [];
    } catch (error) {
      console.error('Error retrieving order history:', error);
      return [];
    }
  },

  addOrderToHistory: (order) => {
    const history = storageService.getOrderHistory();
    history.push({
      ...order,
      savedAt: new Date().toISOString(),
    });
    return storageService.saveOrderHistory(history);
  },

  // Products cache
  saveProductsCache: (products, expiryMinutes = 60) => {
    try {
      const cached = {
        data: products,
        timestamp: Date.now(),
        expiryTime: Date.now() + expiryMinutes * 60 * 1000,
      };
      localStorage.setItem(STORAGE_KEYS.PRODUCTS_CACHE, JSON.stringify(cached));
      return true;
    } catch (error) {
      console.error('Error saving products cache:', error);
      return false;
    }
  },

  getProductsCache: () => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.PRODUCTS_CACHE);
      if (!cached) return null;

      const data = JSON.parse(cached);

      // Check if cache is expired
      if (Date.now() > data.expiryTime) {
        localStorage.removeItem(STORAGE_KEYS.PRODUCTS_CACHE);
        return null;
      }

      return data.data;
    } catch (error) {
      console.error('Error retrieving products cache:', error);
      return null;
    }
  },

  // User preferences
  saveUserPreferences: (preferences) => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(preferences)
      );
      return true;
    } catch (error) {
      console.error('Error saving user preferences:', error);
      return false;
    }
  },

  getUserPreferences: () => {
    try {
      const prefs = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return prefs
        ? JSON.parse(prefs)
        : {
            theme: 'light',
            currency: 'INR',
          };
    } catch (error) {
      console.error('Error retrieving user preferences:', error);
      return { theme: 'light', currency: 'INR' };
    }
  },

  // Utility: Clear all app storage
  clearAllStorage: () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },

  // Utility: Export all storage data
  exportAllStorage: () => {
    try {
      const exported = {};
      // object.entries returns an array of [key, value] pairs.
      Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
        const value = localStorage.getItem(key);
        if (value) {
          exported[name] = JSON.parse(value);
        }
      });
      return exported;
    } catch (error) {
      console.error('Error exporting storage:', error);
      return {};
    }
  },

  // Check storage availability
  isAvailable: () => {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
};

export default storageService;
