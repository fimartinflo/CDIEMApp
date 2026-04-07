/**
 * middleware/roles.js — Control de acceso por rol (RBAC)
 *
 * Retorna un middleware que verifica si el usuario autenticado posee
 * alguno de los roles permitidos para la ruta.
 *
 * Debe usarse DESPUÉS de authMiddleware (que popula req.user):
 *   router.get('/ruta', authMiddleware, allowRoles('admin', 'enfermera'), handler)
 *
 * Roles disponibles: 'admin' | 'enfermera' | 'administracion'
 *
 * @param {...string} allowedRoles - Roles que tienen acceso a la ruta
 * @returns {Function} Middleware Express
 */
const { error } = require('../utils/response');

module.exports = function (...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;

    // req.user es null si authMiddleware no se aplicó antes — configuración incorrecta
    if (!user) {
      return error(res, 'No autenticado', 'NOT_AUTHENTICATED', 401);
    }

    // Verificar que el rol del usuario esté en la lista de roles permitidos
    if (!allowedRoles.includes(user.role)) {
      return error(res, 'No tienes permisos para esta acción', 'FORBIDDEN', 403);
    }

    next();
  };
};
