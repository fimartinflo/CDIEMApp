import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Chip,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import {
  Chair as ChairIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as AvailableIcon,
  Block as OccupiedIcon,
  Build as MaintenanceIcon
} from '@mui/icons-material';
import chairService from '../services/chairService';
import patientService from '../services/patientService';

const Chairs = () => {
  const [chairs, setChairs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Diálogos
  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  
  // Estados para formularios
  const [selectedChair, setSelectedChair] = useState(null);
  const [newChair, setNewChair] = useState({
    numero: '',
    nombre: '',
    ubicacion: '',
    estado: 'disponible'
  });
  const [editChair, setEditChair] = useState({
    id: '',
    numero: '',
    nombre: '',
    ubicacion: '',
    estado: 'disponible'
  });
  const [assignData, setAssignData] = useState({
    pacienteId: '',
    medicamentos: ''
  });

  // Cargar sillones y pacientes
  useEffect(() => {
    loadChairs();
    loadPatients();
  }, []);

  const loadChairs = async () => {
    setLoading(true);
    try {
      console.log('Cargando sillones...');
      const result = await chairService.getChairs();
      console.log('Resultado de sillones:', result);
      setChairs(result.data || []);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Error al cargar sillones';
      setError(errorMsg);
      console.error('Error detallado:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const result = await patientService.getPatients(1, 100);
      setPatients(result.data || []);
    } catch (err) {
      console.error('Error al cargar pacientes:', err);
    }
  };

  // Abrir diálogo para crear sillón
  const handleCreateOpen = () => {
    setNewChair({
      numero: '',
      nombre: '',
      ubicacion: '',
      estado: 'disponible'
    });
    setOpenDialog(true);
  };

  // Crear sillón
  const handleCreate = async () => {
    try {
      await chairService.createChair(newChair);
      setSuccess('Sillón creado exitosamente');
      setOpenDialog(false);
      loadChairs();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error al crear sillón';
      setError(errorMsg);
    }
  };

  // Abrir diálogo para editar sillón
  const handleEditOpen = (chair) => {
    setEditChair({
      id: chair.id,
      numero: chair.numero,
      nombre: chair.nombre,
      ubicacion: chair.ubicacion,
      estado: chair.estado
    });
    setOpenEditDialog(true);
  };

  // Actualizar sillón
  const handleEdit = async () => {
    try {
      await chairService.updateChair(editChair.id, editChair);
      setSuccess('Sillón actualizado exitosamente');
      setOpenEditDialog(false);
      loadChairs();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error al actualizar sillón';
      setError(errorMsg);
    }
  };

  // Eliminar sillón
  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este sillón?')) {
      try {
        await chairService.deleteChair(id);
        setSuccess('Sillón eliminado exitosamente');
        loadChairs();
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Error al eliminar sillón';
        setError(errorMsg);
      }
    }
  };

  // Abrir diálogo para asignar paciente
  const handleAssignOpen = (chair) => {
    setSelectedChair(chair);
    setAssignData({
      pacienteId: '',
      medicamentos: ''
    });
    setOpenAssignDialog(true);
  };

  // Asignar paciente a sillón
  const handleAssign = async () => {
    try {
      await chairService.assignPatient(
        selectedChair.id,
        assignData.pacienteId,
        assignData.medicamentos ? [assignData.medicamentos] : []
      );
      setSuccess('Paciente asignado exitosamente');
      setOpenAssignDialog(false);
      loadChairs();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Error al asignar paciente';
      setError(errorMsg);
    }
  };

  // Liberar sillón
  const handleRelease = async (id) => {
    if (window.confirm('¿Está seguro de liberar este sillón?')) {
      try {
        await chairService.releaseChair(id);
        setSuccess('Sillón liberado exitosamente');
        loadChairs();
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Error al liberar sillón';
        setError(errorMsg);
      }
    }
  };

  // Obtener color según estado
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'disponible': return 'success';
      case 'ocupado': return 'error';
      case 'mantenimiento': return 'warning';
      default: return 'default';
    }
  };

  // Obtener icono según estado
  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'disponible': return <AvailableIcon />;
      case 'ocupado': return <OccupiedIcon />;
      case 'mantenimiento': return <MaintenanceIcon />;
      default: return <ChairIcon />;
    }
  };

  // Formatear tiempo
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Calcular duración
  const calculateDuration = (horaInicio) => {
    if (!horaInicio) return '';
    const inicio = new Date(horaInicio);
    const ahora = new Date();
    const minutos = Math.round((ahora - inicio) / (1000 * 60));
    return `${minutos} min`;
  };

  return (
    <Container maxWidth="xl">
      {/* Encabezado */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Gestión de Sillones Oncológicos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Control de sillones en tiempo real - Centro CDIEM
        </Typography>
      </Box>

      {/* Barra de herramientas */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Sillones Activos: {chairs.filter(c => c.activo !== false).length}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateOpen}
          >
            Nuevo Sillón
          </Button>
        </Box>
      </Paper>

      {/* Vista de sillones */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {chairs
            .filter(chair => chair.activo !== false)
            .map((chair) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={chair.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: `2px solid ${
                      chair.estado === 'disponible' ? '#4caf50' :
                      chair.estado === 'ocupado' ? '#f44336' :
                      '#ff9800'
                    }`,
                    transition: 'transform 0.3s',
                    '&:hover': {
                      transform: 'scale(1.02)'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Encabezado del sillón */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ChairIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">
                          {chair.numero}
                        </Typography>
                      </Box>
                      <Chip
                        icon={getEstadoIcon(chair.estado)}
                        label={chair.estado}
                        color={getEstadoColor(chair.estado)}
                        size="small"
                      />
                    </Box>

                    {/* Información del sillón */}
                    <Typography variant="body1" gutterBottom>
                      {chair.nombre}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      📍 {chair.ubicacion || 'Sin ubicación'}
                    </Typography>

                    {/* Información del paciente si está ocupado */}
                    {chair.estado === 'ocupado' && chair.pacienteActual && (
                      <Paper sx={{ p: 2, mt: 2, bgcolor: '#ffebee' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <PersonIcon sx={{ mr: 1, color: 'error.main' }} />
                          <Typography variant="subtitle2">
                            Paciente: {chair.pacienteActual}
                          </Typography>
                        </Box>
                        
                        {chair.horaInicio && (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <TimeIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="caption">
                                Inicio: {formatTime(chair.horaInicio)}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="error.main">
                              {calculateDuration(chair.horaInicio)}
                            </Typography>
                          </Box>
                        )}
                        
                        {chair.medicamentosAdministrados && chair.medicamentosAdministrados.length > 0 && (
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            💊 {Array.isArray(chair.medicamentosAdministrados) 
                              ? chair.medicamentosAdministrados.join(', ')
                              : chair.medicamentosAdministrados}
                          </Typography>
                        )}
                      </Paper>
                    )}

                    {/* Botones de acción */}
                    <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                      {chair.estado === 'disponible' ? (
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          fullWidth
                          onClick={() => handleAssignOpen(chair)}
                        >
                          Asignar Paciente
                        </Button>
                      ) : chair.estado === 'ocupado' ? (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          fullWidth
                          onClick={() => handleRelease(chair.id)}
                        >
                          Liberar Sillón
                        </Button>
                      ) : null}
                      
                      <IconButton
                        size="small"
                        onClick={() => handleEditOpen(chair)}
                        color="warning"
                      >
                        <EditIcon />
                      </IconButton>
                      
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(chair.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          }
        </Grid>
      )}

      {/* Estadísticas */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Resumen de Estado
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>
                  Total
                </Typography>
                <Typography variant="h4">
                  {chairs.filter(c => c.activo !== false).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="success.main" gutterBottom>
                  Disponibles
                </Typography>
                <Typography variant="h4" color="success.main">
                  {chairs.filter(c => c.estado === 'disponible' && c.activo !== false).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="error.main" gutterBottom>
                  Ocupados
                </Typography>
                <Typography variant="h4" color="error.main">
                  {chairs.filter(c => c.estado === 'ocupado' && c.activo !== false).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography color="warning.main" gutterBottom>
                  Mantenimiento
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {chairs.filter(c => c.estado === 'mantenimiento' && c.activo !== false).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Diálogo: Crear sillón */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Nuevo Sillón Oncológico</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
            <TextField
              label="Número del Sillón *"
              value={newChair.numero}
              onChange={(e) => setNewChair({...newChair, numero: e.target.value})}
              fullWidth
              required
              helperText="Ej: S1, S2, S3..."
            />
            
            <TextField
              label="Nombre *"
              value={newChair.nombre}
              onChange={(e) => setNewChair({...newChair, nombre: e.target.value})}
              fullWidth
              required
              helperText="Ej: Sillón de Quimioterapia 1"
            />
            
            <TextField
              label="Ubicación"
              value={newChair.ubicacion}
              onChange={(e) => setNewChair({...newChair, ubicacion: e.target.value})}
              fullWidth
              helperText="Ej: Sala A, Área de Tratamiento"
            />
            
            <FormControl fullWidth>
              <InputLabel>Estado Inicial *</InputLabel>
              <Select
                value={newChair.estado}
                label="Estado Inicial *"
                onChange={(e) => setNewChair({...newChair, estado: e.target.value})}
              >
                <MenuItem value="disponible">Disponible</MenuItem>
                <MenuItem value="mantenimiento">Mantenimiento</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleCreate} variant="contained">Crear Sillón</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: Editar sillón */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Editar Sillón {editChair.numero}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
            <TextField
              label="Número del Sillón *"
              value={editChair.numero}
              onChange={(e) => setEditChair({...editChair, numero: e.target.value})}
              fullWidth
              required
            />
            
            <TextField
              label="Nombre *"
              value={editChair.nombre}
              onChange={(e) => setEditChair({...editChair, nombre: e.target.value})}
              fullWidth
              required
            />
            
            <TextField
              label="Ubicación"
              value={editChair.ubicacion}
              onChange={(e) => setEditChair({...editChair, ubicacion: e.target.value})}
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={editChair.estado}
                label="Estado"
                onChange={(e) => setEditChair({...editChair, estado: e.target.value})}
              >
                <MenuItem value="disponible">Disponible</MenuItem>
                <MenuItem value="ocupado">Ocupado</MenuItem>
                <MenuItem value="mantenimiento">Mantenimiento</MenuItem>
                <MenuItem value="deshabilitado">Deshabilitado</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
          <Button onClick={handleEdit} variant="contained">Actualizar Sillón</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: Asignar paciente */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)}>
        <DialogTitle>Asignar Paciente a Sillón {selectedChair?.numero}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
            <FormControl fullWidth required>
              <InputLabel>Seleccionar Paciente *</InputLabel>
              <Select
                value={assignData.pacienteId}
                label="Seleccionar Paciente *"
                onChange={(e) => setAssignData({...assignData, pacienteId: e.target.value})}
              >
                {patients
                  .filter(p => p.estado === 'activo' || p.estado === 'en_tratamiento')
                  .map((patient) => (
                    <MenuItem key={patient.id} value={patient.id}>
                      {patient.nombreCompleto} - {
                        patient.tipoIdentificacion === 'rut' 
                          ? patientService.formatRUT(patient.rut)
                          : patient.pasaporte
                      }
                    </MenuItem>
                  ))
                }
              </Select>
            </FormControl>
            
            <TextField
              label="Medicamentos a Administrar"
              value={assignData.medicamentos}
              onChange={(e) => setAssignData({...assignData, medicamentos: e.target.value})}
              fullWidth
              multiline
              rows={3}
              placeholder="Ej: 
• Medicamento A - 100mg
• Medicamento B - 50mg cada 8 horas
• Suero fisiológico - 500ml"
              helperText="Liste los medicamentos que se administrarán en este sillón"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancelar</Button>
          <Button onClick={handleAssign} variant="contained">Asignar Paciente</Button>
        </DialogActions>
      </Dialog>

      {/* Notificaciones */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Chairs;