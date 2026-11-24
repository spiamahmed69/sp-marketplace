import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { LanguageProvider } from './context/LanguageContext'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { WishlistProvider } from './context/WishlistContext'
import Navbar from './components/Navbar'
import SyncBanner from './components/SyncBanner'
import { isDemoMode } from './lib/firebase'
import { syncFromFirestore } from './lib/firestore'
import Footer from './components/Footer'
import MobileBottomNav from './components/MobileBottomNav'
import ProtectedRoute from './components/ProtectedRoute'
import { ProductCardSkeleton } from './components/States'

// Lazy-loaded routes — code splitting per page.
const Home = lazy(() => import('./pages/Home'))
const Products = lazy(() => import('./pages/Products'))
const ProductDetails = lazy(() => import('./pages/ProductDetails'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Profile = lazy(() => import('./pages/Profile'))
const Orders = lazy(() => import('./pages/Orders'))
const OrderTracking = lazy(() => import('./pages/OrderTracking'))
const Reviews = lazy(() => import('./pages/Reviews'))
const Contact = lazy(() => import('./pages/Contact'))
const About = lazy(() => import('./pages/About'))
const FAQ = lazy(() => import('./pages/FAQ'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const NotFound = lazy(() => import('./pages/NotFound'))
const SellerRegister = lazy(() => import('./pages/SellerRegister'))
const SellerDashboard = lazy(() => import('./pages/seller/SellerDashboard'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))

function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <ProductCardSkeleton key={i} />)}</div>
    </div>
  )
}

// Every route change starts the new page at the very top (instant, no scroll
// animation). Hash-only changes are left alone so anchor links still work.
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])
  return null
}

export default function App() {
  // Production: load the Firestore cache once, then re-render the pages with
  // the real data whenever a sync finishes (initial load, login/logout).
  const [, setSyncTick] = useState(0)
  useEffect(() => {
    if (isDemoMode) return undefined
    syncFromFirestore()
    const onSync = () => setSyncTick((t) => t + 1)
    window.addEventListener('sp:firestore-sync', onSync)
    return () => window.removeEventListener('sp:firestore-sync', onSync)
  }, [])
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <BrowserRouter>
                <ScrollToTop />
                <div className="flex min-h-screen flex-col pb-16 md:pb-0">
                  <SyncBanner />
                  <Navbar />
                  <main className="flex-1">
                    <Suspense fallback={<Loading />}>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/products" element={<Products mode="all" />} />
                        <Route path="/category/:slug" element={<Products mode="category" />} />
                        <Route path="/search" element={<Products mode="search" />} />
                        <Route path="/product/:id" element={<ProductDetails />} />
                        <Route path="/cart" element={<Cart />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/wishlist" element={<Wishlist />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/seller/register" element={<SellerRegister />} />
                        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                        <Route path="/track/:id" element={<OrderTracking />} />
                        <Route path="/track" element={<OrderTracking />} />
                        <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/faq" element={<FAQ />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/seller" element={<ProtectedRoute roles={['seller', 'admin']}><SellerDashboard /></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute roles={['admin', 'moderator']}><AdminDashboard /></ProtectedRoute>} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </main>
                  <Footer />
                  <MobileBottomNav />
                </div>
              </BrowserRouter>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  )
}
