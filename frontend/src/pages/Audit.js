/**
 * @file Audit.js
 * @description Página de auditoría del sistema (solo admin).
 *
 * Muestra el historial de acciones registradas en el log de auditoría:
 * creación/edición/eliminación de pacientes, movimientos de inventario,
 * asignaciones de sillón, gestión de usuarios, etc.
 *
 * Funcionalidades:
 *  - Tabla paginada con columnas: Fecha, Acción, Entidad, ID, Usuario, IP, Detalles
 *  - Filtros por acción, entidad y usuario (nombre libre)
 *  - Chip de color por tipo de acción (crear=verde, eliminar=rojo, etc.)
 *  - Expansión de detalles JSON en Dialog
 *  - Sin operaciones de escritura (solo lectura)
 *
 * Backend: GET /api/audit?page=&limit=&accion=&entidad=&usuarioId=
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material';
import { InfoOutlined, Refresh } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';

// ─── Constantes de filtros ──────────────────────────────────────────────────

/** Acciones conocidas para el selector de filtro */
const ACCIONES = [
  '',
  'CREAR_PACIENTE', 'ACTUALIZAR_PACIENTE', 'ELIMINAR_PACIENTE',
  'CREAR_MEDICAMENTO', 'ACTUALIZAR_MEDICAMENTO', 'ELIMINAR_MEDICAMENTO', 'ACTUALIZAR_STOCK',
  'ASIGNAR_SILLON', 'LIBERAR_SILLON', 'ADMINISTRAR_MEDICAMENTO',
  'CREAR_USUARIO', 'ACTUALIZAR_USUARIO', 'ACTIVAR_USUARIO', 'DESACTIVAR_USUARIO', 'RESET_PASSWORD',
];

/** Entidades conocidas para el selector de filtro */
const ENTIDADES = [
  '',
  'Paciente', 'Medicamento', 'Sillon', 'Usuario',
];

// ─── Helpers de color por acción ────────────────────────────────────────────

/**
 * Devuelve el color de chip MUI según el tipo de acción de auditoría.
 * @param {string} accion — nombre de la acción
 * @returns {'success'|'error'|'warning'|'info'|'default'}
 */
const getChipColor = (accion = '') => {
  if (accion.startsWith('CREAR') || accion.startsWith('ASIGNAR')) return 'success';
  if (accion.startsWith('ELIMINAR') || accion.startsWith('LIBERAR')) return 'error';
  if (accion.startsWith('ACTUALIZAR') || accion.startsWith('ADMINISTRAR')) return 'warning';
  if (accion.startsWith('RESET') || accion.startsWith('ACTIVAR') || accion.startsWith('DESACTIVAR')) return 'info';
  return 'default';
};

/**
 * Formatea una fecha ISO a formato legible en español.
 * @param {string} iso — cadena de fecha ISO 8601
 * @returns {string} fecha formateada, ej. "07 abr 2026, 14:32"
 */
const formatDate = (iso) => {
  try {
    return format(parseISO(iso), "dd MMM yyyy, HH:mm", { locale: es });
  } catch {
    return iso || '—';
  }
};

// ─── Componente principal ────────────────────────────────────────────────────

const Audit = () => {
  // ── Estado de tabla y paginación ──
  const [rows, setRows]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(0);       // 0-indexed para MUI
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // ── Estado de filtros ──
  const [filterAccion, setFilterAccion]   = useState('');
  const [filterEntidad, setFilterEntidad] = useState('');
  const [filterUsuario, setFilterUsuario] = useState('');

  // ── Estado de dialog de detalles ──
  const [detailOpen, setDetailOpen]   = useState(false);
  const [detailData, setDetailData]   = useState(null);
  const [detailAccion, setDetailAccion] = useState('');

  // ── Carga de datos ───────────────────────────────────────────────────────

  /**
   * Obtiene una página del log de auditoría aplicando los filtros activos.
   * La función es estable (useCallback) para poder usarse en useEffect
   * y en el botón de refresco manual.
   */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: page + 1,        // backend espera 1-indexed
        limit: rowsPerPage,
      };
      if (filterAccion)  params.accion  = filterAccion;
      if (filterEntidad) params.entidad = filterEntidad;
      if (filterUsuario) params.usuario = filterUsuario.trim();

      const response = await api.get('/audit', { params });
      const { data } = response;
      setRows(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar el log de auditoría.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterAccion, filterEntidad, filterUsuario]);

  // Recarga cuando cambia página, filas/página o filtros
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ── Handlers de paginación ───────────────────────────────────────────────

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ── Handlers de filtros ──────────────────────────────────────────────────

  /** Al cambiar cualquier filtro, volver a la primera página */
  const handleFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setPage(0);
  };

  // ── Handlers de dialog ───────────────────────────────────────────────────

  const handleOpenDetail = (row) => {
    let parsed = null;
    try {
      parsed = row.detalles ? JSON.parse(row.detalles) : null;
    } catch {
      parsed = row.detalles;
    }
    setDetailData(parsed);
    setDetailAccion(row.accion);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setDetailData(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Log de Auditoría
        </Typography>
        <Tooltip title="Recargar">
          <IconButton onClick={fetchLogs} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Filtro por acción */}
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Acción</InputLabel>
              <Select
                value={filterAccion}
                label="Acción"
                onChange={handleFilterChange(setFilterAccion)}
              >
                <MenuItem value=""><em>Todas</em></MenuItem>
                {ACCIONES.filter(Boolean).map((a) => (
                  <MenuItem key={a} value={a}>{a}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Filtro por entidad */}
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Entidad</InputLabel>
              <Select
                value={filterEntidad}
                label="Entidad"
                onChange={handleFilterChange(setFilterEntidad)}
              >
                <MenuItem value=""><em>Todas</em></MenuItem>
                {ENTIDADES.filter(Boolean).map((e) => (
                  <MenuItem key={e} value={e}>{e}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Filtro por usuario (nombre libre) */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Usuario"
              placeholder="Nombre de usuario"
              value={filterUsuario}
              onChange={handleFilterChange(setFilterUsuario)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Tabla */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 'bold', backgroundColor: '#f5f5f5' } }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Entidad</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>IP</TableCell>
                <TableCell align="center">Detalles</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay registros de auditoría para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} hover>
                    {/* Fecha */}
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {formatDate(row.createdAt)}
                    </TableCell>

                    {/* Acción con chip de color */}
                    <TableCell>
                      <Chip
                        label={row.accion}
                        color={getChipColor(row.accion)}
                        size="small"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>

                    {/* Entidad */}
                    <TableCell>{row.entidad || '—'}</TableCell>

                    {/* ID de la entidad afectada */}
                    <TableCell>{row.entidadId ?? '—'}</TableCell>

                    {/* Usuario que realizó la acción */}
                    <TableCell>{row.usuarioNombre || '—'}</TableCell>

                    {/* IP de origen */}
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {row.ip || '—'}
                    </TableCell>

                    {/* Botón de detalles JSON (solo si hay datos) */}
                    <TableCell align="center">
                      {row.detalles ? (
                        <Tooltip title="Ver detalles">
                          <IconButton size="small" onClick={() => handleOpenDetail(row)}>
                            <InfoOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>

      {/* Dialog de detalles */}
      <Dialog open={detailOpen} onClose={handleCloseDetail} maxWidth="sm" fullWidth>
        <DialogTitle>Detalles — {detailAccion}</DialogTitle>
        <DialogContent dividers>
          {detailData ? (
            <Box
              component="pre"
              sx={{
                backgroundColor: '#f5f5f5',
                p: 2,
                borderRadius: 1,
                fontSize: '0.8rem',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {JSON.stringify(detailData, null, 2)}
            </Box>
          ) : (
            <Typography color="text.secondary">Sin detalles adicionales.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Audit;
