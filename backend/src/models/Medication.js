/**
 * Medication.js — Modelo de medicamentos
 *
 * Doble función en el sistema:
 *  1. Inventario: stock, precio, vencimiento, alertas de stock mínimo
 *  2. Registro clínico: se referencia desde SessionMedication para
 *     registrar qué medicamentos se administraron en cada sesión
 *     y a qué precio (snapshot histórico para facturación)
 *
 * El campo `activo` implementa borrado lógico — un medicamento inactivo
 * no aparece en listas pero se preserva en el historial de sesiones.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Medication = sequelize.define('Medication', {
  nombre:          { type: DataTypes.STRING,  allowNull: false },
  descripcion:       DataTypes.STRING,
  cantidad:        { type: DataTypes.INTEGER, defaultValue: 0 },
  unidad:          { type: DataTypes.STRING,  defaultValue: 'unidad' },
  precio:          { type: DataTypes.INTEGER, defaultValue: 0 },   // Precio unitario en CLP
  fechaExpiracion:   DataTypes.DATEONLY,
  proveedor:         DataTypes.STRING,
  // Umbral de alerta: si cantidad <= minimoStock se muestra advertencia en UI
  minimoStock:     { type: DataTypes.INTEGER, defaultValue: 10 },
  /**
   * Categoría farmacológica.
   * Valores esperados: 'quimioterapia' | 'premedicacion' | 'antieméticos' | 'soporte' | 'general'
   */
  categoria:       { type: DataTypes.STRING,  defaultValue: 'general' },
  /**
   * Campos farmacéuticos para el Excel COP (hoja "Hora Sillón" y "Descripción").
   * Se ingresan al crear o editar el medicamento en Inventario.
   */
  codigoInterno:   { type: DataTypes.STRING, allowNull: true },  // Código interno CDIEM
  principioActivo: { type: DataTypes.STRING, allowNull: true },  // Molécula activa
  laboratorio:     { type: DataTypes.STRING, allowNull: true },  // Fabricante/distribuidor
  activo:          { type: DataTypes.BOOLEAN, defaultValue: true }  // Borrado lógico
});

module.exports = Medication;

