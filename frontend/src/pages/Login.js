import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import authService from '../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    console.log('Intentando login con:', formData.username);

    try {
      // Llama al servicio de autenticación
      const result = await authService.login(formData.username, formData.password);
      
      console.log('Respuesta del login:', result);
      
      if (result.success) {
        console.log('Login exitoso, redirigiendo...');
        navigate('/dashboard');
      } else {
        setError(result.message || 'Error en el login');
      }
    } catch (err) {
      console.error('Error completo:', err);
      console.error('Error response:', err.response);
      
      // Muestra información detallada del error
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Error de conexión con el servidor';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Box
            sx={{
              backgroundColor: '#1976d2',
              borderRadius: '50%',
              padding: 2,
              marginBottom: 2,
            }}
          >
            <LockOutlined sx={{ color: 'white', fontSize: 30 }} />
          </Box>
          
          <Typography component="h1" variant="h5">
            CDIEM - Centro Oncológico
          </Typography>
          
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 3 }}>
            Sistema de Gestión
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Usuario"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
              helperText="Usuario: admin o doctor"
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              helperText="Contraseña: admin123 o doctor123"
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              Credenciales de prueba:
            </Typography>
            <Typography variant="caption" display="block">
              Usuario: <strong>admin</strong> / Contraseña: <strong>admin123</strong>
            </Typography>
            <Typography variant="caption" display="block">
              Usuario: <strong>doctor</strong> / Contraseña: <strong>doctor123</strong>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;