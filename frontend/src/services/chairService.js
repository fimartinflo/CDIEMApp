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

  // Liberar sillón
  releaseChair: async (id) => {
    const response = await api.post(`/chairs/${id}/release`);
    return response.data;
  }
};

export default chairService;