import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';

// Pages
import Login from './pages/Login';
import RegisterOwner from './pages/RegisterOwner';
import Home from './pages/Home';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import MyTractors from './pages/MyTractors';
import KhataBook from './pages/KhataBook';
import Bookings from './pages/Bookings';
import OwnerPublicProfile from './pages/OwnerPublicProfile';
import Staff from './pages/Staff';
import Notifications from './pages/Notifications';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register-owner" element={<RegisterOwner />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/owner/:id" element={<ProtectedRoute><OwnerPublicProfile /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin', 'admin_staff']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/my-tractors" element={
              <ProtectedRoute allowedRoles={['owner', 'driver']}>
                <MyTractors />
              </ProtectedRoute>
            } />
            
            <Route path="/staff" element={
              <ProtectedRoute allowedRoles={['owner', 'driver']}>
                <Staff />
              </ProtectedRoute>
            } />
            
            <Route path="/khata" element={
              <ProtectedRoute allowedRoles={['owner', 'driver']}>
                <KhataBook />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
