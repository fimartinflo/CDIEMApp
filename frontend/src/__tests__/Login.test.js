import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';

// Mock del servicio de autenticación
jest.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    isAuthenticated: jest.fn(() => false),
    getCurrentUser: jest.fn(() => null),
  },
}));

// Mock de react-router-dom navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

import authService from '../services/authService';

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('muestra formulario de login con campos usuario y contraseña', () => {
    renderLogin();
    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  test('muestra información de los roles disponibles', () => {
    renderLogin();
    expect(screen.getByText(/acceso completo/i)).toBeInTheDocument();
    expect(screen.getByText(/módulo clínico/i)).toBeInTheDocument();
    expect(screen.getByText(/inventario \+ reportes/i)).toBeInTheDocument();
  });

  test('muestra error cuando las credenciales son incorrectas', async () => {
    authService.login.mockRejectedValueOnce({
      response: { data: { message: 'Credenciales incorrectas' } },
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/usuario/i), 'maluser');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'malpass');
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument();
    });
  });

  test('redirige al dashboard después de login exitoso (admin)', async () => {
    authService.login.mockResolvedValueOnce({
      success: true,
      data: { user: { role: 'admin' }, token: 'tok123' },
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/usuario/i), 'admin');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'admin123');
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('redirige al dashboard después de login como administracion', async () => {
    authService.login.mockResolvedValueOnce({
      success: true,
      data: { user: { role: 'administracion' }, token: 'tok456' },
    });

    renderLogin();
    await userEvent.type(screen.getByLabelText(/usuario/i), 'administracion');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'admin2024');
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('botón se deshabilita mientras carga', async () => {
    authService.login.mockImplementation(() => new Promise(() => {})); // nunca resuelve

    renderLogin();
    await userEvent.type(screen.getByLabelText(/usuario/i), 'admin');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'admin123');
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      // Durante la carga, el botón muestra CircularProgress y queda deshabilitado
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });
});
