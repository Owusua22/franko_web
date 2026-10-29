import { publicGet } from "../../utils/publicReadCache";
import { dedupeRequests, normalizeProductDetails } from "../../utils/productPresentation.mjs";
import { getCatalogue } from "../../utils/catalogueCache";
// productSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "./AxiosInstance";
import { productCodesStorage } from "../../utils/productCodesStorage";

/* ---------------------------
  Helpers
----------------------------*/

const resolveProductCodeFromBranch = (branchProducts = [], productData = {}) => {
  const list = Array.isArray(branchProducts) ? branchProducts : [];

  if (productData?.ProductId2) return productData.ProductId2;
  if (productData?.productId2) return productData.productId2;
  if (productData?.productCode) return productData.productCode;

  const name = (productData?.productName ?? productData?.ProductName ?? "").trim();
  if (name) {
    const foundByName = list.find(
      (p) => (p?.productName ?? "").trim().toLowerCase() === name.toLowerCase()
    );
    if (foundByName?.productCode) return foundByName.productCode;
    if (foundByName?.ProductId2) return foundByName.ProductId2;
    if (foundByName?.productId2) return foundByName.productId2;
  }

  return null;
};

const withAutoProductCode = (productData, branchProducts) => {
  const isFormData = productData instanceof FormData;

  if (!isFormData) {
    const resolvedCode = resolveProductCodeFromBranch(branchProducts, productData);
    const finalProductId2 = productData.ProductId2 || productData.productId2 || resolvedCode || "";
    const { ...rest } = productData || {};
    return { ...rest, ProductId2: finalProductId2 };
  }

  const fd = new FormData();
  let existingProductId2 = null;

  for (const [key, value] of productData.entries()) {
    if (key === "ProductId2") {
      existingProductId2 = value;
      fd.append(key, value);
    } else if (key === "productId2" || key === "productCode") {
      if (!existingProductId2) existingProductId2 = value;
    } else {
      fd.append(key, value);
    }
  }

  if (!existingProductId2) {
    const tempObj = {};
    for (const [key, value] of productData.entries()) tempObj[key] = value;
    const resolvedCode = resolveProductCodeFromBranch(branchProducts, tempObj);
    if (resolvedCode) fd.set("ProductId2", resolvedCode);
  } else {
    fd.set("ProductId2", existingProductId2);
  }

  return fd;
};

// Merge saved codes with products
const mergeCodesWithProducts = (products) => {
  if (!Array.isArray(products)) return [];
  
  // Load from our storage
  const savedCodes = productCodesStorage.load();
  const codesCount = Object.keys(savedCodes).length;
  
  if (codesCount > 0) {
    // Codes loaded from storage
  }

  return products.map((product) => {
    const productId = product?.productID || product?.Productid;
    if (!productId) return product;

    const savedCode = savedCodes[String(productId)];
    if (savedCode) {
      return {
        ...product,
        ProductId2: savedCode,
        productId2: savedCode,
        productCode: savedCode,
      };
    }
    return product;
  });
};

/* ===========================
   ASYNC THUNKS
=========================== */

export const addProduct = createAsyncThunk(
  "products/addProduct",
  async (productData, { rejectWithValue, getState }) => {
    try {
      const branchProducts = getState()?.branchProducts?.data;
      const normalizedPayload = withAutoProductCode(productData, branchProducts);
      const isFormData = normalizedPayload instanceof FormData;

      let productId2ToStore = null;
      if (isFormData) {
        productId2ToStore = normalizedPayload.get("ProductId2");
      } else {
        productId2ToStore = normalizedPayload.ProductId2;
      }

      const response = await axiosInstance.post("/", normalizedPayload, {
        params: { endpoint: "/Product/Product-Post" },
        headers: isFormData
          ? { "Content-Type": "multipart/form-data" }
          : { "Content-Type": "application/json" },
      });

      const newProduct = response.data;
      
      // Save to storage immediately
      const productId = newProduct?.productID || newProduct?.Productid;
      if (productId && productId2ToStore) {
        productCodesStorage.addCode(productId, productId2ToStore);
      }

      return { product: newProduct, productId2: productId2ToStore };
    } catch (error) {
      return rejectWithValue(error.response?.data ?? error.message ?? "Failed to add product");
    }
  }
);

export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async (productData, { rejectWithValue, getState }) => {
    try {
      const branchProducts = getState()?.branchProducts?.data;
      const { Productid, ...restData } = productData || {};
      const normalizedRest = withAutoProductCode(restData, branchProducts);
      const productId2ToStore = normalizedRest.ProductId2;

      const { data } = await axiosInstance.post("/", normalizedRest, {
        params: { endpoint: `/Product/Product_Put/${Productid}` },
        headers: { accept: "text/plain", "Content-Type": "application/json" },
      });

      // Save to storage immediately
      if (Productid && productId2ToStore) {
        productCodesStorage.addCode(Productid, productId2ToStore);
      }

      return {
        response: data,
        productId: Productid,
        productId2: productId2ToStore,
        updatedData: normalizedRest,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to update product");
    }
  }
);

export const updateProductImage = createAsyncThunk(
  "products/updateProductImage",
  async ({ productID, imageFile }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("ProductId", productID);
      formData.append("ImageName", imageFile, imageFile.name);

      const response = await axiosInstance.post("/", formData, {
        params: { endpoint: "/Product/Product-Image-Edit" },
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to update product image");
    }
  }
);

export const fetchAllProducts = createAsyncThunk(
  "products/fetchAllProducts",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getCatalogue();

      if (!Array.isArray(data)) return [];

      const sorted = data.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
      
      // Merge with saved codes from storage
      return mergeCodesWithProducts(sorted);
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch all products");
    }
  }
);

export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (options = {}, { rejectWithValue }) => {
    try {
      const { data } = await getCatalogue({ forceRefresh: options?.forceRefresh === true });

      if (!Array.isArray(data)) return [];

      const filtered = data
        .filter((product) => product.status == 1)
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

      return mergeCodesWithProducts(filtered);
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch products");
    }
  }
);

export const fetchProduct = createAsyncThunk(
  "products/fetchProduct",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getCatalogue();

      if (!Array.isArray(data)) return [];

      const filtered = data
        .filter((product) => product.status == 1)
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
        .slice(0, 10);

      return mergeCodesWithProducts(filtered);
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch product");
    }
  }
);

export const fetchPaginatedProducts = createAsyncThunk(
  "products/fetchPaginatedProducts",
  async ({ pageNumber, pageSize = 10 }, { rejectWithValue }) => {
    try {
      const { data } = await publicGet("/", {
        params: {
          endpoint: "/Product/Product-Get-Paginated",
          PageNumber: pageNumber,
          PageSize: pageSize,
        },
      });

      if (!Array.isArray(data)) return [];

      const sorted = data.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
      return mergeCodesWithProducts(sorted);
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch products");
    }
  }
);

export const fetchProductsByCategory = createAsyncThunk(
  "products/fetchProductsByCategory",
  async (arg, { rejectWithValue }) => {
    const categoryId = typeof arg === "object" ? arg.id : arg;
    const forceRefresh = typeof arg === "object" && arg.forceRefresh === true;
    try {
      const { data } = await publicGet("/", {
        params: { endpoint: `/Product/Product-Get-by-Category/${categoryId}` },
        refresh: forceRefresh,
      });

      if (!Array.isArray(data)) return { categoryId, products: [] };

      return { categoryId, products: mergeCodesWithProducts(data) };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch products by category");
    }
  }
);

export const fetchProductsByBrand = createAsyncThunk(
  "products/fetchProductsByBrand",
  async (arg, { rejectWithValue }) => {
    const brandId = typeof arg === "object" ? arg.id : arg;
    const forceRefresh = typeof arg === "object" && arg.forceRefresh === true;
    try {
      const { data } = await publicGet("/", {
        params: { endpoint: `/Product/Product-Get-by-Brand/${brandId}` },
        refresh: forceRefresh,
      });

      if (!Array.isArray(data)) return [];

      const sorted = data.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
      return mergeCodesWithProducts(sorted);
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch products by brand");
    }
  }
);

export const fetchProductsByShowroom = createAsyncThunk(
  "products/fetchProductsByShowroom",
  async (arg, { rejectWithValue }) => {
    const showRoomID = typeof arg === "object" ? arg.id : arg;
    const forceRefresh = typeof arg === "object" && arg.forceRefresh === true;
    try {
      const { data } = await publicGet("/", {
        params: { endpoint: `/Product/Product-Get-by-ShowRoom/${showRoomID}` },
        refresh: forceRefresh,
      });

      if (!Array.isArray(data)) return { showRoomID, products: [] };

      const sorted = data.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
      return { showRoomID, products: mergeCodesWithProducts(sorted) };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch products by showroom");
    }
  }
);

const requestProductDetails = dedupeRequests(productId => publicGet("/", {
  params: { endpoint: `/Product/Product-Get-by-Product_ID/${productId}` },
}));

export const fetchProductById = createAsyncThunk(
  "products/fetchProductById",
  async (productId, { rejectWithValue }) => {
    try {
      const { data } = await requestProductDetails(productId);
      return mergeCodesWithProducts(normalizeProductDetails(data));
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch product by ID");
    }
  }
);

export const fetchActiveProducts = createAsyncThunk(
  "products/fetchActiveProducts",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await publicGet("/", {
        params: { endpoint: "/Product/Product-Get-Active" },
      });

      if (!Array.isArray(data)) return [];
      return mergeCodesWithProducts(data);
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch active products");
    }
  }
);

export const fetchInactiveProducts = createAsyncThunk(
  "products/fetchInactiveProducts",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await publicGet("/", {
        params: { endpoint: "/Product/Product-Get-0" },
      });

      if (!Array.isArray(data)) return [];
      return mergeCodesWithProducts(data);
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to fetch inactive products");
    }
  }
);

export const fetchProductByShowroomAndRecord = createAsyncThunk(
  "products/fetchProductByShowroomAndRecord",
  async ({ showRoomCode, recordNumber, forceRefresh = false }, { rejectWithValue }) => {
    try {
      const { data } = await publicGet("/", {
        params: {
          endpoint: "/Product/Product-Get-by-ShowRoom_RecordNumber",
          ShowRommCode: showRoomCode,
          RecordNumber: recordNumber,
        },
        refresh: forceRefresh === true,
      });

      if (!Array.isArray(data)) return { showRoomCode, products: [] };

      const sorted = data.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
      return { showRoomCode, products: mergeCodesWithProducts(sorted) };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to fetch product by showroom and record number"
      );
    }
  }
);

/* ===========================
   SLICE
=========================== */

const productSlice = createSlice({
  name: "products",
  initialState: {
    products: [],
    currentPage: 1,
    filteredProducts: [],
    brandProducts: [],
    productsByShowroom: {},
    productsByCategory: {},
    currentProduct: null,
    productDetailLoading: false,
    productDetailError: null,
    productDetailRequestId: null,
    activeProducts: [],
    inactiveProducts: [],
    loading: false,
    error: null,
  },
  reducers: {
    setPage: (state, action) => {
      state.currentPage = action.payload;
    },
    clearProducts: (state) => {
      state.products = [];
      state.filteredProducts = [];
      state.productsByShowroom = {};
      state.currentProduct = null;
      state.error = null;
    },
    resetProducts: (state) => {
      state.products = [];
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
    // Manual update of product code in state
    updateProductCode: (state, action) => {
      const { productId, code } = action.payload;
      if (!productId || !code) return;
      
      // Save to storage
      productCodesStorage.addCode(productId, code);
      
      // Update in state
      const index = state.products.findIndex(
        (p) => p.productID === productId || p.Productid === productId
      );
      if (index !== -1) {
        state.products[index] = {
          ...state.products[index],
          ProductId2: code,
          productId2: code,
          productCode: code,
        };
      }
    },
    clearAllProductCodes: () => {
      productCodesStorage.clear();
    },
  },
  extraReducers: (builder) => {
    builder
      // Add Product
      .addCase(addProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.loading = false;
        const { product, productId2 } = action.payload;

        const enrichedProduct = {
          ...product,
          ProductId2: productId2,
          productId2: productId2,
          productCode: productId2,
        };

        state.products.unshift(enrichedProduct);
     
      })
      .addCase(addProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Update Product
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const { productId, productId2, updatedData } = action.payload;

        const index = state.products.findIndex(
          (item) => item.productID === productId || item.Productid === productId
        );

        if (index !== -1) {
          state.products[index] = {
            ...state.products[index],
            ...updatedData,
            ProductId2: productId2,
            productId2: productId2,
            productCode: productId2,
          };
        }

      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Update Product Image
      .addCase(updateProductImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProductImage.fulfilled, (state, action) => {
        state.loading = false;
        const updatedProduct = action.payload;
        const index = state.products.findIndex(
          (item) =>
            item.productID === updatedProduct.productID ||
            item.Productid === updatedProduct.Productid
        );
        if (index !== -1) {
          state.products[index] = { ...state.products[index], ...updatedProduct };
        }
      })
      .addCase(updateProductImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch All Products
      .addCase(fetchAllProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchAllProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Product (top 10)
      .addCase(fetchProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Products by Brand
      .addCase(fetchProductsByBrand.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsByBrand.fulfilled, (state, action) => {
        state.loading = false;
        state.brandProducts = action.payload;
      })
      .addCase(fetchProductsByBrand.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Products by Category
      .addCase(fetchProductsByCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.productsByCategory[action.payload.categoryId] = action.payload.products;
      })
      .addCase(fetchProductsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Products by Showroom
      .addCase(fetchProductsByShowroom.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsByShowroom.fulfilled, (state, action) => {
        state.loading = false;
        const { showRoomID, products } = action.payload;
        state.productsByShowroom[showRoomID] = products;
      })
      .addCase(fetchProductsByShowroom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Detail requests must not be blocked by unrelated catalogue/brand reads.
      .addCase(fetchProductById.pending, (state, action) => {
        state.productDetailLoading = true;
        state.productDetailError = null;
        state.productDetailRequestId = action.meta.requestId;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        if (state.productDetailRequestId !== action.meta.requestId) return;
        state.productDetailLoading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        if (state.productDetailRequestId !== action.meta.requestId) return;
        state.productDetailLoading = false;
        state.productDetailError = action.payload || action.error.message;
      })

      // Fetch Paginated Products
      .addCase(fetchPaginatedProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaginatedProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchPaginatedProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Active Products
      .addCase(fetchActiveProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.activeProducts = action.payload;
      })
      .addCase(fetchActiveProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Inactive Products
      .addCase(fetchInactiveProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInactiveProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.inactiveProducts = action.payload;
      })
      .addCase(fetchInactiveProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Product by Showroom and Record
      .addCase(fetchProductByShowroomAndRecord.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductByShowroomAndRecord.fulfilled, (state, action) => {
        state.loading = false;
        const { showRoomCode, products } = action.payload;
        state.productsByShowroom[showRoomCode] = products;
      })
      .addCase(fetchProductByShowroomAndRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const {
  clearProducts,
  setPage,
  clearCurrentProduct,
  resetProducts,
  updateProductCode,
  clearAllProductCodes,
} = productSlice.actions;

export default productSlice.reducer;

// Export storage for direct access if needed
export { productCodesStorage };