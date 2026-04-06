/**
 * playwright.config.js — Configuración global de Playwright
 *
 * Los tests E2E prueban la aplicación completa (frontend + backend)
 * en un navegador real. Deben ejecutarse con ambos servidores activos:
 *
 *   Terminal 1: cd backend && npm run dev    → http://localhost:3001
 *   Terminal 2: cd frontend && npm start     → http://localhost:3000
 *   Terminal 3: cd e2e && npm test
 *
 * Para instalar Playwright la primera vez:
 *   npm install
 *   npx playwright install chromium
 */
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  // Los tests deben correr en secuencia para evitar conflictos
  // de estado compartido en la BD (ej. crear y borrar el mismo paciente)
  fullyParallel: false,

  // En CI fallar rápido si un archivo falla
  forbidOnly: !!process.env.CI,

  // Reintentos en CI para mayor estabilidad
  retries: process.env.CI ? 2 : 0,

  // Reporte HTML local + línea de consola
  reporter: [['html', { open: 'never' }], ['line']],

  use: {
    // URL base del frontend
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Captura screenshot automáticamente cuando un test falla
    screenshot: 'only-on-failure',

    // Video de la ejecución en el primer reintento fallido
    video: 'retain-on-failure',

    // Traza completa del primer reintento para depuración
    trace: 'on-first-retry',

    // Tiempo máximo esperando a que aparezca un elemento
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Descomentar para probar en más navegadores:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari'] }  },
  ],
});
