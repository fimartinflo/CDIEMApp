import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Button, Box,
  CircularProgress, Divider
} from '@mui/material';
import {
  People, Chair, Inventory, Assessment, ManageAccounts,
  LocalHospital, Warning
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import authService from '../services/authService';

// ── Tarjeta de métrica con fondo degradado ────────────────────────────
const MetricCard = ({ label, value, sublabel, color, icon }) => (
  <Card
    sx={{
      background: `linear-gradient(135deg, ${color}cc, ${color})`,
      color: '#fff',
      height: '100%',
      boxShadow: `0 4px 20px ${color}55`
    }}
  >
    <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
      <Box sx={{ mb: 0.5, opacity: 0.85 }}>{icon}</Box>
      <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
        {value ?? '—'}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
        {label}
      </Typography>
      {sublabel && (
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          {sublabel}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const [metrics, setMetrics]               = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [totalUsuarios, setTotalUsuarios]   = useState(null);

  useEffect(() => {
    api.get('/dashboard')
      .then(res => setMetrics(res.data.data))
      .catch(() => setMetrics(null))
      .finally(() => setLoadingMetrics(false));

    if (user?.role === 'admin') {
      api.get('/auth/users')
        .then(res => setTotalUsuarios((res.data.data || []).length))
        .catch(() => setTotalUsuarios(null));
    }
  }, []); // eslint-disable-line

  const allCards = [
    {
      title: 'Pacientes',
      description: 'Gestionar registro de pacientes',
      icon: <People fontSize="large" />,
      path: '/patients',
      color: '#1976d2',
      roles: ['admin', 'enfermera']
    },
    {
      title: 'Sillones',
      description: 'Control de sillones oncológicos',
      icon: <Chair fontSize="large" />,
      path: '/chairs',
      color: '#2e7d32',
      roles: ['admin', 'enfermera']
    },
    {
      title: 'Inventario',
      description: 'Gestión de medicamentos',
      icon: <Inventory fontSize="large" />,
      path: '/inventory',
      color: '#ed6c02',
      roles: ['admin', 'enfermera', 'administracion']
    },
    {
      title: 'Reportes',
      description: 'Informes clínicos y facturación',
      icon: <Assessment fontSize="large" />,
      path: '/reports',
      color: '#7b1fa2',
      roles: ['admin', 'administracion']
    },
    {
      title: 'Usuarios',
      description: 'Gestión de cuentas del sistema',
      icon: <ManageAccounts fontSize="large" />,
      path: '/users',
      color: '#00695c',
      roles: ['admin']
    }
  ];

  const cards = allCards.filter(c => c.roles.includes(user?.role));

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Encabezado */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2' }}>
          CDIEM — Panel de Control
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Bienvenido, {user?.username} · {user?.role}
        </Typography>
      </Box>

      {/* Tarjetas de navegación */}
      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid key={card.title} xs={12} sm={6} md={4}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: `2px solid ${card.color}22`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  cursor: 'pointer',
                  boxShadow: `0 8px 24px ${card.color}30`
                }
              }}
              onClick={() => navigate(card.path)}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Box sx={{ color: card.color, mb: 1.5 }}>{card.icon}</Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>
              </CardContent>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  m: 2, mt: 0,
                  color: card.color,
                  borderColor: card.color,
                  '&:hover': { borderColor: card.color, bgcolor: `${card.color}10` }
                }}
              >
                Acceder
              </Button>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Métricas — solo roles clínicos */}
      {['admin', 'enfermera'].includes(user?.role) && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Estado del Sistema
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {loadingMetrics ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : metrics ? (
            <Grid container spacing={2}>
              <Grid xs={6} sm={6} md={3}>
                <MetricCard
                  label="Pacientes totales"
                  value={metrics.pacientes?.total}
                  sublabel={`${metrics.pacientes?.activos ?? 0} activos`}
                  color="#1976d2"
                  icon={<People />}
                />
              </Grid>
              <Grid xs={6} sm={6} md={3}>
                <MetricCard
                  label="Sillones disponibles"
                  value={metrics.sillones?.disponibles}
                  sublabel={`${metrics.sillones?.ocupados ?? 0} ocupados`}
                  color="#2e7d32"
                  icon={<Chair />}
                />
              </Grid>
              <Grid xs={6} sm={6} md={3}>
                <MetricCard
                  label="Sesiones activas"
                  value={metrics.sesionesActivas}
                  sublabel="En este momento"
                  color="#ed6c02"
                  icon={<LocalHospital />}
                />
              </Grid>
              <Grid xs={6} sm={6} md={3}>
                <MetricCard
                  label="Medicamentos críticos"
                  value={metrics.medicamentosCriticos?.length}
                  sublabel="Stock bajo o agotado"
                  color={metrics.medicamentosCriticos?.length > 0 ? '#c62828' : '#00695c'}
                  icon={<Warning />}
                />
              </Grid>
              {user?.role === 'admin' && (
                <Grid xs={6} sm={6} md={3}>
                  <MetricCard
                    label="Usuarios registrados"
                    value={totalUsuarios}
                    sublabel="Cuentas del sistema"
                    color="#00695c"
                    icon={<ManageAccounts />}
                  />
                </Grid>
              )}
            </Grid>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No se pudieron cargar las métricas del sistema.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
