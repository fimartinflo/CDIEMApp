const express = require('express');
const router = express.Router();

// Ruta temporal mientras creamos el controlador
router.get('/', (req, res) => {
  res.json({ message: 'Rutas de sillones funcionando' });
});

module.exports = router;