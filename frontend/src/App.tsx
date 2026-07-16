import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from './components/ui/toaster';
import { Loader2 } from 'lucide-react';

// Lazy load page chunks for bundle optimization & code splitting
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const StudioPage = lazy(() => import('./pages/StudioPage').then(m => ({ default: m.StudioPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage').then(m => ({ default: m.FeaturesPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const GalleryPage = lazy(() => import('./pages/GalleryPage').then(m => ({ default: m.GalleryPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));

function PageLoader() {
  return (
    <div className="h-screen w-full bg-background flex flex-col items-center justify-center select-none">
      <Loader2 className="animate-spin text-primary mb-4" size={32} />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Features Page */}
        <Route path="/features" element={<FeaturesPage />} />

        {/* Pricing Page */}
        <Route path="/pricing" element={<PricingPage />} />

        {/* Gallery Page */}
        <Route path="/gallery" element={<GalleryPage />} />

        {/* Privacy Policy Page */}
        <Route path="/privacy" element={<PrivacyPage />} />
        
        {/* Login Screen (Unauthenticated Only) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Signin/Register Screen (Unauthenticated Only) */}
        <Route
          path="/signin"
          element={
            <PublicRoute>
              <LoginPage defaultIsRegister={true} />
            </PublicRoute>
          }
        />
        
        {/* Dashboard (Protected) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        
        {/* Studio (Protected) */}
        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <StudioPage />
            </ProtectedRoute>
          }
        />
        
        {/* Admin Dashboard (Protected by AdminRoute) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        
        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Toaster />
      <div className="min-h-screen bg-background text-foreground overflow-hidden font-sans">
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <AnimatedRoutes />
          </Suspense>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}
