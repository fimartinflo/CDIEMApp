/**
 * dashboard.spec.js — Tests E2E del Dashboard y control de acceso por rol
 *
 * Cubre:
 *  - Tarjetas visibles según rol
 *  - Métricas del sistema (solo roles clínicos)
 *  - Logout limpia la sesión
 *  - Acceso denegado a rutas sin permiso
 */
const { test, expect } = require('@playwright/test');

// ──────────────────────────────────────────────
// Helper: login rápido
// ──────────────────────────────────────────────

/**
 * Hace login y espera a que cargue el dashboard.
 */
async function loginAs(page, username, password) {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(username);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await page.waitForURL('/dashboard');
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

test.describe('Dashboard — acceso por rol', () => {

  test('admin ve todas las tarjetas: Pacientes, Sillones, Inventario, Reportes, Usuarios', async ({ page }) => {
    await loginAs(page, 'admin', 'admin123');
    await expect(page.getByText('Pacientes')).toBeVisible();
    await expect(page.getByText('Sillones')).toBeVisible();
    await expect(page.getByText('Inventario')).toBeVisible();
    await expect(page.getByText('Reportes')).toBeVisible();
    await expect(page.getByText('Usuarios')).toBeVisible();
  });

  test('enfermera solo ve Pacientes, Sillones e Inventario', async ({ page }) => {
    await loginAs(page, 'enfermera', 'enfermera123');
    await expect(page.getByText('Pacientes')).toBeVisible();
    await expect(page.getByText('Sillones')).toBeVisible();
    await expect(page.getByText('Inventario')).toBeVisible();
    // No debe ver Reportes ni Usuarios
    await expect(page.getByRole('button', { name: 'Acceder' }).filter({ hasText: 'Reportes' })).not.toBeVisible();
  });

  test('administracion solo ve Inventario y Reportes', async ({ page }) => {
    await loginAs(page, 'administracion', 'admin2024');
    await expect(page.getByText('Inventario')).toBeVisible();
    await expect(page.getByText('Reportes')).toBeVisible();
    // No debe ver módulos clínicos
    await expect(page.getByText('Sillones')).not.toBeVisible();
  });

  test('admin ve la sección Estado del Sistema con métricas', async ({ page }) => {
    await loginAs(page, 'admin', 'admin123');
    await expect(page.getByText('Estado del Sistema')).toBeVisible();
    await expect(page.getByText('Pacientes totales')).toBeVisible();
    await expect(page.getByText('Sillones disponibles')).toBeVisible();
    await expect(page.getByText('Sesiones activas')).toBeVisible();
    await expect(page.getByText('Medicamentos críticos')).toBeVisible();
    // Métrica de usuarios solo para admin
    await expect(page.getByText('Usuarios registrados')).toBeVisible();
  });

  test('enfermera también ve métricas del sistema', async ({ page }) => {
    await loginAs(page, 'enfermera', 'enfermera123');
    await expect(page.getByText('Estado del Sistema')).toBeVisible();
  });

  test('administracion NO ve métricas del sistema', async ({ page }) => {
    await loginAs(page, 'administracion', 'admin2024');
    // El bloque Estado del Sistema es solo para roles clínicos
    await expect(page.getByText('Estado del Sistema')).not.toBeVisible();
  });

  test('enfermera no puede acceder a /users', async ({ page }) => {
    await loginAs(page, 'enfermera', 'enfermera123');
    await page.goto('/users');
    // Debe redirigir al dashboard por falta de rol
    await expect(page).toHaveURL('/dashboard');
  });

  test('administracion no puede acceder a /patients', async ({ page }) => {
    await loginAs(page, 'administracion', 'admin2024');
    await page.goto('/patients');
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('Dashboard — logout', () => {
  test('logout limpia la sesión y redirige al login', async ({ page }) => {
    await loginAs(page, 'admin', 'admin123');
    // Hacer click en el avatar de usuario (esquina superior derecha)
    await page.locator('[aria-label="account of current user"]').click();
    await page.getByText('Salir').click();
    // Debe redirigir al login y no poder volver al dashboard
    await expect(page).toHaveURL('/login');
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
