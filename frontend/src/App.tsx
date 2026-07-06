import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudioPage } from './pages/StudioPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <div className="min-h-screen bg-[#070709] text-white overflow-hidden font-sans">
      <BrowserRouter>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
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
          
          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

