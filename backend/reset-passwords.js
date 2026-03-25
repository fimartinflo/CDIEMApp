/**
 * Script de emergencia: resetea contraseñas de los usuarios del sistema.
 * Sin borrar datos existentes.
 * Uso: node backend/reset-passwords.js
 */
const { sequelize, User } = require('./src/models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la BD');

    const users = [
      { username: 'admin',          newPassword: 'admin123',     role: 'admin',          fullName: 'Administrador CDIEM' },
      { username: 'enfermera',      newPassword: 'enfermera123', role: 'enfermera',      fullName: 'Enfermera CDIEM' },
      { username: 'administracion', newPassword: 'admin2024',    role: 'administracion', fullName: 'Administración CDIEM' }
    ];

    for (const { username, newPassword, role, fullName } of users) {
      const user = await User.findOne({ where: { username } });
      if (!user) {
        console.log(`⚠️  Usuario '${username}' no encontrado — se creará`);
        await User.create({
          username,
          password: newPassword,
          email: `${username}@cdiem.cl`,
          fullName,
          role,
          isActive: true
        });
        console.log(`✅ Usuario '${username}' creado`);
      } else {
        user.password = newPassword; // el hook beforeUpdate hasheará esto
        user.isActive = true;
        await user.save();
        console.log(`✅ Contraseña de '${username}' reseteada`);
      }
    }

    console.log('\nCredenciales disponibles:');
    console.log('  admin          / admin123      (rol: admin — acceso completo)');
    console.log('  enfermera      / enfermera123  (rol: enfermera — clínico, sin reportes)');
    console.log('  administracion / admin2024     (rol: administracion — solo reportes)');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
