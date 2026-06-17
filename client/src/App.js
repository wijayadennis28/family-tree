import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import PrivateRoute from './components/ui/PrivateRoute';
import Dashboard from './components/stats/StatsOverview'; // placeholder
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import MemberList from './components/members/MemberList';
import MemberForm from './components/members/MemberForm';
import FamilyTree from './components/tree/FamilyTree';
import EventList from './components/events/EventList';
import EventForm from './components/events/EventForm';
import PhotoGallery from './components/gallery/PhotoGallery';
import NotificationPanel from './components/notifications/NotificationPanel';
import StatsOverview from './components/stats/StatsOverview';
import GenerationChart from './components/stats/GenerationChart';
import BranchDistribution from './components/stats/BranchDistribution';
import UserManagement from './components/admin/UserManagement';
import AuditLogViewer from './components/admin/AuditLogViewer';
import RoleManager from './components/admin/RoleManager';
import InvitationForm from './components/admin/InvitationForm';

function App() {
  const { user, loading } = React.useContext(AuthContext);

  if (loading) return <div>Loading…</div>;

  return (
    <BrowserRouter>
      <div className="app">
        <Header user={user} />
        <div className="app-body">
          <Sidebar />
          <main className="app-main">
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected – require authentication */}
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/members"
                element={
                  <PrivateRoute>
                    <MemberList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/members/new"
                element={
                  <PrivateRoute>
                    <MemberForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="/members/:id/edit"
                element={
                  <PrivateRoute>
                    <MemberForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="/tree/:memberId"
                element={
                  <PrivateRoute>
                    <FamilyTree />
                  </PrivateRoute>
                }
              />
              <Route
                path="/events"
                element={
                  <PrivateRoute>
                    <EventList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/events/new"
                element={
                  <PrivateRoute>
                    <EventForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="/gallery"
                element={
                  <PrivateRoute>
                    <PhotoGallery />
                  </PrivateRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <PrivateRoute>
                    <NotificationPanel />
                  </PrivateRoute>
                }
              />
              <Route
                path="/stats"
                element={
                  <PrivateRoute>
                    <StatsOverview />
                  </PrivateRoute>
                }
              />
              <Route
                path="/stats/generations"
                element={
                  <PrivateRoute>
                    <GenerationChart />
                  </PrivateRoute>
                }
              />
              <Route
                path="/stats/branches"
                element={
                  <PrivateRoute>
                    <BranchDistribution />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <PrivateRoute>
                    <UserManagement />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <PrivateRoute>
                    <AuditLogViewer />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/roles"
                element={
                  <PrivateRoute>
                    <RoleManager />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/invitations"
                element={
                  <PrivateRoute>
                    <InvitationForm />
                  </PrivateRoute>
                }
              />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
