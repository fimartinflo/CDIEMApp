import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Chairs from '../pages/Chairs';

jest.mock('../services/chairService', () => ({
  __esModule: true,
  default: {
    getChairs: jest.fn(),
    createChair: jest.fn(),
    updateChair: jest.fn(),
    deleteChair: jest.fn(),
    assignPatient: jest.fn(),
    releaseChair: jest.fn(),
  },
}));

jest.mock('../services/patientService', () => ({
  __esModule: true,
  default: {
    getPatients: jest.fn(),
  },
}));

jest.mock('../services/inventoryService', () => ({
  __esModule: true,
  default: {
    getItems: jest.fn(),
  },
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock('../components/Layout', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

jest.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    getCurrentUser: jest.fn(() => ({ role: 'enfermera' })),
    isAuthenticated: jest.fn(() => true),
  },
}));

import chairService from '../services/chairService';
import patientService from '../services/patientService';
import inventoryService from '../services/inventoryService';

const MOCK_CHAIRS = [
  {
    id: 1,
    numero: 'S1',
    nombre: 'Sillón 1',
    ubicacion: 'Sala A',
    estado: 'disponible',
    activo: true,
    pacienteActual: null,
    horaInicio: null,
    sessionId: null,
  },
  {
    id: 2,
    numero: 'S2',
    nombre: 'Sillón 2',
    ubicacion: 'Sala A',
    estado: 'ocupado',
    activo: true,
    pacienteActual: 'Juan Pérez',
    pacienteActualId: 5,
    horaInicio: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
    sessionId: 10,
  },
];

const renderChairs = () =>
  render(
    <MemoryRouter>
      <Chairs />
    </MemoryRouter>
  );

describe('Sillones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chairService.getChairs.mockResolvedValue({ success: true, data: MOCK_CHAIRS });
    patientService.getPatients.mockResolvedValue({ success: true, data: [] });
    inventoryService.getItems.mockResolvedValue({ success: true, data: [] });
  });

  test('muestra lista de sillones al cargar', async () => {
    renderChairs();

    await waitFor(() => {
      expect(screen.getByText('Sillón 1')).toBeInTheDocument();
      expect(screen.getByText('Sillón 2')).toBeInTheDocument();
    });
  });

  test('sillón disponible muestra botón Asignar Paciente', async () => {
    renderChairs();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /asignar paciente/i })).toBeInTheDocument();
    });
  });

  test('sillón ocupado muestra nombre del paciente', async () => {
    renderChairs();

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });
  });

  test('sillón ocupado muestra botón de liberar', async () => {
    renderChairs();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /liberar/i })).toBeInTheDocument();
    });
  });

  test('abre diálogo de asignación al click en Asignar Paciente', async () => {
    renderChairs();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /asignar paciente/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /asignar paciente/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  test('muestra error si falla la carga de sillones', async () => {
    chairService.getChairs.mockRejectedValueOnce(new Error('Error de red'));
    renderChairs();

    await waitFor(() => {
      expect(screen.getByText(/error al cargar sillones/i)).toBeInTheDocument();
    });
  });

  test('no llama al servicio si no hay paciente seleccionado', async () => {
    const mockPatient = { id: 5, nombreCompleto: 'Juan Pérez', estado: 'activo' };
    patientService.getPatients.mockResolvedValue({ success: true, data: [mockPatient] });
    chairService.assignPatient.mockResolvedValue({
      success: true,
      data: { session: { id: 10 } },
    });
    chairService.getChairs.mockResolvedValue({ success: true, data: [MOCK_CHAIRS[0]] });

    renderChairs();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /asignar paciente/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /asignar paciente/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Confirmar asignación sin paciente → el servicio NO debe ser llamado
    fireEvent.click(screen.getByRole('button', { name: /^asignar$/i }));

    await waitFor(() => {
      expect(chairService.assignPatient).not.toHaveBeenCalled();
    });
  });
});
