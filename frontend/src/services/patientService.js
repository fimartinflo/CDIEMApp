/**
 * patientService.js — Servicio de pacientes (frontend)
 *
 * Encapsula las llamadas HTTP al modulo de pacientes y expone dos
 * utilidades de RUT chileno que se reutilizan en toda la UI:
 *   - validateRUT(rut): valida con algoritmo modulo-11
 *   - formatRUT(rut): formatea como "12.345.678-9" para mostrar en pantalla
 *
 * Ambas funciones son identicas a las del backend (patientController.js)
 * para garantizar consistencia en la validacion del lado del cliente.
 */
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

  /**
   * Valida un RUT chileno usando el algoritmo modulo-11.
   * Acepta formatos: "12345678-9", "12.345.678-9", "123456789"
   * @param {string} rut
   * @returns {boolean} true si el RUT es valido
   */
  validateRUT: (rut) => {
    if (!rut) return false;

    // Eliminar puntos y guion para trabajar solo con digits + DV
    rut = rut.replace(/\./g, '').replace('-', '');
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1).toLowerCase();

    // El cuerpo debe ser solo digitos; el DV puede ser digito o 'k'
    if (!/^[0-9]+$/.test(cuerpo)) return false;
    if (!/^[0-9kK]$/.test(dv)) return false;

    // Algoritmo modulo-11: multiplicar cada digito por la secuencia 2-7
    // recorriendo de derecha a izquierda, reiniciando en 2 al llegar a 7
    let suma = 0;
    let multiplo = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo.charAt(i)) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }

    // resultado 11 → DV es '0'; resultado 10 → DV es 'k'
    const dvEsperado = 11 - (suma % 11);
    const dvCalculado = dvEsperado === 11 ? '0' :
                        dvEsperado === 10 ? 'k' :
                        dvEsperado.toString();

    return dvCalculado === dv;
  },

  /**
   * Formatea un RUT al estilo chileno: "12.345.678-9"
   * @param {string} rut - RUT con o sin formato previo
   * @returns {string} RUT formateado, o '' si el input es nulo/vacio
   */
  formatRUT: (rut) => {
    if (!rut) return '';
    const clean = rut.replace(/\./g, '').replace('-', '');
    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1);
    // Regex inserta punto cada 3 digitos desde la derecha
    return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
  }
};

export default patientService;