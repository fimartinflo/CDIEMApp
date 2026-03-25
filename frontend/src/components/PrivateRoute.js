import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import authService from '../services/authService';

// Ruta protegida por autenticación (genérica)
const PrivateRoute = () => {
  const isAuthenticated = authService.isAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

// Ruta protegida por rol — redirige al home del rol si no tiene acceso
export const RoleRoute = ({ allowedRoles }) => {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user?.role)) {
    // Redirige al home correspondiente al rol del usuario
    const home = user?.role === 'administracion' ? '/reports' : '/dashboard';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
