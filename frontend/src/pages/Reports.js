import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Collapse, IconButton, Chip, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, CircularProgress, Divider,
  Tooltip
} from '@mui/material';
import {
  ExpandMore, ExpandLess, Print, Download,
  PeopleAlt, EventNote, AttachMoney, MedicalServices,
  Chair as ChairIcon, CalendarToday
} from '@mui/icons-material';
import { format, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import reportService from '../services/reportService';

const clp = (n) => `$${(n || 0).toLocaleString('es-CL')}`;
const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }) : '-';
const fmtDateShort = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: es }) : '-';
const secToHMS = (s) => {
  if (s == null) return '-';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
};

// ─── Diálogo: Informe individual de paciente ─────────────────────────────────
const PatientReportDialog = ({ open, onClose, patientData }) => {
  if (!patientData) return null;
  const { paciente, sesiones, costoTotal, periodo } = patientData;

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Informe del Paciente</span>
        <Tooltip title="Imprimir / Guardar PDF">
          <IconButton onClick={handlePrint} color="primary"><Print /></IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent dividers id="patient-report-print">
        {/* Encabezado paciente */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
          <Typography variant="h5" fontWeight="bold">{paciente.nombreCompleto}</Typography>
          <Grid container spacing={1} sx={{ mt: 1 }}>
            {paciente.rut && <Grid item xs={6} sm={3}><Typography variant="body2" color="text.secondary">RUT</Typography><Typography variant="body2">{paciente.rut}</Typography></Grid>}
            {paciente.pasaporte && <Grid item xs={6} sm={3}><Typography variant="body2" color="text.secondary">Pasaporte</Typography><Typography variant="body2">{paciente.pasaporte}</Typography></Grid>}
            {paciente.fechaNacimiento && <Grid item xs={6} sm={3}><Typography variant="body2" color="text.secondary">Fecha Nacimiento</Typography><Typography variant="body2">{fmtDateShort(paciente.fechaNacimiento)}</Typography></Grid>}
            {paciente.prevision && <Grid item xs={6} sm={3}><Typography variant="body2" color="text.secondary">Previsión</Typography><Typography variant="body2">{paciente.prevision}</Typography></Grid>}
            {paciente.telefono && <Grid item xs={6} sm={3}><Typography variant="body2" color="text.secondary">Teléfono</Typography><Typography variant="body2">{paciente.telefono}</Typography></Grid>}
            {paciente.correo && <Grid item xs={6} sm={3}><Typography variant="body2" color="text.secondary">Correo</Typography><Typography variant="body2">{paciente.correo}</Typography></Grid>}
            {paciente.direccion && <Grid item xs={12}><Typography variant="body2" color="text.secondary">Dirección</Typography><Typography variant="body2">{paciente.direccion}</Typography></Grid>}
          </Grid>
        </Box>

        {periodo && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Período: {fmtDateShort(periodo.desde)} — {fmtDateShort(periodo.hasta)}
          </Typography>
        )}

        {/* Sesiones */}
        {sesiones.length === 0 ? (
          <Alert severity="info">No hay sesiones registradas en este período.</Alert>
        ) : (
          sesiones.map((sesion, idx) => (
            <Paper key={sesion.sessionId} variant="outlined" sx={{ mb: 2, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography fontWeight="bold">Sesión #{idx + 1} — {sesion.sillon}</Typography>
                <Chip
                  label={sesion.estado === 'finalizada' ? 'Finalizada' : 'En curso'}
                  color={sesion.estado === 'finalizada' ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
              <Grid container spacing={1} sx={{ mb: 1 }}>
                <Grid item xs={6} sm={3}><Typography variant="body2" color="text.secondary">Inicio</Typography><Typography variant="body2">{fmtDate(sesion.horaInicio)}</Typography></Grid>
                <Grid item xs={6} sm={3}><Typography variant="body2" color="text.secondary">Fin</Typography><Typography variant="body2">{fmtDate(sesion.horaFin)}</Typography></Grid>
                {sesion.duracionSegundos != null && <Grid item xs={6} sm={3}><Typography variant="body2" color="text.secondary">Duración</Typography><Typography variant="body2">{secToHMS(sesion.duracionSegundos)}</Typography></Grid>}
                {sesion.notas && <Grid item xs={12}><Typography variant="body2" color="text.secondary">Notas</Typography><Typography variant="body2">{sesion.notas}</Typography></Grid>}
              </Grid>

              {sesion.medicamentos.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell>Medicamento</TableCell>
                        <TableCell align="center">Cantidad</TableCell>
                        <TableCell align="right">Precio Unit.</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sesion.medicamentos.map((m, i) => (
                        <TableRow key={i}>
                          <TableCell>{m.nombre}</TableCell>
                          <TableCell align="center">{m.cantidad} {m.unidad}</TableCell>
                          <TableCell align="right">{clp(m.precioUnitario)}</TableCell>
                          <TableCell align="right">{clp(m.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: '#fafafa' }}>
                        <TableCell colSpan={3} align="right"><strong>Total sesión</strong></TableCell>
                        <TableCell align="right"><strong>{clp(sesion.totalSesion)}</strong></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">Sin medicamentos administrados</Typography>
              )}
            </Paper>
          ))
        )}

        {sesiones.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
            <Typography variant="h6">Total período: <strong>{clp(costoTotal)}</strong></Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        <Button onClick={handlePrint} variant="contained" startIcon={<Print />}>Imprimir / PDF</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Fila de paciente expandible ─────────────────────────────────────────────
const PatientRow = ({ paciente, onViewReport }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </TableCell>
        <TableCell><strong>{paciente.nombreCompleto}</strong></TableCell>
        <TableCell>{paciente.rut || paciente.pasaporte || '-'}</TableCell>
        <TableCell align="center">{paciente.sesiones.length}</TableCell>
        <TableCell align="right">{clp(paciente.totalPaciente)}</TableCell>
        <TableCell align="center">
          <Button size="small" variant="outlined" onClick={() => onViewReport(paciente)}>
            Ver Informe
          </Button>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
              {paciente.sesiones.map((sesion) => (
                <Box key={sesion.sessionId} sx={{ mb: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2"><strong>{sesion.sillon}</strong></Typography>
                    <Typography variant="body2" color="text.secondary">{fmtDate(sesion.horaInicio)}</Typography>
                    {sesion.duracionSegundos != null && <Typography variant="body2" color="text.secondary">{secToHMS(sesion.duracionSegundos)}</Typography>}
                    <Chip label={sesion.estado} size="small" color={sesion.estado === 'finalizada' ? 'success' : 'warning'} />
                  </Box>
                  {sesion.medicamentos.length > 0 && (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ py: 0.5 }}>Medicamento</TableCell>
                          <TableCell align="center" sx={{ py: 0.5 }}>Cantidad</TableCell>
                          <TableCell align="right" sx={{ py: 0.5 }}>Subtotal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sesion.medicamentos.map((m, i) => (
                          <TableRow key={i}>
                            <TableCell sx={{ py: 0.5 }}>{m.nombre}</TableCell>
                            <TableCell align="center" sx={{ py: 0.5 }}>{m.cantidad} {m.unidad}</TableCell>
                            <TableCell align="right" sx={{ py: 0.5 }}>{clp(m.subtotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <Box sx={{ textAlign: 'right', mt: 0.5 }}>
                    <Typography variant="body2"><strong>Total: {clp(sesion.totalSesion)}</strong></Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// ─── Página principal de Reportes ─────────────────────────────────────────────
const Reports = () => {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [periodoType, setPeriodoType] = useState('today');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  // Patient detail dialog
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [patientReportData, setPatientReportData] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);

  const applyPreset = (type) => {
    setPeriodoType(type);
    const now = new Date();
    const fmt = (d) => format(d, 'yyyy-MM-dd');
    const presets = {
      today: [fmt(now), fmt(now)],
      yesterday: [fmt(subDays(now, 1)), fmt(subDays(now, 1))],
      week: [fmt(startOfWeek(now, { weekStartsOn: 1 })), fmt(now)],
      month: [fmt(startOfMonth(now)), fmt(now)],
      custom: [startDate, endDate]
    };
    const [s, e] = presets[type] || [today, today];
    setStartDate(s);
    setEndDate(e);
  };

  const generateReport = async () => {
    setLoading(true);
    setError('');
    setReportData(null);
    try {
      const data = await reportService.getReport(startDate, endDate);
      setReportData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPatientReport = async (paciente) => {
    setPatientLoading(true);
    setPatientDialogOpen(true);
    setPatientReportData(null);
    try {
      const data = await reportService.getPatientReport(paciente.id, startDate, endDate);
      setPatientReportData(data);
    } catch (err) {
      setPatientReportData(null);
    } finally {
      setPatientLoading(false);
    }
  };

  const exportCSV = () => {
    if (!reportData) return;
    const rows = [];
    const sep = ';'; // ; para Excel en español

    rows.push(['REPORTE CDIEM — Centro Oncológico']);
    rows.push([`Período: ${startDate} al ${endDate}`]);
    rows.push([`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`]);
    rows.push([]);

    rows.push(['RESUMEN']);
    rows.push(['Total Pacientes', reportData.resumen.totalPacientes]);
    rows.push(['Total Sesiones', reportData.resumen.totalSesiones]);
    rows.push(['Costo Total', reportData.resumen.costoTotal]);
    rows.push([]);

    rows.push(['PACIENTES ATENDIDOS']);
    rows.push(['Paciente', 'RUT/Pasaporte', 'Previsión', 'Sesiones', 'Total ($)']);
    reportData.pacientes.forEach(p => {
      rows.push([p.nombreCompleto, p.rut || p.pasaporte || '', p.prevision || '', p.sesiones.length, p.totalPaciente]);
      p.sesiones.forEach(s => {
        rows.push(['', '', s.sillon, fmtDate(s.horaInicio), secToHMS(s.duracionSegundos), '', clp(s.totalSesion)]);
        s.medicamentos.forEach(m => {
          rows.push(['', '', '', m.nombre, m.cantidad, m.unidad, clp(m.precioUnitario), clp(m.subtotal)]);
        });
      });
    });
    rows.push([]);

    rows.push(['MEDICAMENTOS UTILIZADOS']);
    rows.push(['Medicamento', 'Cantidad Total', 'Unidad', 'Costo Total ($)']);
    reportData.medicamentos.forEach(m => {
      rows.push([m.nombre, m.cantidadTotal, m.unidad, m.costoTotal]);
    });
    rows.push([]);

    rows.push(['USO DE SILLONES']);
    rows.push(['Sillón', 'Total Sesiones', 'Tiempo Total (HH:MM:SS)']);
    reportData.sillones.forEach(s => {
      rows.push([s.nombre, s.totalSesiones, secToHMS(s.segundosTotales)]);
    });

    const csv = rows.map(r => r.map(c => `"${c}"`).join(sep)).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-cdiem-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const presetLabel = { today: 'Hoy', yesterday: 'Ayer', week: 'Esta semana', month: 'Este mes', custom: 'Rango personalizado' };

  return (
    <Box>
      {/* Estilos de impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #patient-report-print, #patient-report-print * { visibility: visible; }
          #patient-report-print { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <Typography variant="h4" gutterBottom fontWeight="bold">
        Reportes
      </Typography>

      {/* Selector de período */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          <CalendarToday sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
          Período del reporte
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {['today', 'yesterday', 'week', 'month', 'custom'].map(type => (
            <Button
              key={type}
              variant={periodoType === type ? 'contained' : 'outlined'}
              size="small"
              onClick={() => applyPreset(type)}
            >
              {presetLabel[type]}
            </Button>
          ))}
        </Box>

        {periodoType === 'custom' && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              label="Desde"
              type="date"
              size="small"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hasta"
              type="date"
              size="small"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        )}

        {periodoType !== 'custom' && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {startDate === endDate ? fmtDateShort(startDate) : `${fmtDateShort(startDate)} — ${fmtDateShort(endDate)}`}
          </Typography>
        )}

        <Button
          variant="contained"
          onClick={generateReport}
          disabled={loading}
          size="large"
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <EventNote />}
        >
          {loading ? 'Generando...' : 'Generar Reporte'}
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Reporte generado */}
      {reportData && (
        <Box id="report-print-area">
          {/* Encabezado de impresión (solo visible al imprimir) */}
          <Box sx={{ display: 'none' }} className="print-header">
            <Typography variant="h5">Reporte CDIEM — Centro Oncológico</Typography>
            <Typography variant="body2">
              Período: {fmtDateShort(startDate)} — {fmtDateShort(endDate)} |
              Generado: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
            </Typography>
            <Divider sx={{ my: 1 }} />
          </Box>

          {/* Botones de acción */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }} className="no-print">
            <Button variant="outlined" startIcon={<Download />} onClick={exportCSV}>
              Exportar Excel
            </Button>
          </Box>

          {/* Tarjetas de resumen */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ bgcolor: '#e3f2fd' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <PeopleAlt sx={{ fontSize: 36, color: '#1976d2' }} />
                  <Typography variant="h3" fontWeight="bold" color="primary">
                    {reportData.resumen.totalPacientes}
                  </Typography>
                  <Typography color="text.secondary">Pacientes Atendidos</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ bgcolor: '#e8f5e9' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <MedicalServices sx={{ fontSize: 36, color: '#2e7d32' }} />
                  <Typography variant="h3" fontWeight="bold" sx={{ color: '#2e7d32' }}>
                    {reportData.resumen.totalSesiones}
                  </Typography>
                  <Typography color="text.secondary">Sesiones Realizadas</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ bgcolor: '#fff3e0' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <AttachMoney sx={{ fontSize: 36, color: '#e65100' }} />
                  <Typography variant="h5" fontWeight="bold" sx={{ color: '#e65100' }}>
                    {clp(reportData.resumen.costoTotal)}
                  </Typography>
                  <Typography color="text.secondary">Costo Total Medicamentos</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabla: Pacientes */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: '#1976d2', color: 'white', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleAlt />
              <Typography variant="h6">Pacientes Atendidos</Typography>
            </Box>
            {reportData.pacientes.length === 0 ? (
              <Box sx={{ p: 3 }}><Alert severity="info">No hay pacientes en este período.</Alert></Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell width={40} />
                      <TableCell>Paciente</TableCell>
                      <TableCell>RUT / Pasaporte</TableCell>
                      <TableCell align="center">Sesiones</TableCell>
                      <TableCell align="right">Total Medicamentos</TableCell>
                      <TableCell align="center">Informe</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.pacientes.map(p => (
                      <PatientRow key={p.id} paciente={p} onViewReport={handleViewPatientReport} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Tabla: Medicamentos */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: '#2e7d32', color: 'white', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicalServices />
              <Typography variant="h6">Medicamentos Utilizados</Typography>
            </Box>
            {reportData.medicamentos.length === 0 ? (
              <Box sx={{ p: 3 }}><Alert severity="info">No hay medicamentos registrados en este período.</Alert></Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell>Medicamento</TableCell>
                      <TableCell align="center">Cantidad Total</TableCell>
                      <TableCell align="right">Costo Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.medicamentos.map(m => (
                      <TableRow key={m.id} hover>
                        <TableCell>{m.nombre}</TableCell>
                        <TableCell align="center">{m.cantidadTotal} {m.unidad}</TableCell>
                        <TableCell align="right">{clp(m.costoTotal)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: '#f9fbe7' }}>
                      <TableCell colSpan={2} align="right"><strong>Total</strong></TableCell>
                      <TableCell align="right"><strong>{clp(reportData.resumen.costoTotal)}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Tabla: Sillones */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: '#546e7a', color: 'white', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChairIcon />
              <Typography variant="h6">Uso de Sillones</Typography>
            </Box>
            {reportData.sillones.length === 0 ? (
              <Box sx={{ p: 3 }}><Alert severity="info">No hay sillones usados en este período.</Alert></Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell>Sillón</TableCell>
                      <TableCell>Ubicación</TableCell>
                      <TableCell align="center">Sesiones</TableCell>
                      <TableCell align="center">Tiempo Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.sillones.map(s => (
                      <TableRow key={s.id} hover>
                        <TableCell><strong>{s.nombre}</strong></TableCell>
                        <TableCell>{s.ubicacion || '-'}</TableCell>
                        <TableCell align="center">{s.totalSesiones}</TableCell>
                        <TableCell align="center">{secToHMS(s.segundosTotales)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}

      {/* Diálogo: Informe del paciente */}
      {patientDialogOpen && (
        patientLoading ? (
          <Dialog open maxWidth="sm" fullWidth>
            <DialogContent sx={{ textAlign: 'center', py: 5 }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Cargando informe...</Typography>
            </DialogContent>
          </Dialog>
        ) : (
          <PatientReportDialog
            open={patientDialogOpen}
            onClose={() => setPatientDialogOpen(false)}
            patientData={patientReportData}
          />
        )
      )}
    </Box>
  );
};

export default Reports;
