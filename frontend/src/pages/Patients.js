import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import patientService from '../services/patientService';
import PatientForm from '../components/PatientForm';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estado para diálogos
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  
  // Estado para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  
  // Estado para formularios
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [scheduleData, setScheduleData] = useState({
    fechaVisita: '',
    tipoVisita: 'consulta',
    notas: ''
  });

  // Cargar pacientes
  useEffect(() => {
    loadPatients();
  }, [page, estadoFilter]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const result = await patientService.getPatients(
        page, 
        limit, 
        estadoFilter || undefined
      );
      setPatients(result.data || []);
      setTotalPages(result.pagination?.pages || 1);
    } catch (err) {
      setError('Error al cargar pacientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Búsqueda en tiempo real
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        handleSearch();
      } else {
        loadPatients();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    try {
      const result = await patientService.searchPatients(searchTerm);
      setPatients(result.data || []);
      setTotalPages(1);
    } catch (err) {
      console.error('Error en búsqueda:', err);
    }
  };

  // Crear paciente
  const handleCreate = async (patientData) => {
    try {
      await patientService.createPatient(patientData);
      setSuccess('Paciente creado exitosamente');
      setOpenDialog(false);
      loadPatients();
    } catch (err) {
      setError('Error al crear paciente');
    }
  };

  // Actualizar paciente
  const handleUpdate = async (patientData) => {
    try {
      await patientService.updatePatient(selectedPatient.id, patientData);
      setSuccess('Paciente actualizado exitosamente');
      setOpenEditDialog(false);
      loadPatients();
    } catch (err) {
      setError('Error al actualizar paciente');
    }
  };

  // Eliminar paciente
  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de desactivar este paciente?')) {
      try {
        await patientService.deletePatient(id);
        setSuccess('Paciente desactivado exitosamente');
        loadPatients();
      } catch (err) {
        setError('Error al desactivar paciente');
      }
    }
  };

  // ============ CORRECCIÓN AQUÍ ============
  // Función para agendar visita - CORREGIDA
  const handleScheduleVisit = async () => {
    try {
      if (!selectedPatient) {
        setError('No hay paciente seleccionado');
        return;
      }

      // Verificar que la fecha esté seleccionada
      if (!scheduleData.fechaVisita) {
        setError('Por favor seleccione una fecha para la visita');
        return;
      }

      // Usar patientService o crear un servicio específico para visitas
      // Suponiendo que patientService tiene un método scheduleVisit
      await patientService.scheduleVisit(selectedPatient.id, {
        fecha: scheduleData.fechaVisita,
        tipo: scheduleData.tipoVisita,
        notas: scheduleData.notas
      });

      setSuccess('Visita agendada correctamente');
      setOpenScheduleDialog(false);
      
      // Limpiar datos
      setScheduleData({
        fechaVisita: '',
        tipoVisita: 'consulta',
        notas: ''
      });
      
      // Recargar pacientes para actualizar estado
      loadPatients();
    } catch (error) {
      console.error('Error agendando visita:', error);
      setError('Error al agendar visita: ' + (error.response?.data?.message || error.message));
    }
  };
  // ==========================================

  // Obtener color según estado
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'activo': return 'success';
      case 'inactivo': return 'error';
      case 'en_tratamiento': return 'warning';
      default: return 'default';
    }
  };

  // Calcular edad
  const calculateAge = (fechaNacimiento) => {
    if (!fechaNacimiento) return 'N/A';
    const today = new Date();
    const birthDate = new Date(fechaNacimiento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Container maxWidth="xl">
      {/* Encabezado */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Gestión de Pacientes
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Registro y control de pacientes oncológicos
        </Typography>
      </Box>

      {/* Barra de herramientas */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', flex: 1, gap: 2, width: '100%' }}>
            <TextField
              placeholder="Buscar por nombre, RUT o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={estadoFilter}
                label="Estado"
                onChange={(e) => setEstadoFilter(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="inactivo">Inactivo</MenuItem>
                <MenuItem value="en_tratamiento">En tratamiento</MenuItem>
                <MenuItem value="sin_asignar">Sin Asignar</MenuItem>
                <MenuItem value="asignado">Asignado</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Nuevo Paciente
          </Button>
        </Box>
      </Paper>

      {/* Tabla de pacientes */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nombre Completo</TableCell>
                  <TableCell>Identificación</TableCell>
                  <TableCell>Edad</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Previsión</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <Typography variant="body1">
                        {patient.nombreCompleto}
                      </Typography>
                      {patient.genero && (
                        <Typography variant="caption" color="text.secondary">
                          {patient.genero === 'otro' ? patient.generoOtro : patient.genero}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {patient.tipoIdentificacion === 'rut' 
                        ? patientService.formatRUT(patient.rut)
                        : patient.pasaporte}
                    </TableCell>
                    <TableCell>
                      {calculateAge(patient.fechaNacimiento)} años
                    </TableCell>
                    <TableCell>
                      <Box>
                        {patient.telefono && (
                          <Typography variant="body2">
                            📞 {patient.telefono}
                          </Typography>
                        )}
                        {patient.correo && (
                          <Typography variant="body2">
                            ✉️ {patient.correo}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {patient.prevision || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={patient.estado}
                        color={getEstadoColor(patient.estado)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setOpenEditDialog(true);
                        }}
                        color="warning"
                      >
                        <EditIcon />
                      </IconButton>
                      
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setScheduleData({
                            fechaVisita: new Date().toISOString().split('T')[0],
                            tipoVisita: 'consulta',
                            notas: ''
                          });
                          setOpenScheduleDialog(true);
                        }}
                        color="primary"
                      >
                        <CalendarIcon />
                      </IconButton>
                      
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(patient.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Paginación */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Diálogo: Crear paciente */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo Paciente</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <PatientForm
              onSave={handleCreate}
              onCancel={() => setOpenDialog(false)}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Editar paciente */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Paciente</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <PatientForm
              patient={selectedPatient}
              onSave={handleUpdate}
              onCancel={() => setOpenEditDialog(false)}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Agendar visita - CORREGIDO */}
      <Dialog open={openScheduleDialog} onClose={() => setOpenScheduleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Agendar Visita - {selectedPatient?.nombreCompleto}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Fecha de Visita"
              type="date"
              value={scheduleData.fechaVisita}
              onChange={(e) => setScheduleData({...scheduleData, fechaVisita: e.target.value})}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            
            <FormControl fullWidth>
              <InputLabel>Tipo de Visita</InputLabel>
              <Select
                value={scheduleData.tipoVisita}
                label="Tipo de Visita"
                onChange={(e) => setScheduleData({...scheduleData, tipoVisita: e.target.value})}
              >
                <MenuItem value="consulta">Consulta</MenuItem>
                <MenuItem value="tratamiento">Tratamiento</MenuItem>
                <MenuItem value="control">Control</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Notas"
              value={scheduleData.notas}
              onChange={(e) => setScheduleData({...scheduleData, notas: e.target.value})}
              fullWidth
              multiline
              rows={3}
              placeholder="Observaciones para la visita..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenScheduleDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleScheduleVisit} // Usa la función corregida
            variant="contained"
          >
            Agendar
          </Button>
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

export default Patients;