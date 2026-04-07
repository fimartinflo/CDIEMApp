/**
 * middleware/auth.js — Verificación de token JWT
 *
 * Valida el token Bearer en el header Authorization de cada request protegido.
 * Si el token es válido, adjunta el payload decodificado a req.user para
 * que los controllers y el middleware de roles puedan acceder a él.
 *
 * Se exporta de dos formas para compatibilidad con distintos patrones de importación:
 *   const auth = require('./middleware/auth')                  → default export
 *   const { authMiddleware } = require('./middleware/auth')    → named export
 */
const jwt         = require('jsonwebtoken');
const { error }   = require('../utils/response');

// Leer el secreto JWT desde el entorno; el fallback es inseguro y solo para desarrollo local
const SECRET = process.env.JWT_SECRET || 'cdiem_secret_dev';

/**
 * Middleware Express que verifica el JWT en el header Authorization.
 * Formato esperado: "Authorization: Bearer <token>"
 *
 * Si la verificación es exitosa, req.user queda con:
 *   { id, username, role, iat, exp }
 */
const authMiddleware = function (req, res, next) {
  const authHeader = req.headers.authorization;

  // Rechazar si no hay header de autorización en absoluto
  if (!authHeader) {
    return error(res, 'Token requerido', 'TOKEN_REQUIRED', 401);
  }

  // Extraer el token del esquema "Bearer <token>"
  const token = authHeader.split(' ')[1];

  if (!token) {
    return error(res, 'Token inválido', 'TOKEN_INVALID', 401);
  }

  try {
    // jwt.verify lanza excepción si el token está expirado, mal formado o con firma incorrecta
    const decoded = jwt.verify(token, SECRET);

    req.user = decoded; // { id, username, role, iat, exp }
    next();
  } catch (err) {
    return error(res, 'Token expirado o inválido', 'TOKEN_EXPIRED', 401);
  }
};

// Exportación dual para compatibilidad (default + named)
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
