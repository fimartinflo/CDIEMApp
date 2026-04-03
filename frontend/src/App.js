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

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

// Redirige al home del rol correspondiente después del login
const DefaultRedirect = () => {
  const user = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />

          {/* Rutas privadas */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>

              {/* Todos los roles autenticados: dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Admin + enfermera: módulos clínicos */}
              <Route element={<RoleRoute allowedRoles={['admin', 'enfermera']} />}>
                <Route path="/patients" element={<Patients />} />
                <Route path="/chairs" element={<Chairs />} />
              </Route>

              {/* Admin + enfermera + administracion: inventario */}
              <Route element={<RoleRoute allowedRoles={['admin', 'enfermera', 'administracion']} />}>
                <Route path="/inventory" element={<Inventory />} />
              </Route>

              {/* Admin + administracion: reportes */}
              <Route element={<RoleRoute allowedRoles={['admin', 'administracion']} />}>
                <Route path="/reports" element={<Reports />} />
              </Route>

              {/* Admin only: gestión de usuarios */}
              <Route element={<RoleRoute allowedRoles={['admin']} />}>
                <Route path="/users" element={<Users />} />
              </Route>

            </Route>
          </Route>

          {/* Ruta por defecto — redirige según rol */}
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
