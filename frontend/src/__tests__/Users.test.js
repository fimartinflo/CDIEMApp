import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Users from '../pages/Users';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get:    jest.fn(),
    post:   jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
  },
}));

import api from '../services/api';

const MOCK_USERS = [
  {
    id: 1,
    username: 'admin',
    fullName: 'Administrador CDIEM',
    email: 'admin@cdiem.cl',
    role: 'admin',
    isActive: true,
  },
  {
    id: 2,
    username: 'enfermera',
    fullName: 'Enfermera CDIEM',
    email: 'enfermera@cdiem.cl',
    role: 'enfermera',
    isActive: true,
  },
  {
    id: 3,
    username: 'administracion',
    fullName: 'Administración CDIEM',
    email: 'administracion@cdiem.cl',
    role: 'administracion',
    isActive: false,
  },
];

const renderUsers = () =>
  render(
    <MemoryRouter>
      <Users />
    </MemoryRouter>
  );

describe('Gestión de Usuarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: MOCK_USERS } });
  });

  test('carga y muestra la tabla de usuarios', async () => {
    renderUsers();

    await waitFor(() => {
      expect(screen.getByText('Administrador CDIEM')).toBeInTheDocument();
      expect(screen.getByText('Enfermera CDIEM')).toBeInTheDocument();
      expect(screen.getByText('Administración CDIEM')).toBeInTheDocument();
    });
  });

  test('muestra chips de rol con colores diferenciados', async () => {
    renderUsers();

    await waitFor(() => {
      // MUI Chip renderiza el texto del label
      expect(screen.getByText('Administrador')).toBeInTheDocument();
      expect(screen.getByText('Enfermera')).toBeInTheDocument();
      expect(screen.getByText('Administración')).toBeInTheDocument();
    });
  });

  test('muestra chips de estado activo/inactivo', async () => {
    renderUsers();

    await waitFor(() => {
      // 2 usuarios activos + 1 inactivo
      const activeChips   = screen.getAllByText('Activo');
      const inactiveChips = screen.getAllByText('Inactivo');
      expect(activeChips.length).toBeGreaterThanOrEqual(1);
      expect(inactiveChips.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('botón Nuevo Usuario existe en la página', async () => {
    renderUsers();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nuevo usuario/i })).toBeInTheDocument();
    });
  });

  test('abre el diálogo de crear usuario al hacer click', async () => {
    renderUsers();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nuevo usuario/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /nuevo usuario/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  test('llama a api.put al hacer toggle de usuario', async () => {
    api.put.mockResolvedValue({ data: {} });
    api.get.mockResolvedValue({ data: { data: MOCK_USERS } });
    renderUsers();

    await waitFor(() => {
      expect(screen.getByText('Enfermera CDIEM')).toBeInTheDocument();
    });

    // Buscar la fila de enfermera y hacer click en el 2° botón (toggle, después de Edit)
    const enfRow = screen.getByText('Enfermera CDIEM').closest('tr');
    const rowButtons = within(enfRow).getAllByRole('button');
    expect(rowButtons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(rowButtons[1]); // [0]=Edit, [1]=Toggle, [2]=Reset

    await waitFor(() => {
      expect(api.put).toHaveBeenCalled();
    });
  });

  test('muestra error si falla la carga de usuarios', async () => {
    api.get.mockRejectedValueOnce(new Error('Error de red'));
    renderUsers();

    await waitFor(() => {
      expect(screen.getByText(/error al cargar usuarios/i)).toBeInTheDocument();
    });
  });

  test('click en botón reset abre el diálogo de contraseña', async () => {
    renderUsers();

    await waitFor(() => {
      expect(screen.getByText('Administrador CDIEM')).toBeInTheDocument();
    });

    // Buscar la fila de admin y hacer click en el 3° botón (Reset, después de Edit y Toggle)
    const adminRow = screen.getByText('Administrador CDIEM').closest('tr');
    const rowButtons = within(adminRow).getAllByRole('button');
    expect(rowButtons.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(rowButtons[2]); // [0]=Edit, [1]=Toggle, [2]=Reset

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
