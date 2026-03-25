const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

// Todas las rutas de reporte requieren autenticación
router.get('/', auth, reportController.getReport);
router.get('/patient/:id', auth, reportController.getPatientReport);
router.post('/email', auth, reportController.sendEmail);

module.exports = router;
