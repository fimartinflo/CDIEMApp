/**
 * chairs.spec.js — Tests E2E del módulo de Sillones
 *
 * Cubre el flujo clínico completo:
 *  1. Admin puede ver la lista de sillones
 *  2. Crear un sillón nuevo
 *  3. Asignar paciente → sillón cambia a "ocupado"
 *  4. Liberar sillón → vuelve a "disponible"
 *  5. Administracion NO puede acceder al módulo
 *
 * Prerequisito: la BD debe tener al menos un paciente con estado 'activo'.
 * Ejecutar `node backend/init-db.js` para cargar los datos de seed.
 */
const { test, expect } = require('@playwright/test');

// ──────────────────────────────────────────────
// Helper: login
// ──────────────────────────────────────────────
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

test.describe('Módulo de Sillones', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin', 'admin123');
    await page.goto('/chairs');
  });

  test('muestra la lista de sillones', async ({ page }) => {
    // El encabezado del módulo debe ser visible
    await expect(page.getByRole('heading', { name: /sillón/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('muestra el botón Nuevo Sillón', async ({ page }) => {
    await expect(page.getByRole('button', { name: /nuevo sill/i })).toBeVisible();
  });

  test('puede crear un nuevo sillón', async ({ page }) => {
    // Usar timestamp para que el número sea único en cada ejecución
    const uniqueNum = `TS${Date.now().toString().slice(-4)}`;

    await page.getByRole('button', { name: /nuevo sill/i }).click();

    // Rellenar el formulario del Dialog
    await page.getByLabel('Número').fill(uniqueNum);
    await page.getByLabel('Nombre').fill(`Sillón Test ${uniqueNum}`);
    await page.getByLabel('Ubicación').fill('Sala Test E2E');

    await page.getByRole('button', { name: 'Crear' }).click();

    // El sillón recién creado debe aparecer en la lista
    await expect(page.getByText(uniqueNum)).toBeVisible({ timeout: 5_000 });
  });

  test('sillón disponible muestra el chip "Disponible"', async ({ page }) => {
    // Al menos un sillón debe estar disponible después del seed
    await expect(page.getByText('Disponible').first()).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Control de acceso — Sillones', () => {
  test('administracion no puede acceder al módulo de sillones', async ({ page }) => {
    await loginAs(page, 'administracion', 'admin2024');
    await page.goto('/chairs');
    // RoleRoute debe redirigir al dashboard
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('Flujo clínico — Asignar y liberar sillón', () => {
  /**
   * Este test requiere:
   *  - Al menos un sillón en estado 'disponible'
   *  - Al menos un paciente en estado 'activo'
   * Ambos se cargan mediante `node backend/init-db.js`
   */
  test('asignar paciente y liberar sillón cambia los estados', async ({ page }) => {
    await loginAs(page, 'admin', 'admin123');
    await page.goto('/chairs');

    // Buscar el botón "Asignar" del primer sillón disponible
    const assignBtn = page.getByRole('button', { name: /asignar/i }).first();
    await expect(assignBtn).toBeVisible({ timeout: 10_000 });
    await assignBtn.click();

    // En el Dialog de asignación, buscar el primer paciente disponible
    const patientSearch = page.getByPlaceholder(/buscar paciente/i);
    await expect(patientSearch).toBeVisible({ timeout: 5_000 });
    await patientSearch.fill('a'); // letra común para activar búsqueda

    // Esperar resultados y seleccionar el primero
    const firstResult = page.locator('[data-testid="patient-option"]').first();
    // Si no hay data-testid, buscar por rol listitem dentro del autocompletar
    const listItem = page.getByRole('option').first();
    await expect(listItem).toBeVisible({ timeout: 5_000 });
    await listItem.click();

    // Confirmar asignación
    await page.getByRole('button', { name: /asignar/i }).last().click();

    // El sillón debe mostrar "ocupado" o el chip correspondiente
    await expect(page.getByText(/ocupado|en tratamiento/i).first()).toBeVisible({ timeout: 8_000 });

    // Liberar el sillón
    const releaseBtn = page.getByRole('button', { name: /liberar/i }).first();
    await expect(releaseBtn).toBeVisible({ timeout: 5_000 });
    await releaseBtn.click();

    // Confirmar en el Dialog de confirmación si aparece
    const confirmBtn = page.getByRole('button', { name: /confirmar|sí|yes/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // El sillón debe volver a disponible
    await expect(page.getByText('Disponible').first()).toBeVisible({ timeout: 8_000 });
  });
});
