import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

import PrivateRoute from './components/ui/PrivateRoute';
import PageTransition from './components/ui/PageTransition';
import Login from './components/auth/Login';
import MemberList from './components/members/MemberList';
import MemberProfile from './components/members/MemberProfile';
import MemberForm from './components/members/MemberForm';
import FamilyTree from './components/tree/FamilyTree';
import PublicFamilyTree from './components/tree/PublicFamilyTree';
import Families from './components/families/Families';
import BranchTree from './components/families/BranchTree';
import NotificationPanel from './components/notifications/NotificationPanel';
import RoleManager from './components/admin/RoleManager';
import AbilitiesManager from './components/admin/AbilitiesManager';
import UserManagement from './components/admin/UserManagement';
import Settings from './components/settings/Settings';

function SuperAdminRoute({ children }) {
  const { user } = React.useContext(AuthContext);
  if (user?.role !== 'Super Admin') return <Navigate to="/" replace />;
  return children;
}

function AppContent() {  const { user, loading, primaryFamily } = React.useContext(AuthContext);
  const location = useLocation();
  const isLogin = location.pathname.replace(/\/$/,'') === '/login';
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isPublicTree = /^\/public\/families\/[^/]+\/tree\/?$/.test(location.pathname);
  const publicPaths = ['/login', '/register', '/forgot-password'];
  const isPublicPath = publicPaths.includes(location.pathname) || isPublicTree;

  if (loading && !isPublicTree) return <div>Loading...</div>;

  const isSuperAdmin = user?.role === 'Super Admin';
  if (user && !isSuperAdmin && !primaryFamily && !isPublicPath && location.pathname !== '/families') {
    return <Navigate to="/families" replace />;
  }

  return (
    <div className="app">
      {!isLogin && !isPublicTree && <Header onMenuToggle={() => setMobileMenuOpen(o => !o)} />}
      <div className="app-body">
        {!isLogin && !isPublicTree && <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />}
        <main className={`app-main${isPublicTree ? ' app-main-public-tree' : ''}`}>
          <Routes>
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/" element={<Navigate to="/people" replace />} />            <Route path="/people" element={
                <PrivateRoute>
                  <PageTransition><MemberList /></PageTransition>
                </PrivateRoute>
              }
            />
            <Route
              path="/people/new"
              element={
                <PrivateRoute>
                  <PageTransition><MemberForm /></PageTransition>
                </PrivateRoute>
              }
            />
            <Route
              path="/people/:slug/edit"
              element={
                <PrivateRoute>
                  <PageTransition><MemberForm /></PageTransition>
                </PrivateRoute>
              }
            />
            <Route
              path="/people/:slug"
              element={
                <PrivateRoute>
                  <PageTransition><MemberProfile /></PageTransition>
                </PrivateRoute>
              }
            />
            <Route
              path="/families"
              element={
                <PrivateRoute>
                  <PageTransition><Families /></PageTransition>
                </PrivateRoute>
              }
            />
            <Route
              path="/families/:familyId/branches"
              element={
                <PrivateRoute>
                  <PageTransition><BranchTree /></PageTransition>
                </PrivateRoute>
              }
            />
            <Route
              path="/families/:familySlug/tree"
              element={
                <PrivateRoute>
                  <PageTransition><FamilyTree /></PageTransition>
                </PrivateRoute>
              }
            />
            <Route
              path="/public/families/:familySlug/tree"
              element={
                <PageTransition><PublicFamilyTree /></PageTransition>
              }
            />
            <Route
              path="/atlas/:memberSlug"
              element={
                <PrivateRoute>
                  <PageTransition><FamilyTree /></PageTransition>
                </PrivateRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <PrivateRoute>
                  <PageTransition><NotificationPanel /></PageTransition>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/roles"
              element={
                <PrivateRoute>
                  <PageTransition><RoleManager /></PageTransition>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/abilities"
              element={
                <PrivateRoute>
                  <PageTransition><AbilitiesManager /></PageTransition>
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <PrivateRoute>
                  <SuperAdminRoute>
                    <PageTransition><UserManagement /></PageTransition>
                  </SuperAdminRoute>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <PageTransition><Settings /></PageTransition>
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
