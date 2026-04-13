/**
 * @file User.js
 * @description Sequelize model for system users of CDIEMApp.
 *
 * Users are the staff members who operate the oncology clinic management system.
 * Three roles are currently active in the system:
 *   - admin          → full access: user management, all CRUD, reports
 *   - enfermera      → clinical operations: patients, chairs, inventory (read)
 *   - administracion → administrative tasks: inventory write, reports
 *
 * Passwords are never stored in plaintext. Bcrypt hooks automatically hash any
 * password value before it is written to the database (on create and on update).
 *
 * Authentication flow:
 *   1. POST /api/auth/login → verifyPassword() → generateToken() → JWT returned
 *   2. JWT stored in localStorage on the frontend
 *   3. auth.js middleware validates the JWT on every protected request
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  /** Auto-incrementing numeric primary key. */
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  /**
   * Unique login handle for the user (3–50 characters).
   * Used as the identifier in the JWT payload alongside id and role.
   */
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 50]
    }
  },

  /**
   * Bcrypt-hashed password (stored hash is up to 100 chars).
   * The plaintext password is NEVER persisted — see beforeCreate / beforeUpdate hooks below.
   * Minimum plaintext length of 6 is enforced at the Sequelize validation layer.
   */
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 100]
    }
  },

  /**
   * Unique email address for the user.
   * Validated as a properly formatted email by Sequelize before saving.
   */
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },

  /**
   * Access role that determines what the user can see and do.
   * Values map directly to the allowRoles() middleware checks in route definitions.
   * Active roles: 'admin' | 'enfermera' | 'administracion'
   */
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'enfermera',
    validate: {
      isIn: [['admin', 'enfermera', 'administracion']]
    }
  },

  /** Human-readable display name shown in the UI (up to 100 characters). */
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },

  /**
   * Soft-disable flag. When false the user cannot log in.
   * Admins can toggle this via PUT /api/auth/users/:id/toggle-active.
   * An admin cannot deactivate their own account.
   */
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },

  /**
   * Timestamp of the user's most recent successful login.
   * Updated by authController on every successful authentication.
   * Used for auditing purposes.
   */
  lastLogin: {
    type: DataTypes.DATE
  }
}, {
  hooks: {
    /**
     * beforeCreate hook — runs before INSERT.
     * Hashes the plaintext password with bcrypt (cost factor 10) so that
     * the raw password is never written to the database.
     */
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },

    /**
     * beforeUpdate hook — runs before UPDATE.
     * Only re-hashes the password when it has actually been changed in the
     * current operation (Sequelize's changed() guard prevents unnecessary
     * double-hashing when other fields are updated).
     */
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

/**
 * Verifies that a plaintext password matches the stored bcrypt hash.
 * Used during the login flow in authController.js.
 *
 * @param {string} password - The plaintext password supplied by the user at login.
 * @returns {Promise<boolean>} Resolves to true if the password matches, false otherwise.
 */
User.prototype.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

/**
 * Generates a signed JWT for this user.
 * The token payload contains the user's id, username, and role so that
 * downstream middleware can authorize requests without a database lookup.
 * The token expires after 8 hours (matching a typical clinical shift length).
 *
 * @returns {string} A signed JWT string ready to be sent to the client.
 */
// Método para generar token JWT (lo implementaremos después)
User.prototype.generateToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: this.id, username: this.username, role: this.role },
    process.env.JWT_SECRET || 'cdiem_secret_dev',
    { expiresIn: '8h' }
  );
};

module.exports = User;