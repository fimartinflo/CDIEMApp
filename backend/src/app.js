const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware - Configurar CORS más permisivo
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Middleware de logging para todas las peticiones
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`);
  next();
});

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    message: 'API CDIEM - Centro Oncológico',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      auth: 'POST /api/auth/login',
      patients: 'GET,POST /api/patients',
      chairs: 'GET,POST /api/chairs',
      inventory: 'GET,POST /api/inventory'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== AUTENTICACIÓN ====================
const users = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    email: 'admin@cdiem.cl',
    fullName: 'Administrador CDIEM',
    role: 'admin',
    isActive: true
  },
  {
    id: 2,
    username: 'doctor',
    password: 'doctor123',
    email: 'doctor@cdiem.cl',
    fullName: 'Dr. Oncólogo Ejemplo',
    role: 'doctor',
    isActive: true
  }
];

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔐 Intento de login:', username);
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    const token = 'token_desarrollo_' + Date.now();
    
    console.log('✅ Login exitoso para:', username);
    
    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ==================== PACIENTES ====================
let pacientes = [
  {
    id: 1,
    nombreCompleto: 'Juan Pérez González',
    tipoIdentificacion: 'rut',
    rut: '12345678-9',
    fechaNacimiento: '1980-05-15',
    prevision: 'FONASA',
    telefono: '912345678',
    correo: 'juan.perez@email.com',
    genero: 'masculino',
    direccion: 'Calle Principal 123, Santiago',
    estado: 'activo',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 2,
    nombreCompleto: 'María García López',
    tipoIdentificacion: 'rut',
    rut: '98765432-1',
    fechaNacimiento: '1975-08-22',
    prevision: 'ISAPRE',
    telefono: '987654321',
    correo: 'maria.garcia@email.com',
    genero: 'femenino',
    direccion: 'Avenida Central 456, Santiago',
    estado: 'en_tratamiento',
    createdAt: '2024-01-20T14:45:00Z'
  }
];

// Obtener todos los pacientes
app.get('/api/patients', (req, res) => {
  const { page = 1, limit = 10, search = '', estado = '' } = req.query;
  
  let filtered = [...pacientes];
  
  if (search) {
    filtered = filtered.filter(p => 
      p.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
      p.rut.includes(search)
    );
  }
  
  if (estado) {
    filtered = filtered.filter(p => p.estado === estado);
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginated = filtered.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginated,
    pagination: {
      total: filtered.length,
      page: parseInt(page),
      pages: Math.ceil(filtered.length / limit),
      limit: parseInt(limit)
    }
  });
});

// Buscar pacientes
app.get('/api/patients/search', (req, res) => {
  const { query } = req.query;
  
  if (!query || query.length < 2) {
    return res.json({
      success: true,
      data: []
    });
  }
  
  const results = pacientes.filter(p => 
    p.nombreCompleto.toLowerCase().includes(query.toLowerCase()) ||
    p.rut.includes(query)
  );
  
  res.json({
    success: true,
    data: results
  });
});

// Crear paciente
app.post('/api/patients', (req, res) => {
  console.log('📝 Creando paciente...', req.body);
  
  if (!req.body.nombreCompleto) {
    return res.status(400).json({
      success: false,
      message: 'El nombre completo es obligatorio'
    });
  }
  
  const newPatient = {
    id: pacientes.length + 1,
    nombreCompleto: req.body.nombreCompleto || '',
    tipoIdentificacion: req.body.tipoIdentificacion || 'rut',
    rut: req.body.rut || '',
    pasaporte: req.body.pasaporte || '',
    fechaNacimiento: req.body.fechaNacimiento || null,
    prevision: req.body.prevision || '',
    telefono: req.body.telefono || '',
    correo: req.body.correo || '',
    genero: req.body.genero || '',
    generoOtro: req.body.generoOtro || '',
    direccion: req.body.direccion || '',
    estado: req.body.estado || 'activo',
    createdAt: new Date().toISOString()
  };
  
  pacientes.push(newPatient);
  
  console.log('✅ Paciente creado. Total:', pacientes.length);
  
  res.status(201).json({
    success: true,
    message: 'Paciente creado exitosamente',
    data: newPatient
  });
});

// Actualizar paciente
app.put('/api/patients/:id', (req, res) => {
  const { id } = req.params;
  const index = pacientes.findIndex(p => p.id === parseInt(id));
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Paciente no encontrado'
    });
  }
  
  pacientes[index] = { ...pacientes[index], ...req.body };
  
  res.json({
    success: true,
    message: 'Paciente actualizado exitosamente',
    data: pacientes[index]
  });
});

// Eliminar paciente (cambiar estado)
app.delete('/api/patients/:id', (req, res) => {
  const { id } = req.params;
  const index = pacientes.findIndex(p => p.id === parseInt(id));
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Paciente no encontrado'
    });
  }
  
  pacientes[index].estado = 'inactivo';
  
  res.json({
    success: true,
    message: 'Paciente desactivado exitosamente'
  });
});

// ==================== SILLONES ====================
let sillones = [
  { id: 1, numero: 'S1', nombre: 'Sillón 1', ubicacion: 'Sala A', estado: 'disponible', activo: true },
  { id: 2, numero: 'S2', nombre: 'Sillón 2', ubicacion: 'Sala A', estado: 'ocupado', pacienteActual: 'Juan Pérez', pacienteActualId: 1, horaInicio: new Date(Date.now() - 30*60000).toISOString(), medicamentosAdministrados: ['Medicamento A - 100mg', 'Suero fisiológico'], activo: true },
  { id: 3, numero: 'S3', nombre: 'Sillón 3', ubicacion: 'Sala B', estado: 'disponible', activo: true },
  { id: 4, numero: 'S4', nombre: 'Sillón 4', ubicacion: 'Sala B', estado: 'mantenimiento', activo: true }
];

// Obtener todos los sillones
app.get('/api/chairs', (req, res) => {
  console.log('🪑 Solicitando sillones...');
  
  const sillonesActivos = sillones.filter(s => s.activo !== false);
  
  res.json({
    success: true,
    data: sillonesActivos,
    total: sillonesActivos.length
  });
});

// Crear sillón
app.post('/api/chairs', (req, res) => {
  console.log('➕ Creando sillón...', req.body);
  
  if (!req.body.numero || !req.body.nombre) {
    return res.status(400).json({
      success: false,
      message: 'El número y nombre del sillón son obligatorios'
    });
  }
  
  const newChair = {
    id: sillones.length + 1,
    numero: req.body.numero || '',
    nombre: req.body.nombre || '',
    ubicacion: req.body.ubicacion || '',
    estado: req.body.estado || 'disponible',
    activo: true
  };
  
  sillones.push(newChair);
  
  console.log('✅ Sillón creado. Total:', sillones.length);
  
  res.status(201).json({
    success: true,
    message: 'Sillón creado exitosamente',
    data: newChair
  });
});

// Actualizar sillón
app.put('/api/chairs/:id', (req, res) => {
  const { id } = req.params;
  const index = sillones.findIndex(s => s.id === parseInt(id));
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Sillón no encontrado'
    });
  }
  
  sillones[index] = { ...sillones[index], ...req.body };
  
  res.json({
    success: true,
    message: 'Sillón actualizado exitosamente',
    data: sillones[index]
  });
});

// Eliminar sillón
app.delete('/api/chairs/:id', (req, res) => {
  const { id } = req.params;
  const index = sillones.findIndex(s => s.id === parseInt(id));
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Sillón no encontrado'
    });
  }
  
  sillones[index].activo = false;
  
  res.json({
    success: true,
    message: 'Sillón eliminado exitosamente'
  });
});

// Asignar paciente a sillón
app.post('/api/chairs/:id/assign', (req, res) => {
  const { id } = req.params;
  const { pacienteId, medicamentos } = req.body;
  
  const index = sillones.findIndex(s => s.id === parseInt(id));
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Sillón no encontrado'
    });
  }
  
  if (sillones[index].estado === 'ocupado') {
    return res.status(400).json({
      success: false,
      message: 'El sillón ya está ocupado'
    });
  }
  
  const paciente = pacientes.find(p => p.id === parseInt(pacienteId));
  
  if (!paciente) {
    return res.status(404).json({
      success: false,
      message: 'Paciente no encontrado'
    });
  }
  
  // Actualizar sillón
  sillones[index].estado = 'ocupado';
  sillones[index].pacienteActual = paciente.nombreCompleto;
  sillones[index].pacienteActualId = paciente.id;
  sillones[index].horaInicio = new Date().toISOString();
  sillones[index].medicamentosAdministrados = medicamentos || [];
  
  console.log(`✅ Paciente ${paciente.nombreCompleto} asignado al sillón ${sillones[index].numero}`);
  
  res.json({
    success: true,
    message: 'Paciente asignado al sillón exitosamente',
    data: sillones[index]
  });
});

// Liberar sillón
app.post('/api/chairs/:id/release', (req, res) => {
  const { id } = req.params;
  const index = sillones.findIndex(s => s.id === parseInt(id));
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Sillón no encontrado'
    });
  }
  
  if (sillones[index].estado !== 'ocupado') {
    return res.status(400).json({
      success: false,
      message: 'El sillón no está ocupado'
    });
  }
  
  const horaInicio = new Date(sillones[index].horaInicio);
  const horaFin = new Date();
  const duracionMinutos = Math.round((horaFin - horaInicio) / (1000 * 60));
  
  // Actualizar sillón
  sillones[index].estado = 'disponible';
  sillones[index].pacienteActual = null;
  sillones[index].pacienteActualId = null;
  sillones[index].horaFin = horaFin.toISOString();
  sillones[index].notas = `Atención completada. Duración: ${duracionMinutos} minutos`;
  
  console.log(`✅ Sillón ${sillones[index].numero} liberado. Duración: ${duracionMinutos} minutos`);
  
  res.json({
    success: true,
    message: 'Sillón liberado exitosamente',
    data: {
      duracionMinutos,
      horaInicio: horaInicio.toISOString(),
      horaFin: horaFin.toISOString()
    }
  });
});

// ==================== INVENTARIO ====================
let inventario = [
  { 
    id: 1, 
    nombre: 'Medicamento A', 
    descripcion: 'Para tratamiento oncológico X', 
    cantidad: 10, 
    unidad: 'unidad', 
    fechaExpiracion: '2024-12-31', 
    proveedor: 'Proveedor A', 
    minimoStock: 5, 
    activo: true 
  },
  { 
    id: 2, 
    nombre: 'Medicamento B', 
    descripcion: 'Para tratamiento oncológico Y', 
    cantidad: 5, 
    unidad: 'unidad', 
    fechaExpiracion: '2024-10-15', 
    proveedor: 'Proveedor B', 
    minimoStock: 10, 
    activo: true 
  }
];

// Obtener todos los medicamentos
app.get('/api/inventory', (req, res) => {
  console.log('💊 Solicitando inventario...');
  
  const inventarioActivo = inventario.filter(item => item.activo !== false);
  
  res.json({
    success: true,
    data: inventarioActivo,
    total: inventarioActivo.length
  });
});

// Crear medicamento
app.post('/api/inventory', (req, res) => {
  console.log('➕ Creando medicamento...', req.body);
  
  if (!req.body.nombre) {
    return res.status(400).json({
      success: false,
      message: 'El nombre del medicamento es obligatorio'
    });
  }
  
  const newItem = {
    id: inventario.length + 1,
    nombre: req.body.nombre || '',
    descripcion: req.body.descripcion || '',
    cantidad: req.body.cantidad || 0,
    unidad: req.body.unidad || 'unidad',
    fechaExpiracion: req.body.fechaExpiracion || null,
    proveedor: req.body.proveedor || '',
    minimoStock: req.body.minimoStock || 10,
    activo: true
  };
  
  inventario.push(newItem);
  
  console.log('✅ Medicamento creado. Total:', inventario.length);
  
  res.status(201).json({
    success: true,
    message: 'Medicamento creado exitosamente',
    data: newItem
  });
});

// Actualizar medicamento
app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const index = inventario.findIndex(item => item.id === parseInt(id));
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Medicamento no encontrado'
    });
  }
  
  inventario[index] = { ...inventario[index], ...req.body };
  
  res.json({
    success: true,
    message: 'Medicamento actualizado exitosamente',
    data: inventario[index]
  });
});

// Eliminar medicamento
app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const index = inventario.findIndex(item => item.id === parseInt(id));
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: 'Medicamento no encontrado'
    });
  }
  
  inventario[index].activo = false;
  
  res.json({
    success: true,
    message: 'Medicamento eliminado exitosamente'
  });
});

// Actualizar cantidad (entrada/salida)
app.put('/api/inventory/:id/quantity', (req, res) => {
  const { id } = req.params;
  const { cantidad, tipo, motivo } = req.body;
  
  const item = inventario.find(item => item.id === parseInt(id));
  
  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Medicamento no encontrado'
    });
  }
  
  if (tipo === 'entrada') {
    item.cantidad += cantidad;
  } else if (tipo === 'salida') {
    if (cantidad > item.cantidad) {
      return res.status(400).json({
        success: false,
        message: 'No hay suficiente stock'
      });
    }
    item.cantidad -= cantidad;
  } else {
    return res.status(400).json({
      success: false,
      message: 'Tipo inválido. Use "entrada" o "salida"'
    });
  }
  
  console.log(`📦 Stock ${tipo === 'entrada' ? 'aumentado' : 'reducido'} para ${item.nombre}. Nueva cantidad: ${item.cantidad}`);
  
  res.json({
    success: true,
    message: `Stock ${tipo === 'entrada' ? 'aumentado' : 'reducido'} exitosamente`,
    data: {
      cantidadAnterior: item.cantidad - (tipo === 'entrada' ? -cantidad : cantidad),
      cantidadNueva: item.cantidad,
      motivo
    }
  });
});

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error en el servidor:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: err.message
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
  🚀 Servidor CDIEM corriendo en puerto ${PORT}
  🌐 URL: http://localhost:${PORT}
  
  🔐 Login:
    POST /api/auth/login
    Usuarios: admin/admin123, doctor/doctor123
  
  👥 Pacientes:
    GET  /api/patients
    POST /api/patients
  
  🪑 Sillones:
    GET  /api/chairs
    POST /api/chairs
  
  💊 Inventario:
    GET  /api/inventory
    POST /api/inventory
  
  ⚠️  Nota: Esta es una versión de desarrollo con datos en memoria.
  `);
});

module.exports = app;