const User = require('../models/User');

const authController = {
  // Registro de usuario
  register: async (req, res, next) => {
    try {
      const { username, password, email, fullName, role } = req.body;

      // Verificar si el usuario ya existe
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
      const user = await User.create({
        username,
        password,
        email,
        fullName,
        role: role || 'asistente'
      });

      // Generar token
      const token = user.generateToken();

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

  // Login
  login: async (req, res, next) => {
    try {
      const { username, password } = req.body;

      // Buscar usuario
      const user = await User.findOne({ 
        where: { 
          [require('sequelize').Op.or]: [
            { username },
            { email: username }
          ]
        } 
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar si el usuario está activo
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Usuario desactivado'
        });
      }

      // Verificar contraseña
      const isValidPassword = await user.verifyPassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Actualizar último login
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

  // Obtener perfil de usuario
  getProfile: async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
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
      const isValidPassword = await user.verifyPassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña actual incorrecta'
        });
      }

      // Actualizar contraseña
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

  // Logout (en el cliente simplemente eliminar el token)
  logout: (req, res) => {
    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  }
};

module.exports = authController;