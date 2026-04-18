import { createSlice } from '@reduxjs/toolkit';
import { storageService } from '../services/storageService';
import { cartValidator } from '../services/cartValidator';

const initialState = {
  items: [],
  loading: false,
  error: null,
  lastModified: null,
  version: 1,
  locked: false, // Prevent modifications during checkout
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Initialize cart from storage
    initializeCart: (state) => {
      const cartPayload = storageService.getCartPayload();
      const savedCart = cartPayload.items;

      state.items = savedCart.map((item) => ({
        ...item,
        baselineSnapshot: item.baselineSnapshot || cartValidator.createBaselineSnapshot(item),
        productSnapshot: item.productSnapshot || createProductSnapshot(item),
      }));
      state.version = cartPayload.version || state.version;
      state.lastModified = cartPayload.lastModified || new Date().toISOString();
    },

    // Add item to cart
    addItemToCart: (state, action) => {
      if (state.locked) {
        return;
      }

      const { product, quantity } = action.payload;
      const existingItem = state.items.find((item) => item.id === product.id);

      if (existingItem) {
        existingItem.quantity += quantity;
        if (!existingItem.baselineSnapshot) {
          existingItem.baselineSnapshot = cartValidator.createBaselineSnapshot(product);
        }
        if (!existingItem.productSnapshot) {
          existingItem.productSnapshot = createProductSnapshot(product);
        }
      } else {




        // what a item has in cart.
        state.items.push({
          id: product.id,
          title: product.title,
          price: product.price,
          baselineSnapshot: cartValidator.createBaselineSnapshot(product),
          productSnapshot: createProductSnapshot(product),
          quantity,
          image: product.image,
          category: product.category,
        });
      }

      state.version += 1;
      state.lastModified = new Date().toISOString();
      storageService.saveCart(state.items, {
        version: state.version,
        lastModified: state.lastModified,
      });
    },

    // Update item quantity
    updateItemQuantity: (state, action) => {
      if (state.locked) {
        return;
      }

      const { itemId, quantity } = action.payload;
      const item = state.items.find((i) => i.id === itemId);

      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter((i) => i.id !== itemId);
        } else {
          item.quantity = quantity;
        }

        state.version += 1;
        state.lastModified = new Date().toISOString();
        storageService.saveCart(state.items, {
          version: state.version,
          lastModified: state.lastModified,
        });
      }
    },

    // Remove item from cart
    removeItemFromCart: (state, action) => {
      if (state.locked) {
        return;
      }

      state.items = state.items.filter((item) => item.id !== action.payload);
      state.version += 1;
      state.lastModified = new Date().toISOString();
      storageService.saveCart(state.items, {
        version: state.version,
        lastModified: state.lastModified,
      });
    },

    // Clear entire cart
    clearCart: (state) => {
      state.items = [];
      state.version += 1;
      state.lastModified = new Date().toISOString();
      storageService.saveCart([], {
        version: state.version,
        lastModified: state.lastModified,
      });
    },

    // Lock cart during checkout
    lockCart: (state) => {
      state.locked = true;
    },

    // Unlock cart
    unlockCart: (state) => {
      state.locked = false;
    },

    // Handle storage event sync (for multi-tab support)
    // 
    syncCartFromStorage: (state, action) => {
      const externalCart = action.payload;

      // Detect if cart was modified in another tab
      if (externalCart.version !== state.version) {
        console.warn('Cart modified in another tab');
        state.items = (externalCart.items || []).map((item) => ({
          ...item,
          baselineSnapshot: item.baselineSnapshot || cartValidator.createBaselineSnapshot(item),
          productSnapshot: item.productSnapshot || createProductSnapshot(item),
        }));
        state.version = externalCart.version;
        state.lastModified = externalCart.lastModified;
      }
    },

    // Set error
    setCartError: (state, action) => {
      state.error = action.payload;
    },

    // Clear error
    clearCartError: (state) => {
      state.error = null;
    },
  },
});

export const {
  initializeCart,
  addItemToCart,
  updateItemQuantity,
  removeItemFromCart,
  clearCart,
  lockCart,
  unlockCart,
  syncCartFromStorage,
  setCartError,
  clearCartError,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state) => state.cart.items;
export const selectCartItemCount = (state) =>
  state.cart.items.reduce((count, item) => count + item.quantity, 0);
export const selectCartSubtotal = (state) =>
  state.cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
export const selectCartError = (state) => state.cart.error;
export const selectCartLocked = (state) => state.cart.locked;
export const selectCartVersion = (state) => state.cart.version;

export const selectCartSummary = (state) => {
  const subtotal = selectCartSubtotal(state);
  const tax = subtotal * 0.08;
  const shipping = subtotal >= 50 ? 0 : 5;
  const total = subtotal + tax + shipping;

  return {
    itemCount: selectCartItemCount(state),
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    shipping: shipping.toFixed(2),
    total: total.toFixed(2),
  };
};

function createProductSnapshot(product) {
  return {
    productId: product.id,
    title: product.title,
    category: product.category || null,
    variant: product.variant || 'default',
    price: Number(product.price) || 0,
    stock: Number(product.stock ?? product.rating?.count ?? 0),
    capturedAt: new Date().toISOString(),
  };
}

export default cartSlice.reducer;
