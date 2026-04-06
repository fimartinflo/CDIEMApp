/**
 * AuditLog.js — Modelo de registro de auditoría
 *
 * Almacena un historial inmutable de las acciones críticas realizadas
 * por los usuarios del sistema: creación, modificación y eliminación
 * de pacientes, usuarios, medicamentos y sesiones clínicas.
 *
 * Diseño deliberado:
 *  - Sin FK a Users → el historial se preserva aunque el usuario sea eliminado
 *  - usuarioNombre es un snapshot del username al momento de la acción
 *  - detalles almacena JSON con contexto adicional (datos antes/después)
 *  - ip permite rastrear el origen de la acción en caso de auditoría de seguridad
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  // Código legible de la acción realizada (ej. 'CREAR_PACIENTE', 'ELIMINAR_USUARIO')
  accion: {
    type: DataTypes.STRING,
    allowNull: false
  },

  // Nombre del modelo Sequelize afectado (ej. 'Patient', 'User', 'Medication')
  entidad: {
    type: DataTypes.STRING,
    allowNull: false
  },

  // ID del registro afectado — null para acciones sin entidad específica (ej. login)
  entidadId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  // ID del usuario que realizó la acción (null = sistema/anónimo)
  usuarioId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },

  // Snapshot del username al momento de la acción (persiste aunque el usuario sea eliminado)
  usuarioNombre: {
    type: DataTypes.STRING,
    allowNull: true
  },

  // JSON serializado con información contextual (campos modificados, valores anteriores, etc.)
  detalles: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // IP del cliente — soporta IPv4, IPv6 y cabeceras X-Forwarded-For de proxies
  ip: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = AuditLog;
