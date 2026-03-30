import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Patients from '../pages/Patients';

jest.mock('../services/patientService', () => ({
  __esModule: true,
  default: {
    getPatients: jest.fn(),
    searchPatients: jest.fn(),
    createPatient: jest.fn(),
    updatePatient: jest.fn(),
    deletePatient: jest.fn(),
    scheduleVisit: jest.fn(),
    validateRUT: jest.fn(() => true),
    formatRUT: jest.fn((r) => r),
  },
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

jest.mock('../components/Layout', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

jest.mock('../components/PatientForm', () => ({
  __esModule: true,
  default: ({ onSubmit }) => (
    <form data-testid="patient-form" onSubmit={(e) => { e.preventDefault(); onSubmit({}); }}>
      <button type="submit">Guardar</button>
    </form>
  ),
}));

jest.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    getCurrentUser: jest.fn(() => ({ role: 'admin' })),
    isAuthenticated: jest.fn(() => true),
  },
}));

import patientService from '../services/patientService';
import api from '../services/api';

const MOCK_PATIENTS = [
  {
    id: 1,
    nombreCompleto: 'Ana García',
    rut: '12345678-9',
    tipoIdentificacion: 'rut',
    estado: 'activo',
    telefono: '912345678',
    correo: 'ana@test.cl',
  },
  {
    id: 2,
    nombreCompleto: 'Carlos López',
    rut: null,
    pasaporte: 'AB123456',
    tipoIdentificacion: 'pasaporte',
    estado: 'en_tratamiento',
    telefono: '',
    correo: '',
  },
];

const renderPatients = () =>
  render(
    <MemoryRouter>
      <Patients />
    </MemoryRouter>
  );

describe('Pacientes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    patientService.getPatients.mockResolvedValue({
      success: true,
      data: MOCK_PATIENTS,
      pagination: { total: 2, page: 1, pages: 1, limit: 10 },
    });
    api.get.mockResolvedValue({ data: { success: true, data: [] } });
  });

  test('muestra lista de pacientes al cargar', async () => {
    renderPatients();

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument();
      expect(screen.getByText('Carlos López')).toBeInTheDocument();
    });
  });

  test('muestra chip de estado correcto', async () => {
    renderPatients();

    await waitFor(() => {
      expect(screen.getByText('activo')).toBeInTheDocument();
      expect(screen.getByText('en_tratamiento')).toBeInTheDocument();
    });
  });

  test('muestra botón "Nuevo Paciente"', async () => {
    renderPatients();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nuevo paciente/i })).toBeInTheDocument();
    });
  });

  test('abre diálogo al hacer click en Nuevo Paciente', async () => {
    renderPatients();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nuevo paciente/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /nuevo paciente/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  test('muestra error si falla la carga de pacientes', async () => {
    patientService.getPatients.mockRejectedValueOnce(new Error('Error de red'));
    renderPatients();

    await waitFor(() => {
      expect(screen.getByText(/error al cargar pacientes/i)).toBeInTheDocument();
    });
  });
});
