import { createSlice } from '@reduxjs/toolkit';
import { NOTIFICATION_DURATION, NOTIFICATION_TYPES } from '../utils/constants';

const initialState = {
  //current noti in UI.
  items: [],
  history: [],
  recentKeys: {},
};

const DEDUPE_WINDOW_MS = 10000;
const RECENT_KEY_TTL_MS = 1000*60*60;

const pruneRecentKeys = (recentKeys, now) => {
  Object.keys(recentKeys).forEach((key) => {
    if (now - recentKeys[key] > RECENT_KEY_TTL_MS) {
      delete recentKeys[key];
    }
  });
};

const normalizeMessage = (message = '') =>
  String(message)
    .toLowerCase()
    .replace(/\d+(\.\d+)?/g, '#')
    .replace(/\s+/g, ' ')
    .trim();

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Add notification with deduplication
    addNotification: (state, action) => {
      const {
        type = NOTIFICATION_TYPES.INFO,
        message,
        duration = NOTIFICATION_DURATION[type.toUpperCase()] || 3000,
        cartVersion = null,
        dedupKey = null,
        dedupWindowMs = DEDUPE_WINDOW_MS,
      } = action.payload;

      const now = Date.now();
      pruneRecentKeys(state.recentKeys, now);

      // Create dedup key with optional caller override for activity-level grouping.
      const resolvedDedupKey =
        dedupKey || `${type}-${normalizeMessage(message)}`;
      const lastShownAt = state.recentKeys[resolvedDedupKey];

      if (lastShownAt && now - lastShownAt < dedupWindowMs) {
        return;
      }

      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const notification = {
        id,
        type,
        message,
        createdAt: new Date().toISOString(),
        duration,
        cartVersion,
      };

      state.items.push(notification);
      state.history = [notification, ...state.history].slice(0, 200);
      state.recentKeys[resolvedDedupKey] = now;
    },

    // Remove specific notification
    removeNotification: (state, action) => {
      const id = action.payload;
      const index = state.items.findIndex((n) => n.id === id);

      if (index !== -1) {
        state.items.splice(index, 1);
      }
    },

    // Clear all notifications
    clearAllNotifications: (state) => {
      state.items = [];
      state.recentKeys = {};
    },

    hydrateNotificationHistory: (state, action) => {
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      state.history = incoming.slice(0, 200);
    },

    clearNotificationHistory: (state) => {
      state.history = [];
    },

    // Manual dismiss (for before timer)
    dismissNotification: (state, action) => {
      notificationSlice.caseReducers.removeNotification(state, action);
    },
  },
});

export const {
  addNotification,
  removeNotification,
  clearAllNotifications,
  hydrateNotificationHistory,
  clearNotificationHistory,
  dismissNotification,
} = notificationSlice.actions;

// Selectors
export const selectNotifications = (state) => state.notifications.items;
export const selectNotificationHistory = (state) => state.notifications.history;
export const selectUnreadNotificationCount = (state) =>
  state.notifications.items.length;

export default notificationSlice.reducer;
