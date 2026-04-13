/**
 * Middleware global de manejo de errores para Express.
 *
 * Debe registrarse como el ULTIMO middleware en app.js (despues de todas las rutas).
 * Express lo identifica como manejador de errores por los 4 parametros (err, req, res, next).
 *
 * Convierte errores de Sequelize y JWT en respuestas HTTP con codigo apropiado,
 * y devuelve el stack trace en modo desarrollo para facilitar el debugging.
 */
const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err);

  // Error de validación de Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Error de duplicado en Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Registro duplicado',
      errors: err.errors.map(e => ({
        field: e.path,
        message: 'Este valor ya existe'
      }))
    });
  }

  // Error de autenticación JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }

  // Error de token expirado
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }

  // Error generico — usa err.status si el controlador lo definió, o 500 por defecto.
  // El stack trace solo se expone en NODE_ENV=development para no filtrar info interna.
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;