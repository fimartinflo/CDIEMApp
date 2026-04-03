const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const allowRoles = require('../middleware/roles');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);

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