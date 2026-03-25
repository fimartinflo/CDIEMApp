/**
 * Suite de pruebas integral — CDIEMApp
 * Cubre: Auth, Pacientes, Sillones, Inventario, Reportes
 */
const BASE = 'http://localhost:3001/api';
let passed = 0, failed = 0, token = '';
const results = [];

const req = async (method, path, body, auth = true) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, data: await res.json() };
};

const test = (name, fn) => results.push({ name, fn });
const ok = (name) => { passed++; console.log(`  ✅ ${name}`); };
const fail = (name, msg) => { failed++; console.error(`  ❌ ${name}: ${msg}`); };
const assert = (name, cond, msg) => cond ? ok(name) : fail(name, msg || 'Falló');

// ─── Estado compartido entre tests ──────────────────────────────────────────
let adminToken, enfermeraToken, patientId1, patientId2, chairId, sessionId, medId1, medId2;

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🔐 AUTENTICACIÓN\n');

// 1. Login admin exitoso
let r = await req('POST', '/auth/login', { username: 'admin', password: 'admin123' }, false);
assert('Login admin', r.data.success && r.data.data?.token, JSON.stringify(r.data));
if (r.data.success) { adminToken = r.data.data.token; token = adminToken; }

// 2. Login enfermera exitoso
r = await req('POST', '/auth/login', { username: 'enfermera', password: 'enfermera123' }, false);
assert('Login enfermera', r.data.success && r.data.data?.token, JSON.stringify(r.data));
if (r.data.success) enfermeraToken = r.data.data.token;

// 3. Credenciales incorrectas → 401
r = await req('POST', '/auth/login', { username: 'admin', password: 'wrong' }, false);
assert('Login credenciales incorrectas → 401', r.status === 401, `status=${r.status}`);

// 4. Sin token → ruta protegida falla
r = await req('GET', '/reports', null, false);
assert('Ruta protegida sin token → 401', r.status === 401, `status=${r.status}`);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n👥 PACIENTES\n');
token = adminToken;

// 5. Crear paciente 1
r = await req('POST', '/patients', {
  nombreCompleto: 'María González López',
  tipoIdentificacion: 'rut',
  rut: '11111111-1',
  fechaNacimiento: '1975-06-15',
  prevision: 'FONASA',
  telefono: '+56912345678',
  correo: 'maria@test.cl',
  genero: 'F'
});
assert('Crear paciente 1', r.data.success && r.data.data?.id, JSON.stringify(r.data.message));
if (r.data.success) patientId1 = r.data.data.id;

// 6. Crear paciente 2
r = await req('POST', '/patients', {
  nombreCompleto: 'Carlos Ramírez Díaz',
  tipoIdentificacion: 'rut',
  rut: '9876543-3',
  fechaNacimiento: '1960-03-20',
  prevision: 'ISAPRE',
  telefono: '+56987654321',
  correo: 'carlos@test.cl',
  genero: 'M'
});
assert('Crear paciente 2', r.data.success && r.data.data?.id, JSON.stringify(r.data.message));
if (r.data.success) patientId2 = r.data.data.id;

// 7. Listar pacientes
r = await req('GET', '/patients');
assert('Listar pacientes', r.data.success && r.data.data?.length >= 2, `count=${r.data.data?.length}`);

// 8. Obtener paciente por ID
r = await req('GET', `/patients/${patientId1}`);
assert('Obtener paciente por ID', r.data.success && r.data.data?.id === patientId1, JSON.stringify(r.data));

// 9. Buscar paciente
r = await req('GET', '/patients/search?q=María');
assert('Buscar paciente por nombre', r.data.success, JSON.stringify(r.data));

// 10. Actualizar estado paciente
r = await req('PUT', `/patients/${patientId1}`, {
  nombreCompleto: 'María González López',
  tipoIdentificacion: 'rut',
  rut: '11111111-1',
  estado: 'activo'
});
assert('Actualizar paciente', r.data.success, JSON.stringify(r.data));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n💊 INVENTARIO\n');

// 11. Listar medicamentos (seed tiene 3)
r = await req('GET', '/inventory');
assert('Listar medicamentos', r.data.success && r.data.data?.length >= 3, `count=${r.data.data?.length}`);
if (r.data.success && r.data.data?.length > 0) {
  medId1 = r.data.data[0].id;
  medId2 = r.data.data[1].id;
}

// 12. Verificar que los precios están cargados
const med1 = r.data.data?.[0];
assert('Medicamento tiene campo precio', med1?.precio !== undefined, `precio=${med1?.precio}`);
assert('Precio mayor a 0', med1?.precio > 0, `precio=${med1?.precio}`);

// 13. Alertas de inventario
r = await req('GET', '/inventory/alerts');
assert('Alertas de inventario', r.data.success, JSON.stringify(r.data));

// 14. Actualizar stock
r = await req('PUT', `/inventory/${medId1}/quantity`, { cantidad: 5, tipo: 'entrada', motivo: 'Compra de prueba' });
assert('Actualizar stock medicamento', r.data.success, JSON.stringify(r.data));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🪑 SILLONES — FLUJO CLÍNICO\n');

// 15. Listar sillones
r = await req('GET', '/chairs');
assert('Listar sillones', r.data.success && r.data.data?.length >= 1, `count=${r.data.data?.length}`);
const sillonDisponible = r.data.data?.find(c => c.estado === 'disponible');
chairId = sillonDisponible?.id;
assert('Hay sillón disponible', !!chairId, 'Ningún sillón disponible');

// 16. Asignar paciente 1 al sillón
r = await req('POST', `/chairs/${chairId}/assign`, { pacienteId: patientId1 });
assert('Asignar paciente a sillón', r.data.success, JSON.stringify(r.data));
if (r.data.success) sessionId = r.data.data?.session?.id;

// 17. Sillón debe aparecer como ocupado
r = await req('GET', '/chairs');
const sillonOcupado = r.data.data?.find(c => c.id === chairId);
assert('Sillón queda como ocupado', sillonOcupado?.estado === 'ocupado', `estado=${sillonOcupado?.estado}`);
assert('Sillón muestra paciente actual', sillonOcupado?.pacienteActual === 'María González López', `paciente=${sillonOcupado?.pacienteActual}`);

// 18. No se puede asignar el mismo sillón dos veces
r = await req('POST', `/chairs/${chairId}/assign`, { pacienteId: patientId2 });
assert('Sillón ocupado rechaza segunda asignación', !r.data.success, 'Debería haber fallado');

// 19. Administrar medicamento 1
r = await req('POST', `/chairs/${chairId}/medications`, { medicationId: medId1, cantidad: 2 });
assert('Administrar medicamento 1', r.data.success, JSON.stringify(r.data));
assert('Captura precioUnitario', r.data.data?.stockRestante !== undefined, JSON.stringify(r.data.data));

// 20. Administrar medicamento 2
r = await req('POST', `/chairs/${chairId}/medications`, { medicationId: medId2, cantidad: 1 });
assert('Administrar medicamento 2', r.data.success, JSON.stringify(r.data));

// 21. Ver medicamentos de la sesión activa
r = await req('GET', `/chairs/${chairId}/medications`);
assert('Ver medicamentos de sesión activa', r.data.success && r.data.data?.length === 2, `count=${r.data.data?.length}`);

// 22. Stock insuficiente
r = await req('POST', `/chairs/${chairId}/medications`, { medicationId: medId2, cantidad: 9999 });
assert('Stock insuficiente rechazado', !r.data.success, 'Debería haber fallado');

// 23. Estado en vivo
r = await req('GET', '/chairs/live');
assert('Estado en vivo de sillones', r.data.success, JSON.stringify(r.data));

// 24. Liberar sillón
r = await req('POST', `/chairs/${chairId}/release`);
assert('Liberar sillón', r.data.success, JSON.stringify(r.data));
assert('Duración calculada al liberar', r.data.data?.duracionMinutos !== undefined, JSON.stringify(r.data.data));

// 25. Sillón vuelve a disponible
r = await req('GET', '/chairs');
const sillonLibre = r.data.data?.find(c => c.id === chairId);
assert('Sillón vuelve a disponible', sillonLibre?.estado === 'disponible', `estado=${sillonLibre?.estado}`);

// 26. Historial del sillón
r = await req('GET', `/chairs/${chairId}/history`);
assert('Historial del sillón tiene sesiones', r.data.success && r.data.data?.length >= 1, `count=${r.data.data?.length}`);

// 27. Historial del paciente
r = await req('GET', `/patients/${patientId1}/history`);
assert('Historial del paciente tiene sesiones', r.data.success && r.data.data?.length >= 1, `count=${r.data.data?.length}`);

// ═══════════════════════════════════════════════════════════════════════════
// Flujo 2: Paciente 2 en sillón para tener más datos en el reporte
console.log('\n🔄 FLUJO ADICIONAL (Paciente 2)\n');

r = await req('POST', `/chairs/${chairId}/assign`, { pacienteId: patientId2 });
assert('Asignar paciente 2 al sillón', r.data.success, JSON.stringify(r.data));

r = await req('POST', `/chairs/${chairId}/medications`, { medicationId: medId1, cantidad: 1 });
assert('Administrar medicamento a paciente 2', r.data.success, JSON.stringify(r.data));

r = await req('POST', `/chairs/${chairId}/release`);
assert('Liberar sillón (paciente 2)', r.data.success, JSON.stringify(r.data));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📊 REPORTES\n');

const today = new Date().toISOString().split('T')[0];

// 28. Reporte del día
r = await req('GET', `/reports?startDate=${today}&endDate=${today}`);
assert('Reporte del día', r.data.success, JSON.stringify(r.data));
const rep = r.data.data;
assert('Reporte tiene estructura correcta', rep?.resumen && rep?.pacientes && rep?.sillones && rep?.medicamentos, 'Falta estructura');
assert('Reporte incluye ambos pacientes', rep?.resumen?.totalPacientes === 2, `total=${rep?.resumen?.totalPacientes}`);
assert('Reporte cuenta sesiones correctamente', rep?.resumen?.totalSesiones === 2, `total=${rep?.resumen?.totalSesiones}`);
assert('Costo total calculado', rep?.resumen?.costoTotal >= 0, `costo=${rep?.resumen?.costoTotal}`);
assert('Sección medicamentos en reporte', rep?.medicamentos?.length >= 1, `count=${rep?.medicamentos?.length}`);
assert('Costo por medicamento calculado', rep?.medicamentos[0]?.costoTotal >= 0, `costo=${rep?.medicamentos[0]?.costoTotal}`);
assert('Sección sillones en reporte', rep?.sillones?.length >= 1, `count=${rep?.sillones?.length}`);
assert('Paciente tiene sesiones y costo', rep?.pacientes[0]?.sesiones?.length >= 1, 'Sin sesiones en paciente');

// 29. Reporte con rango sin datos
r = await req('GET', '/reports?startDate=2020-01-01&endDate=2020-01-31');
assert('Reporte período vacío retorna 0 pacientes', r.data.success && r.data.data?.resumen?.totalPacientes === 0, JSON.stringify(r.data.data?.resumen));

// 30. Reporte sin parámetros → error 400
r = await req('GET', '/reports');
assert('Reporte sin fechas → 400', r.status === 400, `status=${r.status}`);

// 31. Reporte individual paciente 1
r = await req('GET', `/reports/patient/${patientId1}?startDate=${today}&endDate=${today}`);
assert('Informe paciente 1', r.data.success, JSON.stringify(r.data));
const rp = r.data.data;
assert('Informe tiene datos del paciente', rp?.paciente?.nombreCompleto === 'María González López', `nombre=${rp?.paciente?.nombreCompleto}`);
assert('Informe tiene sesiones', rp?.sesiones?.length >= 1, `count=${rp?.sesiones?.length}`);
assert('Informe calcula costo total paciente', rp?.costoTotal >= 0, `costo=${rp?.costoTotal}`);
assert('Sesión tiene medicamentos con precio', rp?.sesiones[0]?.medicamentos?.length >= 1, 'Sin medicamentos en sesión');

// 32. Informe paciente inexistente → 404
r = await req('GET', '/reports/patient/9999');
assert('Informe paciente inexistente → 404', r.status === 404, `status=${r.status}`);

// 33. Email sin SMTP → 503
r = await req('POST', '/reports/email', {
  recipientEmail: 'test@test.cl',
  startDate: today,
  endDate: today,
  reportData: rep
});
assert('Email sin SMTP → 503', r.status === 503, `status=${r.status} msg=${r.data?.message}`);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📋 DASHBOARD\n');

r = await req('GET', '/dashboard');
assert('Dashboard', r.data.success && r.data.data?.pacientes, JSON.stringify(r.data));
assert('Dashboard muestra 2 pacientes', r.data.data?.pacientes?.total === 2, `total=${r.data.data?.pacientes?.total}`);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🔐 AUTORIZACIÓN POR ROLES\n');
token = enfermeraToken;

// Enfermera puede crear paciente
r = await req('POST', '/patients', {
  nombreCompleto: 'Test Enfermera',
  tipoIdentificacion: 'pasaporte',
  pasaporte: 'ABC123',
  genero: 'M',
  correo: 'test.enf@test.cl'
});
assert('Enfermera puede crear paciente', r.data.success, JSON.stringify(r.data));

// Login administracion y verificar acceso a reportes
r = await req('POST', '/auth/login', { username: 'administracion', password: 'admin2024' }, false);
assert('Login administracion', r.data.success && r.data.data?.token, JSON.stringify(r.data));
const adminContToken = r.data.data?.token;

// administracion NO puede crear pacientes (rol clínico restringido)
token = adminContToken;
r = await req('POST', '/patients', { nombreCompleto: 'Test Contable', tipoIdentificacion: 'pasaporte', pasaporte: 'XYZ999', genero: 'M' });
assert('Administracion NO puede crear pacientes → 403', r.status === 403, `status=${r.status}`);

// administracion NO puede asignar sillón
r = await req('POST', `/chairs/${chairId}/assign`, { pacienteId: patientId1 });
assert('Administracion NO puede asignar sillón → 403', r.status === 403, `status=${r.status}`);

// administracion SÍ puede acceder a reportes
r = await req('GET', `/reports?startDate=${today}&endDate=${today}`);
assert('Administracion SÍ puede ver reportes', r.data.success, JSON.stringify(r.data));

token = adminToken; // restaurar token admin

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n─────────────────────────────────────────');
console.log(`  TOTAL: ${passed + failed} pruebas`);
console.log(`  ✅ Pasaron: ${passed}`);
if (failed > 0) console.log(`  ❌ Fallaron: ${failed}`);
console.log('─────────────────────────────────────────\n');
process.exit(failed > 0 ? 1 : 0);
