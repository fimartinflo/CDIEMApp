/**
 * Test de integración completo para la API CDIEM
 * Cubre el flujo clínico completo: auth → pacientes → sillones → medicamentos → inventario
 * Uso: node test-api.js
 */

const http = require('http');
const { execSync } = require('child_process');

// Sufijo único para evitar conflictos de unicidad en múltiples ejecuciones
const RUN_ID = Date.now();

const BASE = 'http://localhost:3001';
let TOKEN = '';
let patientId = null;
let chairId = null;
let medicationId = null;

let passed = 0;
let failed = 0;
const failures = [];

// ── Utilidades ──────────────────────────────────────────────────────────────

async function req(method, path, body = null, auth = true) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth && TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
      }
    };

    const reqHttp = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });

    reqHttp.on('error', reject);
    if (data) reqHttp.write(data);
    reqHttp.end();
  });
}

function assert(name, condition, details = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${details ? ': ' + details : ''}`);
    failed++;
    failures.push(`${name}${details ? ' — ' + details : ''}`);
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(55));
}

// ── Tests ────────────────────────────────────────────────────────────────────

async function testHealth() {
  section('HEALTH CHECK');
  const r = await req('GET', '/health', null, false);
  assert('GET /health → 200', r.status === 200);
  assert('Status healthy', r.body.status === 'healthy');
}

async function testAuth() {
  section('AUTENTICACIÓN');

  // Login con credenciales correctas
  const r1 = await req('POST', '/api/auth/login', { username: 'admin', password: 'admin123' }, false);
  assert('POST /api/auth/login → 200', r1.status === 200, `got ${r1.status}`);
  assert('Respuesta success:true', r1.body.success === true);
  assert('Contiene token', !!r1.body.data?.token, JSON.stringify(r1.body));
  assert('Contiene usuario', !!r1.body.data?.user);
  assert('Rol admin', r1.body.data?.user?.role === 'admin');

  if (r1.body.data?.token) TOKEN = r1.body.data.token;

  // Login con credenciales incorrectas
  const r2 = await req('POST', '/api/auth/login', { username: 'admin', password: 'wrong' }, false);
  assert('Login incorrecto → 401', r2.status === 401, `got ${r2.status}`);

  // Ruta protegida sin token
  const r3 = await req('GET', '/api/patients', null, false);
  assert('Sin token → 401', r3.status === 401, `got ${r3.status}`);

  // Perfil del usuario autenticado
  const r4 = await req('GET', '/api/auth/profile');
  assert('GET /api/auth/profile → 200', r4.status === 200, `got ${r4.status}`);
  assert('Perfil contiene username', r4.body.data?.username === 'admin');
}

async function testPatients() {
  section('PACIENTES');

  // Crear paciente
  // RUT 11.111.111-1 es matemáticamente válido (dv calculado = 1)
  // Usamos correo único por RUN_ID para evitar conflictos en multiples ejecuciones
  const r1 = await req('POST', '/api/patients', {
    nombreCompleto: 'Ana Torres Soto',
    tipoIdentificacion: 'rut',
    rut: '11.111.111-1',
    fechaNacimiento: '1980-05-15',
    prevision: 'FONASA',
    telefono: '912345678',
    correo: `ana.${RUN_ID}@test.cl`,
    genero: 'femenino',
    estado: 'activo'
  });
  assert('POST /api/patients → 201', r1.status === 201, `got ${r1.status}: ${JSON.stringify(r1.body)}`);
  assert('Paciente creado con ID', !!r1.body.data?.id);
  if (r1.body.data?.id) patientId = r1.body.data.id;

  // RUT inválido
  const r2 = await req('POST', '/api/patients', {
    nombreCompleto: 'Test Inválido',
    tipoIdentificacion: 'rut',
    rut: '99999999-0'
  });
  assert('RUT inválido → 400', r2.status === 400, `got ${r2.status}`);

  // Listar pacientes
  const r3 = await req('GET', '/api/patients');
  assert('GET /api/patients → 200', r3.status === 200, `got ${r3.status}`);
  assert('Lista es array', Array.isArray(r3.body.data), JSON.stringify(r3.body.data));
  assert('Al menos 1 paciente', (r3.body.data?.length ?? 0) >= 1);
  assert('Paginación presente', !!r3.body.pagination);

  // Obtener por ID
  const r4 = await req('GET', `/api/patients/${patientId}`);
  assert(`GET /api/patients/${patientId} → 200`, r4.status === 200);
  assert('Nombre correcto', r4.body.data?.nombreCompleto === 'Ana Torres Soto');

  // Actualizar paciente
  const r5 = await req('PUT', `/api/patients/${patientId}`, {
    telefono: '987654321',
    prevision: 'ISAPRE'
  });
  assert('PUT /api/patients/:id → 200', r5.status === 200, `got ${r5.status}`);
  assert('Teléfono actualizado', r5.body.data?.telefono === '987654321');

  // Búsqueda por nombre
  const r6 = await req('GET', '/api/patients/search?query=Ana', null, false);
  assert('GET /api/patients/search → 200', r6.status === 200, `got ${r6.status}`);
  assert('Búsqueda retorna resultados', Array.isArray(r6.body.data));

  // Agendar visita
  const r7 = await req('POST', `/api/patients/${patientId}/schedule-visit`, {
    fecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    tipo: 'consulta',
    notas: 'Primera consulta de seguimiento'
  });
  assert('POST /:id/schedule-visit → 201', r7.status === 201, `got ${r7.status}: ${JSON.stringify(r7.body)}`);

  // Próximas visitas
  const r8 = await req('GET', '/api/patients/upcoming-visits', null, false);
  assert('GET /upcoming-visits → 200', r8.status === 200, `got ${r8.status}`);
  assert('Retorna array', Array.isArray(r8.body.data));
}

async function testInventory() {
  section('INVENTARIO (MEDICAMENTOS)');

  // Listar inventario
  const r1 = await req('GET', '/api/inventory');
  assert('GET /api/inventory → 200', r1.status === 200, `got ${r1.status}`);
  assert('Retorna items', Array.isArray(r1.body.data));
  assert('Al menos 3 medicamentos del seed', (r1.body.data?.length ?? 0) >= 3);
  if (r1.body.data?.[0]?.id) medicationId = r1.body.data[0].id;

  // Crear medicamento
  const r2 = await req('POST', '/api/inventory', {
    nombre: 'Cisplatino 50mg',
    descripcion: 'Agente quimioterapéutico',
    cantidad: 15,
    unidad: 'vial',
    minimoStock: 5
  });
  assert('POST /api/inventory → 201', r2.status === 201, `got ${r2.status}`);
  assert('ID asignado', !!r2.body.data?.id);
  const newItemId = r2.body.data?.id;

  // Obtener por ID
  const r3 = await req('GET', `/api/inventory/${newItemId}`);
  assert(`GET /api/inventory/${newItemId} → 200`, r3.status === 200);
  assert('Nombre correcto', r3.body.data?.nombre === 'Cisplatino 50mg');

  // Actualizar
  const r4 = await req('PUT', `/api/inventory/${newItemId}`, { descripcion: 'Quimio platino actualizado' });
  assert('PUT /api/inventory/:id → 200', r4.status === 200, `got ${r4.status}`);

  // Actualizar cantidad (entrada)
  const r5 = await req('PUT', `/api/inventory/${newItemId}/quantity`, {
    cantidad: 5,
    tipo: 'entrada',
    motivo: 'Reposición de stock'
  });
  assert('PUT /inventory/:id/quantity entrada → 200', r5.status === 200, `got ${r5.status}`);

  // Actualizar cantidad (salida)
  const r6 = await req('PUT', `/api/inventory/${newItemId}/quantity`, {
    cantidad: 3,
    tipo: 'salida',
    motivo: 'Uso en tratamiento'
  });
  assert('PUT /inventory/:id/quantity salida → 200', r6.status === 200, `got ${r6.status}`);

  // Stock insuficiente
  const r7 = await req('PUT', `/api/inventory/${newItemId}/quantity`, {
    cantidad: 9999,
    tipo: 'salida'
  });
  assert('Salida > stock → 400', r7.status === 400, `got ${r7.status}`);

  // Alertas
  const r8 = await req('GET', '/api/inventory/alerts');
  assert('GET /api/inventory/alerts → 200', r8.status === 200, `got ${r8.status}`);
  assert('Alertas con estructura correcta', !!r8.body.data);

  // Eliminar
  const r9 = await req('DELETE', `/api/inventory/${newItemId}`);
  assert('DELETE /api/inventory/:id → 200', r9.status === 200, `got ${r9.status}`);
}

async function testChairs() {
  section('SILLONES');

  // Listar sillones (con datos de sesión)
  const r1 = await req('GET', '/api/chairs');
  assert('GET /api/chairs → 200', r1.status === 200, `got ${r1.status}`);
  assert('Retorna array de sillones', Array.isArray(r1.body.data), JSON.stringify(r1.body));
  assert('4 sillones del seed', r1.body.data?.length === 4, `got ${r1.body.data?.length}`);

  const disponible = r1.body.data?.find(c => c.estado === 'disponible');
  assert('Hay sillones disponibles', !!disponible);
  if (disponible) chairId = disponible.id;

  // Crear sillón (requiere admin)
  // Número único para evitar conflicto de unicidad
  const chairNumero = `ST${RUN_ID}`;
  const r2 = await req('POST', '/api/chairs', {
    numero: chairNumero,
    nombre: 'Sillón Test',
    ubicacion: 'Sala C',
    estado: 'disponible',
    activo: true
  });
  assert('POST /api/chairs → 201', r2.status === 201, `got ${r2.status}: ${JSON.stringify(r2.body)}`);
  const newChairId = r2.body.data?.id;

  // Actualizar sillón
  const r3 = await req('PUT', `/api/chairs/${newChairId}`, { ubicacion: 'Sala C Revisada' });
  assert('PUT /api/chairs/:id → 200', r3.status === 200, `got ${r3.status}`);

  // Eliminar (borrado lógico)
  const r4 = await req('DELETE', `/api/chairs/${newChairId}`);
  assert('DELETE /api/chairs/:id → 200', r4.status === 200, `got ${r4.status}`);
}

async function testClinicalFlow() {
  section('FLUJO CLÍNICO COMPLETO');

  if (!patientId || !chairId || !medicationId) {
    console.log('  ⚠️  Saltando flujo clínico (faltan IDs de tests anteriores)');
    return;
  }

  // Asignar paciente al sillón
  const r1 = await req('POST', `/api/chairs/${chairId}/assign`, { pacienteId: patientId });
  assert(`Asignar paciente ${patientId} al sillón ${chairId} → 200`, r1.status === 200, `got ${r1.status}: ${JSON.stringify(r1.body)}`);

  // No permitir doble asignación del mismo paciente
  const r2 = await req('POST', `/api/chairs/${chairId}/assign`, { pacienteId: patientId });
  assert('Doble asignación rechazada → 400', r2.status === 400, `got ${r2.status}`);

  // Administrar medicamento
  const r3 = await req('POST', `/api/chairs/${chairId}/medications`, {
    medicationId,
    cantidad: 1
  });
  assert(`Administrar medicamento → 200`, r3.status === 200, `got ${r3.status}: ${JSON.stringify(r3.body)}`);
  assert('Stock descontado', typeof r3.body.data?.stockRestante === 'number');

  // Obtener medicamentos de sesión
  const r4 = await req('GET', `/api/chairs/${chairId}/medications`);
  assert('GET /chairs/:id/medications → 200', r4.status === 200, `got ${r4.status}`);
  assert('Retorna array de medicamentos', Array.isArray(r4.body.data));
  assert('Al menos 1 medicamento administrado', (r4.body.data?.length ?? 0) >= 1);

  // Ver dashboard (sesión activa)
  const r5 = await req('GET', '/api/dashboard');
  assert('GET /api/dashboard → 200', r5.status === 200, `got ${r5.status}`);
  assert('Dashboard tiene sesionesActivas >= 1', (r5.body.data?.sesionesActivas ?? 0) >= 1);

  // Estado en vivo
  const r6 = await req('GET', '/api/chairs/live');
  assert('GET /api/chairs/live → 200', r6.status === 200, `got ${r6.status}`);
  const chairLive = r6.body.data?.find(c => c.id === chairId);
  assert('Sillón en vivo muestra paciente', !!chairLive?.paciente, JSON.stringify(chairLive));

  // Historial del paciente (vía sesiones)
  const r7 = await req('GET', `/api/patients/${patientId}/history`);
  assert('GET /patients/:id/history → 200', r7.status === 200, `got ${r7.status}`);

  // Liberar sillón
  const r8 = await req('POST', `/api/chairs/${chairId}/release`, {});
  assert('POST /chairs/:id/release → 200', r8.status === 200, `got ${r8.status}: ${JSON.stringify(r8.body)}`);
  assert('Duración registrada', typeof r8.body.data?.duracionMinutos === 'number');

  // Verificar sillón liberado
  const r9 = await req('GET', '/api/chairs');
  const releasedChair = r9.body.data?.find(c => c.id === chairId);
  assert('Sillón vuelve a "disponible"', releasedChair?.estado === 'disponible', `got: ${releasedChair?.estado}`);

  // Historial del sillón
  const r10 = await req('GET', `/api/chairs/${chairId}/history`);
  assert('GET /chairs/:id/history → 200', r10.status === 200, `got ${r10.status}`);
  assert('Historial tiene al menos 1 sesión', (r10.body.data?.length ?? 0) >= 1);
}

async function testPatientDelete() {
  section('BORRADO LÓGICO DE PACIENTE');

  const r1 = await req('DELETE', `/api/patients/${patientId}`);
  assert(`DELETE /api/patients/${patientId} → 200`, r1.status === 200, `got ${r1.status}`);

  const r2 = await req('GET', `/api/patients/${patientId}`);
  assert('Paciente inactivo pero aún existe', r2.status === 200 && r2.body.data?.estado === 'inactivo', `estado: ${r2.body.data?.estado}`);
}

// ── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(55));
  console.log('  CDIEMApp — Suite de tests de integración');
  console.log('═'.repeat(55));

  // Reinicializar DB para garantizar estado limpio
  console.log('\n  Reinicializando base de datos...');
  try {
    execSync('node init-db.js', { cwd: __dirname, stdio: 'pipe' });
    console.log('  ✅ Base de datos reinicializada\n');
  } catch (e) {
    console.error('  ❌ Error reinicializando DB:', e.stderr?.toString());
    process.exit(1);
  }

  try {
    await testHealth();
    await testAuth();
    await testPatients();
    await testInventory();
    await testChairs();
    await testClinicalFlow();
    await testPatientDelete();
  } catch (err) {
    console.error('\n💥 Error fatal en tests:', err.message);
    failed++;
  }

  console.log('\n' + '═'.repeat(55));
  console.log(`  RESULTADO: ${passed} pasaron | ${failed} fallaron`);
  console.log('═'.repeat(55));

  if (failures.length > 0) {
    console.log('\n  Tests fallidos:');
    failures.forEach(f => console.log(`    • ${f}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
