const { error } = require('../utils/response');

module.exports = function (...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return error(res, 'No autenticado', 'NOT_AUTHENTICATED', 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return error(res, 'No tienes permisos para esta acción', 'FORBIDDEN', 403);
    }

    next();
  };
};
