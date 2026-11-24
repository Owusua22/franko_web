import { getProductUrl } from "../utils/productSlug";
import React, { useState , useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, X, Plus, Star, Filter } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { removeFromWishlist } from "../Redux/Slice/wishlistSlice";

import { PLACEHOLDER_IMAGE, PRODUCT_IMAGE_BASE } from "../config/media";

const Wishlist = () => {
  const wishlist = useSelector((state) => state.wishlist.items);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState("newest");
   useEffect(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

  const getImageUrl = (path) =>
    path?.includes("\\")
      ? `${PRODUCT_IMAGE_BASE}${path.split("\\").pop()}`
      : path || PLACEHOLDER_IMAGE;

  const handleCardClick = (product) => {
    navigate(getProductUrl(product));
  };

  const handleRemove = (e, productID) => {
    e.stopPropagation();
    dispatch(removeFromWishlist(productID));
  };

  const sortedWishlist = [...wishlist].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return parseFloat(a.price) - parseFloat(b.price);
      case "price-high":
        return parseFloat(b.price) - parseFloat(a.price);
      case "name":
        return String(a.productName || "").localeCompare(
          String(b.productName || "")
        );
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Enhanced Header */}
      <div className="relative bg-gradient-to-r from-red-500 via-pink-500 to-red-600 overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent"></div>

        <div className="relative max-w-7xl mx-auto px-6 py-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-6 shadow-lg">
            <Heart className="w-8 h-8 text-white fill-current animate-pulse" />
          </div>

          <h1 className="text-2xl md:text-2xl font-bold mb-4 text-white drop-shadow-lg">
            My Wishlist
          </h1>

          <p className="text-sm md:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
            {wishlist.length === 0
              ? "Curate your perfect collection of dream items"
              : `${wishlist.length} carefully selected item${wishlist.length !== 1 ? "s" : ""} awaiting your attention`}
          </p>

          {/* Decorative Elements */}
          <div className="absolute top-8 left-8 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-8 right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {wishlist.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative inline-flex items-center justify-center w-32 h-32 mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-red-100 to-pink-100 rounded-full animate-pulse"></div>
              <div className="relative bg-white rounded-full p-6 shadow-lg">
                <ShoppingBag className="w-12 h-12 text-gray-400" />
              </div>
            </div>

            <h3 className="text-3xl font-bold text-gray-800 mb-4">
              Your wishlist awaits
            </h3>

            <p className="text-gray-600 max-w-md mx-auto leading-relaxed mb-8">
              Start exploring and add products that catch your eye. Your perfect finds are just a click away.
            </p>

            <button
              onClick={() => navigate('/products')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-3 rounded-full font-semibold hover:from-red-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Heart className="w-5 h-5 text-red-500 fill-current" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {wishlist.length} Item{wishlist.length !== 1 ? "s" : ""}
                  </h2>
                  <p className="text-sm text-gray-500">Ready to purchase</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="name">Name A-Z</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Enhanced Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedWishlist.map((item, index) => (
                <div
                  key={item.productID || index}
                  onClick={() => handleCardClick(item)}
                  className="group cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-red-200 relative transform hover:-translate-y-1"
                >
                  {/* Enhanced Image Container */}
                  <div className="relative overflow-hidden aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
                    <img
                      src={getImageUrl(item.productImage)}
                      alt={item.productName}
                      className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    {/* Enhanced Remove Button */}
                    <button
                      onClick={(e) => handleRemove(e, item.id || item.productID)}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 hover:shadow-xl transition-all duration-200 transform hover:scale-110 opacity-0 group-hover:opacity-100"
                      title="Remove from wishlist"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>

                    {/* Wishlist Badge */}
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                      <Heart className="w-3 h-3 fill-current" />
                      Saved
                    </div>
                  </div>

                  {/* Enhanced Info Section */}
                  <div className="p-6 space-y-3">
                    <h3 className="text-gray-800 text-sm font-medium leading-tight line-clamp-2 group-hover:text-red-600 transition-colors duration-200 min-h-[2.5rem]">
                      {item.productName}
                    </h3>

                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-red-500">
                        GH₵ {parseFloat(item.price).toFixed(2)}
                      </div>

                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-500">4.5</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:from-red-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wishlist;