const express = require('express');
const router = express.Router();
const chairController = require('../controllers/chairController');

// Obtener todos los sillones
router.get('/', chairController.getAllChairs);

// Obtener sillones disponibles
router.get('/disponibles', chairController.getAvailableChairs);

// Obtener sillones ocupados
router.get('/ocupados', chairController.getOccupiedChairs);

// Crear nuevo sillón
router.post('/', chairController.createChair);

// Actualizar sillón
router.put('/:id', chairController.updateChair);

// Eliminar sillón (borrado lógico)
router.delete('/:id', chairController.deleteChair);

// Asignar paciente a sillón
router.post('/:id/asignar', chairController.assignPatient);

// Liberar sillón
router.post('/:id/liberar', chairController.releaseChair);

// Obtener historial del sillón
router.get('/:id/historial', chairController.getChairHistory);

// Reiniciar sillón
router.post('/:id/reiniciar', chairController.resetChair);

module.exports = router;