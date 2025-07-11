import { Routes, Route, useLocation } from 'react-router-dom'
import Nav from './Component/Nav/Navbar'
import Home from './Pages/Home'
import About from './Pages/About'
import Contact from './Pages/Contact'
import BrandsPage from './Pages/Brands'
import ShowroomProductsPage from './Pages/ShowRooomProducts'
import Phones from './Pages/Phones'
import ProductDescription from './Pages/ProductDescription'
import ProductCard from './Component/ProductCard'
import Cart from './Pages/Cart'
import Laptops from './Pages/Laptops'
import Fridge from './Pages/Fridge'
import Television from './Pages/Television'
import Speakers from './Pages/Speaker'
import Accessories from './Pages/Accessories'
import Appliances from './Pages/Appliances'
import Combo from './Pages/Combo'
import Airconditioners from './Pages/AC'
import Checkout from './Pages/Checkout'
import OrderReceived from './Pages/OrderReceived'
import Locations from './Pages/Locations'
import Cancellation from './Pages/OrderCancelled'
import AdminPage from './Pages/AdminPages/AdminPanel'
import Dashboard from './Pages/AdminPages/Dashboard'
import Orders from './Pages/AdminPages/Orders/Orders'
import AdminProducts from './Pages/AdminPages/Products/AdminProducts'
import Adminbrands from './Pages/AdminPages/Adminbrands'
import AdminCategory from './Pages/AdminPages/AdminCategory'
import AdminShowroom from './Pages/AdminPages/AdminShowroom'
import Users from './Pages/AdminPages/Users'
import Customers from './Pages/AdminPages/Customers'
import AdvertisementPage from './Pages/AdminPages/Advertisement'
import Account from './Pages/Account'
import Products from './Pages/Products'
import Terms from './Pages/Terms'
import OrderHistory from './Pages/OrderHistory'
import Wishlist from './Pages/Wishlist'

function App() {
  const location = useLocation()

  // Hide Navbar for any /admin path
  const hideNavbar = location.pathname.startsWith('/admin')

  return (
    <>
      {!hideNavbar && <Nav />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/phones" element={<Phones ProductCard={ProductCard} />} />
        <Route path="/laptops" element={<Laptops ProductCard={ProductCard} />} />
        <Route path="/refrigerator" element={<Fridge ProductCard={ProductCard} />} />
        <Route path="/television" element={<Television ProductCard={ProductCard} />} />
        <Route path="/Speakers" element={<Speakers ProductCard={ProductCard} />} />
        <Route path="/accessories" element={<Accessories ProductCard={ProductCard} />} />
        <Route path="/appliances" element={<Appliances ProductCard={ProductCard} />} />
        <Route path="/combo" element={<Combo ProductCard={ProductCard} />} />
        <Route path="/air-conditioners" element={<Airconditioners ProductCard={ProductCard} />} />
        <Route path="/cart/:cartId" element={<Cart />} />
        <Route path="/product/:productID" element={<ProductDescription />} />
        <Route path="showroom/:showRoomID" element={<ShowroomProductsPage />} />
        <Route path="/order-history" element={<OrderHistory />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/brand/:brandId" element={<BrandsPage />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/products" element={<Products />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-received" element={<OrderReceived />} />
        <Route path="/account" element={<Account />} />
        <Route path="/shops" element={<Locations />} />
        <Route path="/order-cancelled" element={<Cancellation />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminPage />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="brands" element={<Adminbrands />} />
          <Route path="categories" element={<AdminCategory />} />
          <Route path="users" element={<Users />} />
          <Route path="customers" element={<Customers />} />
          <Route path="showroom" element={<AdminShowroom />} />
          <Route path="banner" element={<AdvertisementPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
