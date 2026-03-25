const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authMiddleware } = require('../middleware/auth');
const allowRoles = require('../middleware/roles');

// Rutas de búsqueda sin auth (autocomplete)
router.get('/search', patientController.searchPatients);
router.get('/upcoming-visits', patientController.getUpcomingVisits);

// Resto de rutas: requieren auth + rol clínico (admin o enfermera)
router.use(authMiddleware);
router.use(allowRoles('admin', 'enfermera'));

router.get('/', patientController.getAllPatients);
router.get('/:id', patientController.getPatientById);
router.post('/', patientController.createPatient);
router.put('/:id', patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);
router.post('/:id/schedule-visit', patientController.scheduleVisit);

module.exports = router;
