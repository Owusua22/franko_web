import { cartAddFeedback } from "../utils/cartItems.mjs";
import { getProductUrl } from "../utils/productSlug";
import {
  HeartIcon as OutlineHeartIcon,
  HeartIcon as SolidHeartIcon,
  ShoppingCartIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon
} from "@heroicons/react/24/solid";
import Tooltip from "@material-tailwind/react/components/Tooltip";
import useAddToCart from "./Cart";
import { useDispatch, useSelector } from "react-redux";
import {
  addToWishlist,
  removeFromWishlist,
} from "../Redux/Slice/wishlistSlice";
import { useState, useEffect } from "react";

// Custom Notification Component
const Notification = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto-hide after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const Icon = type === 'success' ? CheckCircleIcon : XCircleIcon;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[300px]`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-auto text-white/80 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Format price
// Format price with ₵
const formatPrice = (price) =>
  new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    currencyDisplay: "symbol", // Force symbol instead of code
  }).format(price || 0);


// Image formatter
const getValidImageUrl = (imagePath) => {
  if (!imagePath) return "https://via.placeholder.com/150";
  return imagePath.includes("\\")
    ? `https://testing.frankotrading.com/Media/Products_Images/${imagePath.split("\\").pop()}`
    : imagePath;
};

// Skeleton
const SkeletonCard = () => (
  <div className="animate-pulse bg-white rounded-2xl shadow-md p-4 space-y-4">
    <div className="h-40 bg-gray-200 rounded-xl"></div>
    <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
    <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
  </div>
);

const ProductCard = ({ currentProducts = [], navigate, loading = false }) => {
  const dispatch = useDispatch();
  const wishlist = useSelector((state) => state.wishlist.items);
  const { addProductToCart, loading: cartLoading } = useAddToCart();

  // Notification state
  const [notification, setNotification] = useState({
    message: '',
    type: 'success', // 'success' or 'error'
    isVisible: false
  });

  const showNotification = (message, type = 'success') => {
    setNotification({
      message,
      type,
      isVisible: true
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  const isInWishlist = (id) => wishlist.some((item) => item.id === id);

  const handleWishlistToggle = async (product) => {
    try {
      const id = product.id || product.productID;
      if (isInWishlist(id)) {
        dispatch(removeFromWishlist(id));
        showNotification("Removed from wishlist", "success");
      } else {
        dispatch(addToWishlist({ ...product, id }));
        showNotification("Added to wishlist", "success");
      }
    } catch  {
      showNotification("Failed to update wishlist", "error");
    }
  };

  const handleAddToCart = async (product) => {
    try {
      await addProductToCart(product);
      showNotification("Added to cart successfully", "success");
    } catch (error) {
      const feedback = cartAddFeedback(error);
      showNotification(feedback.message, feedback.type);
    }
  };

  return (
    <>
      {/* Notification Component */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : currentProducts.map((product, index) => {
              const {
                productID,
                productName,
                productImage,
                price,
                oldPrice,
              } = product;

              const imageUrl = getValidImageUrl(productImage);
              const isOnSale = oldPrice > 0 && oldPrice > price;
              const inWishlist = isInWishlist(productID);

              return (
                <div
                  key={productID || index}
                  className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
                >
                  <div className="relative overflow-hidden">
                    {isOnSale && (
                      <span className="absolute top-2 left-2 bg-red-400 text-white text-xs font-semibold w-10 h-10 rounded-full z-10 flex items-center justify-center">
                        SALE
                      </span>
                    )}

                    <div
                      className="h-40 md:h-52 w-full flex items-center justify-center cursor-pointer"
                      onClick={() => navigate(getProductUrl({ productName }))}
                    >
                      <img loading="lazy" decoding="async"
                        src={imageUrl}
                        alt={productName}
                        className="h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                   <div
  className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-3 bg-black/40 z-20 transition-all cursor-pointer"
  onClick={() => navigate(getProductUrl(product))}
>
  {/* Wishlist Icon */}
  <Tooltip content={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}>
    <button
      className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        handleWishlistToggle(product);
      }}
    >
      {inWishlist ? (
        <SolidHeartIcon className="w-5 h-5 text-red-500" />
      ) : (
        <OutlineHeartIcon className="w-5 h-5 text-white hover:text-red-400" />
      )}
    </button>
  </Tooltip>

  {/* View Details */}
  <Tooltip content="View Details">
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(getProductUrl(product));
      }}
      className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
    >
      <EyeIcon className="w-5 h-5 text-white hover:text-green-400" />
    </button>
  </Tooltip>

  {/* Add to Cart */}
  <Tooltip content={product.stock === 0 ? "Out of Stock" : "Add to Cart"}>
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleAddToCart(product);
      }}
      className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={cartLoading || product.stock === 0}
    >
      <ShoppingCartIcon className="w-5 h-5 text-white hover:text-red-400" />
    </button>
  </Tooltip>
</div>

                  </div>

                  {/* Product Info */}
                 <div className="p-3 text-center space-y-1">
  <h3 className="text-sm text-gray-800 line-clamp-2">
    {productName || "Franko Trading"}
  </h3>

  <div className="flex flex-col items-center justify-center gap-1 mt-1 md:flex-row">
    <span className="text-red-500 font-medium text-sm">
      {formatPrice(price)}
    </span>
    {oldPrice > 0 && (
      <span className="text-xs line-through text-gray-400">
        {formatPrice(oldPrice)}
      </span>
    )}
  </div>
</div>

                </div>
              );
            })}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default ProductCard;