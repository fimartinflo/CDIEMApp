/**
 * services/api.js — Instancia Axios configurada para el backend de CDIEMApp
 *
 * Centraliza la configuración HTTP para todos los servicios del frontend:
 *  - baseURL apunta a REACT_APP_API_URL (producción) o localhost:3001 (desarrollo)
 *  - Interceptor de request: adjunta el JWT de localStorage en cada peticion
 *  - Interceptor de response: detecta 401 (sesión expirada) y redirige al login
 *
 * Todos los servicios (authService, patientService, chairService, etc.) importan
 * esta instancia en lugar de axios directamente para heredar la configuración.
 */
import axios from 'axios';

// En desarrollo usa localhost. En producción define REACT_APP_API_URL en el .env
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Instancia compartida con timeout de 10s y Content-Type JSON por defecto
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 segundos timeout
});

// Interceptor de REQUEST: lee el token de localStorage y lo inyecta como Bearer
// en el header Authorization de cada peticion saliente.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de RESPONSE: maneja errores globales de autenticacion.
// Si el backend responde 401 (token expirado o invalido), limpia la sesion
// y redirige al login mostrando un aviso "sesion expirada" via sessionStorage.
//
// EXCEPCION: si el 401 viene del endpoint de login, NO redirige — el componente
// Login.js lo maneja mostrando el mensaje de error en pantalla.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Error en respuesta API:', error.response?.status, error.message);

    // Solo redirigir a login si el 401 NO viene del propio endpoint de login
    // (credenciales incorrectas en login deben mostrar el error, no recargar la página)
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Login.js lee este flag en su useEffect para mostrar el Snackbar de sesion expirada
      sessionStorage.setItem('session_expired', '1');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;