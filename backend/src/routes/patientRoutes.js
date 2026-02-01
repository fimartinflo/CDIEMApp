const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authMiddleware } = require('../middleware/auth');

// Rutas de búsqueda (públicas para autocomplete)
router.get('/search', patientController.searchPatients);
router.get('/upcoming-visits', patientController.getUpcomingVisits);

// Rutas protegidas
router.use(authMiddleware);

router.get('/', patientController.getAllPatients);
router.get('/:id', patientController.getPatientById);
router.post('/', patientController.createPatient);
router.put('/:id', patientController.updatePatient);
router.post('/:id/schedule-visit', patientController.scheduleVisit);

module.exports = router;