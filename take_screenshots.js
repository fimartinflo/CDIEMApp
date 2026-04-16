/**
 * take_screenshots.js
 * Captura screenshots de todos los módulos de CDIEMApp
 * usando Playwright con el chromium existente en cache.
 *
 * Uso: node take_screenshots.js
 * Requiere: backend corriendo en puerto 3001
 */

const { chromium } = require('/home/user/CDIEMApp/e2e/node_modules/playwright-core');
const path = require('path');
const fs   = require('fs');

const BASE_URL   = 'http://localhost:3001';
const OUT_DIR    = path.join('/home/user/CDIEMApp/screenshots_nuevos');
const CHROMIUM   = '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';

const USERS = [
  { username: 'admin',         password: 'admin123',   rol: 'admin' },
  { username: 'enfermera',     password: 'enfermera123', rol: 'enfermera' },
  { username: 'administracion',password: 'admin2024',  rol: 'administracion' },
];

// Páginas a capturar por rol
const PAGES_BY_ROL = {
  admin: [
    { path: '/',          name: 'dashboard',   title: 'Dashboard' },
    { path: '/patients',  name: 'pacientes',   title: 'Pacientes' },
    { path: '/chairs',    name: 'sillones',    title: 'Sillones' },
    { path: '/inventory', name: 'inventario',  title: 'Inventario' },
    { path: '/reports',   name: 'reportes',    title: 'Reportes' },
    { path: '/users',     name: 'usuarios',    title: 'Usuarios' },
    { path: '/audit',     name: 'auditoria',   title: 'Auditoria' },
  ],
  enfermera: [
    { path: '/',          name: 'dashboard',   title: 'Dashboard' },
    { path: '/patients',  name: 'pacientes',   title: 'Pacientes' },
    { path: '/chairs',    name: 'sillones',    title: 'Sillones' },
    { path: '/inventory', name: 'inventario',  title: 'Inventario' },
  ],
  administracion: [
    { path: '/',          name: 'dashboard',   title: 'Dashboard' },
    { path: '/inventory', name: 'inventario',  title: 'Inventario' },
    { path: '/reports',   name: 'reportes',    title: 'Reportes' },
  ],
};

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function login(page, username, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.fill('input[name="username"], input[id*="user"], input[placeholder*="sario"], input[type="text"]', username);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
  await delay(1000);
}

async function screenshotPage(page, rol, pageName, pagePath, outputDir) {
  try {
    await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle', timeout: 15000 });
    await delay(800);

    const filename = `${rol}_${pageName}.png`;
    const outPath  = path.join(outputDir, filename);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`  [OK] ${filename}`);
    return outPath;
  } catch (err) {
    console.error(`  [ERR] ${rol}_${pageName}: ${err.message}`);
    return null;
  }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
    ],
  });

  const results = [];

  for (const user of USERS) {
    console.log(`\n=== Capturando como: ${user.username} (${user.rol}) ===`);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page    = await context.newPage();

    try {
      await login(page, user.username, user.password);
      console.log(`  Login OK`);

      const pages = PAGES_BY_ROL[user.rol] || [];
      for (const pg of pages) {
        const p = await screenshotPage(page, user.rol, pg.name, pg.path, OUT_DIR);
        if (p) results.push({ rol: user.rol, module: pg.title, file: path.basename(p) });
      }

      // Extra: abrir modal de paciente si es admin o enfermera
      if (user.rol === 'admin' || user.rol === 'enfermera') {
        try {
          await page.goto(`${BASE_URL}/patients`, { waitUntil: 'networkidle', timeout: 15000 });
          await delay(600);
          // Click en el primer botón "Ver" o icono de detalle
          const btn = page.locator('button').filter({ hasText: /ver|detalle|historial/i }).first();
          if (await btn.count() > 0) {
            await btn.click();
            await delay(800);
            await page.screenshot({ path: path.join(OUT_DIR, `${user.rol}_paciente_detalle.png`) });
            console.log(`  [OK] ${user.rol}_paciente_detalle.png`);
          }
        } catch (_) {}

        // Extra: screenshot de sillón ocupado si hay alguno
        try {
          await page.goto(`${BASE_URL}/chairs`, { waitUntil: 'networkidle', timeout: 15000 });
          await delay(600);
          await page.screenshot({ path: path.join(OUT_DIR, `${user.rol}_sillones_detalle.png`) });
          console.log(`  [OK] ${user.rol}_sillones_detalle.png`);
        } catch (_) {}
      }

    } catch (err) {
      console.error(`  Login falló para ${user.username}: ${err.message}`);
    }

    await context.close();
  }

  // Login page screenshot
  try {
    const ctx  = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await delay(500);
    await page.screenshot({ path: path.join(OUT_DIR, 'login.png') });
    console.log('\n  [OK] login.png');
    await ctx.close();
  } catch (err) {
    console.error(`Login page screenshot: ${err.message}`);
  }

  await browser.close();

  console.log('\n=== Resumen ===');
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`${files.length} screenshots en ${OUT_DIR}`);
  files.forEach(f => console.log(`  ${f}`));
})();
