/**
 * Script de emergencia: resetea contraseñas de admin y doctor
 * Sin borrar datos existentes.
 * Uso: node backend/reset-passwords.js
 */
const { sequelize, User } = require('./src/models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la BD');

    const users = [
      { username: 'admin',  newPassword: 'admin123' },
      { username: 'doctor', newPassword: 'doctor123' }
    ];

    for (const { username, newPassword } of users) {
      const user = await User.findOne({ where: { username } });
      if (!user) {
        console.log(`⚠️  Usuario '${username}' no encontrado — se creará`);
        await User.create({
          username,
          password: newPassword,
          email: `${username}@cdiem.cl`,
          fullName: username === 'admin' ? 'Administrador CDIEM' : 'Dr. Oncólogo Ejemplo',
          role: username === 'admin' ? 'admin' : 'doctor',
          isActive: true
        });
        console.log(`✅ Usuario '${username}' creado`);
      } else {
        user.password = newPassword;       // el hook beforeUpdate hasheará esto
        user.isActive = true;
        await user.save();
        console.log(`✅ Contraseña de '${username}' reseteada`);
      }
    }

    console.log('\nCredenciales disponibles:');
    console.log('  admin  / admin123  (rol: admin)');
    console.log('  doctor / doctor123 (rol: doctor)');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
