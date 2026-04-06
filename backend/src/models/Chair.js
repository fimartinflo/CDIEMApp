/**
 * @file Chair.js
 * @description Sequelize model for treatment chairs (sillones) in the oncology clinic.
 *
 * A Chair represents a physical infusion/treatment chair in the clinic.
 * Chairs are the focal point of the clinical workflow: nurses assign patients
 * to chairs, administer medications during the session, and release the chair
 * when treatment is complete.
 *
 * Chair state machine:
 *   disponible  →  ocupado  →  disponible
 *   (assign)         (release)
 *   disponible  →  mantenimiento  →  disponible
 *   (maintenance)                    (reset)
 *
 * The activo flag provides soft-deletion so that decommissioned chairs retain
 * their historical session data without appearing in active listings.
 *
 * Session data is stored separately in ChairSession; the chair itself only
 * tracks its current availability state. The GET /api/chairs endpoint
 * enriches each chair with live session details (current patient, start time).
 *
 * Route split:
 *   - chairRoutes.js → CRUD: create, update, deactivate, reset
 *   - app.js inline  → clinical operations: assign, release, medications, history
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chair = sequelize.define('Chair', {
  /**
   * Short alphanumeric identifier for the chair (e.g. "S1", "A3").
   * Unique across all chairs. Displayed prominently in the UI card header.
   */
  numero: { type: DataTypes.STRING, unique: true, allowNull: false },

  /** Descriptive display name for the chair (e.g. "Sillón 1", "Sillón Sala B-2"). */
  nombre: { type: DataTypes.STRING, allowNull: false },

  /**
   * Physical location of the chair within the clinic (e.g. "Sala A", "Pasillo B").
   * Used for spatial orientation by nursing staff.
   */
  ubicacion: DataTypes.STRING,

  /**
   * Current operational state of the chair.
   * Possible values:
   *   'disponible'    → chair is free and can accept a new patient assignment
   *   'ocupado'       → chair has an active ChairSession with a patient
   *   'mantenimiento' → chair is out of service (cleaning, repair, etc.)
   * Managed exclusively through the clinical endpoints in app.js.
   */
  estado: { type: DataTypes.STRING, defaultValue: 'disponible' },

  /**
   * Soft-deletion flag. When false the chair is decommissioned and hidden
   * from active listings, but its historical session data is preserved.
   * Toggled by DELETE /api/chairs/:id (sets to false).
   */
  activo: { type: DataTypes.BOOLEAN, defaultValue: true }
});

module.exports = Chair;
