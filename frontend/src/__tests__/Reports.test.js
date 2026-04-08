import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Reports from '../pages/Reports';

jest.mock('../services/reportService', () => ({
  __esModule: true,
  default: {
    getReport:        jest.fn(),
    getPatientReport: jest.fn(),
    generateCopExcel: jest.fn(),
  },
}));

jest.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    getCurrentUser:  jest.fn(),
    isAuthenticated: jest.fn(() => true),
  },
}));

import reportService from '../services/reportService';
import authService   from '../services/authService';

const MOCK_REPORT = {
  resumen: { totalPacientes: 2, totalSesiones: 3, costoTotal: 150000 },
  pacientes: [
    {
      id: 1,
      nombreCompleto: 'Ana Torres Soto',
      rut: '11.111.111-1',
      prevision: 'FONASA',
      totalPaciente: 75000,
      sesiones: [
        {
          sessionId: 1,
          sillon: 'Sillón 1',
          horaInicio: '2026-04-01T10:00:00.000Z',
          horaFin:    '2026-04-01T12:00:00.000Z',
          duracionSegundos: 7200,
          totalSesion: 75000,
          medicamentos: [
            { nombre: 'Cisplatino', cantidad: 1, unidad: 'vial', precioUnitario: 75000, subtotal: 75000 },
          ],
        },
      ],
    },
  ],
  medicamentos: [
    { nombre: 'Cisplatino', cantidadTotal: 1, unidad: 'vial', costoTotal: 75000 },
  ],
  sillones: [
    { nombre: 'Sillón 1', totalSesiones: 1, tiempoTotal: 7200 },
  ],
};

const renderReports = () =>
  render(
    <MemoryRouter>
      <Reports />
    </MemoryRouter>
  );

describe('Reportes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authService.getCurrentUser.mockReturnValue({ role: 'admin', username: 'admin' });
    reportService.getReport.mockResolvedValue(MOCK_REPORT);
    reportService.getPatientReport.mockResolvedValue({
      paciente: MOCK_REPORT.pacientes[0],
      sesiones: MOCK_REPORT.pacientes[0].sesiones,
      costoTotal: 75000,
      periodo: { desde: '2026-04-01', hasta: '2026-04-01' },
    });
  });

  test('muestra el heading Reportes', () => {
    renderReports();
    expect(screen.getByText('Reportes')).toBeInTheDocument();
  });

  test('muestra botón Generar Reporte', () => {
    renderReports();
    expect(screen.getByRole('button', { name: /generar reporte/i })).toBeInTheDocument();
  });

  test('muestra botones de período (Hoy y Ayer)', () => {
    renderReports();
    expect(screen.getByRole('button', { name: /hoy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ayer/i })).toBeInTheDocument();
  });

  test('admin ve la sección COP Excel', () => {
    renderReports();
    expect(screen.getByText(/descargar cop excel/i)).toBeInTheDocument();
  });

  test('administracion ve la sección COP Excel', () => {
    authService.getCurrentUser.mockReturnValue({ role: 'administracion', username: 'administracion' });
    renderReports();
    expect(screen.getByText(/descargar cop excel/i)).toBeInTheDocument();
  });

  test('enfermera NO ve la sección COP Excel', () => {
    authService.getCurrentUser.mockReturnValue({ role: 'enfermera', username: 'enfermera' });
    renderReports();
    expect(screen.queryByText(/descargar cop excel/i)).not.toBeInTheDocument();
  });

  test('muestra resultados tras generar reporte', async () => {
    renderReports();
    fireEvent.click(screen.getByRole('button', { name: /generar reporte/i }));

    await waitFor(() => {
      expect(screen.getByText('Ana Torres Soto')).toBeInTheDocument();
    });
    expect(reportService.getReport).toHaveBeenCalledTimes(1);
  });

  test('muestra botón Exportar Excel cuando hay datos', async () => {
    renderReports();
    fireEvent.click(screen.getByRole('button', { name: /generar reporte/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /exportar excel/i })).toBeInTheDocument();
    });
  });

  test('muestra alerta de error cuando la API falla', async () => {
    reportService.getReport.mockRejectedValueOnce({
      response: { data: { message: 'Error interno del servidor' } },
    });
    renderReports();
    fireEvent.click(screen.getByRole('button', { name: /generar reporte/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
