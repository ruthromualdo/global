import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStoreProvider } from './hooks/useAppStore';
import { ToastContainer } from './components/UI';
import { RequireAdminRoute } from './components/RequireAdminRoute';
import { RequireParticipantRoute } from './components/RequireParticipantRoute';

import { PublicLayout } from './layouts/PublicLayout';
import { ParticipantLayout } from './layouts/ParticipantLayout';
import { AdminLayout } from './layouts/AdminLayout';

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
import { QRScannerPage } from './pages/QRScannerPage';
import { StartupsPage } from './pages/StartupsPage';
import { RankingPage } from './pages/RankingPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { ProfilePage } from './pages/ProfilePage';

import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminStartupsPage } from './pages/admin/AdminStartupsPage';
import { AdminMissionsPage } from './pages/admin/AdminMissionsPage';
import { AdminQRCodesPage } from './pages/admin/AdminQRCodesPage';
import { AdminValidationPage } from './pages/admin/AdminValidationPage';
import { AdminParticipantsPage } from './pages/admin/AdminParticipantsPage';
import { AdminRankingPage } from './pages/admin/AdminRankingPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminGovernancePage } from './pages/admin/AdminGovernancePage';

export const App: React.FC = () => {
  return (
    <AppStoreProvider>
      <HashRouter>
        <ToastContainer />
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
            <Route
              path="escanear"
              element={
                <RequireParticipantRoute>
                  <QRScannerPage />
                </RequireParticipantRoute>
              }
            />
            <Route path="startups" element={<StartupsPage />} />
            <Route path="ranking" element={<RankingPage />} />
            <Route
              path="conquistas"
              element={
                <RequireParticipantRoute>
                  <AchievementsPage />
                </RequireParticipantRoute>
              }
            />
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
            <Route path="qrcodes" element={<AdminQRCodesPage />} />
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
      </HashRouter>
    </AppStoreProvider>
  );
};
export default App;
