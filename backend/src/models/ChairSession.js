/**
 * ChairSession.js — Modelo de sesión clínica en sillón
 *
 * Registra cada vez que un paciente es asignado a un sillón.
 * El ciclo de vida de una sesión es:
 *   activa  → (al liberar) → finalizada
 *
 * Las FK (patientId, chairId) se definen en models/index.js (no aquí)
 * porque Sequelize las agrega automáticamente al definir las asociaciones.
 *
 * Duración = horaFin - horaInicio (calculada en controllers, no almacenada)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChairSession = sequelize.define('ChairSession', {
  horaInicio: { type: DataTypes.DATE, allowNull: false }, // Requerido al crear la sesión
  horaFin:      DataTypes.DATE,                           // null mientras la sesión está activa
  // Estados: 'activa' (sillón ocupado) | 'finalizada' (sillón liberado)
  estado:     { type: DataTypes.STRING, defaultValue: 'activa' },
  notas:        DataTypes.TEXT                            // Observaciones al cerrar la sesión
});

module.exports = ChairSession;
