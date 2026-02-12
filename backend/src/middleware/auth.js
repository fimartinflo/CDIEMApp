const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

const SECRET = process.env.JWT_SECRET || 'cdiem_secret_dev';

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return error(res, 'Token requerido', 'TOKEN_REQUIRED', 401);
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return error(res, 'Token inválido', 'TOKEN_INVALID', 401);
  }

  try {
    const decoded = jwt.verify(token, SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    return error(res, 'Token expirado o inválido', 'TOKEN_EXPIRED', 401);
  }
};
