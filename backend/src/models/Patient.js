/**
 * @file Patient.js
 * @description Sequelize model for oncology clinic patients.
 *
 * A Patient represents an individual receiving treatment at the clinic.
 * Patients are central to the system: they are assigned to treatment chairs
 * (ChairSession), accumulate a visit history (Visit), and their estado drives
 * the clinical workflow state machine:
 *
 *   activo  →  en_tratamiento  →  activo
 *              (chair assigned)     (chair released)
 *
 * Soft-deletion is used: deleting a patient sets estado to 'inactivo' rather
 * than removing the row, preserving clinical history.
 *
 * Identification is flexible to accommodate both Chilean nationals (RUT) and
 * foreign patients (passport number). The tipoIdentificacion field selects
 * which identifier is in use.
 *
 * RUT validation (Chilean modulo-11 algorithm) is enforced in:
 *   - Backend: validateRUT() in patientController.js
 *   - Frontend: patientService.validateRUT() and patientService.formatRUT()
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Patient = sequelize.define('Patient', {
  /** Full legal name of the patient. Required for all records. */
  nombreCompleto: { type: DataTypes.STRING, allowNull: false },

  /**
   * Discriminator for which identification document is being used.
   * Expected values: 'rut' (Chilean national ID) or 'pasaporte' (passport).
   * Defaults to 'rut' since most patients are Chilean nationals.
   * The backend rejects empty rut when tipoIdentificacion === 'rut'.
   */
  tipoIdentificacion: { type: DataTypes.STRING, defaultValue: 'rut' },

  /**
   * Chilean RUT (Rol Único Tributario) identifier.
   * Unique across the table — no two patients can share a RUT.
   * Stored as a string to preserve the check digit (e.g. "12345678-9").
   * Null is allowed for foreign patients who use a passport instead.
   */
  rut: { type: DataTypes.STRING, unique: true },

  /**
   * Passport number for foreign patients.
   * Used when tipoIdentificacion === 'pasaporte'.
   * No uniqueness constraint because passport formats vary widely.
   */
  pasaporte: DataTypes.STRING,

  /**
   * Date of birth (date only, no time component).
   * Used for age calculation and patient identification.
   */
  fechaNacimiento: DataTypes.DATEONLY,

  /**
   * Health insurance / coverage plan (previsión in Chilean healthcare).
   * Examples: 'FONASA', 'ISAPRE', 'Particular'.
   */
  prevision: DataTypes.STRING,

  /** Patient's contact phone number. Free-form string (no format enforcement). */
  telefono: DataTypes.STRING,

  /** Patient's email address for appointment notifications. */
  correo: DataTypes.STRING,

  /** Patient's gender. Free-form string to accommodate diverse values. */
  genero: DataTypes.STRING,

  /** Patient's home address. Used for administrative records. */
  direccion: DataTypes.STRING,

  /**
   * Clinical workflow state for the patient.
   * Possible values:
   *   'activo'          → patient is registered and available for assignment
   *   'en_tratamiento'  → patient is currently occupying a treatment chair
   *   'inactivo'        → soft-deleted; excluded from most queries
   * Transitions are managed by the chair assignment / release endpoints in app.js.
   */
  estado: { type: DataTypes.STRING, defaultValue: 'activo' }
});

module.exports = Patient;
