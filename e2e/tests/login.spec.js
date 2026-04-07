/**
 * login.spec.js — Tests E2E del flujo de autenticación
 *
 * Cubre:
 *  - Renderizado del formulario de login
 *  - Login exitoso con cada rol (admin, enfermera, administracion)
 *  - Error visible con credenciales incorrectas
 *  - Protección de rutas privadas sin autenticar
 */
const { test, expect } = require('@playwright/test');

// ──────────────────────────────────────────────
// Helpers reutilizables
// ──────────────────────────────────────────────

/**
 * Rellena y envía el formulario de login.
 * @param {import('@playwright/test').Page} page
 * @param {string} username
 * @param {string} password
 */
async function fillLogin(page, username, password) {
  await page.getByLabel('Usuario').fill(username);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

test.describe('Página de Login', () => {
  // Navegar al login antes de cada test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('muestra el formulario con los campos requeridos', async ({ page }) => {
    await expect(page.getByLabel('Usuario')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible();
    // Mostrar el título de la aplicación
    await expect(page.getByText('CDIEM - Centro Oncológico')).toBeVisible();
  });

  test('admin puede iniciar sesión y llega al dashboard', async ({ page }) => {
    await fillLogin(page, 'admin', 'admin123');
    // Esperar redirección al dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('CDIEM - Panel de Control')).toBeVisible();
  });

  test('enfermera puede iniciar sesión', async ({ page }) => {
    await fillLogin(page, 'enfermera', 'enfermera123');
    await expect(page).toHaveURL('/dashboard');
  });

  test('administracion puede iniciar sesión', async ({ page }) => {
    await fillLogin(page, 'administracion', 'admin2024');
    await expect(page).toHaveURL('/dashboard');
  });

  test('muestra error con contraseña incorrecta', async ({ page }) => {
    await fillLogin(page, 'admin', 'wrong_password');
    // El Alert de error debe aparecer — no debe redirigir
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('muestra error con usuario inexistente', async ({ page }) => {
    await fillLogin(page, 'usuario_inexistente', 'cualquier_pass');
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('ruta privada /dashboard redirige a /login sin sesión activa', async ({ page }) => {
    // Acceder directamente sin hacer login
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('ruta privada /patients redirige a /login sin sesión activa', async ({ page }) => {
    await page.goto('/patients');
    await expect(page).toHaveURL('/login');
  });
});
