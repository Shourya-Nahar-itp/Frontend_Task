// Performance optimization utilities
import React from 'react';

// Debounced value hook for search and filtering
export const useDebouncedValue = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Intersection Observer helper for lazy loading
export const useIntersectionObserver = (options = {}) => {
  const ref = React.useRef(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, {
      threshold: 0.1,
      ...options,
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return [ref, isVisible];
};

// Chunk an array into fixed-size batches
export const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// Memoized selector for Redux (prevents unnecessary re-renders)
export const createMemoizedSelector = (selector) => {
  let lastState;
  let lastResult;

  return (state) => {
    const result = selector(state);
    if (lastState !== state || lastResult !== result) {
      lastState = state;
      lastResult = result;
    }
    return lastResult;
  };
};

// Performance metrics collector
export const performanceMetrics = {
  marks: new Map(),

  start: (label) => {
    performanceMetrics.marks.set(`${label}-start`, performance.now());
  },

  end: (label) => {
    const startTime = performanceMetrics.marks.get(`${label}-start`);
    if (!startTime) {
      console.warn(`No start mark for ${label}`);
      return;
    }

    const duration = performance.now() - startTime;
    console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);

    performanceMetrics.marks.delete(`${label}-start`);
    return duration;
  },

  measure: (label, fn) => {
    performanceMetrics.start(label);
    const result = fn();
    performanceMetrics.end(label);
    return result;
  },

  async measureAsync(label, fn) {
    performanceMetrics.start(label);
    const result = await fn();
    performanceMetrics.end(label);
    return result;
  },

  report: () => {
    console.log('=== Performance Report ===');
    const entries = performance.getEntriesByType('measure');
    entries.forEach(entry => {
      console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
    });
  },
};

// Memory-efficient list filtering
export const filterAndSortItems = (items, filters, sortBy = null) => {
  let result = items;

  // Apply filters
  if (filters && Object.keys(filters).length > 0) {
    result = result.filter(item => {
      return Object.entries(filters).every(([key, filterValue]) => {
        if (!filterValue) return true;
        const itemValue = item[key];

        if (typeof filterValue === 'string') {
          return String(itemValue)
            .toLowerCase()
            .includes(filterValue.toLowerCase());
        }

        if (Array.isArray(filterValue)) {
          return filterValue.includes(itemValue);
        }

        return itemValue === filterValue;
      });
    });
  }

  // Apply sorting
  if (sortBy) {
    const { key, order = 'asc' } = sortBy;
    result.sort((a, b) => {
      if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return result;
};

// Batch state updates for performance
export const batchUpdates = async (updates) => {
  return Promise.all(updates);
};

// Request animation frame helper
export const useAnimationFrame = (callback) => {
  const requestRef = React.useRef();

  React.useEffect(() => {
    let lastTime = Date.now();

    const animate = () => {
      const currentTime = Date.now();
      callback(currentTime - lastTime);
      lastTime = currentTime;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(requestRef.current);
  }, [callback]);
};

// Scroll position restoration
export const useScrollRestoration = (key) => {
  React.useEffect(() => {
    const scrollPos = sessionStorage.getItem(`scroll-${key}`);
    if (scrollPos) {
      window.scrollTo(0, parseInt(scrollPos, 10));
    }

    const handleScroll = () => {
      sessionStorage.setItem(`scroll-${key}`, window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [key]);
};

// Dynamic import helper for code splitting
export const lazyLoadComponent = (componentImport) => {
  return React.lazy(() => componentImport);
};

export default {
  useDebouncedValue,
  useIntersectionObserver,
  chunkArray,
  createMemoizedSelector,
  performanceMetrics,
  filterAndSortItems,
  batchUpdates,
  useAnimationFrame,
  useScrollRestoration,
  lazyLoadComponent,
};
