// Helper utility functions

export const formatPrice = (price) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(parseFloat(price) || 0);
};

export const calculateTotalPrice = (items) => {
  return items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0).toFixed(2);
};

export const calculateSubtotal = (items) => {
  return items.reduce((subtotal, item) => {
    return subtotal + (item.price * item.quantity);
  }, 0);
};

export const calculateTax = (subtotal, taxRate = 0.08) => {
  return (subtotal * taxRate).toFixed(2);
};

export const calculateShipping = (subtotal) => {
  // Free shipping above ₹50, ₹5 otherwise
  return subtotal >= 50 ? 0 : 5;
};

export const calculateTotal = (subtotal, taxRate = 0.08) => {
  const tax = parseFloat(calculateTax(subtotal, taxRate));
  const shipping = calculateShipping(subtotal);
  return (parseFloat(subtotal) + tax + shipping).toFixed(2);
};

export const truncateText = (text, length = 50) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return `${text.substring(0, length)}...`;
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatDistance = (givenDate) => {
  const now = new Date();
  const date = new Date(givenDate);
  const seconds = Math.floor((now - date) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return `${interval} years ago`;

  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return `${interval} months ago`;

  interval = Math.floor(seconds / 86400);
  if (interval > 1) return `${interval} days ago`;

  interval = Math.floor(seconds / 3600);
  if (interval > 1) return `${interval} hours ago`;

  interval = Math.floor(seconds / 60);
  if (interval > 1) return `${interval} minutes ago`;

  return 'just now';
};

export const generateOrderId = () => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

export const groupByCategory = (items) => {
  return items.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
};

export const sortBy = (items, key, order = 'asc') => {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
};

export const getUniqueItems = (items, key) => {
  const unique = new Map();
  items.forEach(item => {
    if (!unique.has(item[key])) {
      unique.set(item[key], item);
    }
  });
  return Array.from(unique.values());
};

export const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

export const randomBetween = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

export const isObjectEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export default {
  formatPrice,
  calculateTotalPrice,
  calculateSubtotal,
  calculateTax,
  calculateShipping,
  calculateTotal,
  truncateText,
  formatDate,
  formatDistance,
  generateOrderId,
  groupByCategory,
  sortBy,
  getUniqueItems,
  clamp,
  randomBetween,
  debounce,
  throttle,
  deepClone,
  isObjectEmpty,
  hexToRgb,
};
