/**
 * @file authController.js
 * @description Controller for all authentication and user management operations.
 *
 * Responsibilities:
 *  - User registration and login with JWT issuance
 *  - Profile retrieval and self-service password change
 *  - Admin-only user management: list, create, update, toggle-active, reset-password
 *
 * Authentication flow:
 *  1. Client sends credentials to POST /api/auth/login
 *  2. Controller verifies username/email + bcrypt-hashed password (via User.verifyPassword)
 *  3. On success, a JWT signed with JWT_SECRET (8h expiry) is returned
 *  4. Subsequent requests attach the token as `Authorization: Bearer <token>`
 *  5. The `auth` middleware validates the token and populates `req.user`
 *
 * Password hashing: handled transparently by the User model's beforeSave hook (bcryptjs).
 * Assigning a plain-text string to `user.password` and calling `save()` triggers the hook.
 *
 * Roles: 'admin' | 'enfermera' | 'administracion'
 *  - Only 'admin' may call the user-management endpoints (enforced by allowRoles middleware).
 */

const User     = require('../models/User');
const logAudit = require('../utils/audit');

const authController = {
  /**
   * Register a new user account.
   *
   * POST /api/auth/register
   *
   * @param {Object} req.body
   * @param {string} req.body.username   - Unique login handle
   * @param {string} req.body.password   - Plain-text password (hashed by User model hook)
   * @param {string} req.body.email      - Unique email address
   * @param {string} req.body.fullName   - Display name
   * @param {string} [req.body.role]     - Role (defaults to 'asistente' if omitted)
   *
   * @returns {201} { success, message, data: { user, token } }
   * @returns {400} If username or email already exists
   */
  // Registro de usuario
  register: async (req, res, next) => {
    try {
      const { username, password, email, fullName, role } = req.body;

      // Verificar si el usuario ya existe
      // Op.or lets us reject duplicates on either username OR email in a single query
      const existingUser = await User.findOne({
        where: {
          [require('sequelize').Op.or]: [
            { username },
            { email }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El usuario o email ya están registrados'
        });
      }

      // Crear nuevo usuario
      // The User model's beforeSave hook automatically hashes the plain-text password
      const user = await User.create({
        username,
        password,
        email,
        fullName,
        role: role || 'asistente'
      });

      // Generar token
      // generateToken() is a method on the User instance (defined in User model)
      const token = user.generateToken();

      // Return a sanitized user object — never expose the hashed password
      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Authenticate a user and issue a JWT.
   *
   * POST /api/auth/login
   * Rate-limited: 10 requests / 15 min per IP (express-rate-limit in app.js)
   *
   * @param {Object} req.body
   * @param {string} req.body.username - Username OR email (both accepted)
   * @param {string} req.body.password - Plain-text password to verify
   *
   * @returns {200} { success, message, data: { user, token } }
   * @returns {401} If user not found, account is disabled, or password is wrong
   *
   * Security note: wrong username and wrong password both return the same generic
   * "Credenciales inválidas" message to prevent user enumeration attacks.
   */
  // Login
  login: async (req, res, next) => {
    try {
      const { username, password } = req.body;

      // Buscar usuario
      // Allow login with either username or email for convenience
      const user = await User.findOne({
        where: {
          [require('sequelize').Op.or]: [
            { username },
            { email: username }  // Treat the submitted "username" field as email too
          ]
        }
      });

      // Intentionally vague error — don't reveal whether the username exists
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar si el usuario está activo
      // Admins can disable accounts via toggleUserActive; disabled users cannot log in
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Usuario desactivado'
        });
      }

      // Verificar contraseña
      // verifyPassword() uses bcrypt.compare() internally — safe against timing attacks
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Actualizar último login
      // Stamp the lastLogin timestamp for audit/visibility purposes
      user.lastLogin = new Date();
      await user.save();

      // Generar token
      const token = user.generateToken();

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retrieve the authenticated user's own profile.
   *
   * GET /api/auth/profile  (requires valid JWT)
   *
   * The user's ID is extracted from the decoded JWT payload by the auth middleware
   * and attached to `req.user`. The password hash is always excluded from the response.
   *
   * @returns {200} { success, data: User }
   * @returns {404} If the token's user ID no longer exists in the DB (e.g. deleted)
   */
  // Obtener perfil de usuario
  getProfile: async (req, res, next) => {
    try {
      // req.user.id is populated by the auth middleware after JWT verification
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }  // Never expose the bcrypt hash
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Allow a logged-in user to change their own password.
   *
   * PUT /api/auth/change-password  (requires valid JWT)
   *
   * @param {Object} req.body
   * @param {string} req.body.currentPassword - Must match the stored bcrypt hash
   * @param {string} req.body.newPassword     - Plain-text replacement (hashed by model hook on save)
   *
   * @returns {200} { success, message }
   * @returns {400} If currentPassword is wrong
   * @returns {404} If the authenticated user no longer exists
   */
  // Cambiar contraseña
  changePassword: async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar contraseña actual
      // Require the old password to prevent account takeover if a session token is stolen
      const isValidPassword = await user.verifyPassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }

      // Actualizar contraseña
      // Assigning to user.password triggers the beforeSave bcrypt hook on save()
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Stateless logout endpoint.
   *
   * POST /api/auth/logout
   *
   * Because JWTs are stateless, real invalidation happens on the client side
   * (the frontend removes the token from localStorage). This endpoint exists
   * so the client has a clean API call to confirm logout intent.
   *
   * @returns {200} { success, message }
   */
  // Logout (en el cliente simplemente eliminar el token)
  logout: (req, res) => {
    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  },

  // ── Gestión de usuarios (admin only) ─────────────────────────────────────
  // All methods below are protected by allowRoles('admin') in authRoutes.js

  /**
   * List all registered users.
   *
   * GET /api/auth/users  (admin only)
   *
   * Ordered by creation date (ASC) so the seed admin appears first.
   * Passwords are always excluded from the response.
   *
   * @returns {200} { success, data: User[] }
   */
  // GET /api/users — listar todos los usuarios
  listUsers: async (req, res, next) => {
    try {
      const users = await User.findAll({
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'ASC']]
      });
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new user account (admin-initiated, no token returned).
   *
   * POST /api/auth/users  (admin only)
   *
   * Unlike self-registration, all five fields are mandatory and the admin
   * explicitly assigns the role. The new user's account is active by default.
   *
   * @param {Object} req.body
   * @param {string} req.body.username  - Unique login handle
   * @param {string} req.body.password  - Plain-text initial password (hashed by model hook)
   * @param {string} req.body.email     - Unique email address
   * @param {string} req.body.fullName  - Display name
   * @param {string} req.body.role      - 'admin' | 'enfermera' | 'administracion'
   *
   * @returns {201} { success, message, data: sanitized User }
   * @returns {400} If any field is missing or username/email already in use
   */
  // POST /api/users — crear usuario
  createUser: async (req, res, next) => {
    try {
      const { username, password, email, fullName, role } = req.body;
      if (!username || !password || !email || !fullName || !role) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
      }
      const existing = await User.findOne({
        where: { [require('sequelize').Op.or]: [{ username }, { email }] }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'El usuario o email ya están registrados' });
      }
      const user = await User.create({ username, password, email, fullName, role, isActive: true });

      await logAudit({ req, accion: 'CREAR_USUARIO', entidad: 'User',
        entidadId: user.id, detalles: { username: user.username, role: user.role } });

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, role: user.role, isActive: user.isActive }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update a user's profile metadata (not their password).
   *
   * PUT /api/auth/users/:id  (admin only)
   *
   * Only fullName, email and role can be changed here. Username is immutable
   * to avoid breaking references. Password changes use a separate endpoint.
   *
   * @param {string} req.params.id     - Target user ID
   * @param {Object} req.body
   * @param {string} [req.body.fullName]
   * @param {string} [req.body.email]
   * @param {string} [req.body.role]
   *
   * @returns {200} { success, message, data: sanitized User }
   * @returns {404} If user not found
   */
  // PUT /api/users/:id — actualizar datos del usuario
  updateUser: async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

      const { fullName, email, role } = req.body;
      await user.update({ fullName, email, role });

      await logAudit({ req, accion: 'ACTUALIZAR_USUARIO', entidad: 'User',
        entidadId: user.id, detalles: { username: user.username, cambios: { fullName, email, role } } });

      res.json({ success: true, message: 'Usuario actualizado', data: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, role: user.role, isActive: user.isActive } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Toggle the active/inactive status of a user account.
   *
   * PUT /api/auth/users/:id/toggle-active  (admin only)
   *
   * Deactivated users cannot log in (checked in `login`). This is the preferred
   * way to revoke access without losing the user record or audit trail.
   *
   * Safety guard: an admin cannot deactivate their own account, preventing
   * accidental lockout of all admins.
   *
   * @param {string} req.params.id  - Target user ID
   *
   * @returns {200} { success, message, data: { isActive } }
   * @returns {400} If the admin tries to deactivate themselves
   * @returns {404} If user not found
   */
  // PUT /api/users/:id/toggle-active — activar / desactivar usuario
  toggleUserActive: async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

      // Prevent an admin from locking themselves out of the system
      if (user.id === req.user.id) return res.status(400).json({ success: false, message: 'No puedes desactivarte a ti mismo' });

      await user.update({ isActive: !user.isActive });

      await logAudit({ req, accion: user.isActive ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO',
        entidad: 'User', entidadId: user.id, detalles: { username: user.username } });

      res.json({ success: true, message: `Usuario ${user.isActive ? 'activado' : 'desactivado'}`, data: { isActive: user.isActive } });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Force-reset a user's password (admin action, no old password required).
   *
   * PUT /api/auth/users/:id/reset-password  (admin only)
   *
   * Used when a user forgets their password. The admin sets a temporary password
   * and informs the user out-of-band; the user should then change it via
   * changePassword. The new password is hashed by the User model's beforeSave hook.
   *
   * @param {string} req.params.id          - Target user ID
   * @param {Object} req.body
   * @param {string} req.body.newPassword   - Minimum 6 characters
   *
   * @returns {200} { success, message }
   * @returns {400} If newPassword is missing or shorter than 6 characters
   * @returns {404} If user not found
   */
  // PUT /api/users/:id/reset-password — resetear contraseña (admin)
  resetPassword: async (req, res, next) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

      const { newPassword } = req.body;
      // Enforce minimum length before the bcrypt hash is applied
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
      }
      // Assigning to user.password triggers the beforeSave bcrypt hook on save()
      user.password = newPassword;
      await user.save();

      await logAudit({ req, accion: 'RESET_PASSWORD', entidad: 'User',
        entidadId: user.id, detalles: { username: user.username } });

      res.json({ success: true, message: 'Contraseña reseteada exitosamente' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;