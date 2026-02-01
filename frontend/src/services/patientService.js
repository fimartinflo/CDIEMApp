import api from './api';

const patientService = {
  // Búsqueda avanzada
  searchPatients: async (query, tipo) => {
    const response = await api.get('/patients/search', {
      params: { query, tipo }
    });
    return response.data;
  },

  // Obtener todos con paginación
  getPatients: async (page = 1, limit = 10, estado = '') => {
    const response = await api.get('/patients', {
      params: { page, limit, estado }
    });
    return response.data;
  },

  // Obtener por ID
  getPatientById: async (id) => {
    const response = await api.get(`/patients/${id}`);
    return response.data;
  },

  // Crear paciente
  createPatient: async (patientData) => {
    const response = await api.post('/patients', patientData);
    return response.data;
  },

  // Actualizar paciente
  updatePatient: async (id, patientData) => {
    const response = await api.put(`/patients/${id}`, patientData);
    return response.data;
  },

  // Eliminar paciente
  deletePatient: async (id) => {
    const response = await api.delete(`/patients/${id}`);
    return response.data;
  },

  // Agendar visita
  scheduleVisit: async (id, visitData) => {
    const response = await api.post(`/patients/${id}/schedule-visit`, visitData);
    return response.data;
  },

  // Validar RUT chileno
  validateRUT: (rut) => {
    if (!rut) return false;
    
    // Limpiar formato
    rut = rut.replace(/\./g, '').replace('-', '');
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1).toLowerCase();
    
    if (!/^[0-9]+$/.test(cuerpo)) return false;
    if (!/^[0-9kK]$/.test(dv)) return false;
    
    // Calcular dígito verificador
    let suma = 0;
    let multiplo = 2;
    
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo.charAt(i)) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    
    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' : 
                        dvEsperado === 10 ? 'k' : 
                        dvEsperado.toString();
    
    return dvCalculado === dv;
  },

  // Formatear RUT para mostrar
  formatRUT: (rut) => {
    if (!rut) return '';
    const clean = rut.replace(/\./g, '').replace('-', '');
    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1);
    return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
  }
};

export default patientService;