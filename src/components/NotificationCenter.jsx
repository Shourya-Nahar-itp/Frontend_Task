import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectNotifications,
  selectNotificationHistory,
  dismissNotification,
  hydrateNotificationHistory,
} from '../features/notificationSlice';
import { X, Bell } from 'lucide-react';

const NOTIFICATION_HISTORY_SESSION_KEY = 'eshop_notification_history';

const NotificationCenter = () => {
  const notifications = useSelector(selectNotifications);
  const history = useSelector(selectNotificationHistory);
  const dispatch = useDispatch();
  const [showHistory, setShowHistory] = useState(false);
  const [historyHydrated, setHistoryHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(NOTIFICATION_HISTORY_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        dispatch(hydrateNotificationHistory(parsed));
      }
    } catch (error) {
      console.error('Unable to hydrate notification history from session storage', error);
    } finally {
      setHistoryHydrated(true);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!historyHydrated) {
      return;
    }

    try {
      sessionStorage.setItem(NOTIFICATION_HISTORY_SESSION_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Unable to persist notification history in session storage', error);
    }
  }, [history, historyHydrated]);

  useEffect(() => {
    const timers = notifications.map((notification) =>
      setTimeout(() => {
        dispatch(dismissNotification(notification.id));
      }, notification.duration || 4000)
    );

    return () => timers.forEach(clearTimeout);
  }, [dispatch, notifications]);

  const handleDismiss = (id) => {
    dispatch(dismissNotification(id));
  };

  const getNotificationStyles = (type) => {
    const styles = {
      success: 'bg-green-50 text-green-800 border-green-200',
      error: 'bg-red-50 text-red-800 border-red-200',
      warning: 'bg-amber-50 text-amber-800 border-amber-200',
      info: 'bg-blue-50 text-blue-800 border-blue-200',
    };
    return styles[type] || styles.info;
  };

  const getIconColor = (type) => {
    const colors = {
      success: 'text-green-500',
      error: 'text-red-500',
      warning: 'text-amber-500',
      info: 'text-blue-500',
    };
    return colors[type] || colors.info;
  };

  return (
    <>
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-[9999] w-[calc(100vw-2rem)] max-w-sm sm:max-w-md space-y-3 pointer-events-none">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`pointer-events-auto border-2 p-4 rounded-2xl shadow-2xl animate-slideIn backdrop-blur-sm ${getNotificationStyles(notification.type)}`}
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <span className={`mt-0.5 text-lg ${getIconColor(notification.type)}`}>
                  ●
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold leading-6">{notification.message}</p>
                  <p className="text-[11px] uppercase tracking-[0.2em] opacity-70 mt-1">{notification.type}</p>
                </div>
              </div>
              <button
                onClick={() => handleDismiss(notification.id)}
                className="text-inherit hover:opacity-70 flex-shrink-0"
                aria-label="Dismiss notification"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Notification Bell Icon */}
      <div className="fixed bottom-4 right-4 z-[9999]">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="bg-black text-green-400 border border-green-500 p-3 rounded-full shadow-lg hover:bg-slate-900 transition relative"
          aria-label={`${history.length} notifications in history`}
        >
          <Bell size={24} />
          <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {history.length}
          </span>
        </button>
      </div>

      {showHistory && history.length > 0 && (
        <div className="fixed bottom-20 right-4 z-[9999] w-[calc(100vw-2rem)] max-w-sm sm:max-w-md bg-black/95 text-white border border-green-500 rounded-2xl shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-400">Notification Center</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-green-300 hover:text-white"
              aria-label="Hide notification center"
            >
              <X size={18} />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((notification) => (
              <div key={notification.id} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
                <p className="text-sm font-medium text-white">{notification.message}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-blue-300">{notification.type}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-green-300">
                    cart v{notification.cartVersion ?? '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(NotificationCenter);
