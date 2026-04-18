import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addNotification } from '../features/notificationSlice';
import { selectCartVersion } from '../features/cartSlice';
import { NOTIFICATION_TYPES, NOTIFICATION_DURATION } from '../utils/constants';

export const useNotification = () => {
  const dispatch = useDispatch();
  const cartVersion = useSelector(selectCartVersion);

  const notify = useCallback(
    (message, type = NOTIFICATION_TYPES.INFO, duration, options = {}) => {
      dispatch(
        addNotification({
          message,
          type,
          duration: duration || NOTIFICATION_DURATION[type.toUpperCase()],
          cartVersion,
          dedupKey: options.dedupKey,
          dedupWindowMs: options.dedupWindowMs,
        })
      );
    },
    [dispatch, cartVersion]
  );

  return {
    success: (message) => notify(message, NOTIFICATION_TYPES.SUCCESS),
    error: (message) => notify(message, NOTIFICATION_TYPES.ERROR),
    warning: (message) => notify(message, NOTIFICATION_TYPES.WARNING),
    info: (message) => notify(message, NOTIFICATION_TYPES.INFO),
    notify,
  };
};

