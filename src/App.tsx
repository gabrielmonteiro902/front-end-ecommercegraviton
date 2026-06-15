import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Sidebar from './components/sideBar'
import WelcomePage from './pages/WelcomePage'
import HomePage from './pages/HomePage'
import SyncLoadingPage from './pages/SyncLoadingPage'
import ContributorsPage from './pages/ContributorsPage'
import GlobePage from './pages/GlobePage'
import TwoBodyPage from './pages/TwoBodyPage'
import TwoBodyViewPage from './pages/TwoBodyViewPage'
import SolarSystemPage from './pages/SolarSystemPage'
import GithubCallback from './pages/GithubCallback'
import './index.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <span className="w-5 h-5 rounded-full border-2 border-white/10 border-t-white animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<WelcomePage />} />
          <Route path="/auth/callback" element={<GithubCallback />} />

          {/* Rotas protegidas */}
          <Route path="/sync-loading" element={
            <ProtectedRoute>
              <SyncLoadingPage />
            </ProtectedRoute>
          } />
          <Route path="/graviton-home" element={
            <ProtectedRoute>
              <Sidebar>
                <HomePage />
              </Sidebar>
            </ProtectedRoute>
          } />
          <Route path="/contributors" element={
            <ProtectedRoute>
              <Sidebar>
                <ContributorsPage />
              </Sidebar>
            </ProtectedRoute>
          } />
          <Route path="/globe" element={
            <ProtectedRoute>
              <GlobePage />
            </ProtectedRoute>
          } />
          <Route path="/dois-corpos" element={
            <ProtectedRoute>
              <Sidebar>
                <TwoBodyPage />
              </Sidebar>
            </ProtectedRoute>
          } />
          <Route path="/dois-corpos/view" element={
            <ProtectedRoute>
              <TwoBodyViewPage />
            </ProtectedRoute>
          } />
          <Route path="/sistema-orbital" element={
            <ProtectedRoute>
              <SolarSystemPage />
            </ProtectedRoute>
          } />

          {/* Qualquer rota desconhecida → login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
