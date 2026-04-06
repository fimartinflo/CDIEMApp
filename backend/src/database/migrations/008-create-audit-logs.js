'use strict';

/**
 * Migración 008 — Tabla AuditLogs
 *
 * Registra el historial de acciones del sistema para cumplimiento
 * y trazabilidad clínica. No tiene FK a Users intencionalmente:
 * si un usuario es eliminado, su historial se preserva intacto
 * a través del campo usuarioNombre (snapshot del username).
 *
 * Campos:
 *  - accion:        código de la acción  (ej. 'CREAR_PACIENTE')
 *  - entidad:       modelo afectado      (ej. 'Patient')
 *  - entidadId:     ID del registro      (nullable)
 *  - usuarioId:     ID del actor         (nullable — no FK)
 *  - usuarioNombre: snapshot del username
 *  - detalles:      JSON con contexto    (antes/después, motivo, etc.)
 *  - ip:            dirección IP del cliente
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AuditLogs', {
      id:            { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      accion:        { type: Sequelize.STRING(100), allowNull: false },
      entidad:       { type: Sequelize.STRING(50),  allowNull: false },
      entidadId:     { type: Sequelize.INTEGER,     allowNull: true },
      usuarioId:     { type: Sequelize.INTEGER,     allowNull: true },
      usuarioNombre: { type: Sequelize.STRING(100), allowNull: true },
      // TEXT para JSON variable — no tiene schema fijo, depende de la acción
      detalles:      { type: Sequelize.TEXT,        allowNull: true },
      ip:            { type: Sequelize.STRING(45),  allowNull: true }, // IPv6 max 45 chars
      createdAt:     { type: Sequelize.DATE,        allowNull: false },
      updatedAt:     { type: Sequelize.DATE,        allowNull: false }
    });

    // Índice para filtrar rápidamente por usuario (consultas de auditoría frecuentes)
    await queryInterface.addIndex('AuditLogs', ['usuarioId']);
    // Índice para filtrar por entidad+acción (reportes de qué cambió en qué)
    await queryInterface.addIndex('AuditLogs', ['entidad', 'accion']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AuditLogs');
  }
};
