const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const allowRoles = require('../middleware/roles');

// Rate limit: máximo 10 intentos de login por IP en 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos de login. Intente de nuevo en 15 minutos.' }
});

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', loginLimiter, authController.login);

// Rutas protegidas
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/change-password', authMiddleware, authController.changePassword);
router.post('/logout', authMiddleware, authController.logout);

// Gestión de usuarios (admin only)
router.get('/users',                    authMiddleware, allowRoles('admin'), authController.listUsers);
router.post('/users',                   authMiddleware, allowRoles('admin'), authController.createUser);
router.put('/users/:id',                authMiddleware, allowRoles('admin'), authController.updateUser);
router.put('/users/:id/toggle-active',  authMiddleware, allowRoles('admin'), authController.toggleUserActive);
router.put('/users/:id/reset-password', authMiddleware, allowRoles('admin'), authController.resetPassword);

module.exports = router;