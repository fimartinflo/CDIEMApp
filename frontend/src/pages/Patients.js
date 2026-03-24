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
  InputLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  History as HistoryIcon,
  MedicalServices as MedIcon
} from '@mui/icons-material';
import patientService from '../services/patientService';
import PatientForm from '../components/PatientForm';
import api from '../services/api';

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Diálogos
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);

  // Búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Formularios y selección
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [scheduleData, setScheduleData] = useState({
    fechaVisita: '',
    tipoVisita: 'consulta',
    notas: ''
  });

  // Datos de historial clínico
  const [patientHistory, setPatientHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Datos de visitas agendadas (para el diálogo de agendar)
  const [patientVisits, setPatientVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  useEffect(() => {
    loadPatients();
  }, [page, estadoFilter]); // eslint-disable-line

  const loadPatients = async () => {
    setLoading(true);
    try {
      const result = await patientService.getPatients(page, limit, estadoFilter || undefined);
      setPatients(result.data || []);
      setTotalPages(result.pagination?.pages || 1);
    } catch (err) {
      setError('Error al cargar pacientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        handleSearch();
      } else {
        loadPatients();
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]); // eslint-disable-line

  const handleSearch = async () => {
    try {
      const result = await patientService.searchPatients(searchTerm);
      setPatients(result.data || []);
      setTotalPages(1);
    } catch (err) {
      console.error('Error en búsqueda:', err);
    }
  };

  const handleCreate = async (patientData) => {
    try {
      await patientService.createPatient(patientData);
      setSuccess('Paciente creado exitosamente');
      setOpenDialog(false);
      loadPatients();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear paciente');
    }
  };

  const handleUpdate = async (patientData) => {
    try {
      await patientService.updatePatient(selectedPatient.id, patientData);
      setSuccess('Paciente actualizado exitosamente');
      setOpenEditDialog(false);
      loadPatients();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar paciente');
    }
  };

  // Agendar visita
  const handleScheduleOpen = async (patient) => {
    setSelectedPatient(patient);
    setScheduleData({
      fechaVisita: new Date().toISOString().split('T')[0],
      tipoVisita: 'consulta',
      notas: ''
    });
    setOpenScheduleDialog(true);
    // Cargar visitas existentes del paciente
    setLoadingVisits(true);
    try {
      const result = await patientService.getPatientById(patient.id);
      setPatientVisits(result.data?.visitas || []);
    } catch (err) {
      console.error('Error cargando visitas:', err);
      setPatientVisits([]);
    } finally {
      setLoadingVisits(false);
    }
  };

  const handleScheduleVisit = async () => {
    try {
      if (!selectedPatient) return;
      if (!scheduleData.fechaVisita) {
        setError('Por favor seleccione una fecha para la visita');
        return;
      }
      await patientService.scheduleVisit(selectedPatient.id, {
        fecha: scheduleData.fechaVisita,
        tipo: scheduleData.tipoVisita,
        notas: scheduleData.notas
      });
      setSuccess('Visita agendada correctamente');
      setOpenScheduleDialog(false);
      setScheduleData({ fechaVisita: '', tipoVisita: 'consulta', notas: '' });
      loadPatients();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al agendar visita');
    }
  };

  // Historial clínico
  const handleHistoryOpen = async (patient) => {
    setSelectedPatient(patient);
    setOpenHistoryDialog(true);
    setLoadingHistory(true);
    setPatientHistory([]);
    try {
      const result = await api.get(`/patients/${patient.id}/history`);
      setPatientHistory(result.data?.data || []);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setPatientHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'activo': return 'success';
      case 'inactivo': return 'error';
      case 'en_tratamiento': return 'warning';
      default: return 'default';
    }
  };

  const calculateAge = (fechaNacimiento) => {
    if (!fechaNacimiento) return 'N/A';
    const today = new Date();
    const birthDate = new Date(fechaNacimiento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const formatDateTime = (dt) => {
    if (!dt) return 'N/A';
    return new Date(dt).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('es-CL');
  };

  return (
    <Container maxWidth="xl">
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
              InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
            />
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={estadoFilter}
                label="Estado"
                onChange={(e) => { setEstadoFilter(e.target.value); setPage(1); }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="inactivo">Inactivo</MenuItem>
                <MenuItem value="en_tratamiento">En tratamiento</MenuItem>
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
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No se encontraron pacientes
                    </TableCell>
                  </TableRow>
                ) : patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <Typography variant="body1">{patient.nombreCompleto}</Typography>
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
                    <TableCell>{calculateAge(patient.fechaNacimiento)} años</TableCell>
                    <TableCell>
                      <Box>
                        {patient.telefono && (
                          <Typography variant="body2">📞 {patient.telefono}</Typography>
                        )}
                        {patient.correo && (
                          <Typography variant="body2">✉️ {patient.correo}</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{patient.prevision || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={patient.estado}
                        color={getEstadoColor(patient.estado)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar paciente">
                        <IconButton
                          size="small"
                          onClick={() => { setSelectedPatient(patient); setOpenEditDialog(true); }}
                          color="warning"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Agendar visita / Ver agenda">
                        <IconButton
                          size="small"
                          onClick={() => handleScheduleOpen(patient)}
                          color="primary"
                        >
                          <CalendarIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Historial clínico">
                        <IconButton
                          size="small"
                          onClick={() => handleHistoryOpen(patient)}
                          color="success"
                        >
                          <HistoryIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

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
        <DialogTitle>Editar Paciente — {selectedPatient?.nombreCompleto}</DialogTitle>
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

      {/* Diálogo: Agendar visita + historial de visitas */}
      <Dialog open={openScheduleDialog} onClose={() => setOpenScheduleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Agenda de Visitas — {selectedPatient?.nombreCompleto}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            {/* Formulario de nueva visita */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Nueva Visita
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Fecha de Visita"
                  type="date"
                  value={scheduleData.fechaVisita}
                  onChange={(e) => setScheduleData({ ...scheduleData, fechaVisita: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <FormControl fullWidth>
                  <InputLabel>Tipo de Visita</InputLabel>
                  <Select
                    value={scheduleData.tipoVisita}
                    label="Tipo de Visita"
                    onChange={(e) => setScheduleData({ ...scheduleData, tipoVisita: e.target.value })}
                  >
                    <MenuItem value="consulta">Consulta</MenuItem>
                    <MenuItem value="tratamiento">Tratamiento</MenuItem>
                    <MenuItem value="control">Control</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Notas"
                  value={scheduleData.notas}
                  onChange={(e) => setScheduleData({ ...scheduleData, notas: e.target.value })}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Observaciones para la visita..."
                />
                <Button variant="contained" onClick={handleScheduleVisit} fullWidth>
                  Agendar Visita
                </Button>
              </Box>
            </Box>

            {/* Historial de visitas */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Historial de Visitas
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {loadingVisits ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : patientVisits.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Sin visitas registradas
                </Typography>
              ) : (
                <List dense sx={{ maxHeight: 320, overflowY: 'auto' }}>
                  {patientVisits
                    .slice()
                    .sort((a, b) => new Date(b.fechaVisita || b.fecha) - new Date(a.fechaVisita || a.fecha))
                    .map((visita, idx) => (
                      <ListItem key={idx} divider>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {formatDate(visita.fechaVisita || visita.fecha)}
                              </Typography>
                              <Chip
                                label={visita.tipoVisita || visita.tipo || 'consulta'}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={visita.notas || visita.observaciones || 'Sin notas'}
                        />
                      </ListItem>
                    ))}
                </List>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenScheduleDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: Historial clínico */}
      <Dialog open={openHistoryDialog} onClose={() => setOpenHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Historial Clínico — {selectedPatient?.nombreCompleto}
        </DialogTitle>
        <DialogContent>
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : patientHistory.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                Sin sesiones clínicas registradas
              </Typography>
            </Box>
          ) : (
            <Box sx={{ pt: 1 }}>
              {patientHistory.map((session, idx) => (
                <Paper
                  key={session.sessionId}
                  variant="outlined"
                  sx={{ p: 2, mb: 2, borderLeft: `4px solid ${session.estado === 'activa' ? '#2e7d32' : '#1976d2'}` }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Sesión #{patientHistory.length - idx} — {session.silla || 'Sillón desconocido'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Inicio: {formatDateTime(session.horaInicio)}
                        {session.horaFin && ` → Fin: ${formatDateTime(session.horaFin)}`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {session.duracionMinutos !== null && (
                        <Chip
                          label={`${session.duracionMinutos} min`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        label={session.estado}
                        size="small"
                        color={session.estado === 'activa' ? 'success' : 'default'}
                      />
                    </Box>
                  </Box>

                  {session.medicamentos && session.medicamentos.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <MedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight="medium">
                          Medicamentos administrados:
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {session.medicamentos.map((med, i) => (
                          <Chip
                            key={i}
                            label={`${med.nombre} — ${med.cantidad} uds.`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {(!session.medicamentos || session.medicamentos.length === 0) && (
                    <Typography variant="caption" color="text.secondary">
                      Sin medicamentos registrados en esta sesión
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistoryDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Notificaciones */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
      </Snackbar>
    </Container>
  );
};

export default Patients;
