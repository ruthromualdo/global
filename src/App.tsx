import React, { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStoreProvider } from './hooks/useAppStore';
import { ToastContainer } from './components/UI';
import { RequireAdminRoute } from './components/RequireAdminRoute';
import { RequireParticipantRoute } from './components/RequireParticipantRoute';

import { PublicLayout } from './layouts/PublicLayout';
import { ParticipantLayout } from './layouts/ParticipantLayout';

import { LandingPage } from './pages/LandingPage';
import {
  LoginPage,
  PasswordRecoveryPage,
  PrivacyPolicyPage,
  RegisterPage,
  TermsOfUsePage,
} from './pages/AuthPages';

import { ParticipantDashboard } from './pages/ParticipantDashboard';
import { MissionsCenterPage } from './pages/MissionsCenterPage';
import { StartupsPage } from './pages/StartupsPage';
import { RankingPage } from './pages/RankingPage';
import { ProfilePage } from './pages/ProfilePage';

// Carregamento sob demanda das páginas administrativas para reduzir o bundle inicial no celular
const AdminLayout = lazy(() =>
  import('./layouts/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);
const AdminLoginPage = lazy(() =>
  import('./pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminStartupsPage = lazy(() =>
  import('./pages/admin/AdminStartupsPage').then((m) => ({ default: m.AdminStartupsPage }))
);
const AdminMissionsPage = lazy(() =>
  import('./pages/admin/AdminMissionsPage').then((m) => ({ default: m.AdminMissionsPage }))
);
const AdminValidationPage = lazy(() =>
  import('./pages/admin/AdminValidationPage').then((m) => ({ default: m.AdminValidationPage }))
);
const AdminParticipantsPage = lazy(() =>
  import('./pages/admin/AdminParticipantsPage').then((m) => ({ default: m.AdminParticipantsPage }))
);
const AdminRankingPage = lazy(() =>
  import('./pages/admin/AdminRankingPage').then((m) => ({ default: m.AdminRankingPage }))
);
const AdminSettingsPage = lazy(() =>
  import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage }))
);
const AdminReportsPage = lazy(() =>
  import('./pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage }))
);
const AdminGovernancePage = lazy(() =>
  import('./pages/admin/AdminGovernancePage').then((m) => ({ default: m.AdminGovernancePage }))
);

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-[#071812] text-tutu-light flex items-center justify-center p-6">
    <div className="text-xs font-medium text-tutu-light/70 animate-pulse">Carregando...</div>
  </div>
);

export const App: React.FC = () => {
  return (
    <AppStoreProvider>
      <HashRouter>
        <ToastContainer />
        <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/recuperar-senha" element={<PasswordRecoveryPage />} />
            <Route path="/termos" element={<TermsOfUsePage />} />
            <Route path="/privacidade" element={<PrivacyPolicyPage />} />
          </Route>

          {/* Participant Area Routes */}
          <Route path="/app" element={<ParticipantLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <RequireParticipantRoute>
                  <ParticipantDashboard />
                </RequireParticipantRoute>
              }
            />
            <Route
              path="missoes"
              element={
                <RequireParticipantRoute>
                  <MissionsCenterPage />
                </RequireParticipantRoute>
              }
            />
            <Route path="startups" element={<StartupsPage />} />
            <Route path="ranking" element={<RankingPage />} />
            <Route
              path="perfil"
              element={
                <RequireParticipantRoute>
                  <ProfilePage />
                </RequireParticipantRoute>
              }
            />
          </Route>

          {/* Exclusive Administrative Authentication Route */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Protected Administrative Area Routes (RBAC: ADMIN only) */}
          <Route
            path="/admin"
            element={
              <RequireAdminRoute>
                <AdminLayout />
              </RequireAdminRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="startups" element={<AdminStartupsPage />} />
            <Route path="missoes" element={<AdminMissionsPage />} />
            <Route path="validacao" element={<AdminValidationPage />} />
            <Route path="participantes" element={<AdminParticipantsPage />} />
            <Route path="ranking" element={<AdminRankingPage />} />
            <Route path="configuracoes" element={<AdminSettingsPage />} />
            <Route path="relatorios" element={<AdminReportsPage />} />
            <Route path="governanca" element={<AdminGovernancePage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </HashRouter>
    </AppStoreProvider>
  );
};
export default App;
