/**
 * chairService.js — Servicio de sillones (frontend)
 *
 * Encapsula todas las llamadas HTTP al módulo de sillones.
 *
 * Arquitectura dual del backend:
 *  - CRUD básico (crear, editar, eliminar): manejado por chairRoutes.js
 *  - Operaciones de sesión clínica (asignar, liberar): inline en app.js
 * Ambas rutas comparten el prefijo /api/chairs, por lo que desde el
 * frontend son transparentes.
 */
import api from './api';

const chairService = {
  // Obtener todos los sillones
  getChairs: async () => {
    const response = await api.get('/chairs');
    return response.data;
  },

  // Obtener sillón por ID
  getChairById: async (id) => {
    const response = await api.get(`/chairs/${id}`);
    return response.data;
  },

  // Crear sillón
  createChair: async (chairData) => {
    const response = await api.post('/chairs', chairData);
    return response.data;
  },

  // Actualizar sillón
  updateChair: async (id, chairData) => {
    const response = await api.put(`/chairs/${id}`, chairData);
    return response.data;
  },

  // Eliminar sillón
  deleteChair: async (id) => {
    const response = await api.delete(`/chairs/${id}`);
    return response.data;
  },

  // Asignar paciente a sillón
  assignPatient: async (id, patientId, medicamentos) => {
    const response = await api.post(`/chairs/${id}/assign`, {
      pacienteId: patientId,
      medicamentos: medicamentos || []
    });
    return response.data;
  },

  // Liberar sillón — acepta notas clínicas opcionales
  releaseChair: async (id, notas = '') => {
    const response = await api.post(`/chairs/${id}/release`, { notas });
    return response.data;
  }
};

export default chairService;