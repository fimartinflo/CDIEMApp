import api from './api';

const inventoryService = {
  // Obtener todos los medicamentos
  getItems: async (params = {}) => {
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  // Obtener alertas
  getAlerts: async () => {
    const response = await api.get('/inventory/alerts');
    return response.data;
  },

  // Obtener medicamento por ID
  getItemById: async (id) => {
    const response = await api.get(`/inventory/${id}`);
    return response.data;
  },

  // Crear medicamento
  createItem: async (itemData) => {
    const response = await api.post('/inventory', itemData);
    return response.data;
  },

  // Actualizar medicamento
  updateItem: async (id, itemData) => {
    const response = await api.put(`/inventory/${id}`, itemData);
    return response.data;
  },

  // Eliminar medicamento
  deleteItem: async (id) => {
    const response = await api.delete(`/inventory/${id}`);
    return response.data;
  },

  // Actualizar cantidad
  updateQuantity: async (id, cantidad, tipo, motivo) => {
    const response = await api.put(`/inventory/${id}/quantity`, {
      cantidad,
      tipo,
      motivo
    });
    return response.data;
  }
};

export default inventoryService;