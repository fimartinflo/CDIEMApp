import React from 'react';
import { Grid, Card, CardContent, Typography, Button, Box } from '@mui/material';
import { People, Chair, Inventory, Dashboard as DashboardIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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
      description: 'Control de sillones dentales',
      icon: <Chair fontSize="large" />,
      path: '/chairs',
      color: '#2e7d32'
    },
    {
      title: 'Inventario',
      description: 'Gestión de inventario',
      icon: <Inventory fontSize="large" />,
      path: '/inventory',
      color: '#ed6c02'
    }
  ];

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* CAMBIO AQUÍ: "Dashboard" por "CDIEM" */}
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

      {/* Sección de estadísticas rápida (opcional) */}
      <Box sx={{ mt: 4, p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Sistema CDIEM 
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Plataforma integral para la gestión clínica y administrativa
        </Typography>
      </Box>
    </Box>
  );
};

export default Dashboard;