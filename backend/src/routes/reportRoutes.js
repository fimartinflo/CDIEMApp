const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/roles');

// Reportes: solo admin y administracion (rol contable)
router.get('/', auth, allowRoles('admin', 'administracion'), reportController.getReport);
router.get('/patient/:id', auth, allowRoles('admin', 'administracion'), reportController.getPatientReport);
router.post('/email', auth, allowRoles('admin', 'administracion'), reportController.sendEmail);
router.post('/cop-excel', auth, allowRoles('admin', 'administracion'), reportController.generateCopExcel);

module.exports = router;
