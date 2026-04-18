import axios from 'axios';

const FAKE_STORE_BASE_URL = 'https://fakestoreapi.com';
const JSONPLACEHOLDER_BASE_URL = 'https://jsonplaceholder.typicode.com';

// Simulate network delay for testing
const SIMULATE_DELAY = import.meta.env.VITE_SIMULATE_DELAY === 'true' ? 2000 : 0;
const SIMULATE_INVALID_API_RESPONSE = import.meta.env.VITE_SIMULATE_INVALID_API_RESPONSE === 'true';

const fakeStoreAPI = axios.create({
  baseURL: FAKE_STORE_BASE_URL,
  timeout: 10000,
});

const jsonPlaceholderAPI = axios.create({
  baseURL: JSONPLACEHOLDER_BASE_URL,
  timeout: 10000,
});

// Add delay interceptor for testing
const withOptionalDelay = (response) => {
  if (SIMULATE_DELAY) {
    return new Promise((resolve) =>
      setTimeout(() => resolve(response), SIMULATE_DELAY)
    );
  }
  return response;
};

// fakeStoreAPI.interceptors.response.use(
//   response => withOptionalDelay(response),
//   error => Promise.reject(error)
// );

jsonPlaceholderAPI.interceptors.response.use(
  response => withOptionalDelay(response),
  error => Promise.reject(error)
);

export const productAPI = {
  // Fetch all products
  getProducts: async (limit = 20, skip = 0) => {
    try {
      const response = await fakeStoreAPI.get('/products', {
        params: { limit },
      });
      return {
        data: response.data,
        total: response.data.length,
        status: 200,
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get single product
  getProduct: async (id) => {
    try {
      const response = await fakeStoreAPI.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  // Get categories
  getCategories: async () => {
    try {
      const response = await fakeStoreAPI.get('/products/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get products by category
  getProductsByCategory: async (category) => {
    try {
      const response = await fakeStoreAPI.get(
        `/products/category/${category}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  },
};

export const catalogSnapshotAPI = {
  // Fetch a fresh snapshot for products currently in cart.
  getFreshSnapshotForCart: async (cartItems) => {
    // [] converts set into array and new Set removes duplicates.
    const canonicalIds = [...new Set(cartItems.map((item) => normalizeProductId(item.id)))];

    const canonicalProducts = await Promise.all(
      canonicalIds.map(async (canonicalId) => {
        try {
          const product = await productAPI.getProduct(canonicalId);
          return [canonicalId, product];
        } catch {
          return [canonicalId, null];
        }
      })
    );

    // fast access 
    const canonicalMap = new Map(canonicalProducts);

    // canoonical is the fetched one.
    return cartItems.map((item) => {
      const canonicalId = normalizeProductId(item.id);
      const product = canonicalMap.get(canonicalId);
      return buildFreshSnapshotForItem(item, product);
    });
  },
};

export const orderAPI = {
  // Submit order to JSONPlaceholder
  submitOrder: async (orderData) => {
    try {
      if (SIMULATE_INVALID_API_RESPONSE) {
        return {
          status: 'submitted',
          timestamp: new Date().toISOString(),
          data: orderData,
        };
      }

      const response = await jsonPlaceholderAPI.post('/posts', {
        title: `Order ${orderData.id}`,
        body: JSON.stringify(orderData),
        userId: 1,
      });

      return {
        id: response.data.id,
        orderId: orderData.id,
        status: 'submitted',
        timestamp: new Date().toISOString(),
        data: orderData,
      };
    } catch (error) {
      console.error('Error submitting order:', error);
      throw error;
    }
  },

  // Retry order submission
  retryOrder: async (orderData, idempotencyKey) => {
    try {
      // Check if order already exists (idempotency)
      const response = await jsonPlaceholderAPI.post('/posts', {
        title: `Order ${orderData.id}`,
        body: JSON.stringify({
          ...orderData,
          idempotencyKey,
          retryCount: (orderData.retryCount || 0) + 1,
        }),
        userId: 1,
      });

      return {
        id: response.data.id,
        orderId: orderData.id,
        status: 'retried',
        timestamp: new Date().toISOString(),
        idempotencyKey,
      };
    } catch (error) {
      console.error('Error retrying order:', error);
      throw error;
    }
  },
};

export default {
  productAPI,
  catalogSnapshotAPI,
  orderAPI,
};

function normalizeProductId(id) {
  const numeric = Number(id);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return numeric;
  }
  // Product list uses synthetic duplicates above 20;
  //  map them back to canonical FakeStore IDs.
  return ((numeric - 1) % 20) + 1;
}

function buildFreshSnapshotForItem(cartItem, product) {
  if (!product) {
    return {
      cartItemId: String(cartItem.id),
      productId: String(cartItem.id),
      isRemoved: true,
      reason: 'Product not found in fresh catalog snapshot',
    };
  }

  const batch = Math.floor((Number(cartItem.id) - 1) / 20);
  const title = batch > 0 ? `${product.title} (${batch})` : product.title;

  return {
    cartItemId: String(cartItem.id),
    productId: String(cartItem.id),
    title,
    category: product.category || null,
    variant: batch > 0 ? `batch-${batch}` : 'default',
    price: Number(product.price) || 0,
    stock: Number(product.stock ?? product.rating?.count ?? 0),
    isRemoved: false,
  };
}
