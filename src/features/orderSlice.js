import { createSlice } from '@reduxjs/toolkit';
import { storageService } from '../services/storageService';

const initialState = {
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
};

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    // Load orders from storage
    loadOrderHistory: (state) => {
      state.orders = storageService.getOrderHistory();
    },

    // Add new order
    addOrder: (state, action) => {
      state.orders.push(action.payload);
      storageService.addOrderToHistory(action.payload);
    },

    // Set current order
    setCurrentOrder: (state, action) => {
      state.currentOrder = action.payload;
    },

    // Update order status
    updateOrderStatus: (state, action) => {
      const { orderId, status } = action.payload;
      const order = state.orders.find((o) => o.id === orderId);

      if (order) {
        order.status = status;
        storageService.saveOrderHistory(state.orders);
      }
    },

    // Clear current order
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },

    // Clear all orders
    clearAllOrders: (state) => {
      state.orders = [];
      storageService.saveOrderHistory([]);
    },

    // Set error
    setError: (state, action) => {
      state.error = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  loadOrderHistory,
  addOrder,
  setCurrentOrder,
  updateOrderStatus,
  clearCurrentOrder,
  clearAllOrders,
  setError,
  clearError,
} = orderSlice.actions;

// Selectors
export const selectOrders = (state) => state.orders.orders;
export const selectCurrentOrder = (state) => state.orders.currentOrder;
export const selectOrderCount = (state) => state.orders.orders.length;
export const selectOrderError = (state) => state.orders.error;

export const selectOrderById = (state, orderId) =>
  state.orders.orders.find((o) => o.id === orderId);

export default orderSlice.reducer;
