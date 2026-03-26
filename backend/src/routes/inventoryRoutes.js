const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authMiddleware } = require('../middleware/auth');
const allowRoles = require('../middleware/roles');

// Todas las rutas requieren auth; lectura: admin + enfermera + administracion
router.use(authMiddleware);
router.use(allowRoles('admin', 'enfermera', 'administracion'));

// Lectura: todos los roles con acceso
router.get('/alerts', inventoryController.getAlerts);
router.get('/', inventoryController.getAllItems);
router.get('/:id', inventoryController.getItemById);

// Escritura: admin y administracion (enfermera solo lee)
router.post('/', allowRoles('admin', 'administracion'), inventoryController.createItem);
router.put('/:id/quantity', allowRoles('admin', 'administracion'), inventoryController.updateQuantity);
router.put('/:id', allowRoles('admin', 'administracion'), inventoryController.updateItem);
router.delete('/:id', allowRoles('admin', 'administracion'), inventoryController.deleteItem);

module.exports = router;
