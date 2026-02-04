console.log('Se mostrará cuando esté cargado');

const { sequelize, Chair, Patient, ChairSession, Medication, SessionMedication } = require('./models');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // 👈 ESTO ES LO QUE FALTA
    console.log('✅ Conectado y sincronizado con SQLite correctamente');
  } catch (error) {
    console.error('❌ Error conectando/sincronizando la BD:', error);
  }
})();



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
/* let pacientes = [
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
]; */

// Obtener todos los pacientes
/* app.get('/api/patients', (req, res) => {
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
}); */

app.get('/api/patients', async (req, res) => {
  try {
    const patients = await Patient.findAll();

    res.json({
      success: true,
      data: patients,
      total: patients.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo pacientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


// Buscar pacientes
/* app.get('/api/patients/search', (req, res) => {
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
}); */

// Crear paciente
/* app.post('/api/patients', (req, res) => {
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
}); */

app.post('/api/patients', async (req, res) => {
  try {
    const {
      nombreCompleto,
      tipoIdentificacion,
      rut,
      pasaporte,
      fechaNacimiento,
      prevision,
      telefono,
      correo,
      genero,
      direccion
    } = req.body;

    if (!nombreCompleto) {
      return res.status(400).json({
        success: false,
        message: 'El nombre completo es obligatorio'
      });
    }

    const patient = await Patient.create({
      nombreCompleto,
      tipoIdentificacion,
      rut,
      pasaporte,
      fechaNacimiento,
      prevision,
      telefono,
      correo,
      genero,
      direccion
    });

    res.status(201).json({
      success: true,
      message: 'Paciente creado exitosamente',
      data: patient
    });

  } catch (error) {
    console.error('❌ Error creando paciente:', error);

    // RUT duplicado
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un paciente con ese RUT'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


// Actualizar paciente
/* app.put('/api/patients/:id', (req, res) => {
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
}); */

// ==================== SILLONES ====================
let sillones = [
  { id: 1, numero: 'S1', nombre: 'Sillón 1', ubicacion: 'Sala A', estado: 'disponible', activo: true },
  { id: 2, numero: 'S2', nombre: 'Sillón 2', ubicacion: 'Sala A', estado: 'ocupado', pacienteActual: 'Juan Pérez', pacienteActualId: 1, horaInicio: new Date(Date.now() - 30*60000).toISOString(), medicamentosAdministrados: ['Medicamento A - 100mg', 'Suero fisiológico'], activo: true },
  { id: 3, numero: 'S3', nombre: 'Sillón 3', ubicacion: 'Sala B', estado: 'disponible', activo: true },
  { id: 4, numero: 'S4', nombre: 'Sillón 4', ubicacion: 'Sala B', estado: 'mantenimiento', activo: true }
];

// Obtener todos los sillones
/* app.get('/api/chairs', (req, res) => {
  console.log('🪑 Solicitando sillones...');
  
  const sillonesActivos = sillones.filter(s => s.activo !== false);
  
  res.json({
    success: true,
    data: sillonesActivos,
    total: sillonesActivos.length
  });
});
*/

app.get('/api/chairs', async (req, res) => {
  try {
    const chairs = await Chair.findAll({
      where: { activo: true }
    });

    res.json({
      success: true,
      data: chairs,
      total: chairs.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo sillones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});



// Crear sillón
/* app.post('/api/chairs', (req, res) => {
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
}); */

// Actualizar sillón
/* app.put('/api/chairs/:id', (req, res) => {
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
}); */

// Eliminar sillón
/* app.delete('/api/chairs/:id', (req, res) => {
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
}); */



// Asignar paciente a sillón
app.post('/api/chairs/:id/assign', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { pacienteId } = req.body;

    /* =========================
       1️⃣ Buscar sillón
    ========================= */
    const chair = await Chair.findByPk(id, { transaction });

    if (!chair || !chair.activo) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Sillón no encontrado'
      });
    }

    /* 🪑 R7 — Sillón en mantenimiento */
    if (chair.estado === 'mantenimiento') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'El sillón está en mantenimiento y no puede ser asignado'
      });
    }

    /* Estado general */
    if (chair.estado !== 'disponible') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'El sillón no está disponible'
      });
    }

    /* =========================
       2️⃣ Buscar paciente
    ========================= */
    const patient = await Patient.findByPk(pacienteId, { transaction });

    if (!patient) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Paciente no encontrado'
      });
    }

    /* 🩺 R6 — Paciente debe estar ACTIVO */
    if (patient.estado !== 'activo') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'El paciente no está activo y no puede iniciar sesión'
      });
    }

    /* 🩺 R1 + R8 — Paciente no puede tener otra sesión activa */
    const activePatientSession = await ChairSession.findOne({
      where: {
        patientId: patient.id,
        estado: 'activa'
      },
      transaction
    });

    if (activePatientSession) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'El paciente ya tiene una sesión activa en otro sillón'
      });
    }

    /* =========================
       3️⃣ Validar sesión activa del sillón
    ========================= */
    const activeChairSession = await ChairSession.findOne({
      where: {
        chairId: chair.id,
        estado: 'activa'
      },
      transaction
    });

    if (activeChairSession) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'El sillón ya tiene una sesión activa'
      });
    }

    /* =========================
       4️⃣ Crear sesión
    ========================= */
    const session = await ChairSession.create({
      chairId: chair.id,
      patientId: patient.id,
      horaInicio: new Date(),
      estado: 'activa'
    }, { transaction });

    /* =========================
       5️⃣ Actualizar sillón
    ========================= */
    chair.estado = 'ocupado';
    await chair.save({ transaction });

    await transaction.commit();

    return res.json({
      success: true,
      message: 'Paciente asignado al sillón exitosamente',
      data: {
        chair,
        session
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error asignando sillón:', error);

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});



// Liberar sillón
app.post('/api/chairs/:id/release', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    // 1️⃣ Buscar sillón
    const chair = await Chair.findByPk(id, { transaction });
    if (!chair) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Sillón no encontrado'
      });
    }

    // 2️⃣ Buscar sesión activa
    const session = await ChairSession.findOne({
      where: {
        chairId: chair.id,
        estado: 'activa'
      },
      transaction
    });

    if (!session) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'No hay sesión activa en este sillón'
      });
    }

    // 3️⃣ Calcular duración
    const horaFin = new Date();
    const duracionMinutos = Math.round(
      (horaFin - new Date(session.horaInicio)) / 60000
    );

    // 4️⃣ Cerrar sesión
    session.horaFin = horaFin;
    session.estado = 'finalizada';
    session.notas = `Atención completada. Duración: ${duracionMinutos} minutos`;
    await session.save({ transaction });

    // 5️⃣ Liberar sillón
    chair.estado = 'disponible';
    await chair.save({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Sillón liberado exitosamente',
      data: {
        duracionMinutos,
        horaInicio: session.horaInicio,
        horaFin
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error liberando sillón:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.post('/api/chairs/:id/medications', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { medicationId, cantidad } = req.body;

    if (!medicationId || !cantidad || cantidad <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Debe indicar medicamento y cantidad válida'
      });
    }

    // 1️⃣ Buscar sillón
    const chair = await Chair.findByPk(id, { transaction });
    if (!chair) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Sillón no encontrado'
      });
    }

    // 2️⃣ Buscar sesión activa
    const session = await ChairSession.findOne({
      where: {
        chairId: chair.id,
        estado: 'activa'
      },
      transaction
    });

    if (!session) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'El sillón no tiene una sesión activa'
      });
    }

    // 3️⃣ Buscar medicamento
    const medication = await Medication.findByPk(medicationId, { transaction });
    if (!medication || !medication.activo) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Medicamento no encontrado'
      });
    }

    // 4️⃣ Validar stock
    if (medication.cantidad < cantidad) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Disponible: ${medication.cantidad}`
      });
    }

    // 5️⃣ Descontar stock
    medication.cantidad -= cantidad;
    await medication.save({ transaction });
    // 💊 R9: Alerta de stock mínimo (NO bloqueante)
    const alertaStock = medication.cantidad <= medication.minimoStock;



    // 6️⃣ Registrar administración
    const registro = await SessionMedication.create({
      sessionId: session.id,
      medicationId: medication.id,
      cantidadAdministrada: cantidad
    }, { transaction });

    await transaction.commit();

  res.json({
  success: true,
  message: 'Medicamento administrado exitosamente',
  data: {
    sessionId: session.id,
    medicamento: medication.nombre,
    cantidadAdministrada: cantidad,
    stockRestante: medication.cantidad,
    minimoStock: medication.minimoStock,
    alertaStock,
    registro
    }
  });


  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error administrando medicamento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.get('/api/chairs/:id/medications', async (req, res) => {
  try {
    const { id } = req.params;

    const session = await ChairSession.findOne({
      where: {
        chairId: id,
        estado: 'activa'
      },
      include: [{
        model: SessionMedication,
        include: [Medication]
      }]
    });

    if (!session) {
      return res.json({
        success: true,
        data: []
      });
    }

    const medicamentos = session.SessionMedications.map(sm => ({
      id: sm.id,
      nombre: sm.Medication.nombre,
      cantidad: sm.cantidadAdministrada,
      hora: sm.horaAdministracion
    }));

    res.json({
      success: true,
      data: medicamentos
    });

  } catch (error) {
    console.error('❌ Error obteniendo medicamentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});



// ==================== INVENTARIO ====================
/* let inventario = [
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
}); */

app.get('/api/inventory', async (req, res) => {
  try {
    const medications = await Medication.findAll({
      where: { activo: true }
    });

    res.json({
      success: true,
      data: medications,
      total: medications.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo inventario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


// Crear medicamento
/* app.post('/api/inventory', (req, res) => {
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
}); */

app.post('/api/inventory', async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      cantidad,
      unidad,
      fechaExpiracion,
      proveedor,
      minimoStock
    } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del medicamento es obligatorio'
      });
    }

    const medication = await Medication.create({
      nombre,
      descripcion,
      cantidad: cantidad || 0,
      unidad: unidad || 'unidad',
      fechaExpiracion,
      proveedor,
      minimoStock: minimoStock || 10
    });

    res.status(201).json({
      success: true,
      message: 'Medicamento creado exitosamente',
      data: medication
    });

  } catch (error) {
    console.error('❌ Error creando medicamento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


// Actualizar medicamento
/* app.put('/api/inventory/:id', (req, res) => {
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
}); */

// Actualizar cantidad (entrada/salida)
/* app.put('/api/inventory/:id/quantity', (req, res) => {
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
}); */

app.put('/api/inventory/:id/quantity', async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, tipo, motivo } = req.body;

    const medication = await Medication.findByPk(id);

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medicamento no encontrado'
      });
    }

    if (tipo === 'entrada') {
      medication.cantidad += cantidad;
    } else if (tipo === 'salida') {
      if (cantidad > medication.cantidad) {
        return res.status(400).json({
          success: false,
          message: 'No hay suficiente stock'
        });
      }
      medication.cantidad -= cantidad;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Tipo inválido'
      });
    }

    await medication.save();

    res.json({
      success: true,
      message: 'Stock actualizado exitosamente',
      data: {
        cantidadNueva: medication.cantidad,
        motivo
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


// ==================== ERROR HANDLING ====================

app.get('/__test', (req, res) => {
  res.json({ ok: true });
});


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