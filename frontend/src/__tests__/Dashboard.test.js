import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

jest.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    getCurrentUser: jest.fn(),
    isAuthenticated: jest.fn(() => true),
  },
}));

jest.mock('../components/Layout', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

import api from '../services/api';
import authService from '../services/authService';

const MOCK_METRICS = {
  pacientes: { total: 15, activos: 10 },
  sillones: { disponibles: 3, ocupados: 2 },
  sesionesActivas: 2,
  medicamentosCriticos: [],
};

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: MOCK_METRICS } });
  });

  test('muestra panel de control con título', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'admin', username: 'admin' });
    renderDashboard();

    expect(screen.getByText(/CDIEM - Panel de Control/i)).toBeInTheDocument();
  });

  test('admin ve todas las cards: Pacientes, Sillones, Inventario, Reportes', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'admin', username: 'admin' });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Pacientes')).toBeInTheDocument();
      expect(screen.getByText('Sillones')).toBeInTheDocument();
      expect(screen.getByText('Inventario')).toBeInTheDocument();
      expect(screen.getByText('Reportes')).toBeInTheDocument();
    });
  });

  test('enfermera NO ve card de Reportes', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'enfermera', username: 'enfermera' });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Pacientes')).toBeInTheDocument();
    });

    expect(screen.queryByText('Reportes')).not.toBeInTheDocument();
  });

  test('administracion solo ve Inventario y Reportes', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'administracion', username: 'administracion' });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Inventario')).toBeInTheDocument();
      expect(screen.getByText('Reportes')).toBeInTheDocument();
    });

    expect(screen.queryByText('Pacientes')).not.toBeInTheDocument();
    expect(screen.queryByText('Sillones')).not.toBeInTheDocument();
  });

  test('admin ve métricas del sistema', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'admin', username: 'admin' });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Estado del Sistema')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // total pacientes
      expect(screen.getByText('3')).toBeInTheDocument();  // sillones disponibles
    });
  });

  test('administracion NO ve sección de métricas', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'administracion', username: 'administracion' });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Inventario')).toBeInTheDocument();
    });

    expect(screen.queryByText('Estado del Sistema')).not.toBeInTheDocument();
  });

  test('maneja fallo de métricas sin romper el dashboard', async () => {
    api.get.mockRejectedValueOnce(new Error('Error de red'));
    authService.getCurrentUser.mockReturnValue({ role: 'admin', username: 'admin' });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/no se pudieron cargar las métricas/i)).toBeInTheDocument();
    });
  });
});
