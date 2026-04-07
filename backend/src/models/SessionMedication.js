/**
 * SessionMedication.js — Registro de medicamentos administrados en una sesión
 *
 * Tabla intermedia entre ChairSession y Medication.
 * Cada fila representa un medicamento que se administró durante una sesión activa.
 *
 * Diseño de precio histórico:
 *   precioUnitario captura el precio del medicamento en el MOMENTO de la administración.
 *   Esto es fundamental para facturación: el precio puede cambiar en el inventario
 *   después de la sesión, pero el costo de esa sesión debe quedar fijo.
 *
 * Las FK (sessionId, medicationId) se definen en models/index.js.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SessionMedication = sequelize.define('SessionMedication', {
  cantidadAdministrada: { type: DataTypes.INTEGER, allowNull: false },
  // Snapshot del precio al momento de administrar — no se actualiza si el precio cambia
  precioUnitario:      { type: DataTypes.INTEGER, defaultValue: 0 },
  horaAdministracion:  { type: DataTypes.DATE,    defaultValue: DataTypes.NOW }
});

module.exports = SessionMedication;
