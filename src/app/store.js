import { configureStore } from '@reduxjs/toolkit';
import productReducer from '../features/productSlice';
import cartReducer from '../features/cartSlice';
import checkoutReducer from '../features/checkoutSlice';
import notificationReducer from '../features/notificationSlice';
import orderReducer from '../features/orderSlice';

export const store = configureStore({
  reducer: {
    products: productReducer,
    cart: cartReducer,
    checkout: checkoutReducer,
    notifications: notificationReducer,
    orders: orderReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['checkout/validateCheckout/fulfilled'],
        ignoredPaths: ['checkout.stateMachine'],
      },
    }),
});

export default store;
