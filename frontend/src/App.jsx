import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import SolverPage from './pages/SolverPage';
import AuthenticationPage from './pages/AuthenticationPage';
import ProtectedRoute from './components/authentication/ProtectedRoute';
import DatabasePage from './pages/DatabasePage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      {/* Always‐visible navbar */}
      <NavBar />

      {/* Your route tree */}
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthenticationPage />} />

        {/* All routes below require a valid auth token */}
        <Route element={<ProtectedRoute />}>
          <Route path="/solver" element={<SolverPage />} />
          <Route path="/db" element={<DatabasePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback for any unmatched URL */}
        <Route path="*" element={<div>Page Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;