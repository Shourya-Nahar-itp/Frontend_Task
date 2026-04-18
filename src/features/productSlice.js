import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productAPI } from '../services/api';
import { storageService } from '../services/storageService';

// Async thunks
// we are exporting them here only.
// they will be used in the components to dispatch actions and fetch data from the API.
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      // Check cache first
      const cached = storageService.getProductsCache();
      if (cached) {
        console.log('Using cached products');
        return shuffleProducts([...cached]);
      }

      // Fetch from API
      const response = await productAPI.getProducts();
      
      // Generate duplicate items to simulate large dataset (500-1000 items)
      let products = response.data;
      const originalLength = products.length;
      while (products.length < 500) {
        products = [
          ...products,
          ...response.data.map((p, idx) => ({
            ...p,
            id: p.id + originalLength * Math.floor(products.length / originalLength),
            title: `${p.title} (${Math.floor(products.length / originalLength)})`,
          })),
        ];
      }

      products = shuffleProducts(products);

      // Cache the products
      storageService.saveProductsCache(products);

      return products;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'products/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const categories = await productAPI.getCategories();
      return categories;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchProductsByCategory = createAsyncThunk(
  'products/fetchProductsByCategory',
  async (category, { rejectWithValue }) => {
    try {
      const products = await productAPI.getProductsByCategory(category);
      return { category, products: shuffleProducts(products) };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  items: [],
  categories: [],
  selectedCategory: null,
  loading: false,
  error: null,
  filters: {
    search: '',
    sortBy: 'random', // random, title, price, rating
    sortOrder: 'asc', // asc, desc
    priceRange: [0, 1000],
  },
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setSearchFilter: (state, action) => {
      state.filters.search = action.payload;
    },
    setSortBy: (state, action) => {
      state.filters.sortBy = action.payload.sortBy;
      state.filters.sortOrder = action.payload.sortOrder || 'asc';
    },
    setPriceRange: (state, action) => {
      state.filters.priceRange = action.payload;
    },
    setCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.selectedCategory = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
        state.loading = false;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchProductsByCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
        state.items = action.payload.products;
        state.selectedCategory = action.payload.category;
        state.loading = false;
      })
      .addCase(fetchProductsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setSearchFilter,
  setSortBy,
  setPriceRange,
  setCategory,
  resetFilters,
} = productSlice.actions;

// Selectors
// directly use in useSelector in the components to get the state of products,
//  filters, categories, loading and error.

// in use selector u get global state so need to mention state name then 
// the property you want to access in that state.
export const selectProducts = (state) => state.products.items;
export const selectFilters = (state) => state.products.filters;
export const selectCategories = (state) => state.products.categories;
export const selectLoading = (state) => state.products.loading;
export const selectError = (state) => state.products.error;


// get products based on filters.
export const selectFilteredProducts = (state) => {
  const { items, filters, selectedCategory } = state.products;
  let filtered = [...items];

  // Search filter
  if (filters.search) {
    filtered = filtered.filter((product) =>
      product.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      product.description?.toLowerCase().includes(filters.search.toLowerCase())
    );
  }

  if (selectedCategory) {
    filtered = filtered.filter((product) => product.category === selectedCategory);
  }

  // Price filter
  filtered = filtered.filter(
    (product) =>
      product.price >= filters.priceRange[0] &&
      product.price <= filters.priceRange[1]
  );

  // Sorting
  if (filters.sortBy === 'random') {
    return filtered;
  }

  filtered.sort((a, b) => {
    const aVal = getSortValue(a, filters.sortBy);
    const bVal = getSortValue(b, filters.sortBy);

    if (aVal === bVal) {
      return 0;
    }

    if (filters.sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    }

    return aVal < bVal ? 1 : -1;
  });

  return filtered;
};

export default productSlice.reducer;

function shuffleProducts(products) {
  const shuffled = [...products];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function getSortValue(product, sortBy) {
  if (sortBy === 'rating') {
    return Number(product.rating?.rate) || 0;
  }

  const value = product[sortBy];

  if (typeof value === 'string') {
    return value.toLowerCase();
  }

  return Number(value) || 0;
}
