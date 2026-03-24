import React, { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Button, Box, CircularProgress, Divider } from '@mui/material';
import { People, Chair, Inventory } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(res => setMetrics(res.data.data))
      .catch(() => setMetrics(null))
      .finally(() => setLoadingMetrics(false));
  }, []);

  const cards = [
    {
      title: 'Pacientes',
      description: 'Gestionar registro de pacientes',
      icon: <People fontSize="large" />,
      path: '/patients',
      color: '#1976d2'
    },
    {
      title: 'Sillones',
      description: 'Control de sillones oncológicos',
      icon: <Chair fontSize="large" />,
      path: '/chairs',
      color: '#2e7d32'
    },
    {
      title: 'Inventario',
      description: 'Gestión de medicamentos',
      icon: <Inventory fontSize="large" />,
      path: '/inventory',
      color: '#ed6c02'
    }
  ];

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
        CDIEM - Panel de Control
      </Typography>

      <Typography variant="subtitle1" gutterBottom sx={{ mb: 3 }}>
        Bienvenido, {user?.username} ({user?.role})
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.3s',
                border: `2px solid ${card.color}20`,
                '&:hover': {
                  transform: 'scale(1.03)',
                  cursor: 'pointer',
                  boxShadow: `0 8px 16px ${card.color}30`
                }
              }}
              onClick={() => navigate(card.path)}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Box sx={{ color: card.color, mb: 2 }}>
                  {card.icon}
                </Box>
                <Typography gutterBottom variant="h5" component="h2" sx={{ fontWeight: 'medium' }}>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>
              </CardContent>
              <Button
                size="small"
                sx={{
                  m: 2,
                  color: card.color,
                  borderColor: card.color,
                  '&:hover': {
                    borderColor: card.color,
                    backgroundColor: `${card.color}10`
                  }
                }}
                variant="outlined"
              >
                Acceder
              </Button>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Métricas en tiempo real */}
      <Box sx={{ mt: 4, p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Estado del Sistema
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {loadingMetrics ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : metrics ? (
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="primary.main">
                    {metrics.pacientes?.total ?? '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pacientes totales
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    {metrics.pacientes?.activos ?? 0} activos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="success.main">
                    {metrics.sillones?.disponibles ?? '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sillones disponibles
                  </Typography>
                  <Typography variant="caption" color="error.main">
                    {metrics.sillones?.ocupados ?? 0} ocupados
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color="warning.main">
                    {metrics.sesionesActivas ?? '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sesiones activas
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    En este momento
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" color={metrics.medicamentosCriticos?.length > 0 ? 'error.main' : 'text.primary'}>
                    {metrics.medicamentosCriticos?.length ?? '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Medicamentos críticos
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Stock bajo o agotado
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No se pudieron cargar las métricas del sistema.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Dashboard;
