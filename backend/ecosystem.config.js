// PM2 — Configuración de proceso para producción
// Uso: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: 'cdiem-backend',
      script: 'src/app.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      log_file: '/var/log/cdiem/combined.log',
      out_file: '/var/log/cdiem/out.log',
      error_file: '/var/log/cdiem/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
