import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Inventory from '../pages/Inventory';

jest.mock('../services/inventoryService', () => ({
  __esModule: true,
  default: {
    getItems: jest.fn(),
    getAlerts: jest.fn(),
    createItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
    updateQuantity: jest.fn(),
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

// @mui/x-date-pickers usa ESM y no puede ser transformado por Jest 27
jest.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ label, value, onChange }) => (
    <input aria-label={label} value={value || ''} onChange={(e) => onChange && onChange(e.target.value)} />
  ),
}));
jest.mock('@mui/x-date-pickers/LocalizationProvider', () => ({
  LocalizationProvider: ({ children }) => children,
}));
jest.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: class {},
}));

import inventoryService from '../services/inventoryService';
import authService from '../services/authService';

const MOCK_ITEMS = [
  {
    id: 1,
    nombre: 'Oxaliplatino 100mg',
    descripcion: 'Quimioterapia',
    cantidad: 10,
    unidad: 'vial',
    precio: 45000,
    fechaExpiracion: '2027-06-01',
    minimoStock: 5,
    activo: true,
  },
  {
    id: 2,
    nombre: 'Bevacizumab 400mg',
    descripcion: 'Anticuerpo monoclonal',
    cantidad: 3,
    unidad: 'vial',
    precio: 120000,
    fechaExpiracion: '2026-01-01',
    minimoStock: 5,
    activo: true,
  },
];

const renderInventory = () =>
  render(
    <MemoryRouter>
      <Inventory />
    </MemoryRouter>
  );

describe('Inventario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inventoryService.getItems.mockResolvedValue({ success: true, data: MOCK_ITEMS });
    inventoryService.getAlerts.mockResolvedValue({ success: true, data: { critico: [], porVencer: [] } });
  });

  test('muestra la lista de medicamentos al cargar', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'admin' });
    renderInventory();

    await waitFor(() => {
      expect(screen.getByText('Oxaliplatino 100mg')).toBeInTheDocument();
      expect(screen.getByText('Bevacizumab 400mg')).toBeInTheDocument();
    });
  });

  test('muestra botones de edición y creación solo para admin y administracion', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'admin' });
    renderInventory();

    await waitFor(() => {
      expect(screen.getByText('Oxaliplatino 100mg')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /nuevo medicamento/i })).toBeInTheDocument();
  });

  test('enfermera NO ve botón de creación ni edición', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'enfermera' });
    renderInventory();

    await waitFor(() => {
      expect(screen.getByText('Oxaliplatino 100mg')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /nuevo medicamento/i })).not.toBeInTheDocument();
  });

  test('administracion SÍ ve botón de creación', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'administracion' });
    renderInventory();

    await waitFor(() => {
      expect(screen.getByText('Oxaliplatino 100mg')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /nuevo medicamento/i })).toBeInTheDocument();
  });

  test('muestra chip de stock bajo cuando cantidad < stockMinimo', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'admin' });
    renderInventory();

    await waitFor(() => {
      // Bevacizumab tiene cantidad=3, minimoStock=5 → bajo stock
      expect(screen.getByText(/bajo stock/i)).toBeInTheDocument();
    });
  });

  test('muestra precio en formato CLP', async () => {
    authService.getCurrentUser.mockReturnValue({ role: 'admin' });
    renderInventory();

    await waitFor(() => {
      expect(screen.getByText(/45\.000/)).toBeInTheDocument();
    });
  });

  test('muestra mensaje de error si falla la carga', async () => {
    inventoryService.getItems.mockRejectedValueOnce(new Error('Error de red'));
    authService.getCurrentUser.mockReturnValue({ role: 'admin' });
    renderInventory();

    await waitFor(() => {
      expect(screen.getByText(/error al cargar inventario/i)).toBeInTheDocument();
    });
  });
});
