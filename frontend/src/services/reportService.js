import api from './api';

const reportService = {
  // Obtener reporte por período
  getReport: async (startDate, endDate) => {
    const response = await api.get('/reports', { params: { startDate, endDate } });
    return response.data.data;
  },

  // Obtener reporte de un paciente específico
  getPatientReport: async (patientId, startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await api.get(`/reports/patient/${patientId}`, { params });
    return response.data.data;
  },

  // Enviar reporte por email
  sendEmail: async (recipientEmail, startDate, endDate, reportData, subject) => {
    const response = await api.post('/reports/email', {
      recipientEmail,
      startDate,
      endDate,
      reportData,
      subject
    });
    return response.data;
  }
};

export default reportService;
