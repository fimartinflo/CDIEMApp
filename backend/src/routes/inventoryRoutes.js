/**
 * inventoryRoutes.js — Rutas de inventario de medicamentos
 *
 * Política de acceso:
 *  - Lectura (GET):   admin + enfermera + administracion
 *  - Escritura (POST/PUT/DELETE): admin + administracion
 *    → la enfermera puede ver el inventario pero NO modificarlo
 *
 * Montado en app.js como: app.use('/api/inventory', inventoryRoutes)
 */
const express   = require('express');
const router    = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authMiddleware }  = require('../middleware/auth');
const allowRoles = require('../middleware/roles');

// Aplicar autenticación y lectura a todos los endpoints de inventario
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
