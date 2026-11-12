import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Navbar from './components/Navbar';

import Landing          from './pages/Landing';
import Login            from './pages/Login';
import Register         from './pages/Register';
import Find             from './pages/Find';
import WorkerPassport   from './pages/WorkerPassport';
import MyJobs           from './pages/MyJobs';
import WorkerDashboard  from './pages/WorkerDashboard';
import VerifierDashboard from './pages/VerifierDashboard';
import Chat             from './pages/Chat';
import AdminDashboard   from './pages/AdminDashboard';

function RequireAuth({ children, roles }) {
  const { user, isAuth } = useAuth();
  if (!isAuth)                    return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes({ lang, setLang }) {
  return (
    <>
      <Navbar lang={lang} setLang={setLang} />
      <Routes>
        <Route path="/"             element={<Landing lang={lang} />} />
        <Route path="/login"        element={<Login   lang={lang} />} />
        <Route path="/register"     element={<Register lang={lang} />} />
        <Route path="/find"         element={<Find    lang={lang} />} />
        <Route path="/workers/:id"  element={<WorkerPassport lang={lang} />} />
        <Route path="/chat"         element={<Chat    lang={lang} />} />

        <Route path="/my/jobs" element={
          <RequireAuth roles={['customer']}><MyJobs lang={lang} /></RequireAuth>
        } />
        <Route path="/worker" element={
          <RequireAuth roles={['worker']}><WorkerDashboard lang={lang} /></RequireAuth>
        } />
        <Route path="/verifier" element={
          <RequireAuth roles={['verifier', 'admin']}><VerifierDashboard lang={lang} /></RequireAuth>
        } />
        <Route path="/admin" element={
          <RequireAuth roles={['admin']}><AdminDashboard /></RequireAuth>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('vp_lang') || 'en');

  const changeLang = (l) => {
    localStorage.setItem('vp_lang', l);
    setLang(l);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes lang={lang} setLang={changeLang} />
      </BrowserRouter>
    </AuthProvider>
  );
}
