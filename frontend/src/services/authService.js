/**
 * authService.js — Gestión de sesión del usuario en el frontend
 *
 * Abstrae todas las operaciones de autenticación:
 *  - Login: llama al backend, almacena token y perfil en localStorage
 *  - Logout: limpia localStorage y redirige a /login
 *  - Estado de sesión: isAuthenticated() y getCurrentUser() para
 *    que los componentes lean el estado sin acceder a localStorage directamente
 *
 * El token se almacena en localStorage['token'] y el perfil en localStorage['user'].
 * El interceptor de api.js lee el token automáticamente en cada request,
 * por lo que no es necesario setearlo manualmente después del login.
 */
import api from './api';

const authService = {
  /**
   * Envía credenciales al backend y persiste la sesión si son válidas.
   * @param {string} username
   * @param {string} password
   * @returns {object} Respuesta del servidor { success, data: { token, user } }
   */
  login: async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });

      if (response.data.success) {
        // Persistir token y perfil para requests futuros y recargas de página
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));

        // Configurar el header por defecto de axios para esta sesión del navegador
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;
      }

      return response.data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },

  /**
   * Cierra la sesión: limpia localStorage y redirige al login.
   * No hace petición al backend porque los JWT son stateless (el token expira solo).
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  },

  /**
   * Retorna el perfil del usuario actualmente autenticado.
   * @returns {{ id, username, role, ... } | null}
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Verifica si hay un token de sesión activo.
   * NOTA: no valida si el token ha expirado — eso lo detecta el backend en el próximo request.
   * @returns {boolean}
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  /** Retorna el JWT almacenado, o null si no hay sesión. */
  getToken: () => {
    return localStorage.getItem('token');
  }
};

export default authService;