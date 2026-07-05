import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SplashPage } from './pages/SplashPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudioPage } from './pages/StudioPage';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <div className="min-h-screen bg-[#070709] text-white overflow-hidden font-sans">
      <BrowserRouter>
        <Routes>
          {/* Splash Screen */}
          <Route path="/" element={<SplashPage />} />
          
          {/* Login Screen (Unauthenticated Only) */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
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
          
          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

