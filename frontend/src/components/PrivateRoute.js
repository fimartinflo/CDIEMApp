/**
 * PrivateRoute.js — Componentes de protección de rutas
 *
 * Exporta dos componentes para usar en React Router:
 *
 * 1. PrivateRoute (default export):
 *    Requiere autenticación. Si no hay token → redirige a /login.
 *    Usado como elemento de <Route> padre que envuelve rutas protegidas.
 *
 * 2. RoleRoute (named export):
 *    Requiere un rol específico. Si el usuario no tiene el rol → /dashboard.
 *    Acepta prop `allowedRoles: string[]`.
 *
 * Uso en App.js:
 *   <Route element={<PrivateRoute />}>           ← cualquier usuario autenticado
 *     <Route element={<RoleRoute allowedRoles={['admin']} />}>
 *       <Route path="/users" element={<Users />} />
 *     </Route>
 *   </Route>
 */
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import authService from '../services/authService';

/**
 * Protege rutas que requieren autenticación.
 * Renderiza <Outlet /> (las rutas anidadas) solo si el usuario está autenticado.
 */
const PrivateRoute = () => {
  const isAuthenticated = authService.isAuthenticated();
  if (!isAuthenticated) {
    // `replace` evita que /dashboard quede en el historial del navegador
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

/**
 * Protege rutas que requieren un rol específico.
 * Si el usuario no tiene el rol → redirige al dashboard en lugar del login
 * (ya está autenticado, solo no tiene permiso para esa ruta).
 *
 * @param {{ allowedRoles: string[] }} props
 */
export const RoleRoute = ({ allowedRoles }) => {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  // Por si acaso authService.isAuthenticated() falla y hay un race condition
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si el rol del usuario no está en la lista → redirigir al dashboard
  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
