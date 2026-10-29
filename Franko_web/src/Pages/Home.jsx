import { productPageModule } from "../utils/productPageModule";
import DeferredSection from '../Component/DeferredSection';
import { lazy, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Carousel from '../Component/Carousel';
import CategoryComponent from '../Component/CategoryComponent';
const BestSellers = lazy(() => import('../Component/BestSellers'));
import Deals from '../Component/Deals';
import InfoBanner from '../Component/InfoBanner';
const LaptopDeals = lazy(() => import('../Component/LaptopDeal'));
const FridgeDeals = lazy(() => import('../Component/FridgeDeals'));
import BrandsBanner from '../Component/BrandsBanner';
const PhoneDeals = lazy(() => import('../Component/PhoneDeals'));
const TeleDeals = lazy(() => import('../Component/TeleDeals'));
const NewArrivals = lazy(() => import('../Component/NewArrivals'));
import Footer from '../Component/Footer';



function Home() {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const warm = () => { productPageModule().catch(() => {}); };
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(warm, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(warm, 500);
    return () => clearTimeout(id);
  }, []);

  return (
    <div onPointerOver={() => { productPageModule().catch(() => {}); }} onFocus={() => { productPageModule().catch(() => {}); }}>
      <Helmet>
        <title>Franko Trading | Best Phones, Laptops & Electronics Deals in Ghana</title>
        <meta
          name="description"
          content="Shop top‑quality smartphones, laptops, TVs, home appliances, and accessories at Franko Trading. Get unbeatable prices, fast delivery across Ghana."
        />
        <meta
          name="keywords"
          content="gadgets, phones, laptops, electronics, aircondition, washing machine, cctv camera, router, tablets, televisions, blender, microwave, pendrive, speaker, accessories, Ghana"
        />
        <meta name="author" content="Franko Trading Enterprise" />
        <meta property="og:title" content="Franko Trading | Home" />
        <meta
          property="og:description"
          content="Discover unbeatable deals on mobile phones, laptops, and electronic accessories at Franko Trading. Quality products, great prices, and fast delivery across Ghana."
        />
        <meta
          property="og:image"
          content={`${window.location.origin}/frankoIcon.png`}
        />
        <meta property="og:url" content="https://www.frankotrading.com" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Franko Trading | Home" />
        <meta
          name="twitter:description"
          content="Shop Franko Trading for mobile phones, laptops, and tech accessories in Ghana. Affordable prices, premium quality, and trusted service."
        />
        <meta
          name="twitter:image"
          content="https://www.frankotrading.com/frankoIcon.png"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>

      <Carousel />

      <CategoryComponent />

      <Deals />
      <DeferredSection><BestSellers /></DeferredSection>
      <InfoBanner />
      <DeferredSection><PhoneDeals /></DeferredSection>
      <DeferredSection><LaptopDeals /></DeferredSection>
      <DeferredSection><FridgeDeals /></DeferredSection>
      <DeferredSection><TeleDeals /></DeferredSection>
      <BrandsBanner />
      <DeferredSection><NewArrivals /></DeferredSection>
      <Footer />
    </div>
  );
}

export default Home;
