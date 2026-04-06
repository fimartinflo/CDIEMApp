/**
 * @file App.js
 * @description Componente raíz de la aplicación CDIEMApp.
 *
 * Define el árbol de rutas completo usando React Router v7.
 * Aplica el tema MUI global y la estrategia de acceso basada en roles.
 *
 * Estructura de rutas:
 *   /login                  → público (sin autenticación requerida)
 *   /                       → redirige a /dashboard (o /login si no autenticado)
 *   /*                      → cualquier ruta desconocida → DefaultRedirect
 *
 *   Dentro de <PrivateRoute> (requiere JWT válido en localStorage):
 *     Dentro de <Layout> (barra lateral + AppBar):
 *       /dashboard           → todos los roles autenticados
 *       /patients            → admin, enfermera
 *       /chairs              → admin, enfermera
 *       /inventory           → admin, enfermera, administracion
 *       /reports             → admin, administracion
 *       /users               → admin únicamente
 *
 * Guardas de acceso:
 *   - <PrivateRoute>  → verifica que exista un token en localStorage
 *   - <RoleRoute>     → verifica que el rol del usuario esté en allowedRoles;
 *                        si no, redirige a /dashboard en lugar de mostrar error
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Importar páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Chairs from './pages/Chairs';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Users from './pages/Users';

// Importar componentes
import PrivateRoute, { RoleRoute } from './components/PrivateRoute';
import Layout from './components/Layout';
import authService from './services/authService';

/**
 * Tema MUI global de la aplicación.
 * Colores seleccionados para contexto clínico/oncológico:
 *   - primary (#1976d2): azul institucional
 *   - secondary (#dc004e): rojo para acciones destructivas
 */
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

/**
 * Componente de redirección inteligente para rutas raíz y desconocidas.
 *
 * Si el usuario no está autenticado → redirige a /login.
 * Si está autenticado → redirige a /dashboard (punto de entrada universal
 * para todos los roles; el Dashboard filtra las tarjetas según el rol).
 *
 * La variable `user` se lee pero no se usa para la redirección porque todos
 * los roles comparten /dashboard como home. Se conserva por si en el futuro
 * se necesite redirigir a rutas distintas según rol.
 *
 * @returns {JSX.Element} Elemento <Navigate> con la ruta de destino
 */
const DefaultRedirect = () => {
  const user = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
};

/**
 * Componente principal App.
 * Envuelve toda la aplicación en:
 *   1. ThemeProvider — aplica el tema MUI personalizado
 *   2. CssBaseline — normaliza estilos del navegador (equivalente a CSS reset)
 *   3. Router — habilita el enrutamiento del lado del cliente (BrowserRouter)
 *
 * @returns {JSX.Element} Árbol de rutas completo de la aplicación
 */
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Ruta pública — no requiere autenticación */}
          <Route path="/login" element={<Login />} />

          {/*
           * Rutas privadas — <PrivateRoute> actúa como layout sin UI:
           * si no hay token redirige a /login, si hay token renderiza <Outlet>
           * (es decir, el árbol de rutas hijas, que a su vez usa <Layout>)
           */}
          <Route element={<PrivateRoute />}>
            {/*
             * <Layout> provee AppBar + Drawer lateral.
             * También renderiza <Outlet> para que las rutas hijas
             * aparezcan dentro del área de contenido principal.
             */}
            <Route element={<Layout />}>

              {/* Accesible para todos los roles autenticados */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/*
               * Módulos clínicos — solo admin y enfermera.
               * <RoleRoute> renderiza <Outlet> si el rol es permitido;
               * en caso contrario redirige silenciosamente a /dashboard.
               */}
              <Route element={<RoleRoute allowedRoles={['admin', 'enfermera']} />}>
                <Route path="/patients" element={<Patients />} />
                <Route path="/chairs" element={<Chairs />} />
              </Route>

              {/* Inventario — tres roles tienen acceso de lectura; escritura controlada en backend */}
              <Route element={<RoleRoute allowedRoles={['admin', 'enfermera', 'administracion']} />}>
                <Route path="/inventory" element={<Inventory />} />
              </Route>

              {/* Reportes — admin ve todo; administracion genera informes y exporta */}
              <Route element={<RoleRoute allowedRoles={['admin', 'administracion']} />}>
                <Route path="/reports" element={<Reports />} />
              </Route>

              {/* Gestión de usuarios — exclusivo admin */}
              <Route element={<RoleRoute allowedRoles={['admin']} />}>
                <Route path="/users" element={<Users />} />
              </Route>

            </Route>
          </Route>

          {/* Ruta raíz y catch-all — redirige según estado de autenticación */}
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
