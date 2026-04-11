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
  CircularProgress,
  Divider,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
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
  Build as MaintenanceIcon,
  MedicalServices as MedIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import chairService from '../services/chairService';
import patientService from '../services/patientService';
import inventoryService from '../services/inventoryService';
import api from '../services/api';

const Chairs = () => {
  const [chairs, setChairs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Diálogos
  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openMedDialog, setOpenMedDialog] = useState(false);

  // Formularios
  const [selectedChair, setSelectedChair] = useState(null);
  const [newChair, setNewChair] = useState({ numero: '', nombre: '', ubicacion: '', estado: 'disponible' });
  const [editChair, setEditChair] = useState({ id: '', numero: '', nombre: '', ubicacion: '', estado: 'disponible' });

  // Asignación: paciente seleccionado + lista de medicamentos
  const [assignPatientId, setAssignPatientId] = useState('');
  const [assignMeds, setAssignMeds] = useState([]); // [{medicationId, nombre, cantidad, maxStock}]

  // Agregar medicamento a sesión activa
  const [addMedId, setAddMedId] = useState('');
  const [addMedQty, setAddMedQty] = useState(1);

  // Reloj en tiempo real para mostrar duración actualizada cada segundo
  const [now, setNow] = useState(new Date());

  // Alerta de stock crítico (naranja)
  const [stockAlert, setStockAlert] = useState('');

  // Diálogo de confirmación (reemplaza window.confirm)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: '', onConfirm: null });

  // Diálogo de liberación con campo de notas clínicas
  const [releaseDialog, setReleaseDialog] = useState({ open: false, chairId: null, notas: '' });

  // Diálogo de resumen de sesión imprimible (post-liberación)
  const [summaryDialog, setSummaryDialog] = useState({ open: false, data: null });

  useEffect(() => {
    loadChairs();
    loadPatients();
    loadInventory();

    // Polling: actualiza estado de sillones cada 30 segundos
    const pollInterval = setInterval(loadChairs, 30000);
    // Tick cada segundo para actualizar el cronómetro de duración
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(pollInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const loadChairs = async () => {
    setLoading(true);
    try {
      const result = await chairService.getChairs();
      setChairs(result.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar sillones');
    } finally {
      setLoading(false);
    }
  };

  // Refresca sillones sin mostrar el spinner de carga (para post-acción)
  const silentLoadChairs = async () => {
    try {
      const result = await chairService.getChairs();
      setChairs(result.data || []);
    } catch (err) {
      // error silencioso — no interrumpir la UI
    }
  };

  const loadPatients = async () => {
    try {
      const result = await patientService.getPatients(1, 200);
      setPatients(result.data || []);
    } catch (err) {
      console.error('Error al cargar pacientes:', err);
    }
  };

  const loadInventory = async () => {
    try {
      const result = await inventoryService.getItems();
      // Solo medicamentos activos con stock disponible
      setInventory((result.data || []).filter(m => m.activo !== false && m.cantidad > 0));
    } catch (err) {
      console.error('Error al cargar inventario:', err);
    }
  };

  // Solo pacientes ACTIVOS para asignar
  const activePatients = patients.filter(p => p.estado === 'activo');

  // Medicamentos disponibles que no están ya seleccionados en assignMeds
  const availableMeds = inventory.filter(m => !assignMeds.find(am => am.medicationId === m.id));

  // ==================== CRUD Sillones ====================

  const handleCreate = async () => {
    try {
      await chairService.createChair(newChair);
      setSuccess('Sillón creado exitosamente');
      setOpenDialog(false);
      silentLoadChairs();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear sillón');
    }
  };

  const handleEdit = async () => {
    try {
      await chairService.updateChair(editChair.id, editChair);
      setSuccess('Sillón actualizado exitosamente');
      setOpenEditDialog(false);
      silentLoadChairs();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar sillón');
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      open: true,
      message: '¿Está seguro de eliminar este sillón?',
      onConfirm: async () => {
        setConfirmDialog({ open: false, message: '', onConfirm: null });
        try {
          await chairService.deleteChair(id);
          setSuccess('Sillón eliminado exitosamente');
          silentLoadChairs();
        } catch (err) {
          setError(err.response?.data?.message || 'Error al eliminar sillón');
        }
      }
    });
  };

  // ==================== Asignación de paciente ====================

  const handleAssignOpen = (chair) => {
    setSelectedChair(chair);
    setAssignPatientId('');
    setAssignMeds([]);
    loadInventory(); // Refrescar stock antes de abrir
    setOpenAssignDialog(true);
  };

  const addMedRow = (medId) => {
    if (!medId) return;
    const med = inventory.find(m => m.id === parseInt(medId));
    if (!med) return;
    setAssignMeds(prev => [...prev, {
      medicationId: med.id,
      nombre: med.nombre,
      cantidad: 1,
      maxStock: med.cantidad
    }]);
  };

  const updateMedQty = (idx, qty) => {
    setAssignMeds(prev => prev.map((m, i) => {
      if (i !== idx) return m;
      const clamped = Math.max(1, Math.min(parseInt(qty) || 1, m.maxStock));
      return { ...m, cantidad: clamped };
    }));
  };

  const removeMedRow = (idx) => {
    setAssignMeds(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAssign = async () => {
    if (!assignPatientId) {
      setError('Debe seleccionar un paciente');
      return;
    }
    try {
      // 1. Asignar paciente al sillón
      const assignRes = await chairService.assignPatient(selectedChair.id, assignPatientId, []);
      const sessionId = assignRes.data?.session?.id;

      // 2. Registrar medicamentos si hay seleccionados
      if (assignMeds.length > 0 && sessionId) {
        for (const med of assignMeds) {
          try {
            await api.post(`/chairs/${selectedChair.id}/medications`, {
              medicationId: med.medicationId,
              cantidad: med.cantidad
            });
          } catch (medErr) {
            console.error(`Error al asignar medicamento ${med.nombre}:`, medErr.response?.data?.message);
          }
        }
      }

      setSuccess('Paciente asignado exitosamente');
      setOpenAssignDialog(false);
      silentLoadChairs();
      loadInventory();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al asignar paciente');
    }
  };

  // ==================== Agregar medicamento a sesión activa ====================

  const handleAddMedOpen = (chair) => {
    setSelectedChair(chair);
    setAddMedId('');
    setAddMedQty(1);
    loadInventory();
    setOpenMedDialog(true);
  };

  const handleAddMed = async () => {
    if (!addMedId) {
      setError('Seleccione un medicamento');
      return;
    }
    try {
      const res = await api.post(`/chairs/${selectedChair.id}/medications`, {
        medicationId: parseInt(addMedId),
        cantidad: addMedQty
      });
      setSuccess('Medicamento administrado exitosamente');
      setOpenMedDialog(false);
      silentLoadChairs();
      loadInventory();
      // Alerta de stock crítico si el backend lo indica
      if (res.data?.data?.alertaStock) {
        const nombre = res.data.data.medicamento;
        const restante = res.data.data.stockRestante;
        setStockAlert(`Stock crítico: ${nombre} — quedan ${restante} unidades`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al administrar medicamento');
    }
  };

  // ==================== Liberar sillón ====================

  const handleRelease = (id) => {
    setReleaseDialog({ open: true, chairId: id, notas: '' });
  };

  const handleReleaseConfirm = async () => {
    const { chairId, notas } = releaseDialog;
    setReleaseDialog({ open: false, chairId: null, notas: '' });
    try {
      const result = await chairService.releaseChair(chairId, notas);
      setSuccess('Sillón liberado exitosamente');
      silentLoadChairs();
      // Mostrar resumen de sesión imprimible
      if (result.data) {
        setSummaryDialog({ open: true, data: result.data });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al liberar sillón');
    }
  };

  const formatDurationHM = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}min`;
  };

  // ==================== Helpers visuales ====================

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'disponible': return 'success';
      case 'ocupado': return 'error';
      case 'mantenimiento': return 'warning';
      default: return 'default';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'disponible': return <AvailableIcon />;
      case 'ocupado': return <OccupiedIcon />;
      case 'mantenimiento': return <MaintenanceIcon />;
      default: return <ChairIcon />;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = (horaInicio) => {
    if (!horaInicio) return '';
    const s = Math.floor((now - new Date(horaInicio)) / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Gestión de Sillones Oncológicos</Typography>
        <Typography variant="body1" color="text.secondary">
          Control de sillones en tiempo real — Centro CDIEM
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Sillones Activos: {chairs.filter(c => c.activo !== false).length}
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
            setNewChair({ numero: '', nombre: '', ubicacion: '', estado: 'disponible' });
            setOpenDialog(true);
          }}>
            Nuevo Sillón
          </Button>
        </Box>
      </Paper>

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
                      chair.estado === 'ocupado' ? '#f44336' : '#ff9800'
                    }`,
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.02)' }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Cabecera */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ChairIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">{chair.numero}</Typography>
                      </Box>
                      <Chip
                        icon={getEstadoIcon(chair.estado)}
                        label={chair.estado}
                        color={getEstadoColor(chair.estado)}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body1" gutterBottom>{chair.nombre}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      📍 {chair.ubicacion || 'Sin ubicación'}
                    </Typography>

                    {/* Paciente actual si está ocupado */}
                    {chair.estado === 'ocupado' && chair.pacienteActual && (
                      <Paper sx={{ p: 1.5, mt: 1, bgcolor: '#fff3e0' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
                          <PersonIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          <Typography variant="body2" fontWeight="medium">
                            {chair.pacienteActual}
                          </Typography>
                          <Chip label="en tratamiento" size="small" color="warning" sx={{ ml: 'auto' }} />
                        </Box>
                        {chair.horaInicio && (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <TimeIcon sx={{ fontSize: 12, mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="caption">
                                Inicio: {formatTime(chair.horaInicio)}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="warning.main" fontWeight="bold">
                              {calculateDuration(chair.horaInicio)}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    )}

                    {/* Botones clínicos */}
                    <Box sx={{ mt: 2 }}>
                      {chair.estado === 'disponible' && (
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          fullWidth
                          onClick={() => handleAssignOpen(chair)}
                        >
                          Asignar Paciente
                        </Button>
                      )}
                      {chair.estado === 'ocupado' && (
                        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                          <Button
                            variant="outlined"
                            color="secondary"
                            size="small"
                            startIcon={<MedIcon />}
                            fullWidth
                            onClick={() => handleAddMedOpen(chair)}
                          >
                            + Medicamento
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            fullWidth
                            onClick={() => handleRelease(chair.id)}
                          >
                            Liberar
                          </Button>
                        </Box>
                      )}
                    </Box>

                    {/* Botones CRUD */}
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Editar sillón">
                        <IconButton size="small" color="warning" onClick={() => {
                          setEditChair({
                            id: chair.id, numero: chair.numero,
                            nombre: chair.nombre, ubicacion: chair.ubicacion, estado: chair.estado
                          });
                          setOpenEditDialog(true);
                        }}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar sillón">
                        <IconButton size="small" color="error" onClick={() => handleDelete(chair.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      )}

      {/* Resumen de estado */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Resumen de Estado</Typography>
        <Grid container spacing={2}>
          {[
            { label: 'Total', value: chairs.filter(c => c.activo !== false).length, color: 'text.primary' },
            { label: 'Disponibles', value: chairs.filter(c => c.estado === 'disponible' && c.activo !== false).length, color: 'success.main' },
            { label: 'Ocupados', value: chairs.filter(c => c.estado === 'ocupado' && c.activo !== false).length, color: 'error.main' },
            { label: 'Mantenimiento', value: chairs.filter(c => c.estado === 'mantenimiento' && c.activo !== false).length, color: 'warning.main' },
          ].map(({ label, value, color }) => (
            <Grid item xs={6} sm={3} key={label}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color={color} gutterBottom variant="body2">{label}</Typography>
                  <Typography variant="h4" color={color}>{value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* ==================== DIÁLOGOS ==================== */}

      {/* Crear sillón */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Nuevo Sillón Oncológico</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
            <TextField label="Número *" value={newChair.numero}
              onChange={(e) => setNewChair({ ...newChair, numero: e.target.value })}
              fullWidth helperText="Ej: S1, S2..." />
            <TextField label="Nombre *" value={newChair.nombre}
              onChange={(e) => setNewChair({ ...newChair, nombre: e.target.value })}
              fullWidth helperText="Ej: Sillón de Quimioterapia 1" />
            <TextField label="Ubicación" value={newChair.ubicacion}
              onChange={(e) => setNewChair({ ...newChair, ubicacion: e.target.value })}
              fullWidth helperText="Ej: Sala A" />
            <FormControl fullWidth>
              <InputLabel>Estado Inicial</InputLabel>
              <Select value={newChair.estado} label="Estado Inicial"
                onChange={(e) => setNewChair({ ...newChair, estado: e.target.value })}>
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

      {/* Editar sillón */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Editar Sillón {editChair.numero}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
            <TextField label="Número *" value={editChair.numero}
              onChange={(e) => setEditChair({ ...editChair, numero: e.target.value })} fullWidth />
            <TextField label="Nombre *" value={editChair.nombre}
              onChange={(e) => setEditChair({ ...editChair, nombre: e.target.value })} fullWidth />
            <TextField label="Ubicación" value={editChair.ubicacion}
              onChange={(e) => setEditChair({ ...editChair, ubicacion: e.target.value })} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select value={editChair.estado} label="Estado"
                onChange={(e) => setEditChair({ ...editChair, estado: e.target.value })}>
                <MenuItem value="disponible">Disponible</MenuItem>
                <MenuItem value="ocupado">Ocupado</MenuItem>
                <MenuItem value="mantenimiento">Mantenimiento</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
          <Button onClick={handleEdit} variant="contained">Actualizar</Button>
        </DialogActions>
      </Dialog>

      {/* Asignar paciente + medicamentos */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Asignar Paciente — Sillón {selectedChair?.numero}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Selector de paciente */}
            <FormControl fullWidth required>
              <InputLabel>Paciente *</InputLabel>
              <Select
                value={assignPatientId}
                label="Paciente *"
                onChange={(e) => setAssignPatientId(e.target.value)}
              >
                {activePatients.length === 0 ? (
                  <MenuItem disabled value="">Sin pacientes activos disponibles</MenuItem>
                ) : activePatients.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nombreCompleto} — {
                      p.tipoIdentificacion === 'rut'
                        ? patientService.formatRUT(p.rut)
                        : p.pasaporte
                    }
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Medicamentos */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">
                  Medicamentos a Administrar
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Agregar medicamento</InputLabel>
                  <Select
                    value=""
                    label="Agregar medicamento"
                    onChange={(e) => { addMedRow(e.target.value); }}
                    disabled={availableMeds.length === 0}
                  >
                    {availableMeds.map(m => (
                      <MenuItem key={m.id} value={m.id}>
                        {m.nombre} (stock: {m.cantidad} {m.unidad})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {assignMeds.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Sin medicamentos seleccionados (opcional)
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Medicamento</TableCell>
                      <TableCell align="center">Cantidad</TableCell>
                      <TableCell align="center">Quitar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignMeds.map((med, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Typography variant="body2">{med.nombre}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Stock disponible: {med.maxStock}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={med.cantidad}
                            onChange={(e) => updateMedQty(idx, e.target.value)}
                            inputProps={{ min: 1, max: med.maxStock }}
                            sx={{ width: 70 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => removeMedRow(idx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancelar</Button>
          <Button onClick={handleAssign} variant="contained" disabled={!assignPatientId}>
            Asignar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Agregar medicamento a sesión activa */}
      <Dialog open={openMedDialog} onClose={() => setOpenMedDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Administrar Medicamento — Sillón {selectedChair?.numero}
          {selectedChair?.pacienteActual && (
            <Typography variant="body2" color="text.secondary">
              Paciente: {selectedChair.pacienteActual}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Medicamento *</InputLabel>
              <Select
                value={addMedId}
                label="Medicamento *"
                onChange={(e) => { setAddMedId(e.target.value); setAddMedQty(1); }}
              >
                {inventory.length === 0 ? (
                  <MenuItem disabled value="">Sin medicamentos con stock disponible</MenuItem>
                ) : inventory.map(m => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.nombre} — Stock: {m.cantidad} {m.unidad}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Cantidad *"
              type="number"
              value={addMedQty}
              onChange={(e) => setAddMedQty(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{
                min: 1,
                max: inventory.find(m => m.id === parseInt(addMedId))?.cantidad || 9999
              }}
              fullWidth
              helperText={
                addMedId
                  ? `Stock disponible: ${inventory.find(m => m.id === parseInt(addMedId))?.cantidad ?? '—'}`
                  : 'Seleccione primero un medicamento'
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMedDialog(false)}>Cancelar</Button>
          <Button onClick={handleAddMed} variant="contained" disabled={!addMedId}>
            Administrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de liberación de sillón con notas clínicas */}
      <Dialog
        open={releaseDialog.open}
        onClose={() => setReleaseDialog({ open: false, chairId: null, notas: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Liberar Sillón</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              ¿Confirma que desea finalizar la sesión y liberar el sillón?
            </Typography>
            <TextField
              label="Observaciones clínicas (opcional)"
              multiline
              rows={3}
              fullWidth
              placeholder="Ej: Paciente toleró bien el tratamiento. Sin reacciones adversas."
              value={releaseDialog.notas}
              onChange={(e) => setReleaseDialog(prev => ({ ...prev, notas: e.target.value }))}
              inputProps={{ maxLength: 500 }}
              helperText={`${releaseDialog.notas.length}/500 caracteres`}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReleaseDialog({ open: false, chairId: null, notas: '' })}>
            Cancelar
          </Button>
          <Button onClick={handleReleaseConfirm} color="error" variant="contained">
            Liberar Sillón
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de resumen de sesión (imprimible) */}
      <Dialog
        open={summaryDialog.open}
        onClose={() => setSummaryDialog({ open: false, data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Resumen de Sesión</DialogTitle>
        <DialogContent>
          {summaryDialog.data && (
            <Box id="session-summary-print" sx={{ pt: 1 }}>
              <Typography variant="h6" gutterBottom>Centro CDIEM — Resumen de Atención</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1"><strong>Paciente:</strong> {summaryDialog.data.paciente || 'No registrado'}</Typography>
              <Typography variant="body2">
                <strong>Inicio:</strong> {new Date(summaryDialog.data.horaInicio).toLocaleString('es-CL')}
              </Typography>
              <Typography variant="body2">
                <strong>Fin:</strong> {new Date(summaryDialog.data.horaFin).toLocaleString('es-CL')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Duración:</strong> {formatDurationHM(summaryDialog.data.duracionSegundos || 0)}
              </Typography>

              {summaryDialog.data.notas && (
                <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                  <strong>Observaciones:</strong> {summaryDialog.data.notas}
                </Typography>
              )}

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Medicamentos Administrados</Typography>
              {(!summaryDialog.data.medicamentos || summaryDialog.data.medicamentos.length === 0) ? (
                <Typography variant="body2" color="text.secondary">Ninguno</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Medicamento</TableCell>
                      <TableCell align="center">Cantidad</TableCell>
                      <TableCell align="right">Precio Unit.</TableCell>
                      <TableCell>Hora</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summaryDialog.data.medicamentos.map((med, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{med.nombre}</TableCell>
                        <TableCell align="center">{med.cantidad} {med.unidad}</TableCell>
                        <TableCell align="right">${(med.precioUnitario || 0).toLocaleString('es-CL')}</TableCell>
                        <TableCell>{new Date(med.hora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ '@media print': { display: 'none' } }}>
          <Button onClick={() => setSummaryDialog({ open: false, data: null })}>Cerrar</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            Imprimir
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSS para impresión: solo se inyecta cuando el resumen está abierto */}
      {summaryDialog.open && (
        <style>{`
          @media print {
            body > *:not(.MuiDialog-root) { display: none !important; }
            .MuiDialog-root .MuiBackdrop-root { display: none !important; }
            .MuiDialog-root .MuiPaper-root { box-shadow: none !important; }
          }
        `}</style>
      )}

      {/* Diálogo de confirmación */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, message: '', onConfirm: null })}>
        <DialogTitle>Confirmar acción</DialogTitle>
        <DialogContent>{confirmDialog.message}</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, message: '', onConfirm: null })}>Cancelar</Button>
          <Button onClick={confirmDialog.onConfirm} color="error" variant="contained">Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Notificaciones */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')}>
        <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
      </Snackbar>
      <Snackbar open={!!stockAlert} autoHideDuration={8000} onClose={() => setStockAlert('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="warning" onClose={() => setStockAlert('')} sx={{ fontWeight: 'bold' }}>
          ⚠️ {stockAlert}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Chairs;
