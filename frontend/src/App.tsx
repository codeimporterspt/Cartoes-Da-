import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useBrandTheme } from './hooks/useBrandTheme';
import Layout from './components/layout/Layout';
import UsersLayout from './components/layout/UsersLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import BrandSelector from './BrandSelector';
import PrizesPage from './pages/user/PrizesPage';
import CardsPage from './pages/user/CardsPage';
import ValidationPage from './pages/admin/ValidationPage';
import CardBalancePage from './pages/admin/CardBalancePage';
import OriginsPage from './pages/admin/OriginsPage';
import AdminCardsPage from './pages/admin/AdminCardsPage';
import ImportsPage from './pages/admin/ImportsPage';
import CardLoadingHistoryPage from './pages/admin/CardLoadingHistoryPage';
import ConcessoesPage from './pages/admin/ConcessoesPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'VALIDADOR' ? '/backoffice/validacao' : '/premios'} replace />;
  }
  return <>{children}</>;
}

function NavigateByRole() {
  const { user } = useAuthStore();
  return <Navigate to={user?.role === 'VALIDADOR' ? '/backoffice/validacao' : '/premios'} replace />;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();
  useBrandTheme();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/driveevents" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/driveevents" replace /> : <RegisterPage />}
      />
      <Route
        path="/driveevents"
        element={<ProtectedRoute><BrandSelector /></ProtectedRoute>}
      />
      <Route
        path="/utilizadores"
        element={<ProtectedRoute roles={['ADMIN', 'IMPORTADOR']}><UsersLayout /></ProtectedRoute>}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<NavigateByRole />} />
        <Route path="premios" element={<ProtectedRoute roles={['ADMIN', 'IMPORTADOR', 'USER']}><PrizesPage /></ProtectedRoute>} />
        <Route path="cartoes" element={<ProtectedRoute roles={['ADMIN', 'IMPORTADOR', 'USER']}><CardsPage /></ProtectedRoute>} />
        <Route
          path="backoffice/validacao"
          element={
            <ProtectedRoute roles={['ADMIN', 'IMPORTADOR', 'VALIDADOR']}>
              <ValidationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="backoffice/saldo-cartao"
          element={
            <ProtectedRoute roles={['ADMIN', 'IMPORTADOR']}>
              <CardBalancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="backoffice/origens"
          element={
            <ProtectedRoute roles={['ADMIN', 'IMPORTADOR']}>
              <OriginsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="backoffice/cartoes"
          element={
            <ProtectedRoute roles={['ADMIN', 'IMPORTADOR']}>
              <AdminCardsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="backoffice/importacoes"
          element={
            <ProtectedRoute roles={['ADMIN', 'IMPORTADOR']}>
              <ImportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="backoffice/historico"
          element={
            <ProtectedRoute roles={['ADMIN', 'IMPORTADOR']}>
              <CardLoadingHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="backoffice/concessoes"
          element={
            <ProtectedRoute roles={['ADMIN', 'IMPORTADOR']}>
              <ConcessoesPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/driveevents" : "/login"} replace />} />
    </Routes>
  );
}
